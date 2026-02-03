# Design: Review & Replay System

> Created: 2026-02-02
> Plan: [review-replay.plan.md](../../01-plan/features/review-replay.plan.md)
> Status: Draft

## Overview

트레이딩 판단과 실제 결과를 비교할 수 있는 복기 시스템을 설계한다. 핵심은 (1) AI 의견에서 방향성을 추출하여 정확도를 측정하고, (2) 통계 대시보드로 성과를 분석하며, (3) 차트 리플레이로 과거 시점을 재현하는 것이다.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  ReviewPage     │  │  ChartReplay    │  │  BubbleDetail   │         │
│  │  /review        │  │  (Component)    │  │  (Enhanced)     │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                    │                   │
│  ┌────────▼────────────────────▼────────────────────▼────────┐         │
│  │                    reviewStore (Zustand)                   │         │
│  │  - stats, accuracy, filters, replayState                  │         │
│  └────────────────────────────┬──────────────────────────────┘         │
│                               │                                         │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │ API Calls
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Backend (Go/Fiber)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │                    ReviewHandler (NEW)                       │        │
│  │  GET /api/v1/review/stats      - 통계 조회                   │        │
│  │  GET /api/v1/review/accuracy   - AI 정확도 조회              │        │
│  │  GET /api/v1/review/calendar   - 캘린더 뷰                   │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │              AccuracyCalculatorJob (NEW)                     │        │
│  │  - Outcome 계산 시 자동으로 AI 의견 정확도 계산              │        │
│  │  - AI 응답에서 방향성(BUY/SELL/HOLD) 추출                   │        │
│  │  - 실제 가격 변동과 비교하여 정확도 저장                     │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │                 Domain Entities (NEW)                        │        │
│  │  AIOpinionAccuracy                                           │        │
│  │  - opinion_id, outcome_id                                    │        │
│  │  - predicted_direction, actual_direction                     │        │
│  │  - is_correct, period                                        │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ai_opinion_accuracies (NEW)                                            │
│  - id, opinion_id, outcome_id, bubble_id                                │
│  - predicted_direction, actual_direction                                │
│  - is_correct, period, created_at                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## API Design

### New Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/v1/review/stats | 복기 통계 조회 | Yes |
| GET | /api/v1/review/accuracy | AI 정확도 조회 | Yes |
| GET | /api/v1/review/calendar | 캘린더 뷰 데이터 | Yes |
| GET | /api/v1/bubbles/:id/accuracy | 버블별 AI 정확도 | Yes |

### Request/Response Examples

#### GET /api/v1/review/stats
복기 대시보드 통계 조회

```json
// Request Query
// ?period=7d|30d|all&symbol=BTCUSDT&tag=BUY

// Response
{
  "period": "30d",
  "total_bubbles": 150,
  "bubbles_with_outcome": 142,
  "overall": {
    "win_rate": 58.5,
    "avg_pnl": "2.34",
    "total_pnl": "332.28",
    "max_gain": "15.2",
    "max_loss": "-8.7"
  },
  "by_period": {
    "1h": { "win_rate": 55.0, "avg_pnl": "0.8", "count": 142 },
    "4h": { "win_rate": 58.0, "avg_pnl": "1.9", "count": 138 },
    "1d": { "win_rate": 62.0, "avg_pnl": "3.5", "count": 125 }
  },
  "by_tag": {
    "BUY": { "count": 80, "win_rate": 60.0, "avg_pnl": "2.8" },
    "SELL": { "count": 45, "win_rate": 55.5, "avg_pnl": "1.9" },
    "TP": { "count": 15, "win_rate": 73.0, "avg_pnl": "4.2" },
    "SL": { "count": 10, "win_rate": 40.0, "avg_pnl": "-1.5" }
  },
  "by_symbol": {
    "BTCUSDT": { "count": 100, "win_rate": 58.0, "avg_pnl": "2.5" },
    "ETHUSDT": { "count": 50, "win_rate": 60.0, "avg_pnl": "2.1" }
  }
}
```

#### GET /api/v1/review/accuracy
AI Provider별 정확도 조회

