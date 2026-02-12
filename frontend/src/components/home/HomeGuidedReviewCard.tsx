'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '../../lib/api'
import { normalizeTradeSummary } from '../../lib/tradeAdapters'
import { useGuidedReviewStore } from '../../stores/guidedReviewStore'
import { NO_TRADE_SYMBOL } from '../../types/guidedReview'
import { GuidedReviewFlow } from '../guided-review/GuidedReviewFlow'

type HomeGuidedReviewCardProps = {
  forceOpen?: boolean
  autoLoad?: boolean
}

export function HomeGuidedReviewCard({ forceOpen = false, autoLoad = true }: HomeGuidedReviewCardProps) {
  const { review, items, streak, isLoading, error, fetchToday, fetchStreak } =
    useGuidedReviewStore()
  const [isOpen, setIsOpen] = useState(false)
  const [recentSymbols, setRecentSymbols] = useState<string[]>([])

  useEffect(() => {
    if (autoLoad) {
      fetchToday()
      fetchStreak()
    }
    const loadRecentSymbols = async () => {
      try {
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
        setRecentSymbols([])
      }
    }
    loadRecentSymbols()
  }, [autoLoad, fetchToday, fetchStreak])

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
  const supplementPending = items.filter(
    (item) => !item.intent && (item.bundle_key || '').startsWith('SUPPLEMENT:')
  ).length
  const rolloverPending = items.filter(
    (item) => !item.intent && (item.bundle_key || '').startsWith('ROLLOVER:')
  ).length

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Guided Review</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-100">
            오늘의 복기
          </h2>
          <p className="text-xs text-neutral-500">
            거래를 하나씩 돌아보며 패턴을 기록합니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {streak && streak.current_streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5">
              <span className="text-sm">&#128293;</span>
              <span className="text-xs font-semibold text-amber-200">
                {streak.current_streak}일
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {hasItems && !isOpen && (
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Items</p>
            <p className="mt-1 text-lg font-semibold text-neutral-100">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Answered</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">{answeredCount}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Status</p>
            <p className={`mt-1 text-lg font-semibold ${isCompleted ? 'text-emerald-200' : 'text-amber-200'}`}>
              {isCompleted ? '완료' : `${totalCount - answeredCount}건 남음`}
            </p>
          </div>
        </div>
      )}

      {!isOpen && (supplementPending > 0 || rolloverPending > 0) && (
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

      {isNoTradeDay && !isOpen && (
        <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3">
          <p className="text-xs font-semibold text-cyan-100">오늘은 비거래일 복기입니다.</p>
          <p className="mt-1 text-xs text-cyan-100/80">
            왜 거래하지 않았는지 기록하고, 내일 볼 심볼을 정리해 연속 루틴을 유지하세요.
          </p>
          {recentSymbols.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {recentSymbols.map((symbol) => (
                <Link
                  key={symbol}
                  href={`/chart/${encodeURIComponent(symbol)}`}
                  className="rounded-full border border-cyan-300/30 bg-cyan-900/20 px-2.5 py-1 text-[11px] text-cyan-100/90 hover:bg-cyan-800/30"
                >
                  {symbol}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Flow area */}
      {isOpen ? (
        <div className="mt-5 rounded-xl border border-white/[0.08] bg-black/20 p-5">
          <GuidedReviewFlow onClose={() => setIsOpen(false)} />
        </div>
      ) : (
        <div className="mt-4">
          {isLoading ? (
            <p className="text-xs text-neutral-500">불러오는 중...</p>
          ) : error ? (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3">
              <p className="text-xs text-rose-200">{error}</p>
              <button
                type="button"
                onClick={() => fetchToday()}
                className="mt-2 rounded-md border border-rose-300/40 px-2.5 py-1 text-[11px] font-medium text-rose-100 hover:bg-rose-500/10"
              >
                다시 불러오기
              </button>
            </div>
          ) : isCompleted ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
              <span className="text-lg">&#10003;</span>
              <div>
                <p className="text-sm font-semibold text-emerald-200">오늘의 복기를 완료했습니다</p>
                <p className="text-xs text-emerald-200/60">
                  {streak && streak.current_streak > 0
                    ? `${streak.current_streak}일 연속 복기 중 (최고: ${streak.longest_streak}일)`
                    : '내일도 이어가세요!'}
                </p>
              </div>
            </div>
          ) : hasItems ? (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {rolloverPending > 0
                ? `이월 복기 시작 (${answeredCount}/${totalCount})`
                : review?.status === 'completed' && hasPendingItems
                ? `보강 복기 시작 (${answeredCount}/${totalCount})`
                : answeredCount > 0
                ? `복기 이어하기 (${answeredCount}/${totalCount})`
                : '오늘의 복기 시작'}
            </button>
          ) : (
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-xs text-neutral-500">
              오늘(선택 시간대 기준) 거래가 없어 복기 항목이 없습니다.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
