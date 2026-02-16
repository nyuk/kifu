# Report Changelog

## [2026-02-13] - Admin Sim Report

### Added
- Admin simulation flow and endpoint `POST /api/v1/admin/sim-report/run`.
- Admin UI `/admin/sim-report` and settings entry point.
- Simulation modes: `self` and `sandbox`, optional sandbox reset.

### Changed
- Simulation semantics changed to end-date anchored generation.
- Expanded simulated data set to include bubbles, outcomes, opinions, manual positions, and symbols.
- KPI sources now rely on summary API rather than local page data.

### Verification
- Backend: `go test ./...`
- Frontend: lint/typecheck/build.
- CLI smoke executed for temporary user + multi-day run.

## [2026-02-12] - Dark Leather Texture and Surface Update

### Changed
- Introduced CSS-only dark leather/metal texture system.
- Unified transparent surfaces across app shell.
- Removed opaque page backgrounds.

### Decisions
- Kept texture in code over image assets for resolution and performance.

## [2026-02-12] - Pre-Deploy QA Completion

### Added
- Pre-deploy QA report with 30 test cases and 3-cycle fixes.
- Checklist and production requirements with migration validation.

### Results
- Cycle 1: 6% pass
- Cycle 2: 90% pass
- Cycle 3: 100% pass

## [2026-02-12] - Full Code QA Session

### Added
- End-to-end code review completion.
- 8 critical issues fixed.

### Result
- Core flows, auth, and data consistency passed.

## [2026-02-11] - AI Beta Guardrails

### Added
- Cost protection and rate-limit controls.
- Demo/production mode split.

## [2026-02-10] - Onboarding QA Checklist

### Added
- Guest-to-authenticated onboarding validation.
- Initial onboarding quality checks.
