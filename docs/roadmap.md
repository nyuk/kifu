# KIFU Roadmap

## 2026-02-28 Snapshot

This document tracks roadmap status after test-gate stabilization on `main` (`8649a01`).

## Current Stable Scope

- Trading journal baseline:
  - Exchange/CSV/manual trade ingestion
  - Review, notes, and safety/guided review flows
  - Portfolio and chart pages
- Onchain quick check (`/api/v1/onchain/quick-check`)
- Admin workspace baseline (`/admin`):
  - Users
  - Audit logs
  - Policies
  - Agent services
  - Sim report
- Social login policy in production:
  - Google: enabled
  - Non-Google providers: disabled (`coming_soon`)

## AI Operator Plan Status (`.sisyphus/plans/ai-agent-vps-project-plan.md`)

- [x] Task 1
- [x] Task 2
- [x] Task 3
- [x] Task 4
- [x] Task 5
- [x] Task 6 (sim-report AI probe path integration)
- [ ] Task 7+

## Task 7+ Entry Conditions (Document-Level Gate)

Task 7 and later work should start only when all of the following are confirmed:

1. Test gate is green on target environment:
   - `go test ./... -count=1` passes
2. Policy baseline exists in DB:
   - `admin_policies` table/migrations are applied
3. Scope safety:
   - No regression to Task 1-6 behavior
   - Dry-run behavior for sim-report remains unchanged
4. Operational policy alignment:
   - Production social-login policy remains Google-only unless explicitly changed
   - Admin authority source of truth remains `users.is_admin`

## Next Priority (No Code in This Step)

1. Task 7 design and execution plan finalization:
   - Run tracking integration for pack generation and AI opinion routes
2. Task 8 run-query/metrics design:
   - Filtering and telemetry consistency on admin agent-services
3. Task 9 policy/provider API alignment:
   - UI-facing dynamic policy/provider data contract cleanup

## Admin Workspace Design Reference

- Design-only spec for next expansion:
  - `docs/02-design/features/admin-workspace.design.md`
