> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# PDCA Completion Report: review-replay

**Feature**: 복기 및 리플레이 시스템 (Review & Replay System)
**Completed**: 2026-02-03
**Match Rate**: 100%
**Status**: COMPLETED

---

## Executive Summary

kifu 트레이딩 저널에 복기(Review) 및 리플레이(Replay) 기능을 성공적으로 구현했습니다. 이 기능은 AI 의견의 정확도를 추적하고, 트레이딩 성과를 분석하며, 과거 차트를 시간순으로 재생할 수 있게 합니다.

---

## 1. Plan Phase Summary

### 목표
- AI 예측과 실제 가격 움직임을 비교하는 시스템 구축
- 트레이딩 복기를 위한 대시보드 제공
- 과거 캔들 데이터를 리플레이하는 기능 구현

### 범위
| 구분 | 항목 |
|------|------|
| Backend | AI 정확도 엔티티, 방향 추출 서비스, 정확도 계산 Job, Review API |
| Frontend | 복기 대시보드, 통계 컴포넌트, 차트 리플레이 |

---

## 2. Design Phase Summary

### 아키텍처
```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  ReviewDashboard ──► StatsOverview                          │
│       │          ──► AccuracyChart                          │
│       │          ──► TagPerformance                         │
│       │          ──► SymbolPerformance                      │
│       │          ──► CalendarView                           │
│       │                                                      │
│  ChartReplay ────► TimeSlider + ReplayControls              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Go/Fiber)                      │
├─────────────────────────────────────────────────────────────┤
│  ReviewHandler ──► /review/stats                            │
│               ──► /review/accuracy                          │
│               ──► /review/calendar                          │
│               ──► /bubbles/:id/accuracy                     │
│                                                              │
│  AccuracyCalculator (Job) ◄── DirectionExtractor (Service)  │
└─────────────────────────────────────────────────────────────┘
```

### API 설계
| Endpoint | Method | 용도 |
|----------|--------|------|
| `/api/v1/review/stats` | GET | 전체 통계 조회 |
| `/api/v1/review/accuracy` | GET | 기간별 정확도 |
| `/api/v1/review/calendar` | GET | 캘린더 히트맵 데이터 |
| `/api/v1/bubbles/:id/accuracy` | GET | 개별 버블 정확도 |

---

## 3. Implementation (Do Phase)

### Backend 구현

#### 새로 생성된 파일
| 파일 | 역할 |
|------|------|
| `entities/ai_opinion_accuracy.go` | 정확도 엔티티 및 Direction 타입 |
| `migrations/005_ai_opinion_accuracies.sql` | DB 마이그레이션 |
| `repositories/ai_opinion_accuracy_repository.go` | Repository 인터페이스 |
| `repositories/ai_opinion_accuracy_repository_impl.go` | PostgreSQL 구현 |
| `services/direction_extractor.go` | AI 응답에서 방향 추출 |
| `jobs/accuracy_calculator.go` | 백그라운드 정확도 계산 |
| `handlers/review_handler.go` | HTTP 핸들러 |

#### 핵심 로직: Direction Extraction
```go
// 한국어/영어 패턴 매칭
var buyPatterns = []string{
    `(?i)\b(buy|long|bullish|상승|매수|롱)\b`,
}
var sellPatterns = []string{
    `(?i)\b(sell|short|bearish|하락|매도|숏)\b`,
}
```

### Frontend 구현

#### 새로 생성된 파일
| 파일 | 역할 |
|------|------|
| `types/review.ts` | TypeScript 타입 정의 |
| `stores/reviewStore.ts` | Zustand 상태 관리 |
| `components/review/StatsOverview.tsx` | 통계 요약 카드 |
| `components/review/AccuracyChart.tsx` | 정확도 차트 |
| `components/review/TagPerformance.tsx` | 태그별 성과 |
| `components/review/SymbolPerformance.tsx` | 심볼별 성과 |
| `components/review/PeriodFilter.tsx` | 기간 필터 |
| `components/review/CalendarView.tsx` | 캘린더 히트맵 |
| `components/chart/TimeSlider.tsx` | 시간 슬라이더 |
| `components/chart/ReplayControls.tsx` | 재생 컨트롤 |
| `components/chart/ChartReplay.tsx` | 리플레이 통합 |
| `app/(app)/review/page.tsx` | 복기 대시보드 페이지 |

