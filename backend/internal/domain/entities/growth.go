package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

const (
	GrowthProductKifu = "kifu"

	GrowthEventVisit               = "visit"
	GrowthEventGuestStart          = "guest_start"
	GrowthEventSignupCompleted     = "signup_completed"
	GrowthEventCSVUploadComplete   = "csv_upload_completed"
	GrowthEventAPIConnectComplete  = "api_connect_completed"
	GrowthEventFirstReviewComplete = "first_review_completed"
	GrowthEventDropOff             = "drop_off"

	GrowthBucketInbox = "inbox"
	GrowthBucketNext  = "next"
	GrowthBucketLater = "later"
	GrowthBucketDone  = "done"

	GrowthFeedbackSourceExternal = "external_reaction"
	GrowthFeedbackSourceInternal = "internal_memo"
	GrowthFeedbackSourceIdea     = "improvement_idea"
)

type GrowthFunnelEvent struct {
	ID             uuid.UUID       `json:"id"`
	UserID         *uuid.UUID      `json:"user_id,omitempty"`
	GuestSessionID *string         `json:"guest_session_id,omitempty"`
	EventName      string          `json:"event_name"`
	SourcePath     *string         `json:"source_path,omitempty"`
	Referrer       *string         `json:"referrer,omitempty"`
	Metadata       json.RawMessage `json:"metadata"`
	OccurredAt     time.Time       `json:"occurred_at"`
	CreatedAt      time.Time       `json:"created_at"`
}

type GrowthFeedbackItem struct {
	ID         uuid.UUID       `json:"id"`
	ProductKey string          `json:"product_key"`
	SourceType string          `json:"source_type"`
	Bucket     string          `json:"bucket"`
	Title      string          `json:"title"`
	Body       string          `json:"body"`
	SourceURL  *string         `json:"source_url,omitempty"`
	Metadata   json.RawMessage `json:"metadata"`
	CreatedBy  *uuid.UUID      `json:"created_by,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
}

type GrowthDailyReport struct {
	ID                 uuid.UUID       `json:"id"`
	ReportDate         time.Time       `json:"report_date"`
	Status             string          `json:"status"`
	Payload            json.RawMessage `json:"payload"`
	ContentDraftsCount int             `json:"content_drafts_count"`
	IssuesCount        int             `json:"issues_count"`
	CreatedAt          time.Time       `json:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at"`
}
