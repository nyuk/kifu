package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	domainrepos "github.com/moneyvessel/kifu/internal/domain/repositories"
)

type MarketingRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewMarketingRepository(pool *pgxpool.Pool) domainrepos.MarketingRepository {
	return &MarketingRepositoryImpl{pool: pool}
}

func (r *MarketingRepositoryImpl) CreateIdea(ctx context.Context, idea *entities.MarketingIdea) error {
	query := `
		INSERT INTO marketing_ideas (
			id, user_id, product_key, title, raw_note, angle_type, message_pillar,
			channels, content_intent, evidence_source, format_style, source_link, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`
	_, err := r.pool.Exec(ctx, query,
		idea.ID, idea.UserID, idea.ProductKey, idea.Title, idea.RawNote, idea.AngleType, idea.MessagePillar,
		idea.Channels, idea.ContentIntent, idea.EvidenceSource, idea.FormatStyle, idea.SourceLink, idea.Status, idea.CreatedAt, idea.UpdatedAt,
	)
	return err
}

func (r *MarketingRepositoryImpl) UpdateIdea(ctx context.Context, idea *entities.MarketingIdea) error {
	query := `
		UPDATE marketing_ideas
		SET title = $2,
		    raw_note = $3,
		    angle_type = $4,
		    message_pillar = $5,
		    channels = $6,
		    content_intent = $7,
		    evidence_source = $8,
		    format_style = $9,
		    source_link = $10,
		    status = $11,
		    updated_at = $12
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		idea.ID, idea.Title, idea.RawNote, idea.AngleType, idea.MessagePillar, idea.Channels,
		idea.ContentIntent, idea.EvidenceSource, idea.FormatStyle, idea.SourceLink, idea.Status, idea.UpdatedAt,
	)
	return err
}

func (r *MarketingRepositoryImpl) GetIdeaByID(ctx context.Context, id uuid.UUID) (*entities.MarketingIdea, error) {
	query := `
		SELECT id, user_id, product_key, title, raw_note, angle_type, message_pillar,
		       channels, content_intent, evidence_source, format_style, source_link, status, created_at, updated_at
		FROM marketing_ideas
		WHERE id = $1
	`
	var idea entities.MarketingIdea
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&idea.ID, &idea.UserID, &idea.ProductKey, &idea.Title, &idea.RawNote, &idea.AngleType, &idea.MessagePillar,
		&idea.Channels, &idea.ContentIntent, &idea.EvidenceSource, &idea.FormatStyle, &idea.SourceLink, &idea.Status, &idea.CreatedAt, &idea.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &idea, nil
}

func (r *MarketingRepositoryImpl) ListIdeasByUser(ctx context.Context, userID uuid.UUID, productKey string, limit int) ([]*entities.MarketingIdea, error) {
	query := `
		SELECT id, user_id, product_key, title, raw_note, angle_type, message_pillar,
		       channels, content_intent, evidence_source, format_style, source_link, status, created_at, updated_at
		FROM marketing_ideas
		WHERE user_id = $1 AND product_key = $2
		ORDER BY updated_at DESC, created_at DESC
		LIMIT $3
	`
	rows, err := r.pool.Query(ctx, query, userID, productKey, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ideas := make([]*entities.MarketingIdea, 0)
	for rows.Next() {
		var idea entities.MarketingIdea
		if err := rows.Scan(
			&idea.ID, &idea.UserID, &idea.ProductKey, &idea.Title, &idea.RawNote, &idea.AngleType, &idea.MessagePillar,
			&idea.Channels, &idea.ContentIntent, &idea.EvidenceSource, &idea.FormatStyle, &idea.SourceLink, &idea.Status, &idea.CreatedAt, &idea.UpdatedAt,
		); err != nil {
			return nil, err
		}
		ideas = append(ideas, &idea)
	}
	return ideas, rows.Err()
}

func (r *MarketingRepositoryImpl) CountIdeasByUser(ctx context.Context, userID uuid.UUID, productKey string) (int, error) {
	query := `SELECT COUNT(*) FROM marketing_ideas WHERE user_id = $1 AND product_key = $2`
	var count int
	err := r.pool.QueryRow(ctx, query, userID, productKey).Scan(&count)
	return count, err
}

func (r *MarketingRepositoryImpl) CreateDraft(ctx context.Context, draft *entities.MarketingDraft) error {
	query := `
		INSERT INTO marketing_drafts (
			id, idea_id, user_id, product_key, channel, tone, version,
			title, content, risk_flags, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`
	_, err := r.pool.Exec(ctx, query,
		draft.ID, draft.IdeaID, draft.UserID, draft.ProductKey, draft.Channel, draft.Tone, draft.Version,
		draft.Title, draft.Content, draft.RiskFlags, draft.Status, draft.CreatedAt, draft.UpdatedAt,
	)
	return err
}

func (r *MarketingRepositoryImpl) UpdateDraft(ctx context.Context, draft *entities.MarketingDraft) error {
	query := `
		UPDATE marketing_drafts
		SET tone = $2,
		    title = $3,
		    content = $4,
		    risk_flags = $5,
		    status = $6,
		    updated_at = $7
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		draft.ID, draft.Tone, draft.Title, draft.Content, draft.RiskFlags, draft.Status, draft.UpdatedAt,
	)
	return err
}

