package entities

import (
	"time"

	"github.com/google/uuid"
)

const (
	MarketingProductKifu = "kifu"

	MarketingChannelX          = "x"
	MarketingChannelNaverBlog  = "naver_blog"
	MarketingChannelYouTube    = "youtube"
	MarketingIdeaStatusInbox   = "inbox"
	MarketingIdeaStatusReady   = "draft_ready"
	MarketingDraftStatusQueue  = "approval_pending"
	MarketingDraftStatusOK     = "approved"
	MarketingDraftStatusHold   = "on_hold"
	MarketingDraftStatusTrash  = "discarded"
	MarketingAngleProductIntro = "product_intro"
	MarketingAngleProblem      = "problem"
	MarketingAngleFeature      = "feature"
	MarketingAngleDevLog       = "dev_log"
	MarketingAnglePersonal     = "personal_experience"
	MarketingAngleEducation    = "education"
)

type MarketingIdea struct {
	ID            uuid.UUID `json:"id"`
	UserID        uuid.UUID `json:"user_id"`
	ProductKey    string    `json:"product_key"`
	Title         string    `json:"title"`
	RawNote       string    `json:"raw_note"`
	AngleType     string    `json:"angle_type"`
	MessagePillar string    `json:"message_pillar"`
	Channels      []string  `json:"channels"`
	SourceLink    *string   `json:"source_link,omitempty"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type MarketingDraft struct {
	ID         uuid.UUID `json:"id"`
	IdeaID     uuid.UUID `json:"idea_id"`
	UserID     uuid.UUID `json:"user_id"`
	ProductKey string    `json:"product_key"`
	Channel    string    `json:"channel"`
	Tone       string    `json:"tone"`
	Version    int       `json:"version"`
	Title      string    `json:"title"`
	Content    string    `json:"content"`
	RiskFlags  []string  `json:"risk_flags"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type MarketingPublication struct {
	ID              uuid.UUID `json:"id"`
	DraftID         uuid.UUID `json:"draft_id"`
	UserID          uuid.UUID `json:"user_id"`
	ProductKey      string    `json:"product_key"`
	Channel         string    `json:"channel"`
	PublishStatus   string    `json:"publish_status"`
	ExternalURL     *string   `json:"external_url,omitempty"`
	MetricsSnapshot []byte    `json:"metrics_snapshot"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
