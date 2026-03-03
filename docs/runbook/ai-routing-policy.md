> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# AI Routing Policy (Claude/Gemini)

Last updated: 2026-03-03  
Owner: KIFU backend ops

## 1) Goal

Define a single operational rule for when Claude/Gemini are used, how fallback works, and how cost is controlled.

## 2) Effective policy (v1.0)

- Primary provider path: OpenAI-compatible invocation flow via `AIInvocationService`.
- Claude/Gemini availability: enabled only when provider is `enabled=true` in `ai_providers` and credentials resolve successfully.
- Master kill switch: `admin_policies.ai_provider_toggle`.
  - `false`: block provider operations.
  - `true`: allow provider operations per provider-level enable/credential checks.
- Local gateway switch: `admin_policies.ai_local_gateway`.
  - `true`: allow local OpenAI-compatible gateway routing.
  - `false`: do not route through local gateway.
- Telemetry switch: `admin_policies.ai_run_telemetry`.
  - `true`: capture run telemetry for AI operations.
  - `false`: minimal run metadata only.

## 3) Claude/Gemini selection and fallback

- Selection order (default): `openai -> claude -> gemini`.
- If requested provider is unavailable (disabled, missing key, invocation error):
  - return provider-specific error for direct single-provider calls;
  - for multi-provider orchestration, continue with remaining available providers.
- Do not silently change user-selected provider for direct calls.

## 4) Cost control baseline

- Use provider-level `enabled` flags in `ai_providers` as first control.
- Keep `ai_provider_toggle=false` by default in production until ops explicitly opens.
- Prefer short prompts and bounded token options in user-facing flows.
- Use telemetry (`ai_run_telemetry=true`) temporarily during incident triage, then turn off.

## 5) Operational checklist

- Confirm policies:
  - `GET /api/v1/admin/policies`
- Confirm provider activation:
  - provider row has `enabled=true`, correct `provider_type`, model, endpoint.
- Confirm credential path:
  - user key -> system key fallback -> fail-closed.
- Confirm run traces:
  - `run_type` and status recorded for AI-related flows.

## 6) Non-goals (v1.0)

- No dynamic cost optimizer per request.
- No auto-rewrite of provider choice based on latency.
- No cross-provider consensus voting in production by default.

