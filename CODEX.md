> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# CODEX.md - AI Assistant Working Context

This document summarizes the project for handoff to AI coding assistants.
**Read `docs/runbook/` for resolved issues before attempting fixes.**

## Project Summary

**kifu** is a trading review application.
- Users record trading decisions as bubble events.
- AI opinions can be collected per event.
- Results are reviewed against future outcomes.
- The goal is to improve decision quality over time.
- Onchain wallet analysis via Base chain ERC20 transfer scanning.

## Core Concepts

| Term | Meaning |
|---|---|
| Bubble | A recorded decision point tied to symbol, price, timeframe, and user notes |
| AI Opinion | A model-generated directional view (BUY / SELL / HOLD / neutral tags) |
| Outcome | Post-decision market movement at 1h / 4h / 1d windows |
| Accuracy | Rate of correct AI-direction decisions versus realized movement |
| Review Note | User post-review note, including lessons and emotional context |
| Onchain Pack | ERC20 transfer summary for a wallet address on Base chain |

## Architecture Snapshot

```text
┌──────────────────────┐   ┌───────────────────────┐
│ Frontend             │   │ Backend               │
│ - Next.js / React    │◄──┤ - Go + Fiber          │
│ - Zustand            │   │ - PostgreSQL          │
│ - lightweight-charts  │   │ - JWT Auth            │
└──────────┬───────────┘   └───────────┬───────────┘
           │                           │
           ▼                           ▼
  API consumers                API handlers and jobs
  (flows, modals, charts)      (runs, summary packs, jobs)
```

## Repo Structure

- `backend/internal/domain` — entities, repositories (interfaces)
- `backend/internal/infrastructure` — repository implementations, external clients
- `backend/internal/infrastructure/onchain` — Base chain RPC client (Alchemy)
- `backend/internal/interfaces/http` — handlers/routes
- `backend/internal/interfaces/http/routes.go` — DI wiring and route registration
- `backend/internal/jobs` — background jobs
- `backend/internal/services` — business logic services
- `frontend/src/components` — app components
- `frontend/src/stores` — state
- `frontend/src/lib` — API clients, helpers
- `docs` — planning/design/analysis/runbooks/specs/ADR
- `docs/runbook` — resolved issue documentation (READ THESE FIRST)

## API Surface (Selected)

- Auth: `/api/v1/auth/{register,login,refresh,logout}`
- Bubbles: `/api/v1/bubbles`
- Outcomes and Accuracy: `/api/v1/bubbles/:id/outcomes`, `/api/v1/review/*`
- Trades: `/api/v1/trades`, `/api/v1/trades/import`, `/api/v1/trades/convert-bubbles`
- AI Opinions: `/api/v1/bubbles/:id/ai-opinions`
- Summary Packs: `/api/v1/packs/generate` and `/api/v1/packs/generate-latest`
- Onchain: `/api/v1/onchain/quick-check`

---

## Hard Rules (MUST follow)

### Alchemy / Onchain

- **NEVER use `eth_getLogs` on Alchemy Free tier** — limited to 10-block range, completely impractical.
- **USE `alchemy_getAssetTransfers`** for all ERC20 transfer queries. No block range limit, paginated, includes metadata.
- Env var: `BASE_RPC_URL` — must be Alchemy URL (e.g. `https://base-mainnet.g.alchemy.com/v2/KEY`).
- If `BASE_RPC_URL` is empty, fallback is public RPC (`mainnet.base.org`) which is even more limited.
- Always implement retry with backoff for 429 rate limit errors from Alchemy.
- See: `docs/runbook/2026-02-19-onchain-provider-fix.md`

### Deployment

