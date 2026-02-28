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

## [2026-02-28] Task 2: Provider Repository Layer

### Architecture Pattern
- Repository interfaces in `domain/repositories/` (contract)
- Implementation in `infrastructure/repositories/` (concrete)
- Services in `internal/services/` (business logic)
- Pattern: DB-backed lookup with JSONB for complex types (RetryPolicy)

### Key Decisions
1. **JSONB for RetryPolicy**: Stored as JSON in DB, unmarshaled on read
   - Compile-time safety via embedded struct
   - Flexible schema evolution without migrations
   
2. **Credential Priority Logic**:
   - Priority 1: User-provided encrypted key (highest)
   - Priority 2: System environment variable (lowest)
   - Fallback: Empty string if no credential found
   
3. **Policy Validation**: Currently checks provider.Enabled flag
   - Extensible for user-specific allowlists
   - Separate from credential resolution

### Implementation Details
- `AIProviderRepository` interface: 6 methods (ListEnabled, GetByName, GetByID, GetDefault, ListActive, ValidatePolicy)
- `AICredentialResolver` service: Handles priority-based credential lookup
- Migration 028: Adds 6 new columns to ai_providers table with index on (enabled, is_default)

### Testing Strategy
- Unit tests for repository methods (GetByName, GetByID, GetDefault, ListActive, ValidatePolicy)
- Unit tests for credential resolver (priority logic, system credential lookup, service key detection)
- Tests verify JSONB unmarshaling and metadata field accessibility
- All tests passing: 18 tests in repositories, 13 tests in services

### Evidence
- `.sisyphus/evidence/task-2-provider-lookup.log`: Repository tests (PASS)
- `.sisyphus/evidence/task-2-provider-policy-error.log`: Credential resolver tests (PASS)

### Lessons Learned
- JSONB unmarshaling requires explicit json.Unmarshal after pgx.QueryRow
- Provider name normalization (case-insensitive, whitespace-trimmed) is critical
- Encryption key must be passed through DI for credential decryption
- Index on (enabled, is_default) improves GetDefault() performance
