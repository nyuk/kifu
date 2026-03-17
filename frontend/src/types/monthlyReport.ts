export type MonthlyReportPeriod = {
  year: number
  month: number
  label: string
}

export type MonthlyTradeSummary = {
  total_trades: number
  buy_count: number
  sell_count: number
  realized_pnl: number
  total_fees: number
  win_rate: number
  avg_pnl: number
}

export type MonthlyDecisionStats = {
  total_bubbles: number
  bubbles_with_outcome: number
  bubble_win_rate: number
  avg_bubble_pnl: number
}

export type MonthlyProviderStats = {
  provider: string
  total_checked: number
  correct_count: number
  accuracy: number
}

export type MonthlyAIAccuracy = {
  total_opinions: number
  by_provider: MonthlyProviderStats[]
}

export type MonthlyMistake = {
  symbol: string
  side: string
  count: number
}

export type MonthlyMistakeReport = {
  total_reviewed: number
  mistake_count: number
  intended_count: number
  unsure_count: number
  top_mistakes: MonthlyMistake[]
}

export type MonthlySymbolPerf = {
  symbol: string
  trade_count: number
  realized_pnl: number
  win_rate: number
}

export type MonthlyComparison = {
  pnl_change: number
  win_rate_change: number
  trade_count_diff: number
  bubble_count_diff: number
  accuracy_change: number
}

export type MonthlyReportPayload = {
  schema_version: string
  period: MonthlyReportPeriod
  trade_summary: MonthlyTradeSummary
  decision_stats: MonthlyDecisionStats
  ai_accuracy: MonthlyAIAccuracy
  mistake_report: MonthlyMistakeReport
  top_symbols: MonthlySymbolPerf[]
  comparison?: MonthlyComparison | null
}

export type MonthlyReport = {
  report_id: string
  user_id: string
  year: number
  month: number
  payload: MonthlyReportPayload
  created_at: string
}

export type MonthlyReportListResponse = {
  reports: MonthlyReport[]
  count: number
}
