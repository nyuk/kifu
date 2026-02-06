# Alert & Notification Service MVP - Design

## 1. 알림 트리거 조건 설계

유저가 설정할 수 있는 알림 조건 타입:

### 1.1 price_change (가격 변동)
> "BTC가 어제보다 $1000 떨어지면 알림"

```
type: "price_change"
config: {
  direction: "drop" | "rise" | "both"
  threshold_type: "absolute" | "percent"
  threshold_value: "1000"        // $1000 또는 5(%)
  reference: "24h" | "1h" | "4h" // 기준 시점
}
```

**체크 로직**: 현재가를 Binance에서 가져오고, reference 시간 전 가격과 비교.
`|current - reference_price| >= threshold` 이면 트리거.

### 1.2 ma_cross (이동평균선 이탈)
> "BTC가 30일 이평선 아래로 떨어지면 알림"

```
type: "ma_cross"
config: {
  ma_period: 30                  // 이평선 기간
  ma_timeframe: "1d"             // 캔들 타임프레임
  direction: "below" | "above"   // 이탈 방향
}
```

**체크 로직**: N개 캔들의 close 평균(SMA)을 계산하고, 현재가와 비교.
이전 체크에서 MA 위에 있었는데 지금 아래로 내려갔으면 트리거.

### 1.3 price_level (가격 도달)
> "BTC가 $50,000 도달하면 알림"

```
type: "price_level"
config: {
  price: "50000"
  direction: "above" | "below"   // 위로 돌파 or 아래로 이탈
}
```

**체크 로직**: 현재가가 설정 가격을 돌파/이탈했는지 체크.

### 1.4 volatility_spike (변동성 급등)
> "BTC 1시간 변동성이 평소의 2배 넘으면 알림"

```
type: "volatility_spike"
config: {
  timeframe: "1h"
  multiplier: "2.0"              // 평소 대비 배수
}
```

**체크 로직**: 최근 N시간의 표준편차 대비 현재 변동폭 비교.

---

## 2. 데이터 모델

### 2.1 alert_rules (알림 규칙)

유저가 생성하는 조건 정의.

```sql
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,              -- "BTC 1000달러 하락 알림"
    symbol VARCHAR(20) NOT NULL,             -- "BTCUSDT"
    rule_type VARCHAR(30) NOT NULL,          -- "price_change" | "ma_cross" | "price_level" | "volatility_spike"
    config JSONB NOT NULL,                   -- 조건별 설정값
    cooldown_minutes INT NOT NULL DEFAULT 60, -- 재트리거 방지 (분)
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMPTZ,           -- 마지막 트리거 시각
    last_check_state JSONB,                  -- 이전 체크 상태 (MA cross 방향 등)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_rules_user ON alert_rules(user_id);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(user_id, enabled) WHERE enabled = true;
```

### 2.2 alerts (트리거된 알림)

조건이 충족되어 발생한 알림 인스턴스.

```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    trigger_price NUMERIC(18,8) NOT NULL,    -- 트리거 시점 가격
    trigger_reason TEXT NOT NULL,            -- "BTC -$1,200 (24h 대비 -1.8%)"
    severity VARCHAR(10) NOT NULL DEFAULT 'normal', -- "normal" | "urgent"
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- "pending" | "briefed" | "decided" | "expired"
    notified_at TIMESTAMPTZ,                 -- 알림 전송 시각
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_status ON alerts(user_id, status);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
```

### 2.3 alert_briefings (AI 브리핑)

알림 발생 시 자동 수집된 AI 의견.

```sql
CREATE TABLE alert_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,           -- "openai" | "claude" | "gemini"
    model VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,                    -- 사용된 프롬프트 (증거 보존)
    response TEXT NOT NULL,                  -- AI 응답
    tokens_used INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_briefings_alert ON alert_briefings(alert_id);
```

### 2.4 alert_decisions (의사결정 기록)

유저가 알림을 보고 내린 결정.

