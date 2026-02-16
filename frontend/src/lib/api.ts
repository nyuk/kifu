import axios from 'axios'
import { getAccessToken, useAuthStore } from '../stores/auth'

const configuredBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
const defaultLocalBaseURL = 'http://127.0.0.1:8080/api'

const normalizeBaseURL = (value: string): string => value.replace(/\/+$/, '')

const safeApiBaseURL = (value: string | undefined): string => {
  const raw = normalizeBaseURL(value ? value.trim() : '')
  if (!raw) return defaultLocalBaseURL

  if (/^https?:\/\//.test(raw)) {
    try {
      const parsed = new URL(raw)

      // Legacy frontend env incorrectly set to :8080 for public domain.
      // Strip this so login/signup calls stay on HTTPS page origin with /api rewrite path.
      if (parsed.hostname === 'kifu.moneyvessel.kr' && parsed.port === '8080') {
        parsed.port = ''
      }

      const pathname = parsed.pathname.replace(/\/+$/, '')
      if (!pathname.endsWith('/api')) {
        parsed.pathname = `${pathname}/api`
      }

      return parsed.toString()
    } catch {
      return defaultLocalBaseURL
    }
  }

  return raw
}

const baseURL = safeApiBaseURL(configuredBaseURL || defaultLocalBaseURL)

export const api = axios.create({
  baseURL,
})

// Request interceptor - add token
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// URLs that should not redirect to login on 401 (guest mode friendly)
const GUEST_FRIENDLY_URLS = [
  '/v1/users/me/symbols',
  '/v1/market/klines',
  '/v1/auth/login',
  '/v1/auth/register',
]

type AxiosErrorWithConfig = {
  config?: {
    _retry?: boolean
    url?: string
    headers?: Record<string, string>
  }
}

type RefreshSubscriber = {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let refreshSubscribers: RefreshSubscriber[] = []

const isGuestFriendlyError = (url: string | undefined): boolean => {
  return GUEST_FRIENDLY_URLS.some((path) => (url || '').includes(path))
}

const subscribeTokenRefresh = (subscriber: RefreshSubscriber) => {
  refreshSubscribers.push(subscriber)
}

const onTokenRefreshed = (token: string) => {
  const subscribers = [...refreshSubscribers]
  refreshSubscribers = []
  subscribers.forEach((subscriber) => subscriber.resolve(token))
}

const onRefreshFailed = (error: unknown) => {
  const subscribers = [...refreshSubscribers]
  refreshSubscribers = []
  subscribers.forEach((subscriber) => subscriber.reject(error))
}

// Response interceptor - handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosErrorWithConfig['config']
    const requestUrl = originalRequest?.url || ''

    // Check if this URL supports guest mode (no redirect on 401)
    const isGuestFriendly = isGuestFriendlyError(requestUrl)

    // If 401 and not already retrying
    if (error?.response?.status === 401 && !originalRequest?._retry) {
      if (!originalRequest) {
        return Promise.reject(error)
      }

      originalRequest._retry = true

      const { refreshToken, setTokens, clearTokens } = useAuthStore.getState()

      // Try to refresh token
      if (refreshToken) {
        if (isRefreshing) {
          try {
            const token = await new Promise<string>((resolve, reject) => {
              subscribeTokenRefresh({ resolve, reject })
            })
            originalRequest.headers = originalRequest.headers || {}
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          } catch (refreshError) {
            return Promise.reject(refreshError)
          }
        }

        isRefreshing = true
        try {
          const response = await axios.post(`${baseURL}/v1/auth/refresh`, {
            refresh_token: refreshToken,
          })

          const { access_token, refresh_token } = response.data
          setTokens(access_token, refresh_token)
          isRefreshing = false
          onTokenRefreshed(access_token)

          // Retry original request with new token
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch (refreshError) {
          isRefreshing = false
          onRefreshFailed(refreshError)

          // Network error should not immediately sign the user out
          if (!refreshError || !(refreshError as { response?: { status?: number } }).response) {
            return Promise.reject(refreshError)
          }

          const refreshStatus = (refreshError as { response?: { status?: number } }).response?.status
          if ([401, 403].includes(refreshStatus || 0)) {
            clearTokens()
          }

          // Only redirect for non-guest-friendly URLs
          if (!isGuestFriendly && refreshStatus && [401, 403].includes(refreshStatus) && typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token - clear tokens
        clearTokens()

        // Only redirect for non-guest-friendly URLs
        if (!isGuestFriendly && typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

// Default symbols for fallback (when not authenticated)
export const DEFAULT_SYMBOLS = [
  { symbol: 'BTCUSDT', timeframe_default: '1d' },
  { symbol: 'ETHUSDT', timeframe_default: '1d' },
  { symbol: 'BNBUSDT', timeframe_default: '1d' },
]
