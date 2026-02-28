package services

import (
	"context"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	cryptoutil "github.com/moneyvessel/kifu/internal/infrastructure/crypto"
)

// AICredentialResolver handles credential resolution with priority logic:
// 1. User-provided API key (highest priority)
// 2. User's default provider override (if set)
// 3. System environment variable (lowest priority)
type AICredentialResolver struct {
	userAIKeyRepo repositories.UserAIKeyRepository
	providerRepo  repositories.AIProviderRepository
	encryptionKey []byte
}

func NewAICredentialResolver(
	userAIKeyRepo repositories.UserAIKeyRepository,
	providerRepo repositories.AIProviderRepository,
	encryptionKey []byte,
) *AICredentialResolver {
	return &AICredentialResolver{
		userAIKeyRepo: userAIKeyRepo,
		providerRepo:  providerRepo,
		encryptionKey: encryptionKey,
	}
}

// ResolveCredential resolves the API key for a provider with priority:
// 1. User-provided key for the provider
// 2. System environment variable for the provider
// Returns empty string if no credential is found
func (r *AICredentialResolver) ResolveCredential(ctx context.Context, userID uuid.UUID, providerName string) (string, error) {
	// Priority 1: User-provided API key
	userKey, err := r.userAIKeyRepo.GetByUserAndProvider(ctx, userID, providerName)
	if err != nil {
		return "", err
	}
	if userKey != nil && userKey.APIKeyEnc != "" {
		decrypted, err := cryptoutil.Decrypt(userKey.APIKeyEnc, r.encryptionKey)
		if err == nil && decrypted != "" {
			return decrypted, nil
		}
	}

	// Priority 2: System environment variable
	return r.getSystemCredential(providerName), nil
}

// getSystemCredential retrieves the system-level API key from environment variables
func (r *AICredentialResolver) getSystemCredential(providerName string) string {
	switch strings.ToLower(strings.TrimSpace(providerName)) {
	case "openai":
		return strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	case "claude", "anthropic":
		return strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY"))
	case "gemini", "google":
		return strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	default:
		return ""
	}
}

// UsesServiceKey checks if the provided key is a service-managed key (from environment)
// rather than a user-provided key
func (r *AICredentialResolver) UsesServiceKey(providerName string, key string) bool {
	if key == "" {
		return false
	}
	return r.getSystemCredential(providerName) == key
}
