package entities

import (
	"time"

	"github.com/google/uuid"
)

type TradeSafetyVerdict string

const (
	TradeSafetyVerdictIntended TradeSafetyVerdict = "intended"
	TradeSafetyVerdictMistake  TradeSafetyVerdict = "mistake"
	TradeSafetyVerdictUnsure   TradeSafetyVerdict = "unsure"
)

type TradeSafetyReview struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	TradeID      *uuid.UUID
	TradeEventID *uuid.UUID
	Verdict      TradeSafetyVerdict
	Note         *string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
