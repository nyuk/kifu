import axios from 'axios'
import { getAccessToken, useAuthStore } from '../stores/auth'

// Use direct backend URL with IP to avoid localhost resolution issues
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080/api'

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

// Response interceptor - handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const requestUrl = originalRequest?.url || ''

    // Check if this URL supports guest mode (no redirect on 401)
    const isGuestFriendly = GUEST_FRIENDLY_URLS.some(url => requestUrl.includes(url))

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const { refreshToken, setTokens, clearTokens } = useAuthStore.getState()

      // Try to refresh token
      if (refreshToken) {
        try {
          const response = await axios.post(`${baseURL}/v1/auth/refresh`, {
            refresh_token: refreshToken,
          })

          const { access_token, refresh_token } = response.data
          setTokens(access_token, refresh_token)

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch (refreshError) {
          // Refresh failed - clear tokens
          clearTokens()

          // Only redirect for non-guest-friendly URLs
          if (!isGuestFriendly && typeof window !== 'undefined') {
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
