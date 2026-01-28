package entities

import (
	"time"

	"github.com/google/uuid"
)

type AIOpinion struct {
	ID             uuid.UUID `json:"id"`
	BubbleID       uuid.UUID `json:"bubble_id"`
	Provider       string    `json:"provider"`
	Model          string    `json:"model"`
	PromptTemplate string    `json:"prompt_template"`
	Response       string    `json:"response"`
	TokensUsed     *int      `json:"tokens_used,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}
