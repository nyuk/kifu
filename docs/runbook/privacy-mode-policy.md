> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# Privacy Mode Policy (v1.0)

Last updated: 2026-03-03  
Owner: KIFU product/backend

## 1) Decision

Adopt **hybrid privacy mode** for v1.0:

- Default mode: server-backed (current behavior).
- Privacy mode ON: local-first handling for sensitive raw inputs, with server receiving only minimal derived data required for product features.

## 2) Scope

Applies to:

- AI prompt source payloads (raw user notes, evidence payloads, free-text context).
- Home/review assistant helper inputs.
- Any feature that can include personally identifiable or strategy-sensitive text.

Does not change:

- Auth/session/account tables.
- Trade sync baseline records required for core product operation.

## 3) Data handling rules

- Raw sensitive text:
  - keep on client when privacy mode is ON.
  - do not persist raw text server-side by default.
- Derived summary/meta (server allowed):
  - compact labels, counts, status, timestamps, provider/run ids.
  - no raw free-text unless explicit user opt-in.
- Logs:
  - redact prompt-like payload fields.
  - keep structured operational logs only (`request_id`, status, latency, error code).

## 4) UX rules

- Settings toggle: `Privacy Mode` (default OFF for v1.0 migration safety).
- When ON:
  - show a clear badge in AI-related UI.
  - show warning when an action requires server persistence of sensitive text.
  - require explicit confirmation before sending raw payloads.

## 5) API behavior contract

- Requests from privacy mode clients should include an explicit flag (e.g. `privacy_mode=true`).
- Backend must:
  - enforce payload minimization in privacy mode paths.
  - reject disallowed raw fields with `INVALID_REQUEST`.
  - keep response schema compatible (no frontend breaking changes).

## 6) Rollout plan

1. Phase 1 (safe):
   - add toggle + client flag + server redaction guards.
2. Phase 2:
   - block raw sensitive persistence in selected endpoints.
3. Phase 3:
   - add audit report for privacy-mode request paths.

## 7) Validation checklist

- Privacy mode ON: no raw prompt text stored in backend DB/logs for protected flows.
- Privacy mode OFF: existing flows remain backward-compatible.
- Error handling returns existing `{code,message}` schema.

## 8) Open items

- Evidence packet storage policy (ephemeral vs encrypted vault) is tracked separately in TODO.
- Encryption-at-rest key rotation details to be finalized with ops runbook update.

