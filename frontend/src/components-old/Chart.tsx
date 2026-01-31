'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

type TradeItem = {
  id: string
  symbol: string
  exchange: string
  side: 'buy' | 'sell'
  quantity: string
  price: string
  realized_pnl?: string
  trade_time: string
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

// Floor timestamp to candle start time based on timeframe
function floorToCandle(timestamp: number, timeframe: string): number {
  const seconds = getTimeframeSeconds(timeframe)
  return Math.floor(timestamp / seconds) * seconds
}

export function Chart() {
  const { symbol: symbolParam } = useParams()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const seriesRef = useRef<ReturnType<ReturnType<typeof createChart>['addCandlestickSeries']> | null>(null)
  const [symbols, setSymbols] = useState<UserSymbolItem[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [timeframe, setTimeframe] = useState('1d')
  const [klines, setKlines] = useState<KlineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bubbles, setBubbles] = useState<BubbleItem[]>([])
  const [bubblePositions, setBubblePositions] = useState<Array<{
    candleTime: number
    x: number
    y: number
    bubbles: BubbleItem[]
    avgPrice: number
  }>>([])
  const [clickedCandle, setClickedCandle] = useState<{ time: number; price: number } | null>(null)
  const [trades, setTrades] = useState<TradeItem[]>([])
  const [tradePositions, setTradePositions] = useState<Array<{
    candleTime: number
    x: number
    y: number
    trades: TradeItem[]
    avgPrice: number
  }>>([])
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

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

    setSelectedSymbol(selected)
    // Always use 1d as default timeframe on initial load
    setTimeframe('1d')
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

  useEffect(() => {
    if (!selectedSymbol) return
    let active = true
    const loadTrades = async () => {
      try {
        const response = await api.get('/v1/trades', {
          params: { symbol: selectedSymbol, limit: 200 },
        })
        if (!active) return
        setTrades(response.data?.trades || [])
      } catch {
        if (!active) return
        setTrades([])
      }
    }

    loadTrades()
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

    const clickHandler = (param: any) => {
      if (!param.point || !param.time) return
      
      const price = series.coordinateToPrice(param.point.y)
      if (price === null) return
      
      const clickedTime = param.time as number
      
      const getTimeRangeForTimeframe = (tf: string): number => {
        const ranges: Record<string, number> = {
          '1m': 60,
          '15m': 900,
          '1h': 3600,
          '4h': 14400,
          '1d': 86400,
        }
        return ranges[tf] || 3600
      }
      
      const existingBubble = bubbles.find(b => {
        const bubbleTime = Math.floor(new Date(b.candle_time).getTime() / 1000)
        const timeRange = getTimeRangeForTimeframe(timeframe)
        return Math.abs(bubbleTime - clickedTime) < timeRange / 2
      })
      
      if (existingBubble) {
        console.log('Existing bubble clicked:', existingBubble)
      } else {
        setClickedCandle({ time: clickedTime, price })
        setIsModalOpen(true)
      }
    }
    
    chart.subscribeClick(clickHandler)

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
  }, [bubbles, timeframe])

  useEffect(() => {
    if (!seriesRef.current) return
    seriesRef.current.setData(chartData)
    chartRef.current?.timeScale().fitContent()
  }, [chartData])

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || chartData.length === 0) return
    
    const timer = setTimeout(() => {
      console.log('=== Bubble Aggregation Debug ===')
      console.log('Current timeframe:', timeframe)
      console.log('Total bubbles:', bubbles.length)
      
      const bubblesByCandle = new Map<number, BubbleItem[]>()
      
      bubbles.forEach(bubble => {
        const bubbleTime = Math.floor(new Date(bubble.candle_time).getTime() / 1000)
        const candleTime = floorToCandle(bubbleTime, timeframe)
        
        if (!bubblesByCandle.has(candleTime)) {
          bubblesByCandle.set(candleTime, [])
        }
        bubblesByCandle.get(candleTime)!.push(bubble)
      })
      
      console.log(`Grouped into ${bubblesByCandle.size} candles`)
      
      const positions: Array<{
        candleTime: number
        x: number
        y: number
        bubbles: BubbleItem[]
        avgPrice: number
      }> = []
      
      // Get chart price scale width to adjust x coordinate
      const chart = chartRef.current
      const priceScaleWidth = chart.priceScale('right').width()
      
      bubblesByCandle.forEach((candleBubbles, candleTime) => {
        const x = chart.timeScale().timeToCoordinate(candleTime as UTCTimestamp)
        if (x === null || x === undefined) return
        
        const avgPrice = candleBubbles.reduce((sum, b) => sum + parseFloat(b.price), 0) / candleBubbles.length
        const y = seriesRef.current?.priceToCoordinate(avgPrice)
        if (y === null || y === undefined) return
        
        // Adjust x to account for right price scale width
        const adjustedX = x
        
        console.log(`Candle ${new Date(candleTime * 1000).toISOString()}: ${candleBubbles.length} bubbles, avgPrice=${avgPrice}, x=${adjustedX}, y=${y}, priceScaleWidth=${priceScaleWidth}`)
        
        positions.push({
          candleTime,
          x: adjustedX,
          y,
          bubbles: candleBubbles,
          avgPrice,
        })
      })
      
      console.log('Final positions:', positions.length)
      setBubblePositions(positions)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [chartData, bubbles, timeframe])

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || chartData.length === 0) return
    
    // Delay to ensure chart is fully rendered
    const timer = setTimeout(() => {
      console.log('=== Trade Aggregation Debug ===')
      console.log('Current timeframe:', timeframe)
      console.log('Total trades:', trades.length)
      
      // Group trades by candle (all trades, regardless of their timeframe)
      const tradesByCandle = new Map<number, TradeItem[]>()
      
      trades.forEach(trade => {
        const tradeTime = Math.floor(new Date(trade.trade_time).getTime() / 1000)
        const candleTime = floorToCandle(tradeTime, timeframe)
        
        if (!tradesByCandle.has(candleTime)) {
          tradesByCandle.set(candleTime, [])
        }
        tradesByCandle.get(candleTime)!.push(trade)
      })
      
      console.log(`Grouped trades into ${tradesByCandle.size} candles`)
      
      // Calculate positions for each candle group
      const positions: Array<{
        candleTime: number
        x: number
        y: number
        trades: TradeItem[]
        avgPrice: number
      }> = []
      
      tradesByCandle.forEach((candleTrades, candleTime) => {
        const x = chartRef.current?.timeScale().timeToCoordinate(candleTime as UTCTimestamp)
        if (x === null || x === undefined) return
        
        // Calculate average price for positioning
        const avgPrice = candleTrades.reduce((sum, t) => sum + parseFloat(t.price), 0) / candleTrades.length
        const y = seriesRef.current?.priceToCoordinate(avgPrice)
        if (y === null || y === undefined) return
        
        console.log(`Trade Candle ${new Date(candleTime * 1000).toISOString()}: ${candleTrades.length} trades, avgPrice=${avgPrice}, x=${x}, y=${y}`)
        
        positions.push({
          candleTime,
          x,
          y,
          trades: candleTrades,
          avgPrice,
        })
      })
      
      console.log('Final trade positions:', positions.length)
      setTradePositions(positions)
    }, 600)
    
    return () => clearTimeout(timer)
  }, [chartData, trades, timeframe])

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

      <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/20 p-4 relative">
        <div className="h-[480px] w-full" ref={containerRef} />
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 50 }}>
          {bubblePositions.map((group) => {
            const count = group.bubbles.length
            const hasBuy = group.bubbles.some(b => b.tags?.includes('buy') || b.bubble_type === 'buy')
            const hasSell = group.bubbles.some(b => b.tags?.includes('sell') || b.bubble_type === 'sell')
            const isMixed = hasBuy && hasSell
            const isBuy = hasBuy && !hasSell
            
            return (
              <div
                key={group.candleTime}
                className="absolute group cursor-pointer pointer-events-auto"
                style={{
                  left: `${group.x}px`,
                  top: `${group.y - 30}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div
                  className={`relative rounded-lg px-3 py-2 text-xs font-semibold shadow-lg transition-all hover:scale-110 ${
                    isMixed
                      ? 'bg-yellow-500 text-white'
                      : isBuy
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                  }`}
                  style={{
                    minWidth: '50px',
                  }}
                >
                  {count === 1 ? (
                    <div className="truncate max-w-[150px]">
                      {group.bubbles[0].memo || `$${group.bubbles[0].price}`}
                    </div>
                  ) : (
                    <div className="text-center">{count}개 거래</div>
                  )}
                  <div
                    className="absolute"
                    style={{
                      left: '50%',
                      bottom: '-6px',
                      transform: 'translateX(-50%)',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: isMixed
                        ? '6px solid rgb(234, 179, 8)'
                        : isBuy
                          ? '6px solid rgb(34, 197, 94)'
                          : '6px solid rgb(239, 68, 68)',
                    }}
                  />
                </div>
                <div className="absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 rounded-lg bg-neutral-900 p-3 text-xs text-neutral-200 shadow-xl group-hover:block min-w-[200px] max-w-[300px] z-20">
                  <div className="font-semibold mb-2">
                    {new Date(group.candleTime * 1000).toLocaleString('ko-KR')}
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {group.bubbles.map((b, idx) => (
                      <div key={b.id} className="border-t border-neutral-700 pt-2 first:border-0 first:pt-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${
                            b.tags?.includes('buy') || b.bubble_type === 'buy'
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}>
                            {b.tags?.includes('buy') || b.bubble_type === 'buy' ? '매수' : '매도'}
                          </span>
                          <span className="text-neutral-400">${b.price}</span>
                        </div>
                        {b.memo && <div className="mt-1 text-neutral-300">{b.memo}</div>}
                        {b.tags && b.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {b.tags.map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-neutral-800 rounded text-[10px]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
          {tradePositions.map((group) => {
            const count = group.trades.length
            const hasBuy = group.trades.some(t => t.side === 'buy')
            const hasSell = group.trades.some(t => t.side === 'sell')
            const isMixed = hasBuy && hasSell
            const isBuy = hasBuy && !hasSell
            
            return (
              <div
                key={`trade-${group.candleTime}`}
                className="absolute group cursor-pointer pointer-events-auto"
                style={{
                  left: `${group.x + 20}px`,
                  top: `${group.y - 30}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div
                  className={`relative rounded px-2 py-1 text-xs font-semibold shadow-lg transition-all hover:scale-110 border-2 ${
                    isMixed
                      ? 'bg-purple-500 border-purple-300 text-white'
                      : isBuy
                        ? 'bg-blue-500 border-blue-300 text-white'
                        : 'bg-cyan-500 border-cyan-300 text-white'
                  }`}
                  style={{
                    minWidth: '40px',
                  }}
                >
                  {count === 1 ? (
                    <div className="truncate max-w-[100px]">
                      {group.trades[0].side === 'buy' ? '매수' : '매도'}
                    </div>
                  ) : (
                    <div className="text-center">{count}거래</div>
                  )}
                  <div
                    className="absolute"
                    style={{
                      left: '50%',
                      bottom: '-6px',
                      transform: 'translateX(-50%)',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: isMixed
                        ? '6px solid rgb(168, 85, 247)'
                        : isBuy
                          ? '6px solid rgb(59, 130, 246)'
                          : '6px solid rgb(6, 182, 212)',
                    }}
                  />
                </div>
                <div className="absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 rounded-lg bg-neutral-900 p-3 text-xs text-neutral-200 shadow-xl group-hover:block min-w-[220px] max-w-[320px] z-20">
                  <div className="font-semibold mb-2 text-purple-400">
                    거래내역 {new Date(group.candleTime * 1000).toLocaleDateString('ko-KR')}
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {group.trades.map((t) => (
                      <div key={t.id} className="border-t border-neutral-700 pt-2 first:border-0 first:pt-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${
                            t.side === 'buy' ? 'text-blue-400' : 'text-cyan-400'
                          }`}>
                            {t.side === 'buy' ? '매수' : '매도'}
                          </span>
                          <span className="text-neutral-400">{t.exchange}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-neutral-300">수량: {parseFloat(t.quantity).toFixed(4)}</span>
                          <span className="text-neutral-400">${parseFloat(t.price).toFixed(2)}</span>
                        </div>
                        {t.realized_pnl && (
                          <div className={`mt-1 text-right ${
                            parseFloat(t.realized_pnl) >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            PnL: {parseFloat(t.realized_pnl) >= 0 ? '+' : ''}{parseFloat(t.realized_pnl).toFixed(2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
               </div>
            )
          })}
          </div>
        </div>

      <BubbleCreateModal
        open={isModalOpen}
        symbol={selectedSymbol}
        defaultTimeframe={timeframe}
        defaultPrice={clickedCandle?.price.toString() || latestPrice}
        onClose={() => {
          setIsModalOpen(false)
          setClickedCandle(null)
        }}
      />
    </div>
  )
}
