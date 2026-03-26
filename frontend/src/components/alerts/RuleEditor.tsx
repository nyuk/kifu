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
  guestMode?: boolean
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

export function RuleEditor({ open, rule, onClose, guestMode = false }: RuleEditorProps) {
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
  const presetLockedFields =
    ruleType === 'price_change'
      ? ['direction', 'threshold_type', 'reference']
      : ruleType === 'volatility_spike'
        ? ['timeframe']
        : []

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
    if (guestMode) {
      setError('게스트 모드에서는 알림 규칙을 저장할 수 없습니다. 웹 계정을 만들면 사용할 수 있습니다.')
      return
    }
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
                ? '프리셋 백테스트에서 가져온 기본값입니다. 신호가 오면 차트와 말풍선으로 바로 이어갈 수 있게, 이름·쿨다운·민감도만 먼저 조정하는 흐름을 권장합니다.'
                : '알림은 진입 결론보다 복기 후보를 놓치지 않기 위한 보조 도구입니다. 가격 변화나 변동성 조건을 정해두고, 신호가 오면 차트와 기록으로 이어가세요.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {guestMode && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              게스트 모드에서는 알림 규칙을 만들거나 수정할 수 없습니다. 설정은 읽기만 가능합니다.
            </div>
          )}

          {isPresetPrefill && (
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300/80">프리셋 요약</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
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
                <div>
                  <p className="text-xs text-neutral-500">백테스트 기준</p>
                  <p className="mt-1 text-sm font-medium text-neutral-100">BTCUSDT · 15m</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                카드의 수치는 BTCUSDT 15분봉 결과를 기준으로 합니다. 기본 흐름에서는 종목과 규칙 유형을 바꾸지 않고, 이름·쿨다운·민감도만 조정하는 편이 카드 결과와 가장 잘 맞습니다.
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
                disabled={guestMode}
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
                disabled={guestMode || isPresetPrefill}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="BTCUSDT"
              />
              {isPresetPrefill && (
                <p className="mt-1 text-[11px] text-neutral-500">Phase 1에서는 프리셋 종목을 그대로 사용합니다.</p>
              )}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-neutral-300">
              {t.ruleType}
              <select
                value={ruleType}
                onChange={(e) => handleRuleTypeChange(e.target.value as RuleType)}
                disabled={guestMode || isPresetPrefill}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {RULE_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {t[rt.labelKey]}
                  </option>
                ))}
              </select>
              {isPresetPrefill && (
                <p className="mt-1 text-[11px] text-neutral-500">프리셋 전략의 규칙 유형은 고정됩니다.</p>
              )}
            </label>
            <label className="text-sm text-neutral-300">
              {isPresetPrefill ? '중복 알림 간격 (분)' : t.ruleCooldown}
              <input
                type="number"
                value={cooldown}
                onChange={(e) => setCooldown(parseInt(e.target.value) || 60)}
                min={1}
                disabled={guestMode}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {isPresetPrefill ? '프리셋 조건' : '세부 조건'}
            </p>
            <div className={guestMode ? 'pointer-events-none opacity-70' : ''}>
              <RuleConfigForm
                ruleType={ruleType}
                config={config}
                onChange={setConfig}
                disabled={guestMode}
                lockedFields={isPresetPrefill ? presetLockedFields : []}
              />
            </div>
            {isPresetPrefill && (
              <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
                고정된 항목은 카드 결과와 같은 맥락을 유지하기 위한 값입니다. 지금 단계에서는 민감도만 미세 조정하는 흐름으로 사용하세요.
              </p>
            )}
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
              disabled={guestMode || submitting}
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
