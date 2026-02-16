> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - Korean is optional supplementary context when needed.

# Plan: Unified Portfolio & Timeline (CEX/DEX/Stocks)

> Created: 2026-02-03
> Status: Draft

## Objective

Combine coin (CEX/DEX) and stock flows into one timeline, with filtering and position summary by venue/source/class.

## Requirements

### Must Have
- Finalize unified data model (`asset_class`, `venue_type`, `venue`, `instrument`, `source`).
- Single timeline view for mixed CEX/DEX/stocks.
- Filters for asset class, venue, source, and date range.
- Position summary + fill-level summary.
- Display KRW and USDT simultaneously using FX cache.
- Unified CSV import for coin/stocks/DEX.

### Should Have
- CEX API integration: Binance, Upbit, Bybit, Bithumb
- Stock API integration: Korea Investment Securities
- DEX API integration: Hyperliquid, Jupiter, Uniswap

### Could Have
- Wallet connection (on-chain auto-sync)
- LP/staking event support
- Auto position labeling

### Out of Scope (Now)
- Auto-trading/execution
- Social-sharing features

## Success Criteria

- CEX/DEX/stock events are correctly shown in one timeline.
- Filter updates in under 2 seconds.
- Timeline reflects CSV imports within 1 minute.
- KRW/USDT conversion does not break UI when both are shown.

## Implementation Phases

### Phase 1: Core model + CSV unification
1. Define DB schema and migration.
2. Unified CSV import endpoint.
3. Timeline API and baseline UI.
4. Position summary by base aggregation.

### Phase 2: API integration
1. Binance → Upbit → Bybit → Bithumb
2. Korea Investment Securities API
3. Hyperliquid / Jupiter / Uniswap

### Phase 3: Wallet connection
1. Wallet connect + on-chain indexer integration
2. LP/staking event expansion

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Symbol normalization failure | High | Instrument mapping table + normalization rule |
| DEX event schema divergence | High | Extendable `event_type` + metadata(JSONB) |
| FX conversion mismatch | Medium | `fx_rate` table and explicit reference timestamp |
| High-volume performance | Medium | Partitioning, indexing, summary cache |

## Approval
- [ ] Approved by:
- [ ] Date:
