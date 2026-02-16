> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# Database Migrations Reference

> Last updated: 2026-02-15

## Migration Files

All migrations are located in `backend/migrations/`.

| # | File | Description | Tables/Changes |
|---|------|-------------|----------------|
| 001 | `001_init.sql` | Initial schema setup | pgcrypto extension, core tables (users, ai_providers, trades, etc.) |
| 002 | `002_seed.sql` | Seed data | AI providers: openai (gpt-4o), claude (claude-3-5-sonnet), gemini |
| 003 | `003_trades_exchange.sql` | Exchange column | `trades.exchange` VARCHAR(30) DEFAULT 'binance_futures' |
| 004 | `004_trade_sync_exchange.sql` | Sync state exchange | `trade_sync_state.exchange` VARCHAR(30) DEFAULT 'binance_futures' |
| 005 | `005_ai_opinion_accuracies.sql` | AI accuracy tracking | `ai_opinion_accuracies` table |
| 006 | `006_review_notes.sql` | Trading journal notes | `review_notes` table |
| 007 | `007_alert_notification.sql` | Alert system | `alert_rules`, `alert_check_state`, `alert_events`, `alert_briefings`, `alert_outcomes`, `notification_channels` |
| 007 | `007_unified_portfolio.sql` | Unified portfolio | `venues`, unified portfolio data model (CEX/DEX/Stocks) |
| 008 | `008_trade_events_dedupe.sql` | Dedupe key | `trade_events` dedupe key to prevent duplicate imports |
| 009 | `009_positions_aggregates.sql` | Position aggregates | `positions` aggregate columns for faster summaries |
| 010 | `010_bubbles_asset_venue.sql` | Bubble metadata | `bubbles.asset_class`, `bubbles.venue_name` columns |
| 011 | `011_trade_safety_reviews.sql` | Safety reviews | `trade_safety_reviews` table (daily quick-check flow) |
| 012 | `012_trades_derivatives_meta.sql` | Derivatives metadata | `trades.position_side`, `trades.open_close` columns |
| 013 | `013_manual_positions.sql` | Manual positions | `manual_positions` table (user-defined for AI context) |
| 013 | `013_widen_trade_numeric_columns.sql` | Numeric precision | `trades` quantity/price to NUMERIC(30,10) for KRW altcoin fills |
| 014 | `014_relax_numeric_precision.sql` | Remove precision caps | `trades` columns to NUMERIC (unbounded) to avoid overflow |
| 015 | `015_add_ai_quota_limit.sql` | AI quota | `subscriptions.ai_quota_limit` INTEGER column |
| 020 | `020_guided_review.sql` | Guided review | `guided_reviews` table |
| 021 | `021_ai_allowlist.sql` | AI allowlist | `users.ai_allowlisted` BOOLEAN DEFAULT false |
| 022 | `022_create_runs_and_summary_packs.sql` | Runs & Summary Packs | `runs`, `summary_packs` tables (new in latest pull) |

## Latest Migration: 022 - Runs & Summary Packs

### `runs` table
Lightweight run tracking for sync/import workflows.

| Column | Type | Description |
|--------|------|-------------|
| `run_id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK → users) | ON DELETE CASCADE |
| `run_type` | VARCHAR(50) | Type of run (sync, import, etc.) |
| `status` | VARCHAR(40) | Run status |
| `started_at` | TIMESTAMPTZ | Default NOW() |
| `finished_at` | TIMESTAMPTZ | Nullable |
| `meta` | JSONB | Flexible metadata |
| `created_at` | TIMESTAMPTZ | Default NOW() |

**Indexes**: `(user_id, started_at DESC)`, `(user_id, status)`

### `summary_packs` table
Aggregated summary data generated from runs.

| Column | Type | Description |
|--------|------|-------------|
| `pack_id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK → users) | ON DELETE CASCADE |
| `source_run_id` | UUID (FK → runs) | ON DELETE CASCADE |
| `range` | VARCHAR(20) | Time range (e.g., '7d', '30d') |
| `schema_version` | VARCHAR(30) | Schema version |
| `calc_version` | VARCHAR(30) | Calculation version |
| `content_hash` | VARCHAR(64) | Content integrity hash |
| `reconciliation_status` | VARCHAR(20) | CHECK: 'ok', 'warning', 'error' |
| `missing_suspects_count` | INTEGER | Default 0 |
| `duplicate_suspects_count` | INTEGER | Default 0 |
| `normalization_warnings` | TEXT[] | Default empty array |
| `payload` | JSONB | Full summary data |
| `created_at` | TIMESTAMPTZ | Default NOW() |

**Indexes**: `(user_id, created_at DESC)`, `(user_id, range, created_at DESC)`, `(user_id, source_run_id)`

## Notes

- Migration numbers 016-019 are skipped (reserved or unused)
- Two files share number 007 and 013 (parallel development branches)
- All UUID PKs use `gen_random_uuid()` from pgcrypto
- Cascade deletes on user_id FK for data cleanup
- JSONB columns used for flexible configurations (alerts, runs, summary packs)
