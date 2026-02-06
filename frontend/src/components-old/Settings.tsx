'use client'

import { useAuthStore } from '../stores/auth'
import { useI18n } from '../lib/i18n'
import { clearGuestSession } from '../lib/guestSession'
import { LanguageSelector } from '../components/LanguageSelector'
import { ExchangeConnectionManager } from '../components/settings/ExchangeConnectionManager'
import { api } from '../lib/api'
import { useEffect, useState } from 'react'

export function Settings() {
  const { t } = useI18n()
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const accessToken = useAuthStore((state) => state.accessToken)
  const [profileEmail, setProfileEmail] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    const load = async () => {
      if (!accessToken) return
      try {
        const response = await api.get<{ email?: string }>('/v1/users/me')
        if (isActive) setProfileEmail(response.data?.email || null)
      } catch {
        if (isActive) setProfileEmail(null)
      }
    }
    load()
    return () => {
      isActive = false
    }
  }, [accessToken])

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Profile</p>
        <h2 className="mt-3 text-2xl font-semibold text-neutral-100">{t.settingsTitle}</h2>
        <p className="mt-2 text-sm text-neutral-400">
          {t.settingsSubtitle}
        </p>
      </header>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Language / 언어</p>
          <p className="mt-3 text-lg font-semibold text-neutral-200">Interface Language</p>
          <div className="mt-4">
            <LanguageSelector />
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Account</p>
          <p className="mt-3 text-lg font-semibold text-neutral-200">Email + Tier</p>
          <p className="mt-2 text-sm text-neutral-500">
            This section will surface subscription state and usage.
          </p>
          <p className="mt-3 text-xs text-neutral-500">
            로그인 계정: {profileEmail || (accessToken ? '불러오는 중...' : '로그인 정보 없음')}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Exchanges</p>
          <p className="mt-3 text-lg font-semibold text-neutral-200">API Trade Sync</p>
          <div className="mt-4">
            <ExchangeConnectionManager />
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">AI Usage</p>
          <p className="mt-3 text-lg font-semibold text-neutral-200">AI 분석은 서버에서 처리됩니다</p>
          <p className="mt-2 text-sm text-neutral-500">
            개인 API 키 등록 없이 바로 사용할 수 있도록 설계했습니다. 사용량은 구독 플랜에 따라 관리됩니다.
          </p>
        </div>
      </section>
      <button
        type="button"
        onClick={() => {
          clearGuestSession()
          clearTokens()
        }}
        className="w-full rounded-xl border border-neutral-700/80 bg-neutral-900/60 px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500"
      >
        Log out (local only)
      </button>
    </div>
  )
}
