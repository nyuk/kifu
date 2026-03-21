'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../../../src/lib/api'

type GrowthDropOff = {
  from: string
  to: string
  lost: number
  note: string
}

type GrowthIssue = {
  code: string
  severity: string
  message: string
}

type GrowthDraft = {
  kind: string
  title: string
  content: string
}

type GrowthPayload = {
  generated_at: string
  report_date: string
  funnel: {
    counts: Record<string, number>
    drop_offs: GrowthDropOff[]
    notes: string[]
  }
  content: {
    source_user_id?: string
    source_status: string
    review_summary: string
    x_drafts: GrowthDraft[]
  }
  issues: GrowthIssue[]
  feedback?: {
    inbox_count: number
    next_count: number
    later_count: number
  }
  operator: {
    recommended_actions: string[]
  }
}

type GrowthDailyReport = {
  id: string
  report_date: string
  status: string
  payload: GrowthPayload | string
  content_drafts_count: number
  issues_count: number
  created_at: string
  updated_at: string
}

type ImportResponse = {
  imported: number
  skipped: number
  duplicates: number
  issue_count: number
  venue: string
  source: string
  run_id: string
}

const metricLabelMap: Record<string, string> = {
  visit: '방문',
  guest_start: '게스트 시작',
  signup_completed: '회원가입 완료',
  csv_upload_completed: 'CSV 업로드 완료',
  api_connect_completed: 'API 연결 완료',
  first_review_completed: '첫 복기 완료',
}

const severityToneMap: Record<string, string> = {
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  info: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
  critical: 'border-rose-400/30 bg-rose-400/10 text-rose-100',
}

const formatDateTime = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR')
}

const normalizePayload = (payload: GrowthDailyReport['payload'] | null | undefined): GrowthPayload | null => {
  if (!payload) return null
  let parsed: GrowthPayload | null = null
  if (typeof payload === 'string') {
    try {
      parsed = JSON.parse(payload) as GrowthPayload
    } catch {
      return null
    }
  }
  if (!parsed) {
    parsed = payload
  }

  return {
    generated_at: parsed.generated_at ?? '',
    report_date: parsed.report_date ?? '',
    funnel: {
      counts: parsed.funnel?.counts ?? {},
      drop_offs: Array.isArray(parsed.funnel?.drop_offs) ? parsed.funnel.drop_offs : [],
      notes: Array.isArray(parsed.funnel?.notes) ? parsed.funnel.notes : [],
    },
    content: {
      source_user_id: parsed.content?.source_user_id,
      source_status: parsed.content?.source_status ?? 'unknown',
      review_summary: parsed.content?.review_summary ?? '리포트 요약이 아직 준비되지 않았습니다.',
      x_drafts: Array.isArray(parsed.content?.x_drafts) ? parsed.content.x_drafts : [],
    },
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    feedback: {
      inbox_count: parsed.feedback?.inbox_count ?? 0,
      next_count: parsed.feedback?.next_count ?? 0,
      later_count: parsed.feedback?.later_count ?? 0,
    },
    operator: {
      recommended_actions: Array.isArray(parsed.operator?.recommended_actions)
        ? parsed.operator.recommended_actions
        : [],
    },
  }
}

