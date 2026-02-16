const rawMode = (process.env.NEXT_PUBLIC_APP_MODE || 'prod').trim().toLowerCase()
const rawGuestFlow = (process.env.NEXT_PUBLIC_ENABLE_GUEST_FLOW || '').trim().toLowerCase()

export const APP_MODE: 'demo' | 'prod' = rawMode === 'demo' ? 'demo' : 'prod'
export const IS_GUEST_FLOW_ENABLED = rawGuestFlow === 'true' || rawGuestFlow === '1' || rawGuestFlow === 'yes' || rawGuestFlow === 'on'

export const isDemoMode = APP_MODE === 'demo'
