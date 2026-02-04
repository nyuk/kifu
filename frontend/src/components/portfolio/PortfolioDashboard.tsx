'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { FilterGroup, FilterPills } from '../ui/FilterPills'
import type { PositionItem, PositionsResponse, TimelineItem, TimelineResponse } from '../../types/portfolio'

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

const buildParams = (filters: Filters, cursor?: string | null) => {
  const params = new URLSearchParams()
  if (filters.assetClass !== 'all') params.set('asset_class', filters.assetClass)
  if (filters.venue.trim() !== '') params.set('venue', filters.venue.trim())
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
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    const fetchPositions = async () => {
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
    }

    const fetchTimeline = async () => {
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
    }

    fetchPositions()
    fetchTimeline()
  }, [filters])

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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Portfolio</p>
          <h1 className="text-3xl font-semibold">통합 포트폴리오</h1>
          <p className="text-sm text-neutral-400">코인, 주식, DEX 흐름을 하나로 묶습니다.</p>
        </header>

        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-4">
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
              className="rounded-lg border border-sky-400/40 bg-neutral-950/80 px-3 py-1 text-xs font-semibold text-sky-100 placeholder:text-sky-300/60"
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

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Timeline</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-100">{timeline.length}</p>
            <p className="text-xs text-neutral-500">이벤트 수</p>
          </div>
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Open Positions</p>
            <p className="mt-2 text-2xl font-semibold text-lime-300">{stats.openPositions}</p>
            <p className="text-xs text-neutral-500">보유 포지션</p>
          </div>
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Coverage</p>
            <p className="mt-2 text-2xl font-semibold text-sky-300">{stats.venueCount}</p>
            <p className="text-xs text-neutral-500">거래소 · 자산군 {stats.assetCount}</p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Timeline</p>
              <span className="text-xs text-neutral-500">{timeline.length} events</span>
            </div>
            <div className="mt-4 space-y-3">
              {loadingTimeline && timeline.length === 0 && <p className="text-xs text-neutral-500">불러오는 중...</p>}
              {!loadingTimeline && timeline.length === 0 && (
                <p className="text-xs text-neutral-500">아직 타임라인 데이터가 없습니다.</p>
              )}
              {timeline.map((item) => {
                const sideTone =
                  item.side === 'buy' ? 'text-lime-300' : item.side === 'sell' ? 'text-rose-300' : 'text-neutral-300'
                const venueTone =
                  item.venue_type === 'dex'
                    ? 'text-fuchsia-300'
                    : item.venue_type === 'broker'
                      ? 'text-sky-300'
                      : 'text-amber-300'
                const assetTone = item.asset_class === 'stock' ? 'text-sky-200' : 'text-emerald-200'

                return (
                  <div key={item.id} className="rounded-xl border border-neutral-800/60 bg-neutral-950/50 p-4">
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
                        <p className="text-xs text-neutral-500">
                          <span className="text-neutral-300">{item.event_type}</span> · {formatDateTime(item.executed_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${sideTone}`}>
                          {item.side ? item.side.toUpperCase() : '-'} {item.qty ?? '-'}
                        </p>
                        <p className="text-xs text-neutral-500">
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
                  className="w-full rounded-lg border border-neutral-800/60 bg-neutral-900/70 px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:border-neutral-600 disabled:opacity-60"
                >
                  {loadingTimeline ? '불러오는 중...' : '더 불러오기'}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Positions</p>
              <span className="text-xs text-neutral-500">{positions.length} items</span>
            </div>
            <div className="mt-4 space-y-3">
              {loadingPositions && positions.length === 0 && <p className="text-xs text-neutral-500">불러오는 중...</p>}
              {!loadingPositions && positions.length === 0 && (
                <p className="text-xs text-neutral-500">포지션 요약이 없습니다.</p>
              )}
              {positions.map((position) => (
                <div key={position.key} className="rounded-xl border border-neutral-800/60 bg-neutral-950/50 p-4">
                  <p className="text-sm font-semibold">{position.instrument}</p>
                  <p className="text-xs text-neutral-500">
                    {position.venue_name} · {position.status.toUpperCase()} · {formatDateTime(position.last_executed_at)}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-300">
                    <div>
                      <span className="text-neutral-500">Net</span> {position.net_qty}
                    </div>
                    <div>
                      <span className="text-neutral-500">Avg</span> {position.avg_entry || '-'}
                    </div>
                    <div>
                      <span className="text-neutral-500">Buy</span> {position.buy_qty}
                    </div>
                    <div>
                      <span className="text-neutral-500">Sell</span> {position.sell_qty}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
