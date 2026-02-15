# Report Changelog

## [2026-02-13] - Admin Sim Report (Time-Compressed User Test)

### Added
- Admin diagnostic flow for time-compressed user simulation
- Backend endpoint `POST /api/v1/admin/sim-report/run`
- Frontend page `/admin/sim-report` with parameterized run + summary/day-level result table
- Step-level flow logs per day (`trade_phase`, `guided_review_*`, `note_create`, `alert_*`, `ai_probe`)
- Target user mode for simulation (`self` / `sandbox`) with sandbox reset support
- Settings entry link for quick access

### Changed (Consistency Hotfix)
- Simulation range semantics switched to `end date anchored` generation:
  - Input date is treated as **end date**, simulator fills past N days.
- Simulator now seeds cross-tab dependent datasets together:
  - `trade_events` + `positions` rebuild
  - `outcomes`
  - `ai_opinions` + `ai_opinion_accuracies` (mock opinions)
  - `manual_positions`
  - `user_symbols`
- Portfolio fallback behavior tightened:
  - `asset_class=stock` and non-API source filters no longer fallback to crypto trades.
- Trades top KPI cards now use summary API (`/v1/trades/summary`) instead of page-local rows.

### Verification
- Backend: `go test ./...` pass
- Frontend: `lint/typecheck/build` pass (lint warnings are existing baseline)
- CLI smoke: temporary user + `days=2` run success

### Deliverables
- `docs/04-report/features/2026-02-13-admin-sim-report.md`
- `docs/CHANGELOG.md`
- `docs/todo.md`

---

## [2026-02-12] - Dark Leather Texture & Unified Surface Update

### Changed
- CSS-only dark leather + metal texture background system (no image files)
- Shell panels changed to transparent glass (bg-white/[0.03]) with backdrop-blur
- 38 component files unified: opaque backgrounds → transparent glass surfaces
- Page root backgrounds (alert, review, portfolio) removed
- Base color warmed from #0a0a0c to #120e08

### Design Decisions
- DALL-E image approach rejected (resolution limit, loading cost)
- CSS-only chosen for resolution independence and zero loading overhead
- Key discovery: Shell.tsx opaque panels were hiding all background effects

### Deliverables
- `docs/04-report/features/2026-02-12-library-bg-home-surface-update.md` - Full design report
- `docs/CHANGELOG.md` - Updated with 2026-02-12 entry

---

## [2026-02-12] - Pre-Deploy QA Completion Report

### Added
- Comprehensive Pre-Deploy QA completion report (30 E2E test cases)
- 3-cycle iterative testing log with issue resolution
- Critical findings: Database migration verification requirements for production deployment
- Production readiness assessment and pre-deployment checklist

### Test Results
- Cycle 1: 6% pass rate (2/30) - Database migrations missing
- Cycle 2: 90% pass rate (27/30) - Migration 020 missing, AI request body issue
- Cycle 3: 100% pass rate (30/30) - All issues resolved

### Critical Actions for Production
- Verify migrations 020 (guided_review) and 021 (ai_allowlist) applied to prod DB
- Confirm backend running on port 8080 (not 3000 as documented)
- Execute pre-deployment checklist before enabling production traffic

### Issues Resolved
1. Missing `ai_allowlisted` column (Migration 021)
2. Missing `guided_reviews` table (Migration 020)
3. AI one-shot request missing `price` field in test script

### Deliverables
- `docs/04-report/features/2026-02-12-predeploy-qa-report.md` - Full completion report
- `scripts/predeploy-e2e-test.sh` - E2E test script (30 test cases)
- `docs/2026-02-12-predeploy-qa-checklist.md` - QA checklist (7 sections)

---

## [2026-02-12] - Full Code QA Session Summary

### Added
- Full codebase QA review completed
- 8 critical issues identified and fixed
- Comprehensive issue list and resolutions documented

### Test Coverage
- Core functionality: Passed
- User authentication: Passed
- Data consistency: Passed
- API integrations: Passed

---

## [2026-02-11] - AI Beta Guardrails Report

### Added
- AI cost protection mechanisms
- Demo mode and production mode safeguards
- Rate limiting enforcement
- User allowlist system

---

## [2026-02-11] - Guided Review MVP Report

### Added
- Guided review feature implementation
- Streak calculation system
- Review calendar functionality
- Trend analysis

---

## [2026-02-10] - Onboarding QA Checklist

### Added
- Onboarding flow QA verification
- Guest mode to authenticated user flow
- UI/UX quality checks

---

## [2026-02-10] - AI One-Shot QA Report

### Added
- AI integration end-to-end testing
- Claude API integration verification
- Cost tracking and safety measures

---

## [2026-02-06] - Session Summary Report

### Added
- Alert notification feature implementation
- Telegram notification integration
- Alert monitoring and outcome calculation

---

## [2026-02-05] - Onboarding Guest Mode Checkpoint

### Added
- Guest mode entry point verification
- Authentication flow checkpoint
- Database initialization checks
