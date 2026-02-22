'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api } from '../../../../src/lib/api'

type AdminPolicy = {
  key: string
  value: boolean
  description: string
  updated_by: string | null
  updated_at: string
}

type AdminPolicyListResponse = {
  policies: AdminPolicy[]
}

type AdminPolicyUpdateRequest = {
  key: string
  value: boolean
}

const POLICY_LABELS: Record<string, string> = {
  admin_user_signup_enabled: '관리자 사용자 등록 허용',
  maintenance_mode: '유지보수 모드',
  notification_delivery_enabled: '알림 전송 허용',
  agent_service_poller_enabled: '에이전트 폴러 서비스',
}

const POLICY_HINT: Record<string, string> = {
  admin_user_signup_enabled: 'true면 운영자가 새 사용자를 발급/초대할 수 있습니다.',
  maintenance_mode: 'true면 일반 사용자 접근을 제한하고, 비상 점검 모드로 동작합니다.',
  notification_delivery_enabled: 'false로 설정하면 알림 관련 배달 기능을 중지합니다.',
  agent_service_poller_enabled: 'true면 거래소 자동 동기화(폴러) 실행을 허용합니다.',
}

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '미기록'
  }
  try {
    return new Date(value).toLocaleString()
  } catch {
    return '잘못된 시간'
  }
}

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<AdminPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadPolicies = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get<AdminPolicyListResponse>('/v1/admin/policies')
      setPolicies(response.data.policies)
    } catch (e) {
      setError('정책 목록을 불러오지 못했습니다.')
      console.error(e)
      setPolicies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPolicies()
  }, [])

  const policyName = (key: string) => POLICY_LABELS[key] || key

  const togglePolicy = async (policy: AdminPolicy) => {
    const nextValue = !policy.value
    setSavingKey(policy.key)
    setMessage('')
    setError('')

    try {
      const payload: AdminPolicyUpdateRequest = {
        key: policy.key,
        value: nextValue,
      }
      await api.put<AdminPolicy>('/v1/admin/policies', payload)
      setMessage(`${policyName(policy.key)}: ${nextValue ? 'ON' : 'OFF'}로 변경했습니다.`)
      await loadPolicies()
    } catch (e) {
      setMessage('')
      setError('정책 변경 실패')
      console.error(e)
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="rounded-2xl border border-cyan-400/20 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Admin Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-100">운영 정책 설정</h1>
        <p className="mt-3 text-sm text-zinc-400">
          운영 정책을 즉시 반영 가능한 범위에서 토글로 관리합니다.
        </p>
        <Link href="/admin" className="mt-4 inline-flex text-xs font-medium text-cyan-200 hover:text-cyan-100">
          ← 대시보드로 돌아가기
        </Link>
      </header>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <h2 className="text-lg font-medium text-zinc-100">정책 목록</h2>
        <p className="mt-2 text-xs text-zinc-400">실행 중인 운영 정책을 ON/OFF로 제어합니다.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="px-3 py-2">정책</th>
                <th className="px-3 py-2">설명</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">최종 반영</th>
                <th className="px-3 py-2">반영자</th>
                <th className="px-3 py-2">수정</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-4 text-zinc-400" colSpan={6}>
                    로딩 중...
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-zinc-400" colSpan={6}>
                    설정 가능한 정책이 없습니다.
                  </td>
                </tr>
              ) : (
                policies.map((policy) => (
                  <tr key={policy.key} className="border-t border-white/10">
                    <td className="px-3 py-3 text-zinc-100">
                      <p>{policyName(policy.key)}</p>
                      <p className="text-[11px] text-zinc-500">{policy.key}</p>
                    </td>
                    <td className="px-3 py-3 text-zinc-400">
                      <p>{policy.description}</p>
                      <p className="text-[11px] text-zinc-500">{POLICY_HINT[policy.key]}</p>
                    </td>
                    <td className="px-3 py-3 text-zinc-100">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs ${
                          policy.value ? 'bg-emerald-500/20 text-emerald-100' : 'bg-rose-500/20 text-rose-100'
                        }`}
                      >
                        {policy.value ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-zinc-200">
                      <p>{formatDateTime(policy.updated_at)}</p>
                    </td>
                    <td className="px-3 py-3 text-zinc-400">
                      <p>{policy.updated_by || '시스템(초기값)'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => togglePolicy(policy)}
                        disabled={savingKey === policy.key}
                        className="rounded-md border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingKey === policy.key ? '저장중...' : policy.value ? 'OFF로 전환' : 'ON으로 전환'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {message && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</p>}
    </div>
  )
}
