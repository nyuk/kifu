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
  const tgBotUrl = 'https://t.me/kifu_main_bot'

  return (
    <div className="min-h-screen bg-neutral-950 px-4 text-neutral-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center">
        <div className="w-full space-y-6">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">시작하기</p>
            <h1 className="text-3xl font-semibold">어떻게 시작할까요?</h1>
            <p className="text-sm text-neutral-400">
              추천: 텔레그램 봇으로 시작하면 15초 만에 첫 복기를 체험할 수 있습니다.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            {/* Option A: Telegram - 추천 */}
            <article className="rounded-2xl border border-[#2AABEE]/40 bg-[#2AABEE]/10 p-5 relative">
              <div className="absolute -top-2.5 left-4 rounded-full bg-[#2AABEE] px-2 py-0.5 text-[10px] font-bold text-white">
                추천
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#2AABEE]/80">Option A</p>
              <h2 className="mt-2 text-xl font-semibold">텔레그램 복기 봇</h2>
              <p className="mt-2 text-sm text-neutral-300">
                가입 없이 바로 시작. 버튼 3번으로 매매 복기를 기록합니다.
              </p>
              <div className="mt-4">
                <a
                  href={tgBotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2AABEE] px-4 py-2 text-sm font-semibold text-white hover:bg-[#229ED9] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  텔레그램 시작
                </a>
              </div>
            </article>

            {/* Option B: API 연동 */}
            <article className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Option B</p>
              <h2 className="mt-2 text-xl font-semibold">거래소 API 연결</h2>
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

            {/* Option C: 둘러보기 */}
            <article className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Option C</p>
              <h2 className="mt-2 text-xl font-semibold">먼저 둘러보기</h2>
              <p className="mt-2 text-sm text-neutral-300">
                게스트 모드로 주요 기능을 먼저 살펴봅니다.
              </p>
              <div className="mt-4">
                <Link href="/guest?mode=preview" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200">
                  게스트 입장
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
