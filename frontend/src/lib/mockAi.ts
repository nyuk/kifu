
import type { AgentResponse } from './bubbleStore'
import { api } from './api'
import { formatEvidencePacket, type EvidencePacket } from './evidencePacket'

type AiRequestContext = {
    memo?: string
    tags?: string[]
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

export async function fetchAiOpinion(
    symbol: string,
    timeframe: string,
    price: number,
    promptType: 'brief' | 'detailed' | 'technical' = 'brief',
    evidence?: EvidencePacket | null,
    context?: AiRequestContext
): Promise<AgentResponse> {
    const payload = {
        provider: 'openai',
        prompt_type: promptType,
        symbol,
        timeframe,
        price: String(price),
        evidence_text: buildEvidenceText(evidence, context),
    }

    const response = await api.post('/v1/ai/one-shot', payload)
    const data = response.data

    return {
        provider: data.provider || 'openai',
        model: data.model || 'gpt-4o',
        prompt_type: promptType,
        response: data.response || '',
        created_at: data.created_at || new Date().toISOString(),
    }
}
