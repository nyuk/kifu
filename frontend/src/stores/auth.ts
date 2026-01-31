import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  clearTokens: () => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true })
      },
      clearTokens: () => {
        set({ accessToken: null, refreshToken: null, isAuthenticated: false })
      },
      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'kifu-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

// SSR-safe getter for token (used by API interceptor)
export const getAccessToken = (): string | null => {
  return useAuthStore.getState().accessToken
}
