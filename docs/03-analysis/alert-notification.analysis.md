> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - Korean is optional supplementary context when needed.

# Alert-Notification Gap Analysis

> Analysis date: 2026-02-06
> Overall match rate: **93%** (updated after `volatility_spike` implementation)

## Score by Category

| Category | Score |
|----------|:----:|
| Migration/Data model | 98% |
| API Endpoints | 94% |
| Core flow | 88% |
| Trigger engine | 100% (4/4) |
| AI briefing | 90% |
| Telegram bot | 92% |
| Backend structure | 85% |
| Design alignment | 93% |
| **Overall** | **93%** |

## Missing / mismatched items

### ~~HIGH - already resolved~~
1. ~~`volatility_spike` evaluation was missing~~ - now implemented via 20-kline standard deviation + `multiplier` threshold.

### MEDIUM - short-term follow-up
2. AI provider calls are still sequential although design expects parallel execution (possible 90s worst case).
3. `callProvider` logic duplication exists across `ai_handler.go` and `alert_briefing_service.go`.
4. Position context passed to AI is summarized only (not fully detailed: entry, size, PnL).

### LOW - docs cleanup
5. `POST /notifications/telegram/verify` intentionally removed in design (replaced with webhook flow).
6. Telegram quick actions changed from 2 buttons to 1.
7. Repository split differs from original file-count expectation.
8. Index name naming differs (`idx_alert_rules_enabled` vs `idx_alert_rules_active`).

## Items implemented beyond design

- 10-second in-memory price cache to reduce repeated exchange calls
- `UpdateCheckState` helper for per-tick crossing tracking
- `SendToChatID` webhook shortcut path
- Pagination total count support in alert list

## Conclusion

Overall status is **PASS (93%)** with `volatility_spike` now implemented. Remaining medium items are optimization/refactor tasks, not blockers.
