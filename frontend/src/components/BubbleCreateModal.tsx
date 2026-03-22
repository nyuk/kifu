'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBubbleStore, type AgentResponse } from '../lib/bubbleStore'
import {
  activeAiProviders,
  fetchAiOpinions,
  optionalAiProviders,
  primaryAiProviders,
  type AiBatchError,
  type AiProvider,
} from '../lib/mockAi'
import { buildEvidencePacket, describeEvidencePacket, type EvidencePacket } from '../lib/evidencePacket'
import { parseAiSections, toneClass } from '../lib/aiResponseFormat'
import { api } from '../lib/api'
import { isDemoMode } from '../lib/appMode'


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

function mapAiErrorMessage(err: any) {
  const batchErrors = Array.isArray(err?.errors) ? (err.errors as AiBatchError[]) : []
  if (batchErrors.length > 0) {
    return batchErrors.map((item) => formatProviderFailure(item.provider, item.message, item.status, item.code)).join(' · ')
  }

  const status = err?.response?.status
  const code = String(err?.response?.data?.code || '').toUpperCase()
  const detail = String(err?.response?.data?.message || err?.message || '').toLowerCase()

  if (status === 403 && code === 'ALLOWLIST_REQUIRED') {
    return '현재 버전은 초대받은 사용자만 AI 의견 수집을 사용할 수 있습니다.'
  }
  if (status === 429 && code === 'BETA_CAP_EXCEEDED') {
    return '호출 한도에 도달했습니다. 잠시 후 다시 시도하거나 쿼터/요금제를 확인하세요.'
  }
  if (status === 401 || detail.includes('insufficient permissions') || detail.includes('missing scopes')) {
    return 'AI 권한이 부족합니다. API 키 권한과 프로젝트 스코프를 확인해 주세요.'
  }
  if (status === 429 || detail.includes('quota') || detail.includes('rate limit') || detail.includes('too many')) {
    return '호출 한도에 도달했습니다. 어떤 provider가 문제인지 아래 에러 문구를 확인해 주세요.'
  }
  if (status === 502 || status === 503 || detail.includes('bad gateway') || detail.includes('temporar')) {
    return 'AI 서버 응답이 불안정합니다. 잠시 후 다시 시도해 주세요.'
  }
  if (detail.includes('network error') || status === 0) {
    return '네트워크 연결 문제입니다. 백엔드 실행 상태와 API 주소를 확인해 주세요.'
  }
  if (status === 400) {
    return `요청 형식 오류입니다. 입력값과 패킷 범위를 확인해 주세요. (${err?.response?.data?.message || 'bad request'})`
  }

  const raw = err?.response?.data?.message
  if (raw) return `AI 요청 실패: ${raw}`
  return 'AI 요청에 실패했습니다. 다시 시도해 주세요.'
}

function isRetryableAiError(err: any): boolean {
  const status = err?.response?.status
  const detail = String(err?.response?.data?.message || err?.message || '').toLowerCase()

  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true
  return detail.includes('temporar') || detail.includes('network error') || detail.includes('timeout') || status === 0
}

function buildRetryBackoff(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 4000)
}

function formatProviderLabel(provider: string) {
  const normalized = provider.trim().toLowerCase()
  if (normalized === 'openai') return 'ChatGPT'
  if (normalized === 'claude') return 'Claude'
  if (normalized === 'gemini') return 'Gemini'
  return provider
}

function formatAiResponsesForNote(responses: AgentResponse[]) {
  return responses
    .map((item) => `## ${formatProviderLabel(item.provider)}\n${item.response}`)
    .join('\n\n')
}

