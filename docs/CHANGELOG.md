# Changelog

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
