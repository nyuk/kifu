# Changelog

## 2026-02-13

### Added
- Added 30-day behavior simulation workflow:
  - API: `POST /api/v1/admin/sim-report/run`
  - New simulation pipeline creates trades, bubbles, guided reviews, review notes, alerts, and AI checks by date range.
  - Returns per-day step logs and streak metadata.
- Added target modes:
  - `target_mode=self` (authenticated user)
  - `target_mode=sandbox` (test user auto-create/reuse)
- Added admin simulation UI:
  - `/admin/sim-report` page with parameters, execution, and result view.
  - Settings page now links to this report page.

### Changed
- Simulation semantics updated:
  - End date is now treated as anchor date; simulate N previous days.
- Simulation data consistency expanded:
  - Simulates `trade_events`, `positions`, `outcomes`, `ai_opinions`, `ai_opinion_accuracies`, `manual_positions`, `user_symbols` together.
- Portfolio fallback issue fixed so stock and coin paths do not overwrite each other.
- Trades summary in transaction tab now uses `/v1/trades/summary`.
- Review AI card navigation and link sharing hardened:
  - symbol normalization, timeframe normalization (`1d` fallback), candle fallback using `created_at`.
  - Shared filter link text clarified.

### Files Affected
- `backend/internal/interfaces/http/handlers/sim_report_handler.go`
- `backend/internal/interfaces/http/routes.go`
- `frontend/app/(app)/admin/sim-report/page.tsx`
- `frontend/src/components/portfolio/PortfolioDashboard.tsx`
- `frontend/src/components-old/Trades.tsx`
- `frontend/src/components-old/Settings.tsx`
- `frontend/app/(app)/review/page.tsx`
- `docs/todo.md`

## 2026-02-12

### Added
- CSS-only dark and leather-metal texture background system.
- Transparent shell layer styling for app panels.

### Changed
- Replaced heavy opaque surfaces with translucent glass-like system.
- Unified background on app pages (`alert`, `review`, `portfolio`).
- Updated base color and gradients.

## 2026-02-10

### Added
- AI summary filters and URL state sync.
- Direct jump from AI summary card to bubble detail.
- Chart marker density and tooltip placement stability.

### Changed
- Reduced UI clutter on chart controls.
- Hardened AI one-shot prompt and error handling.
- Added retention policy for review notes.

## 2026-02-09

### Added
- Upbit candle API path support and interval mapping.
- Symbol routing for exchange context.
- Overlay controls for high-density charts.

### Changed
- `GET /api/v1/market/klines` moved to public access for chart reuse.
- Improved chart overflow and tooltip behavior.
