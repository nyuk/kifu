package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type TradeEvent struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	AccountID    *uuid.UUID
	VenueID      *uuid.UUID
	InstrumentID *uuid.UUID
	AssetClass   string
	VenueType    string
	EventType    string
	Side         *string
	Qty          *string
	Price        *string
	Fee          *string
	FeeAsset     *string
	ExecutedAt   time.Time
	Source       string
	ExternalID   *string
	Metadata     *json.RawMessage
	DedupeKey    *string
}
