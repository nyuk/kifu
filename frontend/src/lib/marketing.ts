import { api } from './api'
import type {
  CreateMarketingIdeaPayload,
  GenerateMarketingDraftPayload,
  MarketingChannelSetting,
  MarketingDraft,
  MarketingIdea,
  MarketingPublication,
  MarketingWorkspaceResponse,
  SaveMarketingChannelSettingPayload,
  SaveMarketingPublicationPayload,
  UpdateMarketingDraftPayload,
} from '../types/marketing'

export const MARKETING_PRODUCT_KEY = 'kifu'

export const fetchMarketingWorkspace = async (productKey = MARKETING_PRODUCT_KEY) => {
  const response = await api.get<MarketingWorkspaceResponse>(`/v1/marketing/workspace?product_key=${encodeURIComponent(productKey)}`)
  return response.data
}

export const createMarketingIdea = async (payload: CreateMarketingIdeaPayload) => {
  const response = await api.post<MarketingIdea>('/v1/marketing/ideas', payload)
  return response.data
}

export const generateMarketingDraft = async (ideaId: string, payload: GenerateMarketingDraftPayload) => {
  const response = await api.post<MarketingDraft>(`/v1/marketing/ideas/${ideaId}/drafts`, payload)
  return response.data
}

export const updateMarketingDraft = async (draftId: string, payload: UpdateMarketingDraftPayload) => {
  const response = await api.patch<MarketingDraft>(`/v1/marketing/drafts/${draftId}`, payload)
  return response.data
}

export const saveMarketingPublication = async (draftId: string, payload: SaveMarketingPublicationPayload) => {
  const response = await api.put<MarketingPublication>(`/v1/marketing/drafts/${draftId}/publication`, payload)
  return response.data
}

export const saveMarketingChannelSetting = async (channel: string, payload: SaveMarketingChannelSettingPayload) => {
  const response = await api.put<MarketingChannelSetting>(`/v1/marketing/settings/${channel}`, payload)
  return response.data
}
