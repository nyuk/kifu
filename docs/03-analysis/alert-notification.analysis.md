# Alert-Notification Gap Analysis

> 분석일: 2026-02-06 | 종합 일치율: **93%** (volatility_spike 구현 후 업데이트)

## 카테고리별 점수

| 카테고리 | 점수 |
|----------|:----:|
| Migration/데이터 모델 | 98% |
| API 엔드포인트 | 94% |
| 핵심 흐름 | 88% |
| 트리거 조건 | 100% (4개 중 4개) |
| AI 브리핑 | 90% |
| Telegram Bot | 92% |
| Backend 구조 | 85% |
| 설계 결정 반영 | 93% |
| **종합** | **93%** |

## 누락/불일치 항목

### ~~HIGH - 즉시 조치~~ (해결됨)
1. ~~**volatility_spike 평가 로직 미구현**~~ - `evalVolatilitySpike()` 구현 완료. 20개 kline 기반 표준편차 계산, multiplier 기반 트리거

### MEDIUM - 단기 조치
2. **AI 프로바이더 순차 호출** - 설계는 병렬, 구현은 for 루프 순차 (최대 90초 소요 가능)
3. **callProvider 코드 중복** - `ai_handler.go`와 `alert_briefing_service.go`에 동일 로직 존재
4. **포지션 정보 요약만 전달** - 설계는 진입가/수량/PnL 상세, 구현은 Long/Short 요약만

### LOW - 문서 업데이트
5. `POST /notifications/telegram/verify` 엔드포인트 누락 (Webhook으로 대체됨 - 의도적)
6. Telegram 딥링크 버튼 1개 (설계는 2개)
7. Repository 파일 통합 (설계는 6개 파일, 구현은 3개 파일)
8. 인덱스 이름 불일치 (`idx_alert_rules_enabled` vs `idx_alert_rules_active`)

## 추가 구현 (설계에 없음, 구현에 있음)
- 가격 캐시 (10초 TTL) - API 부하 최적화
- `UpdateCheckState` 별도 메서드 - 교차 감지를 위한 매 틱 상태 업데이트
- `SendToChatID` 메서드 - Webhook에서 직접 응답
- ListAlerts에 페이지네이션 total count

## 결론
종합 93% PASS. `volatility_spike` 구현 완료. 남은 MEDIUM 항목은 성능 최적화/리팩토링 수준.
