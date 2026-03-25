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
import { guestFeatureMessage } from '../lib/guestAccess'
import { isGuestSession } from '../lib/guestSession'


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
  const guestMode = isGuestSession()

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
  }, [open, defaultPrice, defaultTimeframe, defaultTime, symbol])

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
    if (guestMode) {
      setAiError(guestFeatureMessage('AI 의견 수집'))
      return
    }
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
    if (guestMode) {
      setEvidenceError(guestFeatureMessage('말풍선 생성'))
      return
    }
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
    if (guestMode) {
      setError(guestFeatureMessage('말풍선 생성'))
      return
    }
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

  const inputReady = Boolean(symbol && candleTime && price.trim())
  const packetEnabled = includeEvidence || includePositions || includeBubbles
  const packetReady = Boolean(evidencePacket || evidencePreview.length > 0)
  const aiReady = aiResponses.length > 0
  const workspaceStatus = [
    {
      key: 'record',
      label: '기록',
      value: inputReady ? '준비됨' : '입력 필요',
      tone: inputReady ? 'text-emerald-200' : 'text-amber-200',
    },
    {
      key: 'packet',
      label: '증거 패킷',
      value: packetReady ? '준비됨' : packetEnabled ? '대기 중' : '사용 안 함',
      tone: packetReady ? 'text-cyan-200' : packetEnabled ? 'text-neutral-100' : 'text-neutral-500',
    },
    {
      key: 'ai',
      label: 'AI 의견',
      value: aiReady ? `${aiResponses.length}개` : '아직 없음',
      tone: aiReady ? 'text-violet-200' : 'text-neutral-100',
    },
  ] as const
  const promptTypeLabel =
    promptType === 'detailed'
      ? '자세히'
      : promptType === 'technical'
        ? '기술적으로'
        : '빠르게'

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(8,11,15,0.76)] px-2 py-2 backdrop-blur-[2px] lg:px-4 lg:py-4">
      <div className="relative mx-auto flex h-full w-full max-w-[1880px] flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(36,42,50,0.96),rgba(20,24,30,0.98))] text-neutral-100 shadow-2xl backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-emerald-300/[0.06] blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-300/[0.07] blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%,transparent_76%,rgba(255,255,255,0.02))]" />
        </div>
        <form onSubmit={handleSubmit} className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="border-b border-white/[0.08] px-5 py-5 md:px-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-4">
                <div>
                  <p className="kifu-eyebrow">Review Workspace</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h3 className="text-[32px] font-semibold tracking-[-0.03em] text-neutral-50">말풍선 복기 작성</h3>
                    <span className="kifu-chip">{symbol || '종목 미선택'}</span>
                    <span className="kifu-chip">{timeframe}</span>
                    <span className="kifu-chip">{promptTypeLabel} 의견</span>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400 md:text-[15px]">
                    캔들 한 장면을 기록하고, 필요한 증거를 묶고, AI 의견까지 한 화면에서 정리합니다.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-neutral-300">
                  <span className="kifu-chip">{price ? `가격 ${price}` : '가격 미입력'}</span>
                  <span className="kifu-chip">{packetSummaryText}</span>
                  <span className="kifu-chip">태그 {tags.length}개</span>
                  <span className="kifu-chip">메모 {memo.trim().length}자</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 xl:items-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="kifu-btn-ghost self-start px-4 py-2 text-sm xl:self-end"
                >
                  닫기
                </button>
                <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[360px]">
                  {workspaceStatus.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.05)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">{item.label}</p>
                      <p className={`mt-2 text-lg font-semibold ${item.tone}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden px-5 py-4 md:px-6 md:py-5 xl:grid-cols-[minmax(340px,0.82fr)_minmax(380px,0.94fr)_minmax(480px,1.2fr)]">
            <section className="kifu-panel-muted order-1 flex min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(39,46,56,0.88),rgba(29,35,43,0.88))]">
              <div className="border-b border-white/[0.08] px-5 py-4">
                <p className="kifu-eyebrow">Scene Record</p>
                <h4 className="mt-2 text-2xl font-semibold text-neutral-50">장면 기록</h4>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  어떤 캔들이었는지, 왜 들어갔는지, 당시 감정과 판단을 먼저 정리합니다.
                </p>
              </div>
              <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
                {error && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-base text-red-200">
                    {error}
                  </div>
                )}
                {guestMode && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-base text-amber-200">
                    게스트 모드에서는 말풍선 저장과 AI 의견 수집을 사용할 수 없습니다. 차트와 예시 데이터는 읽기 전용으로만 볼 수 있습니다.
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-neutral-200">시간 구간</span>
                    <select
                      value={timeframe}
                      onChange={(event) => setTimeframe(event.target.value)}
                      disabled={guestMode}
                      className="kifu-field w-full"
                    >
                      {timeframes.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-neutral-200">캔들 시각</span>
                    <input
                      type="datetime-local"
                      value={candleTime}
                      onChange={(event) => setCandleTime(event.target.value)}
                      disabled={guestMode}
                      className="kifu-field w-full"
                    />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-neutral-200">가격</span>
                  <input
                    type="text"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    disabled={guestMode}
                    className="kifu-field w-full"
                    placeholder="예: 104800"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-neutral-200">메모</span>
                  <textarea
                    value={memo}
                    onChange={(event) => setMemo(event.target.value)}
                    rows={8}
                    disabled={guestMode}
                    className="kifu-field min-h-[220px] w-full resize-none leading-7"
                    placeholder="진입 근거, 심리 상태, 놓친 신호, 다음 액션까지 함께 적어보세요."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-neutral-200">태그</span>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                    disabled={guestMode}
                    className="kifu-field w-full"
                    placeholder="breakout, fomo"
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {tags.map((tag) => (
                        <span key={tag} className="kifu-chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-neutral-200">자산 분류</span>
                    <select
                      value={assetClass}
                      onChange={(event) => setAssetClass(event.target.value as 'crypto' | 'stock')}
                      disabled={guestMode}
                      className="kifu-field w-full"
                    >
                      <option value="crypto">Crypto</option>
                      <option value="stock">Stock</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-neutral-200">거래소 / 소스</span>
                    <input
                      type="text"
                      value={venueName}
                      onChange={(event) => setVenueName(event.target.value)}
                      disabled={guestMode}
                      className="kifu-field w-full"
                      placeholder="binance, upbit, kis"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-emerald-300/18 bg-[linear-gradient(180deg,rgba(42,74,65,0.34),rgba(29,48,43,0.28))] px-4 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200/80">Quick Note</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-50/90">
                    장면 기록은 길게 쓰기보다, 진입 이유와 흔들린 지점, 다음에 다시 볼 기준이 드러나게 적는 편이 더 유용합니다.
                  </p>
                </div>
              </div>
            </section>
            <section className="kifu-panel order-3 flex min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(37,43,53,0.9),rgba(28,33,41,0.92))]">
              <div className="border-b border-white/[0.08] px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="kifu-eyebrow">AI Review</p>
                    <h4 className="mt-2 text-2xl font-semibold text-neutral-50">AI 의견</h4>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">
                      직접 쓴 메모와 증거 패킷을 함께 읽고, 판단 근거와 놓친 포인트를 빠르게 점검합니다.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={promptType}
                      onChange={(event) => setPromptType(event.target.value as 'brief' | 'detailed' | 'technical')}
                      disabled={guestMode || aiLoading}
                      className="kifu-field min-w-[132px]"
                    >
                      <option value="brief">빠르게</option>
                      <option value="detailed">자세히</option>
                      <option value="technical">기술적으로</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleAskAi(primaryAiProviders)}
                      disabled={guestMode || aiLoading || !price || aiDisabled}
                      className="kifu-btn-primary px-4 py-2 text-sm"
                    >
                      {aiDisabled ? '멤버만 사용' : aiLoading ? '의견 정리 중...' : isDemoMode ? 'AI 의견 받기 (데모)' : 'AI 의견 받기'}
                    </button>
                    {!aiDisabled && !isDemoMode && aiResponses.length > 0 && optionalAiProviders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleAskAi(optionalAiProviders, 'append')}
                        disabled={guestMode || aiLoading || !price}
                        className="kifu-btn-secondary px-4 py-2 text-sm"
                      >
                        {aiLoading
                          ? hasGeminiResponse
                            ? 'Gemini 다시 요청 중...'
                            : '추가 의견 요청 중...'
                          : hasGeminiResponse
                            ? 'Gemini 다시 요청'
                            : 'Gemini 추가 의견'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5">
                {!aiDisabled && aiResponses.length === 0 && !isDemoMode && optionalAiProviders.length > 0 && (
                  <p className="text-sm text-neutral-500">
                    Gemini는 기본 응답을 확인한 뒤 필요할 때만 추가 의견으로 덧붙이는 흐름입니다.
                  </p>
                )}
                {isDemoMode && aiResponses.length === 0 && (
                  <p className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.06] px-4 py-3 text-sm text-cyan-200">
                    데모 모드에서는 {activeAiProviders.map(formatProviderLabel).join(', ')} 샘플 응답을 반환합니다.
                  </p>
                )}
                {aiDisabled && aiResponses.length === 0 && (
                  <p className="rounded-2xl border border-white/[0.08] bg-[rgba(28,34,42,0.72)] px-4 py-3 text-sm text-neutral-400">
                    AI 의견 요청은 멤버 전용 기능입니다.
                  </p>
                )}
                {aiError && (
                  <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-4">
                    {aiRetryAttempt > 0 && (
                      <p className="mb-2 text-sm font-semibold text-rose-200">재시도 {aiRetryAttempt}/{MAX_AI_RETRIES}</p>
                    )}
                    <p className="text-base leading-7 text-rose-100">{aiError}</p>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => void handleAskAi(primaryAiProviders)}
                        disabled={guestMode || aiLoading || !price || aiDisabled}
                        className="kifu-btn-secondary px-4 py-2 text-sm"
                      >
                        {aiLoading ? '재시도 중...' : '다시 시도'}
                      </button>
                    </div>
                  </div>
                )}
                {!aiReady && !aiError && (
                  <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[rgba(28,34,42,0.72)] px-5 py-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">No Opinion Yet</p>
                    <h5 className="mt-3 text-xl font-semibold text-neutral-50">기록과 증거를 준비한 뒤 AI 의견을 받아보세요.</h5>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                        <p className="text-sm font-semibold text-neutral-200">1. 장면 기록</p>
                        <p className="mt-2 text-sm leading-6 text-neutral-400">가격과 메모를 남기면 AI가 장면을 훨씬 정확하게 읽습니다.</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                        <p className="text-sm font-semibold text-neutral-200">2. 증거 패킷</p>
                        <p className="mt-2 text-sm leading-6 text-neutral-400">포지션과 최근 체결을 붙이면 맥락을 잃지 않습니다.</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                        <p className="text-sm font-semibold text-neutral-200">3. 의견 비교</p>
                        <p className="mt-2 text-sm leading-6 text-neutral-400">기본 응답을 본 뒤 필요하면 Gemini를 추가로 붙여 비교합니다.</p>
                      </div>
                    </div>
                  </div>
                )}
                {aiReady && (
                  <div
                    className={`grid gap-3 ${
                      aiResponses.length >= 3
                        ? 'grid-cols-1 2xl:grid-cols-2'
                        : aiResponses.length === 2
                          ? 'grid-cols-1 xl:grid-cols-2'
                          : 'grid-cols-1'
                    }`}
                  >
                    {aiResponses.map((response) => {
                      const sections = response === primaryAiResponse ? aiSections : parseAiSections(response.response)
                      return (
                        <div key={`${response.provider}-${response.created_at}`} className="rounded-2xl border border-white/[0.08] bg-[rgba(28,34,42,0.76)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">{formatProviderLabel(response.provider)}</p>
                              <p className="mt-1 text-sm text-neutral-500">{response.model}</p>
                            </div>
                            <span className="kifu-chip">{response.provider === primaryAiResponse?.provider ? '기본 의견' : '추가 의견'}</span>
                          </div>
                          {sections.length > 0 ? (
                            <div className="space-y-3">
                              {sections.map((section, sectionIndex) => (
                                <div
                                  key={`${response.provider}-${sectionIndex}-${section.title}-${section.body.slice(0, 16)}`}
                                  className={`rounded-xl border px-3 py-3 text-base leading-7 whitespace-pre-wrap ${toneClass(section.tone)}`}
                                >
                                  <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-80">{section.title}</p>
                                  <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-inherit">{section.body || '응답 본문이 비어 있습니다.'}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-white/[0.06] bg-[rgba(22,27,34,0.82)] px-3 py-3 text-base leading-7 whitespace-pre-wrap text-neutral-300">
                              {response.response}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>
            <section className="kifu-panel-muted order-2 flex min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(38,45,55,0.88),rgba(29,35,43,0.88))]">
              <div className="border-b border-white/[0.08] px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="kifu-eyebrow">Evidence Packet</p>
                    <h4 className="mt-2 text-2xl font-semibold text-neutral-50">증거 패킷</h4>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">
                      이번 장면을 읽는 데 필요한 포지션, 최근 체결, 기간 요약, 버블만 묶어서 AI에게 전달합니다.
                    </p>
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
                    disabled={guestMode || aiDisabled}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      includeEvidence
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/[0.08] text-neutral-300 hover:border-white/[0.14]'
                    } ${aiDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    {includeEvidence ? '패킷 포함' : '패킷 제외'}
                  </button>
                </div>
              </div>
              <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5">
                <div className="rounded-2xl border border-white/[0.08] bg-[rgba(28,34,42,0.72)] px-4 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">프리셋</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { value: 'lite', label: '라이트' },
                      { value: 'balanced', label: '균형' },
                      { value: 'deep', label: '딥' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPacketPreset(option.value as 'lite' | 'balanced' | 'deep')}
                        className={packetPreset === option.value ? 'kifu-tab kifu-tab-active' : 'kifu-tab'}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-neutral-400">{packetSummaryText}</p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-[rgba(28,34,42,0.72)] px-4 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">포함 항목</p>
                  <div className="mt-3 grid gap-3 text-sm text-neutral-200">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={includePositions}
                        onChange={(event) => setIncludePositions(event.target.checked)}
                        disabled={guestMode}
                        className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                      />
                      현재 포지션
                    </label>
                    <label className={`flex items-center gap-3 ${includeEvidence ? '' : 'opacity-45'}`}>
                      <input
                        type="checkbox"
                        checked={includeRecentTrades}
                        onChange={(event) => setIncludeRecentTrades(event.target.checked)}
                        disabled={guestMode || !includeEvidence}
                        className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                      />
                      최근 체결 10건
                    </label>
                    <label className={`flex items-center gap-3 ${includeEvidence ? '' : 'opacity-45'}`}>
                      <input
                        type="checkbox"
                        checked={includeSummary}
                        onChange={(event) => setIncludeSummary(event.target.checked)}
                        disabled={guestMode || !includeEvidence}
                        className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                      />
                      기간 요약
                    </label>
                    <label className={`flex items-center gap-3 ${includeEvidence ? '' : 'opacity-45'}`}>
                      <input
                        type="checkbox"
                        checked={includeBubbles}
                        onChange={(event) => setIncludeBubbles(event.target.checked)}
                        disabled={guestMode || !includeEvidence}
                        className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400"
                      />
                      최근 버블
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-[rgba(28,34,42,0.72)] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">세부 설정</p>
                      <p className="mt-1 text-sm text-neutral-400">범위와 종목 범위를 조금 더 정밀하게 조절합니다.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPacketAdvanced((prev) => !prev)}
                      disabled={guestMode}
                      className="kifu-btn-ghost px-3 py-2 text-sm"
                    >
                      {showPacketAdvanced ? '접기' : '펼치기'}
                    </button>
                  </div>

                  {showPacketAdvanced && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="mb-2 text-sm font-semibold text-neutral-200">범위</p>
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
                              onClick={() => setEvidenceScope(option.value as '7d' | '30d' | '90d' | 'custom')}
                              disabled={guestMode}
                              className={evidenceScope === option.value ? 'kifu-tab kifu-tab-active' : 'kifu-tab'}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {evidenceScope === 'custom' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-2">
                            <span className="text-sm font-semibold text-neutral-200">From</span>
                            <input
                              type="date"
                              value={evidenceFrom}
                              onChange={(event) => setEvidenceFrom(event.target.value)}
                              disabled={guestMode}
                              className="kifu-field w-full"
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-semibold text-neutral-200">To</span>
                            <input
                              type="date"
                              value={evidenceTo}
                              onChange={(event) => setEvidenceTo(event.target.value)}
                              disabled={guestMode}
                              className="kifu-field w-full"
                            />
                          </label>
                        </div>
                      )}

                      <div>
                        <p className="mb-2 text-sm font-semibold text-neutral-200">종목 범위</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setEvidenceSymbolScope('current')}
                            disabled={guestMode}
                            className={evidenceSymbolScope === 'current' ? 'kifu-tab kifu-tab-active' : 'kifu-tab'}
                          >
                            현재 종목
                          </button>
                          <button
                            type="button"
                            onClick={() => setEvidenceSymbolScope('all')}
                            disabled={guestMode}
                            className={evidenceSymbolScope === 'all' ? 'kifu-tab kifu-tab-active' : 'kifu-tab'}
                          >
                            전체 종목
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {includeEvidence && includeBubbles && (
                  <div className="rounded-2xl border border-white/[0.08] bg-[rgba(28,34,42,0.72)] px-4 py-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">버블 필터</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-neutral-200">태그</span>
                        <input
                          type="text"
                          value={bubbleTagsInput}
                          onChange={(event) => {
                            setBubbleTagsInput(event.target.value)
                            setBubbleTagsEdited(true)
                          }}
                          disabled={guestMode}
                          className="kifu-field w-full"
                          placeholder="breakout, fomo"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-neutral-200">개수</span>
                        <select
                          value={bubbleLimit}
                          onChange={(event) => setBubbleLimit(Number(event.target.value))}
                          disabled={guestMode}
                          className="kifu-field w-full"
                        >
                          {[4, 6, 10, 20].map((value) => (
                            <option key={value} value={value}>
                              {value}개
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(39,70,74,0.28),rgba(28,47,52,0.26))] px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100/70">Packet Preview</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-300">
                        일회성 분석용 패킷이며 서버에 저장되지 않습니다. 필요할 때만 미리보기로 확인하면 됩니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleBuildEvidencePreview}
                      disabled={guestMode || evidenceLoading || !packetEnabled}
                      className="kifu-btn-secondary px-4 py-2 text-sm"
                    >
                      {evidenceLoading ? '준비 중...' : '패킷 미리보기'}
                    </button>
                  </div>

                  {evidenceError && (
                    <p className="mt-3 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                      {evidenceError}
                    </p>
                  )}

                  {packetReady ? (
                    <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[rgba(22,27,34,0.82)] px-4 py-4 text-sm leading-7 text-neutral-300">
                      {evidencePreview.map((line, lineIndex) => (
                        <p key={`${lineIndex}-${line}`}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/[0.12] bg-[rgba(28,34,42,0.72)] px-4 py-4 text-sm leading-6 text-neutral-500">
                      아직 미리본 증거 패킷이 없습니다. 범위를 고른 뒤 패킷 미리보기를 눌러 어떤 데이터가 전달되는지 먼저 확인해 보세요.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
          <div className="border-t border-white/[0.08] bg-[rgba(22,27,34,0.82)] px-5 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm leading-6 text-neutral-400">
                {aiReady
                  ? '저장하면 현재 메모와 함께 AI 복기 요약도 노트로 남깁니다.'
                  : 'AI 의견 없이도 말풍선을 먼저 저장할 수 있습니다. 필요하면 나중에 다시 열어 복기해도 됩니다.'}
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" onClick={onClose} className="kifu-btn-secondary px-4 py-2.5 text-sm">
                  취소
                </button>
                <button
                  type="submit"
                  disabled={guestMode || isSubmitting}
                  className="kifu-btn-primary px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? '저장 중...' : '말풍선 저장'}
                </button>
              </div>
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
