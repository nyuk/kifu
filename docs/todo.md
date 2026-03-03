> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# TODO

Operational task list for ongoing work.

## NOW (Top 3 priorities)

- [x] P1. Execute first batch (1-4) from `docs/2026-02-13-remaining-work.md`.
  - Scope: Home readability, checklist/action visibility, bubble/action flow, narrow-screen behavior.
  - Exit criteria: all 4 items verified and reflected in `CHECKPOINT` section below.
  - Complete: 2026-03-03
- [x] P2. Complete `CHECKPOINT` QA run and attach evidence.
  - Scope: manual UI verification on desktop + 390-430px mobile width.
  - Run command: `cd frontend && npm run e2e:checkpoint`
  - Exit criteria: each checkpoint has run date, tester, and pass/fail note.
  - Result: `3 passed (Playwright checkpoint suite, chromium)`
  - Complete: 2026-03-03
- [x] P3. Social login production hardening (Google-first policy).
  - Scope: keep non-Google providers `coming_soon`, validate Google callback and password-bridge flow.
  - Exit criteria: login/callback/password-bridge smoke log added to runbook.
  - Result: Google `status=ready`, Kakao/Naver `coming_soon`, social password-bridge + email/password login verified.
  - Complete: 2026-03-03
- [x] P4. Fix false non-trading-day review popup on `/home`.
  - Issue: popup appears even when user has today trades.
  - Scope: today-trade detection, timezone boundary, guided-review popup guard condition.
  - Exit criteria: if today trade exists, non-trading-day popup must not render.
  - Result: home guided-review card now suppresses no-trade banner when local-day trade summary count > 0.
  - Verified: `npm run e2e:smoke` (2 passed, 2026-03-03)
  - Complete: 2026-03-03

## PRODUCT BACKLOG (not exposed in README)

- [x] Social login (OAuth providers)
  - Google OAuth is implemented as first provider (`/api/v1/auth/social-login/google` start + callback).
  - Apple/Kakao login remains in pending configuration mode.
  - Required env vars:
    - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
    - `SOCIAL_LOGIN_STATE_SECRET` (recommended)
    - `FRONTEND_BASE_URL` (optional; defaults via request headers)
- [x] DB-only serverization for auth/session authority separation
- [x] Account lookup and password reset flows
- [x] Admin dashboard expansion (role-aware sections and telemetry)
- [x] Agent service detail screens and operational controls
  - [x] Agent 서비스 상세 화면 추가 (`/admin/agent-services`)
  - [x] Admin-only simulation access and route hardening audit notes
  - [x] Guest-mode simulator exposure audit (UI + backend route validation)
  - [x] 운영 제어 액션(재시작/일시정지) 설계 및 연결
  - Complete: 2026-03-01
- [x] 관리자 페이지 역할 확장 (현재 미구현)
  - [x] 사용자/권한 조회 및 admin 부여/회수 (기본 UI/API)
    - Implemented: `admin/users` 페이지, 사용자 검색/목록, admin 플래그 변경
  - [x] 핵심 작업 감사 로그(요청자/시간/요청대상) 보관
    - Implemented: `admin_audit_logs` 테이블 + `GET /api/v1/admin/audit-logs` + `/admin/audit-logs`
  - [x] 정책 기반 알림/제한 설정 변경(운영 규칙 토글)
    - Implemented: `admin_policies` 테이블 + `GET /api/v1/admin/policies` + `PUT /api/v1/admin/policies` + `/admin/policies`
  - [x] 에이전트 서비스 상태 패널의 수동 제어(재시작, 중단, 모드 전환)
  - [x] 관리자 대시보드 상세화(운영 요약/역할 정리/에이전트 상태 노출)
- [x] 장애 대응 표준 로그 템플릿 적용(정합성 실패 원인 추적)
- [x] Incident logging hardening (replace assumptions with structured logs on critical path)
  - Added incident-oriented logs in `onchain_handler.go` and `onchain_pack_service.go`
  - Includes request identity (`request_id`,`ip`), chain/address/range, cache hit/miss, provider error, and outcome latency

## CHECKPOINT (Immediate checks)

- [x] Home readability
  - Test steps: open `/home` at 100% zoom on desktop (Chrome), refresh once, inspect above-the-fold cards.
  - Pass criteria: key cards/labels readable without overlap; no clipped title/number text.
  - Evidence: one screenshot + short note (`pass`/`fail` + reason).
  - Verified: Playwright checkpoint suite pass (2026-03-03).
- [x] Checklist and action labels visibility
  - Test steps: on `/home`, inspect checklist status chips and action buttons in default theme.
  - Pass criteria: status/count/action labels are visually distinguishable; loading/error labels are readable.
  - Evidence: one screenshot + short note (`pass`/`fail` + reason).
  - Verified: Playwright checkpoint suite pass (2026-03-03).
- [x] Bubble/action flow
  - Test steps: `/chart/BTCUSDT` -> create bubble -> save -> trigger AI action once.
  - Pass criteria: save success is visible; AI success/failure message remains long enough to verify.
  - Evidence: one screenshot + short note (`pass`/`fail` + reason).
  - Verified: Playwright checkpoint suite pass (2026-03-03).
- [x] Narrow-screen behavior
  - Test steps: set viewport to 390x844 and 430x932, check `/home`, `/chart/BTCUSDT`, `/review`.
  - Pass criteria: no major layout overlap; primary cards/buttons remain reachable without broken stacking.
  - Evidence: per viewport one screenshot + short note (`pass`/`fail` + reason).
  - Verified: Playwright checkpoint suite pass (2026-03-03).

## NEXT

- [x] Improve chart bubble density and replay cleanup.
- [x] Add user-time simulation tool (`/admin/sim-report`, 30-day mode).
- [x] Finalize Claude/Gemini routing policy.
  - Documented: `docs/runbook/ai-routing-policy.md`
  - Complete: 2026-03-03
- [x] Improve review card → chart movement behavior and filter-share labels.

## LATER

- [x] Privacy mode design: local-first, partial local storage, or hybrid.
  - Decision: hybrid privacy mode (client local-first + minimal server-derived data).
  - Documented: `docs/runbook/privacy-mode-policy.md`
  - Complete: 2026-03-03
- [ ] Evidence packet storage policy (ephemeral vs encrypted vault).
- [ ] Alert and emergency-mode hardening.
- [ ] Multi-exchange and multi-asset expansion roadmap.

## DONE (recent)

- [x] Simulation consistency fixes (`End Date` anchor and multi-entity generation).
- [x] Stock filter contamination fix in portfolio calculations.
- [x] Trades summary now uses `/v1/trades/summary`.
- [x] Review tabs and performance cards aligned and split.
- [x] AI retry UX and error states improved.
- [x] Candle-symbol validation for unsupported symbols.
- [x] AI prompt output normalization and length controls.
- [x] Evidence packet scope and presets improved.
- [x] Review card visibility and query sync updates.
- [x] AI response auto-save to review notes.
- [x] Position and trade sync refresh improvements.
- [x] 30-day user simulation API and report UI added.

## Completed (recently)

- [x] Admin user management page enhancements
  - Added role-based local filter (`전체`/`관리자만`/`비관리자`) on `/admin/users`.
  - Added self-guard: logged-in admin cannot modify own `is_admin` flag from this screen.
  - Applied filtered row count display and disabled action state for self row.

## Notes

- Track work status with `NOW`, `NEXT`, `LATER`.
- Move completed items to DONE as soon as verification ends.
