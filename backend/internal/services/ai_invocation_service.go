package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/interfaces"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

// AIInvocationService handles unified AI provider invocation using the common abstraction layer.
// It replaces hardcoded provider branching with a registry-based approach.
type AIInvocationService struct {
	providerRepo       repositories.AIProviderRepository
	credentialResolver *AICredentialResolver
	registry           interfaces.AIProviderRegistry
}

func NewAIInvocationService(
	providerRepo repositories.AIProviderRepository,
	credentialResolver *AICredentialResolver,
	registry interfaces.AIProviderRegistry,
) *AIInvocationService {
	return &AIInvocationService{
		providerRepo:       providerRepo,
		credentialResolver: credentialResolver,
		registry:           registry,
	}
}

// InvokeProvider calls an AI provider using the unified abstraction layer.
// It handles:
// 1. Provider lookup and validation
// 2. Credential resolution (user key → system key)
// 3. Adapter selection from registry
// 4. Invocation with error normalization
func (s *AIInvocationService) InvokeProvider(
	ctx context.Context,
	userID uuid.UUID,
	providerName string,
	model string,
	messages []interfaces.AIMessage,
	options *interfaces.AIInvocationOption,
) (*interfaces.AIInvocationResult, error) {
	// Step 1: Resolve provider config
	provider, err := s.providerRepo.GetByName(ctx, providerName)
	if err != nil {
		return nil, fmt.Errorf("provider lookup failed: %w", err)
	}
	if provider == nil || !provider.Enabled {
		return nil, fmt.Errorf("provider not enabled: %s", providerName)
	}

	// Step 2: Resolve credential
	credential, err := s.credentialResolver.ResolveCredential(ctx, userID, providerName)
	if err != nil {
		return nil, fmt.Errorf("credential resolution failed: %w", err)
	}
	if credential == "" {
		return nil, fmt.Errorf("no API key configured for provider: %s", providerName)
	}

	// Step 3: Get adapter from registry
	adapter, err := s.registry.ClientFor(provider.ProviderType)
	if err != nil {
		return nil, fmt.Errorf("adapter not found for provider type: %s", provider.ProviderType)
	}

	// Step 4: Build invocation
	invocation := &interfaces.AIInvocation{
		Provider: provider,
		Model:    model,
		Messages: messages,
	}
	if options != nil {
		invocation.Options = *options
	}

	// Step 5: Invoke and return result
	result, err := adapter.Invoke(ctx, invocation)
	if err != nil {
		return nil, fmt.Errorf("provider invocation failed: %w", err)
	}

	return result, nil
}

// UsesServiceKey checks if the given credential is a service-managed key
func (s *AIInvocationService) UsesServiceKey(providerName string, credential string) bool {
	return s.credentialResolver.UsesServiceKey(providerName, credential)
}
