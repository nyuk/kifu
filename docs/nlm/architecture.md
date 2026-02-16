> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# Architecture Summary

## Backend

- Router: `backend/internal/interfaces/http/routes.go`
- Handler: `backend/internal/interfaces/http/handlers/pack_handler.go`
- Domain:
  - `backend/internal/domain/repositories/run_repository.go`
  - domain entities for runs/packs/reconciliation
- Infrastructure:
  - `backend/internal/infrastructure/repositories/run_repository_impl.go`

## Flow (generate-latest)

1. `POST /api/v1/packs/generate-latest`
2. Authenticate user
3. Load latest completed runs under user scope + run type filter
4. If no run, return `NO_COMPLETED_RUN`
5. Call summary-pack service and persist pack
6. Return `pack_id`, `source_run_id`, `reconciliation_status`, `anchor_ts`

## Frontend

- `frontend/src/components/settings/ExchangeConnectionManager.tsx`
- Existing “Generate Pack (30d)” now calls `generate-latest`.

## References

- `docs/spec/summary-pack-v1.md`
- `docs/runbook/summary-pack-v1.md`
- `docs/adr/0002-summary-pack-v1.1-decisions.md`
