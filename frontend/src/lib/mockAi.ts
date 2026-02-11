import type { AgentResponse } from './bubbleStore'
import { api } from './api'
import { formatEvidencePacket, type EvidencePacket } from './evidencePacket'
import { isDemoMode } from './appMode'

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

type DemoScenario = {
    title: string
    opinion: string
    checks: string[]
    caution: string
    action: string
}

const demoScenarios: DemoScenario[] = [
    {
        title: '상승 추세 확장',
        opinion: '고점 돌파 이후 추세가 이어지고 있습니다.',
        checks: ['거래량 증가가 동반되는지', '직전 돌파 레벨 유지 여부', '분할 익절 계획 보유 여부'],
        caution: '돌파 실패 시 되돌림이 빠를 수 있습니다.',
        action: '추격보다 눌림 확인 후 분할 접근을 권장합니다.',
    },
    {
        title: '하락 추세 지속',
        opinion: '반등 폭이 제한되고 하락 구조가 유지되는 구간입니다.',
        checks: ['저점 갱신 속도', '반등 고점의 낮아짐', '손절 기준 이탈 여부'],
        caution: '짧은 숏 커버로 급반등이 발생할 수 있습니다.',
        action: '손실 확대를 막는 방어적 포지션 관리를 우선하세요.',
    },
    {
        title: '횡보 박스 국면',
        opinion: '방향성보다 박스 상단/하단 반응이 중요한 구간입니다.',
        checks: ['상단/하단 접촉 횟수', '거래량 감소 여부', '손익비 1:2 이상 확보 가능성'],
        caution: '박스 이탈 순간 변동성이 급증할 수 있습니다.',
        action: '돌파 확인 전에는 포지션 크기를 줄이는 것이 유리합니다.',
    },
    {
        title: '급등 과열 구간',
        opinion: '짧은 시간 급등으로 과열 리스크가 커졌습니다.',
        checks: ['직전 저항 돌파 후 안착 여부', '캔들 꼬리 길이 확대', '추가 진입 근거의 객관성'],
        caution: '고점 추격 진입은 손절 폭이 급격히 커질 수 있습니다.',
        action: '신규 진입보다 리스크 축소와 기준 재정의를 추천합니다.',
    },
    {
        title: '급락 리스크 확대',
        opinion: '변동성이 급격히 확대되어 손절 지연이 치명적인 구간입니다.',
        checks: ['유동성 공백 발생 여부', '지지 레벨 회복 속도', '최대 허용 손실 한도'],
        caution: '반등 신호 없이 버티면 손실이 빠르게 누적될 수 있습니다.',
        action: '보수적으로 노출을 줄이고 재진입은 확인 후 진행하세요.',
    },
    {
        title: '변동성 급증',
        opinion: '방향보다 변동성 관리가 성과를 좌우하는 국면입니다.',
        checks: ['평균 캔들 폭 변화', '뉴스/이벤트 일정', '주문 슬리피지 허용 범위'],
        caution: '기준 없는 빈번한 매매가 손익을 악화시킬 수 있습니다.',
        action: '거래 횟수를 줄이고 확실한 셋업만 선택하세요.',
    },
    {
        title: '뉴스 충격 반영',
        opinion: '가격이 이벤트를 빠르게 반영하는 전형적인 뉴스 장세입니다.',
        checks: ['뉴스 방향과 가격 반응 일치성', '첫 반응 후 재평가 구간', '거래량 유지 여부'],
        caution: '초기 변동만 보고 따라가면 역방향 리스크가 큽니다.',
        action: '첫 반응 추격보다 2차 확인 이후 대응을 권장합니다.',
    },
    {
        title: '저유동성 구간',
        opinion: '유동성이 얕아 체결 품질과 손절 체계가 특히 중요합니다.',
        checks: ['호가 스프레드 확대 여부', '체결 지연/미체결 비율', '포지션 크기 적정성'],
        caution: '평소 크기 포지션은 슬리피지 비용이 과도해질 수 있습니다.',
        action: '포지션 크기 축소와 보수적 목표치 설정이 안전합니다.',
    },
]

function buildDemoResponse(symbol: string, timeframe: string, promptType: 'brief' | 'detailed' | 'technical', evidenceText: string): AgentResponse {
    const seedInput = `${symbol}:${timeframe}:${promptType}:${evidenceText.length}`
    const seed = Array.from(seedInput).reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const scenario = demoScenarios[seed % demoScenarios.length]
    const text = [
        '상황',
        `${scenario.title} · ${scenario.opinion}`,
        '',
        '핵심 근거',
        `- ${scenario.checks[0]}`,
        `- ${scenario.checks[1]}`,
        `- ${scenario.checks[2]}`,
        '',
        '리스크',
        scenario.caution,
        '',
        '행동 제안',
        scenario.action,
        '',
        '체크리스트',
        `- ${scenario.checks[0]}`,
        `- ${scenario.checks[1]}`,
        `- ${scenario.checks[2]}`,
        '',
        '결론',
        '데모 응답입니다. 실제 배포 환경에서는 실시간 AI 호출로 교체됩니다.',
    ].join('\n')

    return {
        provider: 'demo',
        model: 'mock-scenario-v1',
        prompt_type: promptType,
        response: text,
        created_at: new Date().toISOString(),
    }
}

export async function fetchAiOpinion(
    symbol: string,
    timeframe: string,
    price: number,
    promptType: 'brief' | 'detailed' | 'technical' = 'brief',
    evidence?: EvidencePacket | null,
    context?: AiRequestContext
): Promise<AgentResponse> {
    const evidenceText = buildEvidenceText(evidence, context)

    if (isDemoMode) {
        return buildDemoResponse(symbol, timeframe, promptType, evidenceText)
    }

    const payload = {
        provider: 'openai',
        prompt_type: promptType,
        symbol,
        timeframe,
        price: String(price),
        evidence_text: evidenceText,
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
