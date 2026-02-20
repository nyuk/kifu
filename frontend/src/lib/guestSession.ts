export type GuestSession = {
  id: string
  started_at: string
}

const STORAGE_KEY = 'kifu-guest-session-v1'

export const readGuestSession = (): GuestSession | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GuestSession
    if (!parsed?.id || !parsed?.started_at) return null
    return parsed
  } catch {
    return null
  }
}

export const startGuestSession = () => {
  if (typeof window === 'undefined') return null
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `guest-${crypto.randomUUID().slice(0, 8)}`
    : `guest-${Date.now().toString(36)}`
  const session: GuestSession = {
    id,
    started_at: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}

export const clearGuestSession = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export const isGuestSession = () => readGuestSession() !== null

const normalizeEmail = (value: string | undefined | null): string => {
  return (value || '').trim().toLowerCase()
}

export const isGuestEmail = (email: string | undefined | null): boolean => {
  const configuredGuestEmail = normalizeEmail(process.env.NEXT_PUBLIC_GUEST_EMAIL)
  if (!configuredGuestEmail) {
    return false
  }
  return normalizeEmail(email) === configuredGuestEmail
}
