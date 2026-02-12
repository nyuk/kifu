'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { FilterGroup, FilterPills } from '../components/ui/FilterPills'

type TradeItem = {
  id: string
  bubble_id?: string
  exchange: string
  symbol: string
  side: string
  position_side?: string
  open_close?: string
  reduce_only?: boolean
  quantity: string
  price: string
  realized_pnl?: string
  trade_time: string
  binance_trade_id: number
}

type TradeListResponse = {
  page: number
  limit: number
  total: number
  items: TradeItem[]
}

const exchangeLabel: Record<string, string> = {
  binance_futures: 'Binance Futures',
  binance_spot: 'Binance Spot',
  upbit: 'Upbit',
}

export function Trades() {
  const [items, setItems] = useState<TradeItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [exchange, setExchange] = useState('all')
  const [side, setSide] = useState('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [symbol, setSymbol] = useState('')

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ page: '1', limit: '200', sort: sortOrder })
        if (exchange !== 'all') params.set('exchange', exchange)
        if (side !== 'all') params.set('side', side.toUpperCase())
        if (symbol.trim()) params.set('symbol', symbol.trim().toUpperCase())

        const response = await api.get<TradeListResponse>(`/v1/trades?${params}`)
        setItems(response.data.items)
        setTotal(response.data.total)
      } catch {
        setError('거래 내역을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchTrades()
  }, [exchange, side, sortOrder, symbol])

  const stats = useMemo(() => {
    const buyTrades = items.filter((t) => t.side.toUpperCase() === 'BUY')
    const sellTrades = items.filter((t) => t.side.toUpperCase() === 'SELL')

    const totalBuyValue = buyTrades.reduce((sum, t) => sum + Number(t.price) * Number(t.quantity), 0)
    const totalSellValue = sellTrades.reduce((sum, t) => sum + Number(t.price) * Number(t.quantity), 0)

    return {
      total: items.length,
      buys: buyTrades.length,
      sells: sellTrades.length,
      totalBuyValue,
      totalSellValue,
      futuresCount: items.filter((t) => t.exchange === 'binance_futures').length,
    }
  }, [items])

  const futuresActionById = useMemo(() => {
    const map = new Map<string, string>()
    const sorted = [...items]
      .filter((item) => item.exchange === 'binance_futures')
      .sort((a, b) => new Date(a.trade_time).getTime() - new Date(b.trade_time).getTime())

    const positionBySymbol = new Map<string, number>()
    for (const trade of sorted) {
      const qty = Number(trade.quantity) || 0
      const side = trade.side.toUpperCase()
      const symbolKey = trade.symbol
      const prev = positionBySymbol.get(symbolKey) ?? 0
      let next = prev
      let label = side

      if (side === 'BUY') {
        if (prev < 0) {
          const closeSize = Math.min(Math.abs(prev), qty)
          const openSize = Math.max(0, qty - closeSize)
          label = openSize > 0 ? '롱 오픈' : '숏 클로즈'
        } else {
          label = '롱 오픈'
        }
        next = prev + qty
      } else if (side === 'SELL') {
        if (prev > 0) {
          const closeSize = Math.min(prev, qty)
          const openSize = Math.max(0, qty - closeSize)
          label = openSize > 0 ? '숏 오픈' : '롱 클로즈'
        } else {
          label = '숏 오픈'
        }
        next = prev - qty
      }

      if (trade.position_side && trade.open_close) {
        const ps = trade.position_side.toUpperCase()
        const oc = trade.open_close.toUpperCase()
        if (ps === 'LONG' && oc === 'OPEN') label = '롱 오픈'
        if (ps === 'LONG' && oc === 'CLOSE') label = '롱 클로즈'
        if (ps === 'SHORT' && oc === 'OPEN') label = '숏 오픈'
        if (ps === 'SHORT' && oc === 'CLOSE') label = '숏 클로즈'
      }

      map.set(trade.id, label)
      positionBySymbol.set(symbolKey, next)
    }
    return map
  }, [items])

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-sm p-6 backdrop-blur flex-shrink-0">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Insights</p>
        <h2 className="mt-3 text-2xl font-semibold text-neutral-100">Trade History</h2>
        <p className="mt-2 text-sm text-neutral-400">서버 동기화 거래 내역 ({total}개)</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-4 flex-shrink-0">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Total Trades</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-100">{stats.total}</p>
          <p className="mt-2 text-xs text-neutral-500">Buy: {stats.buys} / Sell: {stats.sells}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Futures Trades</p>
          <p className="mt-3 text-2xl font-semibold text-indigo-300">{stats.futuresCount}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Total Buy Value</p>
          <p className="mt-3 text-2xl font-semibold text-green-400">${stats.totalBuyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Total Sell Value</p>
          <p className="mt-3 text-2xl font-semibold text-red-400">${stats.totalSellValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 flex flex-col flex-1 min-h-0">
        <div className="flex flex-wrap items-center gap-4 mb-4 flex-shrink-0">
          <FilterGroup label="EXCHANGE" tone="sky">
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="rounded-lg border border-sky-400/40 bg-neutral-950/80 px-3 py-1.5 text-xs font-semibold text-sky-100"
            >
              <option value="all">All</option>
              <option value="binance_futures">Binance Futures</option>
              <option value="binance_spot">Binance Spot</option>
              <option value="upbit">Upbit</option>
            </select>
          </FilterGroup>

          <FilterGroup label="SIDE" tone="emerald">
            <FilterPills
              options={[{ value: 'all', label: 'All' }, { value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }]}
              value={side}
              onChange={(value) => setSide(value as 'all' | 'buy' | 'sell')}
              tone="emerald"
              ariaLabel="Side filter"
            />
          </FilterGroup>

          <FilterGroup label="SORT" tone="amber">
            <FilterPills
              options={[{ value: 'desc', label: 'Newest' }, { value: 'asc', label: 'Oldest' }]}
              value={sortOrder}
              onChange={(value) => setSortOrder(value as 'asc' | 'desc')}
              tone="amber"
              ariaLabel="Sort order"
            />
          </FilterGroup>

          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="symbol 검색 (예: BTCUSDT, KRW-BTC)"
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500"
          />

          <button
            type="button"
            onClick={() => {
              setExchange('all')
              setSide('all')
              setSortOrder('desc')
              setSymbol('')
            }}
            className="rounded-lg border border-neutral-700 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:border-neutral-500"
          >
            필터 초기화
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && <div className="text-neutral-500 text-sm">불러오는 중...</div>}
          {error && <div className="text-rose-300 text-sm">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="flex items-center justify-center h-full text-neutral-500">거래 내역이 없습니다.</div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="space-y-2 pr-2">
              {items.map((trade) => (
                <div key={trade.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm hover:border-neutral-700 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${trade.side.toUpperCase() === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.exchange === 'binance_futures'
                          ? futuresActionById.get(trade.id) ?? trade.side.toUpperCase()
                          : trade.side.toUpperCase()}
                      </span>
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200">
                        {trade.symbol}
                      </span>
                      <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">
                        {exchangeLabel[trade.exchange] ?? trade.exchange}
                      </span>
                      {trade.position_side && (
                        <span className="rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
                          {trade.position_side}
                        </span>
                      )}
                      {trade.open_close && (
                        <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-200">
                          {trade.open_close}
                        </span>
                      )}
                      {trade.reduce_only && (
                        <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200">
                          reduce-only
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-500">{new Date(trade.trade_time).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                    <span>Qty: <span className="text-neutral-200">{trade.quantity}</span></span>
                    <span>Price: <span className="text-neutral-200">{Number(trade.price).toLocaleString()}</span></span>
                    <span>Value: <span className="text-neutral-200">{(Number(trade.quantity) * Number(trade.price)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
