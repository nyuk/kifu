# Decisions - AI Agent VPS Project

## [2026-02-28T07:13:41Z] Session Start
- Execution order: Wave 1 (Task 1-3) first, as they are foundation tasks with no blockers

## [2026-02-28] Task 1: AI Provider Interface Design
- Created `domain/interfaces/` directory for client contracts (separate from `repositories/`)
- chat/completions as default endpoint — Responses API opt-in via `responses_api_enabled` flag
- RetryPolicy as struct not JSONB map: compile-time safety > flexibility for a fixed schema
- AIProviderRegistry pattern chosen for multi-provider resolution (vs. switch-case in service)
- Credential resolution is adapter responsibility, not domain concern (keeps domain infra-free)
- RawResponse stored as []byte with json:"-" tag — available for audit but excluded from API serialization

## [2026-02-28] Task 2: Provider Repository Design Decisions

### Decision 1: JSONB for RetryPolicy Storage
**Context**: Need to store complex retry configuration per provider
**Options**:
- A) Separate columns for each field (max_retries, base_backoff_ms, max_backoff_ms)
- B) JSONB column with flexible schema
- C) Separate retry_policies table with FK

**Decision**: B (JSONB)
**Rationale**:
- Keeps ai_providers table normalized (one row per provider)
- Allows schema evolution without migrations
- Matches entities.RetryPolicy struct exactly
- Unmarshaling is straightforward with json.Unmarshal

### Decision 2: Credential Resolution Priority
**Context**: Users can provide their own API keys OR use system keys
**Options**:
- A) Always prefer user key, fall back to system
- B) User can choose which to use (requires extra column)
- C) System key only, no user override

**Decision**: A (User key → System key)
**Rationale**:
- Simplest mental model for users
- Supports both personal and shared API keys
- Matches existing ai_handler.resolveAPIKey pattern
- No additional schema needed

### Decision 3: Policy Validation Scope
**Context**: Need to validate if a provider is allowed for a user
**Options**:
- A) Check provider.Enabled only (global allowlist)
- B) Check user-specific allowlist table
- C) Check both global and user-specific

**Decision**: A (provider.Enabled only, extensible)
**Rationale**:
- Simplest implementation for MVP
- Can extend to user-specific allowlists later
- Separates policy validation from credential resolution
- Allows gradual feature addition

### Decision 4: Index Strategy
**Context**: GetDefault() query needs to be fast
**Options**:
- A) No index (full table scan)
- B) Index on (is_default, enabled)
- C) Index on (enabled, is_default)

**Decision**: B (is_default, enabled)
**Rationale**:
- GetDefault() filters on is_default first
- Then checks enabled status
- Matches query predicate order
- Improves performance for common case

### Decision 5: Separate Credential Resolver Service
**Context**: Credential logic is complex and used in multiple places
**Options**:
- A) Keep in AIHandler (current)
- B) Extract to AICredentialResolver service
- C) Add methods to AIProviderRepository

**Decision**: B (Separate service)
**Rationale**:
- Single Responsibility Principle
- Reusable across handlers and services
- Easier to test in isolation
- Cleaner dependency injection
