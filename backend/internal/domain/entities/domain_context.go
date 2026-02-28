package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type DomainContext struct {
	ID        uuid.UUID       `json:"id"`
	Scope     string          `json:"scope"`
	Domain    string          `json:"domain"`
	Version   string          `json:"version"`
	OwnerID   uuid.UUID       `json:"owner_id"`
	Context   json.RawMessage `json:"context"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}
