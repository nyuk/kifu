'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../../src/lib/api'
import { normalizeTradeSummary } from '../../../src/lib/tradeAdapters'
import { useReviewStore } from '../../../src/stores/reviewStore'
import { StatsOverview } from '../../../src/components/review/StatsOverview'
import { AccuracyChart } from '../../../src/components/review/AccuracyChart'
import { TagPerformance } from '../../../src/components/review/TagPerformance'
import { SymbolPerformance } from '../../../src/components/review/SymbolPerformance'
import { PeriodFilter } from '../../../src/components/review/PeriodFilter'
import { CalendarView } from '../../../src/components/review/CalendarView'
import { NoteList } from '../../../src/components/review/NoteList'
import { parseAiSections, toneClass } from '../../../src/lib/aiResponseFormat'
import { ExportButtons } from '../../../src/components/review/ExportButtons'
import { PerformanceTrendChart } from '../../../src/components/review/PerformanceTrendChart'
import type { TradeSummaryResponse } from '../../../src/types/trade'
import type { SymbolStats, ReviewNote, NotesListResponse } from '../../../src/types/review'

export default function ReviewPage() {
  const [tradeSummary, setTradeSummary] = useState<TradeSummaryResponse | null>(null)
  const [alertActions, setAlertActions] = useState<Array<{
    id: string
    symbol: string
    action: string
    note?: string
    created_at: string
  }>>([])
  const [aiNotes, setAiNotes] = useState<ReviewNote[]>([])
  const [aiNotesLoading, setAiNotesLoading] = useState(false)
  const [aiNotesError, setAiNotesError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
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

  const getCurrentMonthRange = () => {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    return { from, to }
  }

  useEffect(() => {
    fetchStats()
    fetchAccuracy()

    // Fetch calendar for current month
    const { from, to } = getCurrentMonthRange()
    fetchCalendar(from, to)
  }, [fetchStats, fetchAccuracy, fetchCalendar])

  // Refetch when filters change
  useEffect(() => {
    fetchStats()
    fetchAccuracy()
    const { from, to } = getCurrentMonthRange()
    fetchCalendar(from, to)
  }, [
    filters.period,
    filters.outcomePeriod,
    filters.assetClass,
    filters.venue,
    fetchStats,
    fetchAccuracy,
    fetchCalendar,
  ])

  useEffect(() => {
    let isActive = true
    const loadTradeSummary = async () => {
      try {
        const params = new URLSearchParams()
        if (filters.period === '7d') {
          params.set('from', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        } else if (filters.period === '30d') {
          params.set('from', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        }
        if (filters.symbol) params.set('symbol', filters.symbol)
        if (filters.venue) params.set('exchange', filters.venue)
        const response = await api.get(`/v1/trades/summary?${params.toString()}`)
        if (isActive) setTradeSummary(normalizeTradeSummary(response.data))
      } catch {
        if (isActive) setTradeSummary(null)
      }
    }
    loadTradeSummary()
    return () => {
      isActive = false
    }
  }, [filters.period, filters.symbol, filters.venue, refreshTick])

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTick((prev) => prev + 1)
      fetchStats()
      fetchAccuracy()
      const { from, to } = getCurrentMonthRange()
      fetchCalendar(from, to)
    }
    window.addEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    return () => {
      window.removeEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    }
  }, [fetchStats, fetchAccuracy, fetchCalendar])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('kifu-alert-actions')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setAlertActions(parsed)
      }
    } catch {
      setAlertActions([])
    }
  }, [])

  useEffect(() => {
    let isActive = true
    const loadAiNotes = async () => {
      setAiNotesLoading(true)
      setAiNotesError(null)
      try {
        const response = await api.get<NotesListResponse>('/v1/notes?page=1&limit=20')
        const items = response.data?.notes || []
        const filtered = items.filter((note) => {
          const title = note.title || ''
          const hasTag = (note.tags || []).some((tag) => tag.toLowerCase() === 'ai')
          return hasTag || title.includes('AI')
        })
        if (isActive) setAiNotes(filtered.slice(0, 6))
      } catch {
        if (isActive) setAiNotesError('AI 복기 요약을 불러오지 못했습니다.')
      } finally {
        if (isActive) setAiNotesLoading(false)
      }
    }
    loadAiNotes()
    return () => {
      isActive = false
    }
  }, [refreshTick])

  const tradePnl = useMemo(() => Number(tradeSummary?.totals?.realized_pnl_total || 0), [tradeSummary])
  const tradeCount = tradeSummary?.totals?.total_trades || 0
  const topTradeSymbol = useMemo(() => {
    const rows = tradeSummary?.by_symbol || []
    if (rows.length === 0) return null
    return [...rows].sort((a, b) => Number(b.total_trades || b.trade_count || 0) - Number(a.total_trades || a.trade_count || 0))[0]
  }, [tradeSummary])
  const topTradeExchange = useMemo(() => {
    const rows = tradeSummary?.by_exchange || []
    if (rows.length === 0) return null
    return [...rows].sort((a, b) => Number(b.total_trades || b.trade_count || 0) - Number(a.total_trades || a.trade_count || 0))[0]
  }, [tradeSummary])
  const symbolStatsForView = useMemo<Record<string, SymbolStats>>(() => {
    const tradeRows = tradeSummary?.by_symbol || []
    if (tradeRows.length === 0) return stats?.by_symbol || {}

    const mapped: Record<string, SymbolStats> = {}
    for (const row of tradeRows) {
      const symbol = row.symbol || 'UNKNOWN'
      const count = Number(row.total_trades || row.trade_count || 0)
      const wins = Number(row.wins || 0)
      const losses = Number(row.losses || 0)
      const pnlTotal = Number(row.realized_pnl_total || 0)
      const decided = wins + losses
      const winRate = decided > 0 ? (wins / decided) * 100 : 0
      const avgPnl = count > 0 ? pnlTotal / count : 0
      mapped[symbol] = {
        count,
        win_rate: winRate,
        avg_pnl: avgPnl.toFixed(4),
      }
    }
    return mapped
  }, [stats?.by_symbol, tradeSummary])

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

        <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-zinc-300">거래내역 반영 요약</h3>
            <div className={`text-sm font-semibold ${tradePnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              실현손익 {tradePnl >= 0 ? '+' : ''}{tradePnl.toLocaleString()}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(tradeSummary?.by_exchange || []).map((item, index) => {
              const exchangeName = item.exchange || 'unknown'
              const tradeCount = Number(item.total_trades || item.trade_count || 0)
              const chipKey = `${exchangeName}-${tradeCount}-${index}`
              return (
                <span key={chipKey} className="rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                  {exchangeName} · {tradeCount.toLocaleString()}건
                </span>
              )
            })}
            {(!tradeSummary || tradeSummary.by_exchange.length === 0) && (
              <span className="text-xs text-zinc-500">표시할 거래 요약이 없습니다.</span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">실거래 건수</p>
              <p className="mt-1 text-base font-semibold text-sky-300">{tradeCount.toLocaleString()}건</p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">TOP 심볼</p>
              <p className="mt-1 text-base font-semibold text-emerald-300">
                {topTradeSymbol ? `${topTradeSymbol.symbol} (${(topTradeSymbol.total_trades || topTradeSymbol.trade_count || 0).toLocaleString()})` : '-'}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">TOP 거래소</p>
              <p className="mt-1 text-base font-semibold text-amber-300">
                {topTradeExchange ? `${topTradeExchange.exchange} (${(topTradeExchange.total_trades || topTradeExchange.trade_count || 0).toLocaleString()})` : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-zinc-300">긴급 대응 기록</h3>
            <Link href="/alert" className="text-xs text-zinc-400 hover:text-zinc-200">
              긴급 모드로 이동
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {alertActions.length === 0 && (
              <p className="text-xs text-zinc-500">아직 긴급 대응 기록이 없습니다.</p>
            )}
            {alertActions.slice(0, 6).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{entry.symbol} · {entry.action}</span>
                  <span>{new Date(entry.created_at).toLocaleString('ko-KR')}</span>
                </div>
                {entry.note && (
                  <p className="mt-1 text-xs text-zinc-300">{entry.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-zinc-300">AI 복기 요약</h3>
            <span className="text-xs text-zinc-500">최근 요청 기준</span>
          </div>
          {aiNotesError && (
            <p className="mt-3 text-xs text-rose-300">{aiNotesError}</p>
          )}
          {aiNotesLoading && (
            <p className="mt-3 text-xs text-zinc-500">불러오는 중...</p>
          )}
          {!aiNotesLoading && aiNotes.length === 0 && !aiNotesError && (
            <p className="mt-3 text-xs text-zinc-500">아직 AI 복기 요약이 없습니다.</p>
          )}
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {aiNotes.map((note) => {
              const sections = parseAiSections(note.content || '')
              const header = sections.length > 0 ? sections[0].title : note.title
              return (
                <div key={note.id} className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{header || 'AI 요약'}</span>
                    <span>{new Date(note.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {(sections.length > 0 ? sections : [{ title: '요약', body: note.content, tone: 'summary' as const }]).map((section) => (
                      <div
                        key={`${note.id}-${section.title}`}
                        className={`rounded-lg border px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${toneClass(section.tone)}`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">{section.title}</p>
                        <p className="mt-1 text-xs text-inherit whitespace-pre-wrap">{section.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
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
          <SymbolPerformance bySymbol={symbolStatsForView} isLoading={isLoading} />

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
