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
	TotalTrades      int
	BuyCount         int
	SellCount        int
	TotalVolume      string
	RealizedPnLTotal *string
	Wins             int
	Losses           int
	Breakeven        int
	AveragePnL       *string
}

type TradeExchangeSummary struct {
	Exchange         string
	TradeCount       int
	TotalTrades      int
	BuyCount         int
	SellCount        int
	TotalVolume      string
	RealizedPnLTotal *string
}

type TradeSideSummary struct {
	Side             string
	TradeCount       int
	TotalTrades      int
	TotalVolume      string
	RealizedPnLTotal *string
}

type TradeSymbolSummary struct {
	Symbol           string
	TradeCount       int
	TotalTrades      int
	BuyCount         int
	SellCount        int
	TotalVolume      string
	RealizedPnLTotal *string
	Wins             int
	Losses           int
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
}
