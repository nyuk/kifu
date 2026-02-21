> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# TODO

Operational task list for ongoing work.

## NOW

- [x] Add pagination and page-jump in chart side bubble list (`PageJumpPager`).
  - Scope: chart side panel and related lists.
  - Complete: 2026-02-13
- [x] Standardize admin access authority to DB `users.is_admin` as source of truth and remove guest-email path dependency.
  - Scope: backend admin middleware and frontend auth guard.
  - Complete: 2026-02-21
- [ ] Execute remaining work from `docs/2026-02-13-remaining-work.md`.
  - Current active priority: first batch items 1–4.
- [ ] Social login (OAuth providers)
  - Google OAuth start/callback flow implemented (`/api/v1/auth/social-login/google`, `/api/v1/auth/social-login/google/callback`).
  - Apple/Kakao still pending configuration and policy review.
  - Required env vars:
    - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
    - `SOCIAL_LOGIN_STATE_SECRET` (shared with backend, defaults to jwt secret if empty)
    - `FRONTEND_BASE_URL` (for callback redirect base)
  - Current callback still carries tokens via query string; harden before v1.0.

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
- [ ] Agent service detail screens and operational controls
  - [x] Agent 서비스 상세 화면 추가 (`/admin/agent-services`)
  - [x] Admin-only simulation access and route hardening audit notes
  - [x] Guest-mode simulator exposure audit (UI + backend route validation)
  - [x] 운영 제어 액션(재시작/일시정지) 설계 및 연결
- [x] 관리자 페이지 역할 확장 (현재 미구현)
  - [x] 사용자/권한 조회 및 admin 부여/회수 (기본 UI/API)
    - Implemented: `admin/users` 페이지, 사용자 검색/목록, admin 플래그 변경
  - [x] 핵심 작업 감사 로그(요청자/시간/요청대상) 보관
    - Implemented: `admin_audit_logs` 테이블 + `GET /api/v1/admin/audit-logs` + `/admin/audit-logs`
  - [x] 정책 기반 알림/제한 설정 변경(운영 규칙 토글)
    - Implemented: `admin_policies` 테이블 + `GET /api/v1/admin/policies` + `PUT /api/v1/admin/policies` + `/admin/policies`
  - [x] 에이전트 서비스 상태 패널의 수동 제어(재시작, 중단, 모드 전환)
  - [x] 관리자 대시보드 상세화(운영 요약/역할 정리/에이전트 상태 노출)
  - [ ] 장애 대응 표준 로그 템플릿 적용(정합성 실패 원인 추적)
- [ ] Incident logging hardening (replace assumptions with structured logs on critical path)

## CHECKPOINT (Immediate checks)

- [ ] Home readability
  - `/home` should expose key cards and labels clearly at 100% zoom.
  - Contrast and font sizes should pass quick glance criteria.
- [ ] Checklist and action labels visibility
  - Status labels, badges, and counts should be visually distinct.
  - Error/loading labels should be distinct from background.
- [ ] Bubble/action flow
  - Bubble creation → save → AI action path should be clear.
  - Error feedback should remain visible for review.
- [ ] Narrow-screen behavior
  - No major overlap on 390–430px widths.
  - Critical cards should fit with minimal scrolling.

## NEXT

- [x] Improve chart bubble density and replay cleanup.
- [x] Add user-time simulation tool (`/admin/sim-report`, 30-day mode).
- [ ] Finalize Claude/Gemini routing policy.
- [x] Improve review card → chart movement behavior and filter-share labels.

## LATER

- [ ] Privacy mode design: local-first, partial local storage, or hybrid.
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

## Notes

- Track work status with `NOW`, `NEXT`, `LATER`.
- Move completed items to DONE as soon as verification ends.
