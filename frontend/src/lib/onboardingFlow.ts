export type AuthRedirectInput = {
  next?: string | null
  from?: string | null
  defaultPath: string
}

const sanitize = (value?: string | null) => (value || '').trim()

export const resolveAuthRedirectPath = ({ next, from, defaultPath }: AuthRedirectInput) => {
  const candidate = sanitize(next) || sanitize(from)
  if (!candidate) return defaultPath

  if (candidate.startsWith('/onboarding/test')) return '/onboarding/test'
  if (candidate.startsWith('/onboarding/import')) return '/onboarding/import'
  if (candidate.startsWith('/onboarding/start')) return '/onboarding/start'
  if (candidate.startsWith('/settings')) return '/settings'
  if (candidate.startsWith('/home')) return '/home'
  if (candidate.startsWith('/guest')) return '/home'

  return defaultPath
}
