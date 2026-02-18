> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# 2026-02-19 Submission Checklist (Simple Order)

This checklist is optimized for 2 days before submission.

## 1) Freeze the version

```bash
cd /srv/kifu/kifu
git fetch origin
git pull --ff-only origin main
docker compose -f docker-compose.prod.yml up -d --build --force-recreate backend frontend
docker compose -f docker-compose.prod.yml ps
```

Pass condition:
- backend/frontend/postgres are `Up`.

## 2) Seed guest demo data (if screens look sparse)

```bash
cd /srv/kifu/kifu
./scripts/seed-guest-demo-data.sh
```

Pass condition:
- script prints non-zero counts for trades/bubbles/notes/manual_positions/runs.

## 3) API smoke (5 checks)

1. Health
```bash
curl -i http://127.0.0.1:8080/health
```

2. Guest login
```bash
curl -i -X POST https://kifu.moneyvessel.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"guest.preview@kifu.local","password":"guest1234"}'
```

3. `/users/me`
```bash
ACCESS_TOKEN="<token>"
curl -i -H "Authorization: Bearer ${ACCESS_TOKEN}" https://kifu.moneyvessel.kr/api/v1/users/me
```

4. Latest pack read
```bash
curl -i -H "Authorization: Bearer ${ACCESS_TOKEN}" "https://kifu.moneyvessel.kr/api/v1/packs/latest?range=30d"
```

5. Generate latest pack
```bash
curl -i -X POST "https://kifu.moneyvessel.kr/api/v1/packs/generate-latest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{"range":"30d"}'
```

Pass condition:
- all endpoints respond predictably (200 or expected business 404 such as `PACK_NOT_FOUND`/`NO_COMPLETED_RUN`).

## 4) Submission text source

Use these files as source of truth:
- `SUBMISSION.md`
- `SECURITY_STATUS.md`

## 5) Final presentation flow (2-3 min)

1. landing page
2. guest login
3. home snapshot + one key metric
4. chart/review tab switch
5. summary pack endpoint result (success or expected fallback state)

