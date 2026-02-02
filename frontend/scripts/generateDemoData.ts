/**
 * 데모 데이터 생성 스크립트
 * 실행: npx ts-node scripts/generateDemoData.ts
 */

type AgentResponse = {
  provider: string
  model: string
  prompt_type: 'brief' | 'detailed' | 'history' | 'custom' | 'technical'
  response: string
  created_at: string
}

type Bubble = {
  id: string
  symbol: string
  timeframe: string
  ts: number
  price: number
  note: string
  tags?: string[]
  action?: 'BUY' | 'SELL' | 'HOLD' | 'TP' | 'SL' | 'NONE'
  agents?: AgentResponse[]
  created_at: string
  updated_at: string
}

type Trade = {
  id: string
  exchange: 'upbit' | 'binance'
  symbol: string
  side: 'buy' | 'sell'
  ts: number
  price: number
  qty?: number
  fee?: number
}

// 랜덤 UUID 생성
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// BTC 가격 시뮬레이션 (2024년 1월 ~ 2025년 1월 기준 현실적인 가격대)
function generatePriceHistory(days: number): { ts: number; price: number }[] {
  const prices: { ts: number; price: number }[] = []
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000

  // 시작 가격 $42,000 (2024년 1월 기준)
  let price = 42000

  for (let i = days; i >= 0; i--) {
    const ts = now - i * oneDay

    // 현실적인 가격 변동 시뮬레이션
    // 2024년 BTC 상승장 반영: 42k -> 73k -> 조정 -> 100k
    const progress = (days - i) / days

    if (progress < 0.25) {
      // Q1 2024: 42k -> 73k 상승
      price = 42000 + progress * 4 * 31000 + (Math.random() - 0.5) * 3000
    } else if (progress < 0.5) {
      // Q2 2024: 73k -> 58k 조정
      price = 73000 - (progress - 0.25) * 4 * 15000 + (Math.random() - 0.5) * 4000
    } else if (progress < 0.75) {
      // Q3 2024: 58k -> 68k 횡보/상승
      price = 58000 + (progress - 0.5) * 4 * 10000 + (Math.random() - 0.5) * 5000
    } else {
      // Q4 2024 ~ 2025: 68k -> 100k+ 상승
      price = 68000 + (progress - 0.75) * 4 * 35000 + (Math.random() - 0.5) * 6000
    }

    // 일간 변동성 추가
    price = price * (1 + (Math.random() - 0.5) * 0.03)
    price = Math.round(price * 100) / 100

    prices.push({ ts, price })
  }

  return prices
}

// AI 에이전트 응답 템플릿
const agentTemplates = {
  buy: [
    { provider: 'openai', model: 'gpt-4', response: '강한 매수 신호입니다. RSI가 과매도 구간에서 반등 중이며, 거래량이 증가하고 있습니다. 목표가 {target}까지 상승 여력이 있습니다.' },
    { provider: 'anthropic', model: 'claude-3', response: '기술적 분석 결과 매수 진입 적기로 판단됩니다. 지지선 {support}에서 반등이 확인되었고, MACD 골든크로스가 임박했습니다.' },
    { provider: 'google', model: 'gemini-pro', response: '온체인 데이터 분석 결과, 대형 기관의 매집이 포착되었습니다. 현재 가격대에서 분할 매수를 권장합니다.' },
    { provider: 'openai', model: 'gpt-4-turbo', response: '볼린저 밴드 하단 터치 후 반등 중. 스토캐스틱 RSI 상승 전환. 단기 상승 모멘텀 형성 중입니다.' },
  ],
  sell: [
    { provider: 'openai', model: 'gpt-4', response: '차익실현 구간입니다. RSI 과매수 구간 진입, 저항선 {resistance} 근접. 부분 익절을 권장합니다.' },
    { provider: 'anthropic', model: 'claude-3', response: '단기 고점 형성 가능성이 높습니다. 거래량 감소와 함께 상승 모멘텀이 약화되고 있습니다.' },
    { provider: 'google', model: 'gemini-pro', response: '펀딩비가 극단적으로 높아졌습니다. 레버리지 청산 리스크 증가. 포지션 축소를 권장합니다.' },
  ],
  hold: [
    { provider: 'openai', model: 'gpt-4', response: '현재 횡보 구간입니다. 명확한 방향성이 나올 때까지 관망을 권장합니다. 주요 지지/저항: {support}/{resistance}' },
    { provider: 'anthropic', model: 'claude-3', response: '변동성이 축소되고 있습니다. 브레이크아웃 전 에너지 축적 구간으로 보입니다.' },
  ],
  tp: [
    { provider: 'openai', model: 'gpt-4', response: '목표가 도달! 수익률 {profit}% 달성. 훌륭한 트레이딩이었습니다.' },
    { provider: 'anthropic', model: 'claude-3', response: 'Take Profit 실행. 계획대로 익절 완료. 다음 진입 기회를 기다립니다.' },
  ],
  sl: [
    { provider: 'openai', model: 'gpt-4', response: '손절 실행. 리스크 관리 원칙에 따른 청산입니다. 손실률 {loss}%로 제한했습니다.' },
    { provider: 'anthropic', model: 'claude-3', response: 'Stop Loss 트리거. 시장이 예상과 다르게 움직였습니다. 자본 보존이 우선입니다.' },
  ],
}

