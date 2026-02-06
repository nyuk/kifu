import type { TradeExchangeSummary, TradeSideSummary, TradeSummaryResponse, TradeSymbolSummary, TradeTotals } from '../types/trade'

const num = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const str = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)

export const normalizeTradeSummary = (raw: any): TradeSummaryResponse => {
  const totalsRaw = raw?.totals || raw?.Totals || {}
  const byExchangeRaw = raw?.by_exchange || raw?.ByExchange || []
  const bySideRaw = raw?.by_side || raw?.BySide || []
  const bySymbolRaw = raw?.by_symbol || raw?.BySymbol || []

  const totals: TradeTotals = {
    total_trades: num(totalsRaw.total_trades ?? totalsRaw.TotalTrades),
    buy_count: num(totalsRaw.buy_count ?? totalsRaw.BuyCount),
    sell_count: num(totalsRaw.sell_count ?? totalsRaw.SellCount),
    total_volume: str(totalsRaw.total_volume ?? totalsRaw.TotalVolume),
    realized_pnl_total: str(totalsRaw.realized_pnl_total ?? totalsRaw.RealizedPnLTotal),
    wins: num(totalsRaw.wins ?? totalsRaw.Wins),
    losses: num(totalsRaw.losses ?? totalsRaw.Losses),
    breakeven: num(totalsRaw.breakeven ?? totalsRaw.Breakeven),
    average_pnl: totalsRaw.average_pnl ?? totalsRaw.AveragePnL,
  }

  const by_exchange: TradeExchangeSummary[] = (Array.isArray(byExchangeRaw) ? byExchangeRaw : []).map((row: any) => ({
    exchange: str(row.exchange ?? row.Exchange),
    trade_count: num(row.trade_count ?? row.TradeCount ?? row.total_trades ?? row.TotalTrades),
    total_trades: num(row.total_trades ?? row.TotalTrades ?? row.trade_count ?? row.TradeCount),
    buy_count: num(row.buy_count ?? row.BuyCount),
    sell_count: num(row.sell_count ?? row.SellCount),
    total_volume: str(row.total_volume ?? row.TotalVolume),
    realized_pnl_total: str(row.realized_pnl_total ?? row.RealizedPnLTotal),
  }))

  const by_side: TradeSideSummary[] = (Array.isArray(bySideRaw) ? bySideRaw : []).map((row: any) => ({
    side: str(row.side ?? row.Side).toUpperCase(),
    trade_count: num(row.trade_count ?? row.TradeCount ?? row.total_trades ?? row.TotalTrades),
    total_trades: num(row.total_trades ?? row.TotalTrades ?? row.trade_count ?? row.TradeCount),
    total_volume: str(row.total_volume ?? row.TotalVolume),
    realized_pnl_total: str(row.realized_pnl_total ?? row.RealizedPnLTotal),
  }))

  const by_symbol: TradeSymbolSummary[] = (Array.isArray(bySymbolRaw) ? bySymbolRaw : []).map((row: any) => ({
    symbol: str(row.symbol ?? row.Symbol),
    trade_count: num(row.trade_count ?? row.TradeCount ?? row.total_trades ?? row.TotalTrades),
    total_trades: num(row.total_trades ?? row.TotalTrades ?? row.trade_count ?? row.TradeCount),
    buy_count: num(row.buy_count ?? row.BuyCount),
    sell_count: num(row.sell_count ?? row.SellCount),
    total_volume: str(row.total_volume ?? row.TotalVolume),
    realized_pnl_total: str(row.realized_pnl_total ?? row.RealizedPnLTotal),
    wins: num(row.wins ?? row.Wins),
    losses: num(row.losses ?? row.Losses),
  }))

  return {
    exchange: str(raw?.exchange ?? raw?.Exchange),
    totals,
    by_exchange,
    by_side,
    by_symbol,
  }
}
