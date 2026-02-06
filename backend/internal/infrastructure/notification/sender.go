package notification

import (
	"context"

	"github.com/google/uuid"
)

type Message struct {
	Title    string
	Body     string
	Severity string // "normal" | "urgent"
	DeepLink string
}

type Sender interface {
	Send(ctx context.Context, userID uuid.UUID, msg Message) error
}
