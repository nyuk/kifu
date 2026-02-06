'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '../../../src/lib/i18n'
import { useAlertStore } from '../../../src/stores/alertStore'
import { AlertCard } from '../../../src/components/alerts/AlertCard'
import type { AlertStatus } from '../../../src/types/alert'

const STATUS_TABS: { value: AlertStatus | 'all'; labelKey: 'statusAll' | 'statusPending' | 'statusBriefed' | 'statusDecided' | 'statusExpired' }[] = [
  { value: 'all', labelKey: 'statusAll' },
  { value: 'pending', labelKey: 'statusPending' },
  { value: 'briefed', labelKey: 'statusBriefed' },
  { value: 'decided', labelKey: 'statusDecided' },
  { value: 'expired', labelKey: 'statusExpired' },
]

export default function AlertsPage() {
  const { t } = useI18n()
  const { alerts, alertsTotal, isLoadingAlerts, alertsError, fetchAlerts } = useAlertStore()
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all')
  const [page, setPage] = useState(0)
  const limit = 20

  useEffect(() => {
    const status = statusFilter === 'all' ? undefined : statusFilter
    fetchAlerts(status, limit, page * limit)
  }, [fetchAlerts, statusFilter, page])

  const totalPages = Math.ceil(alertsTotal / limit)

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Monitoring</p>
            <h2 className="mt-3 text-2xl font-semibold text-neutral-100">{t.alertsTitle}</h2>
            <p className="mt-2 text-sm text-neutral-400">{t.alertsSubtitle}</p>
          </div>
          <Link
            href="/alerts/rules"
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500"
          >
            {t.manageRules}
          </Link>
        </div>
      </header>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value)
                setPage(0)
              }}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-neutral-200 text-neutral-950'
                  : 'bg-neutral-900/40 text-neutral-400 hover:bg-neutral-800/60'
              }`}
            >
              {t[tab.labelKey]}
            </button>
          )
        })}
      </div>

      {alertsError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {alertsError}
        </div>
      )}

      {isLoadingAlerts && alerts.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-800/40" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-10 text-center">
          <p className="text-sm text-neutral-500">{t.noAlerts}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-neutral-500">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
