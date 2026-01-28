package entities

import (
	"time"

	"github.com/google/uuid"
)

type Trade struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	BubbleID       *uuid.UUID `json:"bubble_id,omitempty"`
	BinanceTradeID int64      `json:"binance_trade_id"`
	Symbol         string     `json:"symbol"`
	Side           string     `json:"side"`
	Quantity       string     `json:"quantity"`
	Price          string     `json:"price"`
	RealizedPnL    *string    `json:"realized_pnl,omitempty"`
	TradeTime      time.Time  `json:"trade_time"`
}
