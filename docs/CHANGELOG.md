# Changelog

## 2026-02-22

### Added
- Added social OAuth scaffolding for Google sign-in:
  - Backend auth start endpoint: `GET /api/v1/auth/social-login/google`
  - Backend callback endpoint: `GET /api/v1/auth/social-login/:provider/callback`
  - Signed social state, token exchange, Google profile verification, social user bootstrap for first-time login
  - New frontend callback landing page: `frontend/app/(auth)/social-callback/page.tsx`

### Changed
- Updated login screen social buttons to invoke OAuth redirect flow and pass through `return_to` target.

### Files Affected
- `backend/internal/interfaces/http/handlers/auth_handler.go`
- `backend/internal/interfaces/http/routes.go`
- `backend/internal/interfaces/http/handlers/auth_handler_test.go`
- `frontend/src/components-old/Login.tsx`
- `frontend/app/(auth)/social-callback/page.tsx`
- `docs/roadmap.md`
- `docs/todo.md`

## 2026-02-21

### Added
- Added admin user management baseline capabilities under admin workspace:
  - Backend endpoint: `GET /api/v1/admin/users`
  - Backend endpoint: `PATCH /api/v1/admin/users/:id/admin`
- Added admin management UI: `/admin/users`
  - Shows users with search + pagination
  - Supports admin grant/revoke with self-protection
- Added initial admin audit trail baseline:
  - DB table: `admin_audit_logs`
  - Backend endpoint: `GET /api/v1/admin/audit-logs`
  - Admin UI page: `/admin/audit-logs`
- Added operational policy controls in admin workspace:
  - DB table: `admin_policies` (migration `025_add_admin_policies.sql`)
  - Backend endpoint: `GET /api/v1/admin/policies`
  - Backend endpoint: `PUT /api/v1/admin/policies` (single-key toggle update)
  - Admin UI page: `/admin/policies`
- Added exchange trade poller operational controls:
  - Migration `026_add_agent_service_poller_policy.sql` seeds `agent_service_poller_enabled` policy
  - Poller loop now checks policy in `backend/internal/jobs/trade_poller.go`
    and pauses execution when disabled
  - Admin UI `/admin/agent-services` now includes pause/resume/restart controls for poller operations
- Admin operation dashboard now includes a shortcut card to policy controls from `/admin`
- Admin route hardening switched to a shared DB-checked middleware (`middleware.RequireAdmin`) for all `/api/v1/admin/*` routes.
- Admin dashboard (`/admin`) received additional operator summary:
  - 에이전트 서비스 운영 지표 요약 블록
  - 관리자 역할/노출 범위의 역할 정리 섹션
  - 운영자 페이지 로드 시 에이전트 상태 집계 로딩 실패 피드백

### Changed
- Admin role changes now require explicit admin endpoint access under existing `/api/v1/admin/*` guard (JWT + `is_admin` DB check).

### Files Affected
- `backend/internal/domain/repositories/user_repository.go`
- `backend/internal/infrastructure/repositories/user_repository_impl.go`
- `backend/internal/interfaces/http/handlers/admin_user_handler.go`
- `backend/internal/interfaces/http/handlers/admin_audit_handler.go`
- `backend/internal/interfaces/http/routes.go`
- `backend/internal/interfaces/http/handlers/auth_handler_test.go`
- `frontend/app/(app)/admin/page.tsx`
- `frontend/app/(app)/admin/users/page.tsx`
- `frontend/app/(app)/admin/audit-logs/page.tsx`
- `docs/roadmap.md`
- `docs/todo.md`
- `backend/migrations/024_add_admin_audit_logs.sql`

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