```json
// Request Query
// ?period=30d&outcome_period=1h|4h|1d

// Response
{
  "period": "30d",
  "outcome_period": "1h",
  "total_opinions": 420,
  "evaluated_opinions": 398,
  "by_provider": {
    "openai": {
      "total": 140,
      "evaluated": 135,
      "correct": 78,
      "accuracy": 57.8,
      "by_direction": {
        "BUY": { "predicted": 70, "correct": 42, "accuracy": 60.0 },
        "SELL": { "predicted": 50, "correct": 28, "accuracy": 56.0 },
        "HOLD": { "predicted": 15, "correct": 8, "accuracy": 53.3 }
      }
    },
    "claude": {
      "total": 140,
      "evaluated": 133,
      "correct": 82,
      "accuracy": 61.7,
      "by_direction": {
        "BUY": { "predicted": 65, "correct": 41, "accuracy": 63.1 },
        "SELL": { "predicted": 55, "correct": 33, "accuracy": 60.0 },
        "HOLD": { "predicted": 13, "correct": 8, "accuracy": 61.5 }
      }
    },
    "gemini": {
      "total": 140,
      "evaluated": 130,
      "correct": 71,
      "accuracy": 54.6,
      "by_direction": {
        "BUY": { "predicted": 72, "correct": 40, "accuracy": 55.6 },
        "SELL": { "predicted": 48, "correct": 25, "accuracy": 52.1 },
        "HOLD": { "predicted": 10, "correct": 6, "accuracy": 60.0 }
      }
    }
  },
  "ranking": [
    { "provider": "claude", "accuracy": 61.7, "rank": 1 },
    { "provider": "openai", "accuracy": 57.8, "rank": 2 },
    { "provider": "gemini", "accuracy": 54.6, "rank": 3 }
  ]
}
```

#### GET /api/v1/review/calendar
캘린더 뷰 데이터

```json
// Request Query
// ?from=2026-01-01&to=2026-01-31

// Response
{
  "from": "2026-01-01",
  "to": "2026-01-31",
  "days": {
    "2026-01-15": {
      "bubble_count": 5,
      "win_count": 3,
      "loss_count": 2,
      "total_pnl": "4.5"
    },
    "2026-01-16": {
      "bubble_count": 3,
      "win_count": 2,
      "loss_count": 1,
      "total_pnl": "2.1"
    }
  }
}
```

#### GET /api/v1/bubbles/:id/accuracy
버블별 AI 정확도 조회

```json
// Response
{
  "bubble_id": "uuid",
  "accuracies": [
    {
      "opinion_id": "uuid",
      "provider": "openai",
      "period": "1h",
      "predicted_direction": "BUY",
      "actual_direction": "UP",
      "is_correct": true,
      "pnl_percent": "2.5"
    },
    {
      "opinion_id": "uuid",
      "provider": "claude",
      "period": "1h",
      "predicted_direction": "BUY",
      "actual_direction": "UP",
      "is_correct": true,
      "pnl_percent": "2.5"
    }
  ]
}
```

## Data Models

### AIOpinionAccuracy (NEW)

```go
// backend/internal/domain/entities/ai_opinion_accuracy.go
package entities

import (
    "time"
    "github.com/google/uuid"
)

type Direction string

const (
    DirectionBuy  Direction = "BUY"
    DirectionSell Direction = "SELL"
    DirectionHold Direction = "HOLD"
    DirectionUp   Direction = "UP"
    DirectionDown Direction = "DOWN"
    DirectionNeutral Direction = "NEUTRAL"
)

type AIOpinionAccuracy struct {
    ID                 uuid.UUID `json:"id"`
    OpinionID          uuid.UUID `json:"opinion_id"`
    OutcomeID          uuid.UUID `json:"outcome_id"`
    BubbleID           uuid.UUID `json:"bubble_id"`
    Provider           string    `json:"provider"`
    Period             string    `json:"period"`           // "1h", "4h", "1d"
    PredictedDirection Direction `json:"predicted_direction"` // BUY, SELL, HOLD
    ActualDirection    Direction `json:"actual_direction"`    // UP, DOWN, NEUTRAL
    IsCorrect          bool      `json:"is_correct"`
    CreatedAt          time.Time `json:"created_at"`
}
```

### TypeScript Types (Frontend)

