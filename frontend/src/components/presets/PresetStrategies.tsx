'use client'

import { useState } from 'react'
import { PresetCard } from './PresetCard'
import { RuleEditor } from '../alerts/RuleEditor'
import type { PresetStrategy, PresetBacktestData, PresetSummaryWindow } from '../../types/preset'
import type { AlertRule, CreateAlertRuleRequest } from '../../types/alert'
import { isGuestSession } from '../../lib/guestSession'
import backtestData from '../../data/presetBacktestResults.json'

const data = backtestData as PresetBacktestData

const PRESET_COPY: Record<
  string,
  Pick<PresetStrategy, 'label' | 'short_description' | 'educational_note' | 'risk_notice'> & {
    params: Record<string, string>
  }
> = {
  'extreme-dip-v1': {
    label: '급락 반등 감시',
    short_description: '24시간 안에 크게 빠진 뒤 기술적 반등 가능성이 열리는 구간을 감시합니다.',
    educational_note:
      '급락 반등은 짧게 강한 회복이 나올 수 있지만, 추가 하락이 이어질 위험도 큽니다. 반등 자체보다 어디서 무효가 되는지 먼저 확인해야 합니다.',
    risk_notice: '과거 성과는 미래 결과를 보장하지 않습니다.',
    params: {
      트리거: '24시간 고점 대비 -15%',
      익절: '+5%',
      손절: '-7%',
      제한시간: '24시간',
    },
  },
  'vol-spike-v1': {
    label: '변동성 급증 감시',
    short_description: '최근보다 훨씬 큰 움직임이 시작될 때만 포착하도록 설계된 감시 전략입니다.',
    educational_note:
      '변동성 급증은 방향 자체를 보장하지 않습니다. 큰 움직임이 시작되는 순간을 잡아두고, 방향 판단은 별도로 확인해야 합니다.',
    risk_notice: '과거 성과는 미래 결과를 보장하지 않습니다.',
    params: {
      트리거: '12시간 변동성 > 평균의 1.8배',
      익절: '+5%',
      손절: '-7%',
      제한시간: '48시간',
    },
  },
  'cycle-accum-v1': {
    label: '사이클 저점 매수',
    short_description: '90일 고점 대비 크게 하락한 구간에서 중장기 분할 매수 후보를 감시합니다.',
    educational_note:
      '사이클 저점 매수는 보유 기간이 길고, 추가 하락을 견디는 자금 관리가 중요합니다. 초반에는 자동 생성보다 관찰용 프리셋으로 보는 편이 안전합니다.',
    risk_notice: '과거 성과는 미래 결과를 보장하지 않습니다.',
    params: {
      트리거: '90일 고점 대비 -20%',
      익절: '+30%',
      손절: '-20%',
      제한시간: '90일',
    },
  },
}

const PRESET_DETAIL_GUIDE: Record<
  string,
  {
    fitFor: string[]
    adjustables: string[]
    nextSteps: string[]
    phaseNote?: string
  }
