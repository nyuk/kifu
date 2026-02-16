> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# Design-Implementation Gap Analysis Report: Kifu Full Project

> **Summary**: Comprehensive gap analysis across Summary Pack v1, Guided Review, Alert Notification, and routing.
>
> **Author**: gap-detector
> **Created**: 2026-02-15
> **Last Modified**: 2026-02-15
> **Status**: Review

---

## Analysis Overview

- **Analysis Target**: Full project (Summary Pack v1, Guided Review, Alert Notification, Routes, Remaining Work)
- **Design Documents**: `docs/spec/summary-pack-v1.md`, `docs/02-design/features/guided-review.design.md`, `docs/02-design/features/alert-notification.design.md`, `docs/todo.md`, `docs/2026-02-13-remaining-work.md`
- **Implementation Paths**: `backend/internal/`, `frontend/src/components/guided-review/`
- **Analysis Date**: 2026-02-15
- **Iteration**: 2 (post Iteration 1 fixes)

---

## Iteration 1 Fix Summary

The following items were fixed between v1.0 and this re-analysis:

| # | Fix | File | Result |
|---|-----|------|--------|
| 1 | Added $12 placeholder for payload column | `summary_pack_repository_impl.go:28` | VERIFIED -- INSERT now has 12 placeholders matching 12 columns |
| 2 | Updated error format documentation from nested to flat | `CLAUDE.md:74-80` | VERIFIED -- documents `{"code": ..., "message": ...}` flat format |
| 3 | Replaced telegram/verify with webhook explanation | `alert-notification.design.md:398-403` | VERIFIED -- design now documents webhook-based verification |
| 4 | Updated Phase 1/2 boundaries with implementation status | `guided-review.design.md:153-167` | VERIFIED -- MVP items checked, Phase 2 items listed as not done |
| 5 | Updated GetLatest/GetByID response description | `spec/summary-pack-v1.md:54-55,65-66` | VERIFIED -- spec now says "full entity" response |

---

## Overall Scores

| Category | v1.0 Score | v1.1 Score | Delta | Status |
|----------|:---------:|:---------:|:-----:|:------:|
| Summary Pack v1 | 92% | 98% | +6 | [OK] |
| Alert Notification | 90% | 96% | +6 | [OK] |
| Guided Review | 78% | 90% | +12 | [OK] |
| Route Registration | 95% | 100% | +5 | [OK] |
| Error Format Consistency | 75% | 100% | +25 | [OK] |
| Remaining Work Completion | 30% | 30% | 0 | [CRIT] |
| **Overall** | **77%** | **86%** | **+9** | **[WARN]** |

---

## 1. Summary Pack v1 -- Spec vs Implementation

**Design**: `docs/spec/summary-pack-v1.md`
**Implementation**: `backend/internal/services/summary_pack_service.go`, `backend/internal/interfaces/http/handlers/pack_handler.go`, `backend/internal/infrastructure/repositories/summary_pack_repository_impl.go`, `backend/migrations/022_create_runs_and_summary_packs.sql`

### Match Rate: 98% (was 92%)