```typescript
// frontend/src/types/review.ts

type Direction = 'BUY' | 'SELL' | 'HOLD' | 'UP' | 'DOWN' | 'NEUTRAL'

type ReviewStats = {
  period: string
  total_bubbles: number
  bubbles_with_outcome: number
  overall: {
    win_rate: number
    avg_pnl: string
    total_pnl: string
    max_gain: string
    max_loss: string
  }
  by_period: Record<string, PeriodStats>
  by_tag: Record<string, TagStats>
  by_symbol: Record<string, SymbolStats>
}

type PeriodStats = {
  win_rate: number
  avg_pnl: string
  count: number
}

type TagStats = {
  count: number
  win_rate: number
  avg_pnl: string
}

type SymbolStats = {
  count: number
  win_rate: number
  avg_pnl: string
}

type ProviderAccuracy = {
  total: number
  evaluated: number
  correct: number
  accuracy: number
  by_direction: Record<Direction, DirectionAccuracy>
}

type DirectionAccuracy = {
  predicted: number
  correct: number
  accuracy: number
}

type AccuracyResponse = {
  period: string
  outcome_period: string
  total_opinions: number
  evaluated_opinions: number
  by_provider: Record<string, ProviderAccuracy>
  ranking: { provider: string; accuracy: number; rank: number }[]
}

type CalendarDay = {
  bubble_count: number
  win_count: number
  loss_count: number
  total_pnl: string
}

type CalendarResponse = {
  from: string
  to: string
  days: Record<string, CalendarDay>
}

// Replay State
type ReplayState = {
  isReplaying: boolean
  currentTime: number  // epoch ms
  endTime: number      // epoch ms
  speed: 1 | 2 | 4 | 8
  isPlaying: boolean
}
```

## Database Schema

### Migration: Create ai_opinion_accuracies table

```sql
-- backend/migrations/XXXXXX_create_ai_opinion_accuracies.up.sql
CREATE TABLE IF NOT EXISTS ai_opinion_accuracies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opinion_id UUID NOT NULL REFERENCES ai_opinions(id) ON DELETE CASCADE,
    outcome_id UUID NOT NULL REFERENCES outcomes(id) ON DELETE CASCADE,
    bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    period VARCHAR(10) NOT NULL,  -- '1h', '4h', '1d'
    predicted_direction VARCHAR(10) NOT NULL,  -- 'BUY', 'SELL', 'HOLD'
    actual_direction VARCHAR(10) NOT NULL,  -- 'UP', 'DOWN', 'NEUTRAL'
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(opinion_id, outcome_id)
);

CREATE INDEX idx_ai_opinion_accuracies_bubble_id ON ai_opinion_accuracies(bubble_id);
CREATE INDEX idx_ai_opinion_accuracies_provider ON ai_opinion_accuracies(provider);
CREATE INDEX idx_ai_opinion_accuracies_period ON ai_opinion_accuracies(period);
CREATE INDEX idx_ai_opinion_accuracies_is_correct ON ai_opinion_accuracies(is_correct);
CREATE INDEX idx_ai_opinion_accuracies_created_at ON ai_opinion_accuracies(created_at);
```

```sql
-- backend/migrations/XXXXXX_create_ai_opinion_accuracies.down.sql
DROP TABLE IF EXISTS ai_opinion_accuracies;
```

## UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| ReviewPage | /app/review/page.tsx | 복기 대시보드 메인 페이지 |
| StatsOverview | /components/review/StatsOverview.tsx | 전체 통계 카드 |
| AccuracyChart | /components/review/AccuracyChart.tsx | Provider별 정확도 차트 |
| TagPerformance | /components/review/TagPerformance.tsx | 태그별 성과 테이블 |
| SymbolPerformance | /components/review/SymbolPerformance.tsx | 심볼별 성과 |
| CalendarView | /components/review/CalendarView.tsx | 캘린더 히트맵 |
| PeriodFilter | /components/review/PeriodFilter.tsx | 기간 필터 (7d/30d/all) |
| ChartReplay | /components/chart/ChartReplay.tsx | 차트 리플레이 컨트롤 |
| TimeSlider | /components/chart/TimeSlider.tsx | 시간 슬라이더 |
| ReplayControls | /components/chart/ReplayControls.tsx | 재생/일시정지/배속 |
| BubbleAccuracy | /components/bubble/BubbleAccuracy.tsx | 버블 상세 내 AI 정확도 |