export default function AdminGrowthPage() {
  const [report, setReport] = useState<GrowthDailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvVenue, setCsvVenue] = useState('binance')
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0)
  const [copyMessage, setCopyMessage] = useState('')

  const loadReport = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)
    try {
      const response = await api.get<GrowthDailyReport>(`/v1/admin/growth/daily-report${refresh ? '?refresh=1' : ''}`)
      setReport(response.data)
      setSelectedDraftIndex(0)
    } catch {
      setError('Growth 일일 리포트를 불러오지 못했습니다.')
    } finally {
      if (refresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadReport(false)
  }, [])

  const payload = useMemo(() => normalizePayload(report?.payload ?? null), [report])
  const draftOptions = payload?.content?.x_drafts ?? []
  const selectedDraft = draftOptions[selectedDraftIndex] ?? null

  const copyDraft = async (draft: GrowthDraft) => {
    try {
      await navigator.clipboard.writeText(draft.content)
      setCopyMessage(`"${draft.title}" 초안을 복사했습니다.`)
    } catch {
      setCopyMessage('초안 복사에 실패했습니다.')
    }
  }

  const uploadCsv = async () => {
    if (!csvFile) {
      setUploadError('업로드할 CSV 파일을 먼저 선택해 주세요.')
      return
    }

    setUploading(true)
    setUploadError(null)
    setUploadMessage('')

    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('venue', csvVenue)
      formData.append('asset_class', 'crypto')
      formData.append('venue_type', 'cex')
      formData.append('source', 'csv')

      const response = await api.post<ImportResponse>('/v1/imports/trades', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setUploadMessage(
        `CSV 업로드 완료: imported ${response.data.imported}, skipped ${response.data.skipped}, duplicates ${response.data.duplicates}`,
      )
      setCsvFile(null)
      await loadReport(true)
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'CSV 업로드에 실패했습니다.'
      setUploadError(message)
    } finally {
      setUploading(false)
    }
  }

  const metrics = [
    { key: 'visit', value: payload?.funnel?.counts?.visit ?? 0 },
    { key: 'guest_start', value: payload?.funnel?.counts?.guest_start ?? 0 },
    { key: 'signup_completed', value: payload?.funnel?.counts?.signup_completed ?? 0 },
    {
      key: 'data_connected',
      value: (payload?.funnel?.counts?.csv_upload_completed ?? 0) + (payload?.funnel?.counts?.api_connect_completed ?? 0),
      label: '데이터 연결',
    },
    { key: 'first_review_completed', value: payload?.funnel?.counts?.first_review_completed ?? 0 },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="rounded-2xl border border-cyan-400/20 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Admin Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Growth Daily Report</h1>
        <p className="mt-3 text-sm text-zinc-400">
          최신 퍼널 지표, 이슈, 운영 액션, X 초안 후보를 한 번에 확인하는 최소 운영 화면입니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <Link href="/admin" className="text-cyan-200 hover:text-cyan-100">
            관리자 홈으로 돌아가기
          </Link>
          <Link href="/marketing" className="text-zinc-300 hover:text-white">
            Marketing OS 열기
          </Link>
        </div>
      </header>

      {loading && <p className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-zinc-400">리포트를 불러오는 중입니다...</p>}
      {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}

      {!loading && !error && report && payload && (
        <>
          <section className="grid gap-3 md:grid-cols-5">
            {metrics.map((metric) => (
              <article key={metric.key} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{metric.label ?? metricLabelMap[metric.key] ?? metric.key}</p>
                <p className="mt-2 text-3xl font-semibold text-zinc-100">{metric.value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <article className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Latest Report</p>
                    <h2 className="mt-2 text-xl font-semibold text-zinc-100">{payload.report_date}</h2>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <p>상태: {report.status}</p>
                    <p>생성: {formatDateTime(payload.generated_at)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-zinc-500">새벽 운영 중에는 오늘 리포트를 다시 생성해 지금까지의 이벤트를 바로 확인할 수 있습니다.</p>
                  <button
                    type="button"
                    onClick={() => void loadReport(true)}
                    disabled={refreshing}
                    className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {refreshing ? '오늘 리포트 갱신 중...' : '오늘 리포트 다시 생성'}
                  </button>
                </div>
                <p className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm leading-6 text-zinc-300">
                  {payload.content.review_summary}
                </p>
              </article>

              <article className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
                <h2 className="text-lg font-medium text-zinc-100">운영자가 바로 볼 것</h2>
                <div className="mt-4 space-y-3">
                  {payload.operator.recommended_actions.map((action) => (
                    <div key={action} className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                      {action}
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Feedback Inbox</p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-100">{payload.feedback?.inbox_count ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Next</p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-100">{payload.feedback?.next_count ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Later</p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-100">{payload.feedback?.later_count ?? 0}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
                <h2 className="text-lg font-medium text-zinc-100">이슈와 드롭오프</h2>
                <div className="mt-4 grid gap-3">
                  {payload.issues.length === 0 && payload.funnel.drop_offs.length === 0 && (
                    <p className="text-sm text-zinc-400">현재 기록된 주요 이슈가 없습니다.</p>
                  )}
                  {payload.issues.map((issue) => (
                    <div
                      key={issue.code}
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        severityToneMap[issue.severity] ?? 'border-white/[0.08] bg-white/[0.04] text-zinc-200'
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] opacity-80">{issue.code}</p>
                      <p className="mt-1">{issue.message}</p>
                    </div>
                  ))}
                  {payload.funnel.drop_offs.map((drop) => (
                    <div key={`${drop.from}-${drop.to}`} className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 text-sm text-zinc-300">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        {metricLabelMap[drop.from] ?? drop.from} → {metricLabelMap[drop.to] ?? drop.to}
                      </p>
                      <p className="mt-1">이탈 {drop.lost}</p>
                      <p className="mt-1 text-xs text-zinc-500">{drop.note}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium text-zinc-100">CSV 업로드 테스트</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Growth OS의 `csv_upload_completed` 이벤트를 빠르게 확인하는 운영용 업로드 박스입니다.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/[0.08] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                    imports/trades
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">Venue</span>
                    <select
                      value={csvVenue}
                      onChange={(event) => setCsvVenue(event.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-400/40"
                    >
                      <option value="binance">binance</option>
                      <option value="upbit">upbit</option>
                      <option value="bybit">bybit</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">CSV 파일</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
                      className="block w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-zinc-200 file:mr-4 file:rounded-md file:border-0 file:bg-cyan-500/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-100"
                    />
                  </label>
                </div>

                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  추천 샘플: <span className="font-mono text-zinc-300">data/sample/growth-os-sample-binance-trades.csv</span>
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void uploadCsv()}
                    disabled={uploading}
                    className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploading ? 'CSV 업로드 중...' : 'CSV 업로드 실행'}
                  </button>
                  {uploadMessage && <p className="text-xs text-emerald-200">{uploadMessage}</p>}
                </div>
                {uploadError && (
                  <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    {uploadError}
                  </p>
                )}
              </article>
            </div>

            <div className="space-y-6">
              <article className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-medium text-zinc-100">X 초안 후보</h2>
                  <span className="text-xs text-zinc-500">{draftOptions.length}개</span>
                </div>
                {copyMessage && (
                  <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {copyMessage}
                  </p>
                )}
                <div className="mt-4 space-y-3">
                  {draftOptions.length === 0 && <p className="text-sm text-zinc-400">생성된 X 초안이 없습니다.</p>}
                  {draftOptions.map((draft, index) => (
                    <button
                      key={`${draft.kind}-${draft.title}`}
                      type="button"
                      onClick={() => setSelectedDraftIndex(index)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        selectedDraftIndex === index
                          ? 'border-cyan-400/40 bg-cyan-500/10'
                          : 'border-white/[0.06] bg-black/20 hover:border-white/[0.12]'
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{draft.kind}</p>
                      <p className="mt-1 text-sm font-medium text-zinc-100">{draft.title}</p>
                    </button>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-medium text-zinc-100">선택한 초안</h2>
                  {selectedDraft && (
                    <button
                      type="button"
                      onClick={() => void copyDraft(selectedDraft)}
                      className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
                    >
                      초안 복사
                    </button>
                  )}
                </div>
                {!selectedDraft && <p className="mt-4 text-sm text-zinc-400">왼쪽 목록에서 초안을 선택해 주세요.</p>}
                {selectedDraft && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{selectedDraft.kind}</p>
                      <p className="mt-1 text-base font-semibold text-zinc-100">{selectedDraft.title}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4 text-sm leading-6 whitespace-pre-wrap text-zinc-200">
                      {selectedDraft.content}
                    </div>
                    <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-100">
                      최소 운영 흐름: 여기서 초안을 고른 뒤 복사하고, 필요하면 <Link href="/marketing" className="underline underline-offset-2">Marketing OS</Link>로 이동해 다듬은 후 X에 게시하면 됩니다.
                    </div>
                  </div>
                )}
              </article>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
