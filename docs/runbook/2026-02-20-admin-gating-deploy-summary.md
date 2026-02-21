# 2026-02-20 Admin Gating & Guest Simulation Visibility Rollout

## Scope
- Admin access controls and simulator exposure policies
- Guest-mode simulation visibility suppression
- DB migration for admin flags
- Docker compose operational restart and validation

## Code changes included
- `82bdaac` (feat): admin gatekeeper and simulator exposure policy
  - `/api/v1/admin/*` server-side admin guard
  - `is_admin` propagation in user profile and JWT claims
  - social login/account-help scaffolding + admin dashboard/agent pages
  - DB migration file added: `backend/migrations/023_add_is_admin_to_users.sql`
  - roadmap/todo updates
- `0799533` (fix): harden guest-mode suppression for simulator access
  - stronger guest suppression in `Settings` and `Shell`
  - front-side admin guard (`RequireAdmin`) now blocks guest email users even with stale flags
  - guest email utility added (`isGuestEmail`) in `frontend/src/lib/guestSession.ts`

## Deployment commands executed
```bash
cd /srv/kifu/kifu

docker compose -f docker-compose.yml -f docker-compose.prod.yml config --services
# expected output: postgres / backend / frontend

docker compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --remove-orphans --force-recreate

docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

### Post-change checklist (operational hardening)
- `docker compose -f docker-compose.yml -f docker-compose.prod.yml` must be used in production environments to include backend/frontend service definitions.
- Confirm migration status (`023_add_is_admin_to_users.sql`, `025_add_admin_policies.sql`, `026_add_agent_service_poller_policy.sql`) before restarting backend.
- Confirm `/api/v1/admin/telemetry` and `/api/v1/admin/agent-services` are reachable with admin token.

## Database migration executed
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres psql -U kifu -d kifu < backend/migrations/023_add_is_admin_to_users.sql

docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres psql -U kifu -d kifu -c "\d users"
```

### Expected schema result
- `users` table contains `is_admin BOOLEAN NOT NULL DEFAULT false`
- `idx_users_is_admin_true` exists

## Runtime checks performed
- Guest session path verification
  - 로그인 as guest: 30일 사용자 시뮬레이터 비노출 확인
- Admin gate verification checklist
  - `/settings`에서 `isAdmin`/`guest` 조건으로 시뮬레이터 카드 표시 제어
  - `/admin*` 접근은 프론트/백엔드 경유 가드 적용 상태로 검증 계획
- API identity check
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres psql -U kifu -d kifu -c "SELECT email, is_admin FROM users WHERE is_admin = true;"
```

### Production verification matrix (runtime)

`/admin` 접근 제한은 프론트/백엔드 모두에서 동작해야 합니다.
예시:
```bash
export API_BASE="http://127.0.0.1:8080"
export ADMIN_JWT="<admin.jwt>"
export NON_ADMIN_JWT="<non-admin.jwt>"
```

1) No auth (`401` expected)
```bash
curl -sS -o /tmp/admin_telemetry_noauth.txt -w "%{http_code}\n" \
  "$API_BASE/api/v1/admin/telemetry"
```
Expect: `401`

2) Non-admin authenticated user (`403` expected)
```bash
curl -sS -X GET -H "Authorization: Bearer $NON_ADMIN_JWT" \
  -o /tmp/admin_telemetry_nonadmin.txt -w "%{http_code}\n" \
  "$API_BASE/api/v1/admin/telemetry"
```
Expect: `403` and body contains `admin access required`.

3) Admin authenticated user (`200` expected)
```bash
curl -sS -X GET -H "Authorization: Bearer $ADMIN_JWT" \
  -o /tmp/admin_telemetry_admin.json -w "%{http_code}\n" \
  "$API_BASE/api/v1/admin/telemetry"
```
Expect: `200` and telemetry payload.

4) Frontend route gate
- `GET /admin` with guest login should redirect to `/home`.
- `GET /admin` with admin login should return admin workspace page.
- `/home` settings card: 30일 시뮬레이터 노출 should be hidden when `is_admin=false` and guest session.

### Admin account operation playbook (production)

DB 기준으로 `users.is_admin` 플래그를 운영자 계정으로 설정해야 합니다.

1) Promote account:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "UPDATE users SET is_admin = true WHERE lower(email) = lower('admin@example.com');"
```

2) Verify:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT email, is_admin FROM users WHERE lower(email) = lower('admin@example.com');"
```

3) Revoke later if needed:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "UPDATE users SET is_admin = false WHERE lower(email) = lower('admin@example.com');"
```

### Authority design clarification (권한 기준)
- Current behavior: DB `users.is_admin` is the source of truth for `/admin/*` access (request-level DB gate).
- Request path now uses centralized middleware `middleware.RequireAdmin`, and frontend guard uses `/v1/users/me.is_admin` for admin-only route checks.
- JWT `role` remains emitted as legacy metadata (`admin` string) and is intentionally not used for access decisions.
- Status: 기준 단일화 완료 (DB `is_admin`).

## Known caveat handled
- 기존 `docker compose` 실행 시 `docker-compose.yml`만 쓰면 서비스가 `postgres`만 보여 `backend/frontend`가 안 올라오는 현상
- 병합 파일을 항상 지정해야 함 (`-f docker-compose.yml -f docker-compose.prod.yml`)

## Commit history
- `82bdaac`
- `0799533`
