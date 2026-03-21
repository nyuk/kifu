# Strategy Preset Backtest + Alert Linkage v0.1

## Summary

구현 직전 세부 명세:

- `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/docs/runbook/strategy-preset-backtest-alert-v0.1-spec.md`

이 아이디어의 핵심은 사용자가 복잡한 전략식을 직접 만들지 않아도, **미리 정의된 전략 프리셋을 고르고 결과를 본 뒤 바로 알림 구독까지 연결**하게 만드는 것이다.

KIFU 관점에서 이 기능은 단순한 `백테스트 툴`이 아니라:

- 초보자에게는 `빠른 전략 체험 입구`
- 중급자에게는 `조건 기반 알림 생성기`
- 마케팅 관점에서는 `한 문장으로 설명 가능한 체험 기능`

으로 작동한다.

한 줄 포지셔닝:

> "전략을 직접 짜지 않아도, KIFU가 준비한 전략 프리셋을 바로 시험해 보고 마음에 들면 즉시 알림으로 이어갈 수 있다."

---

## Why This Is Attractive Now

현재 KIFU에는 이미 다음 자산이 있다.

- 알림 규칙 CRUD와 트리거 시스템
- 차트/거래/복기 데이터
- AI 브리핑과 판단 저장 흐름

즉, `전략 프리셋 기반 백테스트 + 알림 연동`은 완전히 새로운 제품을 만드는 게 아니라, 이미 있는 두 축을 이어주는 일에 가깝다.

이어지는 축:

1. `전략 프리셋 선택`
2. `백테스트 결과 요약 확인`
3. `이 전략으로 알림 받기`
4. `실제 알림 -> 판단 -> 복기`

이 흐름은 마케팅에도 좋다.  
랜딩/X/콘텐츠에서 이렇게 설명할 수 있기 때문이다.

- "세 가지 전략 프리셋 중 하나를 고르면 바로 과거 성과를 보여줍니다."
- "마음에 들면 그 전략을 알림으로 구독하세요."
- "실전 판단과 결과는 KIFU가 계속 축적합니다."

---

## Product Goal

### v0.1 목표

사용자가:

1. 프리셋 전략 3개 중 하나를 선택하고
2. 요약된 백테스트 결과를 보고
3. 한 번의 클릭으로 알림 규칙 초안을 생성할 수 있게 한다

### v0.1 성공 기준

- 최소 3개의 프리셋이 존재한다
- 각 프리셋은 결과 요약 카드가 있다
- 각 프리셋에서 `이 전략으로 알림 받기`를 누르면 실제 Alert Rule 초안으로 이어진다
- 과거 성과가 미래를 보장하지 않는다는 고지가 항상 함께 보인다

---

## Strong Recommendation

v0.1에서는 **"자유 전략 빌더"를 하지 않는다.**

대신 아래처럼 간다.

- 프리셋은 고정
- 백테스트 화면은 요약 중심
- 알림 연동은 기존 `alert rule` 데이터 모델로 연결

즉:

- `전략 엔진`보다
- `전략 선택 -> 결과 이해 -> 알림 연결`

이 사용자 행동을 먼저 만든다.

---

## Existing Code We Can Reuse

### 1. Alert Rule model

현재 이미 존재:

- `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/frontend/src/types/alert.ts`

주요 타입:

- `RuleType = 'price_change' | 'ma_cross' | 'price_level' | 'volatility_spike'`
- `CreateAlertRuleRequest`
- `AlertRule`

즉, v0.1의 `알림 연결`은 새로운 스키마를 만들지 않고,  
**프리셋 선택 결과를 `CreateAlertRuleRequest`로 변환**하는 방식이 가장 자연스럽다.

### 2. Alert Rule editor / rule config UI

현재 이미 존재:

- `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/frontend/src/components/alerts/RuleEditor.tsx`

즉, v0.1에서는:

- 프리셋이 내부적으로 rule config를 만든 뒤
- 바로 저장하거나
- RuleEditor를 prefill 상태로 열어 "마지막 확인"만 받는 방식

둘 중 하나를 선택할 수 있다.

### 3. Alert/decision/review loop

기존 문서:

- `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/docs/01-plan/features/alert-notification.plan.md`

즉, 이 아이디어는 `백테스트 결과를 끝으로 끝나는 기능`이 아니라,
기존 `알림 -> 판단 -> 복기` 루프에 사용자를 넣는 진입 장치다.

---

## v0.1 User Flow

```text
[Preset Catalog]
   ↓
[Choose one preset]
   ↓
[See simplified backtest summary]
   ↓
[Understand risk disclaimer]
   ↓
[Create alert from preset]
   ↓
[Alert Rule created or prefilled]
   ↓
[User receives real alerts]
   ↓
[Decision + review data accumulates]
```