```sql
CREATE TABLE alert_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,             -- "buy" | "sell" | "hold" | "close" | "reduce" | "add" | "ignore"
    memo TEXT,                               -- 결정 이유
    confidence VARCHAR(10),                  -- "high" | "medium" | "low"
    executed_at TIMESTAMPTZ,                 -- 실제 실행 시각 (나중에 기록 가능)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(alert_id)                         -- 알림당 1개 결정
);
```

### 2.5 alert_outcomes (결정 결과 추적)

의사결정 이후 가격이 어떻게 변했는지 추적.

```sql
CREATE TABLE alert_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    decision_id UUID NOT NULL REFERENCES alert_decisions(id) ON DELETE CASCADE,
    period VARCHAR(10) NOT NULL,             -- "1h" | "4h" | "1d"
    reference_price NUMERIC(18,8) NOT NULL,  -- 결정 시점 가격
    outcome_price NUMERIC(18,8) NOT NULL,    -- 이후 가격
    pnl_percent NUMERIC(18,8) NOT NULL,      -- 변동률
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(alert_id, period)
);
```

### 2.6 notification_channels (알림 채널 설정)

```sql
CREATE TABLE notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_type VARCHAR(20) NOT NULL,       -- "telegram" | "web_push" (확장)
    config JSONB NOT NULL,                   -- { "chat_id": "123456", "bot_token": "..." }
    enabled BOOLEAN NOT NULL DEFAULT true,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, channel_type)
);
```

---

## 3. 전체 흐름 상세

### 3.1 Phase A: 알림 규칙 설정

```
유저 → POST /api/v1/alert-rules
{
  "name": "BTC 1000달러 하락",
  "symbol": "BTCUSDT",
  "rule_type": "price_change",
  "config": {
    "direction": "drop",
    "threshold_type": "absolute",
    "threshold_value": "1000",
    "reference": "24h"
  },
  "cooldown_minutes": 60
}
```

### 3.2 Phase B: AlertMonitor Job (조건 감시)

```
[AlertMonitor - 30초마다 실행]
  │
  ├─ 1. 활성화된 alert_rules 조회 (enabled=true)
  │     └─ cooldown 지난 것만 필터
  │
  ├─ 2. 심볼별로 그룹핑
  │     └─ Binance API 호출 최소화 (같은 심볼은 1번만 조회)
  │
  ├─ 3. 각 규칙의 조건 체크
  │     ├─ price_change: 현재가 vs reference 시점 가격
  │     ├─ ma_cross: SMA 계산 + 이전 상태 비교
  │     ├─ price_level: 현재가 vs 설정 가격
  │     └─ volatility_spike: 변동성 계산
  │
  └─ 4. 조건 충족 시 → triggerAlert() 호출
```

### 3.3 Phase C: Alert 트리거 + AI 브리핑 (핵심)

```
triggerAlert(rule, currentPrice):
  │
  ├─ 1. alerts 테이블에 레코드 생성
  │     status = "pending"
  │
  ├─ 2. 컨텍스트 수집
  │     ├─ 현재 시장 데이터 (최근 50 캔들)
  │     ├─ 유저의 현재 포지션 (trades에서 미결제 포지션 계산)
  │     └─ 트리거 이유 ("BTC -$1,200, 24h 대비 -1.8%")
  │
  ├─ 3. AI 브리핑 프롬프트 생성
  │     └─ buildAlertPrompt(marketData, positions, triggerReason)
  │
  ├─ 4. 모든 활성 AI 프로바이더에 병렬 요청
  │     ├─ OpenAI → alert_briefings 저장
  │     ├─ Claude → alert_briefings 저장
  │     └─ Gemini → alert_briefings 저장
  │
  ├─ 5. alert status → "briefed"
  │
  └─ 6. 알림 발송 (Telegram)
        ├─ 요약: "[긴급] BTC -$1,200 하락"
        ├─ AI 요약 1줄씩
        └─ 딥링크: kifu://alerts/{alertID}
```

### 3.4 Phase D: 유저 의사결정

