# AI Agent Operations — Rollback Playbook

> Covers rollback procedures for Tasks 1-14 of the AI Agent Operations Expansion.
> Each layer can be rolled back independently without affecting the others.

## Architecture: 3-Layer Guard

```
┌─────────────────────────┐
│  Layer 1: Policy Keys   │  ← admin_policies table toggles
│  (database flags)       │
├─────────────────────────┤
│  Layer 2: Run Tracking  │  ← run rows with type/status
│  (data layer)           │
├─────────────────────────┤
│  Layer 3: Provider Code │  ← Go services + frontend UI
│  (application layer)    │
└─────────────────────────┘
```

Rollback proceeds **top-down**: disable policy first, then stop runs, then revert code if needed.

---

## Layer 1: Policy Rollback (Instant, No Downtime)

**Scope**: Disable AI features via admin policy toggles.

### Steps

1. Navigate to **Admin → Policies** (`/admin/policies`).
2. Set these policy keys to `false` / disabled:

   | Policy Key | Effect When Disabled |
   |---|---|
   | `ai_summary_enabled` | Blocks on-demand summary generation |
   | `ai_opinion_enabled` | Blocks AI opinion requests |
   | `ai_marketing_pilot_enabled` | Blocks marketing pilot approval |

3. Verify: `GET /api/v1/admin/policies` — confirm values are `false`.

**Rollback time**: < 1 minute. No restart needed.

### SQL Fallback (if UI is unreachable)

```sql
UPDATE admin_policies
SET value = 'false', updated_at = NOW()
WHERE key IN ('ai_summary_enabled', 'ai_opinion_enabled', 'ai_marketing_pilot_enabled');
```

---

## Layer 2: Run Data Rollback

**Scope**: Cancel/clean up problematic run records.

### Cancel Active Runs

```sql
-- Mark all active AI-related runs as cancelled
UPDATE runs
SET status = 'cancelled', finished_at = NOW()
WHERE status IN ('pending', 'running')
  AND run_type IN ('summary_ondemand', 'ai_opinion');
```

### Verify No Stuck Runs

```sql
SELECT run_type, status, COUNT(*)
FROM runs
WHERE run_type IN ('summary_ondemand', 'ai_opinion')
GROUP BY run_type, status;
```

Expected: no rows with `pending` or `running` status.

---

## Layer 3: Code Rollback

**Scope**: Revert application code to pre-expansion state.

### Option A: Git Revert (Preferred)

```bash
# Identify the commit range to revert
git log --oneline 5789ce6..HEAD

# Revert all AI expansion commits (adjust SHAs as needed)
git revert --no-commit HEAD~N..HEAD
git commit -m "revert(ai): rollback AI agent operations expansion"

# Redeploy
cd /srv/kifu/kifu
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
```

### Option B: Hard Reset (Emergency Only)

```bash
# Reset to last known good commit
git reset --hard 5789ce6

# Force push (DANGEROUS — coordinate with team)
git push --force-with-lease origin main

# Redeploy
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### Migration Rollback

If database migrations need reverting:

```sql
-- Reverse migration 030 (domain_contexts table)
DROP TABLE IF EXISTS domain_contexts;

-- Reverse migration 029 (AI policy seed rows)
DELETE FROM admin_policies
WHERE key IN ('ai_summary_enabled', 'ai_opinion_enabled', 'ai_marketing_pilot_enabled');
```

---

## Layer Verification After Rollback

Run the verification script to confirm system health:

```bash
API_BASE="http://127.0.0.1:8080/api/v1" TOKEN="<jwt>" \
  bash .sisyphus/scripts/verify-all-endpoints.sh
```

### Manual Checks

1. **Health**: `curl http://127.0.0.1:8080/health` → `{"status":"healthy"}`
2. **Admin UI**: Load `/admin/agent-services` — should render without errors
3. **Pack generation**: `POST /api/v1/packs/generate-latest` — should function or return policy-disabled error
4. **Logs**: `docker logs kifu-backend --tail 100` — no panic/crash loops

---

## Decision Matrix

| Symptom | Recommended Action |
|---|---|
| AI opinion quality degraded | Layer 1: disable `ai_opinion_enabled` |
| Summary generation timeout | Layer 1: disable `ai_summary_enabled` |
| Run table growing unbounded | Layer 2: cancel active runs + investigate |
| 500 errors from AI endpoints | Layer 1 first, then Layer 3 if persists |
| Frontend rendering broken | Layer 3: git revert frontend changes |
| Database migration issues | Layer 3: run migration rollback SQL |
| Complete system failure | Layer 3 Option B: hard reset to `5789ce6` |

---

## Contacts & Escalation

- **On-call**: Check internal Telegram channel
- **Logs**: `docker logs kifu-backend --tail 200`
- **Metrics**: Admin → Telemetry (`/admin/telemetry`)
- **Last known good**: commit `5789ce6` on `main`
