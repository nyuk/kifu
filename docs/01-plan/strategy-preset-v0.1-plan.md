# Strategy Preset v0.1 — Implementation Plan

## Summary

KIFU 사용자가 "전략 프리셋 카드 → 백테스트 결과 확인 → 알림 생성 → 판단/복기 루프 진입"까지 한 흐름으로 가게 만드는 기능.

v0.1은 **BTC 전용**, 자체 백테스트 데이터 기반, 3개 프리셋 고정.

## Background

### 이전 계획과 달라진 점

| 항목 | 이전 (spec v0.1) | 현재 (plan v0.1) |
|------|-----------------|-----------------|
| 프리셋 | 급락반등, 추세회복, 변동성급증 | 급락반등(극단), 변동성급증, **사이클저점** |
| 데이터 소스 | Python 프리미엄 백테스트 재사용 | **자체 BTC 15m 백테스트** |
| 추세 회복 | MA cross | **제거** (BTC에서 엣지 없음 확인) |
| 시간 프레임 | 15m 단일 | **단기(24h~48h) + 중장기(90일)** 혼합 |
| 승률 정의 | 미정 | TP 도달=승, SL/타임아웃=패 (수수료 0.08% 차감) |

### 제거 근거

- **추세 회복 (MA cross)**: 6년 218K 바 데이터에서 MA period 10~80h, TP/SL 전 조합 스윕 결과 수수료 후 0.3% 이상 나오는 조합이 0개.
- **Python 프리미엄 데이터**: 업비트-바이낸스 프리미엄 차익거래 전략이라 단일 BTC 페어 전략과 시장 구조가 다름. 승률/MDD를 가져다 쓸 수 없음.
- **RSI 과매도**: RSI(12h)<20 기준 평균 +1.83%로 효과적이지만 6년간 17회로 빈도 부족. 별도 프리셋 대신 급락반등의 보조 필터 후보로 보류.

## Confirmed Presets

### Preset 1: 급락 반등 감시

| 항목 | 값 |
|------|---|
| ID | `extreme-dip-v1` |
| 진입 조건 | 24시간 고점 대비 -15% 이상 하락 |
| 익절 | +5% |
| 손절 | -7% |
| 타임아웃 | 24시간 (96 bars) |
| 전체 거래수 | 41 (2020~2026) |
| 승률 | 68.3% |
| 평균 수익(수수료후) | +1.67% |
| 누적 수익 | +68.6% |
| 위험도 | 높음 |
| 사용자 문구 | "24시간 내 15% 이상 급락 후 반등 기회를 감시합니다." |

**Alert rule 매핑:**
```json
{
  "name": "급락 반등 감시",
  "symbol": "BTCUSDT",
  "rule_type": "price_change",
  "config": {
    "direction": "drop",
    "threshold_type": "percent",
    "threshold_value": "15",
    "reference": "24h"
  },
  "cooldown_minutes": 1440
}
```

### Preset 2: 변동성 급증 감시

| 항목 | 값 |
|------|---|
| ID | `vol-spike-v1` |
| 진입 조건 | 12시간 변동성 > 3.5일 평균 변동성의 1.8배 |
| 익절 | +5% |
| 손절 | -7% |
| 타임아웃 | 48시간 (192 bars) |
| 전체 거래수 | 171 (2020~2026) |
| 승률 | 60.8% |
| 평균 수익(수수료후) | +0.72% |
| 누적 수익 | +123.5% |
| 위험도 | 중간 |
| 사용자 문구 | "12시간 변동성이 평소의 1.8배를 넘으면 큰 움직임 시작을 감시합니다." |

**Alert rule 매핑:**
```json
{
  "name": "변동성 급증 감시",
  "symbol": "BTCUSDT",
  "rule_type": "volatility_spike",
  "config": {
    "timeframe": "12h",
    "multiplier": "1.8"
  },
  "cooldown_minutes": 720
}
```

### Preset 3: 사이클 저점 매수

