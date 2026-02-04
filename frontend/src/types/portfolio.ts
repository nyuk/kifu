export type TimelineItem = {
  id: string
  executed_at: string
  asset_class: string
  venue_type: string
  venue: string
  venue_name: string
  account_label?: string
  instrument: string
  event_type: string
  side?: string
  qty?: string
  price?: string
  fee?: string
  fee_asset?: string
  source: string
  external_id?: string
}

export type TimelineResponse = {
  items: TimelineItem[]
  next_cursor?: string | null
}

export type PositionItem = {
  key: string
  instrument: string
  venue: string
  venue_name: string
  account_label?: string
  asset_class: string
  venue_type: string
  status: string
  net_qty: string
  avg_entry: string
  buy_qty: string
  sell_qty: string
  buy_notional: string
  sell_notional: string
  last_executed_at: string
}

export type PositionsResponse = {
  positions: PositionItem[]
  count: number
}
