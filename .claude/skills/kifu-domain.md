# Kifu Trading Domain Knowledge

> Auto-loaded when working on trading-related features

## Terminology

| Term | Definition |
|------|------------|
| Kifu | Japanese for "game record" - here, trading journal/record |
| Position | Open trade with entry price, size, and direction |
| Trade | Completed transaction with entry and exit |
| PnL | Profit and Loss (realized or unrealized) |
| Timeframe | Chart interval (1m, 5m, 15m, 1h, 4h, 1d) |

## Data Models

### Trade
```typescript
type Trade = {
  id: string
  symbol: string        // e.g., "BTCUSD"
  side: 'long' | 'short'
  entryPrice: number
  exitPrice: number
  size: number
  pnl: number
  entryTime: string     // ISO 8601 UTC
  exitTime: string
}
```

### Position
```typescript
type Position = {
  id: string
  symbol: string
  side: 'long' | 'short'
  entryPrice: number
  size: number
  unrealizedPnl: number
  openTime: string
}
```

## Business Rules

1. All prices stored in USD
2. All timestamps in UTC (ISO 8601)
3. Position size must be > 0
4. PnL = (exitPrice - entryPrice) * size * (side === 'long' ? 1 : -1)

## Tech Stack Mapping

| Feature | Frontend | Backend |
|---------|----------|---------|
| Charts | lightweight-charts | - |
| State | Zustand stores | - |
| API | axios | Fiber v2 |
| Auth | JWT token | gofiber/jwt |
| DB | - | pgx/PostgreSQL |

## Common Patterns

### Adding a new API endpoint
1. Create handler in `backend/internal/handlers/`
2. Add route in `backend/cmd/` router setup
3. Create frontend API function in `frontend/src/lib/`
4. Update Zustand store if needed

### Adding chart features
1. Check lightweight-charts docs
2. Modify chart component in `frontend/src/components/`
3. Data fetching via Zustand store
