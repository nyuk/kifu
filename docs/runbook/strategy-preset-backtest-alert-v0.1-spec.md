# Strategy Preset Backtest + Alert Linkage v0.1 Spec

## Purpose

이 문서는 `전략 프리셋 기반 백테스트 + 알림 연동` 아이디어를 **구현 직전 수준**으로 구체화한 명세다.

이 단계의 목표는:

1. 프리셋 3개를 확정하고
2. `Alerts > Presets` 화면에 무엇이 보여야 하는지 정하고
3. 프론트/백엔드가 주고받을 JSON 계약을 고정하는 것

즉, 아직 코드 구현은 하지 않되,  
다른 모델이나 다른 작업자에게 보여줘도 같은 그림을 보게 만드는 문서다.

---

## Product Positioning

이 기능은 `전략 연구 도구`가 아니라 아래 흐름을 빠르게 여는 제품 요소다.

```text
전략 고르기
→ 과거 성과 요약 보기
→ 위험 고지 이해하기
→ 이 전략을 알림으로 연결하기
→ 실제 판단/복기로 이어가기
```

핵심은:

- 자유 전략 빌더가 아님
- 최적화 엔진이 아님
- 실전 알림과 복기 루프로 이어지는 `전략 체험 입구`

---

## Preset Set v0.1

v0.1에서는 3개만 간다.

선정 기준:

- 한 문장 설명이 쉬울 것
- 기존 alert rule 모델에 무리 없이 매핑될 것
- 초보자도 직관적으로 이해할 수 있을 것

### Preset 1. 급락 반등 감시

#### 사용자 설명

하루 안에 큰 폭으로 빠진 뒤, 단기 반등 기회가 생길 수 있는 구간을 감시합니다.

#### 사용자에게 보여줄 한 줄

> "많이 빠졌을 때만 반등 기회를 관찰합니다."

#### 기본 용도

- 관찰용 / 반등 시도형
- 초보자용 대표 프리셋

#### Alert rule mapping

```json
{
  "name": "급락 반등 감시",
  "symbol": "BTCUSDT",
  "rule_type": "price_change",
  "config": {
    "direction": "drop",
    "threshold_type": "percent",
    "threshold_value": "5",
    "reference": "24h"
  },
  "cooldown_minutes": 240
}
```

#### KPI card wording

- 승률
- 평균 반등률
- 최대 낙폭
- 총 신호 수

---

### Preset 2. 추세 회복 감시

#### 사용자 설명

가격이 평균선 아래로 밀렸다가 다시 회복하려는 구간을 감시합니다.

#### 사용자에게 보여줄 한 줄

> "약해진 추세가 다시 살아나는 순간만 포착합니다."

#### 기본 용도

- 실전형 / 추세 회복형
- 초보자보다 중간 사용자가 이해하기 쉬움

#### Alert rule mapping

```json
{
  "name": "추세 회복 감시",
  "symbol": "BTCUSDT",
  "rule_type": "ma_cross",
  "config": {
    "ma_period": 20,
    "ma_timeframe": "1h",
    "direction": "above"
  },
  "cooldown_minutes": 180
}
```

#### KPI card wording

- 승률
- 평균 추세 지속률
- 최대 역행폭
- 총 신호 수

---

### Preset 3. 변동성 급증 감시

#### 사용자 설명

평소보다 갑자기 큰 움직임이 시작될 때만 감시합니다.

#### 사용자에게 보여줄 한 줄

> "조용한 시장보다, 움직임이 시작되는 순간만 추적합니다."

#### 기본 용도

- 관찰용 / 브레이크아웃 감시형
- 알림 구독 전환이 쉬운 프리셋

#### Alert rule mapping

```json
{
  "name": "변동성 급증 감시",
  "symbol": "BTCUSDT",
  "rule_type": "volatility_spike",
  "config": {
    "timeframe": "1h",
    "multiplier": "2.0"
  },
  "cooldown_minutes": 120
}
```

#### KPI card wording

- 신호 후 평균 움직임
- 오탐 비율
- 최대 흔들림
- 총 신호 수

