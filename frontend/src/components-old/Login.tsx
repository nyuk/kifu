'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'
import { startGuestSession, clearGuestSession } from '../lib/guestSession'
import { useBubbleStore } from '../lib/bubbleStore'
import { resolveAuthRedirectPath } from '../lib/onboardingFlow'

type SocialLoginStartResponse = {
  provider: string
  status: string
  message: string
  auth_url?: string
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGuestLoading, setIsGuestLoading] = useState(false)
  const [socialMessage, setSocialMessage] = useState('')
  const [socialLoading, setSocialLoading] = useState('')
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
      const response = await api.post('/v1/auth/login', { email, password })
      resetSessionData()
      setTokens(response.data.access_token, response.data.refresh_token)
      clearGuestSession()
      const next = resolveAuthRedirectPath({
        from: searchParams?.get('from'),
        next: searchParams?.get('next'),
        defaultPath: '/home',
      })
      window.location.replace(next)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || '로그인에 실패했습니다. 다시 시도해주세요.')
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
      setError('게스트 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsGuestLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google') => {
    setError('')
    setSocialMessage('')
    setSocialLoading(provider)
    try {
      const nextPath = searchParams?.get('next') || searchParams?.get('from') || ''
      const response = await api.get<SocialLoginStartResponse>(`/v1/auth/social-login/${provider}`, {
        params: { return_to: nextPath || '/home' },
      })
      const next = response.data
      if (next.status === 'ready' && next.auth_url) {
        window.location.href = next.auth_url
        return
      }
      setSocialMessage(next.message || `${provider} 로그인은 준비중입니다.`)
    } catch {
      setError('소셜 로그인은 현재 사용할 수 없습니다.')
    } finally {
      setSocialLoading('')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="text-lg font-bold tracking-wider text-neutral-900">KIFU</Link>
        <Link href="/register" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
          회원가입
        </Link>
      </nav>

      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-900">로그인</h1>
            <p className="mt-2 text-sm text-neutral-400">계정에 접속하여 복기를 이어가세요.</p>
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
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* Social login */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={Boolean(socialLoading)}
              className="w-full h-11 rounded-xl border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {socialLoading === 'google' ? '처리 중...' : 'Google로 계속하기'}
            </button>
            {socialMessage && (
              <p className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-600">
                {socialMessage}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex items-center my-6">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="px-3 text-xs text-neutral-400">또는</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">빠른 둘러보기</p>
            <p className="mt-2 text-sm font-medium text-neutral-900">회원가입 전에 화면 흐름부터 볼 수 있습니다.</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">실제 사용은 이메일 또는 Google 로그인 후 웹 설정에서 이어가고, 지금은 게스트 모드로 가볍게 체험할 수 있습니다.</p>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={handleGuestContinue}
                disabled={isGuestLoading || isLoading}
                className="w-full h-11 rounded-xl border border-neutral-200 bg-white text-neutral-700 text-sm font-semibold hover:bg-neutral-100 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isGuestLoading ? '게스트 세션 시작 중...' : '게스트로 시작'}
              </button>
            </div>
          </section>

          {/* Guest */}
          <div className="mt-3 text-center">
            <Link href="/guest?mode=preview" className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors">
              실제 로그인 없이 미리보기만 하고 싶다면 게스트 대시보드 보기
            </Link>
          </div>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-neutral-400">
              처음이신가요?{' '}
              <Link href="/register" className="font-semibold text-neutral-900 hover:underline">회원가입</Link>
            </p>
            <p className="text-xs text-neutral-400">
              <Link href="/account-help" className="hover:text-neutral-600 transition-colors">계정 찾기</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
