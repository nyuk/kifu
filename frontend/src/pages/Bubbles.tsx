import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

type BubbleItem = {
  id: string
  symbol: string
  timeframe: string
  candle_time: string
  price: string
  bubble_type: string
  memo?: string | null
  tags?: string[]
}

type BubbleListResponse = {
  items: BubbleItem[]
  total: number
}

type OpinionItem = {
  provider: string
  model: string
  response: string
  tokens_used?: number | null
}

type OpinionError = {
  provider: string
  code: string
  message: string
}

type OpinionResponse = {
  opinions: OpinionItem[]
  errors?: OpinionError[]
  data_incomplete?: boolean
}

type OutcomeItem = {
  period: string
  reference_price: string
  outcome_price: string | null
  pnl_percent: string | null
}

type OutcomeResponse = {
  outcomes: OutcomeItem[]
}

type SimilarSummary = {
  period: string
  wins: number
  losses: number
  avg_pnl: string | null
}

type SimilarItem = {
  id: string
  symbol: string
  timeframe: string
  candle_time: string
  price: string
  bubble_type: string
  memo?: string | null
  tags?: string[]
  outcome?: {
    period: string
    pnl_percent?: string | null
  } | null
}

type SimilarResponse = {
  similar_count: number
  summary: SimilarSummary
  bubbles: SimilarItem[]
}

const providers = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'claude', label: 'Claude' },
  { id: 'gemini', label: 'Gemini' },
]

