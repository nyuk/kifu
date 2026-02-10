import { getAccessToken } from '../stores/auth'

export type OnboardingChoice = 'long' | 'short' | 'hold'

export type OnboardingResponse = {
  choice: OnboardingChoice
  confidence?: number
}

export type OnboardingProfile = {
  version: number
  completed_at: string
  tendency: string
  long_count: number
  short_count: number
  hold_count: number
  total_scenarios: number
  recommended_mode: 'aggressive' | 'defensive' | 'balanced'
  confidence_avg?: number
}

const STORAGE_KEY_PREFIX = 'kifu-onboarding-profile-v1'
const DRAFT_STORAGE_KEY_PREFIX = 'kifu-onboarding-draft-v1'

export type OnboardingDraft<T = unknown> = {
  updated_at: string
  answers: T
  current_index: number
}

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

const resolveCurrentUserKey = (): string => {
  if (typeof window === 'undefined') return 'anon'
  const token = getAccessToken()
  if (!token) return 'anon'
  const payload = decodeJwtPayload(token)
  const sub = typeof payload?.sub === 'string' ? payload.sub : ''
  return sub.trim() || 'anon'
}

const profileStorageKey = (userKey?: string) => `${STORAGE_KEY_PREFIX}:${userKey || resolveCurrentUserKey()}`
const draftStorageKey = (userKey?: string) => `${DRAFT_STORAGE_KEY_PREFIX}:${userKey || resolveCurrentUserKey()}`

export const onboardingProfileStoragePrefix = STORAGE_KEY_PREFIX

export const readOnboardingProfile = (userKey?: string): OnboardingProfile | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(profileStorageKey(userKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as OnboardingProfile
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.completed_at) return null
    return parsed
  } catch {
    return null
  }
}

export const saveOnboardingProfile = (profile: OnboardingProfile, userKey?: string) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(profileStorageKey(userKey), JSON.stringify(profile))
  localStorage.removeItem(draftStorageKey(userKey))
}

export const readOnboardingDraft = <T = unknown>(userKey?: string): OnboardingDraft<T> | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(draftStorageKey(userKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as OnboardingDraft<T>
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.updated_at) return null
    return parsed
  } catch {
    return null
  }
}

export const saveOnboardingDraft = <T = unknown>(draft: OnboardingDraft<T>, userKey?: string) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(draftStorageKey(userKey), JSON.stringify(draft))
}

export const buildOnboardingProfile = (
  answers: Record<number, OnboardingChoice | OnboardingResponse>,
  scenarioCount: number,
): OnboardingProfile => {
  const normalized = Object.values(answers).map((value) => {
    if (typeof value === 'string') {
      return { choice: value, confidence: 3 }
    }
    return {
      choice: value.choice,
      confidence: value.confidence && value.confidence >= 1 && value.confidence <= 5 ? value.confidence : 3,
    }
  })

  const longCount = normalized.filter((value) => value.choice === 'long').length
  const shortCount = normalized.filter((value) => value.choice === 'short').length
  const holdCount = normalized.filter((value) => value.choice === 'hold').length
  const longScore = normalized.filter((value) => value.choice === 'long').reduce((sum, value) => sum + value.confidence, 0)
  const shortScore = normalized.filter((value) => value.choice === 'short').reduce((sum, value) => sum + value.confidence, 0)
  const holdScore = normalized.filter((value) => value.choice === 'hold').reduce((sum, value) => sum + value.confidence, 0)
  const confidenceAvg = normalized.length
    ? normalized.reduce((sum, value) => sum + value.confidence, 0) / normalized.length
    : 0

  let tendency = '균형형(상황 적응형)'
  let recommendedMode: OnboardingProfile['recommended_mode'] = 'balanced'
  const longWeight = longScore + longCount * 0.6
  const shortWeight = shortScore + shortCount * 0.6
  const holdWeight = holdScore + holdCount * 0.6

  if (longWeight >= shortWeight*1.15 && longWeight >= holdWeight*1.15) {
    tendency = '공격형(상승 추세 선호)'
    recommendedMode = 'aggressive'
  } else if (shortWeight >= longWeight*1.15 || holdWeight >= longWeight*1.2) {
    tendency = '방어형(리스크 회피/하락 대응)'
    recommendedMode = 'defensive'
  }

  return {
    version: 1,
    completed_at: new Date().toISOString(),
    tendency,
    long_count: longCount,
    short_count: shortCount,
    hold_count: holdCount,
    total_scenarios: scenarioCount,
    recommended_mode: recommendedMode,
    confidence_avg: Number(confidenceAvg.toFixed(2)),
  }
}
