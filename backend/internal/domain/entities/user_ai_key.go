package entities

import (
	"time"

	"github.com/google/uuid"
)

type UserAIKey struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Provider    string    `json:"provider"`
	APIKeyEnc   string    `json:"-"`
	APIKeyLast4 string    `json:"api_key_last4"`
	CreatedAt   time.Time `json:"created_at"`
}
