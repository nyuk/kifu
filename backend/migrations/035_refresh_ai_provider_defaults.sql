UPDATE ai_providers
SET
  model = 'gemini-2.5-flash',
  provider_type = 'google',
  base_url = 'https://generativelanguage.googleapis.com/v1beta',
  default_endpoint = 'generateContent',
  responses_api_enabled = false
WHERE lower(name) = 'gemini';

UPDATE ai_providers
SET
  provider_type = 'anthropic',
  base_url = 'https://api.anthropic.com/v1',
  default_endpoint = 'messages',
  responses_api_enabled = false
WHERE lower(name) = 'claude';
