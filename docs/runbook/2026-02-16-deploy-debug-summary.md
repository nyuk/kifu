# Runbook: Deployment Debug Summary (2026-02-16)

## Issue Summary

During deployment and QA of KIFU (local + production), the following issues were repeatedly observed:

- `/guest` landing loop (home/login/page kept redirecting)
- Guest login inconsistencies (works in curl/local but not in web flow)
- Frontend image build failures in Docker with `npm ci`
- Frontend/backend service orchestration mismatch (wrong compose file used)
- DB startup/relation missing after deploy

This document captures root causes and the final stable resolution.

---

## 1) What happened (timeline + root causes)

### 1.1 Wrong compose file usage (main confusion point)

### Symptom
- `docker-compose up -d --force-recreate` seemed to ignore frontend service.
- Errors like:
  - `no such service: frontend` (when running with default `docker-compose.yml`)
- Unexpected old service state remained.

### Root cause
- There were multiple compose files:
  - `docker-compose.yml` (DB-only for local quick test)
  - `docker-compose.prod.yml` (frontend + backend + postgres)
- Production commands were run against the wrong file.

### Fix
- Standardize on:
  - `docker-compose -f docker-compose.prod.yml ...` (or `docker compose -f ...`)
- `backend`, `frontend`, `postgres` services now built and restarted together from the same file.

---

### 1.2 Frontend Nginx/API proxy behavior mismatch

### Symptom
- In production, API/redirect behavior differed from local.
- `401` and wrong route transitions appeared intermittently.

### Root cause
- Environment variables for API base URL and API proxy path had mixed conventions (`/api`, `:8080`, rewrite/proxy behavior).
- `NEXT_PUBLIC_API_BASE_URL` was inconsistent between local and production.

### Fix
- Explicitly keep `NEXT_PUBLIC_API_BASE_URL` at domain origin only (no backend port).
- Keep Nginx route:
  - `GET /api/*` -> backend container `127.0.0.1:8080`
- Keep frontend app served on its own port/container through compose.

---

### 1.3 `/guest` forced/implicit redirection

### Symptom
- Opening a page would jump back to `/guest` or guest flow unexpectedly.

### Root causes found
- Old/implicit demo gating remained in registration path logic (`components-old/Register.tsx`), e.g. demo-mode auto-redirect to guest preview.
- Redirect logic (`GuestOnly`, `RequireAuth`) and query-based navigation could amplify stale/old bundle behavior.
- Browser cache/CDN could still serve older frontend bundle during rapid redeploys.

### Fixes applied
- Removed demo-mode forced guest branch from register flow.
- Kept explicit `/guest?mode=preview` usage only where intended.
- Made deployment process clean/rebuild to avoid serving stale `.next` artifacts.

---

### 1.4 `npm ci` failed in frontend image build

### Symptom
- Build stopped with:

```
`npm ci` can only install packages when package.json and package-lock.json are in sync
Missing: @playwright/test@1.58.2...
```

### Root cause
- `frontend/package-lock.json` did not match `frontend/package.json`.

### Fix
- Regenerate lockfile in `frontend`:
  - `npm install`
- Commit updated lockfile to repo and redeploy with rebuild.

---

### 1.5 PostgreSQL migration/schema incompleteness (intermittent backend DB errors)

### Symptom
- Backend logs showed missing relations (`exchange_credentials`, `trade_events`, `outcomes`, etc.) after restart/recreate.

### Root cause
- DB container recreated with empty volume or missing migration run in some runs.

### Fix
- Ensure migration set runs after fresh DB or on schema drift.
- Prefer deploy script that ensures DB readiness before service hardening and then migration run.

---

## 2) Final stable configuration (recommended)

### Environment files (root `.env`)

Use one source of truth for Docker runtime:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `NEXT_PUBLIC_APP_MODE=prod`
- `NEXT_PUBLIC_API_BASE_URL=https://kifu.moneyvessel.kr`
- `NEXT_PUBLIC_GUEST_EMAIL=...`
- `NEXT_PUBLIC_GUEST_PASSWORD=...`

Avoid scattering guest env files inside frontend unless explicitly required for local-only dev.

### Compose

- `docker-compose.prod.yml` (backend + frontend + postgres)

---

## 3) Reliable restart commands

### Full redeploy (recommended)

```bash
cd /srv/kifu/kifu
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### Service-only restart

```bash
docker compose -f docker-compose.prod.yml restart backend frontend
```

### Logs check

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=120 backend
docker compose -f docker-compose.prod.yml logs -f --tail=120 frontend
```

---

## 4) Verification checklist after restart

1. backend health:
   - `curl http://127.0.0.1:8080/health`
2. guest login API:
   - `POST /api/v1/auth/login` (from API/Browser) should return token with correct guest credentials.
3. guest session start:
   - `/guest?mode=preview` click should authenticate, then redirect to `/home`.
4. no forced loop:
   - After login, UI should remain on `/home` and not auto-navigate to `/guest`.
5. docker compose service list should include all three services.

---

## 5) Lessons learned (root cause memo)

- Do not mix compose files in production operations.
- Remove stale behavior branches that convert demo mode into guest mode.
- Keep lockfiles synced before CI or docker builds.
- In Next.js deployment, stale artifacts are common after rapid rebuild loops; force-recreate and clean image is the safer recovery path.
- API base URL should align with browser origin/proxy strategy.