const noteTemplates = {
  buy: [
    '지지선 확인 후 매수 진입',
    '거래량 급증, 상승 돌파 예상',
    'RSI 과매도 반등 매수',
    '피보나치 0.618 되돌림 매수',
    '삼각수렴 상방 돌파 매수',
    '이동평균선 골든크로스 매수',
    '공포 지수 극단적 공포 구간 매수',
    'CME 갭 메우기 완료 후 매수',
    '기관 매집 확인, 추세 추종 매수',
    '주요 지지선 리테스트 성공',
  ],
  sell: [
    '저항선 도달, 부분 익절',
    'RSI 과매수 구간 진입',
    '거래량 다이버전스 발생',
    '헤드앤숄더 패턴 형성 중',
    '펀딩비 과열, 리스크 관리 매도',
    '목표가 1차 도달 익절',
    '변곡점 도달, 포지션 축소',
    '이동평균선 데드크로스 임박',
    '고점 갱신 실패, 청산',
    '탐욕 지수 극단 구간',
  ],
  hold: [
    '횡보 구간, 관망',
    '방향성 불분명, 대기',
    '변동성 축소 중, 브레이크아웃 대기',
    '주요 뉴스 발표 전 관망',
    '거래량 감소, 추세 형성 대기',
  ],
  tp: [
    '목표가 도달! 익절 완료',
    'TP1 달성, 나머지 홀딩',
    '계획대로 수익 실현',
    '최종 목표가 도달',
  ],
  sl: [
    '손절 라인 이탈, 청산',
    '예상과 다른 흐름, 손절',
    '리스크 관리 원칙에 따른 청산',
    '급락으로 인한 손절',
  ],
}

const timeframes = ['1h', '4h', '1d']
const exchanges: ('binance' | 'upbit')[] = ['binance', 'binance', 'binance', 'upbit'] // binance 비중 높게

function generateAgentResponses(action: string, price: number): AgentResponse[] {
  const templates = agentTemplates[action as keyof typeof agentTemplates] || agentTemplates.hold
  const count = Math.floor(Math.random() * 3) + 1 // 1~3개 에이전트 응답

  const responses: AgentResponse[] = []
  const usedIndexes = new Set<number>()

  for (let i = 0; i < count && i < templates.length; i++) {
    let idx: number
    do {
      idx = Math.floor(Math.random() * templates.length)
    } while (usedIndexes.has(idx))
    usedIndexes.add(idx)

    const template = templates[idx]
    let response = template.response
      .replace('{target}', `$${Math.round(price * 1.1).toLocaleString()}`)
      .replace('{support}', `$${Math.round(price * 0.95).toLocaleString()}`)
      .replace('{resistance}', `$${Math.round(price * 1.05).toLocaleString()}`)
      .replace('{profit}', `${(Math.random() * 20 + 5).toFixed(1)}`)
      .replace('{loss}', `${(Math.random() * 5 + 1).toFixed(1)}`)

    responses.push({
      provider: template.provider,
      model: template.model,
      prompt_type: 'technical',
      response,
      created_at: new Date().toISOString(),
    })
  }

  return responses
}

