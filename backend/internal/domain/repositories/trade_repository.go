package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type TradeFilter struct {
	Symbol   string
	Side     string
	Exchange string
	From     *time.Time
	To       *time.Time
	Limit    int
	Offset   int
	Sort     string
}

type TradeSummary struct {
	TotalTrades      int     `json:"total_trades"`
	BuyCount         int     `json:"buy_count"`
	SellCount        int     `json:"sell_count"`
	TotalVolume      string  `json:"total_volume"`
	RealizedPnLTotal *string `json:"realized_pnl_total"`
	Wins             int     `json:"wins"`
	Losses           int     `json:"losses"`
	Breakeven        int     `json:"breakeven"`
	AveragePnL       *string `json:"average_pnl"`
}

type TradeExchangeSummary struct {
	Exchange         string  `json:"exchange"`
	TradeCount       int     `json:"trade_count"`
	TotalTrades      int     `json:"total_trades"`
	BuyCount         int     `json:"buy_count"`
	SellCount        int     `json:"sell_count"`
	TotalVolume      string  `json:"total_volume"`
	RealizedPnLTotal *string `json:"realized_pnl_total"`
}

type TradeSideSummary struct {
	Side             string  `json:"side"`
	TradeCount       int     `json:"trade_count"`
	TotalTrades      int     `json:"total_trades"`
	TotalVolume      string  `json:"total_volume"`
	RealizedPnLTotal *string `json:"realized_pnl_total"`
}

type TradeSymbolSummary struct {
	Symbol           string  `json:"symbol"`
	TradeCount       int     `json:"trade_count"`
	TotalTrades      int     `json:"total_trades"`
	BuyCount         int     `json:"buy_count"`
	SellCount        int     `json:"sell_count"`
	TotalVolume      string  `json:"total_volume"`
	RealizedPnLTotal *string `json:"realized_pnl_total"`
	Wins             int     `json:"wins"`
	Losses           int     `json:"losses"`
}

type TradeRepository interface {
	Create(ctx context.Context, trade *entities.Trade) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Trade, error)
	List(ctx context.Context, userID uuid.UUID, filter TradeFilter) ([]*entities.Trade, int, error)
	ListByUserAndSymbol(ctx context.Context, userID uuid.UUID, symbol string) ([]*entities.Trade, error)
	ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.Trade, error)
	ListUnlinked(ctx context.Context, userID uuid.UUID, limit int) ([]*entities.Trade, error)
	Summary(ctx context.Context, userID uuid.UUID, filter TradeFilter) (TradeSummary, []TradeSideSummary, []TradeSymbolSummary, error)
	SummaryByExchange(ctx context.Context, userID uuid.UUID, filter TradeFilter) ([]TradeExchangeSummary, error)
	SummaryBySide(ctx context.Context, userID uuid.UUID, filter TradeFilter) ([]*TradeSideSummary, error)
	SummaryBySymbol(ctx context.Context, userID uuid.UUID, filter TradeFilter) ([]*TradeSymbolSummary, error)
	UpdateBubbleID(ctx context.Context, tradeID uuid.UUID, bubbleID uuid.UUID) error
	ClearBubbleID(ctx context.Context, tradeID uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
	BackfillBubbleMetadata(ctx context.Context, userID uuid.UUID) (int64, error)
}
