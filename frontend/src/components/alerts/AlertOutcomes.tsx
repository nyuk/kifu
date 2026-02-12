'use client'

import { useI18n } from '../../lib/i18n'
import type { AlertOutcome } from '../../types/alert'

type AlertOutcomesProps = {
  outcomes: AlertOutcome[]
}

export function AlertOutcomes({ outcomes }: AlertOutcomesProps) {
  const { t } = useI18n()

  if (outcomes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.outcomeTitle}</p>
        <p className="mt-3 text-sm text-neutral-500">{t.noOutcomes}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.outcomeTitle}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="pb-2 text-left text-xs font-medium text-neutral-500">Period</th>
              <th className="pb-2 text-right text-xs font-medium text-neutral-500">Reference</th>
              <th className="pb-2 text-right text-xs font-medium text-neutral-500">Outcome</th>
              <th className="pb-2 text-right text-xs font-medium text-neutral-500">PnL %</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((o) => {
              const pnl = parseFloat(o.pnl_percent)
              const pnlColor = pnl > 0 ? 'text-green-400' : pnl < 0 ? 'text-red-400' : 'text-neutral-400'
              const periodLabel = o.period === '1h' ? '1H' : o.period === '4h' ? '4H' : o.period === '1d' ? '1D' : o.period

              return (
                <tr key={o.id} className="border-b border-white/[0.08]/40">
                  <td className="py-2.5 text-neutral-300 font-medium">{periodLabel}</td>
                  <td className="py-2.5 text-right text-neutral-400">${o.reference_price}</td>
                  <td className="py-2.5 text-right text-neutral-400">${o.outcome_price}</td>
                  <td className={`py-2.5 text-right font-semibold ${pnlColor}`}>
                    {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
