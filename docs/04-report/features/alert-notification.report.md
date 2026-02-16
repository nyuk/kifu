> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# Alert & Notification Service MVP - Completion Report

> 완료일: 2026-02-06 | PDCA 종합 일치율: **93%** | Status: **PASS**

---

## 1. 요약

트레이딩 중 특정 시장 조건(가격 변동, 이평선 이탈, 가격 도달, 변동성 급등)이 발생하면 자동으로 AI 에이전트 3개(OpenAI, Claude, Gemini)가 시장 상황 + 유저 포지션을 분석한 브리핑을 생성하고, Telegram으로 요약을 발송하여 유저가 빠르게 의사결정할 수 있도록 돕는 시스템.

**핵심 플로우**: 규칙 설정 → 조건 감시(30초) → AI 자동 브리핑 → Telegram 알림 → 의사결정 기록 → 결과 추적(1h/4h/1d)

---

## 2. PDCA 사이클 이력

| Phase | 상태 | 비고 |
|-------|:----:|------|
| Plan | ✅ 완료 | `docs/01-plan/features/alert-notification.plan.md` |
| Design | ✅ 완료 | `docs/02-design/features/alert-notification.design.md` (11개 섹션) |
| Do | ✅ 완료 | 17개 파일 생성, 2개 파일 수정 |
| Check | ✅ 93% | `docs/03-analysis/alert-notification.analysis.md` |
| Act | ✅ 완료 | volatility_spike 구현으로 90% → 93% 개선 |

---

## 3. 구현 산출물

### 3.1 신규 파일 (17개)

| 레이어 | 파일 | 역할 |
|--------|------|------|
| Migration | `migrations/007_alert_notification.sql` | 7개 테이블 생성 |
| Entity | `domain/entities/alert_rule.go` | AlertRule, 4개 Config 구조체, CheckState |
| Entity | `domain/entities/alert.go` | Alert, Briefing, Decision, Outcome 엔티티 |
| Entity | `domain/entities/notification.go` | NotificationChannel, TelegramVerifyCode |
| Repository (I) | `domain/repositories/alert_rule_repository.go` | AlertRuleRepository 인터페이스 |
| Repository (I) | `domain/repositories/alert_repository.go` | 4개 Repository 인터페이스 |
| Repository (I) | `domain/repositories/notification_repository.go` | Channel + VerifyCode 인터페이스 |
| Repository (Impl) | `infrastructure/repositories/alert_rule_repository_impl.go` | CRUD + 상태 업데이트 |
| Repository (Impl) | `infrastructure/repositories/alert_repository_impl.go` | 4개 Repository 통합 구현 |
| Repository (Impl) | `infrastructure/repositories/notification_repository_impl.go` | Channel upsert + VerifyCode |
| Notification | `infrastructure/notification/sender.go` | Sender 인터페이스 |
| Notification | `infrastructure/notification/telegram.go` | TelegramSender 구현체 |
| Service | `services/alert_briefing_service.go` | AI 브리핑 오케스트레이터 |
| Job | `jobs/alert_monitor.go` | 조건 감시 엔진 (4개 트리거) |
| Job | `jobs/alert_outcome_calc.go` | 결정 결과 추적 |
| Handler | `interfaces/http/handlers/alert_rule_handler.go` | 규칙 CRUD + 토글 |
| Handler | `interfaces/http/handlers/alert_notification_handler.go` | 알림 조회/결정 기록 |
| Handler | `interfaces/http/handlers/notification_handler.go` | Telegram 연동/웹훅 |

### 3.2 수정 파일 (2개)

| 파일 | 변경 내용 |
|------|-----------|
| `interfaces/http/routes.go` | 15개 새 엔드포인트 등록, Webhook 분리 |
| `app/app.go` | 7개 Repository + TelegramSender + BriefingService + 2개 Job 와이어링 |

### 3.3 데이터 모델 (7개 테이블)

```
alert_rules ──┐    notification_channels
              ├── alerts ──── alert_briefings
              │       │
              │       ├── alert_decisions ── alert_outcomes
              │
telegram_verify_codes
```

### 3.4 API 엔드포인트 (15개)

| Method | Path | 기능 |
|--------|------|------|
| POST | `/api/v1/alert-rules` | 규칙 생성 |
| GET | `/api/v1/alert-rules` | 규칙 목록 |
| GET | `/api/v1/alert-rules/:id` | 규칙 상세 |
| PUT | `/api/v1/alert-rules/:id` | 규칙 수정 |
| DELETE | `/api/v1/alert-rules/:id` | 규칙 삭제 |
| PATCH | `/api/v1/alert-rules/:id/toggle` | 활성/비활성 |
| GET | `/api/v1/alerts` | 알림 목록 (필터+페이지네이션) |
| GET | `/api/v1/alerts/:id` | 알림 상세 (브리핑+결정+결과) |
| POST | `/api/v1/alerts/:id/decision` | 의사결정 기록 |
| PATCH | `/api/v1/alerts/:id/dismiss` | 알림 무시 |
| GET | `/api/v1/alerts/:id/outcome` | 결과 조회 |
| POST | `/api/v1/notifications/telegram/connect` | Telegram 연동 시작 |
| DELETE | `/api/v1/notifications/telegram` | Telegram 연동 해제 |
| GET | `/api/v1/notifications/channels` | 채널 목록 |
| POST | `/api/v1/webhook/telegram` | Telegram 웹훅 (공개) |

