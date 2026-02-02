"use client"

import { useMemo, useState } from 'react'
import { useBubbleStore, type Trade } from '../lib/bubbleStore'

export function Trades() {
  const trades = useBubbleStore((state) => state.trades)
  const deleteAllTrades = useBubbleStore((state) => state.deleteAllTrades)

  const [exchange, setExchange] = useState('all')
  const [side, setSide] = useState('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 필터링된 거래
  const filteredTrades = useMemo(() => {
    let result = [...trades]

    if (exchange !== 'all') {
      result = result.filter(t => t.exchange === exchange)
    }
    if (side !== 'all') {
      result = result.filter(t => t.side === side)
    }

    // 정렬
    result.sort((a, b) => sortOrder === 'desc' ? b.ts - a.ts : a.ts - b.ts)

    return result
  }, [trades, exchange, side, sortOrder])

  // 통계
  const stats = useMemo(() => {
    const buyTrades = trades.filter(t => t.side === 'buy')
    const sellTrades = trades.filter(t => t.side === 'sell')

    const totalBuyValue = buyTrades.reduce((sum, t) => sum + (t.price * (t.qty || 0)), 0)
    const totalSellValue = sellTrades.reduce((sum, t) => sum + (t.price * (t.qty || 0)), 0)
    const totalFees = trades.reduce((sum, t) => sum + (t.fee || 0), 0)

    return {
      total: trades.length,
      buys: buyTrades.length,
      sells: sellTrades.length,
      totalBuyValue,
      totalSellValue,
      totalFees,
      netFlow: totalSellValue - totalBuyValue,
    }
  }, [trades])

  // 거래소 목록
  const exchanges = useMemo(() => {
    const set = new Set(trades.map(t => t.exchange))
    return Array.from(set)
  }, [trades])

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* 헤더 */}
      <header className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-6 backdrop-blur flex-shrink-0">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Insights</p>
        <h2 className="mt-3 text-2xl font-semibold text-neutral-100">Trade History</h2>
        <p className="mt-2 text-sm text-neutral-400">
          로컬에 저장된 거래 내역 ({trades.length}개)
        </p>
      </header>

      {/* 통계 카드 */}
      <section className="grid gap-4 lg:grid-cols-4 flex-shrink-0">
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Total Trades</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-100">{stats.total}</p>
          <p className="mt-2 text-xs text-neutral-500">
            Buy: {stats.buys} / Sell: {stats.sells}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Total Buy Volume</p>
          <p className="mt-3 text-2xl font-semibold text-green-400">
            ${stats.totalBuyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Total Sell Volume</p>
          <p className="mt-3 text-2xl font-semibold text-red-400">
            ${stats.totalSellValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Total Fees</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-100">
            ${stats.totalFees.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </section>

      {/* 필터 + 거래 목록 */}
      <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5 flex flex-col flex-1 min-h-0">
        {/* 필터 바 */}
        <div className="flex flex-wrap items-center gap-4 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Exchange:</span>
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-1.5 text-sm text-neutral-100"
            >
              <option value="all">All</option>
              {exchanges.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Side:</span>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-1.5 text-sm text-neutral-100"
            >
              <option value="all">All</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-1.5 text-sm text-neutral-100"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
          <div className="flex-1" />
          <span className="text-xs text-neutral-500">{filteredTrades.length} results</span>
          <button
            onClick={() => { if (confirm('모든 거래 내역을 삭제하시겠습니까?')) deleteAllTrades() }}
            className="rounded-lg border border-red-500/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
          >
            Clear All
          </button>
        </div>

        {/* 거래 목록 - 고정 높이 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredTrades.length === 0 ? (
            <div className="flex items-center justify-center h-full text-neutral-500">
              거래 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {filteredTrades.map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function TradeRow({ trade }: { trade: Trade }) {
  return (
    <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/40 p-4 text-sm hover:border-neutral-700 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
            {trade.side.toUpperCase()}
          </span>
          <span className="font-semibold text-neutral-100">{trade.symbol}</span>
          <span className="text-xs text-neutral-500 uppercase">{trade.exchange}</span>
        </div>
        <span className="text-xs text-neutral-500">
          {new Date(trade.ts).toLocaleString()}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
        <span>Qty: <span className="text-neutral-200">{trade.qty}</span></span>
        <span>Price: <span className="text-neutral-200">${trade.price.toLocaleString()}</span></span>
        <span>Value: <span className="text-neutral-200">${((trade.qty || 0) * trade.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
        {trade.fee && <span>Fee: <span className="text-neutral-200">${trade.fee}</span></span>}
      </div>
    </div>
  )
}
