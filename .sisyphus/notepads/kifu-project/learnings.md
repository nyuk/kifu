# Technical Decisions & Conventions

## Architecture Decisions

### 1. Bubble Aggregation Strategy
**Decision**: Show ALL bubbles on ALL timeframes, grouped by candle
**Rationale**: User wanted to see all trades regardless of original timeframe
**Implementation**: 
- Remove timeframe-based filtering (`shouldShowBubble()` removed)
- Group by floored candle time using Map
- Show count for multiple trades, single memo for one trade

### 2. i18n Implementation
**Decision**: Simple dictionary-based i18n with localStorage persistence
**Rationale**: Lightweight, no external library needed for simple use case
**Implementation**:
- `useI18n()` hook in `frontend/src/lib/i18n.ts`
- Language stored in localStorage
- Page reload on language change to ensure consistency

### 3. TradingView Integration
**Decision**: Use TradingView Lightweight Charts with custom overlay for bubbles
**Rationale**: Native TradingView markers don't support rich content (tooltips, colors based on data)
**Implementation**:
- Absolute positioned divs overlaid on chart
- Coordinate conversion using chart API
- Click handler using `subscribeClick()`

## Code Conventions

### File Organization
- Old components: `frontend/src/components-old/`
- New components: `frontend/src/components/`
- i18n: `frontend/src/lib/i18n.ts`
- Hooks: `frontend/src/hooks/`

### Naming
- Components: PascalCase (e.g., `BubbleCreateModal.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useI18n()`)
- Types: PascalCase (e.g., `BubbleItem`)

### TypeScript Patterns
- Always define types for props and state
- Use `const` for immutable values
- Prefer `??` over `||` for nullish coalescing

## Important Implementation Details

### Time Handling
- All timestamps in seconds (Unix timestamp)
- `floorToCandle()` uses integer division after converting to timeframe units
- Timeframe strings: "1m", "5m", "15m", "1h", "4h", "1d", "1w", "1M"

### TradingView Chart
- Chart instance stored in ref: `chartRef.current`
- Series instance stored in ref: `seriesRef.current`
- Must check for null before calling API methods
- Coordinates can be null if outside visible range

### Bubble Rendering
- Bubbles positioned using `transform: translate(x, y)`
- Z-index layering: chart (0) < bubbles (10) < tooltips (20)
- Tooltips use `group-hover` for visibility toggle

## Known Limitations

1. **Bubble Edit/Delete**: Not implemented yet (click logs to console only)
2. **Mobile**: Not optimized for mobile screens
3. **Performance**: Large number of bubbles may impact performance (no virtualization)
4. **Real-time**: No WebSocket for real-time updates

## Testing Checklist

When making changes to Chart.tsx:
- [ ] Bubbles show on all timeframes
- [ ] Aggregation works (multiple trades show count)
- [ ] Hover tooltips display correctly
- [ ] Clicking candle opens modal with correct time/price
- [ ] Color coding correct (green/red/yellow)
- [ ] No console errors
- [ ] Build passes (`npm run build`)
