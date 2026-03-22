'use client'

import type { AgentResponse } from './bubbleStore'
import { api } from './api'
import { formatEvidencePacket, type EvidencePacket } from './evidencePacket'
import { isDemoMode } from './appMode'

type AiRequestContext = {
  memo?: string
  tags?: string[]
}

export const primaryAiProviders = ['openai'] as const
export const optionalAiProviders = ['gemini'] as const
export const activeAiProviders = [...primaryAiProviders, ...optionalAiProviders] as const
export type AiProvider = (typeof activeAiProviders)[number]

export type AiBatchError = {
  provider: AiProvider
  message: string
  status?: number
  code?: string
}

export type AiBatchResult = {
  responses: AgentResponse[]
  errors: AiBatchError[]
}

const buildEvidenceText = (evidence?: EvidencePacket | null, context?: AiRequestContext) => {
  const lines: string[] = []

  if (evidence) {
    lines.push(formatEvidencePacket(evidence))
  }

  const memo = context?.memo?.trim()
  if (memo) {
    lines.push(`사용자 메모: ${memo}`)
  }

  if (context?.tags && context.tags.length > 0) {
    lines.push(`사용자 태그: ${context.tags.join(', ')}`)
  }

  return lines.filter(Boolean).join('\n')
}

type DemoScenario = {
  title: string
  summary: string
  checks: string[]
  caution: string
  action: string
}

const demoScenarios: DemoScenario[] = [
  {
    title: '상승 추세 재확인',
    summary: '고점 돌파 뒤 눌림이 짧고 추세가 이어지는 구간입니다.',
    checks: ['거래량이 추세를 받쳐주는지', '직전 돌파 레벨을 지키는지', '추격보다 분할 접근이 맞는지'],
    caution: '돌파 직후 되돌림이 크게 나오면 심리가 급격히 흔들릴 수 있습니다.',
    action: '지금은 진입 자체보다 어디서 무효가 되는지 먼저 메모로 남기는 편이 좋습니다.',
  },
  {
    title: '하락 추세 관찰',
    summary: '반등은 나오지만 아직 하락 구조가 더 강하게 보이는 구간입니다.',
    checks: ['직전 저점 이탈 여부', '반등 고점이 계속 낮아지는지', '손절 기준이 사전에 있었는지'],
    caution: '근거 없는 역추세 진입은 손실을 빠르게 키울 수 있습니다.',
    action: '관망하면서 하락이 멈추는 근거를 적고, 반등을 추격하지 않는 쪽이 안전합니다.',
  },
  {
    title: '박스권 대응',
    summary: '방향성보다 상단과 하단 반응을 어떻게 기록하는지가 중요한 구간입니다.',
    checks: ['상단과 하단 테스트 횟수', '거래량이 줄어드는지', '손익비가 충분한지'],
    caution: '박스 이탈 직전 변동성 확대에 휘둘리기 쉽습니다.',
    action: '어느 구간에서 매수 가설과 매도 가설이 깨지는지 기준만 먼저 남겨두세요.',
  },
]

function buildDemoResponse(
  symbol: string,
  timeframe: string,
  promptType: 'brief' | 'detailed' | 'technical',
  evidenceText: string,
  provider: AiProvider,
): AgentResponse {
  const seedInput = `${symbol}:${timeframe}:${promptType}:${provider}:${evidenceText.length}`
  const seed = Array.from(seedInput).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const scenario = demoScenarios[seed % demoScenarios.length]

  const text = [
    '추세/모멘텀',
    `${scenario.title} · ${scenario.summary}`,
    '',
    '핵심 레벨',
    `- ${scenario.checks[0]}`,
    `- ${scenario.checks[1]}`,
    '',
    '리스크',
    scenario.caution,
    '',
    '행동 제안',
    scenario.action,
    '',
    '추가 확인 데이터',
    `- ${scenario.checks[0]}`,
    `- ${scenario.checks[1]}`,
    `- ${scenario.checks[2]}`,
  ].join('\n')

  return {
    provider,
    model: `${provider}-mock-scenario-v1`,
    prompt_type: promptType,
    response: text,
    created_at: new Date().toISOString(),
  }
}

const mapProviderError = (provider: AiProvider, error: any): AiBatchError => ({
  provider,
  message: error?.response?.data?.message || error?.message || 'provider request failed',
  status: error?.response?.status,
  code: error?.response?.data?.code,
})

export async function fetchAiOpinions(
  symbol: string,
  timeframe: string,
  price: number,
  promptType: 'brief' | 'detailed' | 'technical' = 'brief',
  evidence?: EvidencePacket | null,
  context?: AiRequestContext,
  providers: readonly AiProvider[] = primaryAiProviders,
): Promise<AiBatchResult> {
  const evidenceText = buildEvidenceText(evidence, context)

  if (isDemoMode) {
    return {
      responses: providers.map((provider) => buildDemoResponse(symbol, timeframe, promptType, evidenceText, provider)),
      errors: [],
    }
  }

  const settled = await Promise.allSettled(
    providers.map(async (provider) => {
      const payload = {
        provider,
        prompt_type: promptType,
        symbol,
        timeframe,
        price: String(price),
        evidence_text: evidenceText,
      }

      const response = await api.post('/v1/ai/one-shot', payload)
      const data = response.data

      return {
        provider: (data.provider || provider) as AiProvider,
        model: data.model || provider,
        prompt_type: promptType,
        response: data.response || '',
        created_at: data.created_at || new Date().toISOString(),
      } satisfies AgentResponse
    }),
  )

  const responses: AgentResponse[] = []
  const errors: AiBatchError[] = []

  settled.forEach((result, index) => {
    const provider = providers[index]

    if (result.status === 'fulfilled') {
      responses.push(result.value)
      return
    }

    errors.push(mapProviderError(provider, result.reason))
  })

  if (responses.length === 0) {
    const primaryError = new Error(
      errors.map((item) => `${item.provider}: ${item.message}`).join(' | ') || 'AI provider request failed',
    )
    ;(primaryError as Error & { errors?: AiBatchError[] }).errors = errors
    throw primaryError
  }

  return { responses, errors }
}
