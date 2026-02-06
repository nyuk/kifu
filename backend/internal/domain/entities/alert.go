package entities

import (
	"time"

	"github.com/google/uuid"
)

type AlertSeverity string

const (
	AlertSeverityNormal AlertSeverity = "normal"
	AlertSeverityUrgent AlertSeverity = "urgent"
)

type AlertStatus string

const (
	AlertStatusPending AlertStatus = "pending"
	AlertStatusBriefed AlertStatus = "briefed"
	AlertStatusDecided AlertStatus = "decided"
	AlertStatusExpired AlertStatus = "expired"
)

type Alert struct {
	ID           uuid.UUID     `json:"id"`
	UserID       uuid.UUID     `json:"user_id"`
	RuleID       uuid.UUID     `json:"rule_id"`
	Symbol       string        `json:"symbol"`
	TriggerPrice string        `json:"trigger_price"`
	TriggerReason string       `json:"trigger_reason"`
	Severity     AlertSeverity `json:"severity"`
	Status       AlertStatus   `json:"status"`
	NotifiedAt   *time.Time    `json:"notified_at,omitempty"`
	CreatedAt    time.Time     `json:"created_at"`
}

type AlertBriefing struct {
	ID        uuid.UUID `json:"id"`
	AlertID   uuid.UUID `json:"alert_id"`
	Provider  string    `json:"provider"`
	Model     string    `json:"model"`
	Prompt    string    `json:"prompt"`
	Response  string    `json:"response"`
	TokensUsed *int     `json:"tokens_used,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type DecisionAction string

const (
	DecisionBuy    DecisionAction = "buy"
	DecisionSell   DecisionAction = "sell"
	DecisionHold   DecisionAction = "hold"
	DecisionClose  DecisionAction = "close"
	DecisionReduce DecisionAction = "reduce"
	DecisionAdd    DecisionAction = "add"
	DecisionIgnore DecisionAction = "ignore"
)

type Confidence string

const (
	ConfidenceHigh   Confidence = "high"
	ConfidenceMedium Confidence = "medium"
	ConfidenceLow    Confidence = "low"
)

type AlertDecision struct {
	ID         uuid.UUID      `json:"id"`
	AlertID    uuid.UUID      `json:"alert_id"`
	UserID     uuid.UUID      `json:"user_id"`
	Action     DecisionAction `json:"action"`
	Memo       *string        `json:"memo,omitempty"`
	Confidence *Confidence    `json:"confidence,omitempty"`
	ExecutedAt *time.Time     `json:"executed_at,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
}

type AlertOutcome struct {
	ID             uuid.UUID `json:"id"`
	AlertID        uuid.UUID `json:"alert_id"`
	DecisionID     uuid.UUID `json:"decision_id"`
	Period         string    `json:"period"`
	ReferencePrice string    `json:"reference_price"`
	OutcomePrice   string    `json:"outcome_price"`
	PnLPercent     string    `json:"pnl_percent"`
	CalculatedAt   time.Time `json:"calculated_at"`
}
