export type MarketingChannel = 'x' | 'naver_blog' | 'youtube'

export type MarketingAngleType =
  | 'product_intro'
  | 'problem'
  | 'feature'
  | 'dev_log'
  | 'personal_experience'
  | 'education'

export type MarketingDraftStatus =
  | 'approval_pending'
  | 'approved'
  | 'on_hold'
  | 'discarded'

export type MarketingIdeaStatus = 'inbox' | 'draft_ready'

export type MarketingIdea = {
  id: string
  user_id: string
  product_key: string
  title: string
  raw_note: string
  angle_type: MarketingAngleType
  message_pillar: string
  channels: MarketingChannel[]
  source_link?: string | null
  status: MarketingIdeaStatus
  created_at: string
  updated_at: string
}

export type MarketingDraft = {
  id: string
  idea_id: string
  user_id: string
  product_key: string
  channel: MarketingChannel
  tone: string
  version: number
  title: string
  content: string
  risk_flags: string[]
  status: MarketingDraftStatus
  created_at: string
  updated_at: string
}

export type MarketingWorkspaceSummary = {
  idea_count: number
  draft_count: number
  approval_pending_count: number
  approved_count: number
}

export type MarketingWorkspaceResponse = {
  product_key: string
  summary: MarketingWorkspaceSummary
  ideas: MarketingIdea[]
  drafts: MarketingDraft[]
}

export type CreateMarketingIdeaPayload = {
  product_key: string
  title: string
  raw_note: string
  angle_type: MarketingAngleType
  message_pillar: string
  channels: MarketingChannel[]
  source_link?: string
}

export type GenerateMarketingDraftPayload = {
  product_key: string
  channel: MarketingChannel
  tone?: string
}

export type UpdateMarketingDraftPayload = {
  product_key: string
  title?: string
  content?: string
  tone?: string
  risk_flags?: string[]
  status?: MarketingDraftStatus
}

export const marketingChannelLabels: Record<MarketingChannel, string> = {
  x: 'X',
  naver_blog: '네이버 블로그',
  youtube: '유튜브',
}

export const marketingAngleLabels: Record<MarketingAngleType, string> = {
  product_intro: '제품 소개',
  problem: '문제 제기',
  feature: '기능 설명',
  dev_log: '개발 로그',
  personal_experience: '개인 경험',
  education: '교육형',
}

export const marketingDraftStatusLabels: Record<MarketingDraftStatus, string> = {
  approval_pending: '승인 대기',
  approved: '승인 완료',
  on_hold: '보류',
  discarded: '폐기',
}
