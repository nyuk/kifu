package entities

import (
	"time"

	"github.com/google/uuid"
)

type PlanAction string

const (
	PlanActionBuy  PlanAction = "buy"
	PlanActionSkip PlanAction = "skip"
)

type PlanReason string

const (
	PlanReasonIndicator PlanReason = "indicator"
	PlanReasonTwitter   PlanReason = "twitter"
	PlanReasonFomo      PlanReason = "fomo"
	PlanReasonCustom    PlanReason = "custom"
)

type PlanStatus string

const (
	PlanStatusPending  PlanStatus = "pending"
	PlanStatusComplete PlanStatus = "complete"
	PlanStatusExpired  PlanStatus = "expired"
)

type TradePlan struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	AlertID        *uuid.UUID `json:"alert_id,omitempty"`
	Symbol         string     `json:"symbol"`
	Action         PlanAction `json:"action"`
	Reason         *string    `json:"reason,omitempty"`
	ReasonText     *string    `json:"reason_text,omitempty"`
	StopLoss       *string    `json:"stop_loss,omitempty"`
	EntryPrice     *string    `json:"entry_price,omitempty"`
	Status         PlanStatus `json:"status"`
	MatchedTradeID *uuid.UUID `json:"matched_trade_id,omitempty"`
	PlanPnLPercent *string    `json:"plan_pnl_percent,omitempty"`
	ChatID         int64      `json:"chat_id"`
	CreatedAt      time.Time  `json:"created_at"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
	MatchedAt      *time.Time `json:"matched_at,omitempty"`
}
