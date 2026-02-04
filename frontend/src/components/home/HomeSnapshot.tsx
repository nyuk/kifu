'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '../../lib/api'
import { useReviewStore } from '../../stores/reviewStore'
import { useBubbleStore, type Trade } from '../../lib/bubbleStore'
import type { AccuracyResponse } from '../../types/review'
import { HomeSafetyCheckCard } from './HomeSafetyCheckCard'

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

const toneByPercent = (value?: string | number) => {
  const numeric = parsePercent(value)
  if (numeric > 0) return 'text-lime-300'
  if (numeric < 0) return 'text-rose-300'
  return 'text-neutral-200'
}

const getCurrency = (trades: Trade[]) => {
  const hasUpbit = trades.some((trade) => trade.exchange === 'upbit')
  const hasBinance = trades.some((trade) => trade.exchange === 'binance')
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
  <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
    <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{title}</p>
    <div className="mt-4">{children}</div>
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
      ? 'bg-lime-400/90 shadow-[0_0_12px_rgba(163,230,53,0.9)]'
      : mode === 'bad'
        ? 'bg-rose-400/90 shadow-[0_0_12px_rgba(244,63,94,0.9)]'
        : mode === 'ok'
          ? 'bg-emerald-300/90 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
          : 'bg-slate-500/70'
  return (
    <div className="flex items-center gap-1.5">
      {segments.map((segment) => (
        <span
          key={segment.key}
          className={`h-2 w-8 rounded-full border border-neutral-800/80 ${
            segment.active ? glow : 'bg-neutral-800/80'
          }`}
        />
      ))}
      <span className="ml-2 text-[10px] uppercase tracking-[0.3em] text-neutral-400">State</span>
    </div>
  )
}