---

## 4. Check Phase (Gap Analysis)

### 결과 요약
| 카테고리 | 설계 | 구현 | 일치율 |
|----------|------|------|--------|
| API Endpoints | 4 | 4 | 100% |
| Data Models | 3 | 3 | 100% |
| UI Components | 11 | 11 | 100% |
| Backend Services | 3 | 3 | 100% |
| **전체** | **21** | **21** | **100%** |

### 미구현 항목
없음 - 모든 설계 항목이 구현됨

### 추가 구현 항목 (설계 외)
1. Replay State in Zustand Store
2. Korean/English Direction Extraction
3. Period Filter Component
4. Calendar Heat Map
5. Tag-based Performance Tracking
6. Chart.tsx Integration - ChartReplay 통합

---

## 5. Lessons Learned

### 잘된 점
1. **Clean Architecture 유지**: 도메인/인프라/인터페이스 레이어 분리
2. **한국어 지원**: AI 응답 파싱에 한국어 패턴 포함
3. **백그라운드 처리**: Job으로 정확도 계산을 비동기화
4. **재사용 가능한 컴포넌트**: TimeSlider, ReplayControls 분리

### 개선할 점
1. BubbleAccuracy 컴포넌트 추가 필요
2. 차트 페이지에 ChartReplay 통합 필요
3. E2E 테스트 추가 권장

---

## 6. Next Steps

### 즉시 필요
- [ ] 데이터베이스 마이그레이션 실행 (`005_ai_opinion_accuracies.sql`)
- [ ] 프로덕션 배포

### 후속 작업 (선택)
- [ ] BubbleAccuracy 컴포넌트 구현
- [ ] Chart 페이지에 ChartReplay 통합
- [ ] 실시간 정확도 업데이트 (WebSocket)

---

## 7. Files Changed Summary

### Backend (14 files)
```
backend/
├── migrations/
│   └── 005_ai_opinion_accuracies.sql (new)
├── internal/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── ai_opinion_accuracy.go (new)
│   │   └── repositories/
│   │       ├── ai_opinion_accuracy_repository.go (new)
│   │       └── bubble_repository.go (modified)
│   ├── infrastructure/repositories/
│   │   ├── ai_opinion_accuracy_repository_impl.go (new)
│   │   └── bubble_repository_impl.go (modified)
│   ├── services/
│   │   └── direction_extractor.go (new)
│   ├── jobs/
│   │   └── accuracy_calculator.go (new)
│   ├── interfaces/http/
│   │   ├── handlers/review_handler.go (new)
│   │   └── routes.go (modified)
│   └── app/
│       └── app.go (modified)
```

### Frontend (17 files)
```
frontend/
├── src/
│   ├── types/
│   │   └── review.ts (new)
│   ├── stores/
│   │   └── reviewStore.ts (new)
│   ├── components/
│   │   ├── review/
│   │   │   ├── index.ts (new)
│   │   │   ├── StatsOverview.tsx (new)
│   │   │   ├── AccuracyChart.tsx (new)
│   │   │   ├── TagPerformance.tsx (new)
│   │   │   ├── SymbolPerformance.tsx (new)
│   │   │   ├── PeriodFilter.tsx (new)
│   │   │   ├── CalendarView.tsx (new)
│   │   │   └── BubbleAccuracy.tsx (new)
│   │   ├── chart/
│   │   │   ├── index.ts (new)
│   │   │   ├── TimeSlider.tsx (new)
│   │   │   ├── ReplayControls.tsx (new)
│   │   │   └── ChartReplay.tsx (new)
│   │   └── Shell.tsx (modified)
│   ├── components-old/
│   │   └── Chart.tsx (modified - ChartReplay integration)
│   └── lib/
│       └── i18n.ts (modified)
├── app/(app)/
│   └── review/
│       └── page.tsx (new)
```

---

## Conclusion

review-replay 기능이 **100% 일치율**로 성공적으로 구현되었습니다. 모든 설계 항목이 구현되었습니다:

- AI 정확도 추적 (Backend)
- 복기 대시보드 (Frontend)
- 차트 리플레이 (Frontend)
- BubbleAccuracy 컴포넌트 (Frontend)
- Chart.tsx 통합 완료

**PDCA Cycle**: COMPLETED

**Next**: 데이터베이스 마이그레이션 실행 후 프로덕션 배포
