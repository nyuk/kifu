export type ManualPosition = {
  id: string
  symbol: string
  asset_class: 'crypto' | 'stock'
  venue?: string
  position_side: 'long' | 'short'
  size?: string
  entry_price?: string
  stop_loss?: string
  take_profit?: string
  leverage?: string
  strategy?: string
  memo?: string
  status: 'open' | 'closed'
  opened_at?: string
  closed_at?: string
  created_at: string
  updated_at: string
}

export type ManualPositionsResponse = {
  positions: ManualPosition[]
}

export type ManualPositionRequest = {
  symbol: string
  asset_class: 'crypto' | 'stock'
  venue?: string
  position_side: 'long' | 'short'
  size?: string
  entry_price?: string
  stop_loss?: string
  take_profit?: string
  leverage?: string
  strategy?: string
  memo?: string
  status?: 'open' | 'closed'
  opened_at?: string
  closed_at?: string
}
