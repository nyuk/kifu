# AI Provider Contract Specification

> Canonical reference for Kifu AI provider adapter architecture.
> All implementations must satisfy this contract.

## 1. Overview

Kifu supports multiple AI providers (OpenAI, Anthropic, Google, OpenAI-compatible local models)
through a unified adapter pattern. The domain layer defines provider-agnostic interfaces;
infrastructure adapters translate between the domain contract and each provider's wire format.

```
┌─────────────────────────────────────────────────┐
│  Service Layer (alert_briefing, sim_report, …)  │
│                                                 │
│  AIInvocation ──► AIProviderRegistry            │
│                      │                          │
│              ┌───────┼───────┐                  │
│              ▼       ▼       ▼                  │
│         OpenAI   Anthropic  Local               │
│         Adapter  Adapter    Adapter             │
│              │       │       │                  │
│              ▼       ▼       ▼                  │
│         AIInvocationResult                      │
└─────────────────────────────────────────────────┘
```

## 2. Core Types

### 2.1 AIProvider (Entity)

Extended from the existing `ai_providers` table. New fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider_type` | string | `"openai"` | One of: `openai`, `anthropic`, `google`, `openai-compatible` |
| `base_url` | string | `""` (use provider default) | API base URL override |
| `default_endpoint` | string | `"chat/completions"` | Default API endpoint path |
| `timeout_seconds` | int | `30` | Per-request timeout; 0 = global default |
| `retry_policy` | JSON | `{"max_retries":3,"base_backoff_ms":500,"max_backoff_ms":10000}` | Retry configuration |
| `responses_api_enabled` | bool | `false` | Enable OpenAI Responses API (opt-in) |

### 2.2 AIInvocation (Value Object)

Represents a single AI call request.

```go
type AIInvocation struct {
    Provider *entities.AIProvider  // resolved provider config
    Model    string                // model identifier
    Endpoint string                // override endpoint (empty = use default)
    Messages []AIMessage           // chat-style messages
    Options  AIInvocationOption    // temperature, max_tokens, etc.
}
```

### 2.3 AIInvocationResult (Value Object)

Represents the parsed response.

```go
type AIInvocationResult struct {
    Content          string  // extracted text response
    Model            string  // actual model used
    TokensUsed       int     // total tokens
    FinishReason     string  // "stop", "length", "content_filter"
    PromptTokens     int     // input tokens (if available)
    CompletionTokens int     // output tokens (if available)
    RawResponse      []byte  // original JSON for audit
}
```

### 2.4 AIProviderClient (Interface)

```go
type AIProviderClient interface {
    Invoke(ctx context.Context, invocation *AIInvocation) (*AIInvocationResult, error)
    Validate(ctx context.Context, provider *entities.AIProvider) error
    ProviderType() string
}
```

### 2.5 AIProviderRegistry (Interface)

```go
type AIProviderRegistry interface {
    ClientFor(providerType string) (AIProviderClient, error)
    RegisterClient(providerType string, client AIProviderClient)
}
```

## 3. Provider Defaults

### 3.1 OpenAI

| Setting | Value |
|---------|-------|
| `provider_type` | `"openai"` |
| `base_url` | `"https://api.openai.com/v1"` |
| `default_endpoint` | `"chat/completions"` |
| `timeout_seconds` | `30` |
| `responses_api_enabled` | `false` |

**Policy**: `chat/completions` is the default and only active endpoint for v1.
The Responses API (`/v1/responses`) exists but is **disabled by default**.
To enable it, set `responses_api_enabled = true` on the provider record.

### 3.2 Anthropic

| Setting | Value |
|---------|-------|
| `provider_type` | `"anthropic"` |
| `base_url` | `"https://api.anthropic.com/v1"` |
| `default_endpoint` | `"messages"` |
| `timeout_seconds` | `60` |

### 3.3 Google (Gemini)

| Setting | Value |
|---------|-------|
| `provider_type` | `"google"` |
| `base_url` | `"https://generativelanguage.googleapis.com/v1beta"` |
| `default_endpoint` | `"models/{model}:generateContent"` |
| `timeout_seconds` | `30` |

### 3.4 OpenAI-Compatible (Local / Self-hosted)

| Setting | Value |
|---------|-------|
| `provider_type` | `"openai-compatible"` |
| `base_url` | User-configured (e.g., `"http://localhost:11434/v1"`) |
| `default_endpoint` | `"chat/completions"` |
| `timeout_seconds` | `120` (local models can be slower) |

## 4. Credential Resolution

Credentials are resolved by the adapter at invocation time:

1. **User-specific key**: Look up `user_ai_keys` for the user + provider combination.
2. **System fallback**: If no user key, use the system-level key from env vars (e.g., `OPENAI_API_KEY`).
3. **Fail-closed**: If no key is found, return an error — never call the provider without auth.

The domain layer (`AIProviderClient.Invoke`) never sees raw API keys.
Key decryption and header injection happen exclusively in the infrastructure adapter.

## 5. Error Handling

### 5.1 Error Categories

| Category | HTTP Status | Retryable | Action |
|----------|-------------|-----------|--------|
| `AUTH_FAILED` | 401, 403 | No | Check API key validity |
| `RATE_LIMITED` | 429 | Yes | Backoff per RetryPolicy |
| `PROVIDER_ERROR` | 500, 502, 503 | Yes | Retry with backoff |
| `TIMEOUT` | — | Yes | Retry up to max_retries |
| `INVALID_REQUEST` | 400 | No | Fix request payload |
| `CONTENT_FILTERED` | 200 (finish_reason) | No | Log and return partial |

### 5.2 Retry Behavior

Adapters apply the provider's `RetryPolicy`:

```
attempt 1: immediate
attempt 2: wait base_backoff_ms
attempt 3: wait min(base_backoff_ms * 2, max_backoff_ms)
attempt N: wait min(base_backoff_ms * 2^(N-2), max_backoff_ms)
```

Only retryable errors trigger retry. Non-retryable errors fail immediately.

## 6. Local OpenAI-Compatible Test Scenarios

For development and testing against local OpenAI-compatible servers
(e.g., Ollama, LM Studio, vLLM, llama.cpp server):

### 6.1 Happy Path

```
Given: Provider with base_url="http://localhost:11434/v1", provider_type="openai-compatible"
When:  Invoke with model="llama3" and messages=[{role:"user", content:"Hello"}]
Then:  Returns AIInvocationResult with content, tokens_used, finish_reason="stop"
```

### 6.2 Base URL Missing / Unreachable

```
Given: Provider with base_url="" or base_url="http://localhost:99999/v1"
When:  Invoke is called
Then:  Returns error with category PROVIDER_ERROR
       Error message includes: "base URL is not configured" or "connection refused"
       No retry attempted for empty base_url (fail-fast)
