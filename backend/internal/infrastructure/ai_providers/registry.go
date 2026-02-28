package ai_providers

import (
	"fmt"
	"sync"

	"github.com/moneyvessel/kifu/internal/domain/interfaces"
)

// ProviderRegistry implements AIProviderRegistry for managing provider adapters.
type ProviderRegistry struct {
	mu      sync.RWMutex
	clients map[string]interfaces.AIProviderClient
}

// NewProviderRegistry creates a new provider registry with default adapters.
func NewProviderRegistry(httpClientFactory func() interface{}) *ProviderRegistry {
	registry := &ProviderRegistry{
		clients: make(map[string]interfaces.AIProviderClient),
	}

	// Register default adapters
	// Note: httpClientFactory is not used here; callers should pass configured clients
	// This is a simple registry that expects clients to be registered explicitly

	return registry
}

// ClientFor returns the adapter for the given provider type.
func (r *ProviderRegistry) ClientFor(providerType string) (interfaces.AIProviderClient, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	client, ok := r.clients[providerType]
	if !ok {
		return nil, fmt.Errorf("no adapter registered for provider type: %s", providerType)
	}

	return client, nil
}

// RegisterClient registers an adapter for a provider type.
func (r *ProviderRegistry) RegisterClient(providerType string, client interfaces.AIProviderClient) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.clients[providerType] = client
}
