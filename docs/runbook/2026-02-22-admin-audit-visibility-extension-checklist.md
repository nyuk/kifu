# 2026-02-22 Admin Audit Visibility Extension Checklist

## Scope
- Admin dashboard audit summary UI enhancements
- Audit logs highlighting and quick filtering in admin workspace
- Admin route visibility/documentation consistency update for the deployment

## 1) Code/commit baseline
- Branch: `main`
- Required commits (already included):
  - `0fcd744` feat(admin): enrich dashboard audit summary and log highlights
  - `9e42317` feat(admin): add quick filters to audit logs
  - `dfd72cf` docs: summarize admin audit visibility expansion

Check:
```bash
git log --oneline --max-count=5
```

## 2) Backend/API precheck
Run in order to ensure admin endpoints are reachable in target environment:
```bash
curl -sS -o /tmp/health.txt -w "%{http_code}\n" "$API_BASE/api/health"
curl -sS -o /tmp/admin_telemetry_noauth.txt -w "%{http_code}\n" \
  "$API_BASE/api/v1/admin/telemetry"
```

Expected:
- `GET /api/health` → `200`
- `GET /api/v1/admin/telemetry` (no auth) → `401`

## 3) Admin 권한 상태
Ensure DB `users.is_admin` is the real authority source.

PostgreSQL check:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT email, is_admin FROM users WHERE is_admin = true ORDER BY updated_at DESC;"
```

Promote target admin for test:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "UPDATE users SET is_admin = true WHERE lower(email) = lower('<admin-email>');"
```

## 4) Admin API smoke
Export token variables then verify:
```bash
export API_BASE="http://<BACKEND_HOST>"
export ADMIN_JWT="<admin.jwt>"
export NON_ADMIN_JWT="<non_admin.jwt>"

curl -sS -o /tmp/admin_telemetry_403.txt -w "%{http_code}\n" \
  -H "Authorization: Bearer $NON_ADMIN_JWT" \
  "$API_BASE/api/v1/admin/telemetry"

curl -sS -o /tmp/admin_audit_200.txt -w "%{http_code}\n" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  "$API_BASE/api/v1/admin/audit-logs?limit=25&offset=0"
```

Expected:
- non-admin token: `403`
- admin token: `200`
- admin audit logs payload contains `logs` array and `total`

## 5) Admin UI checks (frontend)
1) Login as admin and open:
- `/admin`
  - Verify section: `최근 감사 로그 요약`
  - Verify top summary rows appear (Top 액션/대상/액터) when logs exist
  - Verify log rows show action/resource pills
2) Open:
- `/admin/audit-logs`
  - Verify quick chips: 액션(`권한 변경`, `정책 변경`) and resource (`user`, `policy`, `admin`)
  - Verify chip toggle behavior works (click to apply/remove)
  - Verify highlighted rows are visually distinguishable

Example smoke:
```bash
curl -sS -o /tmp/admin_route.txt -w "%{http_code}\n" \
  -H "Cookie: <cookie-from-admin-browser-session>" \
  "$FRONTEND_BASE/admin/audit-logs"
```

> Prefer browser/manual verification for UI checks because chip interactions are client-side rendered.

## 6) Migration/docs consistency (no code migration required for this rollout)
- Validate docs:
  - `docs/todo.md` has completed admin audit visibility items
  - `docs/roadmap.md` reflects the implemented audit enhancements
  - `docs/04-report/features/2026-02-22-admin-audit-visibility-extension.md` added and accurate

Command:
```bash
rg -n "audit log|관리자 대시보드 상세|quick filters|0fcd744|9e42317|dfd72cf" docs/todo.md docs/roadmap.md docs/04-report/features/2026-02-22-admin-audit-visibility-extension.md
```

## 7) Rollback plan
- Revert only UI commit first (`9e42317`) to disable quick filters if filter UX blocks operations.
- Keep dashboard summary commit (`0fcd744`) if rollback needs minimal scope, then re-evaluate.
- If regression is severe, rollback both UI commits and redeploy backend unchanged.

Rollback commands:
```bash
git revert --no-edit 9e42317
git revert --no-edit 0fcd744
git revert --no-edit dfd72cf
```

## 8) Completion checklist
- [ ] API smoke checks passed (health/admin telemetry/audit logs)
- [ ] Admin role enforcement verified (401/403/200)
- [ ] `/admin` summary panel rendered
- [ ] `/admin/audit-logs` quick filter interactions validated
- [ ] Documentation cross-refs updated
- [ ] Deployment approved
