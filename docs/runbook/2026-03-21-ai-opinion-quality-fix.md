# AI Opinion Quality Fix & Gemini Routing — 2026-03-21

## Context

Codex handoff reported two problems:
1. AI opinion collection quality was low — wrong symbols cited, generic responses like "포지션 없음", "데이터 부족"
2. BubbleCreateModal UX was cramped — too much scrolling, small fonts

## Root Causes Found

### 1. Evidence Packet Was Empty (Critical)
**File**: `frontend/src/lib/evidencePacket.ts`

`describeEvidencePacket()` only output count/range labels like "Recent trades: 5 (2026-03-10 ~ 2026-03-16)" but **never included the actual trade data**. AI providers received zero factual content to analyze.

**Fix**: Added individual trade lines, memo snippets, buy/sell pattern summaries to the serialized text.

### 2. Gemini Routing Chain — Three Bugs

**Bug A — Provider Type Mismatch**
**File**: `backend/internal/services/ai_invocation_service.go`

DB `ai_providers.provider_type` for gemini was not `'google'` (migration 035 likely not applied to production DB). The `normalizeProviderConfig` function initially only set provider_type when empty.

**Fix**: `normalizeProviderConfig` now **always** forces correct name→type mapping:
- gemini → `"google"`
- claude → `"anthropic"`
- openai → `"openai"`

**Bug B — Wrong Endpoint Method**
**File**: `backend/internal/infrastructure/ai_providers/gemini_client.go`

`GeminiClient.Invoke()` called `invocation.DefaultEndpoint()` which returns `"chat/completions"` (OpenAI format). Gemini's native API requires `"generateContent"`.

**Fix**: Hardcoded `generateContent` endpoint — Gemini client should never use the generic endpoint fallback.

**Bug C — Wrong Base URL**
**File**: `backend/internal/infrastructure/ai_providers/gemini_client.go`

DB `base_url` was pointing to a non-v1beta endpoint (possibly OpenAI-compatible proxy). Error responses had OpenAI error format (`"type": "invalid_request_error"`) confirming the URL mismatch.

**Fix**: Hardcoded base URL to `https://generativelanguage.googleapis.com/v1beta` — the GeminiClient knows its own API.

### 3. Prompt Allowed Generic Filler
**File**: `backend/internal/interfaces/http/handlers/ai_handler.go`

The one-shot prompt had no rules preventing AI from returning content-free conclusions.

**Fix**: Added 3 new prompt rules (v6):
- Prioritize current symbol's trade data
- Read buy/sell ratios, last trade direction, and patterns before answering
- Ban filler conclusions ("포지션 없음", "데이터 부족", "추가 정보 필요")

## Additional Changes in Same Commit

| Change | File | Details |
|--------|------|---------|
| Admin quota bypass | `ai_handler.go` | `isAdminUser` check skips quota/cap enforcement |
| Model normalization | `ai_handler.go` | Runtime upgrade of stale model names (gemini-pro → gemini-2.5-flash) |
| Prompt version cache key | `ai_handler.go` | `oneShotPromptVer = "v6"` in cache key invalidates stale responses |
| Modal UX | `BubbleCreateModal.tsx` | `max-w-xl` → `max-w-2xl`, bigger fonts, auto-collapse evidence |

## Current Status (2026-03-21)

- **Committed**: `7869126` on main
- **ChatGPT**: Working well — returns specific, data-driven analysis
- **Gemini**: Fixed endpoint + base URL — **needs retest after this commit**
- **NOT deployed to production yet** — needs `docker compose -f docker-compose.prod.yml` rebuild
- **Migration 035 still likely not applied** — but runtime normalization in code compensates

## Remaining Work

1. **Test Gemini** — verify the hardcoded URL fix works end-to-end
2. **Deploy to production** — rebuild backend container with new code
3. **Apply migration 035** — optional now (runtime fix handles it) but good housekeeping
4. **CRLF cleanup** — ~100 Go files have LF→CRLF changes from Mac sync, not committed. Consider adding `.gitattributes` with `* text=auto` to prevent recurrence
5. **Stash cleanup** — `stash@{0}` "codex pre-mac-sync-2026-03-21" can be dropped after verification

## Key Architecture Notes for Future AI Sessions

### AI One-Shot Flow
```
Frontend: fetchAiOpinions() → buildEvidenceText() → POST /v1/ai/one-shot
Backend:  ai_handler.RequestOneShot → buildOneShotPrompt → AIInvocationService.InvokeProvider
          → providerRepo.GetByName → normalizeProviderConfig → registry.ClientFor → adapter.Invoke
```

### Provider Registry Pattern
- DB stores `name`, `provider_type`, `base_url`, `default_endpoint`
- `normalizeProviderConfig` corrects provider_type at runtime (DB may be stale)
- `registry.ClientFor(providerType)` maps to adapter: openai→OpenAIClient, google→GeminiClient, anthropic→ClaudeClient
- GeminiClient hardcodes its own URL and endpoint (does NOT trust DB values)

### Evidence Packet Data Flow
```
Frontend: buildEvidencePacket(options) → fetches trades/positions/bubbles/summary from API
          → describeEvidencePacket(packet) → serializes to text lines
          → formatEvidencePacket(packet) → single string (evidence_text field)
Backend:  receives evidence_text → prepends to one-shot prompt → sends to AI provider
```
