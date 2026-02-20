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

## Known caveat handled
- 기존 `docker compose` 실행 시 `docker-compose.yml`만 쓰면 서비스가 `postgres`만 보여 `backend/frontend`가 안 올라오는 현상
- 병합 파일을 항상 지정해야 함 (`-f docker-compose.yml -f docker-compose.prod.yml`)

## Commit history
- `82bdaac`
- `0799533`
