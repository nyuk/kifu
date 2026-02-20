'use client'

import { FormEvent, useMemo, useState } from 'react'
import { api } from '../../../../src/lib/api'

const ADMIN_SIM_REPORT_HISTORY_KEY = 'kifu-admin-sim-report-last'

type SimReportDay = {
  date: string
  no_trade_day: boolean
  trades_created: number
  bubbles_created: number
  review_id?: string
  review_status?: string
  items: number
  submitted: number
  completed: boolean
  symbols?: string[]
  steps?: Array<{
    step: string
    ok: boolean
    message?: string
  }>
  error?: string
}

type SimReportResponse = {
  run_id: string
  seed: number
  timezone: string
  start_date: string
  end_date: string
  days: number
  started_at: string
  finished_at: string
  totals: {
    trades_created: number
    bubbles_created: number
    outcomes_created?: number
    ai_opinions_created?: number
    accuracy_rows?: number
    ai_notes_created?: number
    trade_events_created?: number
    trade_events_skipped?: number
    stock_events_created?: number
    review_days_touched: number
    review_days_complete: number
    items_total: number
    items_submitted: number
    no_trade_days: number
    notes_created: number
    manual_positions_created?: number
    user_symbols_updated?: number
    alert_rules_created: number
    ai_probe_pass: number
    ai_probe_fail: number
  }
  streak: {
    current: number
    longest: number
    last_review_day?: string | null
  }
  effective_user: {
    mode: string
    user_id: string
    email: string
    password?: string
    reset_performed: boolean
  }
  results: SimReportDay[]
  warnings?: string[]
}

