'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '../../../../src/lib/i18n'
import { useAlertStore } from '../../../../src/stores/alertStore'
import { AlertBriefings } from '../../../../src/components/alerts/AlertBriefings'
import { DecisionForm } from '../../../../src/components/alerts/DecisionForm'
import { AlertOutcomes } from '../../../../src/components/alerts/AlertOutcomes'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  briefed: 'bg-blue-500/20 text-blue-400',
  decided: 'bg-green-500/20 text-green-400',
  expired: 'bg-neutral-700/40 text-neutral-500',
}

export default function AlertDetailPage() {
  const { t } = useI18n()
  const params = useParams()
  const id = params.id as string
  const { alertDetail, isLoadingDetail, detailError, fetchAlertDetail, dismissAlert } = useAlertStore()

  useEffect(() => {
    if (id) fetchAlertDetail(id)
  }, [id, fetchAlertDetail])

  if (isLoadingDetail && !alertDetail) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-32 animate-pulse rounded-2xl bg-neutral-800/40" />
        <div className="h-48 animate-pulse rounded-2xl bg-neutral-800/40" />
        <div className="h-48 animate-pulse rounded-2xl bg-neutral-800/40" />
      </div>
    )
  }

  if (detailError) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
        {detailError}
      </div>
    )
  }

  if (!alertDetail) return null

  const { alert, briefings, decision, outcomes } = alertDetail

  const statusLabel: Record<string, string> = {
    pending: t.statusPending,
    briefed: t.statusBriefed,
    decided: t.statusDecided,
    expired: t.statusExpired,
  }

  const canDecide = alert.status === 'pending' || alert.status === 'briefed'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-6">
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
          <Link href="/alerts" className="hover:text-neutral-300 transition">
            {t.alertsTitle}
          </Link>
          <span>/</span>
          <span>{t.alertDetailTitle}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-neutral-100">{alert.symbol}</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[alert.status] || ''}`}
              >
                {statusLabel[alert.status] || alert.status}
              </span>
              {alert.severity === 'urgent' && (
                <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                  {t.severityUrgent}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-neutral-400">{alert.trigger_reason}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
              <span>Trigger: ${alert.trigger_price}</span>
              <span>{new Date(alert.created_at).toLocaleString()}</span>
            </div>
          </div>
          {canDecide && (
            <button
              type="button"
              onClick={() => dismissAlert(alert.id)}
              className="shrink-0 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition"
            >
              {t.dismissAlert}
            </button>
          )}
        </div>
      </header>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Briefings */}
        <AlertBriefings briefings={briefings || []} />

        {/* Decision */}
        {canDecide ? (
          <DecisionForm alertId={alert.id} />
        ) : (
          <DecisionForm alertId={alert.id} existingDecision={decision} />
        )}
      </div>

      {/* Outcomes */}
      <AlertOutcomes outcomes={outcomes || []} />
    </div>
  )
}
