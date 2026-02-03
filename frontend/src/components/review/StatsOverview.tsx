'use client'

import type { ReviewStats } from '../../types/review'

type Props = {
  stats: ReviewStats | null
  isLoading: boolean
}

export function StatsOverview({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-zinc-700 rounded w-20 mb-2" />
            <div className="h-8 bg-zinc-700 rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-zinc-500">
        데이터가 없습니다
      </div>
    )
  }

  const cards = [
    {
      label: '총 버블',
      value: stats.total_bubbles.toString(),
      subtext: `${stats.bubbles_with_outcome} 결과 있음`,
    },
    {
      label: '승률',
      value: `${stats.overall.win_rate.toFixed(1)}%`,
      color: stats.overall.win_rate >= 50 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: '평균 PnL',
      value: `${parseFloat(stats.overall.avg_pnl) >= 0 ? '+' : ''}${parseFloat(stats.overall.avg_pnl).toFixed(2)}%`,
      color: parseFloat(stats.overall.avg_pnl) >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: '총 PnL',
      value: `${parseFloat(stats.overall.total_pnl) >= 0 ? '+' : ''}${parseFloat(stats.overall.total_pnl).toFixed(2)}%`,
      color: parseFloat(stats.overall.total_pnl) >= 0 ? 'text-green-400' : 'text-red-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">{card.label}</div>
          <div className={`text-2xl font-bold ${card.color || 'text-white'}`}>
            {card.value}
          </div>
          {card.subtext && (
            <div className="text-xs text-zinc-500 mt-1">{card.subtext}</div>
          )}
        </div>
      ))}
    </div>
  )
}
