package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type ReviewNoteRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewReviewNoteRepository(pool *pgxpool.Pool) repositories.ReviewNoteRepository {
	return &ReviewNoteRepositoryImpl{pool: pool}
}

func (r *ReviewNoteRepositoryImpl) Create(ctx context.Context, note *entities.ReviewNote) error {
	query := `
		INSERT INTO review_notes (id, user_id, bubble_id, title, content, tags, lesson_learned, emotion, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	note.ID = uuid.New()
	note.CreatedAt = time.Now()
	note.UpdatedAt = time.Now()

	_, err := r.pool.Exec(ctx, query,
		note.ID, note.UserID, note.BubbleID, note.Title, note.Content,
		note.Tags, note.LessonLearned, note.Emotion, note.CreatedAt, note.UpdatedAt)
	return err
}

func (r *ReviewNoteRepositoryImpl) Update(ctx context.Context, note *entities.ReviewNote) error {
	query := `
		UPDATE review_notes
		SET title = $1, content = $2, tags = $3, lesson_learned = $4, emotion = $5, bubble_id = $6, updated_at = $7
		WHERE id = $8 AND user_id = $9
	`
	note.UpdatedAt = time.Now()
	_, err := r.pool.Exec(ctx, query,
		note.Title, note.Content, note.Tags, note.LessonLearned, note.Emotion,
		note.BubbleID, note.UpdatedAt, note.ID, note.UserID)
	return err
}

func (r *ReviewNoteRepositoryImpl) Delete(ctx context.Context, id, userID uuid.UUID) error {
	query := `DELETE FROM review_notes WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, id, userID)
	return err
}

func (r *ReviewNoteRepositoryImpl) GetByID(ctx context.Context, id, userID uuid.UUID) (*entities.ReviewNote, error) {
	query := `
		SELECT id, user_id, bubble_id, title, content, tags, lesson_learned, emotion, created_at, updated_at
		FROM review_notes
		WHERE id = $1 AND user_id = $2
	`
	var note entities.ReviewNote
	var emotion *string
	var lessonLearned *string

	err := r.pool.QueryRow(ctx, query, id, userID).Scan(
		&note.ID, &note.UserID, &note.BubbleID, &note.Title, &note.Content,
		&note.Tags, &lessonLearned, &emotion, &note.CreatedAt, &note.UpdatedAt)
	if err != nil {
		return nil, err
	}

	if emotion != nil {
		note.Emotion = entities.Emotion(*emotion)
	}
	if lessonLearned != nil {
		note.LessonLearned = *lessonLearned
	}

	return &note, nil
}

func (r *ReviewNoteRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*entities.ReviewNote, int, error) {
	countQuery := `SELECT COUNT(*) FROM review_notes WHERE user_id = $1`
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, user_id, bubble_id, title, content, tags, lesson_learned, emotion, created_at, updated_at
		FROM review_notes
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var notes []*entities.ReviewNote
	for rows.Next() {
		var note entities.ReviewNote
		var emotion *string
		var lessonLearned *string

		if err := rows.Scan(
			&note.ID, &note.UserID, &note.BubbleID, &note.Title, &note.Content,
			&note.Tags, &lessonLearned, &emotion, &note.CreatedAt, &note.UpdatedAt); err != nil {
			return nil, 0, err
		}

		if emotion != nil {
			note.Emotion = entities.Emotion(*emotion)
		}
		if lessonLearned != nil {
			note.LessonLearned = *lessonLearned
		}

		notes = append(notes, &note)
	}

	return notes, total, rows.Err()
}

func (r *ReviewNoteRepositoryImpl) ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.ReviewNote, error) {
	query := `
		SELECT id, user_id, bubble_id, title, content, tags, lesson_learned, emotion, created_at, updated_at
		FROM review_notes
		WHERE bubble_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, bubbleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []*entities.ReviewNote
	for rows.Next() {
		var note entities.ReviewNote
		var emotion *string
		var lessonLearned *string

		if err := rows.Scan(
			&note.ID, &note.UserID, &note.BubbleID, &note.Title, &note.Content,
			&note.Tags, &lessonLearned, &emotion, &note.CreatedAt, &note.UpdatedAt); err != nil {
			return nil, err
		}

		if emotion != nil {
			note.Emotion = entities.Emotion(*emotion)
		}
		if lessonLearned != nil {
			note.LessonLearned = *lessonLearned
		}

		notes = append(notes, &note)
	}

	return notes, rows.Err()
}
