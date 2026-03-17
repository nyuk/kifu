'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '../../lib/api'
import { isGuestSession } from '../../lib/guestSession'
import { onboardingProfileStoragePrefix, readOnboardingProfile } from '../../lib/onboardingProfile'
import { normalizeTradeSummary } from '../../lib/tradeAdapters'
import { normalizeExchangeFilter } from '../../lib/exchangeFilters'
import { useGuidedReviewStore } from '../../stores/guidedReviewStore'
import { useReviewStore } from '../../stores/reviewStore'
import type { AccuracyResponse } from '../../types/review'
import type { TradeSummaryResponse } from '../../types/trade'
import { HomeGuidedReviewCard } from './HomeGuidedReviewCard'
import { HomeMonthlyReportCard } from './HomeMonthlyReportCard'
import { HomeSafetyCheckCard } from './HomeSafetyCheckCard'
import { HomeSimilarPatterns } from './HomeSimilarPatterns'
import { MonthlyTrendChart } from '../reports/MonthlyTrendChart'
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
  venue_name?: string
}

type BubbleListResponse = {
  page: number
  limit: number
  total: number
  items: BubbleItem[]
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
          className={`h-2 w-8 rounded-full border border-white/[0.06] ${segment.active ? glow : 'bg-white/[0.06]'
            }`}
        />
      ))}
    </div>
  )
}

