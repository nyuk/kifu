package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ChannelType string

const (
	ChannelTelegram ChannelType = "telegram"
	ChannelWebPush  ChannelType = "web_push"
)

type NotificationChannel struct {
	ID          uuid.UUID       `json:"id"`
	UserID      uuid.UUID       `json:"user_id"`
	ChannelType ChannelType     `json:"channel_type"`
	Config      json.RawMessage `json:"config"`
	Enabled     bool            `json:"enabled"`
	Verified    bool            `json:"verified"`
	CreatedAt   time.Time       `json:"created_at"`
}

type TelegramConfig struct {
	ChatID int64 `json:"chat_id"`
}

type TelegramVerifyCode struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expires_at"`
	Used      bool      `json:"used"`
	CreatedAt time.Time `json:"created_at"`
}
