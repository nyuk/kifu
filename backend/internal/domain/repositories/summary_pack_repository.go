package repositories

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type SummaryPackRepository interface {
	Create(ctx context.Context, pack *entities.SummaryPack) error
	GetByID(ctx context.Context, userID uuid.UUID, packID uuid.UUID) (*entities.SummaryPack, error)
	GetLatest(ctx context.Context, userID uuid.UUID, rangeValue string) (*entities.SummaryPack, error)
}

type SummaryPackPayloadStore struct {
	PackID                 uuid.UUID
	UserID                 uuid.UUID
	SourceRunID            uuid.UUID
	Range                  string
	SchemaVersion          string
	CalcVersion            string
	ContentHash            string
	ReconciliationStatus   string
	MissingSuspectsCount   int
	DuplicateSuspectsCount int
	NormalizationWarnings  []string
	Payload                json.RawMessage
}
