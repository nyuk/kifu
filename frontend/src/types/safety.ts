export type SafetyVerdict = 'intended' | 'mistake' | 'unsure'

export type SafetyItem = {
  target_type: 'trade' | 'trade_event'
  target_id: string
  executed_at: string
  asset_class: 'crypto' | 'stock' | string
  venue: string
  venue_name: string
  symbol: string
  side?: string
  qty?: string
  price?: string
  source: string
  reviewed: boolean
  verdict?: SafetyVerdict
  note?: string
  reviewed_at?: string
}

export type SafetyTodayResponse = {
  date: string
  timezone: string
  total: number
  reviewed: number
  pending: number
  items: SafetyItem[]
}

export type UpsertSafetyReviewPayload = {
  target_type: SafetyItem['target_type']
  target_id: string
  verdict: SafetyVerdict
  note?: string
}

export type SafetyReviewResponse = {
  id: string
  target_type: SafetyItem['target_type']
  target_id: string
  verdict: SafetyVerdict
  note?: string
  created_at: string
  updated_at: string
}
