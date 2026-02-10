'use client'

import { useI18n } from '../../lib/i18n'
import type { RuleType, RuleConfig } from '../../types/alert'

type RuleConfigFormProps = {
  ruleType: RuleType
  config: RuleConfig
  onChange: (config: RuleConfig) => void
}

export function RuleConfigForm({ ruleType, config, onChange }: RuleConfigFormProps) {
  const { t } = useI18n()

  const inputClass =
    'w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-500'
  const selectClass = inputClass
  const labelClass = 'block text-xs text-neutral-400 mb-1'
  const hintClass = 'mt-1 text-[11px] text-neutral-500'
  const descClass = 'mb-4 rounded-lg bg-neutral-800/40 px-3 py-2.5 text-xs text-neutral-400 leading-relaxed'

  if (ruleType === 'price_change') {
    const c = config as { direction?: string; threshold_type?: string; threshold_value?: string; reference?: string }
    return (
      <div className="space-y-3">
        <div className={descClass}>
          {t.ruleDescPriceChange}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t.direction}</label>
            <select
              value={c.direction || 'both'}
              onChange={(e) => onChange({ ...c, direction: e.target.value } as RuleConfig)}
              className={selectClass}
            >
              <option value="drop">{t.dirDrop}</option>
              <option value="rise">{t.dirRise}</option>
              <option value="both">{t.dirBoth}</option>
            </select>
            <p className={hintClass}>{t.hintPriceChangeDir}</p>
          </div>
          <div>
            <label className={labelClass}>{t.threshold}</label>
            <div className="flex gap-2">
              <select
                value={c.threshold_type || 'percent'}
                onChange={(e) => onChange({ ...c, threshold_type: e.target.value } as RuleConfig)}
                className={selectClass + ' w-28'}
              >
                <option value="percent">%</option>
                <option value="absolute">$</option>
              </select>
              <input
                type="text"
                value={c.threshold_value || ''}
                onChange={(e) => onChange({ ...c, threshold_value: e.target.value } as RuleConfig)}
                placeholder="5"
                className={inputClass}
              />
            </div>
            <p className={hintClass}>{t.hintThreshold}</p>
          </div>
          <div>
            <label className={labelClass}>{t.reference}</label>
            <select
              value={c.reference || '24h'}
              onChange={(e) => onChange({ ...c, reference: e.target.value } as RuleConfig)}
              className={selectClass}
            >
              <option value="1h">{t.ref1h}</option>
              <option value="4h">{t.ref4h}</option>
              <option value="24h">{t.ref24h}</option>
            </select>
            <p className={hintClass}>{t.hintReference}</p>
          </div>
        </div>
      </div>
    )
  }

  if (ruleType === 'ma_cross') {
    const c = config as { ma_period?: number; ma_timeframe?: string; direction?: string }
    return (
      <div className="space-y-3">
        <div className={descClass}>
          {t.ruleDescMACross}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t.maPeriod}</label>
            <input
              type="number"
              value={c.ma_period || 20}
              onChange={(e) => onChange({ ...c, ma_period: parseInt(e.target.value) || 20 } as RuleConfig)}
              className={inputClass}
            />
            <p className={hintClass}>{t.hintMAPeriod}</p>
          </div>
          <div>
            <label className={labelClass}>{t.maTimeframe}</label>
            <select
              value={c.ma_timeframe || '1h'}
              onChange={(e) => onChange({ ...c, ma_timeframe: e.target.value } as RuleConfig)}
              className={selectClass}
            >
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>{t.direction}</label>
            <select
              value={c.direction || 'below'}
              onChange={(e) => onChange({ ...c, direction: e.target.value } as RuleConfig)}
              className={selectClass}
            >
              <option value="above">{t.dirMACrossAbove}</option>
              <option value="below">{t.dirMACrossBelow}</option>
            </select>
            <p className={hintClass}>{t.hintMACrossDir}</p>
          </div>
        </div>
      </div>
    )
  }

  if (ruleType === 'price_level') {
    const c = config as { price?: string; direction?: string }
    return (
      <div className="space-y-3">
        <div className={descClass}>
          {t.ruleDescPriceLevel}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t.targetPrice}</label>
            <input
              type="text"
              value={c.price || ''}
              onChange={(e) => onChange({ ...c, price: e.target.value } as RuleConfig)}
              placeholder="100000"
              className={inputClass}
            />
            <p className={hintClass}>{t.hintTargetPrice}</p>
          </div>
          <div>
            <label className={labelClass}>{t.direction}</label>
            <select
              value={c.direction || 'above'}
              onChange={(e) => onChange({ ...c, direction: e.target.value } as RuleConfig)}
              className={selectClass}
            >
              <option value="above">{t.dirLevelAbove}</option>
              <option value="below">{t.dirLevelBelow}</option>
              <option value="gte">{t.dirLevelGte}</option>
              <option value="lte">{t.dirLevelLte}</option>
            </select>
            <p className={hintClass}>{t.hintLevelDir}</p>
          </div>
        </div>
      </div>
    )
  }

  if (ruleType === 'volatility_spike') {
    const c = config as { timeframe?: string; multiplier?: string }
    return (
      <div className="space-y-3">
        <div className={descClass}>
          {t.ruleDescVolatility}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t.maTimeframe}</label>
            <select
              value={c.timeframe || '1h'}
              onChange={(e) => onChange({ ...c, timeframe: e.target.value } as RuleConfig)}
              className={selectClass}
            >
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t.multiplier}</label>
            <input
              type="text"
              value={c.multiplier || ''}
              onChange={(e) => onChange({ ...c, multiplier: e.target.value } as RuleConfig)}
              placeholder="2.0"
              className={inputClass}
            />
            <p className={hintClass}>{t.hintMultiplier}</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