```
유저가 알림 확인 후:

Option 1 - 결정 기록:
POST /api/v1/alerts/{id}/decision
{
  "action": "reduce",        // 포지션 축소
  "memo": "AI 3개 모두 하락 경고, 50% 축소",
  "confidence": "high"
}

Option 2 - 무시:
알림을 그냥 두면 24시간 후 status → "expired"
```

### 3.5 Phase E: 결과 추적

```
[AlertOutcomeCalculator Job - 60초마다]
  │
  ├─ status="decided"인 alert 중 outcome 미계산건 조회
  │
  ├─ decision 시점 가격 기준 1h, 4h, 1d 후 가격 비교
  │     └─ 기존 OutcomeCalculator 로직 재사용
  │
  └─ alert_outcomes 저장
        → 복기 대시보드에서 "알림 대응 성과" 분석 가능
```

---

## 4. AI 브리핑 프롬프트 설계

```
당신은 암호화폐 트레이딩 위기 대응 어드바이저입니다.

## 긴급 상황
- 심볼: {symbol}
- 트리거: {trigger_reason}
- 현재가: {current_price}
- 트리거 시각: {triggered_at}

## 유저 포지션
- 방향: {position_side} (Long/Short/None)
- 진입가: {entry_price}
- 수량: {quantity}
- 현재 미실현 PnL: {unrealized_pnl}

## 최근 시장 데이터
{recent_50_candles}

## 요청
1. 현재 상황을 3줄로 요약
2. 즉시 행동 권고 (매수/매도/홀드/감축 중 택 1)
3. 권고 이유 (2줄)
4. 주의할 리스크 (1줄)
5. 확신도 (1~10)

간결하게 답변하세요. 숫자와 근거 중심으로.
```

---

## 5. Telegram Bot 설계

### 5.1 연동 플로우

```
1. 유저가 Settings에서 "Telegram 연동" 클릭
2. 서버가 고유 인증 코드 생성 (6자리, 5분 만료)
3. 유저가 kifu Bot에 /start {인증코드} 전송
4. Bot이 인증코드 검증 → chat_id 저장
5. notification_channels에 telegram config 저장 (verified=true)
```

### 5.2 알림 메시지 포맷

```
🔴 [긴급] BTC -$1,200 하락

📊 현재: $64,800 (24h 대비 -1.8%)
📍 내 포지션: Long 0.5 BTC @ $66,000
💰 미실현 PnL: -$600

🤖 AI 브리핑:
• OpenAI: 단기 하락 지속 가능, 감축 권고 (확신 7/10)
• Claude: 지지선 $64,500 테스트 중, 홀드 (확신 6/10)
• Gemini: 과매도 구간, 반등 가능성 (확신 5/10)

[📱 상세 확인하기] ← 앱 딥링크
[✅ 결정 기록하기] ← 앱 딥링크
```

### 5.3 Backend 구조

```go
// NotificationChannel 인터페이스 (확장 가능)
type NotificationSender interface {
    Send(ctx context.Context, userID uuid.UUID, message NotificationMessage) error
}

// Telegram 구현체
type TelegramSender struct {
    botToken string
    client   *http.Client
}

// 메시지 구조
type NotificationMessage struct {
    Title    string
    Body     string
    Severity string // "normal" | "urgent"
    DeepLink string // "kifu://alerts/{id}"
}
```

---

## 6. API Endpoints

### Alert Rules
```
POST   /api/v1/alert-rules          - 규칙 생성
GET    /api/v1/alert-rules          - 규칙 목록
GET    /api/v1/alert-rules/:id      - 규칙 상세
PUT    /api/v1/alert-rules/:id      - 규칙 수정
DELETE /api/v1/alert-rules/:id      - 규칙 삭제
PATCH  /api/v1/alert-rules/:id/toggle - 활성/비활성 토글
```

### Alerts
```
GET    /api/v1/alerts               - 발생한 알림 목록 (필터: status, symbol)
GET    /api/v1/alerts/:id           - 알림 상세 (AI 브리핑 포함)
POST   /api/v1/alerts/:id/decision  - 의사결정 기록
GET    /api/v1/alerts/:id/outcome   - 결정 결과 조회
PATCH  /api/v1/alerts/:id/dismiss   - 알림 무시
```