### Component Wireframes

```
┌─────────────────────────────────────────────────────────────────┐
│  Review Dashboard                                    [7d][30d][All]│
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Bubbles  │ │ Win Rate │ │ Avg PnL  │ │Total PnL │           │
│  │   150    │ │  58.5%   │ │  +2.34%  │ │ +332.28% │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  ┌─────────────────────────────────┐ ┌─────────────────────────┐│
│  │ AI Provider Accuracy            │ │ Performance by Tag      ││
│  │ ┌───────────────────────────┐  │ │                         ││
│  │ │ 🥇 Claude    61.7%  ████░│  │ │ BUY   60.0% +2.8%  (80) ││
│  │ │ 🥈 OpenAI    57.8%  ███░░│  │ │ SELL  55.5% +1.9%  (45) ││
│  │ │ 🥉 Gemini    54.6%  ███░░│  │ │ TP    73.0% +4.2%  (15) ││
│  │ └───────────────────────────┘  │ │ SL    40.0% -1.5%  (10) ││
│  └─────────────────────────────────┘ └─────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Calendar View (January 2026)                                 ││
│  │ Mon Tue Wed Thu Fri Sat Sun                                  ││
│  │  ·   ·   ·   ●   ●   ○   ·   (● = profit, ○ = loss)        ││
│  │  ●   ●   ○   ●   ·   ·   ·                                  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────┐
│  Chart with Replay                                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │              [Chart Area - Candles up to current time]       ││
│  │                                                              ││
│  │                        ○ Bubble here                         ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ◀◀  ▶  ▶▶  [1x][2x][4x][8x]   ═══════●═══════  2026-01-15  ││
│  │                                    ↑ Time Slider             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Hidden Candles: 50  |  Visible Bubbles: 3  |  Current: 14:30   │
└─────────────────────────────────────────────────────────────────┘
```

## State Management

### reviewStore (Zustand)

```typescript
// frontend/src/stores/reviewStore.ts
import { create } from 'zustand'

type ReviewFilters = {
  period: '7d' | '30d' | 'all'
  symbol?: string
  tag?: string
  outcomePeriod: '1h' | '4h' | '1d'
}

type ReplayState = {
  isActive: boolean
  currentTime: number
  endTime: number
  speed: 1 | 2 | 4 | 8
  isPlaying: boolean
}

type ReviewStore = {
  // Data
  stats: ReviewStats | null
  accuracy: AccuracyResponse | null
  calendar: CalendarResponse | null
  isLoading: boolean
  error: string | null

  // Filters
  filters: ReviewFilters
  setFilters: (filters: Partial<ReviewFilters>) => void

  // Replay
  replay: ReplayState
  setReplayTime: (time: number) => void
  togglePlay: () => void
  setSpeed: (speed: 1 | 2 | 4 | 8) => void
  startReplay: (startTime: number, endTime: number) => void
  stopReplay: () => void

  // Actions
  fetchStats: () => Promise<void>
  fetchAccuracy: () => Promise<void>
  fetchCalendar: (from: string, to: string) => Promise<void>
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  stats: null,
  accuracy: null,
  calendar: null,
  isLoading: false,
  error: null,

  filters: {
    period: '30d',
    outcomePeriod: '1h',
  },

  replay: {
    isActive: false,
    currentTime: 0,
    endTime: 0,
    speed: 1,
    isPlaying: false,
  },

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),

  setReplayTime: (time) => set((state) => ({
    replay: { ...state.replay, currentTime: time }
  })),

  togglePlay: () => set((state) => ({
    replay: { ...state.replay, isPlaying: !state.replay.isPlaying }
  })),

  setSpeed: (speed) => set((state) => ({
    replay: { ...state.replay, speed }
  })),

  startReplay: (startTime, endTime) => set({
    replay: {
      isActive: true,
      currentTime: startTime,
      endTime,
      speed: 1,
      isPlaying: false,
    }
  }),

  stopReplay: () => set({
    replay: {
      isActive: false,
      currentTime: 0,
      endTime: 0,
      speed: 1,
      isPlaying: false,
    }
  }),

  fetchStats: async () => {
    const { filters } = get()
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams({ period: filters.period })
      if (filters.symbol) params.set('symbol', filters.symbol)
      if (filters.tag) params.set('tag', filters.tag)

      const response = await api.get(`/review/stats?${params}`)
      set({ stats: response.data, isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch stats', isLoading: false })
    }
  },

  fetchAccuracy: async () => {
    const { filters } = get()
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams({
        period: filters.period,
        outcome_period: filters.outcomePeriod
      })

      const response = await api.get(`/review/accuracy?${params}`)
      set({ accuracy: response.data, isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch accuracy', isLoading: false })
    }
  },

  fetchCalendar: async (from, to) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`/review/calendar?from=${from}&to=${to}`)
      set({ calendar: response.data, isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch calendar', isLoading: false })
    }
  },
}))
```

