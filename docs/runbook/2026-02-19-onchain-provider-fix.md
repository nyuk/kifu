# Onchain PROVIDER_UNAVAILABLE Fix

**Date**: 2026-02-19
**Status**: Resolved
**Commits**: `3a846cc` → `a0019ae`

## Problem

`POST /api/v1/onchain/quick-check` returned `PROVIDER_UNAVAILABLE` for all requests.

## Root Cause

**Alchemy Free tier limits `eth_getLogs` to a 10-block range.**

The original implementation needed 12,000+ chunked `eth_getLogs` calls for a 7-day lookback (120k blocks), which was infeasible:

1. `eth_getLogs` with >10 blocks → HTTP 400 ("upgrade to PAYG")
2. HTTP 400 body wasn't parsed as JSON-RPC → chunk fallback never triggered
3. Even with tiny chunks → 429 rate limit from call volume

## Fix Steps

| Step | Commit | What |
|------|--------|------|
| 1 | `3a846cc` | Debug logging for provider errors and RPC URL config |
| 2 | `9fcf8a8` | Parse JSON-RPC error body on HTTP 400 |
| 3 | `9ca2740` | Retry with exponential backoff for 429 rate limits |
| 4 | `43dd209` | Remove fast-path full-range query |
| 5 | `a0019ae` | **Replace `eth_getLogs` with `alchemy_getAssetTransfers`** |

## Solution: `alchemy_getAssetTransfers`

- No block range limit — fetches entire period in one paginated call
- RPC calls reduced from 12,000+ to 2-4 per request
- Includes metadata (block timestamps) natively
- Pagination via `pageKey` for high-activity addresses
- Retry with backoff for 429 still in place as safety net

## Verified

111,014 ERC20 transfers returned successfully for 7-day range.

## Rules for Future Development

- **Do NOT use `eth_getLogs` on Alchemy Free tier** — 10-block limit
- Use `alchemy_getAssetTransfers` for transfer history queries
- If switching providers, `eth_getLogs` approach may need restoration
- `sha3` dependency removed (no longer needed without topic hashing)
