# Project Specification (SPEC.md)

> **Role**: This file is the single source of truth for current product goals.
> **Rule**: Keep decision capture in documents, not chat.

---

## 0) Project Summary

**kifu** is a chart-based trading journal and review platform.

Users collect trading and portfolio events, attach bubble notes, collect AI opinions, and review decisions against outcomes.

Current baseline is **v1.0** and all user-facing explanations should use it as the primary reference.

---

## 1) Current goal (v1.0 baseline)

### 1.1 In scope (explicit mode)

- Keep Summary Pack generation explicit by source run when needed (v1.0 request path).
- Record and replay trade/portfolio/bubble events.
- Improve review loop quality through AI + outcome comparison.
- Maintain operability and safety: authentication, quotas, rate-limits, and scoped data isolation.

### 1.2 Explicit Out of scope

- Investment advice or signal guarantees.
- Full multi-device sync redesign.
- Radical architecture rewriting.

### 1.3 v1.1 extension (appendix only)

- `POST /api/v1/packs/generate-latest`
- Auto-select latest completed run for 30d pack generation.
- Return error `NO_COMPLETED_RUN` when no eligible run exists.

---

## 2) Domain boundaries

### In scope

- Bubble CRUD and persistence.
- Review and AI opinion flow.
- Summary Pack generation API and run-based sourcing.
- Core UI flows in chart, bubbles, home, portfolio, review, admin smoke path.

### Out of scope

- Full localization and marketing content automation.
- AI provider optimization beyond current quota protections.

---

## 3) Architecture

- Frontend: Next.js + React
- Backend: Go Fiber + PostgreSQL
- Auth: JWT-based request context
- Job layer: background calculations + sync jobs
- API style: REST under `/api/v1`

## 3.1 Error contract

Standard error JSON:
```json
{ "code": "VALIDATION_ERROR", "message": "Invalid input" }
```

---

## 4) Current Delivery Focus (active)

- [x] Generate-latest endpoint added for Summary Pack.
- [x] UI pack button switched to generate-latest path.
- [x] handler/repository tests added for success/error/scoping.
- [ ] Final smoke validation on local/staging before merge.

## 5) Execution Guardrails

- One small task per PR.
- Keep modifications scoped to touch points.
- If API contract changes, update:
  - `docs/spec/summary-pack-v1.md`
  - `docs/runbook/summary-pack-v1.md`
  - Related ADR entries
- Keep security, tests, and rollback checks explicit.

---

## 6) Decision log (short)

- 2026-02-13: `generate-latest` route introduced and validated.
- 2026-02-13: `generate-latest` integrated in `ExchangeConnectionManager.tsx` with 30d action.
- Ongoing: prepare post-ship smoke tests and localized UX for `NO_COMPLETED_RUN`.
