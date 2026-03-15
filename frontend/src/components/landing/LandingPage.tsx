'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const tgBotUrl = 'https://t.me/kifu_main_bot'

function GradientMesh() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Animated gradient orbs */}
            <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-[#6366f1]/30 blur-[120px] animate-blob" />
            <div className="absolute -top-[20%] -right-[20%] w-[70%] h-[70%] rounded-full bg-[#06b6d4]/20 blur-[120px] animate-blob animation-delay-2000" />
            <div className="absolute -bottom-[40%] left-[20%] w-[60%] h-[60%] rounded-full bg-[#8b5cf6]/25 blur-[120px] animate-blob animation-delay-4000" />
            {/* Grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />
        </div>
    )
}

function TelegramMockup() {
    const [step, setStep] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setStep((s) => (s + 1) % 5)
        }, 2500)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="relative w-full max-w-[340px]">
            {/* Phone frame */}
            <div className="rounded-[2.5rem] border border-white/10 bg-[#0e1621] p-1 shadow-2xl shadow-indigo-500/10">
                {/* Notch */}
                <div className="relative rounded-[2.2rem] bg-[#17212b] overflow-hidden">
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-6 py-3 text-[10px] text-white/50">
                        <span>9:41</span>
                        <div className="flex gap-1">
                            <div className="w-3.5 h-2 rounded-sm border border-white/30" />
                        </div>
                    </div>

                    {/* Chat header */}
                    <div className="flex items-center gap-3 border-b border-white/5 px-4 pb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">K</div>
                        <div>
                            <p className="text-xs font-semibold text-white">kifu bot</p>
                            <p className="text-[10px] text-white/40">online</p>
                        </div>
                    </div>

                    {/* Chat messages */}
                    <div className="h-[380px] px-3 py-4 space-y-3 overflow-hidden">
                        {/* Alert message */}
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

                        {/* Reason question */}
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

                        {/* Stop loss */}
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

                        {/* Completion */}
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

            {/* Glow effect behind phone */}
            <div className="absolute -inset-4 -z-10 rounded-[3rem] bg-gradient-to-b from-indigo-500/20 via-transparent to-cyan-500/20 blur-xl" />
        </div>
    )
}

