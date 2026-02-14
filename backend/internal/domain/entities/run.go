package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Run struct {
	RunID      uuid.UUID       `json:"run_id"`
	UserID     uuid.UUID       `json:"user_id"`
	RunType    string          `json:"run_type"`
	Status     string          `json:"status"`
	StartedAt  time.Time       `json:"started_at"`
	FinishedAt *time.Time      `json:"finished_at,omitempty"`
	Meta       json.RawMessage `json:"meta,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
}
