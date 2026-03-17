package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type MonthlyReport struct {
	ReportID  uuid.UUID       `json:"report_id"`
	UserID    uuid.UUID       `json:"user_id"`
	Year      int             `json:"year"`
	Month     int             `json:"month"`
	Payload   json.RawMessage `json:"payload"`
	CreatedAt time.Time       `json:"created_at"`
}

// MonthlyReportPayload is the structured content of a monthly report.
type MonthlyReportPayload struct {
	SchemaVersion string               `json:"schema_version"` // "monthly_report_v1"
	Period        MonthlyReportPeriod  `json:"period"`
	TradeSummary  MonthlyTradeSummary  `json:"trade_summary"`
	DecisionStats MonthlyDecisionStats `json:"decision_stats"`
	AIAccuracy    MonthlyAIAccuracy    `json:"ai_accuracy"`
	MistakeReport MonthlyMistakeReport `json:"mistake_report"`
	TopSymbols    []MonthlySymbolPerf  `json:"top_symbols"`
	Comparison    *MonthlyComparison   `json:"comparison,omitempty"` // nil if first month
}

type MonthlyReportPeriod struct {
	Year  int    `json:"year"`
	Month int    `json:"month"`
	Label string `json:"label"` // "2026년 2월"
}

type MonthlyTradeSummary struct {
	TotalTrades int     `json:"total_trades"`
	BuyCount    int     `json:"buy_count"`
	SellCount   int     `json:"sell_count"`
	RealizedPnL float64 `json:"realized_pnl"`
	TotalFees   float64 `json:"total_fees"`
	WinRate     float64 `json:"win_rate"` // from trades with known outcome
	AvgPnL      float64 `json:"avg_pnl"`
}

type MonthlyDecisionStats struct {
	TotalBubbles       int     `json:"total_bubbles"`
	BubblesWithOutcome int     `json:"bubbles_with_outcome"`
	BubbleWinRate      float64 `json:"bubble_win_rate"`
	AvgBubblePnL       float64 `json:"avg_bubble_pnl"`
}

type MonthlyAIAccuracy struct {
	TotalOpinions int                    `json:"total_opinions"`
	ByProvider    []MonthlyProviderStats `json:"by_provider"`
}

type MonthlyProviderStats struct {
	Provider     string  `json:"provider"`
	TotalChecked int     `json:"total_checked"`
	CorrectCount int     `json:"correct_count"`
	Accuracy     float64 `json:"accuracy"`
}

type MonthlyMistakeReport struct {
	TotalReviewed int              `json:"total_reviewed"`
	MistakeCount  int              `json:"mistake_count"`
	IntendedCount int              `json:"intended_count"`
	UnsureCount   int              `json:"unsure_count"`
	TopMistakes   []MonthlyMistake `json:"top_mistakes"` // top repeated mistake patterns
}

type MonthlyMistake struct {
	Symbol string `json:"symbol"`
	Side   string `json:"side"`
	Count  int    `json:"count"`
}

type MonthlySymbolPerf struct {
	Symbol      string  `json:"symbol"`
	TradeCount  int     `json:"trade_count"`
	RealizedPnL float64 `json:"realized_pnl"`
	WinRate     float64 `json:"win_rate"`
}

type MonthlyComparison struct {
	PnLChange       float64 `json:"pnl_change"`      // this month - last month
	WinRateChange   float64 `json:"win_rate_change"` // percentage point change
	TradeCountDiff  int     `json:"trade_count_diff"`
	BubbleCountDiff int     `json:"bubble_count_diff"`
	AccuracyChange  float64 `json:"accuracy_change"` // top provider accuracy change
}
