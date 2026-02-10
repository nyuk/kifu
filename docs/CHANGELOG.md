# Changelog

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
