'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'
import { clearGuestSession } from '../lib/guestSession'
import { useBubbleStore } from '../lib/bubbleStore'
import { resolveAuthRedirectPath } from '../lib/onboardingFlow'

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
    <div className="min-h-screen bg-neutral-950 px-4 py-12 text-neutral-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 lg:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-4">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">KIFU 접속</p>
          <h1 className="text-3xl font-semibold text-neutral-100 lg:text-4xl">
            다시 오신 것을 환영합니다.
          </h1>
          <p className="text-base text-neutral-400">
            오늘의 판단을 확인하고, 복기 흐름을 이어서 진행하세요.
          </p>
          <div className="mt-6 rounded-2xl border border-neutral-800/70 bg-neutral-900/50 p-5">
            <p className="text-sm font-semibold text-neutral-200">베타 안내</p>
            <p className="mt-2 text-sm text-neutral-400">
              AI 의견은 복기 지표와 함께 기록됩니다. 근거를 구체적으로 남길수록 정확도가 높아집니다.
            </p>
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-8"
        >
          <div>
            <h2 className="text-2xl font-semibold">로그인</h2>
            <p className="mt-1 text-sm text-neutral-400">등록한 이메일과 비밀번호를 입력하세요.</p>
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <label className="text-sm text-neutral-300">
            이메일
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-4 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
              placeholder="you@trader.com"
            />
          </label>
          <label className="text-sm text-neutral-300">
            비밀번호
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-4 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
              placeholder="••••••••"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
          <p className="text-sm text-neutral-400">
            처음이신가요?{' '}
            <Link href="/register" className="font-semibold text-neutral-100">
              회원가입
            </Link>
          </p>
          <Link
            href="/"
            className="text-sm text-neutral-500 transition hover:text-neutral-300"
          >
            랜딩페이지로 돌아가기
          </Link>
        </form>
      </div>
    </div>
  )
}
