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
