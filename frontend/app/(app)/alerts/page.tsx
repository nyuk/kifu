'use client'

import { type KeyboardEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '../../../src/lib/i18n'
import { useAlertStore } from '../../../src/stores/alertStore'
import { AlertCard } from '../../../src/components/alerts/AlertCard'
import { PageJumpPager } from '../../../src/components/ui/PageJumpPager'
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
  const [pageInput, setPageInput] = useState('1')
  const limit = 20

  useEffect(() => {
    const status = statusFilter === 'all' ? undefined : statusFilter
    fetchAlerts(status, limit, page * limit)
  }, [fetchAlerts, statusFilter, page])

  useEffect(() => {
    setPageInput(String(page + 1))
  }, [page])

  const totalPages = Math.ceil(alertsTotal / limit)

  const jumpToAlertPage = () => {
    const parsedPage = Number.parseInt(pageInput, 10)
    if (Number.isNaN(parsedPage) || parsedPage < 1) {
      setPageInput(String(page + 1))
      return
    }
    setPage(Math.min(totalPages, Math.max(1, parsedPage)) - 1)
  }

  const handleAlertPageInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpToAlertPage()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Monitoring</p>
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
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${isActive
                  ? 'bg-neutral-200 text-neutral-950'
                  : 'bg-white/[0.04] text-neutral-400 hover:bg-white/[0.06]'
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
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-10 text-center">
          <p className="text-sm text-zinc-400">{t.noAlerts}</p>
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
        <PageJumpPager
          totalItems={alertsTotal}
          totalPages={totalPages}
          currentPage={page + 1}
          pageInput={pageInput}
          onPageInputChange={setPageInput}
          onPageInputKeyDown={handleAlertPageInputKeyDown}
          onFirst={() => setPage(0)}
          onPrevious={() => setPage((prev) => Math.max(0, prev - 1))}
          onNext={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
          onLast={() => setPage(totalPages - 1)}
          onJump={jumpToAlertPage}
          disabled={isLoadingAlerts}
          itemLabel="건"
        />
      )}
    </div>
  )
}
