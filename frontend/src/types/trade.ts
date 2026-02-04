export type TradeItem = {
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

export type TradeListResponse = {
  page: number
  limit: number
  total: number
  items: TradeItem[]
}

export type TradeSideSummary = {
  side: string
  trade_count?: number
  total_trades?: number
  total_volume?: string
  realized_pnl_total?: string
}

export type TradeSymbolSummary = {
  symbol: string
  trade_count?: number
  total_trades?: number
  buy_count?: number
  sell_count?: number
  total_volume?: string
  realized_pnl_total?: string
  wins?: number
  losses?: number
}

export type TradeExchangeSummary = {
  exchange: string
  trade_count?: number
  total_trades?: number
  buy_count?: number
  sell_count?: number
  total_volume?: string
  realized_pnl_total?: string
}

export type TradeTotals = {
  total_trades: number
  buy_count?: number
  sell_count?: number
  total_volume?: string
  realized_pnl_total?: string
  wins?: number
  losses?: number
  breakeven?: number
  average_pnl?: string
}

export type TradeSummaryResponse = {
  exchange: string
  totals: TradeTotals
  by_exchange: TradeExchangeSummary[]
  by_side: TradeSideSummary[]
  by_symbol: TradeSymbolSummary[]
}
