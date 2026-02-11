'use client'

import { useEffect, useState } from 'react'
import { useGuidedReviewStore } from '../../stores/guidedReviewStore'
import { GuidedReviewFlow } from '../guided-review/GuidedReviewFlow'

export function HomeGuidedReviewCard() {
  const { review, items, streak, isLoading, error, fetchToday, fetchStreak } =
    useGuidedReviewStore()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchToday()
    fetchStreak()
  }, [fetchToday, fetchStreak])

  const answeredCount = items.filter((i) => i.intent).length
  const totalCount = items.length
  const isCompleted = review?.status === 'completed'
  const hasItems = totalCount > 0

  return (
    <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
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
          <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Items</p>
            <p className="mt-1 text-lg font-semibold text-neutral-100">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Answered</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">{answeredCount}</p>
          </div>
          <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Status</p>
            <p className={`mt-1 text-lg font-semibold ${isCompleted ? 'text-emerald-200' : 'text-amber-200'}`}>
              {isCompleted ? '완료' : `${totalCount - answeredCount}건 남음`}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}

      {/* Flow area */}
      {isOpen ? (
        <div className="mt-5 rounded-xl border border-neutral-800/60 bg-neutral-950/40 p-5">
          <GuidedReviewFlow onClose={() => setIsOpen(false)} />
        </div>
      ) : (
        <div className="mt-4">
          {isLoading ? (
            <p className="text-xs text-neutral-500">불러오는 중...</p>
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
              {answeredCount > 0
                ? `복기 이어하기 (${answeredCount}/${totalCount})`
                : '오늘의 복기 시작'}
            </button>
          ) : (
            <p className="rounded-xl border border-neutral-800/70 bg-neutral-950/60 px-4 py-3 text-xs text-neutral-500">
              오늘 거래 기록이 없습니다. 거래소를 연결하고 동기화해보세요.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
