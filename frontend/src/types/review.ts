export type Direction = 'BUY' | 'SELL' | 'HOLD' | 'UP' | 'DOWN' | 'NEUTRAL'

export type PeriodStats = {
  win_rate: number
  avg_pnl: string
  count: number
}

export type TagStats = {
  count: number
  win_rate: number
  avg_pnl: string
}

export type SymbolStats = {
  count: number
  win_rate: number
  avg_pnl: string
}

export type OverallStats = {
  win_rate: number
  avg_pnl: string
  total_pnl: string
  max_gain: string
  max_loss: string
}

export type ReviewStats = {
  period: string
  total_bubbles: number
  bubbles_with_outcome: number
  overall: OverallStats
  by_period: Record<string, PeriodStats>
  by_tag: Record<string, TagStats>
  by_symbol: Record<string, SymbolStats>
}

export type DirectionStats = {
  predicted: number
  correct: number
  accuracy: number
}

export type ProviderAccuracyStats = {
  provider: string
  total: number
  evaluated: number
  correct: number
  accuracy: number
  by_direction: Record<Direction, DirectionStats>
}

export type ProviderRanking = {
  provider: string
  accuracy: number
  rank: number
}

export type AccuracyResponse = {
  period: string
  outcome_period: string
  total_opinions: number
  evaluated_opinions: number
  by_provider: Record<string, ProviderAccuracyStats>
  ranking: ProviderRanking[]
}

export type CalendarDay = {
  bubble_count: number
  win_count: number
  loss_count: number
  total_pnl: string
}

export type CalendarResponse = {
  from: string
  to: string
  days: Record<string, CalendarDay>
}

export type BubbleAccuracyItem = {
  opinion_id: string
  provider: string
  period: string
  predicted_direction: Direction
  actual_direction: Direction
  is_correct: boolean
  pnl_percent?: string
}

export type BubbleAccuracyResponse = {
  bubble_id: string
  accuracies: BubbleAccuracyItem[]
}

export type ReviewFilters = {
  period: '7d' | '30d' | 'all'
  symbol?: string
  tag?: string
  assetClass?: 'all' | 'crypto' | 'stock'
  venue?: string
  outcomePeriod: '1h' | '4h' | '1d'
}

export type ReplayState = {
  isActive: boolean
  currentTime: number
  endTime: number
  speed: 1 | 2 | 4 | 8
  isPlaying: boolean
}

export type Emotion = 'greedy' | 'fearful' | 'confident' | 'uncertain' | 'calm' | 'frustrated' | ''

export type ReviewNote = {
  id: string
  bubble_id?: string
  title: string
  content: string
  tags?: string[]
  lesson_learned?: string
  emotion?: Emotion
  created_at: string
  updated_at: string
}

export type CreateNoteRequest = {
  bubble_id?: string
  title: string
  content: string
  tags?: string[]
  lesson_learned?: string
  emotion?: Emotion
}

export type NotesListResponse = {
  notes: ReviewNote[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export type PerformanceTrend = {
  date: string
  pnl: number
  cumulative_pnl: number
  win_rate: number
  bubble_count: number
}