## Direction Extraction Algorithm

AI 응답에서 방향성(BUY/SELL/HOLD)을 추출하는 알고리즘:

```go
// backend/internal/services/direction_extractor.go
package services

import (
    "regexp"
    "strings"
    "github.com/moneyvessel/kifu/internal/domain/entities"
)

type DirectionExtractor struct {
    buyPatterns  []*regexp.Regexp
    sellPatterns []*regexp.Regexp
    holdPatterns []*regexp.Regexp
}

func NewDirectionExtractor() *DirectionExtractor {
    return &DirectionExtractor{
        buyPatterns: []*regexp.Regexp{
            regexp.MustCompile(`(?i)(buy|long|매수|상승|bullish|상승세|올라|오를|상방|긍정적)`),
            regexp.MustCompile(`(?i)(추천.*매수|진입.*롱|상승.*예상)`),
        },
        sellPatterns: []*regexp.Regexp{
            regexp.MustCompile(`(?i)(sell|short|매도|하락|bearish|하락세|내려|내릴|하방|부정적)`),
            regexp.MustCompile(`(?i)(추천.*매도|진입.*숏|하락.*예상)`),
        },
        holdPatterns: []*regexp.Regexp{
            regexp.MustCompile(`(?i)(hold|wait|관망|횡보|neutral|중립|지켜보|대기)`),
            regexp.MustCompile(`(?i)(명확하지.*않|불확실|판단.*어려)`),
        },
    }
}

func (e *DirectionExtractor) Extract(response string) entities.Direction {
    response = strings.ToLower(response)

    buyScore := e.countMatches(response, e.buyPatterns)
    sellScore := e.countMatches(response, e.sellPatterns)
    holdScore := e.countMatches(response, e.holdPatterns)

    // Score-based decision
    if buyScore > sellScore && buyScore > holdScore {
        return entities.DirectionBuy
    }
    if sellScore > buyScore && sellScore > holdScore {
        return entities.DirectionSell
    }
    return entities.DirectionHold
}

func (e *DirectionExtractor) countMatches(text string, patterns []*regexp.Regexp) int {
    count := 0
    for _, pattern := range patterns {
        matches := pattern.FindAllString(text, -1)
        count += len(matches)
    }
    return count
}

// Determine actual direction from PnL
func DetermineActualDirection(pnlPercent string) entities.Direction {
    // Parse pnl_percent (e.g., "2.5", "-1.3")
    // If > 0.5: UP, if < -0.5: DOWN, else NEUTRAL
    pnl := parsePnL(pnlPercent)
    if pnl > 0.5 {
        return entities.DirectionUp
    }
    if pnl < -0.5 {
        return entities.DirectionDown
    }
    return entities.DirectionNeutral
}

// Check if prediction was correct
func IsCorrect(predicted, actual entities.Direction) bool {
    // BUY + UP = correct
    // SELL + DOWN = correct
    // HOLD + NEUTRAL = correct
    switch predicted {
    case entities.DirectionBuy:
        return actual == entities.DirectionUp
    case entities.DirectionSell:
        return actual == entities.DirectionDown
    case entities.DirectionHold:
        return actual == entities.DirectionNeutral
    }
    return false
}
```

## Files to Create/Modify

### Backend (Go)