### Notification Settings
```
POST   /api/v1/notifications/telegram/connect    - 텔레그램 연동 시작 (인증코드 발급)
POST   /api/v1/notifications/telegram/verify     - 인증코드 확인
DELETE /api/v1/notifications/telegram             - 텔레그램 연동 해제
GET    /api/v1/notifications/channels             - 연동된 채널 목록
```

### Telegram Webhook
```
POST   /api/v1/webhook/telegram     - 텔레그램 봇 웹훅 (Bot → Server)
```

---

## 7. Backend 구조 (Clean Architecture)

### 7.1 Entities (domain/entities/)
```
alert_rule.go       - AlertRule 엔티티
alert.go            - Alert, AlertBriefing, AlertDecision, AlertOutcome 엔티티
notification.go     - NotificationChannel 엔티티
```

### 7.2 Repositories (domain/repositories/)
```
alert_rule_repository.go       - AlertRuleRepository 인터페이스
alert_repository.go            - AlertRepository 인터페이스
alert_briefing_repository.go   - AlertBriefingRepository 인터페이스
alert_decision_repository.go   - AlertDecisionRepository 인터페이스
alert_outcome_repository.go    - AlertOutcomeRepository 인터페이스
notification_repository.go     - NotificationChannelRepository 인터페이스
```

### 7.3 Infrastructure
```
repositories/
  alert_rule_impl.go
  alert_impl.go
  alert_briefing_impl.go
  alert_decision_impl.go
  alert_outcome_impl.go
  notification_impl.go

notification/
  sender.go           - NotificationSender 인터페이스
  telegram.go         - TelegramSender 구현체
```

### 7.4 Handlers (interfaces/http/handlers/)
```
alert_rule_handler.go    - 알림 규칙 CRUD
alert_handler.go         - 알림 조회/결정 기록  (기존 이름 충돌 없음)
notification_handler.go  - 텔레그램 연동/웹훅
```

### 7.5 Jobs (jobs/)
```
alert_monitor.go         - 조건 감시 + 트리거
alert_outcome_calc.go    - 결정 결과 추적
```

---

## 8. 데이터 흐름 다이어그램

```
                    ┌─────────────────────┐
                    │   Binance API       │
                    │  (Price/Kline)      │
                    └────────┬────────────┘
                             │
                    ┌────────▼────────────┐
                    │  AlertMonitor Job   │
                    │  (30초 주기)         │
                    │                     │
                    │ 1. 활성 규칙 로드    │
                    │ 2. 심볼별 가격 조회  │
                    │ 3. 조건 평가         │
                    └────────┬────────────┘
                             │ 조건 충족
                    ┌────────▼────────────┐
                    │   triggerAlert()    │
                    │                     │
                    │ 1. Alert 생성       │
                    │ 2. 시장 데이터 수집  │
                    │ 3. 포지션 정보 조회  │
                    └────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ OpenAI   │  │ Claude   │  │ Gemini   │
        │ API Call │  │ API Call │  │ API Call │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────────┐
                    │ alert_briefings     │
                    │ 테이블에 저장        │
                    └────────┬────────────┘
                             │
                    ┌────────▼────────────┐
                    │  TelegramSender     │
                    │  요약 메시지 발송    │
                    └────────┬────────────┘
                             │
                    ┌────────▼────────────┐
                    │  유저 (Telegram)    │
                    │  알림 수신          │
                    │  ↓                  │
                    │  앱에서 상세 확인   │
                    │  ↓                  │
                    │  의사결정 기록      │
                    └────────┬────────────┘
                             │
                    ┌────────▼──────────────┐
                    │ AlertOutcomeCalc Job │
                    │ 1h/4h/1d 후 가격 비교│
                    │ → 복기 데이터 축적   │
                    └──────────────────────┘
```

---

## 9. Migration 파일

