package entities

import (
	"time"

	"github.com/google/uuid"
)

// Provider type constants
const (
	ProviderTypeOpenAI           = "openai"
	ProviderTypeAnthropic        = "anthropic"
	ProviderTypeGoogle           = "google"
	ProviderTypeOpenAICompatible = "openai-compatible"
)

// Default endpoint constants
const (
	EndpointChatCompletions = "chat/completions"
	EndpointResponses       = "responses"
)

// RetryPolicy defines the retry behavior for provider API calls.
type RetryPolicy struct {
	MaxRetries    int `json:"max_retries"`
	BaseBackoffMs int `json:"base_backoff_ms"`
	MaxBackoffMs  int `json:"max_backoff_ms"`
}

// DefaultRetryPolicy returns sensible defaults for production use.
func DefaultRetryPolicy() RetryPolicy {
	return RetryPolicy{
		MaxRetries:    3,
		BaseBackoffMs: 500,
		MaxBackoffMs:  10000,
	}
}

// AIProvider represents a registered AI provider with connection metadata.
type AIProvider struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Model     string    `json:"model"`
	Enabled   bool      `json:"enabled"`
	IsDefault bool      `json:"is_default"`
	CreatedAt time.Time `json:"created_at"`

	// Connection metadata
	ProviderType    string      `json:"provider_type"`    // one of ProviderType* constants
	BaseURL         string      `json:"base_url"`         // e.g., "https://api.openai.com/v1"
	DefaultEndpoint string      `json:"default_endpoint"` // e.g., "chat/completions"
	TimeoutSeconds  int         `json:"timeout_seconds"`  // per-request timeout; 0 = use global default
	RetryPolicy     RetryPolicy `json:"retry_policy"`

	// Feature flags
	ResponsesAPIEnabled bool `json:"responses_api_enabled"` // false = use chat/completions only
}
