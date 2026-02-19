# Gap Detector Memory - Kifu Project

## Project Structure
- Backend: Go Fiber v2, Clean Architecture (domain/entities, domain/repositories, infrastructure/repositories, interfaces/http/handlers, services, jobs)
- Frontend: Next.js + React + TypeScript + Zustand
- Migrations in `backend/migrations/` numbered sequentially (007, 020, 022, etc.)
- Deployment: docker-compose.prod.yml (postgres, backend, frontend)
- Scripts: redeploy-stack.sh, redeploy-frontend-only.sh, local-dev-with-root-env.sh

## Error Format Pattern
- All handlers use FLAT error format: `fiber.Map{"code": ..., "message": ...}` (429 occurrences, 20 files)
- CLAUDE.md and SPEC.md both document flat format correctly
- No nested `"error": { ... }` wrapping anywhere in codebase

## Key Findings (2026-02-16, v2.0 analysis)
- Summary Pack v1.1 generate-latest: fully matches ADR-0002 (run selection, response fields, error codes)
- Dockerfiles missing: docker-compose.prod.yml references backend/Dockerfile and frontend/Dockerfile but neither exists
- Root .env.example missing JWT_SECRET and KIFU_ENC_KEY (needed for docker-compose)
- frontend/.env.example missing NEXT_PUBLIC_ENABLE_GUEST_FLOW
- CLAUDE.md fully English now (language policy applied)
- One Korean comment in next.config.mjs line 16
- Auth flow: RequireAuth -> /login (not /guest), GuestOnly excludes /guest paths
- Guest flow controlled by NEXT_PUBLIC_ENABLE_GUEST_FLOW env var (appMode.ts)

## Analysis History
- Full project analysis: `docs/03-analysis/kifu-full-project.analysis.md`
- v1.0 (2026-02-15): Overall 77%
- v1.1 (2026-02-15): Overall 86% after Iteration 1 (5 fixes applied)
- v2.0 (2026-02-16): Overall 88%, 9 categories (3 new). Main drag: Deployment 75%, Remaining Work 45%
