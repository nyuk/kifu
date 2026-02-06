package entities

import (
	"time"

	"github.com/google/uuid"
)

type TradeSyncState struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Exchange    string    `json:"exchange"`
	Symbol      string    `json:"symbol"`
	LastTradeID int64     `json:"last_trade_id"`
	LastSyncAt  time.Time `json:"last_sync_at"`
}
