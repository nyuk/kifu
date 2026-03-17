'use client'

import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { MonthlyReport, MonthlyReportListResponse } from '../../types/monthlyReport'

const MONTH_SHORT = ['', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

type ChartPoint = {
  label: string
  pnl: number
  winRate: number
  aiAccuracy: number
  tradeCount: number
  bubbleCount: number
}

function extractPoints(reports: MonthlyReport[]): ChartPoint[] {
  return [...reports]
    .filter((r) => r.payload)
    .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
    .map((r) => {
      const p = r.payload
      const providers = Array.isArray(p.ai_accuracy?.by_provider) ? p.ai_accuracy.by_provider : []
      const topAI = providers.length > 0
        ? Math.max(...providers.map((prov) => prov.accuracy))
        : 0
      return {
        label: `${MONTH_SHORT[p.period?.month ?? 0]}`,
        pnl: p.trade_summary?.realized_pnl ?? 0,
        winRate: p.trade_summary?.win_rate ?? 0,
        aiAccuracy: topAI,
        tradeCount: p.trade_summary?.total_trades ?? 0,
        bubbleCount: p.decision_stats?.total_bubbles ?? 0,
      }
    })
}

const BAR_HEIGHT = 120
const LINE_HEIGHT = 120

export function MonthlyTrendChart() {
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pnl' | 'winRate' | 'aiAccuracy'>('pnl')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await api.get<MonthlyReportListResponse>('/v1/reports/monthly/list?limit=12')
        if (active) setReports(Array.isArray(res.data?.reports) ? res.data.reports : [])
      } catch {
        // no data
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.05] p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600 mb-3">Monthly Trend</p>
        <p className="text-[11px] text-stone-600">불러오는 중...</p>
      </section>
    )
  }

  if (reports.length < 2) return null

  const points = extractPoints(reports)
  const values = points.map((p) =>
    tab === 'pnl' ? p.pnl : tab === 'winRate' ? p.winRate : p.aiAccuracy
  )
  const maxVal = Math.max(...values.map(Math.abs), 1)
  const isPercent = tab !== 'pnl'

  const tabConfig = {
    pnl: { label: '실현 손익', unit: '' },
    winRate: { label: '승률', unit: '%' },
    aiAccuracy: { label: 'AI 정확도', unit: '%' },
  }

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.05] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600">Monthly Trend</p>
        <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
          {(Object.keys(tabConfig) as Array<keyof typeof tabConfig>).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-all ${
                tab === key
                  ? 'bg-stone-700/80 text-stone-100 shadow-sm'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              {tabConfig[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="relative overflow-hidden" style={{ height: BAR_HEIGHT + 32 }}>
        {/* Zero line for PnL */}
        {!isPercent && (
          <div
            className="absolute left-0 right-0 border-t border-white/[0.08]"
            style={{ top: BAR_HEIGHT / 2 }}
          />
        )}

        <div className="flex gap-1 h-full pt-2 pb-6">
          {points.map((point, i) => {
            const val = values[i]
            const maxBarH = BAR_HEIGHT / 2 - 8
            const barH = isPercent
              ? (val / 100) * BAR_HEIGHT * 0.85
              : (Math.abs(val) / maxVal) * maxBarH

            const isPositive = val >= 0
            const barColor = isPositive
              ? 'bg-lime-400/60 hover:bg-lime-400/80'
              : 'bg-rose-400/60 hover:bg-rose-400/80'

            return (
              <div
                key={point.label + i}
                className="flex-1 relative group"
                style={{ height: '100%' }}
              >
                {/* Bar */}
                {isPercent ? (
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 w-full max-w-[28px] rounded-t transition-all ${barColor}`}
                    style={{
                      height: Math.max(barH, 2),
                      bottom: 24,
                    }}
                  />
                ) : (
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 w-full max-w-[28px] rounded transition-all ${barColor}`}
                    style={{
                      height: Math.max(barH, 2),
                      ...(isPositive
                        ? { bottom: BAR_HEIGHT / 2 + 2 }
                        : { top: BAR_HEIGHT / 2 + 2 }),
                    }}
                  />
                )}

                {/* Label */}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] text-stone-600 whitespace-nowrap">{point.label}</span>

                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                  <div className="bg-stone-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap shadow-lg">
                    <p className="text-stone-300 font-medium">{point.label}</p>
                    <p className={isPositive ? 'text-lime-300' : 'text-rose-300'}>
                      {tab === 'pnl' ? (val >= 0 ? '+$' : '-$') + Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 }) : val.toFixed(1) + '%'}
                    </p>
                    <p className="text-stone-500">거래 {point.tradeCount} · 버블 {point.bubbleCount}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary row */}
      <div className="mt-2 flex justify-between text-[10px] text-stone-500">
        <span>{points.length}개월 데이터</span>
        {tab === 'pnl' && (() => {
          const total = values.reduce((a, b) => a + b, 0)
          return (
            <span>
              총 {total >= 0 ? '+$' : '-$'}{Math.abs(total).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          )
        })()}
        {tab === 'winRate' && (
          <span>
            평균 {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}%
          </span>
        )}
        {tab === 'aiAccuracy' && (
          <span>
            평균 {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}%
          </span>
        )}
      </div>
    </section>
  )
}
