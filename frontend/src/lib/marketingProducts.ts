import type {
  MarketingAngleType,
  MarketingChannel,
  MarketingContentIntent,
  MarketingEvidenceSource,
  MarketingFormatStyle,
} from '../types/marketing'

export type MarketingProductKey = 'kifu' | 'moneyvessel'

export type MarketingStarterIdea = {
  title: string
  rawNote: string
  angleType: MarketingAngleType
  messagePillar: string
  channels: MarketingChannel[]
  contentIntent: MarketingContentIntent
  evidenceSource: MarketingEvidenceSource
  formatStyle: MarketingFormatStyle
}

type MarketingProductConfig = {
  key: MarketingProductKey
  label: string
  title: string
  description: string
  messagePillars: string[]
  starterIdeas: MarketingStarterIdea[]
  visibleInUi: boolean
}

export const defaultMarketingProductKey: MarketingProductKey = 'kifu'

export const marketingProductConfigs: Record<MarketingProductKey, MarketingProductConfig> = {
  kifu: {
    key: 'kifu',
    label: 'Kifu',
    title: 'Kifu 안에서 시작하고, 복기와 검증 흐름까지 함께 확장합니다.',
    description:
      '지금 Marketing OS는 Kifu 운영에 집중합니다. 백테스트와 판단 검증도 별도 제품보다 Kifu 안의 기능과 메시지로 연결하는 방향을 기본으로 둡니다.',
    messagePillars: [
      'Kifu는 트레이더가 왜 진입했고 왜 정리했는지를 잊지 않게 돕습니다.',
      'Kifu는 거래 기록, 메모, 복기를 한 흐름으로 묶어 반복 실수를 줄입니다.',
      'Kifu는 왜 샀고 왜 팔았는지를 남겨 다음 판단을 더 낫게 만드는 거래 복기 OS입니다.',
      'Kifu는 기록을 남기는 데서 멈추지 않고, 나중에 그 판단을 다시 검토하게 돕습니다.',
      'Kifu는 백테스트와 실제 거래 기록을 이어서 아이디어와 실제 판단의 차이를 다시 보게 돕습니다.',
    ],
    starterIdeas: [
      {
        title: 'AI 점수보다 더 위험한 건 흔들리는 해석이다',
        rawNote:
          '같은 분석 결과를 보고도 몇 분 사이에 사야겠다, 아니다 정리해야겠다로 해석이 바뀌는 장면이 있었다. 문제는 신호가 없는 게 아니라 그때 왜 그렇게 해석했는지가 남지 않는다는 점이다.',
        angleType: 'problem',
        messagePillar: 'Kifu는 거래 기록, 메모, 복기를 한 흐름으로 묶어 반복 실수를 줄입니다.',
        channels: ['x'],
        contentIntent: 'soft_promo',
        evidenceSource: 'team_chat',
        formatStyle: 'conversation',
      },
      {
        title: '기록만으로는 부족하고 검증까지 이어져야 하는 이유',
        rawNote:
          '기록을 남겼더라도 시간이 지나 다시 볼 때 그 기준이 실제로 유효했는지 확인할 수 있어야 한다. 그렇지 않으면 기록은 남아도 복기는 멈춘다.',
        angleType: 'feature',
        messagePillar: 'Kifu는 기록을 남기는 데서 멈추지 않고, 나중에 그 판단을 다시 검토하게 돕습니다.',
        channels: ['x', 'naver_blog'],
        contentIntent: 'direct_promo',
        evidenceSource: 'screenshot',
        formatStyle: 'screen_explainer',
      },
      {
        title: '좋은 전략보다 먼저 필요한 것은 자기 기준을 남기는 일',
        rawNote:
          '좋은 전략을 안다고 해서 바로 자기 기준이 생기지는 않는다. 시작점과 경험이 다르기 때문에, 결국 왜 그렇게 판단했는지를 기록으로 남기고 다시 돌아봐야 한다.',
        angleType: 'education',
        messagePillar: 'Kifu는 왜 샀고 왜 팔았는지를 남겨 다음 판단을 더 낫게 만드는 거래 복기 OS입니다.',
        channels: ['x', 'naver_blog'],
        contentIntent: 'non_promo',
        evidenceSource: 'personal_note',
        formatStyle: 'reflection',
      },
    ],
    visibleInUi: true,
  },
  moneyvessel: {
    key: 'moneyvessel',
    label: 'MoneyVessel',
    title: '내부 운영 트랙',
    description: '현재는 제품 노출 없이 내부 스택이나 운영 분류용으로만 유지합니다.',
    messagePillars: [
      'MoneyVessel은 자산별 판단과 실행 기록을 연결하는 운영 루프를 더 선명하게 만듭니다.',
    ],
    starterIdeas: [],
    visibleInUi: false,
  },
}

export const marketingProductOptions = Object.values(marketingProductConfigs)
export const visibleMarketingProductOptions = marketingProductOptions.filter((product) => product.visibleInUi)

export const getMarketingProductConfig = (productKey: string): MarketingProductConfig => {
  return marketingProductConfigs[productKey as MarketingProductKey] ?? marketingProductConfigs[defaultMarketingProductKey]
}
