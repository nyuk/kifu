package repositories

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type TimelineCursor struct {
	Time time.Time
	ID   uuid.UUID
}

type TimelineFilter struct {
	From         *time.Time
	To           *time.Time
	AssetClasses []string
	Venues       []string
	Sources      []string
	EventTypes   []string
	Limit        int
	Cursor       *TimelineCursor
}

type PositionFilter struct {
	From         *time.Time
	To           *time.Time
	AssetClasses []string
	Venues       []string
	Status       string
	Limit        int
}

type TimelineEvent struct {
	ID           uuid.UUID
	ExecutedAt   time.Time
	AssetClass   string
	VenueType    string
	VenueCode    string
	VenueName    string
	Instrument   string
	EventType    string
	Side         *string
	Qty          *string
	Price        *string
	Fee          *string
	FeeAsset     *string
	Source       string
	ExternalID   *string
	Metadata     *json.RawMessage
	AccountLabel *string
}

type PositionSummary struct {
	Instrument     string
	VenueCode      string
	VenueName      string
	AssetClass     string
	VenueType      string
	NetQty         string
	AvgEntry       string
	LastExecutedAt time.Time
	Status         string
	BuyQty         string
	SellQty        string
	BuyNotional    string
	SellNotional   string
	AccountLabel   *string
}

type PortfolioRepository interface {
	UpsertVenue(ctx context.Context, code string, venueType string, displayName string, chain string) (uuid.UUID, error)
	UpsertAccount(ctx context.Context, userID uuid.UUID, venueID uuid.UUID, label string, address *string, source string) (uuid.UUID, error)
	UpsertInstrument(ctx context.Context, assetClass string, baseAsset string, quoteAsset string, symbol string) (uuid.UUID, error)
	UpsertInstrumentMapping(ctx context.Context, instrumentID uuid.UUID, venueID uuid.UUID, venueSymbol string) error
	CreateTradeEvent(ctx context.Context, event *entities.TradeEvent) error
	ListTimeline(ctx context.Context, userID uuid.UUID, filter TimelineFilter) ([]TimelineEvent, error)
	ListPositions(ctx context.Context, userID uuid.UUID, filter PositionFilter) ([]PositionSummary, error)
	RebuildPositions(ctx context.Context, userID uuid.UUID) error
	ListUsersWithEvents(ctx context.Context, limit int) ([]uuid.UUID, error)
	BackfillBubblesFromEvents(ctx context.Context, userID uuid.UUID) (int64, error)
}
