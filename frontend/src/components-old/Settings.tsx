'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuthStore } from '../stores/auth'
import { useI18n } from '../lib/i18n'
import { clearGuestSession, isGuestSession } from '../lib/guestSession'
import { LanguageSelector } from '../components/LanguageSelector'
import { ExchangeConnectionManager } from '../components/settings/ExchangeConnectionManager'
import { api } from '../lib/api'
import { useAlertStore } from '../stores/alertStore'
import type { TelegramConnectResponse } from '../types/alert'

function TelegramConnect() {
  const { t } = useI18n()
  const { channels, isLoadingChannels, fetchChannels, connectTelegram, disconnectTelegram } = useAlertStore()
  const [connectData, setConnectData] = useState<TelegramConnectResponse | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setConnectData(null)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // Poll for verification while code is active
  useEffect(() => {
    if (!connectData || countdown <= 0) return
    const interval = setInterval(() => {
      fetchChannels()
    }, 5000)
    return () => clearInterval(interval)
  }, [connectData, countdown, fetchChannels])

  // Close connect flow if channel is verified
  const tgChannel = channels.find((ch) => ch.type === 'telegram')
  useEffect(() => {
    if (tgChannel?.verified && connectData) {
      setConnectData(null)
      setCountdown(0)
    }
  }, [tgChannel, connectData])

  const handleConnect = useCallback(async () => {
    const data = await connectTelegram()
    if (data) {
      setConnectData(data)
      setCountdown(data.expires_in)
    }
  }, [connectTelegram])

  const handleDisconnect = useCallback(async () => {
    if (!confirm('텔레그램 연결을 해제하시겠습니까?')) return
    await disconnectTelegram()
  }, [disconnectTelegram])

  const isConnected = tgChannel?.verified

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-200">{t.telegramTitle}</span>
            {isConnected ? (
              <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                {t.telegramConnected}
              </span>
            ) : (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                {t.telegramNotConnected}
              </span>
            )}
          </div>
        </div>
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={isLoadingChannels}
            className="rounded-lg px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition disabled:opacity-50"
          >
            {t.telegramDisconnect}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isLoadingChannels || !!connectData}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 transition disabled:opacity-50"
          >
            {t.telegramConnect}
          </button>
        )}
      </div>

      {connectData && countdown > 0 && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          {connectData.bot_url ? (
            <>
              <p className="text-sm text-zinc-300">{t.telegramOpenBot}</p>
              <a
                href={connectData.bot_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#2AABEE] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#229ED9] transition"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.442-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                {t.telegramOpenBotBtn}
              </a>
              <p className="mt-2 text-xs text-zinc-500">
                {t.telegramExpires}: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-300">{t.telegramCodeMsg}</p>
              <div className="mt-2 flex items-center gap-3">
                <code className="rounded bg-zinc-900 px-4 py-2 text-2xl font-mono font-bold tracking-widest text-zinc-100">
                  {connectData.code}
                </code>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {t.telegramExpires}: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{connectData.message}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function Settings() {
  const { t } = useI18n()
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const accessToken = useAuthStore((state) => state.accessToken)
  const [profileEmail, setProfileEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [guestMode, setGuestMode] = useState(false)

  useEffect(() => {
    setGuestMode(isGuestSession())
  }, [])

  useEffect(() => {
    let isActive = true
    const load = async () => {
      if (!accessToken) return
      try {
        const response = await api.get<{ email?: string; is_admin?: boolean }>('/v1/users/me')
        if (isActive) {
          setProfileEmail(response.data?.email || null)
          setIsAdmin(Boolean(response.data?.is_admin))
        }
      } catch {
        if (isActive) {
          setProfileEmail(null)
          setIsAdmin(false)
        }
      }
    }
    load()
    return () => {
      isActive = false
    }
  }, [accessToken])

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Profile</p>
        <h2 className="mt-3 text-2xl font-semibold text-zinc-100">{t.settingsTitle}</h2>
        <p className="mt-2 text-sm text-zinc-400">
          {t.settingsSubtitle}
        </p>
      </header>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Language / 언어</p>
          <p className="mt-3 text-lg font-semibold text-zinc-200">Interface Language</p>
          <div className="mt-4">
            <LanguageSelector />
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Account</p>
          <p className="mt-3 text-lg font-semibold text-zinc-200">Email + Tier</p>
          <p className="mt-2 text-sm text-zinc-500">
            This section will surface subscription state and usage.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            로그인 계정: {profileEmail || (accessToken ? '불러오는 중...' : '로그인 정보 없음')}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Exchanges</p>
          <p className="mt-3 text-lg font-semibold text-zinc-200">API Trade Sync</p>
          <div className="mt-4">
            <ExchangeConnectionManager />
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">AI Usage</p>
          <p className="mt-3 text-lg font-semibold text-zinc-200">AI 분석은 서버에서 처리됩니다</p>
          <p className="mt-2 text-sm text-zinc-500">
            개인 API 키 등록 없이 바로 사용할 수 있도록 설계했습니다. 사용량은 구독 플랜에 따라 관리됩니다.
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Notifications</p>
          <p className="mt-3 text-lg font-semibold text-zinc-200">{t.telegramTitle}</p>
          <div className="mt-4">
            <TelegramConnect />
          </div>
        </div>
        {!guestMode && isAdmin && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Diagnostics</p>
            <p className="mt-3 text-lg font-semibold text-zinc-200">30일 사용자 시뮬레이터</p>
            <p className="mt-2 text-sm text-zinc-500">
              사용자 행동을 날짜 단위로 압축 실행해 루틴/복기 누락/데이터 누적 상태를 빠르게 점검합니다.
            </p>
            <div className="mt-4">
              <Link
                href="/admin/sim-report"
                className="inline-flex h-10 items-center rounded-lg border border-sky-300/40 bg-sky-500/20 px-4 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30"
              >
                시뮬레이터 열기
              </Link>
            </div>
          </div>
        )}
      </section>
      <button
        type="button"
        onClick={() => {
          clearGuestSession()
          clearTokens()
        }}
        className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.05] text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.1] hover:text-white active:scale-95"
      >
        Log out (local only)
      </button>
    </div>
  )
}
