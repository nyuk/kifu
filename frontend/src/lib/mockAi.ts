
import type { AgentResponse } from './bubbleStore'

export async function fetchAiOpinion(
    symbol: string,
    timeframe: string,
    price: number,
    promptType: 'brief' | 'detailed' | 'technical' = 'brief'
): Promise<AgentResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const trend = Math.random() > 0.5 ? 'Bullish' : 'Bearish'
    const action = Math.random() > 0.5 ? 'BUY' : 'SELL'

    let content = ''
    if (promptType === 'brief') {
        content = `[Brief]\nTrend: ${trend}\nAction: ${action} around ${price}.`
    } else if (promptType === 'detailed') {
        content = `[Detailed Analysis for ${symbol}]\nTimeframe: ${timeframe}\nMarket Context: The price ${price} is testing a key level.\nTrend Direction: ${trend} with increasing volume.\nStrategy: Consider a ${action} position if confirmation occurs.`
    } else {
        content = `[Technical Report]\nSymbol: ${symbol} (${timeframe})\nRSI(14): ${(Math.random() * 40 + 30).toFixed(2)}\nMACD: ${Math.random() > 0.5 ? 'Cross Up' : 'Cross Down'}\nSupport: ${(price * 0.98).toFixed(0)} | Resistance: ${(price * 1.02).toFixed(0)}\nVerdict: ${trend} bias.`
    }

    return {
        provider: 'mock-ai',
        model: 'gpt-4o-mini-mock',
        prompt_type: promptType,
        response: content,
        created_at: new Date().toISOString(),
    }
}
