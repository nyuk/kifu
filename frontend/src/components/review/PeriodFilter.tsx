'use client'

import type { ReviewFilters } from '../../types/review'

type Props = {
  filters: ReviewFilters
  onFilterChange: (filters: Partial<ReviewFilters>) => void
}

export function PeriodFilter({ filters, onFilterChange }: Props) {
  const periods = [
    { value: '7d', label: '7일' },
    { value: '30d', label: '30일' },
    { value: 'all', label: '전체' },
  ] as const

  const outcomePeriods = [
    { value: '1h', label: '1시간' },
    { value: '4h', label: '4시간' },
    { value: '1d', label: '1일' },
  ] as const

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">기간:</span>
        <div className="flex rounded-lg bg-zinc-800 p-1">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => onFilterChange({ period: p.value })}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filters.period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Outcome:</span>
        <div className="flex rounded-lg bg-zinc-800 p-1">
          {outcomePeriods.map((p) => (
            <button
              key={p.value}
              onClick={() => onFilterChange({ outcomePeriod: p.value })}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filters.outcomePeriod === p.value
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
