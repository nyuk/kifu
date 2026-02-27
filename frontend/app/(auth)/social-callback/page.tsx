'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '../../../src/stores/auth'
import Link from 'next/link'

export default function SocialCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('로그인 처리 중입니다.')

  useEffect(() => {
    const providerError = searchParams?.get('error')
    if (providerError) {
      const detail = searchParams?.get('error_description')
      const normalized = providerError.trim().toUpperCase()
      const mapped =
        normalized === 'ACCOUNT_LINK_REQUIRED'
          ? '같은 이메일 계정이 이미 있습니다. 먼저 이메일/비밀번호로 로그인한 뒤 계정 연결을 진행해주세요.'
          : normalized === 'INVALID_STATE'
            ? '로그인 세션이 만료되었거나 상태 검증에 실패했습니다. 다시 시도해주세요.'
            : normalized === 'AUTH_FAILED'
              ? '소셜 인증 처리에 실패했습니다. 잠시 후 다시 시도해주세요.'
              : normalized === 'AUTH_ERROR'
                ? '소셜 로그인 과정이 취소되었거나 공급자에서 오류가 발생했습니다.'
                : ''
      setError(mapped || (detail ? `${providerError}: ${detail}` : providerError))
      setMessage('')
      return
    }

    const accessToken = searchParams?.get('access_token')
    const refreshToken = searchParams?.get('refresh_token')
    const nextPath = searchParams?.get('next') || '/home'
    const sanitizedNext = nextPath.startsWith('/') ? nextPath : '/home'

    if (!accessToken || !refreshToken) {
      setError('소셜 로그인 처리 중 필요한 토큰을 받지 못했습니다.')
      setMessage('')
      return
    }

    useAuthStore.getState().setTokens(accessToken, refreshToken)
    router.replace(sanitizedNext)
  }, [router, searchParams])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
          <p className="text-sm font-semibold text-rose-200">소셜 로그인 실패</p>
          <p className="mt-3 text-sm leading-relaxed text-rose-100">{error}</p>
          <div className="mt-4 space-y-2 text-sm">
            <Link href={`/login${searchParams?.get('next') ? `?next=${encodeURIComponent(searchParams.get('next') || '')}` : ''}`} className="block font-semibold text-emerald-300 hover:text-emerald-200">
              로그인 페이지로 이동
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-200"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
      <p>{message}</p>
    </div>
  )
}
