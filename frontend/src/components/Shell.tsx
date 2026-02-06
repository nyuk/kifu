'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '../stores/auth'
import { useI18n } from '../lib/i18n'
import { useState, useEffect } from 'react'

export function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const navItems = [
    { label: t.navChart, to: '/chart' },
    { label: t.navBubbles, to: '/bubbles' },
    { label: t.navTrades, to: '/trades' },
    { label: t.navReview, to: '/review' },
    { label: t.navAlerts, to: '/alerts' },
    { label: t.navSettings, to: '/settings' },
  ]

  const handleLogout = () => {
    clearTokens()
    router.push('/login')
  }

  // Prevent hydration mismatch by rendering a simplified version during SSR
  if (!mounted) {
    return (
      <div className="h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
        <div className="flex h-full flex-col gap-6 px-4 py-6 lg:flex-row">
          <aside className="flex flex-col gap-6 rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5 lg:w-64 flex-shrink-0">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">KIFU</p>
              <h1 className="mt-3 text-2xl font-semibold text-neutral-100">Trading Journal</h1>
            </div>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  href={item.to}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition text-neutral-300 hover:bg-neutral-800/80"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto rounded-xl border border-neutral-800/60 bg-neutral-900/60 p-4">
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
          <main className="flex-1 overflow-y-auto min-h-0">
            {children}
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <div className="flex h-full flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="flex flex-col gap-6 rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5 lg:w-64 flex-shrink-0 overflow-y-auto">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">KIFU</p>
            <h1 className="mt-3 text-2xl font-semibold text-neutral-100">{t.appTagline}</h1>
          </div>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.to || pathname?.startsWith(item.to + '/')
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-neutral-200 text-neutral-950'
                      : 'text-neutral-300 hover:bg-neutral-800/80'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto rounded-xl border border-neutral-800/60 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.sessionLabel}</p>
            <p className="mt-2 text-sm text-neutral-300">{t.sessionText}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-200 transition hover:border-neutral-500"
            >
              {t.logout}
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}
