package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type UserRepository interface {
	Create(ctx context.Context, user *entities.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.User, error)
	GetByEmail(ctx context.Context, email string) (*entities.User, error)
	ListForAdmin(ctx context.Context, limit int, offset int, search string) ([]*entities.User, error)
	CountForAdmin(ctx context.Context, search string) (int, error)
	SetAdmin(ctx context.Context, id uuid.UUID, isAdmin bool) error
	Update(ctx context.Context, user *entities.User) error
	Delete(ctx context.Context, id uuid.UUID) error
}
