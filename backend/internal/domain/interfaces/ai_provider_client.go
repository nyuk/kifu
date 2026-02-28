package interfaces

import (
	"context"

	"github.com/moneyvessel/kifu/internal/domain/entities"
)

// AIMessage represents a single message in a chat-style invocation.
type AIMessage struct {
	Role    string `json:"role"` // "system", "user", "assistant"
	Content string `json:"content"`
}

// AIInvocationOption allows callers to override provider defaults per-call.
type AIInvocationOption struct {
	Temperature *float64 `json:"temperature,omitempty"`
	MaxTokens   *int     `json:"max_tokens,omitempty"`
	TopP        *float64 `json:"top_p,omitempty"`
	StopSeqs    []string `json:"stop,omitempty"`
}

// AIInvocation represents a request to an AI provider.
// It is provider-agnostic; the adapter translates it into the wire format.
type AIInvocation struct {
	// Provider resolution
	Provider *entities.AIProvider `json:"-"` // resolved provider config
	Model    string               `json:"model"`
	Endpoint string               `json:"endpoint"` // override; empty = use provider default
	// Credential is resolved by service layer and injected into provider adapters.
	// It must be treated as sensitive and never logged.
	Credential string `json:"-"`

	// Payload (chat/completions style — the lingua franca)
	Messages []AIMessage `json:"messages"`

	// Optional overrides
	Options AIInvocationOption `json:"options,omitempty"`
}

// DefaultEndpoint returns the effective endpoint for this invocation,
// falling back to the provider's default, then to chat/completions.
func (inv *AIInvocation) DefaultEndpoint() string {
	if inv.Endpoint != "" {
		return inv.Endpoint
	}
	if inv.Provider != nil && inv.Provider.DefaultEndpoint != "" {
		return inv.Provider.DefaultEndpoint
	}
	return entities.EndpointChatCompletions
}

// AIInvocationResult represents the response from an AI provider call.
type AIInvocationResult struct {
	Content      string `json:"content"`
	Model        string `json:"model"`
	TokensUsed   int    `json:"tokens_used"`
	FinishReason string `json:"finish_reason"` // "stop", "length", "content_filter", etc.

	// PromptTokens and CompletionTokens provide granular usage when available.
	PromptTokens     int `json:"prompt_tokens,omitempty"`
	CompletionTokens int `json:"completion_tokens,omitempty"`

	// RawResponse holds the original JSON for debugging/audit.
	RawResponse []byte `json:"-"`
}

// AIProviderClient is the domain-level contract for calling any AI provider.
//
// Implementations live in infrastructure/; the domain only depends on this interface.
// Each provider adapter (OpenAI, Anthropic, Google, local-compatible) implements
// this interface and translates AIInvocation into the provider's wire format.
//
// Design decisions:
//   - chat/completions is the canonical message format.
//   - Responses API is opt-in per provider (ResponsesAPIEnabled flag).
//   - Credential resolution is the adapter's responsibility (via UserAIKey lookup).
//   - Retry/backoff follows the provider's RetryPolicy; callers should not retry.
type AIProviderClient interface {
	// Invoke sends a chat-style request to the AI provider and returns the result.
	// The adapter is responsible for:
	//   1. Resolving credentials (API key from UserAIKey or env)
	//   2. Building the HTTP request for the provider's API
	//   3. Applying timeout and retry policy from the provider config
	//   4. Parsing the response into AIInvocationResult
	//
	// Errors returned should be unwrappable to determine retryability.
	Invoke(ctx context.Context, invocation *AIInvocation) (*AIInvocationResult, error)

	// Validate checks that the provider configuration and credentials are usable.
	// This is a lightweight health check (e.g., list-models call or auth ping).
	Validate(ctx context.Context, provider *entities.AIProvider) error

	// ProviderType returns the provider type constant this adapter handles.
	ProviderType() string
}

// AIProviderRegistry resolves the correct AIProviderClient for a given provider.
//
// Usage: registry.ClientFor("openai") → *OpenAIClient
type AIProviderRegistry interface {
	// ClientFor returns the adapter for the given provider type.
	// Returns an error if no adapter is registered for that type.
	ClientFor(providerType string) (AIProviderClient, error)

	// RegisterClient registers an adapter for a provider type.
	// Duplicate registrations overwrite the previous adapter.
	RegisterClient(providerType string, client AIProviderClient)
}
