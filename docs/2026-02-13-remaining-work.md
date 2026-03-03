> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# 2026-02-13 Remaining Work (Execution Checklist)

This is a practical list of remaining items collected from `docs/todo.md`, recent changelogs, and live blockers.

## Do First

- [x] Complete Home readability verification
  - Confirm `/home` Quiet Routine and Closing Note cards are readable at 100% zoom within 2 seconds.
  - Remove low-contrast gray text where needed.
  - Verified: Playwright checkpoint suite pass (2026-03-03).
- [x] Validate checklist/action visibility
  - Status labels and buttons in `/home`, `/review`, `/trades`, `/portfolio` should be clearly visible.
  - Keep login-failure error messaging visible for at least 3 seconds.
  - Verified: Playwright checkpoint suite pass (2026-03-03).
- [x] Mobile and narrow-screen check (390–430px)
  - Verify wrapping, tab controls, and side scrolling.
  - Confirm one-screen status summary remains legible.
  - Verified: Playwright checkpoint suite pass (2026-03-03).
- [x] Pagination stabilization
  - Verify jump controls and boundary behavior for charts, bubbles, alerts, and notes.
  - Move away from repeated full-chain button clicking.
  - Verified: Playwright checkpoint suite pass (2026-03-03).
- [x] Fix false non-trading-day review popup on home
  - Repro: user has at least 1 trade in today window, but `/home` still shows non-trading-day review popup.
  - Checkpoints:
    - Verify today-window timezone alignment (Asia/Seoul vs UTC boundary).
    - Verify trades summary source and guided-review "no trade day" condition use same day window.
    - Verify popup suppression when `today_trade_count > 0`.
  - Done criteria: popup appears only when today trade count is zero.
  - Verified: `frontend/tests/qa-smoke.spec.ts` regression assertion + smoke pass (2026-03-03).
- [ ] Re-check Claude integration conflicts
  - Confirm no unresolved merge traces in alert/review/home/shell areas.
  - Compare pending changes by functional area.

## Next

- [x] AI routing decision (Claude/Gemini policy)
  - Define provider strategy and cost policy.
  - Documented: `docs/runbook/ai-routing-policy.md` (2026-03-03).
- [x] Privacy mode design
  - Confirm local-first vs server-backed storage policy.
  - Decision: hybrid mode, documented in `docs/runbook/privacy-mode-policy.md` (2026-03-03).
- [ ] Alert/urgent-mode hardening
  - Improve briefing template, log/reason capture, and re-entry protection.
- [ ] Multi-asset expansion
  - Formalize DEX/stock/other exchange path and sync strategy.
- [ ] Position UI consistency
  - Align position display across chart/home/portfolio.

## Known risks (monitor)

- Position marker and summary panel alignment still needs fine tuning.
- Bubble density and summary display may need additional calibration on high-frequency data.
- Bubble modal footer viewport overlap needs edge-case review.

## Pre-regression check

- Carry over items in `docs/2026-02-13-qa-run.md`.
- Mirror web-mcp/manual rules with the same regression list.
- Move completed items to `docs/todo.md` as NOW → DONE.
