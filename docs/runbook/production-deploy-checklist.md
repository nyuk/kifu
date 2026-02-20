> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# Production Deployment Checklist (kifu-project)

Single source runbook for pre/post deployment actions.

## 1) Pre-deploy readiness

### 1-1. Branch and commit check
- Confirm release commit is on `main` (or approved release branch).
- Verify env/secret changes are reflected in deployment settings.

### 1-2. Database backup
```bash
pg_dump "$DATABASE_URL" > /tmp/kifu_prod_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 1-3. Runtime check
```bash
psql "$DATABASE_URL" -c "\conninfo"
```

> Current backend does not guarantee auto-migrate on boot.
> Production migrations must be executed manually.

## 2) Mandatory migrations

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /path/to/kifu-project/backend/migrations/020_guided_review.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /path/to/kifu-project/backend/migrations/021_ai_allowlist.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /path/to/kifu-project/backend/migrations/022_create_runs_and_summary_packs.sql
```

Stop immediately on first failure and review logs.

## 2-1. Migration validation

```bash
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='ai_allowlisted';"
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('runs','summary_packs','guided_reviews','guided_review_items','user_streaks');"
psql "$DATABASE_URL" -c "SELECT COUNT(*) AS runs_count FROM runs;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) AS summary_packs_count FROM summary_packs;"
```

## 3) Environment variables

### Backend required
- `APP_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `KIFU_ENC_KEY`
- `AI_REQUIRE_ALLOWLIST`
- `AI_SERVICE_MONTHLY_CAP`
- `AI_RATE_LIMIT_RPM`
- `AI_RATE_LIMIT_BURST`
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` (as policy)

### Frontend required
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_MODE=prod`
- No demo overrides in production.

## 4) Deploy

### Backend
- Build image / artifact, update env vars, start service.
- Verify `/health`.

### Frontend
- Publish new artifact and confirm API base URL target.

## 5) Post-deploy smoke

### Auth/API baseline
1. `GET /health` returns 200
2. `POST /api/v1/auth/register` (non-prod test)
3. `POST /api/v1/auth/login`
4. `GET /api/v1/users/me`
5. `GET /api/v1/trades/summary`

### Core feature checks
- Candle load
  - `GET /api/v1/market/klines?symbol=BTCUSDT&interval=1d&limit=5`
- Bubble create/list
  - `POST /api/v1/bubbles`
  - `GET /api/v1/bubbles`
- AI error handling and allowlist behavior
- Sync + summary pack flow
  - `/api/v1/packs/generate`
  - `/api/v1/packs/latest?range=30d`
  - `/api/v1/packs/{pack_id}`

### Admin/권한 smoke (add immediately after auth baseline)
- No auth call
  - `GET /api/v1/admin/telemetry` → `401`
- Non-admin token call
  - `GET /api/v1/admin/telemetry` → `403`
- Admin token call
  - `GET /api/v1/admin/telemetry` → `200`
- Admin UI route
  - `GET /admin` should be accessible by admin and blocked/redirected for others

권장 실행 스니펫:
```bash
export API_BASE="http://127.0.0.1:8080"
export ADMIN_JWT="<admin.jwt>"
export NON_ADMIN_JWT="<regular.user.jwt>"

curl -sS "$API_BASE/api/v1/admin/telemetry" -o /tmp/admin_telemetry_unauth.txt -w "%{http_code}\n"
curl -sS -H "Authorization: Bearer $NON_ADMIN_JWT" "$API_BASE/api/v1/admin/telemetry" -o /tmp/admin_telemetry_403.txt -w "%{http_code}\n"
curl -sS -H "Authorization: Bearer $ADMIN_JWT" "$API_BASE/api/v1/admin/telemetry" -o /tmp/admin_telemetry_200.txt -w "%{http_code}\n"
```

### Example
```bash
curl -sS -X POST "http://<BACKEND_HOST>/api/v1/packs/generate" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"source_run_id":"<run-uuid>","range":"30d"}'
```

### Frontend smoke
- Landing/Login/Home and main tabs render.
- Home/Chart/Review/Portfolio tabs are accessible.

## 6) First-hour monitoring

- Error rate and 5xx count
- DB connection and CPU/memory
- API p95 latency
- AI quota/rate-limit warning

## 7) Rollback triggers

- `/health` remains failing
- Migration failure prevents startup
- Critical API 5xx surge with user impact
- Critical UI failures in Home/Chart/Review

Rollback options:
1. Re-deploy previous stable release
2. Temporary guard on `AI_REQUIRE_ALLOWLIST` and AI rate limit
3. Force `NEXT_PUBLIC_APP_MODE`
4. Re-run verification before re-release

## 8) Copy checklist

- [ ] DB backup completed
- [ ] Migrations executed
- [ ] Migration checks passed
- [ ] Env vars confirmed
- [ ] API smoke passed
- [ ] UI flows rendered
- [ ] Admin route smoke passed (401/403/200)
- [ ] 1-hour monitor check complete
- [ ] Rollback plan communicated
