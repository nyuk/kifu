'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBubbleStore, type AgentResponse } from '../lib/bubbleStore'
import { fetchAiOpinion } from '../lib/mockAi'
import { buildEvidencePacket, describeEvidencePacket, type EvidencePacket } from '../lib/evidencePacket'
import { parseAiSections, toneClass } from '../lib/aiResponseFormat'
import { api } from '../lib/api'


type BubbleCreateModalProps = {
  open: boolean
  symbol: string
  defaultTimeframe: string
  defaultPrice?: string
  defaultTime?: number // epoch ms
  disableAi?: boolean
  onClose: () => void
  onCreated?: () => void
}

const timeframes = ['1m', '15m', '1h', '4h', '1d']

const inferAssetClass = (value: string) => {
  const symbol = value.trim().toUpperCase()
  if (!symbol) return 'crypto' as const
  if (/^\d{5,6}$/.test(symbol)) return 'stock' as const
  if (symbol.endsWith('USDT') || symbol.endsWith('USDC') || symbol.endsWith('USD')) return 'crypto' as const
  if (symbol.endsWith('BTC') || symbol.endsWith('ETH')) return 'crypto' as const
  return 'crypto' as const
}

export function BubbleCreateModal({
  open,
  symbol,
  defaultTimeframe,
  defaultPrice,
  defaultTime,
  disableAi = false,
  onClose,
  onCreated,
}: BubbleCreateModalProps) {

  const [timeframe, setTimeframe] = useState(defaultTimeframe)
  const [candleTime, setCandleTime] = useState('')
  const [price, setPrice] = useState(defaultPrice || '')
  const [memo, setMemo] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [assetClass, setAssetClass] = useState<'crypto' | 'stock'>('crypto')
  const [venueName, setVenueName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AgentResponse | null>(null)
  const [promptType, setPromptType] = useState<'brief' | 'detailed' | 'technical'>('brief')
  const [includeEvidence, setIncludeEvidence] = useState(false)
  const [includePositions, setIncludePositions] = useState(true)
  const [includeRecentTrades, setIncludeRecentTrades] = useState(true)
  const [includeSummary, setIncludeSummary] = useState(true)
  const [evidencePacket, setEvidencePacket] = useState<EvidencePacket | null>(null)
  const [evidencePreview, setEvidencePreview] = useState<string[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState('')

  const aiSections = useMemo(() => {
    if (!aiResponse?.response) return []
    return parseAiSections(aiResponse.response)
  }, [aiResponse])

  useEffect(() => {
    if (!open) return
    setTimeframe(timeframes.includes(defaultTimeframe) ? defaultTimeframe : '1h')
    setPrice(defaultPrice || '')
    setMemo('')
    setTagsInput('')
    setAssetClass(inferAssetClass(symbol))
    setVenueName('')
    setError('')
    setAiResponse(null)
    setAiLoading(false)
    setPromptType('brief')
    setIncludeEvidence(false)
    setIncludePositions(true)
    setIncludeRecentTrades(true)
    setIncludeSummary(true)
    setEvidencePacket(null)
    setEvidencePreview([])
    setEvidenceLoading(false)
    setEvidenceError('')

    // Use defaultTime if provided, otherwise now
    const initialDate = defaultTime ? new Date(defaultTime) : new Date()
    setCandleTime(formatLocalDateTime(initialDate))
  }, [open, defaultPrice, defaultTimeframe, defaultTime])

  useEffect(() => {
    if (!includeEvidence && !includePositions) {
      setEvidencePacket(null)
      setEvidencePreview([])
      setEvidenceError('')
    }
  }, [includeEvidence, includePositions])

  useEffect(() => {
    if (!includeEvidence && !includePositions) return
    setEvidencePacket(null)
    setEvidencePreview([])
  }, [includeEvidence, includePositions, includeRecentTrades, includeSummary, symbol, timeframe])

  const tags = useMemo(() => {
    return tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }, [tagsInput])

  const createBubbleRemote = useBubbleStore((state) => state.createBubbleRemote)
  const updateBubble = useBubbleStore((state) => state.updateBubble)

  const handleAskAi = async () => {
    if (disableAi) {
      setError('게스트 모드에서는 AI 의견 요청이 비활성화됩니다.')
      return
    }
    if (!price || !symbol) return
    setAiLoading(true)
    setEvidenceError('')
    try {
      let packet: EvidencePacket | null = null
      const shouldBuildPacket = includeEvidence || includePositions
      if (shouldBuildPacket) {
        setEvidenceLoading(true)
        try {
          packet = await buildEvidencePacket({
            symbol,
            timeframe,
            includePositions,
            includeRecentTrades: includeEvidence ? includeRecentTrades : false,
            includeSummary: includeEvidence ? includeSummary : false,
          })
          if (packet) {
            setEvidencePacket(packet)
            setEvidencePreview(describeEvidencePacket(packet))
          }
        } catch (err) {
          console.error(err)
          setEvidenceError('증거 패킷을 구성하지 못했습니다.')
        } finally {
          setEvidenceLoading(false)
        }
      }
      const response = await fetchAiOpinion(symbol, timeframe, parseFloat(price), promptType, packet)
      setAiResponse(response)
      // Auto-append recommendation to note if empty
      if (!memo) {
        setMemo(response.response)
      }
    } catch (e: any) {
      const detail = e?.response?.data?.message
      const hint = detail?.includes('openai error 502')
        ? '일시적인 오류입니다. 잠시 후 다시 시도해주세요.'
        : detail
          ? `AI 의견을 가져오는데 실패했습니다. (${detail})`
          : 'AI 의견을 가져오는데 실패했습니다.'
      setError(hint)
    } finally {
      setAiLoading(false)
    }
  }

  const handleBuildEvidencePreview = async () => {
    if (disableAi) {
      setEvidenceError('게스트 모드에서는 증거 패킷을 사용할 수 없습니다.')
      return
    }
    if (!includeEvidence && !includePositions) return
    setEvidenceLoading(true)
    setEvidenceError('')
    try {
      const packet = await buildEvidencePacket({
        symbol,
        timeframe,
        includePositions,
        includeRecentTrades: includeEvidence ? includeRecentTrades : false,
        includeSummary: includeEvidence ? includeSummary : false,
      })
      if (packet) {
        setEvidencePacket(packet)
        setEvidencePreview(describeEvidencePacket(packet))
      }
    } catch (err) {
      console.error(err)
      setEvidenceError('증거 패킷을 구성하지 못했습니다.')
    } finally {
      setEvidenceLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!symbol) {
      setError('심볼이 선택되지 않았습니다.')
      return
    }
    if (!candleTime) {
      setError('캔들 시간을 입력해주세요.')
      return
    }
    if (!price.trim()) {
      setError('가격을 입력해주세요.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      const bubble = await createBubbleRemote({
        symbol,
        timeframe,
        candle_time: new Date(candleTime).toISOString(),
        price: price.trim(),
        memo: memo.trim(),
        tags,
        asset_class: assetClass,
        venue_name: venueName.trim() || undefined,
      })

      if (aiResponse) {
        updateBubble(bubble.id, { agents: [aiResponse], note: memo.trim(), tags })
        try {
          await api.post('/v1/notes', {
            bubble_id: bubble.id,
            title: 'AI 복기 요약',
            content: aiResponse.response,
            tags: ['ai', 'one-shot', promptType, symbol.toUpperCase()],
            lesson_learned: 'AI 요약을 참고하되 최종 판단은 본인이 결정.',
            emotion: 'uncertain',
          })
        } catch (noteError) {
          console.error('Failed to save AI review note:', noteError)
        }
      }

      onCreated?.()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError('버블 생성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="w-full max-w-xl max-h-[90vh] overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-xl">
        <div className="border-b border-neutral-800 px-6 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Bubble</p>
          <h3 className="mt-2 text-xl font-semibold">새 말풍선 기록</h3>
          <p className="mt-1 text-sm text-neutral-400">
            {symbol} · {timeframe}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5 pr-4">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-neutral-300">
              Timeframe
              <select
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              >
                {timeframes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-neutral-300">
              Candle Time
              <input
                type="datetime-local"
                value={candleTime}
                onChange={(event) => setCandleTime(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          </div>
          <label className="text-sm text-neutral-300">
            Price
            <input
              type="text"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              placeholder="예: 104800"
            />
          </label>
          <label className="text-sm text-neutral-300">
            Memo
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              placeholder="진입 근거, 심리 상태 등을 기록하세요."
            />
          </label>
          <label className="text-sm text-neutral-300">
            Tags (comma separated)
            <input
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              placeholder="breakout, fomo"
            />
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-400">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-neutral-700 px-2 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-neutral-300">
              Asset Class
              <select
                value={assetClass}
                onChange={(event) => setAssetClass(event.target.value as 'crypto' | 'stock')}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              >
                <option value="crypto">Crypto</option>
                <option value="stock">Stock</option>
              </select>
            </label>
            <label className="text-sm text-neutral-300">
              Venue
              <input
                type="text"
                value={venueName}
                onChange={(event) => setVenueName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
                placeholder="binance, upbit, kis"
              />
            </label>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">AI Insight</span>
              {!aiResponse && (
                <div className="flex items-center gap-2">
                  <select
                    value={promptType}
                    onChange={(e) => setPromptType(e.target.value as any)}
                    disabled={aiLoading}
                    className="rounded bg-neutral-950 border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
                  >
                    <option value="brief">Brief</option>
                    <option value="detailed">Detailed</option>
                    <option value="technical">Technical</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAskAi}
                    disabled={aiLoading || !price || disableAi}
                    className="rounded px-2 py-1 text-xs font-semibold text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 disabled:opacity-50"
                  >
                    {disableAi ? '멤버 전용' : aiLoading ? 'Analyzing...' : 'Ask AI'}
                  </button>
                </div>
              )}
            </div>
            {disableAi && !aiResponse && (
              <p className="mt-2 text-[11px] text-neutral-500">
                AI 분석 요청은 회원 전용 기능입니다.
              </p>
            )}
            {aiResponse && (
              <div className="mt-2 space-y-2">
                {aiSections.length > 0 ? (
                  aiSections.map((section) => (
                    <div
                      key={`${section.title}-${section.body.slice(0, 16)}`}
                      className={`rounded-lg border px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${toneClass(section.tone)}`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">{section.title}</p>
                      <p className="mt-1 text-xs text-inherit whitespace-pre-wrap">{section.body}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-neutral-800/70 bg-neutral-950/70 px-3 py-2 text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {aiResponse.response}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Evidence Packet</p>
                <p className="text-[11px] text-neutral-500">일회성 분석 패킷 · 서버에 저장되지 않습니다.</p>
                <p className="text-[11px] text-neutral-500">포지션 포함은 별도 선택 가능합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setIncludeEvidence((prev) => !prev)}
                disabled={disableAi}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  includeEvidence
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                    : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                } ${disableAi ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {includeEvidence ? '거래/요약 포함' : '거래/요약 제외'}
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs text-neutral-300">
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includePositions}
                    onChange={(event) => setIncludePositions(event.target.checked)}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                  />
                  현재 포지션 포함
                </label>
                <label className={`flex items-center gap-2 ${includeEvidence ? '' : 'opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={includeRecentTrades}
                    onChange={(event) => setIncludeRecentTrades(event.target.checked)}
                    disabled={!includeEvidence}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                  />
                  최근 체결 10건
                </label>
                <label className={`flex items-center gap-2 ${includeEvidence ? '' : 'opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(event) => setIncludeSummary(event.target.checked)}
                    disabled={!includeEvidence}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                  />
                  최근 7일 요약
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBuildEvidencePreview}
                  disabled={evidenceLoading || (!includeEvidence && !includePositions)}
                  className="rounded border border-neutral-700 px-2 py-1 text-[11px] font-semibold text-neutral-200 hover:border-neutral-500 disabled:opacity-60"
                >
                  {evidenceLoading ? '준비 중...' : '패킷 미리보기'}
                </button>
                {evidencePacket && (
                  <span className="text-[11px] text-emerald-200">패킷 준비 완료</span>
                )}
              </div>

              {evidenceError && (
                <p className="rounded border border-rose-400/40 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200">
                  {evidenceError}
                </p>
              )}

              {evidencePreview.length > 0 && (
                <div className="rounded border border-neutral-800/70 bg-neutral-950/70 px-3 py-2 text-[11px] text-neutral-400">
                  {evidencePreview.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '저장 중...' : '버블 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatLocalDateTime(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}
