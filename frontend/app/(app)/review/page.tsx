'use client'

import Link from 'next/link'
import { type KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { PageJumpPager } from '../../../src/components/ui/PageJumpPager'
import { HomeGuidedReviewCard } from '../../../src/components/home/HomeGuidedReviewCard'
import { isGuestSession } from '../../../src/lib/guestSession'
import type { TradeSummaryResponse } from '../../../src/types/trade'
import type { SymbolStats, ReviewNote, NotesListResponse } from '../../../src/types/review'

type BubbleListItem = {
  id: string
  symbol: string
  timeframe: string
  candle_time?: string
  venue_name?: string
}

type BubbleListResponse = {
  items: BubbleListItem[]
}

type AINoteCard = ReviewNote & {
  symbol?: string
  timeframe?: string
  candle_time?: string
  venue_name?: string
  source_label?: string
}

const parseSourceBadge = (tags: string[] = []) => {
  const normalized = tags.map((tag) => tag.toLowerCase())
  if (normalized.includes('alert') || normalized.includes('alerting') || normalized.includes('alerting')) return 'ALERT'
  if (normalized.includes('one-shot') || normalized.includes('one-shot-note')) return 'One-shot'
  if (normalized.includes('technical')) return 'Technical'
  if (normalized.includes('summary')) return '요약'
  if (normalized.includes('brief') || normalized.includes('detailed')) return '요약'
  return 'One-shot'
}

const SOURCE_BADGE_CLASS = 'rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2 py-0.5 text-emerald-200'
const VENUE_BADGE_CLASS = 'rounded-full border border-sky-300/35 bg-sky-500/12 px-2 py-0.5 text-sky-200'
const AI_NOTES_PAGE_SIZE = 6

const normalizeAiSymbol = (value?: string) => (value || '').trim().toUpperCase().replace(/\s+/g, '')

const normalizeAiTimeframe = (value?: string) => {
  const tf = (value || '1d').trim().toLowerCase()
  if (tf === '1m' || tf === '15m' || tf === '1h' || tf === '4h' || tf === '1d') {
    return tf
  }
  return '1d'
}

const buildAiChartUrl = (note: {
  symbol?: string
  timeframe?: string
  candle_time?: string
  created_at?: string
}) => {
  const symbol = normalizeAiSymbol(note.symbol)
  const timeframe = normalizeAiTimeframe(note.timeframe)
  if (!symbol) return null

  const focusTime = note.candle_time || note.created_at
  if (!focusTime) {
    return `/chart/${symbol}`
  }

  const params = new URLSearchParams()
  params.set('focus_ts', focusTime)
  params.set('focus_tf', timeframe)
  return `/chart/${symbol}?${params.toString()}`
}

const normalizeVenueLabel = (value?: string) => {
  if (!value) return ''
  const lowered = value.toLowerCase()
  if (lowered.includes('binance')) return 'Binance'
  if (lowered.includes('upbit')) return 'Upbit'
  if (lowered.includes('kis')) return 'KIS'
  if (lowered.includes('tradingview') || lowered.includes('mock')) return '시스템'
  return value
}

export default function ReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tradeSummary, setTradeSummary] = useState<TradeSummaryResponse | null>(null)
  const [alertActions, setAlertActions] = useState<Array<{
    id: string
    symbol: string
    action: string
    note?: string
    created_at: string
  }>>([])
  const [aiNotes, setAiNotes] = useState<AINoteCard[]>([])
  const [aiNotesLoading, setAiNotesLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '4h' | '1d'>('1h')
  const [aiNotesError, setAiNotesError] = useState<string | null>(null)
  const [aiSymbolFilter, setAiSymbolFilter] = useState('ALL')
  const [aiTimeframeFilter, setAiTimeframeFilter] = useState('ALL')
  const [reviewTab, setReviewTab] = useState<'overview' | 'ai' | 'analytics' | 'journal'>('overview')
  const [analyticsTab, setAnalyticsTab] = useState<'calendar' | 'metrics' | 'trend'>('calendar')
  const [aiFilterHydrated, setAiFilterHydrated] = useState(false)
  const [aiNotesPage, setAiNotesPage] = useState(1)
  const [aiNotesPageInput, setAiNotesPageInput] = useState('1')
  const [copiedShare, setCopiedShare] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const [guestMode, setGuestMode] = useState(false)
  const [guestModeReady, setGuestModeReady] = useState(false)
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
    setGuestMode(isGuestSession())
    setGuestModeReady(true)
  }, [])

  const getCurrentMonthRange = () => {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    return { from, to }
  }

  useEffect(() => {
    if (!guestModeReady) return
    if (guestMode && filters.period !== 'all') return
    fetchStats()
    fetchAccuracy()
    const { from, to } = getCurrentMonthRange()
    fetchCalendar(from, to)
  }, [
    guestMode,
    guestModeReady,
    filters.period,
    filters.outcomePeriod,
    filters.assetClass,
    filters.venue,
    fetchStats,
    fetchAccuracy,
    fetchCalendar,
  ])

  useEffect(() => {
    if (!guestModeReady) return
    if (!guestMode) return
    if (filters.period === 'all') return
    setFilters({ period: 'all' })
  }, [guestMode, guestModeReady, filters.period, setFilters])

  useEffect(() => {
    if (!guestModeReady) return
    if (guestMode && filters.period !== 'all') {
      setTradeSummary(null)
      return
    }
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
  }, [guestMode, guestModeReady, filters.period, filters.symbol, filters.venue, refreshTick])

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
        const [notesResponse, bubblesResponse] = await Promise.all([
          api.get<NotesListResponse>('/v1/notes?page=1&limit=100'),
          api.get<BubbleListResponse>('/v1/bubbles?page=1&limit=200&sort=desc'),
        ])
        const items = notesResponse.data?.notes || []
        const bubbles = bubblesResponse.data?.items || []
        const bubbleMap = new Map(bubbles.map((bubble) => [bubble.id, bubble]))
        const filtered = items.filter((note) => {
          const title = note.title || ''
          const hasTag = (note.tags || []).some((tag) => tag.toLowerCase() === 'ai')
          return hasTag || title.includes('AI')
        })
        const enriched = filtered.map((note) => {
          const bubble = note.bubble_id ? bubbleMap.get(note.bubble_id) : undefined
          return {
            ...note,
            symbol: bubble?.symbol,
            timeframe: bubble?.timeframe,
            candle_time: bubble?.candle_time,
            venue_name: bubble?.venue_name,
            source_label: parseSourceBadge(note.tags || []),
          }
        })
        if (isActive) setAiNotes(enriched.slice(0, 30))
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

  const aiSymbolOptions = useMemo(() => {
    const options = Array.from(new Set(aiNotes.map((note) => note.symbol).filter(Boolean)))
    return ['ALL', ...options] as string[]
  }, [aiNotes])

  const aiTimeframeOptions = useMemo(() => {
    const options = Array.from(new Set(aiNotes.map((note) => note.timeframe).filter(Boolean)))
    return ['ALL', ...options] as string[]
  }, [aiNotes])

  const filteredAiNotes = useMemo(() => {
    return aiNotes.filter((note) => {
      if (aiSymbolFilter !== 'ALL' && note.symbol !== aiSymbolFilter) return false
      if (aiTimeframeFilter !== 'ALL' && note.timeframe !== aiTimeframeFilter) return false
      return true
    })
  }, [aiNotes, aiSymbolFilter, aiTimeframeFilter])

  useEffect(() => {
    setAiNotesPage(1)
    setAiNotesPageInput('1')
  }, [aiSymbolFilter, aiTimeframeFilter])

  const jumpToAiNotesPage = () => {
    const parsedPage = Number.parseInt(aiNotesPageInput, 10)
    if (Number.isNaN(parsedPage)) {
      setAiNotesPageInput(String(aiNotesPage))
      return
    }
    setAiNotesPage(Math.min(aiNotesTotalPages, Math.max(1, parsedPage)))
  }

  const handleAiNotesPageInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpToAiNotesPage()
    }
  }

  const aiNotesTotalPages = Math.max(1, Math.ceil(filteredAiNotes.length / AI_NOTES_PAGE_SIZE))
  const pagedAiNotes = useMemo(() => {
    const start = (aiNotesPage - 1) * AI_NOTES_PAGE_SIZE
    return filteredAiNotes.slice(start, start + AI_NOTES_PAGE_SIZE)
  }, [filteredAiNotes, aiNotesPage])

  useEffect(() => {
    setAiNotesPageInput(String(aiNotesPage))
  }, [aiNotesPage])

  const copyAiFilterLink = async () => {
    const params = new URLSearchParams()
    if (aiSymbolFilter !== 'ALL') params.set('ai_symbol', aiSymbolFilter)
    if (aiTimeframeFilter !== 'ALL') params.set('ai_tf', aiTimeframeFilter)
    const url = new URL(window.location.href)
    url.pathname = '/review'
    url.search = params.toString()
    const link = url.toString()
    try {
      await navigator.clipboard.writeText(link)
      setCopiedShare(true)
      window.setTimeout(() => setCopiedShare(false), 1500)
    } catch {
      setCopiedShare(false)
    }
  }

  useEffect(() => {
    const qSymbol = searchParams.get('ai_symbol')
    const qTf = searchParams.get('ai_tf')
    if (qSymbol && qSymbol.trim()) setAiSymbolFilter(qSymbol)
    if (qTf && qTf.trim()) setAiTimeframeFilter(qTf)
    setAiFilterHydrated(true)
    // hydrate once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!aiFilterHydrated) return
    const currentSymbol = searchParams.get('ai_symbol') || 'ALL'
    const currentTf = searchParams.get('ai_tf') || 'ALL'
    if (currentSymbol === aiSymbolFilter && currentTf === aiTimeframeFilter) return

    const next = new URLSearchParams(searchParams.toString())
    if (aiSymbolFilter === 'ALL') next.delete('ai_symbol')
    else next.set('ai_symbol', aiSymbolFilter)
    if (aiTimeframeFilter === 'ALL') next.delete('ai_tf')
    else next.set('ai_tf', aiTimeframeFilter)

    const query = next.toString()
    router.replace(query ? `?${query}` : '/review', { scroll: false })
  }, [aiFilterHydrated, aiSymbolFilter, aiTimeframeFilter, searchParams, router])

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

  const renderAiPager = (
    <PageJumpPager
      totalItems={filteredAiNotes.length}
      totalPages={aiNotesTotalPages}
      currentPage={aiNotesPage}
      pageInput={aiNotesPageInput}
      onPageInputChange={setAiNotesPageInput}
      onPageInputKeyDown={handleAiNotesPageInputKeyDown}
      onFirst={() => setAiNotesPage(1)}
      onPrevious={() => setAiNotesPage((page) => Math.max(1, page - 1))}
      onNext={() => setAiNotesPage((page) => Math.min(aiNotesTotalPages, page + 1))}
      onLast={() => setAiNotesPage(aiNotesTotalPages)}
      onJump={jumpToAiNotesPage}
      disabled={aiNotesLoading}
      itemLabel="개"
    />
  )

  const reviewTabs = [
    { key: 'overview', label: '오늘 복기', hint: '거래 요약과 대응 기록' },
    { key: 'ai', label: 'AI 의견', hint: '버블별 AI 복기 비교' },
    { key: 'analytics', label: '패턴 분석', hint: '지표, 캘린더, 추세' },
    { key: 'journal', label: '노트 · 공유', hint: '노트와 내보내기' },
  ] as const
  const reviewFlowPills = ['오늘 거래 되짚기', 'AI 의견 비교', '패턴 확인', '노트 정리']
  const reviewSnapshotCards = [
    {
      key: 'pnl',
      label: '실현손익',
      value: `${tradePnl >= 0 ? '+' : ''}${tradePnl.toLocaleString()}`,
      tone: tradePnl >= 0 ? 'text-emerald-300' : 'text-rose-300',
    },
    {
      key: 'trades',
      label: '실거래',
      value: `${tradeCount.toLocaleString()}건`,
      tone: 'text-neutral-100',
    },
    {
      key: 'ai',
      label: 'AI 요약',
      value: `${filteredAiNotes.length}건`,
      tone: 'text-neutral-100',
    },
    {
      key: 'alerts',
      label: '긴급 대응',
      value: `${alertActions.length}건`,
      tone: alertActions.length > 0 ? 'text-amber-200' : 'text-neutral-100',
    },
  ] as const
  const reviewLeadText = tradeCount === 0
    ? '오늘 거래가 아직 없습니다. 먼저 guided review에서 흐름을 시작하거나 차트에서 기록을 남겨보세요.'
    : tradePnl >= 0
      ? '이번 기간은 수익 구간입니다. 무엇이 잘 작동했는지 복기 흐름에서 이유와 패턴까지 남겨두세요.'
      : '이번 기간은 손실 구간입니다. 거래 이유와 감정, 대응 기록을 차례로 정리해 패턴을 분리해 보세요.'

  const aiNotesSection = (
    <div className="kifu-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kifu-eyebrow">AI Review</p>
          <h3 className="mt-2 text-2xl font-semibold text-neutral-100">AI 의견 비교</h3>
        </div>
        <span className="text-sm text-zinc-300">최근 요청 기준</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={aiSymbolFilter}
          onChange={(event) => setAiSymbolFilter(event.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-neutral-300 focus:outline-none focus:border-white/20"
        >
          {aiSymbolOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'ALL' ? '심볼 전체' : option}
            </option>
          ))}
        </select>
        <select
          value={aiTimeframeFilter}
          onChange={(event) => setAiTimeframeFilter(event.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-neutral-300 focus:outline-none focus:border-white/20"
        >
          {aiTimeframeOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'ALL' ? '타임프레임 전체' : option}
            </option>
          ))}
        </select>
        <span className="text-sm text-zinc-300 ml-1">{filteredAiNotes.length} / {aiNotes.length}</span>
        <button
          type="button"
          onClick={copyAiFilterLink}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1 text-sm text-neutral-300 hover:bg-white/[0.12] hover:text-white"
        >
          {copiedShare ? '링크 공유 완료' : 'AI 요약 필터 링크 복사'}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-zinc-400">
        현재 공유 범위: {aiSymbolFilter === 'ALL' ? '심볼 전체' : aiSymbolFilter} / {aiTimeframeFilter === 'ALL' ? '타임프레임 전체' : aiTimeframeFilter}
      </p>
      {aiNotesError && (
        <p className="mt-3 text-sm text-rose-300">{aiNotesError}</p>
      )}
      {aiNotesLoading && (
        <p className="mt-3 text-sm text-zinc-300">불러오는 중...</p>
      )}
      {!aiNotesLoading && filteredAiNotes.length === 0 && !aiNotesError && (
        <p className="mt-3 text-sm text-zinc-300">아직 AI 복기 요약이 없습니다.</p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {pagedAiNotes.map((note) => {
          const sections = parseAiSections(note.content || '')
          const header = sections.length > 0 ? sections[0].title : note.title
          return (
            <div key={note.id} className="rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/10">
              <div className="flex items-center justify-between text-sm text-neutral-300">
                <span className="font-medium text-neutral-300">{header || 'AI 요약'}</span>
                <span>{new Date(note.created_at).toLocaleString('ko-KR')}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-sm">
                {note.source_label && (
                  <span className={SOURCE_BADGE_CLASS}>
                    {note.source_label}
                  </span>
                )}
                {note.venue_name && (
                  <span className={VENUE_BADGE_CLASS}>
                    {normalizeVenueLabel(note.venue_name)}
                  </span>
                )}
                {note.symbol && (
                  <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-neutral-300">{note.symbol}</span>
                )}
                {note.timeframe && (
                  <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-neutral-300">{note.timeframe}</span>
                )}
                {note.symbol && buildAiChartUrl(note) && (
                  <Link
                    href={buildAiChartUrl(note) || ''}
                    className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                  >
                    해당 캔들로 이동
                  </Link>
                )}
                {note.bubble_id && (
                  <Link
                    href={`/bubbles?bubble_id=${note.bubble_id}`}
                    className="rounded-full border border-cyan-500/30 px-2 py-0.5 text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                  >
                    관련 버블
                  </Link>
                )}
              </div>
              <div className="mt-3 space-y-2">
                {(sections.length > 0 ? sections : [{ title: '요약', body: note.content, tone: 'summary' as const }]).map((section) => (
                  <div
                    key={`${note.id}-${section.title}`}
                    className={`rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${toneClass(section.tone)}`}
                  >
                    <p className="text-sm font-bold uppercase tracking-wider opacity-90 mb-1">{section.title}</p>
                    <p className="text-current opacity-90">{section.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {aiNotesTotalPages > 1 && renderAiPager}
    </div>
  )

  const summarySection = (
    <div className="space-y-6">
      <div className="kifu-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="kifu-eyebrow">Trade Summary</p>
            <h3 className="mt-2 text-2xl font-semibold text-neutral-100">거래 흐름 요약</h3>
          </div>
          <div className={`text-sm font-semibold ${tradePnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            실현손익 {tradePnl >= 0 ? '+' : ''}{tradePnl.toLocaleString()}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(tradeSummary?.by_exchange || []).map((item, index) => {
            const exchangeName = item.exchange || 'unknown'
            const tradeCount = Number(item.total_trades || item.trade_count || 0)
            const chipKey = `${exchangeName}-${tradeCount}-${index}`
            return (
              <span key={chipKey} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-neutral-200">
                {exchangeName} · {tradeCount.toLocaleString()}건
              </span>
            )
          })}
          {(!tradeSummary || tradeSummary.by_exchange.length === 0) && (
            <span className="text-sm text-zinc-300">표시할 거래 요약이 없습니다.</span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors">
            <p className="text-sm uppercase tracking-wider text-zinc-300">실거래 건수</p>
            <p className="mt-1 text-base font-semibold text-sky-300">{tradeCount.toLocaleString()}건</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors">
            <p className="text-sm uppercase tracking-wider text-zinc-300">TOP 심볼</p>
            <p className="mt-1 text-base font-semibold text-emerald-300">
              {topTradeSymbol ? `${topTradeSymbol.symbol} (${(topTradeSymbol.total_trades || topTradeSymbol.trade_count || 0).toLocaleString()})` : '-'}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors">
            <p className="text-sm uppercase tracking-wider text-zinc-300">TOP 거래소</p>
            <p className="mt-1 text-base font-semibold text-amber-300">
              {topTradeExchange ? `${topTradeExchange.exchange} (${(topTradeExchange.total_trades || topTradeExchange.trade_count || 0).toLocaleString()})` : '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="kifu-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="kifu-eyebrow">Action Log</p>
            <h3 className="mt-2 text-2xl font-semibold text-neutral-100">긴급 대응 기록</h3>
          </div>
          <Link href="/alert" className="text-sm text-neutral-300 hover:text-neutral-200 transition-colors">
            긴급 모드로 이동
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {alertActions.length === 0 && (
            <p className="text-sm text-zinc-300">아직 긴급 대응 기록이 없습니다.</p>
          )}
          {alertActions.slice(0, 6).map((entry) => (
            <div key={entry.id} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2.5">
              <div className="flex items-center justify-between text-sm text-neutral-300">
                <span className="font-medium text-neutral-300">{entry.symbol} · {entry.action}</span>
                <span>{new Date(entry.created_at).toLocaleString('ko-KR')}</span>
              </div>
              {entry.note && (
                <p className="mt-1 text-sm text-neutral-300">{entry.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const analyticsSection = (
    <div className="space-y-4">
      <div className="kifu-panel p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setAnalyticsTab('calendar')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${analyticsTab === 'calendar'
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-300 hover:text-white'
            }`}
          >
            성과 캘린더
          </button>
          <button
            type="button"
            onClick={() => setAnalyticsTab('metrics')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${analyticsTab === 'metrics'
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-300 hover:text-white'
            }`}
          >
            지표
          </button>
          <button
            type="button"
            onClick={() => setAnalyticsTab('trend')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${analyticsTab === 'trend'
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-300 hover:text-white'
            }`}
          >
            추세 분석
          </button>
        </div>

        {analyticsTab === 'calendar' && (
          <div>
            <h3 className="text-sm font-medium text-neutral-200">성과 캘린더</h3>
            <div className="mt-3">
              <CalendarView calendar={calendar} isLoading={isLoading} />
            </div>
          </div>
        )}

        {analyticsTab === 'metrics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AccuracyChart accuracy={accuracy} isLoading={isLoadingAccuracy} />
            <TagPerformance byTag={stats?.by_tag} isLoading={isLoading} />
            <SymbolPerformance bySymbol={symbolStatsForView} isLoading={isLoading} />
          </div>
        )}

        {analyticsTab === 'trend' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-sm font-medium text-zinc-300">구간 성과</h3>
              <div className="flex p-1 space-x-1 bg-black/20 rounded-lg border border-white/[0.05]">
                {(['1h', '4h', '1d'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${selectedPeriod === period
                      ? 'bg-zinc-700 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                  >
                    {period.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5">
              {stats?.by_period && Object.keys(stats.by_period).length > 0 ? (
                (() => {
                  const data = stats.by_period[selectedPeriod]
                  if (!data) return <p className="text-sm text-zinc-500">해당 주기의 데이터가 없습니다.</p>
                  const pnl = parseFloat(data.avg_pnl)
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <p className="text-sm text-zinc-500 mb-1">평균 PnL</p>
                        <p className={`text-lg font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <p className="text-sm text-zinc-500 mb-1">샘플 수</p>
                        <p className="text-lg font-semibold text-zinc-200">{data.count}개</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] md:col-span-2">
                        <p className="text-sm text-zinc-500 mb-1">승률</p>
                        <p className={`text-lg font-semibold ${data.win_rate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {data.win_rate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <p className="text-sm text-zinc-500">집계할 데이터가 부족합니다.</p>
              )}
            </div>
            <div className="mt-6">
              <PerformanceTrendChart period={filters.period} />
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const journalSection = (
    <div className="space-y-6 mt-6">
      <div className="kifu-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="kifu-eyebrow">Journal Workspace</p>
            <h3 className="mt-2 text-2xl font-semibold text-neutral-100">노트와 내보내기 정리</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              거래 이유, 감정, 다음에 반복할 것과 피할 것을 한 화면에서 정리합니다.
              노트는 복기 흔적을 남기는 공간이고, 내보내기는 외부 분석용 정리 단계입니다.
            </p>
          </div>

          <div className="kifu-panel-muted max-w-md p-4">
            <p className="text-sm font-semibold text-neutral-100">
              {guestMode ? '게스트 둘러보기 안내' : '이 탭에서 먼저 하면 좋은 것'}
            </p>
            <div className="mt-3 space-y-2 text-sm text-neutral-400">
              {guestMode ? (
                <>
                  <p>샘플 노트와 내보내기 화면은 둘러볼 수 있지만, 실제 저장과 다운로드는 회원 전용입니다.</p>
                  <p>계정을 만들면 복기 노트 저장, 태그 정리, CSV 내보내기를 바로 이어서 사용할 수 있습니다.</p>
                </>
              ) : (
                <>
                  <p>거래 이유 한 줄, 감정 한 줄, 다음에 유지할 행동 한 줄부터 남기면 충분합니다.</p>
                  <p>이번 기간 복기가 끝나면 통계나 AI 의견을 CSV로 내보내 외부에서 다시 볼 수 있습니다.</p>
                </>
              )}
            </div>
            {guestMode && (
              <div className="mt-4">
                <Link href="/register?next=%2Freview" className="kifu-btn-primary">
                  회원가입 후 저장 기능 열기
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NoteList />
        <ExportButtons period={filters.period} outcomePeriod={filters.outcomePeriod} />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen p-4 text-sm text-neutral-100 md:p-8">
      <div className="flex w-full flex-col gap-6">
        <section className="kifu-panel p-5 md:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="kifu-eyebrow">Review Center</p>
              <h1 className="kifu-section-title">거래 복기 센터</h1>
              <p className="kifu-section-copy">
                오늘 거래를 하나씩 되짚고, AI 의견과 실제 결과를 같은 흐름에서 정리합니다.
                복기 자체가 중심이고, 지표와 리포트는 그 다음 단계로 배치했습니다.
              </p>
              <div className="flex flex-wrap gap-2">
                {reviewFlowPills.map((pill) => (
                  <span key={pill} className="kifu-chip">
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <PeriodFilter filters={filters} onFilterChange={setFilters} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setReviewTab('ai')} className="kifu-btn-secondary">
                  AI 의견 보기
                </button>
                <button type="button" onClick={() => setReviewTab('journal')} className="kifu-btn-secondary">
                  노트 정리
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
            <div>
              <HomeGuidedReviewCard />
            </div>

            <aside className="kifu-panel-muted p-5">
              <p className="kifu-eyebrow">Current Snapshot</p>
              <h2 className="mt-2 text-2xl font-semibold text-neutral-100">이번 기간 한눈에</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{reviewLeadText}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {reviewSnapshotCards.map((card) => (
                  <div key={card.key} className="kifu-stat-card">
                    <p className="kifu-eyebrow">{card.label}</p>
                    <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-neutral-100">오늘의 관찰 포인트</p>
                <div className="mt-3 space-y-2 text-sm text-neutral-400">
                  <p>TOP 심볼: {topTradeSymbol ? `${topTradeSymbol.symbol} (${(topTradeSymbol.total_trades || topTradeSymbol.trade_count || 0).toLocaleString()}건)` : '아직 없음'}</p>
                  <p>TOP 거래소: {topTradeExchange ? `${topTradeExchange.exchange} (${(topTradeExchange.total_trades || topTradeExchange.trade_count || 0).toLocaleString()}건)` : '아직 없음'}</p>
                  <p>AI 요약 링크: 현재 {filteredAiNotes.length}건이 필터에 잡혀 있습니다.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="kifu-panel p-3">
          <div className="grid gap-3 lg:grid-cols-4">
            {reviewTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setReviewTab(tab.key)}
                className={`kifu-tab ${reviewTab === tab.key ? 'kifu-tab-active' : ''}`}
              >
                <span className="block text-base font-semibold">{tab.label}</span>
                <span className="mt-1 block text-xs font-medium text-zinc-400">{tab.hint}</span>
              </button>
            ))}
          </div>
        </section>

        {reviewTab === 'overview' && (
          <div className="space-y-6">
            <StatsOverview stats={stats} isLoading={isLoading} />
            {summarySection}
          </div>
        )}
        {reviewTab === 'ai' && aiNotesSection}
        {reviewTab === 'analytics' && analyticsSection}
        {reviewTab === 'journal' && journalSection}
      </div >
    </div >
  )
}
