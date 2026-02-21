# KIFU Roadmap

## 2026-02-20 Snapshot

This document tracks postponed or planned work that is not part of the current public feature baseline.

## Planned

- [ ] Social login (OAuth providers)
- [x] DB-only serverization for admin and auth authority
- [ ] Admin dashboard expansion:
  - Admin workspace sections
  - Access control audit and operational metrics
- [ ] Admin workspace role-specific capabilities:
  - User role management (promote/revoke admin and audit trail)
  - Operational controls for agent services (safety, restart/disable, run history)
  - Incident-level guardrail and structured log collection
- [ ] Agent service detail service pages and lifecycle controls
- [ ] Structured incident logging on critical failure paths

## Completed (not yet migrated)

- [x] Admin simulator tool exposed only in admin workspace (`/admin`)
- [x] Guest-mode simulator link hidden in settings
- [x] Admin authority source extraction for role assignment
- [x] Find ID / Reset Password flows
- [x] Agent service detail screen skeleton (`/admin/agent-services`)

## 2026-02-21 Progress

- [x] Admin user management baseline API + UI scaffold
  - Admin user listing with pagination and search
  - Admin role grant/revoke endpoint (`PATCH /api/v1/admin/users/:id/admin`) with self-protection
  - Admin navigation card to `/admin/users`
- [x] Admin audit trail baseline
  - Admin role change events are recorded in `admin_audit_logs`
  - API exposure via `GET /api/v1/admin/audit-logs`
  - Admin UI page `/admin/audit-logs` for browsing actor/target/time/details
- [x] Operational policy controls for admin workspace
  - Added `admin_policies` table + migration (`025_add_admin_policies.sql`)
  - Added `GET /api/v1/admin/policies` and `PUT /api/v1/admin/policies`
  - Added `/admin/policies` UI for operational toggles
  - Added `agent_service_poller_enabled` seed migration (`026_add_agent_service_poller_policy.sql`)
  - Added trade poller policy gate in `backend/internal/jobs/trade_poller.go`
  - Added pause/resume/restart controls to `/admin/agent-services`
- [x] Admin route authority hardening
  - Added centralized middleware `middleware.RequireAdmin` in `backend/internal/interfaces/http/middleware`
  - `/api/v1/admin/*` now enforces DB `users.is_admin` for all routes in the group
- [x] Admin dashboard 상세화
  - `/admin` displays role/authority summary, agent service health snapshot, and operational ownership items
