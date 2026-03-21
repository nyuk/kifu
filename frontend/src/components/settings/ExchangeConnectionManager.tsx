'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { isGuestSession } from '../../lib/guestSession'

type ExchangeOption = 'binance_futures' | 'binance_spot' | 'upbit'

type ExchangeItem = {
  id: string
  exchange: ExchangeOption | string
  api_key_masked: string
  is_valid: boolean
  created_at: string
}

type ExchangeListResponse = {
  items: ExchangeItem[]
}

type ExchangeTestResponse = {
  success: boolean
  message: string
  expires_at?: string
}

type ExchangeSyncResponse = {
  success?: boolean
  message?: string
  exchange?: string
  before_count?: number
  after_count?: number
  inserted_count?: number
  run_id?: string
}

type TradeImportResponse = {
  imported: number
  skipped: number
  duplicates: number
  issue_count: number
  positions_refreshed?: boolean
  positions_refresh_error?: string
  venue: string
  source: string
  run_id: string
}

type SummaryPackPayload = {
  time_range?: {
    start_ts?: string
    end_ts?: string
    timezone?: string
  }
  data_sources?: {
    exchanges?: string[]
    csv_imported?: boolean
  }
  pnl_summary?: {
    realized_pnl_total?: string | null
    unrealized_pnl_snapshot?: string | null
    fees_total?: string | null
    funding_total?: string | null
  }
  activity_summary?: {
    trade_count?: number
    notional_volume_total?: string | null
  }
}

type SummaryPackResponse = {
  pack_id: string
  user_id: string
  source_run_id: string
  range: string
  schema_version: string
  calc_version: string
  content_hash: string
  reconciliation_status: string
  missing_suspects_count: number
  duplicate_suspects_count: number
  normalization_warnings: string[]
  payload: SummaryPackPayload
  created_at: string
}

type PackGenerateLatestResponse = {
  pack_id: string
  reconciliation_status: string
  source_run_id: string
  anchor_ts: string
}

const exchangeLabel: Record<ExchangeOption, string> = {
  binance_futures: 'Binance Futures',
  binance_spot: 'Binance Spot',
  upbit: 'Upbit',
}

function NextStepActions({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">다음 단계</p>
      <p className="mt-2 text-sm font-semibold text-zinc-100">{title}</p>
      <p className="mt-1 text-xs text-zinc-300">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/home"
          className="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-950"
        >
          서재 보기
        </Link>
        <Link
          href="/chart"
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-neutral-200"
        >
          차트 열기
        </Link>
        <Link
          href="/review"
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-neutral-200"
        >
          복기 열기
        </Link>
      </div>
    </div>
  )
}

