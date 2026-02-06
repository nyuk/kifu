'use client'

import { useI18n } from '../../lib/i18n'
import { useAlertStore } from '../../stores/alertStore'
import type { AlertRule, RuleType } from '../../types/alert'

type RuleListProps = {
  rules: AlertRule[]
  onEdit: (rule: AlertRule) => void
}

const RULE_TYPE_LABELS: Record<RuleType, 'ruleTypePrice' | 'ruleTypeMA' | 'ruleTypeLevel' | 'ruleTypeVolatility'> = {
  price_change: 'ruleTypePrice',
  ma_cross: 'ruleTypeMA',
  price_level: 'ruleTypeLevel',
  volatility_spike: 'ruleTypeVolatility',
}

function formatRuleConfig(rule: AlertRule): string {
  const c = rule.config
  switch (rule.rule_type) {
    case 'price_change': {
      const pc = c as { direction?: string; threshold_value?: string; threshold_type?: string; reference?: string }
      return `${pc.direction} ${pc.threshold_value}${pc.threshold_type === 'percent' ? '%' : '$'} / ${pc.reference}`
    }
    case 'ma_cross': {
      const mc = c as { ma_period?: number; ma_timeframe?: string; direction?: string }
      return `MA${mc.ma_period} ${mc.ma_timeframe} ${mc.direction}`
    }
    case 'price_level': {
      const pl = c as { price?: string; direction?: string }
      return `${pl.direction} ${pl.price}`
    }
    case 'volatility_spike': {
      const vs = c as { timeframe?: string; multiplier?: string }
      return `${vs.timeframe} x${vs.multiplier}`
    }
    default:
      return ''
  }
}

export function RuleList({ rules, onEdit }: RuleListProps) {
  const { t } = useI18n()
  const { toggleRule, deleteRule, isLoadingRules } = useAlertStore()

  const handleDelete = async (id: string) => {
    if (!confirm('이 규칙을 삭제하시겠습니까?')) return
    await deleteRule(id)
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-200 truncate">{rule.name}</h3>
                <span className="shrink-0 rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                  {rule.symbol}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span className="rounded bg-neutral-800/60 px-2 py-0.5">
                  {t[RULE_TYPE_LABELS[rule.rule_type]]}
                </span>
                <span>{formatRuleConfig(rule)}</span>
                <span>· {rule.cooldown_minutes}m cooldown</span>
              </div>
              {rule.last_triggered_at && (
                <p className="mt-1 text-xs text-neutral-600">
                  Last triggered: {new Date(rule.last_triggered_at).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => toggleRule(rule.id)}
                disabled={isLoadingRules}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  rule.enabled ? 'bg-green-500' : 'bg-neutral-700'
                }`}
                aria-label={t.ruleEnabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rule.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => onEdit(rule)}
                className="rounded-lg px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition"
              >
                {t.editRule}
              </button>

              <button
                type="button"
                onClick={() => handleDelete(rule.id)}
                className="rounded-lg px-2 py-1 text-xs text-red-400 hover:text-red-300 transition"
              >
                {t.deleteRule}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
