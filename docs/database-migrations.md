> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# Database Migrations Reference

Last updated: 2026-02-15

## Migration Files

All migration files are in `backend/migrations/`.

| # | File | Description | Tables/Changes |
|---|------|-------------|----------------|
| 001 | `001_init.sql` | Initial schema setup | `pgcrypto`, core tables (`users`, `ai_providers`, `trades`, etc.) |
| 002 | `002_seed.sql` | Seed data | `openai`, `claude`, `gemini` providers |
| 003 | `003_trades_exchange.sql` | Exchange column | `trades.exchange` default |
| 004 | `004_trade_sync_exchange.sql` | Sync exchange state | `trade_sync_state.exchange` default |
| 005 | `005_ai_opinion_accuracies.sql` | AI accuracy table | `ai_opinion_accuracies` |
| 006 | `006_review_notes.sql` | Review notes | `review_notes` |
| 007 | `007_alert_notification.sql` | Alert system | `alert_rules`, `alert_check_state`, `alert_events`, `alert_briefings`, `alert_outcomes`, `notification_channels` |
| 007 | `007_unified_portfolio.sql` | Unified portfolio | `venues`, unified portfolio model |
| 008 | `008_trade_events_dedupe.sql` | Dedupe key | `trade_events` dedupe key |
| 009 | `009_positions_aggregates.sql` | Position aggregates | `positions` aggregate columns |
| 010 | `010_bubbles_asset_venue.sql` | Bubble metadata | `bubbles.asset_class`, `bubbles.venue_name` |
| 011 | `011_trade_safety_reviews.sql` | Safety reviews | `trade_safety_reviews` |
| 012 | `012_trades_derivatives_meta.sql` | Derivatives metadata | `trades.position_side`, `trades.open_close` |
| 013 | `013_manual_positions.sql` | Manual positions | `manual_positions` |
| 013 | `013_widen_trade_numeric_columns.sql` | Numeric precision | `trades` quantity/price widened |
| 014 | `014_relax_numeric_precision.sql` | Remove caps | `trades` numeric unbounded |
| 015 | `015_add_ai_quota_limit.sql` | AI quota | `subscriptions.ai_quota_limit` |
| 020 | `020_guided_review.sql` | Guided review | `guided_reviews` |
| 021 | `021_ai_allowlist.sql` | AI allowlist | `users.ai_allowlisted` |
| 022 | `022_create_runs_and_summary_packs.sql` | Runs + Summary Packs | `runs`, `summary_packs` |
| 023 | `023_add_is_admin_to_users.sql` | Admin role flag | `users.is_admin` |
| 024 | `024_add_admin_audit_logs.sql` | Admin audit logs | `admin_audit_logs` |
| 025 | `025_add_admin_policies.sql` | Operational policy toggles | `admin_policies` |
| 026 | `026_add_agent_service_poller_policy.sql` | Agent poller master switch | `admin_policies` (seed `agent_service_poller_enabled`) |

## Latest Migration: 026

### `agent_poller_policy`

| Policy Key | Type | Description |
|------------|------|-------------|
| `agent_service_poller_enabled` | `boolean` (stored in JSONB) | Master switch for exchange trade polling background jobs |

When false, exchange pollers are paused and skip poll execution until re-enabled.

### `runs`

| Column | Type | Description |
|--------|------|-------------|
| `run_id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK → users) | `ON DELETE CASCADE` |
| `run_type` | VARCHAR(50) | `exchange_sync`, `trade_csv_import`, `portfolio_csv_import` |
| `status` | VARCHAR(40) | `completed`, `running`, `failed`, etc. |
| `started_at` | TIMESTAMPTZ | Start time |
| `finished_at` | TIMESTAMPTZ | Nullable |
| `meta` | JSONB | Run metadata |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |

Indexes:
- `(user_id, started_at DESC)`
- `(user_id, status)`

### `summary_packs`

| Column | Type | Description |
|--------|------|-------------|
| `pack_id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK → users) | `ON DELETE CASCADE` |
| `source_run_id` | UUID (FK → runs) | Source run |
| `range` | VARCHAR(20) | e.g., `7d`, `30d` |
| `schema_version` | VARCHAR(30) | Summary schema version |
| `calc_version` | VARCHAR(30) | Calculation version |
| `content_hash` | VARCHAR(64) | Content integrity hash |
| `reconciliation_status` | VARCHAR(20) | `ok` / `warning` / `error` |
| `missing_suspects_count` | INTEGER | default `0` |
| `duplicate_suspects_count` | INTEGER | default `0` |
| `normalization_warnings` | TEXT[] | default empty |
| `payload` | JSONB | Pack payload |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |

Indexes:
- `(user_id, created_at DESC)`
- `(user_id, range, created_at DESC)`
- `(user_id, source_run_id)`

### `admin_policies`

| Column | Type | Description |
|--------|------|-------------|
| `key` | TEXT (PK) | Policy identifier |
| `value` | JSONB | Boolean-style policy value stored as JSON |
| `description` | TEXT | Human-readable description |
| `updated_by` | UUID | Admin user who last updated |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

Indexes:
- `(updated_at DESC)`
