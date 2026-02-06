'use client'

import { useState, useEffect } from 'react'
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

type MiniCandle = {
    isGreen: boolean
    height: number
}

function CandlestickBackground() {
    const [candles, setCandles] = useState<Candle[]>([])
    const [linePath, setLinePath] = useState('')
    const [linePath2, setLinePath2] = useState('')

    useEffect(() => {
        // Generate candles
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

        // Generate smooth line chart path
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
            {/* Gradient base */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e13] via-[#0B0F14] to-[#0d1117]" />

            {/* Animated line charts */}
            <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 2000 500">
                {/* Main price line */}
                <path
                    d={linePath}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="2"
                    className="animate-draw-line"
                />
                {/* Secondary line (MA or indicator) */}
                <path
                    d={linePath2}
                    fill="none"
                    stroke="url(#lineGradient2)"
                    strokeWidth="1.5"
                    className="animate-draw-line-delayed"
                    strokeDasharray="5,5"
                />
                {/* Gradient fill under main line */}
                <path
                    d={`${linePath} L 2000 500 L 0 500 Z`}
                    fill="url(#areaGradient)"
                    className="animate-fade-in"
                />
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

            {/* Animated candles */}
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
                        {/* Wick top */}
                        <div
                            className={`mx-auto w-[2px] ${candle.isGreen ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ height: candle.wickTop }}
                        />
                        {/* Body */}
                        <div
                            className={`w-3 sm:w-4 rounded-sm ${candle.isGreen ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ height: candle.height }}
                        />
                        {/* Wick bottom */}
                        <div
                            className={`mx-auto w-[2px] ${candle.isGreen ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ height: candle.wickBottom }}
                        />
                    </div>
                ))}
            </div>

            {/* Moving price ticker line */}
            <div className="absolute top-1/3 left-0 right-0 h-[1px] overflow-hidden opacity-30">
                <div className="h-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-scan-line" />
            </div>

            {/* Top fade */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0B0F14] to-transparent" />
            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-[#0B0F14] to-transparent" />
        </div>
    )
}

function MiniChartPreview() {
    const [miniCandles, setMiniCandles] = useState<MiniCandle[]>([])

    useEffect(() => {
        const generated = Array.from({ length: 20 }).map(() => ({
            isGreen: Math.random() > 0.4,
            height: 20 + Math.random() * 60,
        }))
        setMiniCandles(generated)
    }, [])

    if (miniCandles.length === 0) {
        return (
            <div className="relative w-full h-48 bg-neutral-800/50 rounded-xl border border-neutral-700/50 overflow-hidden flex items-center justify-center">
                <span className="text-xs text-neutral-500">Loading...</span>
            </div>
        )
    }

    return (
        <div className="relative w-full h-48 bg-neutral-800/50 rounded-xl border border-neutral-700/50 overflow-hidden flex items-end justify-center gap-1 p-4">
            {miniCandles.map((candle, i) => (
                <div key={i} className="flex flex-col items-center">
                    <div className={`w-[2px] h-2 ${candle.isGreen ? 'bg-emerald-500/60' : 'bg-red-500/60'}`} />
                    <div
                        className={`w-2 rounded-sm ${candle.isGreen ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
                        style={{ height: candle.height }}
                    />
                    <div className={`w-[2px] h-3 ${candle.isGreen ? 'bg-emerald-500/60' : 'bg-red-500/60'}`} />
                </div>
            ))}
            {/* Bubble overlay */}
            <div className="absolute top-4 left-1/3 bg-cyan-500/20 border border-cyan-500/40 rounded-lg px-2 py-1 text-xs text-cyan-300">
                "RSI oversold..."
            </div>
        </div>
    )
}

export function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0B0F14] text-neutral-300 selection:bg-cyan-500/30 font-sans">
            {/* Navigation */}
            <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0B0F14]/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <div className="text-lg font-bold tracking-widest text-neutral-100">
                        KIFU
                    </div>
                    <div className="flex items-center gap-6 text-sm font-medium">
                        <Link href="#features" className="hover:text-neutral-100 transition-colors">기능</Link>
                        <Link href="#roadmap" className="hover:text-neutral-100 transition-colors">로드맵</Link>
                        <Link href="#pricing" className="hover:text-neutral-100 transition-colors">요금제</Link>
                        <Link
                            href="/login"
                            className="rounded-full bg-neutral-100 px-5 py-2 text-neutral-950 hover:bg-white transition-colors"
                        >
                            로그인
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
                <CandlestickBackground />

                <div className="relative z-30 mx-auto max-w-4xl px-6 text-center">
                    <div className="inline-block rounded-full border border-neutral-700/60 bg-neutral-900/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 backdrop-blur-sm">
                        AI 트레이딩 저널
                    </div>
                    <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
                        기록하고, 복기하고, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">성장하라.</span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
                        차트 위에 직접 생각을 기록하세요. AI의 의견을 수집하세요.
                        과거를 복기해서 값비싼 실수를 없애세요.
                    </p>
                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
                        <Link
                            href="/guest"
                            className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 text-sm font-bold uppercase tracking-widest text-black transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0B0F14]"
                        >
                            게스트로 입장
                        </Link>
                        <Link
                            href="/onboarding/start"
                            className="inline-flex items-center justify-center rounded-lg border border-neutral-700 px-8 py-3 text-sm font-bold uppercase tracking-widest text-neutral-300 transition-all hover:border-neutral-500 hover:bg-white/5"
                        >
                            처음부터 시작
                        </Link>
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="py-24 border-t border-white/5 relative z-20 bg-[#0B0F14]">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16 text-center">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500">작동 방식</h2>
                        <h3 className="mt-3 text-3xl font-bold text-white">3단계로 일관성을 만들다</h3>
                    </div>
                    <div className="grid gap-8 md:grid-cols-3">
                        {[
                            {
                                step: '01',
                                title: '캔들 선택',
                                desc: '차트에서 원하는 캔들을 클릭하세요. 가격, 시간, 지표가 즉시 기록됩니다.'
                            },
                            {
                                step: '02',
                                title: '의견 수집',
                                desc: 'AI 에이전트에게 객관적인 분석을 요청하세요. 리스크 매니저, FOMO 체커 등 다양한 관점을 얻을 수 있습니다.'
                            },
                            {
                                step: '03',
                                title: '복기 & 리플레이',
                                desc: '"복기 모드"를 켜서 당신의 판단과 이후 가격 움직임을 비교하세요. 실수의 패턴을 발견하세요.'
                            }
                        ].map((item, i) => (
                            <div key={i} className="group relative rounded-2xl border border-white/5 bg-white/5 p-8 transition-all hover:-translate-y-1 hover:border-cyan-500/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-cyan-900/10">
                                <div className="text-6xl font-bold text-white/5 transition-colors group-hover:text-cyan-500/20">{item.step}</div>
                                <h4 className="mt-4 text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">{item.title}</h4>
                                <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Proof / Demo */}
            <section className="py-24 bg-neutral-900/30 border-t border-white/5 relative z-20">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-12 text-center">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500">라이브 데모</h2>
                        <h3 className="mt-3 text-3xl font-bold text-white">지금 바로 체험하세요</h3>
                        <p className="mt-4 text-neutral-400 max-w-xl mx-auto">
                            실제 차트에서 말풍선을 만들고, AI 의견을 수집해보세요. 로그인 없이 바로 시작할 수 있습니다.
                        </p>
                    </div>
                    <div className="relative max-w-4xl mx-auto">
                        <div className="aspect-video rounded-2xl border border-white/10 bg-neutral-900/80 overflow-hidden relative group">
                            {/* Demo screenshot placeholder */}
                            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-20 h-20 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
                                        <span className="text-4xl">📊</span>
                                    </div>
                                    <p className="text-neutral-400 text-sm">차트 + 말풍선 + AI 의견 수집</p>
                                </div>
                            </div>
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Link
                                    href="/home"
                                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-bold text-black hover:bg-cyan-400 transition-colors"
                                >
                                    <span>🚀</span> 데모 시작하기
                                </Link>
                            </div>
                        </div>
                        {/* Feature pills */}
                        <div className="flex flex-wrap justify-center gap-3 mt-6">
                            {['캔들 클릭', '말풍선 생성', 'AI 의견 수집', '복기 모드', 'JSON 내보내기'].map((tag) => (
                                <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-400">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Detail */}
            <section id="features" className="py-24 bg-neutral-900/20 border-t border-white/5 relative z-20">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500">왜 KIFU인가?</h2>
                        <h3 className="mt-3 text-4xl font-bold text-white">진지한 트레이더를 위한 <br /><span className="text-neutral-500">복기 도구</span></h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Card 1 */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900 to-black p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                                <div className="w-32 h-32 bg-cyan-500 blur-3xl rounded-full"></div>
                            </div>
                            <h4 className="text-2xl font-bold text-white mb-2">시각적 말풍선 오버레이</h4>
                            <p className="text-neutral-400 mb-6 max-w-md">스프레드시트는 이제 그만. 생각을 캔들 위에 직접 기록하세요.</p>
                            <MiniChartPreview />
                        </div>

                        {/* Card 2 */}
                        <div className="rounded-3xl border border-white/10 bg-neutral-900/50 p-8 hover:bg-neutral-900 transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-cyan-900/30 flex items-center justify-center mb-4 text-cyan-400">
                                <span className="text-xl">🤖</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">멀티 AI 에이전트</h4>
                            <p className="text-sm text-neutral-400">거래 전에 "리스크 매니저"나 "FOMO 체커" AI에게 조언을 구하세요.</p>
                        </div>

                        {/* Card 3 */}
                        <div className="rounded-3xl border border-white/10 bg-neutral-900/50 p-8 hover:bg-neutral-900 transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-orange-900/30 flex items-center justify-center mb-4 text-orange-400">
                                <span className="text-xl">📊</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">CSV 가져오기</h4>
                            <p className="text-sm text-neutral-400">업비트나 바이낸스에서 거래 내역을 가져와 실제 진입/청산 지점을 시각화하세요.</p>
                        </div>

                        {/* Card 4 */}
                        <div className="md:col-span-2 lg:col-span-2 rounded-3xl border border-white/10 bg-neutral-900/50 p-8 hover:bg-neutral-900 transition-colors flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <h4 className="text-2xl font-bold text-white mb-2">프라이버시 우선</h4>
                                <p className="text-neutral-400">
                                    트레이딩 저널은 민감한 데이터입니다. KIFU는 기본적으로 브라우저 로컬 저장소에 데이터를 저장합니다.
                                    필요할 때 JSON으로 백업하세요.
                                </p>
                            </div>
                            <div className="w-full md:w-1/3 h-32 bg-neutral-800/30 rounded-xl border border-neutral-700/30 flex items-center justify-center">
                                <span className="text-4xl">🔒</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mobile Roadmap */}
            <section id="roadmap" className="py-24 border-t border-white/5 relative z-20 bg-[#0B0F14]">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        {/* Text content */}
                        <div>
                            <div className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-amber-400 mb-6">
                                예정
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                                모바일로 더 빠르게,<br />
                                <span className="text-amber-400">더 안전하게</span>
                            </h2>
                            <p className="mt-6 text-neutral-400 leading-relaxed">
                                알림이 울린 순간, 차트에서 바로 기록하고 복기할 수 있도록<br />
                                모바일 경험을 준비하고 있습니다.
                            </p>
                            <ul className="mt-8 space-y-4">
                                {[
                                    { icon: '🔔', text: '알림 → 원클릭 진입' },
                                    { icon: '💬', text: '캔들 탭 → 의견 수집(Quick) → 말풍선 저장' },
                                    { icon: '📱', text: '최근 기록 오프라인 복기(캐시)' },
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-neutral-300">
                                        <span className="text-lg">{item.icon}</span>
                                        <span>{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-8 text-sm text-neutral-500 border-l-2 border-amber-500/30 pl-4">
                                모바일은 기능 확장이 아니라,<br />
                                <strong className="text-neutral-400">기록과 복기가 끊기지 않도록 만드는 채널</strong>입니다.
                            </p>
                        </div>
                        {/* Mobile mockup */}
                        <div className="flex justify-center">
                            <div className="relative w-64 h-[500px] rounded-[3rem] border-4 border-neutral-700 bg-neutral-900 p-2 shadow-2xl">
                                {/* Notch */}
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-neutral-800 rounded-full" />
                                {/* Screen */}
                                <div className="w-full h-full rounded-[2.5rem] bg-gradient-to-b from-neutral-800 to-neutral-900 overflow-hidden flex flex-col">
                                    {/* Status bar */}
                                    <div className="h-12 flex items-end justify-center pb-2">
                                        <span className="text-[10px] text-neutral-500">KIFU</span>
                                    </div>
                                    {/* Mini chart area */}
                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-32 bg-neutral-800/50 rounded-lg mb-3 flex items-end justify-center gap-[2px] p-2">
                                            {/* Fixed data to avoid hydration mismatch */}
                                            {[
                                                { green: true, h: 45 }, { green: false, h: 32 }, { green: true, h: 55 },
                                                { green: true, h: 38 }, { green: false, h: 28 }, { green: true, h: 48 },
                                                { green: true, h: 52 }, { green: false, h: 35 }, { green: true, h: 42 },
                                                { green: true, h: 58 }, { green: false, h: 30 }, { green: true, h: 50 },
                                                { green: false, h: 25 }, { green: true, h: 46 }, { green: true, h: 40 },
                                            ].map((candle, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-2 rounded-sm ${candle.green ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
                                                    style={{ height: candle.h }}
                                                />
                                            ))}
                                        </div>
                                        {/* Bubble */}
                                        <div className="bg-cyan-500/20 border border-cyan-500/40 rounded-lg p-3 mb-3">
                                            <p className="text-[10px] text-cyan-300">📝 RSI 과매도 진입...</p>
                                        </div>
                                        {/* Quick actions */}
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-amber-500/20 rounded-lg py-2 text-center text-[10px] text-amber-300">AI Quick</div>
                                            <div className="flex-1 bg-neutral-700/50 rounded-lg py-2 text-center text-[10px] text-neutral-400">저장</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Vision */}
            <section className="py-24 border-t border-white/5 relative z-20 bg-neutral-900/30">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-500">비전</h2>
                        <h3 className="mt-3 text-3xl md:text-4xl font-bold text-white">
                            복기를 <span className="text-emerald-400">'자산'</span>으로 만든다
                        </h3>
                        <p className="mt-6 text-lg text-neutral-400 max-w-2xl mx-auto">
                            우리는 예측을 팔지 않습니다.<br />
                            <strong className="text-neutral-200">결정의 순간을 저장하고, 실수를 줄이는 시스템</strong>을 만듭니다.
                        </p>
                    </div>

                    {/* Timeline cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                phase: '지금',
                                color: 'emerald',
                                items: ['캔들별 기록', 'AI 의견 수집', '복기 모드'],
                                status: '사용 가능',
                            },
                            {
                                phase: '다음',
                                color: 'cyan',
                                items: ['거래내역(CSV/API) 오버레이', '자동 요약', '개인 패턴 리포트'],
                                status: '개발 중',
                            },
                            {
                                phase: '이후',
                                color: 'purple',
                                items: ['멀티 디바이스 동기화', '팀/친구 공유', '커뮤니티 인사이트 레이어'],
                                status: '예정',
                            },
                        ].map((card, i) => (
                            <div
                                key={i}
                                className={`relative rounded-2xl border p-8 transition-all hover:-translate-y-1 ${
                                    card.color === 'emerald'
                                        ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                                        : card.color === 'cyan'
                                        ? 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/50'
                                        : 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50'
                                }`}
                            >
                                <div className={`text-xs font-bold uppercase tracking-widest mb-4 ${
                                    card.color === 'emerald' ? 'text-emerald-400' : card.color === 'cyan' ? 'text-cyan-400' : 'text-purple-400'
                                }`}>
                                    {card.phase}
                                </div>
                                <ul className="space-y-3">
                                    {card.items.map((item, j) => (
                                        <li key={j} className="flex items-center gap-2 text-neutral-300">
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                card.color === 'emerald' ? 'bg-emerald-400' : card.color === 'cyan' ? 'bg-cyan-400' : 'bg-purple-400'
                                            }`} />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className={`mt-6 inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                                    card.color === 'emerald'
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : card.color === 'cyan'
                                        ? 'bg-cyan-500/20 text-cyan-300'
                                        : 'bg-purple-500/20 text-purple-300'
                                }`}>
                                    {card.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-24 border-t border-white/5">
                <div className="mx-auto max-w-4xl px-6 text-center">
                    <h2 className="text-3xl font-bold text-white">요금제</h2>
                    <div className="mt-12 grid gap-8 md:grid-cols-2">
                        <div className="rounded-3xl border border-white/5 bg-white/5 p-8 text-left">
                            <h3 className="text-xl font-bold text-white">무료</h3>
                            <div className="mt-4 text-3xl font-bold text-white">₩0</div>
                            <ul className="mt-8 space-y-4 text-sm text-neutral-400">
                                <li className="flex gap-2"><span className="text-cyan-500">✓</span> 무제한 로컬 말풍선</li>
                                <li className="flex gap-2"><span className="text-cyan-500">✓</span> 일봉 타임프레임</li>
                                <li className="flex gap-2"><span className="text-cyan-500">✓</span> 기본 AI 프롬프트</li>
                            </ul>
                        </div>
                        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-800 to-neutral-900 p-8 text-left">
                            <div className="absolute -top-3 left-8 rounded-full bg-cyan-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black">
                                출시 예정
                            </div>
                            <h3 className="text-xl font-bold text-white">프로</h3>
                            <div className="mt-4 text-3xl font-bold text-white">₩??</div>
                            <p className="mt-2 text-xs text-neutral-500">가격 미정</p>
                            <ul className="mt-8 space-y-4 text-sm text-neutral-400">
                                <li className="flex gap-2"><span className="text-neutral-200">✓</span> 클라우드 동기화 & 백업</li>
                                <li className="flex gap-2"><span className="text-neutral-200">✓</span> 15분/1시간/4시간 타임프레임</li>
                                <li className="flex gap-2"><span className="text-neutral-200">✓</span> 고급 AI 에이전트</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 text-center text-xs text-neutral-600">
                <p>&copy; 2026 KIFU. All rights reserved.</p>
                <p className="mt-2">AI 트레이딩 저널</p>
            </footer>
        </div>
    )
}