export function HomeSnapshot() {
  const router = useRouter()
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
  const [animatedPnl, setAnimatedPnl] = useState(0)
  const prevPnlRef = useRef(0)
  const [currencyMode, setCurrencyMode] = useState<'auto' | 'usdt' | 'krw'>('auto')
  const [onboardingProfile, setOnboardingProfile] = useState<ReturnType<typeof readOnboardingProfile>>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [guestMode, setGuestMode] = useState(false)
  const [guestModeReady, setGuestModeReady] = useState(false)

  useEffect(() => {
    setGuestMode(isGuestSession())
    setGuestModeReady(true)
  }, [])

  useEffect(() => {
    if (!guestModeReady || guestMode) return
    fetchGuidedToday()
    fetchGuidedStreak()
  }, [guestMode, guestModeReady, fetchGuidedToday, fetchGuidedStreak])

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
      } catch {
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
  const accuracyLabel = topProvider ? `${topProvider.provider} ${formatPercent(topProvider.accuracy)}` : null
  const totalOpinions = accuracy?.total_opinions ?? 0
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

  const currency = currencyMode === 'auto' ? getCurrency(tradeSummary) : currencyPreset(currencyMode)
  const totalPnlNumeric = Number(tradeTotals?.realized_pnl_total || 0)
  const pnlTone = toneByNumber(totalPnlNumeric)
  const bubbleCount = stats?.total_bubbles ?? 0
  const tradesCount = tradeTotals?.total_trades ?? 0
  const isNoAction = bubbleCount === 0 && tradesCount === 0
  const resolvedMode = isNoAction
    ? 'idle'
    : totalPnlNumeric >= 1
      ? 'good'
      : totalPnlNumeric <= -1
        ? 'bad'
        : 'ok'
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
    !guestMode && Boolean(guidedReview) && !guidedLoading && guidedReview?.status !== 'completed'

  useEffect(() => {
    if (!shouldForceGuidedModal) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [shouldForceGuidedModal])

  return (
    <div className="min-h-screen text-zinc-100 p-4 md:p-8 transition-colors duration-700 ease-out">
      <div className="w-full flex flex-col gap-6">

        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600">Library Ritual</p>
            <h1 className="text-2xl font-semibold text-stone-200">서재 모드</h1>
            <p className="text-sm text-stone-500">{snapshotPeriod} 장면을 조용히 다시 읽습니다</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
              {(['7d', '30d', 'all'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setFilters({ period })}
                  className={`rounded-md px-3 py-1 text-[11px] font-medium transition-all ${filters.period === period
                    ? 'bg-stone-700/80 text-stone-100 shadow-sm'
                    : 'text-stone-500 hover:text-stone-300'
                    }`}
                >
                  {period.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
              {([
                { key: 'auto', label: '자동' },
                { key: 'usdt', label: '$' },
                { key: 'krw', label: '₩' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCurrencyMode(item.key)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all ${currencyMode === item.key
                    ? 'bg-stone-700/80 text-stone-100 shadow-sm'
                    : 'text-stone-500 hover:text-stone-300'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-stone-600">
              {lastUpdated ? lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '...'}
            </span>
          </div>
        </header>

        {/* Hero — single PnL focus */}
        <section className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-black/30 via-white/[0.02] to-transparent p-6 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3 lg:max-w-md">
              <StatusGauge mode={resolvedMode} />
              <p className={`text-sm leading-relaxed ${heroAccent}`}>{heroText}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-stone-400">
                  거래 {tradesCount.toLocaleString()}건
                </span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-stone-400">
                  BUY {bySide.buyCount} · SELL {bySide.sellCount}
                </span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-stone-400">
                  버블 {formatNumber(bubbleCount)}개
                </span>
                {accuracyLabel && (
                  <span className="rounded-full border border-lime-400/30 bg-lime-500/8 px-2.5 py-0.5 text-lime-300">
                    AI {accuracyLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="text-center lg:text-right">
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600 mb-2">PnL</p>
              <p className={`text-4xl font-semibold tracking-tight font-mono ${pnlTone}`}>
                {formatCurrency(animatedPnl, currency.symbol)}
              </p>
            </div>
          </div>
        </section>

        {/* Routine — 3 questions */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600 mb-4">Quiet Routine</p>
          <div className="grid gap-2 lg:grid-cols-3">
            {routineItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="group flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.05] hover:border-white/[0.08]"
              >
                <div>
                  <p className="text-sm font-medium text-stone-300 group-hover:text-stone-100 transition-colors">{item.title}</p>
                  <p className="text-[11px] text-stone-600">{item.hint}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.done
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                    }`}
                >
                  {item.done ? '완료' : '대기'}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Stats — compact 2-column */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600 mb-4">기록 요약</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-[11px] text-stone-600">총 버블</p>
                <p className="text-xl font-semibold text-stone-200">{formatNumber(stats?.total_bubbles ?? 0)}</p>
              </div>
              <div>
                <p className="text-[11px] text-stone-600">결과 있음</p>
                <p className="text-xl font-semibold text-stone-200">{formatNumber(stats?.bubbles_with_outcome ?? 0)}</p>
              </div>
              <div>
                <p className="text-[11px] text-stone-600">승률</p>
                <p className={`text-xl font-semibold ${summary && summary.win_rate >= 50 ? 'text-lime-300' : 'text-rose-300'}`}>
                  {formatPercent(summary?.win_rate)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-stone-600">평균 손익</p>
                <p className={`text-xl font-semibold ${toneByNumber(tradesCount ? totalPnlNumeric / tradesCount : 0)}`}>
                  {tradesCount ? formatCurrency(totalPnlNumeric / tradesCount, currency.symbol) : '-'}
                </p>
              </div>
            </div>
            {isLoading && <p className="mt-3 text-[11px] text-stone-600">통계를 불러오는 중...</p>}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600 mb-4">AI 의견</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-[11px] text-stone-600">수집된 의견</p>
                <p className="text-xl font-semibold text-stone-200">{formatNumber(totalOpinions)}</p>
              </div>
              <div>
                <p className="text-[11px] text-stone-600">최고 정확도</p>
                <p className="text-xl font-semibold text-stone-200">{accuracyLabel ?? '-'}</p>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-stone-600 leading-relaxed">
              AI 의견을 더 요청할수록 내 판단 패턴과 비교가 선명해집니다.
            </p>
            <Link
              href="/review"
              className="mt-3 inline-block rounded-lg border border-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-stone-400 transition hover:text-stone-200 hover:border-white/[0.1]"
            >
              복기 대시보드에서 상세 보기
            </Link>
            {isLoadingAccuracy && <p className="mt-3 text-[11px] text-stone-600">불러오는 중...</p>}
          </div>
        </section>

        {/* Monthly report + trend */}
        {!guestMode && <HomeMonthlyReportCard />}
        {!guestMode && <MonthlyTrendChart />}

        {/* Similar patterns alert */}
        {!guestMode && <HomeSimilarPatterns />}

        {/* Onboarding nudge */}
        {onboardingProfile && (tradesCount === 0 || bubbleCount === 0) && (
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400/60">Onboarding</p>
                <p className="mt-1 text-sm font-semibold text-amber-200">{onboardingProfile.tendency}</p>
                <p className="mt-1 text-[11px] text-amber-300/60">
                  LONG {onboardingProfile.long_count} · SHORT {onboardingProfile.short_count} · HOLD {onboardingProfile.hold_count}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/chart?onboarding=1" className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/10 transition">
                  루틴 시작
                </Link>
                <Link href="/settings" className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/10 transition">
                  거래소 연결
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* External components */}
        <PositionManager />
        <HomeSafetyCheckCard />
        {!guestMode && guidedReview?.status === 'completed' && <HomeGuidedReviewCard autoLoad={false} />}

        {/* Recent bubbles */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600">최근 버블</p>
            <Link href="/bubbles" className="text-[11px] text-stone-500 hover:text-stone-300 transition">
              전체 보기
            </Link>
          </div>
          {bubblesLoading && <p className="text-[11px] text-stone-600">불러오는 중...</p>}
          {bubblesError && <p className="text-[11px] text-rose-400">{bubblesError}</p>}
          {!bubblesLoading && !bubblesError && recentBubbles.length === 0 && (
            <p className="text-[11px] text-stone-600">아직 기록된 버블이 없습니다.</p>
          )}
          {!bubblesLoading && !bubblesError && recentBubbles.length > 0 && (
            <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
              {recentBubbles.map((bubble) => (
                <div
                  key={bubble.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-200">{bubble.symbol}</p>
                    <p className="text-[11px] text-stone-600">
                      {bubble.timeframe} · {formatDateTime(bubble.candle_time)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-stone-300">{bubble.price}</p>
                    <p className="text-[11px] text-stone-600 max-w-[120px] truncate">
                      {bubble.memo || bubble.tags?.slice(0, 2).join(', ') || ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Guided review modal */}
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
