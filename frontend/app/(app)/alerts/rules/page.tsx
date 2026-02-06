'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '../../../../src/lib/i18n'
import { useAlertStore } from '../../../../src/stores/alertStore'
import { RuleList } from '../../../../src/components/alerts/RuleList'
import { RuleEditor } from '../../../../src/components/alerts/RuleEditor'
import type { AlertRule } from '../../../../src/types/alert'
import Link from 'next/link'

export default function AlertRulesPage() {
  const { t } = useI18n()
  const { rules, isLoadingRules, rulesError, fetchRules } = useAlertStore()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleCreate = () => {
    setEditingRule(null)
    setEditorOpen(true)
  }

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule)
    setEditorOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-6">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/alerts" className="hover:text-neutral-300 transition">
            {t.alertsTitle}
          </Link>
          <span>/</span>
          <span>{t.alertRulesTitle}</span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-neutral-100">{t.alertRulesTitle}</h2>
        <p className="mt-2 text-sm text-neutral-400">{t.alertRulesSubtitle}</p>
      </header>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white"
        >
          + {t.createRule}
        </button>
      </div>

      {rulesError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {rulesError}
        </div>
      )}

      {isLoadingRules && rules.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-800/40" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-10 text-center">
          <p className="text-sm text-neutral-500">{t.noRules}</p>
          <button
            type="button"
            onClick={handleCreate}
            className="mt-4 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500 transition"
          >
            + {t.createRule}
          </button>
        </div>
      ) : (
        <RuleList rules={rules} onEdit={handleEdit} />
      )}

      <RuleEditor
        open={editorOpen}
        rule={editingRule}
        onClose={() => setEditorOpen(false)}
      />
    </div>
  )
}
