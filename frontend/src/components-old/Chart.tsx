'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createChart, ColorType, CrosshairMode, type UTCTimestamp } from 'lightweight-charts'
import { api, DEFAULT_SYMBOLS } from '../lib/api'
import { exportBubbles, importBubbles } from '../lib/dataHandler'
import { parseTradeCsv } from '../lib/csvParser'
import { isGuestSession } from '../lib/guestSession'
import { BubbleCreateModal } from '../components/BubbleCreateModal'
import { useBubbleStore, type Bubble, type Trade } from '../lib/bubbleStore'
import { useToast } from '../components/ui/Toast'
import { ChartReplay } from '../components/chart/ChartReplay'
import { FilterGroup, FilterPills } from '../components/ui/FilterPills'
import type { TradeItem, TradeListResponse, TradeSummaryResponse } from '../types/trade'
import type { ManualPosition } from '../types/position'
import { useAuthStore } from '../stores/auth'

type UserSymbolItem = {
  symbol: string
  timeframe_default: string
}

type KlineItem = {
  time: number
  open: string
  high: string
  low: string
  close: string
  volume: string
}

type OverlayTrade = {
  id: string
  exchange: string
  symbol: string
  side: 'buy' | 'sell'
  ts: number
  price: number
  qty?: number
  raw?: TradeItem | Trade
}

const intervals = ['1m', '15m', '1h', '4h', '1d']
const quickPicks = [
  { label: 'BTCUSDT', value: 'BTCUSDT' },
  { label: 'ETHUSDT', value: 'ETHUSDT' },
  { label: 'SOLUSDT', value: 'SOLUSDT' },
  { label: 'AAPL', value: 'AAPL' },
  { label: 'TSLA', value: 'TSLA' },
  { label: '005930', value: '005930' },
]

