> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# CLAUDE.md - Project Knowledge Base

> Shared context for coding assistants (Claude, Codex, ChatGPT, etc.).
> If recurring behavior issues happen, record fixes here first.
> **Read `docs/runbook/` for resolved issues before attempting similar fixes.**

## Project Overview

**kifu** is a trading journal and review platform.

Primary capabilities:
- Collect trade/portfolio events from exchange sync and CSV import.
- Record trading intent and context as bubble notes.
- Collect AI opinions and compare with outcomes.
- Review and improve decision quality through replay/analysis flows.
- Publish Summary Pack reports.
- Onchain wallet analysis via Base chain ERC20 transfer scanning.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand |
| Backend | Go 1.21, Fiber v2, PostgreSQL (pgx), JWT |
| Charts | `lightweight-charts` |
| Onchain | Alchemy Base RPC (`alchemy_getAssetTransfers`) |
| External | Binance Futures API (`fapi.binance.com`) |

## Repository Structure

```text
kifu-project/
├── backend/
│   ├── cmd/
│   ├── internal/
│   │   ├── app/
│   │   ├── domain/          # entities, repository interfaces
│   │   ├── infrastructure/  # repository impl, external clients
│   │   │   ├── onchain/     # Alchemy Base RPC client
│   │   │   └── notification/# Telegram sender
│   │   ├── interfaces/http/ # handlers, routes, middleware
│   │   ├── services/        # business logic
│   │   └── jobs/            # background jobs (ticker-based)
│   ├── migrations/
│   └── scripts/
├── frontend/
│   ├── app/
│   ├── src/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── types/
│   │   └── lib/
└── docs/
    ├── 01-plan/
    ├── 02-design/
    ├── 03-analysis/
    ├── 04-report/
    ├── runbook/      # resolved issue documentation
    ├── spec/
    ├── adr/          # architecture decision records
    └── nlm/
```

### Key Files

| File | Purpose |
|---|---|
| `backend/internal/interfaces/http/routes.go` | DI wiring and all route registration |
| `backend/internal/infrastructure/onchain/base_rpc_client.go` | Alchemy RPC client |
| `backend/internal/services/onchain_pack_service.go` | Onchain pack business logic |
| `docker-compose.prod.yml` | Production deploy (backend + frontend + postgres) |
| `docker-compose.yml` | Local dev DB only — DO NOT use for production |

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

## Deployment

```bash
# Production deploy (ALWAYS use prod compose file)
cd /srv/kifu/kifu
git pull
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d --force-recreate backend

# Logs
docker logs kifu-backend --tail 50

# Full stack redeploy
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
```

- Backend reads `.env` via `env_file` in compose — "No .env file found" log is expected.
- Migrations are NOT auto-run — execute manually on production.
- See `docs/runbook/production-deploy-checklist.md` for full checklist.

## Coding Conventions

### TypeScript / React
- Prefer `type` over `interface` where possible.
- Use functional components with hooks.
- State is managed via Zustand; avoid introducing alternate global state frameworks unless required.
- No `any` in new code.
- No `console.log` in production — use structured logging.

### Go
- Keep handlers thin; keep domain/repository/application boundaries explicit.
- Use repository interfaces and concrete infrastructure implementations.
- Prefer clear error return values and consistent API shape.
- DI wiring in `routes.go`, background jobs in `jobs/*.go` with `Start(ctx)` pattern.
- Repository impl uses `*pgxpool.Pool`, returns `(entity, error)` or `(nil, nil)` for not found.
- Entity types use string constants, not Go enums.
- Handlers use `ExtractUserID(c)` from `auth_handler.go`.

### API Conventions
- RESTful routes under `/api/v1/{resource}`.
- Resource names are plural for collections.
- Use noun-based resources and verb-based actions (`/login`, `/logout`, `/refresh`).
- Error body format:
  ```json
  { "code": "VALIDATION_ERROR", "message": "Invalid input" }
  ```

## Hard Rules

### Alchemy / Onchain
- **NEVER use `eth_getLogs` on Alchemy Free tier** — limited to 10-block range.
- **USE `alchemy_getAssetTransfers`** for all ERC20 transfer queries.
- Env var: `BASE_RPC_URL` must be set with Alchemy URL.
- Always implement retry with backoff for 429 rate limit errors.
- See: `docs/runbook/2026-02-19-onchain-provider-fix.md`

### External API Error Handling
- Always parse HTTP 400/429 response bodies — providers return useful JSON-RPC errors in the body.
- Never discard error response bodies before checking for structured error info.
- Implement retry with exponential backoff for rate-limited APIs (429).

### Deployment
- **ALWAYS use `docker-compose.prod.yml`** for production.
- Keep `package-lock.json` synced before Docker build (`npm ci` will fail otherwise).
- See: `docs/runbook/2026-02-16-deploy-debug-summary.md`

## Debugging Checklist

When an endpoint returns errors, check in this order:

1. **Env vars** — Is the required var set AND passed to the Docker container?
2. **Logs** — `docker logs kifu-backend --tail 50` — what is the actual error?
3. **Provider limits** — External API rate limits / tier restrictions?
4. **HTTP error parsing** — Is the error response body being read?
5. **Timeout chain** — Provider timeout > HTTP client timeout > individual call timeout?

### Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `PROVIDER_UNAVAILABLE` | Alchemy rate limit or wrong API | Use `alchemy_getAssetTransfers` |
| `rpc http status=400` | Alchemy block range limit | Reduce range or use transfer API |
| `rpc http status=429` | Rate limit | Retry with backoff |
| "No .env file found" in logs | Expected in Docker | Not a bug |
| `npm ci` fails in build | Lockfile out of sync | `npm install` + commit lockfile |
| Frontend redirect loop | Stale demo gating | Check auth logic, clear build cache |

## Testing Strategy

- Frontend: unit/integration tests first for changed modules.
- Backend: go test standard suite.
- API smoke before merge when touching endpoints.
- No large context dumps to external LLMs; pass only scoped snippets.

## Prohibited

- ❌ Commit `.env` or secret material.
- ❌ Use `console.log` in production logic; use structured logging.
- ❌ Introduce `any` in new TypeScript code.
- ❌ Read and modify huge files without targeted rationale.
- ❌ Use `eth_getLogs` on Alchemy Free tier.
- ❌ Use `docker-compose.yml` for production (use `docker-compose.prod.yml`).
- ❌ Skip writing runbook when resolving non-trivial production issues.

## Reference Documents

- `CODEX.md` — Codex-specific rules (synced with this file).
- `SPEC.md` — active source of truth for current objective.
- `important_rules.md` — token and workflow playbook.
- `QA_CHECKLIST.md` — verification checklist.
- `docs/adr/*` — architecture decision records.
- `docs/runbook/*` — resolved issue documentation — **read before fixing similar issues**.

## Workflow Note

This project uses a dual-AI workflow:
- **Codex** handles routine coding tasks (cost-efficient).
- **Claude Code** is called in for debugging and complex problem-solving.
- Resolved issues are documented in `docs/runbook/` so both AIs share knowledge.
- When you fix a non-trivial issue, **always create a runbook entry** for future reference.
