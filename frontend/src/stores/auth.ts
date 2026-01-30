import { create } from 'zustand'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  clearTokens: () => void
}

const accessKey = 'kifu_access_token'
const refreshKey = 'kifu_refresh_token'

const getInitialState = () => {
  if (typeof window === 'undefined') {
    return {
      accessToken: null,
      refreshToken: null,
    }
  }
  const accessToken = localStorage.getItem(accessKey)
  const refreshToken = localStorage.getItem(refreshKey)
  return {
    accessToken,
    refreshToken,
    isAuthenticated: Boolean(accessToken),
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...getInitialState(),
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem(accessKey, accessToken)
    localStorage.setItem(refreshKey, refreshToken)
    set({ accessToken, refreshToken, isAuthenticated: true })
  },
  clearTokens: () => {
    localStorage.removeItem(accessKey)
    localStorage.removeItem(refreshKey)
    set({ accessToken: null, refreshToken: null, isAuthenticated: false })
  },
}))
