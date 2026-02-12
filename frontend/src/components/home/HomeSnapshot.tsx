'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '../../lib/api'
import { onboardingProfileStoragePrefix, readOnboardingProfile } from '../../lib/onboardingProfile'
import { normalizeTradeSummary } from '../../lib/tradeAdapters'
import { normalizeExchangeFilter } from '../../lib/exchangeFilters'
import { useGuidedReviewStore } from '../../stores/guidedReviewStore'
import { useReviewStore } from '../../stores/reviewStore'
import { parseAiSections } from '../../lib/aiResponseFormat'
import type { AccuracyResponse, NotesListResponse, ReviewNote } from '../../types/review'
import type { TradeSummaryResponse } from '../../types/trade'
import { HomeGuidedReviewCard } from './HomeGuidedReviewCard'
import { HomeSafetyCheckCard } from './HomeSafetyCheckCard'
import { PositionManager } from '../positions/PositionManager'

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

type BubbleListResponse = {
  page: number
  limit: number
  total: number
  items: BubbleItem[]
}

type AINoteCard = ReviewNote & {
  symbol?: string
  timeframe?: string
  candle_time?: string
}

const periodLabels: Record<string, string> = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  all: '전체 기간',
}

const formatNumber = (value?: number | string) => {
  if (value === undefined || value === null) return '-'
  if (typeof value === 'number') return value.toLocaleString()
  return value
}

const formatPercent = (value?: number | string) => {
  if (value === undefined || value === null) return '-'
  if (typeof value === 'number') return `${value.toFixed(1)}%`
  return value
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const parsePercent = (value?: string | number) => {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') return value
  const normalized = value.replace('%', '').trim()
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? 0 : parsed
}

const toneByNumber = (value: number) => {
  if (value > 0) return 'text-lime-300'
  if (value < 0) return 'text-rose-300'
  return 'text-neutral-200'
}



const getCurrency = (summary: TradeSummaryResponse | null) => {
  const exchanges = (summary?.by_exchange || [])
    .map((item) => (item?.exchange || '').toLowerCase())
    .filter(Boolean)
  if (exchanges.length === 0) return { code: 'USDT', symbol: '$' }
  const hasUpbit = exchanges.includes('upbit')
  const hasBinance = exchanges.some((exchange) => exchange.includes('binance'))
  if (hasUpbit && !hasBinance) return { code: 'KRW', symbol: '₩' }
  return { code: 'USDT', symbol: '$' }
}

const currencyPreset = (mode: 'usdt' | 'krw') =>
  mode === 'krw' ? { code: 'KRW', symbol: '₩' } : { code: 'USDT', symbol: '$' }

const formatCurrency = (value: number, currencySymbol: string) => {
  const formatted = Math.abs(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })
  const sign = value < 0 ? '-' : ''
  return `${sign}${currencySymbol}${formatted}`
}

const getTopProvider = (accuracy: AccuracyResponse | null) => {
  if (!accuracy || accuracy.ranking.length === 0) return null
  return accuracy.ranking[0]
}

const SummaryCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-white/5 bg-neutral-900/50 backdrop-blur-md p-6">
    <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-bold">{title}</p>
    <div className="mt-5">{children}</div>
  </div>
)

const StatusGauge = ({ mode }: { mode: 'good' | 'ok' | 'bad' | 'idle' }) => {
  const segments = [
    { key: 'bad', active: mode === 'bad' },
    { key: 'ok', active: mode === 'ok' },
    { key: 'good', active: mode === 'good' },
  ]
  const glow =
    mode === 'good'
      ? 'bg-lime-400/90 shadow-lg shadow-lime-500/20'
      : mode === 'bad'
        ? 'bg-rose-400/90 shadow-lg shadow-rose-500/20'
        : mode === 'ok'
          ? 'bg-emerald-300/90 shadow-lg shadow-emerald-500/20'
          : 'bg-neutral-700'
  return (
    <div className="flex items-center gap-1.5">
      {segments.map((segment) => (
        <span
          key={segment.key}
          className={`h-2 w-8 rounded-full border border-neutral-800/80 ${segment.active ? glow : 'bg-neutral-800/80'
            }`}
        />
      ))}
      <span className="ml-2 text-[10px] uppercase tracking-[0.3em] text-neutral-400">State</span>
    </div>
  )
}