---

## Why These 3

이 3개 조합이 좋은 이유:

1. 서로 겹치지 않는다
   - 반등
   - 추세 회복
   - 변동성 돌입

2. 설명이 쉽다
   - 마케팅 문구로도 바로 전환 가능하다

3. 기존 KIFU alert rule과 1:1 매핑이 된다
   - 별도 엔진 없이도 v0.1을 시작할 수 있다

---

## IA Recommendation

### Recommended placement

`/alerts/rules` 안에 `Preset Strategies` 탭을 추가한다.

이유:

- 프리셋의 최종 목적이 알림 생성이기 때문
- 새 top-level navigation을 늘리지 않아도 됨
- 사용자의 정신 모델이 단순함

### Tab structure

```text
Alerts
├─ Triggered Alerts
├─ Alert Rules
└─ Preset Strategies   ← 신규
```

---

## Preset Strategies Screen Spec

### Screen goal

사용자가:

1. 프리셋을 비교하고
2. 위험/성과를 간단히 이해하고
3. 마음에 들면 알림 생성으로 넘어가게 한다

### Layout

```text
[헤더]
- 제목: Preset Strategies
- 부제: 전략을 직접 짜지 않고, KIFU가 준비한 전략을 먼저 시험해 보세요.

[상단 고지]
- 과거 성과는 미래 결과를 보장하지 않습니다.
- 이 화면은 전략 추천이 아니라 관찰/실험용 비교 화면입니다.

[프리셋 카드 3개]
- 이름
- 한 줄 설명
- 위험 태그 (낮음 / 중간 / 높음)
- 요약 성과 4개
- 최근 예시 2개
- CTA 1: 백테스트 자세히 보기
- CTA 2: 이 전략으로 알림 받기
```

### Card spec

각 카드에는 아래가 반드시 들어가야 한다.

#### Header

- preset label
- category badge
- 위험도 badge

#### Summary metrics

- 신호 수
- 승률
- 평균 기대수익 또는 평균 움직임
- 최대 낙폭(MDD) 또는 최대 역행폭

#### Footer

- risk notice 1줄
- `백테스트 자세히 보기`
- `이 전략으로 알림 받기`

---

## Detailed View Spec

`백테스트 자세히 보기`를 누르면 modal 또는 side panel로 충분하다.  
v0.1에서는 별도 deep page가 없어도 된다.

### Detail panel contents

1. 프리셋 설명
2. 어떤 조건을 보는지
3. 어떤 상황에서 약한지
4. 최근 예시 5개
5. 과거 성과 고지
6. `이 전략으로 알림 받기`

### Not included in v0.1

- 캔들 단위 전체 차트 replay
- parameter optimization
- 여러 프리셋 동시 비교 테이블

---

## Alert Linkage UX

### Recommended behavior

`이 전략으로 알림 받기`를 누르면:

1. prefilled RuleEditor가 열린다
2. 아래만 사용자가 마지막으로 확인한다
   - symbol
   - cooldown
   - threshold (필요한 경우)
3. 저장

### Why prefilled editor

- 사용자가 "내가 설정했다"는 감각이 생긴다
- KIFU의 판단 제품 성격과 맞다
- 나중에 고급 사용자에게 확장하기 쉽다

### Button label options

- `이 전략으로 알림 받기`
- `이 전략 감시 시작`
- `이 전략을 내 알림으로 추가`

추천:

> `이 전략으로 알림 받기`

이게 가장 직관적이다.

---

## Frontend Contract

### Preset registry

```ts
type StrategyPresetCategory = 'rebound' | 'trend' | 'volatility'

type StrategyPreset = {
  id: string
  label: string
  short_description: string
  category: StrategyPresetCategory
  market: 'crypto'
  risk_level: 'low' | 'medium' | 'high'
  educational_note: string
  alert_rule_template: CreateAlertRuleRequest
}
```

### Example registry payload

