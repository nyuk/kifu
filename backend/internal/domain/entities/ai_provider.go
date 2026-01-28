package entities

import (
	"time"

	"github.com/google/uuid"
)

type AIProvider struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Model     string    `json:"model"`
	Enabled   bool      `json:"enabled"`
	IsDefault bool      `json:"is_default"`
	CreatedAt time.Time `json:"created_at"`
}
