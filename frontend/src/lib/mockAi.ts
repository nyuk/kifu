
import type { AgentResponse } from './bubbleStore'
import { api } from './api'
import { formatEvidencePacket, type EvidencePacket } from './evidencePacket'

export async function fetchAiOpinion(
    symbol: string,
    timeframe: string,
    price: number,
    promptType: 'brief' | 'detailed' | 'technical' = 'brief',
    evidence?: EvidencePacket | null
): Promise<AgentResponse> {
    const payload = {
        provider: 'openai',
        prompt_type: promptType,
        symbol,
        timeframe,
        price: String(price),
        evidence_text: evidence ? formatEvidencePacket(evidence) : '',
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