export function HomeSnapshot() {
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
  const trades = useBubbleStore((state) => state.trades)
  const tradesCount = trades.length
  const [recentBubbles, setRecentBubbles] = useState<BubbleItem[]>([])
  const [bubblesLoading, setBubblesLoading] = useState(false)
  const [bubblesError, setBubblesError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [visualMode, setVisualMode] = useState<'auto' | 'good' | 'ok' | 'bad' | 'idle'>('auto')
  const [animatedPnl, setAnimatedPnl] = useState(0)
  const prevPnlRef = useRef(0)
  const [currencyMode, setCurrencyMode] = useState<'auto' | 'usdt' | 'krw'>('auto')

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
    const saved = localStorage.getItem('kifu-home-currency')
    if (saved === 'usdt' || saved === 'krw' || saved === 'auto') {
      setCurrencyMode(saved)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('kifu-home-currency', currencyMode)
  }, [currencyMode])

  const snapshotPeriod = periodLabels[filters.period] ?? '최근'
  const summary = stats?.overall
  const topProvider = useMemo(() => getTopProvider(accuracy), [accuracy])
  const accuracyLabel = topProvider ? `${topProvider.provider} ${formatPercent(topProvider.accuracy)}` : '-'
  const totalOpinions = accuracy?.total_opinions ?? 0
  const statsTrades = useMemo(() => {
    const buyTrades = trades.filter((trade) => trade.side === 'buy')
    const sellTrades = trades.filter((trade) => trade.side === 'sell')
    const totalBuyValue = buyTrades.reduce((sum, trade) => sum + trade.price * (trade.qty || 0), 0)
    const totalSellValue = sellTrades.reduce((sum, trade) => sum + trade.price * (trade.qty || 0), 0)
    const totalFees = trades.reduce((sum, trade) => sum + (trade.fee || 0), 0)
    return {
      totalBuyValue,
      totalSellValue,
      totalFees,
      netFlow: totalSellValue - totalBuyValue - totalFees,
    }
  }, [trades])
  const currency = currencyMode === 'auto' ? getCurrency(trades) : currencyPreset(currencyMode)
  const totalPnlNumeric = statsTrades.netFlow
  const pnlTone = toneByNumber(totalPnlNumeric)
  const pnlGlow = totalPnlNumeric >= 0 ? 'shadow-[0_0_24px_rgba(163,230,53,0.35)]' : 'shadow-[0_0_24px_rgba(244,63,94,0.35)]'
  const bubbleCount = stats?.total_bubbles ?? 0
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
      ? 'bg-gradient-to-b from-neutral-950 via-lime-900/80 to-amber-900/30'
      : resolvedMode === 'bad'
        ? 'bg-gradient-to-b from-neutral-950 via-rose-900/80 to-red-950/30'
        : resolvedMode === 'ok'
          ? 'bg-gradient-to-b from-neutral-950 via-emerald-900/60 to-cyan-950/20'
          : 'bg-gradient-to-b from-slate-950 via-indigo-950/60 to-slate-950'
  const heroText =
    resolvedMode === 'good'
      ? '오늘 흐름이 좋습니다. 이 리듬을 기억하세요.'
      : resolvedMode === 'bad'
        ? '손실 패턴이 보입니다. 복기가 필요한 순간입니다.'
        : resolvedMode === 'ok'
          ? '큰 흔들림 없이 중립입니다. 작은 신호를 기록해보세요.'
          : '아직 기록이 없습니다. 첫 버블을 남겨보세요.'
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

  return (
    <div className={`min-h-screen text-neutral-100 p-4 md:p-8 ${stateTone} transition-colors duration-700 ease-out`}>
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Home Snapshot</p>
            <h1 className="text-3xl font-semibold">오늘의 스냅샷</h1>
            <p className="text-sm text-neutral-400">{snapshotPeriod} 핵심 신호만 빠르게</p>
            <p className="text-xs text-neutral-500">기간 기준: 캔들 시간</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-full bg-neutral-900/70 p-1">
              {(['7d', '30d', 'all'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setFilters({ period })}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${
                    filters.period === period
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
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                    currencyMode === item.key
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

        <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-3 text-xs text-neutral-300">
          <span className="text-neutral-500">배경 미리보기:</span>
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
              className={`rounded-full border px-3 py-1 transition ${
                visualMode === item.key
                  ? 'border-neutral-200 bg-neutral-100 text-neutral-950'
                  : 'border-neutral-700/70 bg-neutral-900/60 text-neutral-300 hover:border-neutral-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </section>

        <section className="rounded-3xl border border-neutral-800/60 bg-gradient-to-br from-neutral-950 via-neutral-900/80 to-lime-900/30 p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Focus Snapshot</p>
              <p className={`text-sm ${heroAccent}`}>
                {heroText}
              </p>
              <p className="text-sm text-neutral-300">결과와 AI 합의를 한 번에 정리합니다.</p>
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
              <p className="mt-2 text-xs text-neutral-500">최근 흐름을 한 눈에</p>
            </div>
          </div>
        </section>

        <HomeSafetyCheckCard />

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
                <p className={`text-xl font-semibold ${toneByNumber(tradesCount ? statsTrades.netFlow / tradesCount : 0)}`}>
                  {tradesCount
                    ? formatCurrency(statsTrades.netFlow / tradesCount, currency.symbol)
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
            </div>
            {isLoadingAccuracy && <p className="mt-4 text-xs text-neutral-500">AI 통계를 불러오는 중...</p>}
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
                <p className={`text-2xl font-semibold ${toneByNumber(statsTrades.netFlow)}`}>
                  {tradesCount ? formatCurrency(statsTrades.netFlow, currency.symbol) : '-'}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>총 매수</span>
                  <span className="text-neutral-200">
                    {tradesCount ? formatCurrency(statsTrades.totalBuyValue, currency.symbol) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>총 매도</span>
                  <span className="text-neutral-200">
                    {tradesCount ? formatCurrency(statsTrades.totalSellValue, currency.symbol) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>수수료</span>
                  <span className="text-neutral-200">
                    {tradesCount ? formatCurrency(statsTrades.totalFees, currency.symbol) : '-'}
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
     </div>
   )
 }
