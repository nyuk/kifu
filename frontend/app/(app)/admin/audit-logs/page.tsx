'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../../../src/lib/api'

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

type AdminAuditLogListResponse = {
  logs: AdminAuditLog[]
  total: number
  limit: number
  offset: number
}

const PAGE_SIZE = 25
const QUICK_ACTION_FILTERS = [
  '',
  'user.admin.update',
  'admin.policy.update',
]

const QUICK_RESOURCE_FILTERS = ['', 'user', 'policy', 'admin']

const AUDIT_ACTION_STYLE: Record<string, string> = {
  'user.admin.update': 'border-cyan-500/60 bg-cyan-500/15 text-cyan-100',
  'admin.policy.update': 'border-fuchsia-500/60 bg-fuchsia-500/15 text-fuchsia-100',
  'agent_service.action': 'border-emerald-500/60 bg-emerald-500/15 text-emerald-100',
}

const AUDIT_RESOURCE_STYLE: Record<string, string> = {
  user: 'border-cyan-500/60 bg-cyan-500/12 text-cyan-100',
  policy: 'border-fuchsia-500/60 bg-fuchsia-500/12 text-fuchsia-100',
  admin: 'border-emerald-500/60 bg-emerald-500/12 text-emerald-100',
}

const formatDetails = (details: Record<string, unknown>): string => {
  if (!details || Object.keys(details).length === 0) return '-'
  return JSON.stringify(details)
}

const formatCellDate = (isoTime: string) => new Date(isoTime).toLocaleString()

const normalizeResourceLabel = (resource: string, target: string) => {
  if (resource && target) return `${resource}/${target}`
  return resource || target || 'UNKNOWN'
}

const actionClass = (action: string): string =>
  AUDIT_ACTION_STYLE[action] ?? 'border-white/20 bg-white/5 text-zinc-200'

const resourceClass = (resource: string): string =>
  AUDIT_RESOURCE_STYLE[resource] ?? AUDIT_RESOURCE_STYLE.admin

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [resource, setResource] = useState('')
  const [logs, setLogs] = useState<AdminAuditLog[]>([])
  const [limit] = useState(PAGE_SIZE)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (action.trim()) params.set('action', action.trim())
      if (resource.trim()) params.set('resource', resource.trim())
      params.set('limit', String(limit))
      params.set('offset', String(offset))

      const response = await api.get<AdminAuditLogListResponse>(`/v1/admin/audit-logs?${params.toString()}`)
      setLogs(response.data.logs)
      setTotal(response.data.total)
    } catch (error) {
      setMessage('감사 로그를 불러오지 못했습니다.')
      console.error(error)
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [search, action, resource, offset, limit])

  const currentStart = useMemo(() => (total === 0 ? 0 : offset + 1), [offset, total])
  const currentEnd = useMemo(() => {
    if (total === 0) return 0
    return Math.min(offset + limit, Math.max(total, logs.length))
  }, [offset, limit, total, logs.length])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOffset(0)
  }

  const clearFilters = () => {
    setSearch('')
    setAction('')
    setResource('')
    setOffset(0)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="rounded-2xl border border-cyan-400/20 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Admin Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-100">관리자 변경 이력</h1>
        <p className="mt-3 text-sm text-zinc-400">관리자 권한 변경 등 운영 관련 액션 로그를 조회합니다.</p>
        <Link href="/admin" className="mt-4 inline-flex text-xs font-medium text-cyan-200 hover:text-cyan-100">
          ← 대시보드로 돌아가기
        </Link>
      </header>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-zinc-400">검색</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-100 outline-none"
              placeholder="액터 이메일, 대상 이메일, 액션 키워드"
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-zinc-400">액션</span>
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-100 outline-none"
            >
              {QUICK_ACTION_FILTERS.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item || '전체'}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-zinc-400">리소스</span>
            <select
              value={resource}
              onChange={(event) => setResource(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-100 outline-none"
            >
              {QUICK_RESOURCE_FILTERS.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item || '전체'}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg border border-cyan-500 bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            조회
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-zinc-500/50 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700/30"
          >
            초기화
          </button>
        </form>
        <p className="mt-4 text-xs text-zinc-400">
          총 {total}건, 노출 {currentStart} - {currentEnd}
        </p>
        {message && <p className="mt-2 text-sm text-amber-200">{message}</p>}
      </section>

      <section className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-zinc-400">
              <th className="px-3 py-2">시간</th>
              <th className="px-3 py-2">액터</th>
              <th className="px-3 py-2">액션</th>
              <th className="px-3 py-2">대상</th>
              <th className="px-3 py-2">상세</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-zinc-400" colSpan={5}>
                  로딩 중...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-zinc-400" colSpan={5}>
                  로그가 없습니다.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className={[
                    'border-t border-white/10',
                    log.action === 'admin.policy.update' ? 'bg-fuchsia-500/[0.06]' : '',
                    log.action === 'user.admin.update' ? 'bg-cyan-500/[0.04]' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <td className="px-3 py-3 text-zinc-400">{formatCellDate(log.created_at)}</td>
                  <td className="px-3 py-3 text-zinc-200">
                    {log.actor_email || '-'}
                    <span className="ml-1 text-zinc-500">({log.actor_user_id || '-'})</span>
                  </td>
                  <td className="px-3 py-3 text-zinc-100">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${actionClass(log.action || '')}`}>
                      {log.action || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-zinc-100">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${resourceClass(log.action_resource || 'admin')}`}>
                      {normalizeResourceLabel(log.action_resource, log.action_target)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-zinc-200">
                    {log.target_email || '-'}
                    <span className="ml-1 text-zinc-500">({log.target_user_id || '-'})</span>
                  </td>
                  <td className="px-3 py-3 text-zinc-300 break-all">{formatDetails(log.details)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="flex items-center justify-between gap-2">
        <button
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0 || loading}
          className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-zinc-100 disabled:opacity-40"
          type="button"
        >
          이전
        </button>
        <button
          onClick={() => setOffset(offset + limit)}
          disabled={loading || offset + limit >= total}
          className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-zinc-100 disabled:opacity-40"
          type="button"
        >
          다음
        </button>
      </section>
    </div>
  )
}
