# Changelog

## 2026-02-13

### Added
- 30일 시간 압축 사용자 시뮬레이션 기능 추가:
  - 백엔드 진단 API `POST /api/v1/admin/sim-report/run`
  - 거래/버블 생성 + Guided Review 제출/완료 + 복기노트 + 알림룰(생성/정리) + AI 키/프로바이더 점검을 날짜 단위로 자동 실행
  - 실행 결과(일자별 단계 로그 `steps`, 기능별 성공/실패, 연속 복기 streak) 리포트 반환
  - 실행 대상 모드 추가:
    - `target_mode=self` (현재 로그인 계정)
    - `target_mode=sandbox` (테스트 전용 계정 자동 생성/재사용)
  - sandbox 모드에서 `sandbox_reset=true` 시 기존 테스트 데이터 정리 후 재생성
- 운영자 진단 화면 추가:
  - `/admin/sim-report` 페이지에서 시뮬레이션 파라미터 입력/실행/결과 확인
  - Settings 탭에서 진입 링크 제공

### Changed
- 시뮬레이션 데이터 정합성 보강:
  - 시뮬레이션 날짜 기준을 `종료일(End Date) 기준 과거 N일`로 변경
  - 시뮬레이션 실행 시 `trade_events/positions`, `outcomes`, `ai_opinions`, `ai_opinion_accuracies`, `manual_positions`, `user_symbols`까지 동시 생성
  - 포트폴리오 자산군 필터(`stock`)에서 trades fallback이 코인 데이터를 덮어쓰는 문제 수정
  - 거래내역 탭 상단 통계를 페이지 일부 데이터가 아닌 `/v1/trades/summary` 기준으로 집계하도록 수정
- Review AI 카드의 차트 이동 링크를 강화:
  - 심볼 정규화(대문자/공백 제거)
  - 타임프레임 정규화(허용 값 외 `1d` 폴백)
  - `candle_time`이 없을 때 `created_at`으로 포커스 시각 폴백
- Review AI 필터 공유 UX 문구 개선:
  - 버튼 문구를 `AI 요약 필터 링크 복사`로 변경
  - 복사 완료 상태를 `링크 공유 완료`로 변경
  - 현재 공유 범위(심볼/타임프레임) 안내 텍스트 추가
- TODO 상태 동기화:
  - `AI 요약 카드 클릭 시 차트 탭(해당 캔들)까지 바로 이동 연결` 완료 처리
  - `AI 요약 필터 상태 공유 링크(복사 버튼) 동작 가이드 문구 다듬기` 완료 처리

### Files Affected
- `backend/internal/interfaces/http/handlers/sim_report_handler.go`
- `backend/internal/interfaces/http/routes.go`
- `frontend/app/(app)/admin/sim-report/page.tsx`
- `frontend/src/components/portfolio/PortfolioDashboard.tsx`
- `frontend/src/components-old/Trades.tsx`
- `frontend/src/components-old/Settings.tsx`
- `frontend/app/(app)/review/page.tsx`
- `docs/todo.md`

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
