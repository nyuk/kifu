> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# API Endpoints (NotebookLM)

## Pack APIs

### `POST /api/v1/packs/generate-latest`

- Auth: `Authorization: Bearer <token>`
- Body: none
- Behavior:
  - select latest completed run by user
  - allowed run_type: `exchange_sync`, `trade_csv_import`, `portfolio_csv_import`
  - order: `finished_at DESC NULLS LAST`, then `started_at DESC`
- Response fields:
  - `pack_id`
  - `reconciliation_status`
  - `source_run_id`
  - `anchor_ts`
- Failure:
  - no run => `NO_COMPLETED_RUN`, `404`

### Existing generate endpoint

- `POST /api/v1/packs/generate` with explicit `source_run_id`
- Existing flows are retained as v1.0 behavior

### Operations checklist

- verify 401 path on invalid token
- verify user scope isolation
- verify null/NULL `finished_at` fallback behavior
- verify `pack_id` via `GET /api/v1/packs/{pack_id}` after create