```sql
-- 007_alert_notification.sql

-- Alert Rules
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    rule_type VARCHAR(30) NOT NULL CHECK (rule_type IN ('price_change', 'ma_cross', 'price_level', 'volatility_spike')),
    config JSONB NOT NULL,
    cooldown_minutes INT NOT NULL DEFAULT 60,
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    last_check_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_rules_user ON alert_rules(user_id);
CREATE INDEX idx_alert_rules_active ON alert_rules(user_id, enabled) WHERE enabled = true;

-- Alerts (트리거된 알림)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    trigger_price NUMERIC(18,8) NOT NULL,
    trigger_reason TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (severity IN ('normal', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'briefed', 'decided', 'expired')),
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_status ON alerts(user_id, status);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- AI Briefings
CREATE TABLE alert_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    tokens_used INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_briefings_alert ON alert_briefings(alert_id);

-- User Decisions
CREATE TABLE alert_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('buy', 'sell', 'hold', 'close', 'reduce', 'add', 'ignore')),
    memo TEXT,
    confidence VARCHAR(10) CHECK (confidence IN ('high', 'medium', 'low')),
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(alert_id)
);

-- Decision Outcomes
CREATE TABLE alert_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    decision_id UUID NOT NULL REFERENCES alert_decisions(id) ON DELETE CASCADE,
    period VARCHAR(10) NOT NULL CHECK (period IN ('1h', '4h', '1d')),
    reference_price NUMERIC(18,8) NOT NULL,
    outcome_price NUMERIC(18,8) NOT NULL,
    pnl_percent NUMERIC(18,8) NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(alert_id, period)
);

-- Notification Channels
CREATE TABLE notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('telegram', 'web_push')),
    config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, channel_type)
);

-- Telegram Verification Codes (임시, 만료 후 삭제)
CREATE TABLE telegram_verify_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telegram_verify_code ON telegram_verify_codes(code) WHERE used = false;
```

---

## 10. 구현 우선순위

### Step 1: 기반 (DB + Entities)
- Migration 007 실행
- Entity 정의 (alert_rule.go, alert.go, notification.go)
- Repository 인터페이스 + 구현체

### Step 2: AlertMonitor Job
- Binance 가격 폴링 (기존 패턴 재사용)
- 조건 평가 엔진 (price_change, price_level 우선)
- ma_cross는 Step 2.5에서 추가

### Step 3: AI 자동 브리핑
- 기존 ai_handler.go의 callProvider 로직을 서비스로 추출
- 알림 전용 프롬프트 (buildAlertPrompt)
- alert_briefings에 저장

### Step 4: Telegram Bot
- Bot 생성 + 웹훅 설정
- 연동 플로우 (인증코드 → /start → chat_id 저장)
- 알림 메시지 발송

### Step 5: 의사결정 + 결과 추적
- 결정 기록 API
- AlertOutcomeCalculator Job
- 만료 처리 (24h 후 자동 expired)

### Step 6: 프론트엔드
- Settings에 Telegram 연동 UI
- Alert Rules 관리 페이지
- Alert 상세 + AI 브리핑 뷰
- 의사결정 입력 폼

---

## 11. 설계 결정 사항

| 결정 | 선택 | 이유 |
|------|------|------|
| 알림 채널 | Telegram 우선 + 인터페이스 추상화 | MVP 최소 공수, 나중에 Push 추가 가능 |
| 가격 데이터 | Binance REST API 폴링 | WebSocket은 MVP에서 오버엔지니어링, 30초 간격이면 충분 |
| AI 호출 | 기존 callProvider 로직 재사용 | 코드 중복 방지, 이미 검증된 구조 |
| 조건 체크 주기 | 30초 | 가격 변동 민감도 vs API 부하 균형 |
| cooldown | 규칙별 설정 (기본 60분) | 같은 조건으로 알림 도배 방지 |
| 결정 만료 | 24시간 후 자동 expired | 오래된 알림은 의미 없음 |
| 포지션 정보 | trades 테이블에서 계산 | 별도 positions 테이블 없이 MVP 진행 |
