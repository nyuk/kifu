'use client'

import type { PresetStrategy, PresetSummaryWindow } from '../../types/preset'

type PresetCardProps = {
  preset: PresetStrategy
  onCreateAlert: (preset: PresetStrategy) => void
  onViewDetail: (preset: PresetStrategy) => void
  summaryWindow: PresetSummaryWindow
  disabled?: boolean
  disabledLabel?: string
}

const RISK_BADGE: Record<string, { label: string; className: string }> = {
  high: { label: '높음', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
  medium: { label: '중간', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  low: { label: '낮음', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
}

const CATEGORY_BADGE: Record<string, { label: string; className: string }> = {
  rebound: { label: '급락반등', className: 'bg-sky-500/20 text-sky-300' },
  volatility: { label: '변동성', className: 'bg-fuchsia-500/20 text-fuchsia-300' },
  cycle: { label: '사이클', className: 'bg-purple-500/20 text-purple-300' },
}

function formatHoldTime(preset: PresetStrategy): string {
  const hours = preset.summary_all.avg_hold_hours
  if (preset.category === 'cycle') {
    const days = Math.round(hours / 24)
    return `~${days}일`
  }
  return `~${Math.round(hours)}시간`
}

function formatExitType(type: string): string {
  switch (type) {
    case 'tp': return 'TP'
    case 'sl': return 'SL'
    case 'timeout': return 'TO'
    default: return type
  }
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
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

export function PresetCard({ preset, onCreateAlert, onViewDetail, summaryWindow, disabled, disabledLabel = '준비 중' }: PresetCardProps) {
  const risk = RISK_BADGE[preset.risk_level] ?? RISK_BADGE.medium
  const category = CATEGORY_BADGE[preset.category] ?? CATEGORY_BADGE.rebound
  const s = getSummaryByWindow(preset, summaryWindow)

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-neutral-100">{preset.label}</h3>
          <p className="mt-1 text-sm text-neutral-400">{preset.short_description}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${risk.className}`}>
            {risk.label}
          </span>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${category.className}`}>
            {category.label}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricBox label="승률" value={`${s.win_rate}%`} />
        <MetricBox label="평균수익" value={`${s.avg_return_pct > 0 ? '+' : ''}${s.avg_return_pct}%`} />
        <MetricBox label="신호 수" value={`${s.signal_count}회`} sub={formatWindowLabel(summaryWindow, s.window)} />
        <MetricBox label="평균보유" value={formatHoldTime(preset)} />
      </div>

      {/* Params */}
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(preset.params).map(([key, val]) => (
          <span key={key} className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-neutral-400">
            {key}: {val}
          </span>
        ))}
      </div>

      {/* Educational note */}
      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        {preset.educational_note}
      </p>

      {/* Recent examples */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-neutral-500">최근 예시</p>
        <div className="space-y-1">
          {preset.recent_examples.slice(-3).map((ex, i) => (
            <div key={i} className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="w-20 shrink-0">{ex.date}</span>
              <span className="w-16 shrink-0 text-right">${formatPrice(ex.entry_price)}</span>
              <span className={`w-14 shrink-0 text-right font-medium ${ex.result_pct > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {ex.result_pct > 0 ? '+' : ''}{ex.result_pct.toFixed(1)}%
              </span>
              <span className="w-6 shrink-0 text-center text-neutral-500">{formatExitType(ex.exit_type)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-auto pt-4">
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => onViewDetail(preset)}
            className="w-full rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-white/[0.14] hover:bg-white/[0.04]"
          >
            상세 보기
          </button>
          {disabled ? (
            <button
              type="button"
              disabled
              className="w-full rounded-lg border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-500 cursor-not-allowed"
            >
              {disabledLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCreateAlert(preset)}
              className="w-full rounded-lg bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-white"
            >
              이 전략으로 알림 받기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-2.5 text-center">
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-neutral-100">{value}</p>
      {sub && <p className="text-[10px] text-neutral-600">{sub}</p>}
    </div>
  )
}
