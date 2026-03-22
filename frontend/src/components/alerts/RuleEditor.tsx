'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '../../lib/i18n'
import { useAlertStore } from '../../stores/alertStore'
import { RuleConfigForm } from './RuleConfigForm'
import type { AlertRule, RuleType, RuleConfig } from '../../types/alert'

type RuleEditorProps = {
  open: boolean
  rule?: AlertRule | null
  onClose: () => void
}

const RULE_TYPES: { value: RuleType; labelKey: 'ruleTypePrice' | 'ruleTypeMA' | 'ruleTypeLevel' | 'ruleTypeVolatility' }[] = [
  { value: 'price_change', labelKey: 'ruleTypePrice' },
  { value: 'ma_cross', labelKey: 'ruleTypeMA' },
  { value: 'price_level', labelKey: 'ruleTypeLevel' },
  { value: 'volatility_spike', labelKey: 'ruleTypeVolatility' },
]

const DEFAULT_CONFIGS: Record<RuleType, RuleConfig> = {
  price_change: { direction: 'both', threshold_type: 'percent', threshold_value: '5', reference: '24h' },
  ma_cross: { ma_period: 20, ma_timeframe: '1h', direction: 'below' },
  price_level: { price: '', direction: 'above' },
  volatility_spike: { timeframe: '1h', multiplier: '2.0' },
}

export function RuleEditor({ open, rule, onClose }: RuleEditorProps) {
  const { t } = useI18n()
  const { createRule, updateRule } = useAlertStore()

  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [ruleType, setRuleType] = useState<RuleType>('price_change')
  const [config, setConfig] = useState<RuleConfig>(DEFAULT_CONFIGS.price_change)
  const [cooldown, setCooldown] = useState(60)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isEdit = !!rule?.id
  const isPresetPrefill = !!rule && !rule.id

  const currentRuleTypeLabel =
    RULE_TYPES.find((item) => item.value === ruleType)?.labelKey
      ? t[RULE_TYPES.find((item) => item.value === ruleType)!.labelKey]
      : t.ruleTypePrice

  useEffect(() => {
    if (!open) return
    if (rule) {
      setName(rule.name)
      setSymbol(rule.symbol)
      setRuleType(rule.rule_type)
      setConfig(rule.config)
      setCooldown(rule.cooldown_minutes)
    } else {
      setName('')
      setSymbol('BTCUSDT')
      setRuleType('price_change')
      setConfig(DEFAULT_CONFIGS.price_change)
      setCooldown(60)
    }
    setError('')
  }, [open, rule])

  const handleRuleTypeChange = (newType: RuleType) => {
    setRuleType(newType)
    setConfig(DEFAULT_CONFIGS[newType])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !symbol.trim()) {
      setError('전략 이름과 종목을 입력해 주세요.')
      return
    }

    setSubmitting(true)
    setError('')

    let result
    if (isEdit) {
      result = await updateRule(rule.id, { name, symbol, rule_type: ruleType, config, cooldown_minutes: cooldown })
    } else {
      result = await createRule({ name, symbol, rule_type: ruleType, config, cooldown_minutes: cooldown })
    }

    setSubmitting(false)
    if (result) {
      onClose()
    } else {
      setError(isEdit ? '규칙 수정에 실패했습니다' : '규칙 생성에 실패했습니다')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-neutral-950 text-neutral-100 shadow-xl">
        <div className="border-b border-white/[0.08] px-6 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            {isPresetPrefill ? '프리셋 알림' : '알림 규칙'}
          </p>
          <h3 className="mt-2 text-xl font-semibold">
            {isEdit ? t.editRule : isPresetPrefill ? '이 전략으로 알림 받기' : t.createRule}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            {isEdit
              ? '알림 규칙을 수정하고 저장하면 다음 트리거부터 새 조건이 적용됩니다.'
              : isPresetPrefill
                ? '프리셋에서 가져온 기본값입니다. 종목과 쿨다운만 확인한 뒤 바로 저장해도 됩니다.'
                : '가격 변화, 이동평균, 가격 수준, 변동성 급등 중 원하는 조건으로 알림을 만들 수 있습니다.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {isPresetPrefill && (
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300/80">프리셋 요약</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-neutral-500">전략 이름</p>
                  <p className="mt-1 text-sm font-medium text-neutral-100">{name || '프리셋 전략'}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">규칙 유형</p>
                  <p className="mt-1 text-sm font-medium text-neutral-100">{currentRuleTypeLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">기본 종목</p>
                  <p className="mt-1 text-sm font-medium text-neutral-100">{symbol || 'BTCUSDT'}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                저장 후에도 규칙 목록에서 이름, 종목, 쿨다운, 세부 조건을 다시 수정할 수 있습니다.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-neutral-300">
              {isPresetPrefill ? '전략 이름' : t.ruleName}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
                placeholder={isPresetPrefill ? '예: 급락 반등 감시' : '예: BTC 5% 하락 알림'}
              />
            </label>
            <label className="text-sm text-neutral-300">
              {isPresetPrefill ? '알림 받을 종목' : t.ruleSymbol}
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
                placeholder="BTCUSDT"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-neutral-300">
              {t.ruleType}
              <select
                value={ruleType}
                onChange={(e) => handleRuleTypeChange(e.target.value as RuleType)}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
              >
                {RULE_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {t[rt.labelKey]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-neutral-300">
              {isPresetPrefill ? '중복 알림 간격 (분)' : t.ruleCooldown}
              <input
                type="number"
                value={cooldown}
                onChange={(e) => setCooldown(parseInt(e.target.value) || 60)}
                min={1}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {isPresetPrefill ? '프리셋 조건' : '세부 조건'}
            </p>
            <RuleConfigForm ruleType={ruleType} config={config} onChange={setConfig} />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t.saving : isEdit ? '규칙 저장' : isPresetPrefill ? '알림 만들기' : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
