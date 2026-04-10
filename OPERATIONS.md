> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - Korean is optional supplementary context when needed.

# OPERATIONS.md - Kifu Shared Runtime Facts

> Shared operational facts for both Codex and Claude.
> Update this file first when environment rules, deploy flow, or debugging order changes.

## Project Scope

**kifu** is a trading journal and review platform.

Primary capabilities:
- trade and portfolio ingestion
- bubble and review workflows
- guided review and safety review
- summary pack generation
- onchain quick check on Base

## Read First

- `SPEC.md`
- `docs/runbook/`
- `QA_CHECKLIST.md`
- `important_rules.md`

Read resolved runbooks before attempting similar fixes.

## Key Files

- `backend/internal/interfaces/http/routes.go`
- `backend/internal/infrastructure/onchain/base_rpc_client.go`
- `backend/internal/services/onchain_pack_service.go`
- `docker-compose.prod.yml`
- `docker-compose.yml`

## Development Commands

```bash
# Backend
go mod download
cd backend
go run ./cmd
cd ..

# Frontend
cd frontend
npm install
npm run dev
npm run build
npm run lint
npm run typecheck
```

## Deployment Facts

- Always use `docker-compose.prod.yml` for production.
- `docker-compose.yml` is for local development support, not production deployment.
- Production app path is `/srv/kifu/kifu`.
- Backend reads env vars through compose `env_file`; "No .env file found" in container logs is expected.
- Migrations are not auto-run on production.

## Debugging Order

When an endpoint or integration fails, check in this order:

1. required env vars
2. container or app logs
3. external provider limits or auth
4. HTTP error body parsing
5. timeout chain

## Hard Rules

### Onchain

- Never use `eth_getLogs` on Alchemy Free tier.
- Use `alchemy_getAssetTransfers` for ERC20 transfer queries.
- `BASE_RPC_URL` must be set correctly for production-grade behavior.
- Retry 429s with backoff.

### Backend

- Keep handlers thin.
- Preserve domain/repository/infrastructure boundaries.
- DI wiring lives in `routes.go`.
- Background jobs use `Start(ctx)` pattern.

### Frontend

- Prefer `type` over `interface`.
- Use functional components with hooks.
- State stays in Zustand unless there is a strong reason otherwise.
- No `any` in new code.
- No `console.log` in production logic.

### Deployment

- Keep `package-lock.json` in sync before Docker builds.
- Do not treat local compose behavior as production behavior.

## Verification Baseline

- Backend changes: run targeted Go tests where available.
- Frontend changes: run targeted build/lint/typecheck for affected surfaces.
- Endpoint changes: perform API smoke checks before calling work complete.
- Production-sensitive fixes: leave a runbook entry when the issue is non-trivial.

## Dual-AI Workflow

- Codex handles routine implementation and scoped fixes.
- Claude handles debugging, review, and complex diagnosis.
- Shared facts belong here.
- Role-specific guidance belongs in `CODEX.md` and `CLAUDE.md`.
