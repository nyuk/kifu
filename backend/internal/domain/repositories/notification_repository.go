package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type NotificationChannelRepository interface {
	Upsert(ctx context.Context, channel *entities.NotificationChannel) error
	GetByUserAndType(ctx context.Context, userID uuid.UUID, channelType entities.ChannelType) (*entities.NotificationChannel, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.NotificationChannel, error)
	DeleteByUserAndType(ctx context.Context, userID uuid.UUID, channelType entities.ChannelType) error
	ListVerifiedByUser(ctx context.Context, userID uuid.UUID) ([]*entities.NotificationChannel, error)
}

type TelegramVerifyCodeRepository interface {
	Create(ctx context.Context, code *entities.TelegramVerifyCode) error
	FindValidCode(ctx context.Context, code string) (*entities.TelegramVerifyCode, error)
	MarkUsed(ctx context.Context, id uuid.UUID) error
}
