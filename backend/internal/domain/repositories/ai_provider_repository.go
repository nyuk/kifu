package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type AIProviderRepository interface {
	// ListEnabled returns all enabled providers
	ListEnabled(ctx context.Context) ([]*entities.AIProvider, error)

	// GetByName retrieves a provider by name
	GetByName(ctx context.Context, name string) (*entities.AIProvider, error)

	// GetByID retrieves a provider by UUID
	GetByID(ctx context.Context, id uuid.UUID) (*entities.AIProvider, error)

	// GetDefault returns the system default provider
	GetDefault(ctx context.Context) (*entities.AIProvider, error)

	// ListActive returns all active (enabled) providers with full metadata
	ListActive(ctx context.Context) ([]*entities.AIProvider, error)

	// ValidatePolicy checks if a provider is allowed for the given user
	ValidatePolicy(ctx context.Context, userID uuid.UUID, providerName string) (bool, error)
}