const localDateInputValue = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AdminSimReportPage() {
  const [days, setDays] = useState(30)
  const [startDate, setStartDate] = useState(localDateInputValue())
  const [noTradeRate, setNoTradeRate] = useState(0.25)
  const [seed, setSeed] = useState('')
  const [includeNotes, setIncludeNotes] = useState(true)
  const [includeAlerts, setIncludeAlerts] = useState(true)
  const [includeAIProbe, setIncludeAIProbe] = useState(true)
  const [targetMode, setTargetMode] = useState<'sandbox' | 'self'>('sandbox')
  const [sandboxEmail, setSandboxEmail] = useState('')
  const [sandboxPassword, setSandboxPassword] = useState('')
  const [sandboxReset, setSandboxReset] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimReportResponse | null>(null)

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])

  const onRun = async (event: FormEvent) => {
    event.preventDefault()
    setRunning(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        days,
        start_date: startDate,
        timezone,
        no_trade_rate: noTradeRate,
        include_notes: includeNotes,
        include_alerts: includeAlerts,
        include_ai_probe: includeAIProbe,
        target_mode: targetMode,
      }
      if (targetMode === 'sandbox') {
        payload.sandbox_reset = sandboxReset
        if (sandboxEmail.trim() !== '') payload.sandbox_email = sandboxEmail.trim()
        if (sandboxPassword.trim() !== '') payload.sandbox_password = sandboxPassword
      }
      if (seed.trim() !== '' && Number.isFinite(Number(seed))) {
        payload.seed = Number(seed)
      }
      const response = await api.post<SimReportResponse>('/v1/admin/sim-report/run', payload)
      const data = response.data
      setResult(data)
      try {
        localStorage.setItem(ADMIN_SIM_REPORT_HISTORY_KEY, JSON.stringify({
          run_id: data.run_id,
          started_at: data.started_at,
          finished_at: data.finished_at,
          totals: data.totals,
          streak: data.streak,
          effective_user: {
            email: data.effective_user.email,
            mode: data.effective_user.mode,
            reset_performed: data.effective_user.reset_performed,
          },
          start_date: data.start_date,
          end_date: data.end_date,
          days: data.days,
          warnings_count: data.warnings?.length || 0,
          warnings: data.warnings ? data.warnings.slice(0, 3) : [],
        }))
      } catch {
        // no-op
      }
    } catch (runError: any) {
      const message = runError?.response?.data?.message || runError?.message || '시뮬레이션 실행에 실패했습니다.'
      setError(message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Admin Diagnostic</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-100">사용자 행동 시뮬레이터</h1>
        <p className="mt-2 text-sm text-zinc-400">
          종료일 기준으로 과거 N일 데이터를 생성합니다. 거래/버블/복기/포트폴리오/AI 목업 데이터까지 함께 생성합니다.
        </p>
      </header>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <form onSubmit={onRun} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-zinc-400">Days</span>
            <input
              type="number"
              min={1}
              max={180}
              value={days}
              onChange={(event) => setDays(Math.max(1, Math.min(180, Number(event.target.value) || 1)))}
              className="h-10 rounded-lg border border-white/[0.12] bg-black/25 px-3 text-sm text-zinc-100 outline-none focus:border-sky-400/60"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-zinc-400">End Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-10 rounded-lg border border-white/[0.12] bg-black/25 px-3 text-sm text-zinc-100 outline-none focus:border-sky-400/60"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-zinc-400">No Trade Rate</span>
            <input
              type="number"
              min={0}
              max={0.95}
              step={0.05}
              value={noTradeRate}
              onChange={(event) => setNoTradeRate(Math.max(0, Math.min(0.95, Number(event.target.value) || 0)))}
              className="h-10 rounded-lg border border-white/[0.12] bg-black/25 px-3 text-sm text-zinc-100 outline-none focus:border-sky-400/60"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-zinc-400">Seed (optional)</span>
            <input
              type="text"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              placeholder="예: 20260213"
              className="h-10 rounded-lg border border-white/[0.12] bg-black/25 px-3 text-sm text-zinc-100 outline-none focus:border-sky-400/60"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-zinc-400">Timezone</span>
            <button
              type="submit"
              disabled={running}
              className="h-10 rounded-lg border border-sky-300/40 bg-sky-500/20 px-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? '실행 중...' : '시뮬레이션 실행'}
            </button>
            <p className="text-[11px] text-zinc-500">{timezone}</p>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-300">
          <label className="inline-flex items-center gap-2">
            <span>대상</span>
            <select
              value={targetMode}
              onChange={(e) => setTargetMode(e.target.value === 'self' ? 'self' : 'sandbox')}
              className="h-8 rounded-md border border-white/[0.12] bg-black/30 px-2 text-xs text-zinc-100"
            >
              <option value="sandbox">Sandbox 계정</option>
              <option value="self">현재 계정</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />
            복기노트 생성
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={includeAlerts} onChange={(e) => setIncludeAlerts(e.target.checked)} />
            알림룰 생성/삭제
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={includeAIProbe} onChange={(e) => setIncludeAIProbe(e.target.checked)} />
            AI 키/프로바이더 점검
          </label>
        </div>
        {targetMode === 'sandbox' && (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">Sandbox Email (optional)</span>
              <input
                type="text"
                value={sandboxEmail}
                onChange={(e) => setSandboxEmail(e.target.value)}
                placeholder="비우면 자동 생성"
                className="h-9 rounded-md border border-white/[0.12] bg-black/30 px-3 text-xs text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">Sandbox Password (optional)</span>
              <input
                type="text"
                value={sandboxPassword}
                onChange={(e) => setSandboxPassword(e.target.value)}
                placeholder="비우면 기본값 사용"
                className="h-9 rounded-md border border-white/[0.12] bg-black/30 px-3 text-xs text-zinc-100"
              />
            </label>
            <label className="inline-flex items-center gap-2 self-end pb-1 text-xs text-zinc-300">
              <input type="checkbox" checked={sandboxReset} onChange={(e) => setSandboxReset(e.target.checked)} />
              실행 전 sandbox 데이터 초기화
            </label>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
      </section>

      {result && (
        <>
          <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard title="Trades" value={result.totals.trades_created} />
            <StatCard title="Bubbles" value={result.totals.bubbles_created} />
            <StatCard title="Outcomes" value={result.totals.outcomes_created || 0} />
            <StatCard title="AI Opinions" value={result.totals.ai_opinions_created || 0} />
            <StatCard title="Accuracy Rows" value={result.totals.accuracy_rows || 0} />
            <StatCard title="AI Notes" value={result.totals.ai_notes_created || 0} />
            <StatCard title="Trade Events" value={result.totals.trade_events_created || 0} />
            <StatCard title="Stock Events" value={result.totals.stock_events_created || 0} />
            <StatCard title="Manual Pos" value={result.totals.manual_positions_created || 0} />
            <StatCard title="Symbols" value={result.totals.user_symbols_updated || 0} />
            <StatCard title="Review Days" value={result.totals.review_days_touched} />
            <StatCard title="Completed" value={result.totals.review_days_complete} />
            <StatCard title="Items Submitted" value={result.totals.items_submitted} />
            <StatCard title="Streak" value={`${result.streak.current} (max ${result.streak.longest})`} />
            <StatCard title="Notes" value={result.totals.notes_created} />
            <StatCard title="Alert Rules" value={result.totals.alert_rules_created} />
            <StatCard title="AI Probe Pass" value={result.totals.ai_probe_pass} />
            <StatCard title="AI Probe Fail" value={result.totals.ai_probe_fail} />
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span>Run ID: {result.run_id}</span>
              <span>Seed: {result.seed}</span>
              <span>
                Range: {result.start_date} ~ {result.end_date}
              </span>
              <span>
                User: {result.effective_user.email} ({result.effective_user.mode})
              </span>
              <span>Reset: {result.effective_user.reset_performed ? 'Y' : 'N'}</span>
              <span>
                Duration: {new Date(result.started_at).toLocaleString()} → {new Date(result.finished_at).toLocaleString()}
              </span>
            </div>
            {result.effective_user.password && (
              <p className="mt-2 text-xs text-amber-200">
                Sandbox login: {result.effective_user.email} / {result.effective_user.password}
              </p>
            )}
            {result.warnings && result.warnings.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                <p className="font-semibold">Warnings</p>
                <ul className="mt-1 list-disc pl-5">
                  {result.warnings.slice(0, 8).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-black/20 text-zinc-300">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">No Trade</th>
                    <th className="px-3 py-2 font-semibold">Trades</th>
                    <th className="px-3 py-2 font-semibold">Bubbles</th>
                    <th className="px-3 py-2 font-semibold">Items</th>
                    <th className="px-3 py-2 font-semibold">Submitted</th>
                    <th className="px-3 py-2 font-semibold">Completed</th>
                    <th className="px-3 py-2 font-semibold">Symbols</th>
                    <th className="px-3 py-2 font-semibold">Steps</th>
                    <th className="px-3 py-2 font-semibold">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row) => (
                    <tr key={`${row.date}-${row.review_id || 'noreview'}`} className="border-t border-white/[0.06] text-zinc-200">
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2">{row.no_trade_day ? 'Y' : 'N'}</td>
                      <td className="px-3 py-2">{row.trades_created}</td>
                      <td className="px-3 py-2">{row.bubbles_created}</td>
                      <td className="px-3 py-2">{row.items}</td>
                      <td className="px-3 py-2">{row.submitted}</td>
                      <td className="px-3 py-2">{row.completed ? 'Y' : 'N'}</td>
                      <td className="px-3 py-2">{(row.symbols || []).join(', ') || '-'}</td>
                      <td className="px-3 py-2">
                        {(row.steps || []).length === 0 ? (
                          '-'
                        ) : (
                          <div className="space-y-1">
                            {(row.steps || []).map((step) => (
                              <div key={`${row.date}-${step.step}`} className={step.ok ? 'text-emerald-300' : 'text-amber-200'}>
                                {step.ok ? 'OK' : 'FAIL'} · {step.step}
                                {step.message ? ` · ${step.message}` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-rose-200">{row.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{title}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-100">{value}</p>
    </div>
  )
}
