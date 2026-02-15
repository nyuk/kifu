package repositories

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type RunRepository interface {
	Create(ctx context.Context, userID uuid.UUID, runType string, status string, startedAt time.Time, meta json.RawMessage) (*entities.Run, error)
	GetByID(ctx context.Context, userID uuid.UUID, runID uuid.UUID) (*entities.Run, error)
	UpdateStatus(ctx context.Context, runID uuid.UUID, status string, finishedAt *time.Time, meta json.RawMessage) error
	GetLatestCompletedRun(ctx context.Context, userID uuid.UUID) (*entities.Run, error)
}
