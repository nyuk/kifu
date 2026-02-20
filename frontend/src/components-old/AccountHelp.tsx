'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { api } from '../lib/api'

type Mode = 'username' | 'password'

export function AccountHelp() {
  const [mode, setMode] = useState<Mode>('username')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage('')
    setMessage('')
    if (!contact.trim()) {
      setErrorMessage('이메일을 입력해주세요.')
      return
    }

    const trimmedContact = contact.trim().toLowerCase()
    setIsSending(true)
    setSent(false)
    try {
      const response = await api.post('/v1/auth/account-help', {
        mode,
        email: trimmedContact,
      })
      setMessage(response.data?.message || '요청이 접수되었습니다.')
      setSent(true)
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || '요청 처리에 실패했습니다.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">계정 도움</p>
          <h1 className="mt-2 text-3xl font-semibold">아이디/비밀번호 찾기</h1>
          <p className="mt-2 text-sm text-zinc-400">
            현재는 계정 보호 정책 검토 단계라, 이메일 기준으로 안내 메일 발송 준비만 제공합니다.
          </p>
        </div>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2">
          <div className="grid grid-cols-2 gap-2 p-2">
            <button
              type="button"
              onClick={() => {
                setMode('username')
                setSent(false)
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === 'username' ? 'bg-emerald-500 text-black' : 'bg-white/[0.06] text-zinc-200'}`}
            >
              아이디 찾기
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('password')
                setSent(false)
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === 'password' ? 'bg-emerald-500 text-black' : 'bg-white/[0.06] text-zinc-200'}`}
            >
              비밀번호 찾기
            </button>
          </div>
        </section>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5"
        >
          <label className="text-sm text-zinc-300">
            등록 이메일
            <input
              type="email"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-4 py-2 text-sm text-zinc-100"
              placeholder="you@company.com"
              required
            />
          </label>
          <p className="text-sm text-zinc-400">
            {mode === 'username' ? '가입 시 사용한 이메일로 아이디 복구 안내를 받습니다.' : '가입 시 사용한 이메일로 비밀번호 재설정 링크를 받습니다.'}
          </p>

          {errorMessage && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSending}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          >
            {isSending ? '요청 처리 중...' : '요청하기'}
          </button>
        </form>

        {sent && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {message || '요청이 접수되었습니다. 준비된 채널로 안내 드립니다.'}
          </p>
        )}

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">소셜 로그인</p>
          <p className="mt-2 text-sm text-zinc-400">
            소셜 로그인(구글/카카오/Apple)은 정책 검토 후 오픈 예정입니다.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <button type="button" disabled className="rounded-lg border border-white/20 px-4 py-2 text-left text-sm opacity-60">
              Google로 계속하기 (준비중)
            </button>
            <button type="button" disabled className="rounded-lg border border-white/20 px-4 py-2 text-left text-sm opacity-60">
              Apple로 계속하기 (준비중)
            </button>
          </div>
        </section>

        <p className="text-sm text-zinc-400">
          로그인으로{' '}
          <Link href="/login" className="font-semibold text-zinc-100">
            돌아가기
          </Link>
        </p>
      </div>
    </div>
  )
}
