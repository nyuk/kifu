'use client'

import type { TagStats } from '../../types/review'

type Props = {
  byTag: Record<string, TagStats> | undefined
  isLoading: boolean
}

const tagColors: Record<string, string> = {
  BUY: 'bg-green-500/20 text-green-400 border-green-500/30',
  SELL: 'bg-red-500/20 text-red-400 border-red-500/30',
  TP: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SL: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  HOLD: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

export function TagPerformance({ byTag, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="h-5 bg-zinc-700 rounded w-32 mb-4" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-zinc-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const tags = byTag ? Object.entries(byTag) : []

  if (tags.length === 0) {
    return (
      <div className="bg-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">태그별 성과</h3>
        <div className="text-center py-4 text-zinc-500">
          데이터가 없습니다
        </div>
      </div>
    )
  }

  // Sort by count descending
  const sortedTags = tags.sort((a, b) => b[1].count - a[1].count)

  return (
    <div className="bg-zinc-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">태그별 성과</h3>
      <div className="space-y-2">
        {sortedTags.map(([tag, stats]) => {
          const pnl = parseFloat(stats.avg_pnl)
          return (
            <div
              key={tag}
              className={`flex items-center justify-between p-2 rounded border ${tagColors[tag] || 'bg-zinc-700/50 text-zinc-300 border-zinc-600'}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{tag}</span>
                <span className="text-xs opacity-70">({stats.count})</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className={stats.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}>
                  {stats.win_rate.toFixed(1)}%
                </span>
                <span className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
