package entities

import (
	"time"

	"github.com/google/uuid"
)

type Direction string

const (
	DirectionBuy     Direction = "BUY"
	DirectionSell    Direction = "SELL"
	DirectionHold    Direction = "HOLD"
	DirectionUp      Direction = "UP"
	DirectionDown    Direction = "DOWN"
	DirectionNeutral Direction = "NEUTRAL"
)

type AIOpinionAccuracy struct {
	ID                 uuid.UUID `json:"id"`
	OpinionID          uuid.UUID `json:"opinion_id"`
	OutcomeID          uuid.UUID `json:"outcome_id"`
	BubbleID           uuid.UUID `json:"bubble_id"`
	Provider           string    `json:"provider"`
	Period             string    `json:"period"`
	PredictedDirection Direction `json:"predicted_direction"`
	ActualDirection    Direction `json:"actual_direction"`
	IsCorrect          bool      `json:"is_correct"`
	CreatedAt          time.Time `json:"created_at"`
}