export function ExchangeConnectionManager() {
  const [items, setItems] = useState<ExchangeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMap, setStatusMap] = useState<Record<string, string>>({})
  const [expiresAtMap, setExpiresAtMap] = useState<Record<string, string>>({})
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({})
  const [syncStartedAtMap, setSyncStartedAtMap] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [guestMode, setGuestMode] = useState(false)
  const [runIdMap, setRunIdMap] = useState<Record<string, string>>({})
  const [packMap, setPackMap] = useState<Record<string, SummaryPackResponse>>({})
  const [packLoadingMap, setPackLoadingMap] = useState<Record<string, boolean>>({})
  const [packErrorMap, setPackErrorMap] = useState<Record<string, string>>({})
  const [csvVenue, setCsvVenue] = useState<'binance' | 'upbit' | 'bybit'>('binance')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvUploadMessage, setCsvUploadMessage] = useState('')
  const [csvUploadError, setCsvUploadError] = useState('')
  const [, setElapsedTick] = useState(0)

  const [exchange, setExchange] = useState<ExchangeOption>('binance_futures')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')

  const helperText = useMemo(() => {
    if (exchange === 'binance_futures') {
      return '권한: read + futures. (출금 권한은 비활성 권장)'
    }
    if (exchange === 'binance_spot') {
      return '권한: read(현물 거래내역 조회)'
    }
    return '권한: 거래 조회(read). 자동 동기화 시 KRW/USDT/BTC 마켓을 함께 조회합니다.'
  }, [exchange])

  const fetchConnections = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get<ExchangeListResponse>('/v1/exchanges')
      setItems(response.data.items)
    } catch {
      setError('거래소 연결 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setGuestMode(isGuestSession())
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  useEffect(() => {
    const hasSyncing = Object.values(syncingMap).some(Boolean)
    if (!hasSyncing) return
    const timer = window.setInterval(() => {
      setElapsedTick((prev) => prev + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [setElapsedTick, syncingMap])

  const onConnect = async () => {
    if (guestMode) return
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError('API Key와 Secret을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await api.post('/v1/exchanges', {
        exchange,
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
      })
      setApiKey('')
      setApiSecret('')
      await fetchConnections()
    } catch (err: any) {
      const message = err?.response?.data?.message ?? '연결 저장에 실패했습니다.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const onTest = async (item: ExchangeItem) => {
    if (guestMode) return
    setStatusMap((prev) => ({ ...prev, [item.id]: '연결 테스트 중...' }))
    try {
      const response = await api.post<ExchangeTestResponse>(`/v1/exchanges/${item.id}/test`)
      setStatusMap((prev) => ({ ...prev, [item.id]: response.data.message || '테스트 성공' }))
      if (response.data.expires_at) {
        setExpiresAtMap((prev) => ({ ...prev, [item.id]: response.data.expires_at as string }))
      }
      await fetchConnections()
    } catch (err: any) {
      const message = err?.response?.data?.message ?? '테스트 실패'
      setStatusMap((prev) => ({ ...prev, [item.id]: message }))
    }
  }

  const renderExpiryBadge = (item: ExchangeItem) => {
    const expiresAt = expiresAtMap[item.id]
    if (!expiresAt) return null

    const target = new Date(expiresAt).getTime()
    if (Number.isNaN(target)) return null
    const remainDays = Math.floor((target - Date.now()) / (1000 * 60 * 60 * 24))
    const tone =
      remainDays <= 7
        ? 'border-rose-400/50 bg-rose-500/10 text-rose-200'
        : remainDays <= 30
          ? 'border-amber-400/50 bg-amber-500/10 text-amber-200'
          : 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'

    const label = remainDays < 0 ? '만료됨' : `만료 D-${remainDays}`
    const dateLabel = new Date(expiresAt).toLocaleDateString('ko-KR')
    return (
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
        {label} · {dateLabel}
      </span>
    )
  }

  const onSync = async (item: ExchangeItem, fullBackfill = false) => {
    if (guestMode) return
    const modeLabel = fullBackfill ? '초기 백필(전체)' : '지금 동기화'
    setStatusMap((prev) => ({ ...prev, [item.id]: `${modeLabel} 실행 중...` }))
    setSyncingMap((prev) => ({ ...prev, [item.id]: true }))
    setSyncStartedAtMap((prev) => ({ ...prev, [item.id]: Date.now() }))
    try {
      const query = fullBackfill ? '?full_backfill=true' : ''
      const response = await api.post<ExchangeSyncResponse>(`/v1/exchanges/${item.id}/sync${query}`, undefined, {
        timeout: fullBackfill ? 10 * 60 * 1000 : 2 * 60 * 1000,
      })
      const runId = response.data.run_id || ''
      if (runId) {
        setRunIdMap((prev) => ({ ...prev, [item.id]: runId }))
      }
      const before = response.data.before_count
      const after = response.data.after_count
      const inserted = response.data.inserted_count
      const detail =
        typeof before === 'number' && typeof after === 'number' && typeof inserted === 'number'
          ? ` (추가 ${inserted}건 · 총 ${after}건, 이전 ${before}건)`
          : ''
      setStatusMap((prev) => ({ ...prev, [item.id]: `${response.data.message || '동기화 완료'}${detail}` }))
      if (typeof window !== 'undefined') {
        const stamp = new Date().toISOString()
        localStorage.setItem('kifu-portfolio-refresh', stamp)
        window.dispatchEvent(new CustomEvent('kifu-portfolio-refresh', { detail: { at: stamp } }))
      }
    } catch (err: any) {
      const message = err?.response?.data?.message ?? '동기화 실패'
      setStatusMap((prev) => ({ ...prev, [item.id]: message }))
    } finally {
      setSyncingMap((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  const onGeneratePack = async (item: ExchangeItem) => {
    if (guestMode) return

    setPackLoadingMap((prev) => ({ ...prev, [item.id]: true }))
    setPackErrorMap((prev) => ({ ...prev, [item.id]: '' }))

    try {
      const latestResponse = await api.post<PackGenerateLatestResponse>('/v1/packs/generate-latest', { range: '30d' })
      const pack = await api.get<SummaryPackResponse>(`/v1/packs/${latestResponse.data.pack_id}`)
      setPackMap((prev) => ({ ...prev, [item.id]: pack.data }))
      setStatusMap((prev) => ({
        ...prev,
        [item.id]: `팩 생성 완료 · 기준 시각 ${latestResponse.data.anchor_ts}`,
      }))
    } catch (err: any) {
      setPackErrorMap((prev) => ({
        ...prev,
        [item.id]: err?.response?.data?.message ?? '팩 생성 실패',
      }))
    } finally {
      setPackLoadingMap((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  const onUploadCsv = async () => {
    if (guestMode) return
    if (!csvFile) {
      setCsvUploadError('업로드할 CSV 파일을 먼저 선택해 주세요.')
      return
    }

    setCsvUploading(true)
    setCsvUploadError('')
    setCsvUploadMessage('')

    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('venue', csvVenue)
      formData.append('asset_class', 'crypto')
      formData.append('venue_type', 'cex')
      formData.append('source', 'csv')

      const response = await api.post<TradeImportResponse>('/v1/imports/trades', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setCsvUploadMessage(
        `CSV 업로드 완료: imported ${response.data.imported}, skipped ${response.data.skipped}, duplicates ${response.data.duplicates}`,
      )
      setCsvFile(null)
      if (typeof window !== 'undefined') {
        const stamp = new Date().toISOString()
        localStorage.setItem('kifu-portfolio-refresh', stamp)
        window.dispatchEvent(new CustomEvent('kifu-portfolio-refresh', { detail: { at: stamp } }))
      }
    } catch (err: any) {
      setCsvUploadError(err?.response?.data?.message ?? 'CSV 업로드에 실패했습니다.')
    } finally {
      setCsvUploading(false)
    }
  }

  const onDownloadPack = (pack: SummaryPackResponse) => {
    const blob = new Blob([JSON.stringify(pack, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `summary-pack-${pack.pack_id}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const formatValue = (value: string | null | undefined) => (value && value.trim() ? value : '-')

  const statusClass = (status: string) => {
    if (status === 'ok') {
      return 'border-emerald-400/40 bg-emerald-400/8 text-emerald-100'
    }
    if (status === 'warning') {
      return 'border-amber-400/40 bg-amber-400/8 text-amber-100'
    }
    return 'border-rose-400/40 bg-rose-400/8 text-rose-100'
  }

  const onDelete = async (item: ExchangeItem) => {
    if (guestMode) return
    setStatusMap((prev) => ({ ...prev, [item.id]: '삭제 중...' }))
    try {
      await api.delete(`/v1/exchanges/${item.id}`)
      await fetchConnections()
    } catch (err: any) {
      const message = err?.response?.data?.message ?? '삭제 실패'
      setStatusMap((prev) => ({ ...prev, [item.id]: message }))
    }
  }

  return (
    <div className="space-y-4">
      {guestMode && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          게스트 모드에서는 거래소 API 연결/동기화 기능이 비활성화됩니다.
        </div>
      )}
      <div className="rounded-xl border border-white/5 bg-white/[0.04] p-5 backdrop-blur-md">
        <p className="text-sm font-bold text-neutral-100">거래소 API 연결</p>
        <p className="mt-1 text-xs text-neutral-500">연결 후 테스트, 동기화를 바로 실행할 수 있습니다.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            value={exchange}
            onChange={(event) => setExchange(event.target.value as ExchangeOption)}
            disabled={guestMode}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            <option value="binance_futures">Binance Futures</option>
            <option value="binance_spot">Binance Spot</option>
            <option value="upbit">Upbit</option>
          </select>

          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="API Key"
            disabled={guestMode}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
          />

          <input
            value={apiSecret}
            onChange={(event) => setApiSecret(event.target.value)}
            placeholder="API Secret"
            type="password"
            disabled={guestMode}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>

        <p className="mt-3 text-xs text-neutral-500/80">{helperText}</p>

        <button
          type="button"
          onClick={onConnect}
          disabled={submitting || guestMode}
          className="mt-4 rounded-lg bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-950 shadow-lg shadow-white/5 transition hover:bg-white disabled:opacity-60"
        >
          {submitting ? '저장 중...' : '연결 저장'}
        </button>

        {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.04] p-5 backdrop-blur-md">
        <p className="text-sm font-bold text-neutral-100">거래 CSV 업로드</p>
        <p className="mt-1 text-xs text-neutral-500">
          API 연결이 어렵다면 거래소 CSV로 먼저 시작할 수 있습니다. 업로드 후 포트폴리오와 복기 화면이 바로 채워집니다.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
          <select
            value={csvVenue}
            onChange={(event) => setCsvVenue(event.target.value as 'binance' | 'upbit' | 'bybit')}
            disabled={guestMode || csvUploading}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            <option value="binance">Binance CSV</option>
            <option value="upbit">Upbit CSV</option>
            <option value="bybit">Bybit CSV</option>
          </select>

          <input
            type="file"
            accept=".csv,text/csv"
            disabled={guestMode || csvUploading}
            onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
            className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-neutral-200"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onUploadCsv}
            disabled={guestMode || csvUploading}
            className="rounded-lg bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-950 shadow-lg shadow-white/5 transition hover:bg-white disabled:opacity-60"
          >
            {csvUploading ? 'CSV 업로드 중...' : 'CSV 업로드'}
          </button>
          <p className="text-xs text-neutral-500">
            업로드 후에는 홈/차트/복기에서 바로 데이터를 확인할 수 있습니다.
          </p>
        </div>

        {csvUploadMessage && <p className="mt-3 text-xs text-emerald-300">{csvUploadMessage}</p>}
        {csvUploadError && <p className="mt-3 text-xs text-rose-300">{csvUploadError}</p>}
        {csvUploadMessage && (
          <NextStepActions
            title="CSV 업로드가 끝났습니다."
            description="이제 홈과 차트에서 실제 거래가 들어왔는지 확인하고, 복기에서 첫 기록을 남기면 됩니다."
          />
        )}
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.04] p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-neutral-100">연결된 거래소</p>
          <button
            type="button"
            onClick={fetchConnections}
            disabled={guestMode}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-neutral-300 transition hover:bg-white/10 hover:text-white"
          >
            새로고침
          </button>
        </div>

        {loading && <p className="mt-3 text-xs text-neutral-500">불러오는 중...</p>}
        {!loading && items.length === 0 && <p className="mt-3 text-xs text-neutral-500">연결된 거래소가 없습니다.</p>}

        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition hover:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-100">
                    {exchangeLabel[item.exchange as ExchangeOption] ?? item.exchange}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {item.api_key_masked} · {item.is_valid ? '유효' : '무효'}
                  </p>
                  {item.exchange === 'upbit' && (
                    <div className="mt-1">{renderExpiryBadge(item)}</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onTest(item)}
                    disabled={guestMode}
                    className="rounded-md border border-emerald-400/50 px-2.5 py-1 text-xs font-semibold text-emerald-200"
                  >
                    테스트
                  </button>
                  <button
                    type="button"
                    onClick={() => onSync(item)}
                    disabled={syncingMap[item.id] || guestMode}
                    className="rounded-md border border-sky-400/50 px-2.5 py-1 text-xs font-semibold text-sky-200"
                  >
                    지금 동기화
                  </button>
                  <button
                    type="button"
                    onClick={() => onSync(item, true)}
                    disabled={syncingMap[item.id] || guestMode}
                    className="rounded-md border border-indigo-400/50 px-2.5 py-1 text-xs font-semibold text-indigo-200"
                  >
                    초기 백필(전체)
                  </button>
                  <button
                    type="button"
                    onClick={() => onGeneratePack(item)}
                    disabled={packLoadingMap[item.id] || guestMode}
                    className="rounded-md border border-fuchsia-400/50 px-2.5 py-1 text-xs font-semibold text-fuchsia-200"
                  >
                    {packLoadingMap[item.id] ? '팩 생성 중...' : '팩 생성(30d)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    disabled={guestMode}
                    className="rounded-md border border-rose-400/50 px-2.5 py-1 text-xs font-semibold text-rose-200"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {syncingMap[item.id] && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                    <div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-sky-300/80" />
                  </div>
                  <p className="mt-1 text-[11px] text-sky-200">
                    진행 중... {Math.max(0, Math.floor((Date.now() - (syncStartedAtMap[item.id] ?? Date.now())) / 1000))}초 경과
                  </p>
                </div>
              )}
              {statusMap[item.id] && <p className="mt-2 text-xs text-neutral-400">{statusMap[item.id]}</p>}
              {runIdMap[item.id] && (
                <p className="mt-1 text-[11px] text-neutral-500">최근 동기화 run_id: {runIdMap[item.id]}</p>
              )}
              {(runIdMap[item.id] || statusMap[item.id]?.includes('동기화 완료')) && (
                <NextStepActions
                  title="거래 동기화가 끝났습니다."
                  description="홈에서 숫자를 확인하고, 차트에서 실제 거래를 겹쳐 본 뒤, 복기 탭에서 첫 판단을 정리해보세요."
                />
              )}
              {packErrorMap[item.id] && <p className="mt-2 text-xs text-rose-300">{packErrorMap[item.id]}</p>}

              {packMap[item.id] && (
                <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${statusClass(packMap[item.id].reconciliation_status)}`}>
                    {packMap[item.id].reconciliation_status.toUpperCase()}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-300">
                    <div className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">
                      실현손익: {formatValue(packMap[item.id].payload?.pnl_summary?.realized_pnl_total)}
                    </div>
                    <div className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">
                      수수료: {formatValue(packMap[item.id].payload?.pnl_summary?.fees_total)}
                    </div>
                    <div className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">
                      펀딩: {formatValue(packMap[item.id].payload?.pnl_summary?.funding_total)}
                    </div>
                    <div className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">
                      거래수: {(packMap[item.id].payload?.activity_summary?.trade_count ?? '-')?.toString()}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400">
                    경고: missing {packMap[item.id].missing_suspects_count} / duplicate {packMap[item.id].duplicate_suspects_count}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDownloadPack(packMap[item.id])}
                    className="rounded-md border border-sky-400/50 px-2.5 py-1 text-xs font-semibold text-sky-200"
                  >
                    JSON 다운로드
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
