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
                        <Link href="#features" className="hover:text-neutral-100 transition-colors">Features</Link>
                        <Link href="#pricing" className="hover:text-neutral-100 transition-colors">Pricing</Link>
                        <Link
                            href="/chart"
                            className="rounded-full bg-neutral-100 px-5 py-2 text-neutral-950 hover:bg-white transition-colors"
                        >
                            Launch App
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
                <CandlestickBackground />

                <div className="relative z-30 mx-auto max-w-4xl px-6 text-center">
                    <div className="inline-block rounded-full border border-neutral-700/60 bg-neutral-900/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 backdrop-blur-sm">
                        AI-Powered Trading Journal
                    </div>
                    <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
                        Record. Review. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Improve.</span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
                        Pin your thoughts directly on the chart. Collect AI opinions.
                        Replay your history to eliminate costly mistakes.
                    </p>
                    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link
                            href="/chart"
                            className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 text-sm font-bold uppercase tracking-widest text-black transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0B0F14]"
                        >
                            Start Free
                        </Link>
                        <Link
                            href="/chart?openImport=true"
                            className="inline-flex items-center justify-center rounded-lg border border-neutral-700 px-8 py-3 text-sm font-bold uppercase tracking-widest text-neutral-300 transition-all hover:border-neutral-500 hover:bg-white/5"
                        >
                            Import Data
                        </Link>
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="py-24 border-t border-white/5 relative z-20 bg-[#0B0F14]">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16 text-center">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500">Workflow</h2>
                        <h3 className="mt-3 text-3xl font-bold text-white">Three steps to consistency</h3>
                    </div>
                    <div className="grid gap-8 md:grid-cols-3">
                        {[
                            {
                                step: '01',
                                title: 'Click Context',
                                desc: 'Click any candle on the chart to anchor your thought. Captures price, time, and indicators instantly.'
                            },
                            {
                                step: '02',
                                title: 'Collect Opinion',
                                desc: 'Ask AI agents for objective analysis like a Risk Manager or FOMO Checker, or write your own rationale.'
                            },
                            {
                                step: '03',
                                title: 'Review & Replay',
                                desc: 'Toggle "Replay Mode" to compare your thesis against future price action. Spot patterns in your errors.'
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

            {/* Features Detail */}
            <section id="features" className="py-24 bg-neutral-900/20 border-t border-white/5 relative z-20">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500">Why KIFU?</h2>
                        <h3 className="mt-3 text-4xl font-bold text-white">Built for the <br /><span className="text-neutral-500">Serious Journaler</span></h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Card 1 */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900 to-black p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                                <div className="w-32 h-32 bg-cyan-500 blur-3xl rounded-full"></div>
                            </div>
                            <h4 className="text-2xl font-bold text-white mb-2">Visual Bubble Overlay</h4>
                            <p className="text-neutral-400 mb-6 max-w-md">Stop using spreadsheets. Pin your thoughts directly on the candles where they happened.</p>
                            <MiniChartPreview />
                        </div>

                        {/* Card 2 */}
                        <div className="rounded-3xl border border-white/10 bg-neutral-900/50 p-8 hover:bg-neutral-900 transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-cyan-900/30 flex items-center justify-center mb-4 text-cyan-400">
                                <span className="text-xl">🤖</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">Multi-Agent Personas</h4>
                            <p className="text-sm text-neutral-400">Consult with a "Risk Manager" or "FOMO Checker" AI before you execute a trade.</p>
                        </div>

                        {/* Card 3 */}
                        <div className="rounded-3xl border border-white/10 bg-neutral-900/50 p-8 hover:bg-neutral-900 transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-orange-900/30 flex items-center justify-center mb-4 text-orange-400">
                                <span className="text-xl">📊</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">CSV Import</h4>
                            <p className="text-sm text-neutral-400">Import trade history from Upbit or Binance to visualize your actual entry/exit points.</p>
                        </div>

                        {/* Card 4 */}
                        <div className="md:col-span-2 lg:col-span-2 rounded-3xl border border-white/10 bg-neutral-900/50 p-8 hover:bg-neutral-900 transition-colors flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <h4 className="text-2xl font-bold text-white mb-2">Privacy First</h4>
                                <p className="text-neutral-400">
                                    Your trading journal is sensitive data. KIFU stores bubbles locally in your browser (LocalStorage) by default.
                                    Export to JSON whenever you need a backup.
                                </p>
                            </div>
                            <div className="w-full md:w-1/3 h-32 bg-neutral-800/30 rounded-xl border border-neutral-700/30 flex items-center justify-center">
                                <span className="text-4xl">🔒</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-24 border-t border-white/5">
                <div className="mx-auto max-w-4xl px-6 text-center">
                    <h2 className="text-3xl font-bold text-white">Pricing</h2>
                    <div className="mt-12 grid gap-8 md:grid-cols-2">
                        <div className="rounded-3xl border border-white/5 bg-white/5 p-8 text-left">
                            <h3 className="text-xl font-bold text-white">Free (MVP)</h3>
                            <div className="mt-4 text-3xl font-bold text-white">$0</div>
                            <ul className="mt-8 space-y-4 text-sm text-neutral-400">
                                <li className="flex gap-2"><span className="text-cyan-500">✓</span> Unlimited Local Bubbles</li>
                                <li className="flex gap-2"><span className="text-cyan-500">✓</span> Daily Timeframe</li>
                                <li className="flex gap-2"><span className="text-cyan-500">✓</span> Basic AI Prompts</li>
                            </ul>
                        </div>
                        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-800 to-neutral-900 p-8 text-left">
                            <div className="absolute -top-3 left-8 rounded-full bg-cyan-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black">
                                Coming Soon
                            </div>
                            <h3 className="text-xl font-bold text-white">Pro</h3>
                            <div className="mt-4 text-3xl font-bold text-white">$??</div>
                            <p className="mt-2 text-xs text-neutral-500">Pricing to be determined</p>
                            <ul className="mt-8 space-y-4 text-sm text-neutral-400">
                                <li className="flex gap-2"><span className="text-neutral-200">✓</span> Cloud Sync & Backup</li>
                                <li className="flex gap-2"><span className="text-neutral-200">✓</span> 15m/1h/4h Timeframes</li>
                                <li className="flex gap-2"><span className="text-neutral-200">✓</span> Advanced Agent Personas</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 text-center text-xs text-neutral-600">
                <p>&copy; 2026 KIFU. All rights reserved.</p>
                <p className="mt-2">AI-Powered Trading Journal</p>
            </footer>
        </div>
    )
}