---

## Recommended Preset Set (v0.1)

핵심은 "설명하기 쉬운 프리셋"이어야 한다.

### Preset A. 급락 반등 감시

- 설명: 단기 급락 뒤 기술적 반등 가능성이 큰 구간을 감시
- 내부 rule mapping:
  - `rule_type = price_change`
  - 예: `drop`, `percent`, `5`, `24h`
- 사용자 문구:
  - "하루 안에 큰 폭으로 빠졌을 때 반등 기회를 감시합니다."

### Preset B. 평균선 이탈/회복 감시

- 설명: 추세가 약해지거나 다시 살아나는 구간을 감시
- 내부 rule mapping:
  - `rule_type = ma_cross`
  - 예: `20MA`, `1h`, `below/above`
- 사용자 문구:
  - "추세 붕괴 또는 회복 신호를 평균선 기준으로 봅니다."

### Preset C. 지정가 돌파 감시

- 설명: 특정 가격 구간을 넘는 순간만 기다리는 전략
- 내부 rule mapping:
  - `rule_type = price_level`
- 사용자 문구:
  - "중요 가격대를 넘을 때만 행동할 수 있도록 감시합니다."

### Preset D. 변동성 급증 감시

- 설명: 평소보다 변동성이 커지는 순간만 추적
- 내부 rule mapping:
  - `rule_type = volatility_spike`
- 사용자 문구:
  - "큰 움직임이 시작될 가능성이 높을 때만 알림을 받습니다."

### Preset E. 국내 프리미엄 과열 감시

이건 확장 후보이며, v0.1 본체에는 넣지 않는 편이 안전하다.

이유:

- 별도 premium 데이터/정의가 필요하다
- 일반 사용자가 이해하기 쉽지 않다
- 첫 버전은 기존 alert model과 1:1로 붙는 프리셋이 더 좋다

---

## Backtest Output Design

v0.1에서는 백테스트를 전부 보여주기보다, **비교 가능한 요약 카드**가 중요하다.

각 프리셋 카드에 필요한 최소 정보:

- 기간: 최근 90일 / 180일
- 총 신호 수
- 승률
- 평균 기대수익
- 최대 낙폭(MDD)
- 최근 10개 시그널 성과 요약

### Example payload

```json
{
  "preset_id": "dip-rebound-v1",
  "label": "급락 반등 감시",
  "market": "crypto",
  "time_range": "180d",
  "summary": {
    "signal_count": 24,
    "win_rate": 58.3,
    "avg_return_pct": 2.1,
    "max_drawdown_pct": -6.4
  },
  "recent_examples": [
    { "symbol": "BTCUSDT", "date": "2026-02-11", "result_pct": 3.2 },
    { "symbol": "ETHUSDT", "date": "2026-02-26", "result_pct": -1.1 }
  ],
  "risk_notice": "과거 성과는 미래 결과를 보장하지 않습니다."
}
```

---

## How Alert Linkage Should Work

여기가 이 아이디어의 핵심이다.

### Principle

`백테스트 결과`와 `실전 알림 생성`이 반드시 한 흐름 안에 있어야 한다.

### v0.1 recommended linkage

#### Option 1. One-click rule creation

사용자가 `이 전략으로 알림 받기`를 누르면:

- 프리셋이 내부적으로 `CreateAlertRuleRequest`를 만든다
- 심볼/기본 threshold가 자동 설정된다
- 저장 후 `/alerts/rules`로 이동한다

장점:

- 매우 빠르다
- 마케팅 데모가 좋다

단점:

- 사용자가 세부값을 못 보고 지나칠 수 있다

#### Option 2. Prefilled editor

사용자가 버튼을 누르면:

- RuleEditor가 프리셋값으로 채워진 채 열린다
- 사용자는 symbol/cooldown만 마지막으로 조정한다

장점:

- 사용자가 "내가 만든 규칙"처럼 느낀다
- 실수 방지가 쉽다

단점:

- 한 번 더 클릭이 필요하다

### Recommendation

v0.1은 **Option 2**가 낫다.

이유:

- KIFU는 판단/복기 제품이므로, 사용자가 최소한 한 번은 이해하고 눌러야 한다
- 과장 마케팅보다는 신뢰가 중요하다

---

## UI Placement Recommendation

### Best v0.1 placement

새 top-level 제품으로 빼지 말고, 아래 둘 중 하나로 시작한다.

#### A. Alerts 안의 Preset tab

- `/alerts/rules` 근처에 `Preset Strategies` 탭 추가
- 기존 alert system과 가장 자연스럽게 연결됨