```

### 6.3 Token / API Key Missing

```
Given: Provider type="openai-compatible", no UserAIKey and no env fallback
When:  Invoke is called
Then:  Returns error with category AUTH_FAILED
       Error message: "no API key available for provider"
       Adapter MUST NOT send request without authorization header
Note:  Some local servers don't require auth — adapter should support
       an optional "auth_required=false" flag in provider meta for this case
```

### 6.4 Timeout Response

```
Given: Provider with timeout_seconds=5, local model takes 30s to respond
When:  Invoke is called
Then:  Context deadline exceeded after 5 seconds
       Returns error with category TIMEOUT
       Retry attempted per RetryPolicy (up to max_retries)
       After max retries exhausted, final error returned to caller
```

### 6.5 Malformed Response

```
Given: Local server returns non-standard JSON (missing "choices" array)
When:  Invoke parses response
Then:  Returns error with category PROVIDER_ERROR
       Error message includes: "unexpected response format"
       RawResponse preserved in error for debugging
```

### 6.6 Responses API Disabled (Default)

```
Given: Provider with responses_api_enabled=false (default)
When:  Invocation endpoint is set to "responses"
Then:  Adapter rejects the call with INVALID_REQUEST error
       Error message: "Responses API is disabled for this provider"
       Caller must use chat/completions endpoint
```

## 7. Implementation Checklist

For each new provider adapter:

- [ ] Implement `AIProviderClient` interface
- [ ] Register in `AIProviderRegistry` during DI setup
- [ ] Handle credential resolution (user key → system key → fail)
- [ ] Apply `RetryPolicy` with exponential backoff
- [ ] Parse response into `AIInvocationResult` with token counts
- [ ] Preserve `RawResponse` for audit logging
- [ ] Return typed errors matching the error categories above
- [ ] Respect `timeout_seconds` via `context.WithTimeout`
- [ ] Check `responses_api_enabled` before using non-standard endpoints

## 8. Migration Notes

The `ai_providers` table needs these new columns:

```sql
ALTER TABLE ai_providers
    ADD COLUMN provider_type       TEXT NOT NULL DEFAULT 'openai',
    ADD COLUMN base_url            TEXT NOT NULL DEFAULT '',
    ADD COLUMN default_endpoint    TEXT NOT NULL DEFAULT 'chat/completions',
    ADD COLUMN timeout_seconds     INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN retry_policy        JSONB NOT NULL DEFAULT '{"max_retries":3,"base_backoff_ms":500,"max_backoff_ms":10000}',
    ADD COLUMN responses_api_enabled BOOLEAN NOT NULL DEFAULT false;
```

> This migration is tracked separately and is NOT auto-run.
> Execute manually on production per deployment checklist.
