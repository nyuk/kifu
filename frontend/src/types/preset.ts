import type { CreateAlertRuleRequest } from './alert'

export type PresetCategory = 'rebound' | 'volatility' | 'cycle'
export type PresetRiskLevel = 'low' | 'medium' | 'high'
export type PresetSummaryWindow = 'all' | '180d' | '90d'

export type PresetSummary = {
  signal_count: number
  win_rate: number
  avg_return_pct: number
  total_return_pct: number
  max_drawdown_pct: number
  avg_hold_bars: number
  avg_hold_hours: number
  window: string
  tp_count: number
  sl_count: number
  timeout_count: number
}

export type PresetExample = {
  date: string
  entry_price: number
  result_pct: number
  exit_type: 'tp' | 'sl' | 'timeout'
  bars_held: number
}

export type PresetStrategy = {
  id: string
  label: string
  short_description: string
  category: PresetCategory
  risk_level: PresetRiskLevel
  educational_note: string
  params: Record<string, string>
  alert_rule_template: CreateAlertRuleRequest
  summary_all: PresetSummary
  summary_180d: PresetSummary
  summary_90d: PresetSummary
  recent_examples: PresetExample[]
  risk_notice: string
}

export type PresetBacktestData = {
  generated_at: string
  data_source: string
  data_range: { from: string; to: string }
  fee_applied: string
  presets: PresetStrategy[]
}
