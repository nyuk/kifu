'use client'

import type { SymbolStats } from '../../types/review'

type Props = {
  bySymbol: Record<string, SymbolStats> | undefined
  isLoading: boolean
}

export function SymbolPerformance({ bySymbol, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="h-5 bg-zinc-700 rounded w-32 mb-4" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-zinc-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const symbols = bySymbol ? Object.entries(bySymbol) : []

  if (symbols.length === 0) {
    return (
      <div className="bg-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">심볼별 성과</h3>
        <div className="text-center py-4 text-zinc-500">
          데이터가 없습니다
        </div>
      </div>
    )
  }

  // Sort by count descending
  const sortedSymbols = symbols.sort((a, b) => b[1].count - a[1].count)

  return (
    <div className="bg-zinc-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">심볼별 성과</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedSymbols.map(([symbol, stats]) => {
          const pnl = parseFloat(stats.avg_pnl)
          return (
            <div
              key={symbol}
              className="flex items-center justify-between p-2 rounded bg-zinc-700/50 hover:bg-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-sm">{symbol}</span>
                <span className="text-xs text-zinc-500">({stats.count})</span>
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
