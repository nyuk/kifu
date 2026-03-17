'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '../../lib/api'
import type { MonthlyReport } from '../../types/monthlyReport'

const MONTH_NAMES = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
]

const formatPnl = (value: number) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

const changeIndicator = (value: number) => {
  if (value > 0) return { text: `+${value.toFixed(1)}`, color: 'text-lime-300' }
  if (value < 0) return { text: value.toFixed(1), color: 'text-rose-300' }
  return { text: '0', color: 'text-stone-500' }
}

export function HomeMonthlyReportCard() {
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await api.get<MonthlyReport>('/v1/reports/monthly')
        if (active) setReport(res.data)
      } catch {
        // no report yet — that's fine
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600 mb-3">Monthly Report</p>
        <p className="text-[11px] text-stone-600">불러오는 중...</p>
      </section>
    )
  }

  if (!report) return null

  const p = report.payload
  const comp = p.comparison
  const pnlTone = p.trade_summary.realized_pnl >= 0 ? 'text-lime-300' : 'text-rose-300'
  const winRateTone = p.trade_summary.win_rate >= 50 ? 'text-lime-300' : 'text-rose-300'
  const topAI = p.ai_accuracy.by_provider.length > 0
    ? p.ai_accuracy.by_provider.reduce((best, cur) => cur.accuracy > best.accuracy ? cur : best, p.ai_accuracy.by_provider[0])
    : null

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600">Monthly Report</p>
          <p className="mt-1 text-sm font-medium text-stone-300">
            {p.period.year}년 {MONTH_NAMES[p.period.month]}
          </p>
        </div>
        <Link
          href={`/reports/monthly/${p.period.year}/${p.period.month}`}
          className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-stone-400 transition hover:text-stone-200 hover:border-white/[0.1]"
        >
          상세 보기
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
        <div>
          <p className="text-[11px] text-stone-600">실현 손익</p>
          <p className={`text-xl font-semibold ${pnlTone}`}>
            {formatPnl(p.trade_summary.realized_pnl)}
          </p>
          {comp && (
            <p className={`text-[10px] mt-0.5 ${changeIndicator(comp.pnl_change).color}`}>
              전월 대비 {changeIndicator(comp.pnl_change).text}
            </p>
          )}
        </div>

        <div>
          <p className="text-[11px] text-stone-600">승률</p>
          <p className={`text-xl font-semibold ${winRateTone}`}>
            {p.trade_summary.win_rate.toFixed(1)}%
          </p>
          {comp && (
            <p className={`text-[10px] mt-0.5 ${changeIndicator(comp.win_rate_change).color}`}>
              전월 대비 {changeIndicator(comp.win_rate_change).text}%p
            </p>
          )}
        </div>

        <div>
          <p className="text-[11px] text-stone-600">거래 / 버블</p>
          <p className="text-xl font-semibold text-stone-200">
            {p.trade_summary.total_trades} / {p.decision_stats.total_bubbles}
          </p>
        </div>

        <div>
          <p className="text-[11px] text-stone-600">AI 최고 정확도</p>
          {topAI ? (
            <p className="text-xl font-semibold text-stone-200">
              {topAI.accuracy.toFixed(1)}%
              <span className="ml-1 text-[11px] text-stone-500 font-normal">{topAI.provider}</span>
            </p>
          ) : (
            <p className="text-xl font-semibold text-stone-500">-</p>
          )}
        </div>
      </div>

      {p.top_symbols.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.top_symbols.slice(0, 5).map((s) => (
            <span
              key={s.symbol}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                s.realized_pnl >= 0
                  ? 'border-lime-400/20 bg-lime-500/8 text-lime-300'
                  : 'border-rose-400/20 bg-rose-500/8 text-rose-300'
              }`}
            >
              {s.symbol} {formatPnl(s.realized_pnl)}
            </span>
          ))}
        </div>
      )}

      {p.mistake_report.mistake_count > 0 && (
        <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-2.5">
          <p className="text-[11px] text-amber-300/80">
            이번 달 실수 <span className="font-semibold text-amber-200">{p.mistake_report.mistake_count}건</span> 감지
            {p.mistake_report.top_mistakes.length > 0 && (
              <span className="ml-1 text-amber-400/60">
                — {p.mistake_report.top_mistakes.map((m) => `${m.symbol} ${m.side}`).join(', ')}
              </span>
            )}
          </p>
        </div>
      )}
    </section>
  )
}