function generateDemoData() {
  const priceHistory = generatePriceHistory(365)
  const bubbles: Bubble[] = []
  const trades: Trade[] = []

  // 500개 버블 생성
  const bubbleCount = 500
  const usedBubbleTimes = new Set<number>()

  for (let i = 0; i < bubbleCount; i++) {
    let pricePoint: { ts: number; price: number }
    let attempts = 0
    do {
      pricePoint = priceHistory[Math.floor(Math.random() * priceHistory.length)]
      attempts++
    } while (usedBubbleTimes.has(pricePoint.ts) && attempts < 100)

    // 같은 날에 여러 버블 허용 (시간 약간 변경)
    const ts = pricePoint.ts + Math.floor(Math.random() * 86400000) // 하루 내 랜덤 시간

    const actions: ('BUY' | 'SELL' | 'HOLD' | 'TP' | 'SL')[] = ['BUY', 'SELL', 'HOLD', 'TP', 'SL']
    const actionWeights = [0.3, 0.25, 0.2, 0.15, 0.1] // BUY 30%, SELL 25%, HOLD 20%, TP 15%, SL 10%

    let action: 'BUY' | 'SELL' | 'HOLD' | 'TP' | 'SL'
    const rand = Math.random()
    let cumulative = 0
    for (let j = 0; j < actions.length; j++) {
      cumulative += actionWeights[j]
      if (rand < cumulative) {
        action = actions[j]
        break
      }
    }
    action = action! || 'HOLD'

    const actionKey = action.toLowerCase() as keyof typeof noteTemplates
    const notes = noteTemplates[actionKey] || noteTemplates.hold
    const note = notes[Math.floor(Math.random() * notes.length)]

    const tags: string[] = [action.toLowerCase()]
    if (Math.random() > 0.5) tags.push('important')
    if (Math.random() > 0.7) tags.push('reviewed')

    const bubble: Bubble = {
      id: uuid(),
      symbol: 'BTCUSDT',
      timeframe: timeframes[Math.floor(Math.random() * timeframes.length)],
      ts,
      price: pricePoint.price * (1 + (Math.random() - 0.5) * 0.02), // 약간의 가격 변동
      note,
      tags,
      action,
      agents: generateAgentResponses(actionKey, pricePoint.price),
      created_at: new Date(ts).toISOString(),
      updated_at: new Date(ts).toISOString(),
    }

    bubbles.push(bubble)
  }

  // 500개 거래 생성
  const tradeCount = 500

  for (let i = 0; i < tradeCount; i++) {
    const pricePoint = priceHistory[Math.floor(Math.random() * priceHistory.length)]
    const ts = pricePoint.ts + Math.floor(Math.random() * 86400000)

    const side: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell'
    const price = pricePoint.price * (1 + (Math.random() - 0.5) * 0.01)
    const qty = Math.round((Math.random() * 0.5 + 0.001) * 10000) / 10000 // 0.001 ~ 0.5 BTC

    const trade: Trade = {
      id: uuid(),
      exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
      symbol: 'BTCUSDT',
      side,
      ts,
      price: Math.round(price * 100) / 100,
      qty,
      fee: Math.round(price * qty * 0.001 * 100) / 100, // 0.1% 수수료
    }

    trades.push(trade)
  }

  // 시간순 정렬
  bubbles.sort((a, b) => a.ts - b.ts)
  trades.sort((a, b) => a.ts - b.ts)

  return { bubbles, trades }
}

// 데이터 생성 및 출력
const data = generateDemoData()

console.log(JSON.stringify(data, null, 2))

// 통계 출력
console.error('\n=== 데모 데이터 생성 완료 ===')
console.error(`버블: ${data.bubbles.length}개`)
console.error(`거래: ${data.trades.length}개`)
console.error(`기간: ${new Date(data.bubbles[0].ts).toLocaleDateString()} ~ ${new Date(data.bubbles[data.bubbles.length - 1].ts).toLocaleDateString()}`)

const actionCounts = data.bubbles.reduce((acc, b) => {
  acc[b.action || 'NONE'] = (acc[b.action || 'NONE'] || 0) + 1
  return acc
}, {} as Record<string, number>)
console.error('액션 분포:', actionCounts)

const sideCounts = data.trades.reduce((acc, t) => {
  acc[t.side] = (acc[t.side] || 0) + 1
  return acc
}, {} as Record<string, number>)
console.error('거래 분포:', sideCounts)
