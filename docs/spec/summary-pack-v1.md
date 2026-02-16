> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - Korean is optional supplementary context when needed.

# Summary Pack v1 API Spec

## Version

- Schema: `summary_pack_v1`
- Calc version: `ledger_calc_v1.0.0`
- Base path: `/api/v1/packs`

## Common

- Authentication: existing auth/session or JWT
- Authorization: only owner resources (`401`/`404` applied)
- Content-Type: `application/json`

## 1) POST `/api/v1/packs/generate`

### Request

```json
{
  "source_run_id": "9f1f9b2d-4f2e-4f88-b9d4-... (uuid)",
  "range": "30d"
}
```

#### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `source_run_id` | string(uuid) | Y | Completed sync/import run id |
| `range` | string(enum) | N | `30d` | `7d` | `all` (default: `30d`) |

### Response 200

```json
{
  "pack_id": "c6d4...-uuid",
  "reconciliation_status": "ok"
}
```

#### Response fields

| Field | Type | Description |
|---|---|---|
| `pack_id` | string(uuid) | Generated Summary Pack id |
| `reconciliation_status` | enum | `ok` / `warning` / `error` |

### Possible Errors

- `400 INVALID_REQUEST`: missing/invalid `source_run_id`, unsupported range
- `401 UNAUTHORIZED`: missing/invalid session or token
- `404 RUN_NOT_FOUND`: `run_id` does not belong to user or is deleted
- `500 PACK_SAVE_FAILED`: DB save failure

## 1.1) POST `/api/v1/packs/generate-latest`

### Request

```json
{
  "range": "30d"
}
```

#### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `range` | string(enum) | N | `30d` | `7d` | `all` (default: `30d`) |

### Behavior

Server automatically selects latest completed run for authenticated user among:
`exchange_sync`, `trade_csv_import`, `portfolio_csv_import`.

Selection order:
`ORDER BY finished_at DESC NULLS LAST, started_at DESC`

`source_run_id` is resolved server-side and is not required by client.

### Response 200

```json
{
  "pack_id": "c6d4...-uuid",
  "reconciliation_status": "ok",
  "source_run_id": "9f1f9b2d-4f2e-4f88-b9d4-...",
  "anchor_ts": "2026-02-13T09:00:00Z"
}
```

#### Response fields

| Field | Type | Description |
|---|---|---|
| `pack_id` | string(uuid) | Generated Summary Pack id |
| `reconciliation_status` | enum | `ok` / `warning` / `error` |
| `source_run_id` | string(uuid) | Auto-selected run from backend |
| `anchor_ts` | string(ISO8601) | `finished_at` (fallback: `started_at`) |

### Possible Errors

- `404 NO_COMPLETED_RUN`: no completed run exists to generate from

## 2) GET `/api/v1/packs/latest`

### Query
- `range` (string, default `30d`)

### Response
Returns full Summary Pack entity fields including `pack_id`, `user_id`, `source_run_id`, `range`, `schema_version`, `calc_version`, `content_hash`, `reconciliation_status`, suspicion counts, `normalization_warnings`, `payload`, `created_at`.

### Error
- `404 PACK_NOT_FOUND`: no pack for selected range

### v1.1 recommended UX flow
- Default flow: `POST /api/v1/packs/generate-latest` + `GET /api/v1/packs/{pack_id}`.
- Keep v1.0 manual endpoint for advanced flow only.

## 3) GET `/api/v1/packs/{pack_id}`

### Path
- `pack_id` (string(uuid))

### Response
Full Summary Pack entity (same shape as latest).

## 4) Summary Pack payload schema

```json
{
  "pack_id": "uuid",
  "schema_version": "summary_pack_v1",
  "calc_version": "ledger_calc_v1.0.0",
  "content_hash": "sha256_hex",
  "time_range": {
    "timezone": "Asia/Seoul",
    "start_ts": "2026-01-01T00:00:00Z",
    "end_ts": "2026-02-01T00:00:00Z"
  },
  "data_sources": {
    "exchanges": ["upbit", "binance_futures"],
    "csv_imported": false,
    "modules": ["trades", "funding"]
  },
  "pnl_summary": {
    "realized_pnl_total": "1234.56",
    "unrealized_pnl_snapshot": null,
    "fees_total": "12.34",
    "funding_total": null
  },
  "flow_summary": {
    "net_exchange_flow": "10000.00",
    "net_wallet_flow": null
  },
  "activity_summary": {
    "trade_count": 123,
    "notional_volume_total": "250000.00",
    "long_short_ratio": "1.05",
    "leverage_summary": null,
    "max_drawdown_est": null
  },
  "reconciliation": {
    "reconciliation_status": "ok",
    "missing_suspects_count": 0,
    "duplicate_suspects_count": 0,
    "normalization_warnings": []
  },
  "evidence_index": {
    "exchange_trade_ids_sample": ["111", "112"],
    "evidence_pack_ref": "evidence_pack://c6d4...-uuid"
  }
}
```

## 5) Nullable/required rules

- Required: `pack_id`, `schema_version`, `calc_version`, `content_hash`, `reconciliation_status`, `time_range.*`
- Nullable: `unrealized_pnl_snapshot`, `funding_total`, `net_wallet_flow`, `leverage_summary`, `max_drawdown_est`
- `flow_summary.net_exchange_flow` can be `null` when calculation cannot be completed

## 6) Health rules summary

- `duplicate`: fallback key duplication (`exchange|symbol|side|price|qty` fallback) increases suspicion count.
- `missing`: `trade_count >= 10` and `fees_total == 0` increments missing.
- `missing`: futures module exists + futures trades + missing funding data increments missing.
- `warning`: `time_skew` if timestamp deviates from median by > 6 hours.
- `warning`: `symbol_mapping_gap` when normalized symbol is `unknown/invalid`.

Status:
- `error`: `missing_suspects_count >= 10`
- `warning`: missing > 0 or duplicate > 0 or warnings non-empty
- `ok`: none of above

## 7) Idempotency (v1)

- Current behavior: duplicate packets are allowed for the same `source_run_id + range`.
- Future hardening options:
  - Return latest existing pack for same selector
  - Or unique index on `(user_id, source_run_id, range)` + upsert
