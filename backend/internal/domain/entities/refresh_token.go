package entities

import (
	"time"

	"github.com/google/uuid"
)

type RefreshToken struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"user_id"`
	TokenHash     string     `json:"-"`
	ExpiresAt     time.Time  `json:"expires_at"`
	CreatedAt     time.Time  `json:"created_at"`
	RevokedAt     *time.Time `json:"revoked_at,omitempty"`
	LastUsedAt    *time.Time `json:"last_used_at,omitempty"`
	ReplacedBy    *uuid.UUID `json:"replaced_by,omitempty"`
	RevokedReason *string    `json:"revoked_reason,omitempty"`
}
