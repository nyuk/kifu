> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# Guest Demo Data Seeding Runbook

Use this runbook when the guest account looks empty or sparse across tabs.

## 1) Goal

Populate a single guest account with richer demo data:
- trades
- bubbles
- AI opinions
- review notes
- manual positions
- one completed run (for Summary Pack generate-latest flow)

## 2) Command (single shot)

From server project root:

```bash
cd /srv/kifu/kifu
chmod +x scripts/seed-guest-demo-data.sh
./scripts/seed-guest-demo-data.sh
```

Defaults:
- `GUEST_EMAIL=guest.preview@kifu.local`
- `GUEST_PASSWORD=guest1234`
- `GUEST_NAME=Guest Preview`
- `RESET_GUEST_DATA=true`

## 3) Optional override

```bash
cd /srv/kifu/kifu
GUEST_EMAIL="guest.preview@kifu.local" \
GUEST_PASSWORD="guest1234" \
GUEST_NAME="Guest Preview" \
RESET_GUEST_DATA=true \
./scripts/seed-guest-demo-data.sh
```

## 4) Verify quickly

### 4-1. Guest login
```bash
curl -i -X POST https://kifu.moneyvessel.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"guest.preview@kifu.local","password":"guest1234"}'
```

### 4-2. Summary Pack endpoint (should avoid NO_COMPLETED_RUN after seed)
```bash
ACCESS_TOKEN="<token>"
curl -i -X POST "https://kifu.moneyvessel.kr/api/v1/packs/generate-latest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{"range":"30d"}'
```

## 5) Notes

- Script uses `docker compose -f docker-compose.prod.yml exec postgres psql`.
- If your deployment uses a different compose file, set:
  - `COMPOSE_FILE=<file>`
- If you want to keep existing guest data, set:
  - `RESET_GUEST_DATA=false`

