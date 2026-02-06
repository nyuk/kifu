import { api } from './api'
import type { TradeItem, TradeListResponse, TradeSummaryResponse } from '../types/trade'

export type EvidencePacketTrade = {
  id: string
  exchange: string
  symbol: string
  side: string
  price: string
  quantity: string
  trade_time: string
}

export type EvidencePacket = {
  scope: 'one-shot'
  created_at: string
  symbol: string
  timeframe: string
  trades?: {
    count: number
    items: EvidencePacketTrade[]
    range?: { from: string; to: string }
  }
  summary?: {
    range: { from: string; to: string }
    totals: TradeSummaryResponse['totals']
    by_side: TradeSummaryResponse['by_side']
  }
}

export type EvidencePacketOptions = {
  symbol: string
  timeframe: string
  includeRecentTrades: boolean
  includeSummary: boolean
  tradeLimit?: number
  summaryDays?: number
}

const toUpper = (value: string) => value.trim().toUpperCase()

const mapTradeItem = (item: TradeItem): EvidencePacketTrade => ({
  id: item.id,
  exchange: item.exchange,
  symbol: item.symbol,
  side: item.side,
  price: item.price,
  quantity: item.quantity,
  trade_time: item.trade_time,
})

const resolveTradeRange = (items: EvidencePacketTrade[]) => {
  if (items.length === 0) return undefined
  const times = items.map((item) => new Date(item.trade_time).getTime()).filter((value) => !Number.isNaN(value))
  if (times.length === 0) return undefined
  const min = new Date(Math.min(...times)).toISOString()
  const max = new Date(Math.max(...times)).toISOString()
  return { from: min, to: max }
}

export async function buildEvidencePacket(options: EvidencePacketOptions): Promise<EvidencePacket | null> {
  const {
    symbol,
    timeframe,
    includeRecentTrades,
    includeSummary,
    tradeLimit = 10,
    summaryDays = 7,
  } = options

  if (!includeRecentTrades && !includeSummary) return null

  const now = new Date()
  const packet: EvidencePacket = {
    scope: 'one-shot',
    created_at: now.toISOString(),
    symbol: toUpper(symbol),
    timeframe,
  }

  if (includeRecentTrades) {
    const params = new URLSearchParams({
      page: '1',
      limit: String(tradeLimit),
      sort: 'desc',
    })
    if (symbol.trim()) {
      params.set('symbol', toUpper(symbol))
    }
    const response = await api.get<TradeListResponse>(`/v1/trades?${params.toString()}`)
    const items = (response.data.items || []).map(mapTradeItem)
    packet.trades = {
      count: items.length,
      items,
      range: resolveTradeRange(items),
    }
  }

  if (includeSummary) {
    const from = new Date(now.getTime() - summaryDays * 24 * 60 * 60 * 1000)
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: now.toISOString(),
    })
    if (symbol.trim()) {
      params.set('symbol', toUpper(symbol))
    }
    const response = await api.get<TradeSummaryResponse>(`/v1/trades/summary?${params.toString()}`)
    packet.summary = {
      range: { from: from.toISOString(), to: now.toISOString() },
      totals: response.data.totals,
      by_side: response.data.by_side,
    }
  }

  return packet
}

export function describeEvidencePacket(packet: EvidencePacket): string[] {
  const lines: string[] = []
  lines.push(`One-shot packet · ${packet.symbol} · ${packet.timeframe}`)

  if (packet.trades) {
    const range = packet.trades.range
    const rangeLabel = range ? `${range.from.slice(0, 10)} ~ ${range.to.slice(0, 10)}` : 'range unknown'
    lines.push(`Recent trades: ${packet.trades.count} (${rangeLabel})`)
  }

  if (packet.summary) {
    const range = packet.summary.range
    const totalTrades = packet.summary.totals?.total_trades ?? 0
    lines.push(`Summary ${range.from.slice(0, 10)} ~ ${range.to.slice(0, 10)} · trades ${totalTrades}`)
  }

  return lines
}

export function formatEvidencePacket(packet: EvidencePacket): string {
  return describeEvidencePacket(packet).join('\n')
}
