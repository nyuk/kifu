'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { clearGuestSession, startGuestSession } from '../lib/guestSession'
import { useBubbleStore } from '../lib/bubbleStore'
import { resolveAuthRedirectPath } from '../lib/onboardingFlow'

const tgBotUrl = 'https://t.me/kifu_main_bot'

export function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGuestLoading, setIsGuestLoading] = useState(false)
  const setTokens = useAuthStore((state) => state.setTokens)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const resetSessionData = useBubbleStore((state) => state.resetSessionData)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/home')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await api.post('/v1/auth/register', { name, email, password })
      const loginResponse = await api.post('/v1/auth/login', { email, password })
      resetSessionData()
      setTokens(loginResponse.data.access_token, loginResponse.data.refresh_token)
      clearGuestSession()
      const next = resolveAuthRedirectPath({
        next: searchParams?.get('next'),
        from: searchParams?.get('from'),
        defaultPath: '/home',
      })
      window.location.replace(next)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || '회원가입에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuestContinue = async () => {
    setError('')
    setIsGuestLoading(true)
    try {
      const response = await api.post('/v1/auth/guest')
      resetSessionData()
      setTokens(response.data.access_token, response.data.refresh_token)
      startGuestSession()
      router.push('/home')
    } catch {
      setError('게스트 로그인에 실패했습니다.')
    } finally {
      setIsGuestLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="text-lg font-bold tracking-wider text-neutral-900">KIFU</Link>
        <Link href="/login" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
          로그인
        </Link>
      </nav>

      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-900">회원가입</h1>
            <p className="mt-2 text-sm text-neutral-400">무료로 매매 복기를 시작하세요.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">이름</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 transition-all"
                placeholder="사용할 이름"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">이메일</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 transition-all"
                placeholder="hello@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">비밀번호</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 transition-all"
                placeholder="6자 이상"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center my-6">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="px-3 text-xs text-neutral-400">또는</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          {/* Guest & Telegram */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGuestContinue}
              disabled={isGuestLoading || isLoading}
              className="w-full h-11 rounded-xl border border-neutral-200 bg-white text-sm font-medium text-neutral-600 hover:bg-neutral-50 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isGuestLoading ? '게스트 세션 시작 중...' : '게스트로 둘러보기'}
            </button>

            <a
              href={tgBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 rounded-xl bg-[#2AABEE] text-white text-sm font-semibold hover:bg-[#229ED9] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              텔레그램으로 시작 (가입 불필요)
            </a>
          </div>

          {/* Early access info */}
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-700">얼리 액세스 — 전 기능 무료</p>
            <p className="mt-1 text-xs text-emerald-600/70">텔레그램 복기 봇, AI 의견 비교, 거래소 연동 모두 포함</p>
          </div>

          {/* Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-400">
              이미 계정이 있나요?{' '}
              <Link href="/login" className="font-semibold text-neutral-900 hover:underline">로그인</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