function formatProviderFailure(provider: string, message: string, status?: number, code?: string) {
  const normalized = message
    .replace(/^provider invocation failed:\s*/i, '')
    .replace(/^request failed:\s*/i, '')
    .trim()

  const lower = normalized.toLowerCase()
  const normalizedCode = String(code || '').toUpperCase()
  let reason = normalized || '요청 실패'

  if (status === 429 || lower.includes('quota') || lower.includes('rate limit') || lower.includes('too many')) {
    reason = '호출 한도 또는 요금제 한도에 도달했습니다.'
  } else if (status === 401 || normalizedCode === 'INVALID_API_KEY' || lower.includes('invalid api key') || lower.includes('incorrect api key')) {
    reason = 'API 키가 올바르지 않거나 현재 provider 설정과 맞지 않습니다.'
  } else if (status === 403 || lower.includes('permission') || lower.includes('scope')) {
    reason = '권한 또는 스코프 설정이 부족합니다.'
  } else if (status === 404 || lower.includes('not found') || lower.includes('model')) {
    reason = '지원되지 않는 모델이거나 모델 설정이 맞지 않습니다.'
  } else if (status === 502 || status === 503 || status === 504 || lower.includes('bad gateway') || lower.includes('temporar') || lower.includes('timeout')) {
    reason = '일시적인 서버 응답 문제입니다.'
  } else if (lower.includes('network error')) {
    reason = '네트워크 연결 문제입니다.'
  }

  return `${formatProviderLabel(provider)} 문제: ${reason}`
}