#### B. Labs / Strategy Presets

- 별도 실험 탭으로 둠
- 마케팅 실험용으로 좋음
- 본체 복잡도를 덜 건드림

### Recommendation

v0.1은 **Alerts 영역 안의 Preset tab**이 가장 현실적이다.

이유:

- 이미 alert mental model이 있음
- 결과적으로 알림 생성으로 이어질 기능이기 때문
- 별도 IA를 크게 늘리지 않아도 된다

---

## Marketing-Friendly Framing

이 아이디어가 좋은 이유는 설명이 쉽기 때문이다.

### Product-facing headline examples

- "전략을 직접 짜지 말고, 바로 시험해 보세요."
- "3개의 전략 프리셋 중 하나를 고르면, 과거 성과와 실전 알림을 바로 연결합니다."
- "복잡한 설정 없이 전략을 체험하고, 마음에 들면 바로 추적하세요."

### X / content angles

- "초보자도 전략을 바로 체험할 수 있게 만들고 싶었다."
- "전략을 짜는 게 아니라, 먼저 고르고 결과를 본다."
- "KIFU는 전략 아이디어를 복기 루프로 연결한다."

---

## Risks

### 1. Backtest theater

사용자가 "백테스트 수치가 좋으니까 실제로도 잘 된다"고 오해할 수 있다.

대응:

- 항상 risk notice 고정
- 결과 카드에 `신호 수`와 `MDD`를 같이 노출
- "추천"보다 "관찰/실험/감시" 톤 사용

### 2. Scope explosion

전략 프리셋을 하다 보면 바로:

- 자유 조건 조합
- 최적화
- 포트폴리오 조합
- A/B comparison

으로 번지기 쉽다.

대응:

- v0.1은 프리셋 3~4개
- 결과 요약 카드
- alert linkage만

### 3. KIFU identity blur

너무 전형적인 백테스트 제품처럼 보이면, KIFU의 `판단/복기` 정체성이 약해질 수 있다.

대응:

- 모든 프리셋 결과 화면에서
  - "실전 알림"
  - "판단 저장"
  - "복기로 이어짐"
  를 같이 강조

---

## Suggested Data Shape

v0.1은 영구 저장보다 **정적 preset registry + 결과 summary payload**가 적절하다.

### Preset registry

```ts
type StrategyPreset = {
  id: string
  label: string
  category: 'rebound' | 'trend' | 'breakout' | 'volatility'
  description: string
  market: 'crypto'
  alert_rule_template: CreateAlertRuleRequest
  educational_note: string
}
```

### Backtest summary

```ts
type PresetBacktestSummary = {
  preset_id: string
  generated_at: string
  window: '90d' | '180d'
  signal_count: number
  win_rate: number
  avg_return_pct: number
  max_drawdown_pct: number
  recent_examples: Array<{
    symbol: string
    date: string
    result_pct: number
  }>
}
```

---

## Minimal Implementation Sequence

### Phase 0. Product framing

- preset 3개 고정
- 각 preset을 기존 `alert rule`로 매핑
- 결과 카드 스펙 확정

### Phase 1. Static prototype

- FE에 preset catalog UI 추가
- mock backtest summary 붙이기
- `이 전략으로 알림 받기` -> prefilled RuleEditor 연결

### Phase 2. Real summary generation

- 백엔드에서 preset별 집계 endpoint 추가
- 최소 90d / 180d summary 반환

### Phase 3. Behavioral loop

- preset 진입 수
- preset에서 alert 생성 전환율
- 생성 후 실제 decision 기록 비율

이 세 지표를 Growth OS와 연결

---

## Recommendation for Right Now

이 아이디어는 좋고, 마케팅 소재로도 강하다.  
하지만 지금 바로 "실전 백테스트 엔진"부터 파는 건 범위가 크다.

그래서 추천은 이렇다.

### 지금 바로 할 것

1. Preset 3개 정의
2. Alert Rule mapping 정의
3. 결과 카드 mock payload 정의
4. IA는 `Alerts > Presets`로 두기

### 지금 하지 않을 것

1. 자유 전략 빌더
2. premium cycle 전략까지 한 번에 포함
3. 자동 최적화
4. 포트폴리오 수준 비교

---

## Immediate TODO

1. preset 후보 3개 확정
2. 각 preset의 `CreateAlertRuleRequest` 템플릿 정의
3. `Alerts` 내부에 `Preset Strategies` 탭 wireframe 작성
4. backtest summary mock JSON 3개 생성
5. Growth OS 콘텐츠에서 이 기능을 어떻게 소개할지 카피 초안 연결
