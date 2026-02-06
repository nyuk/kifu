import { create } from 'zustand'
import { api } from '../lib/api'
import type {
  AlertRule,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  Alert,
  AlertDetailResponse,
  CreateDecisionRequest,
  AlertDecision,
  AlertStatus,
  NotificationChannel,
  TelegramConnectResponse,
} from '../types/alert'

type AlertStore = {
  // Rules
  rules: AlertRule[]
  isLoadingRules: boolean
  rulesError: string | null
  fetchRules: () => Promise<void>
  createRule: (data: CreateAlertRuleRequest) => Promise<AlertRule | null>
  updateRule: (id: string, data: UpdateAlertRuleRequest) => Promise<AlertRule | null>
  deleteRule: (id: string) => Promise<boolean>
  toggleRule: (id: string) => Promise<boolean>

  // Alerts
  alerts: Alert[]
  alertsTotal: number
  isLoadingAlerts: boolean
  alertsError: string | null
  fetchAlerts: (status?: AlertStatus, limit?: number, offset?: number) => Promise<void>

  // Alert Detail
  alertDetail: AlertDetailResponse | null
  isLoadingDetail: boolean
  detailError: string | null
  fetchAlertDetail: (id: string) => Promise<void>
  submitDecision: (alertId: string, data: CreateDecisionRequest) => Promise<AlertDecision | null>
  dismissAlert: (id: string) => Promise<boolean>

  // Notifications
  channels: NotificationChannel[]
  isLoadingChannels: boolean
  channelsError: string | null
  fetchChannels: () => Promise<void>
  connectTelegram: () => Promise<TelegramConnectResponse | null>
  disconnectTelegram: () => Promise<boolean>
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  // Rules state
  rules: [],
  isLoadingRules: false,
  rulesError: null,

  fetchRules: async () => {
    set({ isLoadingRules: true, rulesError: null })
    try {
      const response = await api.get<{ rules: AlertRule[] }>('/v1/alert-rules')
      set({ rules: response.data.rules, isLoadingRules: false })
    } catch {
      set({ rulesError: '규칙을 불러오는데 실패했습니다', isLoadingRules: false })
    }
  },

  createRule: async (data) => {
    set({ isLoadingRules: true, rulesError: null })
    try {
      const response = await api.post<AlertRule>('/v1/alert-rules', data)
      const newRule = response.data
      set((state) => ({
        rules: [newRule, ...state.rules],
        isLoadingRules: false,
      }))
      return newRule
    } catch {
      set({ rulesError: '규칙 생성에 실패했습니다', isLoadingRules: false })
      return null
    }
  },

  updateRule: async (id, data) => {
    set({ isLoadingRules: true, rulesError: null })
    try {
      const response = await api.put<AlertRule>(`/v1/alert-rules/${id}`, data)
      const updated = response.data
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? updated : r)),
        isLoadingRules: false,
      }))
      return updated
    } catch {
      set({ rulesError: '규칙 수정에 실패했습니다', isLoadingRules: false })
      return null
    }
  },

  deleteRule: async (id) => {
    set({ isLoadingRules: true, rulesError: null })
    try {
      await api.delete(`/v1/alert-rules/${id}`)
      set((state) => ({
        rules: state.rules.filter((r) => r.id !== id),
        isLoadingRules: false,
      }))
      return true
    } catch {
      set({ rulesError: '규칙 삭제에 실패했습니다', isLoadingRules: false })
      return false
    }
  },

  toggleRule: async (id) => {
    try {
      const response = await api.patch<{ id: string; enabled: boolean }>(
        `/v1/alert-rules/${id}/toggle`
      )
      const { enabled } = response.data
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? { ...r, enabled } : r)),
      }))
      return true
    } catch {
      set({ rulesError: '규칙 토글에 실패했습니다' })
      return false
    }
  },

  // Alerts state
  alerts: [],
  alertsTotal: 0,
  isLoadingAlerts: false,
  alertsError: null,

  fetchAlerts: async (status, limit = 20, offset = 0) => {
    set({ isLoadingAlerts: true, alertsError: null })
    try {
      let url = `/v1/alerts?limit=${limit}&offset=${offset}`
      if (status) url += `&status=${status}`
      const response = await api.get<{ alerts: Alert[]; total: number }>(url)
      set({
        alerts: response.data.alerts,
        alertsTotal: response.data.total,
        isLoadingAlerts: false,
      })
    } catch {
      set({ alertsError: '알림을 불러오는데 실패했습니다', isLoadingAlerts: false })
    }
  },

  // Alert Detail state
  alertDetail: null,
  isLoadingDetail: false,
  detailError: null,

  fetchAlertDetail: async (id) => {
    set({ isLoadingDetail: true, detailError: null })
    try {
      const response = await api.get<AlertDetailResponse>(`/v1/alerts/${id}`)
      set({ alertDetail: response.data, isLoadingDetail: false })
    } catch {
      set({ detailError: '알림 상세를 불러오는데 실패했습니다', isLoadingDetail: false })
    }
  },

  submitDecision: async (alertId, data) => {
    set({ isLoadingDetail: true, detailError: null })
    try {
      const response = await api.post<AlertDecision>(`/v1/alerts/${alertId}/decision`, data)
      const decision = response.data
      // Update alert detail with decision
      const detail = get().alertDetail
      if (detail) {
        set({
          alertDetail: { ...detail, alert: { ...detail.alert, status: 'decided' }, decision },
          isLoadingDetail: false,
        })
      } else {
        set({ isLoadingDetail: false })
      }
      return decision
    } catch {
      set({ detailError: '결정 제출에 실패했습니다', isLoadingDetail: false })
      return null
    }
  },

  dismissAlert: async (id) => {
    try {
      await api.patch(`/v1/alerts/${id}/dismiss`)
      // Update in alert list
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? { ...a, status: 'expired' as const } : a)),
      }))
      // Update detail if viewing
      const detail = get().alertDetail
      if (detail && detail.alert.id === id) {
        set({ alertDetail: { ...detail, alert: { ...detail.alert, status: 'expired' } } })
      }
      return true
    } catch {
      return false
    }
  },

  // Notifications state
  channels: [],
  isLoadingChannels: false,
  channelsError: null,

  fetchChannels: async () => {
    set({ isLoadingChannels: true, channelsError: null })
    try {
      const response = await api.get<{ channels: NotificationChannel[] }>('/v1/notifications/channels')
      set({ channels: response.data.channels, isLoadingChannels: false })
    } catch {
      set({ channelsError: '채널 정보를 불러오는데 실패했습니다', isLoadingChannels: false })
    }
  },

  connectTelegram: async () => {
    set({ isLoadingChannels: true, channelsError: null })
    try {
      const response = await api.post<TelegramConnectResponse>('/v1/notifications/telegram/connect')
      set({ isLoadingChannels: false })
      return response.data
    } catch {
      set({ channelsError: '텔레그램 연결에 실패했습니다', isLoadingChannels: false })
      return null
    }
  },

  disconnectTelegram: async () => {
    set({ isLoadingChannels: true, channelsError: null })
    try {
      await api.delete('/v1/notifications/telegram')
      set((state) => ({
        channels: state.channels.filter((ch) => ch.type !== 'telegram'),
        isLoadingChannels: false,
      }))
      return true
    } catch {
      set({ channelsError: '텔레그램 연결 해제에 실패했습니다', isLoadingChannels: false })
      return false
    }
  },
}))
