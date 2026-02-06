'use client'

import { useState } from 'react'
import { useI18n } from '../../lib/i18n'
import { useAlertStore } from '../../stores/alertStore'
import type { DecisionAction, Confidence, AlertDecision } from '../../types/alert'

type DecisionFormProps = {
  alertId: string
  existingDecision?: AlertDecision | null
}

const ACTIONS: { value: DecisionAction; labelKey: 'actionBuy' | 'actionSell' | 'actionHold' | 'actionClose' | 'actionReduce' | 'actionAdd' | 'actionIgnore' }[] = [
  { value: 'buy', labelKey: 'actionBuy' },
  { value: 'sell', labelKey: 'actionSell' },
  { value: 'hold', labelKey: 'actionHold' },
  { value: 'close', labelKey: 'actionClose' },
  { value: 'reduce', labelKey: 'actionReduce' },
  { value: 'add', labelKey: 'actionAdd' },
  { value: 'ignore', labelKey: 'actionIgnore' },
]

const CONFIDENCES: { value: Confidence; labelKey: 'confidenceHigh' | 'confidenceMedium' | 'confidenceLow' }[] = [
  { value: 'high', labelKey: 'confidenceHigh' },
  { value: 'medium', labelKey: 'confidenceMedium' },
  { value: 'low', labelKey: 'confidenceLow' },
]

export function DecisionForm({ alertId, existingDecision }: DecisionFormProps) {
  const { t } = useI18n()
  const { submitDecision, isLoadingDetail } = useAlertStore()

  const [action, setAction] = useState<DecisionAction>('hold')
  const [memo, setMemo] = useState('')
  const [confidence, setConfidence] = useState<Confidence>('medium')

  if (existingDecision) {
    const actionLabel = ACTIONS.find((a) => a.value === existingDecision.action)
    return (
      <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.decisionTitle}</p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3">
            <span className="rounded bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
              {actionLabel ? t[actionLabel.labelKey] : existingDecision.action}
            </span>
            {existingDecision.confidence && (
              <span className="text-xs text-neutral-500">
                {t.decisionConfidence}: {existingDecision.confidence}
              </span>
            )}
          </div>
          {existingDecision.memo && (
            <p className="text-sm text-neutral-400">{existingDecision.memo}</p>
          )}
          <p className="text-xs text-neutral-600">
            {new Date(existingDecision.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitDecision(alertId, {
      action,
      memo: memo.trim() || undefined,
      confidence,
    })
  }

  return (
    <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.decisionTitle}</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs text-neutral-400 mb-2">{t.decisionAction}</label>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAction(a.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  action === a.value
                    ? 'bg-neutral-200 text-neutral-950'
                    : 'bg-neutral-800/60 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                {t[a.labelKey]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-2">{t.decisionConfidence}</label>
          <div className="flex gap-2">
            {CONFIDENCES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setConfidence(c.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  confidence === c.value
                    ? 'bg-neutral-200 text-neutral-950'
                    : 'bg-neutral-800/60 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                {t[c.labelKey]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-2">{t.decisionMemo}</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-500"
            placeholder="판단 근거를 기록하세요..."
          />
        </div>

        <button
          type="submit"
          disabled={isLoadingDetail}
          className="w-full rounded-lg bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingDetail ? t.saving : t.submitDecision}
        </button>
      </form>
    </div>
  )
}
