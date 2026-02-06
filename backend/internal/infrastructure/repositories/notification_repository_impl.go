package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

// --- NotificationChannel ---

type NotificationChannelRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewNotificationChannelRepository(pool *pgxpool.Pool) repositories.NotificationChannelRepository {
	return &NotificationChannelRepositoryImpl{pool: pool}
}

func (r *NotificationChannelRepositoryImpl) Upsert(ctx context.Context, ch *entities.NotificationChannel) error {
	query := `
		INSERT INTO notification_channels (id, user_id, channel_type, config, enabled, verified, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id, channel_type) DO UPDATE SET config = $4, enabled = $5, verified = $6
	`
	_, err := r.pool.Exec(ctx, query,
		ch.ID, ch.UserID, ch.ChannelType, ch.Config, ch.Enabled, ch.Verified, ch.CreatedAt)
	return err
}

func (r *NotificationChannelRepositoryImpl) GetByUserAndType(ctx context.Context, userID uuid.UUID, channelType entities.ChannelType) (*entities.NotificationChannel, error) {
	query := `
		SELECT id, user_id, channel_type, config, enabled, verified, created_at
		FROM notification_channels WHERE user_id = $1 AND channel_type = $2
	`
	var ch entities.NotificationChannel
	err := r.pool.QueryRow(ctx, query, userID, channelType).Scan(
		&ch.ID, &ch.UserID, &ch.ChannelType, &ch.Config, &ch.Enabled, &ch.Verified, &ch.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &ch, nil
}

func (r *NotificationChannelRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.NotificationChannel, error) {
	query := `
		SELECT id, user_id, channel_type, config, enabled, verified, created_at
		FROM notification_channels WHERE user_id = $1
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []*entities.NotificationChannel
	for rows.Next() {
		var ch entities.NotificationChannel
		if err := rows.Scan(&ch.ID, &ch.UserID, &ch.ChannelType, &ch.Config, &ch.Enabled, &ch.Verified, &ch.CreatedAt); err != nil {
			return nil, err
		}
		channels = append(channels, &ch)
	}
	return channels, rows.Err()
}

func (r *NotificationChannelRepositoryImpl) DeleteByUserAndType(ctx context.Context, userID uuid.UUID, channelType entities.ChannelType) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM notification_channels WHERE user_id = $1 AND channel_type = $2`, userID, channelType)
	return err
}

func (r *NotificationChannelRepositoryImpl) ListVerifiedByUser(ctx context.Context, userID uuid.UUID) ([]*entities.NotificationChannel, error) {
	query := `
		SELECT id, user_id, channel_type, config, enabled, verified, created_at
		FROM notification_channels WHERE user_id = $1 AND enabled = true AND verified = true
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []*entities.NotificationChannel
	for rows.Next() {
		var ch entities.NotificationChannel
		if err := rows.Scan(&ch.ID, &ch.UserID, &ch.ChannelType, &ch.Config, &ch.Enabled, &ch.Verified, &ch.CreatedAt); err != nil {
			return nil, err
		}
		channels = append(channels, &ch)
	}
	return channels, rows.Err()
}

// --- TelegramVerifyCode ---

type TelegramVerifyCodeRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewTelegramVerifyCodeRepository(pool *pgxpool.Pool) repositories.TelegramVerifyCodeRepository {
	return &TelegramVerifyCodeRepositoryImpl{pool: pool}
}

func (r *TelegramVerifyCodeRepositoryImpl) Create(ctx context.Context, code *entities.TelegramVerifyCode) error {
	query := `
		INSERT INTO telegram_verify_codes (id, user_id, code, expires_at, used, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	code.ID = uuid.New()
	code.CreatedAt = time.Now().UTC()
	_, err := r.pool.Exec(ctx, query,
		code.ID, code.UserID, code.Code, code.ExpiresAt, code.Used, code.CreatedAt)
	return err
}

func (r *TelegramVerifyCodeRepositoryImpl) FindValidCode(ctx context.Context, code string) (*entities.TelegramVerifyCode, error) {
	query := `
		SELECT id, user_id, code, expires_at, used, created_at
		FROM telegram_verify_codes
		WHERE code = $1 AND used = false AND expires_at > $2
		ORDER BY created_at DESC LIMIT 1
	`
	var vc entities.TelegramVerifyCode
	err := r.pool.QueryRow(ctx, query, code, time.Now().UTC()).Scan(
		&vc.ID, &vc.UserID, &vc.Code, &vc.ExpiresAt, &vc.Used, &vc.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &vc, nil
}

func (r *TelegramVerifyCodeRepositoryImpl) MarkUsed(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE telegram_verify_codes SET used = true WHERE id = $1`, id)
	return err
}
