'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../stores/auth'
import { useI18n } from '../lib/i18n'
import { LanguageSelector } from '../components/LanguageSelector'
import { AIKeyManager } from '../components/settings/AIKeyManager'
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
            <span className="font-medium text-neutral-200">{t.telegramTitle}</span>
            {isConnected ? (
              <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                {t.telegramConnected}
              </span>
            ) : (
              <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-500">
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
          <p className="text-sm text-neutral-300">{t.telegramCodeMsg}</p>
          <div className="mt-2 flex items-center gap-3">
            <code className="rounded bg-neutral-900 px-4 py-2 text-2xl font-mono font-bold tracking-widest text-neutral-100">
              {connectData.code}
            </code>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {t.telegramExpires}: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
          </p>
          <p className="mt-1 text-xs text-neutral-500">{connectData.message}</p>
        </div>
      )}
    </div>
  )
}

export function Settings() {
  const { t } = useI18n()
  const clearTokens = useAuthStore((state) => state.clearTokens)

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
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">AI Providers</p>
          <p className="mt-3 text-lg font-semibold text-neutral-200">AI API Keys</p>
          <div className="mt-4">
            <AIKeyManager />
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Notifications</p>
          <p className="mt-3 text-lg font-semibold text-neutral-200">{t.telegramTitle}</p>
          <div className="mt-4">
            <TelegramConnect />
          </div>
        </div>
      </section>
      <button
        type="button"
        onClick={clearTokens}
        className="w-full rounded-xl border border-neutral-700/80 bg-neutral-900/60 px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500"
      >
        Log out (local only)
      </button>
    </div>
  )
}
