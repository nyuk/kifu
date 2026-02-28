package handlers

import "testing"

func TestAllowedAdminPolicyKeysIncludesNewAIKeys(t *testing.T) {
	t.Parallel()

	keys := []string{
		"ai_provider_toggle",
		"ai_run_telemetry",
		"ai_local_gateway",
	}

	for _, key := range keys {
		if _, ok := allowedAdminPolicyKeys[key]; !ok {
			t.Fatalf("key=%q should be in allowedAdminPolicyKeys", key)
		}
	}
}

func TestAllowedAdminPolicyKeysRejectsUnknownKey(t *testing.T) {
	t.Parallel()

	if _, ok := allowedAdminPolicyKeys["bad_key"]; ok {
		t.Fatal("bad_key should not be in allowedAdminPolicyKeys")
	}
}
