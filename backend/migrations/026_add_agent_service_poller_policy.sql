INSERT INTO admin_policies (key, value, description)
VALUES (
    'agent_service_poller_enabled',
    'true'::jsonb,
    'Master switch for background exchange poller agent service.'
) ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description
WHERE admin_policies.description = '';
