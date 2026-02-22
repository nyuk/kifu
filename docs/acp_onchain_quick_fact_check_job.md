# ACP Offering: onchainQuickFactCheckCompactJson

## Service-Only Job Specification (v1.0)

### Short Description
Deterministic on-chain quick fact check for a target wallet within a requested time window, returned as compact JSON including summary, evidence pointers, confidence, uncertainty flags, and structured error codes.

### Job Identity
- Job Name: `onchainQuickFactCheckCompactJson`
- Service: `Onchain Quick Fact Check (Compact JSON)`

### Endpoint
- `POST /api/v1/jobs/onchain-quick-fact-check`
- `POST /api/v1/onchain/quick-fact-check-compact`

### Requirements (Input)
- Required:
  - `chain` (string): e.g., `base`
  - `address` (string): `0x...`
  - `timeWindow` (object):
    - `from` (string, optional): ISO-8601 or Unix timestamp
    - `to` (string, optional): ISO-8601 or Unix timestamp
    - `lookbackSec` (number, optional): alternative to `from`/`to`
    - One of (`from` + `to`) or `lookbackSec` is required.
- Optional:
  - `tokenList` (array[string])
  - `riskFlags` (object): `includeCounterpartySummary`, `includeContractInteractions`, `detectCexLikeFlows`, `includeNft`, `maxHops`
  - `limits` (object): `maxTxs`, `maxEvents`
  - `clientMeta` (object): `requestId`, `notes`

### Deliverables (Output)
Output JSON schema:

```json
{
  "schema_version": "1.0",
  "job_type": "onchain_quick_fact_check",
  "chain": "base",
  "address": "0x...",
  "timeWindow": {
    "from": "2026-02-22T00:00:00Z",
    "to": "2026-02-22T12:00:00Z"
  },
  "status": "ok",
  "confidence": 0.0,
  "error_code": null,
  "uncertainty": {
    "is_partial": false,
    "reasons": []
  },
  "summary": {
    "tx_count_observed": 0,
    "native": { "inflow": "0", "outflow": "0", "net": "0" },
    "tokens": [
      { "asset_id": "0xTokenOrMint", "inflow": "0", "outflow": "0", "net": "0" }
    ],
    "top_interactions": [
      { "counterparty": "0xOrProgram", "category": "dex", "count": 0 }
    ],
    "risk_signals": [
      { "signal": "none", "severity": "low", "note": "no risk signals" }
    ]
  },
  "evidence": {
    "block_range": { "from": 0, "to": 0 },
    "tx_hashes": ["0x..."],
    "log_ids": ["optional-provider-id"],
    "sources": [
      { "type": "rpc", "name": "base-rpc", "healthy": true }
    ]
  },
  "meta": {
    "generated_at": "2026-02-22T12:34:56Z",
    "latency_ms": 0,
    "limits_applied": { "max_txs": 2000, "max_events": 20000 },
    "client_meta_echo": { "requestId": "optional", "notes": "optional" }
  }
}
```

### Status and Error Code Rules
- `status`: `ok`, `warning`, `error`
- `error_code` examples:
  - `partial`, `timeout`, `reorg_suspect`, `source_unavailable`, `insufficient_data`, `invalid_input`, `unsupported_chain`, `rate_limited`

### SLA & Limits (Current default in service)
- SLA target: best effort within 2–10 minutes
- Window cap: 7 days
- Max txs: `2000`
- Max events: `20000`
- Rate limiting: request/IP limiter on in-service route (as configured)

### Provider Rules
- Deterministic JSON output key set and value types
- Fixed error taxonomy
- Evidence pointers must include source and hash list when available
- `chain`, `address`, and resolved `timeWindow` must be echoed

### Base Testnet / Integration Checklist
- Service starts successfully and route is reachable
- `chain=base` and valid `0x` address returns `status=ok|warning`
- Out-of-range/invalid `timeWindow` returns `status=error` + `invalid_input`
- Timeout/unavailable provider returns `status=error` + `source_unavailable`
- `rate_limited` returns `status=error` and `429`
- response always matches the schema fields (including `schema_version`, `job_type`, `timeWindow`, `summary`, `evidence`, `meta`)

### ACP Upload Text (Short)
- Deterministic, compact JSON output for wallet activity fact-checking with risk and uncertainty metadata.
- Includes source references, confidence score, and structured partial/error codes for automated verification workflows.
