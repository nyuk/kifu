package entities

import (
	"time"

	"github.com/google/uuid"
)

type Bubble struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	Symbol     string    `json:"symbol"`
	Timeframe  string    `json:"timeframe"`
	CandleTime time.Time `json:"candle_time"`
	Price      string    `json:"price"`
	BubbleType string    `json:"bubble_type"`
	Memo       *string   `json:"memo,omitempty"`
	Tags       []string  `json:"tags,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}
