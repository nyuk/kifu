package entities

import (
	"time"

	"github.com/google/uuid"
)

const (
	MarketingProductKifu        = "kifu"
	MarketingProductMoneyVessel = "moneyvessel"

	MarketingChannelX          = "x"
	MarketingChannelNaverBlog  = "naver_blog"
	MarketingChannelYouTube    = "youtube"
	MarketingIdeaStatusInbox   = "inbox"
	MarketingIdeaStatusReady   = "draft_ready"
	MarketingDraftStatusQueue  = "approval_pending"
	MarketingDraftStatusOK     = "approved"
	MarketingDraftStatusHold   = "on_hold"
	MarketingDraftStatusTrash  = "discarded"
	MarketingPublishStatusDone = "published"
	MarketingAngleProductIntro = "product_intro"
	MarketingAngleProblem      = "problem"
	MarketingAngleFeature      = "feature"
	MarketingAngleDevLog       = "dev_log"
	MarketingAnglePersonal     = "personal_experience"
	MarketingAngleEducation    = "education"

	MarketingContentIntentDirect = "direct_promo"
	MarketingContentIntentSoft   = "soft_promo"
	MarketingContentIntentNon    = "non_promo"

	MarketingEvidencePersonalNote = "personal_note"
	MarketingEvidenceTeamChat     = "team_chat"
	MarketingEvidenceQuote        = "quote"
	MarketingEvidenceNews         = "news"
	MarketingEvidenceScreenshot   = "screenshot"
	MarketingEvidenceGenerated    = "generated_image"

	MarketingFormatQuestion        = "question"
	MarketingFormatReflection      = "reflection"
	MarketingFormatConversation    = "conversation"
	MarketingFormatContrarian      = "contrarian"
	MarketingFormatScreenExplainer = "screen_explainer"
	MarketingFormatNewsReaction    = "news_reaction"
)

type MarketingIdea struct {
	ID             uuid.UUID                 `json:"id"`
	UserID         uuid.UUID                 `json:"user_id"`
	ProductKey     string                    `json:"product_key"`
	Title          string                    `json:"title"`
	RawNote        string                    `json:"raw_note"`
	AngleType      string                    `json:"angle_type"`
	MessagePillar  string                    `json:"message_pillar"`
	Channels       []string                  `json:"channels"`
	ContentIntent  string                    `json:"content_intent"`
	EvidenceSource string                    `json:"evidence_source"`
	FormatStyle    string                    `json:"format_style"`
	SourceLink     *string                   `json:"source_link,omitempty"`
	Attachments    []MarketingIdeaAttachment `json:"attachments,omitempty"`
	Status         string                    `json:"status"`
	CreatedAt      time.Time                 `json:"created_at"`
	UpdatedAt      time.Time                 `json:"updated_at"`
}

type MarketingIdeaAttachment struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	MimeType string  `json:"mime_type"`
	DataURL  string  `json:"data_url"`
	Note     *string `json:"note,omitempty"`
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

type MarketingChannelSetting struct {
	ID              uuid.UUID `json:"id"`
	UserID          uuid.UUID `json:"user_id"`
	ProductKey      string    `json:"product_key"`
	Channel         string    `json:"channel"`
	PublicationName string    `json:"publication_name"`
	PublicationURL  *string   `json:"publication_url,omitempty"`
	DefaultCategory string    `json:"default_category"`
	PrimaryAudience string    `json:"primary_audience"`
	ToneGuide       string    `json:"tone_guide"`
	DefaultCTA      string    `json:"default_cta"`
	ProofPoints     string    `json:"proof_points"`
	ReferenceNotes  string    `json:"reference_notes"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
