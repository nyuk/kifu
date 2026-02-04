'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { OnboardingProfile } from '../../../src/lib/onboardingProfile'
import { readOnboardingProfile } from '../../../src/lib/onboardingProfile'

type EmergencyMode = 'aggressive' | 'defensive' | 'balanced'

const modeMeta: Record<EmergencyMode, { label: string; tone: string; tip: string }> = {
  aggressive: {
    label: '공격형 대응',
    tone: 'text-rose-200 border-rose-400/30 bg-rose-500/10',
    tip: '진입 전 손절 폭을 먼저 고정하고, 규모를 줄여서 반응하세요.',
  },
  defensive: {
    label: '방어형 대응',
    tone: 'text-sky-200 border-sky-400/30 bg-sky-500/10',
    tip: '신호 확인 전 무리한 추격을 피하고 리스크 노출을 최소화하세요.',
  },
  balanced: {
    label: '균형형 대응',
    tone: 'text-emerald-200 border-emerald-400/30 bg-emerald-500/10',
    tip: '진입/관망 기준을 동시에 점검하고 확률이 높은 쪽만 실행하세요.',
  },
}

export default function AlertPage() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)

  useEffect(() => {
    setProfile(readOnboardingProfile())
  }, [])

  const mode = useMemo<EmergencyMode>(() => {
    if (!profile) return 'balanced'
    return profile.recommended_mode
  }, [profile])

  const currentMode = modeMeta[mode]

  return (
    <div className="min-h-full bg-neutral-950 p-4 text-neutral-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-neutral-900 to-rose-950/40 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-300/80">Emergency Briefing</p>
          <h1 className="mt-2 text-3xl font-semibold">긴급 상황 브리핑</h1>
          <p className="mt-2 text-sm text-neutral-300">급변 구간에서 바로 판단하기 위한 압축 화면입니다.</p>
        </header>

        <section className={`rounded-2xl border p-5 ${currentMode.tone}`}>
          <p className="text-xs uppercase tracking-[0.2em]">추천 대응 모드</p>
          <p className="mt-2 text-xl font-semibold">{currentMode.label}</p>
          <p className="mt-2 text-sm text-current/80">{currentMode.tip}</p>
          {profile ? (
            <p className="mt-3 text-xs text-current/70">
              온보딩 기반: LONG {profile.long_count} · SHORT {profile.short_count} · HOLD {profile.hold_count}
            </p>
          ) : (
            <p className="mt-3 text-xs text-current/70">온보딩 프로필이 없습니다. 테스트 후 더 정확한 브리핑을 제공합니다.</p>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">시장 상태</p>
            <p className="mt-2 text-lg font-semibold text-amber-200">변동성 상승</p>
            <p className="mt-1 text-xs text-neutral-400">최근 1시간 기준 체결 집중 구간 감지</p>
          </article>
          <article className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">과거 유사상황</p>
            <p className="mt-2 text-lg font-semibold text-sky-200">3건 발견</p>
            <p className="mt-1 text-xs text-neutral-400">평균 4시간 내 변동 확대 패턴</p>
          </article>
          <article className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">추천 액션</p>
            <p className="mt-2 text-lg font-semibold text-emerald-200">조건부 진입</p>
            <p className="mt-1 text-xs text-neutral-400">손절 기준 확정 후 실행</p>
          </article>
        </section>

        <section className="flex flex-wrap gap-2">
          <Link href="/chart" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
            차트 열기
          </Link>
          <Link href="/review" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200">
            과거 대응 복기
          </Link>
          <Link href="/onboarding/test" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200">
            온보딩 테스트 다시하기
          </Link>
        </section>
      </div>
    </div>
  )
}

