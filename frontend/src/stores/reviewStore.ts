import { create } from 'zustand'
import { api } from '../lib/api'
import { normalizeExchangeFilter } from '../lib/exchangeFilters'
import type {
  ReviewStats,
  AccuracyResponse,
  CalendarResponse,
  ReviewFilters,
  ReplayState,
} from '../types/review'

type ReviewStore = {
  // Data
  stats: ReviewStats | null
  accuracy: AccuracyResponse | null
  calendar: CalendarResponse | null
  isLoading: boolean
  isLoadingAccuracy: boolean
  error: string | null

  // Filters
  filters: ReviewFilters
  setFilters: (filters: Partial<ReviewFilters>) => void

  // Replay
  replay: ReplayState
  setReplayTime: (time: number) => void
  togglePlay: () => void
  setSpeed: (speed: 1 | 2 | 4 | 8) => void
  startReplay: (startTime: number, endTime: number) => void
  stopReplay: () => void

  // Actions
  fetchStats: () => Promise<void>
  fetchAccuracy: () => Promise<void>
  fetchCalendar: (from: string, to: string) => Promise<void>
  reset: () => void
}

const initialReplayState: ReplayState = {
  isActive: false,
  currentTime: 0,
  endTime: 0,
  speed: 1,
  isPlaying: false,
}

import { persist } from 'zustand/middleware'

export const useReviewStore = create<ReviewStore>()(
  persist(
    (set, get) => ({
      stats: null,
      accuracy: null,
      calendar: null,
      isLoading: false,
      isLoadingAccuracy: false,
      error: null,

      filters: {
        period: '30d',
        outcomePeriod: '1h',
        assetClass: 'all',
        venue: '',
      },

      replay: initialReplayState,

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      setReplayTime: (time) =>
        set((state) => ({
          replay: { ...state.replay, currentTime: time },
        })),

      togglePlay: () =>
        set((state) => ({
          replay: { ...state.replay, isPlaying: !state.replay.isPlaying },
        })),

      setSpeed: (speed) =>
        set((state) => ({
          replay: { ...state.replay, speed },
        })),

      startReplay: (startTime, endTime) =>
        set({
          replay: {
            isActive: true,
            currentTime: startTime,
            endTime,
            speed: 1,
            isPlaying: false,
          },
        }),

      stopReplay: () =>
        set({
          replay: initialReplayState,
        }),

      fetchStats: async () => {
        const { filters } = get()
        set({ isLoading: true, error: null })
        try {
          const params = new URLSearchParams({ period: filters.period })
          if (filters.symbol) params.set('symbol', filters.symbol)
          if (filters.tag) params.set('tag', filters.tag)
          if (filters.assetClass && filters.assetClass !== 'all') params.set('asset_class', filters.assetClass)
          const venue = normalizeExchangeFilter(filters.venue)
          if (venue) params.set('venue', venue)

          const response = await api.get(`/v1/review/stats?${params}`)
          set({ stats: response.data, isLoading: false })
        } catch (error) {
          set({ error: '통계를 불러오는데 실패했습니다', isLoading: false })
        }
      },

      fetchAccuracy: async () => {
        const { filters } = get()
        set({ isLoadingAccuracy: true, error: null })
        try {
          const params = new URLSearchParams({
            period: filters.period,
            outcome_period: filters.outcomePeriod,
          })
          if (filters.assetClass && filters.assetClass !== 'all') params.set('asset_class', filters.assetClass)
          const venue = normalizeExchangeFilter(filters.venue)
          if (venue) params.set('venue', venue)

          console.log('[ReviewStore] Fetching accuracy with params:', params.toString())
          const response = await api.get(`/v1/review/accuracy?${params}`)
          console.log('[ReviewStore] Accuracy response:', response.data)
          set({ accuracy: response.data, isLoadingAccuracy: false })
        } catch (error: unknown) {
          console.error('[ReviewStore] Accuracy fetch error:', error)
          const message = error instanceof Error ? error.message : 'AI 정확도를 불러오는데 실패했습니다'
          set({ error: message, isLoadingAccuracy: false })
        }
      },

      fetchCalendar: async (from, to) => {
        const { filters } = get()
        set({ isLoading: true, error: null })
        try {
          const params = new URLSearchParams({ from, to })
          if (filters.assetClass && filters.assetClass !== 'all') params.set('asset_class', filters.assetClass)
          const venue = normalizeExchangeFilter(filters.venue)
          if (venue) params.set('venue', venue)
          const response = await api.get(`/v1/review/calendar?${params}`)
          set({ calendar: response.data, isLoading: false })
        } catch (error) {
          set({ error: '캘린더 데이터를 불러오는데 실패했습니다', isLoading: false })
        }
      },

      reset: () =>
        set({
          stats: null,
          accuracy: null,
          calendar: null,
          isLoading: false,
          isLoadingAccuracy: false,
          error: null,
          filters: { period: '30d', outcomePeriod: '1h', assetClass: 'all', venue: '' },
          replay: initialReplayState,
        }),
    }),
    {
      name: 'review-store',
      partialize: (state) => ({ filters: state.filters }),
    }
  )
)
