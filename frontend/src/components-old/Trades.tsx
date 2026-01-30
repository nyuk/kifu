"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useI18n } from '../lib/i18n'

type TradeItem = {
  id: string
  bubble_id?: string | null
  exchange: string
  symbol: string
  side: string
  quantity: string
  price: string
  realized_pnl?: string | null
  trade_time: string
}

type TradeListResponse = {
  page: number
  limit: number
  total: number
  items: TradeItem[]
}

type TradeSummaryTotals = {
  total_trades: number
  realized_pnl_total: string
  wins: number
  losses: number
  breakeven: number
}

type TradeSideSummary = {
  side: string
  total_trades: number
  realized_pnl_total: string
}

type TradeSymbolSummary = {
  symbol: string
  total_trades: number
  realized_pnl_total: string
  wins: number
  losses: number
}

type TradeExchangeSummary = {
  exchange: string
  total_trades: number
  realized_pnl_total: string
}

type TradeSummaryResponse = {
  exchange: string
  totals: TradeSummaryTotals
  by_exchange: TradeExchangeSummary[]
  by_side: TradeSideSummary[]
  by_symbol: TradeSymbolSummary[]
}

const exchangeOptions = [
  { id: 'all', label: 'All Exchanges' },
  { id: 'binance_futures', label: 'Binance Futures' },
  { id: 'upbit', label: 'Upbit' },
]

