'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { clearGuestSession } from '../lib/guestSession'
import { useBubbleStore } from '../lib/bubbleStore'
import { resolveAuthRedirectPath } from '../lib/onboardingFlow'
import { isDemoMode } from '../lib/appMode'

export function Register() {
  const [name, setName] = useState('')
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
        <div className="mx-auto max-w-xl rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Demo Mode</p>
          <h1 className="mt-3 text-2xl font-semibold">회원가입은 프로덕션 베타에서만 활성화됩니다.</h1>
          <p className="mt-2 text-sm text-zinc-400">
            현재 환경은 Deploy Preview 데모입니다. 계정 생성 없이 흐름을 체험할 수 있습니다.
          </p>
          <Link href="/guest" className="mt-6 inline-flex rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950">
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
      await api.post('/v1/auth/register', { name, email, password })
      const loginResponse = await api.post('/v1/auth/login', { email, password })
      resetSessionData()
      setTokens(loginResponse.data.access_token, loginResponse.data.refresh_token)
      clearGuestSession()
      const next = resolveAuthRedirectPath({
        next: searchParams?.get('next'),
        from: searchParams?.get('from'),
        defaultPath: '/onboarding/start',
      })
      window.location.replace(next)
    } catch (err: any) {
      setError(err?.response?.data?.message || '회원가입에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 lg:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-4">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">시작하기</p>
          <h1 className="text-3xl font-semibold text-zinc-100 lg:text-4xl">
            당신의 매매 기록을 쌓아보세요.
          </h1>
          <p className="text-base text-zinc-400">
            진입 근거를 남기고, 결과를 복기하고, 다음 판단에 반영합니다.
          </p>
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
            <p className="text-sm font-semibold text-zinc-200">시작 혜택</p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              <li>• 무료 플랜에서 AI 의견 체험</li>
              <li>• 1h, 4h, 1d 복기 결과 추적</li>
              <li>• API 키 보관함 제공</li>
            </ul>
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8"
        >
          <div>
            <h2 className="text-2xl font-semibold">회원가입</h2>
            <p className="mt-1 text-sm text-zinc-400">무료로 시작할 수 있습니다.</p>
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <label className="text-sm text-zinc-300">
            이름
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-4 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
              placeholder="사용할 이름"
            />
          </label>
          <label className="text-sm text-zinc-300">
            이메일
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-4 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
              placeholder="you@trader.com"
            />
          </label>
          <label className="text-sm text-zinc-300">
            비밀번호
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-4 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
              placeholder="비밀번호를 입력하세요"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? '생성 중...' : '회원가입'}
          </button>
          <p className="text-sm text-zinc-400">
            이미 계정이 있나요?{' '}
            <Link href="/login" className="font-semibold text-zinc-100">
              로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
