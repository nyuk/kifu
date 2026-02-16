> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - Korean is optional supplementary context when needed.

# ADR-0001 Summary Pack v1 Design Decisions

## Title
Decision record for Summary Pack v1 generation approach.

## Status
- Approved (2026-02-13)
- Scope: `runs`, `summary_packs`, `/api/v1/packs/*`, Summary Pack v1 pipeline

## Context
After exchange sync or CSV import completes, we need a compact, deterministic way to summarize transactions, bubbles, and positions for review and health checks. The goal is reproducible output without requiring external AI in the core generation path.

### Problem
1. Automatic generation right after sync could break UX due to API latency or temporary failures.
2. Summary should be deterministic and avoid sending raw source data externally.
3. Cost and throughput should align with subscription/cost model.

## Decision 1: Keep manual trigger as baseline v1
- **Decision**: Do not auto-run Summary Pack immediately on sync/import completion.
- **Rationale**:
  - Users may need explicit review window selection.
  - Manual invocation reduces duplicate generation during failed/rapid retries.
- **Alternatives**:
  - Immediate generation on sync completion
  - Queue-based async generation (additional infrastructure)

## Decision 2: Track runs separately from payload table
- **Decision**: Add lightweight `runs` table and store only `run_id` in `summary_packs`.
- **Rationale**:
  - Keep existing trading tables unchanged.
  - Maintain clear auditability by run boundaries.
- **Alternatives**:
  - Add `source_run_id` directly to many domain tables (broad impact)
  - Full event log only (harder queryability)

## Decision 3: `funding_total` is nullable
- **Decision**: `funding_total` is nullable in Summary Pack v1 schema.
- **Rationale**:
  - Prevent false positives in mixed environments where futures data is partially unavailable.
  - `null` is semantically clearer than forced `0`.
- **Rule**:
  - If module list includes `funding` and futures data exists, missing funding count raises warning.
  - If funding module is absent for user/account, skip this warning.

## Decision 4: Symbol normalization warning policy
- **Decision**: `symbol_mapping_gap` uses `warning` for unknown/invalid normalization.
- **Rationale**:
  - Exchange data format variance can create transient invalid symbols.
  - Avoid blocking generation for recoverable quality issues.

## Decision 5: Deterministic generation path
- **Decision**: v1 generation must be deterministic and non-LLM.
- **Rationale**:
  - Predictable costs and runtime.
  - Easier snapshot testing.

## Decision 6: Idempotency policy (current)
- **Decision**: Permit duplicate packets for the same `source_run_id + range`.
- **Rationale**:
  - Retry history remains fully auditable.
  - Simpler to implement for current stage.
- **Future options**:
  - If duplicate generation becomes a cost issue, switch to latest-pack reuse or upsert strategy.

## Impact
- Routes: `/api/v1/packs/generate`, `/api/v1/packs/latest`, `/api/v1/packs/{pack_id}`
- Database: migrations for `runs` and `summary_packs`
- UI: `Create pack (30d)` flow in settings still uses explicit run selection in v1 baseline
