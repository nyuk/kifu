'use client'

import { useState } from 'react'
import { useI18n } from '../../lib/i18n'
import type { AlertBriefing } from '../../types/alert'

type AlertBriefingsProps = {
  briefings: AlertBriefing[]
}

export function AlertBriefings({ briefings }: AlertBriefingsProps) {
  const { t } = useI18n()
  const [expandedId, setExpandedId] = useState<string | null>(
    briefings.length > 0 ? briefings[0].id : null
  )

  if (briefings.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.aiBriefings}</p>
        <p className="mt-3 text-sm text-neutral-500">{t.noBriefings}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.aiBriefings}</p>
      <div className="mt-4 space-y-3">
        {briefings.map((b) => {
          const isExpanded = expandedId === b.id
          return (
            <div
              key={b.id}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04]"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : b.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-neutral-200">{b.provider}</span>
                  <span className="text-xs text-neutral-500">{b.model}</span>
                </div>
                <div className="flex items-center gap-2">
                  {b.tokens_used != null && (
                    <span className="text-xs text-neutral-600">{b.tokens_used} tokens</span>
                  )}
                  <span className="text-neutral-500">{isExpanded ? '−' : '+'}</span>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-white/[0.08] px-4 pb-4 pt-3">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                    {b.response}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
