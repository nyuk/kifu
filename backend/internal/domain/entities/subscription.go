package entities

import (
	"time"

	"github.com/google/uuid"
)

type Subscription struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	Tier             string     `json:"tier"`
	AIQuotaRemaining int        `json:"ai_quota_remaining"`
	LastResetAt      time.Time  `json:"last_reset_at"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
}
