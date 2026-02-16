> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# Alert & Notification Service MVP - Plan

## Feature Summary

트레이딩 중 특정 시장 조건이 발생하면 자동으로 알림을 보내고,
AI 에이전트들이 현재 상황 + 유저 포지션을 분석한 브리핑을 생성하여
유저가 빠르게 의사결정할 수 있도록 돕는 시스템.

## Core Flow

```
[유저가 알림 규칙 설정]
        ↓
[AlertMonitor Job이 주기적으로 시장 조건 체크]
        ↓ (조건 충족)
[Alert 생성 + AI 에이전트 자동 브리핑 수집]
        ↓
[Telegram으로 요약 알림 발송]
        ↓
[유저가 알림 확인 → 앱에서 상세 AI 브리핑 확인]
        ↓
[유저가 의사결정 기록 (매수/매도/홀드/무시)]
        ↓
[시스템이 결과 추적 → 복기 데이터로 축적]
```

## Scope

### MVP (Phase 1)
- 알림 규칙 CRUD (가격 변동, 이평선 이탈, 절대 가격)
- AlertMonitor 백그라운드 Job
- 조건 충족 시 AI 자동 브리핑 (기존 AI 인프라 재사용)
- Telegram Bot 알림
- 의사결정 기록
- 결과 추적 (기존 outcome 패턴 재사용)

### Future (Phase 2+)
- 앱 Push (PWA Web Push 또는 네이티브)
- 복합 조건 (AND/OR)
- 커스텀 프롬프트 템플릿
- 알림 스케줄링 (조용한 시간 설정)
- 알림 히스토리 대시보드

## Dependencies
- 기존 AI opinion 인프라 (ai_handler.go의 callProvider, fetchKlines)
- Binance API (가격/kline 데이터)
- 기존 Job 패턴 (outcome_calculator, trade_poller)
