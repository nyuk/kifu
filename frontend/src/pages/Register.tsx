import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'

export function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const setTokens = useAuthStore((state) => state.setTokens)
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await api.post('/v1/auth/register', { name, email, password })
      const loginResponse = await api.post('/v1/auth/login', { email, password })
      setTokens(loginResponse.data.access_token, loginResponse.data.refresh_token)
      navigate('/chart', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12 text-neutral-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 lg:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-4">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Get Started</p>
          <h1 className="text-3xl font-semibold text-neutral-100 lg:text-4xl">
            Build your execution memory.
          </h1>
          <p className="text-base text-neutral-400">
            Track setups, annotate entries, and compare outcome feedback across time.
          </p>
          <div className="mt-6 rounded-2xl border border-neutral-800/70 bg-neutral-900/50 p-5">
            <p className="text-sm font-semibold text-neutral-200">Starter perks</p>
            <ul className="mt-2 space-y-1 text-sm text-neutral-400">
              <li>• 20 AI opinions in the free tier</li>
              <li>• Outcome tracking at 1h, 4h, 1d</li>
              <li>• Secure API key vault</li>
            </ul>
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-8"
        >
          <div>
            <h2 className="text-2xl font-semibold">Create account</h2>
            <p className="mt-1 text-sm text-neutral-400">Start with a free tier account.</p>
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <label className="text-sm text-neutral-300">
            Name
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-4 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
              placeholder="Trader name"
            />
          </label>
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
              placeholder="Create a strong password"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Creating...' : 'Create account'}
          </button>
          <p className="text-sm text-neutral-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-neutral-100">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
