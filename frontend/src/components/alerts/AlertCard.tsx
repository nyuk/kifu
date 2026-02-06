'use client'

import Link from 'next/link'
import { useI18n } from '../../lib/i18n'
import type { Alert, AlertStatus, AlertSeverity } from '../../types/alert'

type AlertCardProps = {
  alert: Alert
}

const STATUS_STYLES: Record<AlertStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  briefed: 'bg-blue-500/20 text-blue-400',
  decided: 'bg-green-500/20 text-green-400',
  expired: 'bg-neutral-700/40 text-neutral-500',
}

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  normal: 'bg-neutral-800 text-neutral-400',
  urgent: 'bg-red-500/20 text-red-400',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function AlertCard({ alert }: AlertCardProps) {
  const { t } = useI18n()

  const statusLabel: Record<AlertStatus, string> = {
    pending: t.statusPending,
    briefed: t.statusBriefed,
    decided: t.statusDecided,
    expired: t.statusExpired,
  }

  return (
    <Link
      href={`/alerts/${alert.id}`}
      className="block rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5 transition hover:border-neutral-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-200">{alert.symbol}</span>
            <span className={`rounded px-2 py-0.5 text-xs ${SEVERITY_STYLES[alert.severity]}`}>
              {alert.severity === 'urgent' ? t.severityUrgent : t.severityNormal}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-neutral-400 line-clamp-2">{alert.trigger_reason}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
            <span>${alert.trigger_price}</span>
            <span>
              {timeAgo(alert.created_at)} {t.timeAgo}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[alert.status]}`}>
            {statusLabel[alert.status]}
          </span>
        </div>
      </div>
    </Link>
  )
}