export function HomeSnapshot() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const guidedReview = useGuidedReviewStore((state) => state.review)
  const guidedLoading = useGuidedReviewStore((state) => state.isLoading)
  const fetchGuidedToday = useGuidedReviewStore((state) => state.fetchToday)
  const fetchGuidedStreak = useGuidedReviewStore((state) => state.fetchStreak)
  const {
    stats,
    accuracy,
    isLoading,
    isLoadingAccuracy,
    filters,
    setFilters,
    fetchStats,
    fetchAccuracy,
  } = useReviewStore()
  const [tradeSummary, setTradeSummary] = useState<TradeSummaryResponse | null>(null)
  const [recentBubbles, setRecentBubbles] = useState<BubbleItem[]>([])
  const [bubblesLoading, setBubblesLoading] = useState(false)
  const [bubblesError, setBubblesError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [visualMode, setVisualMode] = useState<'auto' | 'good' | 'ok' | 'bad' | 'idle'>('auto')
  const [animatedPnl, setAnimatedPnl] = useState(0)
  const prevPnlRef = useRef(0)
  const [currencyMode, setCurrencyMode] = useState<'auto' | 'usdt' | 'krw'>('auto')
  const [onboardingProfile, setOnboardingProfile] = useState<ReturnType<typeof readOnboardingProfile>>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [aiNotes, setAiNotes] = useState<AINoteCard[]>([])
  const [aiNotesLoading, setAiNotesLoading] = useState(false)
  const [aiSymbolFilter, setAiSymbolFilter] = useState('ALL')
  const [aiTimeframeFilter, setAiTimeframeFilter] = useState('ALL')
  const [aiFilterHydrated, setAiFilterHydrated] = useState(false)

  useEffect(() => {
    fetchGuidedToday()
    fetchGuidedStreak()
  }, [fetchGuidedToday, fetchGuidedStreak])

  useEffect(() => {
    let isActive = true
    const load = async () => {
      await Promise.all([fetchStats(), fetchAccuracy()])
      if (isActive) {
        setLastUpdated(new Date())
      }
    }
    load()
    return () => {
      isActive = false
    }
  }, [fetchStats, fetchAccuracy, filters.period, filters.outcomePeriod])

  useEffect(() => {
    let isActive = true
    const loadBubbles = async () => {
      setBubblesLoading(true)
      setBubblesError(null)
      try {
        const response = await api.get<BubbleListResponse>('/v1/bubbles?page=1&limit=5&sort=desc')
        if (isActive) {
          setRecentBubbles(response.data.items)
        }
      } catch (error) {
        if (isActive) {
          setBubblesError('최근 버블을 불러오지 못했습니다.')
        }
      } finally {
        if (isActive) {
          setBubblesLoading(false)
        }
      }
    }
    loadBubbles()
    return () => {
      isActive = false
    }
  }, [])

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
        const exchange = normalizeExchangeFilter(filters.venue)
        if (exchange) params.set('exchange', exchange)
        if (filters.symbol) params.set('symbol', filters.symbol)
        const response = await api.get(`/v1/trades/summary?${params.toString()}`)
        let summary = normalizeTradeSummary(response.data)
        const shouldRetry =
          summary.totals.total_trades === 0 &&
          (params.has('exchange') || params.has('symbol') || params.has('from'))
        if (shouldRetry) {
          const fallbackParams = new URLSearchParams()
          if (filters.period === '7d') {
            fallbackParams.set('from', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          } else if (filters.period === '30d') {
            fallbackParams.set('from', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          }
          const fallback = await api.get(`/v1/trades/summary?${fallbackParams.toString()}`)
          summary = normalizeTradeSummary(fallback.data)
        }
        if (isActive) setTradeSummary(summary)
      } catch {
        try {
          const fallback = await api.get('/v1/trades/summary')
          if (isActive) setTradeSummary(normalizeTradeSummary(fallback.data))
        } catch {
          if (isActive) setTradeSummary(null)
        }
      }
    }
    loadTradeSummary()
    return () => {
      isActive = false
    }
  }, [filters.period, filters.venue, filters.symbol, refreshTick])

  useEffect(() => {
    let isActive = true
    const loadAiNotes = async () => {
      setAiNotesLoading(true)
      try {
        const [notesResponse, bubblesResponse] = await Promise.all([
          api.get<NotesListResponse>('/v1/notes?page=1&limit=80'),
          api.get<BubbleListResponse>('/v1/bubbles?page=1&limit=200&sort=desc'),
        ])
        const notes = notesResponse.data?.notes || []
        const bubbles = bubblesResponse.data?.items || []
        const bubbleMap = new Map(bubbles.map((bubble) => [bubble.id, bubble]))
        const aiOnly = notes.filter((note) => {
          const title = note.title || ''
          const hasTag = (note.tags || []).some((tag) => tag.toLowerCase() === 'ai')
          return hasTag || title.includes('AI')
        })
        const enriched = aiOnly.map((note) => {
          const bubble = note.bubble_id ? bubbleMap.get(note.bubble_id) : undefined
          return {
            ...note,
            symbol: bubble?.symbol,
            timeframe: bubble?.timeframe,
            candle_time: bubble?.candle_time,
          }
        })
        if (isActive) setAiNotes(enriched.slice(0, 20))
      } catch {
        if (isActive) setAiNotes([])
      } finally {
        if (isActive) setAiNotesLoading(false)
      }
    }
    loadAiNotes()
    return () => {
      isActive = false
    }
  }, [refreshTick])

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTick((prev) => prev + 1)
      fetchStats()
      fetchAccuracy()
    }
    window.addEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    return () => {
      window.removeEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    }
  }, [fetchStats, fetchAccuracy])

  useEffect(() => {
    const saved = localStorage.getItem('kifu-home-currency')
    if (saved === 'usdt' || saved === 'krw' || saved === 'auto') {
      setCurrencyMode(saved)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('kifu-home-currency', currencyMode)
  }, [currencyMode])

  useEffect(() => {
    setOnboardingProfile(readOnboardingProfile())
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(onboardingProfileStoragePrefix)) {
        setOnboardingProfile(readOnboardingProfile())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const snapshotPeriod = periodLabels[filters.period] ?? '최근'
  const summary = stats?.overall
  const topProvider = useMemo(() => getTopProvider(accuracy), [accuracy])
  const accuracyLabel = topProvider ? `${topProvider.provider} ${formatPercent(topProvider.accuracy)}` : '-'
  const totalOpinions = accuracy?.total_opinions ?? 0
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
    router.replace(query ? `/home?${query}` : '/home', { scroll: false })
  }, [aiFilterHydrated, aiSymbolFilter, aiTimeframeFilter, searchParams, router])
  const tradeTotals = tradeSummary?.totals
  const bySide = useMemo(() => {
    const source = tradeSummary?.by_side || []
    const findCount = (sideKey: string) => {
      const found = source.find((item) => item.side?.toUpperCase() === sideKey)
      return Number(found?.total_trades || found?.trade_count || 0)
    }
    return {
      buyCount: findCount('BUY'),
      sellCount: findCount('SELL'),
    }
  }, [tradeSummary])
  const topExchange = useMemo(() => {
    const rows = tradeSummary?.by_exchange || []
    if (rows.length === 0) return null
    return [...rows].sort((a, b) => Number(b.total_trades || b.trade_count || 0) - Number(a.total_trades || a.trade_count || 0))[0]
  }, [tradeSummary])
  const topSymbol = useMemo(() => {
    const rows = tradeSummary?.by_symbol || []
    if (rows.length === 0) return null
    return [...rows].sort((a, b) => Number(b.total_trades || b.trade_count || 0) - Number(a.total_trades || a.trade_count || 0))[0]
  }, [tradeSummary])
  const currency = currencyMode === 'auto' ? getCurrency(tradeSummary) : currencyPreset(currencyMode)
  const totalPnlNumeric = Number(tradeTotals?.realized_pnl_total || 0)
  const pnlTone = toneByNumber(totalPnlNumeric)
  const pnlGlow = totalPnlNumeric >= 0 ? 'shadow-lg shadow-lime-500/20' : 'shadow-lg shadow-rose-500/20'
  const bubbleCount = stats?.total_bubbles ?? 0
  const tradesCount = tradeTotals?.total_trades ?? 0
  const isNoAction = bubbleCount === 0 && tradesCount === 0
  const resolvedMode = visualMode === 'auto'
    ? isNoAction
      ? 'idle'
      : totalPnlNumeric >= 1
        ? 'good'
        : totalPnlNumeric <= -1
          ? 'bad'
          : 'ok'
    : visualMode
  const stateTone =
    resolvedMode === 'good'
      ? 'bg-neutral-950' // Removing gradients for cleaner look
      : resolvedMode === 'bad'
        ? 'bg-neutral-950'
        : resolvedMode === 'ok'
          ? 'bg-neutral-950'
          : 'bg-neutral-950'
  const heroText =
    resolvedMode === 'good'
      ? '오늘의 리듬이 선명합니다. 이 느낌을 기록하세요.'
      : resolvedMode === 'bad'
        ? '흔들림이 남아 있습니다. 다시 정리할 시간입니다.'
        : resolvedMode === 'ok'
          ? '큰 흔들림은 없었습니다. 작은 신호만 남겨두세요.'
          : '아직 기록이 없습니다. 첫 문장을 남겨주세요.'
  const heroAccent =
    resolvedMode === 'good'
      ? 'text-lime-300'
      : resolvedMode === 'bad'
        ? 'text-rose-300'
        : resolvedMode === 'ok'
          ? 'text-emerald-200'
          : 'text-indigo-200'
  const routineItems = [
    {
      key: 'market',
      title: '시장 기운 읽기',
      done: Boolean(lastUpdated),
      href: '/alert',
      hint: '긴급 브리핑 30초',
    },
    {
      key: 'position',
      title: '내 자리 확인',
      done: tradesCount > 0,
      href: '/portfolio',
      hint: tradesCount > 0 ? `${tradesCount.toLocaleString()}건 체결 감지` : '거래 기록 비어있음',
    },
    {
      key: 'journal',
      title: '한 줄 남기기',
      done: bubbleCount > 0,
      href: '/chart?onboarding=1',
      hint: bubbleCount > 0 ? `${bubbleCount.toLocaleString()}개 기록` : '오늘 판단 한 줄',
    },
  ] as const

  useEffect(() => {
    const from = prevPnlRef.current
    const to = totalPnlNumeric
    prevPnlRef.current = to
    const duration = 900
    let frame: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      setAnimatedPnl(from + (to - from) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [totalPnlNumeric])

  const shouldForceGuidedModal =
    Boolean(guidedReview) && !guidedLoading && guidedReview?.status !== 'completed'

  useEffect(() => {
    if (!shouldForceGuidedModal) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [shouldForceGuidedModal])

  return (
    <div className={`min-h-screen text-neutral-100 p-4 md:p-8 ${stateTone} transition-colors duration-700 ease-out`}>
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Library Ritual</p>
            <h1 className="text-3xl font-semibold">서재 모드</h1>
            <p className="text-sm text-neutral-400">{snapshotPeriod} 장면을 조용히 다시 읽습니다</p>
            <p className="text-xs text-neutral-500">기간 기준: 캔들 시간</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-full bg-neutral-900/70 p-1">
              {(['7d', '30d', 'all'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setFilters({ period })}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${filters.period === period
                    ? 'bg-neutral-100 text-neutral-950'
                    : 'text-neutral-400 hover:text-neutral-100'
                    }`}
                >
                  {periodLabels[period]}
                </button>
              ))}
            </div>
            <div className="flex rounded-full bg-neutral-900/70 p-1">
              {([
                { key: 'auto', label: '자동' },
                { key: 'usdt', label: 'USDT' },
                { key: 'krw', label: 'KRW' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCurrencyMode(item.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${currencyMode === item.key
                    ? 'bg-neutral-100 text-neutral-950'
                    : 'text-neutral-400 hover:text-neutral-100'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-neutral-500">
              업데이트: {lastUpdated ? lastUpdated.toLocaleString('ko-KR') : '불러오는 중...'}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-white/5 bg-neutral-900/50 backdrop-blur-md p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-bold">Quiet Routine</p>
            <h2 className="mt-2 text-xl font-bold text-white/90">오늘의 3가지 질문</h2>
            <div className="mt-5 space-y-2">
              {routineItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="group flex items-center justify-between rounded-xl border border-white/5 bg-neutral-800/30 px-5 py-3.5 transition hover:bg-white/5 hover:border-white/10"
                >
                  <div>
                    <p className="text-sm font-semibold text-neutral-200 group-hover:text-white transition-colors">{item.title}</p>
                    <p className="text-xs text-neutral-500">{item.hint}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${item.done
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      }`}
                  >
                    {item.done ? '완료' : '대기'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-neutral-900/50 backdrop-blur-md p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-bold">Closing Note</p>
            <h2 className="mt-2 text-xl font-bold text-white/90">오늘의 마감</h2>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
              긴급 대응과 판단 흐름을 한 장으로 정리합니다.
            </p>
            <div className="mt-5 space-y-2">
              <Link href="/alert" className="block rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-neutral-200 transition hover:bg-white/10 hover:text-white text-center">
                긴급 브리핑 다시보기
              </Link>
              <Link href="/review" className="block rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-neutral-200 transition hover:bg-white/10 hover:text-white text-center">
                복기 노트 남기기
              </Link>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-3 text-xs text-neutral-300">
          <span className="text-neutral-500">무드 미리보기:</span>
          {([
            { key: 'auto', label: '자동' },
            { key: 'good', label: '좋음' },
            { key: 'ok', label: '그럭저럭' },
            { key: 'bad', label: '안좋음' },
            { key: 'idle', label: '무행동' },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setVisualMode(item.key)}
              className={`rounded-full border px-3 py-1 transition text-[11px] font-medium ${visualMode === item.key
                ? 'border-white bg-white text-black'
                : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200'
                }`}
            >
              {item.label}
            </button>
          ))}
        </section>

        <section className="rounded-3xl border border-neutral-800/60 bg-gradient-to-br from-neutral-950 via-neutral-900/80 to-lime-900/30 p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Focus Memory</p>
              <p className={`text-sm ${heroAccent}`}>
                {heroText}
              </p>
              <p className="text-sm text-neutral-300">결과와 AI 의견을 한 장에 모아둡니다.</p>
              <StatusGauge mode={resolvedMode} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-neutral-700/80 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300">
                  최근 버블 {formatNumber(stats?.total_bubbles ?? 0)}개
                </span>
                <span className="rounded-full border border-neutral-700/80 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300">
                  AI 의견 {formatNumber(totalOpinions)}개
                </span>
                {topProvider && (
                  <span className="rounded-full border border-lime-400/40 bg-lime-500/10 px-3 py-1 text-xs text-lime-200">
                    최고 정확도 {accuracyLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/80 p-5 text-center lg:min-w-[220px]">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">핵심 PnL</p>
              <div className="relative mt-3 rounded-xl border border-neutral-800/80 bg-neutral-950/80 px-4 py-3">
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.06)_50%,transparent_100%)] opacity-50" />
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-[repeating-linear-gradient(transparent,transparent_6px,rgba(255,255,255,0.04)_7px)] opacity-40" />
                <p className={`relative text-4xl font-semibold tracking-widest ${pnlTone} ${pnlGlow} font-mono`}>
                  {formatCurrency(animatedPnl, currency.symbol)}
                </p>
              </div>
              <p className="mt-2 text-xs text-neutral-500">오늘 흐름을 한 눈에</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">실거래</p>
            <p className="mt-2 text-2xl font-semibold text-sky-300">{tradesCount.toLocaleString()}건</p>
          </div>
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">매수/매도</p>
            <p className="mt-2 text-sm font-semibold text-neutral-100">
              BUY {bySide.buyCount.toLocaleString()} · SELL {bySide.sellCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">주요 거래소</p>
            <p className="mt-2 text-sm font-semibold text-amber-200">
              {topExchange ? `${topExchange.exchange} · ${(topExchange.total_trades || topExchange.trade_count || 0).toLocaleString()}건` : '-'}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">주요 심볼</p>
            <p className="mt-2 text-sm font-semibold text-emerald-200">
              {topSymbol ? `${topSymbol.symbol} · ${(topSymbol.total_trades || topSymbol.trade_count || 0).toLocaleString()}건` : '-'}
            </p>
          </div>
        </section>

        {onboardingProfile && (tradesCount === 0 || bubbleCount === 0) && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Onboarding Profile</p>
                <p className="mt-1 text-lg font-semibold text-amber-100">{onboardingProfile.tendency}</p>
                <p className="mt-1 text-xs text-amber-100/70">
                  LONG {onboardingProfile.long_count} · SHORT {onboardingProfile.short_count} · HOLD {onboardingProfile.hold_count}
                </p>
                <p className="mt-2 text-xs text-amber-100/80">
                  오늘 루틴 1개: 최근 24시간 변동이 큰 캔들에 말풍선 1개만 남기기
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/chart?onboarding=1" className="rounded-lg border border-amber-200/40 px-3 py-2 text-xs font-semibold text-amber-100">
                  오늘 루틴 시작
                </Link>
                <Link href="/settings" className="rounded-lg border border-amber-200/40 px-3 py-2 text-xs font-semibold text-amber-100">
                  거래소 연결하기
                </Link>
              </div>
            </div>
          </section>
        )}

        <PositionManager />

        <HomeSafetyCheckCard />

        {guidedReview?.status === 'completed' && <HomeGuidedReviewCard autoLoad={false} />}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SummaryCard title="내 기록 요약">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-500">총 버블</p>
                <p className="text-2xl font-semibold">{formatNumber(stats?.total_bubbles ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">결과 있음</p>
                <p className="text-2xl font-semibold">{formatNumber(stats?.bubbles_with_outcome ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">승률</p>
                <p className={`text-xl font-semibold ${summary && summary.win_rate >= 50 ? 'text-lime-300' : 'text-rose-300'}`}>
                  {formatPercent(summary?.win_rate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">평균 손익</p>
                <p className={`text-xl font-semibold ${toneByNumber(tradesCount ? totalPnlNumeric / tradesCount : 0)}`}>
                  {tradesCount
                    ? formatCurrency(totalPnlNumeric / tradesCount, currency.symbol)
                    : '-'}
                </p>
              </div>
            </div>
            {isLoading && <p className="mt-4 text-xs text-neutral-500">통계를 불러오는 중...</p>}
          </SummaryCard>

          <SummaryCard title="AI 의견 요약">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-neutral-500">요청된 의견</p>
                <p className="text-2xl font-semibold">{formatNumber(totalOpinions)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">현재 1위 정확도</p>
                <p className="text-xl font-semibold">{accuracyLabel}</p>
              </div>
              <p className="text-xs text-neutral-500">
                AI 의견을 더 요청할수록 내 판단 패턴과 비교가 선명해집니다.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={aiSymbolFilter}
                  onChange={(event) => setAiSymbolFilter(event.target.value)}
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-200"
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
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-200"
                >
                  {aiTimeframeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'ALL' ? '타임프레임 전체' : option}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-neutral-500">{filteredAiNotes.length}건</span>
              </div>
              {!aiNotesLoading && filteredAiNotes.slice(0, 2).map((note) => {
                const sections = parseAiSections(note.content || '')
                const body = sections[0]?.body || note.content
                return (
                  <div key={note.id} className="rounded-lg border border-neutral-800/70 bg-neutral-950/40 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-neutral-500">
                      {note.symbol && <span>{note.symbol}</span>}
                      {note.timeframe && <span>· {note.timeframe}</span>}
                      {note.symbol && note.candle_time && (
                        <>
                          <span>·</span>
                          <Link
                            href={`/chart/${note.symbol}?focus_ts=${encodeURIComponent(note.candle_time)}&focus_tf=${encodeURIComponent(note.timeframe || '1d')}`}
                            className="text-emerald-300 hover:text-emerald-200"
                          >
                            차트 이동
                          </Link>
                        </>
                      )}
                      {note.bubble_id && (
                        <>
                          <span>·</span>
                          <Link
                            href={`/bubbles?bubble_id=${note.bubble_id}`}
                            className="text-cyan-300 hover:text-cyan-200"
                          >
                            관련 버블
                          </Link>
                        </>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-300">{body}</p>
                  </div>
                )
              })}
            </div>
            {isLoadingAccuracy && <p className="mt-4 text-xs text-neutral-500">AI 통계를 불러오는 중...</p>}
            {aiNotesLoading && <p className="mt-2 text-xs text-neutral-500">AI 요약 불러오는 중...</p>}
          </SummaryCard>

          <SummaryCard title="다음 행동">
            <div className="space-y-3">
              <Link
                href="/chart"
                className="flex items-center justify-between rounded-xl border border-neutral-800/60 bg-neutral-900/70 px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-900/90"
              >
                버블 기록하기
                <span className="text-xs text-neutral-500">현재 판단 저장</span>
              </Link>
              <Link
                href="/review"
                className="flex items-center justify-between rounded-xl border border-neutral-800/60 bg-neutral-900/70 px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-900/90"
              >
                복기 대시보드
                <span className="text-xs text-neutral-500">성과 확인</span>
              </Link>
              <Link
                href="/bubbles"
                className="flex items-center justify-between rounded-xl border border-neutral-800/60 bg-neutral-900/70 px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-900/90"
              >
                버블 라이브러리
                <span className="text-xs text-neutral-500">패턴 비교</span>
              </Link>
            </div>
          </SummaryCard>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">최근 버블</p>
              <Link href="/bubbles" className="text-xs text-neutral-400 hover:text-neutral-200">
                전체 보기
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {bubblesLoading && <p className="text-xs text-neutral-500">불러오는 중...</p>}
              {bubblesError && <p className="text-xs text-red-300">{bubblesError}</p>}
              {!bubblesLoading && !bubblesError && recentBubbles.length === 0 && (
                <p className="text-xs text-neutral-500">아직 기록된 버블이 없습니다.</p>
              )}
              {!bubblesLoading &&
                !bubblesError &&
                recentBubbles.map((bubble) => (
                  <div
                    key={bubble.id}
                    className="flex flex-col gap-2 rounded-xl border border-neutral-800/40 bg-neutral-950/40 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">{bubble.symbol}</p>
                      <p className="text-xs text-neutral-500">
                        {bubble.timeframe} · {formatDateTime(bubble.candle_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{bubble.price}</p>
                      <p className="text-xs text-neutral-500">
                        {bubble.memo ? bubble.memo : bubble.tags?.slice(0, 2).join(', ') || '메모 없음'}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">오늘의 기억</p>
            <div className="mt-4 space-y-4 text-sm text-neutral-300">
              <div>
                <p className="text-xs text-neutral-500">순 손익</p>
                <p className={`text-2xl font-semibold ${toneByNumber(totalPnlNumeric)}`}>
                  {tradesCount ? formatCurrency(totalPnlNumeric, currency.symbol) : '-'}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>총 매수</span>
                  <span className="text-neutral-200">
                    {tradesCount ? `${bySide.buyCount.toLocaleString()}건` : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>총 매도</span>
                  <span className="text-neutral-200">
                    {tradesCount ? `${bySide.sellCount.toLocaleString()}건` : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>체결 수</span>
                  <span className="text-neutral-200">
                    {tradesCount ? `${tradesCount.toLocaleString()}건` : '-'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-neutral-500">
                스냅샷이 흐려지기 전에 한 줄이라도 복기 노트를 남겨보세요.
              </p>
              <Link
                href="/review"
                className="inline-flex items-center justify-center rounded-lg bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-950"
              >
                복기 노트 작성
              </Link>
            </div>
          </div>
        </section>
      </div>

      {shouldForceGuidedModal && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm">
          <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8">
            <div className="w-full rounded-2xl border border-sky-300/30 bg-neutral-950/95 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.7)] md:p-6">
              <p className="mb-3 text-xs uppercase tracking-[0.24em] text-sky-200">Daily Guided Review</p>
              <p className="mb-4 text-sm text-neutral-300">
                홈에서는 오늘 복기를 먼저 완료해야 다음 확인이 가능합니다.
              </p>
              <HomeGuidedReviewCard forceOpen autoLoad={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