```json
[
  {
    "id": "dip-rebound-v1",
    "label": "급락 반등 감시",
    "short_description": "큰 폭으로 빠진 뒤 반등 기회를 감시합니다.",
    "category": "rebound",
    "market": "crypto",
    "risk_level": "medium",
    "educational_note": "반등형 전략은 추가 하락을 잘못 잡을 수 있습니다.",
    "alert_rule_template": {
      "name": "급락 반등 감시",
      "symbol": "BTCUSDT",
      "rule_type": "price_change",
      "config": {
        "direction": "drop",
        "threshold_type": "percent",
        "threshold_value": "5",
        "reference": "24h"
      },
      "cooldown_minutes": 240
    }
  }
]
```

---

## Backtest Summary Contract

### Summary shape

```ts
type StrategyPresetBacktestSummary = {
  preset_id: string
  generated_at: string
  window: '90d' | '180d'
  summary: {
    signal_count: number
    win_rate: number
    avg_return_pct: number
    max_drawdown_pct: number
  }
  recent_examples: Array<{
    symbol: string
    date: string
    result_pct: number
  }>
  risk_notice: string
}
```

### Example summary payload

```json
{
  "preset_id": "trend-recovery-v1",
  "generated_at": "2026-03-21T09:00:00Z",
  "window": "180d",
  "summary": {
    "signal_count": 31,
    "win_rate": 54.8,
    "avg_return_pct": 1.6,
    "max_drawdown_pct": -5.3
  },
  "recent_examples": [
    { "symbol": "BTCUSDT", "date": "2026-02-14", "result_pct": 2.1 },
    { "symbol": "ETHUSDT", "date": "2026-02-22", "result_pct": -1.7 },
    { "symbol": "SOLUSDT", "date": "2026-03-02", "result_pct": 3.8 }
  ],
  "risk_notice": "과거 성과는 미래 결과를 보장하지 않습니다."
}
```

---

## Endpoint Recommendation

v0.1은 endpoint를 크게 늘리지 않는 게 좋다.

### Candidate endpoints

#### 1. Preset catalog

```text
GET /api/v1/strategy-presets
```

#### 2. Single preset summary

```text
GET /api/v1/strategy-presets/{preset_id}/backtest-summary?window=180d
```

#### 3. Prefill only (optional)

프론트에서 registry만으로 충분하면 따로 필요 없음.

---

## Data Generation Strategy

v0.1에서는 진짜 full backtest engine을 새로 만들지 않는다.

대신:

- 각 preset의 정의를 고정하고
- 필요한 요약 수치만 백엔드에서 계산해서 반환

즉, **전략 설명과 요약 카드**가 우선이다.

추천:

1. preset registry는 정적
2. summary는 백엔드 계산
3. detail examples는 제한된 샘플만 반환

---

## Copy Rules

이 기능은 과장되기 쉬우므로 copy 원칙을 고정한다.

### Allowed tone

- 관찰
- 감시
- 실험
- 비교

### Avoid

- 추천
- 확실한 수익
- 자동 매수 전략
- 검증된 수익 전략

### Example safe copy

- "이 전략은 이런 구간을 감시합니다."
- "과거에는 이런 성과를 보였습니다."
- "마음에 들면 알림으로 연결해 보세요."

---

## What We Explicitly Do Not Build in v0.1

- 자유 전략 조합 빌더
- preset parameter optimizer
- multi-preset portfolio allocator
- premium cycle integration
- 전략 자동 실행

---

## Open Questions for Review

다른 모델에게 물어볼 때도 아래 질문이면 좋다.

1. 프리셋 3개 조합이 충분히 설명 가능하고 겹치지 않는가?
2. `Alerts > Presets` placement가 맞는가, 아니면 별도 Labs가 더 나은가?
3. prefilled RuleEditor 방식이 one-click 생성보다 더 KIFU다운가?
4. summary card에 꼭 필요한 4개 숫자가 맞는가?
5. v0.1에서 어떤 프리셋이 가장 전환이 잘 날 것 같은가?

---

## Immediate Next Step

구현 직전 단계에서 해야 할 것은 이 3개다.

1. preset 3개 최종 확정
2. summary metric 이름 확정
3. `Alerts > Presets` 와이어프레임을 더 구체화

