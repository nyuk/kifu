package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type RefreshTokenRepository interface {
	Create(ctx context.Context, token *entities.RefreshToken) error
	GetByTokenHash(ctx context.Context, tokenHash string) (*entities.RefreshToken, error)
	Update(ctx context.Context, token *entities.RefreshToken) error
	RevokeAllUserTokens(ctx context.Context, userID uuid.UUID, reason string) error
	Delete(ctx context.Context, id uuid.UUID) error
}
