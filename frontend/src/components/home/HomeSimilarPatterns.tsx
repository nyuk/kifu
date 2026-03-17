'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '../../lib/api'

type SimilarBubble = {
  id: string
  symbol: string
  timeframe: string
  candle_time: string
  price: string
  bubble_type: string
  memo?: string | null
  tags?: string[]
  outcome?: {
    pnl_percent: number
    direction: string
  } | null
}

type SimilarSummary = {
  period: string
  wins: number
  losses: number
  avg_pnl: number
}

type SimilarResponse = {
  similar_count: number
  summary: SimilarSummary
  bubbles: SimilarBubble[]
}

type RecentBubble = {
  id: string
  symbol: string
  tags?: string[]
}

export function HomeSimilarPatterns() {
  const [pattern, setPattern] = useState<{
    sourceBubble: RecentBubble
    similar: SimilarResponse
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        // 최근 버블 가져오기
        const bubblesRes = await api.get<{ items: RecentBubble[] }>('/v1/bubbles?page=1&limit=5&sort=desc')
        const bubbles = bubblesRes.data.items || []
        if (bubbles.length === 0) {
          if (active) setLoading(false)
          return
        }

        // 첫 번째 버블에 대해 유사 패턴 검색
        for (const bubble of bubbles) {
          try {
            const res = await api.get<SimilarResponse>(`/v1/bubbles/${bubble.id}/similar?period=1d`)
            if (res.data.similar_count > 1) { // 자기 자신 제외 1건 이상
              if (active) {
                setPattern({ sourceBubble: bubble, similar: res.data })
              }
              break
            }
          } catch {
            // 이 버블은 유사 패턴 없음 — 다음 시도
          }
        }
      } catch {
        // 에러 무시
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  if (loading || !pattern) return null

  const { sourceBubble, similar } = pattern
  const { summary, bubbles } = similar
  const totalDecided = summary.wins + summary.losses
  const winRate = totalDecided > 0 ? (summary.wins / totalDecided * 100) : 0
  const pnlTone = summary.avg_pnl >= 0 ? 'text-lime-300' : 'text-rose-300'
  const winRateTone = winRate >= 50 ? 'text-lime-300' : 'text-rose-300'

  // 자기 자신 제외
  const otherBubbles = bubbles.filter((b) => b.id !== sourceBubble.id).slice(0, 3)
  if (otherBubbles.length === 0) return null

  return (
    <section className="rounded-2xl border border-indigo-400/15 bg-indigo-500/5 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-indigo-300/60">Similar Pattern</p>
          <p className="mt-1 text-sm font-medium text-indigo-200">
            {sourceBubble.symbol} — 과거에 비슷한 상황이 {similar.similar_count - 1}건 있었습니다
          </p>
        </div>
        <Link
          href={`/bubbles?bubble_id=${sourceBubble.id}`}
          className="rounded-lg border border-indigo-400/20 px-3 py-1.5 text-[11px] text-indigo-300 hover:bg-indigo-500/10 transition"
        >
          원본 버블
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3 text-center">
          <p className="text-[10px] text-stone-600">과거 승률</p>
          <p className={`text-lg font-semibold ${winRateTone}`}>{winRate.toFixed(0)}%</p>
          <p className="text-[10px] text-stone-600">{summary.wins}승 {summary.losses}패</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3 text-center">
          <p className="text-[10px] text-stone-600">평균 PnL</p>
          <p className={`text-lg font-semibold ${pnlTone}`}>
            {summary.avg_pnl >= 0 ? '+' : ''}{summary.avg_pnl.toFixed(2)}%
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3 text-center">
          <p className="text-[10px] text-stone-600">유사 건수</p>
          <p className="text-lg font-semibold text-stone-200">{similar.similar_count - 1}건</p>
        </div>
      </div>

      {/* Past similar bubbles */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-indigo-300/60 uppercase tracking-wider">과거 유사 판단</p>
        {otherBubbles.map((b) => {
          const outcomeLabel = b.outcome
            ? `${b.outcome.pnl_percent >= 0 ? '+' : ''}${b.outcome.pnl_percent.toFixed(2)}%`
            : '결과 없음'
          const outcomeColor = b.outcome
            ? b.outcome.pnl_percent >= 0 ? 'text-lime-300' : 'text-rose-300'
            : 'text-stone-500'

          return (
            <Link
              key={b.id}
              href={`/bubbles?bubble_id=${b.id}`}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 hover:bg-white/[0.04] transition"
            >
              <div>
                <p className="text-sm text-stone-300">{b.symbol} · {b.timeframe}</p>
                <p className="text-[10px] text-stone-600">
                  {new Date(b.candle_time).toLocaleDateString('ko-KR')}
                  {b.memo && ` · ${b.memo.slice(0, 30)}`}
                </p>
              </div>
              <span className={`text-sm font-medium ${outcomeColor}`}>{outcomeLabel}</span>
            </Link>
          )
        })}
      </div>

      {winRate < 40 && (
        <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-2.5">
          <p className="text-[11px] text-amber-300/80">
            이 패턴의 과거 승률이 낮습니다. 진입 전 한 번 더 점검하세요.
          </p>
        </div>
      )}
      {winRate >= 60 && (
        <div className="mt-3 rounded-xl border border-lime-500/15 bg-lime-500/5 px-4 py-2.5">
          <p className="text-[11px] text-lime-300/80">
            이 패턴의 과거 성과가 좋습니다. 확신도를 참고하세요.
          </p>
        </div>
      )}
    </section>
  )
}