### [OK] Matching Items

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| POST /api/v1/packs/generate | Spec Section 1 | `routes.go:238`, `pack_handler.go:42` | [OK] |
| GET /api/v1/packs/latest | Spec Section 2 | `routes.go:239`, `pack_handler.go:94` | [OK] |
| GET /api/v1/packs/{pack_id} | Spec Section 3 | `routes.go:240`, `pack_handler.go:116` | [OK] |
| Request: source_run_id + range | Spec Section 1 | `PackGenerateRequest` struct | [OK] |
| Response: pack_id + reconciliation_status | Spec Section 1 | `PackGenerateResponse` struct | [OK] |
| Payload schema: all 7 sections | Spec Section 4 | `summaryPackPayloadV1` struct | [OK] |
| pnl_summary fields | realized, unrealized, fees, funding | All present with correct nullability | [OK] |
| flow_summary fields | net_exchange_flow, net_wallet_flow | Both present | [OK] |
| activity_summary fields | trade_count, notional, lsr, leverage, drawdown | All present | [OK] |
| reconciliation fields | status, missing, duplicate, warnings | All present | [OK] |
| evidence_index fields | sample IDs, pack ref | Both present | [OK] |
| Health rules: duplicate | fallback key detection | `summary_pack_service.go:294-299` | [OK] |
| Health rules: missing (fees) | trade_count >= 10 && fees == 0 | `summary_pack_service.go:362-364` | [OK] |
| Health rules: missing (funding) | futures + funding module + no data | `summary_pack_service.go:365-367` | [OK] |
| Health rules: time_skew warning | 6hr deviation from median | `summary_pack_service.go:335-346` | [OK] |
| Health rules: symbol_mapping_gap | unknown/invalid normalization | `summary_pack_service.go:290-292` | [OK] |
| Status: error threshold | missing >= 10 | `summary_pack_service.go:382-384` | [OK] |
| Status: warning threshold | missing > 0 or dup > 0 or warnings | `summary_pack_service.go:385-389` | [OK] |
| Range values | 30d, 7d, all | `resolveRange()` | [OK] |
| Default range | 30d | Both handler and service handle it | [OK] |
| Error: 400 INVALID_REQUEST | source_run_id missing/invalid | `pack_handler.go:50-61` | [OK] |
| Error: 401 UNAUTHORIZED | No JWT | `pack_handler.go:44-46` | [OK] |
| Error: 404 RUN_NOT_FOUND | Not found / wrong user | `pack_handler.go:70-73` | [OK] |
| Error: 500 PACK_SAVE_FAILED | DB save error | `pack_handler.go:84-86` | [OK] |
| Schema version | summary_pack_v1 | `const summaryPackSchemaV1` | [OK] |
| Calc version | ledger_calc_v1.0.0 | `const summaryPackCalcV1` | [OK] |
| Idempotency policy | Allows duplicate per request | No unique constraint in migration | [OK] |
| content_hash (SHA256) | Spec Section 4 | `summary_pack_service.go:436-443` | [OK] |
| DB schema | summary_packs table | Migration 022 matches entity | [OK] |
| INSERT query placeholders | 12 columns, 12 placeholders | `summary_pack_repository_impl.go:28` -- $1..$12 | [OK] FIXED |
| GetLatest response format | Full entity | Returns full entity (spec updated) | [OK] FIXED |
| GetByID response format | Full entity | Returns full entity (spec updated) | [OK] FIXED |

### [WARN] Minor Differences

| # | Item | Design | Implementation | Severity | Impact |
|---|------|--------|----------------|----------|--------|
| 1 | Error code on generate failure | `PACK_SAVE_FAILED` (500) only | `PACK_GENERATE_FAILED` (400) added for service errors | Minor | Low -- more specific error handling is good |

### Resolved from v1.0

- ~~INSERT column count bug ($11 vs $12)~~ -- FIXED: `summary_pack_repository_impl.go:28` now has `$12`
- ~~GetLatest response format mismatch~~ -- FIXED: spec updated to document full entity response

---

## 2. Alert Notification -- Design vs Implementation

**Design**: `docs/02-design/features/alert-notification.design.md`
**Implementation**: Backend handlers, jobs, services, migration 007

### Match Rate: 96% (was 90%)

### [OK] Matching Items