| 항목 | 값 |
|------|---|
| ID | `cycle-accum-v1` |
| 진입 조건 | 90일 고점 대비 -20% 이상 하락 |
| 익절 | +30% |
| 손절 | -20% |
| 타임아웃 | 90일 (8,640 bars) |
| 전체 거래수 | 30 (2020~2026) |
| 승률 | 60.0% |
| 평균 수익(수수료후) | +8.88% |
| 누적 수익 | +266.4% |
| 위험도 | 높음 |
| 사용자 문구 | "90일 고점 대비 20% 이상 하락한 구간에서 중장기 매집 기회를 감시합니다." |

**Alert rule 매핑:**
```json
{
  "name": "사이클 저점 매수",
  "symbol": "BTCUSDT",
  "rule_type": "price_change",
  "config": {
    "direction": "drop",
    "threshold_type": "percent",
    "threshold_value": "20",
    "reference": "90d"
  },
  "cooldown_minutes": 10080
}
```

**주의**: 기존 `price_change` alert rule은 `reference: "24h"`만 지원할 수 있음. `"90d"` 지원을 위해 alert monitor 수정이 필요할 수 있음. → Phase 2에서 확인.

## Data Source

- **파일**: `preset_backtest_results_final.json` (자체 생성)
- **원본 데이터**: `binance_btcusdt_15m_cache.csv` (2020-01-01 ~ 2026-03-22, 218K 행)
- **수수료**: 0.08% round-trip 차감 적용
- **갱신 방식**: v0.1은 정적. 백테스트 스크립트 재실행으로 수동 갱신.
- **카드에 기준일 표시**: 반드시 `generated_at` 노출. 7일 이상 지나면 stale 표시.

## UI Design

### IA (Information Architecture)

```
Alerts
├─ Triggered Alerts
├─ Alert Rules
└─ Strategy Presets   ← 신규
```

### Preset Strategies 화면

```
[헤더]
- 제목: Strategy Presets
- 부제: KIFU가 검증한 전략을 확인하고, 마음에 들면 알림으로 연결하세요.

[상단 고지]
- 과거 성과는 미래 결과를 보장하지 않습니다.
- BTC 15분봉 데이터 기준 (2020~2026). 수수료 0.08% 차감 적용.

[카드 3개]
각 카드:
- 이름 + 위험도 배지 (중간/높음)
- 한 줄 설명
- 핵심 수치 4개:
  - 승률
  - 평균 수익(수수료후)
  - 거래 수
  - 평균 보유 시간
- 기준일 라벨 (generated_at)
- 최근 예시 2~3개
- CTA: "이 전략으로 알림 받기"
```

### 카드 레이아웃 고려사항

- Preset 1,2는 **단기** (시간 단위) → 평균 보유 "시간"으로 표시
- Preset 3는 **중장기** (일 단위) → 평균 보유 "일"로 표시
- 카드에 시간 프레임 배지 추가: `단기` / `중장기`

### Alert 연결 UX

`이 전략으로 알림 받기` 클릭 시:
1. 기존 `RuleEditor`가 prefill 상태로 열림
2. Prefill 값: symbol=BTCUSDT, rule_type/config는 프리셋 템플릿에서
3. 사용자는 cooldown만 마지막으로 확인 후 저장
4. v0.1에서 심볼 변경 불가 (BTC 전용이므로)

## Implementation Phases

### Phase 1: 프론트 정적 카드 (MVP)

**목표**: 백테스트 결과를 카드로 보여주고 알림 연결

1. `Alerts` 하위에 `Preset Strategies` 탭 추가
2. `preset_backtest_results_final.json`을 프론트에 정적 import
3. `PresetCard` 컴포넌트 구현 (이름, 수치 4개, 예시, CTA)
4. CTA 클릭 → `RuleEditor` prefill open
5. 상단 risk notice 고정

**건드리는 파일 (예상)**:
- `frontend/src/types/preset.ts` — 타입 정의
- `frontend/src/components/presets/PresetCard.tsx` — 카드 컴포넌트
- `frontend/src/components/presets/PresetStrategies.tsx` — 탭 페이지
- `frontend/src/components/alerts/` — 탭 추가, RuleEditor prefill 연동
- `frontend/app/` — 라우팅 (필요시)

