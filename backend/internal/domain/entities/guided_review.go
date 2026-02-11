package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// GuidedReview status constants
const (
	GuidedReviewStatusPending    = "pending"
	GuidedReviewStatusInProgress = "in_progress"
	GuidedReviewStatusCompleted  = "completed"
	GuidedReviewStatusSkipped    = "skipped"
)

// Intent constants (Layer 1)
const (
	IntentTechnicalSignal = "technical_signal"
	IntentNewsEvent       = "news_event"
	IntentEmotional       = "emotional"
	IntentPlannedRegular  = "planned_regular"
	IntentOther           = "other"
)

// Emotion constants (Layer 2)
const (
	EmotionGRConfident    = "confident"
	EmotionGRHalfDoubtful = "half_doubtful"
	EmotionGRAnxious      = "anxious"
	EmotionGRExcited      = "excited"
	EmotionGRCalm         = "calm"
	EmotionGRNervous      = "nervous"
	EmotionGRFomo         = "fomo"
	EmotionGRRevengeTrade = "revenge_trade"
	EmotionGRAsPlanned    = "as_planned"
)

// PatternMatch constants (Layer 3)
const (
	PatternSameDecision  = "same_decision"
	PatternAdjustTiming  = "adjust_timing"
	PatternReduceSize    = "reduce_size"
	PatternWouldNotTrade = "would_not_trade"
	PatternChangeSlTp    = "change_sl_tp"
)

type GuidedReview struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	ReviewDate  string     `json:"review_date"`
	Status      string     `json:"status"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type GuidedReviewItem struct {
	ID           uuid.UUID       `json:"id"`
	ReviewID     uuid.UUID       `json:"review_id"`
	TradeID      *uuid.UUID      `json:"trade_id,omitempty"`
	BundleKey    *string         `json:"bundle_key,omitempty"`
	Symbol       string          `json:"symbol"`
	Side         *string         `json:"side,omitempty"`
	PnL          *float64        `json:"pnl,omitempty"`
	TradeCount   int             `json:"trade_count"`
	Intent       *string         `json:"intent,omitempty"`
	Emotions     json.RawMessage `json:"emotions,omitempty"`
	PatternMatch *string         `json:"pattern_match,omitempty"`
	Memo         *string         `json:"memo,omitempty"`
	OrderIndex   int             `json:"order_index"`
	CreatedAt    time.Time       `json:"created_at"`
}

type UserStreak struct {
	UserID         uuid.UUID `json:"user_id"`
	CurrentStreak  int       `json:"current_streak"`
	LongestStreak  int       `json:"longest_streak"`
	LastReviewDate *string   `json:"last_review_date,omitempty"`
	UpdatedAt      time.Time `json:"updated_at"`
}