| Category | Designed | Implemented | Status |
|----------|----------|-------------|:------:|
| **DB Tables** | | | |
| alert_rules | 10 columns + 2 indexes | Migration 007 matches exactly | [OK] |
| alerts | 9 columns + 2 indexes | Migration 007 matches exactly | [OK] |
| alert_briefings | 7 columns + 1 index | Migration 007 matches exactly | [OK] |
| alert_decisions | 8 columns + UNIQUE | Migration 007 matches exactly | [OK] |
| alert_outcomes | 8 columns + UNIQUE(alert_id, period) | Migration 007 matches exactly | [OK] |
| notification_channels | 7 columns + UNIQUE(user_id, type) | Migration 007 matches exactly | [OK] |
| telegram_verify_codes | 6 columns + 1 index | Migration 007 matches exactly | [OK] |
| **API Endpoints** | | | |
| POST /alert-rules | Design Section 6 | `routes.go:195` | [OK] |
| GET /alert-rules | Design Section 6 | `routes.go:196` | [OK] |
| GET /alert-rules/:id | Design Section 6 | `routes.go:197` | [OK] |
| PUT /alert-rules/:id | Design Section 6 | `routes.go:198` | [OK] |
| DELETE /alert-rules/:id | Design Section 6 | `routes.go:199` | [OK] |
| PATCH /alert-rules/:id/toggle | Design Section 6 | `routes.go:200` | [OK] |
| GET /alerts | Design Section 6 | `routes.go:204` | [OK] |
| GET /alerts/:id | Design Section 6 | `routes.go:205` | [OK] |
| POST /alerts/:id/decision | Design Section 6 | `routes.go:206` | [OK] |
| PATCH /alerts/:id/dismiss | Design Section 6 | `routes.go:207` | [OK] |
| GET /alerts/:id/outcome | Design Section 6 | `routes.go:208` | [OK] |
| POST /notifications/telegram/connect | Design Section 6 | `routes.go:212` | [OK] |
| DELETE /notifications/telegram | Design Section 6 | `routes.go:213` | [OK] |
| GET /notifications/channels | Design Section 6 | `routes.go:214` | [OK] |
| POST /webhook/telegram | Design Section 6 | `routes.go:217` | [OK] |
| Telegram verification via webhook | Design Section 6 (note) | Webhook handles `/start {code}` | [OK] FIXED |
| **Jobs** | | | |
| AlertMonitor (30s) | Design Section 3.2 | `alert_monitor.go:50` | [OK] |
| AlertOutcomeCalculator (60s) | Design Section 3.5 | `alert_outcome_calc.go:44` | [OK] |
| **Rule Types** | | | |
| price_change | Design 1.1 | `evalPriceChange()` | [OK] |
| ma_cross | Design 1.2 | `evalMACross()` | [OK] |
| price_level | Design 1.3 | `evalPriceLevel()` | [OK] |
| volatility_spike | Design 1.4 | `evalVolatilitySpike()` | [OK] |
| **Features** | | | |
| Cooldown | Per-rule, default 60min | `isCooldownPassed()` | [OK] |
| Crossing detection | price_level, ma_cross need state | `buildCheckState()` + `last_check_state` | [OK] |
| Symbol grouping | Minimize API calls | `symbolRules` map | [OK] |
| 24h expiry | Auto-expire old alerts | `ExpireOlderThan()` in runOnce | [OK] |
| AI briefing | Multi-provider parallel | `HandleTrigger()` iterates providers | [OK] |
| Telegram send | After briefing | `sender.Send()` in HandleTrigger | [OK] |
| Prompt design | Matches design Section 4 | `buildAlertPrompt()` | [OK] |
| Notification interface | `NotificationSender` | `notification.Sender` interface | [OK] |
| Telegram impl | `TelegramSender` | `notification/telegram.go` | [OK] |

### [WARN] Remaining Minor Differences

| # | Item | Design | Implementation | Severity | Impact |
|---|------|--------|----------------|----------|--------|
| 1 | AI briefing parallelism | "All active providers in parallel" (Section 3.3) | Sequential loop in HandleTrigger | Minor | Works but slower; could use goroutines |
| 2 | Notification message format | Detailed Telegram format with per-provider summaries (Section 5.2) | Only first briefing summary sent | Minor | Less informative than designed |
| 3 | Notification interface name | `NotificationSender` | `Sender` (in notification package) | Minor | Functionally same; package-scoped name is Go-idiomatic |

### Resolved from v1.0

- ~~POST /notifications/telegram/verify missing~~ -- FIXED: Design updated to document webhook-based verification. This is an intentional improvement (user never leaves Telegram).

---

## 3. Guided Review -- Design vs Implementation

**Design**: `docs/02-design/features/guided-review.design.md`
**Implementation**: Migration 020, `guided_review_handler.go`, `guided_review.go`, `GuidedReviewFlow.tsx`

### Match Rate: 90% (was 78%)

### [OK] Matching Items

