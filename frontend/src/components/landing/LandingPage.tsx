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
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-transparent" />

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

const highlightStream = [
    'Decision Layer',
    'Evidence Packet',
    'AI 비교',
    '긴급 모드',
    '포지션 상태',
    '거래내역 자동 수집',
    '버블 복기',
    '리플레이',
]

const storyChapters = [
    {
        kicker: 'Snapshot',
        title: '오늘의 판단 스냅샷',
        desc: '한 화면에서 내 상태를 결정합니다. 손익, 포지션, 오늘의 루틴을 동시에 확인합니다.',
        tags: ['한 화면 결론', '오늘의 루틴', '포지션 요약'],
        accent: 'from-cyan-500/15 via-cyan-500/5',
    },
    {
        kicker: 'Evidence',
        title: '증거 패킷으로 맥락 전달',
        desc: '최근 체결, 요약, 버블 기록을 묶어 AI에게 전달합니다. 원하는 범위를 직접 선택합니다.',
        tags: ['범위 선택', '버블 필터', '요약 자동'],
        accent: 'from-emerald-500/15 via-emerald-500/5',
    },
    {
        kicker: 'AI Stack',
        title: '멀티 AI 비교와 복기 저장',
        desc: '한 번의 질문으로 다양한 모델을 비교하고, 응답은 자동으로 복기 카드로 저장됩니다.',
        tags: ['AI 비교', '복기 카드', '자동 저장'],
        accent: 'from-purple-500/15 via-purple-500/5',
    },
    {
        kicker: 'Alert',
        title: '긴급 상황은 한 화면에서',
        desc: '알림이 울리면 바로 판단하고 기록합니다. 급변 구간에서 행동 로그가 남습니다.',
        tags: ['긴급 모드', '행동 로그', '즉시 대응'],
        accent: 'from-rose-500/15 via-rose-500/5',
    },
]

const stackCards = [
    {
        title: 'Evidence Packet',
        desc: '필요한 범위를 골라 AI에게 전달.',
        badge: '범위 선택형',
    },
    {
        title: 'Decision Layer',
        desc: '오늘의 판단과 루틴을 한 장에.',
        badge: '스냅샷 UI',
    },
    {
        title: 'AI Compare',
        desc: '모델별 의견을 나란히 비교.',
        badge: '멀티 모델',
    },
]

const integrations = [
    'Binance',
    'Upbit',
    'Bybit',
    'Bithumb',
    'Hyperliquid',
    'Jupiter',
    'Uniswap',
    'KIS',
]

const backgroundThemes: Record<string, string> = {
    hero: 'from-zinc-950 via-zinc-900/50 to-zinc-950',
    features: 'from-zinc-950 via-zinc-900/30 to-zinc-950',
    stack: 'from-zinc-950 via-zinc-900/40 to-zinc-950',
    capabilities: 'from-zinc-950 via-zinc-900/50 to-zinc-950',
    roadmap: 'from-zinc-950 via-zinc-900/30 to-zinc-950',
    vision: 'from-zinc-950 via-zinc-900/40 to-zinc-950',
    pricing: 'from-zinc-950 via-zinc-900/50 to-zinc-950',
}