const chartThemes = {
  noir: {
    label: 'Noir',
    layout: { background: { type: ColorType.Solid, color: '#0a0a0a' }, textColor: '#d4d4d8', fontFamily: 'Space Grotesk, sans-serif' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.06)' }, horzLines: { color: 'rgba(255,255,255,0.06)' } },
    candle: { upColor: '#22c55e', downColor: '#ef4444', wickUpColor: '#22c55e', wickDownColor: '#ef4444' },
  },
  studio: {
    label: 'Studio',
    layout: { background: { type: ColorType.Solid, color: '#0e1117' }, textColor: '#e2e8f0', fontFamily: 'Space Grotesk, sans-serif' },
    grid: { vertLines: { color: 'rgba(148,163,184,0.12)' }, horzLines: { color: 'rgba(148,163,184,0.12)' } },
    candle: { upColor: '#38bdf8', downColor: '#f87171', wickUpColor: '#38bdf8', wickDownColor: '#f87171' },
  },
  paper: {
    label: 'Paper',
    layout: { background: { type: ColorType.Solid, color: '#f8fafc' }, textColor: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' },
    grid: { vertLines: { color: 'rgba(15,23,42,0.08)' }, horzLines: { color: 'rgba(15,23,42,0.08)' } },
    candle: { upColor: '#16a34a', downColor: '#dc2626', wickUpColor: '#16a34a', wickDownColor: '#dc2626' },
  },
  ledger: {
    label: 'Ledger',
    layout: { background: { type: ColorType.Solid, color: '#f4f1ea' }, textColor: '#1f2937', fontFamily: 'Space Grotesk, sans-serif' },
    grid: { vertLines: { color: 'rgba(17,24,39,0.08)' }, horzLines: { color: 'rgba(17,24,39,0.08)' } },
    candle: { upColor: '#0f766e', downColor: '#b91c1c', wickUpColor: '#0f766e', wickDownColor: '#b91c1c' },
  },
} as const

const densityOptions = [
  { value: 'smart', label: 'Auto' },
  { value: 'recent', label: '최근' },
  { value: 'daily', label: '일간' },
  { value: 'weekly', label: '주간' },
  { value: 'monthly', label: '월간' },
  { value: 'all', label: '전체' },
] as const

const actionOptions = ['ALL', 'BUY', 'SELL', 'HOLD', 'TP', 'SL', 'NONE'] as const

const normalizeUpbitSymbol = (value: string) => {
  const symbol = value.toUpperCase()
  if (symbol.includes('-')) return symbol
  if (symbol.endsWith('KRW') && symbol.length > 3) {
    return `KRW-${symbol.slice(0, -3)}`
  }
  if (symbol.endsWith('BTC') && symbol.length > 3) {
    return `BTC-${symbol.slice(0, -3)}`
  }
  if (symbol.startsWith('KRW') && symbol.length > 3) {
    return `KRW-${symbol.slice(3)}`
  }
  return symbol
}

const isMarketSupported = (value: string) => {
  const symbol = value.toUpperCase()
  if (
    symbol.includes('-') ||
    symbol.endsWith('KRW') ||
    symbol.endsWith('BTC')
  ) {
    return true
  }
  return symbol.endsWith('USDT') || symbol.endsWith('USDC') || symbol.endsWith('USD') || symbol.endsWith('BUSD')
}

const resolveExchange = (value: string) => {
  const symbol = value.toUpperCase()
  if (symbol.includes('-') || symbol.endsWith('KRW') || symbol.endsWith('BTC') || symbol.startsWith('KRW')) return 'upbit'
  return 'binance'
}

const getWeekKey = (value: Date) => {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${weekNo}`
}

const parseFocusTimestampMs = (raw: string | null) => {
  if (!raw) return null
  const numeric = Number(raw)
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    // treat small values as seconds, otherwise milliseconds
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.getTime()
}

// Helper to get timeframe duration in seconds
function getTimeframeSeconds(tf: string): number {
  const map: Record<string, number> = {
    '1m': 60,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
  }
  return map[tf] || 3600
}

export function Chart() {
  const { symbol: symbolParam } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const overlayRafRef = useRef<number | null>(null)
  const seriesRef = useRef<ReturnType<ReturnType<typeof createChart>['addCandlestickSeries']> | null>(null)
  const [symbols, setSymbols] = useState<UserSymbolItem[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [timeframe, setTimeframe] = useState('1d')
  const [klines, setKlines] = useState<KlineItem[]>([])
  const [displayKlines, setDisplayKlines] = useState<KlineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [autoBubbleFromTrades, setAutoBubbleFromTrades] = useState(true)
  const [densityMode, setDensityMode] = useState<typeof densityOptions[number]['value']>('smart')
  const [visibleRange, setVisibleRange] = useState<{ from: number; to: number } | null>(null)
  const [themeMode, setThemeMode] = useState<keyof typeof chartThemes>('noir')
  const [dataSource, setDataSource] = useState<'crypto' | 'stock'>('crypto')
  const [bubbleSearch, setBubbleSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<typeof actionOptions[number]>('ALL')
  const [stockKlines, setStockKlines] = useState<KlineItem[]>([])
  const [showReplay, setShowReplay] = useState(false)
  const [showStyleMenu, setShowStyleMenu] = useState(false)
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const [panelTab, setPanelTab] = useState<'summary' | 'detail'>('summary')
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false)
  const [guestMode, setGuestMode] = useState(false)
  const [showPositions, setShowPositions] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState<ManualPosition | null>(null)
  const [positionStackMode] = useState(true)
  const { toast } = useToast()

  const bubbles = useBubbleStore((state) => state.bubbles)
  const localTrades = useBubbleStore((state) => state.trades)
  const importTrades = useBubbleStore((state) => state.importTrades)
  const createBubblesFromTrades = useBubbleStore((state) => state.createBubblesFromTrades)
  const fetchBubblesFromServer = useBubbleStore((state) => state.fetchBubblesFromServer)
  const resetSessionData = useBubbleStore((state) => state.resetSessionData)
  const accessToken = useAuthStore((state) => state.accessToken)
  const [serverTrades, setServerTrades] = useState<OverlayTrade[]>([])
  const [refreshTick, setRefreshTick] = useState(0)
  const [manualPositions, setManualPositions] = useState<ManualPosition[]>([])

  const [overlayPositions, setOverlayPositions] = useState<Array<{
    candleTime: number
    x: number
    y: number
    bubbles: Bubble[]
    trades: OverlayTrade[]
    avgPrice: number
  }>>([])
  const [positionMarkers, setPositionMarkers] = useState<Array<{
    id: string
    candleTime: number
    x: number
    y: number
    side: 'long' | 'short'
    entryPrice?: number
  }>>([])
  const [positionLines, setPositionLines] = useState<Array<{
    id: string
    y: number
    type: 'entry' | 'sl' | 'tp'
    side: 'long' | 'short'
    price?: number
  }>>([])

  const [clickedCandle, setClickedCandle] = useState<{ time: number; price: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [overlayRect, setOverlayRect] = useState({ left: 0, top: 0, width: 0, height: 0 })

  // 표시 옵션
  const [showBubbles, setShowBubbles] = useState(true)
  const [showTrades, setShowTrades] = useState(true)
  const focusQueryRef = useRef<string | null>(null)

  // 선택된 버블 그룹 (상세 보기용)
  const [selectedGroup, setSelectedGroup] = useState<{
    candleTime: number
    bubbles: Bubble[]
    trades: OverlayTrade[]
  } | null>(null)

  // Refs for stable access in effects/callbacks
  const overlayPositionsRef = useRef(overlayPositions)
  const updatePositionsRef = useRef<() => void>(() => { })

  // Update refs
  useEffect(() => {
    overlayPositionsRef.current = overlayPositions
  }, [overlayPositions])

  const buildSymbolSet = useCallback((symbol: string) => {
    const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const upper = symbol.toUpperCase()
    const symbolSet = new Set<string>([normalize(upper)])
    if (upper.includes('-')) {
      const [quote, base] = upper.split('-')
      if (base && quote) symbolSet.add(normalize(`${base}${quote}`))
    } else {
      const match = upper.match(/^(.*)(USDT|USDC|USD|KRW|BTC)$/)
      if (match) {
        const base = match[1]
        const quote = match[2]
        if (base && quote) symbolSet.add(normalize(`${quote}-${base}`))
      }
    }
    return symbolSet
  }, [])

  const activeBubbles = useMemo(() => {
    if (!selectedSymbol) return []
    const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const symbolSet = buildSymbolSet(selectedSymbol)
    return bubbles.filter((b) => symbolSet.has(normalize(b.symbol)))
  }, [bubbles, selectedSymbol, buildSymbolSet])

  const activeTrades = useMemo(() => {
    if (!selectedSymbol) return []
    const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const symbolSet = buildSymbolSet(selectedSymbol)
    const mappedLocal: OverlayTrade[] = localTrades.map((item) => ({
      id: item.id,
      exchange: item.exchange,
      symbol: item.symbol,
      side: item.side,
      ts: item.ts,
      price: item.price,
      qty: item.qty,
      raw: item,
    }))
    return [...serverTrades, ...mappedLocal].filter((trade) => symbolSet.has(normalize(trade.symbol)))
  }, [localTrades, selectedSymbol, serverTrades, buildSymbolSet])

  const activeManualPositions = useMemo(() => {
    if (!selectedSymbol) return []
    const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const symbolSet = buildSymbolSet(selectedSymbol)
    const filtered = manualPositions.filter((pos) => {
      if (dataSource === 'crypto' && pos.asset_class !== 'crypto') return false
      if (dataSource === 'stock' && pos.asset_class !== 'stock') return false
      if (pos.status !== 'open') return false
      return symbolSet.has(normalize(pos.symbol))
    })
    return filtered.sort((a, b) => {
      const aTime = new Date(a.opened_at || a.created_at || 0).getTime()
      const bTime = new Date(b.opened_at || b.created_at || 0).getTime()
      return bTime - aTime
    })
  }, [manualPositions, selectedSymbol, dataSource, buildSymbolSet])

  useEffect(() => {
    if (!selectedSymbol) return
    let isActive = true
    const fetchTrades = async () => {
      try {
        const params = new URLSearchParams({ page: '1', limit: '2000', sort: 'desc' })
        params.set('symbol', selectedSymbol.toUpperCase())
        let response = await api.get<TradeListResponse>(`/v1/trades?${params.toString()}`)
        if ((response.data.items || []).length === 0) {
          const fallbackParams = new URLSearchParams({ page: '1', limit: '2000', sort: 'desc' })
          response = await api.get<TradeListResponse>(`/v1/trades?${fallbackParams.toString()}`)
        }
        if (!isActive) return
        const mapped: OverlayTrade[] = (response.data.items || []).map((trade) => ({
          id: trade.id,
          exchange: trade.exchange,
          symbol: trade.symbol,
          side: trade.side.toUpperCase() === 'BUY' ? 'buy' : 'sell',
          ts: new Date(trade.trade_time).getTime(),
          price: Number(trade.price),
          qty: Number(trade.quantity),
          raw: trade,
        }))
        setServerTrades(mapped)
      } catch {
        if (isActive) setServerTrades([])
      }
    }
    fetchTrades()
    return () => {
      isActive = false
    }
  }, [selectedSymbol, refreshTick])

  useEffect(() => {
    let isActive = true
    const loadManualPositions = async () => {
      try {
        const response = await api.get('/v1/manual-positions?status=open')
        if (!isActive) return
        setManualPositions(response.data?.positions || [])
      } catch {
        if (isActive) setManualPositions([])
      }
    }
    loadManualPositions()
    return () => {
      isActive = false
    }
  }, [refreshTick])

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTick((prev) => prev + 1)
      fetchBubblesFromServer().catch(() => null)
    }
    window.addEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    return () => {
      window.removeEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    }
  }, [fetchBubblesFromServer])

  useEffect(() => {
    setMounted(true)
    setGuestMode(isGuestSession())
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (guestMode || !accessToken) {
      resetSessionData()
      return
    }
    fetchBubblesFromServer().catch(() => null)
  }, [mounted, guestMode, accessToken, fetchBubblesFromServer, resetSessionData])

  useEffect(() => {
    if (selectedGroup) {
      setPanelTab('detail')
    }
  }, [selectedGroup])

  useEffect(() => {
    const isOnboarding = searchParams?.get('onboarding') === '1'
    setShowOnboardingGuide(isOnboarding)
  }, [searchParams])

  useEffect(() => {
    const stored = localStorage.getItem('kifu:auto-bubble-trades')
    if (stored !== null) {
      setAutoBubbleFromTrades(stored === 'true')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('kifu:auto-bubble-trades', String(autoBubbleFromTrades))
  }, [autoBubbleFromTrades])

  // Sync displayKlines with klines (for replay filtering)
  useEffect(() => {
    setDisplayKlines(klines)
  }, [klines])

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    const theme = chartThemes[themeMode]
    chartRef.current.applyOptions({
      layout: theme.layout,
      grid: theme.grid,
      rightPriceScale: { borderColor: theme.layout.textColor, borderVisible: true },
      timeScale: { borderColor: theme.layout.textColor, borderVisible: true },
    })
    seriesRef.current.applyOptions({
      upColor: theme.candle.upColor,
      downColor: theme.candle.downColor,
      wickUpColor: theme.candle.wickUpColor,
      wickDownColor: theme.candle.wickDownColor,
      borderVisible: false,
    })
  }, [themeMode])

  const handleReplayFilteredKlines = useCallback((filtered: KlineItem[]) => {
    setDisplayKlines(filtered)
  }, [])

  const updateOverlayPosition = useCallback(() => {
    if (!wrapperRef.current || !chartRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    setOverlayRect({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    })
  }, [])

  const scheduleOverlayUpdate = useCallback(() => {
    if (overlayRafRef.current != null) return
    overlayRafRef.current = window.requestAnimationFrame(() => {
      overlayRafRef.current = null
      updateOverlayPosition()
    })
  }, [updateOverlayPosition])

  const loadSymbols = useCallback(async (isMounted?: { current: boolean }) => {
    const canUpdate = () => !isMounted || isMounted.current
    const merged = new Map<string, UserSymbolItem>()

      const pushSymbols = (items: UserSymbolItem[]) => {
        items.forEach((item) => {
          const symbol = item.symbol.toUpperCase()
          if (!merged.has(symbol)) {
            merged.set(symbol, {
              symbol,
              timeframe_default: item.timeframe_default || '1d',
            })
          }
        })
      }

      try {
        const response = await api.get('/v1/users/me/symbols')
        if (!canUpdate()) return
        const data = response.data?.symbols || []
        if (data.length > 0) {
          pushSymbols(data)
        }
      } catch (err: any) {
        if (!canUpdate()) return
        console.warn('Failed to load user symbols, using defaults:', err?.message)
      }

      if (!isGuestSession()) {
        try {
          const response = await api.get<TradeSummaryResponse>('/v1/trades/summary')
          if (!canUpdate()) return
          const rows = response.data?.by_symbol || []
          const sorted = [...rows].sort(
            (a, b) => Number(b.total_trades || b.trade_count || 0) - Number(a.total_trades || a.trade_count || 0)
          )
          pushSymbols(
            sorted.map((row) => ({
              symbol: row.symbol,
              timeframe_default: '1d',
            }))
          )
        } catch (err: any) {
          if (!canUpdate()) return
          console.warn('Failed to load trade symbols:', err?.message)
        }
      }

      if (merged.size === 0) {
        pushSymbols(DEFAULT_SYMBOLS)
      }

      if (!canUpdate()) return
      setSymbols(Array.from(merged.values()))
      setError('') // Clear error - we have fallback
  }, [])

  // Load Symbols
  useEffect(() => {
    const isMounted = { current: true }
    loadSymbols(isMounted)
    return () => {
      isMounted.current = false
    }
  }, [loadSymbols])

  // Reload symbols when trades/portfolio change
  useEffect(() => {
    const handleRefresh = () => {
      loadSymbols()
    }
    window.addEventListener('kifu-portfolio-refresh', handleRefresh)
    window.addEventListener('kifu-trades-refresh', handleRefresh)
    return () => {
      window.removeEventListener('kifu-portfolio-refresh', handleRefresh)
      window.removeEventListener('kifu-trades-refresh', handleRefresh)
    }
  }, [loadSymbols])

  // Sync Symbol Param
  useEffect(() => {
    if (symbols.length === 0) return
    const rawParam = Array.isArray(symbolParam) ? symbolParam[0] : symbolParam
    const normalizedParam = rawParam?.toUpperCase().trim() || ''
    const match = symbols.find((item) => item.symbol === normalizedParam)
    // Keep explicit URL symbols as-is (even if currently unsupported),
    // so we can show a clear unsupported message instead of silently falling back.
    const selected = match?.symbol || normalizedParam || symbols[0].symbol

    setSelectedSymbol(selected)
    setTimeframe('1d')
    if (!normalizedParam) {
      router.replace(`/chart/${selected}`)
    }
  }, [router, symbolParam, symbols])

  // Load Klines
  useEffect(() => {
    if (!selectedSymbol) return
    if (dataSource === 'crypto' && !isMarketSupported(selectedSymbol)) {
      setKlines([])
      setDisplayKlines([])
      setError('이 심볼은 아직 차트 데이터 소스가 준비되지 않았습니다.')
      return
    }
    if (dataSource === 'stock') {
      setKlines(stockKlines)
      setDisplayKlines(stockKlines)
      setError(stockKlines.length === 0 ? '주식 CSV를 업로드하면 차트에 표시됩니다.' : '')
      return
    }
    let active = true
    const loadKlines = async () => {
      setLoading(true)
      setError('')
      try {
        const exchange = resolveExchange(selectedSymbol)
        const symbol = exchange === 'upbit' ? normalizeUpbitSymbol(selectedSymbol) : selectedSymbol
        const response = await api.get('/v1/market/klines', {
          params: { symbol, interval: timeframe, limit: 500, exchange },
        })
        if (!active) return
        setKlines(response.data || [])
      } catch (err: any) {
        if (!active) return
        setError(err?.response?.data?.message || '차트 데이터를 불러오지 못했습니다.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadKlines()
    return () => { active = false }
  }, [selectedSymbol, timeframe, dataSource, stockKlines])

  const chartData = useMemo(() => {
    return displayKlines
      .map((item) => ({
        time: item.time as UTCTimestamp,
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
      }))
      .filter((item) =>
        Number.isFinite(item.open) &&
        Number.isFinite(item.high) &&
        Number.isFinite(item.low) &&
        Number.isFinite(item.close),
      )
  }, [displayKlines])

  const latestPrice = useMemo(() => {
    if (klines.length === 0) return ''
    return klines[klines.length - 1].close || ''
  }, [klines])

  // Update Positions for Bubbles AND Trades
  const updatePositions = useCallback(() => {
    if (!seriesRef.current || !chartRef.current || chartData.length === 0) return

    const dataByCandle = new Map<number, { bubbles: Bubble[], trades: OverlayTrade[] }>()
    const positionMarkers: Array<{
      id: string
      candleTime: number
      x: number
      y: number
      side: 'long' | 'short'
      entryPrice?: number
    }> = []
    const positionLines: Array<{
      id: string
      y: number
      type: 'entry' | 'sl' | 'tp'
      side: 'long' | 'short'
      price?: number
    }> = []

    const findMatchingCandleTime = (ts: number): number | null => {
      const itemTime = Math.floor(ts / 1000)
      const secondsPerCandle = getTimeframeSeconds(timeframe)
      // Simple binary search or filter could be optimized, but find is fine for N=500
      const match = chartData.find(kline => {
        const kTime = kline.time as number
        return itemTime >= kTime && itemTime < kTime + secondsPerCandle
      })
      return match ? (match.time as number) : null
    }

    // Process Bubbles
    activeBubbles.forEach(bubble => {
      const candleTime = findMatchingCandleTime(bubble.ts)
      if (candleTime !== null) {
        if (!dataByCandle.has(candleTime)) {
          dataByCandle.set(candleTime, { bubbles: [], trades: [] })
        }
        dataByCandle.get(candleTime)!.bubbles.push(bubble)
      }
    })

    // Process Trades
    activeTrades.forEach(trade => {
      const candleTime = findMatchingCandleTime(trade.ts)
      if (candleTime !== null) {
        if (!dataByCandle.has(candleTime)) {
          dataByCandle.set(candleTime, { bubbles: [], trades: [] })
        }
        dataByCandle.get(candleTime)!.trades.push(trade)
      }
    })

    const positions: Array<{
      candleTime: number
      x: number
      y: number
      bubbles: Bubble[]
      trades: OverlayTrade[]
      avgPrice: number
    }> = []

    const chart = chartRef.current
    const candleMap = new Map<number, typeof chartData[number]>()
    chartData.forEach((c) => candleMap.set(c.time as number, c))
    const chartHeight = containerRef.current?.clientHeight ?? 0
    const chartWidth = containerRef.current?.clientWidth ?? 0
    const clampX = (value: number) => {
      if (!chartWidth) return value
      return Math.min(Math.max(value, 16), chartWidth - 16)
    }
    dataByCandle.forEach((data, candleTime) => {
      const x = chart.timeScale().timeToCoordinate(candleTime as UTCTimestamp)
      if (x === null || x === undefined) return
      const clampedX = clampX(x)

      const candle = candleMap.get(candleTime)
      const avgPrice = candle ? candle.close : 0
      const y = seriesRef.current?.priceToCoordinate(avgPrice)

      if (y === null || y === undefined) return
      if (chartHeight && (y < 0 || y > chartHeight)) return
      positions.push({ candleTime, x: clampedX, y, bubbles: data.bubbles, trades: data.trades, avgPrice })
    })

    const visiblePositions = showPositions ? activeManualPositions.slice(0, 1) : []
    visiblePositions.forEach((position) => {
      const openedAt = position.opened_at || position.created_at
      if (!openedAt) return
      const candleTime = findMatchingCandleTime(new Date(openedAt).getTime())
      if (candleTime === null) return
      const x = chart.timeScale().timeToCoordinate(candleTime as UTCTimestamp)
      if (x === null || x === undefined) return
      const clampedX = clampX(x)
      const entryPrice = position.entry_price ? Number(position.entry_price) : undefined
      const reference = entryPrice ?? candleMap.get(candleTime)?.close
      if (!reference) return
      const y = seriesRef.current?.priceToCoordinate(reference)
      if (y === null || y === undefined) return
      if (chartHeight && (y < 0 || y > chartHeight)) return
      positionMarkers.push({
        id: position.id,
        candleTime,
        x: clampedX,
        y,
        side: position.position_side,
        entryPrice,
      })

      const entryLine = entryPrice ? seriesRef.current?.priceToCoordinate(entryPrice) : y
      if (entryLine !== null && entryLine !== undefined && (!chartHeight || (entryLine >= 0 && entryLine <= chartHeight))) {
        positionLines.push({
          id: `${position.id}-entry`,
          y: entryLine,
          type: 'entry',
          side: position.position_side,
          price: entryPrice ?? reference,
        })
      }
      if (position.stop_loss) {
        const slPrice = Number(position.stop_loss)
        const slY = seriesRef.current?.priceToCoordinate(slPrice)
        if (slY !== null && slY !== undefined && (!chartHeight || (slY >= 0 && slY <= chartHeight))) {
          positionLines.push({
            id: `${position.id}-sl`,
            y: slY,
            type: 'sl',
            side: position.position_side,
            price: slPrice,
          })
        }
      }
      if (position.take_profit) {
        const tpPrice = Number(position.take_profit)
        const tpY = seriesRef.current?.priceToCoordinate(tpPrice)
        if (tpY !== null && tpY !== undefined && (!chartHeight || (tpY >= 0 && tpY <= chartHeight))) {
          positionLines.push({
            id: `${position.id}-tp`,
            y: tpY,
            type: 'tp',
            side: position.position_side,
            price: tpPrice,
          })
        }
      }
    })

    setOverlayPositions(positions)
    setPositionMarkers(positionMarkers)
    setPositionLines(positionLines)
  }, [chartData, activeBubbles, activeTrades, activeManualPositions, timeframe, showPositions])

  useEffect(() => {
    updatePositionsRef.current = updatePositions
  }, [updatePositions])

  const densityAdjustedPositions = useMemo(() => {
    if (overlayPositions.length === 0) return []
    const sorted = [...overlayPositions].sort((a, b) => a.candleTime - b.candleTime)
    const mode = densityMode === 'smart' ? (sorted.length > 80 ? 'daily' : 'all') : densityMode
    let filtered = sorted
    if (mode === 'all') filtered = sorted
    if (mode === 'recent') filtered = sorted.slice(Math.max(sorted.length - 60, 0))
    if (mode === 'weekly') {
      const grouped = new Map<string, typeof overlayPositions[number]>()
      sorted.forEach((item) => {
        const date = new Date(item.candleTime * 1000)
        const key = getWeekKey(date)
        const existing = grouped.get(key)
        if (!existing) {
          grouped.set(key, { ...item })
          return
        }
        grouped.set(key, {
          ...item,
          bubbles: [...existing.bubbles, ...item.bubbles],
          trades: [...existing.trades, ...item.trades],
          avgPrice: item.avgPrice,
        })
      })
      filtered = Array.from(grouped.values())
    }
    if (mode === 'monthly') {
      const grouped = new Map<string, typeof overlayPositions[number]>()
      sorted.forEach((item) => {
        const date = new Date(item.candleTime * 1000)
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`
        const existing = grouped.get(key)
        if (!existing) {
          grouped.set(key, { ...item })
          return
        }
        grouped.set(key, {
          ...item,
          bubbles: [...existing.bubbles, ...item.bubbles],
          trades: [...existing.trades, ...item.trades],
          avgPrice: item.avgPrice,
        })
      })
      filtered = Array.from(grouped.values())
    }
    if (mode === 'daily') {
      const grouped = new Map<string, typeof overlayPositions[number]>()
      sorted.forEach((item) => {
        const date = new Date(item.candleTime * 1000)
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        const existing = grouped.get(key)
        if (!existing) {
          grouped.set(key, { ...item })
          return
        }
        grouped.set(key, {
          ...item,
          bubbles: [...existing.bubbles, ...item.bubbles],
          trades: [...existing.trades, ...item.trades],
          avgPrice: item.avgPrice,
        })
      })
      filtered = Array.from(grouped.values())
    }
    if (visibleRange) {
      filtered = filtered.filter((item) => item.candleTime >= visibleRange.from && item.candleTime <= visibleRange.to)
    }
    const maxMarkers = 60
    if (filtered.length > maxMarkers) {
      const step = Math.ceil(filtered.length / maxMarkers)
      filtered = filtered.filter((_, index) => index % step === 0)
    }
    // Additional pixel-based clustering to reduce overlap while preserving counts.
    const minSpacing = mode === 'all' ? 10 : mode === 'recent' ? 12 : 14
    const byX = [...filtered].sort((a, b) => a.x - b.x)
    const buckets = new Map<number, typeof filtered[number] & { _count: number }>()

    for (const item of byX) {
      const bucketKey = Math.floor(item.x / minSpacing)
      const existing = buckets.get(bucketKey)
      if (!existing) {
        buckets.set(bucketKey, { ...item, _count: 1 })
        continue
      }

      const nextCount = existing._count + 1
      const merged = {
        ...existing,
        // Keep the latest candle as bucket representative for click/focus.
        candleTime: Math.max(existing.candleTime, item.candleTime),
        // Smooth out marker position within the same bucket.
        x: (existing.x * existing._count + item.x) / nextCount,
        y: (existing.y * existing._count + item.y) / nextCount,
        // Preserve all aggregated data so marker tooltip/count stays accurate.
        bubbles: [...existing.bubbles, ...item.bubbles],
        trades: [...existing.trades, ...item.trades],
        avgPrice: item.avgPrice,
        _count: nextCount,
      }
      buckets.set(bucketKey, merged)
    }

    return Array.from(buckets.values())
      .map(({ _count: _ignored, ...rest }) => rest)
      .sort((a, b) => a.candleTime - b.candleTime)
  }, [overlayPositions, densityMode, visibleRange])

  const filteredBubbles = useMemo(() => {
    const query = bubbleSearch.trim().toLowerCase()
    return activeBubbles.filter((bubble) => {
      if (actionFilter !== 'ALL' && bubble.action !== actionFilter) return false
      if (!query) return true
      return bubble.note.toLowerCase().includes(query) || (bubble.tags || []).some((tag) => tag.toLowerCase().includes(query))
    }).sort((a, b) => b.ts - a.ts)
  }, [activeBubbles, bubbleSearch, actionFilter])

  const bubbleSummary = useMemo(() => {
    const counts = {
      total: activeBubbles.length,
      buy: 0,
      sell: 0,
      hold: 0,
      tp: 0,
      sl: 0,
      note: 0,
    }
    activeBubbles.forEach((bubble) => {
      const action = (bubble.action || 'NOTE').toUpperCase()
      if (action === 'BUY') counts.buy += 1
      else if (action === 'SELL') counts.sell += 1
      else if (action === 'HOLD') counts.hold += 1
      else if (action === 'TP') counts.tp += 1
      else if (action === 'SL') counts.sl += 1
      else counts.note += 1
    })
    return counts
  }, [activeBubbles])

  const densitySummary = useMemo(() => {
    const bubbleTotal = densityAdjustedPositions.reduce((acc, item) => acc + item.bubbles.length, 0)
    const tradeTotal = densityAdjustedPositions.reduce((acc, item) => acc + item.trades.length, 0)
    return {
      markers: densityAdjustedPositions.length,
      totalMarkers: overlayPositions.length,
      bubbles: showBubbles ? bubbleTotal : 0,
      trades: showTrades ? tradeTotal : 0,
    }
  }, [densityAdjustedPositions, overlayPositions.length, showBubbles, showTrades])

  // 버블/트레이드 변경 시 위치 업데이트
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    // 약간의 딜레이 후 위치 업데이트 (차트 렌더링 완료 대기)
    const timer = setTimeout(() => {
      if (updatePositionsRef.current) updatePositionsRef.current()
    }, 100)
    return () => clearTimeout(timer)
  }, [activeBubbles, activeTrades, timeframe])

  // Chart Initialization
  useEffect(() => {
    if (!containerRef.current) return

    const initialTheme = chartThemes[themeMode]
    const chart = createChart(containerRef.current, {
      layout: initialTheme.layout,
      grid: initialTheme.grid,
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.08)' },
      height: 480,
    })

    const series = chart.addCandlestickSeries({
      upColor: initialTheme.candle.upColor,
      downColor: initialTheme.candle.downColor,
      borderVisible: false,
      wickUpColor: initialTheme.candle.wickUpColor,
      wickDownColor: initialTheme.candle.wickDownColor,
    })

    chartRef.current = chart
    seriesRef.current = series

    if (chartData.length > 0) {
      series.setData(chartData)
      chart.timeScale().fitContent()
    }

    const clickHandler = (param: any) => {
      if (!param.point || !param.time) return
      const price = series.coordinateToPrice(param.point.y)
      if (price === null) return

      const clickedTime = param.time as number

      setClickedCandle({ time: clickedTime, price })
      setIsModalOpen(true)
    }

    chart.subscribeClick(clickHandler)

    const handleVisibleTimeRangeChange = (newVisibleTimeRange: any) => {
      // 1. Update overlay positions (existing logic)
      updateOverlayPosition()
      if (updatePositionsRef.current) updatePositionsRef.current()

      const timeRange = chart.timeScale().getVisibleRange()
      if (timeRange && Number.isFinite(timeRange.from) && Number.isFinite(timeRange.to)) {
        setVisibleRange({ from: Number(timeRange.from), to: Number(timeRange.to) })
      }

      // 2. Continuous Scroll Logic
      const logicalRange = chart.timeScale().getVisibleLogicalRange()
      if (!logicalRange) return

      // If user is scrolling near the start (left side) and not currently loading
      // 'from' is the logical index. 0 is the oldest LOADED candle. Negative means scrolling into empty space before data.
      // We trigger load if they are close to 0 (e.g. < 10)
      if (logicalRange.from < 10 && !loading && klines.length > 0) {
        // Debouncing logic could be added here, but for now direct call
        // We need a ref to access current 'loading' state inside this callback if it closes over stale state
        // But here we rely on the effect dependency or ref
        // Let's use a specialized function that checks a ref to prevent spam
        loadMoreHistory()
      }
    }

    chart.timeScale().subscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange)

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length) return
      const { width } = entries[0].contentRect
      chart.applyOptions({ width })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      chart.unsubscribeClick(clickHandler)
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange)
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [timeframe, chartData, updateOverlayPosition]) // Add dependencies if needed, but be careful of loops using 'loading' or 'klines' directly here causes re-mount

  // Ref for loading state to use inside the chart event listener without re-binding
  const loadingRef = useRef(loading)
  useEffect(() => { loadingRef.current = loading }, [loading])

  const klinesRef = useRef(klines)
  useEffect(() => { klinesRef.current = klines }, [klines])

  // 히스토리 로드 디바운싱을 위한 ref
  const lastHistoryLoadRef = useRef<number>(0)
  const historyLoadCooldown = 3000 // 3초 쿨다운

  const loadMoreHistory = useCallback(async () => {
    const now = Date.now()
    // 쿨다운 체크 - 너무 자주 호출되지 않도록
    if (now - lastHistoryLoadRef.current < historyLoadCooldown) return
    if (loadingRef.current || klinesRef.current.length === 0) return

    lastHistoryLoadRef.current = now

    // Get the oldest time from current data
    const oldestItem = klinesRef.current[0]
    const endTimeMs = (oldestItem.time as number) * 1000 - 1

    setLoading(true)
    try {
      const exchange = resolveExchange(selectedSymbol)
      const symbol = exchange === 'upbit' ? normalizeUpbitSymbol(selectedSymbol) : selectedSymbol
      const response = await api.get('/v1/market/klines', {
        params: { symbol, interval: timeframe, limit: 500, endTime: endTimeMs, exchange },
      })

      const newKlines = response.data || []
      if (newKlines.length === 0) {
        return
      }

      const merged = [...newKlines, ...klinesRef.current]
      const uniqueDetails = new Map()
      merged.forEach(k => uniqueDetails.set(k.time, k))
      const deduplicated = Array.from(uniqueDetails.values()).sort((a, b) => a.time - b.time)

      setKlines(deduplicated)
      // 토스트 제거 - 너무 자주 뜸

    } catch (err: any) {
      // 401 에러는 조용히 무시 (인증 필요)
      if (err?.response?.status !== 401) {
        console.error('Failed to load history', err)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedSymbol, timeframe])

  const loadMoreFuture = useCallback(async () => {
    if (loadingRef.current || klinesRef.current.length === 0) return

    const latestItem = klinesRef.current[klinesRef.current.length - 1]
    const secondsPerCandle = getTimeframeSeconds(timeframe)
    const endTimeMs = (latestItem.time as number) * 1000 + secondsPerCandle * 1000 * 500

    setLoading(true)
    try {
      const exchange = resolveExchange(selectedSymbol)
      const symbol = exchange === 'upbit' ? normalizeUpbitSymbol(selectedSymbol) : selectedSymbol
      const response = await api.get('/v1/market/klines', {
        params: { symbol, interval: timeframe, limit: 500, endTime: endTimeMs, exchange },
      })

      const newKlines = response.data || []
      if (newKlines.length === 0) {
        return
      }

      const merged = [...klinesRef.current, ...newKlines]
      const uniqueDetails = new Map()
      merged.forEach(k => uniqueDetails.set(k.time, k))
      const deduplicated = Array.from(uniqueDetails.values()).sort((a, b) => a.time - b.time)
      setKlines(deduplicated)
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error('Failed to load future', err)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedSymbol, timeframe])

  const focusOnTimestamp = useCallback((tsMs: number, bubbleTimeframe?: string) => {
    if (bubbleTimeframe && bubbleTimeframe !== timeframe) {
      setTimeframe(bubbleTimeframe)
    }
    const secondsPerCandle = getTimeframeSeconds(bubbleTimeframe || timeframe)
    const targetSec = Math.floor(tsMs / 1000)
    const span = secondsPerCandle * 50
    const oldest = klines.length > 0 ? (klines[0].time as number) : null
    const latest = klines.length > 0 ? (klines[klines.length - 1].time as number) : null

    if (oldest && targetSec < oldest) {
      loadMoreHistory()
      toast('이전 데이터를 불러오는 중입니다.', 'info')
    } else if (latest && targetSec > latest) {
      loadMoreFuture()
      toast('이후 데이터를 불러오는 중입니다.', 'info')
    }

    if (chartRef.current) {
      chartRef.current.timeScale().setVisibleRange({
        from: (targetSec - span) as UTCTimestamp,
        to: (targetSec + span) as UTCTimestamp,
      })
    }
  }, [klines, timeframe, loadMoreHistory, loadMoreFuture, toast])

  const jumpToTime = useCallback(() => {
    return
  }, [])

  useEffect(() => {
    const focusRaw = searchParams?.get('focus_ts') || null
    const focusMs = parseFocusTimestampMs(focusRaw)
    if (!focusMs) return

    const focusTf = (searchParams?.get('focus_tf') || '').trim()
    const targetTf = focusTf || timeframe
    const focusKey = `${selectedSymbol}|${focusMs}|${targetTf}`
    if (focusQueryRef.current === focusKey) return

    if (focusTf && focusTf !== timeframe) {
      setTimeframe(focusTf)
      return
    }
    if (chartData.length === 0) return

    focusOnTimestamp(focusMs, targetTf)
    focusQueryRef.current = focusKey
  }, [searchParams, selectedSymbol, timeframe, chartData.length, focusOnTimestamp])

  // Update Data Effect
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return
    seriesRef.current.setData(chartData)

    // 타임프레임에 따라 표시할 캔들 수 제한
    const maxVisibleCandles: Record<string, number> = {
      '1m': 200,
      '15m': 200,
      '1h': 168,   // 약 1주일
      '4h': 180,   // 약 1달
      '1d': 365,   // 1년
    }
    const visibleCount = maxVisibleCandles[timeframe] || 200

    if (chartData.length > visibleCount) {
      // 최근 N개 캔들만 보이도록 설정
      const fromIndex = chartData.length - visibleCount
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: fromIndex,
        to: chartData.length - 1,
      })
    } else {
      chartRef.current.timeScale().fitContent()
    }

    // 데이터 로드 후 버블 위치 업데이트
    setTimeout(() => {
      updateOverlayPosition()
      if (updatePositionsRef.current) updatePositionsRef.current()
    }, 150)
  }, [chartData, updateOverlayPosition, timeframe])

  // Handlers
  const handleImportClick = () => {
    document.getElementById('import-json-input')?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (confirm('현재 데이터를 모두 삭제하고 파일 내용으로 교체하시겠습니까? (복구 불가)')) {
      const result = await importBubbles(file)
      if (result.success) {
        toast(result.message, 'success')
      } else {
        toast(result.message, 'error')
      }
    }
    event.target.value = ''
  }

  const handleTradeImportClick = () => {
    if (guestMode) {
      toast('게스트 모드에서는 CSV 가져오기가 비활성화됩니다.', 'error')
      return
    }
    document.getElementById('import-csv-input')?.click()
  }

  const handleTradeFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const newTrades = await parseTradeCsv(file)
      if (newTrades.length === 0) {
        toast('가져올 거래 내역이 없거나 형식이 잘못되었습니다.', 'error')
        return
      }

      if (confirm(`${newTrades.length}개의 거래내역을 가져오시겠습니까?`)) {
        importTrades(newTrades)
        if (autoBubbleFromTrades) {
          try {
            const result = await createBubblesFromTrades(newTrades)
            toast(`거래 버블 자동 생성 ${result.created.length}건`, 'success')
          } catch (err) {
            toast('거래 버블 자동 생성에 실패했습니다.', 'error')
          }
        }
        toast(`${newTrades.length}개 거래내역 가져오기 완료`, 'success')
      }
    } catch (e: any) {
      console.error(e)
      toast('CSV 파싱 실패: ' + e.message, 'error')
    }
    event.target.value = ''
  }

  const handleStockCsvClick = () => {
    if (guestMode) {
      toast('게스트 모드에서는 CSV 가져오기가 비활성화됩니다.', 'error')
      return
    }
    document.getElementById('import-stock-csv-input')?.click()
  }

  const handleStockCsvChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
      if (lines.length <= 1) {
        toast('CSV 데이터가 비어 있습니다.', 'error')
        return
      }
      const header = lines[0].toLowerCase().split(',').map((c) => c.trim())
      const colIndex = (name: string) => header.findIndex((h) => h === name)
      const timeIdx = colIndex('time')
      const dateIdx = colIndex('date')
      const openIdx = colIndex('open')
      const highIdx = colIndex('high')
      const lowIdx = colIndex('low')
      const closeIdx = colIndex('close')
      const volumeIdx = colIndex('volume')

      if ((timeIdx < 0 && dateIdx < 0) || openIdx < 0 || highIdx < 0 || lowIdx < 0 || closeIdx < 0) {
        toast('CSV 컬럼이 올바르지 않습니다. (time/date, open, high, low, close 필요)', 'error')
        return
      }

      const items: KlineItem[] = []
      for (let i = 1; i < lines.length; i += 1) {
        const row = lines[i].split(',').map((c) => c.trim())
        const timeRaw = timeIdx >= 0 ? row[timeIdx] : row[dateIdx]
        if (!timeRaw) continue
        const parsed = new Date(timeRaw)
        if (Number.isNaN(parsed.getTime())) continue
        items.push({
          time: Math.floor(parsed.getTime() / 1000),
          open: row[openIdx],
          high: row[highIdx],
          low: row[lowIdx],
          close: row[closeIdx],
          volume: volumeIdx >= 0 ? row[volumeIdx] : '0',
        })
      }
      if (items.length === 0) {
        toast('유효한 캔들 데이터를 찾지 못했습니다.', 'error')
        return
      }
      const sorted = items.sort((a, b) => a.time - b.time)
      setStockKlines(sorted)
      setKlines(sorted)
      setDisplayKlines(sorted)
      setError('')
      toast(`주식 캔들 ${sorted.length}개 로드 완료`, 'success')
    } catch (err) {
      toast('CSV 파싱에 실패했습니다.', 'error')
    } finally {
      event.target.value = ''
    }
  }

  const handleSymbolChange = (value: string) => {
    const next = value.toUpperCase()
    setSelectedSymbol(next)
    router.push(`/chart/${next}`)
  }

  useEffect(() => {
    const handleResize = () => scheduleOverlayUpdate()
    const handleScroll = () => scheduleOverlayUpdate()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
      if (overlayRafRef.current != null) {
        window.cancelAnimationFrame(overlayRafRef.current)
        overlayRafRef.current = null
      }
    }
  }, [scheduleOverlayUpdate])

  const generateDummyBubbles = () => {
    if (chartData.length === 0) return
    const times = chartData.map(c => c.time as number)
    const prices = chartData.map(c => c.close)
    for (let i = 0; i < 20; i++) {
      const idx = Math.floor(Math.random() * times.length)
      const type = Math.random() > 0.5 ? 'buy' : 'sell'
      useBubbleStore.getState().addBubble({
        id: crypto.randomUUID(),
        symbol: selectedSymbol,
        timeframe,
        ts: times[idx] * 1000,
        price: prices[idx],
        note: `Dummy ${type}`,
        tags: [type],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Market</p>
            <h2 className="mt-2 text-2xl font-semibold text-neutral-100">Chart Overview</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Live Chart with Bubble Journaling & Trade Overlay
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
            <div className="flex flex-wrap items-end gap-2">
              <FilterGroup label="Market" tone="emerald">
                <FilterPills
                  options={[
                    { value: 'crypto', label: 'Crypto' },
                    { value: 'stock', label: 'Stock' },
                  ]}
                  value={dataSource}
                  onChange={(value) => setDataSource(value as 'crypto' | 'stock')}
                  tone="emerald"
                  ariaLabel="Market source"
                />
              </FilterGroup>

              <FilterGroup label="Symbol" tone="sky">
                <select
                  value={selectedSymbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  className="rounded-md border border-sky-400/40 bg-neutral-950/70 px-2 py-1 text-xs font-semibold text-sky-100"
                >
                  {symbols.map((item) => (
                    <option key={item.symbol} value={item.symbol}>{item.symbol}</option>
                  ))}
                </select>
              </FilterGroup>

              <FilterGroup label="Timeframe" tone="amber">
                <FilterPills
                  options={intervals.map((interval) => ({ value: interval, label: interval }))}
                  value={timeframe}
                  onChange={(value) => setTimeframe(value)}
                  tone="amber"
                  ariaLabel="Timeframe filter"
                />
              </FilterGroup>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={!selectedSymbol}
                  className="rounded-md bg-neutral-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-950 hover:bg-white disabled:opacity-60"
                >
                  Create Bubble
                </button>
                <button
                  onClick={() => setShowReplay((prev) => !prev)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                    showReplay
                      ? 'border-sky-300 bg-sky-300/20 text-sky-200'
                      : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {showReplay ? 'Hide Replay' : 'Replay'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvancedControls((prev) => !prev)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                    showAdvancedControls
                      ? 'border-fuchsia-300 bg-fuchsia-300/20 text-fuchsia-100'
                      : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {showAdvancedControls ? '기능 숨기기' : '기능 더보기'}
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span className="uppercase tracking-[0.2em] text-neutral-500">Quick</span>
              {quickPicks.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleSymbolChange(item.value)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                    selectedSymbol === item.value
                      ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                      : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {showAdvancedControls && (
              <div className="mt-3 grid gap-3 border-t border-white/[0.06] pt-3 lg:grid-cols-2 xl:grid-cols-3">
                <FilterGroup label="Display" tone="emerald">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBubbles((prev) => !prev)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        showBubbles
                          ? 'border-emerald-300 bg-emerald-300/20 text-emerald-200'
                          : 'border-neutral-700 text-neutral-400 hover:border-emerald-300/40 hover:text-emerald-200'
                      }`}
                    >
                      Bubbles
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTrades((prev) => !prev)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        showTrades
                          ? 'border-sky-300 bg-sky-300/20 text-sky-200'
                          : 'border-neutral-700 text-neutral-400 hover:border-sky-300/40 hover:text-sky-200'
                      }`}
                    >
                      Trades
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTrades(true)
                        setShowBubbles(false)
                      }}
                      className="rounded-full border border-indigo-300/40 bg-indigo-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200 transition hover:bg-indigo-300/20"
                    >
                      Trade Focus
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPositions((prev) => !prev)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        showPositions
                          ? 'border-emerald-300 bg-emerald-300/20 text-emerald-200'
                          : 'border-neutral-700 text-neutral-400 hover:border-emerald-300/40 hover:text-emerald-200'
                      }`}
                    >
                      Positions
                    </button>
                  </div>
                </FilterGroup>

                <FilterGroup label="Range" tone="rose">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadMoreHistory()}
                      className="rounded-full border border-rose-300/40 bg-rose-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-300/20"
                    >
                      이전 구간
                    </button>
                    <button
                      type="button"
                      onClick={() => loadMoreFuture()}
                      className="rounded-full border border-rose-300/40 bg-rose-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-300/20"
                    >
                      다음 구간
                    </button>
                  </div>
                </FilterGroup>

                <FilterGroup label="Style" tone="sky">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowStyleMenu((prev) => !prev)}
                      className="rounded-full border border-sky-300/40 bg-sky-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200 hover:bg-sky-300/20"
                    >
                      {chartThemes[themeMode].label}
                    </button>
                    {showStyleMenu && (
                      <div className="absolute right-0 z-50 mt-2 w-40 rounded-xl border border-white/[0.08] bg-neutral-950/95 p-2 shadow-xl">
                        {Object.entries(chartThemes).map(([value, item]) => (
                          <button
                            key={value}
                            onClick={() => {
                              setThemeMode(value as keyof typeof chartThemes)
                              setShowStyleMenu(false)
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                              themeMode === value
                                ? 'bg-sky-300/20 text-sky-200'
                                : 'text-neutral-300 hover:bg-white/[0.06]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </FilterGroup>

                <FilterGroup label="Auto Bubble" tone="rose">
                  <button
                    type="button"
                    onClick={() => setAutoBubbleFromTrades((prev) => !prev)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      autoBubbleFromTrades
                        ? 'border-rose-300 bg-rose-300/20 text-rose-200'
                        : 'border-neutral-700 text-neutral-400 hover:border-rose-300/40 hover:text-rose-200'
                    }`}
                  >
                    {autoBubbleFromTrades ? 'On' : 'Off'}
                  </button>
                </FilterGroup>

                <FilterGroup label="Import / Export" tone="fuchsia">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={exportBubbles} className="rounded-md border border-neutral-700 px-3 py-1 text-[10px] text-neutral-300 hover:bg-neutral-800">
                      Export JSON
                    </button>
                    <button onClick={handleImportClick} className="rounded-md border border-neutral-700 px-3 py-1 text-[10px] text-neutral-300 hover:bg-neutral-800">
                      Import JSON
                    </button>
                    <input type="file" id="import-json-input" accept=".json" className="hidden" onChange={handleFileChange} />

                    <button onClick={handleTradeImportClick} disabled={guestMode} className="rounded-md border border-blue-900/50 px-3 py-1 text-[10px] text-blue-300 hover:bg-blue-900/20 disabled:opacity-50">
                      Import CSV
                    </button>
                    <input type="file" id="import-csv-input" accept=".csv" className="hidden" onChange={handleTradeFileChange} />

                    <button
                      onClick={handleStockCsvClick}
                      disabled={guestMode}
                      className="rounded-md border border-emerald-500/50 px-3 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      Stock CSV
                    </button>
                    <input type="file" id="import-stock-csv-input" accept=".csv" className="hidden" onChange={handleStockCsvChange} />
                  </div>
                </FilterGroup>

                <FilterGroup label="Danger Zone" tone="rose">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={generateDummyBubbles} disabled={!selectedSymbol} className="rounded-md border border-yellow-500/50 px-3 py-1 text-[10px] text-yellow-400 hover:bg-yellow-500/10">
                      + DUMMY
                    </button>
                    <button onClick={() => { if (confirm('Reset all?')) { localStorage.removeItem('bubble-storage'); window.location.reload(); } }} className="rounded-md border border-red-500/50 px-3 py-1 text-[10px] text-red-400 hover:bg-red-500/10">
                      RESET
                    </button>
                  </div>
                </FilterGroup>
              </div>
            )}
          </div>
        </div>
        {error && <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {(dataSource === 'crypto' && !isMarketSupported(selectedSymbol)) && (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            현재 차트 데이터는 Binance(USDT/USDC/USD) 및 Upbit(KRW-*) 기반입니다. 기타 심볼은 준비 중입니다.
          </div>
        )}
        {(dataSource === 'stock') && (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            주식 차트 데이터 소스는 아직 연결되지 않았습니다. (연동 예정)
          </div>
        )}
        {guestMode && (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
            게스트 모드: API 동기화/CSV 가져오기/AI 요청은 회원 전용입니다.
          </div>
        )}
        {showOnboardingGuide && (
          <div className="mt-3 rounded-lg border border-cyan-400/40 bg-cyan-500/10 p-3 text-xs text-cyan-100">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">온보딩 루틴</p>
                <p className="mt-1 text-cyan-100/80">최근 변동이 큰 캔들 1개를 선택해서 말풍선을 남겨보세요. 오늘은 1개만 하면 충분합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardingGuide(false)}
                className="rounded-md border border-cyan-300/40 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-100 hover:bg-cyan-300/20"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </header>

      {showReplay && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
          <ChartReplay
            klines={klines}
            onFilteredKlines={handleReplayFilteredKlines}
            timeframeSeconds={getTimeframeSeconds(timeframe)}
          />
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 relative lg:pr-20" ref={wrapperRef}>
          <div className="h-[520px] w-full relative" ref={containerRef}>
            {/* Bubble Overlay - 차트 컨테이너 내부에 absolute로 배치 */}
            {mounted && (
              <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 20, pointerEvents: 'none', overflow: 'visible' }}>
                {showPositions && !positionStackMode && positionLines.map((line) => (
                  <div
                    key={line.id}
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{ top: line.y }}
                  >
                    <div className={`h-px w-full ${
                      line.type === 'sl'
                        ? 'bg-rose-400/60'
                        : line.type === 'tp'
                          ? 'bg-emerald-300/60'
                          : 'bg-cyan-300/40'
                    }`} />
                    {!positionStackMode && line.price !== undefined && (
                      <div className={`absolute right-2 -top-3 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] ${
                        line.type === 'sl'
                          ? 'border-rose-300/40 text-rose-200 bg-rose-300/10'
                          : line.type === 'tp'
                            ? 'border-emerald-300/40 text-emerald-200 bg-emerald-300/10'
                            : 'border-cyan-300/40 text-cyan-200 bg-cyan-300/10'
                      }`}>
                        {line.type.toUpperCase()} · {line.price}
                      </div>
                    )}
                  </div>
                ))}
                {showPositions && positionStackMode && (
                  <div className="absolute inset-0 pointer-events-none">
                    {activeManualPositions.slice(0, 6).map((position) => {
                      const openedAt = position.opened_at || position.created_at
                      if (!openedAt) return null
                      const secondsPerCandle = getTimeframeSeconds(timeframe)
                      const candleTime = Math.floor(new Date(openedAt).getTime() / 1000 / secondsPerCandle) * secondsPerCandle
                      const x = chartRef.current?.timeScale().timeToCoordinate(candleTime as UTCTimestamp)
                      if (x === null || x === undefined) return null
                      const chartWidth = containerRef.current?.clientWidth ?? 0
                      const clampedX = chartWidth ? Math.min(Math.max(x, 16), chartWidth - 16) : x

                      const referencePrice = position.entry_price ? Number(position.entry_price) : undefined
                      const y = referencePrice ? seriesRef.current?.priceToCoordinate(referencePrice) : null
                      if (y === null || y === undefined) return null
                      const chartHeight = containerRef.current?.clientHeight ?? 0
                      if (chartHeight && (y < 0 || y > chartHeight)) return null

                      return (
                        <div
                          key={`${position.id}-entry-flag`}
                          className="absolute"
                          style={{
                            left: clampedX,
                            top: Math.max(40, y) - 40,
                            transform: 'translateX(-50%)',
                          }}
                        >
                          <div className={`rounded px-2 py-1 text-[10px] font-semibold shadow-md ${
                            position.position_side === 'long'
                              ? 'bg-emerald-600/80 text-emerald-100'
                              : 'bg-rose-600/80 text-rose-100'
                          }`}>
                            P
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {showPositions && positionStackMode && (
                  <div className="absolute left-3 top-3 z-40 w-[220px] rounded-2xl border border-white/[0.06] bg-black/30 p-3 shadow-xl backdrop-blur pointer-events-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Positions</span>
                      <button
                        type="button"
                        onClick={() => setShowPositions(false)}
                        className="text-[10px] text-neutral-500 hover:text-neutral-200"
                      >
                        hide
                      </button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {activeManualPositions.slice(0, 3).map((position) => {
                        const side = position.position_side
                        const openedAt = position.opened_at || position.created_at
                        const openedText = openedAt ? new Date(openedAt).toLocaleString() : '-'
                        return (
                          <button
                            key={position.id}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedPosition(position)
                              setPanelTab('detail')
                            }}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${
                              side === 'long'
                                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                                : 'border-rose-400/30 bg-rose-400/10 text-rose-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold uppercase tracking-[0.2em]">{side}</span>
                              <span className="text-[10px] text-neutral-400">{position.symbol}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-neutral-200">
                              Entry {position.entry_price || '-'}
                            </div>
                            <div className="mt-1 text-[10px] text-neutral-400">
                              SL {position.stop_loss || '-'} · TP {position.take_profit || '-'}
                            </div>
                            <div className="mt-1 text-[10px] text-neutral-500">
                              Opened {openedText}
                            </div>
                          </button>
                        )
                      })}
                      {activeManualPositions.length === 0 && (
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] text-neutral-400">
                          No open positions
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {densityAdjustedPositions.map((group) => {
            // 토글에 따라 필터링
            const visibleBubbles = showBubbles ? group.bubbles : []
            const visibleTrades = showTrades ? group.trades : []

            // 표시할 항목이 없으면 렌더링하지 않음
            if (visibleBubbles.length === 0 && visibleTrades.length === 0) return null

            // 차트 영역 밖이면 렌더링하지 않음 (여유 40px)
            if (group.x < -40 || group.x > (containerRef.current?.clientWidth || 0) + 40) return null
            if (group.y < 0 || group.y > (containerRef.current?.clientHeight || 0)) return null

            const hasBubbles = visibleBubbles.length > 0
            const hasTrades = visibleTrades.length > 0
            const bubbleCount = visibleBubbles.length
            const tradeCount = visibleTrades.length
            const buyTradeCount = visibleTrades.filter((t) => t.side === 'buy').length
            const sellTradeCount = visibleTrades.filter((t) => t.side === 'sell').length
            const tooltipBelow = group.y < 120

            // Determine Marker Style
            let bgColor = 'bg-neutral-700'

            if (hasBubbles && hasTrades) {
              bgColor = 'bg-neutral-800'
            } else if (hasBubbles) {
              const isBuy = visibleBubbles.some(b => b.tags?.includes('buy') || b.action === 'BUY')
              const isSell = visibleBubbles.some(b => b.tags?.includes('sell') || b.action === 'SELL')
              if (isBuy && isSell) bgColor = 'bg-yellow-600'
              else if (isBuy) bgColor = 'bg-green-600'
              else if (isSell) bgColor = 'bg-red-600'
              else bgColor = 'bg-neutral-600'
            } else if (hasTrades) {
              if (buyTradeCount > sellTradeCount) bgColor = 'bg-green-900/80 text-green-200'
              else if (sellTradeCount > buyTradeCount) bgColor = 'bg-red-900/80 text-red-200'
              else bgColor = 'bg-blue-900/80 text-blue-200'
            }

            const isSelected = selectedGroup?.candleTime === group.candleTime

            return (
              <div
                key={group.candleTime}
                className="absolute group cursor-pointer hover:z-50"
                style={{ left: group.x, top: Math.max(40, group.y) - 40, transform: 'translateX(-50%)', pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation()
                  const nextGroup = isSelected ? null : { candleTime: group.candleTime, bubbles: visibleBubbles, trades: visibleTrades }
                  setSelectedGroup(nextGroup)
                  // no jump; only select group
                }}
              >
                {/* Visual Connector Line */}
                <div className={`absolute left-1/2 -bottom-10 w-px h-10 -translate-x-1/2 border-l border-dashed pointer-events-none ${isSelected ? 'border-yellow-400' : 'border-neutral-400'} opacity-80`} />

                <div className={`relative rounded px-2 py-1 text-xs font-semibold shadow-md transition-transform hover:scale-110 ${bgColor} ${isSelected ? 'ring-2 ring-yellow-400' : ''} ${hasBubbles && hasTrades ? 'border border-yellow-500' : ''}`}>
                  <div className="flex items-center gap-1">
                    {hasBubbles && (
                      <span className="text-white">{bubbleCount > 1 ? `💬${bubbleCount}` : '💬'}</span>
                    )}
                    {hasTrades && (
                      <span className="text-xs">
                        {tradeCount > 1
                          ? `${buyTradeCount > 0 ? `↑${buyTradeCount}` : ''}${buyTradeCount > 0 && sellTradeCount > 0 ? '/' : ''}${sellTradeCount > 0 ? `↓${sellTradeCount}` : ''}`
                          : (
                            <>
                              {buyTradeCount > 0 && '↑'}
                              {sellTradeCount > 0 && '↓'}
                            </>
                          )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tooltip */}
                <div className={`absolute left-1/2 hidden -translate-x-1/2 rounded-lg bg-white/[0.06] border border-white/[0.08] p-3 text-xs text-neutral-200 shadow-xl group-hover:block min-w-[220px] max-h-[260px] overflow-y-auto z-50 ${tooltipBelow ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                  <div className="font-bold border-b border-neutral-700 pb-1 mb-2 text-center">
                    {new Date(group.candleTime * 1000).toLocaleString()}
                  </div>
                  {/* Bubbles List */}
                  {hasBubbles && (
                    <div className="mb-2">
                      <div className="text-[10px] uppercase text-neutral-500 mb-1">Bubbles</div>
                      {visibleBubbles.map(b => (
                        <div key={b.id} className="mb-1 last:mb-0 p-1 bg-white/[0.08] rounded">
                          <div className="flex justify-between">
                            <span className={b.action === 'BUY' ? 'text-green-400' : b.action === 'SELL' ? 'text-red-400' : ''}>{b.action || 'NOTE'}</span>
                            <span>${b.price}</span>
                          </div>
                          <div className="text-neutral-400 max-w-[240px] break-words line-clamp-2" title={b.note}>
                            {b.note}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Trades List */}
                  {hasTrades && (
                    <div>
                      <div className="text-[10px] uppercase text-neutral-500 mb-1">Trades</div>
                      {visibleTrades.map(t => (
                        <div key={t.id} className="mb-1 last:mb-0 p-1 bg-white/[0.04] rounded flex justify-between">
                          <span className={t.side === 'buy' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{t.side.toUpperCase()}</span>
                          <span>{t.qty} @ {t.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Bubble Board</p>
            <h3 className="mt-2 text-lg font-semibold text-neutral-100">말풍선 컨트롤</h3>
            <p className="text-xs text-neutral-400 mt-1">
              {filteredBubbles.length} bubbles · {activeTrades.length} trades
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPanelTab('summary')}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                panelTab === 'summary'
                  ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                  : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setPanelTab('detail')}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                panelTab === 'detail'
                  ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                  : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
              }`}
            >
              Detail
            </button>
          </div>

          {panelTab === 'summary' && (
            <>
              <div className="space-y-3">
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>말풍선 요약</span>
                    <span>{bubbleSummary.total.toLocaleString()}개</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                    <span className="rounded-full border border-emerald-500/40 px-2 py-0.5 text-emerald-300">BUY {bubbleSummary.buy}</span>
                    <span className="rounded-full border border-rose-500/40 px-2 py-0.5 text-rose-300">SELL {bubbleSummary.sell}</span>
                    <span className="rounded-full border border-sky-500/40 px-2 py-0.5 text-sky-300">HOLD {bubbleSummary.hold}</span>
                    <span className="rounded-full border border-emerald-400/40 px-2 py-0.5 text-emerald-200">TP {bubbleSummary.tp}</span>
                    <span className="rounded-full border border-rose-400/40 px-2 py-0.5 text-rose-200">SL {bubbleSummary.sl}</span>
                    <span className="rounded-full border border-neutral-600/60 px-2 py-0.5 text-neutral-300">NOTE {bubbleSummary.note}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-500">
                    <span>현재 밀도: {densityOptions.find((option) => option.value === densityMode)?.label}</span>
                    <span>표시 {densitySummary.markers.toLocaleString()} / {densitySummary.totalMarkers.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-600">
                    <span>집계</span>
                    <span>
                      💬 {densitySummary.bubbles.toLocaleString()} · ↕ {densitySummary.trades.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-neutral-500">밀도 옵션</p>
                  <FilterPills
                    options={densityOptions.map((option) => ({ value: option.value, label: option.label }))}
                    value={densityMode}
                    onChange={(value) => setDensityMode(value as typeof densityOptions[number]['value'])}
                    tone="amber"
                    ariaLabel="Density filter"
                  />
                </div>

                <input
                  value={bubbleSearch}
                  onChange={(e) => setBubbleSearch(e.target.value)}
                  placeholder="메모/태그 검색"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                />
                <div className="flex flex-wrap gap-2">
                  {actionOptions.map((action) => (
                    <button
                      key={action}
                      onClick={() => setActionFilter(action)}
                      className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                        actionFilter === action
                          ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                          : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>최근 기록</span>
                  <span>{filteredBubbles.length} items</span>
                </div>
                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-2">
                  {filteredBubbles.length === 0 && (
                    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4 text-xs text-neutral-500">
                      표시할 버블이 없습니다.
                    </div>
                  )}
                  {filteredBubbles.slice(0, 40).map((bubble) => (
                    <div key={bubble.id} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span>{new Date(bubble.ts).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
                        <span className={bubble.action === 'BUY' ? 'text-green-400' : bubble.action === 'SELL' ? 'text-red-400' : 'text-neutral-400'}>
                          {bubble.action || 'NOTE'}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-neutral-500">
                        생성 {new Date(bubble.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                      </div>
                      <p className="mt-1 text-sm text-neutral-200 line-clamp-2">{bubble.note}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
                        <span className="rounded-full border border-neutral-700 px-2 py-0.5">{bubble.symbol}</span>
                        <span className="rounded-full border border-neutral-700 px-2 py-0.5">{bubble.timeframe}</span>
                        <button
                          type="button"
                          onClick={() => focusOnTimestamp(bubble.ts, bubble.timeframe)}
                          className="rounded-full border border-cyan-400/40 px-2 py-0.5 text-cyan-200 hover:bg-cyan-400/10"
                        >
                          차트로 이동
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {panelTab === 'detail' && (
            <div className="space-y-3">
              {!selectedGroup && !selectedPosition && (
                <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4 text-xs text-neutral-500">
                  차트에서 말풍선을 선택하면 상세가 표시됩니다.
                </div>
              )}
              {selectedPosition && (
                <div className="space-y-3 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Position</p>
                      <h3 className="mt-1 text-sm font-semibold text-neutral-100">
                        {selectedPosition.symbol} · {selectedPosition.position_side.toUpperCase()}
                      </h3>
                      <p className="mt-1 text-xs text-neutral-400">
                        {selectedPosition.opened_at ? new Date(selectedPosition.opened_at).toLocaleString() : '시간 정보 없음'}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedPosition(null)}
                      className="rounded-lg border border-neutral-700 px-2 py-1 text-[10px] text-neutral-400 hover:bg-neutral-800"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="grid gap-2 text-xs text-neutral-300">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Entry</span>
                      <span>{selectedPosition.entry_price || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">SL</span>
                      <span>{selectedPosition.stop_loss || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">TP</span>
                      <span>{selectedPosition.take_profit || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Size</span>
                      <span>{selectedPosition.size || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Leverage</span>
                      <span>{selectedPosition.leverage || '-'}</span>
                    </div>
                    {selectedPosition.strategy && (
                      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2 text-[11px] text-neutral-300">
                        전략: {selectedPosition.strategy}
                      </div>
                    )}
                    {selectedPosition.memo && (
                      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2 text-[11px] text-neutral-300">
                        메모: {selectedPosition.memo}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selectedGroup && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Selected</p>
                      <h3 className="mt-1 text-sm font-semibold text-neutral-100">
                        {new Date(selectedGroup.candleTime * 1000).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedGroup(null)}
                      className="rounded-lg border border-neutral-700 px-2 py-1 text-[10px] text-neutral-400 hover:bg-neutral-800"
                    >
                      닫기
                    </button>
                  </div>

                  {selectedGroup.bubbles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                        Bubbles ({selectedGroup.bubbles.length})
                      </p>
                      <div className="max-h-[220px] overflow-y-auto space-y-2 pr-2">
                        {selectedGroup.bubbles.map((bubble) => (
                          <div key={bubble.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${
                                bubble.action === 'BUY' ? 'text-green-400' :
                                bubble.action === 'SELL' ? 'text-red-400' :
                                bubble.action === 'TP' ? 'text-emerald-300' :
                                bubble.action === 'SL' ? 'text-rose-300' :
                                'text-neutral-300'
                              }`}>
                                {bubble.action || 'NOTE'}
                              </span>
                              <span className="text-xs text-neutral-400">${bubble.price.toLocaleString()}</span>
                            </div>
                            <div className="mt-1 text-[10px] text-neutral-500">
                              캔들 {new Date(bubble.ts).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                            </div>
                            <div className="mt-0.5 text-[10px] text-neutral-500">
                              생성 {new Date(bubble.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                            </div>
                            <p className="mt-1 text-xs text-neutral-200 line-clamp-2">{bubble.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedGroup.trades.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                        Trades ({selectedGroup.trades.length})
                      </p>
                      <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                        {selectedGroup.trades.map((trade) => (
                          <div key={trade.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                            <div className="flex items-center justify-between text-xs text-neutral-500">
                              <span className={trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                                {trade.side.toUpperCase()}
                              </span>
                              <span>{trade.exchange}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-neutral-300">
                              <span>{trade.qty ?? '-'} qty</span>
                              <span>@ ${trade.price.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </aside>
      </section>

      <BubbleCreateModal
        open={isModalOpen}
        symbol={selectedSymbol}
        defaultTimeframe={timeframe}
        defaultPrice={clickedCandle?.price.toString() || latestPrice}
        defaultTime={clickedCandle?.time ? clickedCandle.time * 1000 : undefined}
        disableAi={guestMode}
        onClose={() => { setIsModalOpen(false); setClickedCandle(null) }}
      />
    </div>
  )
}
