'use client'

import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createChart, ColorType, CrosshairMode, TickMarkType, type Time, type UTCTimestamp } from 'lightweight-charts'
import { api, DEFAULT_SYMBOLS } from '../lib/api'
import { exportBubbles, importBubbles } from '../lib/dataHandler'
import { parseTradeCsv } from '../lib/csvParser'
import { isGuestSession } from '../lib/guestSession'
import { BubbleCreateModal } from '../components/BubbleCreateModal'
import { useBubbleStore, type Bubble, type Trade } from '../lib/bubbleStore'
import { useToast } from '../components/ui/Toast'
import { ChartReplay } from '../components/chart/ChartReplay'
import { FilterGroup, FilterPills } from '../components/ui/FilterPills'
import { PageJumpPager } from '../components/ui/PageJumpPager'
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

const CLUSTER_PX = 28 // cluster event lane markers within this pixel distance

const densityOptions = [
  { value: 'smart', label: 'Auto' },
  { value: 'recent', label: '최근' },
  { value: 'daily', label: '일간' },
  { value: 'weekly', label: '주간' },
  { value: 'monthly', label: '월간' },
  { value: 'all', label: '전체' },
] as const

const actionOptions = ['ALL', 'BUY', 'SELL', 'HOLD', 'TP', 'SL', 'NONE'] as const
const CHART_PANEL_PAGE_SIZE = 12

const initialHistoryTargets: Record<string, number> = {
  '1m': 1500,
  '15m': 1800,
  '1h': 2200,
  '4h': 2200,
  '1d': 2200,
}

const initialVisibleCandlesByTimeframe: Record<string, number> = {
  '1m': 240,
  '15m': 320,
  '1h': 336,
  '4h': 240,
  '1d': 365,
}

const dedupeAndSortKlines = (items: KlineItem[]) => {
  const unique = new Map<number, KlineItem>()
  items.forEach((item) => unique.set(item.time, item))
  return Array.from(unique.values()).sort((a, b) => a.time - b.time)
}

