> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - Korean is optional supplementary context when needed.

# Alert & Notification Service MVP - Plan

## Feature Summary

When trading market conditions are met, the system sends alerts automatically, collects AI briefings from existing provider stack, and helps users make faster decisions with concise context.

## Core Flow

```
[User defines alert rules]
        ↓
[AlertMonitor job checks market conditions regularly]
        ↓ (conditions satisfied)
[Alert created + AI briefing collected automatically]
        ↓
[Summary notification sent via Telegram]
        ↓
[User opens alert and reads full AI briefing]
        ↓
[User records a decision: buy/sell/hold/ignore]
        ↓
[System tracks outcome and stores in review data]
```

## Scope

### MVP (Phase 1)
- Alert rule CRUD (price change, MA cross, price level, volatility spike)
- AlertMonitor background job
- Trigger-based AI briefing collection using existing AI infra
- Telegram bot notification
- Decision capture and persistence
- Outcome tracking (reuse existing outcome pattern)

### Future (Phase 2+)
- App push (PWA Web Push or native)
- Compound conditions (AND/OR)
- Custom prompt templates
- Alert scheduling (quiet hours)
- Alert history dashboard

## Dependencies
- Existing AI opinion infrastructure (`callProvider`, `fetchKlines` in `ai_handler.go`)
- Binance API (price/kline)
- Existing job pattern (`outcome_calculator`, `trade_poller`)
