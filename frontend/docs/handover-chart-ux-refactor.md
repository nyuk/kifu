# Chart.tsx UX Refactor — Handover to Codex

**File**: `frontend/src/components-old/Chart.tsx`
**Date**: 2026-03-30
**Context**: UX/design-only session. No backend changes, no new features. Goal was to improve Event Lane markers, chart–event lane connection, and chart history loading.

---

## ✅ Solved

### 1. Chart re-initialization on history load
**Problem**: `chartData` was in the chart init effect's dep array. Every history prepend triggered chart destroy → recreate → `fitContent()`. This caused the view to reset when zooming out.
**Fix**: Separated `setData` into a standalone data-update effect `useEffect(() => { ... }, [chartData])`. Chart init effect dep array is now `[timeframe, updateOverlayPosition, useSeoulTime]` only.

### 2. Selection highlight — gradient → clean line
**Problem**: The selection band was a wide gradient, looked crude.
**Fix**: Replaced with a single `w-px` solid line in both chart overlay and event lane. Color: `rgba(90,78,62,0.45)` (light workspace).

### 3. Chart dot indicator removed
**Problem**: A dot appeared on the chart at the selected candle position, user didn't want it.
**Fix**: Removed entirely.

### 4. Markers outside rail disappear
**Problem**: Markers were rendering outside the event lane rail (overflowing).
**Fix**: Added early return in both `clusteredBubbleMarkers` and `clusteredTradeMarkers` render loops: `if (cluster.x < 88 || cluster.x > chartWidth - 14) return null`.

### 5. Event Lane marker redesign
- Bubble track: filled circle dot (cyan = buy bias, rose = sell bias)
- Trade track: ▲ green (buy bias) / ▼ orange (sell bias) glyph
- Count pill shown when multiple markers are clustered at same position

### 6. Clustering count display
**Problem**: Zoomed-out view showed overlapping individual markers.
**Fix**: Added `CLUSTER_PX`-based clustering in `clusteredBubbleMarkers` / `clusteredTradeMarkers` useMemos. When multiple markers fall within `CLUSTER_PX` pixels, they merge into one marker showing a count badge.

### 7. Clustering algorithm bug fix
**Problem**: `g.x - last.x < CLUSTER_PX` compared against the *first* item in a cluster, not the rightmost. So items at 100, 110, 120, 130 would fail to merge at 130 (130 - 100 = 30 > 20).
**Fix**: Added a parallel `rightmostX: number[]` array tracking the rightmost merged x per cluster. Comparison now uses `g.x - lastRight < CLUSTER_PX`. `CLUSTER_PX` increased from 20 → 28.

### 8. Marker sizes reduced 30% from 2x baseline
- Bubble single: `h-8 w-8` (32px) → `h-[22px] w-[22px]`
- Trade ▲/▼: `text-[28px]` → `text-[20px]`
- Count dot: `h-5 w-5` → `h-[14px] w-[14px]`
- Count text/pill: `text-[13px] px-2.5 py-[3px]` → `text-[10px] px-1.5 py-[2px]`

### 9. Selection line positioning fix (chart area)
**Problem**: Selection line was rendered inside a div positioned at `top: group.y` (the marker's y), so the line only appeared from the marker downward — not as a full-height line.
**Fix**: Changed to a single `div` at `top: 0, height: chartHeight` with `-translate-x-1/2` centering.

### 10. Selection line centering (event lane)
**Problem**: Event lane selection line used `left: selectedVisibleGroup.x` without centering, misaligned with chart line.
**Fix**: Added `-translate-x-1/2` to match chart line alignment.

### 11. noMoreHistory guard
**Problem**: After the stale-closure fix (see below), `loadMoreHistory` was called aggressively and hit 400 from the exchange when there's no more historical data.
**Fix**: Added `noMoreHistoryRef = useRef(false)`. Set to `true` on 400 response or empty result. Reset to `false` on chart reinit (timeframe change). 400 no longer logs to console.

---

## ❌ NOT Solved — Main Remaining Issue

### Chart shows from ~2024 instead of all available history on initial load

**Expected**: On load, chart auto-expands by progressively fetching history batches until reaching the earliest available candle.
**Actual**: Chart loads only ~500 candles (≈ Oct 2024 start) and stops. Further history is never fetched automatically.

#### Root cause analysis

The auto-expansion chain depends on this loop:
1. `handleVisibleTimeRangeChange` fires when visible range changes
2. If `logicalRange.from < 10` (user near left edge) → call `loadMoreHistory()`
3. `loadMoreHistory()` prepends new candles → `chartData` updates → data-update effect runs → `fitContent()` → fires `handleVisibleTimeRangeChange` again → loop continues

**Stale closure fix was applied**: `handleVisibleTimeRangeChange` previously used `loading` and `klines` from a stale closure (captured at chart init when `klines = []`), so `klines.length > 0` was always false. This was fixed to use `loadingRef.current` and `klinesRef.current`.

**But the chain still doesn't work.** The suspected remaining issues:

1. **`loadMoreHistory` itself is stale in the closure**. The chart init effect dep array is `[timeframe, updateOverlayPosition, useSeoulTime]`. `loadMoreHistory` is a `useCallback` with deps `[selectedSymbol, timeframe]`. When `loadMoreHistory` changes (e.g., on symbol change), the chart init effect does NOT re-run, so the callback captured in `handleVisibleTimeRangeChange` is the old one. This is currently a minor issue since `loadMoreHistory` uses refs internally — but it means the function reference is never updated.

2. **`fitContent()` after prepend may not reliably trigger `handleVisibleTimeRangeChange`**. If `logicalRange.from` after `fitContent()` is already ≥ 10 (because the loaded data spans many candles and the view fits them all), the condition `< 10` never fires. With 500 candles loaded, `fitContent()` may set `from ≈ 0` (triggering the next load), but this depends on the chart width and candle density.

3. **The debounce cooldown (3 seconds)** between `loadMoreHistory` calls means the chain is slow. Each batch takes 3+ seconds. With many batches needed to reach 2020–2022, the chain may appear stuck.

#### What to try next

**Option A — Move `loadMoreHistory` into a ref** so the closure always calls the latest version:
```tsx
const loadMoreHistoryRef = useRef(loadMoreHistory)
useEffect(() => { loadMoreHistoryRef.current = loadMoreHistory }, [loadMoreHistory])

// Inside handleVisibleTimeRangeChange:
if (logicalRange.from < 10 && !loadingRef.current && klinesRef.current.length > 0) {
  loadMoreHistoryRef.current()
}
```

**Option B — Use a useEffect to watch `klines` length** and trigger more loads automatically:
```tsx
useEffect(() => {
  if (noMoreHistoryRef.current || !chartRef.current || klines.length === 0) return
  const logicalRange = chartRef.current.timeScale().getVisibleLogicalRange()
  if (logicalRange && logicalRange.from < 10) {
    loadMoreHistory()
  }
}, [klines, loadMoreHistory])
```
This re-runs whenever `klines` changes (i.e., after each successful prepend) and immediately checks if we need more. No 3-second debounce dependency.

**Option C — Reduce debounce cooldown** from 3000ms → 500ms for the auto-chain. The 3s cooldown was added to prevent spam from user-scroll events, but the auto-chain fires infrequently (only after each successful prepend completes).

---

## Current State of Key Code

### Data-update effect (lines ~1350–1366)
```tsx
useEffect(() => {
  if (!chartRef.current || !seriesRef.current || chartData.length === 0) return
  const chart = chartRef.current
  const prevFirstTime = prevFirstTimeRef.current
  const newFirstTime = chartData[0].time as number
  prevFirstTimeRef.current = newFirstTime
  const logicalRange = chart.timeScale().getVisibleLogicalRange()
  seriesRef.current.setData(chartData)
  if (!logicalRange || prevFirstTime === 0 || newFirstTime < prevFirstTime) {
    chart.timeScale().fitContent()  // first load OR history prepended
  } else {
    chart.timeScale().setVisibleLogicalRange(logicalRange)  // future candles appended
  }
}, [chartData])
```

### handleVisibleTimeRangeChange trigger (line ~1321)
```tsx
if (logicalRange.from < 10 && !loadingRef.current && klinesRef.current.length > 0) {
  loadMoreHistory()  // loadMoreHistory is still a stale closure reference
}
```

### Refs used
```tsx
const loadingRef = useRef(loading)        // kept current via useEffect
const klinesRef = useRef(klines)          // kept current via useEffect
const prevFirstTimeRef = useRef<number>(0) // reset on chart reinit
const noMoreHistoryRef = useRef(false)    // set true on 400 or empty; reset on reinit
const lastHistoryLoadRef = useRef<number>(0) // debounce timestamp
```

### Clustering (lines ~1002–1030)
```tsx
const CLUSTER_PX = 28
// rightmostX[] tracks rightmost merged x per cluster for correct distance comparison
```

---

## Architecture Notes

- `lightweight-charts` chart is created in `useEffect([timeframe, ...])` — NOT re-created on `klines` or `chartData` change.
- `chartData` is derived from `klines` via a `useMemo`.
- `loadMoreHistory` fetches 500 candles ending at `oldestItem.time * 1000 - 1` and prepends to `klines` state.
- The `handleVisibleTimeRangeChange` callback is registered once at chart init and holds a stale closure — all live state access must go through refs.
- Symbol change does NOT reinitialize the chart (only timeframe change does). This is a separate existing issue.
