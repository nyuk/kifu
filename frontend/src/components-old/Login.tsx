'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'
import { startGuestSession, clearGuestSession } from '../lib/guestSession'
import { useBubbleStore } from '../lib/bubbleStore'
import { resolveAuthRedirectPath } from '../lib/onboardingFlow'
import { isDemoMode } from '../lib/appMode'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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

  if (isDemoMode) {
    return (
      <div className="min-h-screen bg-zinc-950 px-4 py-12 text-zinc-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Demo Mode</p>
          <h1 className="mt-3 text-2xl font-semibold">로그인은 프로덕션 베타에서만 활성화됩니다.</h1>
          <p className="mt-2 text-sm text-zinc-400">
            현재 환경은 Deploy Preview 데모입니다. 게스트 체험으로 UI/흐름을 확인할 수 있습니다.
          </p>
          <Link href="/guest" className="mt-6 inline-flex rounded-lg bg-emerald-500 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-400 transition-colors">
            게스트 체험으로 이동
          </Link>
        </div>
      </div>
    )
  }

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
    } catch (err: any) {
      setError(err?.response?.data?.message || '로그인에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 lg:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-4">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">KIFU 접속</p>
          <h1 className="text-3xl font-semibold text-zinc-100 lg:text-4xl">
            다시 오신 것을 환영합니다.
          </h1>
          <p className="text-base text-zinc-400">
            오늘의 판단을 확인하고, 복기 흐름을 이어서 진행하세요.
          </p>
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-zinc-900/50 p-5 backdrop-blur-md">
            <p className="text-sm font-semibold text-zinc-200">베타 안내</p>
            <p className="mt-2 text-sm text-zinc-400">
              AI 의견은 복기 지표와 함께 기록됩니다. 근거를 구체적으로 남길수록 정확도가 높아집니다.
            </p>
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-md"
        >
          <div className="mb-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">로그인</h1>
            <p className="text-sm text-zinc-400">등록한 이메일과 비밀번호를 입력하세요.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-zinc-900/50 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                placeholder="hello@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-zinc-900/50 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full h-10 px-4 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:active:scale-100"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>

          <div className="relative flex items-center gap-4 py-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-zinc-500">또는</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={() => {
              startGuestSession()
              router.push('/home')
            }}
            className="w-full h-10 px-4 rounded-xl bg-zinc-800 text-zinc-200 border border-white/10 font-medium text-sm hover:bg-zinc-700 hover:text-white active:scale-95 transition-all"
          >
            게스트로 계속하기
          </button>

          <p className="text-sm text-zinc-400">
            처음이신가요?{' '}
            <Link href="/register" className="font-semibold text-zinc-100">
              회원가입
            </Link>
          </p>
          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            랜딩페이지로 돌아가기
          </Link>
        </form>
      </div>
    </div>
  )
}
