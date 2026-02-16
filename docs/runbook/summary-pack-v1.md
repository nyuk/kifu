> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - Korean is optional supplementary context when needed.

# Summary Pack v1 Runbook

## Purpose

Use this runbook to diagnose and recover from Summary Pack generation failures and retrieval errors.

## Preconditions

- Migration `022_create_runs_and_summary_packs.sql` is applied.
- Endpoints are deployed:
  - `POST /api/v1/packs/generate`
  - `POST /api/v1/packs/generate-latest`
  - `GET /api/v1/packs/latest`
  - `GET /api/v1/packs/{pack_id}`
- Authentication/session is valid.

## 1) Standard troubleshooting flow

1. After sync or CSV import, capture `run_id` if available.
2. Call:
   `POST /api/v1/packs/generate` with:
   ```json
   { "source_run_id": "<run_id>", "range": "30d" }
   ```
3. Save returned `pack_id`.
4. Call `GET /api/v1/packs/{pack_id}`.
5. Review `reconciliation_status`, `missing_suspects_count`, `duplicate_suspects_count`.

### v1.1 Recommended flow
1. Call `POST /api/v1/packs/generate-latest` after sync/import (no run id input).
2. Display `source_run_id`, `anchor_ts` returned from response.
3. Retrieve payload with `GET /api/v1/packs/{pack_id}`.
4. Optionally verify with `GET /api/v1/packs/latest?range=30d`.

## 2) Priority checks

### P0: Auth / scope
- Symptom: `401 UNAUTHORIZED`, `404 RUN_NOT_FOUND`
- Checks:
  - `GET /api/v1/auth/me` works in same session
  - token expiration and forced logout state
  - run ownership check against current user

### P1: Generation failure
- Symptom: `PACK_GENERATE_FAILED`, `PACK_SAVE_FAILED`
- Checks:
  - `source_run_id` format is UUID
  - range is one of `30d|7d|all`
  - inspect `GeneratePack` / DB write errors in logs
- Actions:
  - retry with different source/run and range
  - if consistent, inspect trade count and related run metadata

### P1: Retrieval failure
- Symptom: `PACK_NOT_FOUND` or 404 response
- Checks:
  - ensure generation call returned 200
  - ensure response wasn’t dropped by network proxy/client
- Actions:
  - verify latest exists with `GET /api/v1/packs/latest?range=30d`

### P0: No completed run
- Symptom: `404 NO_COMPLETED_RUN`
- Checks:
  - verify user has completed run of allowed type
  - confirm `finished_at` is set and status is `completed`
- Actions:
  - rerun/import sync and retry
  - if run failed, fix and rerun sync

### P2: Reconciliation warning/error
- warning: `duplicate_suspects_count > 0`, `missing_suspects_count > 0`, non-empty `normalization_warnings`
- error: `missing_suspects_count >= 10`
- Action:
  - surface warning detail in UI/review cards before exposing to users

## 3) Operational SQL checks

```sql
SELECT pack_id, user_id, source_run_id, range, reconciliation_status,
       missing_suspects_count, duplicate_suspects_count, created_at
FROM summary_packs
ORDER BY created_at DESC
LIMIT 20;
```

```sql
SELECT run_id, user_id, run_type, status, started_at, finished_at, meta
FROM runs
WHERE run_id = '<run_uuid>';
```

```sql
SELECT range, reconciliation_status, COUNT(*) AS cnt
FROM summary_packs
GROUP BY range, reconciliation_status
ORDER BY range, reconciliation_status;
```

## 4) Incident checklist

| Symptom | Immediate check | First action | Secondary action |
|---|---|---|---|
| slow pack generation | DB/CPU usage | tell user to retry with smaller range | inspect generation job concurrency |
| persistent warnings | reconciliation details | verify symbol normalization / metadata | tune warning thresholds |
| duplicate packets | repeated manual trigger | disable button briefly / debounce | consider idempotency ADR transition |
| zero-activity run | selected run timing | regenerate after finished run | sync timestamp handling in UI |

## 5) Release readiness

1. Migration version check
2. auth, CORS, cookie policy verification
3. at least one successful smoke flow (generate -> latest -> retrieve)
4. cross-user isolation check (404/403 behavior)

## 6) Rollback / emergency actions

If widespread incidents are detected:

1. Disable generation button in UI
2. Keep read-only API routing
3. Avoid schema rollback; ship fix hotfix and redeploy
