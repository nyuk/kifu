'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const setTokens = useAuthStore((state) => state.setTokens)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const response = await api.post('/v1/auth/login', { email, password })
      setTokens(response.data.access_token, response.data.refresh_token)
      const from = searchParams?.get('from') || '/chart'
      router.push(from)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12 text-neutral-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 lg:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-4">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">KIFU ACCESS</p>
          <h1 className="text-3xl font-semibold text-neutral-100 lg:text-4xl">
            Welcome back to your trading journal.
          </h1>
          <p className="text-base text-neutral-400">
            Review previous decisions, request AI commentary, and keep your execution loop tight.
          </p>
          <div className="mt-6 rounded-2xl border border-neutral-800/70 bg-neutral-900/50 p-5">
            <p className="text-sm font-semibold text-neutral-200">Beta reminder</p>
            <p className="mt-2 text-sm text-neutral-400">
              AI opinions are tracked against your outcome metrics. Keep notes precise for the best review.
            </p>
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-8"
        >
          <div>
            <h2 className="text-2xl font-semibold">Login</h2>
            <p className="mt-1 text-sm text-neutral-400">Use your registered email and password.</p>
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <label className="text-sm text-neutral-300">
            Email
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
            Password
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
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
          <p className="text-sm text-neutral-400">
            New here?{' '}
            <Link href="/register" className="font-semibold text-neutral-100">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