| Category | Designed | Implemented | Status |
|----------|----------|-------------|:------:|
| **DB: guided_reviews** | | | |
| id, user_id, review_date, status, completed_at, created_at | Design Section 8 | Migration 020 | [OK] |
| UNIQUE(user_id, review_date) | Not in design but needed | Migration 020 | [OK] |
| **DB: guided_review_items** | | | |
| id, review_id, trade_id, bundle_key, intent, emotions, pattern_match, memo, order_index, created_at | Design Section 8 | Migration 020 | [OK] |
| Additional fields: symbol, side, pnl, trade_count | Design Section 9 (MVP checklist) | Migration 020 | [OK] DOCUMENTED |
| **DB: user_streaks** | | | |
| user_id, current_streak, longest_streak, last_review_date, updated_at | Design Section 8 | Migration 020 | [OK] |
| **Entity: Layer 1 (Intent)** | 5 options | 5 constants in `guided_review.go:20-25` | [OK] |
| **Entity: Layer 2 (Emotions)** | 9 options | 9 constants in `guided_review.go:29-38` | [OK] |
| **Entity: Layer 3 (Pattern)** | 5 options | 5 constants in `guided_review.go:42-47` | [OK] |
| **Entity: Status enum** | pending/in_progress/completed/skipped | Design Section 9 (updated) | [OK] DOCUMENTED |
| **API: Get today's review** | Design: daily session | `GET /guided-reviews/today` | [OK] |
| **API: Submit item** | Design: Layer 1-4 answers | `POST /guided-reviews/items/:id/submit` | [OK] |
| **API: Complete review** | Design: mark completed | `POST /guided-reviews/:id/complete` | [OK] |
| **API: Get streak** | Design: streak system | `GET /guided-reviews/streak` | [OK] |
| **Frontend: 4-Layer flow** | Intent > Emotions > Pattern > Memo | `GuidedReviewFlow.tsx` LAYERS array | [OK] |
| **Frontend: Multi-select emotions** | Design Section 4 Layer 2 | `EMOTION_OPTIONS` multi-select | [OK] |
| **Phase boundary** | Phase 1 vs Phase 2 documented | Design Section 9 (updated) | [OK] DOCUMENTED |

### [WARN] Phase 2 Items (Documented as Not Yet Implemented)

These are now properly documented in the design as Phase 2 scope, not missing features:

| # | Item | Design Location | Phase | Status |
|---|------|-----------------|:-----:|:------:|
| 1 | Multi-trade bundling (5+ trades per symbol) | Design Section 5 | Phase 2 | Not implemented (as planned) |
| 2 | No-trade day review backend endpoint | Design Section 6 | Phase 2 | Not implemented (frontend partial) |
| 3 | Weekly AI insight | Design Section 7.3 | Phase 2 | Not implemented (as planned) |

### [INFO] Minor Open Items

| # | Item | Description | Severity |
|---|------|-------------|----------|
| 1 | streak_count in guided_reviews | Design Section 8 lists it but migration uses user_streaks table instead | Minor -- functionally equivalent |
| 2 | Home entry point card | Design Section 3.2 mentions home card, not yet built | Minor -- UX enhancement |
| 3 | Daily card list view | Design Section 7.1 lists history endpoint, not yet built | Minor -- Phase 1 optional |

### Resolved from v1.0

- ~~Phase boundary unclear~~ -- FIXED: Design updated with MVP checklist showing what is done vs Phase 2
- ~~Extra DB fields undocumented~~ -- FIXED: Design Section 9 now lists symbol, side, pnl, trade_count
- ~~in_progress status undocumented~~ -- FIXED: Design Section 9 now lists 4-state enum

---

## 4. Route Registration -- Design vs Implementation

**Source**: `backend/internal/interfaces/http/routes.go`

### Match Rate: 100% (was 95%)

All designed endpoints for Summary Pack, Alert Notification, and Guided Review are registered. No missing routes.

### Resolved from v1.0

- ~~POST /notifications/telegram/verify missing~~ -- FIXED: Design updated to reflect webhook-based verification. Route listing now matches 1:1.

---

## 5. Error Response Format Consistency

**Standard** (from CLAUDE.md, updated):
```json
{ "code": "VALIDATION_ERROR", "message": "Invalid input" }
```

**Actual Implementation**: All 20 handler files use the flat format consistently.

### Match Rate: 100% (was 75%)

All handlers confirmed using `fiber.Map{"code": ..., "message": ...}` -- 422 occurrences across 20 files. Zero occurrences of nested `"error": { ... }` wrapping.

### Resolved from v1.0

- ~~CLAUDE.md documented nested format, handlers use flat~~ -- FIXED: CLAUDE.md updated to document the flat format with "(flat format)" label.

---

## 6. Remaining Work Status

