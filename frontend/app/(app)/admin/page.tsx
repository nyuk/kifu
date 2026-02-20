'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api } from '../../../src/lib/api'

const ADMIN_SIM_REPORT_HISTORY_KEY = 'kifu-admin-sim-report-last'

type AdminTelemetry = {
  snapshot_at: string
  total_users: number
  total_admins: number
  total_subscriptions: number
  total_trades: number
  total_bubbles: number
  total_review_notes: number
  total_runs: number
  total_summary_packs: number
}

type SimReportHistorySummary = {
  run_id: string
  started_at: string
  finished_at: string
  days: number
  start_date: string
  end_date: string
  totals: {
    trades_created: number
    bubbles_created: number
    review_days_touched: number
    review_days_complete: number
    ai_probe_fail: number
    ai_probe_pass: number
  }
  streak: {
    current: number
    longest: number
  }
  effective_user: {
    email: string
    mode: string
    reset_performed: boolean
  }
  warnings_count: number
  warnings?: string[]
}

const tools = [
  {
    href: '/admin/sim-report',
    label: 'Sim Report Generator',
    title: '시뮬레이터 진단',
    description:
      '과거 기간 데이터를 기반으로 거래/복기/알림/AI 목업 데이터를 대량 생성해 동작을 검증합니다.',
  },
  {
    href: '/admin/agent-services',
    label: 'Agent Service Detail',
    title: '에이전트 운영 상세',
    description:
      'runs/simulation 파이프라인의 최근 실행 이력과 상태를 모니터링합니다.',
  },
  {
    href: '/admin/users',
    label: 'User Administration',
    title: '관리자 사용자 관리',
    description: '운영자 계정 발급과 회수를 관리하고, 사용자 조회를 수행합니다.',
  },
]

export default function AdminPage() {
  const [lastRun, setLastRun] = useState<SimReportHistorySummary | null>(null)
  const [telemetry, setTelemetry] = useState<AdminTelemetry | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_SIM_REPORT_HISTORY_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      setLastRun(parsed as SimReportHistorySummary)
    } catch {
      setLastRun(null)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadTelemetry = async () => {
      try {
        const response = await api.get<AdminTelemetry>('/v1/admin/telemetry')
        if (isMounted) setTelemetry(response.data)
      } catch {
        if (isMounted) setTelemetry(null)
      }
    }
    loadTelemetry()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="rounded-2xl border border-cyan-400/20 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Admin Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-100">관리자 대시보드</h1>
        <p className="mt-3 text-sm text-zinc-400">
          운영/점검용 기능만 노출되며, 권한이 없는 계정은 접근이 제한됩니다.
        </p>
      </header>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <h2 className="text-lg font-medium text-zinc-100">관리자 기능</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-xl border border-cyan-500/20 bg-black/30 p-4 transition hover:border-cyan-400/45 hover:bg-black/45"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-cyan-200/90">{tool.label}</p>
              <p className="mt-2 text-base font-semibold text-zinc-100">{tool.title}</p>
              <p className="mt-2 text-sm text-zinc-400">{tool.description}</p>
              <p className="mt-4 inline-flex text-xs font-medium text-cyan-200">이동 →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <h2 className="text-lg font-medium text-zinc-100">운영 텔레메트리</h2>
        <p className="mt-2 text-xs text-zinc-400">스냅샷: {telemetry ? new Date(telemetry.snapshot_at).toLocaleString() : 'loading...'}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="총 사용자" value={telemetry?.total_users ?? '-'} />
          <SummaryCard title="관리자" value={telemetry?.total_admins ?? '-'} />
          <SummaryCard title="구독 계약" value={telemetry?.total_subscriptions ?? '-'} />
          <SummaryCard title="거래 수" value={telemetry?.total_trades ?? '-'} />
          <SummaryCard title="버블 수" value={telemetry?.total_bubbles ?? '-'} />
          <SummaryCard title="복기 노트" value={telemetry?.total_review_notes ?? '-'} />
          <SummaryCard title="Run 이력" value={telemetry?.total_runs ?? '-'} />
          <SummaryCard title="요약팩" value={telemetry?.total_summary_packs ?? '-'} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-100">마지막 시뮬레이터 실행</h2>
          <Link href="/admin/sim-report" className="text-xs font-medium text-cyan-200 hover:text-cyan-100">
            새로 실행
          </Link>
        </div>
        {lastRun ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Run ID" value={lastRun.run_id} />
            <SummaryCard title="Duration Range" value={`${lastRun.start_date} ~ ${lastRun.end_date}`} />
            <SummaryCard title="Trades" value={lastRun.totals.trades_created} />
            <SummaryCard title="Bubbles" value={lastRun.totals.bubbles_created} />
            <SummaryCard title="Review" value={`${lastRun.totals.review_days_complete} / ${lastRun.totals.review_days_touched}`} />
            <SummaryCard title="Streak" value={`${lastRun.streak.current} (max ${lastRun.streak.longest})`} />
            <SummaryCard title="AI Probe" value={`${lastRun.totals.ai_probe_pass} / ${lastRun.totals.ai_probe_fail}`} />
            <SummaryCard title="Warnings" value={lastRun.warnings_count} />
            <SummaryCard title="User" value={`${lastRun.effective_user.email} (${lastRun.effective_user.mode})`} />
            <SummaryCard title="Reset" value={lastRun.effective_user.reset_performed ? 'ON' : 'OFF'} />
            <SummaryCard title="Executed" value={new Date(lastRun.finished_at).toLocaleString()} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-400">아직 시뮬레이터 실행 기록이 없습니다.</p>
        )}
        {lastRun?.warnings && lastRun.warnings.length > 0 && (
          <ul className="mt-4 list-disc pl-5 text-sm text-amber-200">
            {lastRun.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <h2 className="text-lg font-medium text-zinc-100">개발 중</h2>
        <p className="mt-2 text-sm text-zinc-400">
          다음 단계: 에이전트 서비스 상세 화면 운영 지표 노출 확장과 구조적 장애 대응 로그 가이드를 순차 반영합니다.
        </p>
      </section>
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">{title}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-100 break-all">{value}</p>
    </div>
  )
}
