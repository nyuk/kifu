'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '../stores/auth'
import { useI18n } from '../lib/i18n'
import { useState, useEffect } from 'react'
import { clearGuestSession, readGuestSession } from '../lib/guestSession'
import { api } from '../lib/api'
import { useBubbleStore } from '../lib/bubbleStore'
import { Home, PieChart, LineChart, Bell, Zap, FileText, Settings, TrendingUp, Boxes, ShieldCheck, Megaphone, Menu, X } from 'lucide-react'
import { LegalFooter } from './legal/LegalFooter'

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const contentClass = 'relative z-10 px-0 py-3 pb-24 md:px-2 lg:h-full lg:overflow-y-auto lg:px-8 lg:py-6 lg:pb-6'

  const isGuestSessionActive = Boolean(guestSessionId)

  useEffect(() => {
    setMounted(true)
    const guestSession = readGuestSession()
    setGuestSessionId(guestSession?.id || null)
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

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  const baseNavItems = [
    { icon: Home, label: t.navHome, href: '/home', color: 'text-fuchsia-400', activeColor: 'bg-fuchsia-400/10 text-fuchsia-300' },
    { icon: PieChart, label: t.navPortfolio, href: '/portfolio', color: 'text-violet-400', activeColor: 'bg-violet-400/10 text-violet-300' },
    { icon: LineChart, label: t.navChart, href: '/chart', color: 'text-sky-400', activeColor: 'bg-sky-400/10 text-sky-300' },
    { icon: Bell, label: '긴급 대응', href: '/alert', color: 'text-orange-400', activeColor: 'bg-orange-400/10 text-orange-300' },
    { icon: Boxes, label: '말풍선', href: '/bubbles', color: 'text-amber-400', activeColor: 'bg-amber-400/10 text-amber-300' },
    { icon: Zap, label: t.navTrades, href: '/trades', color: 'text-rose-400', activeColor: 'bg-rose-400/10 text-rose-300' },
    { icon: FileText, label: '복기 센터', href: '/review', color: 'text-emerald-400', activeColor: 'bg-emerald-400/10 text-emerald-300' },
    { icon: Settings, label: '설정', href: '/settings', color: 'text-neutral-400', activeColor: 'bg-white/5 text-white' },
  ]

  const effectiveBaseNavItems = isGuestSessionActive
    ? baseNavItems
    : [
        ...baseNavItems.slice(0, 7),
        { icon: TrendingUp, label: t.navAlerts, href: '/alerts', color: 'text-indigo-400', activeColor: 'bg-indigo-400/10 text-indigo-300' },
        ...baseNavItems.slice(7),
      ]

  const navItems = isAdmin && !isGuestSessionActive
    ? [
        ...effectiveBaseNavItems,
        { icon: Megaphone, label: '마케팅', href: '/marketing', color: 'text-amber-300', activeColor: 'bg-amber-300/10 text-amber-200' },
        { icon: ShieldCheck, label: '관리자', href: '/admin', color: 'text-cyan-400', activeColor: 'bg-cyan-400/10 text-cyan-300' },
      ]
    : effectiveBaseNavItems

  const mobilePrimaryNavItems = navItems.slice(0, 5)

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
          <aside className="hidden flex-col gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.06] p-5 lg:flex lg:w-64 lg:flex-shrink-0 backdrop-blur-xl">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">KIFU</p>
              <h1 className="mt-3 text-2xl font-semibold text-neutral-100">거래 복기</h1>
            </div>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group kifu-nav-link"
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
                className="kifu-btn-secondary mt-3 w-full"
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
    <div className={`app-shell theme-${shellTheme} min-h-screen overflow-x-hidden font-sans text-stone-200 selection:bg-stone-700 selection:text-white lg:h-screen lg:overflow-hidden`}>
      <div className="pointer-events-none absolute right-6 top-4 z-30 hidden md:block">
        <div className="pointer-events-auto kifu-segmented gap-1 rounded-full bg-black/35 backdrop-blur-md">
          {([
            { key: 'neutral', label: '기본' },
            { key: 'forest', label: '숲' },
            { key: 'warm', label: '웜' },
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

      <div className="relative z-10 flex min-h-screen flex-col gap-3 px-3 py-3 pb-24 lg:h-full lg:min-h-0 lg:flex-row lg:gap-6 lg:px-4 lg:py-6 lg:pb-6">
        <div className="sticky top-3 z-20 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#101419]/90 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur-xl lg:hidden">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">KIFU</p>
            <p className="mt-1 truncate text-sm font-semibold text-zinc-100">
              {navItems.find((item) => pathname === item.href || pathname?.startsWith(item.href + '/'))?.label || 'Dashboard'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-100"
            aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-20 bg-black/60"
              aria-label="Close navigation overlay"
            />
            <aside className="fixed inset-x-4 top-20 z-30 flex max-h-[calc(100vh-7rem)] flex-col gap-5 overflow-y-auto rounded-3xl border border-white/10 bg-[#0e1117]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 font-bold">KIFU</p>
                <h1 className="mt-3 text-xl font-bold text-zinc-100 tracking-tight">거래 복기</h1>
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group kifu-nav-link ${isActive ? `kifu-nav-link-active ${item.activeColor || ''}` : ''}`}
                    >
                      <item.icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : `group-hover:scale-110 ${item.color}`}`} />
                      <span className={isActive ? 'translate-x-1 transition-transform' : 'transition-transform group-hover:translate-x-1'}>
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </nav>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t.sessionLabel}</p>
                <p className="mt-2 text-sm text-zinc-300">{t.sessionText}</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="kifu-btn-secondary mt-4 w-full"
                >
                  {t.logout}
                </button>
              </div>
            </aside>
          </div>
        )}

        <aside className="relative hidden flex-col gap-6 rounded-2xl border border-amber-900/20 bg-white/[0.06] backdrop-blur-xl p-5 shadow-2xl shadow-black/40 lg:flex lg:w-64 lg:flex-shrink-0 lg:overflow-y-auto">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 font-bold">KIFU</p>
            <h1 className="mt-3 text-2xl font-bold text-zinc-100 tracking-tight">거래 복기</h1>
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
              else if (item.href.includes('marketing')) accentClass = 'bg-amber-400'
              else if (item.href.includes('admin')) accentClass = 'bg-cyan-500'
              else if (item.href.includes('settings')) accentClass = 'bg-neutral-500'

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group kifu-nav-link ${isActive ? `kifu-nav-link-active ${item.activeColor || ''}` : ''}`}
                >
                  {isActive && (
                    <div className={`absolute left-0 h-full w-[3px] rounded-r-full ${accentClass} shadow-[0_0_12px_rgba(255,255,255,0.3)]`} />
                  )}
                  <item.icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : `group-hover:scale-110 ${item.color}`}`} />
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
              ) : isAdmin ? (
                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-200">
                  관리자
                </span>
              ) : (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200">
                  멤버
                </span>
              )}
              <span className="text-[10px] text-neutral-600 truncate max-w-[120px]">
                {profileEmail || 'Loading...'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="kifu-btn-secondary mt-4 w-full"
            >
              {t.logout}
            </button>
          </div>
        </aside>
        <main className="relative flex-1 lg:min-h-0 lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-white/[0.06] lg:bg-white/[0.06] lg:shadow-inner lg:backdrop-blur-sm">
          {/* Top Gradient Fade moved to individual pages or could be here globally */}
          <div className="pointer-events-none absolute left-0 right-0 top-0 hidden h-32 bg-gradient-to-b from-white/5 to-transparent lg:block" />
          <div className={contentClass}>
            {isGuestSessionActive && (
              <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">둘러보기 모드</p>
                    <p className="mt-1 text-sm text-amber-100">
                      게스트에서는 화면 흐름만 먼저 둘러볼 수 있습니다. 알림 설정, 버블 저장, 복기 작성, 포지션 수정 같은 저장 기능은 회원 전용입니다.
                    </p>
                  </div>
                  <Link
                    href="/register?next=%2Fonboarding%2Fimport"
                    className="kifu-btn-primary bg-amber-200 hover:bg-amber-100"
                  >
                    회원가입 후 저장 기능 사용하기
                  </Link>
                </div>
              </div>
            )}
            {children}
            <div className="mt-10 hidden rounded-2xl border border-white/[0.06] bg-black/10 md:block">
              <LegalFooter variant="app" />
            </div>
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-5 gap-2 rounded-3xl border border-white/10 bg-[#0e1117]/92 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl lg:hidden">
        {mobilePrimaryNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition ${
                isActive ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