- **ALWAYS use `docker-compose.prod.yml`** — `docker-compose.yml` is DB-only for local dev.
- Deploy command: `docker compose -f docker-compose.prod.yml build backend && docker compose -f docker-compose.prod.yml up -d --force-recreate backend`
- Backend container reads `.env` via `env_file` in compose, NOT from filesystem inside container.
- Logs say "No .env file found" — this is expected, env vars come from Docker.
- **Keep `package-lock.json` synced** before Docker build — `npm ci` will fail otherwise.
- See: `docs/runbook/2026-02-16-deploy-debug-summary.md`

### Backend (Go)

- Clean Architecture: domain/entities → domain/repositories (interfaces) → infrastructure (impl) → interfaces/http/handlers
- DI wiring is in `backend/internal/interfaces/http/routes.go`
- Repository impl uses `*pgxpool.Pool`, returns `(entity, error)` or `(nil, nil)` for not found
- Handlers use `ExtractUserID(c)` from `auth_handler.go`
- Entity types use string constants, not Go enums
- JSONB config for flexible configurations (alert rules, etc.)
- Background jobs: `jobs/*.go` with `Start(ctx)` pattern using `time.NewTicker`
- Migrations are NOT auto-run — must be executed manually on production

### Frontend (TypeScript/React)

- Prefer `type` over `interface`
- Functional components with hooks only
- State via Zustand — no other global state frameworks
- No `any` in new code
- No `console.log` in production — use structured logging

### API Conventions

- RESTful routes under `/api/v1/{resource}`
- Error format: `{ "code": "VALIDATION_ERROR", "message": "..." }`
- Resource names are plural for collections
- Noun-based resources, verb-based actions (`/login`, `/logout`)

### External Services

- Binance Futures API (`fapi.binance.com`) for price data
- AI providers: OpenAI, Claude, Gemini — keys resolved from `user_ai_keys` table or env vars
- Alchemy Base RPC for onchain data — Free tier constraints apply (see above)

---

## Debugging Checklist

When an endpoint returns errors, check in this order:

1. **Env vars** — Is the required env var set AND passed to the Docker container?
2. **Logs** — `docker logs kifu-backend --tail 50` — what is the actual error?
3. **Provider limits** — External API rate limits / tier restrictions?
4. **HTTP error parsing** — Is the error response body being read? (Alchemy returns JSON in 400/429 bodies)
5. **Timeout chain** — Provider timeout > HTTP client timeout > individual call timeout?

### Common Pitfalls

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `PROVIDER_UNAVAILABLE` | Alchemy rate limit or wrong API | Use `alchemy_getAssetTransfers`, not `eth_getLogs` |
| `rpc http status=400` | Alchemy block range limit exceeded | Reduce range or use transfer API |
| `rpc http status=429` | Rate limit — too many calls/sec | Add retry with backoff, reduce call frequency |
| Backend "No .env file found" | Expected in Docker — env via compose | Not a bug, env vars are injected by Docker |
| `npm ci` fails in Docker build | Lockfile out of sync | Run `npm install` locally, commit lockfile |
| Frontend redirect loop to `/guest` | Stale demo gating logic | Check auth redirect logic, clear build cache |

---

## Current Priority

- Keep behavior change-safe, and preserve explicit-user flows.
- For summary packs, use v1.0 explicit generation as baseline, with v1.1 auto-complete as an extension.
- Avoid touching unrelated files during scoped work.
- Update `SPEC.md` and related docs for every behavior decision.

## Reference Documents

- `CLAUDE.md` — shared project knowledge base (both Claude and Codex reference)
- `SPEC.md` — active source of truth for current objective
- `docs/runbook/*` — **resolved issue documentation — read before fixing similar issues**
- `docs/adr/*` — architecture decision records
- `QA_CHECKLIST.md` — verification checklist

## Workflow Note

This project uses a dual-AI workflow:
- **Codex** handles routine coding tasks (cost-efficient).
- **Claude Code** is called in for debugging and complex problem-solving.
- Resolved issues are documented in `docs/runbook/` so both AIs share knowledge.
- When you fix a non-trivial issue, **always create a runbook entry** for future reference.
