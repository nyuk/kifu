'use client'

import Link from 'next/link'

const tgBotUrl = 'https://t.me/kifu_main_bot'

const facts = [
  '현재는 텔레그램 계정으로 웹에 로그인하는 기능이 없습니다.',
  '텔레그램에서 시작한 사용자는 지금처럼 텔레그램 안에서 계속 사용할 수 있습니다.',
  'telegram-only 계정의 웹 claim, merge, import는 아직 v1 범위 밖입니다.',
]

export default function TelegramReturnPage() {
  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12 text-neutral-100">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-4xl items-center justify-center">
        <div className="w-full space-y-8">
          <header className="space-y-4 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-[#2AABEE]/80">Telegram Return Guide</p>
            <h1 className="text-3xl font-semibold md:text-5xl">이미 텔레그램에서 시작했나요?</h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-neutral-400 md:text-base">
              괜찮습니다. 다만 현재 제품 구조에서는 텔레그램과 웹 로그인이 같은 계정 흐름이 아닙니다.
              <br />
              그래서 지금 가능한 행동과 아직 없는 기능을 분리해서 안내합니다.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">현재 상태</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-300">
                {facts.map((fact) => (
                  <li key={fact} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                    {fact}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-[#2AABEE]/30 bg-[#2AABEE]/10 p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2AABEE]/90">추천 행동</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">지금은 웹 계정을 새로 만드는 쪽이 더 현실적입니다</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                현재 텔레그램 시작은 첫 체험용에 가깝습니다. 웹 대시보드와 설정을 쓰려면 웹 계정을 따로 시작하는 쪽이 더 명확합니다.
              </p>
              <div className="mt-6 space-y-3">
                <Link
                  href="/register"
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
                >
                  웹 계정 따로 만들기
                </Link>
                <a
                  href={tgBotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
                >
                  텔레그램 데모 계속 보기
                </a>
              </div>
            </article>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">중요한 안내</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <h3 className="text-sm font-semibold text-white">이 페이지가 말해주는 것</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  텔레그램은 지금 v1에서 웹 로그인이 아니라, 웹 로그인 없이 바로 시작하는 채널입니다.
                </p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <h3 className="text-sm font-semibold text-white">아직 없는 기능</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  텔레그램-first 기록을 웹 대시보드로 자동 가져오는 기능은 아직 지원하지 않습니다.
                </p>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
