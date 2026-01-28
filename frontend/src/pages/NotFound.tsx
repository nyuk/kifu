import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-20 text-neutral-100">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 rounded-2xl border border-neutral-800/70 bg-neutral-900/50 p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Error 404</p>
        <h1 className="text-3xl font-semibold">This route does not exist.</h1>
        <p className="text-sm text-neutral-400">
          The page you are looking for is not part of the current workspace. Return to the chart view.
        </p>
        <Link
          to="/chart"
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950"
        >
          Go to chart
        </Link>
      </div>
    </div>
  )
}
