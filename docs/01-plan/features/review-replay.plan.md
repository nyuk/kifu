> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# Plan: Review & Replay System

> Created: 2026-02-02
> Status: Draft

## Objective

트레이딩 판단(버블/AI 의견)과 이후 실제 가격 움직임을 비교하여 복기할 수 있는 시스템을 구축한다. 차트 리플레이, AI 의견 정확도 추적, 종합 대시보드를 통해 사용자가 자신의 판단력을 객관적으로 분석하고 개선할 수 있도록 한다.

## Requirements

### Must Have (Core Features)

#### 1. AI 의견 정확도 비교
- [ ] AI 의견에서 방향성(BUY/SELL/HOLD) 자동 추출
- [ ] Outcome(1h/4h/1d)과 AI 예측 방향 비교 로직
- [ ] Provider별(OpenAI/Claude/Gemini) 정확도 통계
- [ ] 버블 상세에서 "AI 판단 vs 실제 결과" 표시

#### 2. 복기 대시보드
- [ ] 전체 통계: 총 버블 수, 승률, 평균 PnL
- [ ] 태그별 성과 분석 (BUY/SELL/TP/SL 등)
- [ ] Provider별 AI 정확도 랭킹
- [ ] 기간별 필터 (7일/30일/전체)
- [ ] 심볼별 성과 분석

#### 3. 차트 리플레이
- [ ] 시간 슬라이더 UI (과거 시점 선택)
- [ ] 선택 시점까지의 캔들만 표시
- [ ] 해당 시점의 버블/AI 의견 표시
- [ ] 재생/일시정지/배속 컨트롤

### Should Have (Enhancement)

- [ ] 리플레이 중 "이 시점에서 AI 의견 요청" 기능
- [ ] 복기 노트 작성 및 저장
- [ ] 성과 추이 차트 (시간에 따른 승률 변화)
- [ ] 내보내기 기능 (CSV/PDF)
- [ ] Trade(실거래) ↔ Bubble 연결 강화

### Out of Scope

- 실시간 알림/푸시 (별도 기능으로 분리)
- 소셜 공유/리더보드 (향후 별도 기능)
- 자동 매매 연동 (향후 별도 기능)

## Success Criteria

- [ ] AI 의견의 방향성과 실제 결과 비교 정확도 95% 이상
- [ ] 대시보드에서 주요 통계 3초 이내 로딩
- [ ] 차트 리플레이 60fps 이상 부드러운 재생
- [ ] 모바일 반응형 지원

## Dependencies

- [x] AI 의견 수집 시스템 (구현 완료)
- [x] Outcome 자동 계산 시스템 (구현 완료)
- [x] 유사 거래 검색 API (구현 완료)
- [x] 버블 기본 CRUD (구현 완료)
- [ ] 프론트엔드 차트 컴포넌트 (lightweight-charts 사용 중)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ReviewDash   │  │ ChartReplay  │  │ AccuracyView │      │
│  │ board.tsx    │  │ .tsx         │  │ .tsx         │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │               │                 │               │
│  ┌────────────────────────────────────────────────┐        │
│  │              reviewStore (Zustand)              │        │
│  └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Go/Fiber)                       │
├─────────────────────────────────────────────────────────────┤
│  New Endpoints:                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │ GET /api/v1/review/stats       (통계 조회)        │      │
│  │ GET /api/v1/review/accuracy    (AI 정확도)        │      │
│  │ GET /api/v1/review/calendar    (캘린더 뷰)        │      │
│  │ GET /api/v1/bubbles/:id/replay (리플레이 데이터)  │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  New Entity:                                                │
│  ┌──────────────────────────────────────────────────┐      │
│  │ AIOpinionAccuracy                                 │      │
│  │ - opinion_id, outcome_id                          │      │
│  │ - predicted_direction (BUY/SELL/HOLD)            │      │
│  │ - actual_direction (UP/DOWN/NEUTRAL)             │      │
│  │ - is_correct, accuracy_score                     │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: AI 의견 정확도 시스템 (Backend)
1. `AIOpinionAccuracy` 엔티티 및 테이블 추가
2. AI 응답에서 방향성 추출 로직 (NLP/키워드 기반)
3. Outcome 계산 시 정확도 자동 계산 Job 추가
4. 정확도 조회 API 구현

### Phase 2: 복기 대시보드 (Backend + Frontend)
1. 통계 집계 API 구현 (`/review/stats`)
2. 대시보드 UI 컴포넌트 구현
3. 필터링 (기간/태그/심볼) 구현
4. Provider별 정확도 차트

### Phase 3: 차트 리플레이 (Frontend)
1. 시간 슬라이더 컴포넌트
2. 캔들 데이터 필터링 로직
3. 리플레이 스토어 (Zustand)
4. 재생 컨트롤 UI

### Phase 4: 통합 및 Polish
1. 버블 상세에서 "판단 vs 결과" 통합
2. 리플레이에서 과거 버블 표시
3. 성능 최적화
4. 모바일 반응형

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI 응답에서 방향성 추출 정확도 | High | 키워드 기반 + 정규식 패턴 매칭, 추후 LLM 기반 개선 |
| 대량 데이터 통계 성능 | Medium | 집계 테이블/캐싱 도입, 페이지네이션 |
| 차트 리플레이 성능 | Medium | 캔들 데이터 청크 로딩, 가상화 |
| 기존 데이터 마이그레이션 | Low | 기존 opinion에 대한 일괄 방향성 추출 스크립트 |

## Timeline

| Phase | Target |
|-------|--------|
| Plan Approval | 2026-02-02 |
| Design | 2026-02-03 |
| Phase 1 (AI 정확도) | 2026-02-05 |
| Phase 2 (대시보드) | 2026-02-08 |
| Phase 3 (리플레이) | 2026-02-12 |
| Phase 4 (통합) | 2026-02-15 |

---
## Approval
- [ ] Approved by:
- [ ] Date:
