# Changelog

## 2026-02-12

### Added
- CSS-only dark leather + metal texture background system (`app-shell::before`, `app-shell::after`).
- Warm candle glow, amber center fill, green accent, brushed metal grain, leather vertical grain layers.
- Vignette overlay with subtle edge darkening.

### Changed
- **Shell panels**: Sidebar and main content area changed from opaque (`bg-zinc-900/70`, `bg-zinc-900/45`) to transparent glass (`bg-white/[0.03]`, `bg-white/[0.02]`) with `backdrop-blur-xl`.
- **All (app) page backgrounds unified**: Removed solid `bg-neutral-950`, `bg-zinc-900` from page root containers (alert, review, portfolio).
- **38 component files updated**: Replaced opaque card/section backgrounds with transparent alternatives:
  - `bg-neutral-900/60`, `/50`, `/40` → `bg-white/[0.04]`
  - `bg-neutral-950/40` → `bg-black/20`
  - `bg-neutral-950/60` → `bg-black/25`
  - `bg-neutral-900` (inputs/selects) → `bg-white/[0.06]`
  - `border-neutral-800` → `border-white/[0.08]`
- Body base color changed from `#0a0a0c` to `#120e08` (warm leather tone).
- Base gradient strengthened: `#1a1510` → `#2a1f14` for visible warmth.

### Files Affected
- `frontend/src/index.css` - Background texture system
- `frontend/src/components/Shell.tsx` - Transparent panels
- `frontend/app/layout.tsx` - Body color
- `frontend/app/(app)/alert/page.tsx` - Page background removed
- `frontend/app/(app)/review/page.tsx` - Page background removed
- `frontend/app/(app)/alerts/**` - Card backgrounds unified
- `frontend/src/components/portfolio/PortfolioDashboard.tsx` - Page + cards
- `frontend/src/components/home/HomeSnapshot.tsx` - Cards
- `frontend/src/components-old/Trades.tsx`, `Bubbles.tsx`, `Chart.tsx` - Cards
- `frontend/src/components/alerts/*` - All alert components
- `frontend/src/components/review/*` - All review components
- `frontend/src/components/settings/*` - Settings components
- `frontend/src/components/positions/PositionManager.tsx`
- `frontend/src/components/chart/ChartReplay.tsx`, `ReplayControls.tsx`
- `frontend/src/components/guided-review/GuidedReviewFlow.tsx`
- `frontend/src/components/BubbleCreateModal.tsx`
- `frontend/src/components/ui/FilterPills.tsx`

## 2026-02-10

### Added
- AI summary filters (`symbol`, `timeframe`) on Home and Review cards.
- URL query sync for AI summary filters (`ai_symbol`, `ai_tf`) to preserve refresh/share state.
- Direct navigation from AI summary cards to related bubble detail (`/bubbles?bubble_id=...`).
- Bubble list auto-scroll to selected bubble when opened via query param.
- Evidence Packet presets (`라이트`, `균형`, `딥`) and collapsible advanced options.

### Changed
- Chart top controls reorganized into primary controls + collapsible advanced controls to reduce visual clutter.
- Chart marker density now uses pixel-bucket clustering (instead of drop-sampling only) to preserve aggregate counts.
- Marker tooltip placement auto-flips to avoid top clipping.
- AI one-shot prompt constraints strengthened for short, consistent action-oriented output.
- Provider call settings tuned for stable outputs (lower temperature, token cap).

### Fixed
- AI error UX now shows reason-specific messages and supports inline retry in bubble creation modal.
- Review/Home AI cards now render symbol/timeframe badges from bubble linkage.
- Automatic pruning policy for AI review notes (keep latest N per user) to prevent uncontrolled growth.

## 2026-02-09

### Added
- Upbit candle fetch support in market handler (Upbit interval mapping, validation, cache key includes exchange).
- Chart symbol routing for Upbit vs Binance; normalize `KRW-*` symbols and handle `SOLKRW` → `KRW-SOL` path usage.
- Chart overlay density controls (visible-range filtering, sampling) and tooltip overflow fixes.
- Position overlay stack (right-side card) and opened-at display.
- Bubble/portfolio refresh hooks to re-fetch symbols and bubbles.

### Changed
- `/api/v1/market/klines` now bypasses JWT for public access.
- Chart UX tweaks: default show bubbles on, tooltip clamping/overflow adjustments, marker count reduced and spacing enforced.
- Bubble create modal footer buttons pinned inside modal layout.

### Fixed
- Upbit/Binance exchange routing bug that sent USDT pairs to Upbit.
- `KRW-SOL` candle requests returning unauthorized (requires backend restart after auth bypass change).

### Known Issues / TODO
- Position marker styling/placement still unsatisfying; consider redesign to match bubble markers.
- Chart overlay density/summary still needs tuning for high-volume datasets.
- Bubble create modal footer layout may still overlap in some viewport sizes; verify on smaller screens.
