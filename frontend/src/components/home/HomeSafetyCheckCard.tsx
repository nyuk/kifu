'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import type {
  SafetyItem,
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
    const values = Array.from(new Set(safety.items.map((item) => item.venue).filter(Boolean)))
    values.sort((a, b) => a.localeCompare(b))
    return values
  }, [safety])

  const onSubmitVerdict = async (item: SafetyItem, verdict: SafetyVerdict) => {
    setSubmittingTarget(item.target_id)
    setError(null)

    const payload: UpsertSafetyReviewPayload = {
      target_type: item.target_type,
      target_id: item.target_id,
      verdict,
    }

    try {
      const response = await api.post<SafetyReviewResponse>('/v1/safety/reviews', payload)
      const saved = response.data

      setSafety((prev) => {
        if (!prev) return prev

        const nextItems = prev.items.map((existing) => {
          if (existing.target_id !== item.target_id || existing.target_type !== item.target_type) {
            return existing
          }
          return {
            ...existing,
            reviewed: true,
            verdict: saved.verdict,
            note: saved.note,
            reviewed_at: saved.updated_at,
          }
        })

        const wasReviewed = item.reviewed
        const reviewed = wasReviewed ? prev.reviewed : prev.reviewed + 1

        return {
          ...prev,
          reviewed,
          pending: Math.max(prev.total - reviewed, 0),
          items: nextItems,
        }
      })
    } catch {
      setError('라벨 저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmittingTarget(null)
    }
  }

  const pendingTone = (safety?.pending ?? 0) > 0 ? 'text-amber-200' : 'text-emerald-200'

  return (
    <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
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
        <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/60 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Total</p>
          <p className="mt-1 text-lg font-semibold text-neutral-100">{formatCompactNumber(safety?.total)}</p>
        </div>
        <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/60 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Reviewed</p>
          <p className="mt-1 text-lg font-semibold text-emerald-200">{formatCompactNumber(safety?.reviewed)}</p>
        </div>
        <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/60 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Pending</p>
          <p className={`mt-1 text-lg font-semibold ${pendingTone}`}>{formatCompactNumber(safety?.pending)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-neutral-800/70 bg-neutral-950/60 p-1">
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

        <div className="flex rounded-lg border border-neutral-800/70 bg-neutral-950/60 p-1">
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
          {!isLoading && safety?.items.length === 0 && (
            <p className="rounded-lg border border-neutral-800/70 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-500">
              오늘 기록된 거래가 없습니다.
            </p>
          )}

          {safety?.items.map((item) => {
            const isSubmitting = submittingTarget === item.target_id
            const itemVerdict = item.verdict

            return (
              <div
                key={`${item.target_type}:${item.target_id}`}
                className="rounded-xl border border-neutral-800/70 bg-neutral-950/60 px-4 py-3"
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
