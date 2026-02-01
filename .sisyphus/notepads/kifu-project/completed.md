# Kifu Project - Work Summary

## Project Overview
- **Name**: Kifu - Trading Journal Web Application
- **Backend**: Go + Fiber framework (port 3000)
- **Frontend**: Next.js App Router (port 5173, migrated from Vite)
- **Database**: PostgreSQL
- **Purpose**: Cryptocurrency trading journal with chart annotations ("bubbles"), AI opinions, and trade analysis

## Completed Work

### Phase 1: Critical Bug Fixes (Commits: 92f7f6b, e54692b)

#### 1. Trade Routes Registration ✅
- **Problem**: CSV upload feature was broken - API routes weren't registered
- **Files Modified**:
  - `backend/internal/interfaces/http/routes.go` - Added trade routes
  - `backend/internal/app/app.go` - Initialized TradeRepository
- **Routes Added**:
  - `POST /api/v1/trades/import` (CSV upload)
  - `GET /api/v1/trades` (list trades)
  - `GET /api/v1/trades/summary` (trade summary)
  - `POST /api/v1/trades/convert-bubbles`

#### 2. Default Timeframe Change ✅
- Changed from 1h to 1d in `frontend/src/components-old/Chart.tsx` line 94

#### 3. Bubbles Page Scroll Improvement ✅
- Added `max-h-[600px] overflow-y-auto` to bubble list in `Bubbles.tsx` line 255

#### 4. Candle Click Interaction ✅
- Implemented TradingView `subscribeClick()` API in `Chart.tsx`
- Clicking candles now opens bubble creation modal with pre-filled time/price
- Added `clickedCandle` state and handler

#### 5. i18n Integration ✅
- Integrated `useI18n()` hook into:
  - `frontend/src/components/Shell.tsx`
  - `frontend/src/components/BubbleCreateModal.tsx`
  - `frontend/src/components-old/Settings.tsx`
- Created `frontend/src/components/LanguageSelector.tsx`
- Language selector added to Settings page with localStorage persistence

### Phase 2: Bubble Aggregation System (Commit: f9cc76d)

#### Complete Bubble Display Logic Rewrite ✅
- **User Problem**: "Bubbles only showing on 1d timeframe, not matching across timeframes. Need ALL trades visible on ALL timeframes, with aggregation when multiple trades on same candle."

**What Was Removed**:
- `shouldShowBubble()` function (timeframe hierarchy filtering)
- Individual bubble rendering per trade

**What Was Implemented**:
- `floorToCandle()` function: Normalizes timestamps to candle start time
- `getTimeframeSeconds()` function: Converts timeframe to seconds
- Bubble grouping by candle using `Map<candleTime, BubbleItem[]>`
- Average price calculation for positioning

**Display Logic**:
- Single trade: Shows memo or price
- Multiple trades: Shows "N개 거래" (N trades)
- Color coding:
  - 🟢 Green: Buy only
  - 🔴 Red: Sell only
  - 🟡 Yellow: Mixed (buy + sell)
- Hover tooltip: Shows ALL trades in that candle with full details

**Files Modified**: `frontend/src/components-old/Chart.tsx` (lines 37-50: helper functions, lines 261-310: grouping useEffect, lines 420-495: bubble rendering)

## Key Files

### Backend
- `backend/internal/interfaces/http/routes.go` - Trade routes registered
- `backend/internal/app/app.go` - TradeRepository initialized
- `backend/internal/interfaces/http/handlers/trade_handler.go` - Trade import/export handlers

### Frontend
- `frontend/src/components-old/Chart.tsx` - MOST IMPORTANT
  - Bubble aggregation logic (lines 37-50: helper functions)
  - Bubble grouping useEffect (lines 261-310)
  - Bubble rendering (lines 420-495)
  - TradingView chart with click handler
  - State: `bubblePositions` changed from individual bubbles to grouped candles

- `frontend/src/components/Shell.tsx` - i18n integrated, nav items
- `frontend/src/components/BubbleCreateModal.tsx` - i18n integrated
- `frontend/src/components/LanguageSelector.tsx` - New component
- `frontend/src/components-old/Settings.tsx` - Language selector added
- `frontend/src/lib/i18n.ts` - Translation dictionary (EN/KO)

## Data Structures

### BubbleItem (unchanged)
```typescript
type BubbleItem = {
  id: string
  symbol: string
  timeframe: string  // Note: Now only for bubble creation, NOT filtering
  candle_time: string
  price: string
  bubble_type: string
  memo?: string | null
  tags?: string[]
}
```

### bubblePositions State (CHANGED - now grouped)
```typescript
const [bubblePositions, setBubblePositions] = useState<Array<{
  candleTime: number      // Floored to current timeframe
  x: number              // X coordinate on chart
  y: number              // Y coordinate (average price)
  bubbles: BubbleItem[]  // All bubbles in this candle
  avgPrice: number       // Average price for positioning
}>>([])
```

## Technical Notes

### Bubble Aggregation Algorithm
- ALL bubbles are shown regardless of their original `timeframe` field
- Bubbles are grouped by flooring their timestamp to current chart timeframe
- Example: On 1h chart, bubbles at 14:23 and 14:47 both group to 14:00 candle

### TradingView Coordinate System
- Time: Unix timestamp (seconds)
- Price: Decimal number
- Coordinates can be `null` if outside visible range
- Must check for null before rendering

### Next.js SSR Considerations
- All components with hooks need `'use client'` directive
- localStorage access wrapped in `typeof window !== 'undefined'`
- Language selector triggers page reload for i18n changes

## Build Commands

```bash
# Backend
cd backend && go run cmd/main.go

# Frontend  
cd frontend && npm run dev

# Build verification
cd frontend && npm run build
cd backend && go build -o main cmd/main.go

# Test URLs
http://localhost:5173/login
http://localhost:5173/chart
http://localhost:5173/bubbles
http://localhost:5173/trades
http://localhost:5173/settings
```

## Git Status
```bash
# Recent commits
f9cc76d - fix: implement proper bubble aggregation
e54692b - feat: implement candle click interaction and i18n integration  
92f7f6b - fix: quick wins - trade routes, timeframe, scroll, debug logging

# All changes committed and build passing
```

## Korean UI Text Reference
- "N개 거래" = "N trades"
- "매수" = "Buy"
- "매도" = "Sell"
- Settings page has EN/KO language toggle

## Session Info
- **Last Session**: 2026-01-30
- **Status**: Phase 2 Complete, awaiting user testing feedback
- **Next**: New session to continue with pending items
