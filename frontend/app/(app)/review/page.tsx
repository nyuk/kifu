'use client'

import { useEffect } from 'react'
import { useReviewStore } from '../../../src/stores/reviewStore'
import { StatsOverview } from '../../../src/components/review/StatsOverview'
import { AccuracyChart } from '../../../src/components/review/AccuracyChart'
import { TagPerformance } from '../../../src/components/review/TagPerformance'
import { SymbolPerformance } from '../../../src/components/review/SymbolPerformance'
import { PeriodFilter } from '../../../src/components/review/PeriodFilter'
import { CalendarView } from '../../../src/components/review/CalendarView'
import { NoteList } from '../../../src/components/review/NoteList'
import { ExportButtons } from '../../../src/components/review/ExportButtons'
import { PerformanceTrendChart } from '../../../src/components/review/PerformanceTrendChart'

export default function ReviewPage() {
  const {
    stats,
    accuracy,
    calendar,
    isLoading,
    isLoadingAccuracy,
    error,
    filters,
    setFilters,
    fetchStats,
    fetchAccuracy,
    fetchCalendar,
  } = useReviewStore()

  useEffect(() => {
    fetchStats()
    fetchAccuracy()

    // Fetch calendar for current month
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    fetchCalendar(from, to)
  }, [fetchStats, fetchAccuracy, fetchCalendar])

  // Refetch when filters change
  useEffect(() => {
    fetchStats()
    fetchAccuracy()
  }, [filters.period, filters.outcomePeriod, fetchStats, fetchAccuracy])

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">복기 대시보드</h1>
            <p className="text-sm text-zinc-400 mt-1">
              트레이딩 판단과 결과를 분석합니다
            </p>
          </div>
          <PeriodFilter filters={filters} onFilterChange={setFilters} />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        <div className="mb-6">
          <StatsOverview stats={stats} isLoading={isLoading} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* AI Accuracy */}
          <AccuracyChart accuracy={accuracy} isLoading={isLoadingAccuracy} />

          {/* Tag Performance */}
          <TagPerformance byTag={stats?.by_tag} isLoading={isLoading} />
        </div>

        {/* Secondary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Symbol Performance */}
          <SymbolPerformance bySymbol={stats?.by_symbol} isLoading={isLoading} />

          {/* Calendar */}
          <CalendarView calendar={calendar} isLoading={isLoading} />
        </div>

        {/* Period Stats */}
        {stats?.by_period && Object.keys(stats.by_period).length > 0 && (
          <div className="mt-6 bg-zinc-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">기간별 성과</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['1h', '4h', '1d'].map((period) => {
                const data = stats.by_period[period]
                if (!data) return null
                const pnl = parseFloat(data.avg_pnl)

                return (
                  <div key={period} className="bg-zinc-700/50 rounded-lg p-4">
                    <div className="text-lg font-bold text-zinc-300 mb-2">
                      {period === '1h' ? '1시간' : period === '4h' ? '4시간' : '1일'} 후
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-zinc-500">승률</div>
                        <div className={`text-lg font-bold ${data.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {data.win_rate.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">평균 PnL</div>
                        <div className={`text-lg font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">거래 수</div>
                        <div className="text-lg font-bold text-zinc-300">
                          {data.count}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Performance Trend */}
        <div className="mt-6">
          <PerformanceTrendChart period={filters.period} />
        </div>

        {/* Notes and Export Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Review Notes */}
          <NoteList />

          {/* Export */}
          <ExportButtons period={filters.period} outcomePeriod={filters.outcomePeriod} />
        </div>
      </div>
    </div>
  )
}
