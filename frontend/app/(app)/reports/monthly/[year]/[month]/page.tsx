'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../../../../../src/lib/api'
import { MonthlyTrendChart } from '../../../../../../src/components/reports/MonthlyTrendChart'
import type { MonthlyReport, MonthlyReportPayload } from '../../../../../../src/types/monthlyReport'

const MONTH_NAMES = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
]

const formatPnl = (value: number) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

const pnlColor = (value: number) => {
  if (value > 0) return 'text-lime-300'
  if (value < 0) return 'text-rose-300'
  return 'text-stone-400'
}

const changeLabel = (value: number, suffix = '') => {
  if (value > 0) return { text: `+${value.toFixed(1)}${suffix}`, color: 'text-lime-300' }
  if (value < 0) return { text: `${value.toFixed(1)}${suffix}`, color: 'text-rose-300' }
  return { text: `0${suffix}`, color: 'text-stone-500' }
}

export default function MonthlyReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const year = Number(params.year)
  const month = Number(params.month)
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!year || !month) return
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get<MonthlyReport>(`/v1/reports/monthly/${year}/${month}`)
        if (active) setReport(res.data)
      } catch {
        if (active) setError('리포트를 찾을 수 없습니다.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [year, month])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await api.post<MonthlyReport>('/v1/reports/monthly/generate', { year, month })
      setReport(res.data)
      setError(null)
    } catch {
      setError('리포트 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen text-zinc-100 p-4 md:p-8">
        <p className="text-sm text-stone-500">리포트를 불러오는 중...</p>
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="min-h-screen text-zinc-100 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <Link href="/home" className="text-[11px] text-stone-500 hover:text-stone-300 transition">
            ← 홈으로
          </Link>
          <h1 className="text-2xl font-semibold text-stone-200">
            {year}년 {MONTH_NAMES[month]} 리포트
          </h1>
          <p className="text-sm text-stone-500">{error}</p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-stone-300 hover:bg-white/[0.08] transition disabled:opacity-50"
          >
            {generating ? '생성 중...' : '이 달의 리포트 생성하기'}
          </button>
        </div>
      </div>
    )
  }

  if (!report) return null

  const p = report.payload
  const comp = p.comparison
  const tradeSummary = p.trade_summary ?? { realized_pnl: 0, win_rate: 0, total_trades: 0, buy_count: 0, sell_count: 0, avg_pnl: 0 }
  const decisionStats = p.decision_stats ?? { total_bubbles: 0, bubbles_with_outcome: 0, bubble_win_rate: 0, avg_bubble_pnl: 0 }
  const aiAccuracy = p.ai_accuracy ?? { total_opinions: 0, by_provider: [] }
  const providers = Array.isArray(aiAccuracy.by_provider) ? aiAccuracy.by_provider : []
  const topSymbols = Array.isArray(p.top_symbols) ? p.top_symbols : []
  const mistakeReport = p.mistake_report ?? { total_reviewed: 0, mistake_count: 0, intended_count: 0, unsure_count: 0, top_mistakes: [] }
  const topMistakes = Array.isArray(mistakeReport.top_mistakes) ? mistakeReport.top_mistakes : []

  return (
    <div className="min-h-screen text-zinc-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/home" className="text-[11px] text-stone-500 hover:text-stone-300 transition">
              ← 홈으로
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-stone-200">
              {p.period.year}년 {MONTH_NAMES[p.period.month]} 리포트
            </h1>
            <p className="mt-1 text-[11px] text-stone-500">
              생성: {new Date(report.created_at).toLocaleString('ko-KR')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-stone-400 hover:bg-white/[0.08] transition disabled:opacity-50"
            >
              {generating ? '재생성 중...' : '리포트 재생성'}
            </button>
          </div>
        </div>

        {/* Trade Summary */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600 mb-4">거래 요약</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatBlock
              label="실현 손익"
              value={formatPnl(tradeSummary.realized_pnl)}
              valueClass={pnlColor(tradeSummary.realized_pnl)}
              sub={comp ? changeLabel(comp.pnl_change) : undefined}
            />
            <StatBlock
              label="승률"
              value={`${tradeSummary.win_rate.toFixed(1)}%`}
              valueClass={tradeSummary.win_rate >= 50 ? 'text-lime-300' : 'text-rose-300'}
              sub={comp ? changeLabel(comp.win_rate_change, '%p') : undefined}
            />
            <StatBlock
              label="총 거래"
              value={`${tradeSummary.total_trades}건`}
              valueClass="text-stone-200"
            />
            <StatBlock
              label="평균 손익"
              value={formatPnl(tradeSummary.avg_pnl)}
              valueClass={pnlColor(tradeSummary.avg_pnl)}
            />
          </div>
          <div className="mt-4 flex gap-4 text-[11px] text-stone-500">
            <span>BUY {tradeSummary.buy_count}건</span>
            <span>SELL {tradeSummary.sell_count}건</span>
          </div>
        </section>

        {/* Decision Stats */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600 mb-4">판단 기록</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatBlock label="총 버블" value={`${decisionStats.total_bubbles}개`} valueClass="text-stone-200" />
            <StatBlock label="결과 있음" value={`${decisionStats.bubbles_with_outcome}개`} valueClass="text-stone-200" />
            <StatBlock
              label="버블 승률"
              value={`${decisionStats.bubble_win_rate.toFixed(1)}%`}
              valueClass={decisionStats.bubble_win_rate >= 50 ? 'text-lime-300' : 'text-rose-300'}
            />
            <StatBlock
              label="평균 버블 PnL"
              value={formatPnl(decisionStats.avg_bubble_pnl)}
              valueClass={pnlColor(decisionStats.avg_bubble_pnl)}
            />
          </div>
        </section>

        {/* AI Accuracy */}
        {aiAccuracy.total_opinions > 0 && (
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600 mb-4">AI 정확도</p>
            <p className="text-[11px] text-stone-500 mb-3">
              총 의견 {aiAccuracy.total_opinions}건
            </p>
            <div className="grid gap-3 lg:grid-cols-3">
              {providers.map((prov) => (
                <div
                  key={prov.provider}
                  className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4"
                >
                  <p className="text-sm font-medium text-stone-300">{prov.provider}</p>
                  <p className={`mt-1 text-2xl font-semibold ${prov.accuracy >= 50 ? 'text-lime-300' : 'text-rose-300'}`}>
                    {prov.accuracy.toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-stone-600 mt-1">
                    {prov.correct_count} / {prov.total_checked} 정확
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top Symbols */}
        {topSymbols.length > 0 && (
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600 mb-4">심볼별 성과</p>
            <div className="space-y-2">
              {topSymbols.map((s) => (
                <div
                  key={s.symbol}
                  className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-200">{s.symbol}</p>
                    <p className="text-[11px] text-stone-600">{s.trade_count}건</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${pnlColor(s.realized_pnl)}`}>
                      {formatPnl(s.realized_pnl)}
                    </p>
                    <p className={`text-[11px] ${s.win_rate >= 50 ? 'text-lime-300/70' : 'text-rose-300/70'}`}>
                      승률 {s.win_rate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mistake Report */}
        {mistakeReport.total_reviewed > 0 && (
          <section className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400/60 mb-4">실수 분석</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-[11px] text-amber-300/60">검토 건수</p>
                <p className="text-lg font-semibold text-amber-200">{mistakeReport.total_reviewed}</p>
              </div>
              <div>
                <p className="text-[11px] text-amber-300/60">실수</p>
                <p className="text-lg font-semibold text-rose-300">{mistakeReport.mistake_count}</p>
              </div>
              <div>
                <p className="text-[11px] text-amber-300/60">의도대로</p>
                <p className="text-lg font-semibold text-lime-300">{mistakeReport.intended_count}</p>
              </div>
            </div>
            {topMistakes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-amber-300/60">반복 실수 패턴</p>
                {topMistakes.map((m, i) => (
                  <div key={`${m.symbol}-${m.side}-${i}`} className="flex items-center gap-2 text-sm text-amber-200">
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px]">{m.count}회</span>
                    <span>{m.symbol} {m.side}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Monthly Trend */}
        <MonthlyTrendChart />

        {/* Month-over-month Comparison */}
        {comp && (
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600 mb-4">전월 대비</p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <CompBlock label="손익 변화" value={comp.pnl_change} suffix="" />
              <CompBlock label="승률 변화" value={comp.win_rate_change} suffix="%p" />
              <CompBlock label="거래 건수" value={comp.trade_count_diff} suffix="건" isInt />
              <CompBlock label="버블 건수" value={comp.bubble_count_diff} suffix="개" isInt />
              <CompBlock label="AI 정확도" value={comp.accuracy_change} suffix="%p" />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function StatBlock({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string
  value: string
  valueClass: string
  sub?: { text: string; color: string }
}) {
  return (
    <div>
      <p className="text-[11px] text-stone-600">{label}</p>
      <p className={`text-xl font-semibold ${valueClass}`}>{value}</p>
      {sub && <p className={`text-[10px] mt-0.5 ${sub.color}`}>전월 대비 {sub.text}</p>}
    </div>
  )
}

function CompBlock({
  label,
  value,
  suffix,
  isInt,
}: {
  label: string
  value: number
  suffix: string
  isInt?: boolean
}) {
  const formatted = isInt
    ? (value > 0 ? `+${value}` : `${value}`)
    : (value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1))
  const color = value > 0 ? 'text-lime-300' : value < 0 ? 'text-rose-300' : 'text-stone-400'

  return (
    <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-center">
      <p className="text-[10px] text-stone-600 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{formatted}{suffix}</p>
    </div>
  )
}
