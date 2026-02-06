package entities

import (
	"time"

	"github.com/google/uuid"
)

type Emotion string

const (
	EmotionGreedy     Emotion = "greedy"
	EmotionFearful    Emotion = "fearful"
	EmotionConfident  Emotion = "confident"
	EmotionUncertain  Emotion = "uncertain"
	EmotionCalm       Emotion = "calm"
	EmotionFrustrated Emotion = "frustrated"
)

type ReviewNote struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"user_id"`
	BubbleID      *uuid.UUID `json:"bubble_id,omitempty"`
	Title         string     `json:"title"`
	Content       string     `json:"content"`
	Tags          []string   `json:"tags,omitempty"`
	LessonLearned string     `json:"lesson_learned,omitempty"`
	Emotion       Emotion    `json:"emotion,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}
