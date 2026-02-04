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

const STORAGE_KEY = 'kifu-onboarding-profile-v1'

export const readOnboardingProfile = (): OnboardingProfile | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OnboardingProfile
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.completed_at) return null
    return parsed
  } catch {
    return null
  }
}

export const saveOnboardingProfile = (profile: OnboardingProfile) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
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
  if (longScore > shortScore * 1.2 && longScore > holdScore) {
    tendency = '공격형(상승 추세 선호)'
    recommendedMode = 'aggressive'
  } else if (shortScore >= longScore || holdScore > longScore) {
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
