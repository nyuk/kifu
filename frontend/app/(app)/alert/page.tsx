'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { OnboardingProfile } from '../../../src/lib/onboardingProfile'
import { readOnboardingProfile } from '../../../src/lib/onboardingProfile'
import { api } from '../../../src/lib/api'
import type { TradeItem, TradeListResponse } from '../../../src/types/trade'

type EmergencyMode = 'aggressive' | 'defensive' | 'balanced'

const modeMeta: Record<EmergencyMode, { label: string; tone: string; tip: string }> = {
  aggressive: {
    label: '공격형 대응',
    tone: 'text-rose-200 border-rose-400/30 bg-rose-500/10',
    tip: '손절 폭을 먼저 정하고, 크기를 줄여 반응하세요.',
  },
  defensive: {
    label: '방어형 대응',
    tone: 'text-sky-200 border-sky-400/30 bg-sky-500/10',
    tip: '신호가 확인될 때까지 노출을 최소화하세요.',
  },
  balanced: {
    label: '균형형 대응',
    tone: 'text-emerald-200 border-emerald-400/30 bg-emerald-500/10',
    tip: '진입/관망 기준을 한 번 더 점검하세요.',
  },
}

export default function AlertPage() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)
  const [recentTrades, setRecentTrades] = useState<TradeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [actionChoice, setActionChoice] = useState<'LONG' | 'SHORT' | 'HOLD' | 'WAIT' | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [actionSavedAt, setActionSavedAt] = useState<string | null>(null)
  const [actionLog, setActionLog] = useState<Array<{
    id: string
    symbol: string
    action: string
    note?: string
    created_at: string
  }>>([])

  useEffect(() => {
    setProfile(readOnboardingProfile())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('kifu-alert-actions')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setActionLog(parsed)
      }
    } catch {
      setActionLog([])
    }
  }, [])

  useEffect(() => {
    let isActive = true
    const load = async () => {
      setLoading(true)
      try {
        const response = await api.get<TradeListResponse>('/v1/trades?page=1&limit=5&sort=desc')
        if (isActive) setRecentTrades(response.data.items || [])
      } catch {
        if (isActive) setRecentTrades([])
      } finally {
        if (isActive) setLoading(false)
      }
    }
    load()
    return () => {
      isActive = false
    }
  }, [])

  const mode = useMemo<EmergencyMode>(() => {
    if (!profile) return 'balanced'
    return profile.recommended_mode
  }, [profile])
  const latestSymbol = recentTrades[0]?.symbol || 'BTCUSDT'
  const recentActiveHours = useMemo(() => {
    const now = Date.now()
    return recentTrades.filter((trade) => now - new Date(trade.trade_time).getTime() <= 24 * 60 * 60 * 1000).length
  }, [recentTrades])
  const marketTone =
    recentActiveHours >= 4 ? '변동성 높음' : recentActiveHours >= 1 ? '변동성 보통' : '변동성 낮음'

  const currentMode = modeMeta[mode]
  const actionOptions = [
    { key: 'LONG', label: '롱 진입' },
    { key: 'SHORT', label: '숏 진입' },
    { key: 'HOLD', label: '유지' },
    { key: 'WAIT', label: '관망' },
  ] as const

  const handleSaveAction = () => {
    if (!actionChoice) return
    const entry = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}`,
      symbol: latestSymbol,
      action: actionChoice,
      note: actionNote.trim() || undefined,
      created_at: new Date().toISOString(),
    }
    const next = [entry, ...actionLog].slice(0, 12)
    setActionLog(next)
    setActionNote('')
    setActionSavedAt(entry.created_at)
    if (typeof window !== 'undefined') {
      localStorage.setItem('kifu-alert-actions', JSON.stringify(next))
    }
  }

  return (
    <div className="min-h-full p-4 text-neutral-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-neutral-900 to-rose-950/40 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-300/80">Emergency Note</p>
          <h1 className="mt-2 text-3xl font-semibold">긴급 모드</h1>
          <p className="mt-2 text-sm text-neutral-300">흔들리는 순간을 짧게 정리합니다.</p>
        </header>

        <section className={`rounded-2xl border p-5 ${currentMode.tone}`}>
          <p className="text-xs uppercase tracking-[0.2em]">오늘의 대응</p>
          <p className="mt-2 text-xl font-semibold">{currentMode.label}</p>
          <p className="mt-2 text-sm text-current/80">{currentMode.tip}</p>
          {profile ? (
            <p className="mt-3 text-xs text-current/70">
              성향 기반: LONG {profile.long_count} · SHORT {profile.short_count} · HOLD {profile.hold_count}
            </p>
          ) : (
            <p className="mt-3 text-xs text-current/70">성향 정보가 없어 기본 브리핑으로 대체합니다.</p>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">지금 분위기</p>
            <p className="mt-2 text-lg font-semibold text-amber-200">{marketTone}</p>
            <p className="mt-1 text-xs text-neutral-400">최근 24시간 체결 {recentActiveHours}건</p>
          </article>
          <article className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">유사 장면</p>
            <p className="mt-2 text-lg font-semibold text-sky-200">{Math.max(1, recentTrades.length)}건</p>
            <p className="mt-1 text-xs text-neutral-400">최근 심볼 중심 간단 비교</p>
          </article>
          <article className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">추천 행동</p>
            <p className="mt-2 text-lg font-semibold text-emerald-200">조건부 진입</p>
            <p className="mt-1 text-xs text-neutral-400">{latestSymbol} 기준 손절 먼저 확정</p>
          </article>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">방금 체결 요약</p>
            {loading && <p className="text-[11px] text-zinc-400">불러오는 중...</p>}
          </div>
          <div className="mt-3 space-y-2">
            {!loading && recentTrades.length === 0 && (
              <p className="text-xs text-zinc-400">체결이 없어 기본 브리핑을 사용합니다.</p>
            )}
            {recentTrades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                <p className="text-xs text-neutral-300">
                  {trade.symbol} · {trade.side.toUpperCase()} · {Number(trade.quantity).toLocaleString()}
                </p>
                <p className="text-[11px] text-zinc-400">{new Date(trade.trade_time).toLocaleString('ko-KR')}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">지금 선택 기록</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {actionOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setActionChoice(option.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${actionChoice === option.key
                    ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                    : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <textarea
            value={actionNote}
            onChange={(event) => setActionNote(event.target.value)}
            placeholder="지금 판단의 한 줄 메모"
            rows={2}
            className="mt-3 w-full rounded-lg border border-neutral-700 bg-black/25 px-3 py-2 text-sm text-neutral-100 placeholder:text-zinc-400"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAction}
              disabled={!actionChoice}
              className="rounded-lg bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-950 disabled:opacity-60"
            >
              선택 저장
            </button>
            {actionSavedAt && (
              <span className="text-[11px] text-zinc-400">
                저장됨: {new Date(actionSavedAt).toLocaleTimeString('ko-KR')}
              </span>
            )}
          </div>
          {actionLog.length > 0 && (
            <div className="mt-4 space-y-2">
              {actionLog.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                  <div>
                    <p className="text-xs text-neutral-300">
                      {entry.symbol} · {entry.action}
                    </p>
                    {entry.note && <p className="text-[11px] text-zinc-400">{entry.note}</p>}
                  </div>
                  <p className="text-[11px] text-zinc-400">{new Date(entry.created_at).toLocaleTimeString('ko-KR')}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-wrap gap-2">
          <Link href="/chart" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
            차트로 이동
          </Link>
          <Link href="/review" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200">
            과거 대응 복기
          </Link>
          <Link href="/onboarding/test" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200">
            성향 테스트 다시하기
          </Link>
        </section>
      </div>
    </div>
  )
}
