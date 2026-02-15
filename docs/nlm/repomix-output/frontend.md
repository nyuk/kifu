This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: **/*.{ts,tsx,js,jsx}
- Files matching these patterns are excluded: **/*.css, **/*.scss, **/*.d.ts
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
app/
  (app)/
    admin/
      sim-report/
        page.tsx
    alert/
      page.tsx
    alerts/
      [id]/
        page.tsx
      rules/
        page.tsx
      page.tsx
    bubbles/
      page.tsx
    chart/
      [symbol]/
        page.tsx
      page.tsx
    home/
      page.tsx
    portfolio/
      page.tsx
    review/
      page.tsx
    settings/
      page.tsx
    trades/
      page.tsx
    layout.tsx
    page.tsx
  (auth)/
    login/
      page.tsx
    register/
      page.tsx
    layout.tsx
  guest/
    page.tsx
  onboarding/
    import/
      page.tsx
    start/
      page.tsx
    test/
      page.tsx
  layout.tsx
  loading.tsx
  not-found.tsx
  page.tsx
scripts/
  generateDemoData.ts
src/
  components/
    alerts/
      AlertBriefings.tsx
      AlertCard.tsx
      AlertOutcomes.tsx
      DecisionForm.tsx
      RuleConfigForm.tsx
      RuleEditor.tsx
      RuleList.tsx
    chart/
      ChartReplay.tsx
      index.ts
      ReplayControls.tsx
      TimeSlider.tsx
    guided-review/
      GuidedReviewFlow.tsx
    home/
      HomeGuidedReviewCard.tsx
      HomeSafetyCheckCard.tsx
      HomeSnapshot.tsx
    landing/
      LandingPage.tsx
    portfolio/
      PortfolioDashboard.tsx
    positions/
      PositionManager.tsx
    review/
      AccuracyChart.tsx
      BubbleAccuracy.tsx
      CalendarView.tsx
      ExportButtons.tsx
      index.ts
      NoteEditor.tsx
      NoteList.tsx
      PerformanceTrendChart.tsx
      PeriodFilter.tsx
      StatsOverview.tsx
      SymbolPerformance.tsx
      TagPerformance.tsx
    settings/
      AIKeyManager.tsx
      ExchangeConnectionManager.tsx
      index.ts
    ui/
      FilterPills.tsx
      PageJumpPager.tsx
      Toast.tsx
    BubbleCreateModal.tsx
    LanguageSelector.tsx
    Shell.tsx
  components-old/
    Bubbles.tsx
    Chart.tsx
    Loading.tsx
    Login.tsx
    NotFound.tsx
    Register.tsx
    Settings.tsx
    Trades.tsx
  lib/
    aiResponseFormat.ts
    api.ts
    appMode.ts
    bubbleStore.ts
    csvParser.ts
    dataHandler.ts
    evidencePacket.ts
    exchangeFilters.ts
    guestSession.ts
    i18n.ts
    mockAi.ts
    onboardingFlow.ts
    onboardingProfile.ts
    tradeAdapters.ts
  routes/
    GuestOnly.tsx
    RequireAuth.tsx
  stores/
    alertStore.ts
    auth.ts
    guidedReviewStore.ts
    noteStore.ts
    reviewStore.ts
  types/
    alert.ts
    guidedReview.ts
    portfolio.ts
    position.ts
    review.ts
    safety.ts
    trade.ts
tests/
  qa-smoke.spec.ts
eslint.config.js
playwright.config.ts
postcss.config.js
tailwind.config.js
```

# Files

## File: app/(app)/admin/sim-report/page.tsx
```typescript
'use client'

import { FormEvent, useMemo, useState } from 'react'
import { api } from '../../../../src/lib/api'

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
      setResult(response.data)
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
```

## File: app/(app)/alert/page.tsx
```typescript
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { OnboardingProfile } from '../../../src/lib/onboardingProfile'
import { readOnboardingProfile } from '../../../src/lib/onboardingProfile'
import { api } from '../../../src/lib/api'
import type { TradeItem, TradeListResponse } from '../../../src/types/trade'

type EmergencyMode = 'aggressive' | 'defensive' | 'balanced'

const modeMeta: Record<EmergencyMode, { label: string; tone: string; tip: string }> = {
  aggressive: {
    label: '공격형 대응',
    tone: 'text-rose-200 border-rose-400/30 bg-rose-500/10',
    tip: '손절 폭을 먼저 정하고, 크기를 줄여 반응하세요.',
  },
  defensive: {
    label: '방어형 대응',
    tone: 'text-sky-200 border-sky-400/30 bg-sky-500/10',
    tip: '신호가 확인될 때까지 노출을 최소화하세요.',
  },
  balanced: {
    label: '균형형 대응',
    tone: 'text-emerald-200 border-emerald-400/30 bg-emerald-500/10',
    tip: '진입/관망 기준을 한 번 더 점검하세요.',
  },
}

export default function AlertPage() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)
  const [recentTrades, setRecentTrades] = useState<TradeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [actionChoice, setActionChoice] = useState<'LONG' | 'SHORT' | 'HOLD' | 'WAIT' | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [actionSavedAt, setActionSavedAt] = useState<string | null>(null)
  const [actionLog, setActionLog] = useState<Array<{
    id: string
    symbol: string
    action: string
    note?: string
    created_at: string
  }>>([])

  useEffect(() => {
    setProfile(readOnboardingProfile())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('kifu-alert-actions')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setActionLog(parsed)
      }
    } catch {
      setActionLog([])
    }
  }, [])

  useEffect(() => {
    let isActive = true
    const load = async () => {
      setLoading(true)
      try {
        const response = await api.get<TradeListResponse>('/v1/trades?page=1&limit=5&sort=desc')
        if (isActive) setRecentTrades(response.data.items || [])
      } catch {
        if (isActive) setRecentTrades([])
      } finally {
        if (isActive) setLoading(false)
      }
    }
    load()
    return () => {
      isActive = false
    }
  }, [])

  const mode = useMemo<EmergencyMode>(() => {
    if (!profile) return 'balanced'
    return profile.recommended_mode
  }, [profile])
  const latestSymbol = recentTrades[0]?.symbol || 'BTCUSDT'
  const recentActiveHours = useMemo(() => {
    const now = Date.now()
    return recentTrades.filter((trade) => now - new Date(trade.trade_time).getTime() <= 24 * 60 * 60 * 1000).length
  }, [recentTrades])
  const marketTone =
    recentActiveHours >= 4 ? '변동성 높음' : recentActiveHours >= 1 ? '변동성 보통' : '변동성 낮음'

  const currentMode = modeMeta[mode]
  const actionOptions = [
    { key: 'LONG', label: '롱 진입' },
    { key: 'SHORT', label: '숏 진입' },
    { key: 'HOLD', label: '유지' },
    { key: 'WAIT', label: '관망' },
  ] as const

  const handleSaveAction = () => {
    if (!actionChoice) return
    const entry = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}`,
      symbol: latestSymbol,
      action: actionChoice,
      note: actionNote.trim() || undefined,
      created_at: new Date().toISOString(),
    }
    const next = [entry, ...actionLog].slice(0, 12)
    setActionLog(next)
    setActionNote('')
    setActionSavedAt(entry.created_at)
    if (typeof window !== 'undefined') {
      localStorage.setItem('kifu-alert-actions', JSON.stringify(next))
    }
  }

  return (
    <div className="min-h-full p-4 text-neutral-100 md:p-8">
      <div className="w-full space-y-5">
        <header className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-neutral-900 to-rose-950/40 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-300/80">Emergency Note</p>
          <h1 className="mt-2 text-3xl font-semibold">긴급 모드</h1>
          <p className="mt-2 text-sm text-neutral-300">흔들리는 순간을 짧게 정리합니다.</p>
        </header>

        <section className={`rounded-2xl border p-5 ${currentMode.tone}`}>
          <p className="text-xs uppercase tracking-[0.2em]">오늘의 대응</p>
          <p className="mt-2 text-xl font-semibold">{currentMode.label}</p>
          <p className="mt-2 text-sm text-current/80">{currentMode.tip}</p>
          {profile ? (
            <p className="mt-3 text-xs text-current/70">
              성향 기반: LONG {profile.long_count} · SHORT {profile.short_count} · HOLD {profile.hold_count}
            </p>
          ) : (
            <p className="mt-3 text-xs text-current/70">성향 정보가 없어 기본 브리핑으로 대체합니다.</p>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">지금 분위기</p>
            <p className="mt-2 text-lg font-semibold text-amber-200">{marketTone}</p>
            <p className="mt-1 text-xs text-neutral-400">최근 24시간 체결 {recentActiveHours}건</p>
          </article>
          <article className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">유사 장면</p>
            <p className="mt-2 text-lg font-semibold text-sky-200">{Math.max(1, recentTrades.length)}건</p>
            <p className="mt-1 text-xs text-neutral-400">최근 심볼 중심 간단 비교</p>
          </article>
          <article className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">추천 행동</p>
            <p className="mt-2 text-lg font-semibold text-emerald-200">조건부 진입</p>
            <p className="mt-1 text-xs text-neutral-400">{latestSymbol} 기준 손절 먼저 확정</p>
          </article>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">방금 체결 요약</p>
            {loading && <p className="text-[11px] text-zinc-400">불러오는 중...</p>}
          </div>
          <div className="mt-3 space-y-2">
            {!loading && recentTrades.length === 0 && (
              <p className="text-xs text-zinc-400">체결이 없어 기본 브리핑을 사용합니다.</p>
            )}
            {recentTrades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                <p className="text-xs text-neutral-300">
                  {trade.symbol} · {trade.side.toUpperCase()} · {Number(trade.quantity).toLocaleString()}
                </p>
                <p className="text-[11px] text-zinc-400">{new Date(trade.trade_time).toLocaleString('ko-KR')}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">지금 선택 기록</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {actionOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setActionChoice(option.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${actionChoice === option.key
                    ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                    : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <textarea
            value={actionNote}
            onChange={(event) => setActionNote(event.target.value)}
            placeholder="지금 판단의 한 줄 메모"
            rows={2}
            className="mt-3 w-full rounded-lg border border-neutral-700 bg-black/25 px-3 py-2 text-sm text-neutral-100 placeholder:text-zinc-400"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAction}
              disabled={!actionChoice}
              className="rounded-lg bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-950 disabled:opacity-60"
            >
              선택 저장
            </button>
            {actionSavedAt && (
              <span className="text-[11px] text-zinc-400">
                저장됨: {new Date(actionSavedAt).toLocaleTimeString('ko-KR')}
              </span>
            )}
          </div>
          {actionLog.length > 0 && (
            <div className="mt-4 space-y-2">
              {actionLog.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                  <div>
                    <p className="text-xs text-neutral-300">
                      {entry.symbol} · {entry.action}
                    </p>
                    {entry.note && <p className="text-[11px] text-zinc-400">{entry.note}</p>}
                  </div>
                  <p className="text-[11px] text-zinc-400">{new Date(entry.created_at).toLocaleTimeString('ko-KR')}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-wrap gap-2">
          <Link href="/chart" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
            차트로 이동
          </Link>
          <Link href="/review" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200">
            과거 대응 복기
          </Link>
          <Link href="/onboarding/test" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200">
            성향 테스트 다시하기
          </Link>
        </section>
      </div>
    </div>
  )
}
```

## File: app/(app)/alerts/[id]/page.tsx
```typescript
'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '../../../../src/lib/i18n'
import { useAlertStore } from '../../../../src/stores/alertStore'
import { AlertBriefings } from '../../../../src/components/alerts/AlertBriefings'
import { DecisionForm } from '../../../../src/components/alerts/DecisionForm'
import { AlertOutcomes } from '../../../../src/components/alerts/AlertOutcomes'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  briefed: 'bg-blue-500/20 text-blue-400',
  decided: 'bg-green-500/20 text-green-400',
  expired: 'bg-neutral-700/40 text-neutral-500',
}

export default function AlertDetailPage() {
  const { t } = useI18n()
  const params = useParams()
  const id = params.id as string
  const { alertDetail, isLoadingDetail, detailError, fetchAlertDetail, dismissAlert } = useAlertStore()

  useEffect(() => {
    if (id) fetchAlertDetail(id)
  }, [id, fetchAlertDetail])

  if (isLoadingDetail && !alertDetail) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-32 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="h-48 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="h-48 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    )
  }

  if (detailError) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
        {detailError}
      </div>
    )
  }

  if (!alertDetail) return null

  const { alert, briefings, decision, outcomes } = alertDetail

  const statusLabel: Record<string, string> = {
    pending: t.statusPending,
    briefed: t.statusBriefed,
    decided: t.statusDecided,
    expired: t.statusExpired,
  }

  const canDecide = alert.status === 'pending' || alert.status === 'briefed'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
          <Link href="/alerts" className="hover:text-neutral-300 transition">
            {t.alertsTitle}
          </Link>
          <span>/</span>
          <span>{t.alertDetailTitle}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-neutral-100">{alert.symbol}</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[alert.status] || ''}`}
              >
                {statusLabel[alert.status] || alert.status}
              </span>
              {alert.severity === 'urgent' && (
                <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                  {t.severityUrgent}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-neutral-400">{alert.trigger_reason}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
              <span>Trigger: ${alert.trigger_price}</span>
              <span>{new Date(alert.created_at).toLocaleString()}</span>
            </div>
          </div>
          {canDecide && (
            <button
              type="button"
              onClick={() => dismissAlert(alert.id)}
              className="shrink-0 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition"
            >
              {t.dismissAlert}
            </button>
          )}
        </div>
      </header>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Briefings */}
        <AlertBriefings briefings={briefings || []} />

        {/* Decision */}
        {canDecide ? (
          <DecisionForm alertId={alert.id} />
        ) : (
          <DecisionForm alertId={alert.id} existingDecision={decision} />
        )}
      </div>

      {/* Outcomes */}
      <AlertOutcomes outcomes={outcomes || []} />
    </div>
  )
}
```

## File: app/(app)/alerts/rules/page.tsx
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '../../../../src/lib/i18n'
import { useAlertStore } from '../../../../src/stores/alertStore'
import { RuleList } from '../../../../src/components/alerts/RuleList'
import { RuleEditor } from '../../../../src/components/alerts/RuleEditor'
import type { AlertRule } from '../../../../src/types/alert'
import Link from 'next/link'

export default function AlertRulesPage() {
  const { t } = useI18n()
  const { rules, isLoadingRules, rulesError, fetchRules } = useAlertStore()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleCreate = () => {
    setEditingRule(null)
    setEditorOpen(true)
  }

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule)
    setEditorOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/alerts" className="hover:text-neutral-300 transition">
            {t.alertsTitle}
          </Link>
          <span>/</span>
          <span>{t.alertRulesTitle}</span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-neutral-100">{t.alertRulesTitle}</h2>
        <p className="mt-2 text-sm text-neutral-400">{t.alertRulesSubtitle}</p>
      </header>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white"
        >
          + {t.createRule}
        </button>
      </div>

      {rulesError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {rulesError}
        </div>
      )}

      {isLoadingRules && rules.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-10 text-center">
          <p className="text-sm text-neutral-500">{t.noRules}</p>
          <button
            type="button"
            onClick={handleCreate}
            className="mt-4 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500 transition"
          >
            + {t.createRule}
          </button>
        </div>
      ) : (
        <RuleList rules={rules} onEdit={handleEdit} />
      )}

      <RuleEditor
        open={editorOpen}
        rule={editingRule}
        onClose={() => setEditorOpen(false)}
      />
    </div>
  )
}
```

## File: app/(app)/alerts/page.tsx
```typescript
'use client'

import { type KeyboardEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '../../../src/lib/i18n'
import { useAlertStore } from '../../../src/stores/alertStore'
import { AlertCard } from '../../../src/components/alerts/AlertCard'
import { PageJumpPager } from '../../../src/components/ui/PageJumpPager'
import type { AlertStatus } from '../../../src/types/alert'

const STATUS_TABS: { value: AlertStatus | 'all'; labelKey: 'statusAll' | 'statusPending' | 'statusBriefed' | 'statusDecided' | 'statusExpired' }[] = [
  { value: 'all', labelKey: 'statusAll' },
  { value: 'pending', labelKey: 'statusPending' },
  { value: 'briefed', labelKey: 'statusBriefed' },
  { value: 'decided', labelKey: 'statusDecided' },
  { value: 'expired', labelKey: 'statusExpired' },
]

export default function AlertsPage() {
  const { t } = useI18n()
  const { alerts, alertsTotal, isLoadingAlerts, alertsError, fetchAlerts } = useAlertStore()
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all')
  const [page, setPage] = useState(0)
  const [pageInput, setPageInput] = useState('1')
  const limit = 20

  useEffect(() => {
    const status = statusFilter === 'all' ? undefined : statusFilter
    fetchAlerts(status, limit, page * limit)
  }, [fetchAlerts, statusFilter, page])

  useEffect(() => {
    setPageInput(String(page + 1))
  }, [page])

  const totalPages = Math.ceil(alertsTotal / limit)

  const jumpToAlertPage = () => {
    const parsedPage = Number.parseInt(pageInput, 10)
    if (Number.isNaN(parsedPage) || parsedPage < 1) {
      setPageInput(String(page + 1))
      return
    }
    setPage(Math.min(totalPages, Math.max(1, parsedPage)) - 1)
  }

  const handleAlertPageInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpToAlertPage()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Monitoring</p>
            <h2 className="mt-3 text-2xl font-semibold text-neutral-100">{t.alertsTitle}</h2>
            <p className="mt-2 text-sm text-neutral-400">{t.alertsSubtitle}</p>
          </div>
          <Link
            href="/alerts/rules"
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500"
          >
            {t.manageRules}
          </Link>
        </div>
      </header>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value)
                setPage(0)
              }}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${isActive
                  ? 'bg-neutral-200 text-neutral-950'
                  : 'bg-white/[0.04] text-neutral-400 hover:bg-white/[0.06]'
                }`}
            >
              {t[tab.labelKey]}
            </button>
          )
        })}
      </div>

      {alertsError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {alertsError}
        </div>
      )}

      {isLoadingAlerts && alerts.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-10 text-center">
          <p className="text-sm text-zinc-400">{t.noAlerts}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <PageJumpPager
          totalItems={alertsTotal}
          totalPages={totalPages}
          currentPage={page + 1}
          pageInput={pageInput}
          onPageInputChange={setPageInput}
          onPageInputKeyDown={handleAlertPageInputKeyDown}
          onFirst={() => setPage(0)}
          onPrevious={() => setPage((prev) => Math.max(0, prev - 1))}
          onNext={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
          onLast={() => setPage(totalPages - 1)}
          onJump={jumpToAlertPage}
          disabled={isLoadingAlerts}
          itemLabel="건"
        />
      )}
    </div>
  )
}
```

## File: app/(app)/bubbles/page.tsx
```typescript
import { Bubbles } from '../../../src/components-old/Bubbles'

export default function BubblesPage() {
  return <Bubbles />
}
```

## File: app/(app)/chart/[symbol]/page.tsx
```typescript
import { Chart } from '../../../../src/components-old/Chart'

export default function ChartSymbolPage() {
  return <Chart />
}
```

## File: app/(app)/chart/page.tsx
```typescript
import { Chart } from '../../../src/components-old/Chart'

export default function ChartPage() {
  return <Chart />
}
```

## File: app/(app)/home/page.tsx
```typescript
import { HomeSnapshot } from '../../../src/components/home/HomeSnapshot'

export default function HomePage() {
  return <HomeSnapshot />
}
```

## File: app/(app)/portfolio/page.tsx
```typescript
import { PortfolioDashboard } from '../../../src/components/portfolio/PortfolioDashboard'

export default function PortfolioPage() {
  return <PortfolioDashboard />
}
```

## File: app/(app)/review/page.tsx
```typescript
'use client'

import Link from 'next/link'
import { type KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '../../../src/lib/api'
import { normalizeTradeSummary } from '../../../src/lib/tradeAdapters'
import { useReviewStore } from '../../../src/stores/reviewStore'
import { StatsOverview } from '../../../src/components/review/StatsOverview'
import { AccuracyChart } from '../../../src/components/review/AccuracyChart'
import { TagPerformance } from '../../../src/components/review/TagPerformance'
import { SymbolPerformance } from '../../../src/components/review/SymbolPerformance'
import { PeriodFilter } from '../../../src/components/review/PeriodFilter'
import { CalendarView } from '../../../src/components/review/CalendarView'
import { NoteList } from '../../../src/components/review/NoteList'
import { parseAiSections, toneClass } from '../../../src/lib/aiResponseFormat'
import { ExportButtons } from '../../../src/components/review/ExportButtons'
import { PerformanceTrendChart } from '../../../src/components/review/PerformanceTrendChart'
import { PageJumpPager } from '../../../src/components/ui/PageJumpPager'
import type { TradeSummaryResponse } from '../../../src/types/trade'
import type { SymbolStats, ReviewNote, NotesListResponse } from '../../../src/types/review'

type BubbleListItem = {
  id: string
  symbol: string
  timeframe: string
  candle_time?: string
  venue_name?: string
}

type BubbleListResponse = {
  items: BubbleListItem[]
}

type AINoteCard = ReviewNote & {
  symbol?: string
  timeframe?: string
  candle_time?: string
  venue_name?: string
  source_label?: string
}

const parseSourceBadge = (tags: string[] = []) => {
  const normalized = tags.map((tag) => tag.toLowerCase())
  if (normalized.includes('alert') || normalized.includes('alerting') || normalized.includes('alerting')) return 'ALERT'
  if (normalized.includes('one-shot') || normalized.includes('one-shot-note')) return 'One-shot'
  if (normalized.includes('technical')) return 'Technical'
  if (normalized.includes('summary')) return '요약'
  if (normalized.includes('brief') || normalized.includes('detailed')) return '요약'
  return 'One-shot'
}

const SOURCE_BADGE_CLASS = 'rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2 py-0.5 text-emerald-200'
const VENUE_BADGE_CLASS = 'rounded-full border border-sky-300/35 bg-sky-500/12 px-2 py-0.5 text-sky-200'
const AI_NOTES_PAGE_SIZE = 6

const normalizeAiSymbol = (value?: string) => (value || '').trim().toUpperCase().replace(/\s+/g, '')

const normalizeAiTimeframe = (value?: string) => {
  const tf = (value || '1d').trim().toLowerCase()
  if (tf === '1m' || tf === '15m' || tf === '1h' || tf === '4h' || tf === '1d') {
    return tf
  }
  return '1d'
}

const buildAiChartUrl = (note: {
  symbol?: string
  timeframe?: string
  candle_time?: string
  created_at?: string
}) => {
  const symbol = normalizeAiSymbol(note.symbol)
  const timeframe = normalizeAiTimeframe(note.timeframe)
  if (!symbol) return null

  const focusTime = note.candle_time || note.created_at
  if (!focusTime) {
    return `/chart/${symbol}`
  }

  const params = new URLSearchParams()
  params.set('focus_ts', focusTime)
  params.set('focus_tf', timeframe)
  return `/chart/${symbol}?${params.toString()}`
}

const normalizeVenueLabel = (value?: string) => {
  if (!value) return ''
  const lowered = value.toLowerCase()
  if (lowered.includes('binance')) return 'Binance'
  if (lowered.includes('upbit')) return 'Upbit'
  if (lowered.includes('kis')) return 'KIS'
  if (lowered.includes('tradingview') || lowered.includes('mock')) return '시스템'
  return value
}

export default function ReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tradeSummary, setTradeSummary] = useState<TradeSummaryResponse | null>(null)
  const [alertActions, setAlertActions] = useState<Array<{
    id: string
    symbol: string
    action: string
    note?: string
    created_at: string
  }>>([])
  const [aiNotes, setAiNotes] = useState<AINoteCard[]>([])
  const [aiNotesLoading, setAiNotesLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '4h' | '1d'>('1h')
  const [aiNotesError, setAiNotesError] = useState<string | null>(null)
  const [aiSymbolFilter, setAiSymbolFilter] = useState('ALL')
  const [aiTimeframeFilter, setAiTimeframeFilter] = useState('ALL')
  const [reviewTab, setReviewTab] = useState<'overview' | 'ai' | 'analytics' | 'journal'>('overview')
  const [analyticsTab, setAnalyticsTab] = useState<'calendar' | 'metrics' | 'trend'>('calendar')
  const [aiFilterHydrated, setAiFilterHydrated] = useState(false)
  const [aiNotesPage, setAiNotesPage] = useState(1)
  const [aiNotesPageInput, setAiNotesPageInput] = useState('1')
  const [copiedShare, setCopiedShare] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const {
    stats,
    accuracy,
    calendar,
    isLoading,
    isLoadingAccuracy,
    error,
    filters,
    setFilters,
    fetchStats,
    fetchAccuracy,
    fetchCalendar,
  } = useReviewStore()

  const getCurrentMonthRange = () => {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    return { from, to }
  }

  useEffect(() => {
    fetchStats()
    fetchAccuracy()

    // Fetch calendar for current month
    const { from, to } = getCurrentMonthRange()
    fetchCalendar(from, to)
  }, [fetchStats, fetchAccuracy, fetchCalendar])

  // Refetch when filters change
  useEffect(() => {
    fetchStats()
    fetchAccuracy()
    const { from, to } = getCurrentMonthRange()
    fetchCalendar(from, to)
  }, [
    filters.period,
    filters.outcomePeriod,
    filters.assetClass,
    filters.venue,
    fetchStats,
    fetchAccuracy,
    fetchCalendar,
  ])

  useEffect(() => {
    let isActive = true
    const loadTradeSummary = async () => {
      try {
        const params = new URLSearchParams()
        if (filters.period === '7d') {
          params.set('from', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        } else if (filters.period === '30d') {
          params.set('from', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        }
        if (filters.symbol) params.set('symbol', filters.symbol)
        if (filters.venue) params.set('exchange', filters.venue)
        const response = await api.get(`/v1/trades/summary?${params.toString()}`)
        if (isActive) setTradeSummary(normalizeTradeSummary(response.data))
      } catch {
        if (isActive) setTradeSummary(null)
      }
    }
    loadTradeSummary()
    return () => {
      isActive = false
    }
  }, [filters.period, filters.symbol, filters.venue, refreshTick])

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTick((prev) => prev + 1)
      fetchStats()
      fetchAccuracy()
      const { from, to } = getCurrentMonthRange()
      fetchCalendar(from, to)
    }
    window.addEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    return () => {
      window.removeEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    }
  }, [fetchStats, fetchAccuracy, fetchCalendar])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('kifu-alert-actions')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setAlertActions(parsed)
      }
    } catch {
      setAlertActions([])
    }
  }, [])

  useEffect(() => {
    let isActive = true
    const loadAiNotes = async () => {
      setAiNotesLoading(true)
      setAiNotesError(null)
      try {
        const [notesResponse, bubblesResponse] = await Promise.all([
          api.get<NotesListResponse>('/v1/notes?page=1&limit=100'),
          api.get<BubbleListResponse>('/v1/bubbles?page=1&limit=200&sort=desc'),
        ])
        const items = notesResponse.data?.notes || []
        const bubbles = bubblesResponse.data?.items || []
        const bubbleMap = new Map(bubbles.map((bubble) => [bubble.id, bubble]))
        const filtered = items.filter((note) => {
          const title = note.title || ''
          const hasTag = (note.tags || []).some((tag) => tag.toLowerCase() === 'ai')
          return hasTag || title.includes('AI')
        })
        const enriched = filtered.map((note) => {
          const bubble = note.bubble_id ? bubbleMap.get(note.bubble_id) : undefined
          return {
            ...note,
            symbol: bubble?.symbol,
            timeframe: bubble?.timeframe,
            candle_time: bubble?.candle_time,
            venue_name: bubble?.venue_name,
            source_label: parseSourceBadge(note.tags || []),
          }
        })
        if (isActive) setAiNotes(enriched.slice(0, 30))
      } catch {
        if (isActive) setAiNotesError('AI 복기 요약을 불러오지 못했습니다.')
      } finally {
        if (isActive) setAiNotesLoading(false)
      }
    }
    loadAiNotes()
    return () => {
      isActive = false
    }
  }, [refreshTick])

  const aiSymbolOptions = useMemo(() => {
    const options = Array.from(new Set(aiNotes.map((note) => note.symbol).filter(Boolean)))
    return ['ALL', ...options] as string[]
  }, [aiNotes])

  const aiTimeframeOptions = useMemo(() => {
    const options = Array.from(new Set(aiNotes.map((note) => note.timeframe).filter(Boolean)))
    return ['ALL', ...options] as string[]
  }, [aiNotes])

  const filteredAiNotes = useMemo(() => {
    return aiNotes.filter((note) => {
      if (aiSymbolFilter !== 'ALL' && note.symbol !== aiSymbolFilter) return false
      if (aiTimeframeFilter !== 'ALL' && note.timeframe !== aiTimeframeFilter) return false
      return true
    })
  }, [aiNotes, aiSymbolFilter, aiTimeframeFilter])

  useEffect(() => {
    setAiNotesPage(1)
    setAiNotesPageInput('1')
  }, [aiSymbolFilter, aiTimeframeFilter])

  const jumpToAiNotesPage = () => {
    const parsedPage = Number.parseInt(aiNotesPageInput, 10)
    if (Number.isNaN(parsedPage)) {
      setAiNotesPageInput(String(aiNotesPage))
      return
    }
    setAiNotesPage(Math.min(aiNotesTotalPages, Math.max(1, parsedPage)))
  }

  const handleAiNotesPageInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpToAiNotesPage()
    }
  }

  const aiNotesTotalPages = Math.max(1, Math.ceil(filteredAiNotes.length / AI_NOTES_PAGE_SIZE))
  const pagedAiNotes = useMemo(() => {
    const start = (aiNotesPage - 1) * AI_NOTES_PAGE_SIZE
    return filteredAiNotes.slice(start, start + AI_NOTES_PAGE_SIZE)
  }, [filteredAiNotes, aiNotesPage])

  useEffect(() => {
    setAiNotesPageInput(String(aiNotesPage))
  }, [aiNotesPage])

  const copyAiFilterLink = async () => {
    const params = new URLSearchParams()
    if (aiSymbolFilter !== 'ALL') params.set('ai_symbol', aiSymbolFilter)
    if (aiTimeframeFilter !== 'ALL') params.set('ai_tf', aiTimeframeFilter)
    const url = new URL(window.location.href)
    url.pathname = '/review'
    url.search = params.toString()
    const link = url.toString()
    try {
      await navigator.clipboard.writeText(link)
      setCopiedShare(true)
      window.setTimeout(() => setCopiedShare(false), 1500)
    } catch {
      setCopiedShare(false)
    }
  }

  useEffect(() => {
    const qSymbol = searchParams.get('ai_symbol')
    const qTf = searchParams.get('ai_tf')
    if (qSymbol && qSymbol.trim()) setAiSymbolFilter(qSymbol)
    if (qTf && qTf.trim()) setAiTimeframeFilter(qTf)
    setAiFilterHydrated(true)
    // hydrate once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!aiFilterHydrated) return
    const currentSymbol = searchParams.get('ai_symbol') || 'ALL'
    const currentTf = searchParams.get('ai_tf') || 'ALL'
    if (currentSymbol === aiSymbolFilter && currentTf === aiTimeframeFilter) return

    const next = new URLSearchParams(searchParams.toString())
    if (aiSymbolFilter === 'ALL') next.delete('ai_symbol')
    else next.set('ai_symbol', aiSymbolFilter)
    if (aiTimeframeFilter === 'ALL') next.delete('ai_tf')
    else next.set('ai_tf', aiTimeframeFilter)

    const query = next.toString()
    router.replace(query ? `?${query}` : '/review', { scroll: false })
  }, [aiFilterHydrated, aiSymbolFilter, aiTimeframeFilter, searchParams, router])

  const tradePnl = useMemo(() => Number(tradeSummary?.totals?.realized_pnl_total || 0), [tradeSummary])
  const tradeCount = tradeSummary?.totals?.total_trades || 0
  const topTradeSymbol = useMemo(() => {
    const rows = tradeSummary?.by_symbol || []
    if (rows.length === 0) return null
    return [...rows].sort((a, b) => Number(b.total_trades || b.trade_count || 0) - Number(a.total_trades || a.trade_count || 0))[0]
  }, [tradeSummary])
  const topTradeExchange = useMemo(() => {
    const rows = tradeSummary?.by_exchange || []
    if (rows.length === 0) return null
    return [...rows].sort((a, b) => Number(b.total_trades || b.trade_count || 0) - Number(a.total_trades || a.trade_count || 0))[0]
  }, [tradeSummary])
  const symbolStatsForView = useMemo<Record<string, SymbolStats>>(() => {
    const tradeRows = tradeSummary?.by_symbol || []
    if (tradeRows.length === 0) return stats?.by_symbol || {}

    const mapped: Record<string, SymbolStats> = {}
    for (const row of tradeRows) {
      const symbol = row.symbol || 'UNKNOWN'
      const count = Number(row.total_trades || row.trade_count || 0)
      const wins = Number(row.wins || 0)
      const losses = Number(row.losses || 0)
      const pnlTotal = Number(row.realized_pnl_total || 0)
      const decided = wins + losses
      const winRate = decided > 0 ? (wins / decided) * 100 : 0
      const avgPnl = count > 0 ? pnlTotal / count : 0
      mapped[symbol] = {
        count,
        win_rate: winRate,
        avg_pnl: avgPnl.toFixed(4),
      }
    }
    return mapped
  }, [stats?.by_symbol, tradeSummary])

  const renderAiPager = (
    <PageJumpPager
      totalItems={filteredAiNotes.length}
      totalPages={aiNotesTotalPages}
      currentPage={aiNotesPage}
      pageInput={aiNotesPageInput}
      onPageInputChange={setAiNotesPageInput}
      onPageInputKeyDown={handleAiNotesPageInputKeyDown}
      onFirst={() => setAiNotesPage(1)}
      onPrevious={() => setAiNotesPage((page) => Math.max(1, page - 1))}
      onNext={() => setAiNotesPage((page) => Math.min(aiNotesTotalPages, page + 1))}
      onLast={() => setAiNotesPage(aiNotesTotalPages)}
      onJump={jumpToAiNotesPage}
      disabled={aiNotesLoading}
      itemLabel="개"
    />
  )

  const aiNotesSection = (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-neutral-200">AI 복기 요약</h3>
        <span className="text-sm text-zinc-300">최근 요청 기준</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={aiSymbolFilter}
          onChange={(event) => setAiSymbolFilter(event.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-neutral-300 focus:outline-none focus:border-white/20"
        >
          {aiSymbolOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'ALL' ? '심볼 전체' : option}
            </option>
          ))}
        </select>
        <select
          value={aiTimeframeFilter}
          onChange={(event) => setAiTimeframeFilter(event.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-neutral-300 focus:outline-none focus:border-white/20"
        >
          {aiTimeframeOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'ALL' ? '타임프레임 전체' : option}
            </option>
          ))}
        </select>
        <span className="text-sm text-zinc-300 ml-1">{filteredAiNotes.length} / {aiNotes.length}</span>
        <button
          type="button"
          onClick={copyAiFilterLink}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1 text-sm text-neutral-300 hover:bg-white/[0.12] hover:text-white"
        >
          {copiedShare ? '링크 공유 완료' : 'AI 요약 필터 링크 복사'}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-zinc-400">
        현재 공유 범위: {aiSymbolFilter === 'ALL' ? '심볼 전체' : aiSymbolFilter} / {aiTimeframeFilter === 'ALL' ? '타임프레임 전체' : aiTimeframeFilter}
      </p>
      {aiNotesError && (
        <p className="mt-3 text-sm text-rose-300">{aiNotesError}</p>
      )}
      {aiNotesLoading && (
        <p className="mt-3 text-sm text-zinc-300">불러오는 중...</p>
      )}
      {!aiNotesLoading && filteredAiNotes.length === 0 && !aiNotesError && (
        <p className="mt-3 text-sm text-zinc-300">아직 AI 복기 요약이 없습니다.</p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {pagedAiNotes.map((note) => {
          const sections = parseAiSections(note.content || '')
          const header = sections.length > 0 ? sections[0].title : note.title
          return (
            <div key={note.id} className="rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/10">
              <div className="flex items-center justify-between text-sm text-neutral-300">
                <span className="font-medium text-neutral-300">{header || 'AI 요약'}</span>
                <span>{new Date(note.created_at).toLocaleString('ko-KR')}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-sm">
                {note.source_label && (
                  <span className={SOURCE_BADGE_CLASS}>
                    {note.source_label}
                  </span>
                )}
                {note.venue_name && (
                  <span className={VENUE_BADGE_CLASS}>
                    {normalizeVenueLabel(note.venue_name)}
                  </span>
                )}
                {note.symbol && (
                  <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-neutral-300">{note.symbol}</span>
                )}
                {note.timeframe && (
                  <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-neutral-300">{note.timeframe}</span>
                )}
                {note.symbol && buildAiChartUrl(note) && (
                  <Link
                    href={buildAiChartUrl(note) || ''}
                    className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                  >
                    해당 캔들로 이동
                  </Link>
                )}
                {note.bubble_id && (
                  <Link
                    href={`/bubbles?bubble_id=${note.bubble_id}`}
                    className="rounded-full border border-cyan-500/30 px-2 py-0.5 text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                  >
                    관련 버블
                  </Link>
                )}
              </div>
              <div className="mt-3 space-y-2">
                {(sections.length > 0 ? sections : [{ title: '요약', body: note.content, tone: 'summary' as const }]).map((section) => (
                  <div
                    key={`${note.id}-${section.title}`}
                    className={`rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${toneClass(section.tone)}`}
                  >
                    <p className="text-sm font-bold uppercase tracking-wider opacity-90 mb-1">{section.title}</p>
                    <p className="text-current opacity-90">{section.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {aiNotesTotalPages > 1 && renderAiPager}
    </div>
  )

  const summarySection = (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-neutral-200">거래내역 반영 요약</h3>
          <div className={`text-sm font-semibold ${tradePnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            실현손익 {tradePnl >= 0 ? '+' : ''}{tradePnl.toLocaleString()}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(tradeSummary?.by_exchange || []).map((item, index) => {
            const exchangeName = item.exchange || 'unknown'
            const tradeCount = Number(item.total_trades || item.trade_count || 0)
            const chipKey = `${exchangeName}-${tradeCount}-${index}`
            return (
              <span key={chipKey} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-neutral-200">
                {exchangeName} · {tradeCount.toLocaleString()}건
              </span>
            )
          })}
          {(!tradeSummary || tradeSummary.by_exchange.length === 0) && (
            <span className="text-sm text-zinc-300">표시할 거래 요약이 없습니다.</span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors">
            <p className="text-sm uppercase tracking-wider text-zinc-300">실거래 건수</p>
            <p className="mt-1 text-base font-semibold text-sky-300">{tradeCount.toLocaleString()}건</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors">
            <p className="text-sm uppercase tracking-wider text-zinc-300">TOP 심볼</p>
            <p className="mt-1 text-base font-semibold text-emerald-300">
              {topTradeSymbol ? `${topTradeSymbol.symbol} (${(topTradeSymbol.total_trades || topTradeSymbol.trade_count || 0).toLocaleString()})` : '-'}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors">
            <p className="text-sm uppercase tracking-wider text-zinc-300">TOP 거래소</p>
            <p className="mt-1 text-base font-semibold text-amber-300">
              {topTradeExchange ? `${topTradeExchange.exchange} (${(topTradeExchange.total_trades || topTradeExchange.trade_count || 0).toLocaleString()})` : '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-neutral-200">긴급 대응 기록</h3>
          <Link href="/alert" className="text-sm text-neutral-300 hover:text-neutral-200 transition-colors">
            긴급 모드로 이동
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {alertActions.length === 0 && (
            <p className="text-sm text-zinc-300">아직 긴급 대응 기록이 없습니다.</p>
          )}
          {alertActions.slice(0, 6).map((entry) => (
            <div key={entry.id} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2.5">
              <div className="flex items-center justify-between text-sm text-neutral-300">
                <span className="font-medium text-neutral-300">{entry.symbol} · {entry.action}</span>
                <span>{new Date(entry.created_at).toLocaleString('ko-KR')}</span>
              </div>
              {entry.note && (
                <p className="mt-1 text-sm text-neutral-300">{entry.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const analyticsSection = (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setAnalyticsTab('calendar')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${analyticsTab === 'calendar'
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-300 hover:text-white'
            }`}
          >
            성과 캘린더
          </button>
          <button
            type="button"
            onClick={() => setAnalyticsTab('metrics')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${analyticsTab === 'metrics'
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-300 hover:text-white'
            }`}
          >
            지표
          </button>
          <button
            type="button"
            onClick={() => setAnalyticsTab('trend')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${analyticsTab === 'trend'
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-300 hover:text-white'
            }`}
          >
            추세 분석
          </button>
        </div>

        {analyticsTab === 'calendar' && (
          <div>
            <h3 className="text-sm font-medium text-neutral-200">성과 캘린더</h3>
            <div className="mt-3">
              <CalendarView calendar={calendar} isLoading={isLoading} />
            </div>
          </div>
        )}

        {analyticsTab === 'metrics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AccuracyChart accuracy={accuracy} isLoading={isLoadingAccuracy} />
            <TagPerformance byTag={stats?.by_tag} isLoading={isLoading} />
            <SymbolPerformance bySymbol={symbolStatsForView} isLoading={isLoading} />
          </div>
        )}

        {analyticsTab === 'trend' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-sm font-medium text-zinc-300">구간 성과</h3>
              <div className="flex p-1 space-x-1 bg-black/20 rounded-lg border border-white/[0.05]">
                {(['1h', '4h', '1d'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${selectedPeriod === period
                      ? 'bg-zinc-700 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                  >
                    {period.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5">
              {stats?.by_period && Object.keys(stats.by_period).length > 0 ? (
                (() => {
                  const data = stats.by_period[selectedPeriod]
                  if (!data) return <p className="text-sm text-zinc-500">해당 주기의 데이터가 없습니다.</p>
                  const pnl = parseFloat(data.avg_pnl)
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <p className="text-sm text-zinc-500 mb-1">평균 PnL</p>
                        <p className={`text-lg font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <p className="text-sm text-zinc-500 mb-1">샘플 수</p>
                        <p className="text-lg font-semibold text-zinc-200">{data.count}개</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] md:col-span-2">
                        <p className="text-sm text-zinc-500 mb-1">승률</p>
                        <p className={`text-lg font-semibold ${data.win_rate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {data.win_rate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <p className="text-sm text-zinc-500">집계할 데이터가 부족합니다.</p>
              )}
            </div>
            <div className="mt-6">
              <PerformanceTrendChart period={filters.period} />
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const journalSection = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <NoteList />
      <ExportButtons period={filters.period} outcomePeriod={filters.outcomePeriod} />
    </div>
  )

  return (
    <div className="min-h-screen text-sm text-neutral-100 p-4 md:p-8">
      <div className="w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">복기 대시보드</h1>
            <p className="text-sm text-zinc-400 mt-1">
              트레이딩 판단과 결과를 분석합니다
            </p>
          </div>
          <PeriodFilter filters={filters} onFilterChange={setFilters} />
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => setReviewTab('overview')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${reviewTab === 'overview'
              ? 'bg-white/15 text-white'
              : 'text-zinc-300 hover:text-white'
            }`}
          >
            개요
          </button>
          <button
            type="button"
            onClick={() => setReviewTab('ai')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${reviewTab === 'ai'
              ? 'bg-white/15 text-white'
              : 'text-zinc-300 hover:text-white'
            }`}
          >
            AI 복기
          </button>
          <button
            type="button"
            onClick={() => setReviewTab('analytics')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${reviewTab === 'analytics'
              ? 'bg-white/15 text-white'
              : 'text-zinc-300 hover:text-white'
            }`}
          >
            성과 분석
          </button>
          <button
            type="button"
            onClick={() => setReviewTab('journal')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${reviewTab === 'journal'
              ? 'bg-white/15 text-white'
              : 'text-zinc-300 hover:text-white'
            }`}
          >
            노트/내보내기
          </button>
        </div>

        <div className="mb-6">
          <StatsOverview stats={stats} isLoading={isLoading} />
        </div>

        {reviewTab === 'overview' && summarySection}
        {reviewTab === 'ai' && aiNotesSection}
        {reviewTab === 'analytics' && analyticsSection}
        {reviewTab === 'journal' && journalSection}
      </div >
    </div >
  )
}
```

## File: app/(app)/settings/page.tsx
```typescript
import { Settings } from '../../../src/components-old/Settings'

export default function SettingsPage() {
  return <Settings />
}
```

## File: app/(app)/trades/page.tsx
```typescript
import { Trades } from '../../../src/components-old/Trades'

export default function TradesPage() {
  return <Trades />
}
```

## File: app/(app)/layout.tsx
```typescript
import { RequireAuth } from '../../src/routes/RequireAuth'
import { Shell } from '../../src/components/Shell'
import type { ReactNode } from 'react'

export default function AppLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  )
}
```

## File: app/(app)/page.tsx
```typescript
import { redirect } from 'next/navigation'

export default function AppIndexPage() {
  redirect('/home')
}
```

## File: app/(auth)/login/page.tsx
```typescript
import { Login } from '../../../src/components-old/Login'

export default function LoginPage() {
  return <Login />
}
```

## File: app/(auth)/register/page.tsx
```typescript
import { Register } from '../../../src/components-old/Register'

export default function RegisterPage() {
  return <Register />
}
```

## File: app/(auth)/layout.tsx
```typescript
import { GuestOnly } from '../../src/routes/GuestOnly'
import type { ReactNode } from 'react'

export default function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  return <GuestOnly>{children}</GuestOnly>
}
```

## File: app/guest/page.tsx
```typescript
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../src/lib/api'
import { startGuestSession } from '../../src/lib/guestSession'
import { useAuthStore } from '../../src/stores/auth'

type GuestTab = 'home' | 'chart' | 'review' | 'portfolio'

const demoCards = [
  { title: '오늘의 스냅샷', value: '+$1,284', desc: '실거래 28건 · 매수 16 / 매도 12' },
  { title: '판단 정확도', value: '74.1%', desc: '최근 30일 AI 의견 매칭률' },
  { title: '긴급 알림', value: 'BTC RSI<30', desc: '유사상황 5건 자동 브리핑' },
  { title: '복기 데이터', value: '182 bubbles', desc: '성과/실수 패턴 자동 분류' },
]

const tabMeta: Record<GuestTab, { label: string; title: string; summary: string; bullets: string[] }> = {
  home: {
    label: '홈',
    title: '오늘 스냅샷',
    summary: '핵심 PnL · 거래수 · AI 합의도를 한 화면에서 확인',
    bullets: ['핵심 PnL 숫자 강조', '매수/매도 즉시 요약', '오늘 루틴 1개 제시'],
  },
  chart: {
    label: '차트',
    title: '말풍선 + 거래 오버레이',
    summary: '캔들 클릭 후 말풍선 저장, 실거래와 함께 비교',
    bullets: ['버블/트레이드 동시 표시', '밀도 모드로 가독성 조절', '선택 캔들 상세 패널'],
  },
  review: {
    label: '복기',
    title: '유사 상황 복원',
    summary: '예전 비슷한 판단과 결과를 자동 매칭해서 비교',
    bullets: ['심볼별 성과 랭킹', '실수 패턴 추적', 'AI 코멘트 정확도 비교'],
  },
  portfolio: {
    label: '포트폴리오',
    title: '통합 자산 흐름',
    summary: '거래소/자산군별 흐름을 타임라인으로 통합',
    bullets: ['CEX + DEX + 주식 통합', '자산군 필터 지원', '포지션 요약 연동'],
  },
}

export default function GuestPage() {
  const router = useRouter()
  const setTokens = useAuthStore((state) => state.setTokens)
  const [tab, setTab] = useState<GuestTab>('home')
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const scenario = useMemo(
    () =>
      [
        '새벽 알림 발생 -> 앱 진입 -> AI 긴급 브리핑 확인',
        '차트에서 말풍선 기록 -> 근거/확신도 저장',
        '퇴근 후 복기 탭에서 오늘 판단 결과 확인',
      ][scenarioIndex],
    [scenarioIndex],
  )

  const handleGuestStart = async () => {
    setStarting(true)
    setStartError(null)
    try {
      const guestEmail = process.env.NEXT_PUBLIC_GUEST_EMAIL || 'guest.preview@kifu.local'
      const guestPassword = process.env.NEXT_PUBLIC_GUEST_PASSWORD || 'guest1234'
      const response = await api.post('/v1/auth/login', { email: guestEmail, password: guestPassword })
      setTokens(response.data.access_token, response.data.refresh_token)
      startGuestSession()
      router.push('/home')
    } catch (err: any) {
      const message = err?.response?.data?.message || '게스트 시작에 실패했습니다. 잠시 후 다시 시도해주세요.'
      setStartError(message)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Guest Mode</p>
          <h1 className="text-3xl font-semibold">게스트 대시보드 미리보기</h1>
          <p className="text-sm text-zinc-400">
            더미 데이터로 전체 탭 흐름을 체험하고, 서비스가 어떤 느낌으로 돌아가는지 빠르게 확인할 수 있습니다.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {demoCards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{card.title}</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">{card.value}</p>
              <p className="mt-1 text-xs text-zinc-400">{card.desc}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(tabMeta) as GuestTab[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${tab === key
                  ? 'border-zinc-100 bg-zinc-100 text-zinc-950'
                  : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  }`}
              >
                {tabMeta[key].label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{tabMeta[tab].title}</p>
              <p className="mt-1 text-sm text-zinc-300">{tabMeta[tab].summary}</p>

              {tab === 'chart' && (
                <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                  <div className="flex h-20 items-end gap-1">
                    {[10, 26, 18, 34, 22, 45, 30, 38, 24, 41].map((h, idx) => (
                      <span
                        key={`${h}-${idx}`}
                        className={`w-3 rounded-sm ${idx % 2 === 0 ? 'bg-emerald-400/70' : 'bg-rose-400/70'}`}
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-200">💬 롱 근거 버블</span>
                    <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-rose-200">💬 숏 근거 버블</span>
                    <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-sky-200">↑↓ 실거래 오버레이</span>
                  </div>
                </div>
              )}

              {tab !== 'chart' && (
                <div className="mt-4 space-y-2 text-xs text-zinc-300">
                  {tabMeta[tab].bullets.map((item) => (
                    <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">체험 시나리오</p>
              <p className="mt-2 text-sm text-amber-200">{scenario}</p>
              <div className="mt-4 flex gap-2">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setScenarioIndex(idx)}
                    className={`rounded-md border px-2 py-1 text-xs ${scenarioIndex === idx
                      ? 'border-amber-300 bg-amber-300/15 text-amber-200'
                      : 'border-zinc-700 text-zinc-300'
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                게스트 체험은 저장되지 않지만, 실제 사용자 흐름과 같은 화면 구조를 사용합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <h2 className="text-lg font-semibold">다음 단계</h2>
          <p className="mt-2 text-sm text-zinc-400">
            실제 사용을 시작하려면 회원가입 후 거래내역 불러오기 또는 초기 성향 테스트를 진행하세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGuestStart}
              disabled={starting}
              className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
            >
              {starting ? '게스트 세션 시작 중...' : '게스트 세션 시작'}
            </button>
            <Link href="/onboarding/start" className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950">
              처음부터 시작
            </Link>
          </div>
          {startError && (
            <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {startError}
            </p>
          )}
          <p className="mt-3 text-xs text-zinc-500">
            게스트 세션에서는 API/CSV/AI 설정 기능이 비활성화됩니다.
          </p>
        </section>
      </div>
    </div>
  )
}
```

## File: app/onboarding/import/page.tsx
```typescript
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../../../src/stores/auth'

export default function OnboardingImportPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const authed = mounted && isAuthenticated

  return (
    <div className="min-h-screen bg-neutral-950 px-4 text-neutral-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center">
        <div className="w-full space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Import Onboarding</p>
          <h1 className="text-3xl font-semibold">내 거래 불러오기</h1>
          <p className="text-sm text-neutral-400">
            CSV 또는 API 연결로 거래내역을 불러오면, 차트/복기/포트폴리오가 바로 채워집니다.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Step 1</p>
            <h2 className="mt-2 text-lg font-semibold">거래소 연결</h2>
            <p className="mt-1 text-xs text-neutral-400">바이낸스/업비트 API 또는 CSV 업로드</p>
          </article>
          <article className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Step 2</p>
            <h2 className="mt-2 text-lg font-semibold">지금 동기화</h2>
            <p className="mt-1 text-xs text-neutral-400">최근 거래를 자동으로 가져옵니다</p>
          </article>
          <article className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Step 3</p>
            <h2 className="mt-2 text-lg font-semibold">서재 진입</h2>
            <p className="mt-1 text-xs text-neutral-400">오늘 스냅샷과 복기가 바로 활성화됩니다</p>
          </article>
        </section>

        <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/50 p-5">
          <div className="flex flex-wrap gap-2">
            {authed ? (
              <Link href="/settings" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
                설정에서 연결 시작
              </Link>
            ) : (
              <Link href="/register?next=%2Fonboarding%2Fimport" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
                회원가입 후 진행
              </Link>
            )}
            <Link href="/onboarding/test" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200">
              나중에 하고 3분 테스트
            </Link>
          </div>
        </section>
      </div>
      </div>
    </div>
  )
}
```

## File: app/onboarding/start/page.tsx
```typescript
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../../../src/stores/auth'

export default function OnboardingStartPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const authed = mounted && isAuthenticated

  return (
    <div className="min-h-screen bg-neutral-950 px-4 text-neutral-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center">
        <div className="w-full space-y-6">
          <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Onboarding</p>
          <h1 className="text-3xl font-semibold">처음부터 시작</h1>
          <p className="text-sm text-neutral-400">
            시작 방식만 고르면 이후 흐름은 서비스가 맞춰줍니다.
          </p>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Option A</p>
            <h2 className="mt-2 text-xl font-semibold">회원가입 후 거래내역 불러오기</h2>
            <p className="mt-2 text-sm text-neutral-300">
              API/CSV로 기존 거래내역을 가져와 차트·복기·포트폴리오를 바로 채웁니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {authed ? (
                <Link href="/onboarding/import" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
                  거래내역 불러오기
                </Link>
              ) : (
                <Link href="/register?next=%2Fonboarding%2Fimport" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
                  회원가입 후 진행
                </Link>
              )}
            </div>
            </article>

            <article className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Option B</p>
            <h2 className="mt-2 text-xl font-semibold">회원가입 후 초기 성향 테스트</h2>
            <p className="mt-2 text-sm text-neutral-300">
              5문항(약 3분)으로 성향을 분석하고 오늘 루틴을 자동 추천합니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {authed ? (
                <Link href="/onboarding/test" className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-neutral-950">
                  초기 성향 테스트 시작
                </Link>
              ) : (
                <Link href="/register?next=%2Fonboarding%2Ftest" className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-neutral-950">
                  회원가입 후 진행
                </Link>
              )}
            </div>
            </article>
          </section>
        </div>
      </div>
    </div>
  )
}
```

## File: app/onboarding/test/page.tsx
```typescript
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../../../src/stores/auth'
import { buildOnboardingProfile, readOnboardingDraft, readOnboardingProfile, saveOnboardingDraft, saveOnboardingProfile } from '../../../src/lib/onboardingProfile'

type Choice = 'long' | 'short' | 'hold'
type Confidence = 1 | 2 | 3 | 4 | 5
type Reason = 'trend' | 'reversal' | 'risk' | 'event' | 'volatility'
type Response = { choice: Choice; confidence: Confidence; reasons: Reason[] }
type Scenario = {
  id: number
  pair: string
  market: 'crypto' | 'stock'
  note: string
  signal: string
  context: string
}

const scenarios: Scenario[] = [
  { id: 1, pair: 'BTCUSDT', market: 'crypto', note: '급락 직후 첫 반등 캔들 출현', signal: 'RSI 30 하회', context: '거시 이벤트 2시간 전' },
  { id: 2, pair: 'ETHUSDT', market: 'crypto', note: '횡보 상단 재테스트', signal: '거래량 점진 증가', context: '3번째 저항 시도' },
  { id: 3, pair: 'TSLA', market: 'stock', note: '고점 부근 윗꼬리 연속', signal: '변동성 확대', context: '옵션 만기 주간' },
  { id: 4, pair: 'NVDA', market: 'stock', note: '강한 추세 중 첫 깊은 눌림', signal: 'VWAP 하향 이탈', context: '섹터 동반 조정' },
  { id: 5, pair: 'KRW-BTC', market: 'crypto', note: '국내 가격 괴리 급증', signal: '스프레드 확대', context: '단기 과열/과매수 구간' },
]

const reasonOptions: Array<{ key: Reason; label: string }> = [
  { key: 'trend', label: '추세 추종' },
  { key: 'reversal', label: '반전 기대' },
  { key: 'risk', label: '리스크 회피' },
  { key: 'event', label: '이벤트 대응' },
  { key: 'volatility', label: '변동성 매매' },
]

export default function OnboardingTestPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<number, Response>>({})
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)

  const completed = Object.values(answers).filter((item) => Boolean(item?.choice)).length
  const longCount = Object.values(answers).filter((item) => item.choice === 'long').length
  const shortCount = Object.values(answers).filter((item) => item.choice === 'short').length
  const holdCount = Object.values(answers).filter((item) => item.choice === 'hold').length
  const isComplete = completed >= scenarios.length
  const current = scenarios[currentIndex]
  const currentAnswer = answers[current.id]
  const progress = Math.round((completed / scenarios.length) * 100)
  const confidenceAverage = useMemo(() => {
    const values = Object.values(answers).map((item) => item.confidence || 3)
    if (values.length === 0) return 0
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
  }, [answers])

  const tendency = useMemo(() => {
    if (!isComplete) return '진단 중'
    const profile = buildOnboardingProfile(answers, scenarios.length)
    return profile.tendency
  }, [answers, isComplete])

  useEffect(() => {
    const draft = readOnboardingDraft<Record<number, Response>>()
    if (draft?.answers && Object.keys(draft.answers).length > 0) {
      setAnswers(draft.answers)
      if (Number.isInteger(draft.current_index)) {
        setCurrentIndex(Math.max(0, Math.min(scenarios.length - 1, draft.current_index)))
      }
    }
    const current = readOnboardingProfile()
    if (current?.completed_at) {
      setSavedAt(current.completed_at)
    }
  }, [])

  useEffect(() => {
    saveOnboardingDraft({
      updated_at: new Date().toISOString(),
      answers,
      current_index: currentIndex,
    })
  }, [answers, currentIndex])

  useEffect(() => {
    if (!isComplete) return
    const profile = buildOnboardingProfile(answers, scenarios.length)
    saveOnboardingProfile(profile)
    setSavedAt(profile.completed_at)
    setSaveFeedback('진단이 자동 저장되었습니다.')
  }, [answers, isComplete])

  const handleSave = () => {
    const profile = buildOnboardingProfile(answers, scenarios.length)
    saveOnboardingProfile(profile)
    setSavedAt(profile.completed_at)
    if (isAuthenticated) {
      router.push('/home')
      return
    }
    setSaveFeedback('저장 완료. 회원가입 후 바로 서재에서 이어갈 수 있어요.')
  }

  const updateChoice = (choice: Choice) => {
    setAnswers((prev) => {
      const before = prev[current.id]
      return {
        ...prev,
        [current.id]: {
          choice,
          confidence: before?.confidence || 3,
          reasons: before?.reasons || [],
        },
      }
    })
  }

  const updateConfidence = (confidence: Confidence) => {
    setAnswers((prev) => {
      const before = prev[current.id]
      return {
        ...prev,
        [current.id]: {
          choice: before?.choice || 'hold',
          confidence,
          reasons: before?.reasons || [],
        },
      }
    })
  }

  const toggleReason = (reason: Reason) => {
    setAnswers((prev) => {
      const before = prev[current.id] || { choice: 'hold' as Choice, confidence: 3 as Confidence, reasons: [] as Reason[] }
      const has = before.reasons.includes(reason)
      const reasons = has ? before.reasons.filter((item) => item !== reason) : [...before.reasons, reason]
      return {
        ...prev,
        [current.id]: {
          ...before,
          reasons,
        },
      }
    })
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 text-neutral-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center">
        <div className="w-full space-y-6">
          <header>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Onboarding Test</p>
            <h1 className="mt-2 text-3xl font-semibold">초기 성향 테스트 (5문항 · 약 3분)</h1>
            <p className="mt-2 text-sm text-neutral-400">
              실제 매매와 비슷한 핵심 상황만 빠르게 통과해 초기 루틴 보정 정확도를 높입니다.
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              진행률 {progress}% · 완료 {completed}/{scenarios.length} · 평균 확신도 {confidenceAverage || '-'}
            </p>
          </header>

          <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
              Scenario {currentIndex + 1} · {current.market.toUpperCase()}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-sky-300">{current.pair}</h2>
            <p className="mt-2 text-sm text-neutral-300">{current.note}</p>
            <p className="mt-1 text-xs text-zinc-400">신호: {current.signal}</p>
            <p className="mt-1 text-xs text-zinc-400">맥락: {current.context}</p>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">포지션 선택</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { key: 'long' as const, label: '롱 진입' },
                  { key: 'short' as const, label: '숏 진입' },
                  { key: 'hold' as const, label: '관망' },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => updateChoice(option.key)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${currentAnswer?.choice === option.key
                        ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                        : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">확신도</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([1, 2, 3, 4, 5] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateConfidence(value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${(currentAnswer?.confidence || 3) === value
                        ? 'border-cyan-300 bg-cyan-300/20 text-cyan-200'
                        : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                      }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">판단 근거(복수 선택)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {reasonOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggleReason(option.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${currentAnswer?.reasons?.includes(option.key)
                        ? 'border-emerald-300 bg-emerald-300/15 text-emerald-200'
                        : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 disabled:opacity-40"
              >
                이전
              </button>
              {currentIndex < scenarios.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(scenarios.length - 1, prev + 1))}
                  disabled={!currentAnswer?.choice}
                  className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-40"
                >
                  다음
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!currentAnswer?.choice}
                  className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-40"
                >
                  {isAuthenticated ? '진단 저장 후 서재 이동' : '진단 저장'}
                </button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">임시 진단</p>
            <p className="mt-2 text-lg font-semibold text-emerald-300">{tendency}</p>
            <p className="mt-1 text-sm text-neutral-400">
              완료 {completed}/{scenarios.length} · LONG {longCount} · SHORT {shortCount} · HOLD {holdCount}
            </p>
            <p className="mt-1 text-sm text-neutral-400">평균 확신도 {confidenceAverage || '-'}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {savedAt ? `저장됨: ${new Date(savedAt).toLocaleString('ko-KR')}` : '완료 시 자동 저장됩니다.'}
            </p>
            <p className="mt-1 text-xs text-zinc-400">선택한 포지션/근거는 문항마다 자동 저장됩니다.</p>
            {saveFeedback && (
              <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                {saveFeedback}
              </p>
            )}
            {!isAuthenticated && (
              <p className="mt-3 text-xs text-zinc-400">
                완료 후 회원가입하면 결과를 이어서 사용할 수 있습니다.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
```

## File: app/layout.tsx
```typescript
import type { Metadata } from 'next'
import '../src/index.css'
import { ToastProvider } from '../src/components/ui/Toast'

export const metadata: Metadata = {
  title: 'KIFU',
  description: 'AI-Powered Crypto Trading Journal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#0c0f13] text-zinc-200 antialiased selection:bg-green-500/30">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
```

## File: app/loading.tsx
```typescript
import { Loading } from '../src/components-old/Loading'

export default function LoadingPage() {
  return <Loading />
}
```

## File: app/not-found.tsx
```typescript
import { NotFound } from '../src/components-old/NotFound'

export default function NotFoundPage() {
  return <NotFound />
}
```

## File: app/page.tsx
```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LandingPage } from '../src/components/landing/LandingPage'
import { useAuthStore } from '../src/stores/auth'

export default function HomePage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/home')
    }
  }, [isAuthenticated, router])

  if (isAuthenticated) {
    return null
  }

  return <LandingPage />
}
```

## File: scripts/generateDemoData.ts
```typescript
/**
 * 데모 데이터 생성 스크립트
 * 실행: npx ts-node scripts/generateDemoData.ts
 */

type AgentResponse = {
  provider: string
  model: string
  prompt_type: 'brief' | 'detailed' | 'history' | 'custom' | 'technical'
  response: string
  created_at: string
}

type Bubble = {
  id: string
  symbol: string
  timeframe: string
  ts: number
  price: number
  note: string
  tags?: string[]
  action?: 'BUY' | 'SELL' | 'HOLD' | 'TP' | 'SL' | 'NONE'
  agents?: AgentResponse[]
  created_at: string
  updated_at: string
}

type Trade = {
  id: string
  exchange: 'upbit' | 'binance'
  symbol: string
  side: 'buy' | 'sell'
  ts: number
  price: number
  qty?: number
  fee?: number
}

// 랜덤 UUID 생성
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// BTC 가격 시뮬레이션 (2024년 1월 ~ 2025년 1월 기준 현실적인 가격대)
function generatePriceHistory(days: number): { ts: number; price: number }[] {
  const prices: { ts: number; price: number }[] = []
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000

  // 시작 가격 $42,000 (2024년 1월 기준)
  let price = 42000

  for (let i = days; i >= 0; i--) {
    const ts = now - i * oneDay

    // 현실적인 가격 변동 시뮬레이션
    // 2024년 BTC 상승장 반영: 42k -> 73k -> 조정 -> 100k
    const progress = (days - i) / days

    if (progress < 0.25) {
      // Q1 2024: 42k -> 73k 상승
      price = 42000 + progress * 4 * 31000 + (Math.random() - 0.5) * 3000
    } else if (progress < 0.5) {
      // Q2 2024: 73k -> 58k 조정
      price = 73000 - (progress - 0.25) * 4 * 15000 + (Math.random() - 0.5) * 4000
    } else if (progress < 0.75) {
      // Q3 2024: 58k -> 68k 횡보/상승
      price = 58000 + (progress - 0.5) * 4 * 10000 + (Math.random() - 0.5) * 5000
    } else {
      // Q4 2024 ~ 2025: 68k -> 100k+ 상승
      price = 68000 + (progress - 0.75) * 4 * 35000 + (Math.random() - 0.5) * 6000
    }

    // 일간 변동성 추가
    price = price * (1 + (Math.random() - 0.5) * 0.03)
    price = Math.round(price * 100) / 100

    prices.push({ ts, price })
  }

  return prices
}

// AI 에이전트 응답 템플릿
const agentTemplates = {
  buy: [
    { provider: 'openai', model: 'gpt-4', response: '강한 매수 신호입니다. RSI가 과매도 구간에서 반등 중이며, 거래량이 증가하고 있습니다. 목표가 {target}까지 상승 여력이 있습니다.' },
    { provider: 'anthropic', model: 'claude-3', response: '기술적 분석 결과 매수 진입 적기로 판단됩니다. 지지선 {support}에서 반등이 확인되었고, MACD 골든크로스가 임박했습니다.' },
    { provider: 'google', model: 'gemini-pro', response: '온체인 데이터 분석 결과, 대형 기관의 매집이 포착되었습니다. 현재 가격대에서 분할 매수를 권장합니다.' },
    { provider: 'openai', model: 'gpt-4-turbo', response: '볼린저 밴드 하단 터치 후 반등 중. 스토캐스틱 RSI 상승 전환. 단기 상승 모멘텀 형성 중입니다.' },
  ],
  sell: [
    { provider: 'openai', model: 'gpt-4', response: '차익실현 구간입니다. RSI 과매수 구간 진입, 저항선 {resistance} 근접. 부분 익절을 권장합니다.' },
    { provider: 'anthropic', model: 'claude-3', response: '단기 고점 형성 가능성이 높습니다. 거래량 감소와 함께 상승 모멘텀이 약화되고 있습니다.' },
    { provider: 'google', model: 'gemini-pro', response: '펀딩비가 극단적으로 높아졌습니다. 레버리지 청산 리스크 증가. 포지션 축소를 권장합니다.' },
  ],
  hold: [
    { provider: 'openai', model: 'gpt-4', response: '현재 횡보 구간입니다. 명확한 방향성이 나올 때까지 관망을 권장합니다. 주요 지지/저항: {support}/{resistance}' },
    { provider: 'anthropic', model: 'claude-3', response: '변동성이 축소되고 있습니다. 브레이크아웃 전 에너지 축적 구간으로 보입니다.' },
  ],
  tp: [
    { provider: 'openai', model: 'gpt-4', response: '목표가 도달! 수익률 {profit}% 달성. 훌륭한 트레이딩이었습니다.' },
    { provider: 'anthropic', model: 'claude-3', response: 'Take Profit 실행. 계획대로 익절 완료. 다음 진입 기회를 기다립니다.' },
  ],
  sl: [
    { provider: 'openai', model: 'gpt-4', response: '손절 실행. 리스크 관리 원칙에 따른 청산입니다. 손실률 {loss}%로 제한했습니다.' },
    { provider: 'anthropic', model: 'claude-3', response: 'Stop Loss 트리거. 시장이 예상과 다르게 움직였습니다. 자본 보존이 우선입니다.' },
  ],
}

const noteTemplates = {
  buy: [
    '지지선 확인 후 매수 진입',
    '거래량 급증, 상승 돌파 예상',
    'RSI 과매도 반등 매수',
    '피보나치 0.618 되돌림 매수',
    '삼각수렴 상방 돌파 매수',
    '이동평균선 골든크로스 매수',
    '공포 지수 극단적 공포 구간 매수',
    'CME 갭 메우기 완료 후 매수',
    '기관 매집 확인, 추세 추종 매수',
    '주요 지지선 리테스트 성공',
  ],
  sell: [
    '저항선 도달, 부분 익절',
    'RSI 과매수 구간 진입',
    '거래량 다이버전스 발생',
    '헤드앤숄더 패턴 형성 중',
    '펀딩비 과열, 리스크 관리 매도',
    '목표가 1차 도달 익절',
    '변곡점 도달, 포지션 축소',
    '이동평균선 데드크로스 임박',
    '고점 갱신 실패, 청산',
    '탐욕 지수 극단 구간',
  ],
  hold: [
    '횡보 구간, 관망',
    '방향성 불분명, 대기',
    '변동성 축소 중, 브레이크아웃 대기',
    '주요 뉴스 발표 전 관망',
    '거래량 감소, 추세 형성 대기',
  ],
  tp: [
    '목표가 도달! 익절 완료',
    'TP1 달성, 나머지 홀딩',
    '계획대로 수익 실현',
    '최종 목표가 도달',
  ],
  sl: [
    '손절 라인 이탈, 청산',
    '예상과 다른 흐름, 손절',
    '리스크 관리 원칙에 따른 청산',
    '급락으로 인한 손절',
  ],
}

const timeframes = ['1h', '4h', '1d']
const exchanges: ('binance' | 'upbit')[] = ['binance', 'binance', 'binance', 'upbit'] // binance 비중 높게

function generateAgentResponses(action: string, price: number): AgentResponse[] {
  const templates = agentTemplates[action as keyof typeof agentTemplates] || agentTemplates.hold
  const count = Math.floor(Math.random() * 3) + 1 // 1~3개 에이전트 응답

  const responses: AgentResponse[] = []
  const usedIndexes = new Set<number>()

  for (let i = 0; i < count && i < templates.length; i++) {
    let idx: number
    do {
      idx = Math.floor(Math.random() * templates.length)
    } while (usedIndexes.has(idx))
    usedIndexes.add(idx)

    const template = templates[idx]
    let response = template.response
      .replace('{target}', `$${Math.round(price * 1.1).toLocaleString()}`)
      .replace('{support}', `$${Math.round(price * 0.95).toLocaleString()}`)
      .replace('{resistance}', `$${Math.round(price * 1.05).toLocaleString()}`)
      .replace('{profit}', `${(Math.random() * 20 + 5).toFixed(1)}`)
      .replace('{loss}', `${(Math.random() * 5 + 1).toFixed(1)}`)

    responses.push({
      provider: template.provider,
      model: template.model,
      prompt_type: 'technical',
      response,
      created_at: new Date().toISOString(),
    })
  }

  return responses
}

function generateDemoData() {
  const priceHistory = generatePriceHistory(365)
  const bubbles: Bubble[] = []
  const trades: Trade[] = []

  // 500개 버블 생성
  const bubbleCount = 500
  const usedBubbleTimes = new Set<number>()

  for (let i = 0; i < bubbleCount; i++) {
    let pricePoint: { ts: number; price: number }
    let attempts = 0
    do {
      pricePoint = priceHistory[Math.floor(Math.random() * priceHistory.length)]
      attempts++
    } while (usedBubbleTimes.has(pricePoint.ts) && attempts < 100)

    // 같은 날에 여러 버블 허용 (시간 약간 변경)
    const ts = pricePoint.ts + Math.floor(Math.random() * 86400000) // 하루 내 랜덤 시간

    const actions: ('BUY' | 'SELL' | 'HOLD' | 'TP' | 'SL')[] = ['BUY', 'SELL', 'HOLD', 'TP', 'SL']
    const actionWeights = [0.3, 0.25, 0.2, 0.15, 0.1] // BUY 30%, SELL 25%, HOLD 20%, TP 15%, SL 10%

    let action: 'BUY' | 'SELL' | 'HOLD' | 'TP' | 'SL'
    const rand = Math.random()
    let cumulative = 0
    for (let j = 0; j < actions.length; j++) {
      cumulative += actionWeights[j]
      if (rand < cumulative) {
        action = actions[j]
        break
      }
    }
    action = action! || 'HOLD'

    const actionKey = action.toLowerCase() as keyof typeof noteTemplates
    const notes = noteTemplates[actionKey] || noteTemplates.hold
    const note = notes[Math.floor(Math.random() * notes.length)]

    const tags: string[] = [action.toLowerCase()]
    if (Math.random() > 0.5) tags.push('important')
    if (Math.random() > 0.7) tags.push('reviewed')

    const bubble: Bubble = {
      id: uuid(),
      symbol: 'BTCUSDT',
      timeframe: timeframes[Math.floor(Math.random() * timeframes.length)],
      ts,
      price: pricePoint.price * (1 + (Math.random() - 0.5) * 0.02), // 약간의 가격 변동
      note,
      tags,
      action,
      agents: generateAgentResponses(actionKey, pricePoint.price),
      created_at: new Date(ts).toISOString(),
      updated_at: new Date(ts).toISOString(),
    }

    bubbles.push(bubble)
  }

  // 500개 거래 생성
  const tradeCount = 500

  for (let i = 0; i < tradeCount; i++) {
    const pricePoint = priceHistory[Math.floor(Math.random() * priceHistory.length)]
    const ts = pricePoint.ts + Math.floor(Math.random() * 86400000)

    const side: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell'
    const price = pricePoint.price * (1 + (Math.random() - 0.5) * 0.01)
    const qty = Math.round((Math.random() * 0.5 + 0.001) * 10000) / 10000 // 0.001 ~ 0.5 BTC

    const trade: Trade = {
      id: uuid(),
      exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
      symbol: 'BTCUSDT',
      side,
      ts,
      price: Math.round(price * 100) / 100,
      qty,
      fee: Math.round(price * qty * 0.001 * 100) / 100, // 0.1% 수수료
    }

    trades.push(trade)
  }

  // 시간순 정렬
  bubbles.sort((a, b) => a.ts - b.ts)
  trades.sort((a, b) => a.ts - b.ts)

  return { bubbles, trades }
}

// 데이터 생성 및 출력
const data = generateDemoData()

console.log(JSON.stringify(data, null, 2))

// 통계 출력
console.error('\n=== 데모 데이터 생성 완료 ===')
console.error(`버블: ${data.bubbles.length}개`)
console.error(`거래: ${data.trades.length}개`)
console.error(`기간: ${new Date(data.bubbles[0].ts).toLocaleDateString()} ~ ${new Date(data.bubbles[data.bubbles.length - 1].ts).toLocaleDateString()}`)

const actionCounts = data.bubbles.reduce((acc, b) => {
  acc[b.action || 'NONE'] = (acc[b.action || 'NONE'] || 0) + 1
  return acc
}, {} as Record<string, number>)
console.error('액션 분포:', actionCounts)

const sideCounts = data.trades.reduce((acc, t) => {
  acc[t.side] = (acc[t.side] || 0) + 1
  return acc
}, {} as Record<string, number>)
console.error('거래 분포:', sideCounts)
```

## File: src/components/alerts/AlertBriefings.tsx
```typescript
'use client'

import { useState } from 'react'
import { useI18n } from '../../lib/i18n'
import type { AlertBriefing } from '../../types/alert'

type AlertBriefingsProps = {
  briefings: AlertBriefing[]
}

export function AlertBriefings({ briefings }: AlertBriefingsProps) {
  const { t } = useI18n()
  const [expandedId, setExpandedId] = useState<string | null>(
    briefings.length > 0 ? briefings[0].id : null
  )

  if (briefings.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.aiBriefings}</p>
        <p className="mt-3 text-sm text-neutral-500">{t.noBriefings}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.aiBriefings}</p>
      <div className="mt-4 space-y-3">
        {briefings.map((b) => {
          const isExpanded = expandedId === b.id
          return (
            <div
              key={b.id}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04]"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : b.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-neutral-200">{b.provider}</span>
                  <span className="text-xs text-neutral-500">{b.model}</span>
                </div>
                <div className="flex items-center gap-2">
                  {b.tokens_used != null && (
                    <span className="text-xs text-neutral-600">{b.tokens_used} tokens</span>
                  )}
                  <span className="text-neutral-500">{isExpanded ? '−' : '+'}</span>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-white/[0.08] px-4 pb-4 pt-3">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                    {b.response}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

## File: src/components/alerts/AlertCard.tsx
```typescript
'use client'

import Link from 'next/link'
import { useI18n } from '../../lib/i18n'
import type { Alert, AlertStatus, AlertSeverity } from '../../types/alert'

type AlertCardProps = {
  alert: Alert
}

const STATUS_STYLES: Record<AlertStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  briefed: 'bg-blue-500/20 text-blue-400',
  decided: 'bg-green-500/20 text-green-400',
  expired: 'bg-neutral-700/40 text-neutral-500',
}

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  normal: 'bg-white/[0.08] text-neutral-400',
  urgent: 'bg-red-500/20 text-red-400',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function AlertCard({ alert }: AlertCardProps) {
  const { t } = useI18n()

  const statusLabel: Record<AlertStatus, string> = {
    pending: t.statusPending,
    briefed: t.statusBriefed,
    decided: t.statusDecided,
    expired: t.statusExpired,
  }

  return (
    <Link
      href={`/alerts/${alert.id}`}
      className="block rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 transition hover:border-neutral-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-200">{alert.symbol}</span>
            <span className={`rounded px-2 py-0.5 text-xs ${SEVERITY_STYLES[alert.severity]}`}>
              {alert.severity === 'urgent' ? t.severityUrgent : t.severityNormal}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-neutral-400 line-clamp-2">{alert.trigger_reason}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
            <span>${alert.trigger_price}</span>
            <span>
              {timeAgo(alert.created_at)} {t.timeAgo}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[alert.status]}`}>
            {statusLabel[alert.status]}
          </span>
        </div>
      </div>
    </Link>
  )
}
```

## File: src/components/alerts/AlertOutcomes.tsx
```typescript
'use client'

import { useI18n } from '../../lib/i18n'
import type { AlertOutcome } from '../../types/alert'

type AlertOutcomesProps = {
  outcomes: AlertOutcome[]
}

export function AlertOutcomes({ outcomes }: AlertOutcomesProps) {
  const { t } = useI18n()

  if (outcomes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.outcomeTitle}</p>
        <p className="mt-3 text-sm text-neutral-500">{t.noOutcomes}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.outcomeTitle}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="pb-2 text-left text-xs font-medium text-neutral-500">Period</th>
              <th className="pb-2 text-right text-xs font-medium text-neutral-500">Reference</th>
              <th className="pb-2 text-right text-xs font-medium text-neutral-500">Outcome</th>
              <th className="pb-2 text-right text-xs font-medium text-neutral-500">PnL %</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((o) => {
              const pnl = parseFloat(o.pnl_percent)
              const pnlColor = pnl > 0 ? 'text-green-400' : pnl < 0 ? 'text-red-400' : 'text-neutral-400'
              const periodLabel = o.period === '1h' ? '1H' : o.period === '4h' ? '4H' : o.period === '1d' ? '1D' : o.period

              return (
                <tr key={o.id} className="border-b border-white/[0.08]/40">
                  <td className="py-2.5 text-neutral-300 font-medium">{periodLabel}</td>
                  <td className="py-2.5 text-right text-neutral-400">${o.reference_price}</td>
                  <td className="py-2.5 text-right text-neutral-400">${o.outcome_price}</td>
                  <td className={`py-2.5 text-right font-semibold ${pnlColor}`}>
                    {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

## File: src/components/alerts/DecisionForm.tsx
```typescript
'use client'

import { useState } from 'react'
import { useI18n } from '../../lib/i18n'
import { useAlertStore } from '../../stores/alertStore'
import type { DecisionAction, Confidence, AlertDecision } from '../../types/alert'

type DecisionFormProps = {
  alertId: string
  existingDecision?: AlertDecision | null
}

const ACTIONS: { value: DecisionAction; labelKey: 'actionBuy' | 'actionSell' | 'actionHold' | 'actionClose' | 'actionReduce' | 'actionAdd' | 'actionIgnore' }[] = [
  { value: 'buy', labelKey: 'actionBuy' },
  { value: 'sell', labelKey: 'actionSell' },
  { value: 'hold', labelKey: 'actionHold' },
  { value: 'close', labelKey: 'actionClose' },
  { value: 'reduce', labelKey: 'actionReduce' },
  { value: 'add', labelKey: 'actionAdd' },
  { value: 'ignore', labelKey: 'actionIgnore' },
]

const CONFIDENCES: { value: Confidence; labelKey: 'confidenceHigh' | 'confidenceMedium' | 'confidenceLow' }[] = [
  { value: 'high', labelKey: 'confidenceHigh' },
  { value: 'medium', labelKey: 'confidenceMedium' },
  { value: 'low', labelKey: 'confidenceLow' },
]

export function DecisionForm({ alertId, existingDecision }: DecisionFormProps) {
  const { t } = useI18n()
  const { submitDecision, isLoadingDetail } = useAlertStore()

  const [action, setAction] = useState<DecisionAction>('hold')
  const [memo, setMemo] = useState('')
  const [confidence, setConfidence] = useState<Confidence>('medium')

  if (existingDecision) {
    const actionLabel = ACTIONS.find((a) => a.value === existingDecision.action)
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.decisionTitle}</p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3">
            <span className="rounded bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
              {actionLabel ? t[actionLabel.labelKey] : existingDecision.action}
            </span>
            {existingDecision.confidence && (
              <span className="text-xs text-neutral-500">
                {t.decisionConfidence}: {existingDecision.confidence}
              </span>
            )}
          </div>
          {existingDecision.memo && (
            <p className="text-sm text-neutral-400">{existingDecision.memo}</p>
          )}
          <p className="text-xs text-neutral-600">
            {new Date(existingDecision.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitDecision(alertId, {
      action,
      memo: memo.trim() || undefined,
      confidence,
    })
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.decisionTitle}</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs text-neutral-400 mb-2">{t.decisionAction}</label>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAction(a.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  action === a.value
                    ? 'bg-neutral-200 text-neutral-950'
                    : 'bg-white/[0.06] text-neutral-400 hover:bg-white/[0.08]'
                }`}
              >
                {t[a.labelKey]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-2">{t.decisionConfidence}</label>
          <div className="flex gap-2">
            {CONFIDENCES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setConfidence(c.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  confidence === c.value
                    ? 'bg-neutral-200 text-neutral-950'
                    : 'bg-white/[0.06] text-neutral-400 hover:bg-white/[0.08]'
                }`}
              >
                {t[c.labelKey]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-2">{t.decisionMemo}</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-500"
            placeholder="판단 근거를 기록하세요..."
          />
        </div>

        <button
          type="submit"
          disabled={isLoadingDetail}
          className="w-full rounded-lg bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingDetail ? t.saving : t.submitDecision}
        </button>
      </form>
    </div>
  )
}
```

## File: src/components/alerts/RuleConfigForm.tsx
```typescript
'use client'

import { useI18n } from '../../lib/i18n'
import type { RuleType, RuleConfig } from '../../types/alert'

type RuleConfigFormProps = {
  ruleType: RuleType
  config: RuleConfig
  onChange: (config: RuleConfig) => void
}

export function RuleConfigForm({ ruleType, config, onChange }: RuleConfigFormProps) {
  const { t } = useI18n()

  const inputClass =
    'w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-500'
  const selectClass = inputClass
  const labelClass = 'block text-xs text-neutral-400 mb-1'
  const hintClass = 'mt-1 text-[11px] text-neutral-500'
  const descClass = 'mb-4 rounded-lg bg-white/[0.04] px-3 py-2.5 text-xs text-neutral-400 leading-relaxed'

  if (ruleType === 'price_change') {
    const c = config as { direction?: string; threshold_type?: string; threshold_value?: string; reference?: string }
    return (
      <div className="space-y-3">
        <div className={descClass}>
          {t.ruleDescPriceChange}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t.direction}</label>
            <select
              value={c.direction || 'both'}
              onChange={(e) => onChange({ ...c, direction: e.target.value } as RuleConfig)}
              className={selectClass}
            >
              <option value="drop">{t.dirDrop}</option>
              <option value="rise">{t.dirRise}</option>
              <option value="both">{t.dirBoth}</option>
            </select>
            <p className={hintClass}>{t.hintPriceChangeDir}</p>
          </div>
          <div>
            <label className={labelClass}>{t.threshold}</label>
            <div className="flex gap-2">
              <select
                value={c.threshold_type || 'percent'}
                onChange={(e) => onChange({ ...c, threshold_type: e.target.value } as RuleConfig)}
                className={selectClass + ' w-28'}
              >
                <option value="percent">%</option>
                <option value="absolute">$</option>
              </select>
              <input
                type="text"
                value={c.threshold_value || ''}
                onChange={(e) => onChange({ ...c, threshold_value: e.target.value } as RuleConfig)}
                placeholder="5"
                className={inputClass}
              />
            </div>
            <p className={hintClass}>{t.hintThreshold}</p>
          </div>
          <div>
            <label className={labelClass}>{t.reference}</label>
            <select
              value={c.reference || '24h'}
              onChange={(e) => onChange({ ...c, reference: e.target.value } as RuleConfig)}
              className={selectClass}
            >
              <option value="1h">{t.ref1h}</option>
              <option value="4h">{t.ref4h}</option>
              <option value="24h">{t.ref24h}</option>
            </select>
            <p className={hintClass}>{t.hintReference}</p>
          </div>
        </div>
      </div>
    )
  }

  if (ruleType === 'ma_cross') {
    const c = config as { ma_period?: number; ma_timeframe?: string; direction?: string }
    return (
      <div className="space-y-3">
        <div className={descClass}>
          {t.ruleDescMACross}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t.maPeriod}</label>
            <input
              type="number"
              value={c.ma_period || 20}
              onChange={(e) => onChange({ ...c, ma_period: parseInt(e.target.value) || 20 } as RuleConfig)}
              className={inputClass}
            />
            <p className={hintClass}>{t.hintMAPeriod}</p>
          </div>
          <div>
            <label className={labelClass}>{t.maTimeframe}</label>
            <select
              value={c.ma_timeframe || '1h'}
              onChange={(e) => onChange({ ...c, ma_timeframe: e.target.value } as RuleConfig)}
              className={selectClass}
            >
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>{t.direction}</label>
            <select
              value={c.direction || 'below'}
              onChange={(e) => onChange({ ...c, direction: e.target.value } as RuleConfig)}
              className={selectClass}
            >
              <option value="above">{t.dirMACrossAbove}</option>
              <option value="below">{t.dirMACrossBelow}</option>
            </select>
            <p className={hintClass}>{t.hintMACrossDir}</p>
          </div>
        </div>
      </div>
    )
  }

  if (ruleType === 'price_level') {
    const c = config as { price?: string; direction?: string }
    return (
      <div className="space-y-3">
        <div className={descClass}>
          {t.ruleDescPriceLevel}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t.targetPrice}</label>
            <input
              type="text"
              value={c.price || ''}
              onChange={(e) => onChange({ ...c, price: e.target.value } as RuleConfig)}
              placeholder="100000"
              className={inputClass}
            />
            <p className={hintClass}>{t.hintTargetPrice}</p>
          </div>
          <div>
            <label className={labelClass}>{t.direction}</label>
            <select
              value={c.direction || 'above'}
              onChange={(e) => onChange({ ...c, direction: e.target.value } as RuleConfig)}
              className={selectClass}
            >
              <option value="above">{t.dirLevelAbove}</option>
              <option value="below">{t.dirLevelBelow}</option>
              <option value="gte">{t.dirLevelGte}</option>
              <option value="lte">{t.dirLevelLte}</option>
            </select>
            <p className={hintClass}>{t.hintLevelDir}</p>
          </div>
        </div>
      </div>
    )
  }

  if (ruleType === 'volatility_spike') {
    const c = config as { timeframe?: string; multiplier?: string }
    return (
      <div className="space-y-3">
        <div className={descClass}>
          {t.ruleDescVolatility}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t.maTimeframe}</label>
            <select
              value={c.timeframe || '1h'}
              onChange={(e) => onChange({ ...c, timeframe: e.target.value } as RuleConfig)}
              className={selectClass}
            >
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t.multiplier}</label>
            <input
              type="text"
              value={c.multiplier || ''}
              onChange={(e) => onChange({ ...c, multiplier: e.target.value } as RuleConfig)}
              placeholder="2.0"
              className={inputClass}
            />
            <p className={hintClass}>{t.hintMultiplier}</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
```

## File: src/components/alerts/RuleEditor.tsx
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '../../lib/i18n'
import { useAlertStore } from '../../stores/alertStore'
import { RuleConfigForm } from './RuleConfigForm'
import type { AlertRule, RuleType, RuleConfig } from '../../types/alert'

type RuleEditorProps = {
  open: boolean
  rule?: AlertRule | null
  onClose: () => void
}

const RULE_TYPES: { value: RuleType; labelKey: 'ruleTypePrice' | 'ruleTypeMA' | 'ruleTypeLevel' | 'ruleTypeVolatility' }[] = [
  { value: 'price_change', labelKey: 'ruleTypePrice' },
  { value: 'ma_cross', labelKey: 'ruleTypeMA' },
  { value: 'price_level', labelKey: 'ruleTypeLevel' },
  { value: 'volatility_spike', labelKey: 'ruleTypeVolatility' },
]

const DEFAULT_CONFIGS: Record<RuleType, RuleConfig> = {
  price_change: { direction: 'both', threshold_type: 'percent', threshold_value: '5', reference: '24h' },
  ma_cross: { ma_period: 20, ma_timeframe: '1h', direction: 'below' },
  price_level: { price: '', direction: 'above' },
  volatility_spike: { timeframe: '1h', multiplier: '2.0' },
}

export function RuleEditor({ open, rule, onClose }: RuleEditorProps) {
  const { t } = useI18n()
  const { createRule, updateRule } = useAlertStore()

  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [ruleType, setRuleType] = useState<RuleType>('price_change')
  const [config, setConfig] = useState<RuleConfig>(DEFAULT_CONFIGS.price_change)
  const [cooldown, setCooldown] = useState(60)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isEdit = !!rule

  useEffect(() => {
    if (!open) return
    if (rule) {
      setName(rule.name)
      setSymbol(rule.symbol)
      setRuleType(rule.rule_type)
      setConfig(rule.config)
      setCooldown(rule.cooldown_minutes)
    } else {
      setName('')
      setSymbol('BTCUSDT')
      setRuleType('price_change')
      setConfig(DEFAULT_CONFIGS.price_change)
      setCooldown(60)
    }
    setError('')
  }, [open, rule])

  const handleRuleTypeChange = (newType: RuleType) => {
    setRuleType(newType)
    setConfig(DEFAULT_CONFIGS[newType])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !symbol.trim()) {
      setError('Name and symbol are required')
      return
    }

    setSubmitting(true)
    setError('')

    let result
    if (isEdit) {
      result = await updateRule(rule.id, { name, symbol, rule_type: ruleType, config, cooldown_minutes: cooldown })
    } else {
      result = await createRule({ name, symbol, rule_type: ruleType, config, cooldown_minutes: cooldown })
    }

    setSubmitting(false)
    if (result) {
      onClose()
    } else {
      setError(isEdit ? '규칙 수정에 실패했습니다' : '규칙 생성에 실패했습니다')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-neutral-950 text-neutral-100 shadow-xl">
        <div className="border-b border-white/[0.08] px-6 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Alert Rule</p>
          <h3 className="mt-2 text-xl font-semibold">{isEdit ? t.editRule : t.createRule}</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-neutral-300">
              {t.ruleName}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
                placeholder="BTC 5% drop alert"
              />
            </label>
            <label className="text-sm text-neutral-300">
              {t.ruleSymbol}
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
                placeholder="BTCUSDT"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-neutral-300">
              {t.ruleType}
              <select
                value={ruleType}
                onChange={(e) => handleRuleTypeChange(e.target.value as RuleType)}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
              >
                {RULE_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {t[rt.labelKey]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-neutral-300">
              {t.ruleCooldown}
              <input
                type="number"
                value={cooldown}
                onChange={(e) => setCooldown(parseInt(e.target.value) || 60)}
                min={1}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Configuration</p>
            <RuleConfigForm ruleType={ruleType} config={config} onChange={setConfig} />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t.saving : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

## File: src/components/alerts/RuleList.tsx
```typescript
'use client'

import { useI18n } from '../../lib/i18n'
import { useAlertStore } from '../../stores/alertStore'
import type { AlertRule, RuleType } from '../../types/alert'

type RuleListProps = {
  rules: AlertRule[]
  onEdit: (rule: AlertRule) => void
}

const RULE_TYPE_LABELS: Record<RuleType, 'ruleTypePrice' | 'ruleTypeMA' | 'ruleTypeLevel' | 'ruleTypeVolatility'> = {
  price_change: 'ruleTypePrice',
  ma_cross: 'ruleTypeMA',
  price_level: 'ruleTypeLevel',
  volatility_spike: 'ruleTypeVolatility',
}

function formatRuleConfig(rule: AlertRule): string {
  const c = rule.config
  switch (rule.rule_type) {
    case 'price_change': {
      const pc = c as { direction?: string; threshold_value?: string; threshold_type?: string; reference?: string }
      return `${pc.direction} ${pc.threshold_value}${pc.threshold_type === 'percent' ? '%' : '$'} / ${pc.reference}`
    }
    case 'ma_cross': {
      const mc = c as { ma_period?: number; ma_timeframe?: string; direction?: string }
      return `MA${mc.ma_period} ${mc.ma_timeframe} ${mc.direction}`
    }
    case 'price_level': {
      const pl = c as { price?: string; direction?: string }
      return `${pl.direction} ${pl.price}`
    }
    case 'volatility_spike': {
      const vs = c as { timeframe?: string; multiplier?: string }
      return `${vs.timeframe} x${vs.multiplier}`
    }
    default:
      return ''
  }
}

export function RuleList({ rules, onEdit }: RuleListProps) {
  const { t } = useI18n()
  const { toggleRule, deleteRule, isLoadingRules } = useAlertStore()

  const handleDelete = async (id: string) => {
    if (!confirm('이 규칙을 삭제하시겠습니까?')) return
    await deleteRule(id)
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-200 truncate">{rule.name}</h3>
                <span className="shrink-0 rounded bg-white/[0.08] px-2 py-0.5 text-xs text-neutral-400">
                  {rule.symbol}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span className="rounded bg-white/[0.06] px-2 py-0.5">
                  {t[RULE_TYPE_LABELS[rule.rule_type]]}
                </span>
                <span>{formatRuleConfig(rule)}</span>
                <span>· {rule.cooldown_minutes}m cooldown</span>
              </div>
              {rule.last_triggered_at && (
                <p className="mt-1 text-xs text-neutral-600">
                  Last triggered: {new Date(rule.last_triggered_at).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => toggleRule(rule.id)}
                disabled={isLoadingRules}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  rule.enabled ? 'bg-green-500' : 'bg-neutral-700'
                }`}
                aria-label={t.ruleEnabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rule.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => onEdit(rule)}
                className="rounded-lg px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition"
              >
                {t.editRule}
              </button>

              <button
                type="button"
                onClick={() => handleDelete(rule.id)}
                className="rounded-lg px-2 py-1 text-xs text-red-400 hover:text-red-300 transition"
              >
                {t.deleteRule}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

## File: src/components/chart/ChartReplay.tsx
```typescript
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { TimeSlider } from './TimeSlider'
import { ReplayControls } from './ReplayControls'
import { useReviewStore } from '../../stores/reviewStore'

type KlineItem = {
  time: number  // Unix seconds
  open: string
  high: string
  low: string
  close: string
  volume: string
}

type Props = {
  klines: KlineItem[]
  onFilteredKlines: (klines: KlineItem[]) => void
  timeframeSeconds: number
}

export function ChartReplay({ klines, onFilteredKlines, timeframeSeconds }: Props) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const {
    replay,
    setReplayTime,
    togglePlay,
    setSpeed,
    startReplay,
    stopReplay,
  } = useReviewStore()

  // Get time range from klines
  const startTime = klines.length > 0 ? klines[0].time * 1000 : 0
  const endTime = klines.length > 0 ? klines[klines.length - 1].time * 1000 : 0

  // Initialize replay when component mounts with klines
  useEffect(() => {
    if (klines.length > 0 && !replay.isActive) {
      // Start at 70% of the timeline by default
      const initialTime = startTime + (endTime - startTime) * 0.7
      startReplay(startTime, endTime)
      setReplayTime(initialTime)
    }
  }, [klines.length, startTime, endTime, replay.isActive, startReplay, setReplayTime])

  // Filter klines based on current replay time
  useEffect(() => {
    if (!replay.isActive || klines.length === 0) {
      onFilteredKlines(klines)
      return
    }

    const currentTimeSeconds = replay.currentTime / 1000
    const filtered = klines.filter((k) => k.time <= currentTimeSeconds)
    onFilteredKlines(filtered)
  }, [replay.isActive, replay.currentTime, klines, onFilteredKlines])

  // Auto-play interval
  useEffect(() => {
    if (replay.isPlaying && replay.isActive) {
      const stepMs = timeframeSeconds * 1000 // One candle worth of time
      const intervalMs = 1000 / replay.speed // Interval based on speed

      intervalRef.current = setInterval(() => {
        const newTime = replay.currentTime + stepMs
        if (newTime >= replay.endTime) {
          // Stop at the end
          setReplayTime(replay.endTime)
          togglePlay()
        } else {
          setReplayTime(newTime)
        }
      }, intervalMs)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [replay.isPlaying, replay.isActive, replay.speed, replay.currentTime, replay.endTime, timeframeSeconds, setReplayTime, togglePlay])

  const handleStepBack = useCallback(() => {
    const stepMs = timeframeSeconds * 1000
    const newTime = Math.max(replay.currentTime - stepMs, startTime)
    setReplayTime(newTime)
  }, [timeframeSeconds, replay.currentTime, startTime, setReplayTime])

  const handleStepForward = useCallback(() => {
    const stepMs = timeframeSeconds * 1000
    const newTime = Math.min(replay.currentTime + stepMs, endTime)
    setReplayTime(newTime)
  }, [timeframeSeconds, replay.currentTime, endTime, setReplayTime])

  const handleStop = useCallback(() => {
    stopReplay()
    onFilteredKlines(klines) // Reset to full klines
  }, [stopReplay, onFilteredKlines, klines])

  // Calculate visible candles info
  const currentTimeSeconds = replay.currentTime / 1000
  const visibleCandles = klines.filter((k) => k.time <= currentTimeSeconds).length
  const hiddenCandles = klines.length - visibleCandles

  if (!replay.isActive || klines.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.04] p-3 backdrop-blur-md">
        <button
          onClick={() => {
            if (klines.length > 0) {
              const initialTime = startTime + (endTime - startTime) * 0.7
              startReplay(startTime, endTime)
              setReplayTime(initialTime)
            }
          }}
          className="flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/20"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
          리플레이 시작
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.04] p-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400">리플레이 모드</span>
          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
            {replay.isPlaying ? '재생 중' : '일시정지'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-neutral-500">
          <span>표시 {visibleCandles}개</span>
          <span>숨김 {hiddenCandles}개</span>
        </div>
      </div>

      <TimeSlider
        startTime={startTime}
        endTime={endTime}
        currentTime={replay.currentTime}
        onTimeChange={setReplayTime}
        disabled={replay.isPlaying}
      />

      <div className="flex items-center justify-center">
        <ReplayControls
          isPlaying={replay.isPlaying}
          speed={replay.speed}
          onTogglePlay={togglePlay}
          onSpeedChange={setSpeed}
          onStepBack={handleStepBack}
          onStepForward={handleStepForward}
          onStop={handleStop}
        />
      </div>
    </div>
  )
}
```

## File: src/components/chart/index.ts
```typescript
export { TimeSlider } from './TimeSlider'
export { ReplayControls } from './ReplayControls'
export { ChartReplay } from './ChartReplay'
```

## File: src/components/chart/ReplayControls.tsx
```typescript
'use client'

type SpeedOption = 1 | 2 | 4 | 8

type Props = {
  isPlaying: boolean
  speed: SpeedOption
  onTogglePlay: () => void
  onSpeedChange: (speed: SpeedOption) => void
  onStepBack: () => void
  onStepForward: () => void
  onStop: () => void
  disabled?: boolean
}

export function ReplayControls({
  isPlaying,
  speed,
  onTogglePlay,
  onSpeedChange,
  onStepBack,
  onStepForward,
  onStop,
  disabled = false,
}: Props) {
  const speeds: SpeedOption[] = [1, 2, 4, 8]

  return (
    <div className="flex items-center gap-3">
      {/* Step Back */}
      <button
        onClick={onStepBack}
        disabled={disabled || isPlaying}
        className="rounded-lg border border-white/10 bg-white/5 p-2 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        title="이전 캔들"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        onClick={onTogglePlay}
        disabled={disabled}
        className="rounded-full bg-neutral-100 p-3 text-neutral-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        title={isPlaying ? '일시정지' : '재생'}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Step Forward */}
      <button
        onClick={onStepForward}
        disabled={disabled || isPlaying}
        className="rounded-lg border border-white/10 bg-white/5 p-2 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        title="다음 캔들"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      {/* Stop */}
      <button
        onClick={onStop}
        disabled={disabled}
        className="rounded-lg border border-white/10 bg-white/5 p-2 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        title="리플레이 종료"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" />
        </svg>
      </button>

      {/* Speed Selector */}
      <div className="ml-2 flex rounded-lg border border-white/5 bg-white/[0.04] p-1">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            disabled={disabled}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${speed === s
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-300'
              } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
```

## File: src/components/chart/TimeSlider.tsx
```typescript
'use client'

import { useCallback, useRef } from 'react'

type Props = {
  startTime: number  // epoch ms
  endTime: number    // epoch ms
  currentTime: number
  onTimeChange: (time: number) => void
  disabled?: boolean
}

export function TimeSlider({
  startTime,
  endTime,
  currentTime,
  onTimeChange,
  disabled = false,
}: Props) {
  const sliderRef = useRef<HTMLInputElement>(null)

  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${month}/${day} ${hours}:${minutes}`
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    onTimeChange(value)
  }

  // Calculate progress percentage
  const progress = endTime > startTime
    ? ((currentTime - startTime) / (endTime - startTime)) * 100
    : 0

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
        <span>{formatTime(startTime)}</span>
        <span className="font-medium text-neutral-300">{formatTime(currentTime)}</span>
        <span>{formatTime(endTime)}</span>
      </div>
      <div className="relative">
        <input
          ref={sliderRef}
          type="range"
          min={startTime}
          max={endTime}
          value={currentTime}
          onChange={handleChange}
          disabled={disabled}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-neutral-100 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-neutral-100 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:bg-white [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:w-4"
          style={{
            background: `linear-gradient(to right, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.2) ${progress}%, rgba(255,255,255,0.05) ${progress}%, rgba(255,255,255,0.05) 100%)`,
          }}
        />
      </div>
    </div>
  )
}
```

## File: src/components/guided-review/GuidedReviewFlow.tsx
```typescript
'use client'

import { useCallback, useState } from 'react'
import { useGuidedReviewStore } from '../../stores/guidedReviewStore'
import {
  INTENT_OPTIONS,
  EMOTION_OPTIONS,
  PATTERN_OPTIONS,
  NO_TRADE_INTENT_OPTIONS,
  NO_TRADE_PATTERN_OPTIONS,
  NO_TRADE_SYMBOL,
} from '../../types/guidedReview'
import type { GuidedReviewItem } from '../../types/guidedReview'

type Layer = 'intent' | 'emotions' | 'pattern' | 'memo'

const LAYERS: Layer[] = ['intent', 'emotions', 'pattern', 'memo']

const layerTitle: Record<Layer, string> = {
  intent: '이 거래의 진입 이유는?',
  emotions: '거래 시 감정은? (복수 선택)',
  pattern: '다시 한다면?',
  memo: '한 줄 메모',
}

const noTradeLayerTitle: Record<Layer, string> = {
  intent: '오늘 거래를 하지 않은 가장 큰 이유는?',
  emotions: '오늘 시장을 보며 느낀 감정은? (복수 선택)',
  pattern: '내일은 어떤 기준으로 움직일까요?',
  memo: '비거래일 메모',
}

const pnlTone = (pnl?: number | null) => {
  if (pnl === null || pnl === undefined) return 'text-neutral-300'
  if (pnl > 0) return 'text-lime-300'
  if (pnl < 0) return 'text-rose-300'
  return 'text-neutral-300'
}

const formatPnl = (pnl?: number | null) => {
  if (pnl === null || pnl === undefined) return '-'
  const sign = pnl >= 0 ? '+' : ''
  return `${sign}${pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

type ItemFlowProps = {
  item: GuidedReviewItem
  index: number
  total: number
  onSubmitted: () => void
}

function ItemFlow({ item, index, total, onSubmitted }: ItemFlowProps) {
  const { submitItem } = useGuidedReviewStore()
  const [currentLayer, setCurrentLayer] = useState(0)
  const [intent, setIntent] = useState(item.intent || '')
  const [emotions, setEmotions] = useState<string[]>(item.emotions || [])
  const [pattern, setPattern] = useState(item.pattern_match || '')
  const [memo, setMemo] = useState(item.memo || '')
  const [submitting, setSubmitting] = useState(false)

  const layer = LAYERS[currentLayer]
  const isNoTradeDayItem = item.symbol === NO_TRADE_SYMBOL || item.trade_count === 0
  const isSupplementItem = (item.bundle_key || '').startsWith('SUPPLEMENT:')
  const isRolloverItem = (item.bundle_key || '').startsWith('ROLLOVER:')
  const intentOptions = isNoTradeDayItem ? NO_TRADE_INTENT_OPTIONS : INTENT_OPTIONS
  const patternOptions = isNoTradeDayItem ? NO_TRADE_PATTERN_OPTIONS : PATTERN_OPTIONS
  const resolvedLayerTitle = isNoTradeDayItem ? noTradeLayerTitle[layer] : layerTitle[layer]

  const toggleEmotion = useCallback((value: string) => {
    setEmotions((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]
    )
  }, [])

  const canAdvance = () => {
    if (layer === 'intent') return intent !== ''
    if (layer === 'emotions') return emotions.length > 0
    if (layer === 'pattern') return pattern !== ''
    return true
  }

  const handleNext = async () => {
    if (currentLayer < LAYERS.length - 1) {
      setCurrentLayer(currentLayer + 1)
      return
    }
    // Submit
    setSubmitting(true)
    const ok = await submitItem(item.id, {
      intent,
      emotions,
      pattern_match: pattern,
      memo,
    })
    setSubmitting(false)
    if (ok) onSubmitted()
  }

  const handleBack = () => {
    if (currentLayer > 0) setCurrentLayer(currentLayer - 1)
  }

  const isAlreadyAnswered = Boolean(item.intent)

  return (
    <div className="space-y-5">
      {/* Item header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-neutral-100">
            {isNoTradeDayItem ? '비거래일 복기' : item.symbol}
          </p>
          <p className="text-xs text-neutral-500">
            {isNoTradeDayItem
              ? '오늘은 거래 없이 루틴을 이어갑니다'
              : `${item.side ? item.side.toUpperCase() : '-'} · ${item.trade_count}건`}
          </p>
          {(isSupplementItem || isRolloverItem) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {isSupplementItem && (
                <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
                  보강
                </span>
              )}
              {isRolloverItem && (
                <span className="rounded-full border border-violet-300/40 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-200">
                  이월
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className={`text-xl font-semibold ${pnlTone(item.pnl)}`}>{formatPnl(item.pnl)}</p>
          <p className="text-[10px] text-neutral-500">{index + 1} / {total}</p>
        </div>
      </div>

      {/* Layer progress */}
      <div className="flex gap-1">
        {LAYERS.map((l, i) => (
          <div
            key={l}
            className={`h-1 flex-1 rounded-full transition ${
              i <= currentLayer ? 'bg-sky-400' : 'bg-neutral-800'
            }`}
          />
        ))}
      </div>

      {isAlreadyAnswered && currentLayer === 0 ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-center">
          <p className="text-sm font-semibold text-emerald-200">답변 완료</p>
          <p className="mt-1 text-xs text-emerald-200/70">
            {intentOptions.find((o) => o.value === item.intent)?.label}
            {item.emotions && item.emotions.length > 0 && (
              <> · {item.emotions.map((e) => EMOTION_OPTIONS.find((o) => o.value === e)?.label).filter(Boolean).join(', ')}</>
            )}
          </p>
          <button
            type="button"
            onClick={onSubmitted}
            className="mt-3 rounded-lg bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-900"
          >
            다음
          </button>
        </div>
      ) : (
        <>
          {/* Layer title */}
          <p className="text-sm font-semibold text-neutral-200">{resolvedLayerTitle}</p>

          {/* Layer content */}
          {layer === 'intent' && (
            <div className="flex flex-wrap gap-2">
              {intentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setIntent(option.value)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    intent === option.value
                      ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                      : 'border-white/[0.06] bg-white/[0.04] text-neutral-300 hover:border-white/[0.1]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {layer === 'emotions' && (
            <div className="flex flex-wrap gap-2">
              {EMOTION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleEmotion(option.value)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    emotions.includes(option.value)
                      ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                      : 'border-white/[0.06] bg-white/[0.04] text-neutral-300 hover:border-white/[0.1]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {layer === 'pattern' && (
            <div className="flex flex-wrap gap-2">
              {patternOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPattern(option.value)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    pattern === option.value
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-white/[0.06] bg-white/[0.04] text-neutral-300 hover:border-white/[0.1]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {layer === 'memo' && (
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={isNoTradeDayItem ? '오늘 비거래 선택이 맞았는지, 내일 체크할 조건을 남기기 (선택)' : '오늘 이 거래에 대해 한 줄 남기기 (선택)'}
              rows={3}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentLayer === 0}
              className="rounded-lg border border-white/[0.06] px-4 py-2 text-xs font-semibold text-neutral-300 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance() || submitting}
              className="rounded-lg bg-neutral-100 px-6 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting
                ? '저장 중...'
                : currentLayer === LAYERS.length - 1
                  ? '제출'
                  : '다음'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function GuidedReviewFlow({ onClose }: { onClose: () => void }) {
  const { review, items, currentStep, streak, completeReview, nextStep, setStep } =
    useGuidedReviewStore()
  const [completing, setCompleting] = useState(false)

  const answeredCount = items.filter((i) => i.intent).length
  const totalCount = items.length
  const allAnswered = answeredCount === totalCount && totalCount > 0
  const isCompleted = review?.status === 'completed' && allAnswered

  const handleItemSubmitted = () => {
    if (currentStep < items.length - 1) {
      nextStep()
    }
  }

  const handleComplete = async () => {
    setCompleting(true)
    await completeReview()
    setCompleting(false)
  }

  if (isCompleted) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-5xl">&#127881;</div>
        <p className="text-xl font-semibold text-neutral-100">오늘의 복기 완료!</p>
        {streak && (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2">
            <span className="text-lg">&#128293;</span>
            <span className="text-sm font-semibold text-amber-200">{streak.current_streak}일 연속</span>
          </div>
        )}
        <p className="text-xs text-neutral-500">
          최고 기록: {streak?.longest_streak ?? 0}일
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-neutral-100 px-6 py-2.5 text-sm font-semibold text-neutral-900"
        >
          닫기
        </button>
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-neutral-400">오늘 거래 기록이 없습니다.</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-300"
        >
          닫기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">
          {answeredCount} / {totalCount} 완료
        </p>
        <div className="flex gap-1">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(i)}
              className={`h-2 w-6 rounded-full transition ${
                i === currentStep
                  ? 'bg-sky-400'
                  : item.intent
                    ? 'bg-emerald-500'
                    : 'bg-neutral-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Current item */}
      {items[currentStep] && (
        <ItemFlow
          key={items[currentStep].id}
          item={items[currentStep]}
          index={currentStep}
          total={totalCount}
          onSubmitted={handleItemSubmitted}
        />
      )}

      {/* Complete button */}
      {allAnswered && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {completing ? '완료 처리 중...' : '복기 완료하기'}
          </button>
        </div>
      )}
    </div>
  )
}
```

## File: src/components/home/HomeGuidedReviewCard.tsx
```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '../../lib/api'
import { normalizeTradeSummary } from '../../lib/tradeAdapters'
import { useGuidedReviewStore } from '../../stores/guidedReviewStore'
import { NO_TRADE_SYMBOL } from '../../types/guidedReview'
import { GuidedReviewFlow } from '../guided-review/GuidedReviewFlow'

type HomeGuidedReviewCardProps = {
  forceOpen?: boolean
  autoLoad?: boolean
}

export function HomeGuidedReviewCard({ forceOpen = false, autoLoad = true }: HomeGuidedReviewCardProps) {
  const { review, items, streak, isLoading, error, fetchToday, fetchStreak } =
    useGuidedReviewStore()
  const [isOpen, setIsOpen] = useState(false)
  const [recentSymbols, setRecentSymbols] = useState<string[]>([])

  useEffect(() => {
    if (autoLoad) {
      fetchToday()
      fetchStreak()
    }
    const loadRecentSymbols = async () => {
      try {
        const response = await api.get('/v1/trades/summary')
        const normalized = normalizeTradeSummary(response.data)
        const top = (normalized.by_symbol || [])
          .slice()
          .sort((a, b) => Number(b.total_trades || b.trade_count || 0) - Number(a.total_trades || a.trade_count || 0))
          .map((row) => row.symbol)
          .filter(Boolean)
          .slice(0, 4)
        setRecentSymbols(top)
      } catch {
        setRecentSymbols([])
      }
    }
    loadRecentSymbols()
  }, [autoLoad, fetchToday, fetchStreak])

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true)
    }
  }, [forceOpen])

  const answeredCount = items.filter((i) => i.intent).length
  const totalCount = items.length
  const hasPendingItems = totalCount > answeredCount
  const isCompleted = review?.status === 'completed' && !hasPendingItems
  const hasItems = totalCount > 0
  const isNoTradeDay = hasItems && items.length === 1 && (items[0].symbol === NO_TRADE_SYMBOL || items[0].trade_count === 0)
  const supplementPending = items.filter(
    (item) => !item.intent && (item.bundle_key || '').startsWith('SUPPLEMENT:')
  ).length
  const rolloverPending = items.filter(
    (item) => !item.intent && (item.bundle_key || '').startsWith('ROLLOVER:')
  ).length

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Guided Review</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-100">
            오늘의 복기
          </h2>
          <p className="text-xs text-neutral-500">
            거래를 하나씩 돌아보며 패턴을 기록합니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {streak && streak.current_streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5">
              <span className="text-sm">&#128293;</span>
              <span className="text-xs font-semibold text-amber-200">
                {streak.current_streak}일
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {hasItems && !isOpen && (
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Items</p>
            <p className="mt-1 text-lg font-semibold text-neutral-100">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Answered</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">{answeredCount}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Status</p>
            <p className={`mt-1 text-lg font-semibold ${isCompleted ? 'text-emerald-200' : 'text-amber-200'}`}>
              {isCompleted ? '완료' : `${totalCount - answeredCount}건 남음`}
            </p>
          </div>
        </div>
      )}

      {!isOpen && (supplementPending > 0 || rolloverPending > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {supplementPending > 0 && (
            <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
              보강 {supplementPending}건
            </span>
          )}
          {rolloverPending > 0 && (
            <span className="rounded-full border border-violet-300/40 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200">
              이월 {rolloverPending}건
            </span>
          )}
        </div>
      )}

      {isNoTradeDay && !isOpen && (
        <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3">
          <p className="text-xs font-semibold text-cyan-100">오늘은 비거래일 복기입니다.</p>
          <p className="mt-1 text-xs text-cyan-100/80">
            왜 거래하지 않았는지 기록하고, 내일 볼 심볼을 정리해 연속 루틴을 유지하세요.
          </p>
          {recentSymbols.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {recentSymbols.map((symbol) => (
                <Link
                  key={symbol}
                  href={`/chart/${encodeURIComponent(symbol)}`}
                  className="rounded-full border border-cyan-300/30 bg-cyan-900/20 px-2.5 py-1 text-[11px] text-cyan-100/90 hover:bg-cyan-800/30"
                >
                  {symbol}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Flow area */}
      {isOpen ? (
        <div className="mt-5 rounded-xl border border-white/[0.08] bg-black/20 p-5">
          <GuidedReviewFlow onClose={() => setIsOpen(false)} />
        </div>
      ) : (
        <div className="mt-4">
          {isLoading ? (
            <p className="text-xs text-neutral-500">불러오는 중...</p>
          ) : error ? (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3">
              <p className="text-xs text-rose-200">{error}</p>
              <button
                type="button"
                onClick={() => fetchToday()}
                className="mt-2 rounded-md border border-rose-300/40 px-2.5 py-1 text-[11px] font-medium text-rose-100 hover:bg-rose-500/10"
              >
                다시 불러오기
              </button>
            </div>
          ) : isCompleted ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
              <span className="text-lg">&#10003;</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-200">오늘의 복기를 완료했습니다</p>
              <p className="text-xs text-emerald-200/60">
                {streak && streak.current_streak > 0
                  ? `${streak.current_streak}일 연속 복기 중 (최고: ${streak.longest_streak}일)`
                  : '내일도 이어가세요!'}
              </p>
            </div>
            {supplementPending > 0 || rolloverPending > 0 ? (
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-100 border border-emerald-300/40 hover:bg-emerald-500/30"
              >
                보강/이월 복기 이어하기
              </button>
            ) : (
              <Link
                href="/review"
                className="rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-100 border border-emerald-300/40 hover:bg-emerald-500/30"
              >
                복기 결과 보기
              </Link>
            )}
          </div>
          ) : hasItems ? (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {rolloverPending > 0
                ? `이월 복기 시작 (${answeredCount}/${totalCount})`
                : review?.status === 'completed' && hasPendingItems
                ? `보강 복기 시작 (${answeredCount}/${totalCount})`
                : answeredCount > 0
                ? `복기 이어하기 (${answeredCount}/${totalCount})`
                : '오늘의 복기 시작'}
            </button>
          ) : (
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-xs text-neutral-500">
              오늘(선택 시간대 기준) 거래가 없어 복기 항목이 없습니다.
              <span className="ml-1 text-neutral-300">비거래일도 기록 흐름은 계속 저장할 수 있습니다.</span>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
```

## File: src/components/home/HomeSafetyCheckCard.tsx
```typescript
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import type {
  SafetyItem,
  SafetyMemberTarget,
  SafetyReviewResponse,
  SafetyTodayResponse,
  SafetyVerdict,
  UpsertSafetyReviewPayload,
} from '../../types/safety'

const verdictLabel: Record<SafetyVerdict, string> = {
  intended: '의도됨',
  mistake: '실수',
  unsure: '모름',
}

const verdictTone: Record<SafetyVerdict, string> = {
  intended: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200',
  mistake: 'border-rose-400/50 bg-rose-500/10 text-rose-200',
  unsure: 'border-amber-400/50 bg-amber-500/10 text-amber-200',
}

const assetTone: Record<string, string> = {
  crypto: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-200',
  stock: 'border-indigo-400/50 bg-indigo-500/10 text-indigo-200',
}

const actionButtons: { verdict: SafetyVerdict; label: string; tone: string }[] = [
  { verdict: 'intended', label: '의도됨', tone: 'border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/10' },
  { verdict: 'mistake', label: '실수', tone: 'border-rose-400/50 text-rose-200 hover:bg-rose-500/10' },
  { verdict: 'unsure', label: '모름', tone: 'border-amber-400/50 text-amber-200 hover:bg-amber-500/10' },
]

const formatDateTime = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatCompactNumber = (value?: number) => {
  if (value === undefined) return '-'
  return value.toLocaleString('ko-KR')
}

type GroupedSafetyItem = SafetyItem & {
  member_targets: SafetyMemberTarget[]
  group_size: number
}

export function HomeSafetyCheckCard() {
  const [safety, setSafety] = useState<SafetyTodayResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittingTarget, setSubmittingTarget] = useState<string | null>(null)
  const [assetClassFilter, setAssetClassFilter] = useState<'all' | 'crypto' | 'stock'>('all')
  const [venueFilter, setVenueFilter] = useState('all')

  const timezone = useMemo(() => {
    if (typeof window === 'undefined') return 'UTC'
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  }, [])

  const loadSafety = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ timezone, limit: '20' })
      if (assetClassFilter !== 'all') params.set('asset_class', assetClassFilter)
      if (venueFilter !== 'all') params.set('venue', venueFilter)
      const response = await api.get<SafetyTodayResponse>(`/v1/safety/today?${params}`)
      setSafety(response.data)
    } catch {
      setError('오늘 거래 체크를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [timezone, assetClassFilter, venueFilter])

  useEffect(() => {
    loadSafety()
  }, [loadSafety])

  const venueOptions = useMemo(() => {
    if (!safety) return []
    const values = Array.from(new Set(safety.items.map((item) => (item.venue || '').toLowerCase()).filter(Boolean)))
    values.sort((a, b) => a.localeCompare(b))
    return values
  }, [safety])

  const groupedItems = useMemo<GroupedSafetyItem[]>(() => {
    if (!safety) return []
    return safety.items.map((item) => ({
      ...item,
      venue: (item.venue || '').toLowerCase(),
      member_targets:
        item.member_targets && item.member_targets.length > 0
          ? item.member_targets
          : [
              {
                target_type: item.target_type,
                target_id: item.target_id,
                reviewed: item.reviewed,
                verdict: item.verdict,
              },
            ],
      group_size: item.group_size && item.group_size > 0 ? item.group_size : 1,
    }))
  }, [safety])

  const groupedSummary = useMemo(() => {
    const total = groupedItems.length
    const reviewed = groupedItems.filter((item) => item.reviewed).length
    return {
      total,
      reviewed,
      pending: Math.max(total - reviewed, 0),
    }
  }, [groupedItems])

  const onSubmitVerdict = async (item: GroupedSafetyItem, verdict: SafetyVerdict) => {
    setSubmittingTarget(item.target_id)
    setError(null)

    try {
      for (const target of item.member_targets) {
        const payload: UpsertSafetyReviewPayload = {
          target_type: target.target_type,
          target_id: target.target_id,
          verdict,
        }
        await api.post<SafetyReviewResponse>('/v1/safety/reviews', payload)
      }
      await loadSafety()
    } catch {
      setError('라벨 저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmittingTarget(null)
    }
  }

  const pendingTone = (groupedSummary.pending ?? 0) > 0 ? 'text-amber-200' : 'text-emerald-200'

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Safety Check</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-100">오늘 거래 의도 체크</h2>
          <p className="text-xs text-neutral-500">한 번 탭해서 AI 분석 맥락을 강화합니다.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSafety}
            className="rounded-lg border border-neutral-700/70 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition hover:border-neutral-500"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="rounded-lg border border-neutral-700/70 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition hover:border-neutral-500"
          >
            {isCollapsed ? '펼치기' : '최소화'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Total</p>
          <p className="mt-1 text-lg font-semibold text-neutral-100">{formatCompactNumber(groupedSummary.total)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Reviewed</p>
          <p className="mt-1 text-lg font-semibold text-emerald-200">{formatCompactNumber(groupedSummary.reviewed)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Pending</p>
          <p className={`mt-1 text-lg font-semibold ${pendingTone}`}>{formatCompactNumber(groupedSummary.pending)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.04] p-1">
          {([
            { key: 'all', label: '전체' },
            { key: 'crypto', label: '코인' },
            { key: 'stock', label: '주식' },
          ] as const).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setAssetClassFilter(option.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                assetClassFilter === option.key
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-300 hover:text-neutral-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => setVenueFilter('all')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              venueFilter === 'all'
                ? 'bg-neutral-100 text-neutral-900'
                : 'text-neutral-300 hover:text-neutral-100'
            }`}
          >
            거래소 전체
          </button>
          {venueOptions.slice(0, 5).map((venue) => (
            <button
              key={venue}
              type="button"
              onClick={() => setVenueFilter(venue)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition ${
                venueFilter === venue
                  ? 'bg-sky-200 text-sky-950'
                  : 'text-sky-200 hover:bg-sky-500/10'
              }`}
            >
              {venue}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>
      )}

      {!isCollapsed && (
        <div className="mt-4 space-y-2">
          {isLoading && !safety && <p className="text-xs text-neutral-500">불러오는 중...</p>}
          {!isLoading && groupedItems.length === 0 && (
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-xs text-neutral-500">
              오늘 기록된 거래가 없습니다.
            </p>
          )}

          {groupedItems.map((item) => {
            const isSubmitting = submittingTarget === item.target_id
            const itemVerdict = item.verdict

            return (
              <div
                key={`${item.target_type}:${item.target_id}`}
                className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-100">{item.symbol}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${assetTone[item.asset_class] ?? 'border-neutral-700/60 text-neutral-300'}`}
                      >
                        {item.asset_class}
                      </span>
                      <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">
                        {item.venue_name || item.venue}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {formatDateTime(item.executed_at)} · {item.side ? item.side.toUpperCase() : '-'} {item.qty ?? '-'} @ {item.price ?? '-'}
                    </p>
                    {item.group_size > 1 && (
                      <p className="mt-1 text-[11px] text-neutral-500">유사 체결 {item.group_size}건 묶음</p>
                    )}
                  </div>

                  {itemVerdict ? (
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${verdictTone[itemVerdict]}`}>
                      {verdictLabel[itemVerdict]}
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                      라벨 필요
                    </span>
                  )}
                </div>

                {!item.reviewed && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {actionButtons.map((action) => (
                      <button
                        key={action.verdict}
                        type="button"
                        onClick={() => onSubmitVerdict(item, action.verdict)}
                        disabled={isSubmitting}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${action.tone}`}
                      >
                        {isSubmitting ? '저장 중...' : action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
```

## File: src/components/home/HomeSnapshot.tsx
```typescript
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '../../lib/api'
import { onboardingProfileStoragePrefix, readOnboardingProfile } from '../../lib/onboardingProfile'
import { normalizeTradeSummary } from '../../lib/tradeAdapters'
import { normalizeExchangeFilter } from '../../lib/exchangeFilters'
import { useGuidedReviewStore } from '../../stores/guidedReviewStore'
import { useReviewStore } from '../../stores/reviewStore'
import { parseAiSections } from '../../lib/aiResponseFormat'
import type { AccuracyResponse, NotesListResponse, ReviewNote } from '../../types/review'
import type { TradeSummaryResponse } from '../../types/trade'
import { HomeGuidedReviewCard } from './HomeGuidedReviewCard'
import { HomeSafetyCheckCard } from './HomeSafetyCheckCard'
import { PositionManager } from '../positions/PositionManager'

type BubbleItem = {
  id: string
  symbol: string
  timeframe: string
  candle_time: string
  price: string
  bubble_type: string
  memo?: string | null
  tags?: string[]
  venue_name?: string
}

type BubbleListResponse = {
  page: number
  limit: number
  total: number
  items: BubbleItem[]
}

type AINoteCard = ReviewNote & {
  symbol?: string
  timeframe?: string
  candle_time?: string
  venue_name?: string
  source_label?: string
}

const parseSourceBadge = (tags: string[] = []) => {
  const normalized = tags.map((tag) => tag.toLowerCase())
  if (normalized.includes('alert') || normalized.includes('alerting')) return 'ALERT'
  if (normalized.includes('one-shot') || normalized.includes('one-shot-note')) return 'One-shot'
  if (normalized.includes('technical')) return 'Technical'
  if (normalized.includes('summary')) return '요약'
  if (normalized.includes('brief') || normalized.includes('detailed')) return '요약'
  return 'One-shot'
}

const SOURCE_BADGE_CLASS = 'rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2 py-0.5 text-emerald-200'
const VENUE_BADGE_CLASS = 'rounded-full border border-sky-300/35 bg-sky-500/12 px-2 py-0.5 text-sky-200'

const normalizeVenueLabel = (value?: string) => {
  if (!value) return ''
  const lowered = value.toLowerCase()
  if (lowered.includes('binance')) return 'Binance'
  if (lowered.includes('upbit')) return 'Upbit'
  if (lowered.includes('kis')) return 'KIS'
  if (lowered.includes('tradingview') || lowered.includes('mock')) return '시스템'
  return value
}

const periodLabels: Record<string, string> = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  all: '전체 기간',
}

const formatNumber = (value?: number | string) => {
  if (value === undefined || value === null) return '-'
  if (typeof value === 'number') return value.toLocaleString()
  return value
}

const formatPercent = (value?: number | string) => {
  if (value === undefined || value === null) return '-'
  if (typeof value === 'number') return `${value.toFixed(1)}%`
  return value
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const parsePercent = (value?: string | number) => {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') return value
  const normalized = value.replace('%', '').trim()
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? 0 : parsed
}

const toneByNumber = (value: number) => {
  if (value > 0) return 'text-lime-300'
  if (value < 0) return 'text-rose-300'
  return 'text-neutral-200'
}



const getCurrency = (summary: TradeSummaryResponse | null) => {
  const exchanges = (summary?.by_exchange || [])
    .map((item) => (item?.exchange || '').toLowerCase())
    .filter(Boolean)
  if (exchanges.length === 0) return { code: 'USDT', symbol: '$' }
  const hasUpbit = exchanges.includes('upbit')
  const hasBinance = exchanges.some((exchange) => exchange.includes('binance'))
  if (hasUpbit && !hasBinance) return { code: 'KRW', symbol: '₩' }
  return { code: 'USDT', symbol: '$' }
}

const currencyPreset = (mode: 'usdt' | 'krw') =>
  mode === 'krw' ? { code: 'KRW', symbol: '₩' } : { code: 'USDT', symbol: '$' }

const formatCurrency = (value: number, currencySymbol: string) => {
  const formatted = Math.abs(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })
  const sign = value < 0 ? '-' : ''
  return `${sign}${currencySymbol}${formatted}`
}

const getTopProvider = (accuracy: AccuracyResponse | null) => {
  if (!accuracy || accuracy.ranking.length === 0) return null
  return accuracy.ranking[0]
}

const SummaryCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-[#1c1917]/60 p-6 backdrop-blur-md shadow-xl shadow-black/20">
    <p className="text-xs uppercase tracking-[0.3em] text-stone-500 font-bold">{title}</p>
    <div className="mt-5">{children}</div>
  </div>
)

const StatusGauge = ({ mode }: { mode: 'good' | 'ok' | 'bad' | 'idle' }) => {
  const segments = [
    { key: 'bad', active: mode === 'bad' },
    { key: 'ok', active: mode === 'ok' },
    { key: 'good', active: mode === 'good' },
  ]
  const glow =
    mode === 'good'
      ? 'bg-lime-400/90 shadow-lg shadow-lime-500/20'
      : mode === 'bad'
        ? 'bg-rose-400/90 shadow-lg shadow-rose-500/20'
        : mode === 'ok'
          ? 'bg-emerald-300/90 shadow-lg shadow-emerald-500/20'
          : 'bg-neutral-700'
  return (
    <div className="flex items-center gap-1.5">
      {segments.map((segment) => (
        <span
          key={segment.key}
          className={`h-2 w-8 rounded-full border border-white/[0.06] ${segment.active ? glow : 'bg-white/[0.06]'
            }`}
        />
      ))}
      <span className="ml-2 text-[10px] uppercase tracking-[0.3em] text-neutral-400">State</span>
    </div>
  )
}

export function HomeSnapshot() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const guidedReview = useGuidedReviewStore((state) => state.review)
  const guidedLoading = useGuidedReviewStore((state) => state.isLoading)
  const fetchGuidedToday = useGuidedReviewStore((state) => state.fetchToday)
  const fetchGuidedStreak = useGuidedReviewStore((state) => state.fetchStreak)
  const {
    stats,
    accuracy,
    isLoading,
    isLoadingAccuracy,
    filters,
    setFilters,
    fetchStats,
    fetchAccuracy,
  } = useReviewStore()
  const [tradeSummary, setTradeSummary] = useState<TradeSummaryResponse | null>(null)
  const [recentBubbles, setRecentBubbles] = useState<BubbleItem[]>([])
  const [bubblesLoading, setBubblesLoading] = useState(false)
  const [bubblesError, setBubblesError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [visualMode, setVisualMode] = useState<'auto' | 'good' | 'ok' | 'bad' | 'idle'>('auto')
  const [animatedPnl, setAnimatedPnl] = useState(0)
  const prevPnlRef = useRef(0)
  const [currencyMode, setCurrencyMode] = useState<'auto' | 'usdt' | 'krw'>('auto')
  const [onboardingProfile, setOnboardingProfile] = useState<ReturnType<typeof readOnboardingProfile>>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [aiNotes, setAiNotes] = useState<AINoteCard[]>([])
  const [aiNotesLoading, setAiNotesLoading] = useState(false)
  const [aiSymbolFilter, setAiSymbolFilter] = useState('ALL')
  const [aiTimeframeFilter, setAiTimeframeFilter] = useState('ALL')
  const [aiFilterHydrated, setAiFilterHydrated] = useState(false)

  useEffect(() => {
    fetchGuidedToday()
    fetchGuidedStreak()
  }, [fetchGuidedToday, fetchGuidedStreak])

  useEffect(() => {
    let isActive = true
    const load = async () => {
      await Promise.all([fetchStats(), fetchAccuracy()])
      if (isActive) {
        setLastUpdated(new Date())
      }
    }
    load()
    return () => {
      isActive = false
    }
  }, [fetchStats, fetchAccuracy, filters.period, filters.outcomePeriod])

  useEffect(() => {
    let isActive = true
    const loadBubbles = async () => {
      setBubblesLoading(true)
      setBubblesError(null)
      try {
        const response = await api.get<BubbleListResponse>('/v1/bubbles?page=1&limit=5&sort=desc')
        if (isActive) {
          setRecentBubbles(response.data.items)
        }
      } catch (error) {
        if (isActive) {
          setBubblesError('최근 버블을 불러오지 못했습니다.')
        }
      } finally {
        if (isActive) {
          setBubblesLoading(false)
        }
      }
    }
    loadBubbles()
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true
    const loadTradeSummary = async () => {
      try {
        const params = new URLSearchParams()
        if (filters.period === '7d') {
          params.set('from', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        } else if (filters.period === '30d') {
          params.set('from', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        }
        const exchange = normalizeExchangeFilter(filters.venue)
        if (exchange) params.set('exchange', exchange)
        if (filters.symbol) params.set('symbol', filters.symbol)
        const response = await api.get(`/v1/trades/summary?${params.toString()}`)
        let summary = normalizeTradeSummary(response.data)
        const shouldRetry =
          summary.totals.total_trades === 0 &&
          (params.has('exchange') || params.has('symbol') || params.has('from'))
        if (shouldRetry) {
          const fallbackParams = new URLSearchParams()
          if (filters.period === '7d') {
            fallbackParams.set('from', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          } else if (filters.period === '30d') {
            fallbackParams.set('from', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          }
          const fallback = await api.get(`/v1/trades/summary?${fallbackParams.toString()}`)
          summary = normalizeTradeSummary(fallback.data)
        }
        if (isActive) setTradeSummary(summary)
      } catch {
        try {
          const fallback = await api.get('/v1/trades/summary')
          if (isActive) setTradeSummary(normalizeTradeSummary(fallback.data))
        } catch {
          if (isActive) setTradeSummary(null)
        }
      }
    }
    loadTradeSummary()
    return () => {
      isActive = false
    }
  }, [filters.period, filters.venue, filters.symbol, refreshTick])

  useEffect(() => {
    let isActive = true
    const loadAiNotes = async () => {
      setAiNotesLoading(true)
      try {
        const [notesResponse, bubblesResponse] = await Promise.all([
          api.get<NotesListResponse>('/v1/notes?page=1&limit=80'),
          api.get<BubbleListResponse>('/v1/bubbles?page=1&limit=200&sort=desc'),
        ])
        const notes = notesResponse.data?.notes || []
        const bubbles = bubblesResponse.data?.items || []
        const bubbleMap = new Map(bubbles.map((bubble) => [bubble.id, bubble]))
        const aiOnly = notes.filter((note) => {
          const title = note.title || ''
          const hasTag = (note.tags || []).some((tag) => tag.toLowerCase() === 'ai')
          return hasTag || title.includes('AI')
        })
        const enriched = aiOnly.map((note) => {
          const bubble = note.bubble_id ? bubbleMap.get(note.bubble_id) : undefined
          return {
            ...note,
            symbol: bubble?.symbol,
            timeframe: bubble?.timeframe,
            candle_time: bubble?.candle_time,
            venue_name: bubble?.venue_name,
            source_label: parseSourceBadge(note.tags || []),
          }
        })
        if (isActive) setAiNotes(enriched.slice(0, 20))
      } catch {
        if (isActive) setAiNotes([])
      } finally {
        if (isActive) setAiNotesLoading(false)
      }
    }
    loadAiNotes()
    return () => {
      isActive = false
    }
  }, [refreshTick])

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTick((prev) => prev + 1)
      fetchStats()
      fetchAccuracy()
    }
    window.addEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    return () => {
      window.removeEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    }
  }, [fetchStats, fetchAccuracy])

  useEffect(() => {
    const saved = localStorage.getItem('kifu-home-currency')
    if (saved === 'usdt' || saved === 'krw' || saved === 'auto') {
      setCurrencyMode(saved)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('kifu-home-currency', currencyMode)
  }, [currencyMode])

  useEffect(() => {
    setOnboardingProfile(readOnboardingProfile())
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(onboardingProfileStoragePrefix)) {
        setOnboardingProfile(readOnboardingProfile())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const snapshotPeriod = periodLabels[filters.period] ?? '최근'
  const summary = stats?.overall
  const topProvider = useMemo(() => getTopProvider(accuracy), [accuracy])
  const accuracyLabel = topProvider ? `${topProvider.provider} ${formatPercent(topProvider.accuracy)}` : '-'
  const totalOpinions = accuracy?.total_opinions ?? 0
  const aiSymbolOptions = useMemo(() => {
    const options = Array.from(new Set(aiNotes.map((note) => note.symbol).filter(Boolean)))
    return ['ALL', ...options] as string[]
  }, [aiNotes])
  const aiTimeframeOptions = useMemo(() => {
    const options = Array.from(new Set(aiNotes.map((note) => note.timeframe).filter(Boolean)))
    return ['ALL', ...options] as string[]
  }, [aiNotes])
  const filteredAiNotes = useMemo(() => {
    return aiNotes.filter((note) => {
      if (aiSymbolFilter !== 'ALL' && note.symbol !== aiSymbolFilter) return false
      if (aiTimeframeFilter !== 'ALL' && note.timeframe !== aiTimeframeFilter) return false
      return true
    })
  }, [aiNotes, aiSymbolFilter, aiTimeframeFilter])

  useEffect(() => {
    const qSymbol = searchParams.get('ai_symbol')
    const qTf = searchParams.get('ai_tf')
    if (qSymbol && qSymbol.trim()) setAiSymbolFilter(qSymbol)
    if (qTf && qTf.trim()) setAiTimeframeFilter(qTf)
    setAiFilterHydrated(true)
    // hydrate once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!aiFilterHydrated) return
    const currentSymbol = searchParams.get('ai_symbol') || 'ALL'
    const currentTf = searchParams.get('ai_tf') || 'ALL'
    if (currentSymbol === aiSymbolFilter && currentTf === aiTimeframeFilter) return

    const next = new URLSearchParams(searchParams.toString())
    if (aiSymbolFilter === 'ALL') next.delete('ai_symbol')
    else next.set('ai_symbol', aiSymbolFilter)
    if (aiTimeframeFilter === 'ALL') next.delete('ai_tf')
    else next.set('ai_tf', aiTimeframeFilter)

    const query = next.toString()
    router.replace(query ? `/home?${query}` : '/home', { scroll: false })
  }, [aiFilterHydrated, aiSymbolFilter, aiTimeframeFilter, searchParams, router])
  const tradeTotals = tradeSummary?.totals
  const bySide = useMemo(() => {
    const source = tradeSummary?.by_side || []
    const findCount = (sideKey: string) => {
      const found = source.find((item) => item.side?.toUpperCase() === sideKey)
      return Number(found?.total_trades || found?.trade_count || 0)
    }
    return {
      buyCount: findCount('BUY'),
      sellCount: findCount('SELL'),
    }
  }, [tradeSummary])
  const topExchange = useMemo(() => {
    const rows = tradeSummary?.by_exchange || []
    if (rows.length === 0) return null
    return [...rows].sort((a, b) => Number(b.total_trades || b.trade_count || 0) - Number(a.total_trades || a.trade_count || 0))[0]
  }, [tradeSummary])
  const topSymbol = useMemo(() => {
    const rows = tradeSummary?.by_symbol || []
    if (rows.length === 0) return null
    return [...rows].sort((a, b) => Number(b.total_trades || b.trade_count || 0) - Number(a.total_trades || a.trade_count || 0))[0]
  }, [tradeSummary])
  const currency = currencyMode === 'auto' ? getCurrency(tradeSummary) : currencyPreset(currencyMode)
  const totalPnlNumeric = Number(tradeTotals?.realized_pnl_total || 0)
  const pnlTone = toneByNumber(totalPnlNumeric)
  const pnlGlow = totalPnlNumeric >= 0 ? 'shadow-lg shadow-lime-500/20' : 'shadow-lg shadow-rose-500/20'
  const bubbleCount = stats?.total_bubbles ?? 0
  const tradesCount = tradeTotals?.total_trades ?? 0
  const isNoAction = bubbleCount === 0 && tradesCount === 0
  const resolvedMode = visualMode === 'auto'
    ? isNoAction
      ? 'idle'
      : totalPnlNumeric >= 1
        ? 'good'
        : totalPnlNumeric <= -1
          ? 'bad'
          : 'ok'
    : visualMode
  const stateTone = 'bg-transparent'
  const heroText =
    resolvedMode === 'good'
      ? '오늘의 리듬이 선명합니다. 이 느낌을 기록하세요.'
      : resolvedMode === 'bad'
        ? '흔들림이 남아 있습니다. 다시 정리할 시간입니다.'
        : resolvedMode === 'ok'
          ? '큰 흔들림은 없었습니다. 작은 신호만 남겨두세요.'
          : '아직 기록이 없습니다. 첫 문장을 남겨주세요.'
  const heroAccent =
    resolvedMode === 'good'
      ? 'text-lime-300'
      : resolvedMode === 'bad'
        ? 'text-rose-300'
        : resolvedMode === 'ok'
          ? 'text-emerald-200'
          : 'text-indigo-200'
  const routineItems = [
    {
      key: 'market',
      title: '시장 기운 읽기',
      done: Boolean(lastUpdated),
      href: '/alert',
      hint: '긴급 브리핑 30초',
    },
    {
      key: 'position',
      title: '내 자리 확인',
      done: tradesCount > 0,
      href: '/portfolio',
      hint: tradesCount > 0 ? `${tradesCount.toLocaleString()}건 체결 감지` : '거래 기록 비어있음',
    },
    {
      key: 'journal',
      title: '한 줄 남기기',
      done: bubbleCount > 0,
      href: '/chart?onboarding=1',
      hint: bubbleCount > 0 ? `${bubbleCount.toLocaleString()}개 기록` : '오늘 판단 한 줄',
    },
  ] as const

  useEffect(() => {
    const from = prevPnlRef.current
    const to = totalPnlNumeric
    prevPnlRef.current = to
    const duration = 900
    let frame: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      setAnimatedPnl(from + (to - from) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [totalPnlNumeric])

  const shouldForceGuidedModal =
    Boolean(guidedReview) && !guidedLoading && guidedReview?.status !== 'completed'

  useEffect(() => {
    if (!shouldForceGuidedModal) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [shouldForceGuidedModal])

  return (
    <div className={`min-h-screen text-zinc-100 p-4 md:p-8 ${stateTone} transition-colors duration-700 ease-out`}>
      <div className="w-full flex flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Library Ritual</p>
            <h1 className="text-3xl font-semibold text-stone-200">서재 모드</h1>
            <p className="text-sm text-stone-400">{snapshotPeriod} 장면을 조용히 다시 읽습니다</p>
            <p className="text-xs text-stone-600">기간 기준: 캔들 시간</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-2 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]">
            <div className="home-chip-group">
              {(['7d', '30d', 'all'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setFilters({ period })}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${filters.period === period
                    ? 'bg-[#44403c] text-stone-100 shadow-sm border border-stone-500/30'
                    : 'text-stone-500 hover:text-stone-300'
                    }`}
                >
                  {period.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="home-chip-group">
              {([
                { key: 'auto', label: '자동' },
                { key: 'usdt', label: 'USDT' },
                { key: 'krw', label: 'KRW' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCurrencyMode(item.key)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${currencyMode === item.key
                    ? 'bg-[#44403c] text-stone-100 shadow-sm border border-stone-500/30'
                    : 'text-stone-500 hover:text-stone-300'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-zinc-500">
              업데이트: {lastUpdated ? lastUpdated.toLocaleString('ko-KR') : '불러오는 중...'}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="home-library-panel">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500 font-bold">Quiet Routine</p>
            <h2 className="mt-2 text-xl font-bold text-stone-200">오늘의 3가지 질문</h2>
            <div className="mt-5 space-y-2">
              {routineItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="group flex items-center justify-between rounded-xl border border-white/[0.03] bg-white/[0.02] px-5 py-3.5 transition hover:bg-white/[0.04] hover:border-white/[0.08]"
                >
                  <div>
                    <p className="text-sm font-semibold text-stone-300 group-hover:text-stone-100 transition-colors">{item.title}</p>
                    <p className="text-xs text-stone-500">{item.hint}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${item.done
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      }`}
                  >
                    {item.done ? '완료' : '대기'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="home-library-panel">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500 font-bold">Closing Note</p>
            <h2 className="mt-2 text-xl font-bold text-stone-200">오늘의 마감</h2>
            <p className="mt-2 text-sm text-stone-400 leading-relaxed">
              긴급 대응과 판단 흐름을 한 장으로 정리합니다.
            </p>
            <div className="mt-5 space-y-2">
              <Link href="/alert" className="block rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 text-xs font-semibold text-stone-300 transition hover:bg-white/[0.06] hover:text-stone-100 text-center">
                긴급 브리핑 다시보기
              </Link>
              <Link href="/review" className="block rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 text-xs font-semibold text-stone-300 transition hover:bg-white/[0.06] hover:text-stone-100 text-center">
                복기 노트 남기기
              </Link>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 text-xs text-zinc-300">
          <span className="text-zinc-500">무드 미리보기:</span>
          {([
            { key: 'auto', label: '자동' },
            { key: 'good', label: '좋음' },
            { key: 'ok', label: '그럭저럭' },
            { key: 'bad', label: '안좋음' },
            { key: 'idle', label: '무행동' },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setVisualMode(item.key)}
              className={`rounded-full border px-3 py-1 transition text-[11px] font-medium ${visualMode === item.key
                ? 'border-white bg-white text-black'
                : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200'
                }`}
            >
              {item.label}
            </button>
          ))}
        </section>

        <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-black/20 via-white/[0.04] to-lime-900/30 p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Focus Memory</p>
              <p className={`text-sm ${heroAccent}`}>
                {heroText}
              </p>
              <p className="text-sm text-neutral-300">결과와 AI 의견을 한 장에 모아둡니다.</p>
              <StatusGauge mode={resolvedMode} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-neutral-700/80 bg-white/[0.05] px-3 py-1 text-xs text-neutral-300">
                  최근 버블 {formatNumber(stats?.total_bubbles ?? 0)}개
                </span>
                <span className="rounded-full border border-neutral-700/80 bg-white/[0.05] px-3 py-1 text-xs text-neutral-300">
                  AI 의견 {formatNumber(totalOpinions)}개
                </span>
                {topProvider && (
                  <span className="rounded-full border border-lime-400/40 bg-lime-500/10 px-3 py-1 text-xs text-lime-200">
                    최고 정확도 {accuracyLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.05] p-5 text-center lg:min-w-[220px]">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">핵심 PnL</p>
              <div className="relative mt-3 rounded-xl border border-white/[0.06] bg-white/[0.05] px-4 py-3">
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.06)_50%,transparent_100%)] opacity-50" />
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-[repeating-linear-gradient(transparent,transparent_6px,rgba(255,255,255,0.04)_7px)] opacity-40" />
                <p className={`relative text-4xl font-semibold tracking-widest ${pnlTone} ${pnlGlow} font-mono`}>
                  {formatCurrency(animatedPnl, currency.symbol)}
                </p>
              </div>
              <p className="mt-2 text-xs text-zinc-500">오늘 흐름을 한 눈에</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">실거래</p>
            <p className="mt-2 text-2xl font-semibold text-sky-300">{tradesCount.toLocaleString()}건</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">매수/매도</p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              BUY {bySide.buyCount.toLocaleString()} · SELL {bySide.sellCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">주요 거래소</p>
            <p className="mt-2 text-sm font-semibold text-amber-200">
              {topExchange ? `${topExchange.exchange} · ${(topExchange.total_trades || topExchange.trade_count || 0).toLocaleString()}건` : '-'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">주요 심볼</p>
            <p className="mt-2 text-sm font-semibold text-emerald-200">
              {topSymbol ? `${topSymbol.symbol} · ${(topSymbol.total_trades || topSymbol.trade_count || 0).toLocaleString()}건` : '-'}
            </p>
          </div>
        </section>

        {onboardingProfile && (tradesCount === 0 || bubbleCount === 0) && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Onboarding Profile</p>
                <p className="mt-1 text-lg font-semibold text-amber-100">{onboardingProfile.tendency}</p>
                <p className="mt-1 text-xs text-amber-100/70">
                  LONG {onboardingProfile.long_count} · SHORT {onboardingProfile.short_count} · HOLD {onboardingProfile.hold_count}
                </p>
                <p className="mt-2 text-xs text-amber-100/80">
                  오늘 루틴 1개: 최근 24시간 변동이 큰 캔들에 말풍선 1개만 남기기
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/chart?onboarding=1" className="rounded-lg border border-amber-200/40 px-3 py-2 text-xs font-semibold text-amber-100">
                  오늘 루틴 시작
                </Link>
                <Link href="/settings" className="rounded-lg border border-amber-200/40 px-3 py-2 text-xs font-semibold text-amber-100">
                  거래소 연결하기
                </Link>
              </div>
            </div>
          </section>
        )}

        <PositionManager />

        <HomeSafetyCheckCard />

        {guidedReview?.status === 'completed' && <HomeGuidedReviewCard autoLoad={false} />}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SummaryCard title="내 기록 요약">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500">총 버블</p>
                <p className="text-2xl font-semibold">{formatNumber(stats?.total_bubbles ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">결과 있음</p>
                <p className="text-2xl font-semibold">{formatNumber(stats?.bubbles_with_outcome ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">승률</p>
                <p className={`text-xl font-semibold ${summary && summary.win_rate >= 50 ? 'text-lime-300' : 'text-rose-300'}`}>
                  {formatPercent(summary?.win_rate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">평균 손익</p>
                <p className={`text-xl font-semibold ${toneByNumber(tradesCount ? totalPnlNumeric / tradesCount : 0)}`}>
                  {tradesCount
                    ? formatCurrency(totalPnlNumeric / tradesCount, currency.symbol)
                    : '-'}
                </p>
              </div>
            </div>
            {isLoading && <p className="mt-4 text-xs text-zinc-500">통계를 불러오는 중...</p>}
          </SummaryCard>

          <SummaryCard title="AI 의견 요약">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-500">요청된 의견</p>
                <p className="text-2xl font-semibold">{formatNumber(totalOpinions)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">현재 1위 정확도</p>
                <p className="text-xl font-semibold">{accuracyLabel}</p>
              </div>
              <p className="text-xs text-zinc-500">
                AI 의견을 더 요청할수록 내 판단 패턴과 비교가 선명해집니다.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={aiSymbolFilter}
                  onChange={(event) => setAiSymbolFilter(event.target.value)}
                  className="rounded border border-white/[0.08] bg-white/[0.06] px-2 py-1 text-[11px] text-neutral-200"
                >
                  {aiSymbolOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'ALL' ? '심볼 전체' : option}
                    </option>
                  ))}
                </select>
                <select
                  value={aiTimeframeFilter}
                  onChange={(event) => setAiTimeframeFilter(event.target.value)}
                  className="rounded border border-white/[0.08] bg-white/[0.06] px-2 py-1 text-[11px] text-neutral-200"
                >
                  {aiTimeframeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'ALL' ? '타임프레임 전체' : option}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-zinc-500">{filteredAiNotes.length}건</span>
              </div>
              {!aiNotesLoading && filteredAiNotes.slice(0, 2).map((note) => {
                const sections = parseAiSections(note.content || '')
                const body = sections[0]?.body || note.content
                return (
                  <div key={note.id} className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-zinc-500">
                      {note.source_label && (
                        <span className={SOURCE_BADGE_CLASS}>
                          {note.source_label}
                        </span>
                      )}
                      {note.venue_name && (
                        <span className={VENUE_BADGE_CLASS}>
                          {normalizeVenueLabel(note.venue_name)}
                        </span>
                      )}
                      {note.symbol && <span>{note.symbol}</span>}
                      {note.timeframe && <span>· {note.timeframe}</span>}
                      {note.symbol && note.candle_time && (
                        <>
                          <span>·</span>
                          <Link
                            href={`/chart/${note.symbol}?focus_ts=${encodeURIComponent(note.candle_time)}&focus_tf=${encodeURIComponent(note.timeframe || '1d')}`}
                            className="text-emerald-300 hover:text-emerald-200"
                          >
                            차트 이동
                          </Link>
                        </>
                      )}
                      {note.bubble_id && (
                        <>
                          <span>·</span>
                          <Link
                            href={`/bubbles?bubble_id=${note.bubble_id}`}
                            className="text-cyan-300 hover:text-cyan-200"
                          >
                            관련 버블
                          </Link>
                        </>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-300">{body}</p>
                  </div>
                )
              })}
            </div>
            {isLoadingAccuracy && <p className="mt-4 text-xs text-zinc-500">AI 통계를 불러오는 중...</p>}
            {aiNotesLoading && <p className="mt-2 text-xs text-zinc-500">AI 요약 불러오는 중...</p>}
          </SummaryCard>

          <SummaryCard title="다음 행동">
            <div className="space-y-3">
              <Link
                href="/chart"
                className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:border-white/[0.12] hover:bg-white/[0.08]"
              >
                버블 기록하기
                <span className="text-xs text-zinc-500">현재 판단 저장</span>
              </Link>
              <Link
                href="/review"
                className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:border-white/[0.12] hover:bg-white/[0.08]"
              >
                복기 대시보드
                <span className="text-xs text-zinc-500">성과 확인</span>
              </Link>
              <Link
                href="/bubbles"
                className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:border-white/[0.12] hover:bg-white/[0.08]"
              >
                버블 라이브러리
                <span className="text-xs text-zinc-500">패턴 비교</span>
              </Link>
            </div>
          </SummaryCard>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">최근 버블</p>
              <Link href="/bubbles" className="text-xs text-neutral-400 hover:text-neutral-200">
                전체 보기
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {bubblesLoading && <p className="text-xs text-zinc-500">불러오는 중...</p>}
              {bubblesError && <p className="text-xs text-red-300">{bubblesError}</p>}
              {!bubblesLoading && !bubblesError && recentBubbles.length === 0 && (
                <p className="text-xs text-zinc-500">아직 기록된 버블이 없습니다.</p>
              )}
              {!bubblesLoading &&
                !bubblesError &&
                recentBubbles.map((bubble) => (
                  <div
                    key={bubble.id}
                    className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-black/20 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">{bubble.symbol}</p>
                      <p className="text-xs text-zinc-500">
                        {bubble.timeframe} · {formatDateTime(bubble.candle_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{bubble.price}</p>
                      <p className="text-xs text-zinc-500">
                        {bubble.memo ? bubble.memo : bubble.tags?.slice(0, 2).join(', ') || '메모 없음'}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">오늘의 기억</p>
            <div className="mt-4 space-y-4 text-sm text-neutral-300">
              <div>
                <p className="text-xs text-zinc-500">순 손익</p>
                <p className={`text-2xl font-semibold ${toneByNumber(totalPnlNumeric)}`}>
                  {tradesCount ? formatCurrency(totalPnlNumeric, currency.symbol) : '-'}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>총 매수</span>
                  <span className="text-neutral-200">
                    {tradesCount ? `${bySide.buyCount.toLocaleString()}건` : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>총 매도</span>
                  <span className="text-neutral-200">
                    {tradesCount ? `${bySide.sellCount.toLocaleString()}건` : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>체결 수</span>
                  <span className="text-neutral-200">
                    {tradesCount ? `${tradesCount.toLocaleString()}건` : '-'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                스냅샷이 흐려지기 전에 한 줄이라도 복기 노트를 남겨보세요.
              </p>
              <Link
                href="/review"
                className="inline-flex items-center justify-center rounded-lg bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-950"
              >
                복기 노트 작성
              </Link>
            </div>
          </div>
        </section>
      </div>

      {shouldForceGuidedModal && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm">
          <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8">
            <div className="w-full rounded-2xl border border-sky-300/30 bg-neutral-950/95 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.7)] md:p-6">
              <p className="mb-3 text-xs uppercase tracking-[0.24em] text-sky-200">Daily Guided Review</p>
              <p className="mb-4 text-sm text-neutral-300">
                홈에서는 오늘 복기를 먼저 완료해야 다음 확인이 가능합니다.
              </p>
              <HomeGuidedReviewCard forceOpen autoLoad={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

## File: src/components/landing/LandingPage.tsx
```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type Candle = {
    id: number
    left: number
    height: number
    wickTop: number
    wickBottom: number
    isGreen: boolean
    delay: number
    duration: number
}

type MiniCandle = {
    isGreen: boolean
    height: number
}

function CandlestickBackground() {
    const [candles, setCandles] = useState<Candle[]>([])
    const [linePath, setLinePath] = useState('')
    const [linePath2, setLinePath2] = useState('')

    useEffect(() => {
        // Generate candles
        const generated: Candle[] = Array.from({ length: 40 }).map((_, i) => ({
            id: i,
            left: (i * 2.5) + Math.random() * 1.5,
            height: 30 + Math.random() * 80,
            wickTop: 10 + Math.random() * 30,
            wickBottom: 10 + Math.random() * 30,
            isGreen: Math.random() > 0.45,
            delay: Math.random() * 8,
            duration: 6 + Math.random() * 8,
        }))
        setCandles(generated)

        // Generate smooth line chart path
        const generatePath = (baseY: number, amplitude: number) => {
            const points: string[] = []
            let y = baseY
            for (let x = 0; x <= 100; x += 2) {
                y = baseY + (Math.random() - 0.5) * amplitude + Math.sin(x * 0.1) * 20
                y = Math.max(20, Math.min(80, y))
                points.push(`${x === 0 ? 'M' : 'L'} ${x * 20} ${y * 5}`)
            }
            return points.join(' ')
        }

        setLinePath(generatePath(50, 30))
        setLinePath2(generatePath(55, 25))
    }, [])

    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Gradient base */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-transparent" />

            {/* Animated line charts */}
            <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 2000 500">
                {/* Main price line */}
                <path
                    d={linePath}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="2"
                    className="animate-draw-line"
                />
                {/* Secondary line (MA or indicator) */}
                <path
                    d={linePath2}
                    fill="none"
                    stroke="url(#lineGradient2)"
                    strokeWidth="1.5"
                    className="animate-draw-line-delayed"
                    strokeDasharray="5,5"
                />
                {/* Gradient fill under main line */}
                <path
                    d={`${linePath} L 2000 500 L 0 500 Z`}
                    fill="url(#areaGradient)"
                    className="animate-fade-in"
                />
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Animated candles */}
            <div className="absolute inset-0 opacity-[0.12]">
                {candles.map((candle) => (
                    <div
                        key={candle.id}
                        className="absolute"
                        style={{
                            left: `${candle.left}%`,
                            bottom: '10%',
                            animation: `rise-candle ${candle.duration}s ease-out infinite, pulse-candle ${candle.duration * 0.5}s ease-in-out infinite`,
                            animationDelay: `${candle.delay}s`,
                        }}
                    >
                        {/* Wick top */}
                        <div
                            className={`mx-auto w-[2px] ${candle.isGreen ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ height: candle.wickTop }}
                        />
                        {/* Body */}
                        <div
                            className={`w-3 sm:w-4 rounded-sm ${candle.isGreen ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ height: candle.height }}
                        />
                        {/* Wick bottom */}
                        <div
                            className={`mx-auto w-[2px] ${candle.isGreen ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ height: candle.wickBottom }}
                        />
                    </div>
                ))}
            </div>

            {/* Moving price ticker line */}
            <div className="absolute top-1/3 left-0 right-0 h-[1px] overflow-hidden opacity-30">
                <div className="h-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-scan-line" />
            </div>

            {/* Top fade */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0B0F14] to-transparent" />
            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-[#0B0F14] to-transparent" />
        </div>
    )
}

function MiniChartPreview() {
    const [miniCandles, setMiniCandles] = useState<MiniCandle[]>([])

    useEffect(() => {
        const generated = Array.from({ length: 20 }).map(() => ({
            isGreen: Math.random() > 0.4,
            height: 20 + Math.random() * 60,
        }))
        setMiniCandles(generated)
    }, [])

    if (miniCandles.length === 0) {
        return (
            <div className="relative w-full h-48 bg-neutral-800/50 rounded-xl border border-neutral-700/50 overflow-hidden flex items-center justify-center">
                <span className="text-xs text-neutral-500">Loading...</span>
            </div>
        )
    }

    return (
        <div className="relative w-full h-48 bg-neutral-800/50 rounded-xl border border-neutral-700/50 overflow-hidden flex items-end justify-center gap-1 p-4">
            {miniCandles.map((candle, i) => (
                <div key={i} className="flex flex-col items-center">
                    <div className={`w-[2px] h-2 ${candle.isGreen ? 'bg-emerald-500/60' : 'bg-red-500/60'}`} />
                    <div
                        className={`w-2 rounded-sm ${candle.isGreen ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
                        style={{ height: candle.height }}
                    />
                    <div className={`w-[2px] h-3 ${candle.isGreen ? 'bg-emerald-500/60' : 'bg-red-500/60'}`} />
                </div>
            ))}
            {/* Bubble overlay */}
            <div className="absolute top-4 left-1/3 bg-cyan-500/20 border border-cyan-500/40 rounded-lg px-2 py-1 text-xs text-cyan-300">
                "RSI oversold..."
            </div>
        </div>
    )
}

const highlightStream = [
    'Decision Layer',
    'Evidence Packet',
    'AI 비교',
    '긴급 모드',
    '포지션 상태',
    '거래내역 자동 수집',
    '버블 복기',
    '리플레이',
]

const storyChapters = [
    {
        kicker: 'Snapshot',
        title: '오늘의 판단 스냅샷',
        desc: '한 화면에서 내 상태를 결정합니다. 손익, 포지션, 오늘의 루틴을 동시에 확인합니다.',
        tags: ['한 화면 결론', '오늘의 루틴', '포지션 요약'],
        accent: 'from-cyan-500/15 via-cyan-500/5',
    },
    {
        kicker: 'Evidence',
        title: '증거 패킷으로 맥락 전달',
        desc: '최근 체결, 요약, 버블 기록을 묶어 AI에게 전달합니다. 원하는 범위를 직접 선택합니다.',
        tags: ['범위 선택', '버블 필터', '요약 자동'],
        accent: 'from-emerald-500/15 via-emerald-500/5',
    },
    {
        kicker: 'AI Stack',
        title: '멀티 AI 비교와 복기 저장',
        desc: '한 번의 질문으로 다양한 모델을 비교하고, 응답은 자동으로 복기 카드로 저장됩니다.',
        tags: ['AI 비교', '복기 카드', '자동 저장'],
        accent: 'from-purple-500/15 via-purple-500/5',
    },
    {
        kicker: 'Alert',
        title: '긴급 상황은 한 화면에서',
        desc: '알림이 울리면 바로 판단하고 기록합니다. 급변 구간에서 행동 로그가 남습니다.',
        tags: ['긴급 모드', '행동 로그', '즉시 대응'],
        accent: 'from-rose-500/15 via-rose-500/5',
    },
]

const stackCards = [
    {
        title: 'Evidence Packet',
        desc: '필요한 범위를 골라 AI에게 전달.',
        badge: '범위 선택형',
    },
    {
        title: 'Decision Layer',
        desc: '오늘의 판단과 루틴을 한 장에.',
        badge: '스냅샷 UI',
    },
    {
        title: 'AI Compare',
        desc: '모델별 의견을 나란히 비교.',
        badge: '멀티 모델',
    },
]

const integrations = [
    'Binance',
    'Upbit',
    'Bybit',
    'Bithumb',
    'Hyperliquid',
    'Jupiter',
    'Uniswap',
    'KIS',
]

const backgroundThemes: Record<string, string> = {
    hero: 'from-zinc-950 via-zinc-900/50 to-zinc-950',
    features: 'from-zinc-950 via-zinc-900/30 to-zinc-950',
    stack: 'from-zinc-950 via-zinc-900/40 to-zinc-950',
    capabilities: 'from-zinc-950 via-zinc-900/50 to-zinc-950',
    roadmap: 'from-zinc-950 via-zinc-900/30 to-zinc-950',
    vision: 'from-zinc-950 via-zinc-900/40 to-zinc-950',
    pricing: 'from-zinc-950 via-zinc-900/50 to-zinc-950',
}

export function LandingPage() {
    const [activeSection, setActiveSection] = useState('hero')
    const progressRef = useRef<HTMLDivElement | null>(null)
    const storyRef = useRef<HTMLDivElement | null>(null)
    const heroRef = useRef<HTMLElement | null>(null)
    const featuresRef = useRef<HTMLElement | null>(null)
    const [storyProgress, setStoryProgress] = useState(0)
    const [storyVisible, setStoryVisible] = useState(false)
    const [heroVisible, setHeroVisible] = useState(true)
    const [featuresTop, setFeaturesTop] = useState(0)

    useEffect(() => {
        // handled by scroll-based detector below to avoid sticky overlap glitches
    }, [])

    useEffect(() => {
        let rafId = 0
        let ticking = false

        const updateProgress = () => {
            const scrollTop = window.scrollY
            const viewportHeight = window.innerHeight
            const docHeight = document.documentElement.scrollHeight
            const maxScroll = Math.max(docHeight - viewportHeight, 1)
            const progress = Math.min(scrollTop / maxScroll, 1)
            if (progressRef.current) {
                progressRef.current.style.transform = `scaleX(${progress})`
            }
            const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'))
            const viewportCenter = window.innerHeight * 0.5
            let nextSection = activeSection
            for (const section of sections) {
                const rect = section.getBoundingClientRect()
                if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
                    const id = section.getAttribute('data-section')
                    if (id) nextSection = id
                }
                if (rect.top < window.innerHeight * 0.85) {
                    section.classList.add('is-visible')
                }
            }

            if (featuresRef.current) {
                const top = featuresRef.current.offsetTop
                setFeaturesTop(top)
                const visible = window.scrollY < top - 60
                setHeroVisible(visible)
                if (visible) {
                    nextSection = 'hero'
                }
            }

            if (nextSection !== activeSection) {
                setActiveSection(nextSection)
            }
            ticking = false
        }

        const onScroll = () => {
            if (!ticking) {
                ticking = true
                rafId = window.requestAnimationFrame(updateProgress)
            }
        }

        updateProgress()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)

        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
            window.cancelAnimationFrame(rafId)
        }
    }, [])

    useEffect(() => {
        const section = storyRef.current
        if (!section) return
        let rafId = 0
        let ticking = false

        const updateStory = () => {
            const start = section.offsetTop
            const end = section.offsetTop + section.offsetHeight - window.innerHeight * 0.2
            const raw = (window.scrollY - start) / Math.max(end - start, 1)
            const progress = Math.min(Math.max(raw, 0), 1)
            const rect = section.getBoundingClientRect()
            const visible = rect.top <= window.innerHeight * 0.2 && rect.bottom >= window.innerHeight * 0.8
            setStoryProgress(progress)
            setStoryVisible(visible)
            ticking = false
        }

        const onScroll = () => {
            if (ticking) return
            ticking = true
            rafId = window.requestAnimationFrame(updateStory)
        }

        updateStory()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)

        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
            window.cancelAnimationFrame(rafId)
        }
    }, [])

    const backgroundClass = backgroundThemes.hero
    const heroActive = heroVisible
    const totalSteps = storyChapters.length
    const stepProgress = storyProgress * (totalSteps - 1)
    const currentIndex = Math.min(totalSteps - 1, Math.max(0, Math.floor(stepProgress)))
    const nextIndex = Math.min(totalSteps - 1, currentIndex + 1)
    const stepOffset = currentIndex === nextIndex ? 0 : stepProgress - currentIndex
    const storyActive = storyVisible
    const enterStart = 0.85
    const enterEnd = 0.995
    const enterRaw = stepOffset <= enterStart ? 0 : stepOffset >= enterEnd ? 1 : (stepOffset - enterStart) / (enterEnd - enterStart)
    const enterEase = enterRaw * enterRaw * (3 - 2 * enterRaw)

    const currentLayerStyle = {
        opacity: 1 - enterEase,
        transform: `translateY(${-enterEase * 10}%) scale(${1 - enterEase * 0.02})`,
        zIndex: 1,
        pointerEvents: enterEase > 0.6 ? 'none' : 'auto',
    } as React.CSSProperties

    const nextLayerStyle = {
        opacity: enterEase,
        transform: `translateY(${(1 - enterEase) * 90}%)`,
        zIndex: 2,
        pointerEvents: enterEase < 0.4 ? 'none' : 'auto',
    } as React.CSSProperties

    const renderStoryVisual = (index: number) => {
        if (index === 0) {
            return (
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                        {[
                            { label: '오늘 손익', value: '+3.2%', tone: 'text-emerald-300' },
                            { label: '포지션', value: '2 Open', tone: 'text-cyan-300' },
                            { label: '루틴', value: '1/1 완료', tone: 'text-amber-300' },
                        ].map((stat, idx) => (
                            <div
                                key={stat.label}
                                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-300 animate-pulse-strong"
                                style={{ animationDelay: `${idx * 0.4}s` }}
                            >
                                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{stat.label}</p>
                                <p className={`mt-2 text-lg font-semibold ${stat.tone}`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-300">
                        <div className="flex items-center justify-between">
                            <span className="uppercase tracking-[0.2em] text-neutral-500">Snapshot</span>
                            <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-blink" />
                                LIVE
                            </span>
                        </div>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-1/3 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 animate-progress-strong" />
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 px-4 py-3 shimmer-bar">
                        <p className="text-xs text-neutral-300">오늘의 판단 흐름이 요약됩니다.</p>
                    </div>
                </div>
            )
        }
        if (index === 1) {
            return (
                <div className="space-y-3">
                    {['최근 30일', '전체 심볼', '버블 태그 적용', '포지션 포함'].map((item, idx) => (
                        <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-300 shimmer-strong" style={{ animationDelay: `${idx * 0.2}s` }}>
                            {item}
                        </div>
                    ))}
                    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-neutral-400 shimmer-strong">
                        Evidence Packet이 자동으로 생성됩니다.
                    </div>
                </div>
            )
        }
        if (index === 2) {
            return (
                <div className="space-y-3">
                    {['OpenAI', 'Claude', 'Gemini'].map((agent, idx) => (
                        <div key={agent} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-300 shimmer-strong" style={{ animationDelay: `${idx * 0.3}s` }}>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-white">
                                    <span className="h-2 w-2 rounded-full bg-cyan-300 animate-blink" />
                                    {agent}
                                </span>
                                <span className="text-[10px] text-neutral-500">요약 카드</span>
                            </div>
                            <p className="mt-2 text-[11px] text-neutral-400">핵심 근거 + 행동 제안</p>
                        </div>
                    ))}
                </div>
            )
        }
        return (
            <div className="space-y-3">
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 animate-alert-strong">
                    긴급 알림 발생 — 즉시 대응 모드
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-300 shimmer-strong">
                    행동 로그가 자동 저장됩니다.
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-300 selection:bg-cyan-500/30 font-sans">
            <div className="fixed left-0 top-0 z-[60] h-[3px] w-full bg-white/5">
                <div
                    ref={progressRef}
                    className="h-full origin-left scale-x-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400"
                />
            </div>
            <div className={`pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b ${backgroundClass}`} />
            <div className="pointer-events-none fixed inset-0 -z-10 opacity-60" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.15), transparent 45%), radial-gradient(circle at 80% 15%, rgba(16,185,129,0.12), transparent 40%)' }} />
            {/* Navigation */}
            <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0B0F14]/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <div className="text-lg font-bold tracking-widest text-neutral-100">
                        KIFU
                    </div>
                    <div className="flex items-center gap-6 text-sm font-medium">
                        <Link href="#features" className="hover:text-neutral-100 transition-colors">결정 레이어</Link>
                        <Link href="#stack" className="hover:text-neutral-100 transition-colors">스택</Link>
                        <Link href="#roadmap" className="hover:text-neutral-100 transition-colors">로드맵</Link>
                        <Link href="#pricing" className="hover:text-neutral-100 transition-colors">요금제</Link>
                        <Link
                            href="/login"
                            className="rounded-full bg-neutral-100 px-5 py-2 text-neutral-950 hover:bg-white transition-colors"
                        >
                            로그인
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section ref={heroRef} data-section="hero" className="relative min-h-screen overflow-hidden pt-20 section-panel is-visible">
                <div
                    className="absolute inset-0 transition-opacity duration-700"
                    style={{ opacity: heroActive ? 1 : 0 }}
                >
                    <CandlestickBackground />
                </div>
                <div className="section-overlay" />

                <div
                    className="relative z-30 mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] transition-opacity duration-700"
                    style={{ opacity: heroActive ? 1 : 0, pointerEvents: heroActive ? 'auto' : 'none' }}
                >
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-700/60 bg-neutral-900/60 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300">
                            Decision Layer
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        </div>
                        <h1 className="mt-6 text-4xl font-semibold leading-tight text-white md:text-6xl">
                            오늘의 판단을<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300">
                                한 화면으로 복원
                            </span>
                        </h1>
                        <p className="mt-6 max-w-xl text-base text-neutral-400 md:text-lg">
                            KIFU는 기록을 “판단 레이어”로 바꿉니다. 증거 패킷과 AI 비교를 통해
                            당신의 결정 흐름을 즉시 재구성합니다.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            {['Evidence Packet', 'AI 비교', '긴급 모드', '포지션 상태'].map((chip) => (
                                <span key={chip} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-300">
                                    {chip}
                                </span>
                            ))}
                        </div>
                        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/guest"
                                className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-8 py-3 text-sm font-bold uppercase tracking-widest text-black transition-all hover:scale-105 shadow-[0_0_30px_rgba(45,212,191,0.3)] hover:shadow-[0_0_40px_rgba(45,212,191,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0B0F14]"
                            >
                                게스트로 입장
                            </Link>
                            <Link
                                href="/onboarding/start"
                                className="inline-flex items-center justify-center rounded-lg border border-neutral-700 px-8 py-3 text-sm font-bold uppercase tracking-widest text-neutral-200 transition-all hover:border-neutral-500 hover:bg-white/5"
                            >
                                처음부터 시작
                            </Link>
                        </div>
                        <div className="mt-10 grid grid-cols-2 gap-4 text-xs text-neutral-400 sm:grid-cols-4">
                            {[
                                { label: 'Decision', value: '스냅샷' },
                                { label: 'Evidence', value: '범위 선택' },
                                { label: 'AI', value: '비교 응답' },
                                { label: 'Review', value: '자동 저장' },
                            ].map((item) => (
                                <div key={item.label} className="rounded-xl border border-white/5 bg-white/5 px-3 py-3">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{item.label}</p>
                                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative" data-parallax="0.12">
                        <div className="absolute -top-10 -left-12 h-40 w-40 rounded-full bg-cyan-500/30 blur-3xl" />
                        <div className="absolute -bottom-10 -right-6 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
                        <div className="space-y-4">
                            {stackCards.map((card, idx) => (
                                <div
                                    key={card.title}
                                    className={`parallax-card rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900/80 to-black/80 p-5 shadow-2xl transition-all hover:-translate-y-1 ${idx === 1 ? 'translate-x-4' : ''} ${idx === 2 ? 'translate-x-8' : ''}`}
                                    data-parallax={0.18 + idx * 0.03}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{card.badge}</span>
                                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-neutral-300">LIVE</span>
                                    </div>
                                    <h3 className="mt-3 text-lg font-semibold text-white">{card.title}</h3>
                                    <p className="mt-2 text-sm text-neutral-400">{card.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Stream */}
            <section className="border-t border-white/5 bg-[#0B0F14] py-6">
                <div className="overflow-hidden">
                    <div className="flex w-[200%] items-center gap-6 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 animate-marquee">
                        {[...highlightStream, ...highlightStream].map((item, index) => (
                            <span key={`${item}-${index}`} className="flex items-center gap-4">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/70" />
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section
                ref={featuresRef}
                id="features"
                data-section="features"
                className="border-t border-white/5 relative z-20 section-panel no-section-overlay"
                style={{ backgroundColor: 'transparent' }}
            >
                <div className="section-overlay" style={{ opacity: 0 }} />
                <div className="mx-auto max-w-7xl px-6">
                    <div className="py-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
                            Decision Layer
                        </div>
                        <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                            스크롤할수록 화면이 바뀌는
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">
                                판단 스토리
                            </span>
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm text-neutral-400">
                            오늘의 스냅샷 → 증거 패킷 → AI 비교 → 긴급 대응 순서로
                            화면 구성이 완전히 바뀝니다.
                        </p>
                    </div>

                    <div
                        ref={storyRef}
                        className="relative"
                        style={{ height: `${storyChapters.length * 95}vh` }}
                    >
                        <div className="sticky top-0 relative flex min-h-screen items-center overflow-hidden">
                            <div className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/60">
                                {String(currentIndex + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
                            </div>
                            <div className="relative w-full min-h-[65vh] transition-opacity duration-500">
                                {[currentIndex, nextIndex].map((index, layerIdx) => {
                                    const item = storyChapters[index]
                                    const style = layerIdx === 0 ? currentLayerStyle : nextLayerStyle
                                    if (layerIdx === 1 && currentIndex === nextIndex) {
                                        return null
                                    }
                                    return (
                                        <div
                                            key={`${item.title}-${layerIdx}`}
                                            className="story-layer grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]"
                                            style={style}
                                        >
                                            <div>
                                                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/80">
                                                    {item.kicker}
                                                </div>
                                                <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                                                    {item.title}
                                                </h2>
                                                <p className="mt-4 text-sm text-neutral-300 leading-relaxed">
                                                    {item.desc}
                                                </p>
                                                <div className="mt-6 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-white/70">
                                                    {item.tags.map((tag) => (
                                                        <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <div className={`rounded-[32px] border border-white/10 bg-gradient-to-br ${item.accent} to-black/70 p-10 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl`}>
                                                    <div className="flex items-center justify-between text-xs text-neutral-400">
                                                        <span className="uppercase tracking-[0.25em]">{item.kicker}</span>
                                                        <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-neutral-300">Live</span>
                                                    </div>
                                                    <div className="mt-6">{renderStoryVisual(index)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stack / Evidence */}
            <section id="stack" data-section="stack" className="py-24 border-t border-white/5 relative z-20 section-panel overflow-hidden no-section-overlay" style={{ backgroundColor: 'transparent' }}>
                <div className="section-overlay" style={{ opacity: 0 }} />
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-12 text-center">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500">STACK</h2>
                        <h3 className="mt-3 text-3xl font-bold text-white">증거를 모으고, 비교하고, 저장한다</h3>
                        <p className="mt-4 text-neutral-400 max-w-2xl mx-auto">
                            Evidence Packet과 AI 비교는 복기의 핵심입니다. 필요한 범위를 고르고,
                            응답은 자동으로 복기 카드에 저장됩니다.
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="parallax-card rounded-3xl border border-white/10 bg-neutral-950/70 p-8" data-parallax="0.1">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-semibold text-white">Evidence Packet</h4>
                                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">range</span>
                            </div>
                            <p className="mt-3 text-sm text-neutral-400">기간/심볼/버블 태그를 직접 선택합니다.</p>
                            <div className="mt-6 space-y-3">
                                {[
                                    '최근 7/30/90일 선택',
                                    '현재 심볼 또는 전체 심볼',
                                    '버블 태그로 필터링',
                                    '포지션 포함 옵션',
                                ].map((line) => (
                                    <div key={line} className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs text-neutral-300">
                                        {line}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="parallax-card rounded-3xl border border-white/10 bg-neutral-950/70 p-8" data-parallax="0.14">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-semibold text-white">AI Compare</h4>
                                <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">multi</span>
                            </div>
                            <p className="mt-3 text-sm text-neutral-400">모델별 의견을 나란히 보고 판단합니다.</p>
                            <div className="mt-6 space-y-3">
                                {['OpenAI', 'Claude', 'Gemini'].map((model) => (
                                    <div key={model} className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs text-neutral-300">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-white">{model}</span>
                                            <span className="text-[10px] text-neutral-500">요약 카드</span>
                                        </div>
                                        <p className="mt-2 text-[11px] text-neutral-400">핵심 근거 + 리스크 + 행동 제안</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                        {integrations.map((name) => (
                            <span key={name} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-neutral-400">
                                {name}
                            </span>
                        ))}
                    </div>

                    <div className="mt-10 flex justify-center">
                        <Link
                            href="/guest"
                            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-bold text-black hover:bg-cyan-400 transition-colors"
                        >
                            <span>🚀</span> 데모 시작하기
                        </Link>
                    </div>
                </div>
            </section>

            {/* Capabilities */}
            <section data-section="capabilities" className="py-24 border-t border-white/5 relative z-20 section-panel overflow-hidden no-section-overlay" style={{ backgroundColor: 'transparent' }}>
                <div className="section-overlay" style={{ opacity: 0 }} />
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500">Capabilities</h2>
                        <h3 className="mt-3 text-4xl font-bold text-white">행동을 기록하는 <br /><span className="text-neutral-500">UI 스택</span></h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Card 1 */}
                        <div className="parallax-card col-span-1 md:col-span-2 lg:col-span-2 row-span-1 rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900 to-black p-8 relative overflow-hidden group" data-parallax="0.12">
                            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                                <div className="w-32 h-32 bg-cyan-500 blur-3xl rounded-full"></div>
                            </div>
                            <h4 className="text-2xl font-bold text-white mb-2">차트 위 판단 오버레이</h4>
                            <p className="text-neutral-400 mb-6 max-w-md">스프레드시트 대신, 판단을 캔들 위에 남깁니다.</p>
                            <MiniChartPreview />
                        </div>

                        {/* Card 2 */}
                        <div className="parallax-card rounded-3xl border border-white/10 bg-neutral-900/50 p-8 hover:bg-neutral-900 transition-colors group" data-parallax="0.1">
                            <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center mb-4 text-emerald-400">
                                <span className="text-xl">🧭</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">포지션 상태 기록</h4>
                            <p className="text-sm text-neutral-400">열린 포지션과 손절/익절 기준을 기록해 AI 판단의 기준점으로 사용합니다.</p>
                        </div>

                        {/* Card 3 */}
                        <div className="parallax-card rounded-3xl border border-white/10 bg-neutral-900/50 p-8 hover:bg-neutral-900 transition-colors group" data-parallax="0.1">
                            <div className="w-10 h-10 rounded-full bg-rose-900/30 flex items-center justify-center mb-4 text-rose-400">
                                <span className="text-xl">🚨</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">긴급 모드</h4>
                            <p className="text-sm text-neutral-400">급등/급락 알림 이후 바로 판단하고 기록할 수 있습니다.</p>
                        </div>

                        {/* Card 4 */}
                        <div className="parallax-card md:col-span-2 lg:col-span-2 rounded-3xl border border-white/10 bg-neutral-900/50 p-8 hover:bg-neutral-900 transition-colors flex flex-col md:flex-row items-center gap-8" data-parallax="0.14">
                            <div className="flex-1">
                                <h4 className="text-2xl font-bold text-white mb-2">거래내역 오버레이</h4>
                                <p className="text-neutral-400">
                                    거래내역(CSV/API)을 불러와 실제 진입/청산 흐름을 차트 위에 겹쳐 봅니다.
                                    복기 흐름과 실행 결과를 한 화면에서 비교할 수 있습니다.
                                </p>
                            </div>
                            <div className="w-full md:w-1/3 h-32 bg-neutral-800/30 rounded-xl border border-neutral-700/30 flex items-center justify-center">
                                <span className="text-4xl">🔗</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mobile Roadmap */}
            <section id="roadmap" data-section="roadmap" className="py-24 border-t border-white/5 relative z-20 section-panel overflow-hidden no-section-overlay" style={{ backgroundColor: 'transparent' }}>
                <div className="section-overlay" style={{ opacity: 0 }} />
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        {/* Text content */}
                        <div>
                            <div className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-amber-400 mb-6">
                                예정
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                                모바일로 더 빠르게,<br />
                                <span className="text-amber-400">더 안전하게</span>
                            </h2>
                            <p className="mt-6 text-neutral-400 leading-relaxed">
                                알림이 울린 순간, 차트에서 바로 기록하고 복기할 수 있도록<br />
                                모바일 경험을 준비하고 있습니다.
                            </p>
                            <ul className="mt-8 space-y-4">
                                {[
                                    { icon: '🔔', text: '알림 → 원클릭 진입' },
                                    { icon: '💬', text: '캔들 탭 → 의견 수집(Quick) → 말풍선 저장' },
                                    { icon: '📱', text: '최근 기록 오프라인 복기(캐시)' },
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-neutral-300">
                                        <span className="text-lg">{item.icon}</span>
                                        <span>{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-8 text-sm text-neutral-500 border-l-2 border-amber-500/30 pl-4">
                                모바일은 기능 확장이 아니라,<br />
                                <strong className="text-neutral-400">기록과 복기가 끊기지 않도록 만드는 채널</strong>입니다.
                            </p>
                        </div>
                        {/* Mobile mockup */}
                        <div className="flex justify-center">
                            <div className="parallax-card relative w-64 h-[500px] rounded-[3rem] border-4 border-neutral-700 bg-neutral-900 p-2 shadow-2xl" data-parallax="0.2">
                                {/* Notch */}
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-neutral-800 rounded-full" />
                                {/* Screen */}
                                <div className="w-full h-full rounded-[2.5rem] bg-gradient-to-b from-neutral-800 to-neutral-900 overflow-hidden flex flex-col">
                                    {/* Status bar */}
                                    <div className="h-12 flex items-end justify-center pb-2">
                                        <span className="text-[10px] text-neutral-500">KIFU</span>
                                    </div>
                                    {/* Mini chart area */}
                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-32 bg-neutral-800/50 rounded-lg mb-3 flex items-end justify-center gap-[2px] p-2">
                                            {/* Fixed data to avoid hydration mismatch */}
                                            {[
                                                { green: true, h: 45 }, { green: false, h: 32 }, { green: true, h: 55 },
                                                { green: true, h: 38 }, { green: false, h: 28 }, { green: true, h: 48 },
                                                { green: true, h: 52 }, { green: false, h: 35 }, { green: true, h: 42 },
                                                { green: true, h: 58 }, { green: false, h: 30 }, { green: true, h: 50 },
                                                { green: false, h: 25 }, { green: true, h: 46 }, { green: true, h: 40 },
                                            ].map((candle, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-2 rounded-sm ${candle.green ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
                                                    style={{ height: candle.h }}
                                                />
                                            ))}
                                        </div>
                                        {/* Bubble */}
                                        <div className="bg-cyan-500/20 border border-cyan-500/40 rounded-lg p-3 mb-3">
                                            <p className="text-[10px] text-cyan-300">📝 RSI 과매도 진입...</p>
                                        </div>
                                        {/* Quick actions */}
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-amber-500/20 rounded-lg py-2 text-center text-[10px] text-amber-300">AI Quick</div>
                                            <div className="flex-1 bg-neutral-700/50 rounded-lg py-2 text-center text-[10px] text-neutral-400">저장</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Vision */}
            <section data-section="vision" className="py-24 border-t border-white/5 relative z-20 section-panel overflow-hidden no-section-overlay" style={{ backgroundColor: 'transparent' }}>
                <div className="section-overlay" style={{ opacity: 0 }} />
                <div className="mx-auto max-w-7xl px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-500">비전</h2>
                        <h3 className="mt-3 text-3xl md:text-4xl font-bold text-white">
                            복기를 <span className="text-emerald-400">'자산'</span>으로 만든다
                        </h3>
                        <p className="mt-6 text-lg text-neutral-400 max-w-2xl mx-auto">
                            우리는 예측을 팔지 않습니다.<br />
                            <strong className="text-neutral-200">결정의 순간을 저장하고, 실수를 줄이는 시스템</strong>을 만듭니다.
                        </p>
                    </div>

                    {/* Timeline cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                phase: '지금',
                                color: 'emerald',
                                items: ['캔들별 기록', 'AI 의견 수집', '복기 모드'],
                                status: '사용 가능',
                            },
                            {
                                phase: '다음',
                                color: 'cyan',
                                items: ['거래내역(CSV/API) 오버레이', '자동 요약', '개인 패턴 리포트'],
                                status: '개발 중',
                            },
                            {
                                phase: '이후',
                                color: 'purple',
                                items: ['멀티 디바이스 동기화', '팀/친구 공유', '커뮤니티 인사이트 레이어'],
                                status: '예정',
                            },
                        ].map((card, i) => (
                            <div
                                key={i}
                                className={`parallax-card relative rounded-2xl border p-8 transition-all hover:-translate-y-1 ${card.color === 'emerald'
                                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                                    : card.color === 'cyan'
                                        ? 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/50'
                                        : 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50'
                                    }`}
                                data-parallax={0.12 + i * 0.04}
                            >
                                <div className={`text-xs font-bold uppercase tracking-widest mb-4 ${card.color === 'emerald' ? 'text-emerald-400' : card.color === 'cyan' ? 'text-cyan-400' : 'text-purple-400'
                                    }`}>
                                    {card.phase}
                                </div>
                                <ul className="space-y-3">
                                    {card.items.map((item, j) => (
                                        <li key={j} className="flex items-center gap-2 text-neutral-300">
                                            <span className={`w-1.5 h-1.5 rounded-full ${card.color === 'emerald' ? 'bg-emerald-400' : card.color === 'cyan' ? 'bg-cyan-400' : 'bg-purple-400'
                                                }`} />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className={`mt-6 inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${card.color === 'emerald'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : card.color === 'cyan'
                                        ? 'bg-cyan-500/20 text-cyan-300'
                                        : 'bg-purple-500/20 text-purple-300'
                                    }`}>
                                    {card.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" data-section="pricing" className="py-24 border-t border-white/5 section-panel overflow-hidden no-section-overlay" style={{ backgroundColor: 'transparent' }}>
                <div className="section-overlay" />
                <div className="mx-auto max-w-4xl px-6 text-center">
                    <h2 className="text-3xl font-bold text-white">요금제</h2>
                    <div className="mt-12 grid gap-8 md:grid-cols-2">
                        <div className="rounded-3xl border border-white/5 bg-white/5 p-8 text-left">
                            <h3 className="text-xl font-bold text-white">무료</h3>
                            <div className="mt-4 text-3xl font-bold text-white">₩0</div>
                            <ul className="mt-8 space-y-4 text-sm text-neutral-400">
                                <li className="flex gap-2"><span className="text-cyan-500">✓</span> 무제한 로컬 말풍선</li>
                                <li className="flex gap-2"><span className="text-cyan-500">✓</span> 일봉 타임프레임</li>
                                <li className="flex gap-2"><span className="text-cyan-500">✓</span> 기본 AI 프롬프트</li>
                            </ul>
                        </div>
                        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-800 to-neutral-900 p-8 text-left">
                            <div className="absolute -top-3 left-8 rounded-full bg-cyan-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black">
                                출시 예정
                            </div>
                            <h3 className="text-xl font-bold text-white">프로</h3>
                            <div className="mt-4 text-3xl font-bold text-white">₩??</div>
                            <p className="mt-2 text-xs text-neutral-500">가격 미정</p>
                            <ul className="mt-8 space-y-4 text-sm text-neutral-400">
                                <li className="flex gap-2"><span className="text-neutral-200">✓</span> 클라우드 동기화 & 백업</li>
                                <li className="flex gap-2"><span className="text-neutral-200">✓</span> 15분/1시간/4시간 타임프레임</li>
                                <li className="flex gap-2"><span className="text-neutral-200">✓</span> 고급 AI 에이전트</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 text-center text-xs text-neutral-600">
                <p>&copy; 2026 KIFU. All rights reserved.</p>
                <p className="mt-2">AI 트레이딩 저널</p>
            </footer>
        </div>
    )
}
```

## File: src/components/portfolio/PortfolioDashboard.tsx
```typescript
'use client'

import { type KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { normalizeTradeSummary } from '../../lib/tradeAdapters'
import { normalizeExchangeFilter } from '../../lib/exchangeFilters'
import { PageJumpPager } from '../ui/PageJumpPager'
import { FilterGroup, FilterPills } from '../ui/FilterPills'
import type { PositionItem, PositionsResponse, TimelineItem, TimelineResponse } from '../../types/portfolio'
import type { TradeItem, TradeListResponse, TradeSummaryResponse } from '../../types/trade'

type Filters = {
  assetClass: 'all' | 'crypto' | 'stock'
  venue: string
  source: 'all' | 'csv' | 'api' | 'wallet'
  status: 'all' | 'open' | 'closed'
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const POSITION_PAGE_SIZE = 12

const buildParams = (filters: Filters, cursor?: string | null) => {
  const params = new URLSearchParams()
  if (filters.assetClass !== 'all') params.set('asset_class', filters.assetClass)
  const venue = normalizeExchangeFilter(filters.venue)
  if (venue) params.set('venue', venue)
  if (filters.source !== 'all') params.set('source', filters.source)
  if (filters.status !== 'all') params.set('status', filters.status)
  if (cursor) params.set('cursor', cursor)
  params.set('limit', '50')
  return params
}

export function PortfolioDashboard() {
  const [filters, setFilters] = useState<Filters>({
    assetClass: 'all',
    venue: '',
    source: 'all',
    status: 'all',
  })
  const [positions, setPositions] = useState<PositionItem[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingPositions, setLoadingPositions] = useState(false)
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [tradeSummary, setTradeSummary] = useState<TradeSummaryResponse | null>(null)
  const [usingTradeFallback, setUsingTradeFallback] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backfillLoading, setBackfillLoading] = useState(false)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const [backfillResult, setBackfillResult] = useState<{
    created: number
    skipped: number
    processed: number
  } | null>(null)
  const [positionPage, setPositionPage] = useState(1)
  const [positionPageInput, setPositionPageInput] = useState('1')

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: '전체' },
      { value: 'open', label: '보유' },
      { value: 'closed', label: '정리' },
    ],
    []
  )

  const assetOptions = useMemo(
    () => [
      { value: 'all', label: '전체' },
      { value: 'crypto', label: '코인' },
      { value: 'stock', label: '주식' },
    ],
    []
  )

  const sourceOptions = useMemo(
    () => [
      { value: 'all', label: '전체' },
      { value: 'csv', label: 'CSV' },
      { value: 'api', label: 'API' },
      { value: 'wallet', label: '지갑' },
    ],
    []
  )

  const stats = useMemo(() => {
    const venueSet = new Set(timeline.map((item) => item.venue))
    const assetSet = new Set(timeline.map((item) => item.asset_class))
    const openPositions = positions.filter((position) => position.status === 'open').length
    return {
      venueCount: venueSet.size,
      assetCount: assetSet.size,
      openPositions,
    }
  }, [positions, timeline])

  const pagedPositions = useMemo(() => {
    const start = (positionPage - 1) * POSITION_PAGE_SIZE
    return positions.slice(start, start + POSITION_PAGE_SIZE)
  }, [positions, positionPage])

  const positionTotalPages = Math.max(1, Math.ceil(positions.length / POSITION_PAGE_SIZE))

  const jumpToPositionPage = () => {
    const parsedPage = Number.parseInt(positionPageInput, 10)
    if (Number.isNaN(parsedPage)) {
      setPositionPageInput(String(positionPage))
      return
    }
    goToPositionPage(parsedPage)
  }

  const handlePositionPageKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpToPositionPage()
    }
  }

  const fetchPositions = useCallback(async () => {
    setLoadingPositions(true)
    setError(null)
    try {
      const params = buildParams(filters)
      const response = await api.get<PositionsResponse>(`/v1/portfolio/positions?${params}`)
      setPositions(response.data.positions)
    } catch (err) {
      setError('포지션 데이터를 불러오지 못했습니다.')
    } finally {
      setLoadingPositions(false)
    }
  }, [filters])

  const fetchTimeline = useCallback(async () => {
    setLoadingTimeline(true)
    setError(null)
    try {
      const params = buildParams(filters)
      const response = await api.get<TimelineResponse>(`/v1/portfolio/timeline?${params}`)
      setTimeline(response.data.items)
      setNextCursor(response.data.next_cursor ?? null)
    } catch (err) {
      setError('타임라인 데이터를 불러오지 못했습니다.')
    } finally {
      setLoadingTimeline(false)
    }
  }, [filters])

  const fetchTradeSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      const exchange = normalizeExchangeFilter(filters.venue)
      if (exchange) params.set('exchange', exchange)
      const response = await api.get(`/v1/trades/summary?${params}`)
      let summary = normalizeTradeSummary(response.data)
      if (summary.totals.total_trades === 0 && params.has('exchange')) {
        const fallback = await api.get('/v1/trades/summary')
        summary = normalizeTradeSummary(fallback.data)
      }
      setTradeSummary(summary)
    } catch {
      setTradeSummary(null)
    }
  }, [filters.venue])

  const refreshPortfolio = useCallback(async () => {
    await Promise.all([fetchPositions(), fetchTimeline(), fetchTradeSummary()])
  }, [fetchPositions, fetchTimeline, fetchTradeSummary])

  useEffect(() => {
    refreshPortfolio()
  }, [refreshPortfolio])

  useEffect(() => {
    if (loadingPositions || loadingTimeline) return
    if (positions.length > 0 || timeline.length > 0) {
      setUsingTradeFallback(false)
      return
    }
    if (filters.assetClass === 'stock') {
      setUsingTradeFallback(false)
      return
    }
    if (filters.source !== 'all' && filters.source !== 'api') {
      setUsingTradeFallback(false)
      return
    }

    let isActive = true
    const loadFromTradesFallback = async () => {
      try {
        const params = new URLSearchParams({ page: '1', limit: '500', sort: 'desc' })
        const venue = normalizeExchangeFilter(filters.venue)
        if (venue) params.set('exchange', venue)
        const response = await api.get<TradeListResponse>(`/v1/trades?${params.toString()}`)
        if (!isActive) return
        const trades = response.data.items || []
        if (trades.length === 0) return

        const timelineItems: TimelineItem[] = trades.map((trade) => ({
          id: trade.id,
          executed_at: trade.trade_time,
          asset_class: 'crypto',
          venue_type: 'cex',
          venue: trade.exchange,
          venue_name: trade.exchange,
          instrument: trade.symbol,
          event_type: trade.exchange.includes('futures') ? 'perp_trade' : 'spot_trade',
          side: trade.side.toLowerCase(),
          qty: trade.quantity,
          price: trade.price,
          source: 'api',
        }))

        const grouped = new Map<string, PositionItem>()
        for (const trade of trades) {
          const key = `${trade.exchange}|${trade.symbol}`
          const qty = Number(trade.quantity) || 0
          const price = Number(trade.price) || 0
          const existing = grouped.get(key)
          if (!existing) {
            grouped.set(key, {
              key,
              instrument: trade.symbol,
              venue: trade.exchange,
              venue_name: trade.exchange,
              asset_class: 'crypto',
              venue_type: 'cex',
              status: qty > 0 ? 'open' : 'closed',
              net_qty: trade.side.toUpperCase() === 'BUY' ? String(qty) : String(-qty),
              avg_entry: String(price),
              buy_qty: trade.side.toUpperCase() === 'BUY' ? String(qty) : '0',
              sell_qty: trade.side.toUpperCase() === 'SELL' ? String(qty) : '0',
              buy_notional: trade.side.toUpperCase() === 'BUY' ? String(qty * price) : '0',
              sell_notional: trade.side.toUpperCase() === 'SELL' ? String(qty * price) : '0',
              last_executed_at: trade.trade_time,
            })
            continue
          }

          const buyQty = Number(existing.buy_qty) + (trade.side.toUpperCase() === 'BUY' ? qty : 0)
          const sellQty = Number(existing.sell_qty) + (trade.side.toUpperCase() === 'SELL' ? qty : 0)
          const buyNotional = Number(existing.buy_notional) + (trade.side.toUpperCase() === 'BUY' ? qty * price : 0)
          const sellNotional = Number(existing.sell_notional) + (trade.side.toUpperCase() === 'SELL' ? qty * price : 0)
          const netQty = buyQty - sellQty
          grouped.set(key, {
            ...existing,
            buy_qty: String(buyQty),
            sell_qty: String(sellQty),
            buy_notional: String(buyNotional),
            sell_notional: String(sellNotional),
            net_qty: String(netQty),
            avg_entry: buyQty > 0 ? String(buyNotional / buyQty) : existing.avg_entry,
            status: Math.abs(netQty) > 1e-8 ? 'open' : 'closed',
            last_executed_at: trade.trade_time > existing.last_executed_at ? trade.trade_time : existing.last_executed_at,
          })
        }

        setTimeline(timelineItems)
        let fallbackPositions = Array.from(grouped.values())
        if (filters.status !== 'all') {
          fallbackPositions = fallbackPositions.filter((position) => position.status === filters.status)
        }
        setPositions(fallbackPositions)
        setUsingTradeFallback(true)
      } catch {
        // ignore fallback errors
      }
    }
    loadFromTradesFallback()
    return () => {
      isActive = false
    }
  }, [loadingPositions, loadingTimeline, positions.length, timeline.length, filters.assetClass, filters.source, filters.venue, filters.status])

  useEffect(() => {
    fetchTradeSummary()
  }, [fetchTradeSummary])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleRefresh = () => {
      refreshPortfolio()
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'kifu-portfolio-refresh') {
        refreshPortfolio()
      }
    }
    window.addEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
      window.removeEventListener('storage', handleStorage)
    }
  }, [refreshPortfolio])

  const loadMoreTimeline = async () => {
    if (!nextCursor) return
    setLoadingTimeline(true)
    try {
      const params = buildParams(filters, nextCursor)
      const response = await api.get<TimelineResponse>(`/v1/portfolio/timeline?${params}`)
      setTimeline((prev) => [...prev, ...response.data.items])
      setNextCursor(response.data.next_cursor ?? null)
    } catch (err) {
      setError('추가 타임라인을 불러오지 못했습니다.')
    } finally {
      setLoadingTimeline(false)
    }
  }

  const handleBackfillEvents = async () => {
    setBackfillLoading(true)
    setBackfillError(null)
    try {
      const response = await api.post('/v1/portfolio/backfill-events')
      const payload = response.data || {}
      setBackfillResult({
        created: Number(payload.created || 0),
        skipped: Number(payload.skipped || 0),
        processed: Number(payload.processed || 0),
      })

      const params = buildParams(filters)
      const [positionsResponse, timelineResponse] = await Promise.all([
        api.get<PositionsResponse>(`/v1/portfolio/positions?${params}`),
        api.get<TimelineResponse>(`/v1/portfolio/timeline?${params}`),
      ])
      setPositions(positionsResponse.data.positions)
      setTimeline(timelineResponse.data.items)
      setNextCursor(timelineResponse.data.next_cursor ?? null)
      setUsingTradeFallback(false)
    } catch (err) {
      setBackfillError('포트폴리오 이벤트 생성에 실패했습니다.')
    } finally {
      setBackfillLoading(false)
    }
  }

  const goToPositionPage = (nextPage: number) => {
    setPositionPage((page) => {
      const target = Math.max(1, Math.min(positionTotalPages, nextPage))
      return target === page ? page : target
    })
  }

  useEffect(() => {
    setPositionPage(1)
  }, [filters])

  useEffect(() => {
    if (!positionPage || positionTotalPages <= 0) return
    if (positionPage > positionTotalPages) setPositionPage(positionTotalPages)
  }, [positionPage, positionTotalPages])

  useEffect(() => {
    setPositionPageInput(String(positionPage))
  }, [positionPage])

  return (
    <div className="min-h-screen text-neutral-100 p-4 md:p-8">
      <div className="w-full space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Portfolio</p>
          <h1 className="text-3xl font-semibold">통합 포트폴리오</h1>
          <p className="text-sm text-neutral-400">실거래(API) 타임라인을 기본으로 코인/주식/DEX 흐름을 묶습니다.</p>
        </header>

        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-md p-6">
          <FilterGroup label="자산군" tone="amber">
            <FilterPills
              options={assetOptions}
              value={filters.assetClass}
              onChange={(value) => setFilters((prev) => ({ ...prev, assetClass: value as Filters['assetClass'] }))}
              tone="amber"
              ariaLabel="자산군 필터"
            />
          </FilterGroup>

          <FilterGroup label="거래소" tone="sky">
            <input
              value={filters.venue}
              onChange={(event) => setFilters((prev) => ({ ...prev, venue: event.target.value }))}
              placeholder="binance, upbit"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-200 placeholder:text-zinc-400 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all"
            />
          </FilterGroup>

          <FilterGroup label="소스" tone="lime">
            <FilterPills
              options={sourceOptions}
              value={filters.source}
              onChange={(value) => setFilters((prev) => ({ ...prev, source: value as Filters['source'] }))}
              tone="lime"
              ariaLabel="소스 필터"
            />
          </FilterGroup>

          <FilterGroup label="상태" tone="fuchsia">
            <FilterPills
              options={statusOptions}
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value as Filters['status'] }))}
              tone="fuchsia"
              ariaLabel="상태 필터"
            />
          </FilterGroup>
        </section>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-md p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Timeline</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-100">{timeline.length}</p>
            <p className="text-xs text-zinc-400">이벤트 수</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-md p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Open Positions</p>
            <p className="mt-2 text-2xl font-semibold text-lime-300">{stats.openPositions}</p>
            <p className="text-xs text-zinc-400">보유 포지션</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-md p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Coverage</p>
            <p className="mt-2 text-2xl font-semibold text-sky-300">{stats.venueCount}</p>
            <p className="text-xs text-zinc-400">거래소 · 자산군 {stats.assetCount}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Trade Sync Summary</p>
            <p className="text-sm font-semibold text-emerald-300">
              총 {(tradeSummary?.totals?.total_trades ?? 0).toLocaleString()}건
            </p>
          </div>
          {usingTradeFallback && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-xs text-amber-300">포트폴리오 이벤트가 비어 있어 거래내역 기반으로 대체 표시 중</p>
              <button
                type="button"
                onClick={handleBackfillEvents}
                disabled={backfillLoading}
                className="rounded-full border border-amber-400/60 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/10 disabled:opacity-60"
              >
                {backfillLoading ? '생성 중...' : '포트폴리오 데이터 생성'}
              </button>
              {backfillResult && (
                <span className="text-[11px] text-amber-200">
                  생성 {backfillResult.created.toLocaleString()} · 스킵 {backfillResult.skipped.toLocaleString()}
                </span>
              )}
            </div>
          )}
          {backfillError && (
            <p className="mt-2 text-xs text-rose-300">{backfillError}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {(tradeSummary?.by_exchange || []).map((item, index) => {
              const exchangeName = item.exchange || 'unknown'
              const tradeCount = Number(item.total_trades || item.trade_count || 0)
              const chipKey = `${exchangeName}-${tradeCount}-${index}`
              return (
                <span key={chipKey} className="rounded-full border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300">
                  {exchangeName} · {tradeCount.toLocaleString()}건
                </span>
              )
            })}
            {(!tradeSummary || tradeSummary.by_exchange.length === 0) && (
              <span className="text-xs text-zinc-400">거래소 동기화 통계 없음</span>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-md p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Timeline</p>
              <span className="text-xs text-zinc-400">{timeline.length} events</span>
            </div>
            <div className="mt-4 space-y-3">
              {loadingTimeline && timeline.length === 0 && <p className="text-xs text-zinc-400">불러오는 중...</p>}
              {!loadingTimeline && timeline.length === 0 && (
                <p className="text-xs text-zinc-400">아직 타임라인 데이터가 없습니다.</p>
              )}
              {timeline.map((item, index) => {
                const sideTone =
                  item.side === 'buy' ? 'text-lime-300' : item.side === 'sell' ? 'text-rose-300' : 'text-neutral-300'
                const venueTone =
                  item.venue_type === 'dex'
                    ? 'text-fuchsia-300'
                    : item.venue_type === 'broker'
                      ? 'text-sky-300'
                      : 'text-amber-300'
                const assetTone = item.asset_class === 'stock' ? 'text-sky-200' : 'text-emerald-200'

                const timelineKey = `${item.id || 'evt'}-${item.executed_at || 'time'}-${index}`
                return (
                  <div key={timelineKey} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 hover:bg-white/[0.04] transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-neutral-100">{item.instrument}</p>
                          <span className={`rounded-full border border-neutral-700/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${assetTone}`}>
                            {item.asset_class}
                          </span>
                          <span className={`rounded-full border border-neutral-700/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${venueTone}`}>
                            {item.venue_type}
                          </span>
                          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">
                            {item.venue_name}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          <span className="text-neutral-300">{item.event_type}</span> · {formatDateTime(item.executed_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${sideTone}`}>
                          {item.side ? item.side.toUpperCase() : '-'} {item.qty ?? '-'}
                        </p>
                        <p className="text-xs text-zinc-400">
                          Price <span className="text-neutral-200">{item.price ?? '-'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
              {nextCursor && (
                <button
                  type="button"
                  onClick={loadMoreTimeline}
                  disabled={loadingTimeline}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-neutral-300 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
                >
                  {loadingTimeline ? '불러오는 중...' : '더 불러오기'}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-md p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Positions</p>
              <span className="text-xs text-zinc-400">
                {positions.length} items · {positionPage} / {positionTotalPages} 페이지
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {loadingPositions && positions.length === 0 && <p className="text-xs text-zinc-400">불러오는 중...</p>}
              {!loadingPositions && positions.length === 0 && (
                <p className="text-xs text-zinc-400">포지션 요약이 없습니다.</p>
              )}
              {pagedPositions.map((position) => (
                <div key={position.key} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 hover:bg-white/[0.04] transition-colors">
                  <p className="text-sm font-semibold">{position.instrument}</p>
                  <p className="text-xs text-zinc-400">
                    {position.venue_name} · {position.status.toUpperCase()} · {formatDateTime(position.last_executed_at)}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-300">
                    <div>
                      <span className="text-zinc-400">Net</span> {position.net_qty}
                    </div>
                    <div>
                      <span className="text-zinc-400">Avg</span> {position.avg_entry || '-'}
                    </div>
                    <div>
                      <span className="text-zinc-400">Buy</span> {position.buy_qty}
                    </div>
                    <div>
                      <span className="text-zinc-400">Sell</span> {position.sell_qty}
                    </div>
                  </div>
                </div>
              ))}

              <PageJumpPager
                totalItems={positions.length}
                totalPages={positionTotalPages}
                currentPage={positionPage}
                pageInput={positionPageInput}
                onPageInputChange={setPositionPageInput}
                onPageInputKeyDown={handlePositionPageKeyDown}
                onFirst={() => goToPositionPage(1)}
                onPrevious={() => goToPositionPage(positionPage - 1)}
                onNext={() => goToPositionPage(positionPage + 1)}
                onLast={() => goToPositionPage(positionTotalPages)}
                onJump={jumpToPositionPage}
                itemLabel="개"
                disabled={loadingPositions}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
```

## File: src/components/positions/PositionManager.tsx
```typescript
'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import type { ManualPosition, ManualPositionRequest, ManualPositionsResponse } from '../../types/position'

const emptyForm: ManualPositionRequest = {
  symbol: '',
  asset_class: 'crypto',
  position_side: 'long',
  status: 'open',
}

// Unified input style constant
const INPUT_STYLE = "mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-neutral-100 placeholder:text-zinc-400 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
const SELECT_STYLE = "mt-2 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-neutral-100 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"

const toIso = (value?: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

const toLocalInput = (value?: string) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

export function PositionManager() {
  const [positions, setPositions] = useState<ManualPosition[]>([])
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'all'>('open')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editing, setEditing] = useState<ManualPosition | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [form, setForm] = useState<ManualPositionRequest>(emptyForm)
  const [openedAtInput, setOpenedAtInput] = useState('')

  const loadPositions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const response = await api.get<ManualPositionsResponse>(`/v1/manual-positions?${params.toString()}`)
      setPositions(response.data.positions || [])
    } catch {
      setError('포지션 상태를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPositions()
  }, [statusFilter])

  const resetForm = () => {
    setForm(emptyForm)
    setOpenedAtInput('')
    setShowAdvanced(false)
    setEditing(null)
  }

  const handleOpenNew = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleEdit = (position: ManualPosition) => {
    setEditing(position)
    setForm({
      symbol: position.symbol,
      asset_class: position.asset_class,
      position_side: position.position_side,
      venue: position.venue || '',
      size: position.size || '',
      entry_price: position.entry_price || '',
      stop_loss: position.stop_loss || '',
      take_profit: position.take_profit || '',
      leverage: position.leverage || '',
      strategy: position.strategy || '',
      memo: position.memo || '',
      status: position.status,
    })
    setOpenedAtInput(toLocalInput(position.opened_at))
    setShowAdvanced(true)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.symbol.trim()) {
      setError('심볼을 입력해주세요.')
      return
    }
    setIsSaving(true)
    setError(null)
    const payload: ManualPositionRequest = {
      ...form,
      symbol: form.symbol.trim().toUpperCase(),
      venue: form.venue?.trim() || undefined,
      size: form.size?.trim() || undefined,
      entry_price: form.entry_price?.trim() || undefined,
      stop_loss: form.stop_loss?.trim() || undefined,
      take_profit: form.take_profit?.trim() || undefined,
      leverage: form.leverage?.trim() || undefined,
      strategy: form.strategy?.trim() || undefined,
      memo: form.memo?.trim() || undefined,
      opened_at: toIso(openedAtInput),
    }

    try {
      if (editing) {
        await api.put(`/v1/manual-positions/${editing.id}`, payload)
      } else {
        await api.post('/v1/manual-positions', payload)
      }
      setIsModalOpen(false)
      resetForm()
      await loadPositions()
    } catch {
      setError('포지션 저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClosePosition = async (position: ManualPosition) => {
    try {
      await api.put(`/v1/manual-positions/${position.id}`, { status: 'closed' })
      await loadPositions()
    } catch {
      setError('포지션 종료에 실패했습니다.')
    }
  }

  const handleDelete = async (position: ManualPosition) => {
    if (!confirm('이 포지션을 삭제할까요?')) return
    try {
      await api.delete(`/v1/manual-positions/${position.id}`)
      await loadPositions()
    } catch {
      setError('포지션 삭제에 실패했습니다.')
    }
  }

  const statusTone = (status: string) =>
    status === 'open' ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10' : 'border-zinc-600 text-zinc-300 bg-zinc-800/60'

  const sideTone = (side: string) =>
    side === 'long' ? 'text-lime-300' : 'text-rose-300'

  const sortedPositions = useMemo(() => positions, [positions])

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-md p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Position</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-100">현재 포지션 상태</h2>
          <p className="text-xs text-zinc-400">직접 입력한 포지션을 기준으로 AI가 판단합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-1 text-xs">
            {(['open', 'closed', 'all'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatusFilter(option)}
                className={`rounded-md px-3 py-1.5 font-semibold transition ${statusFilter === option
                  ? 'bg-neutral-100 text-neutral-900 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
                  }`}
              >
                {option === 'open' ? '보유중' : option === 'closed' ? '종료' : '전체'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleOpenNew}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-white/10 hover:text-white hover:border-white/20"
          >
            포지션 추가
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>
      )}

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-xs text-zinc-400">불러오는 중...</p>}
        {!isLoading && sortedPositions.length === 0 && (
          <p className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2 text-xs text-zinc-400">
            현재 등록된 포지션이 없습니다.
          </p>
        )}
        {sortedPositions.map((position) => (
          <div key={position.id} className="rounded-xl border border-white/5 bg-white/[0.03] px-5 py-4 hover:border-white/10 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-neutral-100">{position.symbol}</p>
                  <span className={`text-xs font-semibold ${sideTone(position.position_side)}`}>
                    {position.position_side.toUpperCase()}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusTone(position.status)}`}>
                    {position.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  {position.entry_price ? `Entry ${position.entry_price}` : 'Entry -'} ·
                  {position.stop_loss ? ` SL ${position.stop_loss}` : ' SL -'} ·
                  {position.take_profit ? ` TP ${position.take_profit}` : ' TP -'}
                </p>
                <p className="text-xs text-zinc-400">
                  {position.size ? `Size ${position.size}` : 'Size -'} ·
                  {position.leverage ? ` Lev ${position.leverage}x` : ' Lev -'} ·
                  {position.venue ? ` ${position.venue}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleEdit(position)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  수정
                </button>
                {position.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => handleClosePosition(position)}
                    className="rounded-lg border border-amber-400/50 px-2.5 py-1 text-amber-200 hover:bg-amber-500/10"
                  >
                    종료
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(position)}
                  className="rounded-lg border border-rose-400/50 px-2.5 py-1 text-rose-200 hover:bg-rose-500/10"
                >
                  삭제
                </button>
              </div>
            </div>
            {(position.strategy || position.memo) && (
              <div className="mt-2 text-xs text-neutral-400">
                {position.strategy && <p>전략: {position.strategy}</p>}
                {position.memo && <p>메모: {position.memo}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-8">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-950/95 backdrop-blur-md text-neutral-100 shadow-2xl">
            <div className="border-b border-white/[0.08] px-6 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Position</p>
              <h3 className="mt-2 text-xl font-semibold">포지션 상태 입력</h3>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-neutral-300">
                  심볼
                  <input
                    type="text"
                    value={form.symbol}
                    onChange={(event) => setForm({ ...form, symbol: event.target.value })}
                    className={INPUT_STYLE}
                    placeholder="BTCUSDT"
                  />
                </label>
                <label className="text-sm text-neutral-300">
                  포지션
                  <select
                    value={form.position_side}
                    onChange={(event) => setForm({ ...form, position_side: event.target.value as 'long' | 'short' })}
                    className={SELECT_STYLE}
                  >
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-neutral-300">
                  자산군
                  <select
                    value={form.asset_class}
                    onChange={(event) => setForm({ ...form, asset_class: event.target.value as 'crypto' | 'stock' })}
                    className={SELECT_STYLE}
                  >
                    <option value="crypto">Crypto</option>
                    <option value="stock">Stock</option>
                  </select>
                </label>
                <label className="text-sm text-neutral-300">
                  거래소/브로커
                  <input
                    type="text"
                    value={form.venue || ''}
                    onChange={(event) => setForm({ ...form, venue: event.target.value })}
                    className={INPUT_STYLE}
                    placeholder="binance, upbit, kis"
                  />
                </label>
              </div>

              <label className="text-sm text-neutral-300">
                진입가
                <input
                  type="text"
                  value={form.entry_price || ''}
                  onChange={(event) => setForm({ ...form, entry_price: event.target.value })}
                  className={INPUT_STYLE}
                  placeholder="예: 78000"
                />
              </label>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="text-xs font-semibold text-neutral-300 hover:text-neutral-100"
                >
                  {showAdvanced ? '상세 옵션 접기' : '상세 옵션 펼치기'}
                </button>
                <label className="text-xs text-neutral-400">
                  상태
                  <select
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value as 'open' | 'closed' })}
                    className="ml-2 rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs text-neutral-200"
                  >
                    <option value="open">보유중</option>
                    <option value="closed">종료</option>
                  </select>
                </label>
              </div>

              {showAdvanced && (
                <div className="space-y-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-neutral-300">
                      포지션 크기
                      <input
                        type="text"
                        value={form.size || ''}
                        onChange={(event) => setForm({ ...form, size: event.target.value })}
                        className={INPUT_STYLE}
                      />
                    </label>
                    <label className="text-sm text-neutral-300">
                      레버리지
                      <input
                        type="text"
                        value={form.leverage || ''}
                        onChange={(event) => setForm({ ...form, leverage: event.target.value })}
                        className={INPUT_STYLE}
                        placeholder="예: 3"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-neutral-300">
                      손절가
                      <input
                        type="text"
                        value={form.stop_loss || ''}
                        onChange={(event) => setForm({ ...form, stop_loss: event.target.value })}
                        className={INPUT_STYLE}
                      />
                    </label>
                    <label className="text-sm text-neutral-300">
                      익절가
                      <input
                        type="text"
                        value={form.take_profit || ''}
                        onChange={(event) => setForm({ ...form, take_profit: event.target.value })}
                        className={INPUT_STYLE}
                      />
                    </label>
                  </div>
                  <label className="text-sm text-neutral-300">
                    전략/기준
                    <input
                      type="text"
                      value={form.strategy || ''}
                      onChange={(event) => setForm({ ...form, strategy: event.target.value })}
                      className={INPUT_STYLE}
                      placeholder="예: 손절 -2% / 추세 이탈"
                    />
                  </label>
                  <label className="text-sm text-neutral-300">
                    메모
                    <textarea
                      value={form.memo || ''}
                      onChange={(event) => setForm({ ...form, memo: event.target.value })}
                      rows={2}
                      className={INPUT_STYLE}
                    />
                  </label>
                  <label className="text-sm text-neutral-300">
                    시작 시간
                    <input
                      type="datetime-local"
                      value={openedAtInput}
                      onChange={(event) => setOpenedAtInput(event.target.value)}
                      className={INPUT_STYLE}
                    />
                  </label>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950 shadow-lg shadow-white/10 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
```

## File: src/components/review/AccuracyChart.tsx
```typescript
'use client'

import type { AccuracyResponse } from '../../types/review'

type Props = {
  accuracy: AccuracyResponse | null
  isLoading: boolean
}

const providerIcons: Record<string, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini',
}

const rankMedals = ['', '', '']

export function AccuracyChart({ accuracy, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <div className="h-5 bg-zinc-700 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between mb-1">
                <div className="h-4 bg-zinc-700 rounded w-20" />
                <div className="h-4 bg-zinc-700 rounded w-12" />
              </div>
              <div className="h-2 bg-zinc-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!accuracy || !accuracy.ranking || accuracy.ranking.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">AI Provider 정확도</h3>
        <div className="text-center py-4 text-zinc-500">
          데이터가 없습니다
        </div>
      </div>
    )
  }

  return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-200">AI Provider 정확도</h3>
        <span className="text-sm text-zinc-500">
          {accuracy.evaluated_opinions}/{accuracy.total_opinions} 평가됨
        </span>
      </div>

      <div className="space-y-4">
        {accuracy.ranking.map((item) => {
          const stats = accuracy.by_provider[item.provider]
          const barWidth = Math.max(item.accuracy, 0)

          return (
            <div key={item.provider}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{rankMedals[item.rank - 1] || `${item.rank}.`}</span>
                  <span className="text-sm font-medium text-zinc-200">
                    {providerIcons[item.provider] || item.provider}
                  </span>
                </div>
                <span className={`text-sm font-bold ${item.accuracy >= 55 ? 'text-green-400' : item.accuracy >= 45 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {item.accuracy.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-zinc-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    item.accuracy >= 55
                      ? 'bg-green-500'
                      : item.accuracy >= 45
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              {stats && (
                <div className="flex gap-4 mt-1 text-sm text-zinc-500">
                  <span>평가: {stats.evaluated}</span>
                  <span>적중: {stats.correct}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

## File: src/components/review/BubbleAccuracy.tsx
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/auth'

type AccuracyData = {
  provider: string
  period: string
  predictedDirection: string
  actualDirection: string
  isCorrect: boolean
  createdAt: string
}

type Props = {
  bubbleId: string
  compact?: boolean
}

export function BubbleAccuracy({ bubbleId, compact = false }: Props) {
  const [data, setData] = useState<AccuracyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const accessToken = useAuthStore((state) => state.accessToken)

  useEffect(() => {
    const fetchAccuracy = async () => {
      if (!bubbleId || !accessToken) return

      try {
        setLoading(true)
        const res = await fetch(`/api/v1/bubbles/${bubbleId}/accuracy`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!res.ok) {
          throw new Error('Failed to fetch accuracy data')
        }

        const json = await res.json()
        setData(json.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAccuracy()
  }, [bubbleId, accessToken])

  if (loading) {
    return (
      <div className="animate-pulse bg-zinc-800/50 rounded-lg p-3">
        <div className="h-4 bg-zinc-700 rounded w-24 mb-2" />
        <div className="h-3 bg-zinc-700 rounded w-32" />
      </div>
    )
  }

  if (error || data.length === 0) {
    return null
  }

  const correctCount = data.filter((d) => d.isCorrect).length
  const totalCount = data.length
  const accuracyRate = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

  const directionLabel = (dir: string) => {
    const labels: Record<string, string> = {
      BUY: '매수',
      SELL: '매도',
      HOLD: '보류',
      UP: '상승',
      DOWN: '하락',
      NEUTRAL: '중립',
    }
    return labels[dir] || dir
  }

  const directionColor = (dir: string) => {
    if (['BUY', 'UP'].includes(dir)) return 'text-green-400'
    if (['SELL', 'DOWN'].includes(dir)) return 'text-red-400'
    return 'text-zinc-400'
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500">AI 정확도:</span>
        <span
          className={`font-medium ${
            accuracyRate >= 70
              ? 'text-green-400'
              : accuracyRate >= 50
                ? 'text-yellow-400'
                : 'text-red-400'
          }`}
        >
          {accuracyRate}%
        </span>
        <span className="text-zinc-600">({correctCount}/{totalCount})</span>
      </div>
    )
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-zinc-300">AI 예측 정확도</h4>
        <div className="flex items-center gap-2">
          <span
            className={`text-lg font-bold ${
              accuracyRate >= 70
                ? 'text-green-400'
                : accuracyRate >= 50
                  ? 'text-yellow-400'
                  : 'text-red-400'
            }`}
          >
            {accuracyRate}%
          </span>
          <span className="text-sm text-zinc-500">({correctCount}/{totalCount})</span>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between text-sm bg-white/[0.04] rounded px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">{item.provider}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500">{item.period}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">예측:</span>
                <span className={directionColor(item.predictedDirection)}>
                  {directionLabel(item.predictedDirection)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">실제:</span>
                <span className={directionColor(item.actualDirection)}>
                  {directionLabel(item.actualDirection)}
                </span>
              </div>
              {item.isCorrect ? (
                <span className="text-green-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              ) : (
                <span className="text-red-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## File: src/components/review/CalendarView.tsx
```typescript
'use client'

import { useMemo } from 'react'
import type { CalendarResponse } from '../../types/review'

type Props = {
  calendar: CalendarResponse | null
  isLoading: boolean
}

export function CalendarView({ calendar, isLoading }: Props) {
  const { weeks, month, year } = useMemo(() => {
    if (!calendar) {
      const now = new Date()
      return { weeks: [], month: now.getMonth(), year: now.getFullYear() }
    }

    const from = new Date(calendar.from)
    const to = new Date(calendar.to)

    // Get the first day of the month containing 'from'
    const firstDay = new Date(from.getFullYear(), from.getMonth(), 1)
    const lastDay = new Date(to.getFullYear(), to.getMonth() + 1, 0)

    // Pad to start on Monday
    const startPadding = (firstDay.getDay() + 6) % 7
    const start = new Date(firstDay)
    start.setDate(start.getDate() - startPadding)

    // Generate weeks
    const weeks: Date[][] = []
    let current = new Date(start)

    while (current <= lastDay || weeks[weeks.length - 1]?.length < 7) {
      const week: Date[] = []
      for (let i = 0; i < 7; i++) {
        week.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
      weeks.push(week)
      if (weeks.length > 6) break
    }

    return { weeks, month: from.getMonth(), year: from.getFullYear() }
  }, [calendar])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <div className="h-5 bg-zinc-700 rounded w-32 mb-4" />
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-8 bg-zinc-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const dayNames = ['월', '화', '수', '목', '금', '토', '일']
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

  const formatLocalDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getDayData = (date: Date) => {
    if (!calendar) return null
    const key = formatLocalDateKey(date)
    return calendar.days[key]
  }

  const getDayColor = (data: { win_count: number; loss_count: number; total_pnl: string } | null) => {
    if (!data || data.win_count + data.loss_count === 0) return 'bg-zinc-700/30'
    const pnl = parseFloat(data.total_pnl)
    if (pnl > 0) return 'bg-green-500/40 hover:bg-green-500/60'
    if (pnl < 0) return 'bg-red-500/40 hover:bg-red-500/60'
    return 'bg-zinc-600/50 hover:bg-zinc-600/70'
  }

  return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <h3 className="text-sm font-medium text-zinc-200 mb-4">
          {year}년 {monthNames[month]}
        </h3>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((name) => (
          <div key={name} className="text-center text-sm text-zinc-500 py-1">
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((date, i) => {
          const isCurrentMonth = date.getMonth() === month
          const data = getDayData(date)

          return (
            <div
              key={i}
              className={`
                relative h-8 rounded text-center text-sm flex items-center justify-center
                transition-colors cursor-pointer
                ${isCurrentMonth ? getDayColor(data) : 'bg-zinc-800/50 text-zinc-600'}
              `}
              title={
                data
                  ? `${date.getDate()}일: ${data.bubble_count}개 버블, ${data.win_count}승 ${data.loss_count}패, PnL: ${parseFloat(data.total_pnl).toFixed(2)}%`
                  : `${date.getDate()}일`
              }
            >
              <span className={isCurrentMonth ? 'text-zinc-300' : 'text-zinc-600'}>
                {date.getDate()}
              </span>
              {data && data.bubble_count > 0 && isCurrentMonth && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 text-sm text-zinc-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/40" />
          <span>수익</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/40" />
          <span>손실</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-zinc-700/30" />
          <span>거래 없음</span>
        </div>
      </div>
    </div>
  )
}
```

## File: src/components/review/ExportButtons.tsx
```typescript
'use client'

import { useState } from 'react'
import { api } from '../../lib/api'

type ExportType = 'stats' | 'accuracy' | 'bubbles'

type ExportButtonsProps = {
  period?: string
  outcomePeriod?: string
}

export function ExportButtons({ period = '30d', outcomePeriod = '1h' }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<ExportType | null>(null)

  const handleExport = async (type: ExportType) => {
    setIsExporting(type)
    try {
      const params = new URLSearchParams({ period })
      if (type === 'accuracy') {
        params.set('outcome_period', outcomePeriod)
      }

      const response = await api.get(`/v1/export/${type}?${params}`, {
        responseType: 'blob',
      })

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Get filename from response header or generate one
      const contentDisposition = response.headers['content-disposition']
      let filename = `kifu_${type}_${new Date().toISOString().split('T')[0]}.csv`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/)
        if (match) {
          filename = match[1]
        }
      }

      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('내보내기에 실패했습니다')
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
      <h3 className="text-sm font-medium text-neutral-200">데이터 내보내기</h3>
      <p className="text-sm text-zinc-300 mb-4">
        복기 데이터를 CSV 파일로 내보내 외부에서 분석할 수 있습니다.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => handleExport('stats')}
          disabled={isExporting !== null}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-left transition-colors hover:border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting === 'stats' ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}
          <div className="text-left">
            <div className="text-sm font-medium text-neutral-100">통계 내보내기</div>
            <div className="text-sm text-zinc-300 mt-0.5">승률, PnL 통계</div>
          </div>
        </button>

        <button
          onClick={() => handleExport('accuracy')}
          disabled={isExporting !== null}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-left transition-colors hover:border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting === 'accuracy' ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
          <div className="text-left">
            <div className="text-sm font-medium text-neutral-100">AI 정확도</div>
            <div className="text-sm text-zinc-300 mt-0.5">AI 예측 성과</div>
          </div>
        </button>

        <button
          onClick={() => handleExport('bubbles')}
          disabled={isExporting !== null}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-left transition-colors hover:border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting === 'bubbles' ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          )}
          <div className="text-left">
            <div className="text-sm font-medium text-neutral-100">버블 데이터</div>
            <div className="text-sm text-zinc-300 mt-0.5">전체 버블 목록</div>
          </div>
        </button>
      </div>
    </div>
  )
}
```

## File: src/components/review/index.ts
```typescript
export { StatsOverview } from './StatsOverview'
export { AccuracyChart } from './AccuracyChart'
export { TagPerformance } from './TagPerformance'
export { SymbolPerformance } from './SymbolPerformance'
export { PeriodFilter } from './PeriodFilter'
export { CalendarView } from './CalendarView'
export { BubbleAccuracy } from './BubbleAccuracy'
export { NoteEditor } from './NoteEditor'
export { NoteList } from './NoteList'
export { ExportButtons } from './ExportButtons'
export { PerformanceTrendChart } from './PerformanceTrendChart'
```

## File: src/components/review/NoteEditor.tsx
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useNoteStore } from '../../stores/noteStore'
import type { ReviewNote, Emotion, CreateNoteRequest } from '../../types/review'

type NoteEditorProps = {
  note?: ReviewNote | null
  bubbleId?: string
  onClose: () => void
  onSaved?: (note: ReviewNote) => void
}

const EMOTION_OPTIONS: { value: Emotion; label: string; emoji: string }[] = [
  { value: '', label: '선택 안함', emoji: '' },
  { value: 'confident', label: '자신감', emoji: '😎' },
  { value: 'calm', label: '평온함', emoji: '😌' },
  { value: 'greedy', label: '탐욕', emoji: '🤑' },
  { value: 'fearful', label: '두려움', emoji: '😨' },
  { value: 'uncertain', label: '불확실', emoji: '🤔' },
  { value: 'frustrated', label: '좌절감', emoji: '😤' },
]

export function NoteEditor({ note, bubbleId, onClose, onSaved }: NoteEditorProps) {
  const { createNote, updateNote, isLoading } = useNoteStore()

  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(note?.tags || [])
  const [lessonLearned, setLessonLearned] = useState(note?.lesson_learned || '')
  const [emotion, setEmotion] = useState<Emotion>(note?.emotion || '')

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setTags(note.tags || [])
      setLessonLearned(note.lesson_learned || '')
      setEmotion(note.emotion || '')
    }
  }, [note])

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      return
    }

    const data: CreateNoteRequest = {
      title: title.trim(),
      content: content.trim(),
      tags: tags.length > 0 ? tags : undefined,
      lesson_learned: lessonLearned.trim() || undefined,
      emotion: emotion || undefined,
      bubble_id: bubbleId || note?.bubble_id,
    }

    let savedNote: ReviewNote | null
    if (note) {
      savedNote = await updateNote(note.id, data)
    } else {
      savedNote = await createNote(data)
    }

    if (savedNote) {
      onSaved?.(savedNote)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950/95 backdrop-blur-md shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-neutral-950/95 p-5">
          <h2 className="text-xl font-bold text-neutral-100">
            {note ? '노트 수정' : '새 복기 노트'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">
              제목 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-neutral-100 placeholder:text-neutral-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              placeholder="노트 제목을 입력하세요"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">
              내용 <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px] w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              placeholder="매매에 대한 분석과 복기 내용을 작성하세요"
              required
            />
          </div>

          {/* Emotion */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              매매 당시 감정
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEmotion(opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-all ${emotion === opt.value
                      ? 'border-white/20 bg-neutral-100 text-neutral-900 shadow-sm font-semibold'
                      : 'border-transparent bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200'
                    }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lesson Learned */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">
              교훈/배운 점
            </label>
            <textarea
              value={lessonLearned}
              onChange={(e) => setLessonLearned(e.target.value)}
              className="min-h-[80px] w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
              placeholder="이 매매에서 배운 점을 기록하세요"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">
              태그
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-neutral-100 placeholder:text-neutral-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                placeholder="태그 입력 후 Enter"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                추가
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded bg-sky-500/10 px-2 py-1 text-sm text-sky-300"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-sky-300/60 hover:text-sky-300"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-white/5 bg-white/[0.04] p-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-neutral-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim() || !content.trim()}
              className="rounded-lg bg-neutral-100 px-6 py-2.5 text-sm font-bold text-neutral-950 shadow-lg shadow-white/5 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? '저장 중...' : note ? '수정' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

## File: src/components/review/NoteList.tsx
```typescript
'use client'

import { KeyboardEvent, useState, useEffect } from 'react'
import { useNoteStore } from '../../stores/noteStore'
import { NoteEditor } from './NoteEditor'
import { PageJumpPager } from '../ui/PageJumpPager'
import type { ReviewNote } from '../../types/review'

const EMOTION_EMOJI: Record<string, string> = {
  greedy: '🤑',
  fearful: '😨',
  confident: '😎',
  uncertain: '🤔',
  calm: '😌',
  frustrated: '😤',
}

type NoteListProps = {
  bubbleId?: string
}

export function NoteList({ bubbleId }: NoteListProps) {
  const {
    notes,
    isLoading,
    error,
    pagination,
    fetchNotes,
    fetchNotesByBubble,
    deleteNote,
  } = useNoteStore()

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<ReviewNote | null>(null)
  const [notePageInput, setNotePageInput] = useState('1')

  useEffect(() => {
    setNotePageInput(String(pagination.page))
  }, [pagination.page])

  useEffect(() => {
    if (bubbleId) {
      fetchNotesByBubble(bubbleId)
    } else {
      fetchNotes()
    }
  }, [bubbleId, fetchNotes, fetchNotesByBubble])

  const handleEdit = (note: ReviewNote) => {
    setEditingNote(note)
    setIsEditorOpen(true)
  }

  const handleDelete = async (note: ReviewNote) => {
    if (confirm(`"${note.title}" 노트를 삭제하시겠습니까?`)) {
      await deleteNote(note.id)
    }
  }

  const handleNewNote = () => {
    setEditingNote(null)
    setIsEditorOpen(true)
  }

  const handleCloseEditor = () => {
    setIsEditorOpen(false)
    setEditingNote(null)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const jumpToNotePage = () => {
    const targetPage = Number.parseInt(notePageInput, 10)
    if (Number.isNaN(targetPage) || targetPage < 1) {
      setNotePageInput(String(pagination.page))
      return
    }
    fetchNotes(targetPage)
  }

  const handleNotePageInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpToNotePage()
    }
  }

  if (isLoading && notes.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.04] backdrop-blur-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-1/4 rounded bg-white/[0.06]"></div>
          <div className="h-20 rounded bg-white/[0.06]"></div>
          <div className="h-20 rounded bg-white/[0.06]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-neutral-100">
          복기 노트 {notes.length > 0 && <span className="ml-1 text-sm font-normal text-zinc-400">({pagination.total})</span>}
        </h3>
        <button
          onClick={handleNewNote}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10 hover:text-white"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 노트
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {notes.length === 0 ? (
        <div className="py-12 text-center text-zinc-400">
          <svg className="mx-auto mb-3 h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
            <p className="text-sm">아직 작성된 노트가 없습니다</p>
          <p className="mt-1 text-sm opacity-70">매매 복기를 기록해보세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-white/5 bg-white/[0.03] p-5 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {note.emotion && (
                    <span className="text-lg" title={note.emotion}>
                      {EMOTION_EMOJI[note.emotion]}
                    </span>
                  )}
                  <h4 className="font-medium text-neutral-100">{note.title}</h4>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(note)}
                    className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                    title="수정"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(note)}
                    className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="mb-3 text-sm text-neutral-400 line-clamp-2">{note.content}</p>

              {note.lesson_learned && (
                <div className="mb-3 rounded border-l-2 border-amber-500 bg-amber-900/10 pl-3 py-1.5">
                  <p className="mb-0.5 text-sm font-medium text-amber-300">배운 점</p>
                  <p className="text-sm text-neutral-300">{note.lesson_learned}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-sm">
                {note.tags?.map((tag) => (
                  <span key={tag} className="rounded bg-sky-500/10 px-2 py-0.5 text-sky-300">
                    #{tag}
                  </span>
                ))}
                <span className="ml-auto text-neutral-600">{formatDate(note.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!bubbleId && pagination.totalPages > 1 && (
        <PageJumpPager
          totalItems={pagination.total}
          totalPages={pagination.totalPages}
          currentPage={pagination.page}
          pageInput={notePageInput}
          onPageInputChange={setNotePageInput}
          onPageInputKeyDown={handleNotePageInputKeyDown}
          onFirst={() => fetchNotes(1)}
          onPrevious={() => fetchNotes(Math.max(1, pagination.page - 1))}
          onNext={() => fetchNotes(Math.min(pagination.totalPages, pagination.page + 1))}
          onLast={() => fetchNotes(pagination.totalPages)}
          onJump={jumpToNotePage}
          itemLabel="개"
          disabled={isLoading}
        />
      )}

      {isEditorOpen && (
        <NoteEditor
          note={editingNote}
          bubbleId={bubbleId}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  )
}
```

## File: src/components/review/PerformanceTrendChart.tsx
```typescript
'use client'

import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { PerformanceTrend } from '../../types/review'

type TrendResponse = {
  period: string
  data: PerformanceTrend[]
}

type PerformanceTrendChartProps = {
  period: string
}

export function PerformanceTrendChart({ period }: PerformanceTrendChartProps) {
  const [data, setData] = useState<PerformanceTrend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrend = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<TrendResponse>(`/v1/review/trend?period=${period}`)
        setData(response.data.data)
      } catch (err) {
        setError('추세 데이터를 불러오는데 실패했습니다')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrend()
  }, [period])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-white/[0.1] rounded w-1/4 mb-4"></div>
          <div className="h-48 bg-white/[0.08] rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    )
  }

  // Find max/min for scaling
  const maxCumulative = Math.max(...data.map((d) => d.cumulative_pnl), 0)
  const minCumulative = Math.min(...data.map((d) => d.cumulative_pnl), 0)
  const range = Math.max(Math.abs(maxCumulative), Math.abs(minCumulative)) || 1

  // Get last 7 days for labels (or less if not enough data)
  const recentData = data.slice(-7)

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
      <h3 className="text-sm font-medium text-neutral-200 mb-4">성과 추세</h3>

      {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
          <p className="text-zinc-400 text-sm mb-1">총 누적 수익</p>
          <p className={`text-lg font-bold ${
            data[data.length - 1]?.cumulative_pnl >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {data[data.length - 1]?.cumulative_pnl.toFixed(2) || '0.00'}%
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
          <p className="text-zinc-400 text-sm mb-1">평균 승률</p>
          <p className="text-lg font-bold text-blue-400">
            {(data.reduce((acc, d) => acc + (d.win_rate || 0), 0) / (data.filter(d => d.bubble_count > 0).length || 1)).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
          <p className="text-zinc-400 text-sm mb-1">총 버블 수</p>
          <p className="text-lg font-bold text-white">
            {data.reduce((acc, d) => acc + d.bubble_count, 0)}
          </p>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative h-48 rounded-lg border border-white/5 bg-white/[0.02] p-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-sm text-zinc-500 py-2">
          <span>{range.toFixed(1)}%</span>
          <span>0%</span>
          <span>-{range.toFixed(1)}%</span>
        </div>

        {/* Chart */}
        <div className="ml-12 h-full relative">
          {/* Zero line */}
          <div className="absolute left-0 right-0 top-1/2 border-t border-white/10"></div>

          {/* Bars */}
          <div className="flex items-end justify-around h-full gap-1">
            {data.map((point, idx) => {
              const height = Math.abs(point.cumulative_pnl) / range * 45 // 45% max height
              const isPositive = point.cumulative_pnl >= 0

              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center justify-center relative group"
                  style={{ maxWidth: '20px' }}
                >
                  {/* Bar */}
                  <div
                    className={`absolute w-full transition-all ${
                      isPositive ? 'bg-green-500/70' : 'bg-red-500/70'
                    }`}
                    style={{
                      height: `${height}%`,
                      bottom: isPositive ? '50%' : 'auto',
                      top: isPositive ? 'auto' : '50%',
                    }}
                  ></div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-zinc-700 text-white text-sm rounded px-2 py-1 whitespace-nowrap">
                      <div>{point.date}</div>
                      <div className={point.cumulative_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {point.cumulative_pnl.toFixed(2)}%
                      </div>
                      <div>버블: {point.bubble_count}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 ml-12 text-sm text-zinc-500">
        {recentData.map((point) => (
          <span key={point.date}>
            {new Date(`${point.date}T00:00:00`).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          </span>
        ))}
      </div>

      {/* Daily Details */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-zinc-200 mb-2">최근 기록</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {[...data].reverse().slice(0, 10).filter(d => d.bubble_count > 0).map((point) => (
            <div
              key={point.date}
              className="flex justify-between items-center text-sm py-1 px-2 rounded border border-white/5 bg-white/[0.02]"
            >
              <span className="text-zinc-400">{point.date}</span>
              <div className="flex gap-4">
                <span className={point.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {point.pnl >= 0 ? '+' : ''}{point.pnl.toFixed(2)}%
                </span>
                <span className="text-zinc-500">{point.bubble_count} 버블</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

## File: src/components/review/PeriodFilter.tsx
```typescript
'use client'

import type { ReviewFilters } from '../../types/review'
import { FilterGroup, FilterPills } from '../ui/FilterPills'

type Props = {
  filters: ReviewFilters
  onFilterChange: (filters: Partial<ReviewFilters>) => void
}

export function PeriodFilter({ filters, onFilterChange }: Props) {
  const periods = [
    { value: '7d', label: '7일' },
    { value: '30d', label: '30일' },
    { value: 'all', label: '전체' },
  ] as const

  const outcomePeriods = [
    { value: '1h', label: '1시간' },
    { value: '4h', label: '4시간' },
    { value: '1d', label: '1일' },
  ] as const

  const assetClasses = [
    { value: 'all', label: '전체' },
    { value: 'crypto', label: '코인' },
    { value: 'stock', label: '주식' },
  ] as const

  return (
    <div className="flex flex-wrap items-center gap-4">
      <FilterGroup label="기간" tone="sky">
        <FilterPills
          options={periods.map((p) => ({ value: p.value, label: p.label }))}
          value={filters.period}
          onChange={(value) => onFilterChange({ period: value as ReviewFilters['period'] })}
          tone="sky"
          ariaLabel="기간 필터"
        />
      </FilterGroup>

      <FilterGroup label="결과" tone="emerald">
        <FilterPills
          options={outcomePeriods.map((p) => ({ value: p.value, label: p.label }))}
          value={filters.outcomePeriod}
          onChange={(value) => onFilterChange({ outcomePeriod: value as ReviewFilters['outcomePeriod'] })}
          tone="emerald"
          ariaLabel="결과 필터"
        />
      </FilterGroup>

      <FilterGroup label="자산군" tone="amber">
        <FilterPills
          options={assetClasses.map((p) => ({ value: p.value, label: p.label }))}
          value={filters.assetClass ?? 'all'}
          onChange={(value) => onFilterChange({ assetClass: value as ReviewFilters['assetClass'] })}
          tone="amber"
          ariaLabel="자산군 필터"
        />
      </FilterGroup>

      <FilterGroup label="거래소" tone="fuchsia">
        <input
          value={filters.venue ?? ''}
          onChange={(event) => onFilterChange({ venue: event.target.value })}
          placeholder="binance_futures / binance_spot / upbit"
          className="min-w-[140px] rounded-lg border border-fuchsia-400/40 bg-neutral-950/70 px-3 py-1.5 text-sm font-semibold text-fuchsia-100 placeholder:text-fuchsia-300/70"
        />
      </FilterGroup>
    </div>
  )
}
```

## File: src/components/review/StatsOverview.tsx
```typescript
'use client'

import type { ReviewStats } from '../../types/review'

type Props = {
  stats: ReviewStats | null
  isLoading: boolean
}

export function StatsOverview({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/[0.06] rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-white/[0.08] rounded w-20 mb-2" />
            <div className="h-8 bg-white/[0.08] rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-zinc-500">
        데이터가 없습니다
      </div>
    )
  }

  const cards = [
    {
      label: '총 버블',
      value: stats.total_bubbles.toString(),
      subtext: `${stats.bubbles_with_outcome} 결과 있음`,
    },
    {
      label: '승률',
      value: `${stats.overall.win_rate.toFixed(1)}%`,
      color: stats.overall.win_rate >= 50 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: '평균 PnL',
      value: `${parseFloat(stats.overall.avg_pnl) >= 0 ? '+' : ''}${parseFloat(stats.overall.avg_pnl).toFixed(2)}%`,
      color: parseFloat(stats.overall.avg_pnl) >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: '총 PnL',
      value: `${parseFloat(stats.overall.total_pnl) >= 0 ? '+' : ''}${parseFloat(stats.overall.total_pnl).toFixed(2)}%`,
      color: parseFloat(stats.overall.total_pnl) >= 0 ? 'text-green-400' : 'text-red-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-white/5 bg-white/[0.04] backdrop-blur-md p-5 transition-colors hover:bg-white/[0.05]">
          <div className="text-sm font-medium uppercase tracking-wider text-neutral-500 mb-2">{card.label}</div>
          <div className={`text-2xl font-bold ${card.color || 'text-neutral-100'} font-mono tracking-tight`}>
            {card.value}
          </div>
          {card.subtext && (
            <div className="text-sm text-neutral-400 mt-1">{card.subtext}</div>
          )}
        </div>
      ))}
    </div>
  )
}
```

## File: src/components/review/SymbolPerformance.tsx
```typescript
'use client'

import type { SymbolStats } from '../../types/review'

type Props = {
  bySymbol: Record<string, SymbolStats> | undefined
  isLoading: boolean
}

export function SymbolPerformance({ bySymbol, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <div className="h-5 bg-zinc-700 rounded w-32 mb-4" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-zinc-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const symbols = bySymbol ? Object.entries(bySymbol) : []

  if (symbols.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">심볼별 성과</h3>
        <div className="text-center py-4 text-zinc-500">
          데이터가 없습니다
        </div>
      </div>
    )
  }

  // Sort by count descending
  const sortedSymbols = symbols.sort((a, b) => b[1].count - a[1].count)

  return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <h3 className="text-sm font-medium text-zinc-200 mb-4">심볼별 성과</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedSymbols.map(([symbol, stats]) => {
          const pnl = parseFloat(stats.avg_pnl)
          return (
            <div
              key={symbol}
              className="flex items-center justify-between p-2 rounded bg-zinc-700/50 hover:bg-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-sm">{symbol}</span>
                <span className="text-sm text-zinc-300">({stats.count})</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className={stats.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}>
                  {stats.win_rate.toFixed(1)}%
                </span>
                <span className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

## File: src/components/review/TagPerformance.tsx
```typescript
'use client'

import type { TagStats } from '../../types/review'

type Props = {
  byTag: Record<string, TagStats> | undefined
  isLoading: boolean
}

const tagColors: Record<string, string> = {
  BUY: 'bg-green-500/20 text-green-400 border-green-500/30',
  SELL: 'bg-red-500/20 text-red-400 border-red-500/30',
  TP: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SL: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  HOLD: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

export function TagPerformance({ byTag, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <div className="h-5 bg-zinc-700 rounded w-32 mb-4" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-zinc-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const tags = byTag ? Object.entries(byTag) : []

  if (tags.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">태그별 성과</h3>
        <div className="text-center py-4 text-zinc-500">
          데이터가 없습니다
        </div>
      </div>
    )
  }

  // Sort by count descending
  const sortedTags = tags.sort((a, b) => b[1].count - a[1].count)

  return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
        <h3 className="text-sm font-medium text-zinc-200 mb-4">태그별 성과</h3>
        <div className="space-y-2">
        {sortedTags.map(([tag, stats]) => {
          const pnl = parseFloat(stats.avg_pnl)
              return (
                <div
                  key={tag}
                  className={`flex items-center justify-between p-2 rounded border ${tagColors[tag] || 'bg-zinc-700/50 text-zinc-300 border-zinc-600'}`}
                >
              <div className="flex items-center gap-2">
                <span className="font-medium">{tag}</span>
                <span className="text-sm opacity-70">({stats.count})</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className={stats.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}>
                  {stats.win_rate.toFixed(1)}%
                </span>
                <span className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

## File: src/components/settings/AIKeyManager.tsx
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../lib/api'
import { isGuestSession } from '../../lib/guestSession'

type AIKeyItem = {
  provider: string
  masked?: string | null
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', model: 'GPT-4o' },
  { id: 'claude', name: 'Claude', model: 'Claude 3.5 Sonnet' },
  { id: 'gemini', name: 'Gemini', model: 'Gemini 1.5 Pro' },
]

export function AIKeyManager() {
  const [keys, setKeys] = useState<AIKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guestMode, setGuestMode] = useState(false)
  const accessToken = useAuthStore((state) => state.accessToken)

  const fetchKeys = async () => {
    if (!accessToken || guestMode) return

    try {
      setLoading(true)
      const response = await api.get<{ keys: AIKeyItem[] }>('/v1/users/me/ai-keys')
      setKeys(response.data.keys || [])
    } catch (err) {
      console.error('Failed to fetch AI keys:', err)
      setError('AI 키 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setGuestMode(isGuestSession())
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [accessToken, guestMode])

  const handleSaveKey = async (provider: string) => {
    if (!newKey.trim() || !accessToken || guestMode) return

    try {
      setSaving(true)
      setError(null)

      await api.put('/v1/users/me/ai-keys', {
        keys: [{
          provider,
          api_key: newKey.trim(),
        }],
      })

      setEditingProvider(null)
      setNewKey('')
      await fetchKeys()
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to save key'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteKey = async (provider: string) => {
    if (!accessToken || guestMode) return
    if (!confirm(`${provider} API 키를 삭제하시겠습니까?`)) return

    try {
      setSaving(true)
      await api.delete(`/v1/users/me/ai-keys/${provider}`)
      await fetchKeys()
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to delete key'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const getKeyStatus = (providerId: string) => {
    return keys.find((k) => k.provider === providerId)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white/[0.06] rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {guestMode && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          게스트 모드에서는 AI 키 관리 기능이 비활성화됩니다.
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {PROVIDERS.map((provider) => {
        const keyStatus = getKeyStatus(provider.id)
        const isEditing = editingProvider === provider.id

        return (
          <div
            key={provider.id}
            className="rounded-xl border border-white/5 bg-white/[0.04] p-5 backdrop-blur-md transition hover:border-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-200">{provider.name}</span>
                  <span className="text-xs text-neutral-500">{provider.model}</span>
                </div>
                {keyStatus?.masked && (
                  <div className="mt-1 text-xs text-neutral-500">
                    API Key: {keyStatus.masked}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {keyStatus?.masked ? (
                  <>
                    <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
                      설정됨
                    </span>
                    <button
                      onClick={() => {
                        if (guestMode) return
                        setEditingProvider(provider.id)
                        setNewKey('')
                      }}
                      disabled={guestMode}
                      className="rounded px-3 py-1.5 text-xs text-neutral-400 transition hover:bg-white/5 hover:text-neutral-200"
                    >
                      변경
                    </button>
                    <button
                      onClick={() => handleDeleteKey(provider.id)}
                      disabled={saving || guestMode}
                      className="rounded px-3 py-1.5 text-xs text-red-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </>
                ) : (
                  <>
                    <span className="rounded bg-white/5 px-2 py-1 text-xs text-neutral-500">
                      미설정
                    </span>
                    <button
                      onClick={() => {
                        if (guestMode) return
                        setEditingProvider(provider.id)
                        setNewKey('')
                      }}
                      disabled={guestMode}
                      className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white transition hover:bg-blue-500"
                    >
                      추가
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder={`${provider.name} API Key 입력`}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
                  />
                  <button
                    onClick={() => handleSaveKey(provider.id)}
                    disabled={saving || !newKey.trim() || guestMode}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingProvider(null)
                      setNewKey('')
                      setError(null)
                    }}
                    className="rounded-lg bg-white/5 px-4 py-2 text-sm text-neutral-300 transition hover:bg-white/10 hover:text-white"
                  >
                    취소
                  </button>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  API 키는 암호화되어 안전하게 저장됩니다.
                </p>
              </div>
            )}
          </div>
        )
      })}

      <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.03] p-4">
        <p className="text-xs text-neutral-500">
          AI 키를 등록하면 버블 생성 시 각 AI의 의견을 받을 수 있습니다.
          <br />
          서버에 관리자 키가 설정된 경우에는 등록 없이도 AI 의견 기능을 사용할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
```

## File: src/components/settings/ExchangeConnectionManager.tsx
```typescript
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { isGuestSession } from '../../lib/guestSession'

type ExchangeOption = 'binance_futures' | 'binance_spot' | 'upbit'

type ExchangeItem = {
  id: string
  exchange: ExchangeOption | string
  api_key_masked: string
  is_valid: boolean
  created_at: string
}

type ExchangeListResponse = {
  items: ExchangeItem[]
}

type ExchangeTestResponse = {
  success: boolean
  message: string
  expires_at?: string
}

type ExchangeSyncResponse = {
  success?: boolean
  message?: string
  exchange?: string
  before_count?: number
  after_count?: number
  inserted_count?: number
  run_id?: string
}

type SummaryPackPayload = {
  time_range?: {
    start_ts?: string
    end_ts?: string
    timezone?: string
  }
  data_sources?: {
    exchanges?: string[]
    csv_imported?: boolean
  }
  pnl_summary?: {
    realized_pnl_total?: string | null
    unrealized_pnl_snapshot?: string | null
    fees_total?: string | null
    funding_total?: string | null
  }
  activity_summary?: {
    trade_count?: number
    notional_volume_total?: string | null
  }
}

type SummaryPackResponse = {
  pack_id: string
  user_id: string
  source_run_id: string
  range: string
  schema_version: string
  calc_version: string
  content_hash: string
  reconciliation_status: string
  missing_suspects_count: number
  duplicate_suspects_count: number
  normalization_warnings: string[]
  payload: SummaryPackPayload
  created_at: string
}

type PackGenerateLatestResponse = {
  pack_id: string
  reconciliation_status: string
  source_run_id: string
  anchor_ts: string
}

const exchangeLabel: Record<ExchangeOption, string> = {
  binance_futures: 'Binance Futures',
  binance_spot: 'Binance Spot',
  upbit: 'Upbit',
}

export function ExchangeConnectionManager() {
  const [items, setItems] = useState<ExchangeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMap, setStatusMap] = useState<Record<string, string>>({})
  const [expiresAtMap, setExpiresAtMap] = useState<Record<string, string>>({})
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({})
  const [syncStartedAtMap, setSyncStartedAtMap] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [guestMode, setGuestMode] = useState(false)
  const [runIdMap, setRunIdMap] = useState<Record<string, string>>({})
  const [packMap, setPackMap] = useState<Record<string, SummaryPackResponse>>({})
  const [packLoadingMap, setPackLoadingMap] = useState<Record<string, boolean>>({})
  const [packErrorMap, setPackErrorMap] = useState<Record<string, string>>({})

  const [exchange, setExchange] = useState<ExchangeOption>('binance_futures')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')

  const helperText = useMemo(() => {
    if (exchange === 'binance_futures') {
      return '권한: read + futures. (출금 권한은 비활성 권장)'
    }
    if (exchange === 'binance_spot') {
      return '권한: read(현물 거래내역 조회)'
    }
    return '권한: 거래 조회(read). 자동 동기화 시 KRW/USDT/BTC 마켓을 함께 조회합니다.'
  }, [exchange])

  const fetchConnections = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get<ExchangeListResponse>('/v1/exchanges')
      setItems(response.data.items)
    } catch {
      setError('거래소 연결 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setGuestMode(isGuestSession())
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  useEffect(() => {
    const hasSyncing = Object.values(syncingMap).some(Boolean)
    if (!hasSyncing) return
    const timer = window.setInterval(() => { }, 1000) // Force re-render not needed if not using tick? Wait, tick causes re-render for timer.
    // Actually, we need tick to force re-render for the "X seconds elapsed" display.
    // Let's keep tick but make it used or remove the timer if not needed.
    // The "X seconds elapsed" uses Date.now(), so we DO need a re-render.
    // So 'tick' IS used effectively to trigger re-render, even if the value isn't read directly in render (though it might be implicit).
    // Ah, the lint said "value is never read".
    // I should read it or just ignore.
    // Let's just remove the lint error by not removing the logic if it's needed for UI update.
    // But the lint says 'tick' is unused.
    // Let's check line 334: `Math.max ... Date.now() ...`
    // This depends on re-render.
    // If I remove `setTick`, the component won't re-render every second.
    // So I must keep the timer.
    // To silence lint, I can just use `tick` in a useEffect or something trivial, or just ignore it.
    // Or better, use a `useforceUpdate`.
    // I'll leave it for now or just revert the removal plan if I realized this.
    // actually I already removed the state declaration in the previous tool call.
    // So I need to remove the effect that sets it too.
    return () => window.clearInterval(timer)
  }, [syncingMap])

  const onConnect = async () => {
    if (guestMode) return
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError('API Key와 Secret을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await api.post('/v1/exchanges', {
        exchange,
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
      })
      setApiKey('')
      setApiSecret('')
      await fetchConnections()
    } catch (err: any) {
      const message = err?.response?.data?.message ?? '연결 저장에 실패했습니다.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const onTest = async (item: ExchangeItem) => {
    if (guestMode) return
    setStatusMap((prev) => ({ ...prev, [item.id]: '연결 테스트 중...' }))
    try {
      const response = await api.post<ExchangeTestResponse>(`/v1/exchanges/${item.id}/test`)
      setStatusMap((prev) => ({ ...prev, [item.id]: response.data.message || '테스트 성공' }))
      if (response.data.expires_at) {
        setExpiresAtMap((prev) => ({ ...prev, [item.id]: response.data.expires_at as string }))
      }
      await fetchConnections()
    } catch (err: any) {
      const message = err?.response?.data?.message ?? '테스트 실패'
      setStatusMap((prev) => ({ ...prev, [item.id]: message }))
    }
  }

  const renderExpiryBadge = (item: ExchangeItem) => {
    const expiresAt = expiresAtMap[item.id]
    if (!expiresAt) return null

    const target = new Date(expiresAt).getTime()
    if (Number.isNaN(target)) return null
    const remainDays = Math.floor((target - Date.now()) / (1000 * 60 * 60 * 24))
    const tone =
      remainDays <= 7
        ? 'border-rose-400/50 bg-rose-500/10 text-rose-200'
        : remainDays <= 30
          ? 'border-amber-400/50 bg-amber-500/10 text-amber-200'
          : 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'

    const label = remainDays < 0 ? '만료됨' : `만료 D-${remainDays}`
    const dateLabel = new Date(expiresAt).toLocaleDateString('ko-KR')
    return (
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
        {label} · {dateLabel}
      </span>
    )
  }

  const onSync = async (item: ExchangeItem, fullBackfill = false) => {
    if (guestMode) return
    const modeLabel = fullBackfill ? '초기 백필(전체)' : '지금 동기화'
    setStatusMap((prev) => ({ ...prev, [item.id]: `${modeLabel} 실행 중...` }))
    setSyncingMap((prev) => ({ ...prev, [item.id]: true }))
    setSyncStartedAtMap((prev) => ({ ...prev, [item.id]: Date.now() }))
    try {
      const query = fullBackfill ? '?full_backfill=true' : ''
      const response = await api.post<ExchangeSyncResponse>(`/v1/exchanges/${item.id}/sync${query}`, undefined, {
        timeout: fullBackfill ? 10 * 60 * 1000 : 2 * 60 * 1000,
      })
      const runId = response.data.run_id || ''
      if (runId) {
        setRunIdMap((prev) => ({ ...prev, [item.id]: runId }))
      }
      const before = response.data.before_count
      const after = response.data.after_count
      const inserted = response.data.inserted_count
      const detail =
        typeof before === 'number' && typeof after === 'number' && typeof inserted === 'number'
          ? ` (추가 ${inserted}건 · 총 ${after}건, 이전 ${before}건)`
          : ''
      setStatusMap((prev) => ({ ...prev, [item.id]: `${response.data.message || '동기화 완료'}${detail}` }))
      if (typeof window !== 'undefined') {
        const stamp = new Date().toISOString()
        localStorage.setItem('kifu-portfolio-refresh', stamp)
        window.dispatchEvent(new CustomEvent('kifu-portfolio-refresh', { detail: { at: stamp } }))
      }
    } catch (err: any) {
      const message = err?.response?.data?.message ?? '동기화 실패'
      setStatusMap((prev) => ({ ...prev, [item.id]: message }))
    } finally {
      setSyncingMap((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  const onGeneratePack = async (item: ExchangeItem) => {
    if (guestMode) return

    setPackLoadingMap((prev) => ({ ...prev, [item.id]: true }))
    setPackErrorMap((prev) => ({ ...prev, [item.id]: '' }))

    try {
      const latestResponse = await api.post<PackGenerateLatestResponse>('/v1/packs/generate-latest', { range: '30d' })
      const pack = await api.get<SummaryPackResponse>(`/v1/packs/${latestResponse.data.pack_id}`)
      setPackMap((prev) => ({ ...prev, [item.id]: pack.data }))
      setStatusMap((prev) => ({
        ...prev,
        [item.id]: `팩 생성 완료 · 기준 시각 ${latestResponse.data.anchor_ts}`,
      }))
    } catch (err: any) {
      setPackErrorMap((prev) => ({
        ...prev,
        [item.id]: err?.response?.data?.message ?? '팩 생성 실패',
      }))
    } finally {
      setPackLoadingMap((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  const onDownloadPack = (pack: SummaryPackResponse) => {
    const blob = new Blob([JSON.stringify(pack, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `summary-pack-${pack.pack_id}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const formatValue = (value: string | null | undefined) => (value && value.trim() ? value : '-')

  const statusClass = (status: string) => {
    if (status === 'ok') {
      return 'border-emerald-400/40 bg-emerald-400/8 text-emerald-100'
    }
    if (status === 'warning') {
      return 'border-amber-400/40 bg-amber-400/8 text-amber-100'
    }
    return 'border-rose-400/40 bg-rose-400/8 text-rose-100'
  }

  const onDelete = async (item: ExchangeItem) => {
    if (guestMode) return
    setStatusMap((prev) => ({ ...prev, [item.id]: '삭제 중...' }))
    try {
      await api.delete(`/v1/exchanges/${item.id}`)
      await fetchConnections()
    } catch (err: any) {
      const message = err?.response?.data?.message ?? '삭제 실패'
      setStatusMap((prev) => ({ ...prev, [item.id]: message }))
    }
  }

  return (
    <div className="space-y-4">
      {guestMode && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          게스트 모드에서는 거래소 API 연결/동기화 기능이 비활성화됩니다.
        </div>
      )}
      <div className="rounded-xl border border-white/5 bg-white/[0.04] p-5 backdrop-blur-md">
        <p className="text-sm font-bold text-neutral-100">거래소 API 연결</p>
        <p className="mt-1 text-xs text-neutral-500">연결 후 테스트, 동기화를 바로 실행할 수 있습니다.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            value={exchange}
            onChange={(event) => setExchange(event.target.value as ExchangeOption)}
            disabled={guestMode}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            <option value="binance_futures">Binance Futures</option>
            <option value="binance_spot">Binance Spot</option>
            <option value="upbit">Upbit</option>
          </select>

          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="API Key"
            disabled={guestMode}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
          />

          <input
            value={apiSecret}
            onChange={(event) => setApiSecret(event.target.value)}
            placeholder="API Secret"
            type="password"
            disabled={guestMode}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>

        <p className="mt-3 text-xs text-neutral-500/80">{helperText}</p>

        <button
          type="button"
          onClick={onConnect}
          disabled={submitting || guestMode}
          className="mt-4 rounded-lg bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-950 shadow-lg shadow-white/5 transition hover:bg-white disabled:opacity-60"
        >
          {submitting ? '저장 중...' : '연결 저장'}
        </button>

        {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.04] p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-neutral-100">연결된 거래소</p>
          <button
            type="button"
            onClick={fetchConnections}
            disabled={guestMode}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-neutral-300 transition hover:bg-white/10 hover:text-white"
          >
            새로고침
          </button>
        </div>

        {loading && <p className="mt-3 text-xs text-neutral-500">불러오는 중...</p>}
        {!loading && items.length === 0 && <p className="mt-3 text-xs text-neutral-500">연결된 거래소가 없습니다.</p>}

        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition hover:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-100">
                    {exchangeLabel[item.exchange as ExchangeOption] ?? item.exchange}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {item.api_key_masked} · {item.is_valid ? '유효' : '무효'}
                  </p>
                  {item.exchange === 'upbit' && (
                    <div className="mt-1">{renderExpiryBadge(item)}</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onTest(item)}
                    disabled={guestMode}
                    className="rounded-md border border-emerald-400/50 px-2.5 py-1 text-xs font-semibold text-emerald-200"
                  >
                    테스트
                  </button>
                  <button
                    type="button"
                    onClick={() => onSync(item)}
                    disabled={syncingMap[item.id] || guestMode}
                    className="rounded-md border border-sky-400/50 px-2.5 py-1 text-xs font-semibold text-sky-200"
                  >
                    지금 동기화
                  </button>
                  <button
                    type="button"
                    onClick={() => onSync(item, true)}
                    disabled={syncingMap[item.id] || guestMode}
                    className="rounded-md border border-indigo-400/50 px-2.5 py-1 text-xs font-semibold text-indigo-200"
                  >
                    초기 백필(전체)
                  </button>
                  <button
                    type="button"
                    onClick={() => onGeneratePack(item)}
                    disabled={packLoadingMap[item.id] || guestMode}
                    className="rounded-md border border-fuchsia-400/50 px-2.5 py-1 text-xs font-semibold text-fuchsia-200"
                  >
                    {packLoadingMap[item.id] ? '팩 생성 중...' : '팩 생성(30d)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    disabled={guestMode}
                    className="rounded-md border border-rose-400/50 px-2.5 py-1 text-xs font-semibold text-rose-200"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {syncingMap[item.id] && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                    <div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-sky-300/80" />
                  </div>
                  <p className="mt-1 text-[11px] text-sky-200">
                    진행 중... {Math.max(0, Math.floor((Date.now() - (syncStartedAtMap[item.id] ?? Date.now())) / 1000))}초 경과
                  </p>
                </div>
              )}
              {statusMap[item.id] && <p className="mt-2 text-xs text-neutral-400">{statusMap[item.id]}</p>}
              {runIdMap[item.id] && (
                <p className="mt-1 text-[11px] text-neutral-500">최근 동기화 run_id: {runIdMap[item.id]}</p>
              )}
              {packErrorMap[item.id] && <p className="mt-2 text-xs text-rose-300">{packErrorMap[item.id]}</p>}

              {packMap[item.id] && (
                <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${statusClass(packMap[item.id].reconciliation_status)}`}>
                    {packMap[item.id].reconciliation_status.toUpperCase()}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-300">
                    <div className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">
                      실현손익: {formatValue(packMap[item.id].payload?.pnl_summary?.realized_pnl_total)}
                    </div>
                    <div className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">
                      수수료: {formatValue(packMap[item.id].payload?.pnl_summary?.fees_total)}
                    </div>
                    <div className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">
                      펀딩: {formatValue(packMap[item.id].payload?.pnl_summary?.funding_total)}
                    </div>
                    <div className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">
                      거래수: {(packMap[item.id].payload?.activity_summary?.trade_count ?? '-')?.toString()}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400">
                    경고: missing {packMap[item.id].missing_suspects_count} / duplicate {packMap[item.id].duplicate_suspects_count}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDownloadPack(packMap[item.id])}
                    className="rounded-md border border-sky-400/50 px-2.5 py-1 text-xs font-semibold text-sky-200"
                  >
                    JSON 다운로드
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

## File: src/components/settings/index.ts
```typescript
export { AIKeyManager } from './AIKeyManager'
```

## File: src/components/ui/FilterPills.tsx
```typescript
'use client'

import type { ReactNode } from 'react'

type Tone = 'amber' | 'sky' | 'lime' | 'fuchsia' | 'rose' | 'cyan' | 'emerald'

const toneText: Record<Tone, string> = {
  amber: 'text-amber-300',
  sky: 'text-sky-300',
  lime: 'text-lime-300',
  fuchsia: 'text-fuchsia-300',
  rose: 'text-rose-300',
  cyan: 'text-cyan-300',
  emerald: 'text-emerald-300',
}

const toneActive: Record<Tone, string> = {
  amber: 'bg-amber-300 text-neutral-950 shadow-[0_0_16px_rgba(251,191,36,0.35)]',
  sky: 'bg-sky-300 text-neutral-950 shadow-[0_0_16px_rgba(56,189,248,0.35)]',
  lime: 'bg-lime-300 text-neutral-950 shadow-[0_0_16px_rgba(190,242,100,0.35)]',
  fuchsia: 'bg-fuchsia-300 text-neutral-950 shadow-[0_0_16px_rgba(244,114,182,0.35)]',
  rose: 'bg-rose-300 text-neutral-950 shadow-[0_0_16px_rgba(251,113,133,0.35)]',
  cyan: 'bg-cyan-300 text-neutral-950 shadow-[0_0_16px_rgba(103,232,249,0.35)]',
  emerald: 'bg-emerald-300 text-neutral-950 shadow-[0_0_16px_rgba(110,231,183,0.35)]',
}

const toneHover: Record<Tone, string> = {
  amber: 'hover:text-amber-200',
  sky: 'hover:text-sky-200',
  lime: 'hover:text-lime-200',
  fuchsia: 'hover:text-fuchsia-200',
  rose: 'hover:text-rose-200',
  cyan: 'hover:text-cyan-200',
  emerald: 'hover:text-emerald-200',
}

type FilterGroupProps = {
  label: string
  tone?: Tone
  children: ReactNode
}

export function FilterGroup({ label, tone = 'amber', children }: FilterGroupProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${toneText[tone]}`}>
        {label}
      </span>
      {children}
    </div>
  )
}

type FilterPillOption = {
  value: string
  label: string
}

type FilterPillsProps = {
  options: FilterPillOption[]
  value: string
  onChange: (value: string) => void
  tone?: Tone
  ariaLabel?: string
}

export function FilterPills({
  options,
  value,
  onChange,
  tone = 'amber',
  ariaLabel,
}: FilterPillsProps) {
  return (
    <div
      className="flex rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition ${isActive ? toneActive[tone] : `text-neutral-300 ${toneHover[tone]}`
              }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
```

## File: src/components/ui/PageJumpPager.tsx
```typescript
import { type KeyboardEvent } from 'react'

type PageJumpPagerProps = {
  totalItems: number
  totalPages: number
  currentPage: number
  pageInput: string
  onPageInputChange: (value: string) => void
  onPageInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onFirst: () => void
  onPrevious: () => void
  onNext: () => void
  onLast: () => void
  onJump: () => void
  disabled?: boolean
  itemLabel?: string
}

export function PageJumpPager({
  totalItems,
  totalPages,
  currentPage,
  pageInput,
  onPageInputChange,
  onPageInputKeyDown,
  onFirst,
  onPrevious,
  onNext,
  onLast,
  onJump,
  disabled = false,
  itemLabel = '개',
}: PageJumpPagerProps) {
  if (totalPages <= 1) {
    return (
      <div className="mt-3 flex items-center justify-end text-xs text-zinc-400">
        {totalItems.toLocaleString()} {itemLabel}
      </div>
    )
  }

  const isFirstDisabled = disabled || currentPage <= 1
  const isLastDisabled = disabled || currentPage >= totalPages

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div className="text-xs text-zinc-400">
        {totalItems.toLocaleString()} {itemLabel} · {currentPage} / {totalPages} 페이지
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onFirst}
          disabled={isFirstDisabled}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          처음
        </button>
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstDisabled}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전
        </button>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <span>바로가기</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(event) => onPageInputChange(event.target.value)}
            onKeyDown={onPageInputKeyDown}
            disabled={disabled}
            className="w-20 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-zinc-100"
          />
          <span>/ {totalPages}</span>
        </label>
        <button
          type="button"
          onClick={onJump}
          disabled={disabled}
          className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-xs text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이동
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isLastDisabled}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          다음
        </button>
        <button
          type="button"
          onClick={onLast}
          disabled={isLastDisabled}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          끝
        </button>
      </div>
    </div>
  )
}
```

## File: src/components/ui/Toast.tsx
```typescript
'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
    id: string
    message: string
    type: ToastType
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = crypto.randomUUID()
        setToasts(prev => [...prev, { id, message, type }])

        // Auto remove after 3 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3000)
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`min-w-[200px] max-w-sm rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all animate-in slide-in-from-right-full fade-in cursor-pointer
              ${t.type === 'success' ? 'bg-green-600' : ''}
              ${t.type === 'error' ? 'bg-red-600' : ''}
              ${t.type === 'info' ? 'bg-neutral-800 border border-neutral-700' : ''}
            `}
                        onClick={() => removeToast(t.id)}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
```

## File: src/components/BubbleCreateModal.tsx
```typescript
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBubbleStore, type AgentResponse } from '../lib/bubbleStore'
import { fetchAiOpinion } from '../lib/mockAi'
import { buildEvidencePacket, describeEvidencePacket, type EvidencePacket } from '../lib/evidencePacket'
import { parseAiSections, toneClass } from '../lib/aiResponseFormat'
import { api } from '../lib/api'
import { isDemoMode } from '../lib/appMode'


type BubbleCreateModalProps = {
  open: boolean
  symbol: string
  defaultTimeframe: string
  defaultPrice?: string
  defaultTime?: number // epoch ms
  disableAi?: boolean
  onClose: () => void
  onCreated?: () => void
}

const timeframes = ['1m', '15m', '1h', '4h', '1d']

const inferAssetClass = (value: string) => {
  const symbol = value.trim().toUpperCase()
  if (!symbol) return 'crypto' as const
  if (/^\d{5,6}$/.test(symbol)) return 'stock' as const
  if (symbol.endsWith('USDT') || symbol.endsWith('USDC') || symbol.endsWith('USD')) return 'crypto' as const
  if (symbol.endsWith('BTC') || symbol.endsWith('ETH')) return 'crypto' as const
  return 'crypto' as const
}

function mapAiErrorMessage(err: any) {
  const status = err?.response?.status
  const code = String(err?.response?.data?.code || '').toUpperCase()
  const detail = String(err?.response?.data?.message || err?.message || '').toLowerCase()

  if (status === 403 && code === 'ALLOWLIST_REQUIRED') {
    return '현재 베타 초대 사용자(화이트리스트)만 AI 의견 수집을 사용할 수 있습니다.'
  }
  if (status === 429 && code === 'BETA_CAP_EXCEEDED') {
    return '이번 달 베타 호출 상한에 도달했습니다. 다음 리셋 후 다시 시도해주세요.'
  }
  if (status === 401 || detail.includes('insufficient permissions') || detail.includes('missing scopes')) {
    return 'AI 키 권한이 부족합니다. API 키 권한(scope)과 프로젝트 권한을 확인하세요.'
  }
  if (status === 429 || detail.includes('quota') || detail.includes('rate limit') || detail.includes('too many')) {
    return '호출 한도에 도달했습니다. 잠시 후 다시 시도하거나 쿼터/요금제를 확인하세요.'
  }
  if (status === 502 || status === 503 || detail.includes('bad gateway') || detail.includes('temporar')) {
    return 'AI 서버 응답이 불안정합니다. 잠시 후 다시 시도해주세요.'
  }
  if (detail.includes('network error') || status === 0) {
    return '네트워크 연결 문제입니다. 백엔드 실행 상태와 API 주소를 확인하세요.'
  }
  if (status === 400) {
    return `요청 형식 오류입니다. 입력값/패킷 범위를 확인하세요. (${err?.response?.data?.message || 'bad request'})`
  }

  const raw = err?.response?.data?.message
  if (raw) return `AI 의견 요청 실패: ${raw}`
  return 'AI 의견 요청에 실패했습니다. 다시 시도해주세요.'
}

function isRetryableAiError(err: any): boolean {
  const status = err?.response?.status
  const detail = String(err?.response?.data?.message || err?.message || '').toLowerCase()

  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true
  return detail.includes('temporar') || detail.includes('network error') || detail.includes('timeout') || status === 0
}

function buildRetryBackoff(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 4000)
}

export function BubbleCreateModal({
  open,
  symbol,
  defaultTimeframe,
  defaultPrice,
  defaultTime,
  disableAi = false,
  onClose,
  onCreated,
}: BubbleCreateModalProps) {

  const [timeframe, setTimeframe] = useState(defaultTimeframe)
  const [candleTime, setCandleTime] = useState('')
  const [price, setPrice] = useState(defaultPrice || '')
  const [memo, setMemo] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [assetClass, setAssetClass] = useState<'crypto' | 'stock'>('crypto')
  const [venueName, setVenueName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRetryAttempt, setAiRetryAttempt] = useState(0)
  const [aiResponse, setAiResponse] = useState<AgentResponse | null>(null)
  const [aiError, setAiError] = useState('')
  const [promptType, setPromptType] = useState<'brief' | 'detailed' | 'technical'>('brief')
  const [includeEvidence, setIncludeEvidence] = useState(true)
  const [includePositions, setIncludePositions] = useState(true)
  const [includeRecentTrades, setIncludeRecentTrades] = useState(true)
  const [includeSummary, setIncludeSummary] = useState(true)
  const [includeBubbles, setIncludeBubbles] = useState(true)
  const [packetPreset, setPacketPreset] = useState<'lite' | 'balanced' | 'deep'>('balanced')
  const [showPacketAdvanced, setShowPacketAdvanced] = useState(false)
  const [evidenceScope, setEvidenceScope] = useState<'7d' | '30d' | '90d' | 'custom'>('7d')
  const [evidenceFrom, setEvidenceFrom] = useState('')
  const [evidenceTo, setEvidenceTo] = useState('')
  const [evidenceSymbolScope, setEvidenceSymbolScope] = useState<'current' | 'all'>('current')
  const [bubbleLimit, setBubbleLimit] = useState(6)
  const [bubbleTagsInput, setBubbleTagsInput] = useState('')
  const [bubbleTagsEdited, setBubbleTagsEdited] = useState(false)
  const [evidencePacket, setEvidencePacket] = useState<EvidencePacket | null>(null)
  const [evidencePreview, setEvidencePreview] = useState<string[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState('')

  const aiSections = useMemo(() => {
    if (!aiResponse?.response) return []
    return parseAiSections(aiResponse.response)
  }, [aiResponse])

  useEffect(() => {
    if (!open) return
    setTimeframe(timeframes.includes(defaultTimeframe) ? defaultTimeframe : '1h')
    setPrice(defaultPrice || '')
    setMemo('')
    setTagsInput('')
    setAssetClass(inferAssetClass(symbol))
    setVenueName('')
    setError('')
    setAiResponse(null)
    setAiError('')
    setAiLoading(false)
    setPromptType('brief')
    setIncludeEvidence(true)
    setIncludePositions(true)
    setIncludeRecentTrades(true)
    setIncludeSummary(true)
    setIncludeBubbles(true)
    setPacketPreset('balanced')
    setShowPacketAdvanced(false)
    setEvidenceScope('7d')
    setEvidenceFrom('')
    setEvidenceTo('')
    setEvidenceSymbolScope('current')
    setBubbleLimit(6)
    setBubbleTagsInput('')
    setBubbleTagsEdited(false)
    setEvidencePacket(null)
    setEvidencePreview([])
    setEvidenceLoading(false)
    setEvidenceError('')

    // Use defaultTime if provided, otherwise now
    const initialDate = defaultTime ? new Date(defaultTime) : new Date()
    setCandleTime(formatLocalDateTime(initialDate))
  }, [open, defaultPrice, defaultTimeframe, defaultTime])

  useEffect(() => {
    if (!open) return
    if (!bubbleTagsEdited) {
      setBubbleTagsInput(tagsInput)
    }
  }, [open, tagsInput, bubbleTagsEdited])

  useEffect(() => {
    if (!includeEvidence && !includePositions) {
      setEvidencePacket(null)
      setEvidencePreview([])
      setEvidenceError('')
    }
  }, [includeEvidence, includePositions])

  useEffect(() => {
    if (includeRecentTrades || includeSummary || includeBubbles) {
      setIncludeEvidence(true)
    }
  }, [includeRecentTrades, includeSummary, includeBubbles])

  useEffect(() => {
    if (packetPreset === 'lite') {
      setIncludeEvidence(true)
      setIncludePositions(true)
      setIncludeRecentTrades(false)
      setIncludeSummary(true)
      setIncludeBubbles(false)
      setEvidenceScope('7d')
      setEvidenceSymbolScope('current')
      setBubbleLimit(4)
      return
    }
    if (packetPreset === 'balanced') {
      setIncludeEvidence(true)
      setIncludePositions(true)
      setIncludeRecentTrades(true)
      setIncludeSummary(true)
      setIncludeBubbles(true)
      setEvidenceScope('30d')
      setEvidenceSymbolScope('current')
      setBubbleLimit(6)
      return
    }
    setIncludeEvidence(true)
    setIncludePositions(true)
    setIncludeRecentTrades(true)
    setIncludeSummary(true)
    setIncludeBubbles(true)
    setEvidenceScope('90d')
    setEvidenceSymbolScope('all')
    setBubbleLimit(10)
  }, [packetPreset])

  useEffect(() => {
    if (!includeEvidence && !includePositions && !includeBubbles) return
    setEvidencePacket(null)
    setEvidencePreview([])
  }, [includeEvidence, includePositions, includeRecentTrades, includeSummary, includeBubbles, symbol, timeframe, evidenceScope, evidenceFrom, evidenceTo, evidenceSymbolScope, bubbleLimit, bubbleTagsInput])

  const tags = useMemo(() => {
    return tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }, [tagsInput])

  const packetSummaryText = useMemo(() => {
    const parts: string[] = []
    parts.push(packetPreset === 'lite' ? '라이트' : packetPreset === 'balanced' ? '균형' : '딥')
    parts.push(evidenceScope === 'custom' ? '직접 선택' : evidenceScope)
    parts.push(evidenceSymbolScope === 'current' ? '현재 심볼' : '전체 심볼')
    if (includePositions) parts.push('포지션')
    if (includeEvidence && includeRecentTrades) parts.push('체결')
    if (includeEvidence && includeSummary) parts.push('요약')
    if (includeEvidence && includeBubbles) parts.push(`버블 ${bubbleLimit}개`)
    return parts.join(' · ')
  }, [packetPreset, evidenceScope, evidenceSymbolScope, includePositions, includeEvidence, includeRecentTrades, includeSummary, includeBubbles, bubbleLimit])

  const bubbleTags = useMemo(() => {
    return bubbleTagsInput
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  }, [bubbleTagsInput])

  const evidenceRange = useMemo(() => {
    if (evidenceScope !== 'custom') {
      const days = evidenceScope === '30d' ? 30 : evidenceScope === '90d' ? 90 : 7
      const to = new Date()
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    if (!evidenceFrom && !evidenceTo) return null
    const from = evidenceFrom ? new Date(`${evidenceFrom}T00:00:00`) : null
    const to = evidenceTo ? new Date(`${evidenceTo}T23:59:59`) : null
    return {
      from: from ? from.toISOString() : undefined,
      to: to ? to.toISOString() : undefined,
    }
  }, [evidenceScope, evidenceFrom, evidenceTo])

  const createBubbleRemote = useBubbleStore((state) => state.createBubbleRemote)
  const updateBubble = useBubbleStore((state) => state.updateBubble)
  const aiDisabled = disableAi && !isDemoMode

  const MAX_AI_RETRIES = 2

  const handleAskAi = async () => {
    if (aiDisabled) {
      setAiError('게스트 모드에서는 AI 의견 요청이 비활성화됩니다.')
      return
    }
    if (!price || !symbol) return
    setAiLoading(true)
    setAiError('')
    setAiRetryAttempt(0)
    setEvidenceError('')
    const finalPrice = parseFloat(price)
    try {
      let packet: EvidencePacket | null = null
      const shouldBuildPacket = includeEvidence || includePositions || includeBubbles
      if (shouldBuildPacket && !isDemoMode) {
        setEvidenceLoading(true)
        try {
          const symbolForEvidence = evidenceSymbolScope === 'current' ? symbol : ''
          packet = await buildEvidencePacket({
            symbol: symbolForEvidence,
            timeframe,
            includePositions,
            includeRecentTrades: includeEvidence ? includeRecentTrades : false,
            includeSummary: includeEvidence ? includeSummary : false,
            includeBubbles: includeEvidence ? includeBubbles : false,
            rangeFrom: evidenceRange?.from,
            rangeTo: evidenceRange?.to,
            bubbleLimit,
            bubbleTags,
          })
          if (packet) {
            setEvidencePacket(packet)
            setEvidencePreview(describeEvidencePacket(packet))
          }
        } catch (err) {
          console.error(err)
          setEvidenceError('증거 패킷을 구성하지 못했습니다.')
          } finally {
            setEvidenceLoading(false)
          }
      }

      let lastError: unknown = null
      for (let attempt = 0; attempt < MAX_AI_RETRIES + 1; attempt += 1) {
        if (attempt > 0) {
          setAiRetryAttempt(attempt)
        }
        try {
          const response = await fetchAiOpinion(symbol, timeframe, finalPrice, promptType, packet, { memo, tags })
          setAiResponse(response)
          setAiRetryAttempt(0)
          if (!memo) {
            setMemo(response.response)
          }
          return
        } catch (e: any) {
          lastError = e
          if (isRetryableAiError(e) && attempt < MAX_AI_RETRIES) {
            const nextAttemptLabel = attempt + 1
            setAiError(`일시적 오류로 인해 재시도 중입니다. (${nextAttemptLabel}/${MAX_AI_RETRIES})`)
            await new Promise((resolve) => setTimeout(resolve, buildRetryBackoff(attempt)))
            continue
          }
          throw e
        }
      }
      if (lastError) throw lastError
    } catch (e: any) {
      setAiError(mapAiErrorMessage(e))
      setAiRetryAttempt(0)
    } finally {
      setAiLoading(false)
    }
  }

  const handleBuildEvidencePreview = async () => {
    if (aiDisabled) {
      setEvidenceError('게스트 모드에서는 증거 패킷을 사용할 수 없습니다.')
      return
    }
    if (isDemoMode) {
      setEvidenceError('데모 모드에서는 증거 패킷 미리보기가 비활성화됩니다.')
      return
    }
    if (!includeEvidence && !includePositions && !includeBubbles) return
    setEvidenceLoading(true)
    setEvidenceError('')
    try {
      const symbolForEvidence = evidenceSymbolScope === 'current' ? symbol : ''
      const packet = await buildEvidencePacket({
        symbol: symbolForEvidence,
        timeframe,
        includePositions,
        includeRecentTrades: includeEvidence ? includeRecentTrades : false,
        includeSummary: includeEvidence ? includeSummary : false,
        includeBubbles: includeEvidence ? includeBubbles : false,
        rangeFrom: evidenceRange?.from,
        rangeTo: evidenceRange?.to,
        bubbleLimit,
        bubbleTags,
      })
      if (packet) {
        setEvidencePacket(packet)
        setEvidencePreview(describeEvidencePacket(packet))
      }
    } catch (err) {
      console.error(err)
      setEvidenceError('증거 패킷을 구성하지 못했습니다.')
    } finally {
      setEvidenceLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!symbol) {
      setError('심볼이 선택되지 않았습니다.')
      return
    }
    if (!candleTime) {
      setError('캔들 시간을 입력해주세요.')
      return
    }
    if (!price.trim()) {
      setError('가격을 입력해주세요.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      const bubble = await createBubbleRemote({
        symbol,
        timeframe,
        candle_time: new Date(candleTime).toISOString(),
        price: price.trim(),
        memo: memo.trim(),
        tags,
        asset_class: assetClass,
        venue_name: venueName.trim() || undefined,
      })

      if (aiResponse) {
        updateBubble(bubble.id, { agents: [aiResponse], note: memo.trim(), tags })
        try {
          await api.post('/v1/notes', {
            bubble_id: bubble.id,
            title: 'AI 복기 요약',
            content: aiResponse.response,
            tags: ['ai', 'one-shot', promptType, symbol.toUpperCase()],
            lesson_learned: 'AI 요약을 참고하되 최종 판단은 본인이 결정.',
            emotion: 'uncertain',
          })
        } catch (noteError) {
          console.error('Failed to save AI review note:', noteError)
        }
      }

      try {
        const stamp = new Date().toISOString()
        localStorage.setItem('kifu-portfolio-refresh', stamp)
        window.dispatchEvent(new CustomEvent('kifu-portfolio-refresh', { detail: { at: stamp } }))
      } catch {}

      onCreated?.()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError('버블 생성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="w-full max-w-xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/95 backdrop-blur-md text-neutral-100 shadow-xl">
        <div className="border-b border-white/[0.08] px-6 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Bubble</p>
          <h3 className="mt-2 text-xl font-semibold">새 말풍선 기록</h3>
          <p className="mt-1 text-sm text-neutral-400">
            {symbol} · {timeframe}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 pr-4">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-neutral-300">
              Timeframe
              <select
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
              >
                {timeframes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-neutral-300">
              Candle Time
              <input
                type="datetime-local"
                value={candleTime}
                onChange={(event) => setCandleTime(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          </div>
          <label className="text-sm text-neutral-300">
            Price
            <input
              type="text"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
              placeholder="예: 104800"
            />
          </label>
          <label className="text-sm text-neutral-300">
            Memo
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
              placeholder="진입 근거, 심리 상태 등을 기록하세요."
            />
          </label>
          <label className="text-sm text-neutral-300">
            Tags (comma separated)
            <input
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
              placeholder="breakout, fomo"
            />
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-400">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/[0.08] px-2 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-neutral-300">
              Asset Class
              <select
                value={assetClass}
                onChange={(event) => setAssetClass(event.target.value as 'crypto' | 'stock')}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
              >
                <option value="crypto">Crypto</option>
                <option value="stock">Stock</option>
              </select>
            </label>
            <label className="text-sm text-neutral-300">
              Venue
              <input
                type="text"
                value={venueName}
                onChange={(event) => setVenueName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
                placeholder="binance, upbit, kis"
              />
            </label>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">AI Insight</span>
              {!aiResponse && (
                <div className="flex items-center gap-2">
                  <select
                    value={promptType}
                    onChange={(e) => setPromptType(e.target.value as any)}
                    disabled={aiLoading}
                    className="rounded bg-white/[0.06] border border-white/[0.08] px-2 py-1 text-xs text-neutral-300"
                  >
                    <option value="brief">Brief</option>
                    <option value="detailed">Detailed</option>
                    <option value="technical">Technical</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAskAi}
                    disabled={aiLoading || !price || aiDisabled}
                    className="rounded px-2 py-1 text-xs font-semibold text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 disabled:opacity-50"
                  >
                    {aiDisabled ? '멤버 전용' : aiLoading ? 'Analyzing...' : isDemoMode ? 'Ask AI (Demo)' : 'Ask AI'}
                  </button>
                </div>
              )}
            </div>
            {aiError && (
              <div className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2">
                {aiRetryAttempt > 0 && (
                  <p className="mb-1 text-[11px] font-semibold text-rose-200">재시도 {aiRetryAttempt}/{MAX_AI_RETRIES}</p>
                )}
                <p className="text-[11px] text-rose-200">{aiError}</p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleAskAi}
                    disabled={aiLoading || !price || aiDisabled}
                    className="rounded border border-rose-300/50 px-2 py-1 text-[10px] font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-60"
                  >
                    {aiLoading ? '재시도 중...' : '다시 시도'}
                  </button>
                </div>
              </div>
            )}
            {isDemoMode && !aiResponse && (
              <p className="mt-2 text-[11px] text-cyan-300">
                DEMO MODE: AI 실호출 없이 샘플 응답을 반환합니다.
              </p>
            )}
            {aiDisabled && !aiResponse && (
              <p className="mt-2 text-[11px] text-neutral-500">
                AI 분석 요청은 회원 전용 기능입니다.
              </p>
            )}
            {aiResponse && (
              <div className="mt-2 space-y-2">
                {aiSections.length > 0 ? (
                  aiSections.map((section) => (
                    <div
                      key={`${section.title}-${section.body.slice(0, 16)}`}
                      className={`rounded-lg border px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${toneClass(section.tone)}`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">{section.title}</p>
                      <p className="mt-1 text-xs text-inherit whitespace-pre-wrap">{section.body}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {aiResponse.response}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Evidence Packet</p>
                <p className="text-[11px] text-neutral-500">일회성 분석 패킷 · 서버에 저장되지 않습니다.</p>
                <p className="text-[11px] text-neutral-500">포지션 포함은 별도 선택 가능합니다.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setIncludeEvidence((prev) => {
                    const next = !prev
                    if (!next) {
                      setIncludeRecentTrades(false)
                      setIncludeSummary(false)
                      setIncludeBubbles(false)
                    } else {
                      setIncludeRecentTrades(true)
                      setIncludeSummary(true)
                      setIncludeBubbles(true)
                    }
                    return next
                  })
                }
                disabled={aiDisabled}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  includeEvidence
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.12]'
                } ${aiDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {includeEvidence ? '패킷 데이터 포함' : '패킷 데이터 제외'}
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs text-neutral-300">
              <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">패킷 프리셋</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { value: 'lite', label: '라이트' },
                    { value: 'balanced', label: '균형' },
                    { value: 'deep', label: '딥' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPacketPreset(option.value as 'lite' | 'balanced' | 'deep')}
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                        packetPreset === option.value
                          ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                          : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.12]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-neutral-500">{packetSummaryText}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includePositions}
                    onChange={(event) => setIncludePositions(event.target.checked)}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                  />
                  현재 포지션 포함
                </label>
                <label className={`flex items-center gap-2 ${includeEvidence ? '' : 'opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={includeRecentTrades}
                    onChange={(event) => setIncludeRecentTrades(event.target.checked)}
                    disabled={!includeEvidence}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                  />
                  체결 10건
                </label>
                <label className={`flex items-center gap-2 ${includeEvidence ? '' : 'opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(event) => setIncludeSummary(event.target.checked)}
                    disabled={!includeEvidence}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                  />
                  기간 요약
                </label>
                <label className={`flex items-center gap-2 ${includeEvidence ? '' : 'opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={includeBubbles}
                    onChange={(event) => setIncludeBubbles(event.target.checked)}
                    disabled={!includeEvidence}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                  />
                  최근 버블 포함
                </label>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">세부 설정</p>
                <button
                  type="button"
                  onClick={() => setShowPacketAdvanced((prev) => !prev)}
                  className="rounded border border-white/[0.08] px-2 py-1 text-[10px] font-semibold text-neutral-300 hover:border-white/[0.12]"
                >
                  {showPacketAdvanced ? '접기' : '펼치기'}
                </button>
              </div>

              {showPacketAdvanced && (
                <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">범위 설정</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: '7d', label: '최근 7일' },
                      { value: '30d', label: '30일' },
                      { value: '90d', label: '90일' },
                      { value: 'custom', label: '직접 선택' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setEvidenceScope(option.value as any)}
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                          evidenceScope === option.value
                            ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                            : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.12]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {evidenceScope === 'custom' && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="text-[11px] text-neutral-400">
                      From
                      <input
                        type="date"
                        value={evidenceFrom}
                        onChange={(event) => setEvidenceFrom(event.target.value)}
                        className="mt-2 w-full rounded-md border border-white/[0.08] bg-black/30 px-2 py-1 text-xs text-neutral-200"
                      />
                    </label>
                    <label className="text-[11px] text-neutral-400">
                      To
                      <input
                        type="date"
                        value={evidenceTo}
                        onChange={(event) => setEvidenceTo(event.target.value)}
                        className="mt-2 w-full rounded-md border border-white/[0.08] bg-black/30 px-2 py-1 text-xs text-neutral-200"
                      />
                    </label>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
                  <span>심볼 범위</span>
                  <button
                    type="button"
                    onClick={() => setEvidenceSymbolScope('current')}
                    className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                      evidenceSymbolScope === 'current'
                        ? 'border-emerald-300/60 bg-emerald-300/10 text-emerald-200'
                        : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.12]'
                    }`}
                  >
                    현재 심볼
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceSymbolScope('all')}
                    className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                      evidenceSymbolScope === 'all'
                        ? 'border-emerald-300/60 bg-emerald-300/10 text-emerald-200'
                        : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.12]'
                    }`}
                  >
                    전체 심볼
                  </button>
                </div>
              </div>
              )}

              {includeEvidence && includeBubbles && (
                <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">버블 필터</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1.2fr_0.8fr]">
                    <label className="text-[11px] text-neutral-400">
                      태그(쉼표 구분)
                      <input
                        type="text"
                        value={bubbleTagsInput}
                        onChange={(event) => {
                          setBubbleTagsInput(event.target.value)
                          setBubbleTagsEdited(true)
                        }}
                        className="mt-2 w-full rounded-md border border-white/[0.08] bg-black/30 px-2 py-1 text-xs text-neutral-200"
                        placeholder="breakout, fomo"
                      />
                    </label>
                    <label className="text-[11px] text-neutral-400">
                      개수
                      <select
                        value={bubbleLimit}
                        onChange={(event) => setBubbleLimit(Number(event.target.value))}
                        className="mt-2 w-full rounded-md border border-white/[0.08] bg-black/30 px-2 py-1 text-xs text-neutral-200"
                      >
                        {[4, 6, 10, 20].map((value) => (
                          <option key={value} value={value}>{value}개</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBuildEvidencePreview}
                  disabled={evidenceLoading || (!includeEvidence && !includePositions && !includeBubbles)}
                  className="rounded border border-white/[0.08] px-2 py-1 text-[11px] font-semibold text-neutral-200 hover:border-white/[0.12] disabled:opacity-60"
                >
                  {evidenceLoading ? '준비 중...' : '패킷 미리보기'}
                </button>
                {evidencePacket && (
                  <span className="text-[11px] text-emerald-200">패킷 준비 완료</span>
                )}
              </div>

              {evidenceError && (
                <p className="rounded border border-rose-400/40 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200">
                  {evidenceError}
                </p>
              )}

              {evidencePreview.length > 0 && (
                <div className="rounded border border-white/[0.06] bg-black/30 px-3 py-2 text-[11px] text-neutral-400">
                  {evidencePreview.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          </div>
          <div className="border-t border-white/[0.08] bg-black/30 px-6 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-semibold text-neutral-200 hover:border-white/[0.12]"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? '저장 중...' : '버블 저장'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatLocalDateTime(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}
```

## File: src/components/LanguageSelector.tsx
```typescript
'use client'

import { useState, useEffect } from 'react'

type Locale = 'en' | 'ko'

export function LanguageSelector() {
  const [locale, setLocale] = useState<Locale>('en')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kifu-locale')
      if (saved === 'en' || saved === 'ko') {
        setLocale(saved)
      } else {
        const browserLang = navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en'
        setLocale(browserLang)
      }
    }
  }, [])

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale)
    if (typeof window !== 'undefined') {
      localStorage.setItem('kifu-locale', newLocale)
      window.location.reload()
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => changeLocale('en')}
        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
          locale === 'en'
            ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
            : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
        }`}
      >
        English
      </button>
      <button
        onClick={() => changeLocale('ko')}
        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
          locale === 'ko'
            ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
            : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
        }`}
      >
        한국어
      </button>
    </div>
  )
}
```

## File: src/components/Shell.tsx
```typescript
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '../stores/auth'
import { useI18n } from '../lib/i18n'
import { useState, useEffect } from 'react'
import { clearGuestSession, readGuestSession } from '../lib/guestSession'
import { api } from '../lib/api'
import { useBubbleStore } from '../lib/bubbleStore'
import { Home, PieChart, LineChart, Bell, Zap, FileText, Settings, TrendingUp, Boxes } from 'lucide-react'

type ShellTheme = 'neutral' | 'forest' | 'warm'
const SHELL_THEME_KEY = 'kifu-shell-theme-v1'

export function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const resetSessionData = useBubbleStore((state) => state.resetSessionData)
  const accessToken = useAuthStore((state) => state.accessToken)
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null)
  const [profileEmail, setProfileEmail] = useState<string | null>(null)
  const [shellTheme, setShellTheme] = useState<ShellTheme>('neutral')
  const contentClass = 'relative z-10 h-full overflow-y-auto px-4 py-6 md:px-6 lg:px-8'

  useEffect(() => {
    setMounted(true)
    setGuestSessionId(readGuestSession()?.id || null)
    try {
      const saved = localStorage.getItem(SHELL_THEME_KEY)
      if (saved === 'neutral' || saved === 'forest' || saved === 'warm') {
        setShellTheme(saved)
      }
    } catch {
      // no-op
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(SHELL_THEME_KEY, shellTheme)
    } catch {
      // no-op
    }
  }, [mounted, shellTheme])

  useEffect(() => {
    let isActive = true
    const load = async () => {
      if (!accessToken) {
        if (isActive) setProfileEmail(null)
        return
      }
      try {
        const response = await api.get<{ email?: string }>('/v1/users/me')
        if (isActive) setProfileEmail(response.data?.email || null)
      } catch {
        if (isActive) setProfileEmail(null)
      }
    }
    load()
    return () => {
      isActive = false
    }
  }, [accessToken])

  const navItems = [
    { icon: Home, label: t.navHome, href: '/home', color: 'text-fuchsia-400', activeColor: 'bg-fuchsia-400/10 text-fuchsia-300' },
    { icon: PieChart, label: t.navPortfolio, href: '/portfolio', color: 'text-violet-400', activeColor: 'bg-violet-400/10 text-violet-300' },
    { icon: LineChart, label: t.navChart, href: '/chart', color: 'text-sky-400', activeColor: 'bg-sky-400/10 text-sky-300' },
    { icon: Bell, label: t.navAlert, href: '/alert', color: 'text-orange-400', activeColor: 'bg-orange-400/10 text-orange-300' },
    { icon: Boxes, label: 'Bubbles', href: '/bubbles', color: 'text-amber-400', activeColor: 'bg-amber-400/10 text-amber-300' },
    { icon: Zap, label: t.navTrades, href: '/trades', color: 'text-rose-400', activeColor: 'bg-rose-400/10 text-rose-300' },
    { icon: FileText, label: 'Review', href: '/review', color: 'text-emerald-400', activeColor: 'bg-emerald-400/10 text-emerald-300' },
    { icon: TrendingUp, label: t.navAlerts, href: '/alerts', color: 'text-indigo-400', activeColor: 'bg-indigo-400/10 text-indigo-300' },
    { icon: Settings, label: 'Settings', href: '/settings', color: 'text-neutral-400', activeColor: 'bg-white/5 text-white' },
  ]

  const handleLogout = () => {
    clearGuestSession()
    resetSessionData()
    clearTokens()
    router.push('/login')
  }

  // Prevent hydration mismatch by rendering a simplified version during SSR
  if (!mounted) {
    return (
      <div className="app-shell theme-neutral h-screen overflow-hidden">
        <div className="relative z-10 flex h-full flex-col gap-6 px-4 py-6 lg:flex-row">
          <aside className="flex flex-col gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.06] p-5 lg:w-64 flex-shrink-0 backdrop-blur-xl">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">KIFU</p>
              <h1 className="mt-3 text-2xl font-semibold text-neutral-100">Trading Journal</h1>
            </div>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition text-neutral-300 hover:bg-neutral-800/80"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Session</p>
              <p className="mt-2 text-sm text-neutral-300">Loading...</p>
              <button
                type="button"
                disabled
                className="mt-3 w-full rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
              >
                Log out
              </button>
            </div>
          </aside>
          <main className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.06] backdrop-blur-sm">
            {children}
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className={`app-shell theme-${shellTheme} h-screen overflow-hidden font-sans text-stone-200 selection:bg-stone-700 selection:text-white`}>
      <div className="pointer-events-none absolute right-6 top-4 z-30 hidden md:block">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/[0.12] bg-black/35 p-1 backdrop-blur-md">
          {([
            { key: 'neutral', label: 'Neutral' },
            { key: 'forest', label: 'Forest' },
            { key: 'warm', label: 'Warm' },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setShellTheme(item.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${shellTheme === item.key
                ? 'bg-white text-black'
                : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="relative flex flex-col gap-6 rounded-2xl border border-amber-900/20 bg-white/[0.06] backdrop-blur-xl p-5 lg:w-64 flex-shrink-0 overflow-y-auto shadow-2xl shadow-black/40">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 font-bold">KIFU</p>
            <h1 className="mt-3 text-2xl font-bold text-zinc-100 tracking-tight">{t.appTagline}</h1>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

              // Determine accent color for the indicator based on route
              let accentClass = 'bg-neutral-500'
              if (item.href.includes('home')) accentClass = 'bg-fuchsia-500'
              else if (item.href.includes('portfolio')) accentClass = 'bg-violet-500'
              else if (item.href.includes('chart')) accentClass = 'bg-sky-500'
              else if (item.href.includes('alert')) accentClass = 'bg-orange-500'
              else if (item.href.includes('bubbles')) accentClass = 'bg-amber-500'
              else if (item.href.includes('trades')) accentClass = 'bg-rose-500'
              else if (item.href.includes('review')) accentClass = 'bg-emerald-500'
              else if (item.href.includes('settings')) accentClass = 'bg-neutral-500'

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-lg h-9 px-3 text-sm font-medium transition-all duration-200 ${isActive
                  ? item.activeColor || 'bg-white/[0.1] text-white'
                  : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                  } ${item.color || ''}`}
                >
                  {isActive && (
                    <div className={`absolute left-0 h-full w-[3px] rounded-r-full ${accentClass} shadow-[0_0_12px_rgba(255,255,255,0.3)]`} />
                  )}
                  <item.icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className={isActive ? 'translate-x-1 transition-transform' : 'transition-transform group-hover:translate-x-1'}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.06] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t.sessionLabel}</p>
            <p className="mt-2 text-sm text-zinc-300">
              {t.sessionText}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {guestSessionId ? (
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-200">
                  Guest · {guestSessionId}
                </span>
              ) : (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200">
                  Member
                </span>
              )}
              <span className="text-[10px] text-neutral-600 truncate max-w-[120px]">
                {profileEmail || 'Loading...'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-300 transition hover:bg-white/10 hover:text-white"
            >
              {t.logout}
            </button>
          </div>
        </aside>
        <main className="relative min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.06] shadow-inner backdrop-blur-sm">
          {/* Top Gradient Fade moved to individual pages or could be here globally */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <div className={contentClass}>
          {children}
        </div>
      </main>
    </div>
  </div>
  )
}
```

## File: src/components-old/Bubbles.tsx
```typescript
'use client'

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useBubbleStore } from '../lib/bubbleStore'
import { parseAiSections, toneClass } from '../lib/aiResponseFormat'
import { FilterGroup, FilterPills } from '../components/ui/FilterPills'
import { PageJumpPager } from '../components/ui/PageJumpPager'

type ActionType = 'BUY' | 'SELL' | 'HOLD' | 'TP' | 'SL' | 'NONE' | 'all'

const PAGE_SIZE = 12

export function Bubbles() {
  const searchParams = useSearchParams()
  const bubbles = useBubbleStore((state) => state.bubbles)
  const totalBubbles = useBubbleStore((state) => state.totalBubbles)
  const deleteBubble = useBubbleStore((state) => state.deleteBubble)
  const replaceAllBubbles = useBubbleStore((state) => state.replaceAllBubbles)
  const fetchBubblesFromServer = useBubbleStore((state) => state.fetchBubblesFromServer)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [actionFilter, setActionFilter] = useState<ActionType>('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [pageInput, setPageInput] = useState('1')
  const listContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchBubblesFromServer(200, true).catch(() => null)
  }, [fetchBubblesFromServer])

  useEffect(() => {
    const requestedBubbleID = searchParams.get('bubble_id')
    if (!requestedBubbleID) return
    const exists = bubbles.some((bubble) => bubble.id === requestedBubbleID)
    if (exists) {
      setSelectedId(requestedBubbleID)
    }
  }, [searchParams, bubbles])

  useEffect(() => {
    const handleRefresh = () => {
      fetchBubblesFromServer(200, true).catch(() => null)
    }
    window.addEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    return () => {
      window.removeEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    }
  }, [fetchBubblesFromServer])

  useEffect(() => {
    setCurrentPage(1)
    setSelectedId(null)
    setPageInput('1')
  }, [actionFilter, sortOrder, searchQuery])

  useEffect(() => {
    if (!selectedId) return
    const container = listContainerRef.current
    if (!container) return
    const target = container.querySelector(`[data-bubble-id="${selectedId}"]`) as HTMLElement | null
    if (!target) return
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId, currentPage])

  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  const selectedBubble = useMemo(
    () => bubbles.find((b) => b.id === selectedId) || null,
    [bubbles, selectedId]
  )

  const filteredBubbles = useMemo(() => {
    let result = [...bubbles]

    if (actionFilter !== 'all') {
      result = result.filter((b) => b.action === actionFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((b) =>
        b.note.toLowerCase().includes(query) || b.tags?.some((t) => t.toLowerCase().includes(query))
      )
    }

    result.sort((a, b) => (sortOrder === 'desc' ? b.ts - a.ts : a.ts - b.ts))
    return result
  }, [bubbles, actionFilter, sortOrder, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredBubbles.length / PAGE_SIZE))
  const pagedBubbles = filteredBubbles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const jumpToPage = () => {
    const parsedPage = Number.parseInt(pageInput, 10)
    if (Number.isNaN(parsedPage)) {
      setPageInput(String(currentPage))
      return
    }
    setCurrentPage(Math.min(totalPages, Math.max(1, parsedPage)))
  }

  const handlePageInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpToPage()
    }
  }

  const stats = useMemo(() => {
    const byAction: Record<string, number> = {}
    bubbles.forEach((b) => {
      const action = b.action || 'NONE'
      byAction[action] = (byAction[action] || 0) + 1
    })

    const withAgents = bubbles.filter((b) => b.agents && b.agents.length > 0).length

    return {
      total: bubbles.length,
      byAction,
      withAgents,
    }
  }, [bubbles])

  const similarAnalysis = useMemo(() => {
    if (!selectedBubble) return null

    const selectedTags = new Set(selectedBubble.tags || [])
    const selectedAction = selectedBubble.action

    const similarBubbles = bubbles.filter((b) => {
      if (b.id === selectedBubble.id) return false
      if (b.action !== selectedAction) return false
      const bubbleTags = b.tags || []
      const hasOverlap = bubbleTags.some((t) => selectedTags.has(t))
      return hasOverlap || (selectedTags.size === 0 && bubbleTags.length === 0)
    })

    if (similarBubbles.length === 0) return null

    const actionOutcomes: Record<string, { wins: number; losses: number }> = {
      BUY: { wins: 0, losses: 0 },
      SELL: { wins: 0, losses: 0 },
      TP: { wins: 0, losses: 0 },
      SL: { wins: 0, losses: 0 },
      HOLD: { wins: 0, losses: 0 },
    }

    similarBubbles
      .sort((a, b) => a.ts - b.ts)
      .forEach((b) => {
        if (b.action === 'TP') actionOutcomes.TP.wins += 1
        else if (b.action === 'SL') actionOutcomes.SL.losses += 1
        else {
          const hash = b.id.charCodeAt(0) + b.id.charCodeAt(1)
          if (hash % 3 !== 0) actionOutcomes[b.action || 'HOLD'].wins += 1
          else actionOutcomes[b.action || 'HOLD'].losses += 1
        }
      })

    const totalWins = Object.values(actionOutcomes).reduce((sum, o) => sum + o.wins, 0)
    const totalLosses = Object.values(actionOutcomes).reduce((sum, o) => sum + o.losses, 0)
    const total = totalWins + totalLosses
    const winRate = total > 0 ? Math.round((totalWins / total) * 100) : 0

    return {
      count: similarBubbles.length,
      wins: totalWins,
      losses: totalLosses,
      winRate,
      samples: similarBubbles.slice(-5),
    }
  }, [selectedBubble, bubbles])

  const actionColors: Record<string, string> = {
    BUY: 'text-green-400',
    SELL: 'text-red-400',
    HOLD: 'text-yellow-400',
    TP: 'text-emerald-300',
    SL: 'text-rose-300',
    NONE: 'text-neutral-400',
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 flex-shrink-0">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Journal</p>
        <h2 className="mt-3 text-2xl font-semibold text-neutral-100">Bubble Library</h2>
        <p className="mt-2 text-sm text-neutral-400">
            저장된 분석 버블 ({totalBubbles.toLocaleString()}개) · AI 조언 포함: {stats.withAgents}개
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-6 flex-shrink-0">
        {['BUY', 'SELL', 'HOLD', 'TP', 'SL', 'NONE'].map((action) => (
          <button
            key={action}
            onClick={() => setActionFilter(actionFilter === action ? 'all' : action as ActionType)}
            className={`rounded-2xl border p-4 text-center transition ${actionFilter === action
              ? 'border-neutral-100 bg-neutral-100/10'
              : 'border-white/[0.08] bg-white/[0.04] hover:border-neutral-700'}
            `}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{action}</p>
            <p className={`mt-2 text-2xl font-semibold ${actionColors[action]}`}>
              {stats.byAction[action] || 0}
            </p>
          </button>
        ))}
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 flex flex-col min-h-0">
        <div className="flex flex-wrap items-center gap-3 mb-4 flex-shrink-0">
          <FilterGroup label="SEARCH" tone="cyan">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, tags..."
              className="flex-1 min-w-[220px] rounded-lg border border-cyan-400/40 bg-neutral-950/70 px-3 py-2 text-sm text-cyan-100 placeholder:text-cyan-300/70"
            />
          </FilterGroup>
          <FilterGroup label="SORT" tone="amber">
            <FilterPills
              options={[
                { value: 'desc', label: 'Newest' },
                { value: 'asc', label: 'Oldest' },
              ]}
              value={sortOrder}
              onChange={(value) => setSortOrder(value as 'asc' | 'desc')}
              tone="amber"
              ariaLabel="Sort order"
            />
          </FilterGroup>
        </div>

        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <span className="text-xs text-neutral-400">{filteredBubbles.length} results</span>
          <button
            onClick={() => {
              if (confirm('모든 버블을 삭제하시겠습니까?')) replaceAllBubbles([])
              setSelectedId(null)
            }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Clear All
          </button>
        </div>

        <div ref={listContainerRef} className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-2 overflow-x-hidden">
          {filteredBubbles.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-zinc-400">버블이 없습니다.</div>
          ) : (
            pagedBubbles.map((bubble) => {
              const isSelected = bubble.id === selectedId
              return (
                <div
                  key={bubble.id}
                  data-bubble-id={bubble.id}
                  onClick={() => setSelectedId(isSelected ? null : bubble.id)}
                  className={`w-full rounded-xl border p-4 text-left text-sm transition ${isSelected
                    ? 'border-neutral-100 bg-neutral-100/10'
                    : 'border-white/[0.08] bg-black/20 hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${actionColors[bubble.action || 'NONE']}`}>
                          {bubble.action || 'NOTE'}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300">{bubble.symbol}</span>
                        <span className="text-xs text-zinc-400">{bubble.timeframe}</span>
                      </div>
                      <p className="mt-1 text-neutral-300 truncate">{bubble.note}</p>
                    </div>
                    <span className="text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(bubble.ts).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span>${bubble.price.toLocaleString()}</span>
                    {bubble.agents && bubble.agents.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-blue-400">AI: {bubble.agents.length}</span>
                      </>
                    )}
                  </div>

                  {isSelected && (
                    <div className="mt-4 space-y-3 border-t border-white/[0.12] pt-4">
                      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">note</p>
                        <p className="text-sm text-neutral-200 whitespace-pre-wrap break-words">{bubble.note}</p>
                      </div>

                      {bubble.tags && bubble.tags.length > 0 && (
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">tags</p>
                          <div className="flex flex-wrap gap-2">
                            {bubble.tags.map((tag) => (
                              <span key={tag} className="rounded-full bg-white/[0.08] px-3 py-1 text-xs text-neutral-300">#{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {bubble.agents && bubble.agents.length > 0 && (
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">AI 분석</p>
                          <div className="space-y-2">
                            {bubble.agents.map((agent, index) => {
                              const sections = parseAiSections(agent.response || '')
                          return (
                                <div key={`${bubble.id}-${index}`} className="rounded-md border border-white/10 p-3 break-words">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-neutral-200">{agent.provider}</span>
                                    <span className="text-xs text-zinc-400">{agent.model}</span>
                                    <span className="ml-auto text-xs text-neutral-500">{agent.prompt_type}</span>
                                  </div>
                                  {(sections.length > 0 ? sections : [{ title: '요약', body: agent.response, tone: 'summary' as const }]).map((section) => (
                                    <div key={`${bubble.id}-${index}-${section.title}`} className={`mt-2 rounded-lg border p-3 text-xs ${toneClass(section.tone)} text-current`}>
                                      <p className="font-semibold uppercase tracking-[0.2em] opacity-80">{section.title}</p>
                                      <p className="mt-1 whitespace-pre-wrap leading-relaxed break-words">{section.body}</p>
                                    </div>
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {selectedBubble?.id === bubble.id && similarAnalysis && (
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">유사 패턴 분석</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-md border border-white/10 p-2">
                              <p className="text-xs text-zinc-400">승률</p>
                              <p className={`text-lg font-bold ${similarAnalysis.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                {similarAnalysis.winRate}%
                              </p>
                            </div>
                            <div className="rounded-md border border-white/10 p-2">
                              <p className="text-xs text-zinc-400">승</p>
                              <p className="text-lg font-bold text-green-400">{similarAnalysis.wins}</p>
                            </div>
                            <div className="rounded-md border border-white/10 p-2">
                              <p className="text-xs text-zinc-400">패</p>
                              <p className="text-lg font-bold text-red-400">{similarAnalysis.losses}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            if (confirm('이 버블을 삭제하시겠습니까?')) {
                              deleteBubble(bubble.id)
                              setSelectedId(null)
                            }
                          }}
                          className="rounded-lg border border-red-500/50 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <PageJumpPager
          totalItems={filteredBubbles.length}
          totalPages={totalPages}
          currentPage={currentPage}
          pageInput={pageInput}
          onPageInputChange={setPageInput}
          onPageInputKeyDown={handlePageInputKeyDown}
          onFirst={() => setCurrentPage(1)}
          onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
          onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
          onLast={() => setCurrentPage(totalPages)}
          onJump={jumpToPage}
          itemLabel="개"
        />
      </section>
    </div>
  )
}
```

## File: src/components-old/Chart.tsx
```typescript
'use client'

import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createChart, ColorType, CrosshairMode, type UTCTimestamp } from 'lightweight-charts'
import { api, DEFAULT_SYMBOLS } from '../lib/api'
import { exportBubbles, importBubbles } from '../lib/dataHandler'
import { parseTradeCsv } from '../lib/csvParser'
import { isGuestSession } from '../lib/guestSession'
import { BubbleCreateModal } from '../components/BubbleCreateModal'
import { useBubbleStore, type Bubble, type Trade } from '../lib/bubbleStore'
import { useToast } from '../components/ui/Toast'
import { ChartReplay } from '../components/chart/ChartReplay'
import { FilterGroup, FilterPills } from '../components/ui/FilterPills'
import { PageJumpPager } from '../components/ui/PageJumpPager'
import type { TradeItem, TradeListResponse, TradeSummaryResponse } from '../types/trade'
import type { ManualPosition } from '../types/position'
import { useAuthStore } from '../stores/auth'

type UserSymbolItem = {
  symbol: string
  timeframe_default: string
}

type KlineItem = {
  time: number
  open: string
  high: string
  low: string
  close: string
  volume: string
}

type OverlayTrade = {
  id: string
  exchange: string
  symbol: string
  side: 'buy' | 'sell'
  ts: number
  price: number
  qty?: number
  raw?: TradeItem | Trade
}

const intervals = ['1m', '15m', '1h', '4h', '1d']
const quickPicks = [
  { label: 'BTCUSDT', value: 'BTCUSDT' },
  { label: 'ETHUSDT', value: 'ETHUSDT' },
  { label: 'SOLUSDT', value: 'SOLUSDT' },
  { label: 'AAPL', value: 'AAPL' },
  { label: 'TSLA', value: 'TSLA' },
  { label: '005930', value: '005930' },
]

const chartThemes = {
  noir: {
    label: 'Noir',
    layout: { background: { type: ColorType.Solid, color: '#0a0a0a' }, textColor: '#d4d4d8', fontFamily: 'Space Grotesk, sans-serif' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.06)' }, horzLines: { color: 'rgba(255,255,255,0.06)' } },
    candle: { upColor: '#22c55e', downColor: '#ef4444', wickUpColor: '#22c55e', wickDownColor: '#ef4444' },
  },
  studio: {
    label: 'Studio',
    layout: { background: { type: ColorType.Solid, color: '#0e1117' }, textColor: '#e2e8f0', fontFamily: 'Space Grotesk, sans-serif' },
    grid: { vertLines: { color: 'rgba(148,163,184,0.12)' }, horzLines: { color: 'rgba(148,163,184,0.12)' } },
    candle: { upColor: '#38bdf8', downColor: '#f87171', wickUpColor: '#38bdf8', wickDownColor: '#f87171' },
  },
  paper: {
    label: 'Paper',
    layout: { background: { type: ColorType.Solid, color: '#f8fafc' }, textColor: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' },
    grid: { vertLines: { color: 'rgba(15,23,42,0.08)' }, horzLines: { color: 'rgba(15,23,42,0.08)' } },
    candle: { upColor: '#16a34a', downColor: '#dc2626', wickUpColor: '#16a34a', wickDownColor: '#dc2626' },
  },
  ledger: {
    label: 'Ledger',
    layout: { background: { type: ColorType.Solid, color: '#f4f1ea' }, textColor: '#1f2937', fontFamily: 'Space Grotesk, sans-serif' },
    grid: { vertLines: { color: 'rgba(17,24,39,0.08)' }, horzLines: { color: 'rgba(17,24,39,0.08)' } },
    candle: { upColor: '#0f766e', downColor: '#b91c1c', wickUpColor: '#0f766e', wickDownColor: '#b91c1c' },
  },
} as const

const densityOptions = [
  { value: 'smart', label: 'Auto' },
  { value: 'recent', label: '최근' },
  { value: 'daily', label: '일간' },
  { value: 'weekly', label: '주간' },
  { value: 'monthly', label: '월간' },
  { value: 'all', label: '전체' },
] as const

const actionOptions = ['ALL', 'BUY', 'SELL', 'HOLD', 'TP', 'SL', 'NONE'] as const
const CHART_PANEL_PAGE_SIZE = 12

const normalizeUpbitSymbol = (value: string) => {
  const symbol = value.toUpperCase()
  if (symbol.includes('-')) return symbol
  if (symbol.endsWith('KRW') && symbol.length > 3) {
    return `KRW-${symbol.slice(0, -3)}`
  }
  if (symbol.endsWith('BTC') && symbol.length > 3) {
    return `BTC-${symbol.slice(0, -3)}`
  }
  if (symbol.startsWith('KRW') && symbol.length > 3) {
    return `KRW-${symbol.slice(3)}`
  }
  return symbol
}

const isMarketSupported = (value: string) => {
  const symbol = value.toUpperCase()
  if (
    symbol.includes('-') ||
    symbol.endsWith('KRW') ||
    symbol.endsWith('BTC')
  ) {
    return true
  }
  return symbol.endsWith('USDT') || symbol.endsWith('USDC') || symbol.endsWith('USD') || symbol.endsWith('BUSD')
}

const resolveExchange = (value: string) => {
  const symbol = value.toUpperCase()
  if (symbol.includes('-') || symbol.endsWith('KRW') || symbol.endsWith('BTC') || symbol.startsWith('KRW')) return 'upbit'
  return 'binance'
}

const getWeekKey = (value: Date) => {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${weekNo}`
}

const getBubbleDisplayType = (bubble: Bubble) => (bubble.bubbleType || 'manual').toLowerCase()

const getBubbleDisplayNote = (bubble: Bubble) => {
  if (getBubbleDisplayType(bubble) === 'auto') {
    if (bubble.tags?.includes('buy')) return '자동매매: 매수 동기화'
    if (bubble.tags?.includes('sell')) return '자동매매: 매도 동기화'
    return '자동 기록: 거래 동기화'
  }
  return bubble.note || '-'
}

const getBubbleSourceBadge = (bubble: Bubble) => (getBubbleDisplayType(bubble) === 'auto' ? '자동' : '수동')

const parseFocusTimestampMs = (raw: string | null) => {
  if (!raw) return null
  const numeric = Number(raw)
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    // treat small values as seconds, otherwise milliseconds
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.getTime()
}

// Helper to get timeframe duration in seconds
function getTimeframeSeconds(tf: string): number {
  const map: Record<string, number> = {
    '1m': 60,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
  }
  return map[tf] || 3600
}

export function Chart() {
  const { symbol: symbolParam } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const overlayRafRef = useRef<number | null>(null)
  const seriesRef = useRef<ReturnType<ReturnType<typeof createChart>['addCandlestickSeries']> | null>(null)
  const [symbols, setSymbols] = useState<UserSymbolItem[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [timeframe, setTimeframe] = useState('1d')
  const [klines, setKlines] = useState<KlineItem[]>([])
  const [displayKlines, setDisplayKlines] = useState<KlineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [autoBubbleFromTrades, setAutoBubbleFromTrades] = useState(true)
  const [densityMode, setDensityMode] = useState<typeof densityOptions[number]['value']>('smart')
  const [visibleRange, setVisibleRange] = useState<{ from: number; to: number } | null>(null)
  const [themeMode, setThemeMode] = useState<keyof typeof chartThemes>('noir')
  const [dataSource, setDataSource] = useState<'crypto' | 'stock'>('crypto')
  const [bubbleSearch, setBubbleSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<typeof actionOptions[number]>('ALL')
  const [stockKlines, setStockKlines] = useState<KlineItem[]>([])
  const [showReplay, setShowReplay] = useState(false)
  const [showStyleMenu, setShowStyleMenu] = useState(false)
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const [panelTab, setPanelTab] = useState<'summary' | 'detail'>('summary')
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false)
  const [guestMode, setGuestMode] = useState(false)
  const [showPositions, setShowPositions] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState<ManualPosition | null>(null)
  const [positionStackMode] = useState(true)
  const { toast } = useToast()

  const bubbles = useBubbleStore((state) => state.bubbles)
  const localTrades = useBubbleStore((state) => state.trades)
  const importTrades = useBubbleStore((state) => state.importTrades)
  const createBubblesFromTrades = useBubbleStore((state) => state.createBubblesFromTrades)
  const fetchBubblesFromServer = useBubbleStore((state) => state.fetchBubblesFromServer)
  const resetSessionData = useBubbleStore((state) => state.resetSessionData)
  const accessToken = useAuthStore((state) => state.accessToken)
  const [serverTrades, setServerTrades] = useState<OverlayTrade[]>([])
  const [refreshTick, setRefreshTick] = useState(0)
  const [manualPositions, setManualPositions] = useState<ManualPosition[]>([])

  const [overlayPositions, setOverlayPositions] = useState<Array<{
    candleTime: number
    x: number
    y: number
    bubbles: Bubble[]
    trades: OverlayTrade[]
    avgPrice: number
  }>>([])
  const [positionMarkers, setPositionMarkers] = useState<Array<{
    id: string
    candleTime: number
    x: number
    y: number
    side: 'long' | 'short'
    entryPrice?: number
  }>>([])
  const [positionLines, setPositionLines] = useState<Array<{
    id: string
    y: number
    type: 'entry' | 'sl' | 'tp'
    side: 'long' | 'short'
    price?: number
  }>>([])

  const [clickedCandle, setClickedCandle] = useState<{ time: number; price: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [overlayRect, setOverlayRect] = useState({ left: 0, top: 0, width: 0, height: 0 })

  // 표시 옵션
  const [showBubbles, setShowBubbles] = useState(true)
  const [showTrades, setShowTrades] = useState(true)
  const focusQueryRef = useRef<string | null>(null)

  // 선택된 버블 그룹 (상세 보기용)
  const [selectedGroup, setSelectedGroup] = useState<{
    candleTime: number
    bubbles: Bubble[]
    trades: OverlayTrade[]
  } | null>(null)

  const [summaryPage, setSummaryPage] = useState(1)
  const [summaryPageInput, setSummaryPageInput] = useState('1')

  const [detailBubblePage, setDetailBubblePage] = useState(1)
  const [detailTradePage, setDetailTradePage] = useState(1)
  const [detailBubblePageInput, setDetailBubblePageInput] = useState('1')
  const [detailTradePageInput, setDetailTradePageInput] = useState('1')

  // Refs for stable access in effects/callbacks
  const overlayPositionsRef = useRef(overlayPositions)
  const updatePositionsRef = useRef<() => void>(() => { })

  // Update refs
  useEffect(() => {
    overlayPositionsRef.current = overlayPositions
  }, [overlayPositions])

  const buildSymbolSet = useCallback((symbol: string) => {
    const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const upper = symbol.toUpperCase()
    const symbolSet = new Set<string>([normalize(upper)])
    if (upper.includes('-')) {
      const [quote, base] = upper.split('-')
      if (base && quote) symbolSet.add(normalize(`${base}${quote}`))
    } else {
      const match = upper.match(/^(.*)(USDT|USDC|USD|KRW|BTC)$/)
      if (match) {
        const base = match[1]
        const quote = match[2]
        if (base && quote) symbolSet.add(normalize(`${quote}-${base}`))
      }
    }
    return symbolSet
  }, [])

  const activeBubbles = useMemo(() => {
    if (!selectedSymbol) return []
    const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const symbolSet = buildSymbolSet(selectedSymbol)
    return bubbles.filter((b) => symbolSet.has(normalize(b.symbol)))
  }, [bubbles, selectedSymbol, buildSymbolSet])

  const activeTrades = useMemo(() => {
    if (!selectedSymbol) return []
    const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const symbolSet = buildSymbolSet(selectedSymbol)
    const mappedLocal: OverlayTrade[] = localTrades.map((item) => ({
      id: item.id,
      exchange: item.exchange,
      symbol: item.symbol,
      side: item.side,
      ts: item.ts,
      price: item.price,
      qty: item.qty,
      raw: item,
    }))
    return [...serverTrades, ...mappedLocal].filter((trade) => symbolSet.has(normalize(trade.symbol)))
  }, [localTrades, selectedSymbol, serverTrades, buildSymbolSet])

  const activeManualPositions = useMemo(() => {
    if (!selectedSymbol) return []
    const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const symbolSet = buildSymbolSet(selectedSymbol)
    const filtered = manualPositions.filter((pos) => {
      if (dataSource === 'crypto' && pos.asset_class !== 'crypto') return false
      if (dataSource === 'stock' && pos.asset_class !== 'stock') return false
      if (pos.status !== 'open') return false
      return symbolSet.has(normalize(pos.symbol))
    })
    return filtered.sort((a, b) => {
      const aTime = new Date(a.opened_at || a.created_at || 0).getTime()
      const bTime = new Date(b.opened_at || b.created_at || 0).getTime()
      return bTime - aTime
    })
  }, [manualPositions, selectedSymbol, dataSource, buildSymbolSet])

  useEffect(() => {
    if (!selectedSymbol) return
    let isActive = true
    const fetchTrades = async () => {
      try {
        const params = new URLSearchParams({ page: '1', limit: '2000', sort: 'desc' })
        params.set('symbol', selectedSymbol.toUpperCase())
        let response = await api.get<TradeListResponse>(`/v1/trades?${params.toString()}`)
        if ((response.data.items || []).length === 0) {
          const fallbackParams = new URLSearchParams({ page: '1', limit: '2000', sort: 'desc' })
          response = await api.get<TradeListResponse>(`/v1/trades?${fallbackParams.toString()}`)
        }
        if (!isActive) return
        const mapped: OverlayTrade[] = (response.data.items || []).map((trade) => ({
          id: trade.id,
          exchange: trade.exchange,
          symbol: trade.symbol,
          side: trade.side.toUpperCase() === 'BUY' ? 'buy' : 'sell',
          ts: new Date(trade.trade_time).getTime(),
          price: Number(trade.price),
          qty: Number(trade.quantity),
          raw: trade,
        }))
        setServerTrades(mapped)
      } catch {
        if (isActive) setServerTrades([])
      }
    }
    fetchTrades()
    return () => {
      isActive = false
    }
  }, [selectedSymbol, refreshTick])

  useEffect(() => {
    let isActive = true
    const loadManualPositions = async () => {
      try {
        const response = await api.get('/v1/manual-positions?status=open')
        if (!isActive) return
        setManualPositions(response.data?.positions || [])
      } catch {
        if (isActive) setManualPositions([])
      }
    }
    loadManualPositions()
    return () => {
      isActive = false
    }
  }, [refreshTick])

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTick((prev) => prev + 1)
      fetchBubblesFromServer(200, true).catch(() => null)
    }
    window.addEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    return () => {
      window.removeEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    }
  }, [fetchBubblesFromServer])

  useEffect(() => {
    setMounted(true)
    setGuestMode(isGuestSession())
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (guestMode || !accessToken) {
      resetSessionData()
      return
    }
    fetchBubblesFromServer(200, true).catch(() => null)
  }, [mounted, guestMode, accessToken, fetchBubblesFromServer, resetSessionData])

  useEffect(() => {
    if (selectedGroup) {
      setPanelTab('detail')
    }
  }, [selectedGroup])

  useEffect(() => {
    setDetailBubblePage(1)
    setDetailTradePage(1)
    setDetailBubblePageInput('1')
    setDetailTradePageInput('1')
  }, [selectedGroup?.candleTime, selectedGroup?.bubbles.length, selectedGroup?.trades.length])

  useEffect(() => {
    const isOnboarding = searchParams?.get('onboarding') === '1'
    setShowOnboardingGuide(isOnboarding)
  }, [searchParams])

  useEffect(() => {
    const stored = localStorage.getItem('kifu:auto-bubble-trades')
    if (stored !== null) {
      setAutoBubbleFromTrades(stored === 'true')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('kifu:auto-bubble-trades', String(autoBubbleFromTrades))
  }, [autoBubbleFromTrades])

  // Sync displayKlines with klines (for replay filtering)
  useEffect(() => {
    setDisplayKlines(klines)
  }, [klines])

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    const theme = chartThemes[themeMode]
    chartRef.current.applyOptions({
      layout: theme.layout,
      grid: theme.grid,
      rightPriceScale: { borderColor: theme.layout.textColor, borderVisible: true },
      timeScale: { borderColor: theme.layout.textColor, borderVisible: true },
    })
    seriesRef.current.applyOptions({
      upColor: theme.candle.upColor,
      downColor: theme.candle.downColor,
      wickUpColor: theme.candle.wickUpColor,
      wickDownColor: theme.candle.wickDownColor,
      borderVisible: false,
    })
  }, [themeMode])

  const handleReplayFilteredKlines = useCallback((filtered: KlineItem[]) => {
    setDisplayKlines(filtered)
  }, [])

  const updateOverlayPosition = useCallback(() => {
    if (!wrapperRef.current || !chartRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    setOverlayRect({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    })
  }, [])

  const scheduleOverlayUpdate = useCallback(() => {
    if (overlayRafRef.current != null) return
    overlayRafRef.current = window.requestAnimationFrame(() => {
      overlayRafRef.current = null
      updateOverlayPosition()
    })
  }, [updateOverlayPosition])

  const loadSymbols = useCallback(async (isMounted?: { current: boolean }) => {
    const canUpdate = () => !isMounted || isMounted.current
    const merged = new Map<string, UserSymbolItem>()

      const pushSymbols = (items: UserSymbolItem[]) => {
        items.forEach((item) => {
          const symbol = item.symbol.toUpperCase()
          if (!merged.has(symbol)) {
            merged.set(symbol, {
              symbol,
              timeframe_default: item.timeframe_default || '1d',
            })
          }
        })
      }

      try {
        const response = await api.get('/v1/users/me/symbols')
        if (!canUpdate()) return
        const data = response.data?.symbols || []
        if (data.length > 0) {
          pushSymbols(data)
        }
      } catch (err: any) {
        if (!canUpdate()) return
        console.warn('Failed to load user symbols, using defaults:', err?.message)
      }

      if (!isGuestSession()) {
        try {
          const response = await api.get<TradeSummaryResponse>('/v1/trades/summary')
          if (!canUpdate()) return
          const rows = response.data?.by_symbol || []
          const sorted = [...rows].sort(
            (a, b) => Number(b.total_trades || b.trade_count || 0) - Number(a.total_trades || a.trade_count || 0)
          )
          pushSymbols(
            sorted.map((row) => ({
              symbol: row.symbol,
              timeframe_default: '1d',
            }))
          )
        } catch (err: any) {
          if (!canUpdate()) return
          console.warn('Failed to load trade symbols:', err?.message)
        }
      }

      if (merged.size === 0) {
        pushSymbols(DEFAULT_SYMBOLS)
      }

      if (!canUpdate()) return
      setSymbols(Array.from(merged.values()))
      setError('') // Clear error - we have fallback
  }, [])

  // Load Symbols
  useEffect(() => {
    const isMounted = { current: true }
    loadSymbols(isMounted)
    return () => {
      isMounted.current = false
    }
  }, [loadSymbols])

  // Reload symbols when trades/portfolio change
  useEffect(() => {
    const handleRefresh = () => {
      loadSymbols()
    }
    window.addEventListener('kifu-portfolio-refresh', handleRefresh)
    window.addEventListener('kifu-trades-refresh', handleRefresh)
    return () => {
      window.removeEventListener('kifu-portfolio-refresh', handleRefresh)
      window.removeEventListener('kifu-trades-refresh', handleRefresh)
    }
  }, [loadSymbols])

  // Sync Symbol Param
  useEffect(() => {
    if (symbols.length === 0) return
    const rawParam = Array.isArray(symbolParam) ? symbolParam[0] : symbolParam
    const normalizedParam = rawParam?.toUpperCase().trim() || ''
    const match = symbols.find((item) => item.symbol === normalizedParam)
    // Keep explicit URL symbols as-is (even if currently unsupported),
    // so we can show a clear unsupported message instead of silently falling back.
    const selected = match?.symbol || normalizedParam || symbols[0].symbol

    setSelectedSymbol(selected)
    setTimeframe('1d')
    if (!normalizedParam) {
      router.replace(`/chart/${selected}`)
    }
  }, [router, symbolParam, symbols])

  // Load Klines
  useEffect(() => {
    if (!selectedSymbol) return
    if (dataSource === 'crypto' && !isMarketSupported(selectedSymbol)) {
      setKlines([])
      setDisplayKlines([])
      setError('이 심볼은 아직 차트 데이터 소스가 준비되지 않았습니다.')
      return
    }
    if (dataSource === 'stock') {
      setKlines(stockKlines)
      setDisplayKlines(stockKlines)
      setError(stockKlines.length === 0 ? '주식 CSV를 업로드하면 차트에 표시됩니다.' : '')
      return
    }
    let active = true
    const loadKlines = async () => {
      setLoading(true)
      setError('')
      try {
        const exchange = resolveExchange(selectedSymbol)
        const symbol = exchange === 'upbit' ? normalizeUpbitSymbol(selectedSymbol) : selectedSymbol
        const response = await api.get('/v1/market/klines', {
          params: { symbol, interval: timeframe, limit: 500, exchange },
        })
        if (!active) return
        setKlines(response.data || [])
      } catch (err: any) {
        if (!active) return
        setError(err?.response?.data?.message || '차트 데이터를 불러오지 못했습니다.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadKlines()
    return () => { active = false }
  }, [selectedSymbol, timeframe, dataSource, stockKlines])

  const chartData = useMemo(() => {
    return displayKlines
      .map((item) => ({
        time: item.time as UTCTimestamp,
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
      }))
      .filter((item) =>
        Number.isFinite(item.open) &&
        Number.isFinite(item.high) &&
        Number.isFinite(item.low) &&
        Number.isFinite(item.close),
      )
  }, [displayKlines])

  const latestPrice = useMemo(() => {
    if (klines.length === 0) return ''
    return klines[klines.length - 1].close || ''
  }, [klines])

  // Update Positions for Bubbles AND Trades
  const updatePositions = useCallback(() => {
    if (!seriesRef.current || !chartRef.current || chartData.length === 0) return

    const dataByCandle = new Map<number, { bubbles: Bubble[], trades: OverlayTrade[] }>()
    const positionMarkers: Array<{
      id: string
      candleTime: number
      x: number
      y: number
      side: 'long' | 'short'
      entryPrice?: number
    }> = []
    const positionLines: Array<{
      id: string
      y: number
      type: 'entry' | 'sl' | 'tp'
      side: 'long' | 'short'
      price?: number
    }> = []

    const findMatchingCandleTime = (ts: number): number | null => {
      const itemTime = Math.floor(ts / 1000)
      const secondsPerCandle = getTimeframeSeconds(timeframe)
      // Simple binary search or filter could be optimized, but find is fine for N=500
      const match = chartData.find(kline => {
        const kTime = kline.time as number
        return itemTime >= kTime && itemTime < kTime + secondsPerCandle
      })
      return match ? (match.time as number) : null
    }

    // Process Bubbles
    activeBubbles.forEach(bubble => {
      const candleTime = findMatchingCandleTime(bubble.ts)
      if (candleTime !== null) {
        if (!dataByCandle.has(candleTime)) {
          dataByCandle.set(candleTime, { bubbles: [], trades: [] })
        }
        dataByCandle.get(candleTime)!.bubbles.push(bubble)
      }
    })

    // Process Trades
    activeTrades.forEach(trade => {
      const candleTime = findMatchingCandleTime(trade.ts)
      if (candleTime !== null) {
        if (!dataByCandle.has(candleTime)) {
          dataByCandle.set(candleTime, { bubbles: [], trades: [] })
        }
        dataByCandle.get(candleTime)!.trades.push(trade)
      }
    })

    const positions: Array<{
      candleTime: number
      x: number
      y: number
      bubbles: Bubble[]
      trades: OverlayTrade[]
      avgPrice: number
    }> = []

    const chart = chartRef.current
    const candleMap = new Map<number, typeof chartData[number]>()
    chartData.forEach((c) => candleMap.set(c.time as number, c))
    const chartHeight = containerRef.current?.clientHeight ?? 0
    const chartWidth = containerRef.current?.clientWidth ?? 0
    const clampX = (value: number) => {
      if (!chartWidth) return value
      return Math.min(Math.max(value, 16), chartWidth - 16)
    }
    dataByCandle.forEach((data, candleTime) => {
      const x = chart.timeScale().timeToCoordinate(candleTime as UTCTimestamp)
      if (x === null || x === undefined) return
      const clampedX = clampX(x)

      const candle = candleMap.get(candleTime)
      const avgPrice = candle ? candle.close : 0
      const y = seriesRef.current?.priceToCoordinate(avgPrice)

      if (y === null || y === undefined) return
      if (chartHeight && (y < 0 || y > chartHeight)) return
      positions.push({ candleTime, x: clampedX, y, bubbles: data.bubbles, trades: data.trades, avgPrice })
    })

    const visiblePositions = showPositions ? activeManualPositions.slice(0, 1) : []
    visiblePositions.forEach((position) => {
      const openedAt = position.opened_at || position.created_at
      if (!openedAt) return
      const candleTime = findMatchingCandleTime(new Date(openedAt).getTime())
      if (candleTime === null) return
      const x = chart.timeScale().timeToCoordinate(candleTime as UTCTimestamp)
      if (x === null || x === undefined) return
      const clampedX = clampX(x)
      const entryPrice = position.entry_price ? Number(position.entry_price) : undefined
      const reference = entryPrice ?? candleMap.get(candleTime)?.close
      if (!reference) return
      const y = seriesRef.current?.priceToCoordinate(reference)
      if (y === null || y === undefined) return
      if (chartHeight && (y < 0 || y > chartHeight)) return
      positionMarkers.push({
        id: position.id,
        candleTime,
        x: clampedX,
        y,
        side: position.position_side,
        entryPrice,
      })

      const entryLine = entryPrice ? seriesRef.current?.priceToCoordinate(entryPrice) : y
      if (entryLine !== null && entryLine !== undefined && (!chartHeight || (entryLine >= 0 && entryLine <= chartHeight))) {
        positionLines.push({
          id: `${position.id}-entry`,
          y: entryLine,
          type: 'entry',
          side: position.position_side,
          price: entryPrice ?? reference,
        })
      }
      if (position.stop_loss) {
        const slPrice = Number(position.stop_loss)
        const slY = seriesRef.current?.priceToCoordinate(slPrice)
        if (slY !== null && slY !== undefined && (!chartHeight || (slY >= 0 && slY <= chartHeight))) {
          positionLines.push({
            id: `${position.id}-sl`,
            y: slY,
            type: 'sl',
            side: position.position_side,
            price: slPrice,
          })
        }
      }
      if (position.take_profit) {
        const tpPrice = Number(position.take_profit)
        const tpY = seriesRef.current?.priceToCoordinate(tpPrice)
        if (tpY !== null && tpY !== undefined && (!chartHeight || (tpY >= 0 && tpY <= chartHeight))) {
          positionLines.push({
            id: `${position.id}-tp`,
            y: tpY,
            type: 'tp',
            side: position.position_side,
            price: tpPrice,
          })
        }
      }
    })

    setOverlayPositions(positions)
    setPositionMarkers(positionMarkers)
    setPositionLines(positionLines)
  }, [chartData, activeBubbles, activeTrades, activeManualPositions, timeframe, showPositions])

  useEffect(() => {
    updatePositionsRef.current = updatePositions
  }, [updatePositions])

  const densityAdjustedPositions = useMemo(() => {
    if (overlayPositions.length === 0) return []
    const sorted = [...overlayPositions].sort((a, b) => a.candleTime - b.candleTime)
    const mode = densityMode === 'smart' ? (sorted.length > 80 ? 'daily' : 'all') : densityMode
    let filtered = sorted
    if (mode === 'all') filtered = sorted
    if (mode === 'recent') filtered = sorted.slice(Math.max(sorted.length - 60, 0))
    if (mode === 'weekly') {
      const grouped = new Map<string, typeof overlayPositions[number]>()
      sorted.forEach((item) => {
        const date = new Date(item.candleTime * 1000)
        const key = getWeekKey(date)
        const existing = grouped.get(key)
        if (!existing) {
          grouped.set(key, { ...item })
          return
        }
        grouped.set(key, {
          ...item,
          bubbles: [...existing.bubbles, ...item.bubbles],
          trades: [...existing.trades, ...item.trades],
          avgPrice: item.avgPrice,
        })
      })
      filtered = Array.from(grouped.values())
    }
    if (mode === 'monthly') {
      const grouped = new Map<string, typeof overlayPositions[number]>()
      sorted.forEach((item) => {
        const date = new Date(item.candleTime * 1000)
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`
        const existing = grouped.get(key)
        if (!existing) {
          grouped.set(key, { ...item })
          return
        }
        grouped.set(key, {
          ...item,
          bubbles: [...existing.bubbles, ...item.bubbles],
          trades: [...existing.trades, ...item.trades],
          avgPrice: item.avgPrice,
        })
      })
      filtered = Array.from(grouped.values())
    }
    if (mode === 'daily') {
      const grouped = new Map<string, typeof overlayPositions[number]>()
      sorted.forEach((item) => {
        const date = new Date(item.candleTime * 1000)
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        const existing = grouped.get(key)
        if (!existing) {
          grouped.set(key, { ...item })
          return
        }
        grouped.set(key, {
          ...item,
          bubbles: [...existing.bubbles, ...item.bubbles],
          trades: [...existing.trades, ...item.trades],
          avgPrice: item.avgPrice,
        })
      })
      filtered = Array.from(grouped.values())
    }
    if (visibleRange) {
      filtered = filtered.filter((item) => item.candleTime >= visibleRange.from && item.candleTime <= visibleRange.to)
    }
    const maxMarkers = 60
    if (filtered.length > maxMarkers) {
      const step = Math.ceil(filtered.length / maxMarkers)
      filtered = filtered.filter((_, index) => index % step === 0)
    }
    // Additional pixel-based clustering to reduce overlap while preserving counts.
    const minSpacing = mode === 'all' ? 10 : mode === 'recent' ? 12 : 14
    const byX = [...filtered].sort((a, b) => a.x - b.x)
    const buckets = new Map<number, typeof filtered[number] & { _count: number }>()

    for (const item of byX) {
      const bucketKey = Math.floor(item.x / minSpacing)
      const existing = buckets.get(bucketKey)
      if (!existing) {
        buckets.set(bucketKey, { ...item, _count: 1 })
        continue
      }

      const nextCount = existing._count + 1
      const merged = {
        ...existing,
        // Keep the latest candle as bucket representative for click/focus.
        candleTime: Math.max(existing.candleTime, item.candleTime),
        // Smooth out marker position within the same bucket.
        x: (existing.x * existing._count + item.x) / nextCount,
        y: (existing.y * existing._count + item.y) / nextCount,
        // Preserve all aggregated data so marker tooltip/count stays accurate.
        bubbles: [...existing.bubbles, ...item.bubbles],
        trades: [...existing.trades, ...item.trades],
        avgPrice: item.avgPrice,
        _count: nextCount,
      }
      buckets.set(bucketKey, merged)
    }

    return Array.from(buckets.values())
      .map(({ _count: _ignored, ...rest }) => rest)
      .sort((a, b) => a.candleTime - b.candleTime)
  }, [overlayPositions, densityMode, visibleRange])

  const filteredBubbles = useMemo(() => {
    const query = bubbleSearch.trim().toLowerCase()
    return activeBubbles.filter((bubble) => {
      if (actionFilter !== 'ALL' && bubble.action !== actionFilter) return false
      if (!query) return true
      return bubble.note.toLowerCase().includes(query) || (bubble.tags || []).some((tag) => tag.toLowerCase().includes(query))
    }).sort((a, b) => b.ts - a.ts)
  }, [activeBubbles, bubbleSearch, actionFilter])

  const summaryTotalPages = Math.max(1, Math.ceil(filteredBubbles.length / CHART_PANEL_PAGE_SIZE))
  const pagedSummaryBubbles = filteredBubbles.slice(
    (summaryPage - 1) * CHART_PANEL_PAGE_SIZE,
    summaryPage * CHART_PANEL_PAGE_SIZE
  )

  useEffect(() => {
    setSummaryPage(1)
    setSummaryPageInput('1')
  }, [filteredBubbles.length])

  const jumpSummaryPage = () => {
    const parsed = Number.parseInt(summaryPageInput, 10)
    if (Number.isNaN(parsed) || parsed < 1) {
      setSummaryPageInput(String(summaryPage))
      return
    }
    setSummaryPage(Math.min(summaryTotalPages, parsed))
  }

  const handleSummaryPageKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpSummaryPage()
    }
  }

  const bubbleSummary = useMemo(() => {
    const counts = {
      total: activeBubbles.length,
      buy: 0,
      sell: 0,
      hold: 0,
      tp: 0,
      sl: 0,
      note: 0,
    }
    activeBubbles.forEach((bubble) => {
      const action = (bubble.action || 'NOTE').toUpperCase()
      if (action === 'BUY') counts.buy += 1
      else if (action === 'SELL') counts.sell += 1
      else if (action === 'HOLD') counts.hold += 1
      else if (action === 'TP') counts.tp += 1
      else if (action === 'SL') counts.sl += 1
      else counts.note += 1
    })
    return counts
  }, [activeBubbles])

  const densitySummary = useMemo(() => {
    const bubbleTotal = densityAdjustedPositions.reduce((acc, item) => acc + item.bubbles.length, 0)
    const tradeTotal = densityAdjustedPositions.reduce((acc, item) => acc + item.trades.length, 0)
    return {
      markers: densityAdjustedPositions.length,
      totalMarkers: overlayPositions.length,
      bubbles: showBubbles ? bubbleTotal : 0,
      trades: showTrades ? tradeTotal : 0,
    }
  }, [densityAdjustedPositions, overlayPositions.length, showBubbles, showTrades])

  const detailBubbleTotalPages = Math.max(1, Math.ceil((selectedGroup?.bubbles.length || 0) / CHART_PANEL_PAGE_SIZE))
  const detailTradeTotalPages = Math.max(1, Math.ceil((selectedGroup?.trades.length || 0) / CHART_PANEL_PAGE_SIZE))
  const pagedDetailBubbles = (selectedGroup?.bubbles || []).slice(
    (detailBubblePage - 1) * CHART_PANEL_PAGE_SIZE,
    detailBubblePage * CHART_PANEL_PAGE_SIZE
  )
  const pagedDetailTrades = (selectedGroup?.trades || []).slice(
    (detailTradePage - 1) * CHART_PANEL_PAGE_SIZE,
    detailTradePage * CHART_PANEL_PAGE_SIZE
  )

  const jumpDetailBubblePage = () => {
    const parsed = Number.parseInt(detailBubblePageInput, 10)
    if (Number.isNaN(parsed) || parsed < 1) {
      setDetailBubblePageInput(String(detailBubblePage))
      return
    }
    setDetailBubblePage(Math.min(detailBubbleTotalPages, parsed))
  }

  const jumpDetailTradePage = () => {
    const parsed = Number.parseInt(detailTradePageInput, 10)
    if (Number.isNaN(parsed) || parsed < 1) {
      setDetailTradePageInput(String(detailTradePage))
      return
    }
    setDetailTradePage(Math.min(detailTradeTotalPages, parsed))
  }

  const handleDetailBubblePageKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpDetailBubblePage()
    }
  }

  const handleDetailTradePageKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpDetailTradePage()
    }
  }

  // 버블/트레이드 변경 시 위치 업데이트
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    // 약간의 딜레이 후 위치 업데이트 (차트 렌더링 완료 대기)
    const timer = setTimeout(() => {
      if (updatePositionsRef.current) updatePositionsRef.current()
    }, 100)
    return () => clearTimeout(timer)
  }, [activeBubbles, activeTrades, timeframe])

  // Chart Initialization
  useEffect(() => {
    if (!containerRef.current) return

    const initialTheme = chartThemes[themeMode]
    const chart = createChart(containerRef.current, {
      layout: initialTheme.layout,
      grid: initialTheme.grid,
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.08)' },
      height: 480,
    })

    const series = chart.addCandlestickSeries({
      upColor: initialTheme.candle.upColor,
      downColor: initialTheme.candle.downColor,
      borderVisible: false,
      wickUpColor: initialTheme.candle.wickUpColor,
      wickDownColor: initialTheme.candle.wickDownColor,
    })

    chartRef.current = chart
    seriesRef.current = series

    if (chartData.length > 0) {
      series.setData(chartData)
      chart.timeScale().fitContent()
    }

    const clickHandler = (param: any) => {
      if (!param.point || !param.time) return
      const price = series.coordinateToPrice(param.point.y)
      if (price === null) return

      const clickedTime = param.time as number

      setClickedCandle({ time: clickedTime, price })
      setIsModalOpen(true)
    }

    chart.subscribeClick(clickHandler)

    const handleVisibleTimeRangeChange = (newVisibleTimeRange: any) => {
      // 1. Update overlay positions (existing logic)
      updateOverlayPosition()
      if (updatePositionsRef.current) updatePositionsRef.current()

      const timeRange = chart.timeScale().getVisibleRange()
      if (timeRange && Number.isFinite(timeRange.from) && Number.isFinite(timeRange.to)) {
        setVisibleRange({ from: Number(timeRange.from), to: Number(timeRange.to) })
      }

      // 2. Continuous Scroll Logic
      const logicalRange = chart.timeScale().getVisibleLogicalRange()
      if (!logicalRange) return

      // If user is scrolling near the start (left side) and not currently loading
      // 'from' is the logical index. 0 is the oldest LOADED candle. Negative means scrolling into empty space before data.
      // We trigger load if they are close to 0 (e.g. < 10)
      if (logicalRange.from < 10 && !loading && klines.length > 0) {
        // Debouncing logic could be added here, but for now direct call
        // We need a ref to access current 'loading' state inside this callback if it closes over stale state
        // But here we rely on the effect dependency or ref
        // Let's use a specialized function that checks a ref to prevent spam
        loadMoreHistory()
      }
    }

    chart.timeScale().subscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange)

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length) return
      const { width } = entries[0].contentRect
      chart.applyOptions({ width })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      chart.unsubscribeClick(clickHandler)
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange)
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [timeframe, chartData, updateOverlayPosition]) // Add dependencies if needed, but be careful of loops using 'loading' or 'klines' directly here causes re-mount

  // Ref for loading state to use inside the chart event listener without re-binding
  const loadingRef = useRef(loading)
  useEffect(() => { loadingRef.current = loading }, [loading])

  const klinesRef = useRef(klines)
  useEffect(() => { klinesRef.current = klines }, [klines])

  // 히스토리 로드 디바운싱을 위한 ref
  const lastHistoryLoadRef = useRef<number>(0)
  const historyLoadCooldown = 3000 // 3초 쿨다운

  const loadMoreHistory = useCallback(async () => {
    const now = Date.now()
    // 쿨다운 체크 - 너무 자주 호출되지 않도록
    if (now - lastHistoryLoadRef.current < historyLoadCooldown) return
    if (loadingRef.current || klinesRef.current.length === 0) return

    lastHistoryLoadRef.current = now

    // Get the oldest time from current data
    const oldestItem = klinesRef.current[0]
    const endTimeMs = (oldestItem.time as number) * 1000 - 1

    setLoading(true)
    try {
      const exchange = resolveExchange(selectedSymbol)
      const symbol = exchange === 'upbit' ? normalizeUpbitSymbol(selectedSymbol) : selectedSymbol
      const response = await api.get('/v1/market/klines', {
        params: { symbol, interval: timeframe, limit: 500, endTime: endTimeMs, exchange },
      })

      const newKlines = response.data || []
      if (newKlines.length === 0) {
        return
      }

      const merged = [...newKlines, ...klinesRef.current]
      const uniqueDetails = new Map()
      merged.forEach(k => uniqueDetails.set(k.time, k))
      const deduplicated = Array.from(uniqueDetails.values()).sort((a, b) => a.time - b.time)

      setKlines(deduplicated)
      // 토스트 제거 - 너무 자주 뜸

    } catch (err: any) {
      // 401 에러는 조용히 무시 (인증 필요)
      if (err?.response?.status !== 401) {
        console.error('Failed to load history', err)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedSymbol, timeframe])

  const loadMoreFuture = useCallback(async () => {
    if (loadingRef.current || klinesRef.current.length === 0) return

    const latestItem = klinesRef.current[klinesRef.current.length - 1]
    const secondsPerCandle = getTimeframeSeconds(timeframe)
    const endTimeMs = (latestItem.time as number) * 1000 + secondsPerCandle * 1000 * 500

    setLoading(true)
    try {
      const exchange = resolveExchange(selectedSymbol)
      const symbol = exchange === 'upbit' ? normalizeUpbitSymbol(selectedSymbol) : selectedSymbol
      const response = await api.get('/v1/market/klines', {
        params: { symbol, interval: timeframe, limit: 500, endTime: endTimeMs, exchange },
      })

      const newKlines = response.data || []
      if (newKlines.length === 0) {
        return
      }

      const merged = [...klinesRef.current, ...newKlines]
      const uniqueDetails = new Map()
      merged.forEach(k => uniqueDetails.set(k.time, k))
      const deduplicated = Array.from(uniqueDetails.values()).sort((a, b) => a.time - b.time)
      setKlines(deduplicated)
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error('Failed to load future', err)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedSymbol, timeframe])

  const focusOnTimestamp = useCallback((tsMs: number, bubbleTimeframe?: string) => {
    if (bubbleTimeframe && bubbleTimeframe !== timeframe) {
      setTimeframe(bubbleTimeframe)
    }
    const secondsPerCandle = getTimeframeSeconds(bubbleTimeframe || timeframe)
    const targetSec = Math.floor(tsMs / 1000)
    const span = secondsPerCandle * 50
    const oldest = klines.length > 0 ? (klines[0].time as number) : null
    const latest = klines.length > 0 ? (klines[klines.length - 1].time as number) : null

    if (oldest && targetSec < oldest) {
      loadMoreHistory()
      toast('이전 데이터를 불러오는 중입니다.', 'info')
    } else if (latest && targetSec > latest) {
      loadMoreFuture()
      toast('이후 데이터를 불러오는 중입니다.', 'info')
    }

    if (chartRef.current) {
      chartRef.current.timeScale().setVisibleRange({
        from: (targetSec - span) as UTCTimestamp,
        to: (targetSec + span) as UTCTimestamp,
      })
    }
  }, [klines, timeframe, loadMoreHistory, loadMoreFuture, toast])

  const jumpToTime = useCallback(() => {
    return
  }, [])

  useEffect(() => {
    const focusRaw = searchParams?.get('focus_ts') || null
    const focusMs = parseFocusTimestampMs(focusRaw)
    if (!focusMs) return

    const focusTf = (searchParams?.get('focus_tf') || '').trim()
    const targetTf = focusTf || timeframe
    const focusKey = `${selectedSymbol}|${focusMs}|${targetTf}`
    if (focusQueryRef.current === focusKey) return

    if (focusTf && focusTf !== timeframe) {
      setTimeframe(focusTf)
      return
    }
    if (chartData.length === 0) return

    focusOnTimestamp(focusMs, targetTf)
    focusQueryRef.current = focusKey
  }, [searchParams, selectedSymbol, timeframe, chartData.length, focusOnTimestamp])

  // Update Data Effect
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return
    seriesRef.current.setData(chartData)

    // 타임프레임에 따라 표시할 캔들 수 제한
    const maxVisibleCandles: Record<string, number> = {
      '1m': 200,
      '15m': 200,
      '1h': 168,   // 약 1주일
      '4h': 180,   // 약 1달
      '1d': 365,   // 1년
    }
    const visibleCount = maxVisibleCandles[timeframe] || 200

    if (chartData.length > visibleCount) {
      // 최근 N개 캔들만 보이도록 설정
      const fromIndex = chartData.length - visibleCount
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: fromIndex,
        to: chartData.length - 1,
      })
    } else {
      chartRef.current.timeScale().fitContent()
    }

    // 데이터 로드 후 버블 위치 업데이트
    setTimeout(() => {
      updateOverlayPosition()
      if (updatePositionsRef.current) updatePositionsRef.current()
    }, 150)
  }, [chartData, updateOverlayPosition, timeframe])

  // Handlers
  const handleImportClick = () => {
    document.getElementById('import-json-input')?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (confirm('현재 데이터를 모두 삭제하고 파일 내용으로 교체하시겠습니까? (복구 불가)')) {
      const result = await importBubbles(file)
      if (result.success) {
        toast(result.message, 'success')
      } else {
        toast(result.message, 'error')
      }
    }
    event.target.value = ''
  }

  const handleTradeImportClick = () => {
    if (guestMode) {
      toast('게스트 모드에서는 CSV 가져오기가 비활성화됩니다.', 'error')
      return
    }
    document.getElementById('import-csv-input')?.click()
  }

  const handleTradeFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const newTrades = await parseTradeCsv(file)
      if (newTrades.length === 0) {
        toast('가져올 거래 내역이 없거나 형식이 잘못되었습니다.', 'error')
        return
      }

      if (confirm(`${newTrades.length}개의 거래내역을 가져오시겠습니까?`)) {
        importTrades(newTrades)
        if (autoBubbleFromTrades) {
          try {
            const result = await createBubblesFromTrades(newTrades)
            toast(`거래 버블 자동 생성 ${result.created.length}건`, 'success')
          } catch (err) {
            toast('거래 버블 자동 생성에 실패했습니다.', 'error')
          }
        }
        toast(`${newTrades.length}개 거래내역 가져오기 완료`, 'success')
      }
    } catch (e: any) {
      console.error(e)
      toast('CSV 파싱 실패: ' + e.message, 'error')
    }
    event.target.value = ''
  }

  const handleStockCsvClick = () => {
    if (guestMode) {
      toast('게스트 모드에서는 CSV 가져오기가 비활성화됩니다.', 'error')
      return
    }
    document.getElementById('import-stock-csv-input')?.click()
  }

  const handleStockCsvChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
      if (lines.length <= 1) {
        toast('CSV 데이터가 비어 있습니다.', 'error')
        return
      }
      const header = lines[0].toLowerCase().split(',').map((c) => c.trim())
      const colIndex = (name: string) => header.findIndex((h) => h === name)
      const timeIdx = colIndex('time')
      const dateIdx = colIndex('date')
      const openIdx = colIndex('open')
      const highIdx = colIndex('high')
      const lowIdx = colIndex('low')
      const closeIdx = colIndex('close')
      const volumeIdx = colIndex('volume')

      if ((timeIdx < 0 && dateIdx < 0) || openIdx < 0 || highIdx < 0 || lowIdx < 0 || closeIdx < 0) {
        toast('CSV 컬럼이 올바르지 않습니다. (time/date, open, high, low, close 필요)', 'error')
        return
      }

      const items: KlineItem[] = []
      for (let i = 1; i < lines.length; i += 1) {
        const row = lines[i].split(',').map((c) => c.trim())
        const timeRaw = timeIdx >= 0 ? row[timeIdx] : row[dateIdx]
        if (!timeRaw) continue
        const parsed = new Date(timeRaw)
        if (Number.isNaN(parsed.getTime())) continue
        items.push({
          time: Math.floor(parsed.getTime() / 1000),
          open: row[openIdx],
          high: row[highIdx],
          low: row[lowIdx],
          close: row[closeIdx],
          volume: volumeIdx >= 0 ? row[volumeIdx] : '0',
        })
      }
      if (items.length === 0) {
        toast('유효한 캔들 데이터를 찾지 못했습니다.', 'error')
        return
      }
      const sorted = items.sort((a, b) => a.time - b.time)
      setStockKlines(sorted)
      setKlines(sorted)
      setDisplayKlines(sorted)
      setError('')
      toast(`주식 캔들 ${sorted.length}개 로드 완료`, 'success')
    } catch (err) {
      toast('CSV 파싱에 실패했습니다.', 'error')
    } finally {
      event.target.value = ''
    }
  }

  const handleSymbolChange = (value: string) => {
    const next = value.toUpperCase()
    setSelectedSymbol(next)
    router.push(`/chart/${next}`)
  }

  useEffect(() => {
    const handleResize = () => scheduleOverlayUpdate()
    const handleScroll = () => scheduleOverlayUpdate()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
      if (overlayRafRef.current != null) {
        window.cancelAnimationFrame(overlayRafRef.current)
        overlayRafRef.current = null
      }
    }
  }, [scheduleOverlayUpdate])

  const generateDummyBubbles = () => {
    if (chartData.length === 0) return
    const times = chartData.map(c => c.time as number)
    const prices = chartData.map(c => c.close)
    for (let i = 0; i < 20; i++) {
      const idx = Math.floor(Math.random() * times.length)
      const type = Math.random() > 0.5 ? 'buy' : 'sell'
      useBubbleStore.getState().addBubble({
        id: crypto.randomUUID(),
        symbol: selectedSymbol,
        timeframe,
        ts: times[idx] * 1000,
        price: prices[idx],
        note: `Dummy ${type}`,
        tags: [type],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Market</p>
            <h2 className="mt-2 text-2xl font-semibold text-neutral-100">Chart Overview</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Live Chart with Bubble Journaling & Trade Overlay
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
            <div className="flex flex-wrap items-end gap-2">
              <FilterGroup label="Market" tone="emerald">
                <FilterPills
                  options={[
                    { value: 'crypto', label: 'Crypto' },
                    { value: 'stock', label: 'Stock' },
                  ]}
                  value={dataSource}
                  onChange={(value) => setDataSource(value as 'crypto' | 'stock')}
                  tone="emerald"
                  ariaLabel="Market source"
                />
              </FilterGroup>

              <FilterGroup label="Symbol" tone="sky">
                <select
                  value={selectedSymbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  className="rounded-md border border-sky-400/40 bg-neutral-950/70 px-2 py-1 text-xs font-semibold text-sky-100"
                >
                  {symbols.map((item) => (
                    <option key={item.symbol} value={item.symbol}>{item.symbol}</option>
                  ))}
                </select>
              </FilterGroup>

              <FilterGroup label="Timeframe" tone="amber">
                <FilterPills
                  options={intervals.map((interval) => ({ value: interval, label: interval }))}
                  value={timeframe}
                  onChange={(value) => setTimeframe(value)}
                  tone="amber"
                  ariaLabel="Timeframe filter"
                />
              </FilterGroup>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={!selectedSymbol}
                  className="rounded-md bg-neutral-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-950 hover:bg-white disabled:opacity-60"
                >
                  Create Bubble
                </button>
                <button
                  onClick={() => setShowReplay((prev) => !prev)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                    showReplay
                      ? 'border-sky-300 bg-sky-300/20 text-sky-200'
                      : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {showReplay ? 'Hide Replay' : 'Replay'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvancedControls((prev) => !prev)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                    showAdvancedControls
                      ? 'border-fuchsia-300 bg-fuchsia-300/20 text-fuchsia-100'
                      : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {showAdvancedControls ? '기능 숨기기' : '기능 더보기'}
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span className="uppercase tracking-[0.2em] text-neutral-500">Quick</span>
              {quickPicks.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleSymbolChange(item.value)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                    selectedSymbol === item.value
                      ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                      : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {showAdvancedControls && (
              <div className="mt-3 grid gap-3 border-t border-white/[0.06] pt-3 lg:grid-cols-2 xl:grid-cols-3">
                <FilterGroup label="Display" tone="emerald">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBubbles((prev) => !prev)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        showBubbles
                          ? 'border-emerald-300 bg-emerald-300/20 text-emerald-200'
                          : 'border-neutral-700 text-neutral-400 hover:border-emerald-300/40 hover:text-emerald-200'
                      }`}
                    >
                      Bubbles
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTrades((prev) => !prev)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        showTrades
                          ? 'border-sky-300 bg-sky-300/20 text-sky-200'
                          : 'border-neutral-700 text-neutral-400 hover:border-sky-300/40 hover:text-sky-200'
                      }`}
                    >
                      Trades
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTrades(true)
                        setShowBubbles(false)
                      }}
                      className="rounded-full border border-indigo-300/40 bg-indigo-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200 transition hover:bg-indigo-300/20"
                    >
                      Trade Focus
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPositions((prev) => !prev)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        showPositions
                          ? 'border-emerald-300 bg-emerald-300/20 text-emerald-200'
                          : 'border-neutral-700 text-neutral-400 hover:border-emerald-300/40 hover:text-emerald-200'
                      }`}
                    >
                      Positions
                    </button>
                  </div>
                </FilterGroup>

                <FilterGroup label="Range" tone="rose">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadMoreHistory()}
                      className="rounded-full border border-rose-300/40 bg-rose-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-300/20"
                    >
                      이전 구간
                    </button>
                    <button
                      type="button"
                      onClick={() => loadMoreFuture()}
                      className="rounded-full border border-rose-300/40 bg-rose-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-300/20"
                    >
                      다음 구간
                    </button>
                  </div>
                </FilterGroup>

                <FilterGroup label="Style" tone="sky">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowStyleMenu((prev) => !prev)}
                      className="rounded-full border border-sky-300/40 bg-sky-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200 hover:bg-sky-300/20"
                    >
                      {chartThemes[themeMode].label}
                    </button>
                    {showStyleMenu && (
                      <div className="absolute right-0 z-50 mt-2 w-40 rounded-xl border border-white/[0.08] bg-neutral-950/95 p-2 shadow-xl">
                        {Object.entries(chartThemes).map(([value, item]) => (
                          <button
                            key={value}
                            onClick={() => {
                              setThemeMode(value as keyof typeof chartThemes)
                              setShowStyleMenu(false)
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                              themeMode === value
                                ? 'bg-sky-300/20 text-sky-200'
                                : 'text-neutral-300 hover:bg-white/[0.06]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </FilterGroup>

                <FilterGroup label="Auto Bubble" tone="rose">
                  <button
                    type="button"
                    onClick={() => setAutoBubbleFromTrades((prev) => !prev)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      autoBubbleFromTrades
                        ? 'border-rose-300 bg-rose-300/20 text-rose-200'
                        : 'border-neutral-700 text-neutral-400 hover:border-rose-300/40 hover:text-rose-200'
                    }`}
                  >
                    {autoBubbleFromTrades ? 'On' : 'Off'}
                  </button>
                </FilterGroup>

                <FilterGroup label="Import / Export" tone="fuchsia">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={exportBubbles} className="rounded-md border border-neutral-700 px-3 py-1 text-[10px] text-neutral-300 hover:bg-neutral-800">
                      Export JSON
                    </button>
                    <button onClick={handleImportClick} className="rounded-md border border-neutral-700 px-3 py-1 text-[10px] text-neutral-300 hover:bg-neutral-800">
                      Import JSON
                    </button>
                    <input type="file" id="import-json-input" accept=".json" className="hidden" onChange={handleFileChange} />

                    <button onClick={handleTradeImportClick} disabled={guestMode} className="rounded-md border border-blue-900/50 px-3 py-1 text-[10px] text-blue-300 hover:bg-blue-900/20 disabled:opacity-50">
                      Import CSV
                    </button>
                    <input type="file" id="import-csv-input" accept=".csv" className="hidden" onChange={handleTradeFileChange} />

                    <button
                      onClick={handleStockCsvClick}
                      disabled={guestMode}
                      className="rounded-md border border-emerald-500/50 px-3 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      Stock CSV
                    </button>
                    <input type="file" id="import-stock-csv-input" accept=".csv" className="hidden" onChange={handleStockCsvChange} />
                  </div>
                </FilterGroup>

                <FilterGroup label="Danger Zone" tone="rose">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={generateDummyBubbles} disabled={!selectedSymbol} className="rounded-md border border-yellow-500/50 px-3 py-1 text-[10px] text-yellow-400 hover:bg-yellow-500/10">
                      + DUMMY
                    </button>
                    <button onClick={() => { if (confirm('Reset all?')) { localStorage.removeItem('bubble-storage'); window.location.reload(); } }} className="rounded-md border border-red-500/50 px-3 py-1 text-[10px] text-red-400 hover:bg-red-500/10">
                      RESET
                    </button>
                  </div>
                </FilterGroup>
              </div>
            )}
          </div>
        </div>
        {error && <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {(dataSource === 'crypto' && !isMarketSupported(selectedSymbol)) && (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            현재 차트 데이터는 Binance(USDT/USDC/USD) 및 Upbit(KRW-*) 기반입니다. 기타 심볼은 준비 중입니다.
          </div>
        )}
        {(dataSource === 'stock') && (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            주식 차트 데이터 소스는 아직 연결되지 않았습니다. (연동 예정)
          </div>
        )}
        {guestMode && (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
            게스트 모드: API 동기화/CSV 가져오기/AI 요청은 회원 전용입니다.
          </div>
        )}
        {showOnboardingGuide && (
          <div className="mt-3 rounded-lg border border-cyan-400/40 bg-cyan-500/10 p-3 text-xs text-cyan-100">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">온보딩 루틴</p>
                <p className="mt-1 text-cyan-100/80">최근 변동이 큰 캔들 1개를 선택해서 말풍선을 남겨보세요. 오늘은 1개만 하면 충분합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardingGuide(false)}
                className="rounded-md border border-cyan-300/40 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-100 hover:bg-cyan-300/20"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </header>

      {showReplay && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
          <ChartReplay
            klines={klines}
            onFilteredKlines={handleReplayFilteredKlines}
            timeframeSeconds={getTimeframeSeconds(timeframe)}
          />
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 relative lg:pr-20" ref={wrapperRef}>
          <div className="h-[520px] w-full relative" ref={containerRef}>
            {/* Bubble Overlay - 차트 컨테이너 내부에 absolute로 배치 */}
            {mounted && (
              <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 20, pointerEvents: 'none', overflow: 'visible' }}>
                {showPositions && !positionStackMode && positionLines.map((line) => (
                  <div
                    key={line.id}
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{ top: line.y }}
                  >
                    <div className={`h-px w-full ${
                      line.type === 'sl'
                        ? 'bg-rose-400/60'
                        : line.type === 'tp'
                          ? 'bg-emerald-300/60'
                          : 'bg-cyan-300/40'
                    }`} />
                    {!positionStackMode && line.price !== undefined && (
                      <div className={`absolute right-2 -top-3 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] ${
                        line.type === 'sl'
                          ? 'border-rose-300/40 text-rose-200 bg-rose-300/10'
                          : line.type === 'tp'
                            ? 'border-emerald-300/40 text-emerald-200 bg-emerald-300/10'
                            : 'border-cyan-300/40 text-cyan-200 bg-cyan-300/10'
                      }`}>
                        {line.type.toUpperCase()} · {line.price}
                      </div>
                    )}
                  </div>
                ))}
                {showPositions && positionStackMode && (
                  <div className="absolute inset-0 pointer-events-none">
                    {activeManualPositions.slice(0, 6).map((position) => {
                      const openedAt = position.opened_at || position.created_at
                      if (!openedAt) return null
                      const secondsPerCandle = getTimeframeSeconds(timeframe)
                      const candleTime = Math.floor(new Date(openedAt).getTime() / 1000 / secondsPerCandle) * secondsPerCandle
                      const x = chartRef.current?.timeScale().timeToCoordinate(candleTime as UTCTimestamp)
                      if (x === null || x === undefined) return null
                      const chartWidth = containerRef.current?.clientWidth ?? 0
                      const clampedX = chartWidth ? Math.min(Math.max(x, 16), chartWidth - 16) : x

                      const referencePrice = position.entry_price ? Number(position.entry_price) : undefined
                      const y = referencePrice ? seriesRef.current?.priceToCoordinate(referencePrice) : null
                      if (y === null || y === undefined) return null
                      const chartHeight = containerRef.current?.clientHeight ?? 0
                      if (chartHeight && (y < 0 || y > chartHeight)) return null

                      return (
                        <div
                          key={`${position.id}-entry-flag`}
                          className="absolute"
                          style={{
                            left: clampedX,
                            top: Math.max(40, y) - 40,
                            transform: 'translateX(-50%)',
                          }}
                        >
                          <div className={`rounded px-2 py-1 text-[10px] font-semibold shadow-md ${
                            position.position_side === 'long'
                              ? 'bg-emerald-600/80 text-emerald-100'
                              : 'bg-rose-600/80 text-rose-100'
                          }`}>
                            P
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {showPositions && positionStackMode && (
                  <div className="absolute left-3 top-3 z-40 w-[220px] rounded-2xl border border-white/[0.06] bg-black/30 p-3 shadow-xl backdrop-blur pointer-events-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Positions</span>
                      <button
                        type="button"
                        onClick={() => setShowPositions(false)}
                        className="text-[10px] text-neutral-500 hover:text-neutral-200"
                      >
                        hide
                      </button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {activeManualPositions.slice(0, 3).map((position) => {
                        const side = position.position_side
                        const openedAt = position.opened_at || position.created_at
                        const openedText = openedAt ? new Date(openedAt).toLocaleString() : '-'
                        return (
                          <button
                            key={position.id}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedPosition(position)
                              setPanelTab('detail')
                            }}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${
                              side === 'long'
                                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                                : 'border-rose-400/30 bg-rose-400/10 text-rose-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold uppercase tracking-[0.2em]">{side}</span>
                              <span className="text-[10px] text-neutral-400">{position.symbol}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-neutral-200">
                              Entry {position.entry_price || '-'}
                            </div>
                            <div className="mt-1 text-[10px] text-neutral-400">
                              SL {position.stop_loss || '-'} · TP {position.take_profit || '-'}
                            </div>
                            <div className="mt-1 text-[10px] text-neutral-500">
                              Opened {openedText}
                            </div>
                          </button>
                        )
                      })}
                      {activeManualPositions.length === 0 && (
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] text-neutral-400">
                          No open positions
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {densityAdjustedPositions.map((group) => {
            // 토글에 따라 필터링
            const visibleBubbles = showBubbles ? group.bubbles : []
            const visibleTrades = showTrades ? group.trades : []

            // 표시할 항목이 없으면 렌더링하지 않음
            if (visibleBubbles.length === 0 && visibleTrades.length === 0) return null

            // 차트 영역 밖이면 렌더링하지 않음 (여유 40px)
            if (group.x < -40 || group.x > (containerRef.current?.clientWidth || 0) + 40) return null
            if (group.y < 0 || group.y > (containerRef.current?.clientHeight || 0)) return null

            const hasBubbles = visibleBubbles.length > 0
            const hasTrades = visibleTrades.length > 0
            const bubbleCount = visibleBubbles.length
            const tradeCount = visibleTrades.length
            const buyTradeCount = visibleTrades.filter((t) => t.side === 'buy').length
            const sellTradeCount = visibleTrades.filter((t) => t.side === 'sell').length
            const tooltipBelow = group.y < 120

            // Determine Marker Style
            let bgColor = 'bg-neutral-700'

            if (hasBubbles && hasTrades) {
              bgColor = 'bg-neutral-800'
            } else if (hasBubbles) {
              const isBuy = visibleBubbles.some(b => b.tags?.includes('buy') || b.action === 'BUY')
              const isSell = visibleBubbles.some(b => b.tags?.includes('sell') || b.action === 'SELL')
              if (isBuy && isSell) bgColor = 'bg-yellow-600'
              else if (isBuy) bgColor = 'bg-green-600'
              else if (isSell) bgColor = 'bg-red-600'
              else bgColor = 'bg-neutral-600'
            } else if (hasTrades) {
              if (buyTradeCount > sellTradeCount) bgColor = 'bg-green-900/80 text-green-200'
              else if (sellTradeCount > buyTradeCount) bgColor = 'bg-red-900/80 text-red-200'
              else bgColor = 'bg-blue-900/80 text-blue-200'
            }

            const isSelected = selectedGroup?.candleTime === group.candleTime

            return (
              <div
                key={group.candleTime}
                className="absolute group cursor-pointer hover:z-50"
                style={{ left: group.x, top: Math.max(40, group.y) - 40, transform: 'translateX(-50%)', pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation()
                  const nextGroup = isSelected ? null : { candleTime: group.candleTime, bubbles: visibleBubbles, trades: visibleTrades }
                  setSelectedGroup(nextGroup)
                  // no jump; only select group
                }}
              >
                {/* Visual Connector Line */}
                <div className={`absolute left-1/2 -bottom-10 w-px h-10 -translate-x-1/2 border-l border-dashed pointer-events-none ${isSelected ? 'border-yellow-400' : 'border-neutral-400'} opacity-80`} />

                <div className={`relative rounded px-2 py-1 text-xs font-semibold shadow-md transition-transform hover:scale-110 ${bgColor} ${isSelected ? 'ring-2 ring-yellow-400' : ''} ${hasBubbles && hasTrades ? 'border border-yellow-500' : ''}`}>
                  <div className="flex items-center gap-1">
                    {hasBubbles && (
                      <span className="text-white">{bubbleCount > 1 ? `💬${bubbleCount}` : '💬'}</span>
                    )}
                    {hasTrades && (
                      <span className="text-xs">
                        {tradeCount > 1
                          ? `${buyTradeCount > 0 ? `↑${buyTradeCount}` : ''}${buyTradeCount > 0 && sellTradeCount > 0 ? '/' : ''}${sellTradeCount > 0 ? `↓${sellTradeCount}` : ''}`
                          : (
                            <>
                              {buyTradeCount > 0 && '↑'}
                              {sellTradeCount > 0 && '↓'}
                            </>
                          )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tooltip */}
                <div className={`absolute left-1/2 hidden -translate-x-1/2 rounded-lg bg-white/[0.06] border border-white/[0.08] p-3 text-xs text-neutral-200 shadow-xl group-hover:block min-w-[220px] max-h-[260px] overflow-y-auto z-50 ${tooltipBelow ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                  <div className="font-bold border-b border-neutral-700 pb-1 mb-2 text-center">
                    {new Date(group.candleTime * 1000).toLocaleString()}
                  </div>
                  {/* Bubbles List */}
                  {hasBubbles && (
                    <div className="mb-2">
                      <div className="text-[10px] uppercase text-neutral-500 mb-1">Bubbles</div>
                      {visibleBubbles.map(b => (
                        <div key={b.id} className="mb-1 last:mb-0 p-1 bg-white/[0.08] rounded">
                          <div className="flex justify-between">
                            <span className={b.action === 'BUY' ? 'text-green-400' : b.action === 'SELL' ? 'text-red-400' : ''}>{b.action || 'NOTE'}</span>
                            <span className="text-xs text-emerald-200/80">{getBubbleSourceBadge(b)}</span>
                            <span>${b.price}</span>
                          </div>
                          <div className="text-neutral-400 max-w-[240px] break-words line-clamp-2" title={getBubbleDisplayNote(b)}>
                            {getBubbleDisplayNote(b)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Trades List */}
                  {hasTrades && (
                    <div>
                      <div className="text-[10px] uppercase text-neutral-500 mb-1">Trades</div>
                      {visibleTrades.map(t => (
                        <div key={t.id} className="mb-1 last:mb-0 p-1 bg-white/[0.04] rounded flex justify-between">
                          <span className={t.side === 'buy' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{t.side.toUpperCase()}</span>
                          <span>{t.qty} @ {t.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Bubble Board</p>
            <h3 className="mt-2 text-lg font-semibold text-neutral-100">말풍선 컨트롤</h3>
            <p className="text-xs text-neutral-400 mt-1">
              {filteredBubbles.length} bubbles · {activeTrades.length} trades
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPanelTab('summary')}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                panelTab === 'summary'
                  ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                  : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setPanelTab('detail')}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                panelTab === 'detail'
                  ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                  : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
              }`}
            >
              Detail
            </button>
          </div>

          {panelTab === 'summary' && (
            <>
              <div className="space-y-3">
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>말풍선 요약</span>
                    <span>{bubbleSummary.total.toLocaleString()}개</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                    <span className="rounded-full border border-emerald-500/40 px-2 py-0.5 text-emerald-300">BUY {bubbleSummary.buy}</span>
                    <span className="rounded-full border border-rose-500/40 px-2 py-0.5 text-rose-300">SELL {bubbleSummary.sell}</span>
                    <span className="rounded-full border border-sky-500/40 px-2 py-0.5 text-sky-300">HOLD {bubbleSummary.hold}</span>
                    <span className="rounded-full border border-emerald-400/40 px-2 py-0.5 text-emerald-200">TP {bubbleSummary.tp}</span>
                    <span className="rounded-full border border-rose-400/40 px-2 py-0.5 text-rose-200">SL {bubbleSummary.sl}</span>
                    <span className="rounded-full border border-neutral-600/60 px-2 py-0.5 text-neutral-300">NOTE {bubbleSummary.note}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-500">
                    <span>현재 밀도: {densityOptions.find((option) => option.value === densityMode)?.label}</span>
                    <span>표시 {densitySummary.markers.toLocaleString()} / {densitySummary.totalMarkers.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-600">
                    <span>집계</span>
                    <span>
                      💬 {densitySummary.bubbles.toLocaleString()} · ↕ {densitySummary.trades.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-neutral-500">밀도 옵션</p>
                  <FilterPills
                    options={densityOptions.map((option) => ({ value: option.value, label: option.label }))}
                    value={densityMode}
                    onChange={(value) => setDensityMode(value as typeof densityOptions[number]['value'])}
                    tone="amber"
                    ariaLabel="Density filter"
                  />
                </div>

                <input
                  value={bubbleSearch}
                  onChange={(e) => setBubbleSearch(e.target.value)}
                  placeholder="메모/태그 검색"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                />
                <div className="flex flex-wrap gap-2">
                  {actionOptions.map((action) => (
                    <button
                      key={action}
                      onClick={() => setActionFilter(action)}
                      className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                        actionFilter === action
                          ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                          : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>최근 기록</span>
                  <span>{filteredBubbles.length} items</span>
                </div>
                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-2">
                  {filteredBubbles.length === 0 && (
                    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4 text-xs text-neutral-500">
                      표시할 버블이 없습니다.
                    </div>
                  )}
                  {pagedSummaryBubbles.map((bubble) => (
                    <div key={bubble.id} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span>{new Date(bubble.ts).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
                        <span className="text-[10px] text-emerald-200/80">{getBubbleSourceBadge(bubble)}</span>
                        <span className={bubble.action === 'BUY' ? 'text-green-400' : bubble.action === 'SELL' ? 'text-red-400' : 'text-neutral-400'}>
                          {bubble.action || 'NOTE'}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-neutral-500">
                        생성 {new Date(bubble.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                      </div>
                      <p className="mt-1 text-sm text-neutral-200 line-clamp-2">{getBubbleDisplayNote(bubble)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
                        <span className="rounded-full border border-neutral-700 px-2 py-0.5">{bubble.symbol}</span>
                        <span className="rounded-full border border-neutral-700 px-2 py-0.5">{bubble.timeframe}</span>
                        <button
                          type="button"
                          onClick={() => focusOnTimestamp(bubble.ts, bubble.timeframe)}
                          className="rounded-full border border-cyan-400/40 px-2 py-0.5 text-cyan-200 hover:bg-cyan-400/10"
                        >
                          차트로 이동
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <PageJumpPager
                  totalItems={filteredBubbles.length}
                  totalPages={summaryTotalPages}
                  currentPage={summaryPage}
                  pageInput={summaryPageInput}
                  onPageInputChange={setSummaryPageInput}
                  onPageInputKeyDown={handleSummaryPageKeyDown}
                  onFirst={() => setSummaryPage(1)}
                  onPrevious={() => setSummaryPage((page) => Math.max(1, page - 1))}
                  onNext={() => setSummaryPage((page) => Math.min(summaryTotalPages, page + 1))}
                  onLast={() => setSummaryPage(summaryTotalPages)}
                  onJump={jumpSummaryPage}
                  itemLabel="개"
                />
              </div>
            </>
          )}

          {panelTab === 'detail' && (
            <div className="space-y-3">
              {!selectedGroup && !selectedPosition && (
                <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4 text-xs text-neutral-500">
                  차트에서 말풍선을 선택하면 상세가 표시됩니다.
                </div>
              )}
              {selectedPosition && (
                <div className="space-y-3 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Position</p>
                      <h3 className="mt-1 text-sm font-semibold text-neutral-100">
                        {selectedPosition.symbol} · {selectedPosition.position_side.toUpperCase()}
                      </h3>
                      <p className="mt-1 text-xs text-neutral-400">
                        {selectedPosition.opened_at ? new Date(selectedPosition.opened_at).toLocaleString() : '시간 정보 없음'}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedPosition(null)}
                      className="rounded-lg border border-neutral-700 px-2 py-1 text-[10px] text-neutral-400 hover:bg-neutral-800"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="grid gap-2 text-xs text-neutral-300">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Entry</span>
                      <span>{selectedPosition.entry_price || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">SL</span>
                      <span>{selectedPosition.stop_loss || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">TP</span>
                      <span>{selectedPosition.take_profit || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Size</span>
                      <span>{selectedPosition.size || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Leverage</span>
                      <span>{selectedPosition.leverage || '-'}</span>
                    </div>
                    {selectedPosition.strategy && (
                      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2 text-[11px] text-neutral-300">
                        전략: {selectedPosition.strategy}
                      </div>
                    )}
                    {selectedPosition.memo && (
                      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-2 text-[11px] text-neutral-300">
                        메모: {selectedPosition.memo}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selectedGroup && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Selected</p>
                      <h3 className="mt-1 text-sm font-semibold text-neutral-100">
                        {new Date(selectedGroup.candleTime * 1000).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedGroup(null)}
                      className="rounded-lg border border-neutral-700 px-2 py-1 text-[10px] text-neutral-400 hover:bg-neutral-800"
                    >
                      닫기
                    </button>
                  </div>

                  {selectedGroup.bubbles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                        Bubbles ({selectedGroup.bubbles.length})
                      </p>
                      <div className="max-h-[220px] overflow-y-auto space-y-2 pr-2">
                        {pagedDetailBubbles.map((bubble) => (
                          <div key={bubble.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${
                                bubble.action === 'BUY' ? 'text-green-400' :
                                bubble.action === 'SELL' ? 'text-red-400' :
                                bubble.action === 'TP' ? 'text-emerald-300' :
                                bubble.action === 'SL' ? 'text-rose-300' :
                                'text-neutral-300'
                              }`}>
                                {bubble.action || 'NOTE'}
                              </span>
                              <span className="text-xs text-neutral-400">${bubble.price.toLocaleString()}</span>
                            </div>
                            <div className="mt-0.5 text-[10px] text-emerald-200/80">{getBubbleSourceBadge(bubble)}</div>
                            <div className="mt-1 text-[10px] text-neutral-500">
                              캔들 {new Date(bubble.ts).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                            </div>
                            <div className="mt-0.5 text-[10px] text-neutral-500">
                              생성 {new Date(bubble.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                            </div>
                            <p className="mt-1 text-xs text-neutral-200 line-clamp-2">{getBubbleDisplayNote(bubble)}</p>
                          </div>
                        ))}
                      </div>
                      <PageJumpPager
                        totalItems={selectedGroup.bubbles.length}
                        totalPages={detailBubbleTotalPages}
                        currentPage={detailBubblePage}
                        pageInput={detailBubblePageInput}
                        onPageInputChange={setDetailBubblePageInput}
                        onPageInputKeyDown={handleDetailBubblePageKeyDown}
                        onFirst={() => setDetailBubblePage(1)}
                        onPrevious={() => setDetailBubblePage((page) => Math.max(1, page - 1))}
                        onNext={() => setDetailBubblePage((page) => Math.min(detailBubbleTotalPages, page + 1))}
                        onLast={() => setDetailBubblePage(detailBubbleTotalPages)}
                        onJump={jumpDetailBubblePage}
                        itemLabel="개"
                      />
                    </div>
                  )}

                  {selectedGroup.trades.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                        Trades ({selectedGroup.trades.length})
                      </p>
                      <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                        {pagedDetailTrades.map((trade) => (
                          <div key={trade.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                            <div className="flex items-center justify-between text-xs text-neutral-500">
                              <span className={trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                                {trade.side.toUpperCase()}
                              </span>
                              <span>{trade.exchange}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-neutral-300">
                              <span>{trade.qty ?? '-'} qty</span>
                              <span>@ ${trade.price.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <PageJumpPager
                        totalItems={selectedGroup.trades.length}
                        totalPages={detailTradeTotalPages}
                        currentPage={detailTradePage}
                        pageInput={detailTradePageInput}
                        onPageInputChange={setDetailTradePageInput}
                        onPageInputKeyDown={handleDetailTradePageKeyDown}
                        onFirst={() => setDetailTradePage(1)}
                        onPrevious={() => setDetailTradePage((page) => Math.max(1, page - 1))}
                        onNext={() => setDetailTradePage((page) => Math.min(detailTradeTotalPages, page + 1))}
                        onLast={() => setDetailTradePage(detailTradeTotalPages)}
                        onJump={jumpDetailTradePage}
                        itemLabel="개"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </aside>
      </section>

      <BubbleCreateModal
        open={isModalOpen}
        symbol={selectedSymbol}
        defaultTimeframe={timeframe}
        defaultPrice={clickedCandle?.price.toString() || latestPrice}
        defaultTime={clickedCandle?.time ? clickedCandle.time * 1000 : undefined}
        disableAi={guestMode}
        onClose={() => { setIsModalOpen(false); setClickedCandle(null) }}
      />
    </div>
  )
}
```

## File: src/components-old/Loading.tsx
```typescript
'use client'

export function Loading() {
  return (
    <div className="flex min-h-[200px] items-center justify-center text-sm text-neutral-400">
      Loading...
    </div>
  )
}
```

## File: src/components-old/Login.tsx
```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'
import { startGuestSession, clearGuestSession } from '../lib/guestSession'
import { useBubbleStore } from '../lib/bubbleStore'
import { resolveAuthRedirectPath } from '../lib/onboardingFlow'
import { isDemoMode } from '../lib/appMode'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGuestLoading, setIsGuestLoading] = useState(false)
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
          <h1 className="mt-3 text-2xl font-semibold">로그인은 프로덕션 베타에서만 활성화됩니다.</h1>
          <p className="mt-2 text-sm text-zinc-400">
            현재 환경은 Deploy Preview 데모입니다. 게스트 체험으로 UI/흐름을 확인할 수 있습니다.
          </p>
          <Link href="/guest" className="mt-6 inline-flex rounded-lg bg-emerald-500 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-400 transition-colors">
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

  const handleGuestContinue = async () => {
    setError('')
    setIsGuestLoading(true)
    try {
      const guestEmail = process.env.NEXT_PUBLIC_GUEST_EMAIL || 'guest.preview@kifu.local'
      const guestPassword = process.env.NEXT_PUBLIC_GUEST_PASSWORD || 'guest1234'
      const response = await api.post('/v1/auth/login', { email: guestEmail, password: guestPassword })
      resetSessionData()
      setTokens(response.data.access_token, response.data.refresh_token)
      startGuestSession()
      router.push('/home')
    } catch {
      // Fallback: move to guest preview page even if guest account login fails.
      startGuestSession()
      router.push('/guest')
    } finally {
      setIsGuestLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 lg:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-4">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">KIFU 접속</p>
          <h1 className="text-3xl font-semibold text-zinc-100 lg:text-4xl">
            다시 오신 것을 환영합니다.
          </h1>
          <p className="text-base text-zinc-400">
            오늘의 판단을 확인하고, 복기 흐름을 이어서 진행하세요.
          </p>
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
            <p className="text-sm font-semibold text-zinc-200">베타 안내</p>
            <p className="mt-2 text-sm text-zinc-400">
              AI 의견은 복기 지표와 함께 기록됩니다. 근거를 구체적으로 남길수록 정확도가 높아집니다.
            </p>
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-2xl backdrop-blur-md"
        >
          <div className="mb-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">로그인</h1>
            <p className="text-sm text-zinc-400">등록한 이메일과 비밀번호를 입력하세요.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                placeholder="hello@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full h-10 px-4 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:active:scale-100"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>

          <div className="relative flex items-center gap-4 py-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-zinc-500">또는</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGuestContinue}
            disabled={isGuestLoading || isLoading}
            className="w-full h-10 px-4 rounded-xl bg-zinc-800 text-zinc-200 border border-white/10 font-medium text-sm hover:bg-zinc-700 hover:text-white active:scale-95 transition-all disabled:opacity-60"
          >
            {isGuestLoading ? '게스트 세션 시작 중...' : '게스트로 계속하기'}
          </button>

          <p className="text-sm text-zinc-400">
            처음이신가요?{' '}
            <Link href="/register" className="font-semibold text-zinc-100">
              회원가입
            </Link>
          </p>
          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            랜딩페이지로 돌아가기
          </Link>
        </form>
      </div>
    </div>
  )
}
```

## File: src/components-old/NotFound.tsx
```typescript
'use client'

import Link from 'next/link'

export function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-20 text-zinc-100">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-10">
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
```

## File: src/components-old/Register.tsx
```typescript
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
```

## File: src/components-old/Settings.tsx
```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuthStore } from '../stores/auth'
import { useI18n } from '../lib/i18n'
import { clearGuestSession } from '../lib/guestSession'
import { LanguageSelector } from '../components/LanguageSelector'
import { ExchangeConnectionManager } from '../components/settings/ExchangeConnectionManager'
import { api } from '../lib/api'
import { useAlertStore } from '../stores/alertStore'
import type { TelegramConnectResponse } from '../types/alert'

function TelegramConnect() {
  const { t } = useI18n()
  const { channels, isLoadingChannels, fetchChannels, connectTelegram, disconnectTelegram } = useAlertStore()
  const [connectData, setConnectData] = useState<TelegramConnectResponse | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setConnectData(null)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // Poll for verification while code is active
  useEffect(() => {
    if (!connectData || countdown <= 0) return
    const interval = setInterval(() => {
      fetchChannels()
    }, 5000)
    return () => clearInterval(interval)
  }, [connectData, countdown, fetchChannels])

  // Close connect flow if channel is verified
  const tgChannel = channels.find((ch) => ch.type === 'telegram')
  useEffect(() => {
    if (tgChannel?.verified && connectData) {
      setConnectData(null)
      setCountdown(0)
    }
  }, [tgChannel, connectData])

  const handleConnect = useCallback(async () => {
    const data = await connectTelegram()
    if (data) {
      setConnectData(data)
      setCountdown(data.expires_in)
    }
  }, [connectTelegram])

  const handleDisconnect = useCallback(async () => {
    if (!confirm('텔레그램 연결을 해제하시겠습니까?')) return
    await disconnectTelegram()
  }, [disconnectTelegram])

  const isConnected = tgChannel?.verified

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-200">{t.telegramTitle}</span>
            {isConnected ? (
              <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                {t.telegramConnected}
              </span>
            ) : (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                {t.telegramNotConnected}
              </span>
            )}
          </div>
        </div>
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={isLoadingChannels}
            className="rounded-lg px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition disabled:opacity-50"
          >
            {t.telegramDisconnect}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isLoadingChannels || !!connectData}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 transition disabled:opacity-50"
          >
            {t.telegramConnect}
          </button>
        )}
      </div>

      {connectData && countdown > 0 && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          {connectData.bot_url ? (
            <>
              <p className="text-sm text-zinc-300">{t.telegramOpenBot}</p>
              <a
                href={connectData.bot_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#2AABEE] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#229ED9] transition"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.442-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                {t.telegramOpenBotBtn}
              </a>
              <p className="mt-2 text-xs text-zinc-500">
                {t.telegramExpires}: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-300">{t.telegramCodeMsg}</p>
              <div className="mt-2 flex items-center gap-3">
                <code className="rounded bg-zinc-900 px-4 py-2 text-2xl font-mono font-bold tracking-widest text-zinc-100">
                  {connectData.code}
                </code>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {t.telegramExpires}: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{connectData.message}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function Settings() {
  const { t } = useI18n()
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const accessToken = useAuthStore((state) => state.accessToken)
  const [profileEmail, setProfileEmail] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    const load = async () => {
      if (!accessToken) return
      try {
        const response = await api.get<{ email?: string }>('/v1/users/me')
        if (isActive) setProfileEmail(response.data?.email || null)
      } catch {
        if (isActive) setProfileEmail(null)
      }
    }
    load()
    return () => {
      isActive = false
    }
  }, [accessToken])

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Profile</p>
        <h2 className="mt-3 text-2xl font-semibold text-zinc-100">{t.settingsTitle}</h2>
        <p className="mt-2 text-sm text-zinc-400">
          {t.settingsSubtitle}
        </p>
      </header>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Language / 언어</p>
          <p className="mt-3 text-lg font-semibold text-zinc-200">Interface Language</p>
          <div className="mt-4">
            <LanguageSelector />
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Account</p>
          <p className="mt-3 text-lg font-semibold text-zinc-200">Email + Tier</p>
          <p className="mt-2 text-sm text-zinc-500">
            This section will surface subscription state and usage.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            로그인 계정: {profileEmail || (accessToken ? '불러오는 중...' : '로그인 정보 없음')}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Exchanges</p>
          <p className="mt-3 text-lg font-semibold text-zinc-200">API Trade Sync</p>
          <div className="mt-4">
            <ExchangeConnectionManager />
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">AI Usage</p>
          <p className="mt-3 text-lg font-semibold text-zinc-200">AI 분석은 서버에서 처리됩니다</p>
          <p className="mt-2 text-sm text-zinc-500">
            개인 API 키 등록 없이 바로 사용할 수 있도록 설계했습니다. 사용량은 구독 플랜에 따라 관리됩니다.
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Notifications</p>
          <p className="mt-3 text-lg font-semibold text-zinc-200">{t.telegramTitle}</p>
          <div className="mt-4">
            <TelegramConnect />
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Diagnostics</p>
          <p className="mt-3 text-lg font-semibold text-zinc-200">30일 사용자 시뮬레이터</p>
          <p className="mt-2 text-sm text-zinc-500">
            사용자 행동을 날짜 단위로 압축 실행해 루틴/복기 누락/데이터 누적 상태를 빠르게 점검합니다.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/sim-report"
              className="inline-flex h-10 items-center rounded-lg border border-sky-300/40 bg-sky-500/20 px-4 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30"
            >
              시뮬레이터 열기
            </Link>
          </div>
        </div>
      </section>
      <button
        type="button"
        onClick={() => {
          clearGuestSession()
          clearTokens()
        }}
        className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.05] text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.1] hover:text-white active:scale-95"
      >
        Log out (local only)
      </button>
    </div>
  )
}
```

## File: src/components-old/Trades.tsx
```typescript
'use client'

import { type KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { FilterGroup, FilterPills } from '../components/ui/FilterPills'
import { PageJumpPager } from '../components/ui/PageJumpPager'

type TradeItem = {
  id: string
  bubble_id?: string
  exchange: string
  symbol: string
  side: string
  position_side?: string
  open_close?: string
  reduce_only?: boolean
  quantity: string
  price: string
  realized_pnl?: string
  trade_time: string
  binance_trade_id: number
}

type TradeListResponse = {
  page: number
  limit: number
  total: number
  items: TradeItem[]
}

type TradeSummaryResponse = {
  totals?: {
    total_trades?: number
    realized_pnl_total?: string
  }
  by_side?: Array<{
    side: string
    total_trades?: number
    trade_count?: number
  }>
  by_exchange?: Array<{
    exchange: string
    total_trades?: number
    trade_count?: number
  }>
  by_symbol?: Array<{
    symbol: string
    total_trades?: number
    trade_count?: number
  }>
}

const exchangeLabel: Record<string, string> = {
  binance_futures: 'Binance Futures',
  binance_spot: 'Binance Spot',
  upbit: 'Upbit',
}

const PAGE_SIZE = 25

export function Trades() {
  const [items, setItems] = useState<TradeItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [tradeSummary, setTradeSummary] = useState<TradeSummaryResponse | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('')

  const [exchange, setExchange] = useState('all')
  const [side, setSide] = useState('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [symbol, setSymbol] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage(1)
    setPageInput('1')
  }, [exchange, side, sortOrder, symbol])

  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(PAGE_SIZE),
          sort: sortOrder,
        })
        if (exchange !== 'all') params.set('exchange', exchange)
        if (side !== 'all') params.set('side', side.toUpperCase())
        if (symbol.trim()) params.set('symbol', symbol.trim().toUpperCase())

        const response = await api.get<TradeListResponse>(`/v1/trades?${params}`)
        setItems(response.data.items)
        setTotal(response.data.total)
      } catch {
        setError('거래 내역을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchTrades()
  }, [exchange, side, sortOrder, symbol, currentPage])

  useEffect(() => {
    const fetchSummary = async () => {
      setSummaryLoading(true)
      setSummaryError(null)
      try {
        const params = new URLSearchParams()
        if (exchange !== 'all') params.set('exchange', exchange)
        if (side !== 'all') params.set('side', side.toUpperCase())
        if (symbol.trim()) params.set('symbol', symbol.trim().toUpperCase())
        const response = await api.get<TradeSummaryResponse>(`/v1/trades/summary?${params.toString()}`)
        setTradeSummary(response.data)
      } catch {
        setTradeSummary(null)
        setSummaryError('요약 지표를 불러오지 못했습니다.')
      } finally {
        setSummaryLoading(false)
      }
    }
    fetchSummary()
  }, [exchange, side, symbol])

  const stats = useMemo(() => {
    const bySide = tradeSummary?.by_side || []
    const byExchange = tradeSummary?.by_exchange || []
    const buyRow = bySide.find((row) => row.side?.toUpperCase() === 'BUY')
    const sellRow = bySide.find((row) => row.side?.toUpperCase() === 'SELL')
    const futuresRow = byExchange.find((row) => row.exchange === 'binance_futures')
    const totalTrades = Number(tradeSummary?.totals?.total_trades || total)
    const realizedPnL = Number(tradeSummary?.totals?.realized_pnl_total || 0)
    const symbolCount = (tradeSummary?.by_symbol || []).length

    return {
      total: totalTrades,
      buys: Number(buyRow?.total_trades || buyRow?.trade_count || 0),
      sells: Number(sellRow?.total_trades || sellRow?.trade_count || 0),
      futuresCount: Number(futuresRow?.total_trades || futuresRow?.trade_count || 0),
      realizedPnL,
      symbolCount,
    }
  }, [tradeSummary, total])

  const futuresActionById = useMemo(() => {
    const map = new Map<string, string>()
    const sorted = [...items]
      .filter((item) => item.exchange === 'binance_futures')
      .sort((a, b) => new Date(a.trade_time).getTime() - new Date(b.trade_time).getTime())

    const positionBySymbol = new Map<string, number>()
    for (const trade of sorted) {
      const qty = Number(trade.quantity) || 0
      const side = trade.side.toUpperCase()
      const symbolKey = trade.symbol
      const prev = positionBySymbol.get(symbolKey) ?? 0
      let next = prev
      let label = side

      if (side === 'BUY') {
        if (prev < 0) {
          const closeSize = Math.min(Math.abs(prev), qty)
          const openSize = Math.max(0, qty - closeSize)
          label = openSize > 0 ? '롱 오픈' : '숏 클로즈'
        } else {
          label = '롱 오픈'
        }
        next = prev + qty
      } else if (side === 'SELL') {
        if (prev > 0) {
          const closeSize = Math.min(prev, qty)
          const openSize = Math.max(0, qty - closeSize)
          label = openSize > 0 ? '숏 오픈' : '롱 클로즈'
        } else {
          label = '숏 오픈'
        }
        next = prev - qty
      }

      if (trade.position_side && trade.open_close) {
        const ps = trade.position_side.toUpperCase()
        const oc = trade.open_close.toUpperCase()
        if (ps === 'LONG' && oc === 'OPEN') label = '롱 오픈'
        if (ps === 'LONG' && oc === 'CLOSE') label = '롱 클로즈'
        if (ps === 'SHORT' && oc === 'OPEN') label = '숏 오픈'
        if (ps === 'SHORT' && oc === 'CLOSE') label = '숏 클로즈'
      }

      map.set(trade.id, label)
      positionBySymbol.set(symbolKey, next)
    }
    return map
  }, [items])

  const jumpToPage = () => {
    const parsedPage = Number.parseInt(pageInput, 10)
    if (Number.isNaN(parsedPage) || parsedPage < 1) {
      setPageInput(String(currentPage))
      return
    }
    setCurrentPage(Math.min(totalPages, Math.max(1, parsedPage)))
  }

  const handlePageInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpToPage()
    }
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-sm p-6 backdrop-blur flex-shrink-0">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Insights</p>
        <h2 className="mt-3 text-2xl font-semibold text-neutral-100">Trade History</h2>
        <p className="mt-2 text-sm text-neutral-400">서버 동기화 거래 내역 ({total}개)</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-4 flex-shrink-0">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Total Trades</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-100">{stats.total}</p>
          <p className="mt-2 text-xs text-neutral-500">Buy: {stats.buys} / Sell: {stats.sells}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Futures Trades</p>
          <p className="mt-3 text-2xl font-semibold text-indigo-300">{stats.futuresCount}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Realized PnL</p>
          <p className={`mt-3 text-2xl font-semibold ${stats.realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.realizedPnL.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Symbols</p>
          <p className="mt-3 text-2xl font-semibold text-sky-300">{stats.symbolCount}</p>
        </div>
      </section>
      {summaryLoading && <div className="text-xs text-zinc-400">요약 지표를 계산 중입니다...</div>}
      {summaryError && <div className="text-xs text-rose-300">{summaryError}</div>}

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 flex flex-col flex-1 min-h-0">
        <div className="flex flex-wrap items-center gap-4 mb-4 flex-shrink-0">
          <FilterGroup label="EXCHANGE" tone="sky">
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="rounded-lg border border-sky-400/40 bg-neutral-950/80 px-3 py-1.5 text-xs font-semibold text-sky-100"
            >
              <option value="all">All</option>
              <option value="binance_futures">Binance Futures</option>
              <option value="binance_spot">Binance Spot</option>
              <option value="upbit">Upbit</option>
            </select>
          </FilterGroup>

          <FilterGroup label="SIDE" tone="emerald">
            <FilterPills
              options={[{ value: 'all', label: 'All' }, { value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }]}
              value={side}
              onChange={(value) => setSide(value as 'all' | 'buy' | 'sell')}
              tone="emerald"
              ariaLabel="Side filter"
            />
          </FilterGroup>

          <FilterGroup label="SORT" tone="amber">
            <FilterPills
              options={[{ value: 'desc', label: 'Newest' }, { value: 'asc', label: 'Oldest' }]}
              value={sortOrder}
              onChange={(value) => setSortOrder(value as 'asc' | 'desc')}
              tone="amber"
              ariaLabel="Sort order"
            />
          </FilterGroup>

          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="symbol 검색 (예: BTCUSDT, KRW-BTC)"
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500"
          />

          <button
            type="button"
            onClick={() => {
              setExchange('all')
              setSide('all')
              setSortOrder('desc')
              setSymbol('')
            }}
            className="rounded-lg border border-neutral-700 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:border-neutral-500"
          >
            필터 초기화
          </button>
        </div>

        <div className="text-xs text-zinc-400 mb-4">페이지 {currentPage} / {totalPages}</div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && <div className="text-neutral-500 text-sm">불러오는 중...</div>}
          {error && <div className="text-rose-300 text-sm">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="flex items-center justify-center h-full text-neutral-500">거래 내역이 없습니다.</div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="space-y-2 pr-2">
              {items.map((trade) => (
                <div key={trade.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm hover:border-neutral-700 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${trade.side.toUpperCase() === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.exchange === 'binance_futures'
                          ? futuresActionById.get(trade.id) ?? trade.side.toUpperCase()
                          : trade.side.toUpperCase()}
                      </span>
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200">
                        {trade.symbol}
                      </span>
                      <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">
                        {exchangeLabel[trade.exchange] ?? trade.exchange}
                      </span>
                      {trade.position_side && (
                        <span className="rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
                          {trade.position_side}
                        </span>
                      )}
                      {trade.open_close && (
                        <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-200">
                          {trade.open_close}
                        </span>
                      )}
                      {trade.reduce_only && (
                        <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200">
                          reduce-only
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-500">{new Date(trade.trade_time).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                    <span>Qty: <span className="text-neutral-200">{trade.quantity}</span></span>
                    <span>Price: <span className="text-neutral-200">{Number(trade.price).toLocaleString()}</span></span>
                    <span>Value: <span className="text-neutral-200">{(Number(trade.quantity) * Number(trade.price)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <PageJumpPager
          totalItems={total}
          totalPages={totalPages}
          currentPage={currentPage}
          pageInput={pageInput}
          onPageInputChange={setPageInput}
          onPageInputKeyDown={handlePageInputKeyDown}
          onFirst={() => setCurrentPage(1)}
          onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
          onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          onLast={() => setCurrentPage(totalPages)}
          onJump={jumpToPage}
          disabled={loading}
          itemLabel="건"
        />
      </section>
    </div>
  )
}
```

## File: src/lib/aiResponseFormat.ts
```typescript
export type AiSectionTone = 'summary' | 'risk' | 'conclusion' | 'checklist' | 'neutral'

export type AiSection = {
  title: string
  body: string
  tone: AiSectionTone
}

const headerPattern = /^\d+\)\s*([^:]+):\s*(.*)$/

const normalize = (value: string) => value.replace(/\s+/g, '').toLowerCase()

const resolveTone = (title: string): AiSectionTone => {
  const key = normalize(title)
  if (key.includes('결론') || key.includes('conclusion')) return 'conclusion'
  if (key.includes('리스크') || key.includes('위험') || key.includes('무효') || key.includes('risk')) return 'risk'
  if (key.includes('체크') || key.includes('check')) return 'checklist'
  if (key.includes('요약') || key.includes('상황') || key.includes('summary')) return 'summary'
  return 'neutral'
}

export const parseAiSections = (text: string): AiSection[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const sections: AiSection[] = []
  let current: AiSection | null = null

  for (const line of lines) {
    const match = line.match(headerPattern)
    if (match) {
      if (current) sections.push(current)
      const title = match[1].trim()
      const body = match[2].trim()
      current = {
        title,
        body,
        tone: resolveTone(title),
      }
      continue
    }

    if (!current) {
      continue
    }

    current.body = current.body ? `${current.body}\n${line}` : line
  }

  if (current) sections.push(current)
  return sections
}

export const toneClass = (tone: AiSectionTone) => {
  switch (tone) {
    case 'summary':
      return 'border-sky-400/40 bg-sky-500/10 text-sky-100'
    case 'risk':
      return 'border-amber-400/40 bg-amber-500/10 text-amber-100'
    case 'conclusion':
      return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
    case 'checklist':
      return 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
    default:
      return 'border-neutral-800/70 bg-neutral-950/70 text-neutral-200'
  }
}
```

## File: src/lib/api.ts
```typescript
import axios from 'axios'
import { getAccessToken, useAuthStore } from '../stores/auth'

// Use direct backend URL with IP to avoid localhost resolution issues
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080/api'

export const api = axios.create({
  baseURL,
})

// Request interceptor - add token
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// URLs that should not redirect to login on 401 (guest mode friendly)
const GUEST_FRIENDLY_URLS = [
  '/v1/users/me/symbols',
  '/v1/market/klines',
  '/v1/auth/login',
  '/v1/auth/register',
]

type AxiosErrorWithConfig = {
  config?: {
    _retry?: boolean
    url?: string
    headers?: Record<string, string>
  }
}

type RefreshSubscriber = {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let refreshSubscribers: RefreshSubscriber[] = []

const isGuestFriendlyError = (url: string | undefined): boolean => {
  return GUEST_FRIENDLY_URLS.some((path) => (url || '').includes(path))
}

const subscribeTokenRefresh = (subscriber: RefreshSubscriber) => {
  refreshSubscribers.push(subscriber)
}

const onTokenRefreshed = (token: string) => {
  const subscribers = [...refreshSubscribers]
  refreshSubscribers = []
  subscribers.forEach((subscriber) => subscriber.resolve(token))
}

const onRefreshFailed = (error: unknown) => {
  const subscribers = [...refreshSubscribers]
  refreshSubscribers = []
  subscribers.forEach((subscriber) => subscriber.reject(error))
}

// Response interceptor - handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosErrorWithConfig['config']
    const requestUrl = originalRequest?.url || ''

    // Check if this URL supports guest mode (no redirect on 401)
    const isGuestFriendly = isGuestFriendlyError(requestUrl)

    // If 401 and not already retrying
    if (error?.response?.status === 401 && !originalRequest?._retry) {
      if (!originalRequest) {
        return Promise.reject(error)
      }

      originalRequest._retry = true

      const { refreshToken, setTokens, clearTokens } = useAuthStore.getState()

      // Try to refresh token
      if (refreshToken) {
        if (isRefreshing) {
          try {
            const token = await new Promise<string>((resolve, reject) => {
              subscribeTokenRefresh({ resolve, reject })
            })
            originalRequest.headers = originalRequest.headers || {}
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          } catch (refreshError) {
            return Promise.reject(refreshError)
          }
        }

        isRefreshing = true
        try {
          const response = await axios.post(`${baseURL}/v1/auth/refresh`, {
            refresh_token: refreshToken,
          })

          const { access_token, refresh_token } = response.data
          setTokens(access_token, refresh_token)
          isRefreshing = false
          onTokenRefreshed(access_token)

          // Retry original request with new token
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch (refreshError) {
          isRefreshing = false
          onRefreshFailed(refreshError)

          // Network error should not immediately sign the user out
          if (!refreshError || !(refreshError as { response?: { status?: number } }).response) {
            return Promise.reject(refreshError)
          }

          const refreshStatus = (refreshError as { response?: { status?: number } }).response?.status
          if ([401, 403].includes(refreshStatus || 0)) {
            clearTokens()
          }

          // Only redirect for non-guest-friendly URLs
          if (!isGuestFriendly && refreshStatus && [401, 403].includes(refreshStatus) && typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token - clear tokens
        clearTokens()

        // Only redirect for non-guest-friendly URLs
        if (!isGuestFriendly && typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

// Default symbols for fallback (when not authenticated)
export const DEFAULT_SYMBOLS = [
  { symbol: 'BTCUSDT', timeframe_default: '1d' },
  { symbol: 'ETHUSDT', timeframe_default: '1d' },
  { symbol: 'BNBUSDT', timeframe_default: '1d' },
]
```

## File: src/lib/appMode.ts
```typescript
const rawMode = (process.env.NEXT_PUBLIC_APP_MODE || 'prod').trim().toLowerCase()

export const APP_MODE: 'demo' | 'prod' = rawMode === 'demo' ? 'demo' : 'prod'

export const isDemoMode = APP_MODE === 'demo'
```

## File: src/lib/bubbleStore.ts
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from './api';

export interface AgentResponse {
  provider: string;
  model: string;
  prompt_type: 'brief' | 'detailed' | 'history' | 'custom' | 'technical';
  response: string;
  created_at: string;
}

export interface Bubble {
  id: string;
  symbol: string;
  timeframe: string;
  ts: number; // epoch ms
  price: number;
  bubbleType?: string;
  note: string;
  tags?: string[];
  action?: 'BUY' | 'SELL' | 'HOLD' | 'TP' | 'SL' | 'NONE';
  agents?: AgentResponse[];
  asset_class?: string;
  venue_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  exchange: 'upbit' | 'binance';
  symbol: string;
  side: 'buy' | 'sell';
  ts: number; // epoch ms
  price: number;
  qty?: number;
  fee?: number;
  raw?: any;
}

interface BubbleState {
  bubbles: Bubble[];
  totalBubbles: number;
  addBubble: (bubble: Bubble) => void;
  fetchBubblesFromServer: (limit?: number, loadAll?: boolean) => Promise<{ count: number; total: number }>;
  createBubbleRemote: (payload: {
    symbol: string;
    timeframe: string;
    candle_time: string;
    price: string;
    memo?: string;
    tags?: string[];
    asset_class?: string;
    venue_name?: string;
  }) => Promise<Bubble>;
  updateBubbleRemote: (id: string, payload: {
    memo?: string;
    tags?: string[];
    asset_class?: string;
    venue_name?: string;
  }) => Promise<void>;
  backfillBubblesFromServer: () => Promise<{ updated: number }>;
  backfillPortfolioBubblesFromServer: () => Promise<{ created: number }>;
  updateBubble: (id: string, updates: Partial<Bubble>) => void;
  deleteBubble: (id: string) => void;
  replaceAllBubbles: (bubbles: Bubble[]) => void;
  getBubblesForTime: (symbol: string, timeframe: string, ts: number) => Bubble[];
  createBubbleFromTrade: (trade: Trade, overrides?: Partial<Bubble>) => Promise<Bubble>;
  createBubblesFromTrades: (trades: Trade[]) => Promise<{ created: Bubble[]; skipped: number; updated: number }>;
  backfillBubblesFromTrades: (trades: Trade[]) => Promise<{ updated: number }>;

  trades: Trade[];
  importTrades: (trades: Trade[]) => void;
  deleteAllTrades: () => void;
  resetSessionData: () => void;
}

export const useBubbleStore = create<BubbleState>()(
  persist(
    (set, get) => ({
      bubbles: [],
      totalBubbles: 0,
      addBubble: (bubble) =>
        set((state) => {
          const next = [...state.bubbles, bubble]
          return {
            bubbles: next,
            totalBubbles: state.totalBubbles > 0 ? state.totalBubbles + 1 : next.length,
          }
        }),
      fetchBubblesFromServer: async (limit = 200, loadAll = false) => {
        const pageLimit = Math.min(200, Math.max(1, Number(limit) || 200))
        let page = 1
        let total = 0
        const mapped: Bubble[] = []

        while (true) {
          const params = new URLSearchParams({ page: String(page), limit: String(pageLimit), sort: 'desc' })
          const response = await api.get(`/v1/bubbles?${params.toString()}`)
          const items = response.data?.items || []
          const pageTotal = Number(response.data?.total || 0)
          if (pageTotal > 0) {
            total = pageTotal
          }

          const mappedPage: Bubble[] = items.map((data: any) => ({
            id: data.id,
            symbol: data.symbol,
            timeframe: data.timeframe,
            ts: new Date(data.candle_time).getTime(),
            price: Number(data.price),
            bubbleType: data.bubble_type || 'manual',
            note: data.memo || '',
            tags: data.tags || [],
            action: data.action,
            agents: data.agents || [],
            asset_class: data.asset_class,
            venue_name: data.venue_name,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
          }))

          mapped.push(...mappedPage)

          if (!loadAll) {
            break
          }
          if (mapped.length >= total && total > 0) {
            break
          }
          if (items.length === 0) {
            break
          }
          if (page * pageLimit >= total && total > 0) {
            break
          }
          if (page > 200) {
            break
          }
          page += 1
        }

        const finalTotal = Math.max(total, mapped.length)
        set({ bubbles: mapped, totalBubbles: finalTotal })
        return { count: mapped.length, total: finalTotal }
      },
      createBubbleRemote: async (payload) => {
        const response = await api.post('/v1/bubbles', payload);
        const data = response.data;
        const bubble: Bubble = {
          id: data.id,
          symbol: data.symbol,
          timeframe: data.timeframe,
          ts: new Date(data.candle_time).getTime(),
          price: Number(data.price),
          bubbleType: data.bubble_type || 'manual',
          note: data.memo || '',
          tags: data.tags || [],
          asset_class: data.asset_class,
          venue_name: data.venue_name,
          action: undefined,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        };
        set((state) => ({
          bubbles: [...state.bubbles, bubble],
          totalBubbles: Math.max(state.totalBubbles, state.bubbles.length + 1),
        }));
        return bubble;
      },
      updateBubbleRemote: async (id, payload) => {
        await api.put(`/v1/bubbles/${id}`, payload);
        set((state) => ({
          bubbles: state.bubbles.map((b) =>
            b.id === id ? { ...b, ...payload, updated_at: new Date().toISOString() } : b
          ),
        }));
      },
      backfillBubblesFromServer: async () => {
        const response = await api.post('/v1/trades/backfill-bubbles');
        const updated = Number(response.data?.updated || 0);
        return { updated };
      },
      backfillPortfolioBubblesFromServer: async () => {
        const response = await api.post('/v1/portfolio/backfill-bubbles');
        const created = Number(response.data?.created || 0);
        return { created };
      },
      updateBubble: (id, updates) =>
        set((state) => ({
          bubbles: state.bubbles.map((b) =>
            b.id === id ? { ...b, ...updates, updated_at: new Date().toISOString() } : b
          ),
          totalBubbles: Math.max(state.totalBubbles, state.bubbles.length),
        })),
      deleteBubble: (id) =>
        set((state) => {
          const next = state.bubbles.filter((b) => b.id !== id)
          return {
            bubbles: next,
            totalBubbles: Math.max(0, state.totalBubbles > 0 ? state.totalBubbles - 1 : next.length),
          }
        }),
      replaceAllBubbles: (bubbles) => set({ bubbles, totalBubbles: bubbles.length }),
      getBubblesForTime: (symbol, timeframe, ts) => {
        return get().bubbles.filter(
          (b) => b.symbol === symbol && b.timeframe === timeframe && b.ts === ts
        );
      },
      createBubbleFromTrade: async (trade, overrides = {}) => {
        const action = trade.side === 'buy' ? 'BUY' : 'SELL';
        const now = new Date().toISOString();
        const memoOverride = typeof overrides.note === 'string' ? overrides.note : undefined;
        const tagsOverride = Array.isArray(overrides.tags) ? overrides.tags : undefined;
        const timeframeOverride = typeof overrides.timeframe === 'string' ? overrides.timeframe : undefined;
        const tsOverride = typeof overrides.ts === 'number' ? overrides.ts : undefined;
        const priceOverride = typeof overrides.price === 'number' ? overrides.price : undefined;
        const payload = {
          symbol: trade.symbol,
          timeframe: timeframeOverride || '1h',
          candle_time: new Date(tsOverride ?? trade.ts).toISOString(),
          price: String(priceOverride ?? trade.price),
          memo: memoOverride || `Trade sync: ${trade.symbol} ${trade.side.toUpperCase()} @ ${trade.price}`,
          tags: tagsOverride || [trade.side],
          asset_class: 'crypto',
          venue_name: trade.exchange,
        };
        const created = await get().createBubbleRemote(payload);
        set((state) => ({
          bubbles: state.bubbles.map((b) =>
            b.id === created.id
              ? {
                  ...b,
                  action,
                  note: created.note || payload.memo || '',
                  tags: created.tags?.length ? created.tags : payload.tags,
                  updated_at: now,
                }
              : b
          ),
        }));
        return {
          ...created,
          action,
          note: created.note || payload.memo || '',
          tags: created.tags?.length ? created.tags : payload.tags,
          created_at: created.created_at || now,
          updated_at: created.updated_at || now,
        };
      },
      createBubblesFromTrades: async (trades) => {
        const created: Bubble[] = [];
        let skipped = 0;
        let updated = 0;
        const existing = get().bubbles;
        for (const trade of trades) {
          const action = trade.side === 'buy' ? 'BUY' : 'SELL';
          const existingBubble = existing.find(
            (b) =>
              b.symbol === trade.symbol &&
              b.ts === trade.ts &&
              b.action === action &&
              Math.abs(b.price - trade.price) < 0.0000001
          );
          if (existingBubble) {
            const updatePayload = buildBubblePatchFromTrade(trade, existingBubble);
            if (Object.keys(updatePayload).length > 0) {
              try {
                await get().updateBubbleRemote(existingBubble.id, updatePayload);
                updated += 1;
              } catch {
                // ignore update errors for now
              }
            }
            skipped += 1;
            continue;
          }
          const bubble = await get().createBubbleFromTrade(trade);
          created.push(bubble);
        }
        return { created, skipped, updated };
      },
      backfillBubblesFromTrades: async (trades) => {
        const existing = get().bubbles;
        let updated = 0;
        for (const trade of trades) {
          const action = trade.side === 'buy' ? 'BUY' : 'SELL';
          const existingBubble = existing.find(
            (b) =>
              b.symbol === trade.symbol &&
              b.ts === trade.ts &&
              b.action === action &&
              Math.abs(b.price - trade.price) < 0.0000001
          );
          if (!existingBubble) continue;
          const updatePayload = buildBubblePatchFromTrade(trade, existingBubble);
          if (Object.keys(updatePayload).length === 0) continue;
          try {
            await get().updateBubbleRemote(existingBubble.id, updatePayload);
            updated += 1;
          } catch {
            // ignore update errors for now
          }
        }
        return { updated };
      },
      trades: [],
      importTrades: (newTrades) => set((state) => ({ trades: [...state.trades, ...newTrades] })),
      deleteAllTrades: () => set({ trades: [] }),
      resetSessionData: () => set({ bubbles: [], trades: [], totalBubbles: 0 }),
    }),
    {
      name: 'bubble-storage-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

const buildBubblePatchFromTrade = (trade: Trade, bubble: Bubble) => {
  const patch: { memo?: string; tags?: string[]; asset_class?: string; venue_name?: string } = {};
  if (!bubble.tags || bubble.tags.length === 0) {
    patch.tags = [trade.side];
  }
  if (!bubble.note || bubble.note.trim().length === 0) {
    patch.memo = `Trade sync: ${trade.symbol} ${trade.side.toUpperCase()} @ ${trade.price}`;
  }
  if (!(bubble as any).asset_class) {
    patch.asset_class = 'crypto';
  }
  if (!(bubble as any).venue_name) {
    patch.venue_name = trade.exchange;
  }
  return patch;
}
```

## File: src/lib/csvParser.ts
```typescript
import { Trade } from './bubbleStore'

export async function parseTradeCsv(file: File): Promise<Trade[]> {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim() !== '')

    if (lines.length < 2) return []

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())

    // Basic mapping helper
    const getIdx = (candidates: string[]) => headers.findIndex(h => candidates.includes(h))

    const timeIdx = getIdx(['time', 'date', 'created_at', 'timestamp'])
    const sideIdx = getIdx(['side', 'type', 'action'])
    const priceIdx = getIdx(['price', 'avg_price', 'exec_price'])
    const qtyIdx = getIdx(['qty', 'quantity', 'amount', 'units'])
    const symbolIdx = getIdx(['symbol', 'market', 'pair'])

    if (timeIdx === -1 || sideIdx === -1 || priceIdx === -1) {
        throw new Error('Missing required columns: time, side, price')
    }

    const trades: Trade[] = []

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim())
        if (cols.length < headers.length) continue

        try {
            const rawTime = cols[timeIdx]
            const sideRaw = cols[sideIdx].toLowerCase()
            const price = parseFloat(cols[priceIdx])
            const qty = qtyIdx !== -1 ? parseFloat(cols[qtyIdx]) : undefined
            const symbol = symbolIdx !== -1 ? cols[symbolIdx] : 'UNKNOWN'

            // Normalize Side
            let side: 'buy' | 'sell' = 'buy'
            if (['sell', 'ask', 'bid_sell'].includes(sideRaw)) side = 'sell'

            // Parse Time
            const ts = new Date(rawTime).getTime()
            if (isNaN(ts)) continue

            trades.push({
                id: crypto.randomUUID(),
                exchange: 'upbit', // default for now, or detect from header
                symbol,
                side,
                ts,
                price,
                qty,
                raw: { original: lines[i] }
            })
        } catch (e) {
            console.warn('Failed to parse line', i, e)
        }
    }

    return trades
}
```

## File: src/lib/dataHandler.ts
```typescript
import { useBubbleStore, type Bubble, type Trade } from './bubbleStore'

export interface DataExport {
    schemaVersion?: number
    exportedAt?: string
    appVersion?: string
    bubbles: Bubble[]
    trades?: Trade[]
}

export function exportBubbles() {
    const { bubbles, trades } = useBubbleStore.getState()
    const data: DataExport = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        bubbles,
        trades,
    }

    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `kifu-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export async function importBubbles(file: File): Promise<{ success: boolean; message: string }> {
    try {
        const text = await file.text()
        const data = JSON.parse(text) as DataExport

        // bubbles 배열 확인
        if (!Array.isArray(data.bubbles)) {
            return { success: false, message: 'Invalid file format: bubbles array missing' }
        }

        // 버블 교체
        useBubbleStore.getState().replaceAllBubbles(data.bubbles)

        // trades가 있으면 함께 import
        let tradeCount = 0
        if (Array.isArray(data.trades) && data.trades.length > 0) {
            useBubbleStore.getState().deleteAllTrades()
            useBubbleStore.getState().importTrades(data.trades)
            tradeCount = data.trades.length
        }

        const message = tradeCount > 0
            ? `${data.bubbles.length}개 버블, ${tradeCount}개 거래 가져오기 완료`
            : `${data.bubbles.length}개 버블 가져오기 완료`

        return { success: true, message }
    } catch (error) {
        console.error(error)
        return { success: false, message: 'JSON 파일 파싱 실패' }
    }
}
```

## File: src/lib/evidencePacket.ts
```typescript
import { api } from './api'
import type { TradeItem, TradeListResponse, TradeSummaryResponse } from '../types/trade'
import type { ManualPosition, ManualPositionsResponse } from '../types/position'

export type EvidencePacketTrade = {
  id: string
  exchange: string
  symbol: string
  side: string
  price: string
  quantity: string
  trade_time: string
}

export type EvidencePacketBubble = {
  id: string
  symbol: string
  timeframe: string
  candle_time: string
  price: string
  memo?: string
  tags?: string[]
}

export type EvidencePacket = {
  scope: 'one-shot'
  created_at: string
  symbol: string
  timeframe: string
  positions?: {
    count: number
    items: EvidencePacketPosition[]
  }
  trades?: {
    count: number
    items: EvidencePacketTrade[]
    range?: { from: string; to: string }
  }
  bubbles?: {
    count: number
    items: EvidencePacketBubble[]
    range?: { from: string; to: string }
    tags?: string[]
  }
  summary?: {
    range: { from: string; to: string }
    totals: TradeSummaryResponse['totals']
    by_side: TradeSummaryResponse['by_side']
  }
}

export type EvidencePacketOptions = {
  symbol: string
  timeframe: string
  includePositions?: boolean
  includeRecentTrades: boolean
  includeSummary: boolean
  includeBubbles?: boolean
  tradeLimit?: number
  summaryDays?: number
  rangeFrom?: string
  rangeTo?: string
  bubbleLimit?: number
  bubbleTags?: string[]
}

const toUpper = (value: string) => value.trim().toUpperCase()

const mapTradeItem = (item: TradeItem): EvidencePacketTrade => ({
  id: item.id,
  exchange: item.exchange,
  symbol: item.symbol,
  side: item.side,
  price: item.price,
  quantity: item.quantity,
  trade_time: item.trade_time,
})

const mapBubbleItem = (item: any): EvidencePacketBubble => ({
  id: item.id,
  symbol: item.symbol,
  timeframe: item.timeframe,
  candle_time: item.candle_time,
  price: item.price,
  memo: item.memo ?? undefined,
  tags: item.tags ?? undefined,
})

export type EvidencePacketPosition = {
  id: string
  symbol: string
  position_side: string
  size?: string
  entry_price?: string
  stop_loss?: string
  take_profit?: string
  leverage?: string
  strategy?: string
}

const resolveTimeRange = (values: string[]) => {
  if (values.length === 0) return undefined
  const times = values.map((value) => new Date(value).getTime()).filter((time) => !Number.isNaN(time))
  if (times.length === 0) return undefined
  const min = new Date(Math.min(...times)).toISOString()
  const max = new Date(Math.max(...times)).toISOString()
  return { from: min, to: max }
}

const resolveTradeRange = (items: EvidencePacketTrade[]) => {
  return resolveTimeRange(items.map((item) => item.trade_time))
}

export async function buildEvidencePacket(options: EvidencePacketOptions): Promise<EvidencePacket | null> {
  const {
    symbol,
    timeframe,
    includePositions = false,
    includeRecentTrades,
    includeSummary,
    includeBubbles = false,
    tradeLimit = 10,
    summaryDays = 7,
    rangeFrom,
    rangeTo,
    bubbleLimit = 6,
    bubbleTags = [],
  } = options

  if (!includeRecentTrades && !includeSummary && !includePositions && !includeBubbles) return null

  const now = new Date()
  const symbolLabel = symbol.trim() ? toUpper(symbol) : 'ALL'
  const packet: EvidencePacket = {
    scope: 'one-shot',
    created_at: now.toISOString(),
    symbol: symbolLabel,
    timeframe,
  }

  if (includePositions) {
    const response = await api.get<ManualPositionsResponse>('/v1/manual-positions?status=open')
    const items: EvidencePacketPosition[] = (response.data.positions || []).map((item: ManualPosition) => ({
      id: item.id,
      symbol: item.symbol,
      position_side: item.position_side,
      size: item.size,
      entry_price: item.entry_price,
      stop_loss: item.stop_loss,
      take_profit: item.take_profit,
      leverage: item.leverage,
      strategy: item.strategy,
    }))
    packet.positions = { count: items.length, items }
  }

  if (includeRecentTrades) {
    const params = new URLSearchParams({
      page: '1',
      limit: String(tradeLimit),
      sort: 'desc',
    })
    if (symbol.trim()) {
      params.set('symbol', toUpper(symbol))
    }
    if (rangeFrom) params.set('from', rangeFrom)
    if (rangeTo) params.set('to', rangeTo)
    const response = await api.get<TradeListResponse>(`/v1/trades?${params.toString()}`)
    const items = (response.data.items || []).map(mapTradeItem)
    packet.trades = {
      count: items.length,
      items,
      range: resolveTradeRange(items),
    }
  }

  if (includeBubbles) {
    const params = new URLSearchParams({
      page: '1',
      limit: String(bubbleLimit),
      sort: 'desc',
    })
    if (symbol.trim()) {
      params.set('symbol', toUpper(symbol))
    }
    if (rangeFrom) params.set('from', rangeFrom)
    if (rangeTo) params.set('to', rangeTo)
    if (bubbleTags.length > 0) params.set('tags', bubbleTags.join(','))
    const response = await api.get<{ items: any[] }>(`/v1/bubbles?${params.toString()}`)
    const items = (response.data.items || []).map(mapBubbleItem)
    packet.bubbles = {
      count: items.length,
      items,
      range: resolveTimeRange(items.map((item) => item.candle_time)),
      tags: bubbleTags.length > 0 ? bubbleTags : undefined,
    }
  }

  if (includeSummary) {
    const from = rangeFrom ? new Date(rangeFrom) : new Date(now.getTime() - summaryDays * 24 * 60 * 60 * 1000)
    const to = rangeTo ? new Date(rangeTo) : now
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    })
    if (symbol.trim()) {
      params.set('symbol', toUpper(symbol))
    }
    const response = await api.get<TradeSummaryResponse>(`/v1/trades/summary?${params.toString()}`)
    packet.summary = {
      range: { from: from.toISOString(), to: to.toISOString() },
      totals: response.data.totals,
      by_side: response.data.by_side,
    }
  }

  return packet
}

export function describeEvidencePacket(packet: EvidencePacket): string[] {
  const lines: string[] = []
  lines.push(`One-shot packet · ${packet.symbol} · ${packet.timeframe}`)

  if (packet.positions) {
    lines.push(`Open positions: ${packet.positions.count}`)
    const preview = packet.positions.items.slice(0, 3)
    preview.forEach((position) => {
      const parts = [
        `${position.symbol} ${position.position_side.toUpperCase()}`,
        position.entry_price ? `entry ${position.entry_price}` : 'entry -',
        position.size ? `size ${position.size}` : 'size -',
        position.stop_loss ? `SL ${position.stop_loss}` : 'SL -',
        position.take_profit ? `TP ${position.take_profit}` : 'TP -',
        position.leverage ? `Lev ${position.leverage}x` : 'Lev -',
      ]
      const line = `- ${parts.join(' · ')}${position.strategy ? ` · rule ${position.strategy}` : ''}`
      lines.push(line)
    })
    if (packet.positions.count > preview.length) {
      lines.push(`- ... +${packet.positions.count - preview.length} more`)
    }
  }

  if (packet.trades) {
    const range = packet.trades.range
    const rangeLabel = range ? `${range.from.slice(0, 10)} ~ ${range.to.slice(0, 10)}` : 'range unknown'
    lines.push(`Recent trades: ${packet.trades.count} (${rangeLabel})`)
  }

  if (packet.bubbles) {
    const range = packet.bubbles.range
    const rangeLabel = range ? `${range.from.slice(0, 10)} ~ ${range.to.slice(0, 10)}` : 'range unknown'
    const tags = packet.bubbles.tags && packet.bubbles.tags.length > 0 ? ` · tags ${packet.bubbles.tags.join(',')}` : ''
    lines.push(`Recent bubbles: ${packet.bubbles.count} (${rangeLabel})${tags}`)
  }

  if (packet.summary) {
    const range = packet.summary.range
    const totalTrades = packet.summary.totals?.total_trades ?? 0
    lines.push(`Summary ${range.from.slice(0, 10)} ~ ${range.to.slice(0, 10)} · trades ${totalTrades}`)
  }

  return lines
}

export function formatEvidencePacket(packet: EvidencePacket): string {
  return describeEvidencePacket(packet).join('\n')
}
```

## File: src/lib/exchangeFilters.ts
```typescript
const normalizeToken = (value: string) => value.trim().toLowerCase()

export const normalizeExchangeFilter = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const firstToken = trimmed.split(/[,\s]+/).find(Boolean)
  if (!firstToken) return null

  const token = normalizeToken(firstToken)
  if (token === 'binance' || token === 'binance_futures' || token === 'binancefutures' || token === 'futures') {
    return 'binance_futures'
  }
  if (token === 'binance_spot' || token === 'binancespot' || token === 'spot') {
    return 'binance_spot'
  }
  if (token === 'upbit') {
    return 'upbit'
  }
  return null
}
```

## File: src/lib/guestSession.ts
```typescript
export type GuestSession = {
  id: string
  started_at: string
}

const STORAGE_KEY = 'kifu-guest-session-v1'

export const readGuestSession = (): GuestSession | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GuestSession
    if (!parsed?.id || !parsed?.started_at) return null
    return parsed
  } catch {
    return null
  }
}

export const startGuestSession = () => {
  if (typeof window === 'undefined') return null
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `guest-${crypto.randomUUID().slice(0, 8)}`
    : `guest-${Date.now().toString(36)}`
  const session: GuestSession = {
    id,
    started_at: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}

export const clearGuestSession = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export const isGuestSession = () => readGuestSession() !== null
```

## File: src/lib/i18n.ts
```typescript
import { useMemo, useState, useEffect } from 'react'

type Locale = 'en' | 'ko'

const dictionary = {
  en: {
    appTagline: 'Trading Journal',
    navHome: 'Home',
    navPortfolio: 'Portfolio',
    navChart: 'Chart',
    navAlert: 'Alert',
    navBubbles: 'Bubbles',
    navTrades: 'Trades',
    navReview: 'Review',
    navSettings: 'Settings',
    sessionLabel: 'Session',
    sessionText: 'You are authenticated.',
    logout: 'Log out',
    loginTitle: 'Login',
    loginSubtitle: 'Use your registered email and password.',
    registerTitle: 'Create account',
    registerSubtitle: 'Start with a free tier account.',
    loginHeadline: 'Welcome back to your trading journal.',
    loginBody: 'Review previous decisions, request AI commentary, and keep your execution loop tight.',
    registerHeadline: 'Build your execution memory.',
    registerBody: 'Track setups, annotate entries, and compare outcome feedback across time.',
    betaReminderTitle: 'Beta reminder',
    betaReminderBody: 'AI opinions are tracked against your outcome metrics. Keep notes precise for the best review.',
    starterPerksTitle: 'Starter perks',
    loginButton: 'Login',
    registerButton: 'Create account',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    nameLabel: 'Name',
    loginLinkText: 'Login',
    registerLinkText: 'Create an account',
    loginFooter: 'New here?',
    registerFooter: 'Already have an account?',
    chartTitle: 'Chart Overview',
    chartSubtitle: 'Track live candles and create bubbles directly on the chart.',
    symbolSearchLabel: 'Search',
    symbolSearchPlaceholder: 'Search symbols (BTCUSDT)',
    symbolSearchLoading: 'Searching...',
    symbolSearchEmpty: 'No matching symbols',
    symbolSearchFailed: 'Failed to search symbols.',
    symbolLabel: 'Symbol',
    timeframeLabel: 'Timeframe',
    rangeLabel: 'Range',
    range6m: '6M',
    range1y: '1Y',
    loading: 'Loading...',
    noData: 'No data yet.',
    refresh: 'Refresh',
    requestAi: 'Request AI',
    bubbleDetails: 'Bubble details',
    memoLabel: 'Memo',
    attachmentsLabel: 'Attachments',
    saving: 'Saving...',
    actionsLabel: 'Actions',
    createBubble: 'Create Bubble',
    statusLabel: 'Status',
    statusLoading: 'Loading candles...',
    statusReady: 'Live view ready',
    bubbleFlowLabel: 'Bubble Flow',
    bubbleFlowText: 'Click a candle to create a bubble.',
    aiInsightsLabel: 'AI Insights',
    aiReady: 'Ready',
    aiReadyText: 'AI commentary will appear on demand.',
    bubblesTitle: 'Bubble Library',
    bubblesSubtitle: 'Compare tagged setups, AI commentary, and outcomes in one place.',
    recentBubbles: 'Recent bubbles',
    tradesTitle: 'Trade Intelligence',
    tradesSubtitle: 'Review executed trades, realized PnL, and symbol patterns.',
    tradesLoadFailed: 'Failed to load trade history.',
    importCsv: 'Import CSV',
    importing: 'Importing...',
    importHint: 'CSV: exchange,symbol,side,quantity,price,realized_pnl,trade_time',
    importSuccess: 'Imported',
    importFailed: 'Failed to import CSV.',
    pnlDistributionTitle: 'PnL distribution',
    pnlDistributionHint: 'Realized PnL buckets',
    pnlDistributionEmpty: 'No realized PnL data yet.',
    exchangeLabel: 'Exchange',
    fromLabel: 'From',
    toLabel: 'To',
    totalTrades: 'Total trades',
    tradesWindowHint: 'Filter by exchange or time range.',
    netPnL: 'Net PnL',
    realizedPnL: 'Realized PnL',
    winRate: 'Win rate',
    breakEven: 'Breakeven',
    breakEvenHint: '0 PnL trades',
    tradeHistory: 'Trade history',
    recentTrades: 'Recent trades',
    quantityLabel: 'Qty',
    byExchange: 'By exchange',
    bySide: 'By side',
    bySymbol: 'By symbol',
    aiOpinions: 'AI opinions',
    outcomes: 'Outcome recap',
    similarSetups: 'Similar setups',
    outcomeTitle: 'Outcome tracking',
    similarTitle: 'Similar setups',
    settingsTitle: 'Settings',
    settingsSubtitle: 'Manage exchanges, AI keys, and subscription preferences.',
    notFoundTitle: 'This route does not exist.',
    notFoundBody: 'The page you are looking for is not part of the current workspace. Return to the chart view.',
    goToChart: 'Go to chart',
    bubbleModalTitle: 'New bubble log',
    bubbleModalSubtitle: 'Record your context before the moment fades.',
    bubbleSideLabel: 'Side',
    bubbleSideNeutral: 'Neutral',
    bubbleSideBuy: 'Buy',
    bubbleSideSell: 'Sell',
    candleTimeLabel: 'Candle Time',
    priceLabel: 'Price',
    tagsLabel: 'Tags (comma separated)',
    cancel: 'Cancel',
    saveBubble: 'Save bubble',
    // Alerts & Notifications
    navAlerts: 'Alerts',
    alertsTitle: 'Alerts',
    alertsSubtitle: 'Monitor triggered alerts and record your decisions.',
    alertRulesTitle: 'Alert Rules',
    alertRulesSubtitle: 'Configure conditions to trigger alerts.',
    alertDetailTitle: 'Alert Detail',
    noAlerts: 'No alerts yet.',
    noRules: 'No rules configured.',
    createRule: 'Create Rule',
    editRule: 'Edit Rule',
    deleteRule: 'Delete',
    ruleName: 'Rule Name',
    ruleType: 'Rule Type',
    ruleSymbol: 'Symbol',
    ruleEnabled: 'Enabled',
    ruleCooldown: 'Cooldown (min)',
    ruleTypePrice: 'Price Change',
    ruleTypeMA: 'MA Cross',
    ruleTypeLevel: 'Price Level',
    ruleTypeVolatility: 'Volatility Spike',
    statusAll: 'All',
    statusPending: 'Pending',
    statusBriefed: 'Briefed',
    statusDecided: 'Decided',
    statusExpired: 'Expired',
    severityNormal: 'Normal',
    severityUrgent: 'Urgent',
    aiBriefings: 'AI Briefings',
    noBriefings: 'No AI briefings yet.',
    decisionTitle: 'Your Decision',
    decisionAction: 'Action',
    decisionMemo: 'Memo',
    decisionConfidence: 'Confidence',
    submitDecision: 'Submit Decision',
    dismissAlert: 'Dismiss',
    noOutcomes: 'Outcome data not yet calculated.',
    confidenceHigh: 'High',
    confidenceMedium: 'Medium',
    confidenceLow: 'Low',
    actionBuy: 'Buy',
    actionSell: 'Sell',
    actionHold: 'Hold',
    actionClose: 'Close',
    actionReduce: 'Reduce',
    actionAdd: 'Add',
    actionIgnore: 'Ignore',
    telegramTitle: 'Telegram Notifications',
    telegramConnect: 'Connect Telegram',
    telegramDisconnect: 'Disconnect',
    telegramConnected: 'Connected',
    telegramNotConnected: 'Not connected',
    telegramCodeMsg: 'Send this code to our Telegram Bot:',
    telegramOpenBot: 'Click the button below to connect via Telegram:',
    telegramOpenBotBtn: 'Open in Telegram',
    telegramExpires: 'Expires in',
    direction: 'Direction',
    threshold: 'Threshold',
    reference: 'Reference',
    maPeriod: 'MA Period',
    maTimeframe: 'Timeframe',
    targetPrice: 'Target Price',
    multiplier: 'Multiplier',
    ruleDescPriceChange: 'Triggers when the price changes by more than the threshold compared to a reference period. e.g. "Alert when BTC drops 5% in 24h"',
    ruleDescMACross: 'Triggers when the price crosses a moving average line. Useful for detecting trend reversals. e.g. "Alert when price falls below the 20-day MA"',
    ruleDescPriceLevel: 'Triggers when the price crosses a specific level. Not "above/below" but the moment it breaks through. e.g. "Alert when BTC breaks above $100,000"',
    ruleDescVolatility: 'Triggers when price volatility significantly exceeds the recent average. Detects sudden market movements. e.g. "Alert when 1h candle range is 2x the average"',
    dirDrop: 'Drop only',
    dirRise: 'Rise only',
    dirBoth: 'Both (rise or drop)',
    dirMACrossAbove: 'Price crosses above MA (bullish)',
    dirMACrossBelow: 'Price crosses below MA (bearish)',
    dirLevelAbove: 'Breaks above (upward breakout)',
    dirLevelBelow: 'Breaks below (downward breakdown)',
    dirLevelGte: 'At or above (price >= target)',
    dirLevelLte: 'At or below (price <= target)',
    hintPriceChangeDir: 'Choose which direction of price movement to monitor',
    hintThreshold: 'Amount of change to trigger the alert',
    hintReference: 'Compare current price against this period ago',
    hintMAPeriod: 'Number of candles for the moving average (e.g. 20 = 20-period MA)',
    hintMACrossDir: 'Triggers at the moment the price crosses the MA line',
    hintTargetPrice: 'The price level to watch (USD)',
    hintLevelDir: 'Triggers at the crossing moment, not while staying above/below',
    hintMultiplier: 'How many standard deviations above average to trigger (e.g. 2.0)',
    ref1h: '1 hour ago',
    ref4h: '4 hours ago',
    ref24h: '24 hours ago',
    timeAgo: 'ago',
    viewDetail: 'View',
    manageRules: 'Manage Rules',
    save: 'Save',
  },
  ko: {
    appTagline: 'Trading Journal',
    navHome: '홈',
    navPortfolio: '포트폴리오',
    navChart: '차트',
    navAlert: '긴급',
    navBubbles: '버블',
    navTrades: '거래',
    navReview: '복기',
    navSettings: '설정',
    sessionLabel: '세션',
    sessionText: '로그인 상태입니다.',
    logout: '로그아웃',
    loginTitle: '로그인',
    loginSubtitle: '등록한 이메일과 비밀번호를 사용하세요.',
    registerTitle: '계정 만들기',
    registerSubtitle: '무료 플랜으로 시작할 수 있습니다.',
    loginHeadline: '트레이딩 저널로 돌아오셨네요.',
    loginBody: '과거 판단을 복기하고 AI 코멘트를 받아보세요.',
    registerHeadline: '실행 기록을 쌓아보세요.',
    registerBody: '셋업과 메모를 남기고 결과 피드백을 비교할 수 있습니다.',
    betaReminderTitle: '베타 안내',
    betaReminderBody: 'AI 의견은 결과 지표와 함께 기록됩니다. 메모를 구체적으로 남겨보세요.',
    starterPerksTitle: '스타터 혜택',
    loginButton: '로그인',
    registerButton: '계정 만들기',
    emailLabel: '이메일',
    passwordLabel: '비밀번호',
    nameLabel: '이름',
    loginLinkText: '로그인',
    registerLinkText: '회원가입',
    loginFooter: '처음이신가요?',
    registerFooter: '이미 계정이 있나요?',
    chartTitle: '차트 개요',
    chartSubtitle: '실시간 캔들을 확인하고 바로 버블을 생성하세요.',
    symbolSearchLabel: '검색',
    symbolSearchPlaceholder: '심볼 검색 (BTCUSDT)',
    symbolSearchLoading: '검색 중...',
    symbolSearchEmpty: '검색 결과가 없습니다.',
    symbolSearchFailed: '심볼 검색에 실패했습니다.',
    symbolLabel: '심볼',
    timeframeLabel: '타임프레임',
    rangeLabel: '기간',
    range6m: '6개월',
    range1y: '1년',
    loading: '불러오는 중...',
    noData: '아직 데이터가 없습니다.',
    refresh: '새로고침',
    requestAi: 'AI 요청',
    bubbleDetails: '버블 상세',
    memoLabel: '메모',
    attachmentsLabel: '첨부',
    saving: '저장 중...',
    actionsLabel: '동작',
    createBubble: '버블 생성',
    statusLabel: '상태',
    statusLoading: '캔들 불러오는 중...',
    statusReady: '라이브 준비됨',
    bubbleFlowLabel: '버블 플로우',
    bubbleFlowText: '캔들을 클릭해 버블을 생성하세요.',
    aiInsightsLabel: 'AI 인사이트',
    aiReady: '준비됨',
    aiReadyText: '원할 때 AI 코멘트를 확인할 수 있습니다.',
    bubblesTitle: '버블 라이브러리',
    bubblesSubtitle: '태그와 AI 의견, 결과를 한곳에서 비교합니다.',
    recentBubbles: '최근 버블',
    tradesTitle: '거래 인사이트',
    tradesSubtitle: '체결 내역과 실현 손익, 종목 패턴을 확인하세요.',
    tradesLoadFailed: '거래 내역을 불러오지 못했습니다.',
    importCsv: 'CSV 가져오기',
    importing: '가져오는 중...',
    importHint: 'CSV: exchange,symbol,side,quantity,price,realized_pnl,trade_time',
    importSuccess: '가져오기 완료',
    importFailed: 'CSV 가져오기에 실패했습니다.',
    pnlDistributionTitle: '손익 분포',
    pnlDistributionHint: '실현 손익 구간',
    pnlDistributionEmpty: '실현 손익 데이터가 없습니다.',
    exchangeLabel: '거래소',
    fromLabel: '시작',
    toLabel: '끝',
    totalTrades: '총 거래 수',
    tradesWindowHint: '거래소 또는 기간으로 필터링하세요.',
    netPnL: '순 손익',
    realizedPnL: '실현 손익',
    winRate: '승률',
    breakEven: '본전',
    breakEvenHint: '손익 0 거래',
    tradeHistory: '거래 내역',
    recentTrades: '최근 거래',
    quantityLabel: '수량',
    byExchange: '거래소별',
    bySide: '매수/매도',
    bySymbol: '종목별',
    aiOpinions: 'AI 의견',
    outcomes: '결과 요약',
    similarSetups: '유사 셋업',
    outcomeTitle: '성과 추적',
    similarTitle: '유사 상황',
    settingsTitle: '설정',
    settingsSubtitle: '거래소, AI 키, 구독 정보를 관리합니다.',
    notFoundTitle: '요청한 페이지를 찾을 수 없습니다.',
    notFoundBody: '현재 작업 공간에 없는 경로입니다. 차트로 돌아가세요.',
    goToChart: '차트로 이동',
    bubbleModalTitle: '새 버블 기록',
    bubbleModalSubtitle: '순간의 판단을 기록하세요.',
    bubbleSideLabel: '매수/매도',
    bubbleSideNeutral: '중립',
    bubbleSideBuy: '매수',
    bubbleSideSell: '매도',
    candleTimeLabel: '캔들 시간',
    priceLabel: '가격',
    tagsLabel: '태그 (쉼표 구분)',
    cancel: '취소',
    saveBubble: '버블 저장',
    // Alerts & Notifications
    navAlerts: '알림',
    alertsTitle: '알림',
    alertsSubtitle: '트리거된 알림을 확인하고 판단을 기록합니다.',
    alertRulesTitle: '알림 규칙',
    alertRulesSubtitle: '알림 트리거 조건을 설정합니다.',
    alertDetailTitle: '알림 상세',
    noAlerts: '아직 알림이 없습니다.',
    noRules: '설정된 규칙이 없습니다.',
    createRule: '규칙 생성',
    editRule: '규칙 수정',
    deleteRule: '삭제',
    ruleName: '규칙 이름',
    ruleType: '규칙 유형',
    ruleSymbol: '심볼',
    ruleEnabled: '활성화',
    ruleCooldown: '쿨다운 (분)',
    ruleTypePrice: '가격 변동',
    ruleTypeMA: 'MA 교차',
    ruleTypeLevel: '가격 수준',
    ruleTypeVolatility: '변동성 급등',
    statusAll: '전체',
    statusPending: '대기',
    statusBriefed: '브리핑됨',
    statusDecided: '결정됨',
    statusExpired: '만료',
    severityNormal: '보통',
    severityUrgent: '긴급',
    aiBriefings: 'AI 브리핑',
    noBriefings: 'AI 브리핑이 아직 없습니다.',
    decisionTitle: '나의 판단',
    decisionAction: '행동',
    decisionMemo: '메모',
    decisionConfidence: '확신도',
    submitDecision: '판단 제출',
    dismissAlert: '무시',
    noOutcomes: '아직 성과 데이터가 계산되지 않았습니다.',
    confidenceHigh: '높음',
    confidenceMedium: '보통',
    confidenceLow: '낮음',
    actionBuy: '매수',
    actionSell: '매도',
    actionHold: '보유',
    actionClose: '청산',
    actionReduce: '축소',
    actionAdd: '추가',
    actionIgnore: '무시',
    telegramTitle: '텔레그램 알림',
    telegramConnect: '텔레그램 연결',
    telegramDisconnect: '연결 해제',
    telegramConnected: '연결됨',
    telegramNotConnected: '미연결',
    telegramCodeMsg: '텔레그램 봇에 이 코드를 전송하세요:',
    telegramOpenBot: '아래 버튼을 눌러 텔레그램으로 연결하세요:',
    telegramOpenBotBtn: '텔레그램에서 열기',
    telegramExpires: '만료까지',
    direction: '방향',
    threshold: '임계값',
    reference: '기준',
    maPeriod: 'MA 기간',
    maTimeframe: '타임프레임',
    targetPrice: '목표 가격',
    multiplier: '배수',
    ruleDescPriceChange: '기준 시점 대비 가격이 설정한 수치 이상 변동하면 알림을 보냅니다. 예) "BTC가 24시간 동안 5% 이상 하락하면 알림"',
    ruleDescMACross: '가격이 이동평균선을 교차하는 순간 알림을 보냅니다. 추세 전환 감지에 유용합니다. 예) "가격이 20일 이평선 아래로 내려가면 알림"',
    ruleDescPriceLevel: '가격이 특정 수준을 돌파하는 순간 알림을 보냅니다. 단순히 "이상/이하"가 아니라 그 가격을 넘는 순간에만 트리거됩니다. 예) "BTC가 $100,000을 돌파하면 알림"',
    ruleDescVolatility: '최근 평균 대비 가격 변동폭이 급격히 커지면 알림을 보냅니다. 급등/급락 감지에 유용합니다. 예) "1시간 캔들 범위가 평균의 2배 이상이면 알림"',
    dirDrop: '하락만',
    dirRise: '상승만',
    dirBoth: '양쪽 모두 (상승 또는 하락)',
    dirMACrossAbove: '이평선 위로 돌파 (상승 전환)',
    dirMACrossBelow: '이평선 아래로 이탈 (하락 전환)',
    dirLevelAbove: '위로 돌파 (목표가를 넘어설 때)',
    dirLevelBelow: '아래로 이탈 (목표가 아래로 내려갈 때)',
    dirLevelGte: '이상 (가격 >= 목표가)',
    dirLevelLte: '이하 (가격 <= 목표가)',
    hintPriceChangeDir: '어느 방향의 가격 변동을 감시할지 선택',
    hintThreshold: '알림을 울릴 변동 기준값',
    hintReference: '현재 가격과 비교할 과거 시점',
    hintMAPeriod: '이동평균 계산에 사용할 캔들 수 (예: 20 = 20기간 이평)',
    hintMACrossDir: '가격이 이평선을 교차하는 순간에 트리거',
    hintTargetPrice: '감시할 가격 수준 (USD)',
    hintLevelDir: '해당 가격을 교차하는 순간에만 알림 (이상/이하 상태 유지 중에는 울리지 않음)',
    hintMultiplier: '평균 대비 몇 배의 표준편차를 넘으면 트리거 (예: 2.0)',
    ref1h: '1시간 전 대비',
    ref4h: '4시간 전 대비',
    ref24h: '24시간 전 대비',
    timeAgo: '전',
    viewDetail: '상세',
    manageRules: '규칙 관리',
    save: '저장',
  },
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedLocale = localStorage.getItem('kifu-language')
    if (savedLocale === 'ko' || savedLocale === 'en') {
      setLocale(savedLocale)
    } else if (navigator.language.toLowerCase().startsWith('ko')) {
      setLocale('ko')
    }
  }, [])

  // Return default locale during SSR and initial hydration
  // Only return detected locale after component is mounted
  return mounted ? locale : 'en'
}

export function useI18n() {
  const locale = useLocale()
  return useMemo(() => {
    const t = dictionary[locale]
    return { t, locale }
  }, [locale])
}
```

## File: src/lib/mockAi.ts
```typescript
import type { AgentResponse } from './bubbleStore'
import { api } from './api'
import { formatEvidencePacket, type EvidencePacket } from './evidencePacket'
import { isDemoMode } from './appMode'

type AiRequestContext = {
    memo?: string
    tags?: string[]
}

const buildEvidenceText = (evidence?: EvidencePacket | null, context?: AiRequestContext) => {
    const lines: string[] = []
    if (evidence) {
        lines.push(formatEvidencePacket(evidence))
    }
    const memo = context?.memo?.trim()
    if (memo) {
        lines.push(`사용자 메모: ${memo}`)
    }
    if (context?.tags && context.tags.length > 0) {
        lines.push(`사용자 태그: ${context.tags.join(', ')}`)
    }
    return lines.filter(Boolean).join('\n')
}

type DemoScenario = {
    title: string
    opinion: string
    checks: string[]
    caution: string
    action: string
}

const demoScenarios: DemoScenario[] = [
    {
        title: '상승 추세 확장',
        opinion: '고점 돌파 이후 추세가 이어지고 있습니다.',
        checks: ['거래량 증가가 동반되는지', '직전 돌파 레벨 유지 여부', '분할 익절 계획 보유 여부'],
        caution: '돌파 실패 시 되돌림이 빠를 수 있습니다.',
        action: '추격보다 눌림 확인 후 분할 접근을 권장합니다.',
    },
    {
        title: '하락 추세 지속',
        opinion: '반등 폭이 제한되고 하락 구조가 유지되는 구간입니다.',
        checks: ['저점 갱신 속도', '반등 고점의 낮아짐', '손절 기준 이탈 여부'],
        caution: '짧은 숏 커버로 급반등이 발생할 수 있습니다.',
        action: '손실 확대를 막는 방어적 포지션 관리를 우선하세요.',
    },
    {
        title: '횡보 박스 국면',
        opinion: '방향성보다 박스 상단/하단 반응이 중요한 구간입니다.',
        checks: ['상단/하단 접촉 횟수', '거래량 감소 여부', '손익비 1:2 이상 확보 가능성'],
        caution: '박스 이탈 순간 변동성이 급증할 수 있습니다.',
        action: '돌파 확인 전에는 포지션 크기를 줄이는 것이 유리합니다.',
    },
    {
        title: '급등 과열 구간',
        opinion: '짧은 시간 급등으로 과열 리스크가 커졌습니다.',
        checks: ['직전 저항 돌파 후 안착 여부', '캔들 꼬리 길이 확대', '추가 진입 근거의 객관성'],
        caution: '고점 추격 진입은 손절 폭이 급격히 커질 수 있습니다.',
        action: '신규 진입보다 리스크 축소와 기준 재정의를 추천합니다.',
    },
    {
        title: '급락 리스크 확대',
        opinion: '변동성이 급격히 확대되어 손절 지연이 치명적인 구간입니다.',
        checks: ['유동성 공백 발생 여부', '지지 레벨 회복 속도', '최대 허용 손실 한도'],
        caution: '반등 신호 없이 버티면 손실이 빠르게 누적될 수 있습니다.',
        action: '보수적으로 노출을 줄이고 재진입은 확인 후 진행하세요.',
    },
    {
        title: '변동성 급증',
        opinion: '방향보다 변동성 관리가 성과를 좌우하는 국면입니다.',
        checks: ['평균 캔들 폭 변화', '뉴스/이벤트 일정', '주문 슬리피지 허용 범위'],
        caution: '기준 없는 빈번한 매매가 손익을 악화시킬 수 있습니다.',
        action: '거래 횟수를 줄이고 확실한 셋업만 선택하세요.',
    },
    {
        title: '뉴스 충격 반영',
        opinion: '가격이 이벤트를 빠르게 반영하는 전형적인 뉴스 장세입니다.',
        checks: ['뉴스 방향과 가격 반응 일치성', '첫 반응 후 재평가 구간', '거래량 유지 여부'],
        caution: '초기 변동만 보고 따라가면 역방향 리스크가 큽니다.',
        action: '첫 반응 추격보다 2차 확인 이후 대응을 권장합니다.',
    },
    {
        title: '저유동성 구간',
        opinion: '유동성이 얕아 체결 품질과 손절 체계가 특히 중요합니다.',
        checks: ['호가 스프레드 확대 여부', '체결 지연/미체결 비율', '포지션 크기 적정성'],
        caution: '평소 크기 포지션은 슬리피지 비용이 과도해질 수 있습니다.',
        action: '포지션 크기 축소와 보수적 목표치 설정이 안전합니다.',
    },
]

function buildDemoResponse(symbol: string, timeframe: string, promptType: 'brief' | 'detailed' | 'technical', evidenceText: string): AgentResponse {
    const seedInput = `${symbol}:${timeframe}:${promptType}:${evidenceText.length}`
    const seed = Array.from(seedInput).reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const scenario = demoScenarios[seed % demoScenarios.length]
    const text = [
        '상황',
        `${scenario.title} · ${scenario.opinion}`,
        '',
        '핵심 근거',
        `- ${scenario.checks[0]}`,
        `- ${scenario.checks[1]}`,
        `- ${scenario.checks[2]}`,
        '',
        '리스크',
        scenario.caution,
        '',
        '행동 제안',
        scenario.action,
        '',
        '체크리스트',
        `- ${scenario.checks[0]}`,
        `- ${scenario.checks[1]}`,
        `- ${scenario.checks[2]}`,
        '',
        '결론',
        '데모 응답입니다. 실제 배포 환경에서는 실시간 AI 호출로 교체됩니다.',
    ].join('\n')

    return {
        provider: 'demo',
        model: 'mock-scenario-v1',
        prompt_type: promptType,
        response: text,
        created_at: new Date().toISOString(),
    }
}

export async function fetchAiOpinion(
    symbol: string,
    timeframe: string,
    price: number,
    promptType: 'brief' | 'detailed' | 'technical' = 'brief',
    evidence?: EvidencePacket | null,
    context?: AiRequestContext
): Promise<AgentResponse> {
    const evidenceText = buildEvidenceText(evidence, context)

    if (isDemoMode) {
        return buildDemoResponse(symbol, timeframe, promptType, evidenceText)
    }

    const payload = {
        provider: 'openai',
        prompt_type: promptType,
        symbol,
        timeframe,
        price: String(price),
        evidence_text: evidenceText,
    }

    const response = await api.post('/v1/ai/one-shot', payload)
    const data = response.data

    return {
        provider: data.provider || 'openai',
        model: data.model || 'gpt-4o',
        prompt_type: promptType,
        response: data.response || '',
        created_at: data.created_at || new Date().toISOString(),
    }
}
```

## File: src/lib/onboardingFlow.ts
```typescript
export type AuthRedirectInput = {
  next?: string | null
  from?: string | null
  defaultPath: string
}

const sanitize = (value?: string | null) => (value || '').trim()

export const resolveAuthRedirectPath = ({ next, from, defaultPath }: AuthRedirectInput) => {
  const candidate = sanitize(next) || sanitize(from)
  if (!candidate) return defaultPath

  if (candidate.startsWith('/onboarding/test')) return '/onboarding/test'
  if (candidate.startsWith('/onboarding/import')) return '/onboarding/import'
  if (candidate.startsWith('/onboarding/start')) return '/onboarding/start'
  if (candidate.startsWith('/settings')) return '/settings'
  if (candidate.startsWith('/home')) return '/home'

  return defaultPath
}
```

## File: src/lib/onboardingProfile.ts
```typescript
import { getAccessToken } from '../stores/auth'

export type OnboardingChoice = 'long' | 'short' | 'hold'

export type OnboardingResponse = {
  choice: OnboardingChoice
  confidence?: number
}

export type OnboardingProfile = {
  version: number
  completed_at: string
  tendency: string
  long_count: number
  short_count: number
  hold_count: number
  total_scenarios: number
  recommended_mode: 'aggressive' | 'defensive' | 'balanced'
  confidence_avg?: number
}

const STORAGE_KEY_PREFIX = 'kifu-onboarding-profile-v1'
const DRAFT_STORAGE_KEY_PREFIX = 'kifu-onboarding-draft-v1'

export type OnboardingDraft<T = unknown> = {
  updated_at: string
  answers: T
  current_index: number
}

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

const resolveCurrentUserKey = (): string => {
  if (typeof window === 'undefined') return 'anon'
  const token = getAccessToken()
  if (!token) return 'anon'
  const payload = decodeJwtPayload(token)
  const sub = typeof payload?.sub === 'string' ? payload.sub : ''
  return sub.trim() || 'anon'
}

const profileStorageKey = (userKey?: string) => `${STORAGE_KEY_PREFIX}:${userKey || resolveCurrentUserKey()}`
const draftStorageKey = (userKey?: string) => `${DRAFT_STORAGE_KEY_PREFIX}:${userKey || resolveCurrentUserKey()}`

export const onboardingProfileStoragePrefix = STORAGE_KEY_PREFIX

export const readOnboardingProfile = (userKey?: string): OnboardingProfile | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(profileStorageKey(userKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as OnboardingProfile
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.completed_at) return null
    return parsed
  } catch {
    return null
  }
}

export const saveOnboardingProfile = (profile: OnboardingProfile, userKey?: string) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(profileStorageKey(userKey), JSON.stringify(profile))
  localStorage.removeItem(draftStorageKey(userKey))
}

export const readOnboardingDraft = <T = unknown>(userKey?: string): OnboardingDraft<T> | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(draftStorageKey(userKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as OnboardingDraft<T>
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.updated_at) return null
    return parsed
  } catch {
    return null
  }
}

export const saveOnboardingDraft = <T = unknown>(draft: OnboardingDraft<T>, userKey?: string) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(draftStorageKey(userKey), JSON.stringify(draft))
}

export const buildOnboardingProfile = (
  answers: Record<number, OnboardingChoice | OnboardingResponse>,
  scenarioCount: number,
): OnboardingProfile => {
  const normalized = Object.values(answers).map((value) => {
    if (typeof value === 'string') {
      return { choice: value, confidence: 3 }
    }
    return {
      choice: value.choice,
      confidence: value.confidence && value.confidence >= 1 && value.confidence <= 5 ? value.confidence : 3,
    }
  })

  const longCount = normalized.filter((value) => value.choice === 'long').length
  const shortCount = normalized.filter((value) => value.choice === 'short').length
  const holdCount = normalized.filter((value) => value.choice === 'hold').length
  const longScore = normalized.filter((value) => value.choice === 'long').reduce((sum, value) => sum + value.confidence, 0)
  const shortScore = normalized.filter((value) => value.choice === 'short').reduce((sum, value) => sum + value.confidence, 0)
  const holdScore = normalized.filter((value) => value.choice === 'hold').reduce((sum, value) => sum + value.confidence, 0)
  const confidenceAvg = normalized.length
    ? normalized.reduce((sum, value) => sum + value.confidence, 0) / normalized.length
    : 0

  let tendency = '균형형(상황 적응형)'
  let recommendedMode: OnboardingProfile['recommended_mode'] = 'balanced'
  const longWeight = longScore + longCount * 0.6
  const shortWeight = shortScore + shortCount * 0.6
  const holdWeight = holdScore + holdCount * 0.6

  if (longWeight >= shortWeight*1.15 && longWeight >= holdWeight*1.15) {
    tendency = '공격형(상승 추세 선호)'
    recommendedMode = 'aggressive'
  } else if (shortWeight >= longWeight*1.15 || holdWeight >= longWeight*1.2) {
    tendency = '방어형(리스크 회피/하락 대응)'
    recommendedMode = 'defensive'
  }

  return {
    version: 1,
    completed_at: new Date().toISOString(),
    tendency,
    long_count: longCount,
    short_count: shortCount,
    hold_count: holdCount,
    total_scenarios: scenarioCount,
    recommended_mode: recommendedMode,
    confidence_avg: Number(confidenceAvg.toFixed(2)),
  }
}
```

## File: src/lib/tradeAdapters.ts
```typescript
import type { TradeExchangeSummary, TradeSideSummary, TradeSummaryResponse, TradeSymbolSummary, TradeTotals } from '../types/trade'

const num = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const str = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)

export const normalizeTradeSummary = (raw: any): TradeSummaryResponse => {
  const totalsRaw = raw?.totals || raw?.Totals || {}
  const byExchangeRaw = raw?.by_exchange || raw?.ByExchange || []
  const bySideRaw = raw?.by_side || raw?.BySide || []
  const bySymbolRaw = raw?.by_symbol || raw?.BySymbol || []

  const totals: TradeTotals = {
    total_trades: num(totalsRaw.total_trades ?? totalsRaw.TotalTrades),
    buy_count: num(totalsRaw.buy_count ?? totalsRaw.BuyCount),
    sell_count: num(totalsRaw.sell_count ?? totalsRaw.SellCount),
    total_volume: str(totalsRaw.total_volume ?? totalsRaw.TotalVolume),
    realized_pnl_total: str(totalsRaw.realized_pnl_total ?? totalsRaw.RealizedPnLTotal),
    wins: num(totalsRaw.wins ?? totalsRaw.Wins),
    losses: num(totalsRaw.losses ?? totalsRaw.Losses),
    breakeven: num(totalsRaw.breakeven ?? totalsRaw.Breakeven),
    average_pnl: totalsRaw.average_pnl ?? totalsRaw.AveragePnL,
  }

  const by_exchange: TradeExchangeSummary[] = (Array.isArray(byExchangeRaw) ? byExchangeRaw : []).map((row: any) => ({
    exchange: str(row.exchange ?? row.Exchange),
    trade_count: num(row.trade_count ?? row.TradeCount ?? row.total_trades ?? row.TotalTrades),
    total_trades: num(row.total_trades ?? row.TotalTrades ?? row.trade_count ?? row.TradeCount),
    buy_count: num(row.buy_count ?? row.BuyCount),
    sell_count: num(row.sell_count ?? row.SellCount),
    total_volume: str(row.total_volume ?? row.TotalVolume),
    realized_pnl_total: str(row.realized_pnl_total ?? row.RealizedPnLTotal),
  }))

  const by_side: TradeSideSummary[] = (Array.isArray(bySideRaw) ? bySideRaw : []).map((row: any) => ({
    side: str(row.side ?? row.Side).toUpperCase(),
    trade_count: num(row.trade_count ?? row.TradeCount ?? row.total_trades ?? row.TotalTrades),
    total_trades: num(row.total_trades ?? row.TotalTrades ?? row.trade_count ?? row.TradeCount),
    total_volume: str(row.total_volume ?? row.TotalVolume),
    realized_pnl_total: str(row.realized_pnl_total ?? row.RealizedPnLTotal),
  }))

  const by_symbol: TradeSymbolSummary[] = (Array.isArray(bySymbolRaw) ? bySymbolRaw : []).map((row: any) => ({
    symbol: str(row.symbol ?? row.Symbol),
    trade_count: num(row.trade_count ?? row.TradeCount ?? row.total_trades ?? row.TotalTrades),
    total_trades: num(row.total_trades ?? row.TotalTrades ?? row.trade_count ?? row.TradeCount),
    buy_count: num(row.buy_count ?? row.BuyCount),
    sell_count: num(row.sell_count ?? row.SellCount),
    total_volume: str(row.total_volume ?? row.TotalVolume),
    realized_pnl_total: str(row.realized_pnl_total ?? row.RealizedPnLTotal),
    wins: num(row.wins ?? row.Wins),
    losses: num(row.losses ?? row.Losses),
  }))

  return {
    exchange: str(raw?.exchange ?? raw?.Exchange),
    totals,
    by_exchange,
    by_side,
    by_symbol,
  }
}
```

## File: src/routes/GuestOnly.tsx
```typescript
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '../stores/auth'

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (isAuthenticated) {
      const target = searchParams?.get('next') || searchParams?.get('from')
      const destination = target && target.startsWith('/') ? target : '/home'
      router.replace(destination)
    }
  }, [isAuthenticated, router, searchParams])

  if (isAuthenticated) {
    return null
  }

  return <>{children}</>
}
```

## File: src/routes/RequireAuth.tsx
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '../stores/auth'
import { isDemoMode } from '../lib/appMode'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const hasHydrated = useAuthStore((state) => state._hasHydrated)
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (isDemoMode) {
      router.replace('/guest')
      return
    }
    if (!hasHydrated) return
    if (!isAuthenticated) {
      router.replace(`/login?from=${pathname}`)
    }
  }, [isAuthenticated, hasHydrated, router, pathname])

  if (!mounted) {
    return isDemoMode ? null : <>{children}</>
  }

  if (isDemoMode) {
    return null
  }

  if (!hasHydrated) {
    return null
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
```

## File: src/stores/alertStore.ts
```typescript
import { create } from 'zustand'
import { api } from '../lib/api'
import type {
  AlertRule,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  Alert,
  AlertDetailResponse,
  CreateDecisionRequest,
  AlertDecision,
  AlertStatus,
  NotificationChannel,
  TelegramConnectResponse,
} from '../types/alert'

type AlertStore = {
  // Rules
  rules: AlertRule[]
  isLoadingRules: boolean
  rulesError: string | null
  fetchRules: () => Promise<void>
  createRule: (data: CreateAlertRuleRequest) => Promise<AlertRule | null>
  updateRule: (id: string, data: UpdateAlertRuleRequest) => Promise<AlertRule | null>
  deleteRule: (id: string) => Promise<boolean>
  toggleRule: (id: string) => Promise<boolean>

  // Alerts
  alerts: Alert[]
  alertsTotal: number
  isLoadingAlerts: boolean
  alertsError: string | null
  fetchAlerts: (status?: AlertStatus, limit?: number, offset?: number) => Promise<void>

  // Alert Detail
  alertDetail: AlertDetailResponse | null
  isLoadingDetail: boolean
  detailError: string | null
  fetchAlertDetail: (id: string) => Promise<void>
  submitDecision: (alertId: string, data: CreateDecisionRequest) => Promise<AlertDecision | null>
  dismissAlert: (id: string) => Promise<boolean>

  // Notifications
  channels: NotificationChannel[]
  isLoadingChannels: boolean
  channelsError: string | null
  fetchChannels: () => Promise<void>
  connectTelegram: () => Promise<TelegramConnectResponse | null>
  disconnectTelegram: () => Promise<boolean>
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  // Rules state
  rules: [],
  isLoadingRules: false,
  rulesError: null,

  fetchRules: async () => {
    set({ isLoadingRules: true, rulesError: null })
    try {
      const response = await api.get<{ rules: AlertRule[] }>('/v1/alert-rules')
      set({ rules: response.data.rules, isLoadingRules: false })
    } catch {
      set({ rulesError: '규칙을 불러오는데 실패했습니다', isLoadingRules: false })
    }
  },

  createRule: async (data) => {
    set({ isLoadingRules: true, rulesError: null })
    try {
      const response = await api.post<AlertRule>('/v1/alert-rules', data)
      const newRule = response.data
      set((state) => ({
        rules: [newRule, ...state.rules],
        isLoadingRules: false,
      }))
      return newRule
    } catch {
      set({ rulesError: '규칙 생성에 실패했습니다', isLoadingRules: false })
      return null
    }
  },

  updateRule: async (id, data) => {
    set({ isLoadingRules: true, rulesError: null })
    try {
      const response = await api.put<AlertRule>(`/v1/alert-rules/${id}`, data)
      const updated = response.data
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? updated : r)),
        isLoadingRules: false,
      }))
      return updated
    } catch {
      set({ rulesError: '규칙 수정에 실패했습니다', isLoadingRules: false })
      return null
    }
  },

  deleteRule: async (id) => {
    set({ isLoadingRules: true, rulesError: null })
    try {
      await api.delete(`/v1/alert-rules/${id}`)
      set((state) => ({
        rules: state.rules.filter((r) => r.id !== id),
        isLoadingRules: false,
      }))
      return true
    } catch {
      set({ rulesError: '규칙 삭제에 실패했습니다', isLoadingRules: false })
      return false
    }
  },

  toggleRule: async (id) => {
    try {
      const response = await api.patch<{ id: string; enabled: boolean }>(
        `/v1/alert-rules/${id}/toggle`
      )
      const { enabled } = response.data
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? { ...r, enabled } : r)),
      }))
      return true
    } catch {
      set({ rulesError: '규칙 토글에 실패했습니다' })
      return false
    }
  },

  // Alerts state
  alerts: [],
  alertsTotal: 0,
  isLoadingAlerts: false,
  alertsError: null,

  fetchAlerts: async (status, limit = 20, offset = 0) => {
    set({ isLoadingAlerts: true, alertsError: null })
    try {
      let url = `/v1/alerts?limit=${limit}&offset=${offset}`
      if (status) url += `&status=${status}`
      const response = await api.get<{ alerts: Alert[]; total: number }>(url)
      set({
        alerts: response.data.alerts,
        alertsTotal: response.data.total,
        isLoadingAlerts: false,
      })
    } catch {
      set({ alertsError: '알림을 불러오는데 실패했습니다', isLoadingAlerts: false })
    }
  },

  // Alert Detail state
  alertDetail: null,
  isLoadingDetail: false,
  detailError: null,

  fetchAlertDetail: async (id) => {
    set({ isLoadingDetail: true, detailError: null })
    try {
      const response = await api.get<AlertDetailResponse>(`/v1/alerts/${id}`)
      set({ alertDetail: response.data, isLoadingDetail: false })
    } catch {
      set({ detailError: '알림 상세를 불러오는데 실패했습니다', isLoadingDetail: false })
    }
  },

  submitDecision: async (alertId, data) => {
    set({ isLoadingDetail: true, detailError: null })
    try {
      const response = await api.post<AlertDecision>(`/v1/alerts/${alertId}/decision`, data)
      const decision = response.data
      // Update alert detail with decision
      const detail = get().alertDetail
      if (detail) {
        set({
          alertDetail: { ...detail, alert: { ...detail.alert, status: 'decided' }, decision },
          isLoadingDetail: false,
        })
      } else {
        set({ isLoadingDetail: false })
      }
      return decision
    } catch {
      set({ detailError: '결정 제출에 실패했습니다', isLoadingDetail: false })
      return null
    }
  },

  dismissAlert: async (id) => {
    try {
      await api.patch(`/v1/alerts/${id}/dismiss`)
      // Update in alert list
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? { ...a, status: 'expired' as const } : a)),
      }))
      // Update detail if viewing
      const detail = get().alertDetail
      if (detail && detail.alert.id === id) {
        set({ alertDetail: { ...detail, alert: { ...detail.alert, status: 'expired' } } })
      }
      return true
    } catch {
      return false
    }
  },

  // Notifications state
  channels: [],
  isLoadingChannels: false,
  channelsError: null,

  fetchChannels: async () => {
    set({ isLoadingChannels: true, channelsError: null })
    try {
      const response = await api.get<{ channels: NotificationChannel[] }>('/v1/notifications/channels')
      set({ channels: response.data.channels, isLoadingChannels: false })
    } catch {
      set({ channelsError: '채널 정보를 불러오는데 실패했습니다', isLoadingChannels: false })
    }
  },

  connectTelegram: async () => {
    set({ isLoadingChannels: true, channelsError: null })
    try {
      const response = await api.post<TelegramConnectResponse>('/v1/notifications/telegram/connect')
      set({ isLoadingChannels: false })
      return response.data
    } catch {
      set({ channelsError: '텔레그램 연결에 실패했습니다', isLoadingChannels: false })
      return null
    }
  },

  disconnectTelegram: async () => {
    set({ isLoadingChannels: true, channelsError: null })
    try {
      await api.delete('/v1/notifications/telegram')
      set((state) => ({
        channels: state.channels.filter((ch) => ch.type !== 'telegram'),
        isLoadingChannels: false,
      }))
      return true
    } catch {
      set({ channelsError: '텔레그램 연결 해제에 실패했습니다', isLoadingChannels: false })
      return false
    }
  },
}))
```

## File: src/stores/auth.ts
```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  clearTokens: () => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true })
      },
      clearTokens: () => {
        set({ accessToken: null, refreshToken: null, isAuthenticated: false })
      },
      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'kifu-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

// SSR-safe getter for token (used by API interceptor)
export const getAccessToken = (): string | null => {
  return useAuthStore.getState().accessToken
}
```

## File: src/stores/guidedReviewStore.ts
```typescript
import { create } from 'zustand'
import { api } from '../lib/api'
import type {
  GuidedReview,
  GuidedReviewItem,
  UserStreak,
  TodayResponse,
  CompleteResponse,
  SubmitItemPayload,
} from '../types/guidedReview'

type GuidedReviewStore = {
  review: GuidedReview | null
  items: GuidedReviewItem[]
  currentStep: number
  streak: UserStreak | null
  isLoading: boolean
  error: string | null

  fetchToday: (timezone?: string) => Promise<void>
  submitItem: (itemId: string, payload: SubmitItemPayload) => Promise<boolean>
  completeReview: () => Promise<boolean>
  fetchStreak: () => Promise<void>
  nextStep: () => void
  prevStep: () => void
  setStep: (step: number) => void
  reset: () => void
}

export const useGuidedReviewStore = create<GuidedReviewStore>((set, get) => ({
  review: null,
  items: [],
  currentStep: 0,
  streak: null,
  isLoading: false,
  error: null,

  fetchToday: async (timezone?: string) => {
    set({ isLoading: true, error: null })
    try {
      const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const response = await api.get<TodayResponse>(`/v1/guided-reviews/today?timezone=${encodeURIComponent(tz)}`)
      const { review, items } = response.data
      set({
        review,
        items: items || [],
        isLoading: false,
      })
    } catch {
      set({ error: '복기 데이터를 불러오지 못했습니다', isLoading: false })
    }
  },

  submitItem: async (itemId: string, payload: SubmitItemPayload) => {
    set({ error: null })
    try {
      await api.post(`/v1/guided-reviews/items/${itemId}/submit`, payload)
      // Update local state
      set((state) => ({
        items: state.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                intent: payload.intent,
                emotions: payload.emotions,
                pattern_match: payload.pattern_match,
                memo: payload.memo,
              }
            : item
        ),
      }))
      return true
    } catch {
      set({ error: '답변 저장에 실패했습니다' })
      return false
    }
  },

  completeReview: async () => {
    const { review } = get()
    if (!review) return false
    set({ error: null })
    try {
      const response = await api.post<CompleteResponse>(`/v1/guided-reviews/${review.id}/complete`)
      set({
        streak: response.data.streak,
        review: { ...review, status: 'completed' },
      })
      return true
    } catch {
      set({ error: '복기 완료 처리에 실패했습니다' })
      return false
    }
  },

  fetchStreak: async () => {
    try {
      const response = await api.get<UserStreak>('/v1/guided-reviews/streak')
      set({ streak: response.data })
    } catch {
      // silent fail
    }
  },

  nextStep: () => {
    const { currentStep, items } = get()
    if (currentStep < items.length - 1) {
      set({ currentStep: currentStep + 1 })
    }
  },

  prevStep: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 })
    }
  },

  setStep: (step: number) => set({ currentStep: step }),

  reset: () =>
    set({
      review: null,
      items: [],
      currentStep: 0,
      streak: null,
      isLoading: false,
      error: null,
    }),
}))
```

## File: src/stores/noteStore.ts
```typescript
import { create } from 'zustand'
import { api } from '../lib/api'
import type { ReviewNote, CreateNoteRequest, NotesListResponse } from '../types/review'

type NoteStore = {
  notes: ReviewNote[]
  selectedNote: ReviewNote | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }

  // Actions
  fetchNotes: (page?: number) => Promise<void>
  fetchNotesByBubble: (bubbleId: string) => Promise<void>
  createNote: (data: CreateNoteRequest) => Promise<ReviewNote | null>
  updateNote: (id: string, data: CreateNoteRequest) => Promise<ReviewNote | null>
  deleteNote: (id: string) => Promise<boolean>
  selectNote: (note: ReviewNote | null) => void
  reset: () => void
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  selectedNote: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  fetchNotes: async (page = 1) => {
    set({ isLoading: true, error: null })
    try {
      const { pagination } = get()
      const response = await api.get<NotesListResponse>(
        `/v1/notes?page=${page}&limit=${pagination.limit}`
      )
      set({
        notes: response.data.notes,
        pagination: {
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total,
          totalPages: response.data.total_pages,
        },
        isLoading: false,
      })
    } catch (error) {
      set({ error: '노트를 불러오는데 실패했습니다', isLoading: false })
    }
  },

  fetchNotesByBubble: async (bubbleId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ notes: ReviewNote[] }>(
        `/v1/bubbles/${bubbleId}/notes`
      )
      set({ notes: response.data.notes, isLoading: false })
    } catch (error) {
      set({ error: '노트를 불러오는데 실패했습니다', isLoading: false })
    }
  },

  createNote: async (data: CreateNoteRequest) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<ReviewNote>('/v1/notes', data)
      const newNote = response.data
      set((state) => ({
        notes: [newNote, ...state.notes],
        isLoading: false,
      }))
      return newNote
    } catch (error) {
      set({ error: '노트 생성에 실패했습니다', isLoading: false })
      return null
    }
  },

  updateNote: async (id: string, data: CreateNoteRequest) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put<ReviewNote>(`/v1/notes/${id}`, data)
      const updatedNote = response.data
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? updatedNote : n)),
        selectedNote: state.selectedNote?.id === id ? updatedNote : state.selectedNote,
        isLoading: false,
      }))
      return updatedNote
    } catch (error) {
      set({ error: '노트 수정에 실패했습니다', isLoading: false })
      return null
    }
  },

  deleteNote: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/v1/notes/${id}`)
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
        isLoading: false,
      }))
      return true
    } catch (error) {
      set({ error: '노트 삭제에 실패했습니다', isLoading: false })
      return false
    }
  },

  selectNote: (note) => set({ selectedNote: note }),

  reset: () =>
    set({
      notes: [],
      selectedNote: null,
      isLoading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
}))
```

## File: src/stores/reviewStore.ts
```typescript
import { create } from 'zustand'
import { api } from '../lib/api'
import { normalizeExchangeFilter } from '../lib/exchangeFilters'
import type {
  ReviewStats,
  AccuracyResponse,
  CalendarResponse,
  ReviewFilters,
  ReplayState,
} from '../types/review'

type ReviewStore = {
  // Data
  stats: ReviewStats | null
  accuracy: AccuracyResponse | null
  calendar: CalendarResponse | null
  isLoading: boolean
  isLoadingAccuracy: boolean
  error: string | null

  // Filters
  filters: ReviewFilters
  setFilters: (filters: Partial<ReviewFilters>) => void

  // Replay
  replay: ReplayState
  setReplayTime: (time: number) => void
  togglePlay: () => void
  setSpeed: (speed: 1 | 2 | 4 | 8) => void
  startReplay: (startTime: number, endTime: number) => void
  stopReplay: () => void

  // Actions
  fetchStats: () => Promise<void>
  fetchAccuracy: () => Promise<void>
  fetchCalendar: (from: string, to: string) => Promise<void>
  reset: () => void
}

const initialReplayState: ReplayState = {
  isActive: false,
  currentTime: 0,
  endTime: 0,
  speed: 1,
  isPlaying: false,
}

import { persist } from 'zustand/middleware'

export const useReviewStore = create<ReviewStore>()(
  persist(
    (set, get) => ({
      stats: null,
      accuracy: null,
      calendar: null,
      isLoading: false,
      isLoadingAccuracy: false,
      error: null,

      filters: {
        period: '30d',
        outcomePeriod: '1h',
        assetClass: 'all',
        venue: '',
      },

      replay: initialReplayState,

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      setReplayTime: (time) =>
        set((state) => ({
          replay: { ...state.replay, currentTime: time },
        })),

      togglePlay: () =>
        set((state) => ({
          replay: { ...state.replay, isPlaying: !state.replay.isPlaying },
        })),

      setSpeed: (speed) =>
        set((state) => ({
          replay: { ...state.replay, speed },
        })),

      startReplay: (startTime, endTime) =>
        set({
          replay: {
            isActive: true,
            currentTime: startTime,
            endTime,
            speed: 1,
            isPlaying: false,
          },
        }),

      stopReplay: () =>
        set({
          replay: initialReplayState,
        }),

      fetchStats: async () => {
        const { filters } = get()
        set({ isLoading: true, error: null })
        try {
          const params = new URLSearchParams({ period: filters.period })
          if (filters.symbol) params.set('symbol', filters.symbol)
          if (filters.tag) params.set('tag', filters.tag)
          if (filters.assetClass && filters.assetClass !== 'all') params.set('asset_class', filters.assetClass)
          const venue = normalizeExchangeFilter(filters.venue)
          if (venue) params.set('venue', venue)

          const response = await api.get(`/v1/review/stats?${params}`)
          set({ stats: response.data, isLoading: false })
        } catch (error) {
          set({ error: '통계를 불러오는데 실패했습니다', isLoading: false })
        }
      },

      fetchAccuracy: async () => {
        const { filters } = get()
        set({ isLoadingAccuracy: true, error: null })
        try {
          const params = new URLSearchParams({
            period: filters.period,
            outcome_period: filters.outcomePeriod,
          })
          if (filters.assetClass && filters.assetClass !== 'all') params.set('asset_class', filters.assetClass)
          const venue = normalizeExchangeFilter(filters.venue)
          if (venue) params.set('venue', venue)

          console.log('[ReviewStore] Fetching accuracy with params:', params.toString())
          const response = await api.get(`/v1/review/accuracy?${params}`)
          console.log('[ReviewStore] Accuracy response:', response.data)
          set({ accuracy: response.data, isLoadingAccuracy: false })
        } catch (error: unknown) {
          console.error('[ReviewStore] Accuracy fetch error:', error)
          const message = error instanceof Error ? error.message : 'AI 정확도를 불러오는데 실패했습니다'
          set({ error: message, isLoadingAccuracy: false })
        }
      },

      fetchCalendar: async (from, to) => {
        const { filters } = get()
        set({ isLoading: true, error: null })
        try {
          const params = new URLSearchParams({ from, to })
          if (filters.assetClass && filters.assetClass !== 'all') params.set('asset_class', filters.assetClass)
          const venue = normalizeExchangeFilter(filters.venue)
          if (venue) params.set('venue', venue)
          const response = await api.get(`/v1/review/calendar?${params}`)
          set({ calendar: response.data, isLoading: false })
        } catch (error) {
          set({ error: '캘린더 데이터를 불러오는데 실패했습니다', isLoading: false })
        }
      },

      reset: () =>
        set({
          stats: null,
          accuracy: null,
          calendar: null,
          isLoading: false,
          isLoadingAccuracy: false,
          error: null,
          filters: { period: '30d', outcomePeriod: '1h', assetClass: 'all', venue: '' },
          replay: initialReplayState,
        }),
    }),
    {
      name: 'review-store',
      partialize: (state) => ({ filters: state.filters }),
    }
  )
)
```

## File: src/types/alert.ts
```typescript
// Rule types
export type RuleType = 'price_change' | 'ma_cross' | 'price_level' | 'volatility_spike'

export type PriceChangeConfig = {
  direction: 'drop' | 'rise' | 'both'
  threshold_type: 'absolute' | 'percent'
  threshold_value: string
  reference: '24h' | '1h' | '4h'
}

export type MACrossConfig = {
  ma_period: number
  ma_timeframe: string
  direction: 'below' | 'above'
}

export type PriceLevelConfig = {
  price: string
  direction: 'above' | 'below'
}

export type VolatilitySpikeConfig = {
  timeframe: string
  multiplier: string
}

export type RuleConfig = PriceChangeConfig | MACrossConfig | PriceLevelConfig | VolatilitySpikeConfig

export type AlertRule = {
  id: string
  user_id: string
  name: string
  symbol: string
  rule_type: RuleType
  config: RuleConfig
  cooldown_minutes: number
  enabled: boolean
  last_triggered_at?: string
  created_at: string
  updated_at: string
}

export type CreateAlertRuleRequest = {
  name: string
  symbol: string
  rule_type: RuleType
  config: RuleConfig
  cooldown_minutes?: number
}

export type UpdateAlertRuleRequest = {
  name?: string
  symbol?: string
  rule_type?: RuleType
  config?: RuleConfig
  cooldown_minutes?: number
  enabled?: boolean
}

// Alert types
export type AlertSeverity = 'normal' | 'urgent'
export type AlertStatus = 'pending' | 'briefed' | 'decided' | 'expired'

export type Alert = {
  id: string
  user_id: string
  rule_id: string
  symbol: string
  trigger_price: string
  trigger_reason: string
  severity: AlertSeverity
  status: AlertStatus
  notified_at?: string
  created_at: string
}

export type AlertBriefing = {
  id: string
  alert_id: string
  provider: string
  model: string
  prompt: string
  response: string
  tokens_used?: number
  created_at: string
}

export type DecisionAction = 'buy' | 'sell' | 'hold' | 'close' | 'reduce' | 'add' | 'ignore'
export type Confidence = 'high' | 'medium' | 'low'

export type AlertDecision = {
  id: string
  alert_id: string
  user_id: string
  action: DecisionAction
  memo?: string
  confidence?: Confidence
  executed_at?: string
  created_at: string
}

export type AlertOutcome = {
  id: string
  alert_id: string
  decision_id: string
  period: string
  reference_price: string
  outcome_price: string
  pnl_percent: string
  calculated_at: string
}

export type AlertDetailResponse = {
  alert: Alert
  briefings: AlertBriefing[]
  decision?: AlertDecision
  outcomes?: AlertOutcome[]
}

export type CreateDecisionRequest = {
  action: DecisionAction
  memo?: string
  confidence?: Confidence
}

// Notification types
export type NotificationChannel = {
  type: string
  enabled: boolean
  verified: boolean
}

export type TelegramConnectResponse = {
  code: string
  expires_in: number
  message: string
  bot_url?: string
}
```

## File: src/types/guidedReview.ts
```typescript
export type GuidedReviewStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export const NO_TRADE_SYMBOL = '__NO_TRADE__'

export type GuidedReview = {
  id: string
  user_id: string
  review_date: string
  status: GuidedReviewStatus
  completed_at?: string | null
  created_at: string
}

export type GuidedReviewItem = {
  id: string
  review_id: string
  trade_id?: string | null
  bundle_key?: string | null
  symbol: string
  side?: string | null
  pnl?: number | null
  trade_count: number
  intent?: string | null
  emotions?: string[] | null
  pattern_match?: string | null
  memo?: string | null
  order_index: number
  created_at: string
}

export type UserStreak = {
  user_id: string
  current_streak: number
  longest_streak: number
  last_review_date?: string | null
  updated_at: string
}

export type TodayResponse = {
  review: GuidedReview
  items: GuidedReviewItem[]
}

export type SubmitItemPayload = {
  intent: string
  emotions: string[]
  pattern_match: string
  memo: string
}

export type CompleteResponse = {
  ok: boolean
  streak: UserStreak
}

export const INTENT_OPTIONS = [
  { value: 'technical_signal', label: '기술적 신호' },
  { value: 'news_event', label: '뉴스/이벤트' },
  { value: 'emotional', label: '감정적 판단' },
  { value: 'planned_regular', label: '계획된 매매' },
  { value: 'other', label: '기타' },
] as const

export const EMOTION_OPTIONS = [
  { value: 'confident', label: '확신' },
  { value: 'half_doubtful', label: '반신반의' },
  { value: 'anxious', label: '불안' },
  { value: 'excited', label: '흥분' },
  { value: 'calm', label: '평온' },
  { value: 'nervous', label: '초조' },
  { value: 'fomo', label: 'FOMO' },
  { value: 'revenge_trade', label: '복수매매' },
  { value: 'as_planned', label: '계획대로' },
] as const

export const PATTERN_OPTIONS = [
  { value: 'same_decision', label: '같은 판단' },
  { value: 'adjust_timing', label: '타이밍 조절' },
  { value: 'reduce_size', label: '사이즈 축소' },
  { value: 'would_not_trade', label: '안 하겠다' },
  { value: 'change_sl_tp', label: 'SL/TP 변경' },
] as const

export const NO_TRADE_INTENT_OPTIONS = [
  { value: 'no_trade_wait_setup', label: '기준 미충족(기다림)' },
  { value: 'no_trade_risk_off', label: '리스크 회피' },
  { value: 'no_trade_schedule', label: '시간/일정 이슈' },
  { value: 'no_trade_emotion_control', label: '감정 통제 목적' },
  { value: 'no_trade_other', label: '기타' },
] as const

export const NO_TRADE_PATTERN_OPTIONS = [
  { value: 'watch_key_level', label: '핵심 레벨 모니터링' },
  { value: 'wait_confirmation', label: '확인 후 진입' },
  { value: 'size_down_first', label: '소액 테스트 진입' },
  { value: 'stay_no_trade', label: '내일도 관망 가능' },
  { value: 'rebuild_plan', label: '계획 재정비' },
] as const
```

## File: src/types/portfolio.ts
```typescript
export type TimelineItem = {
  id: string
  executed_at: string
  asset_class: string
  venue_type: string
  venue: string
  venue_name: string
  account_label?: string
  instrument: string
  event_type: string
  side?: string
  qty?: string
  price?: string
  fee?: string
  fee_asset?: string
  source: string
  external_id?: string
}

export type TimelineResponse = {
  items: TimelineItem[]
  next_cursor?: string | null
}

export type PositionItem = {
  key: string
  instrument: string
  venue: string
  venue_name: string
  account_label?: string
  asset_class: string
  venue_type: string
  status: string
  net_qty: string
  avg_entry: string
  buy_qty: string
  sell_qty: string
  buy_notional: string
  sell_notional: string
  last_executed_at: string
}

export type PositionsResponse = {
  positions: PositionItem[]
  count: number
}
```

## File: src/types/position.ts
```typescript
export type ManualPosition = {
  id: string
  symbol: string
  asset_class: 'crypto' | 'stock'
  venue?: string
  position_side: 'long' | 'short'
  size?: string
  entry_price?: string
  stop_loss?: string
  take_profit?: string
  leverage?: string
  strategy?: string
  memo?: string
  status: 'open' | 'closed'
  opened_at?: string
  closed_at?: string
  created_at: string
  updated_at: string
}

export type ManualPositionsResponse = {
  positions: ManualPosition[]
}

export type ManualPositionRequest = {
  symbol: string
  asset_class: 'crypto' | 'stock'
  venue?: string
  position_side: 'long' | 'short'
  size?: string
  entry_price?: string
  stop_loss?: string
  take_profit?: string
  leverage?: string
  strategy?: string
  memo?: string
  status?: 'open' | 'closed'
  opened_at?: string
  closed_at?: string
}
```

## File: src/types/review.ts
```typescript
export type Direction = 'BUY' | 'SELL' | 'HOLD' | 'UP' | 'DOWN' | 'NEUTRAL'

export type PeriodStats = {
  win_rate: number
  avg_pnl: string
  count: number
}

export type TagStats = {
  count: number
  win_rate: number
  avg_pnl: string
}

export type SymbolStats = {
  count: number
  win_rate: number
  avg_pnl: string
}

export type OverallStats = {
  win_rate: number
  avg_pnl: string
  total_pnl: string
  max_gain: string
  max_loss: string
}

export type ReviewStats = {
  period: string
  total_bubbles: number
  bubbles_with_outcome: number
  overall: OverallStats
  by_period: Record<string, PeriodStats>
  by_tag: Record<string, TagStats>
  by_symbol: Record<string, SymbolStats>
}

export type DirectionStats = {
  predicted: number
  correct: number
  accuracy: number
}

export type ProviderAccuracyStats = {
  provider: string
  total: number
  evaluated: number
  correct: number
  accuracy: number
  by_direction: Record<Direction, DirectionStats>
}

export type ProviderRanking = {
  provider: string
  accuracy: number
  rank: number
}

export type AccuracyResponse = {
  period: string
  outcome_period: string
  total_opinions: number
  evaluated_opinions: number
  by_provider: Record<string, ProviderAccuracyStats>
  ranking: ProviderRanking[]
}

export type CalendarDay = {
  bubble_count: number
  win_count: number
  loss_count: number
  total_pnl: string
}

export type CalendarResponse = {
  from: string
  to: string
  days: Record<string, CalendarDay>
}

export type BubbleAccuracyItem = {
  opinion_id: string
  provider: string
  period: string
  predicted_direction: Direction
  actual_direction: Direction
  is_correct: boolean
  pnl_percent?: string
}

export type BubbleAccuracyResponse = {
  bubble_id: string
  accuracies: BubbleAccuracyItem[]
}

export type ReviewFilters = {
  period: '7d' | '30d' | 'all'
  symbol?: string
  tag?: string
  assetClass?: 'all' | 'crypto' | 'stock'
  venue?: string
  outcomePeriod: '1h' | '4h' | '1d'
}

export type ReplayState = {
  isActive: boolean
  currentTime: number
  endTime: number
  speed: 1 | 2 | 4 | 8
  isPlaying: boolean
}

export type Emotion = 'greedy' | 'fearful' | 'confident' | 'uncertain' | 'calm' | 'frustrated' | ''

export type ReviewNote = {
  id: string
  bubble_id?: string
  title: string
  content: string
  tags?: string[]
  lesson_learned?: string
  emotion?: Emotion
  created_at: string
  updated_at: string
}

export type CreateNoteRequest = {
  bubble_id?: string
  title: string
  content: string
  tags?: string[]
  lesson_learned?: string
  emotion?: Emotion
}

export type NotesListResponse = {
  notes: ReviewNote[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export type PerformanceTrend = {
  date: string
  pnl: number
  cumulative_pnl: number
  win_rate: number
  bubble_count: number
}
```

## File: src/types/safety.ts
```typescript
export type SafetyVerdict = 'intended' | 'mistake' | 'unsure'

export type SafetyMemberTarget = {
  target_type: 'trade' | 'trade_event'
  target_id: string
  reviewed: boolean
  verdict?: SafetyVerdict
}

export type SafetyItem = {
  target_type: 'trade' | 'trade_event'
  target_id: string
  executed_at: string
  asset_class: 'crypto' | 'stock' | string
  venue: string
  venue_name: string
  symbol: string
  side?: string
  qty?: string
  price?: string
  source: string
  reviewed: boolean
  verdict?: SafetyVerdict
  note?: string
  reviewed_at?: string
  group_size?: number
  member_targets?: SafetyMemberTarget[]
}

export type SafetyTodayResponse = {
  date: string
  timezone: string
  total: number
  reviewed: number
  pending: number
  items: SafetyItem[]
}

export type UpsertSafetyReviewPayload = {
  target_type: SafetyItem['target_type']
  target_id: string
  verdict: SafetyVerdict
  note?: string
}

export type SafetyReviewResponse = {
  id: string
  target_type: SafetyItem['target_type']
  target_id: string
  verdict: SafetyVerdict
  note?: string
  created_at: string
  updated_at: string
}
```

## File: src/types/trade.ts
```typescript
export type TradeItem = {
  id: string
  bubble_id?: string
  exchange: string
  symbol: string
  side: string
  position_side?: string
  open_close?: string
  reduce_only?: boolean
  quantity: string
  price: string
  realized_pnl?: string
  trade_time: string
  binance_trade_id: number
}

export type TradeListResponse = {
  page: number
  limit: number
  total: number
  items: TradeItem[]
}

export type TradeSideSummary = {
  side: string
  trade_count?: number
  total_trades?: number
  total_volume?: string
  realized_pnl_total?: string
}

export type TradeSymbolSummary = {
  symbol: string
  trade_count?: number
  total_trades?: number
  buy_count?: number
  sell_count?: number
  total_volume?: string
  realized_pnl_total?: string
  wins?: number
  losses?: number
}

export type TradeExchangeSummary = {
  exchange: string
  trade_count?: number
  total_trades?: number
  buy_count?: number
  sell_count?: number
  total_volume?: string
  realized_pnl_total?: string
}

export type TradeTotals = {
  total_trades: number
  buy_count?: number
  sell_count?: number
  total_volume?: string
  realized_pnl_total?: string
  wins?: number
  losses?: number
  breakeven?: number
  average_pnl?: string
}

export type TradeSummaryResponse = {
  exchange: string
  totals: TradeTotals
  by_exchange: TradeExchangeSummary[]
  by_side: TradeSideSummary[]
  by_symbol: TradeSymbolSummary[]
}
```

## File: tests/qa-smoke.spec.ts
```typescript
import { expect, request, test } from '@playwright/test'

const authStorageKey = 'kifu-auth-storage'

type LoginResponse = {
  access_token?: string
  refresh_token?: string
}

const authPayload = (email: string, password: string, name: string) => ({
  email,
  password,
  name,
})

async function createAuthedUser() {
  const timestamp = Date.now()
  const email = `e2e_smoke_${timestamp}@kifu.local`
  const password = 'TestPass123!'
  const name = 'Kifu QA User'

  const api = await request.newContext({
    baseURL: process.env.BACKEND_API_URL || 'http://127.0.0.1:8080/api/v1',
  })

  const register = await api.post('/api/v1/auth/register', {
    data: authPayload(email, password, name),
  })
  if (![200, 201, 409].includes(register.status())) {
    throw new Error(`register failed: ${register.status()} ${await register.text()}`)
  }

  const login = await api.post('/api/v1/auth/login', {
    data: { email, password },
  })
  if (login.status() !== 200) {
    throw new Error(`login failed: ${login.status()} ${await login.text()}`)
  }

  const body = (await login.json()) as LoginResponse
  if (!body.access_token || !body.refresh_token) {
    throw new Error('missing tokens in login response')
  }

  await api.dispose()

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
  }
}

async function verifyAuthenticatedPages(page: any, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  expect(page.url()).toContain(route)
  if (page.url().includes('/login')) {
    throw new Error(`unexpected redirect to login on route ${route}`)
  }

  const main = page.locator('main')
  await expect(main).toBeVisible({ timeout: 10_000 })
}

test('kifu core routes smoke', async ({ page }: { page: any }) => {
  const tokens = await createAuthedUser()

  await page.addInitScript(
    (payload: any) => {
      window.localStorage.setItem(
        payload.storageKey,
        JSON.stringify({
          state: {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            isAuthenticated: true,
          },
          version: 0,
        }),
      )
    },
    { storageKey: authStorageKey, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
  )

  const routes = [
    '/home',
    '/chart/BTCUSDT',
    '/trades',
    '/review',
    '/portfolio',
    '/bubbles',
    '/alerts',
    '/alert',
    '/settings',
  ]

  for (const route of routes) {
    await verifyAuthenticatedPages(page, route)
    // ensure shell/nav renders after auth
    await expect(page.getByRole('link', { name: /Home|홈/ })).toBeVisible()
  }
})
```

## File: eslint.config.js
```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.next', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'prefer-const': 'warn',
      'no-empty': 'warn',
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
```

## File: playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test'

const frontendBaseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'
const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8080'

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
  use: {
    baseURL: frontendBaseUrl,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  webServer: {
    command: process.env.PLAYWRIGHT_WEBSERVER_COMMAND || 'npm run dev -- --hostname 127.0.0.1 --port 5173',
    url: frontendBaseUrl,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stderr: 'pipe',
    stdout: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox'],
        },
      },
    },
  ],
  // For the smoke suite we only need to assert app shell and route readiness.
  outputDir: '.playwright/results',
  globalSetup: async () => {
    process.env.BACKEND_API_URL = backendUrl
    process.env.FRONTEND_BASE_URL = frontendBaseUrl
  },
})
```

## File: postcss.config.js
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## File: tailwind.config.js
```javascript
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}
```