---

## 4. 트리거 조건 엔진 (4/4 구현 완료)

| 타입 | 설명 | 알고리즘 |
|------|------|----------|
| `price_change` | 가격 변동 감지 | 현재가 vs reference 시점 가격, 절대/퍼센트 기준 |
| `price_level` | 가격 돌파/이탈 | 교차 감지 (이전 상태 기반 crossing detection) |
| `ma_cross` | 이평선 교차 | SMA 계산 + 교차 방향 감지 |
| `volatility_spike` | 변동성 급등 | 20개 kline 범위 기반 표준편차 계산, multiplier 비교 |

---

## 5. 아키텍처 결정

| 결정 | 선택 | 이유 |
|------|------|------|
| 알림 채널 | Telegram + Sender 인터페이스 | MVP 최소 공수, Push 확장 가능 |
| 가격 데이터 | Binance REST 30초 폴링 | WebSocket은 MVP 오버엔지니어링 |
| 가격 캐시 | 10초 TTL in-memory | 동일 심볼 중복 API 호출 방지 |
| AI 호출 | 순차 (설계는 병렬) | MVP 단순성 우선, 추후 최적화 |
| 교차 감지 | `last_check_state` JSONB | 매 틱 상태 저장으로 crossing 감지 |
| 만료 처리 | 24h 후 자동 expired | AlertMonitor 내 일괄 처리 |
| stddev 계산 | `big.Rat` 제곱 비교 | Go 표준 라이브러리만 사용, sqrt 회피 |

---

## 6. Gap Analysis 결과 (93%)

### 카테고리별 점수

| 카테고리 | 점수 |
|----------|:----:|
| Migration/데이터 모델 | 98% |
| API 엔드포인트 | 94% |
| 핵심 흐름 | 88% |
| 트리거 조건 | 100% |
| AI 브리핑 | 90% |
| Telegram Bot | 92% |
| Backend 구조 | 85% |
| 설계 결정 반영 | 93% |

### 해결된 항목
- ~~volatility_spike 평가 로직 미구현~~ → `evalVolatilitySpike()` 구현 완료

### 잔여 MEDIUM 항목 (향후 개선)
1. **AI 프로바이더 병렬 호출** - `sync.WaitGroup` 또는 `errgroup`으로 전환
2. **callProvider 코드 중복** - 공통 AI 호출 서비스로 추출
3. **포지션 정보 상세화** - 진입가/수량/미실현PnL 포함

### 추가 구현 (설계 대비 보너스)
- 가격 캐시 (10초 TTL)
- `UpdateCheckState` 별도 메서드
- `SendToChatID` Webhook 직접 응답
- ListAlerts 페이지네이션 total count

---

## 7. 미구현 영역 (Phase 2)

| 영역 | 설명 | 우선순위 |
|------|------|:--------:|
| 프론트엔드 | Settings Telegram UI, Alert Rules 관리, AI 브리핑 뷰, 결정 입력 | HIGH |
| AI 병렬 호출 | errgroup 기반 병렬 실행 | MEDIUM |
| 코드 중복 제거 | callProvider 공통화 | MEDIUM |
| 복합 조건 | AND/OR 규칙 조합 | LOW |
| 앱 Push | PWA Web Push 또는 네이티브 | LOW |
| 알림 스케줄링 | 조용한 시간 설정 | LOW |

---

## 8. 학습 포인트

1. **Crossing Detection 패턴**: 가격 돌파/이탈 감지에는 이전 상태를 반드시 저장해야 함. JSONB `last_check_state`로 매 틱 업데이트하는 패턴이 효과적.

2. **표준편차 without sqrt**: Go `big.Rat`으로 정밀 계산 시 sqrt가 없으므로, `(excess)^2 > (multiplier)^2 * variance` 비교로 동일한 결과 달성.

3. **Sender 인터페이스 추상화**: `Sender` 인터페이스 + `TelegramSender` 구체 구현 분리로, 향후 Push 채널 추가 시 기존 코드 변경 최소화.

4. **가격 캐시 패턴**: 동일 심볼 여러 규칙이 30초 간격에 동시 평가될 때, 10초 TTL 캐시로 Binance API 호출 횟수 대폭 절감.

---

## 9. 결론

Alert & Notification Service MVP 백엔드 구현 완료. 설계 대비 **93% 일치율**로 PASS.
4개 트리거 조건 엔진, AI 자동 브리핑, Telegram 알림, 의사결정 기록, 결과 추적까지 전체 파이프라인이 동작 가능한 상태. 프론트엔드 구현과 AI 병렬 호출 최적화가 다음 단계.
