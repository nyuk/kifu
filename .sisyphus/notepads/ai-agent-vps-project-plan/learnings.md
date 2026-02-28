# Learnings - AI Agent VPS Project

## [2026-02-28T07:13:41Z] Session Start
- Plan initialized with 14 tasks + 4 Final Verification items
- Execution strategy: 6 waves with parallel execution where possible

## [2026-02-28] Task 1: AI Provider Contract
- Domain has clean layering: entities/ + repositories/ — no interfaces/ dir existed; created it
- AIProvider entity was minimal (6 fields) — extended with 6 new meta fields without breaking existing consumers
- No existing AI invocation abstraction anywhere in codebase — greenfield interface design
- Pattern: repository interfaces in `repositories/`, client interfaces in `interfaces/` (new convention)
- Go packages compile independently — `go build ./internal/...` catches cross-package breakage
- RetryPolicy as embedded struct (not JSONB map) gives compile-time safety on policy fields
- DefaultEndpoint() method on AIInvocation implements 3-level fallback: explicit > provider > global default
