'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '../lib/api'
import { trackGrowthGuestStart } from '../lib/growth'
import { useAuthStore } from '../stores/auth'
import { clearGuestSession, startGuestSession } from '../lib/guestSession'
import { useBubbleStore } from '../lib/bubbleStore'
import { resolveAuthRedirectPath } from '../lib/onboardingFlow'

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
      const session = startGuestSession()
      if (session) {
        await trackGrowthGuestStart({
          guestSessionId: session.id,
          entryPoint: 'register_guest_continue',
          sourcePath: '/register',
        })
      }
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

          <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">빠른 둘러보기</p>
            <p className="mt-2 text-sm font-medium text-neutral-900">가입 전에 주요 화면부터 먼저 볼 수 있습니다.</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">바로 회원가입하지 않아도 괜찮습니다. 게스트 모드로 전체 느낌을 먼저 확인한 뒤 웹 계정을 만들 수 있습니다.</p>
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
              계정 없이 화면만 먼저 보고 싶다면 게스트 대시보드 보기
            </Link>
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
