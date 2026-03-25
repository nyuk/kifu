export type MarketingChannel = 'x' | 'naver_blog' | 'youtube'

export type MarketingAngleType =
  | 'product_intro'
  | 'problem'
  | 'feature'
  | 'dev_log'
  | 'personal_experience'
  | 'education'

export type MarketingContentIntent =
  | 'direct_promo'
  | 'soft_promo'
  | 'non_promo'

export type MarketingEvidenceSource =
  | 'personal_note'
  | 'team_chat'
  | 'quote'
  | 'news'
  | 'screenshot'
  | 'generated_image'

export type MarketingFormatStyle =
  | 'question'
  | 'reflection'
  | 'conversation'
  | 'contrarian'
  | 'screen_explainer'
  | 'news_reaction'

export type MarketingDraftStatus =
  | 'approval_pending'
  | 'approved'
  | 'on_hold'
  | 'discarded'

export type MarketingPublicationStatus = 'published'

export type MarketingIdeaStatus = 'inbox' | 'draft_ready'

export type MarketingIdeaAttachment = {
  id: string
  name: string
  mime_type: string
  data_url: string
  note?: string | null
}

export type MarketingIdea = {
  id: string
  user_id: string
  product_key: string
  title: string
  raw_note: string
  angle_type: MarketingAngleType
  message_pillar: string
  channels: MarketingChannel[]
  content_intent: MarketingContentIntent
  evidence_source: MarketingEvidenceSource
  format_style: MarketingFormatStyle
  source_link?: string | null
  attachments?: MarketingIdeaAttachment[]
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

export type MarketingPublication = {
  id: string
  draft_id: string
  user_id: string
  product_key: string
  channel: MarketingChannel
  publish_status: MarketingPublicationStatus
  external_url?: string | null
  created_at: string
  updated_at: string
}

export type MarketingChannelSetting = {
  id: string
  user_id: string
  product_key: string
  channel: MarketingChannel
  publication_name: string
  publication_url?: string | null
  default_category: string
  primary_audience: string
  tone_guide: string
  default_cta: string
  proof_points: string
  reference_notes: string
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
  publications: MarketingPublication[]
  channel_settings: MarketingChannelSetting[]
}

export type CreateMarketingIdeaPayload = {
  product_key: string
  title: string
  raw_note: string
  angle_type: MarketingAngleType
  message_pillar: string
  channels: MarketingChannel[]
  content_intent: MarketingContentIntent
  evidence_source: MarketingEvidenceSource
  format_style: MarketingFormatStyle
  source_link?: string
  attachments?: MarketingIdeaAttachment[]
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

export type SaveMarketingPublicationPayload = {
  product_key: string
  external_url: string
}

export type SaveMarketingChannelSettingPayload = {
  product_key: string
  channel: MarketingChannel
  publication_name: string
  publication_url?: string
  default_category: string
  primary_audience: string
  tone_guide: string
  default_cta: string
  proof_points: string
  reference_notes: string
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

export const marketingContentIntentLabels: Record<MarketingContentIntent, string> = {
  direct_promo: '직접 광고',
  soft_promo: '은근한 연결',
  non_promo: '비광고 글',
}

export const marketingEvidenceSourceLabels: Record<MarketingEvidenceSource, string> = {
  personal_note: '내 생각',
  team_chat: '팀 대화',
  quote: '인용문',
  news: '뉴스 기사',
  screenshot: '화면 캡처',
  generated_image: '생성 이미지',
}

export const marketingFormatStyleLabels: Record<MarketingFormatStyle, string> = {
  question: '질문형',
  reflection: '회고형',
  conversation: '대화형',
  contrarian: '반박형',
  screen_explainer: '화면 설명형',
  news_reaction: '뉴스 반응형',
}

export const marketingDraftStatusLabels: Record<MarketingDraftStatus, string> = {
  approval_pending: '승인 대기',
  approved: '승인 완료',
  on_hold: '보류',
  discarded: '폐기',
}
