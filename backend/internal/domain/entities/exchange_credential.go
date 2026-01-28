package entities

import (
	"time"

	"github.com/google/uuid"
)

type ExchangeCredential struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"user_id"`
	Exchange     string    `json:"exchange"`
	APIKeyEnc    string    `json:"-"`
	APISecretEnc string    `json:"-"`
	APIKeyLast4  string    `json:"api_key_last4"`
	IsValid      bool      `json:"is_valid"`
	CreatedAt    time.Time `json:"created_at"`
}
