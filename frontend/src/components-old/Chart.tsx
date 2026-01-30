'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createChart, ColorType, CrosshairMode, type UTCTimestamp } from 'lightweight-charts'
import { api } from '../lib/api'
import { BubbleCreateModal } from '../components/BubbleCreateModal'

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

type BubbleItem = {
  id: string
  symbol: string
  timeframe: string
  candle_time: string
  price: string
  bubble_type: string
  memo?: string | null
  tags?: string[]
}

const intervals = ['1m', '15m', '1h', '4h', '1d']

// Timeframe hierarchy for bubble display
// Lower timeframe bubbles should be visible on higher timeframe charts
function shouldShowBubble(bubbleTimeframe: string, chartTimeframe: string): boolean {
  const hierarchy = ['1m', '15m', '1h', '4h', '1d']
  const bubbleIndex = hierarchy.indexOf(bubbleTimeframe)
  const chartIndex = hierarchy.indexOf(chartTimeframe)
  return bubbleIndex >= 0 && chartIndex >= 0 && bubbleIndex <= chartIndex
}

export function Chart() {
  const { symbol: symbolParam } = useParams()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const seriesRef = useRef<ReturnType<ReturnType<typeof createChart>['addCandlestickSeries']> | null>(null)
  const [symbols, setSymbols] = useState<UserSymbolItem[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [timeframe, setTimeframe] = useState('1h')
  const [klines, setKlines] = useState<KlineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bubbles, setBubbles] = useState<BubbleItem[]>([])
  const [bubblePositions, setBubblePositions] = useState<Array<{
    id: string
    x: number
    y: number
    isBuy: boolean
    memo: string
    price: string
  }>>([])

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
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (symbols.length === 0) return
    const symbolsUpper = symbols.map((item) => item.symbol)
    const normalizedParam = symbolParam?.toUpperCase() || ''
    const match = symbols.find((item) => item.symbol === normalizedParam)
    const selected = match?.symbol || symbols[0].symbol
    const defaultInterval = match?.timeframe_default || symbols[0].timeframe_default || '1h'

    setSelectedSymbol(selected)
    setTimeframe(intervals.includes(defaultInterval) ? defaultInterval : '1h')
    if (!normalizedParam || !symbolsUpper.includes(normalizedParam)) {
      router.replace(`/chart/${selected}`)
    }
  }, [router, symbolParam, symbols])

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
    return () => {
      active = false
    }
  }, [selectedSymbol, timeframe])

  useEffect(() => {
    if (!selectedSymbol) return
    let active = true
    const loadBubbles = async () => {
      try {
        const response = await api.get('/v1/bubbles', {
          params: { symbol: selectedSymbol, limit: 200, sort: 'desc' },
        })
        if (!active) return
        setBubbles(response.data?.items || [])
      } catch {
        if (!active) return
        setBubbles([])
      }
    }

    loadBubbles()
    return () => {
      active = false
    }
  }, [selectedSymbol])

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

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length) return
      const { width } = entries[0].contentRect
      chart.applyOptions({ width })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current) return
    seriesRef.current.setData(chartData)
    chartRef.current?.timeScale().fitContent()
  }, [chartData])

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || chartData.length === 0) return
    
    // Filter bubbles using shouldShowBubble
    const visibleBubbles = bubbles.filter(bubble => 
      shouldShowBubble(bubble.timeframe, timeframe)
    )

    // Calculate bubble positions using chart coordinate APIs
    const positions = visibleBubbles
      .map(bubble => {
        const isBuy = bubble.tags?.includes('buy') || bubble.bubble_type === 'buy'
        const time = Math.floor(new Date(bubble.candle_time).getTime() / 1000) as UTCTimestamp
        const price = parseFloat(bubble.price)
        
        // Get pixel coordinates from chart
        const x = chartRef.current?.timeScale().timeToCoordinate(time)
        const y = seriesRef.current?.priceToCoordinate(price)
        
        // Only include if coordinates are valid
        if (x === null || x === undefined || y === null || y === undefined) {
          return null
        }
        
        return {
          id: bubble.id,
          x,
          y,
          isBuy,
          memo: bubble.memo || '',
          price: bubble.price,
        }
      })
      .filter((pos): pos is NonNullable<typeof pos> => pos !== null)

    setBubblePositions(positions)
  }, [chartData, bubbles, timeframe])

  const handleSymbolChange = (value: string) => {
    const next = value.toUpperCase()
    setSelectedSymbol(next)
    router.push(`/chart/${next}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Market</p>
            <h2 className="mt-3 text-2xl font-semibold text-neutral-100">Chart Overview</h2>
            <p className="mt-2 text-sm text-neutral-400">
              실시간 캔들 데이터를 확인하고 바로 말풍선을 생성할 수 있도록 준비 중입니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col text-xs text-neutral-400">
              <span className="uppercase tracking-[0.2em]">Symbol</span>
              <select
                value={selectedSymbol}
                onChange={(event) => handleSymbolChange(event.target.value)}
                className="mt-2 rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              >
                {symbols.map((item) => (
                  <option key={item.symbol} value={item.symbol}>
                    {item.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col text-xs text-neutral-400">
              <span className="uppercase tracking-[0.2em]">Timeframe</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {intervals.map((interval) => (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => setTimeframe(interval)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                      timeframe === interval
                        ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                        : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    {interval}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col text-xs text-neutral-400">
              <span className="uppercase tracking-[0.2em]">Actions</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                disabled={!selectedSymbol}
                className="mt-2 rounded-lg bg-neutral-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create Bubble
              </button>
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Status</p>
          <p className="mt-3 text-lg font-semibold text-neutral-200">
            {loading ? 'Loading candles...' : 'Live view ready'}
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            {selectedSymbol || 'Symbol'} · {timeframe}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Bubble Flow</p>
          <p className="mt-3 text-lg font-semibold text-neutral-200">Next step</p>
          <p className="mt-2 text-sm text-neutral-500">Click a candle to create a bubble.</p>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">AI Insights</p>
          <p className="mt-3 text-lg font-semibold text-neutral-200">Ready</p>
          <p className="mt-2 text-sm text-neutral-500">AI commentary will appear on demand.</p>
        </div>
      </section>

      <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/20 p-4">
        <div className="relative h-[480px] w-full">
          <div className="h-full w-full" ref={containerRef} />
          {bubblePositions.map((bubble) => (
            <div
              key={bubble.id}
              className="absolute z-10 group"
              style={{
                left: `${bubble.x}px`,
                top: bubble.isBuy ? `${bubble.y + 20}px` : `${bubble.y - 50}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <div
                className={`relative rounded-lg px-3 py-2 text-xs font-medium shadow-lg transition-all hover:scale-105 ${
                  bubble.isBuy
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
                style={{
                  minWidth: '60px',
                  maxWidth: '200px',
                }}
              >
                <div className="truncate">{bubble.memo || bubble.price}</div>
                <div
                  className="absolute"
                  style={{
                    left: '50%',
                    transform: 'translateX(-50%)',
                    ...(bubble.isBuy
                      ? {
                          top: '-6px',
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderBottom: '6px solid rgb(34, 197, 94)',
                        }
                      : {
                          bottom: '-6px',
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid rgb(239, 68, 68)',
                        }),
                  }}
                />
                <div className="absolute left-0 right-0 top-full mt-2 hidden rounded-lg bg-neutral-900 p-2 text-xs text-neutral-200 shadow-xl group-hover:block">
                  <div>Price: {bubble.price}</div>
                  {bubble.memo && <div className="mt-1">Memo: {bubble.memo}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BubbleCreateModal
        open={isModalOpen}
        symbol={selectedSymbol}
        defaultTimeframe={timeframe}
        defaultPrice={latestPrice}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