function FeatureCard({ icon, title, desc, gradient }: { icon: string; title: string; desc: string; gradient: string }) {
    return (
        <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.06]">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-lg`}>
                {icon}
            </div>
            <h4 className="mt-4 text-[15px] font-semibold text-white">{title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-white/50">{desc}</p>
            {/* Hover glow */}
            <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${gradient} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-10 -z-10`} />
        </div>
    )
}

function StepNumber({ n }: { n: number }) {
    return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-xs font-bold text-white shadow-lg shadow-indigo-500/25">
            {n}
        </div>
    )
}

export function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
            {/* Nav */}
            <nav className="fixed top-0 z-50 w-full">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">KIFU</span>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">로그인</Link>
                        <Link
                            href="/register"
                            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#0a0a0f] hover:bg-white/90 transition-colors"
                        >
                            무료 시작
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative min-h-screen overflow-hidden">
                <GradientMesh />
                <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-16 px-6 pt-32 pb-20 lg:grid-cols-[1.2fr_0.8fr] lg:pt-40">
                    {/* Left: Copy */}
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 backdrop-blur-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            얼리 액세스 무료
                        </div>

                        <h1 className="mt-8 text-5xl font-bold leading-[1.1] tracking-tight md:text-7xl">
                            매매 복기를
                            <br />
                            <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                                자동화하세요
                            </span>
                        </h1>

                        <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/50">
                            알림이 오면 텔레그램에서 버튼 3번.
                            <br />
                            매수 이유와 손절가를 기록하고,
                            <br />
                            실제 거래와 자동으로 비교합니다.
                        </p>

                        <div className="mt-10 flex flex-wrap gap-4">
                            <a
                                href={tgBotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:scale-[1.02]"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                                텔레그램으로 시작
                            </a>
                            <Link
                                href="/register"
                                className="inline-flex items-center rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:border-white/30 hover:text-white"
                            >
                                웹에서 시작
                            </Link>
                        </div>

                        <div className="mt-12 flex items-center gap-8 text-sm text-white/30">
                            <span>Binance</span>
                            <span className="h-3 w-px bg-white/10" />
                            <span>Upbit</span>
                            <span className="h-3 w-px bg-white/10" />
                            <span>Telegram</span>
                        </div>
                    </div>

                    {/* Right: Telegram mockup */}
                    <div className="flex justify-center lg:justify-end">
                        <TelegramMockup />
                    </div>
                </div>
            </section>

            {/* Stats bar */}
            <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                <div className="mx-auto flex max-w-4xl items-center justify-around py-8">
                    {[
                        { value: '15초', label: '복기 완료 시간' },
                        { value: '3번', label: '버튼 클릭' },
                        { value: '자동', label: '실거래 비교' },
                    ].map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent md:text-3xl">{stat.value}</p>
                            <p className="mt-1 text-xs text-white/30">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="relative py-32">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="text-center">
                        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">How it works</p>
                        <h2 className="mt-4 text-4xl font-bold md:text-5xl">
                            알림 한 번에
                            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"> 복기 완료</span>
                        </h2>
                    </div>

                    <div className="mt-20 grid gap-12 md:grid-cols-3">
                        {[
                            {
                                step: 1,
                                title: '알림 수신',
                                desc: '설정한 가격에 도달하면 텔레그램으로 즉시 알림. 매수/패스를 선택합니다.',
                            },
                            {
                                step: 2,
                                title: '이유 기록',
                                desc: '왜 이 판단을 했는지 버튼으로 선택. 지표, 뉴스, FOMO — 솔직하게.',
                            },
                            {
                                step: 3,
                                title: '자동 비교',
                                desc: '실제 거래와 매칭해서 계획 vs 결과를 보여줍니다. 패턴이 숫자로 보입니다.',
                            },
                        ].map((item) => (
                            <div key={item.step} className="relative">
                                <StepNumber n={item.step} />
                                <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-white/40">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="relative py-32">
                {/* Subtle gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.03] to-transparent" />

                <div className="relative mx-auto max-w-5xl px-6">
                    <div className="text-center">
                        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Features</p>
                        <h2 className="mt-4 text-4xl font-bold md:text-5xl">
                            복기에 필요한
                            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent"> 모든 것</span>
                        </h2>
                    </div>

                    <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <FeatureCard
                            icon="💬"
                            title="텔레그램 복기 봇"
                            desc="알림 → 매수/패스 → 이유 → 손절가. 15초면 끝납니다."
                            gradient="from-[#2AABEE]/20 to-[#229ED9]/20"
                        />
                        <FeatureCard
                            icon="🔄"
                            title="자동 거래 매칭"
                            desc="기록한 계획을 실제 Binance 거래와 자동 비교합니다."
                            gradient="from-emerald-500/20 to-cyan-500/20"
                        />
                        <FeatureCard
                            icon="📊"
                            title="패턴 분석"
                            desc="FOMO로 5번 매수, 평균 -3.2%. 자신의 패턴을 숫자로 봅니다."
                            gradient="from-indigo-500/20 to-purple-500/20"
                        />
                        <FeatureCard
                            icon="🔔"
                            title="가격 알림"
                            desc="조건 도달 시 텔레그램 알림과 함께 복기가 자동 시작됩니다."
                            gradient="from-amber-500/20 to-orange-500/20"
                        />
                        <FeatureCard
                            icon="🤖"
                            title="멀티 AI 비교"
                            desc="OpenAI, Claude, Gemini 의견을 나란히 비교합니다."
                            gradient="from-purple-500/20 to-pink-500/20"
                        />
                        <FeatureCard
                            icon="📈"
                            title="거래소 연동"
                            desc="Binance Futures/Spot, Upbit API로 자동 수집합니다."
                            gradient="from-rose-500/20 to-red-500/20"
                        />
                    </div>
                </div>
            </section>

            {/* Comparison */}
            <section className="relative py-32">
                <div className="mx-auto max-w-4xl px-6">
                    <div className="text-center">
                        <h2 className="text-4xl font-bold md:text-5xl">
                            엑셀은
                            <span className="text-white/20"> 그만</span>
                        </h2>
                        <p className="mt-4 text-lg text-white/40">기록이 귀찮으면 안 하게 됩니다. 그래서 15초로 만들었습니다.</p>
                    </div>

                    <div className="mt-16 grid gap-6 md:grid-cols-2">
                        {/* Before */}
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                            <p className="text-xs font-semibold uppercase tracking-widest text-white/20">기존</p>
                            <ul className="mt-6 space-y-4">
                                {[
                                    '매매 후 까먹음',
                                    '같은 실수 반복',
                                    '엑셀 쓰다 포기',
                                    'FOMO인지 확신인지 구분 불가',
                                ].map((item) => (
                                    <li key={item} className="flex items-center gap-3 text-sm text-white/30">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5 text-[10px] text-white/20">✕</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* After */}
                        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] to-cyan-500/[0.04] p-8">
                            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">KIFU</p>
                            <ul className="mt-6 space-y-4">
                                {[
                                    '알림 오면 15초 만에 기록',
                                    '실수 패턴이 숫자로 보임',
                                    '버튼만 누르면 돼서 지속 가능',
                                    '계획 vs 실제 자동 비교',
                                ].map((item) => (
                                    <li key={item} className="flex items-center gap-3 text-sm text-white/60">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 text-[10px] text-white">✓</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="relative py-32">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px]" />
                </div>

                <div className="relative mx-auto max-w-3xl px-6 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300">
                        모든 기능 무료
                    </div>

                    <h2 className="mt-8 text-4xl font-bold md:text-5xl">
                        지금 시작하세요
                    </h2>
                    <p className="mt-4 text-lg text-white/40">
                        얼리 액세스 기간 동안 모든 기능을 무료로 사용할 수 있습니다.
                    </p>

                    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <a
                            href={tgBotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-8 py-4 text-sm font-semibold text-white transition-all hover:shadow-[0_0_50px_rgba(99,102,241,0.4)] hover:scale-[1.02]"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                            텔레그램으로 시작
                        </a>
                        <Link
                            href="/register"
                            className="inline-flex items-center rounded-full border border-white/15 px-8 py-4 text-sm font-semibold text-white/70 transition-all hover:border-white/30 hover:text-white"
                        >
                            웹에서 가입
                        </Link>
                    </div>

                    {/* Feature pills */}
                    <div className="mt-12 flex flex-wrap justify-center gap-3">
                        {['텔레그램 복기 봇', '자동 거래 매칭', '패턴 분석', '가격 알림', 'AI 의견 비교', '거래소 연동'].map((f) => (
                            <span key={f} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-xs text-white/30">
                                {f}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/[0.06] py-12">
                <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
                    <span className="text-sm font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">KIFU</span>
                    <p className="text-xs text-white/20">&copy; 2026 KIFU. 매매 복기를 습관으로.</p>
                </div>
            </footer>
        </div>
    )
}
