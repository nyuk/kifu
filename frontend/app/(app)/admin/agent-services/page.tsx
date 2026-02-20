'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api } from '../../../../src/lib/api'

type ServiceSummary = {
  run_type: string
  total_runs: number
  running_runs: number
  completed_runs: number
  failed_runs: number
  other_runs: number
  last_started_at: string | null
}

type AgentServiceRun = {
  run_id: string
  run_type: string
  status: string
  user_id: string
  user_email: string
  started_at: string
  finished_at: string | null
  meta: Record<string, unknown>
}

type AgentServicesResponse = {
  snapshot_at: string
  services: ServiceSummary[]
  runs: AgentServiceRun[]
}

const serviceLabelMap: Record<string, string> = {
  exchange_sync: '거래소 동기화',
  trade_csv_import: '거래 CSV Import',
  portfolio_csv_import: '포트폴리오 CSV Import',
}

const statusClass: Record<string, string> = {
  running: 'text-sky-200 bg-sky-400/10',
  completed: 'text-emerald-200 bg-emerald-400/10',
  failed: 'text-rose-200 bg-rose-400/10',
}

const formatDateTime = (value: string | null): string => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

const statusText = (status: string) => status || '-'

const serviceName = (runType: string) => serviceLabelMap[runType] || runType

const runMetaNote = (meta: Record<string, unknown>): string | null => {
  const values = []
  const exchange = meta?.exchange || meta?.run_type
  if (exchange) values.push(String(exchange))
  const inserted = meta?.inserted_count ?? meta?.exchange_rows_imported
  if (inserted !== undefined) values.push(`inserted=${inserted}`)
  const venue = meta?.venue
  if (venue) values.push(`venue=${String(venue)}`)
  return values.length === 0 ? null : values.join(' / ')
}

export default function AdminAgentServicesPage() {
  const [data, setData] = useState<AgentServicesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [serviceFilter, setServiceFilter] = useState('all')

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const response = await api.get<AgentServicesResponse>('/v1/admin/agent-services')
        if (!alive) return
        setData(response.data)
      } catch {
        if (!alive) return
        setError('에이전트 서비스 정보를 불러오지 못했습니다.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()

    return () => {
      alive = false
    }
  }, [])

  const serviceTypes = useMemo(() => {
    if (!data) return []
    const all = data.services.map((service) => service.run_type)
    if (all.length === 0) return []
    return ['all', ...all]
  }, [data])

  const filteredRuns = useMemo(() => {
    if (!data) return []
    if (serviceFilter === 'all') return data.runs
    return data.runs.filter((run) => run.run_type === serviceFilter)
  }, [data, serviceFilter])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="rounded-2xl border border-cyan-400/20 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Admin Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-100">에이전트 서비스 상세</h1>
        <p className="mt-3 text-sm text-zinc-400">
          운영/진단 전용으로 최근 runs와 요약 상태를 보여줍니다.
        </p>
        <Link href="/admin" className="mt-4 inline-flex text-xs font-medium text-cyan-200 hover:text-cyan-100">
          ← 대시보드로 돌아가기
        </Link>
      </header>

      {error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>
      )}

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-medium text-zinc-100">서비스 집계</h2>
          <span className="text-xs text-zinc-500">
            snapshot: {data ? formatDateTime(data.snapshot_at) : 'loading...'}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {!data ? (
            <p className="text-sm text-zinc-400">로딩중...</p>
          ) : (
            data.services.map((service) => (
              <div key={service.run_type} className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{serviceName(service.run_type)}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-100">{service.total_runs} runs</p>
                <p className="mt-3 text-xs text-zinc-300">
                  running {service.running_runs} · completed {service.completed_runs} · failed {service.failed_runs}
                </p>
                <p className="mt-2 text-[11px] text-zinc-500">last started: {formatDateTime(service.last_started_at)}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-zinc-100">최근 실행 이력</h2>
          <div className="flex flex-wrap gap-2">
            {serviceTypes.map((serviceType) => (
              <button
                key={serviceType}
                type="button"
                onClick={() => setServiceFilter(serviceType)}
                className={`rounded-md border px-3 py-1 text-xs ${serviceFilter === serviceType
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
                  : 'border-white/20 bg-white/5 text-zinc-300'
                  }`}
              >
                {serviceType === 'all' ? '전체' : serviceName(serviceType)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-black/20 text-zinc-300">
              <tr>
                <th className="px-3 py-2 font-semibold">Run ID</th>
                <th className="px-3 py-2 font-semibold">Service</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">User</th>
                <th className="px-3 py-2 font-semibold">Started</th>
                <th className="px-3 py-2 font-semibold">Finished</th>
                <th className="px-3 py-2 font-semibold">Meta</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-zinc-400" colSpan={7}>로딩중...</td>
                </tr>
              ) : filteredRuns.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-zinc-400" colSpan={7}>실행 이력이 없습니다.</td>
                </tr>
              ) : (
                filteredRuns.map((run) => (
                  <tr key={run.run_id} className="border-t border-white/[0.06] text-zinc-200">
                    <td className="px-3 py-2 font-medium text-zinc-300">{run.run_id.slice(0, 8)}...</td>
                    <td className="px-3 py-2">{serviceName(run.run_type)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-md px-2 py-1 text-[11px] ${statusClass[run.status] || 'text-zinc-200 bg-zinc-500/10'}`}>
                        {statusText(run.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-300">{run.user_email || run.user_id}</td>
                    <td className="px-3 py-2">{formatDateTime(run.started_at)}</td>
                    <td className="px-3 py-2">{formatDateTime(run.finished_at)}</td>
                    <td className="px-3 py-2 text-zinc-400">{runMetaNote(run.meta) || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
