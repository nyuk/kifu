'use client'

import Link from 'next/link'

const tgBotUrl = 'https://t.me/kifu_main_bot'

const steps = [
  {
    label: 'Step 1',
    title: '텔레그램 봇 열기',
    description: '아래 버튼으로 KIFU 텔레그램 봇을 엽니다. 웹 회원가입 없이 바로 시작할 수 있습니다.',
  },
  {
    label: 'Step 2',
    title: 'Telegram에서 Start 누르기',
    description: '봇이 열리면 Start를 눌러주세요. 텔레그램 안에서 바로 첫 체험 흐름이 시작됩니다.',
  },
  {
    label: 'Step 3',
    title: '첫 테스트 복기 1회 완료',
    description: '자동으로 시작되는 첫 테스트 복기를 끝내면 시작 완료입니다. 웹 연결은 나중에 해도 됩니다.',
  },
]

const faqs = [
  {
    question: '웹 회원가입 없이 시작할 수 있나요?',
    answer: '네. 텔레그램에서 바로 시작할 수 있습니다. 웹 계정은 나중에 별도로 만들 수 있습니다.',
  },
  {
    question: '시작하고 나서 꼭 웹으로 돌아와야 하나요?',
    answer: '아니요. 첫 체험은 텔레그램 안에서 끝내도 됩니다. 웹은 대시보드나 연결 설정이 필요할 때만 오면 됩니다.',
  },
  {
    question: '나중에 웹 대시보드와 연결할 수 있나요?',
    answer: '현재는 텔레그램-first 기록을 웹 대시보드로 가져오는 기능이 없습니다. 이 페이지는 텔레그램 안에서 바로 시작하는 흐름만 안내합니다.',
  },
]

export default function TelegramOnboardingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12 text-neutral-100">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full space-y-8">
          <section className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Experimental Path</p>
            <p className="mt-2 text-sm leading-relaxed text-amber-100">
              이 경로는 첫 테스트 복기만 빠르게 보여주는 실험용 입구입니다. 실제 사용 중심은 웹 계정과 설정 흐름입니다.
            </p>
          </section>

          <header className="space-y-4 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-[#2AABEE]/80">Telegram Quick Start</p>
            <h1 className="text-3xl font-semibold md:text-5xl">텔레그램 데모 체험</h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-neutral-400 md:text-base">
              필요한 행동은 세 가지뿐입니다. 봇 열기, Start 누르기, 첫 테스트 복기 1회 완료.
              <br />
              첫 테스트 복기를 끝내면 데모 체험은 완료입니다. 실제 사용은 웹 계정과 설정 흐름이 기준입니다.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2AABEE]">{step.label}</p>
                <h2 className="mt-3 text-xl font-semibold text-white">{step.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">{step.description}</p>
              </article>
            ))}
          </section>

          <section className="rounded-3xl border border-[#2AABEE]/30 bg-[#2AABEE]/10 p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2AABEE]/90">Start Here</p>
                <h2 className="text-2xl font-semibold text-white">텔레그램에서 바로 체험하기</h2>
                <p className="max-w-xl text-sm leading-relaxed text-neutral-300">
                  plain bot 링크로 이동합니다. 일반 온보딩에서는 계정 연결용 start code를 붙이지 않습니다.
                </p>
              </div>
              <a
                href={tgBotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2AABEE] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#229ED9]"
              >
                텔레그램 봇 열기
              </a>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">Success 기준</p>
              <h2 className="mt-3 text-xl font-semibold text-white">첫 테스트 복기 완료 = 데모 체험 완료</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-400">
                <li>웹으로 돌아오지 않아도 데모 체험은 끝납니다.</li>
                <li>현재 v1에서는 텔레그램-first 기록을 웹으로 자동 가져오는 기능이 없습니다.</li>
                <li>실제 사용은 웹에서 알림/설정을 준비한 뒤 텔레그램을 연결하는 흐름이 더 현실적입니다.</li>
              </ul>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">권장 다음 행동</p>
              <div className="mt-4 space-y-3">
                <Link
                  href="/register"
                  className="block rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-400/15"
                >
                  웹 계정 만들기
                  <span className="mt-1 block text-xs font-normal text-neutral-300">실제 사용 중심 흐름으로 시작하려면</span>
                </Link>
                <Link
                  href="/onboarding/telegram/return"
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]"
                >
                  이미 텔레그램에서 시작했나요?
                  <span className="mt-1 block text-xs font-normal text-neutral-500">웹으로 돌아왔을 때 지금 가능한 행동을 안내합니다</span>
                </Link>
                <Link
                  href="/login"
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]"
                >
                  기존 계정으로 로그인
                  <span className="mt-1 block text-xs font-normal text-neutral-500">이미 웹 계정이 있다면 바로 이어서 사용</span>
                </Link>
              </div>
            </article>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">FAQ</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {faqs.map((faq) => (
                <article key={faq.question} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <h3 className="text-sm font-semibold text-white">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
