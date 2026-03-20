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
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">시작하기</p>
            <h1 className="text-3xl font-semibold">어떻게 시작할까요?</h1>
            <p className="text-sm text-neutral-400">
              기본 흐름은 웹 계정과 설정입니다. 가입이 부담스럽다면 게스트로 먼저 둘러볼 수 있습니다.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            {/* Option A: Guest preview */}
            <article className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Option A</p>
              <h2 className="mt-2 text-xl font-semibold">게스트로 먼저 둘러보기</h2>
              <p className="mt-2 text-sm text-neutral-300">
                실제 계정 생성 전에 홈, 차트, 복기 흐름을 더미 데이터로 먼저 확인할 수 있습니다.
              </p>
              <div className="mt-4">
                <Link
                  href="/guest?mode=preview"
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 hover:border-neutral-500 transition-colors"
                >
                  게스트 입장
                </Link>
              </div>
            </article>

            {/* Option B: API 연동 */}
            <article className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 relative">
              <div className="absolute -top-2.5 left-4 rounded-full bg-sky-400 px-2 py-0.5 text-[10px] font-bold text-neutral-950">
                기본
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Option B</p>
              <h2 className="mt-2 text-xl font-semibold">웹 계정 + 거래소/API 연결</h2>
              <p className="mt-2 text-sm text-neutral-300">
                Binance/Upbit API로 거래내역을 자동 수집하고 차트에서 복기합니다.
              </p>
              <div className="mt-4">
                {authed ? (
                  <Link href="/settings" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
                    설정에서 연결
                  </Link>
                ) : (
                  <Link href="/register?next=%2Fsettings" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
                    회원가입 후 연결
                  </Link>
                )}
              </div>
            </article>

            {/* Option C: existing account */}
            <article className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Option C</p>
              <h2 className="mt-2 text-xl font-semibold">이미 계정이 있다면</h2>
              <p className="mt-2 text-sm text-neutral-300">
                기존 웹 계정으로 로그인해서 바로 홈과 설정 흐름으로 들어갈 수 있습니다.
              </p>
              <div className="mt-4">
                <Link href="/login" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200">
                  로그인
                </Link>
              </div>
            </article>
          </section>

          <p className="text-center text-xs text-neutral-600">
            이미 계정이 있나요? <Link href="/login" className="text-neutral-400 hover:text-neutral-200">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
