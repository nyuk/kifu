'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

function TelegramMockup({ compact = false }: { compact?: boolean }) {
    const [step, setStep] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setStep((s) => (s + 1) % 5)
        }, 2500)
        return () => clearInterval(timer)
    }, [])

    const height = compact ? 'h-[280px]' : 'h-[360px]'

    return (
        <div className="relative w-full max-w-[300px]">
            <div className="rounded-[2rem] border border-neutral-200 bg-[#0e1621] p-1 shadow-2xl">
                <div className="relative rounded-[1.8rem] bg-[#17212b] overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-[9px] font-bold text-white">K</div>
                        <div>
                            <p className="text-[11px] font-semibold text-white">kifu bot</p>
                            <p className="text-[9px] text-white/40">online</p>
                        </div>
                    </div>

                    <div className={`${height} px-3 py-3 space-y-2.5 overflow-hidden`}>
                        <div className={`transition-all duration-500 ${step >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-[#212d3b] px-3 py-2">
                                <p className="text-[11px] text-white/90 font-medium">BTCUSDT $95,000 도달</p>
                                <p className="mt-1 text-[10px] text-white/60">매수할 건가요?</p>
                                <div className="mt-2 flex gap-1.5">
                                    <span className={`rounded-md px-3 py-1 text-[10px] font-medium transition-all duration-300 ${step >= 1 ? 'bg-emerald-500 text-white' : 'bg-[#2b5278] text-[#6ab2f2]'}`}>매수한다</span>
                                    <span className="rounded-md bg-[#2b5278] px-3 py-1 text-[10px] font-medium text-[#6ab2f2]">안 한다</span>
                                </div>
                            </div>
                        </div>

                        <div className={`transition-all duration-500 delay-100 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-[#212d3b] px-3 py-2">
                                <p className="text-[10px] text-white/60">왜 매수하나요?</p>
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                    <span className={`rounded-md px-2 py-0.5 text-[9px] font-medium transition-all duration-300 ${step >= 3 ? 'bg-indigo-500 text-white' : 'bg-[#2b5278] text-[#6ab2f2]'}`}>지표 도달</span>
                                    <span className="rounded-md bg-[#2b5278] px-2 py-0.5 text-[9px] font-medium text-[#6ab2f2]">뉴스</span>
                                    <span className="rounded-md bg-[#2b5278] px-2 py-0.5 text-[9px] font-medium text-[#6ab2f2]">FOMO</span>
                                </div>
                            </div>
                        </div>

                        <div className={`transition-all duration-500 delay-200 ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <div className="max-w-[80%] rounded-xl rounded-tl-sm bg-[#212d3b] px-3 py-2">
                                <p className="text-[10px] text-white/60">손절가:</p>
                            </div>
                            <div className="flex justify-end mt-1">
                                <div className="rounded-xl rounded-tr-sm bg-[#2b5278] px-3 py-1.5">
                                    <p className="text-[10px] text-white/90">90000</p>
                                </div>
                            </div>
                        </div>

                        <div className={`transition-all duration-500 delay-300 ${step >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <div className="max-w-[90%] rounded-xl rounded-tl-sm bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 px-3 py-2">
                                <p className="text-[10px] font-semibold text-emerald-400">거래 계획 저장 완료!</p>
                                <div className="mt-1 space-y-0.5 text-[9px] text-white/50">
                                    <p>BTCUSDT · $95,000 · 손절 $90,000</p>
                                    <p>이유: 지표 도달</p>
                                </div>
                                <p className="mt-1 text-[8px] text-white/30">실제 거래와 자동 비교됩니다</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
    const [count, setCount] = useState(0)
    const ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    let start = 0
                    const duration = 1200
                    const step = target / (duration / 16)
                    const animate = () => {
                        start += step
                        if (start >= target) {
                            setCount(target)
                        } else {
                            setCount(Math.floor(start))
                            requestAnimationFrame(animate)
                        }
                    }
                    animate()
                    observer.disconnect()
                }
            },
            { threshold: 0.5 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [target])

    return <span ref={ref}>{count}{suffix}</span>
}

export function LandingPage() {
    return (
        <div className="min-h-screen bg-white text-neutral-900 antialiased overflow-x-hidden">
            {/* Minimal Nav — transparent, floating */}
            <nav className="fixed top-0 z-50 w-full">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                    <span className="text-lg font-bold tracking-wider text-neutral-900">KIFU</span>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">로그인</Link>
                        <Link
                            href="/register"
                            className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
                        >
                            웹에서 시작
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ─── HERO: Full-screen centered statement ─── */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
                {/* Subtle gradient orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] rounded-full bg-indigo-50 blur-[120px] animate-blob" />
                    <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-cyan-50 blur-[100px] animate-blob animation-delay-2000" />
                </div>

                <div className="relative z-10 text-center max-w-4xl">
                    <p className="text-sm font-medium tracking-[0.2em] text-indigo-500 uppercase mb-8">
                        Trading Review, Automated
                    </p>

                    <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-neutral-900 md:text-7xl lg:text-8xl">
                        매매했으면
                        <br />
                        <span className="bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
                            복기하세요
                        </span>
                    </h1>

                    <p className="mt-8 text-lg text-neutral-400 max-w-md mx-auto leading-relaxed md:text-xl">
                        웹에서 알림과 기록 흐름을 준비하고,
                        <br />
                        판단은 빠르게 남기세요.
                    </p>

                    <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <Link
                            href="/register"
                            className="group inline-flex items-center gap-2.5 rounded-full bg-neutral-900 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-neutral-800 hover:-translate-y-0.5"
                        >
                            웹에서 시작
                        </Link>
                        <Link
                            href="/guest?mode=preview"
                            className="group inline-flex items-center gap-2.5 rounded-full border border-neutral-300 bg-white px-8 py-4 text-sm font-bold text-neutral-900 transition-all hover:bg-neutral-50 hover:-translate-y-0.5"
                        >
                            게스트로 먼저 둘러보기
                            <span className="text-neutral-500 text-xs font-normal">빠른 미리보기</span>
                        </Link>
                    </div>
                    <p className="mt-4 text-xs text-neutral-400">
                        웹 계정으로 바로 시작하거나, 게스트 모드로 화면 흐름을 먼저 볼 수 있습니다.
                    </p>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-300">
                    <span className="text-[10px] tracking-widest uppercase">Scroll</span>
                    <div className="w-px h-8 bg-gradient-to-b from-neutral-300 to-transparent" />
                </div>
            </section>

            {/* ─── STATEMENT STRIP ─── */}
            <section className="border-y border-neutral-100 bg-neutral-950 py-20 md:py-28">
                <div className="mx-auto max-w-5xl px-6 text-center">
                    <p className="text-2xl font-light leading-relaxed text-white/80 md:text-4xl md:leading-relaxed">
                        &ldquo;왜 샀어?&rdquo; 라는 질문에
                        <br />
                        <span className="text-white font-semibold">3초 안에 대답</span>할 수 있나요?
                    </p>
                    <p className="mt-8 text-sm text-white/30 max-w-md mx-auto leading-relaxed">
                        대부분의 트레이더는 매매 이유를 기록하지 않습니다.
                        <br />
                        기록하지 않으면 같은 실수를 반복합니다.
                    </p>
                </div>
            </section>

            {/* ─── BENTO GRID: Product showcase ─── */}
            <section className="py-24 md:py-32">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="grid gap-4 md:grid-cols-12 md:grid-rows-[auto_auto_auto]">
                        {/* Large card: Telegram mockup — spans 7 cols, 2 rows */}
                        <div className="md:col-span-7 md:row-span-2 rounded-3xl border border-neutral-100 bg-gradient-to-br from-[#0e1621] to-[#1a2332] p-8 flex flex-col">
                            <div className="mb-6">
                                <span className="inline-block rounded-full bg-[#2AABEE]/10 px-3 py-1 text-[11px] font-semibold text-[#2AABEE] tracking-wide">TELEGRAM BOT</span>
                                <h3 className="mt-3 text-xl font-bold text-white">알림이 오면, 복기 시작</h3>
                                <p className="mt-2 text-sm text-white/40 leading-relaxed">
                                    가격 알림이 울리면 봇이 자동으로 물어봅니다.
                                    <br />
                                    매수/패스 → 이유 → 손절가. 끝.
                                </p>
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                                <TelegramMockup />
                            </div>
                        </div>

                        {/* Stats card — spans 5 cols */}
                        <div className="md:col-span-5 rounded-3xl border border-neutral-100 bg-neutral-50 p-8 flex flex-col justify-center">
                            <span className="text-[11px] font-semibold text-neutral-400 tracking-wide uppercase">소요 시간</span>
                            <div className="mt-6 space-y-6">
                                <div>
                                    <p className="text-5xl font-bold text-neutral-900 md:text-6xl">
                                        <CountUp target={15} suffix="초" />
                                    </p>
                                    <p className="mt-1 text-sm text-neutral-400">복기 완료까지</p>
                                </div>
                                <div className="h-px bg-neutral-200" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-2xl font-bold text-neutral-900">3번</p>
                                        <p className="mt-1 text-xs text-neutral-400">버튼 탭</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-neutral-900">0개</p>
                                        <p className="mt-1 text-xs text-neutral-400">입력 필드</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Auto-match card */}
                        <div className="md:col-span-5 rounded-3xl border border-emerald-100 bg-emerald-50/50 p-8">
                            <div className="flex items-start gap-4">
                                <div className="rounded-2xl bg-emerald-100 p-3">
                                    <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-neutral-900">자동 거래 매칭</h4>
                                    <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                                        기록한 계획을 Binance 실거래와 자동 비교.
                                        <br />
                                        계획대로 했는지, 결과가 어땠는지.
                                    </p>
                                </div>
                            </div>
                            {/* Mini comparison visual */}
                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-white p-3 border border-emerald-100">
                                    <p className="text-[10px] text-neutral-400 mb-1">계획</p>
                                    <p className="text-sm font-semibold text-neutral-800">BTC 매수 $95K</p>
                                    <p className="text-xs text-neutral-400">손절 $90K</p>
                                </div>
                                <div className="rounded-xl bg-white p-3 border border-emerald-100">
                                    <p className="text-[10px] text-neutral-400 mb-1">실제</p>
                                    <p className="text-sm font-semibold text-emerald-600">BTC 매수 $95.1K</p>
                                    <p className="text-xs text-emerald-500">+4.2%</p>
                                </div>
                            </div>
                        </div>

                        {/* Pattern analysis — wide */}
                        <div className="md:col-span-7 rounded-3xl border border-neutral-100 bg-white p-8">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="rounded-2xl bg-violet-100 p-3">
                                    <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-neutral-900">패턴이 숫자로 보입니다</h4>
                                    <p className="mt-1 text-sm text-neutral-500">나의 매매 습관을 데이터로 확인하세요.</p>
                                </div>
                            </div>
                            {/* Pattern visual */}
                            <div className="space-y-3">
                                {[
                                    { reason: 'FOMO', count: 12, winRate: 25, color: 'bg-red-400' },
                                    { reason: '지표 도달', count: 34, winRate: 68, color: 'bg-emerald-400' },
                                    { reason: '뉴스/트위터', count: 8, winRate: 38, color: 'bg-amber-400' },
                                ].map((p) => (
                                    <div key={p.reason} className="flex items-center gap-4">
                                        <span className="text-sm text-neutral-600 w-24 shrink-0">{p.reason}</span>
                                        <div className="flex-1 h-8 bg-neutral-50 rounded-lg overflow-hidden relative">
                                            <div
                                                className={`h-full ${p.color} rounded-lg transition-all duration-1000`}
                                                style={{ width: `${p.winRate}%` }}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                                                승률 {p.winRate}% · {p.count}건
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI opinions — narrow */}
                        <div className="md:col-span-5 rounded-3xl border border-neutral-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-8">
                            <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold text-violet-600 tracking-wide">AI OPINIONS</span>
                            <h4 className="mt-3 text-lg font-bold text-neutral-900">AI 3개에게 동시에 물어보기</h4>
                            <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                                OpenAI, Claude, Gemini가 같은 차트를 보고 각각 의견을 줍니다. 나중에 누가 맞았는지도 확인.
                            </p>
                            <div className="mt-6 space-y-2">
                                {[
                                    { name: 'GPT-4', opinion: '매수', confidence: '72%', color: 'border-emerald-200 bg-emerald-50' },
                                    { name: 'Claude', opinion: '관망', confidence: '65%', color: 'border-amber-200 bg-amber-50' },
                                    { name: 'Gemini', opinion: '매수', confidence: '58%', color: 'border-emerald-200 bg-emerald-50' },
                                ].map((ai) => (
                                    <div key={ai.name} className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${ai.color}`}>
                                        <span className="text-xs font-medium text-neutral-700">{ai.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-neutral-800">{ai.opinion}</span>
                                            <span className="text-[10px] text-neutral-400">{ai.confidence}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── BIG STATEMENT: "예측을 팔지 않습니다" ─── */}
            <section className="py-24 md:py-32 border-y border-neutral-100">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="grid gap-16 md:grid-cols-[1fr_1px_1fr] items-start">
                        <div>
                            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-6">기존 방식</p>
                            <ul className="space-y-4">
                                {[
                                    '매매 후 까먹음',
                                    '같은 실수 반복',
                                    '엑셀에 기록하다 포기',
                                    'FOMO인지 확신인지 구분 불가',
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-3 text-neutral-400">
                                        <span className="mt-0.5 text-red-300 text-lg leading-none">×</span>
                                        <span className="text-sm leading-relaxed">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="hidden md:block w-px bg-neutral-200 self-stretch" />

                        <div>
                            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-6">KIFU</p>
                            <ul className="space-y-4">
                                {[
                                    '알림 오면 15초 만에 기록',
                                    '패턴이 숫자로 보임',
                                    '텔레그램 버튼이라 귀찮지 않음',
                                    '계획 vs 실제 자동 비교',
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-3 text-neutral-700">
                                        <span className="mt-0.5 text-emerald-400 text-lg leading-none">→</span>
                                        <span className="text-sm leading-relaxed">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="mt-20 text-center">
                        <h2 className="text-3xl font-bold text-neutral-900 md:text-5xl">
                            예측을 팔지 않습니다
                        </h2>
                        <p className="mt-4 text-neutral-400 max-w-md mx-auto">
                            매매 실력은 신호가 아니라 복기에서 나옵니다.
                        </p>
                    </div>
                </div>
            </section>

            {/* ─── FEATURES STRIP: horizontal scroll on mobile ─── */}
            <section className="py-24 bg-neutral-50 border-b border-neutral-100">
                <div className="mx-auto max-w-6xl px-6">
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-[0.2em] mb-12">더 많은 기능</p>

                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible scrollbar-none">
                        {[
                            { icon: '🔔', title: '가격 알림', desc: '지정가, MA 크로스 등 조건 설정 → 텔레그램 알림 + 자동 복기' },
                            { icon: '📈', title: '거래소 연동', desc: 'Binance Futures/Spot, Upbit API 자동 수집' },
                            { icon: '📋', title: '포트폴리오', desc: '전체 포지션 현황과 타임라인 한눈에' },
                            { icon: '📄', title: '리포트', desc: 'Summary Pack으로 기간별 매매 성과 분석' },
                        ].map((f) => (
                            <div key={f.title} className="min-w-[240px] md:min-w-0 rounded-2xl bg-white border border-neutral-100 p-6 hover:border-neutral-200 hover:shadow-sm transition-all">
                                <span className="text-2xl">{f.icon}</span>
                                <h4 className="mt-3 text-sm font-bold text-neutral-900">{f.title}</h4>
                                <p className="mt-2 text-xs text-neutral-400 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA: Full-width dark ─── */}
            <section className="bg-neutral-950 py-24 md:py-32">
                <div className="mx-auto max-w-3xl px-6 text-center">
                    <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 mb-8">
                        얼리 액세스 — 전 기능 무료
                    </span>

                    <h2 className="text-3xl font-bold text-white md:text-5xl leading-tight">
                        다음 매매부터
                        <br />
                        복기를 시작하세요
                    </h2>

                    <p className="mt-6 text-neutral-500 max-w-md mx-auto">
                        기본 시작은 웹 계정과 설정 흐름입니다. 바로 가입하기 부담스럽다면 게스트로 먼저 둘러볼 수 있습니다.
                    </p>

                    <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-semibold text-neutral-950 hover:bg-neutral-100 transition-colors"
                        >
                            웹에서 시작
                        </Link>
                        <Link
                            href="/guest?mode=preview"
                            className="inline-flex items-center justify-center rounded-full border border-white/15 px-8 py-4 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
                        >
                            게스트로 먼저 보기
                        </Link>
                    </div>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="bg-neutral-950 border-t border-white/5 py-8 text-center">
                <p className="text-xs text-neutral-600">&copy; 2026 KIFU · 매매 복기를 습관으로</p>
            </footer>
        </div>
    )
}