> = {
  'extreme-dip-v1': {
    fitFor: [
      '급락 뒤 짧은 반등 구간을 놓치지 않고 먼저 감시하고 싶을 때',
      '강한 변동 구간에서 진입 후보를 빠르게 체크하고 싶을 때',
      '짧은 보유와 명확한 무효 기준을 선호할 때',
    ],
    adjustables: [
      '알림 이름을 내 표현에 맞게 바꾸기',
      '중복 알림 간격을 상황에 맞게 줄이거나 늘리기',
      '민감도(threshold value)를 조금 더 보수적이거나 공격적으로 조정하기',
    ],
    nextSteps: [
      '상세 결과에서 최근 예시와 손익 분포를 먼저 확인합니다.',
      '기본값으로 알림을 만든 뒤 실제 알림이 너무 잦은지 확인합니다.',
      '알림이 울리면 버블과 복기로 이어서 내 판단 패턴과 비교합니다.',
    ],
  },
  'vol-spike-v1': {
    fitFor: [
      '방향보다 먼저 큰 움직임 시작 자체를 잡아두고 싶을 때',
      '차트만 보다 변동성 확장을 놓치는 경우가 많을 때',
      '직접 진입보다 관찰 트리거로 먼저 쓰고 싶을 때',
    ],
    adjustables: [
      '알림 이름과 쿨다운을 내 루틴에 맞게 정리하기',
      'multiplier를 높여 더 드문 신호만 받거나 낮춰 더 민감하게 받기',
      '같은 BTC 맥락에서 실제 신호 밀도를 보고 조정하기',
    ],
    nextSteps: [
      '카드의 최근 90일/180일 결과를 먼저 비교합니다.',
      '알림을 만든 뒤 신호가 왔을 때 방향 판단은 별도로 합니다.',
      '복기에서 변동성 확대 구간의 실제 대응을 기록합니다.',
    ],
  },
  'cycle-accum-v1': {
    fitFor: [
      '단기 대응보다 중장기 관찰 후보를 정리하고 싶을 때',
      '사이클 저점 구간을 단기 알림보다 관찰 카드로 먼저 보고 싶을 때',
      '분할 매수 관점의 리서치 메모를 쌓고 싶을 때',
    ],
    adjustables: [
      'Phase 1에서는 카드와 상세 결과만 먼저 확인합니다.',
      '90일 기준 알림 연결은 다음 단계에서 지원 예정입니다.',
      '지금은 실제 자동 연결보다 관찰 후보 정리에 집중하는 편이 맞습니다.',
    ],
    nextSteps: [
      '상세 결과로 과거 저점 구간의 손익과 보유 기간을 먼저 확인합니다.',
      '현재는 카드 결과를 참고해 별도 메모/버블로 관찰 포인트를 적어둡니다.',
      '90일 기준 알림이 지원되면 그때 CTA를 열어 같은 전략으로 연결합니다.',
    ],
    phaseNote: '90일 기준 reference는 아직 alert runtime이 지원하지 않아, Phase 1에서는 카드와 상세 결과만 제공합니다.',
  },
}

// Preset 3 (cycle-accum-v1) uses reference:"90d" which is not supported yet
const DISABLED_PRESET_IDS = new Set(['cycle-accum-v1'])

function isStale(generatedAt: string): boolean {
  const generated = new Date(generatedAt)
  const now = new Date()
  const diffMs = now.getTime() - generated.getTime()
  return diffMs > 7 * 24 * 60 * 60 * 1000
}

function formatDate(iso: string): string {
  return iso.slice(0, 10)
}

