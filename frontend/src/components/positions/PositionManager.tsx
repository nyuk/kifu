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
const INPUT_STYLE = "mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
const SELECT_STYLE = "mt-2 w-full rounded-lg border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-100 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"

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
    <section className="rounded-2xl border border-white/5 bg-neutral-900/50 backdrop-blur-md p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Position</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-100">현재 포지션 상태</h2>
          <p className="text-xs text-neutral-500">직접 입력한 포지션을 기준으로 AI가 판단합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-neutral-900/50 p-1 text-xs">
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
        {isLoading && <p className="text-xs text-neutral-500">불러오는 중...</p>}
        {!isLoading && sortedPositions.length === 0 && (
          <p className="rounded-lg border border-neutral-800/70 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-500">
            현재 등록된 포지션이 없습니다.
          </p>
        )}
        {sortedPositions.map((position) => (
          <div key={position.id} className="rounded-xl border border-white/5 bg-neutral-900/30 px-5 py-4 hover:border-white/10 transition-colors">
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
                <p className="text-xs text-neutral-500">
                  {position.entry_price ? `Entry ${position.entry_price}` : 'Entry -'} ·
                  {position.stop_loss ? ` SL ${position.stop_loss}` : ' SL -'} ·
                  {position.take_profit ? ` TP ${position.take_profit}` : ' TP -'}
                </p>
                <p className="text-xs text-neutral-500">
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
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-950 text-neutral-100 shadow-2xl">
            <div className="border-b border-neutral-800 px-6 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Position</p>
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
                    className="ml-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200"
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
