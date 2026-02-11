const rawMode = (process.env.NEXT_PUBLIC_APP_MODE || 'prod').trim().toLowerCase()

export const APP_MODE: 'demo' | 'prod' = rawMode === 'demo' ? 'demo' : 'prod'

export const isDemoMode = APP_MODE === 'demo'
