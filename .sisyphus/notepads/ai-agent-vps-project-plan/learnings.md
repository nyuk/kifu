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

## [2026-02-28] Task 3: Run Repository Extension for AI Run Types

### Architecture Pattern
- **Variadic parameters** for backward compatibility: `GetLatestCompletedRun(ctx, userID, runTypes ...string)`
- When no runTypes specified, defaults to existing types: `exchange_sync`, `trade_csv_import`, `portfolio_csv_import`
- New AI types (`ai_summary`, `ai_opinion`) can be queried by passing them explicitly

### Key Implementation Details
1. **Interface Change**: Added variadic `runTypes ...string` parameter to `GetLatestCompletedRun`
2. **SQL Query**: Changed from hardcoded IN clause to `ANY($2)` with array parameter for flexibility
3. **finishedAt Enforcement**: Updated `import_handler.go` to always pass finishedAt for failed runs (was passing nil)
4. **Helper Function**: Added `ptrTime()` helper to import_handler for time pointer conversion

### Files Modified
- `backend/internal/domain/repositories/run_repository.go` (interface)
- `backend/internal/infrastructure/repositories/run_repository_impl.go` (implementation)
- `backend/internal/interfaces/http/handlers/import_handler.go` (finishedAt enforcement)
- `backend/internal/interfaces/http/handlers/pack_handler_test.go` (test mock update)

### Testing Results
- All pack handler tests pass (3 tests): backward compatibility verified
- All handler tests pass (18 tests): no regressions
- Build succeeds: no compilation errors
- finishedAt now always populated for completed/failed runs

### Lessons Learned
1. **Variadic parameters** are ideal for optional filtering without breaking existing callers
2. **pgx ANY() operator** works seamlessly with Go string slices for dynamic IN clauses
3. **Test mocks must be updated** when interface signatures change (pack_handler_test.go)
4. **Helper functions** (ptrTime) should be defined once and reused across handlers
5. **finishedAt consistency** requires checking all callers of UpdateStatus, not just new code

### Backward Compatibility
- Existing callers of `GetLatestCompletedRun(ctx, userID)` work unchanged
- Default behavior returns same run types as before
- No API schema changes required
- All existing tests pass without modification
