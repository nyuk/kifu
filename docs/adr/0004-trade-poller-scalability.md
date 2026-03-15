> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Korean is optional supplementary context when needed.

# ADR-0004 Trade Poller Scalability Strategy

## Title
Scalability plan for trade polling as user base grows.

## Status
- Accepted (2026-03-15)
- Scope: `jobs/trade_poller.go`, Binance/Upbit API integration

## Context
The trade poller currently spawns one goroutine per user per exchange, each polling on a 300-second interval. This works for a small user base but will hit Binance API rate limits as the platform scales.

### Current Architecture
- Each user registers their own Binance API key.
- `TradePoller.Start()` creates a goroutine per `(user, exchange)` pair.
- Each goroutine calls `pollOnce()` every 5 minutes.
- `pollOnce()` makes 1 API call per registered symbol (default: BTCUSDT).

### Rate Limit Constraints
- Binance REST API: ~1200 request weight / minute (IP-based).
- Practical safe limit: ~120 trade history calls / minute.
- All goroutines start simultaneously on server restart (thundering herd).

### Capacity Estimates

| Users | Symbols (avg 2) | Calls / 5min | Calls / min | Status |
|-------|-----------------|-------------|-------------|--------|
| 10    | 20              | 20          | 4           | Safe   |
| 100   | 200             | 200         | 40          | Safe   |
| 300   | 600             | 600         | 120         | Limit  |
| 1000  | 2000            | 2000        | 400         | Fail   |

## Decision: Staged Migration Plan

Scale incrementally based on actual user growth. Do not over-engineer ahead of demand.

### Stage 1: Rate Limiter (~100 users)
- Add a shared `golang.org/x/time/rate.Limiter` across all poller goroutines.
- Each goroutine acquires a token before making an API call.
- Set limit to ~100 requests/minute with burst of 10.
- **Effort**: ~2 hours. No architectural change.

### Stage 2: Batch Sequential Processing (~500 users)
- Replace per-user goroutines with a single worker loop.
- Loop iterates over all users sequentially, with controlled sleep between calls.
- Stagger start times to avoid thundering herd on restart.
- **Effort**: ~1 day. Moderate refactor of `trade_poller.go`.

### Stage 3: WebSocket Migration (~1000+ users)
- Switch from REST polling to Binance WebSocket streams.
- One WebSocket connection per symbol covers all users watching that symbol.
- BTCUSDT stream = 1 connection for all users, regardless of count.
- REST API calls reduced to zero for ongoing sync (only used for initial backfill).
- **Effort**: 3-5 days. New `infrastructure/ws/` package.

### Stage 4: Horizontal Scaling (~10000+ users)
- Multiple server instances with shared symbol stream coordination.
- Each instance handles a partition of users.
- Shared WebSocket connections via Redis pub/sub or similar.
- **Effort**: Infrastructure-level change.

## Key Insight
Binance rate limits are **per IP**, but each user provides their own API key. This means:
- Server-side rate limiting is the primary constraint (single server IP).
- If needed, requests can be distributed across multiple IPs before Stage 3.
- WebSocket streams have no rate limit and are the definitive solution.

## Consequences
- No immediate code changes required.
- This ADR serves as a reference when rate limit issues are first observed.
- Monitor `trade poller: user ... error` logs for 429 responses as an early warning.
- When Stage 1 is triggered, add the rate limiter without changing the goroutine model.

## References
- Binance API rate limits: https://binance-docs.github.io/apidocs/futures/en/#limits
- Binance WebSocket streams: https://binance-docs.github.io/apidocs/futures/en/#websocket-market-streams
- Current implementation: `backend/internal/jobs/trade_poller.go`
