> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# Debug Playbook (generate-latest)

## Quick path

1. Confirm token is valid.
2. Confirm user has completed runs.
3. Confirm deployment branch/commit.
4. Call endpoint and validate response.
5. Retrieve pack by returned `pack_id`.

## API reproduction

- `POST /api/v1/packs/generate-latest`

Expected:
- Success: returns `pack_id`, `source_run_id`, `anchor_ts`
- Failure: `NO_COMPLETED_RUN` (404)

## Error responses

| Symptom | Immediate action | Files |
|---|---|---|
| `NO_COMPLETED_RUN` | Check run table for user completed runs | `run_repository_impl.go` |
| `500` | Inspect pack service save + generation logs | `pack_handler.go` |
| Wrong-user data | Verify user_id filter and scope checks | `run_repository_impl.go`, route middleware |

## 30d smoke flow

1. Login
2. Open Exchange settings and press “Generate Pack (30d)”
3. Capture `pack_id`
4. `GET /api/v1/packs/{pack_id}`
5. Confirm status, timestamp, payload fields

## Regression tests

- no completed run
- multiple completed runs (check ordering)
- parallel call across users