| File | Action | Description |
|------|--------|-------------|
| internal/domain/entities/ai_opinion_accuracy.go | Create | 새 엔티티 정의 |
| internal/domain/repositories/ai_opinion_accuracy_repository.go | Create | Repository 인터페이스 |
| internal/infrastructure/repositories/ai_opinion_accuracy_repository_impl.go | Create | PostgreSQL 구현 |
| internal/services/direction_extractor.go | Create | AI 응답 방향성 추출 |
| internal/interfaces/http/handlers/review_handler.go | Create | Review API 핸들러 |
| internal/jobs/accuracy_calculator.go | Create | 정확도 계산 Job |
| internal/interfaces/http/routes.go | Modify | 새 라우트 추가 |
| internal/app/app.go | Modify | DI 설정 추가 |
| migrations/XXXXXX_create_ai_opinion_accuracies.up.sql | Create | 마이그레이션 |
| migrations/XXXXXX_create_ai_opinion_accuracies.down.sql | Create | 롤백 |

### Frontend (TypeScript/React)

| File | Action | Description |
|------|--------|-------------|
| src/types/review.ts | Create | 타입 정의 |
| src/stores/reviewStore.ts | Create | Zustand 스토어 |
| src/app/review/page.tsx | Create | 대시보드 페이지 |
| src/components/review/StatsOverview.tsx | Create | 통계 개요 |
| src/components/review/AccuracyChart.tsx | Create | 정확도 차트 |
| src/components/review/TagPerformance.tsx | Create | 태그별 성과 |
| src/components/review/SymbolPerformance.tsx | Create | 심볼별 성과 |
| src/components/review/CalendarView.tsx | Create | 캘린더 뷰 |
| src/components/review/PeriodFilter.tsx | Create | 기간 필터 |
| src/components/chart/ChartReplay.tsx | Create | 리플레이 컨트롤 |
| src/components/chart/TimeSlider.tsx | Create | 시간 슬라이더 |
| src/components/bubble/BubbleAccuracy.tsx | Create | 버블 내 정확도 |
| src/components/Shell.tsx | Modify | 네비게이션에 Review 추가 |

## Implementation Order

### Phase 1: Backend - AI 정확도 시스템
1. `ai_opinion_accuracy.go` 엔티티 생성
2. 마이그레이션 파일 생성 및 실행
3. Repository 인터페이스 및 구현
4. `direction_extractor.go` 서비스 생성
5. `accuracy_calculator.go` Job 생성 (outcome_calculator와 통합)
6. `review_handler.go` 핸들러 생성
7. routes.go에 라우트 추가

### Phase 2: Backend - 통계 API
1. `/review/stats` 구현
2. `/review/accuracy` 구현
3. `/review/calendar` 구현
4. `/bubbles/:id/accuracy` 구현

### Phase 3: Frontend - 대시보드
1. 타입 정의 (`types/review.ts`)
2. Zustand 스토어 (`reviewStore.ts`)
3. 대시보드 페이지 (`/review/page.tsx`)
4. 통계 컴포넌트들 구현
5. 네비게이션 추가

### Phase 4: Frontend - 차트 리플레이
1. TimeSlider 컴포넌트
2. ReplayControls 컴포넌트
3. ChartReplay 통합
4. 기존 차트와 통합

### Phase 5: 통합 및 Polish
1. 버블 상세에 정확도 표시 추가
2. 성능 최적화
3. 에러 처리 강화
4. 모바일 반응형

## Security Considerations

- [x] 모든 API에 JWT 인증 필수
- [x] 사용자별 데이터 격리 (user_id 체크)
- [x] SQL Injection 방지 (파라미터 바인딩)
- [x] Rate limiting 적용

## Testing Strategy

### Backend
- [ ] Unit tests: DirectionExtractor (다양한 AI 응답 케이스)
- [ ] Unit tests: IsCorrect 로직
- [ ] Integration tests: Review API endpoints
- [ ] Integration tests: AccuracyCalculator job

### Frontend
- [ ] Component tests: StatsOverview, AccuracyChart
- [ ] Hook tests: useReviewStore
- [ ] E2E tests: 대시보드 필터링 플로우

---
## Approval
- [ ] Approved by:
- [ ] Date:
