'use client'

import Link from 'next/link'

export function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-20 text-zinc-100">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Error 404</p>
        <h1 className="text-3xl font-semibold">This route does not exist.</h1>
        <p className="text-sm text-zinc-400">
          The page you are looking for is not part of the current workspace. Return to the home snapshot.
        </p>
        <Link
          href="/home"
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950"
        >
          Go to home
        </Link>
      </div>
    </div>
  )
}