export function Bubbles() {
  const [bubbles, setBubbles] = useState<BubbleItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [opinions, setOpinions] = useState<OpinionItem[]>([])
  const [opinionErrors, setOpinionErrors] = useState<OpinionError[]>([])
  const [dataIncomplete, setDataIncomplete] = useState(false)
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['openai'])
  const [loadingBubbles, setLoadingBubbles] = useState(false)
  const [loadingOpinions, setLoadingOpinions] = useState(false)
  const [loadingOutcomes, setLoadingOutcomes] = useState(false)
  const [outcomes, setOutcomes] = useState<OutcomeItem[]>([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [similarSummary, setSimilarSummary] = useState<SimilarSummary | null>(null)
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([])
  const [error, setError] = useState('')

  const selectedBubble = useMemo(
    () => bubbles.find((item) => item.id === selectedId) || null,
    [bubbles, selectedId],
  )

  useEffect(() => {
    let active = true
    const loadBubbles = async () => {
      setLoadingBubbles(true)
      setError('')
      try {
        const response = await api.get<BubbleListResponse>('/v1/bubbles', {
          params: { limit: 50, sort: 'desc' },
        })
        if (!active) return
        const items = response.data?.items || []
        setBubbles(items)
        if (items.length > 0 && !selectedId) {
          setSelectedId(items[0].id)
        }
      } catch (err: any) {
        if (!active) return
        setError(err?.response?.data?.message || '버블 목록을 불러오지 못했습니다.')
      } finally {
        if (active) setLoadingBubbles(false)
      }
    }

    loadBubbles()
    return () => {
      active = false
    }
  }, [selectedId])

  const fetchOpinions = useCallback(async (bubbleId: string) => {
    setLoadingOpinions(true)
    try {
      const response = await api.get<OpinionResponse>(`/v1/bubbles/${bubbleId}/ai-opinions`)
      setOpinions(response.data?.opinions || [])
      setOpinionErrors(response.data?.errors || [])
      setDataIncomplete(Boolean(response.data?.data_incomplete))
    } catch (err: any) {
      setOpinionErrors([
        {
          provider: 'system',
          code: 'LOAD_FAILED',
          message: err?.response?.data?.message || 'AI 의견을 불러오지 못했습니다.',
        },
      ])
      setOpinions([])
      setDataIncomplete(false)
    } finally {
      setLoadingOpinions(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    fetchOpinions(selectedId)
  }, [fetchOpinions, selectedId])

  const fetchOutcomes = useCallback(async (bubbleId: string) => {
    setLoadingOutcomes(true)
    try {
      const response = await api.get<OutcomeResponse>(`/v1/bubbles/${bubbleId}/outcomes`)
      setOutcomes(response.data?.outcomes || [])
    } catch {
      setOutcomes([])
    } finally {
      setLoadingOutcomes(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    fetchOutcomes(selectedId)
  }, [fetchOutcomes, selectedId])

  const fetchSimilar = useCallback(async (bubbleId: string) => {
    setLoadingSimilar(true)
    try {
      const response = await api.get<SimilarResponse>(`/v1/bubbles/${bubbleId}/similar`, {
        params: { period: '1h' },
      })
      setSimilarSummary(response.data?.summary || null)
      setSimilarItems(response.data?.bubbles || [])
    } catch {
      setSimilarSummary(null)
      setSimilarItems([])
    } finally {
      setLoadingSimilar(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    fetchSimilar(selectedId)
  }, [fetchSimilar, selectedId])

  const handleRequestOpinions = async () => {
    if (!selectedId) return
    setLoadingOpinions(true)
    setOpinionErrors([])
    try {
      const payload = selectedProviders.length > 0 ? { providers: selectedProviders } : {}
      const response = await api.post<OpinionResponse>(`/v1/bubbles/${selectedId}/ai-opinions`, payload)
      setOpinions(response.data?.opinions || [])
      setOpinionErrors(response.data?.errors || [])
      setDataIncomplete(Boolean(response.data?.data_incomplete))
    } catch (err: any) {
      setOpinionErrors([
        {
          provider: 'system',
          code: 'REQUEST_FAILED',
          message: err?.response?.data?.message || 'AI 의견 요청에 실패했습니다.',
        },
      ])
    } finally {
      setLoadingOpinions(false)
    }
  }

  const toggleProvider = (provider: string) => {
    setSelectedProviders((prev) =>
      prev.includes(provider) ? prev.filter((item) => item !== provider) : [...prev, provider],
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Journal</p>
        <h2 className="mt-3 text-2xl font-semibold text-neutral-100">Bubble Library</h2>
        <p className="mt-2 text-sm text-neutral-400">
          태그와 AI 의견을 기준으로 과거 판단을 비교합니다.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
        <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Bubbles</p>
              <h3 className="mt-2 text-lg font-semibold text-neutral-100">최근 기록</h3>
            </div>
            <span className="text-xs text-neutral-500">{bubbles.length} items</span>
          </div>
          <div className="mt-4 space-y-3">
            {loadingBubbles && (
              <p className="text-sm text-neutral-500">불러오는 중...</p>
            )}
            {!loadingBubbles && bubbles.length === 0 && (
              <p className="text-sm text-neutral-500">아직 저장된 버블이 없습니다.</p>
            )}
            {bubbles.map((bubble) => (
              <button
                key={bubble.id}
                type="button"
                onClick={() => setSelectedId(bubble.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  bubble.id === selectedId
                    ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                    : 'border-neutral-800 bg-neutral-900/50 text-neutral-200 hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {bubble.symbol} · {bubble.timeframe}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {new Date(bubble.candle_time).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                  <span>Price: {bubble.price}</span>
                  <span className="uppercase tracking-[0.15em]">{bubble.bubble_type}</span>
                </div>
                {bubble.tags && bubble.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {bubble.tags.map((tag) => (
                      <span
                        key={`${bubble.id}-${tag}`}
                        className="rounded-full border border-neutral-700 px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">AI Opinions</p>
              <h3 className="mt-2 text-lg font-semibold text-neutral-100">AI 의견 요청</h3>
              <p className="mt-1 text-sm text-neutral-400">
                {selectedBubble
                  ? `${selectedBubble.symbol} · ${selectedBubble.timeframe} 기반 분석`
                  : '버블을 선택해주세요.'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={handleRequestOpinions}
                disabled={!selectedId || loadingOpinions}
                className="rounded-lg bg-neutral-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingOpinions ? 'Requesting...' : 'Request AI'}
              </button>
              <button
                type="button"
                onClick={() => selectedId && fetchOpinions(selectedId)}
                disabled={!selectedId || loadingOpinions}
                className="text-xs text-neutral-400 underline-offset-4 hover:text-neutral-200"
              >
                Refresh opinions
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => toggleProvider(provider.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  selectedProviders.includes(provider.id)
                    ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                    : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                }`}
              >
                {provider.label}
              </button>
            ))}
          </div>

          {dataIncomplete && (
            <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              일부 캔들 데이터가 부족하여 분석 결과가 제한될 수 있습니다.
            </div>
          )}

          {opinionErrors.length > 0 && (
            <div className="mt-4 space-y-2">
              {opinionErrors.map((item) => (
                <div
                  key={`${item.provider}-${item.code}`}
                  className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
                >
                  <strong className="mr-2 uppercase">{item.provider}</strong>
                  {item.message}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {loadingOpinions && <p className="text-sm text-neutral-500">AI 응답 대기 중...</p>}
            {!loadingOpinions && opinions.length === 0 && (
              <p className="text-sm text-neutral-500">아직 저장된 AI 의견이 없습니다.</p>
            )}
            {opinions.map((opinion) => (
              <div key={`${opinion.provider}-${opinion.model}`} className="rounded-2xl border border-neutral-800/60 bg-neutral-950/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      {opinion.provider}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-100">{opinion.model}</p>
                  </div>
                  {opinion.tokens_used && (
                    <span className="text-xs text-neutral-500">{opinion.tokens_used} tokens</span>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-neutral-200">
                  {opinion.response}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Outcome</p>
              <h3 className="mt-2 text-lg font-semibold text-neutral-100">성과 추적</h3>
              <p className="mt-1 text-sm text-neutral-400">1h / 4h / 1d 결과</p>
            </div>
            <button
              type="button"
              onClick={() => selectedId && fetchOutcomes(selectedId)}
              disabled={!selectedId || loadingOutcomes}
              className="text-xs text-neutral-400 underline-offset-4 hover:text-neutral-200"
            >
              Refresh outcomes
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {loadingOutcomes && (
              <div className="col-span-full text-sm text-neutral-500">결과 불러오는 중...</div>
            )}
            {!loadingOutcomes && outcomes.length === 0 && (
              <div className="col-span-full text-sm text-neutral-500">아직 계산된 결과가 없습니다.</div>
            )}
            {outcomes.map((item) => {
              const pnlValue = item.pnl_percent
              const status = pnlValue
                ? Number(pnlValue) > 0
                  ? 'win'
                  : Number(pnlValue) < 0
                    ? 'loss'
                    : 'flat'
                : 'pending'

              const badgeColor =
                status === 'win'
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                  : status === 'loss'
                    ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                    : status === 'flat'
                      ? 'border-slate-400/40 bg-slate-500/10 text-slate-200'
                      : 'border-neutral-700 bg-neutral-900 text-neutral-400'

              return (
                <div
                  key={item.period}
                  className="rounded-xl border border-neutral-800/70 bg-neutral-950/40 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{item.period}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${badgeColor}`}>
                      {status === 'pending' ? 'Pending' : `${pnlValue}%`}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-neutral-400">
                    <p>Reference: {item.reference_price}</p>
                    <p>Outcome: {item.outcome_price ?? '—'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Similar</p>
              <h3 className="mt-2 text-lg font-semibold text-neutral-100">유사 상황</h3>
              <p className="mt-1 text-sm text-neutral-400">현재 버블과 태그가 겹치는 과거 기록</p>
            </div>
            <button
              type="button"
              onClick={() => selectedId && fetchSimilar(selectedId)}
              disabled={!selectedId || loadingSimilar}
              className="text-xs text-neutral-400 underline-offset-4 hover:text-neutral-200"
            >
              Refresh similar
            </button>
          </div>

          {loadingSimilar && (
            <div className="mt-4 text-sm text-neutral-500">유사 상황을 불러오는 중...</div>
          )}

          {!loadingSimilar && similarSummary && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Wins</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-200">{similarSummary.wins}</p>
              </div>
              <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Losses</p>
                <p className="mt-2 text-2xl font-semibold text-rose-200">{similarSummary.losses}</p>
              </div>
              <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Avg PnL</p>
                <p className="mt-2 text-2xl font-semibold text-neutral-100">
                  {similarSummary.avg_pnl ? `${similarSummary.avg_pnl}%` : '—'}
                </p>
              </div>
            </div>
          )}

          {!loadingSimilar && similarItems.length === 0 && (
            <p className="mt-4 text-sm text-neutral-500">유사한 버블이 없습니다.</p>
          )}

          <div className="mt-4 space-y-3">
            {similarItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-neutral-800/70 bg-neutral-950/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-100">
                      {item.symbol} · {item.timeframe}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {new Date(item.candle_time).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">{item.bubble_type}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                  <span>Price: {item.price}</span>
                  {item.outcome?.pnl_percent && (
                    <span className="rounded-full border border-neutral-700 px-2 py-0.5">
                      {item.outcome.pnl_percent}%
                    </span>
                  )}
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-400">
                    {item.tags.map((tag) => (
                      <span key={`${item.id}-${tag}`} className="rounded-full border border-neutral-700 px-2 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
