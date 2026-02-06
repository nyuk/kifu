// Rule types
export type RuleType = 'price_change' | 'ma_cross' | 'price_level' | 'volatility_spike'

export type PriceChangeConfig = {
  direction: 'drop' | 'rise' | 'both'
  threshold_type: 'absolute' | 'percent'
  threshold_value: string
  reference: '24h' | '1h' | '4h'
}

export type MACrossConfig = {
  ma_period: number
  ma_timeframe: string
  direction: 'below' | 'above'
}

export type PriceLevelConfig = {
  price: string
  direction: 'above' | 'below'
}

export type VolatilitySpikeConfig = {
  timeframe: string
  multiplier: string
}

export type RuleConfig = PriceChangeConfig | MACrossConfig | PriceLevelConfig | VolatilitySpikeConfig

export type AlertRule = {
  id: string
  user_id: string
  name: string
  symbol: string
  rule_type: RuleType
  config: RuleConfig
  cooldown_minutes: number
  enabled: boolean
  last_triggered_at?: string
  created_at: string
  updated_at: string
}

export type CreateAlertRuleRequest = {
  name: string
  symbol: string
  rule_type: RuleType
  config: RuleConfig
  cooldown_minutes?: number
}

export type UpdateAlertRuleRequest = {
  name?: string
  symbol?: string
  rule_type?: RuleType
  config?: RuleConfig
  cooldown_minutes?: number
  enabled?: boolean
}

// Alert types
export type AlertSeverity = 'normal' | 'urgent'
export type AlertStatus = 'pending' | 'briefed' | 'decided' | 'expired'

export type Alert = {
  id: string
  user_id: string
  rule_id: string
  symbol: string
  trigger_price: string
  trigger_reason: string
  severity: AlertSeverity
  status: AlertStatus
  notified_at?: string
  created_at: string
}

export type AlertBriefing = {
  id: string
  alert_id: string
  provider: string
  model: string
  prompt: string
  response: string
  tokens_used?: number
  created_at: string
}

export type DecisionAction = 'buy' | 'sell' | 'hold' | 'close' | 'reduce' | 'add' | 'ignore'
export type Confidence = 'high' | 'medium' | 'low'

export type AlertDecision = {
  id: string
  alert_id: string
  user_id: string
  action: DecisionAction
  memo?: string
  confidence?: Confidence
  executed_at?: string
  created_at: string
}

export type AlertOutcome = {
  id: string
  alert_id: string
  decision_id: string
  period: string
  reference_price: string
  outcome_price: string
  pnl_percent: string
  calculated_at: string
}

export type AlertDetailResponse = {
  alert: Alert
  briefings: AlertBriefing[]
  decision?: AlertDecision
  outcomes?: AlertOutcome[]
}

export type CreateDecisionRequest = {
  action: DecisionAction
  memo?: string
  confidence?: Confidence
}

// Notification types
export type NotificationChannel = {
  type: string
  enabled: boolean
  verified: boolean
}

export type TelegramConnectResponse = {
  code: string
  expires_in: number
  message: string
}