func (r *MarketingRepositoryImpl) GetDraftByID(ctx context.Context, id uuid.UUID) (*entities.MarketingDraft, error) {
	query := `
		SELECT id, idea_id, user_id, product_key, channel, tone, version,
		       title, content, risk_flags, status, created_at, updated_at
		FROM marketing_drafts
		WHERE id = $1
	`
	var draft entities.MarketingDraft
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&draft.ID, &draft.IdeaID, &draft.UserID, &draft.ProductKey, &draft.Channel, &draft.Tone, &draft.Version,
		&draft.Title, &draft.Content, &draft.RiskFlags, &draft.Status, &draft.CreatedAt, &draft.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &draft, nil
}

func (r *MarketingRepositoryImpl) ListDraftsByUser(ctx context.Context, userID uuid.UUID, productKey string, limit int) ([]*entities.MarketingDraft, error) {
	query := `
		SELECT id, idea_id, user_id, product_key, channel, tone, version,
		       title, content, risk_flags, status, created_at, updated_at
		FROM marketing_drafts
		WHERE user_id = $1 AND product_key = $2
		ORDER BY updated_at DESC, created_at DESC
		LIMIT $3
	`
	rows, err := r.pool.Query(ctx, query, userID, productKey, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	drafts := make([]*entities.MarketingDraft, 0)
	for rows.Next() {
		var draft entities.MarketingDraft
		if err := rows.Scan(
			&draft.ID, &draft.IdeaID, &draft.UserID, &draft.ProductKey, &draft.Channel, &draft.Tone, &draft.Version,
			&draft.Title, &draft.Content, &draft.RiskFlags, &draft.Status, &draft.CreatedAt, &draft.UpdatedAt,
		); err != nil {
			return nil, err
		}
		drafts = append(drafts, &draft)
	}
	return drafts, rows.Err()
}

func (r *MarketingRepositoryImpl) CountDraftsByUser(ctx context.Context, userID uuid.UUID, productKey string) (int, error) {
	query := `SELECT COUNT(*) FROM marketing_drafts WHERE user_id = $1 AND product_key = $2`
	var count int
	err := r.pool.QueryRow(ctx, query, userID, productKey).Scan(&count)
	return count, err
}

func (r *MarketingRepositoryImpl) CountDraftsByStatus(ctx context.Context, userID uuid.UUID, productKey string, status string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM marketing_drafts
		WHERE user_id = $1 AND product_key = $2 AND status = $3
	`
	var count int
	err := r.pool.QueryRow(ctx, query, userID, productKey, status).Scan(&count)
	return count, err
}

func (r *MarketingRepositoryImpl) NextDraftVersion(ctx context.Context, ideaID uuid.UUID, channel string) (int, error) {
	query := `
		SELECT COALESCE(MAX(version), 0)
		FROM marketing_drafts
		WHERE idea_id = $1 AND channel = $2
	`
	var current int
	if err := r.pool.QueryRow(ctx, query, ideaID, channel).Scan(&current); err != nil {
		return 0, err
	}
	return current + 1, nil
}

func (r *MarketingRepositoryImpl) CreatePublication(ctx context.Context, publication *entities.MarketingPublication) error {
	query := `
		INSERT INTO marketing_publications (
			id, draft_id, user_id, product_key, channel, publish_status,
			external_url, metrics_snapshot, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.pool.Exec(ctx, query,
		publication.ID, publication.DraftID, publication.UserID, publication.ProductKey, publication.Channel,
		publication.PublishStatus, publication.ExternalURL, publication.MetricsSnapshot, publication.CreatedAt, publication.UpdatedAt,
	)
	return err
}

func (r *MarketingRepositoryImpl) UpdatePublication(ctx context.Context, publication *entities.MarketingPublication) error {
	query := `
		UPDATE marketing_publications
		SET publish_status = $2,
		    external_url = $3,
		    metrics_snapshot = $4,
		    updated_at = $5
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		publication.ID, publication.PublishStatus, publication.ExternalURL, publication.MetricsSnapshot, publication.UpdatedAt,
	)
	return err
}

func (r *MarketingRepositoryImpl) GetPublicationByDraftID(ctx context.Context, draftID uuid.UUID) (*entities.MarketingPublication, error) {
	query := `
		SELECT id, draft_id, user_id, product_key, channel, publish_status,
		       external_url, metrics_snapshot, created_at, updated_at
		FROM marketing_publications
		WHERE draft_id = $1
		ORDER BY updated_at DESC, created_at DESC
		LIMIT 1
	`
	var publication entities.MarketingPublication
	err := r.pool.QueryRow(ctx, query, draftID).Scan(
		&publication.ID, &publication.DraftID, &publication.UserID, &publication.ProductKey, &publication.Channel,
		&publication.PublishStatus, &publication.ExternalURL, &publication.MetricsSnapshot, &publication.CreatedAt, &publication.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &publication, nil
}

func (r *MarketingRepositoryImpl) ListChannelSettingsByUser(ctx context.Context, userID uuid.UUID, productKey string) ([]*entities.MarketingChannelSetting, error) {
	query := `
		SELECT id, user_id, product_key, channel, publication_name, publication_url,
		       default_category, primary_audience, tone_guide, default_cta,
		       proof_points, reference_notes, created_at, updated_at
		FROM marketing_channel_settings
		WHERE user_id = $1 AND product_key = $2
		ORDER BY channel ASC, updated_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID, productKey)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settings := make([]*entities.MarketingChannelSetting, 0)
	for rows.Next() {
		var setting entities.MarketingChannelSetting
		if err := rows.Scan(
			&setting.ID, &setting.UserID, &setting.ProductKey, &setting.Channel, &setting.PublicationName, &setting.PublicationURL,
			&setting.DefaultCategory, &setting.PrimaryAudience, &setting.ToneGuide, &setting.DefaultCTA,
			&setting.ProofPoints, &setting.ReferenceNotes, &setting.CreatedAt, &setting.UpdatedAt,
		); err != nil {
			return nil, err
		}
		settings = append(settings, &setting)
	}
	return settings, rows.Err()
}

func (r *MarketingRepositoryImpl) GetChannelSetting(ctx context.Context, userID uuid.UUID, productKey string, channel string) (*entities.MarketingChannelSetting, error) {
	query := `
		SELECT id, user_id, product_key, channel, publication_name, publication_url,
		       default_category, primary_audience, tone_guide, default_cta,
		       proof_points, reference_notes, created_at, updated_at
		FROM marketing_channel_settings
		WHERE user_id = $1 AND product_key = $2 AND channel = $3
		LIMIT 1
	`
	var setting entities.MarketingChannelSetting
	err := r.pool.QueryRow(ctx, query, userID, productKey, channel).Scan(
		&setting.ID, &setting.UserID, &setting.ProductKey, &setting.Channel, &setting.PublicationName, &setting.PublicationURL,
		&setting.DefaultCategory, &setting.PrimaryAudience, &setting.ToneGuide, &setting.DefaultCTA,
		&setting.ProofPoints, &setting.ReferenceNotes, &setting.CreatedAt, &setting.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &setting, nil
}

func (r *MarketingRepositoryImpl) UpsertChannelSetting(ctx context.Context, setting *entities.MarketingChannelSetting) error {
	query := `
		INSERT INTO marketing_channel_settings (
			id, user_id, product_key, channel, publication_name, publication_url,
			default_category, primary_audience, tone_guide, default_cta,
			proof_points, reference_notes, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		ON CONFLICT (user_id, product_key, channel)
		DO UPDATE SET
			publication_name = EXCLUDED.publication_name,
			publication_url = EXCLUDED.publication_url,
			default_category = EXCLUDED.default_category,
			primary_audience = EXCLUDED.primary_audience,
			tone_guide = EXCLUDED.tone_guide,
			default_cta = EXCLUDED.default_cta,
			proof_points = EXCLUDED.proof_points,
			reference_notes = EXCLUDED.reference_notes,
			updated_at = EXCLUDED.updated_at
	`
	_, err := r.pool.Exec(ctx, query,
		setting.ID, setting.UserID, setting.ProductKey, setting.Channel, setting.PublicationName, setting.PublicationURL,
		setting.DefaultCategory, setting.PrimaryAudience, setting.ToneGuide, setting.DefaultCTA,
		setting.ProofPoints, setting.ReferenceNotes, setting.CreatedAt, setting.UpdatedAt,
	)
	return err
}
