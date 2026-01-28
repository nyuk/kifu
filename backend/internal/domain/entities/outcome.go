package entities

import (
	"time"

	"github.com/google/uuid"
)

type Outcome struct {
	ID             uuid.UUID `json:"id"`
	BubbleID       uuid.UUID `json:"bubble_id"`
	Period         string    `json:"period"`
	ReferencePrice string    `json:"reference_price"`
	OutcomePrice   string    `json:"outcome_price"`
	PnLPercent     string    `json:"pnl_percent"`
	CalculatedAt   time.Time `json:"calculated_at"`
}
