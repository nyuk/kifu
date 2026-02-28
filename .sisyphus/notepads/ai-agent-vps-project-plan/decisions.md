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
