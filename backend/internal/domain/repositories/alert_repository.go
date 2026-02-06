package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type AlertRepository interface {
	Create(ctx context.Context, alert *entities.Alert) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Alert, error)
	ListByUser(ctx context.Context, userID uuid.UUID, status *entities.AlertStatus, limit, offset int) ([]*entities.Alert, int, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status entities.AlertStatus) error
	SetNotified(ctx context.Context, id uuid.UUID) error
	ExpireOlderThan(ctx context.Context, before time.Time) (int, error)
}

type AlertBriefingRepository interface {
	Create(ctx context.Context, briefing *entities.AlertBriefing) error
	ListByAlert(ctx context.Context, alertID uuid.UUID) ([]*entities.AlertBriefing, error)
}

type AlertDecisionRepository interface {
	Create(ctx context.Context, decision *entities.AlertDecision) error
	GetByAlert(ctx context.Context, alertID uuid.UUID) (*entities.AlertDecision, error)
}

type AlertOutcomeRepository interface {
	CreateIfNotExists(ctx context.Context, outcome *entities.AlertOutcome) (bool, error)
	ListByAlert(ctx context.Context, alertID uuid.UUID) ([]*entities.AlertOutcome, error)
	ListPendingDecisions(ctx context.Context, period string, cutoff time.Time, limit int) ([]*PendingAlertDecision, error)
}

type PendingAlertDecision struct {
	AlertID        uuid.UUID
	DecisionID     uuid.UUID
	Symbol         string
	TriggerPrice   string
	DecisionTime   time.Time
}
