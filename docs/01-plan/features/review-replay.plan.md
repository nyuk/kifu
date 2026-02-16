> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - Korean is optional supplementary context when needed.

# Plan: Review & Replay System

> Created: 2026-02-02
> Status: Draft

## Objective

Build a system to compare human judgment (`bubble` and AI opinion) with subsequent price movement and provide objective post-trade review.
Users can validate hypotheses, inspect outcomes, and improve decision quality over time.

## Requirements

### Must Have (Core Features)

#### 1. AI opinion accuracy comparison
- [ ] Extract directional bias from AI opinion (`BUY/SELL/HOLD`).
- [ ] Compare with market result over `1h/4h/1d` windows.
- [ ] Provider-level accuracy statistics (`OpenAI/Claude/Gemini`).
- [ ] Show "AI opinion vs actual outcome" for each bubble detail.

#### 2. Review dashboard
- [ ] Overall stats: total bubbles, win rate, average PnL
- [ ] Performance by tag (`BUY/SELL/TP/SL`)
- [ ] Provider ranking by accuracy
- [ ] Time-range filters (`7d/30d/all`)
- [ ] Symbol-level breakdown

#### 3. Chart replay
- [ ] Timeline slider UI
- [ ] Render candles up to chosen point in time
- [ ] Show bubble/AI opinion at replay point
- [ ] Play/pause/speed controls

### Should Have (Enhancement)

- [ ] Ask for AI opinion at replay timestamp
- [ ] Manual review notes
- [ ] Performance trend chart
- [ ] Export report (`CSV/PDF`)
- [ ] Stronger bubble-trade linkage

### Out of Scope

- Real-time push notifications
- Social sharing / leaderboard
- Auto-trading integration

## Success Criteria

- Directional match and outcome comparison accuracy >= 95%
- Dashboard stats load within 3 seconds
- Replay runs at 60 fps or better
- Mobile-responsive behavior

## Dependencies

- [x] AI opinion capture system (implemented)
- [x] Outcome automated calculator (implemented)
- [x] Similar trade search API (implemented)
- [x] Base bubble CRUD (implemented)
- [ ] Frontend chart component (in progress, `lightweight-charts`)

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
│  │ GET /api/v1/review/stats       (stats)          │      │
│  │ GET /api/v1/review/accuracy    (AI accuracy)     │      │
│  │ GET /api/v1/review/calendar    (calendar view)   │      │
│  │ GET /api/v1/bubbles/:id/replay (replay payload)  │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  New Entity:                                                │
│  ┌──────────────────────────────────────────────────┐      │
│  │ AIOpinionAccuracy                                 │      │
│  │ - opinion_id, outcome_id                          │      │
│  │ - predicted_direction (BUY/SELL/HOLD)             │      │
│  │ - actual_direction (UP/DOWN/NEUTRAL)              │      │
│  │ - is_correct, accuracy_score                      │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: AI accuracy pipeline (Backend)
1. Add `AIOpinionAccuracy` entity and storage table.
2. Extract directional intent from AI output.
3. Add accuracy job during outcome calculation.
4. Implement accuracy query endpoint.

### Phase 2: Review dashboard (Backend + Frontend)
1. Implement stats/accuracy/calendar endpoints.
2. Build review dashboard UI + filters.
3. Add provider-level accuracy charts.

### Phase 3: Replay (Frontend)
1. Add time slider component.
2. Filter candle data by replay window.
3. Build replay store (Zustand).
4. Add playback controls.

### Phase 4: Polish
1. Add "decision vs result" to bubble detail.
2. Show historical bubbles in replay.
3. Performance optimizations + responsiveness.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| NLP extraction mismatch | High | Rule-based + regex, then LLM-assisted enhancement |
| Large-volume analytics performance | Medium | Aggregate tables + caching + pagination |
| Replay rendering performance | Medium | Chunked candle load + virtualization |
| Existing data migration | Low | Batch migration for missing directional fields |

## Timeline

| Phase | Target |
|-------|--------|
| Plan Approval | 2026-02-02 |
| Design | 2026-02-03 |
| Phase 1 (AI accuracy) | 2026-02-05 |
| Phase 2 (dashboard) | 2026-02-08 |
| Phase 3 (replay) | 2026-02-12 |
| Phase 4 (polish) | 2026-02-15 |

---
## Approval
- [ ] Approved by:
- [ ] Date:
