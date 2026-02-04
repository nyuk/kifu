package entities

import (
	"time"

	"github.com/google/uuid"
)

type Trade struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	BubbleID       *uuid.UUID `json:"bubble_id,omitempty"`
	Exchange       string     `json:"exchange"`
	BinanceTradeID int64      `json:"binance_trade_id"`
	Symbol         string     `json:"symbol"`
	Side           string     `json:"side"`
	PositionSide   *string    `json:"position_side,omitempty"`
	OpenClose      *string    `json:"open_close,omitempty"`
	ReduceOnly     *bool      `json:"reduce_only,omitempty"`
	Quantity       string     `json:"quantity"`
	Price          string     `json:"price"`
	RealizedPnL    *string    `json:"realized_pnl,omitempty"`
	TradeTime      time.Time  `json:"trade_time"`
}