**Sources**: `docs/todo.md`, `docs/2026-02-13-remaining-work.md`

### Match Rate: 30% (unchanged)

No remaining work items were addressed in Iteration 1 (Iteration 1 focused on design-implementation sync, not feature completion).

### NOW Items

| # | Item | Status | Notes |
|---|------|:------:|-------|
| 1 | Chart pagination (PageJumpPager) | [DONE] | Completed 2026-02-13 |
| 2 | Remaining work execution (items 1-4) | [OPEN] | See below |

### Remaining Work (Priority 1) -- All Open

| # | Item | Status |
|---|------|:------:|
| 1 | Home readability verification | [OPEN] |
| 2 | Checklist visual/action visibility | [OPEN] |
| 3 | Mobile/narrow screen readability | [OPEN] |
| 4 | Pagination stability | [OPEN] |
| 5 | Merge conflict re-verification | [OPEN] |

### Remaining Work (Priority 2) -- All Open

| # | Item | Status |
|---|------|:------:|
| 6 | AI model routing decision | [OPEN] |
| 7 | Privacy mode structure | [OPEN] |
| 8 | Alert/emergency mode enhancement | [OPEN] |
| 9 | Multi-asset expansion design | [OPEN] |
| 10 | Position UI consistency | [OPEN] |

### NEXT Items from todo.md

| # | Item | Status |
|---|------|:------:|
| 1 | Claude/Gemini integration | [OPEN] |
| 2 | Chart/bubble density fine-tuning | Partial (1st pass done) |

### Completion Rate: ~30% (2/7 NOW items done, 0/5 Priority 1 done)

---

## Summary Table

| Feature | v1.0 | v1.1 | Missing (Design O, Impl X) | Added (Design X, Impl O) | Changed |
|---------|:----:|:----:|:--------------------------:|:------------------------:|:-------:|
| Summary Pack v1 | 92% | 98% | 0 | 1 (PACK_GENERATE_FAILED error) | 0 |
| Alert Notification | 90% | 96% | 0 | 0 | 2 (sequential briefing, simplified notification) |
| Guided Review | 78% | 90% | 0 (Phase 2 items now documented) | 0 (extra fields documented) | 0 |
| Error Format | 75% | 100% | 0 | 0 | 0 |
| Routes | 95% | 100% | 0 | 0 | 0 |
| Remaining Work | 30% | 30% | N/A | N/A | N/A |

---

## Recommended Actions

### Immediate Actions (Critical)

1. **Execute remaining work Priority 1** -- 5 items from `docs/2026-02-13-remaining-work.md` are all still open. These are UX-critical items (readability, mobile, pagination).
   - File: `C:\Users\nyuk8\PycharmProjects\kifu\kifu\docs\2026-02-13-remaining-work.md`

### Low Priority Improvements

2. **AI briefing parallelism** -- Consider using goroutines in `AlertBriefingService.HandleTrigger` for parallel provider calls (currently sequential). Design Section 3.3 specifies parallel.
   - File: `C:\Users\nyuk8\PycharmProjects\kifu\kifu\backend\internal\services\alert_briefing_service.go`

3. **Notification message enrichment** -- Include all provider summaries in Telegram message, not just the first one. Design Section 5.2 specifies per-provider summaries.
   - File: `C:\Users\nyuk8\PycharmProjects\kifu\kifu\backend\internal\infrastructure\notification\telegram.go`

4. **Summary Pack: PACK_GENERATE_FAILED error code** -- Document this additional error code in `docs/spec/summary-pack-v1.md` Section 1 Possible Errors, or remove from implementation.
   - File: `C:\Users\nyuk8\PycharmProjects\kifu\kifu\backend\internal\interfaces\http\handlers\pack_handler.go`

### Future Phase Items (No Action Needed Now)

5. **Guided Review Phase 2** -- When planned:
   - Backend: Multi-trade bundling logic (5+ trades per symbol)
   - Backend: Non-trading day review endpoint with market data
   - Backend: Weekly AI insight job/endpoint

6. **Guided Review minor UX** -- Home entry card, daily card history list endpoint.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-15 | Initial full-project gap analysis | gap-detector |
| 1.1 | 2026-02-15 | Re-analysis after Iteration 1 fixes (5 items fixed, overall 77% -> 86%) | gap-detector |
