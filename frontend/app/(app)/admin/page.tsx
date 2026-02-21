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

type AdminServiceSummary = {
  run_type: string
  total_runs: number
  running_runs: number
  completed_runs: number
  failed_runs: number
  other_runs: number
  last_started_at: string | null
}

type AgentServiceRun = {
  run_type: string
  status: string
  user_email: string
  started_at: string
  finished_at: string | null
}

type AgentServicesResponse = {
  snapshot_at: string
  services: AdminServiceSummary[]
  runs: AgentServiceRun[]
}

type AdminAuditLog = {
  id: string
  actor_user_id: string | null
  actor_email: string
  target_user_id: string | null
  target_email: string
  action: string
  action_target: string
  action_resource: string
  details: Record<string, unknown>
  created_at: string
}

type AdminAuditLogResponse = {
  logs: AdminAuditLog[]
  total: number
  limit: number
  offset: number
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
  {
    href: '/admin/audit-logs',
    label: 'Admin Audit Log',
    title: '관리자 변경 이력',
    description: 'admin 역할 변경 등 운영 로그를 조회하고 요청자/대상/시간을 확인합니다.',
  },
  {
    href: '/admin/policies',
    label: 'Operational Policy',
    title: '운영 정책 토글',
    description: '운영 전역 정책(점검 모드, 알림 발송, 관리자 등록 기능) 토글을 관리합니다.',
  },
]

export default function AdminPage() {
  const [lastRun, setLastRun] = useState<SimReportHistorySummary | null>(null)
  const [telemetry, setTelemetry] = useState<AdminTelemetry | null>(null)
  const [agentServices, setAgentServices] = useState<AgentServicesResponse | null>(null)
  const [agentLoadError, setAgentLoadError] = useState('')
  const [recentAuditLogs, setRecentAuditLogs] = useState<AdminAuditLog[]>([])
  const [auditLoadError, setAuditLoadError] = useState('')

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
    const load = async () => {
      try {
        const [telemetryResponse, servicesResponse] = await Promise.all([
          api.get<AdminTelemetry>('/v1/admin/telemetry'),
          api.get<AgentServicesResponse>('/v1/admin/agent-services'),
        ])

        if (!isMounted) return
        setTelemetry(telemetryResponse.data)
        setAgentServices(servicesResponse.data)
        setAgentLoadError('')
      } catch {
        if (isMounted) {
          setTelemetry(null)
          setAgentServices(null)
          setAgentLoadError('운영 지표(에이전트 서비스) 로딩에 실패했습니다.')
        }
      }

      try {
        const auditResponse = await api.get<AdminAuditLogResponse>('/v1/admin/audit-logs?limit=5&offset=0')
        if (!isMounted) return
        setRecentAuditLogs(auditResponse.data.logs || [])
        setAuditLoadError('')
      } catch {
        if (isMounted) {
          setRecentAuditLogs([])
          setAuditLoadError('최근 감사 로그 로딩에 실패했습니다.')
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  const serviceCount = agentServices?.services.length ?? 0
  const runningServices = agentServices?.services.reduce((sum, service) => sum + service.running_runs, 0) ?? 0
  const failedServices = agentServices?.services.filter((service) => service.failed_runs > 0).length ?? 0
  const latestFailedRun = agentServices?.runs.find((run) => run.status === 'failed')

  const failedRunCountByType = (type: string) =>
    agentServices?.services.find((service) => service.run_type === type)?.failed_runs ?? 0

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
        {agentLoadError && (
          <p className="mt-4 rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{agentLoadError}</p>
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-zinc-100">에이전트 서비스 현황</h2>
            <p className="mt-2 text-xs text-zinc-400">
              snapshot: {agentServices ? new Date(agentServices.snapshot_at).toLocaleString() : 'loading...'}
            </p>
          </div>
          <Link href="/admin/agent-services" className="text-xs font-medium text-cyan-200 hover:text-cyan-100">
            상세 화면
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="서비스 수" value={serviceCount} />
          <SummaryCard title="진행 중 Runs" value={runningServices} />
          <SummaryCard title="실패 서비스 수" value={failedServices} />
          <SummaryCard title="총 실패 런" value={failedRunCountByType('trade_csv_import') + failedRunCountByType('portfolio_csv_import') + failedRunCountByType('exchange_sync')} />
        </div>
        <div className="mt-4 rounded-md border border-white/[0.08] bg-black/20 p-4 text-sm text-zinc-300">
          {agentServices ? (
            <div className="grid gap-2 md:grid-cols-2">
              {agentServices.services.length === 0 ? (
                <p className="text-zinc-500">최근 서비스 집계가 없습니다.</p>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-zinc-500">최근 에러가 많은 서비스</p>
                    <ul className="mt-2 space-y-1">
                      {agentServices.services
                        .filter((service) => service.failed_runs > 0)
                        .sort((a, b) => b.failed_runs - a.failed_runs)
                        .slice(0, 3)
                        .map((service) => (
                          <li key={service.run_type}>
                            {serviceName(service.run_type)} · 실패 {service.failed_runs}회
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">최근 실패 런</p>
                    <p className="mt-2">
                      {latestFailedRun
                        ? `${serviceName(latestFailedRun.run_type)} (${new Date(latestFailedRun.started_at).toLocaleString()})`
                        : '최근 실패 런 없음'}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-zinc-500">로딩중...</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-zinc-100">최근 감사 로그</h2>
            <p className="mt-2 text-xs text-zinc-400">관리자 핵심 변경 이력을 바로 확인합니다.</p>
          </div>
          <Link href="/admin/audit-logs" className="text-xs font-medium text-cyan-200 hover:text-cyan-100">
            전체 보기
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {auditLoadError && (
            <p className="rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{auditLoadError}</p>
          )}
          {recentAuditLogs.length === 0 && !auditLoadError ? (
            <p className="text-sm text-zinc-400">감사 로그가 없습니다.</p>
          ) : (
            recentAuditLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
                <p className="text-xs text-zinc-400">{new Date(log.created_at).toLocaleString()}</p>
                <p className="mt-1 text-sm text-zinc-100">
                  {log.actor_email || 'SYSTEM'} · {log.action} · {log.action_resource}/{log.action_target}
                </p>
                <p className="mt-1 text-xs text-zinc-400">대상: {log.target_email || '-'}</p>
              </div>
            ))
          )}
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
        <h2 className="text-lg font-medium text-zinc-100">관리자 페이지 역할</h2>
        <p className="mt-2 text-sm text-zinc-400">
          운영 권한은 DB `users.is_admin` 단일 기준으로 판단하고, 아래 항목을 중앙화했습니다.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-300">
          <li>사용자 권한: `/admin/users`에서 운영자 권한 조회/부여/회수</li>
          <li>감사 추적: `/admin/audit-logs`에서 요청자/대상/변경자 기록 조회</li>
          <li>운영 제어: `/admin/policies`와 `/admin/agent-services`로 제한 정책과 폴러 제어</li>
          <li>시뮬레이션: `/admin/sim-report`는 관리자 전용으로 노출/권한 제어</li>
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          권한/노출 규칙은 프론트엔드 메뉴 제어와 백엔드 경로 가드가 이중 적용되어, 관리자 경로 직접 호출 시에도 차단됩니다.
        </p>
      </section>
    </div>
  )
}

const serviceName = (runType: string) => {
  if (runType === 'exchange_sync') return '거래소 동기화'
  if (runType === 'trade_csv_import') return '거래 CSV Import'
  if (runType === 'portfolio_csv_import') return '포트폴리오 CSV Import'
  return runType
}

function SummaryCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">{title}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-100 break-all">{value}</p>
    </div>
  )
}
