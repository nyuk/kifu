# Admin Workspace Expansion Design (Document-Only)

## Scope

This document defines design requirements for expanding the admin workspace without code changes in this step.

## Goals

- Keep current admin baseline stable.
- Clarify what to build next before implementation.
- Separate must-have operations from later optimizations.

## Out of Scope

- Backend/Frontend code changes
- DB schema changes
- Route or policy behavior changes

## Roles

- Admin:
  - Access to `/admin/*`
  - User/admin role operations
  - Policy toggle operations
  - Agent-service operational control
- Member/Guest:
  - No access to admin workspace

## Information Architecture (Proposed)

1. Admin Home (`/admin`)
   - Operational summary cards
   - Recent audit highlights
   - Critical policy status
2. Users (`/admin/users`)
   - Search/filter users
   - Promote/revoke admin
   - Self-protection on own role changes
3. Audit Logs (`/admin/audit-logs`)
   - Actor/action/target/time timeline
   - Risk-focused filtering
4. Policies (`/admin/policies`)
   - Read/update policy values
   - Last updated by/at visibility
5. Agent Services (`/admin/agent-services`)
   - Service health
   - Pause/resume/restart actions
   - Recent run history summary
6. Sim Report (`/admin/sim-report`)
   - Admin-only simulation execution
   - Dry-run vs AI-probe behavior visibility

## Core Flows

1. Incident triage flow
   - Check Admin Home summary
   - Inspect related audit logs
   - Toggle required policy if needed
   - Verify service state in Agent Services
2. Access control flow
   - Search user in Users page
   - Apply role update
   - Confirm event in Audit Logs
3. Policy operation flow
   - Change policy in Policies page
   - Validate updated-by/updated-at metadata
   - Confirm downstream service behavior

## API Requirements (Design Contract)

Current baseline endpoints already in use:

- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:id/admin`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/policies`
- `PUT /api/v1/admin/policies`
- `GET /api/v1/admin/agent-services`
- `POST /api/v1/admin/agent-services/:service/restart`
- `POST /api/v1/admin/agent-services/:service/pause`
- `POST /api/v1/admin/agent-services/:service/resume`
- `POST /api/v1/admin/sim-report/run`

Needed for later expansion (not implemented in this step):

1. Agent run filtering contract
   - Query by `run_type`, `status`, `limit`, `cursor`
2. Policy change reason
   - Optional reason/comment field for update auditing
3. Admin KPI endpoint
   - Daily error/run/policy-change summary for dashboard cards

## Priority

- P0 (must keep stable):
  - Admin auth guard with `users.is_admin`
  - Audit logging on role/policy/action changes
  - Policy visibility with updater metadata
- P1 (next implementation focus):
  - Agent run filtering and operational metrics
  - Dashboard cards for incident-first visibility
- P2 (later):
  - Bulk operations
  - Advanced export/reporting

## Acceptance Checklist (For Future Implementation)

- [ ] No admin route is accessible by non-admin users.
- [ ] Every role/policy/service action is traceable in audit logs.
- [ ] Agent service status and recent run history are visible in one admin flow.
- [ ] Incident triage can be completed without direct DB access.
