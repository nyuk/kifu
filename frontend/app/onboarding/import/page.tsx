'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { isGuestSession } from '../../../src/lib/guestSession'
import { useAuthStore } from '../../../src/stores/auth'

export default function OnboardingImportPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const guestMode = isGuestSession()
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
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Import Onboarding</p>
          <h1 className="text-3xl font-semibold">내 거래 불러오기</h1>
          <p className="text-sm text-neutral-400">
            Settings에서 API 연결 또는 CSV 업로드를 하면 차트, 복기, 포트폴리오가 바로 채워집니다.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Step 1</p>
            <h2 className="mt-2 text-lg font-semibold">거래소 연결</h2>
            <p className="mt-1 text-xs text-neutral-400">Settings에서 바이낸스/업비트 API 또는 거래 CSV 업로드</p>
          </article>
          <article className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Step 2</p>
            <h2 className="mt-2 text-lg font-semibold">지금 동기화</h2>
            <p className="mt-1 text-xs text-neutral-400">최근 거래를 자동으로 가져옵니다</p>
          </article>
          <article className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Step 3</p>
            <h2 className="mt-2 text-lg font-semibold">서재 진입</h2>
            <p className="mt-1 text-xs text-neutral-400">오늘 스냅샷과 복기가 바로 활성화됩니다</p>
          </article>
        </section>

        <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/50 p-5">
          <div className="flex flex-wrap gap-2">
            {authed ? (
              <Link href="/settings" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
                Settings에서 API/CSV 시작
              </Link>
            ) : (
              <Link href="/register?next=%2Fsettings" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
                회원가입 후 Settings로 이동
              </Link>
            )}
            {guestMode ? (
              <Link href="/register?next=%2Fonboarding%2Ftest" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200">
                회원가입 후 3분 테스트
              </Link>
            ) : (
              <Link href="/onboarding/test" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200">
                나중에 하고 3분 테스트
              </Link>
            )}
          </div>
        </section>
      </div>
      </div>
    </div>
  )
}