export function PresetStrategies() {
  const guestMode = isGuestSession()
  const [editorOpen, setEditorOpen] = useState(false)
  const [prefillRule, setPrefillRule] = useState<AlertRule | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<PresetStrategy | null>(null)
  const [summaryWindow, setSummaryWindow] = useState<PresetSummaryWindow>('all')

  const presets = data.presets.map((preset) => {
    const copy = PRESET_COPY[preset.id]
    if (!copy) return preset as PresetStrategy

    return {
      ...preset,
      ...copy,
      alert_rule_template: {
        ...preset.alert_rule_template,
        name: copy.label,
      },
    } as PresetStrategy
  })

  const handleCreateAlert = (preset: PresetStrategy) => {
    if (guestMode) return
    const template = preset.alert_rule_template as CreateAlertRuleRequest
    // Create a fake AlertRule to prefill the editor
    const fakeRule: AlertRule = {
      id: '',
      user_id: '',
      name: preset.label,
      symbol: template.symbol,
      rule_type: template.rule_type,
      config: template.config,
      cooldown_minutes: template.cooldown_minutes ?? 60,
      enabled: true,
      created_at: '',
      updated_at: '',
    }
    setPrefillRule(fakeRule)
    setEditorOpen(true)
    setSelectedPreset(null)
  }

  const stale = isStale(data.generated_at)
  const selectedGuide = selectedPreset ? PRESET_DETAIL_GUIDE[selectedPreset.id] : null

  return (
    <div className="flex flex-col gap-5">
      {/* Risk notice */}
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
        <p className="text-xs leading-relaxed text-yellow-200/80">
          과거 성과는 미래 결과를 보장하지 않습니다. BTC 15분봉 데이터 기준(2020~2026), 왕복 수수료 0.08%를 반영했습니다.
        </p>
      </div>

      {/* Data date */}
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span>생성 기준: {formatDate(data.generated_at)}</span>
        {stale && (
          <span className="rounded-md bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-medium text-orange-300">
            오래됨
          </span>
        )}
        <span className="text-neutral-600">|</span>
        <span>데이터 범위: {data.data_range.from.slice(0, 10)} ~ {data.data_range.to.slice(0, 10)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-[0.24em] text-neutral-500">비교 구간</span>
        {[
          { value: 'all' as const, label: '전체' },
          { value: '180d' as const, label: '180일' },
          { value: '90d' as const, label: '90일' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSummaryWindow(option.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              summaryWindow === option.value
                ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.14] hover:bg-white/[0.04]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onCreateAlert={handleCreateAlert}
            onViewDetail={setSelectedPreset}
            summaryWindow={summaryWindow}
            disabled={guestMode || DISABLED_PRESET_IDS.has(preset.id)}
            disabledLabel={guestMode ? '게스트 모드에서는 알림 생성 불가' : '준비 중'}
          />
        ))}
      </div>

      {guestMode && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          게스트 모드에서는 프리셋 전략을 읽기 전용으로만 볼 수 있습니다. 알림 생성은 웹 계정에서 사용할 수 있습니다.
        </div>
      )}

      {selectedPreset && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-4xl rounded-3xl border border-white/[0.08] bg-neutral-950 text-neutral-100 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">전략 상세</p>
                <h3 className="mt-2 text-2xl font-semibold text-neutral-100">{selectedPreset.label}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">
                  {selectedPreset.short_description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {[
                    { value: 'all' as const, label: '전체' },
                    { value: '180d' as const, label: '180일' },
                    { value: '90d' as const, label: '90일' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSummaryWindow(option.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        summaryWindow === option.value
                          ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                          : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.14] hover:bg-white/[0.04]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreset(null)}
                className="rounded-lg border border-white/[0.08] px-3 py-2 text-sm text-neutral-300 transition hover:border-white/[0.14] hover:bg-white/[0.04]"
              >
                닫기
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-4">
                  <DetailMetric label="승률" value={`${getSummaryByWindow(selectedPreset, summaryWindow).win_rate}%`} />
                  <DetailMetric
                    label="평균 손익"
                    value={`${getSummaryByWindow(selectedPreset, summaryWindow).avg_return_pct > 0 ? '+' : ''}${getSummaryByWindow(selectedPreset, summaryWindow).avg_return_pct}%`}
                  />
                  <DetailMetric label="신호 수" value={`${getSummaryByWindow(selectedPreset, summaryWindow).signal_count}회`} />
                  <DetailMetric label="평균 보유" value={formatDetailHoldTime(getSummaryByWindow(selectedPreset, summaryWindow).avg_hold_hours)} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                    <p className="text-xs text-neutral-500">현재 비교 구간</p>
                    <p className="mt-2 text-sm font-medium text-neutral-100">
                      {formatWindowLabel(summaryWindow, getSummaryByWindow(selectedPreset, summaryWindow).window)}
                    </p>
                    <p className="mt-2 text-[11px] text-neutral-500">
                      최대 낙폭 {getSummaryByWindow(selectedPreset, summaryWindow).max_drawdown_pct}% · TP {getSummaryByWindow(selectedPreset, summaryWindow).tp_count} · SL {getSummaryByWindow(selectedPreset, summaryWindow).sl_count} · TO {getSummaryByWindow(selectedPreset, summaryWindow).timeout_count}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                    <p className="text-xs text-neutral-500">데이터 기준</p>
                    <p className="mt-2 text-sm font-medium text-neutral-100">BTCUSDT · 15m</p>
                    <p className="mt-2 text-[11px] text-neutral-500">
                      생성 기준 {formatDate(data.generated_at)} {stale ? '· 갱신 확인 필요' : ''}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-600">
                      {data.data_range.from.slice(0, 10)} ~ {data.data_range.to.slice(0, 10)}
                    </p>
                  </div>
                </div>

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">어떤 전략인가요</p>
                  <p className="mt-3 text-sm leading-7 text-neutral-300">{selectedPreset.educational_note}</p>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">기본 조건</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(selectedPreset.params).map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-xs text-neutral-300"
                      >
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">최근 예시</p>
                  <div className="mt-4 space-y-2">
                    {selectedPreset.recent_examples.slice(-5).reverse().map((example, index) => (
                      <div
                        key={`${example.date}-${example.entry_price}-${index}`}
                        className="grid grid-cols-[88px_1fr_88px_48px] items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-sm"
                      >
                        <span className="text-neutral-400">{example.date}</span>
                        <span className="text-neutral-300">${Number(example.entry_price).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                        <span className={example.result_pct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                          {example.result_pct >= 0 ? '+' : ''}
                          {example.result_pct.toFixed(1)}%
                        </span>
                        <span className="text-right text-neutral-500">{formatExitType(example.exit_type)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <section className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-yellow-200/80">리스크 안내</p>
                  <p className="mt-3 text-sm leading-7 text-yellow-100/90">{selectedPreset.risk_notice}</p>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">이 전략이 맞는 경우</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-neutral-300">
                    {selectedGuide?.fitFor.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">지금 조정하면 좋은 것</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-neutral-300">
                    {selectedGuide?.adjustables.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">다음 단계</p>
                  <ol className="mt-3 space-y-2 text-sm leading-7 text-neutral-300">
                    {selectedGuide?.nextSteps.map((item, index) => (
                      <li key={item}>{index + 1}. {item}</li>
                    ))}
                  </ol>
                </section>

                {selectedGuide?.phaseNote && (
                  <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200/80">Phase 1 제한</p>
                    <p className="mt-3 text-sm leading-7 text-indigo-100/90">{selectedGuide.phaseNote}</p>
                  </section>
                )}

                <div className="flex flex-col gap-3 pt-2">
                  {guestMode ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-500 cursor-not-allowed"
                    >
                      게스트 모드에서는 알림을 만들 수 없습니다
                    </button>
                  ) : DISABLED_PRESET_IDS.has(selectedPreset.id) ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-500 cursor-not-allowed"
                    >
                      이 프리셋은 아직 준비 중입니다
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCreateAlert(selectedPreset)}
                      className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-white"
                    >
                      이 전략으로 알림 받기
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedPreset(null)}
                    className="w-full rounded-xl border border-white/[0.08] px-4 py-3 text-sm font-medium text-neutral-300 transition hover:border-white/[0.14] hover:bg-white/[0.04]"
                  >
                    카드 목록으로 돌아가기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rule editor modal — opens in create mode but prefilled */}
      <RuleEditor
        open={editorOpen}
        rule={prefillRule}
        guestMode={guestMode}
        onClose={() => {
          setEditorOpen(false)
          setPrefillRule(null)
        }}
      />
    </div>
  )
}

function formatExitType(type: string): string {
  switch (type) {
    case 'tp':
      return 'TP'
    case 'sl':
      return 'SL'
    case 'timeout':
      return 'TO'
    default:
      return type
  }
}

function getSummaryByWindow(preset: PresetStrategy, summaryWindow: PresetSummaryWindow) {
  switch (summaryWindow) {
    case '90d':
      return preset.summary_90d
    case '180d':
      return preset.summary_180d
    default:
      return preset.summary_all
  }
}

function formatWindowLabel(summaryWindow: PresetSummaryWindow, summaryLabel?: string) {
  if (summaryWindow === '90d') return '최근 90일'
  if (summaryWindow === '180d') return '최근 180일'
  return summaryLabel || '전체 기간'
}

function formatDetailHoldTime(hours: number): string {
  if (hours >= 24) {
    return `약 ${Math.round(hours / 24)}일`
  }
  return `약 ${Math.round(hours)}시간`
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-neutral-100">{value}</p>
    </div>
  )
}
