package entities

import (
	"time"

	"github.com/google/uuid"
)

type UserSymbol struct {
	ID               uuid.UUID `json:"id"`
	UserID           uuid.UUID `json:"user_id"`
	Symbol           string    `json:"symbol"`
	TimeframeDefault string    `json:"timeframe_default"`
	CreatedAt        time.Time `json:"created_at"`
}
