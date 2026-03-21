import { api } from './api'
import type { TradeItem, TradeListResponse, TradeSummaryResponse } from '../types/trade'
import type { ManualPosition, ManualPositionsResponse } from '../types/position'

export type EvidencePacketTrade = {
  id: string
  exchange: string
  symbol: string
  side: string
  price: string
  quantity: string
  trade_time: string
}

export type EvidencePacketBubble = {
  id: string
  symbol: string
  timeframe: string
  candle_time: string
  price: string
  memo?: string
  tags?: string[]
}

export type EvidencePacket = {
  scope: 'one-shot'
  created_at: string
  symbol: string
  timeframe: string
  positions?: {
    count: number
    items: EvidencePacketPosition[]
  }
  trades?: {
    count: number
    items: EvidencePacketTrade[]
    range?: { from: string; to: string }
  }
  bubbles?: {
    count: number
    items: EvidencePacketBubble[]
    range?: { from: string; to: string }
    tags?: string[]
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
  includePositions?: boolean
  includeRecentTrades: boolean
  includeSummary: boolean
  includeBubbles?: boolean
  tradeLimit?: number
  summaryDays?: number
  rangeFrom?: string
  rangeTo?: string
  bubbleLimit?: number
  bubbleTags?: string[]
}

const toUpper = (value: string) => value.trim().toUpperCase()
const bubbleQueryTagPattern = /^[a-z0-9_-]+$/
const canonicalSymbolPattern = /^[A-Z0-9]{3,12}$/

const mapTradeItem = (item: TradeItem): EvidencePacketTrade => ({
  id: item.id,
  exchange: item.exchange,
  symbol: item.symbol,
  side: item.side,
  price: item.price,
  quantity: item.quantity,
  trade_time: item.trade_time,
})

const mapBubbleItem = (item: any): EvidencePacketBubble => ({
  id: item.id,
  symbol: item.symbol,
  timeframe: item.timeframe,
  candle_time: item.candle_time,
  price: item.price,
  memo: item.memo ?? undefined,
  tags: item.tags ?? undefined,
})

export type EvidencePacketPosition = {
  id: string
  symbol: string
  position_side: string
  size?: string
  entry_price?: string
  stop_loss?: string
  take_profit?: string
  leverage?: string
  strategy?: string
}

const resolveTimeRange = (values: string[]) => {
  if (values.length === 0) return undefined
  const times = values.map((value) => new Date(value).getTime()).filter((time) => !Number.isNaN(time))
  if (times.length === 0) return undefined
  const min = new Date(Math.min(...times)).toISOString()
  const max = new Date(Math.max(...times)).toISOString()
  return { from: min, to: max }
}

const resolveTradeRange = (items: EvidencePacketTrade[]) => {
  return resolveTimeRange(items.map((item) => item.trade_time))
}

export const sanitizeBubbleTags = (tags: string[]) => {
  const seen = new Set<string>()
  const cleaned: string[] = []

  for (const raw of tags) {
    const tag = raw.trim().toLowerCase()
    if (!tag) continue
    if (tag.length > 20) continue
    if (!bubbleQueryTagPattern.test(tag)) continue
    if (seen.has(tag)) continue
    seen.add(tag)
    cleaned.push(tag)
    if (cleaned.length >= 5) break
  }

  return cleaned
}

export const normalizeBubbleSymbol = (value: string) => {
  const upper = toUpper(value)
  if (!upper) return ''
  if (canonicalSymbolPattern.test(upper)) return upper

  if (upper.includes('-')) {
    const [quote, base] = upper.split('-')
    const candidate = `${base || ''}${quote || ''}`.replace(/[^A-Z0-9]/g, '')
    if (canonicalSymbolPattern.test(candidate)) return candidate
  }

  const compact = upper.replace(/[^A-Z0-9]/g, '')
  if (canonicalSymbolPattern.test(compact)) return compact
  return ''
}

export async function buildEvidencePacket(options: EvidencePacketOptions): Promise<EvidencePacket | null> {
  const {
    symbol,
    timeframe,
    includePositions = false,
    includeRecentTrades,
    includeSummary,
    includeBubbles = false,
    tradeLimit = 10,
    summaryDays = 7,
    rangeFrom,
    rangeTo,
    bubbleLimit = 6,
    bubbleTags = [],
  } = options

  if (!includeRecentTrades && !includeSummary && !includePositions && !includeBubbles) return null

  const now = new Date()
  const symbolLabel = symbol.trim() ? toUpper(symbol) : 'ALL'
  const querySymbol = normalizeBubbleSymbol(symbol)
  const packet: EvidencePacket = {
    scope: 'one-shot',
    created_at: now.toISOString(),
    symbol: symbolLabel,
    timeframe,
  }

  if (includePositions) {
    const response = await api.get<ManualPositionsResponse>('/v1/manual-positions?status=open')
    const items: EvidencePacketPosition[] = (response.data.positions || []).map((item: ManualPosition) => ({
      id: item.id,
      symbol: item.symbol,
      position_side: item.position_side,
      size: item.size,
      entry_price: item.entry_price,
      stop_loss: item.stop_loss,
      take_profit: item.take_profit,
      leverage: item.leverage,
      strategy: item.strategy,
    }))
    packet.positions = { count: items.length, items }
  }

  if (includeRecentTrades) {
    const params = new URLSearchParams({
      page: '1',
      limit: String(tradeLimit),
      sort: 'desc',
    })
    if (querySymbol) {
      params.set('symbol', querySymbol)
    }
    if (rangeFrom) params.set('from', rangeFrom)
    if (rangeTo) params.set('to', rangeTo)
    const response = await api.get<TradeListResponse>(`/v1/trades?${params.toString()}`)
    const items = (response.data.items || []).map(mapTradeItem)
    packet.trades = {
      count: items.length,
      items,
      range: resolveTradeRange(items),
    }
  }

  if (includeBubbles) {
    const queryTags = sanitizeBubbleTags(bubbleTags)
    const params = new URLSearchParams({
      page: '1',
      limit: String(bubbleLimit),
      sort: 'desc',
    })
    if (querySymbol) {
      params.set('symbol', querySymbol)
    }
    if (rangeFrom) params.set('from', rangeFrom)
    if (rangeTo) params.set('to', rangeTo)
    if (queryTags.length > 0) params.set('tags', queryTags.join(','))
    const response = await api.get<{ items: any[] }>(`/v1/bubbles?${params.toString()}`)
    const items = (response.data.items || []).map(mapBubbleItem)
    packet.bubbles = {
      count: items.length,
      items,
      range: resolveTimeRange(items.map((item) => item.candle_time)),
      tags: queryTags.length > 0 ? queryTags : undefined,
    }
  }

  if (includeSummary) {
    const from = rangeFrom ? new Date(rangeFrom) : new Date(now.getTime() - summaryDays * 24 * 60 * 60 * 1000)
    const to = rangeTo ? new Date(rangeTo) : now
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    })
    if (querySymbol) {
      params.set('symbol', querySymbol)
    }
    const response = await api.get<TradeSummaryResponse>(`/v1/trades/summary?${params.toString()}`)
    packet.summary = {
      range: { from: from.toISOString(), to: to.toISOString() },
      totals: response.data.totals,
      by_side: response.data.by_side,
    }
  }

  return packet
}

