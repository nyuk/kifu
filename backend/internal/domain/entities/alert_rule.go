package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type RuleType string

const (
	RuleTypePriceChange    RuleType = "price_change"
	RuleTypeMACross        RuleType = "ma_cross"
	RuleTypePriceLevel     RuleType = "price_level"
	RuleTypeVolatilitySpike RuleType = "volatility_spike"
)

type AlertRule struct {
	ID               uuid.UUID       `json:"id"`
	UserID           uuid.UUID       `json:"user_id"`
	Name             string          `json:"name"`
	Symbol           string          `json:"symbol"`
	RuleType         RuleType        `json:"rule_type"`
	Config           json.RawMessage `json:"config"`
	CooldownMinutes  int             `json:"cooldown_minutes"`
	Enabled          bool            `json:"enabled"`
	LastTriggeredAt  *time.Time      `json:"last_triggered_at,omitempty"`
	LastCheckState   json.RawMessage `json:"last_check_state,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type PriceChangeConfig struct {
	Direction      string `json:"direction"`       // "drop" | "rise" | "both"
	ThresholdType  string `json:"threshold_type"`  // "absolute" | "percent"
	ThresholdValue string `json:"threshold_value"`
	Reference      string `json:"reference"`       // "24h" | "1h" | "4h"
}

type MACrossConfig struct {
	MAPeriod    int    `json:"ma_period"`
	MATimeframe string `json:"ma_timeframe"`
	Direction   string `json:"direction"` // "below" | "above"
}

type PriceLevelConfig struct {
	Price     string `json:"price"`
	Direction string `json:"direction"` // "above" | "below"
}

type VolatilitySpikeConfig struct {
	Timeframe  string `json:"timeframe"`
	Multiplier string `json:"multiplier"`
}

type CheckState struct {
	LastPrice    string `json:"last_price,omitempty"`
	WasAboveMA   *bool  `json:"was_above_ma,omitempty"`
	WasAboveLevel *bool `json:"was_above_level,omitempty"`
}
