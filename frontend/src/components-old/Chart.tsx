'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createChart, ColorType, CrosshairMode, type UTCTimestamp } from 'lightweight-charts'
import { api, DEFAULT_SYMBOLS } from '../lib/api'
import { exportBubbles, importBubbles } from '../lib/dataHandler'
import { parseTradeCsv } from '../lib/csvParser'
import { BubbleCreateModal } from '../components/BubbleCreateModal'
import { useBubbleStore, type Bubble, type Trade } from '../lib/bubbleStore'
import { useToast } from '../components/ui/Toast'

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

const intervals = ['1m', '15m', '1h', '4h', '1d']

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
  console.log('>>> CHART COMPONENT RENDER (V2 Fixed) <<<')
  const { symbol: symbolParam } = useParams()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const seriesRef = useRef<ReturnType<ReturnType<typeof createChart>['addCandlestickSeries']> | null>(null)
  const [symbols, setSymbols] = useState<UserSymbolItem[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [timeframe, setTimeframe] = useState('1d')
  const [klines, setKlines] = useState<KlineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast } = useToast()

  const bubbles = useBubbleStore((state) => state.bubbles)
  const trades = useBubbleStore((state) => state.trades)
  const importTrades = useBubbleStore((state) => state.importTrades)

  const [overlayPositions, setOverlayPositions] = useState<Array<{
    candleTime: number
    x: number
    y: number
    bubbles: Bubble[]
    trades: Trade[]
    avgPrice: number
  }>>([])

  const [clickedCandle, setClickedCandle] = useState<{ time: number; price: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [overlayRect, setOverlayRect] = useState({ left: 0, top: 0, width: 0, height: 0 })

  // 표시 옵션
  const [showBubbles, setShowBubbles] = useState(true)
  const [showTrades, setShowTrades] = useState(true)

  // 선택된 버블 그룹 (상세 보기용)
  const [selectedGroup, setSelectedGroup] = useState<{
    candleTime: number
    bubbles: Bubble[]
    trades: Trade[]
  } | null>(null)

  // Refs for stable access in effects/callbacks
  const overlayPositionsRef = useRef(overlayPositions)
  const updatePositionsRef = useRef<() => void>(() => { })

  // Update refs
  useEffect(() => {
    overlayPositionsRef.current = overlayPositions
  }, [overlayPositions])

  const activeBubbles = useMemo(() => {
    return bubbles.filter(b => b.symbol === selectedSymbol)
  }, [bubbles, selectedSymbol])

  const activeTrades = useMemo(() => {
    return trades.filter(t => t.symbol === selectedSymbol)
  }, [trades, selectedSymbol])

  useEffect(() => {
    setMounted(true)
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

  // Load Symbols
  useEffect(() => {
    let active = true
    const loadSymbols = async () => {
      try {
        const response = await api.get('/v1/users/me/symbols')
        if (!active) return
        const data = response.data?.symbols || []
        if (data.length > 0) {
          setSymbols(data)
        } else {
          // No symbols from API, use defaults
          setSymbols(DEFAULT_SYMBOLS)
        }
      } catch (err: any) {
        if (!active) return
        // On error (including 401), use default symbols for guest mode
        console.warn('Failed to load user symbols, using defaults:', err?.message)
        setSymbols(DEFAULT_SYMBOLS)
        setError('') // Clear error - we have fallback
      }
    }
    loadSymbols()
    return () => { active = false }
  }, [])

  // Sync Symbol Param
  useEffect(() => {
    if (symbols.length === 0) return
    const normalizedParam = Array.isArray(symbolParam) ? symbolParam[0]?.toUpperCase() : symbolParam?.toUpperCase() || ''
    const match = symbols.find((item) => item.symbol === normalizedParam)
    const selected = match?.symbol || symbols[0].symbol

    setSelectedSymbol(selected)
    setTimeframe('1d')
    if (!normalizedParam || !match) {
      router.replace(`/chart/${selected}`)
    }
  }, [router, symbolParam, symbols])

  // Load Klines
  useEffect(() => {
    if (!selectedSymbol) return
    let active = true
    const loadKlines = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await api.get('/v1/market/klines', {
          params: { symbol: selectedSymbol, interval: timeframe, limit: 500 },
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
  }, [selectedSymbol, timeframe])

  const chartData = useMemo(() => {
    return klines
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
  }, [klines])

  const latestPrice = useMemo(() => {
    if (klines.length === 0) return ''
    return klines[klines.length - 1].close || ''
  }, [klines])

  // Update Positions for Bubbles AND Trades
  const updatePositions = useCallback(() => {
    if (!seriesRef.current || !chartRef.current || chartData.length === 0) return

    const dataByCandle = new Map<number, { bubbles: Bubble[], trades: Trade[] }>()

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
      trades: Trade[]
      avgPrice: number
    }> = []

    const chart = chartRef.current
    dataByCandle.forEach((data, candleTime) => {
      const x = chart.timeScale().timeToCoordinate(candleTime as UTCTimestamp)
      if (x === null || x === undefined) return

      const candle = chartData.find(c => (c.time as number) === candleTime)
      const avgPrice = candle ? candle.close : 0
      const y = seriesRef.current?.priceToCoordinate(avgPrice)

      if (y === null || y === undefined) return
      positions.push({ candleTime, x, y, bubbles: data.bubbles, trades: data.trades, avgPrice })
    })

    setOverlayPositions(positions)
  }, [chartData, activeBubbles, activeTrades, timeframe])

  useEffect(() => {
    updatePositionsRef.current = updatePositions
  }, [updatePositions])

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

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#d4d4d8',
        fontFamily: 'Space Grotesk, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.06)' },
        horzLines: { color: 'rgba(255,255,255,0.06)' },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.08)' },
      height: 480,
    })

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
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
      // const timeRange = getTimeframeSeconds(timeframe)

      // Check if clicking near an existing bubble
      const existingGrouping = overlayPositionsRef.current.find(p => p.candleTime === clickedTime)

      if (existingGrouping && existingGrouping.bubbles.length > 0) {
        console.log('Clicked group:', existingGrouping)
      }

      setClickedCandle({ time: clickedTime, price })
      setIsModalOpen(true)
    }

    chart.subscribeClick(clickHandler)

    const handleVisibleTimeRangeChange = (newVisibleTimeRange: any) => {
      // 1. Update overlay positions (existing logic)
      updateOverlayPosition()
      if (updatePositionsRef.current) updatePositionsRef.current()

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
      const response = await api.get('/v1/market/klines', {
        params: { symbol: selectedSymbol, interval: timeframe, limit: 500, endTime: endTimeMs },
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
        toast(`${newTrades.length}개 거래내역 가져오기 완료`, 'success')
      }
    } catch (e: any) {
      console.error(e)
      toast('CSV 파싱 실패: ' + e.message, 'error')
    }
    event.target.value = ''
  }

  const handleSymbolChange = (value: string) => {
    const next = value.toUpperCase()
    setSelectedSymbol(next)
    router.push(`/chart/${next}`)
  }

  useEffect(() => {
    const handleResize = () => updateOverlayPosition()
    const handleScroll = () => updateOverlayPosition()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [updateOverlayPosition])

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
      <header className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Market</p>
            <h2 className="mt-3 text-2xl font-semibold text-neutral-100">Chart Overview <span className="text-xs text-green-500 ml-2">V2 (Fixed)</span></h2>
            <p className="mt-2 text-sm text-neutral-400">
              Live Chart with Bubble Journaling & Trade Overlay
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Symbol Select */}
            <div className="flex flex-col text-xs text-neutral-400">
              <span className="uppercase tracking-[0.2em]">Symbol</span>
              <select
                value={selectedSymbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="mt-2 rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              >
                {symbols.map((item) => (
                  <option key={item.symbol} value={item.symbol}>{item.symbol}</option>
                ))}
              </select>
            </div>
            {/* Timeframe */}
            <div className="flex flex-col text-xs text-neutral-400">
              <span className="uppercase tracking-[0.2em]">Timeframe</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {intervals.map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setTimeframe(interval)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${timeframe === interval ? 'border-neutral-100 bg-neutral-100 text-neutral-950' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}`}
                  >
                    {interval}
                  </button>
                ))}
              </div>
            </div>
            {/* Display Options */}
            <div className="flex flex-col text-xs text-neutral-400">
              <span className="uppercase tracking-[0.2em]">Display</span>
              <div className="mt-2 flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBubbles}
                    onChange={(e) => setShowBubbles(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-neutral-300">Bubbles</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTrades}
                    onChange={(e) => setShowTrades(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-neutral-300">Trades</span>
                </label>
              </div>
            </div>
            {/* Actions */}
            <div className="flex flex-col text-xs text-neutral-400">
              <span className="uppercase tracking-[0.2em]">Actions</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={!selectedSymbol}
                  className="mt-2 rounded-lg bg-neutral-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-950 hover:bg-white disabled:opacity-60"
                >
                  Create Bubble
                </button>
                <button onClick={exportBubbles} className="mt-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800">
                  Export JSON
                </button>
                <button onClick={handleImportClick} className="mt-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800">
                  Import JSON
                </button>
                <input type="file" id="import-json-input" accept=".json" className="hidden" onChange={handleFileChange} />

                <button onClick={handleTradeImportClick} className="mt-2 rounded-lg border border-blue-900/50 px-3 py-2 text-xs text-blue-300 hover:bg-blue-900/20">
                  Import CSV
                </button>
                <input type="file" id="import-csv-input" accept=".csv" className="hidden" onChange={handleTradeFileChange} />

                <button onClick={generateDummyBubbles} disabled={!selectedSymbol} className="mt-2 rounded-lg border border-yellow-500/50 px-3 py-2 text-xs text-yellow-400 hover:bg-yellow-500/10">
                  + DUMMY
                </button>
                <button onClick={() => { if (confirm('Reset all?')) { localStorage.removeItem('bubble-storage'); window.location.reload(); } }} className="mt-2 rounded-lg border border-red-500/50 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10">
                  RESET
                </button>
              </div>
            </div>
          </div>
        </div>
        {error && <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        {/* Status Panels */}
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Status</p>
          <p className="mt-3 text-lg font-semibold text-neutral-200">{loading ? 'Loading...' : 'Ready'}</p>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Bubble Flow</p>
          <p className="mt-3 text-lg font-semibold text-neutral-200">
            {activeBubbles.length > 0 ? 'Active' : 'Empty State'}
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            {activeBubbles.length === 0
              ? 'Click a candle to create a bubble.'
              : `${activeBubbles.length} bubbles tracked.`}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Imported Trades</p>
          <p className="mt-3 text-lg font-semibold text-neutral-200">{activeTrades.length}</p>
        </div>
      </section>

      <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/20 p-4 relative" ref={wrapperRef}>
        <div className="h-[480px] w-full relative" ref={containerRef}>
          {/* Bubble Overlay - 차트 컨테이너 내부에 absolute로 배치 */}
          {mounted && (
            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 20, pointerEvents: 'none', overflow: 'hidden' }}>
              {overlayPositions.map((group) => {
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
              const buyCount = visibleTrades.filter(t => t.side === 'buy').length
              const sellCount = visibleTrades.filter(t => t.side === 'sell').length
              if (buyCount > sellCount) bgColor = 'bg-green-900/80 text-green-200'
              else if (sellCount > buyCount) bgColor = 'bg-red-900/80 text-red-200'
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
                  setSelectedGroup(isSelected ? null : { candleTime: group.candleTime, bubbles: visibleBubbles, trades: visibleTrades })
                }}
              >
                {/* Visual Connector Line */}
                <div className={`absolute left-1/2 -bottom-10 w-px h-10 -translate-x-1/2 border-l border-dashed pointer-events-none ${isSelected ? 'border-yellow-400' : 'border-neutral-400'} opacity-80`} />

                <div className={`relative rounded px-2 py-1 text-xs font-semibold shadow-md transition-transform hover:scale-110 ${bgColor} ${isSelected ? 'ring-2 ring-yellow-400' : ''} ${hasBubbles && hasTrades ? 'border border-yellow-500' : ''}`}>
                  <div className="flex items-center gap-1">
                    {hasBubbles && <span className="text-white">💬{visibleBubbles.length}</span>}
                    {hasTrades && <span className="text-xs">
                      {visibleTrades.filter(t => t.side === 'buy').length > 0 && '↑'}
                      {visibleTrades.filter(t => t.side === 'sell').length > 0 && '↓'}
                    </span>}
                  </div>
                </div>

                {/* Tooltip */}
                <div className="absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 rounded-lg bg-neutral-900 border border-neutral-700 p-3 text-xs text-neutral-200 shadow-xl group-hover:block min-w-[220px] z-50">
                  <div className="font-bold border-b border-neutral-700 pb-1 mb-2 text-center">
                    {new Date(group.candleTime * 1000).toLocaleString()}
                  </div>
                  {/* Bubbles List */}
                  {hasBubbles && (
                    <div className="mb-2">
                      <div className="text-[10px] uppercase text-neutral-500 mb-1">Bubbles</div>
                      {visibleBubbles.map(b => (
                        <div key={b.id} className="mb-1 last:mb-0 p-1 bg-neutral-800 rounded">
                          <div className="flex justify-between">
                            <span className={b.action === 'BUY' ? 'text-green-400' : b.action === 'SELL' ? 'text-red-400' : ''}>{b.action || 'NOTE'}</span>
                            <span>${b.price}</span>
                          </div>
                          <div className="text-neutral-400 truncate">{b.note}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Trades List */}
                  {hasTrades && (
                    <div>
                      <div className="text-[10px] uppercase text-neutral-500 mb-1">Trades</div>
                      {visibleTrades.map(t => (
                        <div key={t.id} className="mb-1 last:mb-0 p-1 bg-neutral-800/50 rounded flex justify-between">
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

      {/* 선택된 버블/거래 상세 패널 */}
      {selectedGroup && (
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Selected</p>
              <h3 className="mt-1 text-lg font-semibold text-neutral-100">
                {new Date(selectedGroup.candleTime * 1000).toLocaleString()}
              </h3>
            </div>
            <button
              onClick={() => setSelectedGroup(null)}
              className="rounded-lg border border-neutral-700 px-3 py-1 text-xs text-neutral-400 hover:bg-neutral-800"
            >
              닫기
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* 버블 목록 */}
            {selectedGroup.bubbles.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
                  Bubbles ({selectedGroup.bubbles.length})
                </p>
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                  {selectedGroup.bubbles.map(bubble => (
                    <div key={bubble.id} className="rounded-xl border border-neutral-800/70 bg-neutral-950/40 p-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${
                          bubble.action === 'BUY' ? 'text-green-400' :
                          bubble.action === 'SELL' ? 'text-red-400' :
                          bubble.action === 'TP' ? 'text-emerald-300' :
                          bubble.action === 'SL' ? 'text-rose-300' :
                          'text-neutral-300'
                        }`}>
                          {bubble.action || 'NOTE'}
                        </span>
                        <span className="text-sm text-neutral-400">${bubble.price.toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-sm text-neutral-200">{bubble.note}</p>
                      {bubble.tags && bubble.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {bubble.tags.map(tag => (
                            <span key={tag} className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* AI 에이전트 조언 */}
                      {bubble.agents && bubble.agents.length > 0 && (
                        <div className="mt-3 border-t border-neutral-800 pt-3">
                          <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-2">AI Analysis</p>
                          <div className="space-y-2">
                            {bubble.agents.map((agent, idx) => (
                              <div key={idx} className="rounded-lg bg-neutral-900/60 p-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-semibold text-neutral-300">{agent.provider}</span>
                                  <span className="text-neutral-500">{agent.model}</span>
                                </div>
                                <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{agent.response}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 거래 목록 */}
            {selectedGroup.trades.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
                  Trades ({selectedGroup.trades.length})
                </p>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {selectedGroup.trades.map(trade => (
                    <div key={trade.id} className="rounded-xl border border-neutral-800/70 bg-neutral-950/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.side.toUpperCase()}
                        </span>
                        <span className="text-xs text-neutral-500">{trade.exchange}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm text-neutral-300">
                        <span>{trade.qty} BTC</span>
                        <span>@ ${trade.price.toLocaleString()}</span>
                      </div>
                      {trade.fee && (
                        <div className="mt-1 text-xs text-neutral-500">Fee: ${trade.fee}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <BubbleCreateModal
        open={isModalOpen}
        symbol={selectedSymbol}
        defaultTimeframe={timeframe}
        defaultPrice={clickedCandle?.price.toString() || latestPrice}
        defaultTime={clickedCandle?.time ? clickedCandle.time * 1000 : undefined}
        onClose={() => { setIsModalOpen(false); setClickedCandle(null) }}
      />
    </div>
  )
}
