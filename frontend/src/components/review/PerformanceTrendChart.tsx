'use client'

import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { PerformanceTrend } from '../../types/review'

type TrendResponse = {
  period: string
  data: PerformanceTrend[]
}

type PerformanceTrendChartProps = {
  period: string
}

export function PerformanceTrendChart({ period }: PerformanceTrendChartProps) {
  const [data, setData] = useState<PerformanceTrend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrend = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<TrendResponse>(`/v1/review/trend?period=${period}`)
        setData(response.data.data)
      } catch (err) {
        setError('추세 데이터를 불러오는데 실패했습니다')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrend()
  }, [period])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-white/[0.1] rounded w-1/4 mb-4"></div>
          <div className="h-48 bg-white/[0.08] rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    )
  }

  // Find max/min for scaling
  const maxCumulative = Math.max(...data.map((d) => d.cumulative_pnl), 0)
  const minCumulative = Math.min(...data.map((d) => d.cumulative_pnl), 0)
  const range = Math.max(Math.abs(maxCumulative), Math.abs(minCumulative)) || 1

  // Get last 7 days for labels (or less if not enough data)
  const recentData = data.slice(-7)

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
      <h3 className="text-sm font-medium text-neutral-200 mb-4">성과 추세</h3>

      {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
          <p className="text-zinc-400 text-sm mb-1">총 누적 수익</p>
          <p className={`text-lg font-bold ${
            data[data.length - 1]?.cumulative_pnl >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {data[data.length - 1]?.cumulative_pnl.toFixed(2) || '0.00'}%
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
          <p className="text-zinc-400 text-sm mb-1">평균 승률</p>
          <p className="text-lg font-bold text-blue-400">
            {(data.reduce((acc, d) => acc + (d.win_rate || 0), 0) / (data.filter(d => d.bubble_count > 0).length || 1)).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
          <p className="text-zinc-400 text-sm mb-1">총 버블 수</p>
          <p className="text-lg font-bold text-white">
            {data.reduce((acc, d) => acc + d.bubble_count, 0)}
          </p>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative h-48 rounded-lg border border-white/5 bg-white/[0.02] p-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-sm text-zinc-500 py-2">
          <span>{range.toFixed(1)}%</span>
          <span>0%</span>
          <span>-{range.toFixed(1)}%</span>
        </div>

        {/* Chart */}
        <div className="ml-12 h-full relative">
          {/* Zero line */}
          <div className="absolute left-0 right-0 top-1/2 border-t border-white/10"></div>

          {/* Bars */}
          <div className="flex items-end justify-around h-full gap-1">
            {data.map((point, idx) => {
              const height = Math.abs(point.cumulative_pnl) / range * 45 // 45% max height
              const isPositive = point.cumulative_pnl >= 0

              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center justify-center relative group"
                  style={{ maxWidth: '20px' }}
                >
                  {/* Bar */}
                  <div
                    className={`absolute w-full transition-all ${
                      isPositive ? 'bg-green-500/70' : 'bg-red-500/70'
                    }`}
                    style={{
                      height: `${height}%`,
                      bottom: isPositive ? '50%' : 'auto',
                      top: isPositive ? 'auto' : '50%',
                    }}
                  ></div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-zinc-700 text-white text-sm rounded px-2 py-1 whitespace-nowrap">
                      <div>{point.date}</div>
                      <div className={point.cumulative_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {point.cumulative_pnl.toFixed(2)}%
                      </div>
                      <div>버블: {point.bubble_count}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 ml-12 text-sm text-zinc-500">
        {recentData.map((point) => (
          <span key={point.date}>
            {new Date(`${point.date}T00:00:00`).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          </span>
        ))}
      </div>

      {/* Daily Details */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-zinc-200 mb-2">최근 기록</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {[...data].reverse().slice(0, 10).filter(d => d.bubble_count > 0).map((point) => (
            <div
              key={point.date}
              className="flex justify-between items-center text-sm py-1 px-2 rounded border border-white/5 bg-white/[0.02]"
            >
              <span className="text-zinc-400">{point.date}</span>
              <div className="flex gap-4">
                <span className={point.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {point.pnl >= 0 ? '+' : ''}{point.pnl.toFixed(2)}%
                </span>
                <span className="text-zinc-500">{point.bubble_count} 버블</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
