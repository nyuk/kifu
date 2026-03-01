# AI Agent Operations Deployment Checklist

> Covers deployment of Tasks 1-14 (AI Agent Operations Expansion).
> Commit range: `5789ce6..a93c628` on `main`.

## Pre-Deploy

- [ ] `git pull origin main` on VPS
- [ ] Verify `.env` has all required vars (JWT_SECRET, DATABASE_URL, OPENAI_API_KEY, etc.)
- [ ] Review `docker-compose.prod.yml` — no changes needed for this deployment

## Database Migrations (REQUIRED — not auto-run)

Run migrations 022-030 **before** restarting the backend.

```bash
# Connect to the production PostgreSQL container
docker exec -i kifu-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" << 'SQL'

-- Migration 022: Create runs and summary_packs tables
-- (skip if tables already exist from earlier deployment)

-- Migration 023: Add is_admin to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_is_admin_true ON users (is_admin) WHERE is_admin = true;

-- Migration 024: Add admin_audit_logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    action_target TEXT NOT NULL DEFAULT 'user',
    action_resource TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at_desc ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_user_id ON admin_audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON admin_audit_logs (target_user_id);

-- Migration 025: Add admin_policies
CREATE TABLE IF NOT EXISTS admin_policies (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT NOT NULL DEFAULT '',
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_policies_updated_at_desc ON admin_policies (updated_at DESC);
INSERT INTO admin_policies (key, value, description) VALUES
    ('admin_user_signup_enabled', 'true'::jsonb, 'Allow admin users to create or invite users from administrative workflows.'),
    ('maintenance_mode', 'false'::jsonb, 'When true, non-admin user access to public endpoints is blocked for emergency maintenance.'),
    ('notification_delivery_enabled', 'true'::jsonb, 'Global switch to enable notification-related background deliveries.')
ON CONFLICT (key) DO NOTHING;

-- Migration 026: Add agent_service_poller_policy
INSERT INTO admin_policies (key, value, description) VALUES
    ('agent_service_poller_enabled', 'true'::jsonb, 'Master switch for background exchange poller agent service.')
ON CONFLICT (key) DO NOTHING;

-- Migration 027: Add user_identities and password_set
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id),
    UNIQUE (user_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_identities_provider_email ON user_identities(provider, email);

-- Migration 028: Extend ai_providers
ALTER TABLE ai_providers
ADD COLUMN IF NOT EXISTS provider_type VARCHAR(50) DEFAULT 'openai-compatible',
ADD COLUMN IF NOT EXISTS base_url VARCHAR(255) DEFAULT 'https://api.openai.com/v1',
ADD COLUMN IF NOT EXISTS default_endpoint VARCHAR(100) DEFAULT 'chat/completions',
ADD COLUMN IF NOT EXISTS timeout_seconds INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_policy JSONB DEFAULT '{"max_retries": 3, "base_backoff_ms": 500, "max_backoff_ms": 10000}',
ADD COLUMN IF NOT EXISTS responses_api_enabled BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_ai_providers_enabled_default ON ai_providers(enabled, is_default);

-- Migration 029: Add AI operation policies
INSERT INTO admin_policies (key, value, description) VALUES
    ('ai_provider_toggle', 'false'::jsonb, 'Master switch to enable or disable AI provider operations.'),
    ('ai_run_telemetry', 'false'::jsonb, 'Enable telemetry capture for AI run execution events.'),
    ('ai_local_gateway', 'false'::jsonb, 'Enable local gateway routing for AI provider requests.')
ON CONFLICT (key) DO NOTHING;

-- Migration 030: Create domain_contexts
CREATE TABLE IF NOT EXISTS domain_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope VARCHAR(50) NOT NULL,
    domain VARCHAR(50) NOT NULL DEFAULT 'kifu',
    version VARCHAR(20) NOT NULL DEFAULT 'v1',
    owner_id UUID NOT NULL REFERENCES users(id),
    context JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_domain_contexts_owner_scope ON domain_contexts (owner_id, scope);

SQL
```

## Deploy Backend

```bash
cd /srv/kifu/kifu
git pull origin main
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
```

## Deploy Frontend

```bash
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d --force-recreate frontend
```

## Post-Deploy Verification

```bash
# 1. Health check
curl http://127.0.0.1:8080/health

# 2. Backend logs — no panic/crash
docker logs kifu-backend --tail 50

# 3. Admin endpoint smoke (requires admin JWT)
# Login as admin and test:
curl -sS -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:8080/api/v1/admin/policies
curl -sS -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:8080/api/v1/admin/agent-services
curl -sS -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:8080/api/v1/admin/telemetry

# 4. Full endpoint verification script
API_BASE="http://127.0.0.1:8080/api/v1" TOKEN="<jwt>" bash .sisyphus/scripts/verify-all-endpoints.sh
```

## Admin User Setup

To promote a user to admin:

```sql
UPDATE users SET is_admin = true WHERE email = '<admin-email>';
```

## Rollback

See `.sisyphus/docs/rollback-playbook.md` for 3-layer rollback procedures.

## Monitoring

See `.sisyphus/docs/monitoring-thresholds.md` for alert thresholds and queries.
