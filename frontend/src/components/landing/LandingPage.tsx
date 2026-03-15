'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type Candle = {
    id: number
    left: number
    height: number
    wickTop: number
    wickBottom: number
    isGreen: boolean
    delay: number
    duration: number
}

function CandlestickBackground() {
    const [candles, setCandles] = useState<Candle[]>([])
    const [linePath, setLinePath] = useState('M 0 250 L 2000 250')
    const [linePath2, setLinePath2] = useState('M 0 275 L 2000 275')

    useEffect(() => {
        const generated: Candle[] = Array.from({ length: 40 }).map((_, i) => ({
            id: i,
            left: (i * 2.5) + Math.random() * 1.5,
            height: 30 + Math.random() * 80,
            wickTop: 10 + Math.random() * 30,
            wickBottom: 10 + Math.random() * 30,
            isGreen: Math.random() > 0.45,
            delay: Math.random() * 8,
            duration: 6 + Math.random() * 8,
        }))
        setCandles(generated)

        const generatePath = (baseY: number, amplitude: number) => {
            const points: string[] = []
            let y = baseY
            for (let x = 0; x <= 100; x += 2) {
                y = baseY + (Math.random() - 0.5) * amplitude + Math.sin(x * 0.1) * 20
                y = Math.max(20, Math.min(80, y))
                points.push(`${x === 0 ? 'M' : 'L'} ${x * 20} ${y * 5}`)
            }
            return points.join(' ')
        }

        setLinePath(generatePath(50, 30))
        setLinePath2(generatePath(55, 25))
    }, [])

    return (
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-transparent" />
            <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 2000 500">
                <path d={linePath} fill="none" stroke="url(#lineGradient)" strokeWidth="2" className="animate-draw-line" />
                <path d={linePath2} fill="none" stroke="url(#lineGradient2)" strokeWidth="1.5" className="animate-draw-line-delayed" strokeDasharray="5,5" />
                {linePath && <path d={`${linePath} L 2000 500 L 0 500 Z`} fill="url(#areaGradient)" className="animate-fade-in" />}
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 opacity-[0.12]">
                {candles.map((candle) => (
                    <div
                        key={candle.id}
                        className="absolute"
                        style={{
                            left: `${candle.left}%`,
                            bottom: '10%',
                            animation: `rise-candle ${candle.duration}s ease-out infinite, pulse-candle ${candle.duration * 0.5}s ease-in-out infinite`,
                            animationDelay: `${candle.delay}s`,
                        }}
                    >
                        <div className={`mx-auto w-[2px] ${candle.isGreen ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ height: candle.wickTop }} />
                        <div className={`w-3 sm:w-4 rounded-sm ${candle.isGreen ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ height: candle.height }} />
                        <div className={`mx-auto w-[2px] ${candle.isGreen ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ height: candle.wickBottom }} />
                    </div>
                ))}
            </div>
            <div className="absolute top-1/3 left-0 right-0 h-[1px] overflow-hidden opacity-30">
                <div className="h-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-scan-line" />
            </div>
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0B0F14] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-[#0B0F14] to-transparent" />
        </div>
    )
}

export function LandingPage() {
    const tgBotUrl = 'https://t.me/kifu_main_bot'

    return (
        <div className="min-h-screen bg-[#0B0F14] text-white">
            {/* Nav */}
            <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0B0F14]/80 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <span className="text-lg font-bold tracking-wide">KIFU</span>
                    <div className="flex items-center gap-6 text-sm text-neutral-400">
                        <Link href="#how" className="hidden sm:block hover:text-neutral-100 transition-colors">사용법</Link>
                        <Link href="#features" className="hidden sm:block hover:text-neutral-100 transition-colors">기능</Link>
                        <Link href="/login" className="hover:text-neutral-100 transition-colors">로그인</Link>
                        <Link
                            href="/register"
                            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                        >
                            무료 시작
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative min-h-screen overflow-hidden pt-20">
                <CandlestickBackground />
                <div className="relative z-30 mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center lg:py-32">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300">
                        얼리 액세스 무료
                    </div>

                    <h1 className="mt-8 text-4xl font-bold leading-tight md:text-6xl">
                        매매했으면<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300">
                            15초만 복기하세요
                        </span>
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg text-neutral-400">
                        텔레그램에서 버튼 3번이면 끝.<br />
                        매수 이유, 손절가를 기록하고, 실제 거래와 자동 비교합니다.
                    </p>

                    <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                        <a
                            href={tgBotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#2AABEE] px-8 py-4 text-base font-bold text-white transition-all hover:scale-105 hover:bg-[#229ED9] shadow-[0_0_30px_rgba(42,171,238,0.3)]"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                            텔레그램으로 시작
                        </a>
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center rounded-xl border border-neutral-700 px-8 py-4 text-base font-semibold text-neutral-200 transition-all hover:border-neutral-500 hover:bg-white/5"
                        >
                            웹에서 시작
                        </Link>
                    </div>

                    <p className="mt-6 text-xs text-neutral-500">
                        가입 없이 텔레그램에서 바로 체험 가능
                    </p>

                    {/* Social proof */}
                    <div className="mt-16 grid grid-cols-3 gap-8 text-center">
                        {[
                            { value: '15초', label: '복기 완료' },
                            { value: '버튼 3번', label: '기록 끝' },
                            { value: '자동', label: '실거래 비교' },
                        ].map((stat) => (
                            <div key={stat.label}>
                                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300 md:text-3xl">{stat.value}</p>
                                <p className="mt-1 text-xs text-neutral-500">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how" className="border-t border-white/5 py-24">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500">HOW IT WORKS</h2>
                        <h3 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                            알림 오면, 복기 시작
                        </h3>
                        <p className="mt-4 text-neutral-400 max-w-xl mx-auto">
                            가격 알림이 울리면 텔레그램 봇이 자동으로 복기를 시작합니다.
                        </p>
                    </div>

                    {/* Telegram flow mockup */}
                    <div className="mx-auto max-w-sm space-y-4">
                        {/* Bot message 1 */}
                        <div className="rounded-2xl rounded-tl-md bg-neutral-800/80 border border-neutral-700/50 p-4">
                            <p className="text-xs text-neutral-500 mb-2">kifu bot</p>
                            <p className="text-sm text-neutral-200">
                                <span className="font-semibold">BTCUSDT</span> $95,000 도달
                            </p>
                            <p className="mt-2 text-sm text-neutral-300">이 알림을 보고 매수할 건가요?</p>
                            <div className="mt-3 flex gap-2">
                                <span className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-xs font-semibold text-emerald-300">매수한다</span>
                                <span className="rounded-lg bg-neutral-700/50 border border-neutral-600/40 px-4 py-2 text-xs font-semibold text-neutral-400">안 한다</span>
                            </div>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center justify-center gap-2 text-neutral-500">
                            <div className="h-px w-8 bg-neutral-700" />
                            <span className="text-xs">5초</span>
                            <div className="h-px w-8 bg-neutral-700" />
                        </div>

                        {/* Bot message 2 */}
                        <div className="rounded-2xl rounded-tl-md bg-neutral-800/80 border border-neutral-700/50 p-4">
                            <p className="text-xs text-neutral-500 mb-2">kifu bot</p>
                            <p className="text-sm text-neutral-300">왜 매수하나요?</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-xs text-cyan-300">지표 도달</span>
                                <span className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-xs text-cyan-300">트위터/뉴스</span>
                                <span className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-xs text-amber-300">FOMO</span>
                                <span className="rounded-lg bg-neutral-700/50 border border-neutral-600/40 px-3 py-1.5 text-xs text-neutral-400">직접 입력</span>
                            </div>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center justify-center gap-2 text-neutral-500">
                            <div className="h-px w-8 bg-neutral-700" />
                            <span className="text-xs">5초</span>
                            <div className="h-px w-8 bg-neutral-700" />
                        </div>

                        {/* Bot message 3 */}
                        <div className="rounded-2xl rounded-tl-md bg-neutral-800/80 border border-neutral-700/50 p-4">
                            <p className="text-xs text-neutral-500 mb-2">kifu bot</p>
                            <p className="text-sm text-neutral-300">손절가를 입력해주세요 (숫자만):</p>
                        </div>

                        {/* User response */}
                        <div className="flex justify-end">
                            <div className="rounded-2xl rounded-tr-md bg-[#2AABEE]/20 border border-[#2AABEE]/30 px-4 py-2">
                                <p className="text-sm text-neutral-200">90000</p>
                            </div>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center justify-center gap-2 text-neutral-500">
                            <div className="h-px w-8 bg-neutral-700" />
                            <span className="text-xs">5초</span>
                            <div className="h-px w-8 bg-neutral-700" />
                        </div>

                        {/* Completion */}
                        <div className="rounded-2xl rounded-tl-md bg-emerald-500/10 border border-emerald-500/30 p-4">
                            <p className="text-xs text-neutral-500 mb-2">kifu bot</p>
                            <p className="text-sm font-semibold text-emerald-300 mb-2">거래 계획 저장 완료!</p>
                            <div className="space-y-1 text-xs text-neutral-300">
                                <p>BTCUSDT</p>
                                <p>진입: $95,000</p>
                                <p>손절: $90,000</p>
                                <p>이유: 지표 도달</p>
                            </div>
                            <p className="mt-3 text-xs text-neutral-500">나중에 실제 거래와 자동 비교해드릴게요.</p>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <a
                            href={tgBotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-[#2AABEE] px-6 py-3 text-sm font-bold text-white hover:bg-[#229ED9] transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                            직접 체험하기
                        </a>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="border-t border-white/5 py-24">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-500">FEATURES</h2>
                        <h3 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                            기록하고, 비교하고, 개선하세요
                        </h3>
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
                                accent: 'border-emerald-500/30 bg-emerald-500/5',
                            },
                            {
                                icon: '📊',
                                title: '패턴 분석',
                                desc: '"이 종목에서 FOMO로 5번 매수, 평균 -3.2%." 자신의 패턴을 숫자로 봅니다.',
                                accent: 'border-cyan-500/30 bg-cyan-500/5',
                            },
                            {
                                icon: '🔔',
                                title: '가격 알림',
                                desc: '지정가 도달, MA 크로스 등 조건을 설정하면 텔레그램으로 알림 + 복기 시작.',
                                accent: 'border-amber-500/30 bg-amber-500/5',
                            },
                            {
                                icon: '🤖',
                                title: 'AI 의견 비교',
                                desc: 'OpenAI, Claude, Gemini에게 동시에 물어보고 의견을 나란히 비교합니다.',
                                accent: 'border-purple-500/30 bg-purple-500/5',
                            },
                            {
                                icon: '📈',
                                title: '거래소 연동',
                                desc: 'Binance Futures/Spot, Upbit API로 거래내역을 자동 수집합니다.',
                                accent: 'border-rose-500/30 bg-rose-500/5',
                            },
                        ].map((feature) => (
                            <div
                                key={feature.title}
                                className={`rounded-2xl border p-6 transition-all hover:-translate-y-1 ${feature.accent}`}
                            >
                                <span className="text-2xl">{feature.icon}</span>
                                <h4 className="mt-3 text-lg font-semibold text-white">{feature.title}</h4>
                                <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why kifu */}
            <section className="border-t border-white/5 py-24">
                <div className="mx-auto max-w-4xl px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500">WHY KIFU</h2>
                        <h3 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                            예측을 팔지 않습니다
                        </h3>
                        <p className="mt-4 text-neutral-400 max-w-xl mx-auto">
                            매매 실력은 신호가 아니라 복기에서 나옵니다.<br />
                            KIFU는 당신의 판단을 기록하고, 실수 패턴을 줄여줍니다.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
                            <p className="text-sm font-semibold text-red-400 mb-3">기존 방식</p>
                            <ul className="space-y-2 text-sm text-neutral-400">
                                <li className="flex gap-2"><span className="text-red-500/60">✕</span> 매매 후 까먹음</li>
                                <li className="flex gap-2"><span className="text-red-500/60">✕</span> 같은 실수 반복</li>
                                <li className="flex gap-2"><span className="text-red-500/60">✕</span> 엑셀에 기록하다 포기</li>
                                <li className="flex gap-2"><span className="text-red-500/60">✕</span> FOMO인지 확신인지 구분 불가</li>
                            </ul>
                        </div>
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                            <p className="text-sm font-semibold text-emerald-400 mb-3">KIFU</p>
                            <ul className="space-y-2 text-sm text-neutral-400">
                                <li className="flex gap-2"><span className="text-emerald-400">✓</span> 알림 오면 15초 만에 기록</li>
                                <li className="flex gap-2"><span className="text-emerald-400">✓</span> 패턴이 숫자로 보임</li>
                                <li className="flex gap-2"><span className="text-emerald-400">✓</span> 텔레그램 버튼이라 귀찮지 않음</li>
                                <li className="flex gap-2"><span className="text-emerald-400">✓</span> 계획 vs 실제 자동 비교</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="border-t border-white/5 py-24">
                <div className="mx-auto max-w-3xl px-6 text-center">
                    <h2 className="text-3xl font-bold text-white">지금은 전부 무료</h2>
                    <p className="mt-4 text-neutral-400">
                        얼리 액세스 기간 동안 모든 기능을 무료로 사용할 수 있습니다.
                    </p>

                    <div className="mt-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-left">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Early Access</span>
                                <h3 className="mt-1 text-2xl font-bold text-white">무료</h3>
                            </div>
                            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">현재</span>
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
                                <li key={item} className="flex items-center gap-2 text-sm text-neutral-300">
                                    <span className="text-emerald-400">✓</span> {item}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <a
                                href={tgBotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2AABEE] px-6 py-3 text-sm font-bold text-white hover:bg-[#229ED9] transition-colors"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                                텔레그램으로 시작
                            </a>
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center rounded-lg border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-200 hover:bg-white/5 transition-colors"
                            >
                                웹에서 가입
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 text-center text-xs text-neutral-600">
                <p>&copy; 2026 KIFU. All rights reserved.</p>
                <p className="mt-2">매매 복기를 습관으로</p>
            </footer>
        </div>
    )
}
