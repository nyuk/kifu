import type { InternalAxiosRequestConfig } from 'axios'
import { isGuestSession } from './guestSession'

const GUEST_ALLOWED_MUTATION_PREFIXES = [
  '/v1/auth/guest',
  '/v1/auth/refresh',
  '/v1/growth/events',
]

const GUEST_BLOCKED_READ_PREFIXES = [
  '/v1/export/',
]

export const guestWriteBlockedMessage =
  '게스트 모드에서는 저장, 연결, 알림 설정, 내보내기 기능을 사용할 수 없습니다. 웹 계정을 만들면 사용할 수 있습니다.'

export const guestFeatureMessage = (feature: string) =>
  `${feature}은 게스트 모드에서 사용할 수 없습니다. 웹 계정을 만들면 사용할 수 있습니다.`

const normalizeRequestUrl = (url?: string) => (url || '').trim()

export const isGuestBlockedApiRequest = (method?: string, url?: string) => {
  if (!isGuestSession()) return false

  const normalizedMethod = (method || 'get').trim().toUpperCase()
  const normalizedUrl = normalizeRequestUrl(url)

  if (GUEST_BLOCKED_READ_PREFIXES.some((prefix) => normalizedUrl.includes(prefix))) {
    return true
  }

  const isReadOnlyMethod = normalizedMethod === 'GET' || normalizedMethod === 'HEAD' || normalizedMethod === 'OPTIONS'
  if (isReadOnlyMethod) return false

  return !GUEST_ALLOWED_MUTATION_PREFIXES.some((prefix) => normalizedUrl.includes(prefix))
}

export const buildGuestBlockedError = (config: InternalAxiosRequestConfig, message = guestWriteBlockedMessage) => ({
  config,
  response: {
    status: 403,
    data: {
      code: 'GUEST_WRITE_FORBIDDEN',
      message,
    },
  },
  message,
  isGuestBlocked: true,
})
