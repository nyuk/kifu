'use client'

import type { ReviewFilters } from '../../types/review'
import { FilterGroup, FilterPills } from '../ui/FilterPills'

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

  const assetClasses = [
    { value: 'all', label: '전체' },
    { value: 'crypto', label: '코인' },
    { value: 'stock', label: '주식' },
  ] as const

  return (
    <div className="flex flex-wrap items-center gap-4">
      <FilterGroup label="기간" tone="sky">
        <FilterPills
          options={periods.map((p) => ({ value: p.value, label: p.label }))}
          value={filters.period}
          onChange={(value) => onFilterChange({ period: value as ReviewFilters['period'] })}
          tone="sky"
          ariaLabel="기간 필터"
        />
      </FilterGroup>

      <FilterGroup label="결과" tone="emerald">
        <FilterPills
          options={outcomePeriods.map((p) => ({ value: p.value, label: p.label }))}
          value={filters.outcomePeriod}
          onChange={(value) => onFilterChange({ outcomePeriod: value as ReviewFilters['outcomePeriod'] })}
          tone="emerald"
          ariaLabel="결과 필터"
        />
      </FilterGroup>

      <FilterGroup label="자산군" tone="amber">
        <FilterPills
          options={assetClasses.map((p) => ({ value: p.value, label: p.label }))}
          value={filters.assetClass ?? 'all'}
          onChange={(value) => onFilterChange({ assetClass: value as ReviewFilters['assetClass'] })}
          tone="amber"
          ariaLabel="자산군 필터"
        />
      </FilterGroup>

      <FilterGroup label="거래소" tone="fuchsia">
        <input
          value={filters.venue ?? ''}
          onChange={(event) => onFilterChange({ venue: event.target.value })}
          placeholder="binance_futures / binance_spot / upbit"
          className="min-w-[140px] rounded-lg border border-fuchsia-400/40 bg-neutral-950/70 px-3 py-1.5 text-xs font-semibold text-fuchsia-100 placeholder:text-fuchsia-300/70"
        />
      </FilterGroup>
    </div>
  )
}
