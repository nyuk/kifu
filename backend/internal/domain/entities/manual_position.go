package entities

import (
	"time"

	"github.com/google/uuid"
)

type ManualPosition struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	Symbol       string
	AssetClass   string
	Venue        *string
	PositionSide string
	Size         *string
	EntryPrice   *string
	StopLoss     *string
	TakeProfit   *string
	Leverage     *string
	Strategy     *string
	Memo         *string
	Status       string
	OpenedAt     *time.Time
	ClosedAt     *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
