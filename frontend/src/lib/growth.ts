'use client'

import { api } from './api'

type GrowthEventName = 'visit' | 'guest_start'

type GrowthEventPayload = {
  guest_session_id?: string
  event_name: GrowthEventName
  source_path?: string
  referrer?: string
  metadata?: Record<string, unknown>
  occurred_at?: string
}

type TrackVisitOptions = {
  entryPoint: string
  sourcePath?: string
  metadata?: Record<string, unknown>
}

type TrackGuestStartOptions = {
  guestSessionId: string
  entryPoint: string
  sourcePath?: string
  metadata?: Record<string, unknown>
}

const STORAGE_PREFIX = 'kifu-growth'

const readSearchMetadata = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'mode']
  return keys.reduce<Record<string, string>>((acc, key) => {
    const value = params.get(key)?.trim()
    if (value) {
      acc[key] = value
    }
    return acc
  }, {})
}

const resolveSourcePath = (sourcePath?: string): string | undefined => {
  if (sourcePath?.trim()) return sourcePath.trim()
  if (typeof window === 'undefined') return undefined
  return `${window.location.pathname}${window.location.search}`
}

const buildMetadata = (entryPoint: string, metadata?: Record<string, unknown>): Record<string, unknown> => {
  return {
    entry_point: entryPoint,
    ...readSearchMetadata(),
    ...(metadata || {}),
  }
}

export async function trackGrowthEvent(payload: GrowthEventPayload): Promise<void> {
  try {
    await api.post('/v1/growth/events', payload)
  } catch {
    // Growth telemetry should never block user-facing flows.
  }
}

export function trackGrowthVisitOnce(options: TrackVisitOptions): void {
  if (typeof window === 'undefined') return
  const sourcePath = resolveSourcePath(options.sourcePath) || '/'
  const storageKey = `${STORAGE_PREFIX}:visit:${sourcePath}`
  if (window.sessionStorage.getItem(storageKey)) {
    return
  }
  window.sessionStorage.setItem(storageKey, '1')
  void trackGrowthEvent({
    event_name: 'visit',
    source_path: sourcePath,
    referrer: document.referrer || undefined,
    metadata: buildMetadata(options.entryPoint, options.metadata),
    occurred_at: new Date().toISOString(),
  })
}

export async function trackGrowthGuestStart(options: TrackGuestStartOptions): Promise<void> {
  await trackGrowthEvent({
    guest_session_id: options.guestSessionId,
    event_name: 'guest_start',
    source_path: resolveSourcePath(options.sourcePath),
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    metadata: buildMetadata(options.entryPoint, options.metadata),
    occurred_at: new Date().toISOString(),
  })
}
