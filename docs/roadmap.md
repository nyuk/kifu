# KIFU Roadmap

## 2026-02-20 Snapshot

This document tracks postponed or planned work that is not part of the current public feature baseline.

## Planned

- [ ] Social login (OAuth providers)
- [ ] DB-only serverization for admin and auth authority
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