const normalizeUpbitSymbol = (value: string) => {
  const symbol = value.toUpperCase()
  if (symbol.includes('-')) {
    const parts = symbol.split('-')
    if (parts.length === 2) {
      const [first, second] = parts
      const quoteCurrencies = new Set(['KRW', 'BTC', 'USDT'])
      if (quoteCurrencies.has(first)) return symbol
      if (quoteCurrencies.has(second)) return `${second}-${first}`
    }
    return symbol
  }
  if (symbol.endsWith('KRW') && symbol.length > 3) {
    return `KRW-${symbol.slice(0, -3)}`
  }
  if (symbol.endsWith('BTC') && symbol.length > 3) {
    return `BTC-${symbol.slice(0, -3)}`
  }
  if (symbol.endsWith('USDT') && symbol.length > 4) {
    return `USDT-${symbol.slice(0, -4)}`
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

const detectDataSource = (value: string): 'crypto' | 'stock' => {
  return isMarketSupported(value) ? 'crypto' : 'stock'
}

const getWeekKey = (value: Date) => {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${weekNo}`
}

const getBubbleDisplayType = (bubble: Bubble) => (bubble.bubbleType || 'manual').toLowerCase()

const getBubbleDisplayNote = (bubble: Bubble) => {
  if (getBubbleDisplayType(bubble) === 'auto') {
    if (bubble.tags?.includes('buy')) return '자동매매: 매수 동기화'
    if (bubble.tags?.includes('sell')) return '자동매매: 매도 동기화'
    return '자동 기록: 거래 동기화'
  }
  return bubble.note || '-'
}

const getBubbleSourceBadge = (bubble: Bubble) => (getBubbleDisplayType(bubble) === 'auto' ? '자동' : '수동')

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

const seoulTimeZone = 'Asia/Seoul'

function toTimeSeconds(value: Time): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : Math.floor(parsed.getTime() / 1000)
  }
  if (value && typeof value === 'object' && 'year' in value && 'month' in value && 'day' in value) {
    const candidate = value as { year: number; month: number; day: number }
    return Math.floor(Date.UTC(candidate.year, candidate.month - 1, candidate.day) / 1000)
  }
  return null
}

function formatChartDateTime(value: Time | number, useSeoulTime: boolean) {
  const seconds = typeof value === 'number' ? value : toTimeSeconds(value)
  if (seconds == null) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: useSeoulTime ? seoulTimeZone : 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(seconds * 1000))
}

function formatChartTickMark(value: Time, tickMarkType: TickMarkType, useSeoulTime: boolean) {
  const seconds = toTimeSeconds(value)
  if (seconds == null) return null
  const date = new Date(seconds * 1000)
  const timeZone = useSeoulTime ? seoulTimeZone : 'UTC'

  if (tickMarkType === TickMarkType.Time || tickMarkType === TickMarkType.TimeWithSeconds) {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function Chart() {
  const { symbol: symbolParam } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const eventLaneRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const overlayRafRef = useRef<number | null>(null)
  const seriesRef = useRef<ReturnType<ReturnType<typeof createChart>['addCandlestickSeries']> | null>(null)
  const [symbols, setSymbols] = useState<UserSymbolItem[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const useSeoulTime = resolveExchange(selectedSymbol) === 'upbit'
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
  const isLightWorkspace = themeMode === 'ledger'
  const isCompactLayout = true // keep compact single-row event lane geometry regardless of theme
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

  const [summaryPage, setSummaryPage] = useState(1)
  const [summaryPageInput, setSummaryPageInput] = useState('1')

  const [detailBubblePage, setDetailBubblePage] = useState(1)
  const [detailTradePage, setDetailTradePage] = useState(1)
  const [detailBubblePageInput, setDetailBubblePageInput] = useState('1')
  const [detailTradePageInput, setDetailTradePageInput] = useState('1')

  const fallbackSymbols = useMemo<UserSymbolItem[]>(() => {
    const sourceItems = quickPicks
      .filter((item) => detectDataSource(item.value) === dataSource)
      .map((item) => ({
        symbol: item.value.toUpperCase(),
        timeframe_default: '1d',
      }))
    if (sourceItems.length > 0) return sourceItems
    return DEFAULT_SYMBOLS.filter((item) => detectDataSource(item.symbol) === dataSource)
  }, [dataSource])

  const visibleSymbols = useMemo(() => {
    const filtered = symbols.filter((item) => detectDataSource(item.symbol) === dataSource)
    return filtered.length > 0 ? filtered : fallbackSymbols
  }, [dataSource, fallbackSymbols, symbols])

  const visibleQuickPicks = useMemo(
    () => quickPicks.filter((item) => detectDataSource(item.value) === dataSource),
    [dataSource]
  )

  // Refs for stable access in effects/callbacks
  const overlayPositionsRef = useRef(overlayPositions)
  const updatePositionsRef = useRef<() => void>(() => { })
  const loadMoreHistoryRef = useRef<() => Promise<void>>(async () => { })

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
      fetchBubblesFromServer(200, true).catch(() => null)
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
    fetchBubblesFromServer(200, true).catch(() => null)
  }, [mounted, guestMode, accessToken, fetchBubblesFromServer, resetSessionData])

  useEffect(() => {
    if (selectedGroup) {
      setPanelTab('detail')
    }
  }, [selectedGroup])

  useEffect(() => {
    setDetailBubblePage(1)
    setDetailTradePage(1)
    setDetailBubblePageInput('1')
    setDetailTradePageInput('1')
  }, [selectedGroup?.candleTime, selectedGroup?.bubbles.length, selectedGroup?.trades.length])

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
    const inferredSource = detectDataSource(selected)

    setSelectedSymbol(selected)
    setDataSource(inferredSource)
    setTimeframe('1d')
    if (!normalizedParam) {
      router.replace(`/chart/${selected}`)
    }
  }, [router, symbolParam, symbols])

  useEffect(() => {
    if (!selectedSymbol || visibleSymbols.length === 0) return
    if (detectDataSource(selectedSymbol) === dataSource) return

    const next = visibleSymbols[0]
    setSelectedSymbol(next.symbol)
    setTimeframe('1d')
    router.replace(`/chart/${next.symbol}`)
  }, [dataSource, router, selectedSymbol, visibleSymbols])

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
      noMoreHistoryRef.current = false
      lastHistoryLoadRef.current = 0
      try {
        const exchange = resolveExchange(selectedSymbol)
        const symbol = exchange === 'upbit' ? normalizeUpbitSymbol(selectedSymbol) : selectedSymbol
        const response = await api.get('/v1/market/klines', {
          params: { symbol, interval: timeframe, limit: 500, exchange },
        })
        if (!active) return
        let merged = dedupeAndSortKlines(response.data || [])
        const targetCount = initialHistoryTargets[timeframe] || 1800
        let oldestLoadedTime = merged[0]?.time ?? null
        let attempts = 0

        while (active && oldestLoadedTime != null && merged.length < targetCount && attempts < 6) {
          const olderResponse = await api.get('/v1/market/klines', {
            params: { symbol, interval: timeframe, limit: 500, endTime: oldestLoadedTime * 1000 - 1, exchange },
          })
          const olderKlines = olderResponse.data || []
          if (olderKlines.length === 0) {
            noMoreHistoryRef.current = true
            break
          }

          const nextMerged = dedupeAndSortKlines([...olderKlines, ...merged])
          const nextOldestTime = nextMerged[0]?.time ?? null
          if (nextOldestTime === oldestLoadedTime) break

          merged = nextMerged
          oldestLoadedTime = nextOldestTime
          attempts += 1
        }

        setKlines(merged)
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
    const maxMarkers = isCompactLayout ? 44 : 60
    if (filtered.length > maxMarkers) {
      const step = Math.ceil(filtered.length / maxMarkers)
      filtered = filtered.filter((_, index) => index % step === 0)
    }
    return filtered.sort((a, b) => a.candleTime - b.candleTime)
  }, [overlayPositions, densityMode, visibleRange, isCompactLayout])

  const filteredBubbles = useMemo(() => {
    const query = bubbleSearch.trim().toLowerCase()
    return activeBubbles.filter((bubble) => {
      if (actionFilter !== 'ALL' && bubble.action !== actionFilter) return false
      if (!query) return true
      return (bubble.note || '').toLowerCase().includes(query) || (bubble.tags || []).some((tag) => tag.toLowerCase().includes(query))
    }).sort((a, b) => b.ts - a.ts)
  }, [activeBubbles, bubbleSearch, actionFilter])

  const filteredBubbleIds = useMemo(() => {
    return new Set(filteredBubbles.map((bubble) => bubble.id))
  }, [filteredBubbles])

  const visibleMarkerGroups = useMemo(() => {
    return densityAdjustedPositions
      .map((group) => ({
        ...group,
        bubbles: showBubbles ? group.bubbles.filter((bubble) => filteredBubbleIds.has(bubble.id)) : [],
        trades: showTrades ? group.trades : [],
      }))
      .filter((group) => group.bubbles.length > 0 || group.trades.length > 0)
      .sort((a, b) => a.x - b.x || a.candleTime - b.candleTime)
  }, [densityAdjustedPositions, showBubbles, showTrades, filteredBubbleIds])

  const buildTrackLayout = useCallback((groups: typeof visibleMarkerGroups) => {
    const layout = new Map<number, { lane: number }>()
    const active: Array<{ x: number; lane: number }> = []
    const maxTrackLane = isCompactLayout ? 0 : 2
    const expireDistance = isCompactLayout ? 86 : 92
    const overlapDistance = isCompactLayout ? 58 : 56

    groups.forEach((group) => {
      for (let index = active.length - 1; index >= 0; index -= 1) {
      if (group.x - active[index].x > expireDistance) {
          active.splice(index, 1)
        }
      }

      let lane = 0
      while (active.some((item) => Math.abs(item.x - group.x) < overlapDistance && item.lane === lane) && lane < maxTrackLane) {
        lane += 1
      }
      lane = Math.min(lane, maxTrackLane)

      layout.set(group.candleTime, { lane })
      active.push({ x: group.x, lane })
    })

    const lanes = Array.from(layout.values()).map((item) => item.lane)
    return {
      layout,
      maxLane: lanes.length ? Math.max(...lanes) : 0,
    }
  }, [isCompactLayout])

  const bubbleTrackLayout = useMemo(() => {
    return buildTrackLayout(visibleMarkerGroups.filter((group) => group.bubbles.length > 0))
  }, [visibleMarkerGroups, buildTrackLayout])

  const tradeTrackLayout = useMemo(() => {
    return buildTrackLayout(visibleMarkerGroups.filter((group) => group.trades.length > 0))
  }, [visibleMarkerGroups, buildTrackLayout])

  const clusteredBubbleMarkers = useMemo(() => {
    const groups = visibleMarkerGroups.filter((g) => g.bubbles.length > 0)
    const result: Array<{ x: number; primaryCandleTime: number; candleTimes: number[]; bubbles: Bubble[]; trades: OverlayTrade[] }> = []
    const rightmostX: number[] = [] // tracks rightmost merged x per cluster for comparison
    for (const g of groups) {
      const last = result[result.length - 1]
      const lastRight = rightmostX[rightmostX.length - 1] ?? -Infinity
      if (last && g.x - lastRight < CLUSTER_PX) {
        rightmostX[rightmostX.length - 1] = g.x
        last.candleTimes.push(g.candleTime)
        last.bubbles = [...last.bubbles, ...g.bubbles]
      } else {
        result.push({ x: g.x, primaryCandleTime: g.candleTime, candleTimes: [g.candleTime], bubbles: [...g.bubbles], trades: [] })
        rightmostX.push(g.x)
      }
    }
    return result
  }, [visibleMarkerGroups])

  const clusteredTradeMarkers = useMemo(() => {
    const groups = visibleMarkerGroups.filter((g) => g.trades.length > 0)
    const result: Array<{ x: number; primaryCandleTime: number; candleTimes: number[]; bubbles: Bubble[]; trades: OverlayTrade[] }> = []
    const rightmostX: number[] = []
    for (const g of groups) {
      const last = result[result.length - 1]
      const lastRight = rightmostX[rightmostX.length - 1] ?? -Infinity
      if (last && g.x - lastRight < CLUSTER_PX) {
        rightmostX[rightmostX.length - 1] = g.x
        last.candleTimes.push(g.candleTime)
        last.trades = [...last.trades, ...g.trades]
      } else {
        result.push({ x: g.x, primaryCandleTime: g.candleTime, candleTimes: [g.candleTime], bubbles: [], trades: [...g.trades] })
        rightmostX.push(g.x)
      }
    }
    return result
  }, [visibleMarkerGroups])

  const selectedVisibleGroup = useMemo(() => {
    if (!selectedGroup) return null
    return visibleMarkerGroups.find((group) => group.candleTime === selectedGroup.candleTime) ?? null
  }, [visibleMarkerGroups, selectedGroup])
  const selectionDockGroup = selectedGroup

  const eventLaneTrackRows = isCompactLayout ? 1 : 3
  const eventLaneTrackGap = isCompactLayout ? 12 : 22
  const eventLaneRowHeight = isCompactLayout ? 0 : 18
  const eventLaneMarkerOffsetTop = isCompactLayout ? 24 : 36
  const eventLaneBubbleTrackTop = isCompactLayout ? 10 : 18
  const eventLaneBubbleTrackHeight = (isCompactLayout ? 42 : 56) + (eventLaneTrackRows * eventLaneRowHeight)
  const eventLaneTradeTrackTop = eventLaneBubbleTrackTop + eventLaneBubbleTrackHeight + eventLaneTrackGap
  const eventLaneTradeTrackHeight = (isCompactLayout ? 42 : 56) + (eventLaneTrackRows * eventLaneRowHeight)
  const eventLaneBubbleRailCenter = eventLaneBubbleTrackTop + 32
  const eventLaneTradeRailCenter = eventLaneTradeTrackTop + 32
  const eventLaneAxisTop = eventLaneTradeTrackTop + eventLaneTradeTrackHeight + (isCompactLayout ? 8 : 10)
  const eventLaneAxisHeight = isCompactLayout ? 24 : 26
  const eventLaneHeight = eventLaneAxisTop + eventLaneAxisHeight + (isCompactLayout ? 8 : 12)
  const fallbackWorkspaceHeight = 560 + (isCompactLayout ? 64 : 92) + eventLaneHeight + (isCompactLayout ? 56 : 72)
  const measuredWorkspaceHeight = wrapperRef.current?.clientHeight ?? fallbackWorkspaceHeight
  const viewportPanelBudget = typeof window !== 'undefined' && wrapperRef.current
    ? Math.max(420, Math.floor(window.innerHeight - wrapperRef.current.getBoundingClientRect().top - 20))
    : measuredWorkspaceHeight
  const rightPanelTargetHeight = Math.min(measuredWorkspaceHeight, viewportPanelBudget)

  const eventLaneTicks = useMemo(() => {
    const chart = chartRef.current
    const chartWidth = containerRef.current?.clientWidth || 0
    if (!chart || chartWidth <= 0 || chartData.length === 0) return []

    const visibleItems = chartData.filter((item) => {
      const time = Number(item.time)
      if (!visibleRange) return true
      return time >= visibleRange.from && time <= visibleRange.to
    })
    if (visibleItems.length === 0) return []

    const targetCount = Math.min(isCompactLayout ? 8 : 7, Math.max(4, Math.floor(chartWidth / 150)))
    const candidateIndexes = new Set<number>([0, visibleItems.length - 1])
    if (visibleItems.length > 2) {
      for (let step = 1; step < targetCount - 1; step += 1) {
        candidateIndexes.add(Math.round((step * (visibleItems.length - 1)) / (targetCount - 1)))
      }
    }

    const tickType = timeframe === '1m' || timeframe === '15m' || timeframe === '1h'
      ? TickMarkType.Time
      : TickMarkType.DayOfMonth

    return Array.from(candidateIndexes)
      .sort((a, b) => a - b)
      .map((index) => {
        const item = visibleItems[index]
        const x = chart.timeScale().timeToCoordinate(item.time)
        const label = formatChartTickMark(item.time, tickType, useSeoulTime)
        return x == null || !label ? null : { x, label }
      })
      .filter((tick): tick is NonNullable<typeof tick> => tick !== null)
      .filter((tick, index, ticks) => {
        if (tick.x < 18 || tick.x > chartWidth - 18) return false
        if (index === 0) return true
        return Math.abs(tick.x - ticks[index - 1].x) >= 54
      })
  }, [chartData, visibleRange, timeframe, useSeoulTime, isCompactLayout])

  const adjustEventLaneLogicalRange = useCallback((deltaX: number, deltaY: number, clientX: number) => {
    if (!isCompactLayout || !chartRef.current || !containerRef.current) return false
    const timeScale = chartRef.current.timeScale() as {
      getVisibleLogicalRange?: () => { from: number; to: number } | null
      setVisibleLogicalRange?: (range: { from: number; to: number }) => void
      coordinateToLogical?: (x: number) => number | null
    }

    const logicalRange = timeScale.getVisibleLogicalRange?.()
    if (!logicalRange) return false

    const chartRect = containerRef.current.getBoundingClientRect()
    const relativeX = Math.min(Math.max(clientX - chartRect.left, 0), chartRect.width)

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const shift = deltaX * 0.02
      timeScale.setVisibleLogicalRange?.({
        from: logicalRange.from + shift,
        to: logicalRange.to + shift,
      })
      return true
    }

    const anchor = timeScale.coordinateToLogical?.(relativeX) ?? ((logicalRange.from + logicalRange.to) / 2)
    const zoomFactor = deltaY > 0 ? 1.08 : 0.92
    timeScale.setVisibleLogicalRange?.({
      from: anchor - ((anchor - logicalRange.from) * zoomFactor),
      to: anchor + ((logicalRange.to - anchor) * zoomFactor),
    })
    return true
  }, [isCompactLayout])

  useEffect(() => {
    if (!isCompactLayout || !eventLaneRef.current) return
    const node = eventLaneRef.current
    const onWheel = (event: WheelEvent) => {
      if (!adjustEventLaneLogicalRange(event.deltaX, event.deltaY, event.clientX)) return
      event.preventDefault()
      event.stopPropagation()
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      node.removeEventListener('wheel', onWheel)
    }
  }, [adjustEventLaneLogicalRange, isLightWorkspace])

  const summaryTotalPages = Math.max(1, Math.ceil(filteredBubbles.length / CHART_PANEL_PAGE_SIZE))
  const pagedSummaryBubbles = filteredBubbles.slice(
    (summaryPage - 1) * CHART_PANEL_PAGE_SIZE,
    summaryPage * CHART_PANEL_PAGE_SIZE
  )

  useEffect(() => {
    setSummaryPage(1)
    setSummaryPageInput('1')
  }, [filteredBubbles.length])

  const jumpSummaryPage = () => {
    const parsed = Number.parseInt(summaryPageInput, 10)
    if (Number.isNaN(parsed) || parsed < 1) {
      setSummaryPageInput(String(summaryPage))
      return
    }
    setSummaryPage(Math.min(summaryTotalPages, parsed))
  }

  const handleSummaryPageKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpSummaryPage()
    }
  }

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

  const currentDensityLabel = densityOptions.find((option) => option.value === densityMode)?.label ?? densityMode

  const detailBubbleTotalPages = Math.max(1, Math.ceil((selectedGroup?.bubbles.length || 0) / CHART_PANEL_PAGE_SIZE))
  const detailTradeTotalPages = Math.max(1, Math.ceil((selectedGroup?.trades.length || 0) / CHART_PANEL_PAGE_SIZE))
  const pagedDetailBubbles = (selectedGroup?.bubbles || []).slice(
    (detailBubblePage - 1) * CHART_PANEL_PAGE_SIZE,
    detailBubblePage * CHART_PANEL_PAGE_SIZE
  )
  const pagedDetailTrades = (selectedGroup?.trades || []).slice(
    (detailTradePage - 1) * CHART_PANEL_PAGE_SIZE,
    detailTradePage * CHART_PANEL_PAGE_SIZE
  )

  const jumpDetailBubblePage = () => {
    const parsed = Number.parseInt(detailBubblePageInput, 10)
    if (Number.isNaN(parsed) || parsed < 1) {
      setDetailBubblePageInput(String(detailBubblePage))
      return
    }
    setDetailBubblePage(Math.min(detailBubbleTotalPages, parsed))
  }

  const jumpDetailTradePage = () => {
    const parsed = Number.parseInt(detailTradePageInput, 10)
    if (Number.isNaN(parsed) || parsed < 1) {
      setDetailTradePageInput(String(detailTradePage))
      return
    }
    setDetailTradePage(Math.min(detailTradeTotalPages, parsed))
  }

  const handleDetailBubblePageKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpDetailBubblePage()
    }
  }

  const handleDetailTradePageKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpDetailTradePage()
    }
  }

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
    const initialRect = containerRef.current.getBoundingClientRect()
    const chart = createChart(containerRef.current, {
      layout: initialTheme.layout,
      grid: initialTheme.grid,
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      localization: {
        locale: 'ko-KR',
        timeFormatter: (time: Time) => formatChartDateTime(time, useSeoulTime),
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        rightOffset: 5,
        tickMarkFormatter: (time: Time, tickMarkType: TickMarkType) => formatChartTickMark(time, tickMarkType, useSeoulTime),
      },
      height: Math.round(initialRect.height) || 560,
      width: Math.round(initialRect.width) || undefined,
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
      if (logicalRange.from < 10 && !loadingRef.current && klinesRef.current.length > 0) {
        loadMoreHistoryRef.current()
      }
    }

    chart.timeScale().subscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange)

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length) return
      const { width, height } = entries[0].contentRect
      chart.applyOptions({
        width: Math.round(width),
        height: Math.round(height),
      })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      chart.unsubscribeClick(clickHandler)
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange)
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      prevFirstTimeRef.current = 0
      prevDataLengthRef.current = 0
      noMoreHistoryRef.current = false
    }
  }, [timeframe, updateOverlayPosition, useSeoulTime])

  // Separate data-update effect — fitContent on history prepend, preserve range on append
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || chartData.length === 0) return
    const chart = chartRef.current
    const prevFirstTime = prevFirstTimeRef.current
    const prevDataLength = prevDataLengthRef.current
    const newFirstTime = chartData[0].time as number
    const nextDataLength = chartData.length
    const prependedCount = Math.max(0, nextDataLength - prevDataLength)
    prevFirstTimeRef.current = newFirstTime
    prevDataLengthRef.current = nextDataLength
    const logicalRange = chart.timeScale().getVisibleLogicalRange()
    seriesRef.current.setData(chartData)
    if (!logicalRange || prevDataLength === 0 || prevFirstTime === 0) {
      // First load or history prepended — expand to show all data
      const initialVisibleCount = Math.min(
        initialVisibleCandlesByTimeframe[timeframe] || 240,
        nextDataLength
      )
      const from = Math.max(0, nextDataLength - initialVisibleCount)
      const to = nextDataLength - 1
      if (from < to) {
        chart.timeScale().setVisibleLogicalRange({ from, to })
      }
    } else {
      // Future candles appended — preserve the user's current zoom position
      if (newFirstTime < prevFirstTime && prependedCount > 0) {
        chart.timeScale().setVisibleLogicalRange({
          from: logicalRange.from + prependedCount,
          to: logicalRange.to + prependedCount,
        })
      } else {
        chart.timeScale().setVisibleLogicalRange(logicalRange)
      }
    }
  }, [chartData, timeframe])

  // Ref for loading state to use inside the chart event listener without re-binding
  const loadingRef = useRef(loading)
  useEffect(() => { loadingRef.current = loading }, [loading])

  const klinesRef = useRef(klines)
  useEffect(() => { klinesRef.current = klines }, [klines])

  // 히스토리 로드 디바운싱을 위한 ref
  const lastHistoryLoadRef = useRef<number>(0)
  const historyLoadCooldown = 3000 // 3초 쿨다운
  const prevFirstTimeRef = useRef<number>(0)
  const prevDataLengthRef = useRef<number>(0)
  const noMoreHistoryRef = useRef(false)

  const loadMoreHistory = useCallback(async () => {
    if (noMoreHistoryRef.current) return
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
        noMoreHistoryRef.current = true
        return
      }

      setKlines(dedupeAndSortKlines([...newKlines, ...klinesRef.current]))
      // 토스트 제거 - 너무 자주 뜸

    } catch (err: any) {
      const status = err?.response?.status
      if (status === 400) {
        // Exchange has no data before this point — stop trying
        noMoreHistoryRef.current = true
      } else if (![401, 502, 503, 504].includes(status)) {
        console.error('Failed to load history', err)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedSymbol, timeframe])

  useEffect(() => {
    loadMoreHistoryRef.current = loadMoreHistory
  }, [loadMoreHistory])

  useEffect(() => {
    if (!chartRef.current || loading || klines.length === 0 || noMoreHistoryRef.current) return
    const logicalRange = chartRef.current.timeScale().getVisibleLogicalRange()
    if (!logicalRange || logicalRange.from >= 10) return

    const timeoutId = window.setTimeout(() => {
      loadMoreHistoryRef.current()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [klines.length, loading, selectedSymbol, timeframe])

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

      setKlines(dedupeAndSortKlines([...klinesRef.current, ...newKlines]))
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
    if (!chartRef.current) return

    // 타임프레임에 따라 표시할 캔들 수 제한
    const maxVisibleCandles: Record<string, number> = {
      '1m': 200,
      '15m': 200,
      '1h': 168,   // 약 1주일
      '4h': 180,   // 약 1달
      '1d': 365,   // 1년
    }
    const visibleCount = chartData.length
    void maxVisibleCandles
    void visibleCount

    const logicalRange = chartRef.current.timeScale().getVisibleLogicalRange()
    if (!logicalRange) {
      // 최근 N개 캔들만 보이도록 설정
      const initialVisibleCount = Math.min(
        initialVisibleCandlesByTimeframe[timeframe] || 240,
        chartData.length
      )
      if (chartData.length > 1) {
        chartRef.current.timeScale().setVisibleLogicalRange({
          from: Math.max(0, chartData.length - initialVisibleCount),
          to: chartData.length - 1,
        })
      }
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

  const handleOpenImportHub = () => {
    router.push('/settings')
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
    const matched = visibleSymbols.find((item) => item.symbol === next) || symbols.find((item) => item.symbol === next)
    const inferredSource = detectDataSource(next)
    setDataSource(inferredSource)
    setSelectedSymbol(next)
    setTimeframe('1d')
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

  const workspaceRootClass = isLightWorkspace ? 'flex flex-col gap-4 text-[#1f2937]' : 'flex flex-col gap-5'
  const topShellClass = isLightWorkspace
    ? 'rounded-[24px] border border-[#dedbd3] bg-[#f8f5ee] p-3 shadow-[0_1px_0_rgba(255,255,255,0.84)]'
    : 'kifu-panel p-3 md:p-4'
  const topInnerClass = isLightWorkspace
    ? 'rounded-[20px] border border-[#d8d2c6] bg-[#fcfaf6] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]'
    : 'kifu-panel-muted p-3'
  const chartShellClass = isLightWorkspace
    ? 'relative overflow-hidden rounded-[24px] border border-[#dedbd3] bg-[#f9f8f6] p-3 shadow-[0_1px_0_rgba(255,255,255,0.75)]'
    : 'kifu-panel relative overflow-hidden p-4'
  const sideShellClass = isLightWorkspace
    ? 'flex h-full min-h-0 self-start overflow-hidden flex-col gap-4 rounded-[24px] border border-[#dedbd3] bg-[#f9f8f6] p-5 shadow-[0_1px_0_rgba(255,255,255,0.75)]'
    : 'kifu-panel flex h-full min-h-0 self-start overflow-hidden flex-col gap-4 p-5'
  const fieldClass = isLightWorkspace
    ? 'min-w-[140px] rounded-xl border border-[#d8d2c6] bg-[#fcfaf6] px-3 py-2 text-sm font-semibold text-[#1f2937] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]'
    : 'kifu-field min-w-[140px] py-2 text-sm font-semibold'
  const panelCardClass = isLightWorkspace
    ? 'rounded-xl border border-[#dedbd3] bg-[#fcfaf6] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]'
    : 'rounded-xl border border-white/[0.06] bg-black/20 p-3'
  const panelCardLargeClass = isLightWorkspace
    ? 'rounded-2xl border border-[#dedbd3] bg-[#fcfaf6] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]'
    : 'rounded-2xl border border-white/10 bg-black/20 p-4'
  const emptyPanelClass = isLightWorkspace
    ? 'rounded-lg border border-[#dedbd3] bg-[#fcfaf6] p-4 text-sm text-[#6f675b]'
    : 'rounded-lg border border-white/[0.08] bg-black/20 p-4 text-xs text-neutral-500'
  const sideTabActiveClass = isLightWorkspace
    ? 'border-[#1f2937] bg-[#1f2937] text-[#f9f8f6]'
    : 'border-neutral-100 bg-neutral-100 text-neutral-950'
  const sideTabInactiveClass = isLightWorkspace
    ? 'border-[#dedbd3] bg-[#f9f8f6] text-[#5d574f] hover:border-[#c5beaf] hover:text-[#1f2937]'
    : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
  const filterVariant = isLightWorkspace ? 'paper' : 'default'
  return (
    <div className={workspaceRootClass}>
      <header className={topShellClass}>
        <div className="flex flex-col gap-3">
          <div className={topInnerClass}>
            <div className="flex flex-wrap items-end gap-2.5">
              <FilterGroup label="시장" tone="emerald" variant={filterVariant}>
                <FilterPills
                  options={[
                    { value: 'crypto', label: 'Crypto' },
                    { value: 'stock', label: 'Stock' },
                  ]}
                  value={dataSource}
                  onChange={(value) => setDataSource(value as 'crypto' | 'stock')}
                  tone="emerald"
                  variant={filterVariant}
                  ariaLabel="Market source"
                />
              </FilterGroup>

              <FilterGroup label="심볼" tone="sky" variant={filterVariant}>
                <select
                  value={selectedSymbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  className={fieldClass}
                >
                  {visibleSymbols.map((item) => (
                    <option key={item.symbol} value={item.symbol}>{item.symbol}</option>
                  ))}
                </select>
              </FilterGroup>

              <FilterGroup label="타임프레임" tone="amber" variant={filterVariant}>
                <FilterPills
                  options={intervals.map((interval) => ({ value: interval, label: interval }))}
                  value={timeframe}
                  onChange={(value) => setTimeframe(value)}
                  tone="amber"
                  variant={filterVariant}
                  ariaLabel="Timeframe filter"
                />
              </FilterGroup>

            </div>

            <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">Quick</span>
                {visibleQuickPicks.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => handleSymbolChange(item.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      selectedSymbol === item.value
                        ? isLightWorkspace
                          ? 'border-[#7c7568] bg-[#7c7568] text-[#f9f8f6] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                          : 'border-neutral-100 bg-neutral-100 text-neutral-950'
                        : isLightWorkspace
                          ? 'border-[#d8d2c6] bg-[#fcfaf6] text-[#615b51] hover:border-[#c5beaf] hover:text-[#1f2937]'
                          : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="hidden flex-col gap-3 xl:flex-row xl:items-center">
                <FilterGroup label="레이어" tone="emerald" variant={filterVariant}>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBubbles((prev) => !prev)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                        showBubbles
                          ? isLightWorkspace
                            ? 'border-[#bfd2d5] bg-[#f1f8f9] text-[#3e666d]'
                            : 'border-emerald-300 bg-emerald-300/20 text-emerald-200'
                          : isLightWorkspace
                            ? 'border-[#dedbd3] bg-white/70 text-[#6b655c] hover:border-[#bfd2d5] hover:text-[#3e666d]'
                            : 'border-neutral-700 text-neutral-400 hover:border-emerald-300/40 hover:text-emerald-200'
                      }`}
                    >
                      말풍선
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTrades((prev) => !prev)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                        showTrades
                          ? isLightWorkspace
                            ? 'border-[#d8c6a5] bg-[#fbf5ea] text-[#775c2b]'
                            : 'border-sky-300 bg-sky-300/20 text-sky-200'
                          : isLightWorkspace
                            ? 'border-[#dedbd3] bg-white/70 text-[#6b655c] hover:border-[#d8c6a5] hover:text-[#775c2b]'
                            : 'border-neutral-700 text-neutral-400 hover:border-sky-300/40 hover:text-sky-200'
                      }`}
                    >
                      체결
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPositions((prev) => !prev)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                        showPositions
                          ? isLightWorkspace
                            ? 'border-[#ccd8c4] bg-[#f3f8ef] text-[#566a4c]'
                            : 'border-emerald-300 bg-emerald-300/20 text-emerald-200'
                          : isLightWorkspace
                            ? 'border-[#dedbd3] bg-white/70 text-[#6b655c] hover:border-[#ccd8c4] hover:text-[#566a4c]'
                            : 'border-neutral-700 text-neutral-400 hover:border-emerald-300/40 hover:text-emerald-200'
                      }`}
                    >
                      포지션
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTrades(true)
                        setShowBubbles(false)
                      }}
                      className={isLightWorkspace
                        ? 'rounded-full border border-[#d8cdb6] bg-[#f8f1e3] px-3.5 py-1.5 text-sm font-semibold text-[#6e5e35] transition hover:border-[#cdbf9c] hover:bg-[#f3ead6]'
                        : 'rounded-full border border-indigo-300/40 bg-indigo-300/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-300/20'}
                    >
                      체결 집중
                    </button>
                  </div>
                </FilterGroup>

                <FilterGroup label="밀도" tone="amber" variant={filterVariant}>
                  <FilterPills
                    options={densityOptions.map((option) => ({ value: option.value, label: option.label }))}
                    value={densityMode}
                    onChange={(value) => setDensityMode(value as typeof densityOptions[number]['value'])}
                    tone="amber"
                    variant={filterVariant}
                    ariaLabel="Density filter"
                  />
                </FilterGroup>
              </div>
            </div>

            {showAdvancedControls && !isLightWorkspace && (
              <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 lg:grid-cols-[0.82fr_1.18fr]">
                <div>
                  <p className="kifu-eyebrow">Lab</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">
                    일반 복기에는 꼭 필요하지 않은 실험용 보기 설정입니다. 기본 화면과 분리해서 두었습니다.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <FilterGroup label="스타일" tone="sky">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowStyleMenu((prev) => !prev)}
                        className="kifu-btn-secondary w-full justify-between"
                      >
                        {chartThemes[themeMode].label}
                      </button>
                      {showStyleMenu && (
                        <div className="absolute right-0 z-50 mt-2 w-44 rounded-2xl border border-white/10 bg-neutral-950/95 p-2 shadow-xl">
                          {Object.entries(chartThemes).map(([value, item]) => (
                            <button
                              key={value}
                              onClick={() => {
                                setThemeMode(value as keyof typeof chartThemes)
                                setShowStyleMenu(false)
                              }}
                              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                                themeMode === value
                                  ? 'bg-sky-300/20 text-sky-200'
                                  : 'text-neutral-300 hover:bg-white/5'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </FilterGroup>

                  <FilterGroup label="자동 버블" tone="rose">
                    <button
                      type="button"
                      onClick={() => setAutoBubbleFromTrades((prev) => !prev)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                        autoBubbleFromTrades
                          ? 'border-rose-300 bg-rose-300/20 text-rose-200'
                          : 'border-neutral-700 text-neutral-400 hover:border-rose-300/40 hover:text-rose-200'
                      }`}
                    >
                      {autoBubbleFromTrades ? '사용 중' : '꺼짐'}
                    </button>
                  </FilterGroup>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
            {(dataSource === 'crypto' && !isMarketSupported(selectedSymbol)) && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                현재 차트 데이터는 Binance(USDT/USDC/USD) 및 Upbit(KRW-*) 기반입니다. 기타 심볼은 준비 중입니다.
              </div>
            )}
            {(dataSource === 'stock') && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                주식 차트 데이터 소스는 아직 연결되지 않았습니다. (연동 예정)
              </div>
            )}
            {guestMode && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                게스트 모드에서는 API 동기화, CSV 가져오기, AI 요청을 숨기고 읽기 중심 흐름만 보여줍니다.
              </div>
            )}
            {showOnboardingGuide && (
              <div className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-3 text-sm text-cyan-100">
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
          </div>
        </div>
      </header>

      {showReplay && !isLightWorkspace && (
        <div className={isLightWorkspace ? 'rounded-[24px] border border-[#dedbd3] bg-[#fcfaf6] p-4 shadow-[0_1px_0_rgba(255,255,255,0.72)]' : 'rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4'}>
          <ChartReplay
            klines={klines}
            onFilteredKlines={handleReplayFilteredKlines}
            timeframeSeconds={getTimeframeSeconds(timeframe)}
          />
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(340px,0.95fr)]">
        <div className={chartShellClass} ref={wrapperRef}>
          <div className="relative h-[560px] w-full" ref={containerRef}>
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
                  <div className={isLightWorkspace ? 'absolute left-3 top-3 z-40 w-[220px] rounded-2xl border border-[#dedbd3] bg-[#fcfaf6]/95 p-3 shadow-[0_8px_24px_rgba(120,112,98,0.12)] backdrop-blur pointer-events-auto' : 'absolute left-3 top-3 z-40 w-[220px] rounded-2xl border border-white/[0.06] bg-black/30 p-3 shadow-xl backdrop-blur pointer-events-auto'}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">포지션</span>
                      <button
                        type="button"
                        onClick={() => setShowPositions(false)}
                        className={isLightWorkspace ? 'text-[10px] text-[#8a8377] hover:text-[#1f2937]' : 'text-[10px] text-neutral-500 hover:text-neutral-200'}
                      >
                        숨김
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
                              <span className={isLightWorkspace ? 'text-[10px] text-[#8a8377]' : 'text-[10px] text-neutral-400'}>{position.symbol}</span>
                            </div>
                            <div className={isLightWorkspace ? 'mt-1 text-[11px] text-[#4a453d]' : 'mt-1 text-[11px] text-neutral-200'}>
                              진입가 {position.entry_price || '-'}
                            </div>
                            <div className={isLightWorkspace ? 'mt-1 text-[10px] text-[#7b7468]' : 'mt-1 text-[10px] text-neutral-400'}>
                              SL {position.stop_loss || '-'} · TP {position.take_profit || '-'}
                            </div>
                            <div className={isLightWorkspace ? 'mt-1 text-[10px] text-[#8a8377]' : 'mt-1 text-[10px] text-neutral-500'}>
                              시작 {openedText}
                            </div>
                          </button>
                        )
                      })}
                      {activeManualPositions.length === 0 && (
                        <div className={isLightWorkspace ? 'rounded-lg border border-[#dedbd3] bg-[#fcfaf6] px-3 py-2 text-[11px] text-[#7b7468]' : 'rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] text-neutral-400'}>
                          열린 포지션 없음
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {visibleMarkerGroups.map((group) => {
                  const visibleBubbles = group.bubbles
                  const visibleTrades = group.trades

                  const chartWidth = containerRef.current?.clientWidth || 0
                  if (visibleBubbles.length === 0 && visibleTrades.length === 0) return null
                  if (group.x < -40 || group.x > chartWidth + 40) return null
                  if (group.y < 0 || group.y > (containerRef.current?.clientHeight || 0)) return null

                  const isSelected = selectedGroup?.candleTime === group.candleTime
                  if (!isSelected) return null
                  const chartHeight = containerRef.current?.clientHeight || 0
                  const connectorHeight = Math.max(chartHeight - group.y + 1, 24)

                  return (
                    <div
                      key={group.candleTime}
                      className="absolute z-40 top-0 pointer-events-none -translate-x-1/2"
                      style={{
                        left: group.x,
                        height: chartHeight,
                        width: isLightWorkspace ? 28 : 2,
                        borderRadius: isLightWorkspace ? 999 : 2,
                        background: isLightWorkspace
                          ? 'rgba(128, 116, 95, 0.16)'
                          : 'rgba(56,189,248,0.35)',
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          <div className={isLightWorkspace ? 'border-t border-[#dedbd3] bg-[#f9f8f6]' : 'border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012)_42%,rgba(255,255,255,0.02)_100%)]'}>
            <div className={isCompactLayout ? 'relative flex h-[64px] items-center overflow-hidden px-4 py-2.5' : 'relative flex min-h-[92px] items-center px-4 py-3'}>
              <div className={isLightWorkspace ? 'absolute inset-x-0 top-0 h-px bg-[#ebe6dd]' : 'absolute inset-x-0 top-0 h-px bg-white/[0.04]'} />
              <div className={isLightWorkspace ? 'absolute inset-x-0 bottom-0 h-px bg-[#d8d2c6]' : 'absolute inset-x-0 bottom-0 h-px bg-black/20'} />

              {selectionDockGroup && (() => {
                const bubbleCount = selectionDockGroup.bubbles.length
                const tradeCount = selectionDockGroup.trades.length
                const hasBubbles = bubbleCount > 0
                const hasTrades = tradeCount > 0
                const buyTradeCount = selectionDockGroup.trades.filter((trade) => trade.side === 'buy').length
                const sellTradeCount = selectionDockGroup.trades.filter((trade) => trade.side === 'sell').length
                const positionSnapshot = activeManualPositions.find((position) => {
                  const openedAt = position.opened_at || position.created_at
                  if (!openedAt) return false
                  return Math.floor(new Date(openedAt).getTime() / 1000) <= selectionDockGroup.candleTime
                }) ?? null
                const bubbleAccentDotClass = selectionDockGroup.bubbles.some((bubble) => bubble.action === 'SELL' || bubble.tags?.some((tag) => tag.toLowerCase() === 'sell'))
                  ? 'bg-rose-400'
                  : 'bg-cyan-500'
                const tradeAccentDotClass = buyTradeCount >= sellTradeCount
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
                const selectionDetail = positionSnapshot
                  ? `${positionSnapshot.position_side.toUpperCase()} 포지션 · 진입 ${positionSnapshot.entry_price || '-'}`
                  : ''

                const selectedCandle = chartData.find((c) => (c.time as number) === selectionDockGroup.candleTime)
                const fmtPrice = (v: number) => {
                  if (v >= 10000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
                  if (v >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  return v.toFixed(4)
                }
                const candleIsUp = selectedCandle ? selectedCandle.close >= selectedCandle.open : true

                return (
                  <div className={isLightWorkspace ? 'flex h-full w-full items-center gap-3 overflow-hidden rounded-[16px] border border-[#d8d2c6] bg-[#f7f4ee] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]' : 'flex w-full items-center gap-3 rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,12,18,0.92),rgba(8,12,18,0.86))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'}>
                    <div className={isLightWorkspace ? 'min-w-[164px]' : 'min-w-[164px] shrink-0'}>
                      <p className={isLightWorkspace ? 'text-sm font-semibold text-[#1f2937]' : 'text-sm font-semibold text-neutral-50'}>
                        {formatChartDateTime(selectionDockGroup.candleTime, useSeoulTime)}
                      </p>
                    </div>

                    {selectedCandle && (
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="flex items-center gap-2.5 text-[11px] tabular-nums">
                          <span className={isLightWorkspace ? 'text-[#8a8377]' : 'text-neutral-500'}>O</span>
                          <span className={isLightWorkspace ? 'font-medium text-[#3f3931]' : 'font-medium text-neutral-200'}>{fmtPrice(selectedCandle.open)}</span>
                          <span className={isLightWorkspace ? 'text-[#8a8377]' : 'text-neutral-500'}>H</span>
                          <span className={isLightWorkspace ? 'font-medium text-[#3f3931]' : 'font-medium text-neutral-200'}>{fmtPrice(selectedCandle.high)}</span>
                          <span className={isLightWorkspace ? 'text-[#8a8377]' : 'text-neutral-500'}>L</span>
                          <span className={isLightWorkspace ? 'font-medium text-[#3f3931]' : 'font-medium text-neutral-200'}>{fmtPrice(selectedCandle.low)}</span>
                          <span className={isLightWorkspace ? 'text-[#8a8377]' : 'text-neutral-500'}>C</span>
                          <span className={candleIsUp ? (isLightWorkspace ? 'font-semibold text-emerald-700' : 'font-semibold text-emerald-400') : (isLightWorkspace ? 'font-semibold text-rose-700' : 'font-semibold text-rose-400')}>{fmtPrice(selectedCandle.close)}</span>
                        </div>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {hasBubbles && (
                          <span className={isLightWorkspace ? 'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#c9d9da] bg-[#fffdfa] px-2.5 py-1 text-[11px] font-medium text-[#415f62]' : 'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs'}>
                            <span className={`h-2 w-2 rounded-full ${bubbleAccentDotClass}`} />
                            {bubbleCount > 1 ? `말풍선 ${bubbleCount}` : '말풍선'}
                          </span>
                        )}
                        {hasTrades && (
                          <span className={isLightWorkspace ? 'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#ddd4bc] bg-[#fffdfa] px-2.5 py-1 text-[11px] font-medium text-[#685b36]' : 'inline-flex items-center gap-1 rounded-[8px] border px-2 py-1 text-xs'}>
                            <span className={`h-2 w-2 rounded-[3px] ${tradeAccentDotClass}`} />
                            {tradeCount > 1 ? `체결 ${tradeCount}` : '체결'}
                          </span>
                        )}
                        {selectionDetail && (
                          <p className={isLightWorkspace ? 'truncate text-[11px] text-[#6f675b]' : 'truncate text-xs text-neutral-400'}>
                            {selectionDetail}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedGroup(null)}
                        className={isLightWorkspace ? 'rounded-full border border-[#d1cbc0] bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[#5d574f] transition hover:border-[#bdb5a8]' : 'rounded-full border border-neutral-700/90 bg-white/[0.02] px-2 py-1 text-[10px] font-semibold text-neutral-300 transition hover:border-neutral-500'}
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                )
              })()}

              {!selectionDockGroup && (
                <div className={isLightWorkspace ? 'h-full w-full rounded-[16px] border border-dashed border-[#ddd7cb] bg-[#faf7f1]' : 'w-full rounded-[22px] border border-white/[0.04] bg-black/20 px-4 py-3 text-sm text-neutral-500'} />
              )}
            </div>
          </div>

          <div className={isLightWorkspace ? 'border-t border-[#dedbd3] bg-[#f2efe9]' : 'border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.004)_100%)]'}>
            <div className={isCompactLayout ? 'py-3' : 'py-4'}>
              <div
                ref={eventLaneRef}
                className="relative w-full overscroll-none"
                style={{ height: `${eventLaneHeight}px`, overscrollBehavior: 'contain' }}
              >
                {selectedVisibleGroup && (
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none -translate-x-1/2"
                    style={{
                      left: selectedVisibleGroup.x,
                      width: isLightWorkspace ? 28 : 2,
                      borderRadius: isLightWorkspace ? 999 : 2,
                      background: isLightWorkspace ? 'rgba(128, 116, 95, 0.16)' : 'rgba(56,189,248,0.35)',
                    }}
                  />
                )}

                {!isLightWorkspace && (
                  <div
                    className="absolute inset-x-0 rounded-[22px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.014)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    style={{ top: eventLaneBubbleTrackTop, height: eventLaneBubbleTrackHeight }}
                  />
                )}
                <div className="absolute left-4 z-10" style={{ top: eventLaneBubbleTrackTop + 10 }}>
                  <span className={isLightWorkspace ? 'text-[11px] font-medium text-[#7c7468]' : 'inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/35 px-3 py-1 text-[11px] font-semibold text-neutral-100'}>
                    말풍선
                  </span>
                </div>
                {isLightWorkspace && (
                  <div
                    className="absolute rounded-full bg-[#d8d2c6]"
                    style={{ left: 84, right: 12, top: eventLaneBubbleRailCenter - 3, height: 6 }}
                  />
                )}
                {!isLightWorkspace && (
                  <div
                    className="absolute inset-x-6 border-t border-white/[0.08]"
                    style={{ top: eventLaneBubbleTrackTop + 34 }}
                  />
                )}

                {!isLightWorkspace && (
                  <div
                    className="absolute inset-x-0 rounded-[22px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.012)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    style={{ top: eventLaneTradeTrackTop, height: eventLaneTradeTrackHeight }}
                  />
                )}
                <div className="absolute left-4 z-10" style={{ top: eventLaneTradeTrackTop + 10 }}>
                  <span className={isLightWorkspace ? 'text-[11px] font-medium text-[#7c7468]' : 'inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/35 px-3 py-1 text-[11px] font-semibold text-neutral-100'}>
                    체결
                  </span>
                </div>
                {isLightWorkspace && (
                  <div
                    className="absolute right-4 z-10 flex items-center gap-3 text-[10px] font-medium text-[#7c7468]"
                    style={{ top: eventLaneTradeTrackTop + 10 }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-flex h-[10px] w-[10px] rotate-45 rounded-[2px] border border-[#567d59] bg-[#6f9b73]" />
                      BUY
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-flex h-[10px] w-[10px] rounded-[3px] border border-[#91673d] bg-[#b68852]" />
                      SELL
                    </span>
                  </div>
                )}
                {isLightWorkspace && (
                  <div
                    className="absolute rounded-full bg-[#d8d2c6]"
                    style={{ left: 84, right: 12, top: eventLaneTradeRailCenter - 3, height: 6 }}
                  />
                )}
                {!isLightWorkspace && (
                  <div
                    className="absolute inset-x-6 border-t border-white/[0.08]"
                    style={{ top: eventLaneTradeTrackTop + 34 }}
                  />
                )}

                {clusteredBubbleMarkers.map((cluster) => {
                  const bubbleCount = cluster.bubbles.length
                  const showCount = bubbleCount > 1
                  const chartWidth = containerRef.current?.clientWidth || 0
                  if (!chartWidth || cluster.x < 88 || cluster.x > chartWidth - 14) return null
                  const bubbleIsSellBias = cluster.bubbles.some((b) => b.action === 'SELL' || b.tags?.some((t) => t.toLowerCase() === 'sell'))
                  const bubbleAccentDotClass = bubbleIsSellBias ? 'bg-[#b36d79]' : 'bg-[#5f95a0]'
                  const bubbleSingleClass = bubbleIsSellBias
                    ? 'border-[#9f6871] bg-[#b36d79]'
                    : 'border-[#4f7d86] bg-[#5f95a0]'
                  const bubbleTone = bubbleIsSellBias
                    ? isLightWorkspace ? 'border-rose-200 bg-rose-50 text-[#1f2937]' : 'border-rose-300/55 bg-rose-300/16 text-rose-50'
                    : isLightWorkspace ? 'border-cyan-200 bg-cyan-50 text-[#1f2937]' : 'border-cyan-300/55 bg-cyan-300/16 text-cyan-50'
                  const isSelected = cluster.candleTimes.some((ct) => ct === selectedGroup?.candleTime)
                  return (
                    <button
                      key={`bubble-cluster-${cluster.primaryCandleTime}`}
                      type="button"
                      onClick={() => {
                        const nextGroup = isSelected ? null : { candleTime: cluster.primaryCandleTime, bubbles: cluster.bubbles, trades: cluster.trades }
                        setSelectedGroup(nextGroup)
                        setSelectedPosition(null)
                        if (nextGroup) setPanelTab('detail')
                      }}
                      className="absolute cursor-pointer"
                      style={{ left: cluster.x, top: eventLaneBubbleRailCenter, transform: 'translate(-50%, -50%)' }}
                    >
                      <div
                        className={`relative flex items-center gap-1 text-[10px] font-semibold leading-none transition duration-150 ${
                          isLightWorkspace
                            ? (showCount
                              ? `rounded-full border px-1.5 py-[1px] text-[#675f54] shadow-[0_1px_0_rgba(255,255,255,0.72)] ${bubbleIsSellBias ? 'border-[#dec1c7] bg-[#fff7f8]' : 'border-[#bfd2d5] bg-[#f6fbfc]'}`
                              : 'rounded-full text-[#675f54]')
                            : ''
                        } ${isSelected ? isLightWorkspace ? 'ring-2 ring-[#b4ab97]/70 ring-offset-2 ring-offset-[#f2efe9]' : 'ring-2 ring-violet-300/70 ring-offset-2 ring-offset-neutral-950' : ''}`}
                      >
                        {isLightWorkspace ? (
                          <span className={showCount ? 'inline-flex items-center gap-1.5 rounded-full tabular-nums' : 'inline-flex items-center justify-center'}>
                            <span className={`${showCount ? `h-[12px] w-[12px] ${bubbleAccentDotClass}` : `h-[18px] w-[18px] border-2 shadow-[0_0_0_3px_rgba(244,241,234,0.92)] ${bubbleSingleClass}`} rounded-full`} />
                            {showCount && <span>{bubbleCount}</span>}
                          </span>
                        ) : showCount ? (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-[2px] tabular-nums ${bubbleTone}`}>
                            <span className={`h-[8px] w-[8px] rounded-full ${bubbleAccentDotClass}`} />
                            <span>{bubbleCount}</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center justify-center h-[18px] w-[18px] rounded-full border-2 ${bubbleSingleClass}`} />
                        )}
                      </div>
                    </button>
                  )
                })}

                {clusteredTradeMarkers.map((cluster) => {
                  const tradeCount = cluster.trades.length
                  const showCount = tradeCount > 1
                  const chartWidth = containerRef.current?.clientWidth || 0
                  if (!chartWidth || cluster.x < 88 || cluster.x > chartWidth - 14) return null
                  const buyCount = cluster.trades.filter((t) => t.side === 'buy').length
                  const sellCount = cluster.trades.filter((t) => t.side === 'sell').length
                  const tradeIsBuyBias = buyCount >= sellCount
                  const tradeAccentDotClass = tradeIsBuyBias ? 'bg-[#6f9b73]' : 'bg-[#b68852]'
                  const tradeSingleClass = tradeIsBuyBias
                    ? 'rotate-45 rounded-[3px] border-[#567d59] bg-[#6f9b73]'
                    : 'rounded-[4px] border-[#91673d] bg-[#b68852]'
                  const isSelected = cluster.candleTimes.some((ct) => ct === selectedGroup?.candleTime)
                  return (
                    <button
                      key={`trade-cluster-${cluster.primaryCandleTime}`}
                      type="button"
                      onClick={() => {
                        const nextGroup = isSelected ? null : { candleTime: cluster.primaryCandleTime, bubbles: cluster.bubbles, trades: cluster.trades }
                        setSelectedGroup(nextGroup)
                        setSelectedPosition(null)
                        if (nextGroup) setPanelTab('detail')
                      }}
                      className="absolute cursor-pointer"
                      style={{ left: cluster.x, top: eventLaneTradeRailCenter, transform: 'translate(-50%, -50%)' }}
                    >
                      <div
                        className={`relative flex items-center gap-1 text-[10px] font-semibold leading-none transition duration-150 ${
                          isLightWorkspace
                            ? (showCount
                              ? `rounded-[8px] border px-1.5 py-[1px] text-[#675f54] shadow-[0_1px_0_rgba(255,255,255,0.72)] ${tradeIsBuyBias ? 'border-[#c8d5c5] bg-[#f8fbf6]' : 'border-[#d9ccb8] bg-[#fdf9f2]'}`
                              : 'rounded-[8px] text-[#675f54]')
                            : ''
                        } ${isSelected ? isLightWorkspace ? 'ring-2 ring-[#b4ab97]/70 ring-offset-2 ring-offset-[#f2efe9]' : 'ring-2 ring-violet-300/70 ring-offset-2 ring-offset-neutral-950' : ''}`}
                      >
                        {isLightWorkspace ? (
                          !showCount ? (
                            <span className="inline-flex items-center justify-center">
                              <span className={`text-[20px] font-extrabold leading-none ${tradeIsBuyBias ? 'text-[#4f8855]' : 'text-[#9e5420]'}`}>
                                {tradeIsBuyBias ? '▲' : '▼'}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-[8px] tabular-nums">
                              <span className={`h-[14px] w-[14px] border ${tradeSingleClass}`} />
                              <span>{tradeCount}</span>
                            </span>
                          )
                        ) : !showCount ? (
                          <span className={`text-[16px] font-bold leading-none ${tradeIsBuyBias ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {tradeIsBuyBias ? '▲' : '▼'}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 rounded-[6px] border px-1.5 py-[2px] tabular-nums ${tradeIsBuyBias ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/50 bg-amber-400/10 text-amber-300'}`}>
                            <span className={`h-[8px] w-[8px] rounded-[2px] ${tradeAccentDotClass}`} />
                            <span>{tradeCount}</span>
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}

                {clusteredBubbleMarkers.length === 0 && clusteredTradeMarkers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
                    현재 구간에 표시할 이벤트가 없습니다.
                  </div>
                )}
                {isLightWorkspace && (
                  <>
                    <div
                      className="absolute inset-x-0 border-t border-[#dfd8cc]"
                      style={{ top: eventLaneAxisTop }}
                    />
                    {eventLaneTicks.map((tick) => (
                      <div
                        key={`event-lane-tick-${tick.x}-${tick.label}`}
                        className="absolute text-[11px] text-[#857d71]"
                        style={{
                          left: tick.x,
                          top: eventLaneAxisTop + 8,
                          transform: 'translateX(-50%)',
                        }}
                      >
                        {tick.label}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

        </div>

        <aside className={sideShellClass} style={isCompactLayout ? { height: `${rightPanelTargetHeight}px` } : undefined}>
          <div>
            <p className="kifu-eyebrow">복기 패널</p>
            <h3 className={isLightWorkspace ? 'mt-2 text-2xl font-semibold text-[#1f2937]' : 'mt-2 text-2xl font-semibold text-neutral-100'}>말풍선과 체결</h3>
            <p className={isLightWorkspace ? 'mt-2 text-sm text-[#7b7468]' : 'mt-2 text-sm text-neutral-400'}>
              {filteredBubbles.length}개 기록 · {activeTrades.length}개 체결
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPanelTab('summary')}
              className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                panelTab === 'summary'
                  ? sideTabActiveClass
                  : sideTabInactiveClass
              }`}
            >
              기록 요약
            </button>
            <button
              type="button"
              onClick={() => setPanelTab('detail')}
              className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                panelTab === 'detail'
                  ? sideTabActiveClass
                  : sideTabInactiveClass
              }`}
            >
              선택 상세
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
          {panelTab === 'summary' && (
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="space-y-3">
                <div className={panelCardLargeClass}>
                  <div className={`flex items-center justify-between text-sm ${isLightWorkspace ? 'text-[#6b6458]' : 'text-neutral-500'}`}>
                    <span>말풍선 요약</span>
                    <span>{bubbleSummary.total.toLocaleString()}개</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className={isLightWorkspace ? 'rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800' : 'rounded-full border border-emerald-500/40 px-2 py-0.5 text-emerald-300'}>BUY {bubbleSummary.buy}</span>
                    <span className={isLightWorkspace ? 'rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-800' : 'rounded-full border border-rose-500/40 px-2 py-0.5 text-rose-300'}>SELL {bubbleSummary.sell}</span>
                    <span className={isLightWorkspace ? 'rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-800' : 'rounded-full border border-sky-500/40 px-2 py-0.5 text-sky-300'}>HOLD {bubbleSummary.hold}</span>
                    <span className={isLightWorkspace ? 'rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700' : 'rounded-full border border-emerald-400/40 px-2 py-0.5 text-emerald-200'}>TP {bubbleSummary.tp}</span>
                    <span className={isLightWorkspace ? 'rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700' : 'rounded-full border border-rose-400/40 px-2 py-0.5 text-rose-200'}>SL {bubbleSummary.sl}</span>
                    <span className={isLightWorkspace ? 'rounded-full border border-[#d5cfc3] bg-[#f7f3ec] px-2 py-0.5 text-[#6b655c]' : 'rounded-full border border-neutral-600/60 px-2 py-0.5 text-neutral-300'}>NOTE {bubbleSummary.note}</span>
                  </div>
                  <div className={`mt-3 flex items-center justify-between text-[11px] ${isLightWorkspace ? 'text-[#6f675b]' : 'text-neutral-500'}`}>
                    <span>현재 밀도: {currentDensityLabel}</span>
                    <span>표시 {densitySummary.markers.toLocaleString()} / {densitySummary.totalMarkers.toLocaleString()}</span>
                  </div>
                  <div className={`mt-1 flex items-center justify-between text-[11px] ${isLightWorkspace ? 'text-[#7a7266]' : 'text-neutral-600'}`}>
                    <span>집계</span>
                    <span>
                      💬 {densitySummary.bubbles.toLocaleString()} · ↕ {densitySummary.trades.toLocaleString()}
                    </span>
                  </div>
                </div>

                <input
                  value={bubbleSearch}
                  onChange={(e) => setBubbleSearch(e.target.value)}
                  placeholder="메모/태그 검색"
                  className={isLightWorkspace ? 'w-full rounded-xl border border-[#dedbd3] bg-white/80 px-3 py-2 text-sm text-[#1f2937] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]' : 'kifu-field w-full py-2 text-sm'}
                />
                <div className="flex flex-wrap gap-2">
                  {actionOptions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => setActionFilter(action)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        actionFilter === action
                          ? sideTabActiveClass
                          : sideTabInactiveClass
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex flex-1 flex-col gap-2">
                <div className={`flex items-center justify-between text-sm ${isLightWorkspace ? 'text-[#6b6458]' : 'text-neutral-500'}`}>
                  <span>최근 기록</span>
                  <span>{filteredBubbles.length}개 기록</span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-2">
                  {filteredBubbles.length === 0 && (
                    <div className={emptyPanelClass}>
                      표시할 버블이 없습니다.
                    </div>
                  )}
                  {pagedSummaryBubbles.map((bubble) => (
                    <div key={bubble.id} className={panelCardClass}>
                      <div className={`flex items-center justify-between text-sm ${isLightWorkspace ? 'text-[#6b6458]' : 'text-neutral-500'}`}>
                        <span>{formatChartDateTime(Math.floor(bubble.ts / 1000), useSeoulTime)}</span>
                        <span className={isLightWorkspace ? 'text-[11px] text-emerald-700/80' : 'text-[10px] text-emerald-200/80'}>{getBubbleSourceBadge(bubble)}</span>
                        <span className={bubble.action === 'BUY' ? (isLightWorkspace ? 'text-emerald-700' : 'text-green-400') : bubble.action === 'SELL' ? (isLightWorkspace ? 'text-rose-700' : 'text-red-400') : isLightWorkspace ? 'text-[#7b7468]' : 'text-neutral-400'}>
                          {bubble.action || 'NOTE'}
                        </span>
                      </div>
                      <div className={isLightWorkspace ? 'mt-1 text-[11px] text-[#7a7266]' : 'mt-1 text-[10px] text-neutral-500'}>
                        생성 {formatChartDateTime(Math.floor(new Date(bubble.created_at).getTime() / 1000), useSeoulTime)}
                      </div>
                      <p className={isLightWorkspace ? 'mt-1 text-sm text-[#4a453d] line-clamp-2' : 'mt-1 text-sm text-neutral-200 line-clamp-2'}>{getBubbleDisplayNote(bubble)}</p>
                      <div className={isLightWorkspace ? 'mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#7a7266]' : 'mt-2 flex flex-wrap items-center gap-2 text-[10px] text-neutral-500'}>
                        <span className={isLightWorkspace ? 'rounded-full border border-[#d5cfc3] px-2 py-0.5' : 'rounded-full border border-neutral-700 px-2 py-0.5'}>{bubble.symbol}</span>
                        <span className={isLightWorkspace ? 'rounded-full border border-[#d5cfc3] px-2 py-0.5' : 'rounded-full border border-neutral-700 px-2 py-0.5'}>{bubble.timeframe}</span>
                        <button
                          type="button"
                          onClick={() => focusOnTimestamp(bubble.ts, bubble.timeframe)}
                          className={isLightWorkspace ? 'rounded-full border border-cyan-300 px-2 py-0.5 text-cyan-900 hover:bg-cyan-50' : 'rounded-full border border-cyan-400/40 px-2 py-0.5 text-cyan-200 hover:bg-cyan-400/10'}
                        >
                          차트로 이동
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <PageJumpPager
                  totalItems={filteredBubbles.length}
                  totalPages={summaryTotalPages}
                  currentPage={summaryPage}
                  pageInput={summaryPageInput}
                  onPageInputChange={setSummaryPageInput}
                  onPageInputKeyDown={handleSummaryPageKeyDown}
                  onFirst={() => setSummaryPage(1)}
                  onPrevious={() => setSummaryPage((page) => Math.max(1, page - 1))}
                  onNext={() => setSummaryPage((page) => Math.min(summaryTotalPages, page + 1))}
                  onLast={() => setSummaryPage(summaryTotalPages)}
                  onJump={jumpSummaryPage}
                  itemLabel="개"
                />
              </div>
            </div>
          )}

          {panelTab === 'detail' && (
            <div className="h-full overflow-y-auto space-y-3 pr-1">
              {!selectedGroup && !selectedPosition && (
                <div className={emptyPanelClass}>
                  차트에서 마커를 선택하면 상세가 표시됩니다.
                </div>
              )}
              {selectedPosition && (
                <div className={`space-y-3 ${panelCardLargeClass}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">포지션</p>
                      <h3 className={isLightWorkspace ? 'mt-1 text-base font-semibold text-[#1f2937]' : 'mt-1 text-sm font-semibold text-neutral-100'}>
                        {selectedPosition.symbol} · {selectedPosition.position_side.toUpperCase()}
                      </h3>
                      <p className={isLightWorkspace ? 'mt-1 text-sm text-[#6f675b]' : 'mt-1 text-xs text-neutral-400'}>
                        {selectedPosition.opened_at ? new Date(selectedPosition.opened_at).toLocaleString() : '시간 정보 없음'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPosition(null)}
                      className={isLightWorkspace ? 'rounded-lg border border-[#d1cbc0] px-2 py-1 text-[10px] text-[#7b7468] hover:bg-white' : 'rounded-lg border border-neutral-700 px-2 py-1 text-[10px] text-neutral-400 hover:bg-neutral-800'}
                    >
                      닫기
                    </button>
                  </div>
                  <div className={isLightWorkspace ? 'grid gap-2 text-sm text-[#3f3931]' : 'grid gap-2 text-xs text-neutral-300'}>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">진입가</span>
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
                      <span className="text-neutral-500">수량</span>
                      <span>{selectedPosition.size || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">레버리지</span>
                      <span>{selectedPosition.leverage || '-'}</span>
                    </div>
                    {selectedPosition.strategy && (
                      <div className={isLightWorkspace ? 'rounded-lg border border-[#dedbd3] bg-[#fcfaf6] p-2 text-sm text-[#3f3931]' : 'rounded-lg border border-white/[0.06] bg-black/25 p-2 text-[11px] text-neutral-300'}>
                        전략: {selectedPosition.strategy}
                      </div>
                    )}
                    {selectedPosition.memo && (
                      <div className={isLightWorkspace ? 'rounded-lg border border-[#dedbd3] bg-[#fcfaf6] p-2 text-sm text-[#3f3931]' : 'rounded-lg border border-white/[0.06] bg-black/25 p-2 text-[11px] text-neutral-300'}>
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
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">선택 장면</p>
                      <h3 className={isLightWorkspace ? 'mt-1 text-sm font-semibold text-[#1f2937]' : 'mt-1 text-sm font-semibold text-neutral-100'}>
                        {formatChartDateTime(selectedGroup.candleTime, useSeoulTime)}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedGroup(null)}
                      className={isLightWorkspace ? 'rounded-lg border border-[#d1cbc0] px-2 py-1 text-[10px] text-[#7b7468] hover:bg-white' : 'rounded-lg border border-neutral-700 px-2 py-1 text-[10px] text-neutral-400 hover:bg-neutral-800'}
                    >
                      닫기
                    </button>
                  </div>

                  {selectedGroup.bubbles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                        말풍선 ({selectedGroup.bubbles.length})
                      </p>
                      <div className="space-y-2 pr-2">
                        {pagedDetailBubbles.map((bubble) => (
                          <div key={bubble.id} className={panelCardClass}>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-bold ${
                                bubble.action === 'BUY' ? (isLightWorkspace ? 'text-emerald-700' : 'text-green-400')
                                  : bubble.action === 'SELL' ? (isLightWorkspace ? 'text-rose-700' : 'text-red-400')
                                    : bubble.action === 'TP' ? (isLightWorkspace ? 'text-emerald-700' : 'text-emerald-300')
                                      : bubble.action === 'SL' ? (isLightWorkspace ? 'text-rose-700' : 'text-rose-300')
                                        : isLightWorkspace ? 'text-[#6b655c]' : 'text-neutral-300'
                              }`}>
                                {bubble.action || 'NOTE'}
                              </span>
                              <span className={isLightWorkspace ? 'text-sm text-[#6b6458]' : 'text-xs text-neutral-400'}>${bubble.price.toLocaleString()}</span>
                            </div>
                            <div className={isLightWorkspace ? 'mt-0.5 text-[11px] text-emerald-700/80' : 'mt-0.5 text-[10px] text-emerald-200/80'}>{getBubbleSourceBadge(bubble)}</div>
                            <div className={isLightWorkspace ? 'mt-1 text-[11px] text-[#7a7266]' : 'mt-1 text-[10px] text-neutral-500'}>
                              캔들 {formatChartDateTime(Math.floor(bubble.ts / 1000), useSeoulTime)}
                            </div>
                            <div className={isLightWorkspace ? 'mt-0.5 text-[11px] text-[#7a7266]' : 'mt-0.5 text-[10px] text-neutral-500'}>
                              생성 {formatChartDateTime(Math.floor(new Date(bubble.created_at).getTime() / 1000), useSeoulTime)}
                            </div>
                            <p className={isLightWorkspace ? 'mt-1 text-sm text-[#3f3931] line-clamp-2' : 'mt-1 text-xs text-neutral-200 line-clamp-2'}>{getBubbleDisplayNote(bubble)}</p>
                          </div>
                        ))}
                      </div>
                      <PageJumpPager
                        totalItems={selectedGroup.bubbles.length}
                        totalPages={detailBubbleTotalPages}
                        currentPage={detailBubblePage}
                        pageInput={detailBubblePageInput}
                        onPageInputChange={setDetailBubblePageInput}
                        onPageInputKeyDown={handleDetailBubblePageKeyDown}
                        onFirst={() => setDetailBubblePage(1)}
                        onPrevious={() => setDetailBubblePage((page) => Math.max(1, page - 1))}
                        onNext={() => setDetailBubblePage((page) => Math.min(detailBubbleTotalPages, page + 1))}
                        onLast={() => setDetailBubblePage(detailBubbleTotalPages)}
                        onJump={jumpDetailBubblePage}
                        itemLabel="개"
                      />
                    </div>
                  )}

                  {selectedGroup.trades.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                        체결 ({selectedGroup.trades.length})
                      </p>
                      <div className="space-y-2 pr-2">
                        {pagedDetailTrades.map((trade) => (
                          <div key={trade.id} className={panelCardClass}>
                            <div className={isLightWorkspace ? 'flex items-center justify-between text-sm text-[#6b6458]' : 'flex items-center justify-between text-xs text-neutral-500'}>
                              <span className={trade.side === 'buy' ? (isLightWorkspace ? 'text-emerald-700' : 'text-green-400') : isLightWorkspace ? 'text-rose-700' : 'text-red-400'}>
                                {trade.side.toUpperCase()}
                              </span>
                              <span>{trade.exchange}</span>
                            </div>
                            <div className={isLightWorkspace ? 'mt-1 flex items-center justify-between text-sm text-[#3f3931]' : 'mt-1 flex items-center justify-between text-xs text-neutral-300'}>
                              <span>수량 {trade.qty ?? '-'}</span>
                              <span>@ ${trade.price.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <PageJumpPager
                        totalItems={selectedGroup.trades.length}
                        totalPages={detailTradeTotalPages}
                        currentPage={detailTradePage}
                        pageInput={detailTradePageInput}
                        onPageInputChange={setDetailTradePageInput}
                        onPageInputKeyDown={handleDetailTradePageKeyDown}
                        onFirst={() => setDetailTradePage(1)}
                        onPrevious={() => setDetailTradePage((page) => Math.max(1, page - 1))}
                        onNext={() => setDetailTradePage((page) => Math.min(detailTradeTotalPages, page + 1))}
                        onLast={() => setDetailTradePage(detailTradeTotalPages)}
                        onJump={jumpDetailTradePage}
                        itemLabel="개"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          </div>
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
