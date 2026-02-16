> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# Current State Summary (for NotebookLM)

## Project Core

- Product: trading and summary-pack backend + Next.js frontend.
- Current objective: finalize Summary Pack v1.1 flow and maintain v1.0 as baseline behavior.
- Status: `POST /api/v1/packs/generate-latest` added and connected in UI.

## Completed changes

- Backend endpoint: `POST /api/v1/packs/generate-latest`
- Route registration: `backend/internal/interfaces/http/routes.go`
- Handler: `backend/internal/interfaces/http/handlers/pack_handler.go`
- Repository contract and implementation:
  - `backend/internal/domain/repositories/run_repository.go`
  - `backend/internal/infrastructure/repositories/run_repository_impl.go`
- UI: `frontend/src/components/settings/ExchangeConnectionManager.tsx`
  - “Generate Pack (30d)” now uses generate-latest.
- Tests:
  - `backend/internal/interfaces/http/handlers/pack_handler_test.go`
  - success, `NO_COMPLETED_RUN` (404), and cross-user scope verification.
- Docs:
  - `docs/spec/summary-pack-v1.md`
  - `docs/runbook/summary-pack-v1.md`
  - `docs/adr/0002-summary-pack-v1.1-decisions.md`

## Core rules

- Allowed run types: `exchange_sync`, `trade_csv_import`, `portfolio_csv_import`
- Must be `status='completed'`
- Sort: `finished_at DESC NULLS LAST`, tie-break `started_at DESC`
- If no run matches: return `NO_COMPLETED_RUN` with 404

## Next actions

1. Run local/staging smoke tests.
2. Improve UX copy for `NO_COMPLETED_RUN`.
3. Continue existing flow extensions.
