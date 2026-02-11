export type GuidedReviewStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export type GuidedReview = {
  id: string
  user_id: string
  review_date: string
  status: GuidedReviewStatus
  completed_at?: string | null
  created_at: string
}

export type GuidedReviewItem = {
  id: string
  review_id: string
  trade_id?: string | null
  bundle_key?: string | null
  symbol: string
  side?: string | null
  pnl?: number | null
  trade_count: number
  intent?: string | null
  emotions?: string[] | null
  pattern_match?: string | null
  memo?: string | null
  order_index: number
  created_at: string
}

export type UserStreak = {
  user_id: string
  current_streak: number
  longest_streak: number
  last_review_date?: string | null
  updated_at: string
}

export type TodayResponse = {
  review: GuidedReview
  items: GuidedReviewItem[]
}

export type SubmitItemPayload = {
  intent: string
  emotions: string[]
  pattern_match: string
  memo: string
}

export type CompleteResponse = {
  ok: boolean
  streak: UserStreak
}

export const INTENT_OPTIONS = [
  { value: 'technical_signal', label: '기술적 신호' },
  { value: 'news_event', label: '뉴스/이벤트' },
  { value: 'emotional', label: '감정적 판단' },
  { value: 'planned_regular', label: '계획된 매매' },
  { value: 'other', label: '기타' },
] as const

export const EMOTION_OPTIONS = [
  { value: 'confident', label: '확신' },
  { value: 'half_doubtful', label: '반신반의' },
  { value: 'anxious', label: '불안' },
  { value: 'excited', label: '흥분' },
  { value: 'calm', label: '평온' },
  { value: 'nervous', label: '초조' },
  { value: 'fomo', label: 'FOMO' },
  { value: 'revenge_trade', label: '복수매매' },
  { value: 'as_planned', label: '계획대로' },
] as const

export const PATTERN_OPTIONS = [
  { value: 'same_decision', label: '같은 판단' },
  { value: 'adjust_timing', label: '타이밍 조절' },
  { value: 'reduce_size', label: '사이즈 축소' },
  { value: 'would_not_trade', label: '안 하겠다' },
  { value: 'change_sl_tp', label: 'SL/TP 변경' },
] as const