export function LandingPage() {
    const [activeSection, setActiveSection] = useState('hero')
    const progressRef = useRef<HTMLDivElement | null>(null)
    const storyRef = useRef<HTMLDivElement | null>(null)
    const heroRef = useRef<HTMLElement | null>(null)
    const featuresRef = useRef<HTMLElement | null>(null)
    const [storyProgress, setStoryProgress] = useState(0)
    const [storyVisible, setStoryVisible] = useState(false)
    const [heroVisible, setHeroVisible] = useState(true)
    const [featuresTop, setFeaturesTop] = useState(0)

    useEffect(() => {
        // handled by scroll-based detector below to avoid sticky overlap glitches
    }, [])

    useEffect(() => {
        let rafId = 0
        let ticking = false

        const updateProgress = () => {
            const scrollTop = window.scrollY
            const viewportHeight = window.innerHeight
            const docHeight = document.documentElement.scrollHeight
            const maxScroll = Math.max(docHeight - viewportHeight, 1)
            const progress = Math.min(scrollTop / maxScroll, 1)
            if (progressRef.current) {
                progressRef.current.style.transform = `scaleX(${progress})`
            }
            const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'))
            const viewportCenter = window.innerHeight * 0.5
            let nextSection = activeSection
            for (const section of sections) {
                const rect = section.getBoundingClientRect()
                if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
                    const id = section.getAttribute('data-section')
                    if (id) nextSection = id
                }
                if (rect.top < window.innerHeight * 0.85) {
                    section.classList.add('is-visible')
                }
            }

            if (featuresRef.current) {
                const top = featuresRef.current.offsetTop
                setFeaturesTop(top)
                const visible = window.scrollY < top - 60
                setHeroVisible(visible)
                if (visible) {
                    nextSection = 'hero'
                }
            }

            if (nextSection !== activeSection) {
                setActiveSection(nextSection)
            }
            ticking = false
        }

        const onScroll = () => {
            if (!ticking) {
                ticking = true
                rafId = window.requestAnimationFrame(updateProgress)
            }
        }

        updateProgress()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)

        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
            window.cancelAnimationFrame(rafId)
        }
    }, [])

    useEffect(() => {
        const section = storyRef.current
        if (!section) return
        let rafId = 0
        let ticking = false

        const updateStory = () => {
            const start = section.offsetTop
            const end = section.offsetTop + section.offsetHeight - window.innerHeight * 0.2
            const raw = (window.scrollY - start) / Math.max(end - start, 1)
            const progress = Math.min(Math.max(raw, 0), 1)
            const rect = section.getBoundingClientRect()
            const visible = rect.top <= window.innerHeight * 0.2 && rect.bottom >= window.innerHeight * 0.8
            setStoryProgress(progress)
            setStoryVisible(visible)
            ticking = false
        }

        const onScroll = () => {
            if (ticking) return
            ticking = true
            rafId = window.requestAnimationFrame(updateStory)
        }

        updateStory()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)

        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
            window.cancelAnimationFrame(rafId)
        }
    }, [])

    const backgroundClass = backgroundThemes.hero
    const heroActive = heroVisible
    const totalSteps = storyChapters.length
    const stepProgress = storyProgress * (totalSteps - 1)
    const currentIndex = Math.min(totalSteps - 1, Math.max(0, Math.floor(stepProgress)))
    const nextIndex = Math.min(totalSteps - 1, currentIndex + 1)
    const stepOffset = currentIndex === nextIndex ? 0 : stepProgress - currentIndex
    const storyActive = storyVisible
    const enterStart = 0.85
    const enterEnd = 0.995
    const enterRaw = stepOffset <= enterStart ? 0 : stepOffset >= enterEnd ? 1 : (stepOffset - enterStart) / (enterEnd - enterStart)
    const enterEase = enterRaw * enterRaw * (3 - 2 * enterRaw)

    const currentLayerStyle = {
        opacity: 1 - enterEase,
        transform: `translateY(${-enterEase * 10}%) scale(${1 - enterEase * 0.02})`,
        zIndex: 1,
        pointerEvents: enterEase > 0.6 ? 'none' : 'auto',
    } as React.CSSProperties

    const nextLayerStyle = {
        opacity: enterEase,
        transform: `translateY(${(1 - enterEase) * 90}%)`,
        zIndex: 2,
        pointerEvents: enterEase < 0.4 ? 'none' : 'auto',
    } as React.CSSProperties

    const renderStoryVisual = (index: number) => {
        if (index === 0) {
            return (
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                        {[
                            { label: '오늘 손익', value: '+3.2%', tone: 'text-emerald-300' },
                            { label: '포지션', value: '2 Open', tone: 'text-cyan-300' },
                            { label: '루틴', value: '1/1 완료', tone: 'text-amber-300' },
                        ].map((stat, idx) => (
                            <div
                                key={stat.label}
                                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-300 animate-pulse-strong"
                                style={{ animationDelay: `${idx * 0.4}s` }}
                            >
                                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{stat.label}</p>
                                <p className={`mt-2 text-lg font-semibold ${stat.tone}`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-300">
                        <div className="flex items-center justify-between">
                            <span className="uppercase tracking-[0.2em] text-neutral-500">Snapshot</span>
                            <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-blink" />
                                LIVE
                            </span>
                        </div>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-1/3 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 animate-progress-strong" />
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 px-4 py-3 shimmer-bar">
                        <p className="text-xs text-neutral-300">오늘의 판단 흐름이 요약됩니다.</p>
                    </div>
                </div>
            )
        }
        if (index === 1) {
            return (
                <div className="space-y-3">
                    {['최근 30일', '전체 심볼', '버블 태그 적용', '포지션 포함'].map((item, idx) => (
                        <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-300 shimmer-strong" style={{ animationDelay: `${idx * 0.2}s` }}>
                            {item}
                        </div>
                    ))}
                    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-neutral-400 shimmer-strong">
                        Evidence Packet이 자동으로 생성됩니다.
                    </div>
                </div>
            )
        }
        if (index === 2) {
            return (
                <div className="space-y-3">
                    {['OpenAI', 'Claude', 'Gemini'].map((agent, idx) => (
                        <div key={agent} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-300 shimmer-strong" style={{ animationDelay: `${idx * 0.3}s` }}>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-white">
                                    <span className="h-2 w-2 rounded-full bg-cyan-300 animate-blink" />
                                    {agent}
                                </span>
                                <span className="text-[10px] text-neutral-500">요약 카드</span>
                            </div>
                            <p className="mt-2 text-[11px] text-neutral-400">핵심 근거 + 행동 제안</p>
                        </div>
                    ))}
                </div>
            )
        }
        return (
            <div className="space-y-3">
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 animate-alert-strong">
                    긴급 알림 발생 — 즉시 대응 모드
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-300 shimmer-strong">
                    행동 로그가 자동 저장됩니다.
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-300 selection:bg-cyan-500/30 font-sans">
            <div className="fixed left-0 top-0 z-[60] h-[3px] w-full bg-white/5">
                <div
                    ref={progressRef}
                    className="h-full origin-left scale-x-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400"
                />
            </div>
            <div className={`pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b ${backgroundClass}`} />
            <div className="pointer-events-none fixed inset-0 -z-10 opacity-60" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.15), transparent 45%), radial-gradient(circle at 80% 15%, rgba(16,185,129,0.12), transparent 40%)' }} />
            {/* Navigation */}
            <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0B0F14]/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <div className="text-lg font-bold tracking-widest text-neutral-100">
                        KIFU
                    </div>
                    <div className="flex items-center gap-6 text-sm font-medium">
                        <Link href="#features" className="hover:text-neutral-100 transition-colors">결정 레이어</Link>
                        <Link href="#stack" className="hover:text-neutral-100 transition-colors">스택</Link>
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
            <section ref={heroRef} data-section="hero" className="relative min-h-screen overflow-hidden pt-20 section-panel is-visible">
                <div
                    className="absolute inset-0 transition-opacity duration-700"
                    style={{ opacity: heroActive ? 1 : 0 }}
                >
                    <CandlestickBackground />
                </div>
                <div className="section-overlay" />

                <div
                    className="relative z-30 mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] transition-opacity duration-700"
                    style={{ opacity: heroActive ? 1 : 0, pointerEvents: heroActive ? 'auto' : 'none' }}
                >
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-700/60 bg-neutral-900/60 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300">
                            Decision Layer
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        </div>
                        <h1 className="mt-6 text-4xl font-semibold leading-tight text-white md:text-6xl">
                            오늘의 판단을<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300">
                                한 화면으로 복원
                            </span>
                        </h1>
                        <p className="mt-6 max-w-xl text-base text-neutral-400 md:text-lg">
                            KIFU는 기록을 “판단 레이어”로 바꿉니다. 증거 패킷과 AI 비교를 통해
                            당신의 결정 흐름을 즉시 재구성합니다.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            {['Evidence Packet', 'AI 비교', '긴급 모드', '포지션 상태'].map((chip) => (
                                <span key={chip} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-300">
                                    {chip}
                                </span>
                            ))}
                        </div>
                        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/guest"
                                className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-8 py-3 text-sm font-bold uppercase tracking-widest text-black transition-all hover:scale-105 shadow-[0_0_30px_rgba(45,212,191,0.3)] hover:shadow-[0_0_40px_rgba(45,212,191,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0B0F14]"
                            >
                                게스트로 입장
                            </Link>
                            <Link
                                href="/onboarding/start"
                                className="inline-flex items-center justify-center rounded-lg border border-neutral-700 px-8 py-3 text-sm font-bold uppercase tracking-widest text-neutral-200 transition-all hover:border-neutral-500 hover:bg-white/5"
                            >
                                처음부터 시작
                            </Link>
                        </div>
                        <div className="mt-10 grid grid-cols-2 gap-4 text-xs text-neutral-400 sm:grid-cols-4">
                            {[
                                { label: 'Decision', value: '스냅샷' },
                                { label: 'Evidence', value: '범위 선택' },
                                { label: 'AI', value: '비교 응답' },
                                { label: 'Review', value: '자동 저장' },
                            ].map((item) => (
                                <div key={item.label} className="rounded-xl border border-white/5 bg-white/5 px-3 py-3">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{item.label}</p>
                                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative" data-parallax="0.12">
                        <div className="absolute -top-10 -left-12 h-40 w-40 rounded-full bg-cyan-500/30 blur-3xl" />
                        <div className="absolute -bottom-10 -right-6 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
                        <div className="space-y-4">
                            {stackCards.map((card, idx) => (
                                <div
                                    key={card.title}
                                    className={`parallax-card rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900/80 to-black/80 p-5 shadow-2xl transition-all hover:-translate-y-1 ${idx === 1 ? 'translate-x-4' : ''} ${idx === 2 ? 'translate-x-8' : ''}`}
                                    data-parallax={0.18 + idx * 0.03}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{card.badge}</span>
                                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-neutral-300">LIVE</span>
                                    </div>
                                    <h3 className="mt-3 text-lg font-semibold text-white">{card.title}</h3>
                                    <p className="mt-2 text-sm text-neutral-400">{card.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Stream */}
            <section className="border-t border-white/5 bg-[#0B0F14] py-6">
                <div className="overflow-hidden">
                    <div className="flex w-[200%] items-center gap-6 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 animate-marquee">
                        {[...highlightStream, ...highlightStream].map((item, index) => (
                            <span key={`${item}-${index}`} className="flex items-center gap-4">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/70" />
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section
                ref={featuresRef}
                id="features"
                data-section="features"
                className="border-t border-white/5 relative z-20 section-panel no-section-overlay"
                style={{ backgroundColor: 'transparent' }}
            >
                <div className="section-overlay" style={{ opacity: 0 }} />
                <div className="mx-auto max-w-7xl px-6">
                    <div className="py-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
                            Decision Layer
                        </div>
                        <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                            스크롤할수록 화면이 바뀌는
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">
                                판단 스토리
                            </span>
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm text-neutral-400">
                            오늘의 스냅샷 → 증거 패킷 → AI 비교 → 긴급 대응 순서로
                            화면 구성이 완전히 바뀝니다.
                        </p>
                    </div>

                    <div
                        ref={storyRef}
                        className="relative"
                        style={{ height: `${storyChapters.length * 95}vh` }}
                    >
                        <div className="sticky top-0 relative flex min-h-screen items-center overflow-hidden">
                            <div className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/60">
                                {String(currentIndex + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
                            </div>
                            <div className="relative w-full min-h-[65vh] transition-opacity duration-500">
                                {[currentIndex, nextIndex].map((index, layerIdx) => {
                                    const item = storyChapters[index]
                                    const style = layerIdx === 0 ? currentLayerStyle : nextLayerStyle
                                    if (layerIdx === 1 && currentIndex === nextIndex) {
                                        return null
                                    }
                                    return (
                                        <div
                                            key={`${item.title}-${layerIdx}`}
                                            className="story-layer grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]"
                                            style={style}
                                        >
                                            <div>
                                                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/80">
                                                    {item.kicker}
                                                </div>
                                                <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                                                    {item.title}
                                                </h2>
                                                <p className="mt-4 text-sm text-neutral-300 leading-relaxed">
                                                    {item.desc}
                                                </p>
                                                <div className="mt-6 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-white/70">
                                                    {item.tags.map((tag) => (
                                                        <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <div className={`rounded-[32px] border border-white/10 bg-gradient-to-br ${item.accent} to-black/70 p-10 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl`}>
                                                    <div className="flex items-center justify-between text-xs text-neutral-400">
                                                        <span className="uppercase tracking-[0.25em]">{item.kicker}</span>
                                                        <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-neutral-300">Live</span>
                                                    </div>
                                                    <div className="mt-6">{renderStoryVisual(index)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stack / Evidence */}
            <section id="stack" data-section="stack" className="py-24 border-t border-white/5 relative z-20 section-panel overflow-hidden no-section-overlay" style={{ backgroundColor: 'transparent' }}>
                <div className="section-overlay" style={{ opacity: 0 }} />
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-12 text-center">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500">STACK</h2>
                        <h3 className="mt-3 text-3xl font-bold text-white">증거를 모으고, 비교하고, 저장한다</h3>
                        <p className="mt-4 text-neutral-400 max-w-2xl mx-auto">
                            Evidence Packet과 AI 비교는 복기의 핵심입니다. 필요한 범위를 고르고,
                            응답은 자동으로 복기 카드에 저장됩니다.
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="parallax-card rounded-3xl border border-white/10 bg-neutral-950/70 p-8" data-parallax="0.1">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-semibold text-white">Evidence Packet</h4>
                                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">range</span>
                            </div>
                            <p className="mt-3 text-sm text-neutral-400">기간/심볼/버블 태그를 직접 선택합니다.</p>
                            <div className="mt-6 space-y-3">
                                {[
                                    '최근 7/30/90일 선택',
                                    '현재 심볼 또는 전체 심볼',
                                    '버블 태그로 필터링',
                                    '포지션 포함 옵션',
                                ].map((line) => (
                                    <div key={line} className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs text-neutral-300">
                                        {line}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="parallax-card rounded-3xl border border-white/10 bg-neutral-950/70 p-8" data-parallax="0.14">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-semibold text-white">AI Compare</h4>
                                <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">multi</span>
                            </div>
                            <p className="mt-3 text-sm text-neutral-400">모델별 의견을 나란히 보고 판단합니다.</p>
                            <div className="mt-6 space-y-3">
                                {['OpenAI', 'Claude', 'Gemini'].map((model) => (
                                    <div key={model} className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs text-neutral-300">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-white">{model}</span>
                                            <span className="text-[10px] text-neutral-500">요약 카드</span>
                                        </div>
                                        <p className="mt-2 text-[11px] text-neutral-400">핵심 근거 + 리스크 + 행동 제안</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                        {integrations.map((name) => (
                            <span key={name} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-neutral-400">
                                {name}
                            </span>
                        ))}
                    </div>

                    <div className="mt-10 flex justify-center">
                        <Link
                            href="/guest"
                            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-bold text-black hover:bg-cyan-400 transition-colors"
                        >
                            <span>🚀</span> 데모 시작하기
                        </Link>
                    </div>
                </div>
            </section>

            {/* Capabilities */}
            <section data-section="capabilities" className="py-24 border-t border-white/5 relative z-20 section-panel overflow-hidden no-section-overlay" style={{ backgroundColor: 'transparent' }}>
                <div className="section-overlay" style={{ opacity: 0 }} />
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500">Capabilities</h2>
                        <h3 className="mt-3 text-4xl font-bold text-white">행동을 기록하는 <br /><span className="text-neutral-500">UI 스택</span></h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Card 1 */}
                        <div className="parallax-card col-span-1 md:col-span-2 lg:col-span-2 row-span-1 rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900 to-black p-8 relative overflow-hidden group" data-parallax="0.12">
                            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                                <div className="w-32 h-32 bg-cyan-500 blur-3xl rounded-full"></div>
                            </div>
                            <h4 className="text-2xl font-bold text-white mb-2">차트 위 판단 오버레이</h4>
                            <p className="text-neutral-400 mb-6 max-w-md">스프레드시트 대신, 판단을 캔들 위에 남깁니다.</p>
                            <MiniChartPreview />
                        </div>

                        {/* Card 2 */}
                        <div className="parallax-card rounded-3xl border border-white/10 bg-neutral-900/50 p-8 hover:bg-neutral-900 transition-colors group" data-parallax="0.1">
                            <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center mb-4 text-emerald-400">
                                <span className="text-xl">🧭</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">포지션 상태 기록</h4>
                            <p className="text-sm text-neutral-400">열린 포지션과 손절/익절 기준을 기록해 AI 판단의 기준점으로 사용합니다.</p>
                        </div>

                        {/* Card 3 */}
                        <div className="parallax-card rounded-3xl border border-white/10 bg-neutral-900/50 p-8 hover:bg-neutral-900 transition-colors group" data-parallax="0.1">
                            <div className="w-10 h-10 rounded-full bg-rose-900/30 flex items-center justify-center mb-4 text-rose-400">
                                <span className="text-xl">🚨</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">긴급 모드</h4>
                            <p className="text-sm text-neutral-400">급등/급락 알림 이후 바로 판단하고 기록할 수 있습니다.</p>
                        </div>

                        {/* Card 4 */}
                        <div className="parallax-card md:col-span-2 lg:col-span-2 rounded-3xl border border-white/10 bg-neutral-900/50 p-8 hover:bg-neutral-900 transition-colors flex flex-col md:flex-row items-center gap-8" data-parallax="0.14">
                            <div className="flex-1">
                                <h4 className="text-2xl font-bold text-white mb-2">거래내역 오버레이</h4>
                                <p className="text-neutral-400">
                                    거래내역(CSV/API)을 불러와 실제 진입/청산 흐름을 차트 위에 겹쳐 봅니다.
                                    복기 흐름과 실행 결과를 한 화면에서 비교할 수 있습니다.
                                </p>
                            </div>
                            <div className="w-full md:w-1/3 h-32 bg-neutral-800/30 rounded-xl border border-neutral-700/30 flex items-center justify-center">
                                <span className="text-4xl">🔗</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mobile Roadmap */}
            <section id="roadmap" data-section="roadmap" className="py-24 border-t border-white/5 relative z-20 section-panel overflow-hidden no-section-overlay" style={{ backgroundColor: 'transparent' }}>
                <div className="section-overlay" style={{ opacity: 0 }} />
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
                            <div className="parallax-card relative w-64 h-[500px] rounded-[3rem] border-4 border-neutral-700 bg-neutral-900 p-2 shadow-2xl" data-parallax="0.2">
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
            <section data-section="vision" className="py-24 border-t border-white/5 relative z-20 section-panel overflow-hidden no-section-overlay" style={{ backgroundColor: 'transparent' }}>
                <div className="section-overlay" style={{ opacity: 0 }} />
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
                                className={`parallax-card relative rounded-2xl border p-8 transition-all hover:-translate-y-1 ${card.color === 'emerald'
                                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                                    : card.color === 'cyan'
                                        ? 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/50'
                                        : 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50'
                                    }`}
                                data-parallax={0.12 + i * 0.04}
                            >
                                <div className={`text-xs font-bold uppercase tracking-widest mb-4 ${card.color === 'emerald' ? 'text-emerald-400' : card.color === 'cyan' ? 'text-cyan-400' : 'text-purple-400'
                                    }`}>
                                    {card.phase}
                                </div>
                                <ul className="space-y-3">
                                    {card.items.map((item, j) => (
                                        <li key={j} className="flex items-center gap-2 text-neutral-300">
                                            <span className={`w-1.5 h-1.5 rounded-full ${card.color === 'emerald' ? 'bg-emerald-400' : card.color === 'cyan' ? 'bg-cyan-400' : 'bg-purple-400'
                                                }`} />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className={`mt-6 inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${card.color === 'emerald'
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
            <section id="pricing" data-section="pricing" className="py-24 border-t border-white/5 section-panel overflow-hidden no-section-overlay" style={{ backgroundColor: 'transparent' }}>
                <div className="section-overlay" />
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