function formatBubbleSaveError(err: any) {
  const status = err?.response?.status
  const code = String(err?.response?.data?.code || '').toUpperCase()
  const detail = String(err?.response?.data?.message || err?.message || '').trim()

  if (status === 400 && code === 'INVALID_SYMBOL') {
    return '현재 종목 형식으로는 저장할 수 없습니다. 종목 표기를 다시 확인해 주세요.'
  }
  if (status === 400 && code === 'INVALID_TAGS') {
    return `태그 형식이 올바르지 않습니다. (${detail || '영문/숫자/_/-만 사용, 최대 5개'})`
  }
  if (status === 400 && detail) {
    return `버블 저장 형식 오류입니다. (${detail})`
  }
  if (detail) return `버블 저장에 실패했습니다. (${detail})`
  return '버블 저장에 실패했습니다.'
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
  const [aiRetryAttempt, setAiRetryAttempt] = useState(0)
  const [aiResponses, setAiResponses] = useState<AgentResponse[]>([])
  const [aiError, setAiError] = useState('')
  const [promptType, setPromptType] = useState<'brief' | 'detailed' | 'technical'>('brief')
  const [includeEvidence, setIncludeEvidence] = useState(true)
  const [includePositions, setIncludePositions] = useState(true)
  const [includeRecentTrades, setIncludeRecentTrades] = useState(true)
  const [includeSummary, setIncludeSummary] = useState(true)
  const [includeBubbles, setIncludeBubbles] = useState(true)
  const [packetPreset, setPacketPreset] = useState<'lite' | 'balanced' | 'deep'>('balanced')
  const [showPacketAdvanced, setShowPacketAdvanced] = useState(false)
  const [evidenceScope, setEvidenceScope] = useState<'7d' | '30d' | '90d' | 'custom'>('7d')
  const [evidenceFrom, setEvidenceFrom] = useState('')
  const [evidenceTo, setEvidenceTo] = useState('')
  const [evidenceSymbolScope, setEvidenceSymbolScope] = useState<'current' | 'all'>('current')
  const [bubbleLimit, setBubbleLimit] = useState(6)
  const [bubbleTagsInput, setBubbleTagsInput] = useState('')
  const [bubbleTagsEdited, setBubbleTagsEdited] = useState(false)
  const [evidencePacket, setEvidencePacket] = useState<EvidencePacket | null>(null)
  const [evidencePreview, setEvidencePreview] = useState<string[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState('')

  const primaryAiResponse = aiResponses[0] ?? null

  const aiSections = useMemo(() => {
    if (!primaryAiResponse?.response) return []
    return parseAiSections(primaryAiResponse.response)
  }, [primaryAiResponse])

  const hasGeminiResponse = aiResponses.some((response) => response.provider === 'gemini')

  const mergeAiResponses = (previous: AgentResponse[], incoming: AgentResponse[]) => {
    const nextByProvider = new Map<string, AgentResponse>()
    for (const response of previous) {
      nextByProvider.set(response.provider, response)
    }
    for (const response of incoming) {
      nextByProvider.set(response.provider, response)
    }
    const orderedProviders = [...primaryAiProviders, ...optionalAiProviders]
    const ordered = orderedProviders
      .map((provider) => nextByProvider.get(provider))
      .filter((response): response is AgentResponse => Boolean(response))
    const extras = Array.from(nextByProvider.values()).filter((response) => !orderedProviders.includes(response.provider as AiProvider))
    return [...ordered, ...extras]
  }

  useEffect(() => {
    if (!open) return
    setTimeframe(timeframes.includes(defaultTimeframe) ? defaultTimeframe : '1h')
    setPrice(defaultPrice || '')
    setMemo('')
    setTagsInput('')
    setAssetClass(inferAssetClass(symbol))
    setVenueName('')
    setError('')
    setAiResponses([])
    setAiError('')
    setAiLoading(false)
    setPromptType('brief')
    setIncludeEvidence(true)
    setIncludePositions(true)
    setIncludeRecentTrades(true)
    setIncludeSummary(true)
    setIncludeBubbles(true)
    setPacketPreset('balanced')
    setShowPacketAdvanced(false)
    setEvidenceScope('7d')
    setEvidenceFrom('')
    setEvidenceTo('')
    setEvidenceSymbolScope('current')
    setBubbleLimit(6)
    setBubbleTagsInput('')
    setBubbleTagsEdited(false)
    setEvidencePacket(null)
    setEvidencePreview([])
    setEvidenceLoading(false)
    setEvidenceError('')

    // Use defaultTime if provided, otherwise now
    const initialDate = defaultTime ? new Date(defaultTime) : new Date()
    setCandleTime(formatLocalDateTime(initialDate))
  }, [open, defaultPrice, defaultTimeframe, defaultTime])

  useEffect(() => {
    if (!open) return
    if (!bubbleTagsEdited) {
      setBubbleTagsInput(tagsInput)
    }
  }, [open, tagsInput, bubbleTagsEdited])

  useEffect(() => {
    if (!includeEvidence && !includePositions) {
      setEvidencePacket(null)
      setEvidencePreview([])
      setEvidenceError('')
    }
  }, [includeEvidence, includePositions])

  useEffect(() => {
    if (includeRecentTrades || includeSummary || includeBubbles) {
      setIncludeEvidence(true)
    }
  }, [includeRecentTrades, includeSummary, includeBubbles])

  useEffect(() => {
    if (packetPreset === 'lite') {
      setIncludeEvidence(true)
      setIncludePositions(true)
      setIncludeRecentTrades(false)
      setIncludeSummary(true)
      setIncludeBubbles(false)
      setEvidenceScope('7d')
      setEvidenceSymbolScope('current')
      setBubbleLimit(4)
      return
    }
    if (packetPreset === 'balanced') {
      setIncludeEvidence(true)
      setIncludePositions(true)
      setIncludeRecentTrades(true)
      setIncludeSummary(true)
      setIncludeBubbles(true)
      setEvidenceScope('30d')
      setEvidenceSymbolScope('current')
      setBubbleLimit(6)
      return
    }
    setIncludeEvidence(true)
    setIncludePositions(true)
    setIncludeRecentTrades(true)
    setIncludeSummary(true)
    setIncludeBubbles(true)
    setEvidenceScope('90d')
    setEvidenceSymbolScope('all')
    setBubbleLimit(10)
  }, [packetPreset])

  useEffect(() => {
    if (!includeEvidence && !includePositions && !includeBubbles) return
    setEvidencePacket(null)
    setEvidencePreview([])
  }, [includeEvidence, includePositions, includeRecentTrades, includeSummary, includeBubbles, symbol, timeframe, evidenceScope, evidenceFrom, evidenceTo, evidenceSymbolScope, bubbleLimit, bubbleTagsInput])

  const tags = useMemo(() => {
    return tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }, [tagsInput])

  const packetSummaryText = useMemo(() => {
    const parts: string[] = []
    parts.push(packetPreset === 'lite' ? '라이트' : packetPreset === 'balanced' ? '균형' : '딥')
    parts.push(evidenceScope === 'custom' ? '직접 선택' : evidenceScope)
    parts.push(evidenceSymbolScope === 'current' ? '현재 종목' : '전체 종목')
    if (includePositions) parts.push('포지션')
    if (includeEvidence && includeRecentTrades) parts.push('체결')
    if (includeEvidence && includeSummary) parts.push('요약')
    if (includeEvidence && includeBubbles) parts.push(`버블 ${bubbleLimit}개`)
    return parts.join(' · ')
  }, [packetPreset, evidenceScope, evidenceSymbolScope, includePositions, includeEvidence, includeRecentTrades, includeSummary, includeBubbles, bubbleLimit])

  const bubbleTags = useMemo(() => {
    return bubbleTagsInput
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  }, [bubbleTagsInput])

  const evidenceRange = useMemo(() => {
    if (evidenceScope !== 'custom') {
      const days = evidenceScope === '30d' ? 30 : evidenceScope === '90d' ? 90 : 7
      const to = new Date()
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    if (!evidenceFrom && !evidenceTo) return null
    const from = evidenceFrom ? new Date(`${evidenceFrom}T00:00:00`) : null
    const to = evidenceTo ? new Date(`${evidenceTo}T23:59:59`) : null
    return {
      from: from ? from.toISOString() : undefined,
      to: to ? to.toISOString() : undefined,
    }
  }, [evidenceScope, evidenceFrom, evidenceTo])

  const createBubbleRemote = useBubbleStore((state) => state.createBubbleRemote)
  const updateBubble = useBubbleStore((state) => state.updateBubble)
  const aiDisabled = disableAi && !isDemoMode

  const MAX_AI_RETRIES = 2

  const handleAskAi = async (providers: readonly AiProvider[] = primaryAiProviders, mergeMode: 'replace' | 'append' = 'replace') => {
    if (aiDisabled) {
      setAiError('\uac8c\uc2a4\ud2b8 \ubaa8\ub4dc\uc5d0\uc11c\ub294 AI \uc758\uacac \uc694\uccad\uc774 \ube44\ud65c\uc131\ud654\ub429\ub2c8\ub2e4.')
      return
    }
    if (!price || !symbol) return
    setAiLoading(true)
    setAiError('')
    setAiRetryAttempt(0)
    setEvidenceError('')
    const finalPrice = parseFloat(price)
    try {
      let packet: EvidencePacket | null = null
      const shouldBuildPacket = includeEvidence || includePositions || includeBubbles
      if (shouldBuildPacket && !isDemoMode) {
        setEvidenceLoading(true)
        try {
          const symbolForEvidence = evidenceSymbolScope === 'current' ? symbol : ''
          packet = await buildEvidencePacket({
            symbol: symbolForEvidence,
            timeframe,
            includePositions,
            includeRecentTrades: includeEvidence ? includeRecentTrades : false,
            includeSummary: includeEvidence ? includeSummary : false,
            includeBubbles: includeEvidence ? includeBubbles : false,
            rangeFrom: evidenceRange?.from,
            rangeTo: evidenceRange?.to,
            bubbleLimit,
            bubbleTags,
          })
          if (packet) {
            setEvidencePacket(packet)
            setEvidencePreview(describeEvidencePacket(packet))
          }
        } catch (err) {
          console.error(err)
          setEvidenceError('\uc99d\uac70 \ud328\ud0b7\uc744 \uad6c\uc131\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.')
          } finally {
            setEvidenceLoading(false)
          }
      }

      let lastError: unknown = null
      for (let attempt = 0; attempt < MAX_AI_RETRIES + 1; attempt += 1) {
        if (attempt > 0) {
          setAiRetryAttempt(attempt)
        }
        try {
          const result = await fetchAiOpinions(symbol, timeframe, finalPrice, promptType, packet, { memo, tags }, providers)
          setAiResponses((previous) => (mergeMode === 'append' ? mergeAiResponses(previous, result.responses) : result.responses))
          if (result.errors.length > 0) {
            const partial = result.errors.map((item) => formatProviderFailure(item.provider, item.message, item.status, item.code)).join(' · ')
            setAiError(`\uc77c\ubd80 \uc758\uacac\ub9cc \uc218\uc9d1\ud588\uc2b5\ub2c8\ub2e4. ${partial}`)
          } else {
            setAiError('')
          }
          setAiRetryAttempt(0)
          if (!memo && mergeMode === 'replace') {
            setMemo(result.responses[0]?.response || '')
          }
          return
        } catch (e: any) {
          lastError = e
          if (isRetryableAiError(e) && attempt < MAX_AI_RETRIES) {
            const nextAttemptLabel = attempt + 1
            setAiError(`\uc77c\uc2dc\uc801 \uc624\ub958\ub85c \uc778\ud574 \uc7ac\uc2dc\ub3c4 \uc911\uc785\ub2c8\ub2e4. (${nextAttemptLabel}/${MAX_AI_RETRIES})`)
            await new Promise((resolve) => setTimeout(resolve, buildRetryBackoff(attempt)))
            continue
          }
          throw e
        }
      }
      if (lastError) throw lastError
    } catch (e: any) {
      setAiError(mapAiErrorMessage(e))
      setAiRetryAttempt(0)
    } finally {
      setAiLoading(false)
    }
  }

  const handleBuildEvidencePreview = async () => {
    if (aiDisabled) {
      setEvidenceError('\uac8c\uc2a4\ud2b8 \ubaa8\ub4dc\uc5d0\uc11c\ub294 \uc99d\uac70 \ud328\ud0b7\uc744 \uc0ac\uc6a9\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.')
      return
    }
    if (isDemoMode) {
      setEvidenceError('\ub370\ubaa8 \ubaa8\ub4dc\uc5d0\uc11c\ub294 \uc99d\uac70 \ud328\ud0b7 \ubbf8\ub9ac\ubcf4\uae30\uac00 \ube44\ud65c\uc131\ud654\ub429\ub2c8\ub2e4.')
      return
    }
    if (!includeEvidence && !includePositions && !includeBubbles) return
    setEvidenceLoading(true)
    setEvidenceError('')
    try {
      const symbolForEvidence = evidenceSymbolScope === 'current' ? symbol : ''
      const packet = await buildEvidencePacket({
        symbol: symbolForEvidence,
        timeframe,
        includePositions,
        includeRecentTrades: includeEvidence ? includeRecentTrades : false,
        includeSummary: includeEvidence ? includeSummary : false,
        includeBubbles: includeEvidence ? includeBubbles : false,
        rangeFrom: evidenceRange?.from,
        rangeTo: evidenceRange?.to,
        bubbleLimit,
        bubbleTags,
      })
      if (packet) {
        setEvidencePacket(packet)
        setEvidencePreview(describeEvidencePacket(packet))
      }
    } catch (err) {
      console.error(err)
      setEvidenceError('\uc99d\uac70 \ud328\ud0b7\uc744 \uad6c\uc131\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.')
    } finally {
      setEvidenceLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!symbol) {
      setError('\uc885\ubaa9\uc744 \uc120\ud0dd\ud574 \uc8fc\uc138\uc694.')
      return
    }
    if (!candleTime) {
      setError('\uce94\ub4e4 \uc2dc\uac04\uc744 \uc785\ub825\ud574 \uc8fc\uc138\uc694.')
      return
    }
    if (!price.trim()) {
      setError('\uac00\uaca9\uc744 \uc785\ub825\ud574 \uc8fc\uc138\uc694.')
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

      if (aiResponses.length > 0) {
        updateBubble(bubble.id, { agents: aiResponses, note: memo.trim(), tags })
        try {
          await api.post('/v1/notes', {
            bubble_id: bubble.id,
            title: '\u0041\u0049 \ubcf5\uae30 \uc694\uc57d',
            content: formatAiResponsesForNote(aiResponses),
            tags: ['ai', 'one-shot', promptType, symbol.toUpperCase()],
            lesson_learned: '\u0041\u0049 \uc694\uc57d\uc744 \ucc38\uace0\ud558\ub418 \ucd5c\uc885 \ud310\ub2e8\uc740 \ubcf8\uc778\uc774 \uacb0\uc815\ud569\ub2c8\ub2e4.',
            emotion: 'uncertain',
          })
        } catch (noteError) {
          console.error('Failed to save AI review note:', noteError)
        }
      }

      try {
        const stamp = new Date().toISOString()
        localStorage.setItem('kifu-portfolio-refresh', stamp)
        window.dispatchEvent(new CustomEvent('kifu-portfolio-refresh', { detail: { at: stamp } }))
      } catch {
        // Ignore local refresh fan-out issues; bubble creation already succeeded.
      }

      onCreated?.()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(formatBubbleSaveError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/75 px-2 py-2 lg:px-4 lg:py-4">
      <div className="mx-auto flex h-full w-full max-w-[1860px] flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-neutral-950/95 text-neutral-100 shadow-2xl backdrop-blur-md">
        <div className="border-b border-white/[0.08] px-6 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">BUBBLE</p>
          <h3 className="mt-2 text-2xl font-semibold">{'\uc0c8 \ub9d0\ud48d\uc120 \uae30\ub85d'}</h3>
          <p className="mt-2 text-base text-neutral-400">
            {symbol} {'\u00b7'} {timeframe}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden px-6 py-4 xl:grid-cols-[minmax(520px,0.88fr)_minmax(780px,1.12fr)] xl:grid-rows-[minmax(0,1fr)_auto]">
          <div className="min-h-0 space-y-4 overflow-y-auto pr-2 xl:pr-4">
          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-base text-red-200">
              {error}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-base font-medium text-neutral-300">
              시간 구간
              <select
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-2.5 text-base text-neutral-100"
              >
                {timeframes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-base font-medium text-neutral-300">
              캔들 시각
              <input
                type="datetime-local"
                value={candleTime}
                onChange={(event) => setCandleTime(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-2.5 text-base text-neutral-100"
              />
            </label>
          </div>
          <label className="text-base font-medium text-neutral-300">
            가격
            <input
              type="text"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-2.5 text-base text-neutral-100"
              placeholder={'\uc608: 104800'}
            />
          </label>
          <label className="text-base font-medium text-neutral-300">
            메모
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-2.5 text-base leading-7 text-neutral-100"
              placeholder={'\uc9c4\uc785 \uadfc\uac70, \uc2ec\ub9ac \uc0c1\ud0dc \ub4f1\uc744 \uae30\ub85d\ud574 \ubcf4\uc138\uc694.'}
            />
          </label>
          <label className="text-base font-medium text-neutral-300">
            태그 (쉼표 구분)
            <input
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-2.5 text-base text-neutral-100"
              placeholder="breakout, fomo"
            />
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-neutral-400">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/[0.08] px-3 py-1">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-base font-medium text-neutral-300">
              자산 분류
              <select
                value={assetClass}
                onChange={(event) => setAssetClass(event.target.value as 'crypto' | 'stock')}
                className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-2.5 text-base text-neutral-100"
              >
                <option value="crypto">Crypto</option>
                <option value="stock">Stock</option>
              </select>
            </label>
            <label className="text-base font-medium text-neutral-300">
              거래소 / 소스
              <input
                type="text"
                value={venueName}
                onChange={(event) => setVenueName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-2.5 text-base text-neutral-100"
                placeholder="binance, upbit, kis"
              />
            </label>
          </div>
          </div>
          <aside className="min-h-0 overflow-y-auto xl:row-span-2 xl:border-l xl:border-white/[0.06] xl:pl-4">
          <div className="flex h-full min-h-[620px] flex-col rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.05] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">AI 의견</span>
              {aiResponses.length === 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={promptType}
                    onChange={(e) => setPromptType(e.target.value as any)}
                    disabled={aiLoading}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-neutral-300"
                  >
                    <option value="brief">빠르게</option>
                    <option value="detailed">자세히</option>
                    <option value="technical">기술적으로</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleAskAi(primaryAiProviders)}
                    disabled={aiLoading || !price || aiDisabled}
                    className="rounded-lg border border-blue-500/30 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/10 disabled:opacity-50"
                  >
                    {aiDisabled ? '멤버만 사용' : aiLoading ? '분석 중...' : isDemoMode ? 'ChatGPT 의견 (데모)' : 'ChatGPT 의견'}
                  </button>
                </div>
              )}
            </div>
            {!aiDisabled && aiResponses.length === 0 && !isDemoMode && optionalAiProviders.length > 0 && (
              <p className="mt-3 text-sm text-neutral-500">
                Gemini는 기본 응답 뒤에 <span className="text-neutral-300">추가 의견</span>으로만 요청합니다.
              </p>
            )}
            {!aiDisabled && aiResponses.length > 0 && !isDemoMode && (
              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => void handleAskAi(optionalAiProviders, 'append')}
                  disabled={aiLoading || !price}
                  className="rounded-lg border border-violet-400/30 px-4 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-500/10 disabled:opacity-50"
                >
                  {aiLoading ? (hasGeminiResponse ? 'Gemini 다시 요청 중...' : '추가 의견 요청 중...') : hasGeminiResponse ? 'Gemini 다시 요청' : 'Gemini 추가 의견'}
                </button>
              </div>
            )}
            {aiError && (
              <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
                {aiRetryAttempt > 0 && (
                  <p className="mb-2 text-sm font-semibold text-rose-200">{'\uc7ac\uc2dc\ub3c4'} {aiRetryAttempt}/{MAX_AI_RETRIES}</p>
                )}
                <p className="text-base leading-7 text-rose-100">{aiError}</p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => void handleAskAi(primaryAiProviders)}
                    disabled={aiLoading || !price || aiDisabled}
                    className="rounded-lg border border-rose-300/50 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-60"
                  >
                    {aiLoading ? '\uc7ac\uc2dc\ub3c4 \uc911...' : '\ub2e4\uc2dc \uc2dc\ub3c4'}
                  </button>
                </div>
              </div>
            )}
            {isDemoMode && aiResponses.length === 0 && (
              <p className="mt-3 text-sm text-cyan-300">
                데모 모드: {activeAiProviders.map(formatProviderLabel).join(', ')} {'\uc0d8\ud50c \uc751\ub2f5\uc744 \ubc18\ud658\ud569\ub2c8\ub2e4.'}
              </p>
            )}
            {aiDisabled && aiResponses.length === 0 && (
              <p className="mt-3 text-sm text-neutral-500">
                {'AI \ubd84\uc11d \uc694\uccad\uc740 \uba64\ubc84 \uc804\uc6a9 \uae30\ub2a5\uc785\ub2c8\ub2e4.'}
              </p>
            )}
            {aiResponses.length > 0 && (
              <div
                className={`mt-3 grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1 ${
                  aiResponses.length >= 3
                    ? 'grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3'
                    : aiResponses.length === 2
                      ? 'grid-cols-1 xl:grid-cols-2'
                      : 'grid-cols-1'
                }`}
              >
                {aiResponses.map((response) => {
                  const sections = response === primaryAiResponse ? aiSections : parseAiSections(response.response)
                  return (
                    <div key={`${response.provider}-${response.created_at}`} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">{formatProviderLabel(response.provider)}</p>
                          <p className="mt-1 text-base text-neutral-500">{response.model}</p>
                        </div>
                      </div>
                      {sections.length > 0 ? (
                        <div className="space-y-3">
                          {sections.map((section, sectionIndex) => (
                            <div
                              key={`${response.provider}-${sectionIndex}-${section.title}-${section.body.slice(0, 16)}`}
                              className={`rounded-xl border px-3 py-3 text-base whitespace-pre-wrap leading-7 ${toneClass(section.tone)}`}
                            >
                              <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-80">{section.title}</p>
                              <p className="mt-2 text-base text-inherit whitespace-pre-wrap leading-7">{section.body || '응답 본문이 비어 있습니다.'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3 text-base text-neutral-300 whitespace-pre-wrap leading-7">
                          {response.response}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          </aside>
          <div className="space-y-4 pr-2 xl:pr-4">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">패킷 미리보기</p>
                <p className="text-sm text-neutral-500">{'\uc77c\ud68c\uc131 \ubd84\uc11d \ud328\ud0b7\uc774\uba70 \uc11c\ubc84\uc5d0 \uc800\uc7a5\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.'}</p>
                <p className="text-sm text-neutral-500">{'\ud3ec\uc9c0\uc158 \ud3ec\ud568\uc740 \ubcc4\ub3c4\ub85c \uc120\ud0dd\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.'}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setIncludeEvidence((prev) => {
                    const next = !prev
                    if (!next) {
                      setIncludeRecentTrades(false)
                      setIncludeSummary(false)
                      setIncludeBubbles(false)
                    } else {
                      setIncludeRecentTrades(true)
                      setIncludeSummary(true)
                      setIncludeBubbles(true)
                    }
                    return next
                  })
                }
                disabled={aiDisabled}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  includeEvidence
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.12]'
                } ${aiDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {includeEvidence ? '\ud328\ud0b7 \ub370\uc774\ud130 \ud3ec\ud568' : '\ud328\ud0b7 \ub370\uc774\ud130 \uc81c\uc678'}
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs text-neutral-300">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">패킷 프리셋</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { value: 'lite', label: '라이트' },
                    { value: 'balanced', label: '균형' },
                    { value: 'deep', label: '딥' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPacketPreset(option.value as 'lite' | 'balanced' | 'deep')}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        packetPreset === option.value
                          ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                          : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.12]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm text-neutral-500">{packetSummaryText}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includePositions}
                    onChange={(event) => setIncludePositions(event.target.checked)}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                  />
                  {'\ud604\uc7ac \ud3ec\uc9c0\uc158 \ud3ec\ud568'}
                </label>
                <label className={`flex items-center gap-2 ${includeEvidence ? '' : 'opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={includeRecentTrades}
                    onChange={(event) => setIncludeRecentTrades(event.target.checked)}
                    disabled={!includeEvidence}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                  />
                  {'\uccb4\uacb0 10\uac74'}
                </label>
                <label className={`flex items-center gap-2 ${includeEvidence ? '' : 'opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(event) => setIncludeSummary(event.target.checked)}
                    disabled={!includeEvidence}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                  />
                  기간 요약
                </label>
                <label className={`flex items-center gap-2 ${includeEvidence ? '' : 'opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={includeBubbles}
                    onChange={(event) => setIncludeBubbles(event.target.checked)}
                    disabled={!includeEvidence}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                  />
                  최근 버블 포함
                </label>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">세부 설정</p>
                <button
                  type="button"
                  onClick={() => setShowPacketAdvanced((prev) => !prev)}
                  className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-white/[0.12]"
                >
                  {showPacketAdvanced ? '접기' : '펼치기'}
                </button>
              </div>

              {showPacketAdvanced && (
                <div className="space-y-4 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">범위 설정</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: '7d', label: '최근 7일' },
                        { value: '30d', label: '30일' },
                        { value: '90d', label: '90일' },
                        { value: 'custom', label: '직접 선택' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setEvidenceScope(option.value as any)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                            evidenceScope === option.value
                              ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                              : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.12]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {evidenceScope === 'custom' && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-sm text-neutral-400">
                        From
                        <input
                          type="date"
                          value={evidenceFrom}
                          onChange={(event) => setEvidenceFrom(event.target.value)}
                          className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-neutral-200"
                        />
                      </label>
                      <label className="text-sm text-neutral-400">
                        To
                        <input
                          type="date"
                          value={evidenceTo}
                          onChange={(event) => setEvidenceTo(event.target.value)}
                          className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-neutral-200"
                        />
                      </label>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
                    <span>종목 범위</span>
                    <button
                      type="button"
                      onClick={() => setEvidenceSymbolScope('current')}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        evidenceSymbolScope === 'current'
                          ? 'border-emerald-300/60 bg-emerald-300/10 text-emerald-200'
                          : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.12]'
                      }`}
                    >
                      현재 종목
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvidenceSymbolScope('all')}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        evidenceSymbolScope === 'all'
                          ? 'border-emerald-300/60 bg-emerald-300/10 text-emerald-200'
                          : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.12]'
                      }`}
                    >
                      전체 종목
                    </button>
                  </div>
                </div>
              )}

              {includeEvidence && includeBubbles && (
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">버블 필터</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1.2fr_0.8fr]">
                    <label className="text-sm text-neutral-400">
                      태그(쉼표 구분)
                      <input
                        type="text"
                        value={bubbleTagsInput}
                        onChange={(event) => {
                          setBubbleTagsInput(event.target.value)
                          setBubbleTagsEdited(true)
                        }}
                        className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-neutral-200"
                        placeholder="breakout, fomo"
                      />
                    </label>
                    <label className="text-sm text-neutral-400">
                      개수
                      <select
                        value={bubbleLimit}
                        onChange={(event) => setBubbleLimit(Number(event.target.value))}
                        className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-neutral-200"
                      >
                        {[4, 6, 10, 20].map((value) => (
                          <option key={value} value={value}>{value}개</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBuildEvidencePreview}
                  disabled={evidenceLoading || (!includeEvidence && !includePositions && !includeBubbles)}
                  className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-semibold text-neutral-200 hover:border-white/[0.12] disabled:opacity-60"
                >
                  {evidenceLoading ? '준비 중...' : '패킷 미리보기'}
                </button>
                {evidencePacket && (
                  <span className="text-sm text-emerald-200">패킷 준비 완료</span>
                )}
              </div>

              {evidenceError && (
                <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {evidenceError}
                </p>
              )}

              {evidencePreview.length > 0 && (
                <div className="rounded-lg border border-white/[0.06] bg-black/30 px-4 py-3 text-sm leading-7 text-neutral-400">
                  {evidencePreview.map((line, lineIndex) => (
                    <p key={`${lineIndex}-${line}`}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          </div>
          </div>
          <div className="border-t border-white/[0.08] bg-black/30 px-6 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-base font-semibold text-neutral-200 hover:border-white/[0.12]"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-neutral-100 px-5 py-2.5 text-base font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? '저장 중...' : '버블 저장'}
              </button>
            </div>
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
