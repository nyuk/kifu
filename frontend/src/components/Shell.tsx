import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

const navItems = [
  { label: 'Chart', to: '/chart' },
  { label: 'Bubbles', to: '/bubbles' },
  { label: 'Settings', to: '/settings' },
]

export function Shell() {
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const navigate = useNavigate()

  const handleLogout = () => {
    clearTokens()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="flex flex-col gap-6 rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5 lg:w-64">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">KIFU</p>
            <h1 className="mt-3 text-2xl font-semibold text-neutral-100">Trading Journal</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Focused review loop for futures execution, AI insights, and outcome tracking.
            </p>
          </div>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-neutral-200 text-neutral-950'
                      : 'text-neutral-300 hover:bg-neutral-800/80'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-xl border border-neutral-800/60 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Session</p>
            <p className="mt-2 text-sm text-neutral-300">You are authenticated.</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-200 transition hover:border-neutral-500"
            >
              Log out
            </button>
          </div>
        </aside>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