**건드리지 않는 것**:
- 백엔드 API 없음 (정적 JSON 사용)
- alert rule 모델 변경 없음
- 새 DB 테이블 없음

### Phase 2: Alert 연결 검증

**목표**: 프리셋에서 생성한 alert rule이 실제로 트리거되는지 확인

1. Preset 1,2의 alert rule이 기존 `alert_monitor.go`에서 정상 트리거되는지 확인
2. Preset 3의 `reference: "90d"` 지원 여부 확인 → 필요시 alert monitor 확장
3. cooldown 설정이 프리셋 성격에 맞는지 검증

### Phase 3: 백테스트 갱신 자동화 (optional)

**목표**: 백테스트 결과를 주기적으로 갱신

1. `preset_backtest_final.py` 스크립트를 cronjob 또는 수동 실행
2. 결과 JSON을 프론트 빌드에 포함하거나 API endpoint로 서빙
3. Growth OS에 프리셋 → 알림 전환율 지표 연결

## Frontend Types

```typescript
type PresetCategory = 'rebound' | 'volatility' | 'cycle'
type PresetRiskLevel = 'low' | 'medium' | 'high'
type PresetTimeframe = 'short' | 'long'

type PresetStrategy = {
  id: string
  label: string
  short_description: string
  category: PresetCategory
  risk_level: PresetRiskLevel
  educational_note: string
  params: Record<string, string>
  alert_rule_template: CreateAlertRuleRequest
  summary_all: PresetSummary
  summary_180d: PresetSummary
  summary_90d: PresetSummary
  recent_examples: PresetExample[]
  risk_notice: string
}

type PresetSummary = {
  signal_count: number
  win_rate: number
  avg_return_pct: number
  total_return_pct: number
  max_drawdown_pct: number
  avg_hold_bars: number
  avg_hold_hours: number
  window: string
  tp_count: number
  sl_count: number
  timeout_count: number
}

type PresetExample = {
  date: string
  entry_price: number
  result_pct: number
  exit_type: 'tp' | 'sl' | 'timeout'
  bars_held: number
}
```

## What We Do NOT Build in v0.1

- 자유 전략 빌더
- 파라미터 최적화
- 다중 심볼 (ETH, SOL 등)
- 실시간 백테스트 재계산
- 포트폴리오 수준 비교
- 전략 자동 실행
- RSI 과매도 프리셋 (빈도 부족으로 보류)
- Python 프리미엄 데이터 연동 (시장 구조 불일치)

## Copy Rules

### 허용 톤

- 관찰, 감시, 실험, 확인

### 금지 톤

- 추천, 확실한 수익, 자동 매매, 검증된 수익 전략

### 반드시 포함

- "과거 성과는 미래 결과를 보장하지 않습니다"
- 기준 데이터 범위 (2020~2026)
- 수수료 차감 사실

## Success Criteria

1. 3개 프리셋 카드가 `/alerts` 안에 표시된다
2. 각 카드에 승률, 평균수익, 거래수, 보유기간이 보인다
3. "이 전략으로 알림 받기"를 누르면 RuleEditor가 prefill 상태로 열린다
4. 상단에 risk notice가 항상 보인다
5. 기준일이 카드에 표시된다

## Risk & Mitigation

| 위험 | 대응 |
|------|------|
| 사이클 저점의 90d reference를 alert monitor가 지원 안 할 수 있음 | Phase 2에서 확인. 필요시 alert monitor 확장 또는 v0.1에서 해당 프리셋의 알림 연결만 비활성화 |
| 최근 180d/90d 수치가 나쁠 수 있음 | 카드에 "전체 기간" 수치를 메인으로, 최근 수치는 보조로 표시 |
| 카드 수치가 현재 시점과 괴리 | generated_at 표시 + 7일 초과 시 stale 배지 |
| 거래수가 적어 통계적 신뢰도 의문 | 교육적 고지문으로 투명하게 설명 ("6년간 N회 발생 기준") |
