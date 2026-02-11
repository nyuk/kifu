import { create } from 'zustand'
import { api } from '../lib/api'
import type {
  GuidedReview,
  GuidedReviewItem,
  UserStreak,
  TodayResponse,
  CompleteResponse,
  SubmitItemPayload,
} from '../types/guidedReview'

type GuidedReviewStore = {
  review: GuidedReview | null
  items: GuidedReviewItem[]
  currentStep: number
  streak: UserStreak | null
  isLoading: boolean
  error: string | null

  fetchToday: (timezone?: string) => Promise<void>
  submitItem: (itemId: string, payload: SubmitItemPayload) => Promise<boolean>
  completeReview: () => Promise<boolean>
  fetchStreak: () => Promise<void>
  nextStep: () => void
  prevStep: () => void
  setStep: (step: number) => void
  reset: () => void
}

export const useGuidedReviewStore = create<GuidedReviewStore>((set, get) => ({
  review: null,
  items: [],
  currentStep: 0,
  streak: null,
  isLoading: false,
  error: null,

  fetchToday: async (timezone?: string) => {
    set({ isLoading: true, error: null })
    try {
      const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const response = await api.get<TodayResponse>(`/v1/guided-reviews/today?timezone=${encodeURIComponent(tz)}`)
      const { review, items } = response.data
      set({
        review,
        items: items || [],
        isLoading: false,
      })
    } catch {
      set({ error: '복기 데이터를 불러오지 못했습니다', isLoading: false })
    }
  },

  submitItem: async (itemId: string, payload: SubmitItemPayload) => {
    set({ error: null })
    try {
      await api.post(`/v1/guided-reviews/items/${itemId}/submit`, payload)
      // Update local state
      set((state) => ({
        items: state.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                intent: payload.intent,
                emotions: payload.emotions,
                pattern_match: payload.pattern_match,
                memo: payload.memo,
              }
            : item
        ),
      }))
      return true
    } catch {
      set({ error: '답변 저장에 실패했습니다' })
      return false
    }
  },

  completeReview: async () => {
    const { review } = get()
    if (!review) return false
    set({ error: null })
    try {
      const response = await api.post<CompleteResponse>(`/v1/guided-reviews/${review.id}/complete`)
      set({
        streak: response.data.streak,
        review: { ...review, status: 'completed' },
      })
      return true
    } catch {
      set({ error: '복기 완료 처리에 실패했습니다' })
      return false
    }
  },

  fetchStreak: async () => {
    try {
      const response = await api.get<UserStreak>('/v1/guided-reviews/streak')
      set({ streak: response.data })
    } catch {
      // silent fail
    }
  },

  nextStep: () => {
    const { currentStep, items } = get()
    if (currentStep < items.length - 1) {
      set({ currentStep: currentStep + 1 })
    }
  },

  prevStep: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 })
    }
  },

  setStep: (step: number) => set({ currentStep: step }),

  reset: () =>
    set({
      review: null,
      items: [],
      currentStep: 0,
      streak: null,
      isLoading: false,
      error: null,
    }),
}))
