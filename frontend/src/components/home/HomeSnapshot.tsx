'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '../../lib/api'
import { isGuestSession } from '../../lib/guestSession'
import { onboardingProfileStoragePrefix, readOnboardingProfile, resolveCurrentUserKey } from '../../lib/onboardingProfile'
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

type ExchangeListResponse = {
  items?: Array<{ id: string }>
}

const ONBOARDING_NUDGE_DISMISS_PREFIX = 'kifu-home-onboarding-dismiss-v1'

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

const formatLocalDate = (value: Date) => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
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
  const guidedReview = useGuidedReviewStore((state) => state.review)
  const guidedItems = useGuidedReviewStore((state) => state.items)
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
  const [hasConnectedExchange, setHasConnectedExchange] = useState(false)
  const [onboardingDismissedToday, setOnboardingDismissedToday] = useState(false)

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
    if (!guestModeReady || guestMode) return
    let isActive = true
    const loadConnections = async () => {
      try {
        const response = await api.get<ExchangeListResponse>('/v1/exchanges')
        if (isActive) {
          setHasConnectedExchange((response.data.items ?? []).length > 0)
        }
      } catch {
        if (isActive) {
          setHasConnectedExchange(false)
        }
      }
    }
    loadConnections()
    return () => {
      isActive = false
    }
  }, [guestMode, guestModeReady, refreshTick])

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

  useEffect(() => {
    if (!guestModeReady || typeof window === 'undefined') return
    const storageKey = `${ONBOARDING_NUDGE_DISMISS_PREFIX}:${guestMode ? 'guest' : resolveCurrentUserKey()}`
    const saved = localStorage.getItem(storageKey)
    setOnboardingDismissedToday(saved === formatLocalDate(new Date()))
  }, [guestMode, guestModeReady])

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

  const showOnboardingNudge =
    !guestMode &&
    tradesCount === 0 &&
    bubbleCount === 0 &&
    !onboardingDismissedToday
  const onboardingPrimaryHref = hasConnectedExchange
    ? '/settings'
    : onboardingProfile
      ? '/chart?onboarding=1'
      : '/onboarding/start'
  const onboardingPrimaryLabel = hasConnectedExchange
    ? '지금 동기화'
    : onboardingProfile
      ? '루틴 시작'
      : '시작 가이드'
  const onboardingSecondaryHref = hasConnectedExchange ? '/chart?onboarding=1' : '/settings'
  const onboardingSecondaryLabel = hasConnectedExchange ? '차트에서 기록 시작' : '거래소 연결'
  const onboardingHint = hasConnectedExchange
    ? '거래소는 이미 연결돼 있습니다. 홈이 비어 있다면 한 번만 동기화해 주세요.'
    : onboardingProfile
      ? '아직 거래 기록이 없어도 괜찮습니다. 먼저 한 줄 기록으로 시작하거나 거래소를 연결하면 됩니다.'
      : '처음이라면 시작 가이드를 보고 흐름을 익히거나, 거래소를 연결해 거래내역을 가져오면 됩니다.'
  const reviewAnsweredCount = guidedItems.filter((item) => item.intent).length
  const reviewTotalCount = guidedItems.length
  const latestBubble = recentBubbles[0] ?? null
  const chartStartHref = latestBubble ? `/chart/${encodeURIComponent(latestBubble.symbol)}` : '/chart/BTCUSDT?onboarding=1'
  const reviewStatusText = guestMode
    ? '게스트 모드에서는 흐름만 살펴볼 수 있습니다.'
    : guidedLoading
      ? '오늘 복기 항목을 준비하는 중입니다.'
      : guidedReview?.status === 'completed' && reviewTotalCount > 0
        ? '오늘 복기가 완료됐습니다. 결과와 패턴을 확인해 보세요.'
        : reviewTotalCount > 0
          ? `${reviewAnsweredCount}/${reviewTotalCount}개 항목을 정리했습니다. 남은 거래를 이어서 복기하세요.`
          : '오늘 거래를 불러오면 guided review가 바로 생성됩니다.'
  const hubActions = [
    {
      key: 'review',
      title: reviewTotalCount > 0 ? (reviewAnsweredCount > 0 ? '1. 오늘 복기 이어하기' : '1. 오늘 복기 시작') : '1. 복기 센터 열기',
      hint: reviewStatusText,
      href: '/review',
      badge: reviewTotalCount > 0 ? `${reviewAnsweredCount}/${reviewTotalCount}` : guestMode ? '가이드' : '준비됨',
    },
    {
      key: 'chart',
      title: latestBubble ? `2. ${latestBubble.symbol} 차트 열기` : '2. 차트에서 첫 기록 남기기',
      hint: latestBubble ? `${latestBubble.timeframe.toUpperCase()} · ${formatDateTime(latestBubble.candle_time)}` : '차트와 말풍선을 한 화면에서 복기합니다.',
      href: chartStartHref,
      badge: latestBubble ? latestBubble.timeframe.toUpperCase() : '차트',
    },
    {
      key: 'report',
      title: '3. 성과와 패턴 보기',
      hint: accuracyLabel
        ? `AI ${accuracyLabel} · 복기 노트와 성과를 함께 확인하세요.`
        : '복기 기록이 쌓이면 패턴과 리포트가 선명해집니다.',
      href: '/review',
      badge: totalOpinions > 0 ? `${totalOpinions} AI` : '리포트',
    },
  ] as const
  const focusMetrics = [
    {
      key: 'pnl',
      label: '실현손익',
      value: formatCurrency(animatedPnl, currency.symbol),
      tone: pnlTone,
    },
    {
      key: 'trades',
      label: '체결',
      value: `${tradesCount.toLocaleString()}건`,
      tone: 'text-neutral-100',
    },
    {
      key: 'bubbles',
      label: '말풍선',
      value: `${bubbleCount.toLocaleString()}개`,
      tone: 'text-neutral-100',
    },
    {
      key: 'ai',
      label: 'AI 비교',
      value: accuracyLabel ?? `${totalOpinions.toLocaleString()}건`,
      tone: accuracyLabel ? 'text-emerald-200' : 'text-neutral-100',
    },
  ] as const
  const reviewSnapshotItems = [
    {
      key: 'status',
      label: '복기 상태',
      value: guidedReview?.status === 'completed' && reviewTotalCount > 0
        ? '오늘 복기 완료'
        : reviewTotalCount > 0
          ? `${reviewAnsweredCount}/${reviewTotalCount} 진행 중`
          : '아직 항목 없음',
    },
    {
      key: 'latest',
      label: '최근 기록',
      value: latestBubble ? `${latestBubble.symbol} · ${latestBubble.timeframe.toUpperCase()}` : '기록 없음',
    },
    {
      key: 'winRate',
      label: '승률',
      value: formatPercent(summary?.win_rate),
    },
    {
      key: 'updated',
      label: '마지막 갱신',
      value: lastUpdated ? lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-',
    },
  ] as const

  const dismissOnboardingForToday = () => {
    if (typeof window === 'undefined') return
    const storageKey = `${ONBOARDING_NUDGE_DISMISS_PREFIX}:${guestMode ? 'guest' : resolveCurrentUserKey()}`
    localStorage.setItem(storageKey, formatLocalDate(new Date()))
    setOnboardingDismissedToday(true)
  }

  return (
    <div className="min-h-screen p-4 text-zinc-100 transition-colors duration-700 ease-out md:p-8">
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="kifu-eyebrow">오늘의 거래복기</p>
            <h1 className="kifu-section-title">거래 복기 홈</h1>
            <p className="kifu-section-copy max-w-3xl">
              {snapshotPeriod} 동안의 거래, 차트 기록, AI 의견을 한 흐름으로 다시 봅니다.
              먼저 오늘 복기를 시작하고, 이어서 차트와 패턴 리포트로 넘어가세요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
              {(['7d', '30d', 'all'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setFilters({ period })}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    filters.period === period
                      ? 'bg-white/15 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {period.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
              {([
                { key: 'auto', label: '자동' },
                { key: 'usdt', label: '$' },
                { key: 'krw', label: '₩' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCurrencyMode(item.key)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    currencyMode === item.key
                      ? 'bg-white/15 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="kifu-chip">
              업데이트 {lastUpdated ? lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '...'}
            </span>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
          <HomeGuidedReviewCard autoLoad={false} />

          <aside className="kifu-panel p-5 md:p-6">
            <div className="flex h-full flex-col gap-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="kifu-eyebrow">오늘의 루틴</p>
                    <h2 className="mt-2 text-2xl font-semibold text-neutral-100">지금 해야 할 일</h2>
                  </div>
                  <StatusGauge mode={resolvedMode} />
                </div>
                <p className={`text-sm leading-6 ${heroAccent}`}>{heroText}</p>
              </div>

              <div className="grid gap-3">
                {hubActions.map((action) => (
                  <Link
                    key={action.key}
                    href={action.href}
                    className="kifu-panel-muted flex items-center justify-between gap-3 p-4 transition hover:border-white/20 hover:bg-white/10"
                  >
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-neutral-100">{action.title}</p>
                      <p className="mt-1 text-sm leading-6 text-neutral-400">{action.hint}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-200">
                      {action.badge}
                    </span>
                  </Link>
                ))}
              </div>

              {showOnboardingNudge && (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4">
                  <p className="kifu-eyebrow text-amber-300/80">First Setup</p>
                  <p className="mt-2 text-sm font-semibold text-amber-100">
                    {onboardingProfile ? onboardingProfile.tendency : '처음 기록 전 안내'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-100/75">{onboardingHint}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={onboardingPrimaryHref} className="kifu-btn-secondary border-amber-300/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20">
                      {onboardingPrimaryLabel}
                    </Link>
                    <Link href={onboardingSecondaryHref} className="kifu-btn-ghost px-3 py-2 text-amber-100/80 hover:bg-amber-500/10 hover:text-amber-100">
                      {onboardingSecondaryLabel}
                    </Link>
                    <button
                      type="button"
                      onClick={dismissOnboardingForToday}
                      className="kifu-btn-ghost px-3 py-2 text-amber-200/70 hover:bg-amber-500/10 hover:text-amber-100"
                    >
                      오늘은 숨기기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="kifu-panel p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="kifu-eyebrow">최근 기록</p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-100">최근 말풍선</h2>
              </div>
              <Link href="/bubbles" className="kifu-btn-ghost px-0 py-0 text-sm">
                전체 보기
              </Link>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {bubblesLoading && <p className="text-sm text-zinc-400">최근 기록을 불러오는 중입니다...</p>}
              {bubblesError && <p className="text-sm text-rose-300">{bubblesError}</p>}
              {!bubblesLoading && !bubblesError && recentBubbles.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-400">
                  아직 기록된 말풍선이 없습니다. 차트에서 첫 판단을 남겨보세요.
                </div>
              )}
              {!bubblesLoading && !bubblesError && recentBubbles.length > 0 && recentBubbles.map((bubble) => (
                <Link
                  key={bubble.id}
                  href={`/chart/${encodeURIComponent(bubble.symbol)}`}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 transition hover:border-white/20 hover:bg-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-stone-100">{bubble.symbol}</p>
                      <p className="mt-1 text-sm text-stone-400">
                        {bubble.timeframe.toUpperCase()} · {formatDateTime(bubble.candle_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold text-stone-200">{bubble.price}</p>
                      <p className="mt-1 text-xs text-stone-500">{bubble.venue_name || bubble.bubble_type}</p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-400">
                    {bubble.memo || bubble.tags?.slice(0, 3).join(', ') || '메모 없음'}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="kifu-panel p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="kifu-eyebrow">복기 현황</p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-100">복기 스냅샷</h2>
              </div>
              <p className="text-sm text-zinc-400">{snapshotPeriod} 기준</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {focusMetrics.map((metric) => (
                <div key={metric.key} className="kifu-stat-card">
                  <p className="kifu-eyebrow">{metric.label}</p>
                  <p className={`mt-2 text-2xl font-semibold ${metric.tone}`}>{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-neutral-100">현재 흐름</p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{reviewStatusText}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {reviewSnapshotItems.map((item) => (
                  <div key={item.key} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-neutral-100">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/review" className="kifu-btn-primary">
                  복기 센터 열기
                </Link>
                <Link href="/portfolio" className="kifu-btn-secondary">
                  포지션 점검
                </Link>
                <Link href={chartStartHref} className="kifu-btn-secondary">
                  차트로 이동
                </Link>
              </div>
            </div>

            {isLoading && <p className="mt-4 text-sm text-zinc-400">통계를 불러오는 중입니다...</p>}
            {isLoadingAccuracy && <p className="mt-2 text-sm text-zinc-400">AI 정확도 데이터를 불러오는 중입니다...</p>}
          </div>
        </section>

        {!guestMode && (
          <section className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="kifu-eyebrow">패턴과 리포트</p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-100">포지션 · 패턴 · 리포트</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  오늘 복기를 마친 뒤에는 열린 포지션과 반복 패턴, 월간 흐름을 한 번에 점검하세요.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <span className="kifu-chip">BUY {bySide.buyCount}</span>
                <span className="kifu-chip">SELL {bySide.sellCount}</span>
                <span className="kifu-chip">결과 있음 {formatNumber(stats?.bubbles_with_outcome ?? 0)}</span>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              <HomeMonthlyReportCard />
              <MonthlyTrendChart />
              <HomeSimilarPatterns />
              <PositionManager />
              <HomeSafetyCheckCard />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