export function Trades() {
  const { t } = useI18n()
  const [summary, setSummary] = useState<TradeSummaryResponse | null>(null)
  const [trades, setTrades] = useState<TradeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exchange, setExchange] = useState('all')
  const [symbol, setSymbol] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')

  const params = useMemo(() => {
    const apiParams: Record<string, string> = {}
    if (exchange !== 'all') apiParams.exchange = exchange
    if (symbol.trim()) apiParams.symbol = symbol.trim().toUpperCase()
    if (from) apiParams.from = new Date(from).toISOString()
    if (to) apiParams.to = new Date(to).toISOString()
    return apiParams
  }, [exchange, symbol, from, to])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [summaryRes, listRes] = await Promise.all([
        api.get<TradeSummaryResponse>('/v1/trades/summary', { params }),
        api.get<TradeListResponse>('/v1/trades', {
          params: { ...params, limit: 50, sort: 'desc' },
        }),
      ])
      setSummary(summaryRes.data)
      setTrades(listRes.data?.items || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || t.tradesLoadFailed)
      setSummary(null)
      setTrades([])
    } finally {
      setLoading(false)
    }
  }, [params, t.tradesLoadFailed])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMessage('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post('/v1/trades/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const imported = response.data?.imported ?? 0
      const skipped = response.data?.skipped ?? 0
      setUploadMessage(`${t.importSuccess}: ${imported} / ${skipped}`)
      loadData()
    } catch (err: any) {
      setUploadMessage(err?.response?.data?.message || t.importFailed)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const totalPnL = summary?.totals?.realized_pnl_total || '0'
  const winRate = summary?.totals?.total_trades
    ? Math.round((summary.totals.wins / summary.totals.total_trades) * 100)
    : 0

  const pnlClass = resolvePnlClass(totalPnL)
  const pnlDistribution = useMemo(() => buildPnlDistribution(trades), [trades])

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-6 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Insights</p>
        <h2 className="mt-3 text-2xl font-semibold text-neutral-100">{t.tradesTitle}</h2>
        <p className="mt-2 text-sm text-neutral-400">{t.tradesSubtitle}</p>
      </header>

      <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs text-neutral-400">
              {t.exchangeLabel}
              <select
                value={exchange}
                onChange={(event) => setExchange(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              >
                {exchangeOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-neutral-400">
              {t.symbolLabel}
              <input
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                placeholder="BTCUSDT"
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
            <label className="text-xs text-neutral-400">
              {t.fromLabel}
              <input
                type="datetime-local"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
            <label className="text-xs text-neutral-400">
              {t.toLabel}
              <input
                type="datetime-local"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-200 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t.loading : t.refresh}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="rounded-lg border border-neutral-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-200 transition hover:border-neutral-500">
            {uploading ? t.importing : t.importCsv}
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          <span className="text-xs text-neutral-500">{t.importHint}</span>
        </div>
        {uploadMessage && (
          <div className="mt-3 rounded-lg border border-neutral-800/70 bg-neutral-950/40 p-3 text-xs text-neutral-300">
            {uploadMessage}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.totalTrades}</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-100">{summary?.totals?.total_trades ?? 0}</p>
          <p className="mt-2 text-xs text-neutral-500">{t.tradesWindowHint}</p>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.netPnL}</p>
          <p className={`mt-3 text-2xl font-semibold ${pnlClass}`}>{formatSigned(totalPnL)}</p>
          <p className="mt-2 text-xs text-neutral-500">{t.realizedPnL}</p>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.winRate}</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-100">{winRate}%</p>
          <p className="mt-2 text-xs text-neutral-500">
            {summary?.totals ? `${summary.totals.wins}W / ${summary.totals.losses}L` : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.breakEven}</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-100">{summary?.totals?.breakeven ?? 0}</p>
          <p className="mt-2 text-xs text-neutral-500">{t.breakEvenHint}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.tradeHistory}</p>
              <h3 className="mt-2 text-lg font-semibold text-neutral-100">{t.recentTrades}</h3>
            </div>
            <span className="text-xs text-neutral-500">{trades.length} items</span>
          </div>
          <div className="mt-4 space-y-3">
            {loading && <p className="text-sm text-neutral-500">{t.loading}</p>}
            {!loading && trades.length === 0 && <p className="text-sm text-neutral-500">{t.noData}</p>}
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="rounded-xl border border-neutral-800/70 bg-neutral-950/40 p-4 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-100">
                    {trade.symbol} · {trade.side}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {new Date(trade.trade_time).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
                  <span>{t.quantityLabel}: {trade.quantity}</span>
                  <span>{t.priceLabel}: {trade.price}</span>
                  <span className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                    {trade.exchange}
                  </span>
                  <span className={resolvePnlClass(trade.realized_pnl || '0')}>
                    {t.realizedPnL}: {formatSigned(trade.realized_pnl || '0')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.pnlDistributionTitle}</p>
                <p className="mt-2 text-sm text-neutral-400">{t.pnlDistributionHint}</p>
              </div>
              <span className="text-xs text-neutral-500">{pnlDistribution.total} items</span>
            </div>
            {pnlDistribution.bins.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">{t.pnlDistributionEmpty}</p>
            ) : (
              <div className="mt-4">
                <div className="flex h-28 items-end gap-2">
                  {pnlDistribution.bins.map((bin) => (
                    <div key={bin.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <div className="text-[11px] text-neutral-400">{bin.count}</div>
                      <div
                        className={`w-full rounded-md ${bin.color}`}
                        style={{ height: `${Math.max(6, Math.round((bin.count / pnlDistribution.maxCount) * 100))}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2 text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                  {pnlDistribution.bins.map((bin) => (
                    <div key={`${bin.label}-label`} className="text-center leading-tight">
                      {bin.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.byExchange}</p>
            <div className="mt-4 space-y-3 text-sm text-neutral-300">
              {(summary?.by_exchange || []).map((item) => (
                <div key={item.exchange} className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-100">{item.exchange}</span>
                  <span>{item.total_trades} · {formatSigned(item.realized_pnl_total)}</span>
                </div>
              ))}
              {!summary?.by_exchange?.length && <p className="text-sm text-neutral-500">{t.noData}</p>}
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.bySide}</p>
            <div className="mt-4 space-y-3 text-sm text-neutral-300">
              {(summary?.by_side || []).map((item) => (
                <div key={item.side} className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-100">{item.side}</span>
                  <span>{item.total_trades} · {formatSigned(item.realized_pnl_total)}</span>
                </div>
              ))}
              {!summary?.by_side?.length && <p className="text-sm text-neutral-500">{t.noData}</p>}
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.bySymbol}</p>
            <div className="mt-4 space-y-3 text-sm text-neutral-300">
              {(summary?.by_symbol || []).map((item) => (
                <div key={item.symbol} className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-100">{item.symbol}</span>
                  <span>{item.total_trades} · {formatSigned(item.realized_pnl_total)}</span>
                </div>
              ))}
              {!summary?.by_symbol?.length && <p className="text-sm text-neutral-500">{t.noData}</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function resolvePnlClass(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 'text-neutral-300'
  if (parsed > 0) return 'text-emerald-300'
  if (parsed < 0) return 'text-rose-300'
  return 'text-neutral-300'
}

function formatSigned(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return value
  if (parsed > 0) return `+${value}`
  return value
}

type PnlBin = {
  label: string
  count: number
  color: string
}

type PnlDistribution = {
  bins: PnlBin[]
  maxCount: number
  total: number
}

function buildPnlDistribution(trades: TradeItem[]): PnlDistribution {
  const values = trades
    .map((trade) => Number(trade.realized_pnl))
    .filter((value) => Number.isFinite(value)) as number[]

  if (values.length === 0) {
    return { bins: [], maxCount: 0, total: 0 }
  }

  const maxAbs = Math.max(...values.map((value) => Math.abs(value)))
  if (maxAbs === 0) {
    return {
      bins: [{ label: '0', count: values.length, color: 'bg-slate-500/60' }],
      maxCount: values.length,
      total: values.length,
    }
  }

  const large = maxAbs * 0.6
  const small = maxAbs * 0.2
  const format = (value: number) => {
    const absValue = Math.abs(value)
    if (absValue >= 1000) return absValue.toFixed(0)
    if (absValue >= 100) return absValue.toFixed(1)
    return absValue.toFixed(2)
  }

  const bins: PnlBin[] = [
    { label: `<= -${format(large)}`, count: 0, color: 'bg-rose-500/70' },
    { label: `-${format(large)}..-${format(small)}`, count: 0, color: 'bg-rose-400/70' },
    { label: `-${format(small)}..${format(small)}`, count: 0, color: 'bg-slate-500/60' },
    { label: `${format(small)}..${format(large)}`, count: 0, color: 'bg-emerald-400/70' },
    { label: `>= ${format(large)}`, count: 0, color: 'bg-emerald-500/70' },
  ]

  values.forEach((value) => {
    if (value <= -large) {
      bins[0].count += 1
      return
    }
    if (value <= -small) {
      bins[1].count += 1
      return
    }
    if (value < small) {
      bins[2].count += 1
      return
    }
    if (value < large) {
      bins[3].count += 1
      return
    }
    bins[4].count += 1
  })

  const maxCount = Math.max(...bins.map((bin) => bin.count), 1)
  return { bins, maxCount, total: values.length }
}