export function describeEvidencePacket(packet: EvidencePacket): string[] {
  const lines: string[] = []
  lines.push(`One-shot packet · ${packet.symbol} · ${packet.timeframe}`)

  if (packet.positions) {
    lines.push(`Open positions: ${packet.positions.count}`)
    const preview = packet.positions.items.slice(0, 3)
    preview.forEach((position) => {
      const parts = [
        `${position.symbol} ${position.position_side.toUpperCase()}`,
        position.entry_price ? `entry ${position.entry_price}` : 'entry -',
        position.size ? `size ${position.size}` : 'size -',
        position.stop_loss ? `SL ${position.stop_loss}` : 'SL -',
        position.take_profit ? `TP ${position.take_profit}` : 'TP -',
        position.leverage ? `Lev ${position.leverage}x` : 'Lev -',
      ]
      const line = `- ${parts.join(' · ')}${position.strategy ? ` · rule ${position.strategy}` : ''}`
      lines.push(line)
    })
    if (packet.positions.count > preview.length) {
      lines.push(`- ... +${packet.positions.count - preview.length} more`)
    }
  }

  if (packet.trades) {
    const range = packet.trades.range
    const rangeLabel = range ? `${range.from.slice(0, 10)} ~ ${range.to.slice(0, 10)}` : 'range unknown'
    lines.push(`Recent trades: ${packet.trades.count} (${rangeLabel})`)
    for (const t of packet.trades.items) {
      lines.push(`- ${t.symbol} ${t.side.toUpperCase()} ${t.price} x${t.quantity} @ ${t.trade_time.slice(0, 16)}`)
    }
    if (packet.trades.items.length > 0) {
      const buys = packet.trades.items.filter((t) => t.side.toUpperCase() === 'BUY').length
      const sells = packet.trades.items.length - buys
      const last = packet.trades.items[0]
      lines.push(`Trade pattern: BUY ${buys} / SELL ${sells} · last ${last.side.toUpperCase()} @ ${last.price}`)
    }
  }

  if (packet.bubbles) {
    const range = packet.bubbles.range
    const rangeLabel = range ? `${range.from.slice(0, 10)} ~ ${range.to.slice(0, 10)}` : 'range unknown'
    const tags = packet.bubbles.tags && packet.bubbles.tags.length > 0 ? ` · tags ${packet.bubbles.tags.join(',')}` : ''
    lines.push(`Recent bubbles: ${packet.bubbles.count} (${rangeLabel})${tags}`)
    for (const b of packet.bubbles.items) {
      const memoSnippet = b.memo ? ` · "${b.memo.slice(0, 80)}"` : ''
      const tagLabel = b.tags && b.tags.length > 0 ? ` [${b.tags.join(',')}]` : ''
      lines.push(`- ${b.symbol} ${b.timeframe} @ ${b.candle_time.slice(0, 16)}${tagLabel}${memoSnippet}`)
    }
  }

  if (packet.summary) {
    const range = packet.summary.range
    const totalTrades = packet.summary.totals?.total_trades ?? 0
    lines.push(`Summary ${range.from.slice(0, 10)} ~ ${range.to.slice(0, 10)} · trades ${totalTrades}`)
    if (packet.summary.by_side) {
      const buySide = packet.summary.by_side.find((s: any) => s.side?.toUpperCase() === 'BUY')
      const sellSide = packet.summary.by_side.find((s: any) => s.side?.toUpperCase() === 'SELL')
      if (buySide || sellSide) {
        const buyCount = buySide?.count ?? 0
        const sellCount = sellSide?.count ?? 0
        const buyVol = buySide?.total_quantity ?? '0'
        const sellVol = sellSide?.total_quantity ?? '0'
        lines.push(`Summary by side: BUY ${buyCount} (vol ${buyVol}) / SELL ${sellCount} (vol ${sellVol})`)
      }
    }
  }

  return lines
}

export function formatEvidencePacket(packet: EvidencePacket): string {
  return describeEvidencePacket(packet).join('\n')
}
