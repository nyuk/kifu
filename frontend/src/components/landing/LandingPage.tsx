'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const tgBotUrl = 'https://t.me/kifu_main_bot'

function TelegramMockup() {
    const [step, setStep] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setStep((s) => (s + 1) % 5)
        }, 2500)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="relative w-full max-w-[320px]">
            <div className="rounded-[2.5rem] border border-neutral-200 bg-[#0e1621] p-1 shadow-2xl">
                <div className="relative rounded-[2.2rem] bg-[#17212b] overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-3 text-[10px] text-white/50">
                        <span>9:41</span>
                        <div className="flex gap-1">
                            <div className="w-3.5 h-2 rounded-sm border border-white/30" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 border-b border-white/5 px-4 pb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">K</div>
                        <div>
                            <p className="text-xs font-semibold text-white">kifu bot</p>
                            <p className="text-[10px] text-white/40">online</p>
                        </div>
                    </div>

                    <div className="h-[360px] px-3 py-4 space-y-3 overflow-hidden">
                        <div className={`transition-all duration-500 ${step >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-[#212d3b] px-3 py-2.5">
                                <p className="text-[11px] text-white/90 font-medium">BTCUSDT $95,000 도달</p>
                                <p className="mt-1 text-[11px] text-white/60">매수할 건가요?</p>
                                <div className="mt-2 flex gap-1.5">
                                    <span className={`rounded-md px-3 py-1 text-[10px] font-medium transition-all duration-300 ${step >= 1 ? 'bg-emerald-500 text-white' : 'bg-[#2b5278] text-[#6ab2f2]'}`}>매수한다</span>
                                    <span className="rounded-md bg-[#2b5278] px-3 py-1 text-[10px] font-medium text-[#6ab2f2]">안 한다</span>
                                </div>
                            </div>
                        </div>

                        <div className={`transition-all duration-500 delay-100 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-[#212d3b] px-3 py-2.5">
                                <p className="text-[11px] text-white/60">왜 매수하나요?</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-all duration-300 ${step >= 3 ? 'bg-indigo-500 text-white' : 'bg-[#2b5278] text-[#6ab2f2]'}`}>지표 도달</span>
                                    <span className="rounded-md bg-[#2b5278] px-2.5 py-1 text-[10px] font-medium text-[#6ab2f2]">뉴스</span>
                                    <span className="rounded-md bg-[#2b5278] px-2.5 py-1 text-[10px] font-medium text-[#6ab2f2]">FOMO</span>
                                </div>
                            </div>
                        </div>

                        <div className={`transition-all duration-500 delay-200 ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-[#212d3b] px-3 py-2.5">
                                <p className="text-[11px] text-white/60">손절가를 입력하세요:</p>
                            </div>
                            <div className="flex justify-end mt-1.5">
                                <div className="rounded-xl rounded-tr-sm bg-[#2b5278] px-3 py-2">
                                    <p className="text-[11px] text-white/90">90000</p>
                                </div>
                            </div>
                        </div>

                        <div className={`transition-all duration-500 delay-300 ${step >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <div className="max-w-[90%] rounded-xl rounded-tl-sm bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 px-3 py-2.5">
                                <p className="text-[11px] font-semibold text-emerald-400">거래 계획 저장 완료!</p>
                                <div className="mt-1.5 space-y-0.5 text-[10px] text-white/50">
                                    <p>BTCUSDT · $95,000 · 손절 $90,000</p>
                                    <p>이유: 지표 도달</p>
                                </div>
                                <p className="mt-1.5 text-[9px] text-white/30">실제 거래와 자동 비교됩니다</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-b from-indigo-200/40 via-transparent to-cyan-200/30 blur-2xl" />
        </div>
    )
}

export function LandingPage() {
    return (
        <div className="min-h-screen bg-white text-neutral-900 antialiased">
            {/* Nav */}
            <nav className="fixed top-0 z-50 w-full border-b border-neutral-100 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <span className="text-lg font-bold tracking-wide text-indigo-600">KIFU</span>
                    <div className="flex items-center gap-6 text-sm text-neutral-500">
                        <Link href="#how" className="hidden sm:block hover:text-neutral-900 transition-colors">사용법</Link>
                        <Link href="#features" className="hidden sm:block hover:text-neutral-900 transition-colors">기능</Link>
                        <Link href="/login" className="hover:text-neutral-900 transition-colors">로그인</Link>
                        <Link
                            href="/register"
                            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                        >
                            무료 시작
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative min-h-screen overflow-hidden">
                {/* Light gradient mesh */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-[30%] -left-[15%] w-[70%] h-[70%] rounded-full bg-indigo-100/60 blur-[100px] animate-blob" />
                    <div className="absolute -top-[10%] -right-[15%] w-[60%] h-[60%] rounded-full bg-cyan-100/50 blur-[100px] animate-blob animation-delay-2000" />
                    <div className="absolute -bottom-[30%] left-[20%] w-[50%] h-[50%] rounded-full bg-violet-100/40 blur-[100px] animate-blob animation-delay-4000" />
                </div>

                <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-16 px-6 pt-32 pb-20 lg:grid-cols-[1.2fr_0.8fr] lg:pt-40">
                    {/* Left: Copy */}
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700">
                            얼리 액세스 무료
                        </div>

                        <h1 className="mt-8 text-4xl font-bold leading-tight text-neutral-900 md:text-6xl">
                            매매했으면
                            <br />
                            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 bg-clip-text text-transparent">
                                15초만 복기하세요
                            </span>
                        </h1>

                        <p className="mt-6 max-w-lg text-lg leading-relaxed text-neutral-500">
                            텔레그램에서 버튼 3번이면 끝.
                            <br />
                            매수 이유, 손절가를 기록하고, 실제 거래와 자동 비교합니다.
                        </p>

                        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                            <a
                                href={tgBotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#2AABEE] px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#229ED9] hover:shadow-lg hover:shadow-[#2AABEE]/30"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                                텔레그램으로 시작
                            </a>
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-8 py-3.5 text-sm font-semibold text-neutral-700 transition-all hover:border-neutral-400 hover:bg-neutral-50"
                            >
                                웹에서 시작
                            </Link>
                        </div>

                        <p className="mt-4 text-xs text-neutral-400">
                            가입 없이 텔레그램에서 바로 체험 가능
                        </p>

                        <div className="mt-12 grid grid-cols-3 gap-8 text-center">
                            {[
                                { value: '15초', label: '복기 완료' },
                                { value: '버튼 3번', label: '기록 끝' },
                                { value: '자동', label: '실거래 비교' },
                            ].map((stat) => (
                                <div key={stat.label}>
                                    <p className="text-2xl font-bold text-indigo-600 md:text-3xl">{stat.value}</p>
                                    <p className="mt-1 text-xs text-neutral-400">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Telegram mockup */}
                    <div className="flex justify-center lg:justify-end">
                        <TelegramMockup />
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how" className="border-t border-neutral-100 bg-neutral-50 py-24">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="text-center mb-16">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">HOW IT WORKS</p>
                        <h2 className="mt-3 text-3xl font-bold text-neutral-900 md:text-4xl">
                            알림 오면, 복기 시작
                        </h2>
                        <p className="mt-4 text-neutral-500 max-w-xl mx-auto">
                            가격 알림이 울리면 텔레그램 봇이 자동으로 복기를 시작합니다.
                        </p>
                    </div>

                    {/* Telegram flow mockup - static version */}
                    <div className="mx-auto max-w-sm space-y-4">
                        {/* Bot message 1 */}
                        <div className="rounded-2xl rounded-tl-md border border-neutral-200 bg-white p-4 shadow-sm">
                            <p className="text-xs text-neutral-400 mb-2">kifu bot</p>
                            <p className="text-sm text-neutral-800">
                                <span className="font-semibold">BTCUSDT</span> $95,000 도달
                            </p>
                            <p className="mt-2 text-sm text-neutral-600">이 알림을 보고 매수할 건가요?</p>
                            <div className="mt-3 flex gap-2">
                                <span className="rounded-lg bg-emerald-100 border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700">매수한다</span>
                                <span className="rounded-lg bg-neutral-100 border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-500">안 한다</span>
                            </div>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center justify-center gap-2 text-neutral-400">
                            <div className="h-px w-8 bg-neutral-200" />
                            <span className="text-xs">5초</span>
                            <div className="h-px w-8 bg-neutral-200" />
                        </div>

                        {/* Bot message 2 */}
                        <div className="rounded-2xl rounded-tl-md border border-neutral-200 bg-white p-4 shadow-sm">
                            <p className="text-xs text-neutral-400 mb-2">kifu bot</p>
                            <p className="text-sm text-neutral-600">왜 매수하나요?</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-lg bg-indigo-100 border border-indigo-200 px-3 py-1.5 text-xs text-indigo-700">지표 도달</span>
                                <span className="rounded-lg bg-indigo-100 border border-indigo-200 px-3 py-1.5 text-xs text-indigo-700">트위터/뉴스</span>
                                <span className="rounded-lg bg-amber-100 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">FOMO</span>
                                <span className="rounded-lg bg-neutral-100 border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500">직접 입력</span>
                            </div>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center justify-center gap-2 text-neutral-400">
                            <div className="h-px w-8 bg-neutral-200" />
                            <span className="text-xs">5초</span>
                            <div className="h-px w-8 bg-neutral-200" />
                        </div>

                        {/* Bot message 3 */}
                        <div className="rounded-2xl rounded-tl-md border border-neutral-200 bg-white p-4 shadow-sm">
                            <p className="text-xs text-neutral-400 mb-2">kifu bot</p>
                            <p className="text-sm text-neutral-600">손절가를 입력해주세요 (숫자만):</p>
                        </div>

                        {/* User response */}
                        <div className="flex justify-end">
                            <div className="rounded-2xl rounded-tr-md bg-indigo-50 border border-indigo-200 px-4 py-2">
                                <p className="text-sm text-neutral-800">90000</p>
                            </div>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center justify-center gap-2 text-neutral-400">
                            <div className="h-px w-8 bg-neutral-200" />
                            <span className="text-xs">5초</span>
                            <div className="h-px w-8 bg-neutral-200" />
                        </div>

                        {/* Completion */}
                        <div className="rounded-2xl rounded-tl-md border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-xs text-neutral-400 mb-2">kifu bot</p>
                            <p className="text-sm font-semibold text-emerald-700 mb-2">거래 계획 저장 완료!</p>
                            <div className="space-y-1 text-xs text-neutral-600">
                                <p>BTCUSDT</p>
                                <p>진입: $95,000</p>
                                <p>손절: $90,000</p>
                                <p>이유: 지표 도달</p>
                            </div>
                            <p className="mt-3 text-xs text-neutral-400">나중에 실제 거래와 자동 비교해드릴게요.</p>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <a
                            href={tgBotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-[#2AABEE] px-6 py-3 text-sm font-bold text-white hover:bg-[#229ED9] transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                            직접 체험하기
                        </a>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="border-t border-neutral-100 bg-white py-24">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="text-center mb-16">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">FEATURES</p>
                        <h2 className="mt-3 text-3xl font-bold text-neutral-900 md:text-4xl">
                            기록하고, 비교하고, 개선하세요
                        </h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[
                            {
                                icon: '💬',
                                title: '텔레그램 복기 봇',
                                desc: '알림이 오면 매수/패스 → 이유 → 손절가. 버튼 3번, 15초면 복기 완료.',
                                accent: 'border-[#2AABEE]/30 bg-[#2AABEE]/5',
                            },
                            {
                                icon: '🔄',
                                title: '자동 거래 매칭',
                                desc: '기록한 계획을 실제 Binance 거래와 자동 비교. 계획대로 했는지 알려줍니다.',
                                accent: 'border-emerald-300/50 bg-emerald-50',
                            },
                            {
                                icon: '📊',
                                title: '패턴 분석',
                                desc: '"이 종목에서 FOMO로 5번 매수, 평균 -3.2%." 자신의 패턴을 숫자로 봅니다.',
                                accent: 'border-cyan-300/50 bg-cyan-50',
                            },
                            {
                                icon: '🔔',
                                title: '가격 알림',
                                desc: '지정가 도달, MA 크로스 등 조건을 설정하면 텔레그램으로 알림 + 복기 시작.',
                                accent: 'border-amber-300/50 bg-amber-50',
                            },
                            {
                                icon: '🤖',
                                title: 'AI 의견 비교',
                                desc: 'OpenAI, Claude, Gemini에게 동시에 물어보고 의견을 나란히 비교합니다.',
                                accent: 'border-purple-300/50 bg-purple-50',
                            },
                            {
                                icon: '📈',
                                title: '거래소 연동',
                                desc: 'Binance Futures/Spot, Upbit API로 거래내역을 자동 수집합니다.',
                                accent: 'border-rose-300/50 bg-rose-50',
                            },
                        ].map((feature) => (
                            <div
                                key={feature.title}
                                className={`rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${feature.accent}`}
                            >
                                <span className="text-2xl">{feature.icon}</span>
                                <h4 className="mt-3 text-lg font-semibold text-neutral-900">{feature.title}</h4>
                                <p className="mt-2 text-sm text-neutral-500 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why kifu */}
            <section className="border-t border-neutral-100 bg-neutral-50 py-24">
                <div className="mx-auto max-w-4xl px-6">
                    <div className="text-center mb-16">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">WHY KIFU</p>
                        <h2 className="mt-3 text-3xl font-bold text-neutral-900 md:text-4xl">
                            예측을 팔지 않습니다
                        </h2>
                        <p className="mt-4 text-neutral-500 max-w-xl mx-auto">
                            매매 실력은 신호가 아니라 복기에서 나옵니다.
                            <br />
                            KIFU는 당신의 판단을 기록하고, 실수 패턴을 줄여줍니다.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                            <p className="text-sm font-semibold text-red-600 mb-3">기존 방식</p>
                            <ul className="space-y-2 text-sm text-neutral-500">
                                <li className="flex gap-2"><span className="text-red-400">✕</span> 매매 후 까먹음</li>
                                <li className="flex gap-2"><span className="text-red-400">✕</span> 같은 실수 반복</li>
                                <li className="flex gap-2"><span className="text-red-400">✕</span> 엑셀에 기록하다 포기</li>
                                <li className="flex gap-2"><span className="text-red-400">✕</span> FOMO인지 확신인지 구분 불가</li>
                            </ul>
                        </div>
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                            <p className="text-sm font-semibold text-emerald-600 mb-3">KIFU</p>
                            <ul className="space-y-2 text-sm text-neutral-600">
                                <li className="flex gap-2"><span className="text-emerald-500">✓</span> 알림 오면 15초 만에 기록</li>
                                <li className="flex gap-2"><span className="text-emerald-500">✓</span> 패턴이 숫자로 보임</li>
                                <li className="flex gap-2"><span className="text-emerald-500">✓</span> 텔레그램 버튼이라 귀찮지 않음</li>
                                <li className="flex gap-2"><span className="text-emerald-500">✓</span> 계획 vs 실제 자동 비교</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="border-t border-neutral-100 bg-white py-24">
                <div className="mx-auto max-w-3xl px-6 text-center">
                    <h2 className="text-3xl font-bold text-neutral-900">지금은 전부 무료</h2>
                    <p className="mt-4 text-neutral-500">
                        얼리 액세스 기간 동안 모든 기능을 무료로 사용할 수 있습니다.
                    </p>

                    <div className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-left">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Early Access</span>
                                <h3 className="mt-1 text-2xl font-bold text-neutral-900">무료</h3>
                            </div>
                            <span className="rounded-full bg-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">현재</span>
                        </div>
                        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                            {[
                                '텔레그램 복기 봇',
                                '자동 거래 매칭',
                                '패턴 분석',
                                '가격 알림',
                                'AI 의견 비교',
                                '거래소 연동 (Binance, Upbit)',
                            ].map((item) => (
                                <li key={item} className="flex items-center gap-2 text-sm text-neutral-600">
                                    <span className="text-emerald-500">✓</span> {item}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <a
                                href={tgBotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2AABEE] px-6 py-3 text-sm font-bold text-white hover:bg-[#229ED9] transition-colors"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                                텔레그램으로 시작
                            </a>
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                                웹에서 가입
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-neutral-100 bg-white py-12 text-center text-xs text-neutral-400">
                <p>&copy; 2026 KIFU. All rights reserved.</p>
                <p className="mt-2">매매 복기를 습관으로</p>
            </footer>
        </div>
    )
}
