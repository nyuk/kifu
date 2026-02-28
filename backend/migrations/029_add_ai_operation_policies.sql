INSERT INTO admin_policies (key, value, description)
VALUES
	('ai_provider_toggle', 'false'::jsonb, 'Master switch to enable or disable AI provider operations.'),
	('ai_run_telemetry', 'false'::jsonb, 'Enable telemetry capture for AI run execution events.'),
	('ai_local_gateway', 'false'::jsonb, 'Enable local gateway routing for AI provider requests.')
ON CONFLICT (key) DO NOTHING;
