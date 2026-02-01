'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createChart, ColorType, CrosshairMode, type UTCTimestamp } from 'lightweight-charts'
import { api } from '../lib/api'
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
        setSymbols(data)
      } catch (err: any) {
        if (!active) return
        setError(err?.response?.data?.message || '심볼을 불러오지 못했습니다.')
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
      const timeRange = getTimeframeSeconds(timeframe)

      // Check if clicking near an existing bubble
      const existingGrouping = overlayPositions.find(p => p.candleTime === clickedTime)

      if (existingGrouping && existingGrouping.bubbles.length > 0) {
        console.log('Clicked group:', existingGrouping)
        // Ideally open modal to edit the first bubble or show list?
        // Current logic: Create new bubble at this time anyway
      }

      setClickedCandle({ time: clickedTime, price })
      setIsModalOpen(true)
    }

    chart.subscribeClick(clickHandler)
    chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      updateOverlayPosition()
      updatePositions()
    })

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length) return
      const { width } = entries[0].contentRect
      chart.applyOptions({ width })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      chart.unsubscribeClick(clickHandler)
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [overlayPositions, timeframe, chartData, updatePositions, updateOverlayPosition])

  // Update Data Effect
  useEffect(() => {
    if (!seriesRef.current) return
    seriesRef.current.setData(chartData)
    chartRef.current?.timeScale().fitContent()
    setTimeout(() => { updateOverlayPosition() }, 100)
  }, [chartData, updateOverlayPosition])

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
        <div className="h-[480px] w-full" ref={containerRef} />
      </div>

      {mounted && (
        <div style={{ position: 'fixed', left: overlayRect.left, top: overlayRect.top, width: overlayRect.width, height: overlayRect.height, zIndex: 20, pointerEvents: 'none', overflow: 'hidden' }}>
          {overlayPositions.map((group) => {
            const hasBubbles = group.bubbles.length > 0
            const hasTrades = group.trades.length > 0

            // Determine Marker Style
            // Priority: Mixed > Bubble > Trade
            let bgColor = 'bg-neutral-700'
            const borderColor = hasBubbles && hasTrades ? 'border-yellow-500' : 'transparent'

            if (hasBubbles && hasTrades) {
              bgColor = 'bg-neutral-800'
            } else if (hasBubbles) {
              const isBuy = group.bubbles.some(b => b.tags?.includes('buy') || b.action === 'BUY')
              const isSell = group.bubbles.some(b => b.tags?.includes('sell') || b.action === 'SELL')
              if (isBuy && isSell) bgColor = 'bg-yellow-600'
              else if (isBuy) bgColor = 'bg-green-600'
              else if (isSell) bgColor = 'bg-red-600'
              else bgColor = 'bg-neutral-600'
            } else if (hasTrades) {
              // Determine net side? or just show count
              const buyCount = group.trades.filter(t => t.side === 'buy').length
              const sellCount = group.trades.filter(t => t.side === 'sell').length
              if (buyCount > sellCount) bgColor = 'bg-green-900/80 text-green-200'
              else if (sellCount > buyCount) bgColor = 'bg-red-900/80 text-red-200'
              else bgColor = 'bg-blue-900/80 text-blue-200'
            }

            return (
              <div key={group.candleTime} className="absolute group cursor-pointer" style={{ left: group.x, top: group.y - 40, transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
                <div className={`relative rounded px-2 py-1 text-xs font-semibold shadow-md transition-transform hover:scale-110 ${bgColor} ${hasBubbles && hasTrades ? 'border border-yellow-500' : ''}`}>
                  <div className="flex items-center gap-1">
                    {hasBubbles && <span className="text-white">💬{group.bubbles.length}</span>}
                    {hasTrades && <span className="text-xs">
                      {group.trades.filter(t => t.side === 'buy').length > 0 && '↑'}
                      {group.trades.filter(t => t.side === 'sell').length > 0 && '↓'}
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
                      {group.bubbles.map(b => (
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
                      {group.trades.map(t => (
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
