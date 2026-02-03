package repositories

import (
	"context"

	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type AIProviderRepository interface {
	ListEnabled(ctx context.Context) ([]*entities.AIProvider, error)
	GetByName(ctx context.Context, name string) (*entities.AIProvider, error)
}
