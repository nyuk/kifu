'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '../../lib/api'
import { isGuestSession } from '../../lib/guestSession'
import { normalizeTradeSummary } from '../../lib/tradeAdapters'
import { useGuidedReviewStore } from '../../stores/guidedReviewStore'
import { NO_TRADE_SYMBOL } from '../../types/guidedReview'
import { GuidedReviewFlow } from '../guided-review/GuidedReviewFlow'

type HomeGuidedReviewCardProps = {
  forceOpen?: boolean
  autoLoad?: boolean
}

export function HomeGuidedReviewCard({ forceOpen = false, autoLoad = true }: HomeGuidedReviewCardProps) {
  const guestMode = isGuestSession()
  const { review, items, streak, isLoading, error, fetchToday, fetchStreak } =
    useGuidedReviewStore()
  const [isOpen, setIsOpen] = useState(false)
  const [recentSymbols, setRecentSymbols] = useState<string[]>([])
  const [hasTodayTrades, setHasTodayTrades] = useState(false)

  useEffect(() => {
    if (guestMode) {
      setHasTodayTrades(false)
      setRecentSymbols([])
      return
    }
    if (autoLoad) {
      fetchToday()
      fetchStreak()
    }
    const loadRecentSymbols = async () => {
      try {
        // Use local-day start to avoid showing "non-trading day" when today's trades exist.
        const localDayStart = new Date()
        localDayStart.setHours(0, 0, 0, 0)
        const todaySummaryResponse = await api.get(`/v1/trades/summary?from=${encodeURIComponent(localDayStart.toISOString())}`)
        const todaySummary = normalizeTradeSummary(todaySummaryResponse.data)
        setHasTodayTrades((todaySummary?.totals?.total_trades || 0) > 0)

        const response = await api.get('/v1/trades/summary')
        const normalized = normalizeTradeSummary(response.data)
        const top = (normalized.by_symbol || [])
          .slice()
          .sort((a, b) => Number(b.total_trades || b.trade_count || 0) - Number(a.total_trades || a.trade_count || 0))
          .map((row) => row.symbol)
          .filter(Boolean)
          .slice(0, 4)
        setRecentSymbols(top)
      } catch {
        setHasTodayTrades(false)
        setRecentSymbols([])
      }
    }
    loadRecentSymbols()
  }, [autoLoad, fetchToday, fetchStreak, guestMode])

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true)
    }
  }, [forceOpen])

  const answeredCount = items.filter((i) => i.intent).length
  const totalCount = items.length
  const hasPendingItems = totalCount > answeredCount
  const isCompleted = review?.status === 'completed' && !hasPendingItems
  const hasItems = totalCount > 0
  const isNoTradeDay = hasItems && items.length === 1 && (items[0].symbol === NO_TRADE_SYMBOL || items[0].trade_count === 0)
  const showNoTradeDayBanner = isNoTradeDay && !hasTodayTrades
  const supplementPending = items.filter(
    (item) => !item.intent && (item.bundle_key || '').startsWith('SUPPLEMENT:')
  ).length
  const rolloverPending = items.filter(
    (item) => !item.intent && (item.bundle_key || '').startsWith('ROLLOVER:')
  ).length
  const progressCopy = guestMode
    ? '게스트 모드에서는 흐름만 체험할 수 있습니다.'
    : isCompleted
      ? '오늘 거래를 끝까지 되짚었습니다. 결과와 패턴을 검토해 보세요.'
      : hasItems
        ? `${answeredCount}/${totalCount}개 항목을 정리했습니다. 남은 거래를 이어서 기록하세요.`
        : '오늘 거래가 불러와지면 여기서 바로 guided review를 시작할 수 있습니다.'
  const primaryActionLabel = rolloverPending > 0
    ? `이월 복기 시작 (${answeredCount}/${totalCount})`
    : review?.status === 'completed' && hasPendingItems
      ? `보강 복기 시작 (${answeredCount}/${totalCount})`
      : answeredCount > 0
        ? `복기 이어하기 (${answeredCount}/${totalCount})`
        : '오늘의 복기 시작'

  return (
    <section className="kifu-panel p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kifu-eyebrow">Guided Review</p>
          <h2 className="mt-2 text-2xl font-semibold text-neutral-100">
            오늘의 복기
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            체결을 하나씩 되짚고, 이유와 감정과 패턴을 남기는 Kifu의 중심 루틴입니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {streak && streak.current_streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5">
              <span className="text-sm">&#128293;</span>
              <span className="text-xs font-semibold text-amber-200">
                {streak.current_streak}일
              </span>
            </div>
          )}
          {!guestMode && hasItems && (
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              isCompleted
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                : 'border-sky-400/40 bg-sky-500/10 text-sky-200'
            }`}>
              {isCompleted ? '오늘 복기 완료' : `${answeredCount}/${totalCount} 진행 중`}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {['거래 선택', '이유 기록', '패턴 남기기'].map((step, index) => (
          <span key={step} className="kifu-chip">
            {index + 1}. {step}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <div className="kifu-stat-card">
            <p className="kifu-eyebrow">Items</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-100">{totalCount}</p>
          </div>
          <div className="kifu-stat-card">
            <p className="kifu-eyebrow">Answered</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-200">{answeredCount}</p>
          </div>
          <div className="kifu-stat-card">
            <p className="kifu-eyebrow">Status</p>
            <p className={`mt-2 text-2xl font-semibold ${isCompleted ? 'text-emerald-200' : 'text-amber-200'}`}>
              {isCompleted ? '완료' : `${Math.max(totalCount - answeredCount, 0)}건 남음`}
            </p>
          </div>
        </div>

        <div className="kifu-panel-muted p-4">
          <p className="text-sm font-semibold text-neutral-100">오늘 흐름</p>
          <p className="mt-2 text-sm leading-6 text-neutral-400">{progressCopy}</p>
          {!guestMode && (supplementPending > 0 || rolloverPending > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {supplementPending > 0 && (
                <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
                  보강 {supplementPending}건
                </span>
              )}
              {rolloverPending > 0 && (
                <span className="rounded-full border border-violet-300/40 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200">
                  이월 {rolloverPending}건
                </span>
              )}
            </div>
          )}
          {showNoTradeDayBanner && !isOpen && !guestMode && (
            <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-cyan-100">오늘은 비거래일 복기입니다.</p>
              <p className="mt-1 text-xs leading-5 text-cyan-100/80">
                왜 거래하지 않았는지 기록하고, 내일 볼 심볼을 정리해 루틴을 유지하세요.
              </p>
              {recentSymbols.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentSymbols.map((symbol) => (
                    <Link
                      key={symbol}
                      href={`/chart/${encodeURIComponent(symbol)}`}
                      className="rounded-full border border-cyan-300/30 bg-cyan-900/20 px-2.5 py-1 text-[11px] font-medium text-cyan-100/90 transition hover:bg-cyan-800/30"
                    >
                      {symbol}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Flow area */}
      {isOpen ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
          <GuidedReviewFlow onClose={() => setIsOpen(false)} />
        </div>
      ) : (
        <div className="mt-5">
          {guestMode && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-amber-100">게스트 모드에서는 복기 시작과 비거래일 기록 저장이 비활성화됩니다.</p>
              <p className="mt-1 text-xs text-amber-100/75">복기 루프는 웹 계정을 만들면 사용할 수 있습니다.</p>
            </div>
          )}
          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-400">
              복기 항목을 불러오는 중입니다...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3">
              <p className="text-sm text-rose-200">{error}</p>
              <button
                type="button"
                onClick={() => fetchToday()}
                className="kifu-btn-secondary mt-3 border-rose-300/40 bg-transparent px-3 py-2 text-rose-100 hover:bg-rose-500/10"
              >
                다시 불러오기
              </button>
            </div>
          ) : !guestMode && isCompleted ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-lg">&#10003;</span>
                <div className="flex-1">
                  <p className="text-base font-semibold text-emerald-200">오늘의 복기를 완료했습니다</p>
                  <p className="mt-1 text-sm text-emerald-200/70">
                    {streak && streak.current_streak > 0
                      ? `${streak.current_streak}일 연속 복기 중 (최고: ${streak.longest_streak}일)`
                      : '내일도 이어가세요!'}
                  </p>
                </div>
              </div>
              {supplementPending > 0 || rolloverPending > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className="kifu-btn-secondary border-emerald-300/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                >
                  보강/이월 복기 이어하기
                </button>
              ) : (
                <Link
                  href="/review"
                  className="kifu-btn-secondary border-emerald-300/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                >
                  복기 결과 보기
                </Link>
              )}
            </div>
          ) : !guestMode && hasItems ? (
            <div className="flex flex-col gap-3 md:flex-row">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="kifu-btn-primary w-full md:flex-1"
              >
                {primaryActionLabel}
              </button>
              <Link
                href="/review"
                className="kifu-btn-secondary w-full md:w-auto"
              >
                복기 센터로 이동
              </Link>
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-400">
              오늘(선택 시간대 기준) 거래가 없어 복기 항목이 없습니다.
              <span className="ml-1 text-neutral-200">
                {guestMode ? '게스트 모드에서는 복기 저장이 비활성화됩니다.' : '비거래일도 기록 흐름은 계속 저장할 수 있습니다.'}
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
