'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../../../src/lib/api'

type AdminUser = {
  id: string
  email: string
  name: string
  ai_allowlisted: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
}

type AdminUserListResponse = {
  users: AdminUser[]
  total: number
  limit: number
  offset: number
}

type MeResponse = {
  id: string
}

type RoleFilter = 'all' | 'admin' | 'member'

const PAGE_SIZE = 20

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [limit] = useState(PAGE_SIZE)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setMessage('')

    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      params.set('limit', String(limit))
      params.set('offset', String(offset))

      const response = await api.get<AdminUserListResponse>(`/v1/admin/users?${params.toString()}`)
      setUsers(response.data.users)
      setTotal(response.data.total)
    } catch (error) {
      setMessage('사용자 목록 조회 실패')
      console.error(error)
      setUsers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [search, offset, limit])

  const loadMe = useCallback(async () => {
    try {
      const response = await api.get<MeResponse>('/v1/users/me')
      setMyUserId(response.data.id)
    } catch {
      setMyUserId(null)
    }
  }, [])

  const currentStart = useMemo(() => {
    if (total === 0) return 0
    return offset + 1
  }, [offset, total])

  const currentEnd = useMemo(() => {
    if (total === 0) return 0
    return Math.min(offset + limit, Math.max(total, users.length))
  }, [offset, limit, total, users.length])

  useEffect(() => {
    loadMe()
    loadUsers()
  }, [loadMe, loadUsers])

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'all') return users
    if (roleFilter === 'admin') return users.filter((user) => user.is_admin)
    return users.filter((user) => !user.is_admin)
  }, [users, roleFilter])

  const filteredCount = useMemo(() => filteredUsers.length, [filteredUsers])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOffset(0)
  }

  const toggleAdmin = async (user: AdminUser) => {
    if (user.id === myUserId) {
      setMessage('내 계정은 이 화면에서 관리자 권한을 변경할 수 없습니다.')
      return
    }

    const nextValue = !user.is_admin
    try {
      await api.patch(`/v1/admin/users/${user.id}/admin`, { is_admin: nextValue })
      setMessage(`${user.email}를 ${nextValue ? '관리자 등록' : '관리자 해제'}했습니다.`)
      await loadUsers()
    } catch (error) {
      setMessage('권한 변경 실패')
      console.error(error)
    }
  }

  const handlePrev = () => {
    setOffset(Math.max(0, offset - limit))
  }

  const handleNext = () => {
    setOffset(offset + limit)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="rounded-2xl border border-cyan-400/20 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Admin Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-100">관리자 사용자 관리</h1>
        <p className="mt-3 text-sm text-zinc-400">
          관리자 페이지에서 사용자 조회와 관리자 권한 부여/회수를 수행할 수 있습니다.
        </p>
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
              placeholder="이메일 또는 이름"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-cyan-500 bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            조회
          </button>
        </form>
        <p className="mt-4 text-xs text-zinc-400">
          총 {total}명, 노출 {currentStart} - {currentEnd}, 화면필터 {filteredCount}명
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`rounded-md border px-3 py-1 ${roleFilter === 'all'
              ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
              : 'border-white/20 text-zinc-300 bg-white/5'}`}
          >
            전체
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('admin')}
            className={`rounded-md border px-3 py-1 ${roleFilter === 'admin'
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100'
              : 'border-white/20 text-zinc-300 bg-white/5'}`}
          >
            관리자만
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('member')}
            className={`rounded-md border px-3 py-1 ${roleFilter === 'member'
              ? 'border-rose-500/50 bg-rose-500/15 text-rose-100'
              : 'border-white/20 text-zinc-300 bg-white/5'}`}
          >
            비관리자
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-amber-200">{message}</p>}
      </section>

      <section className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-400">
              <th className="px-3 py-2">이메일</th>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">관리자</th>
              <th className="px-3 py-2">AI 허용</th>
              <th className="px-3 py-2">생성일</th>
              <th className="px-3 py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-zinc-400" colSpan={6}>
                  로딩 중...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-zinc-400" colSpan={6}>
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isSelf = user.id === myUserId
                const canToggle = !isSelf
                const buttonClassName = canToggle
                  ? user.is_admin
                    ? 'rounded-md px-3 py-1 text-xs font-semibold border border-amber-500/40 bg-amber-500/15 text-amber-100'
                    : 'rounded-md px-3 py-1 text-xs font-semibold border border-cyan-500/40 bg-cyan-500/15 text-cyan-100'
                  : 'rounded-md px-3 py-1 text-xs font-semibold border border-zinc-500/40 bg-zinc-500/10 text-zinc-300'
                const buttonLabel = isSelf ? '내 계정' : user.is_admin ? '관리자 해제' : '관리자 설정'

                return (
                  <tr key={user.id} className="border-t border-white/10">
                    <td className="px-3 py-3 text-zinc-100">{user.email}</td>
                    <td className="px-3 py-3 text-zinc-300">{user.name}</td>
                    <td className="px-3 py-3 text-zinc-200">{user.is_admin ? 'O' : 'X'}</td>
                    <td className="px-3 py-3 text-zinc-200">{user.ai_allowlisted ? 'O' : 'X'}</td>
                    <td className="px-3 py-3 text-zinc-400">{new Date(user.created_at).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <button type="button" disabled={!canToggle} className={buttonClassName} onClick={() => toggleAdmin(user)}>
                        {buttonLabel}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </section>

      <section className="flex items-center justify-between gap-2">
        <button
          onClick={handlePrev}
          disabled={offset === 0 || loading}
          className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-zinc-100 disabled:opacity-40"
          type="button"
        >
          이전
        </button>
        <button
          onClick={handleNext}
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
