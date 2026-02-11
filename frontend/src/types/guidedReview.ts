export type GuidedReviewStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export const NO_TRADE_SYMBOL = '__NO_TRADE__'

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

export const NO_TRADE_INTENT_OPTIONS = [
  { value: 'no_trade_wait_setup', label: '기준 미충족(기다림)' },
  { value: 'no_trade_risk_off', label: '리스크 회피' },
  { value: 'no_trade_schedule', label: '시간/일정 이슈' },
  { value: 'no_trade_emotion_control', label: '감정 통제 목적' },
  { value: 'no_trade_other', label: '기타' },
] as const

export const NO_TRADE_PATTERN_OPTIONS = [
  { value: 'watch_key_level', label: '핵심 레벨 모니터링' },
  { value: 'wait_confirmation', label: '확인 후 진입' },
  { value: 'size_down_first', label: '소액 테스트 진입' },
  { value: 'stay_no_trade', label: '내일도 관망 가능' },
  { value: 'rebuild_plan', label: '계획 재정비' },
] as const
