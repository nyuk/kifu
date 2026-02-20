'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '../stores/auth'
import { useI18n } from '../lib/i18n'
import { useState, useEffect } from 'react'
import { clearGuestSession, readGuestSession } from '../lib/guestSession'
import { api } from '../lib/api'
import { useBubbleStore } from '../lib/bubbleStore'
import { Home, PieChart, LineChart, Bell, Zap, FileText, Settings, TrendingUp, Boxes, ShieldCheck } from 'lucide-react'

type ShellTheme = 'neutral' | 'forest' | 'warm'
const SHELL_THEME_KEY = 'kifu-shell-theme-v1'

export function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const resetSessionData = useBubbleStore((state) => state.resetSessionData)
  const accessToken = useAuthStore((state) => state.accessToken)
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null)
  const [profileEmail, setProfileEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [shellTheme, setShellTheme] = useState<ShellTheme>('neutral')
  const contentClass = 'relative z-10 h-full overflow-y-auto px-4 py-6 md:px-6 lg:px-8'

  const isGuestSessionActive = Boolean(guestSessionId)

  useEffect(() => {
    setMounted(true)
    setGuestSessionId(readGuestSession()?.id || null)
    try {
      const saved = localStorage.getItem(SHELL_THEME_KEY)
      if (saved === 'neutral' || saved === 'forest' || saved === 'warm') {
        setShellTheme(saved)
      }
    } catch {
      // no-op
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(SHELL_THEME_KEY, shellTheme)
    } catch {
      // no-op
    }
  }, [mounted, shellTheme])

  useEffect(() => {
    let isActive = true
    const load = async () => {
      if (!accessToken) {
        if (isActive) {
          setProfileEmail(null)
          setIsAdmin(false)
        }
        return
      }
      try {
        const response = await api.get<{ email?: string; is_admin?: boolean }>('/v1/users/me')
        if (!isActive) return
        setProfileEmail(response.data?.email || null)
        setIsAdmin(Boolean(response.data?.is_admin))
      } catch {
        if (isActive) setProfileEmail(null)
        if (isActive) setIsAdmin(false)
      }
    }
    load()
    return () => {
      isActive = false
    }
  }, [accessToken])

  const baseNavItems = [
    { icon: Home, label: t.navHome, href: '/home', color: 'text-fuchsia-400', activeColor: 'bg-fuchsia-400/10 text-fuchsia-300' },
    { icon: PieChart, label: t.navPortfolio, href: '/portfolio', color: 'text-violet-400', activeColor: 'bg-violet-400/10 text-violet-300' },
    { icon: LineChart, label: t.navChart, href: '/chart', color: 'text-sky-400', activeColor: 'bg-sky-400/10 text-sky-300' },
    { icon: Bell, label: t.navAlert, href: '/alert', color: 'text-orange-400', activeColor: 'bg-orange-400/10 text-orange-300' },
    { icon: Boxes, label: 'Bubbles', href: '/bubbles', color: 'text-amber-400', activeColor: 'bg-amber-400/10 text-amber-300' },
    { icon: Zap, label: t.navTrades, href: '/trades', color: 'text-rose-400', activeColor: 'bg-rose-400/10 text-rose-300' },
    { icon: FileText, label: 'Review', href: '/review', color: 'text-emerald-400', activeColor: 'bg-emerald-400/10 text-emerald-300' },
    { icon: TrendingUp, label: t.navAlerts, href: '/alerts', color: 'text-indigo-400', activeColor: 'bg-indigo-400/10 text-indigo-300' },
    { icon: Settings, label: 'Settings', href: '/settings', color: 'text-neutral-400', activeColor: 'bg-white/5 text-white' },
  ]

  const navItems = isAdmin && !isGuestSessionActive
    ? [...baseNavItems, { icon: ShieldCheck, label: 'Admin', href: '/admin', color: 'text-cyan-400', activeColor: 'bg-cyan-400/10 text-cyan-300' }]
    : baseNavItems

  const handleLogout = () => {
    clearGuestSession()
    resetSessionData()
    clearTokens()
    router.push('/login')
  }

  // Prevent hydration mismatch by rendering a simplified version during SSR
  if (!mounted) {
    return (
      <div className="app-shell theme-neutral h-screen overflow-hidden">
        <div className="relative z-10 flex h-full flex-col gap-6 px-4 py-6 lg:flex-row">
          <aside className="flex flex-col gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.06] p-5 lg:w-64 flex-shrink-0 backdrop-blur-xl">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">KIFU</p>
              <h1 className="mt-3 text-2xl font-semibold text-neutral-100">Trading Journal</h1>
            </div>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition text-neutral-300 hover:bg-neutral-800/80"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Session</p>
              <p className="mt-2 text-sm text-neutral-300">Loading...</p>
              <button
                type="button"
                disabled
                className="mt-3 w-full rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
              >
                Log out
              </button>
            </div>
          </aside>
          <main className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.06] backdrop-blur-sm">
            {children}
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className={`app-shell theme-${shellTheme} h-screen overflow-hidden font-sans text-stone-200 selection:bg-stone-700 selection:text-white`}>
      <div className="pointer-events-none absolute right-6 top-4 z-30 hidden md:block">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/[0.12] bg-black/35 p-1 backdrop-blur-md">
          {([
            { key: 'neutral', label: 'Neutral' },
            { key: 'forest', label: 'Forest' },
            { key: 'warm', label: 'Warm' },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setShellTheme(item.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${shellTheme === item.key
                ? 'bg-white text-black'
                : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="relative flex flex-col gap-6 rounded-2xl border border-amber-900/20 bg-white/[0.06] backdrop-blur-xl p-5 lg:w-64 flex-shrink-0 overflow-y-auto shadow-2xl shadow-black/40">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 font-bold">KIFU</p>
            <h1 className="mt-3 text-2xl font-bold text-zinc-100 tracking-tight">{t.appTagline}</h1>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

              // Determine accent color for the indicator based on route
              let accentClass = 'bg-neutral-500'
              if (item.href.includes('home')) accentClass = 'bg-fuchsia-500'
              else if (item.href.includes('portfolio')) accentClass = 'bg-violet-500'
              else if (item.href.includes('chart')) accentClass = 'bg-sky-500'
              else if (item.href.includes('alert')) accentClass = 'bg-orange-500'
              else if (item.href.includes('bubbles')) accentClass = 'bg-amber-500'
              else if (item.href.includes('trades')) accentClass = 'bg-rose-500'
              else if (item.href.includes('review')) accentClass = 'bg-emerald-500'
              else if (item.href.includes('admin')) accentClass = 'bg-cyan-500'
              else if (item.href.includes('settings')) accentClass = 'bg-neutral-500'

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-lg h-9 px-3 text-sm font-medium transition-all duration-200 ${isActive
                  ? item.activeColor || 'bg-white/[0.1] text-white'
                  : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                  } ${item.color || ''}`}
                >
                  {isActive && (
                    <div className={`absolute left-0 h-full w-[3px] rounded-r-full ${accentClass} shadow-[0_0_12px_rgba(255,255,255,0.3)]`} />
                  )}
                  <item.icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className={isActive ? 'translate-x-1 transition-transform' : 'transition-transform group-hover:translate-x-1'}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.06] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t.sessionLabel}</p>
            <p className="mt-2 text-sm text-zinc-300">
              {t.sessionText}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {guestSessionId ? (
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-200">
                  Guest · {guestSessionId}
                </span>
              ) : (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200">
                  Member
                </span>
              )}
              <span className="text-[10px] text-neutral-600 truncate max-w-[120px]">
                {profileEmail || 'Loading...'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-300 transition hover:bg-white/10 hover:text-white"
            >
              {t.logout}
            </button>
          </div>
        </aside>
        <main className="relative min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.06] shadow-inner backdrop-blur-sm">
          {/* Top Gradient Fade moved to individual pages or could be here globally */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <div className={contentClass}>
          {children}
        </div>
      </main>
    </div>
  </div>
  )
}
