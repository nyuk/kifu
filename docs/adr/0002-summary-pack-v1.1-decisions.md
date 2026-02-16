> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - Korean is optional supplementary context when needed.

# ADR-0002 Summary Pack v1.1: generate-latest

## Context

Requiring users to manually provide a `run_id` causes friction and repetitive UI retries.
The previous v1 flow (`POST /api/v1/packs/generate`) required users to choose a completed run explicitly.

## Decision 1: Add automatic latest completed run selection

- Add endpoint: `POST /api/v1/packs/generate-latest`
- For authenticated user, select the latest completed run automatically.
- Selection rule:
  - `status = 'completed'`
  - `run_type IN ('exchange_sync','trade_csv_import','portfolio_csv_import')`
  - `ORDER BY finished_at DESC NULLS LAST, started_at DESC`
  - limit 1

## Decision 2: Keep manual path for explicit control

- Keep existing `/api/v1/packs/generate` for debug/advanced users.
- v1.1 UI should call `generate-latest` and avoid exposing run id input.

## Decision 3: Response enrichment

`POST /api/v1/packs/generate-latest` returns:
- `source_run_id`: selected run id
- `anchor_ts`: `run.finished_at` (fallback to `run.started_at`) in ISO8601
- keeps original fields `pack_id`, `reconciliation_status`

## Decision 4: Explicit error for no completed run

When no matching completed run exists, return:
- `404 NO_COMPLETED_RUN`

## Operational Impact

- Existing `/api/v1/packs/generate` remains for explicit workflows.
- v1.1 default flow for UI is `generate-latest`.
- Backend adds run selection logic only; no schema changes required.
