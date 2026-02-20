CREATE TABLE IF NOT EXISTS admin_policies (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT NOT NULL DEFAULT '',
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_policies_updated_at_desc
ON admin_policies (updated_at DESC);

INSERT INTO admin_policies (key, value, description)
VALUES
	('admin_user_signup_enabled', 'true'::jsonb, 'Allow admin users to create or invite users from administrative workflows.'),
	('maintenance_mode', 'false'::jsonb, 'When true, non-admin user access to public endpoints is blocked for emergency maintenance.'),
	('notification_delivery_enabled', 'true'::jsonb, 'Global switch to enable notification-related background deliveries.')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description
WHERE admin_policies.description = '';
