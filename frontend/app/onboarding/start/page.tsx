'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../../../src/stores/auth'

export default function OnboardingStartPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const authed = mounted && isAuthenticated

  return (
    <div className="min-h-screen bg-neutral-950 px-4 text-neutral-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center">
        <div className="w-full space-y-6">
          <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Onboarding</p>
          <h1 className="text-3xl font-semibold">처음부터 시작</h1>
          <p className="text-sm text-neutral-400">
            시작 방식만 고르면 이후 흐름은 서비스가 맞춰줍니다.
          </p>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Option A</p>
            <h2 className="mt-2 text-xl font-semibold">회원가입 후 거래내역 불러오기</h2>
            <p className="mt-2 text-sm text-neutral-300">
              API/CSV로 기존 거래내역을 가져와 차트·복기·포트폴리오를 바로 채웁니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {authed ? (
                <Link href="/onboarding/import" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
                  거래내역 불러오기
                </Link>
              ) : (
                <Link href="/register?next=%2Fonboarding%2Fimport" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
                  회원가입 후 진행
                </Link>
              )}
            </div>
            </article>

            <article className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Option B</p>
            <h2 className="mt-2 text-xl font-semibold">회원가입 후 초기 성향 테스트</h2>
            <p className="mt-2 text-sm text-neutral-300">
              5문항(약 3분)으로 성향을 분석하고 오늘 루틴을 자동 추천합니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {authed ? (
                <Link href="/onboarding/test" className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-neutral-950">
                  초기 성향 테스트 시작
                </Link>
              ) : (
                <Link href="/register?next=%2Fonboarding%2Ftest" className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-neutral-950">
                  회원가입 후 진행
                </Link>
              )}
            </div>
            </article>
          </section>
        </div>
      </div>
    </div>
  )
}
