package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type GuidedReviewRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewGuidedReviewRepository(pool *pgxpool.Pool) repositories.GuidedReviewRepository {
	return &GuidedReviewRepositoryImpl{pool: pool}
}

func (r *GuidedReviewRepositoryImpl) GetOrCreateToday(ctx context.Context, userID uuid.UUID, date string) (*entities.GuidedReview, []*entities.GuidedReviewItem, error) {
	// Try to get existing review for the date
	var review entities.GuidedReview
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, review_date, status, completed_at, created_at
		FROM guided_reviews
		WHERE user_id = $1 AND review_date = $2
	`, userID, date).Scan(
		&review.ID, &review.UserID, &review.ReviewDate,
		&review.Status, &review.CompletedAt, &review.CreatedAt,
	)

	if err == pgx.ErrNoRows {
		// Create new review
		review.ID = uuid.New()
		review.UserID = userID
		review.ReviewDate = date
		review.Status = entities.GuidedReviewStatusPending
		review.CreatedAt = time.Now().UTC()

		_, err = r.pool.Exec(ctx, `
			INSERT INTO guided_reviews (id, user_id, review_date, status, created_at)
			VALUES ($1, $2, $3, $4, $5)
		`, review.ID, review.UserID, review.ReviewDate, review.Status, review.CreatedAt)
		if err != nil {
			return nil, nil, fmt.Errorf("insert guided_reviews: %w", err)
		}

		// Auto-create items from trades for this date
		if err := r.createItemsFromTrades(ctx, userID, review.ID, date); err != nil {
			return nil, nil, fmt.Errorf("create items from trades: %w", err)
		}
	} else if err != nil {
		return nil, nil, fmt.Errorf("query guided_reviews: %w", err)
	}

	// Load items
	items, err := r.loadItems(ctx, review.ID)
	if err != nil {
		return nil, nil, err
	}

	return &review, items, nil
}

func (r *GuidedReviewRepositoryImpl) createItemsFromTrades(ctx context.Context, userID, reviewID uuid.UUID, date string) error {
	// Query trades for this user on this date, grouped by symbol
	rows, err := r.pool.Query(ctx, `
		SELECT
			symbol,
			MIN(id) AS sample_trade_id,
			MAX(side) AS side,
			SUM(COALESCE(CAST(realized_pnl AS NUMERIC), 0)) AS total_pnl,
			COUNT(*) AS trade_count
		FROM trades
		WHERE user_id = $1
		  AND trade_time::date = $2::date
		GROUP BY symbol
		ORDER BY COUNT(*) DESC
	`, userID, date)
	if err != nil {
		return fmt.Errorf("query trades: %w", err)
	}
	defer rows.Close()

	orderIndex := 0
	for rows.Next() {
		var symbol string
		var sampleTradeID uuid.UUID
		var side *string
		var totalPnl *float64
		var tradeCount int

		if err := rows.Scan(&symbol, &sampleTradeID, &side, &totalPnl, &tradeCount); err != nil {
			return fmt.Errorf("scan trade group: %w", err)
		}

		bundleKey := fmt.Sprintf("%s:%s", symbol, date)
		var tradeIDPtr *uuid.UUID
		if tradeCount == 1 {
			tradeIDPtr = &sampleTradeID
		}

		itemID := uuid.New()
		_, err = r.pool.Exec(ctx, `
			INSERT INTO guided_review_items (id, review_id, trade_id, bundle_key, symbol, side, pnl, trade_count, order_index, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
		`, itemID, reviewID, tradeIDPtr, bundleKey, symbol, side, totalPnl, tradeCount, orderIndex)
		if err != nil {
			return fmt.Errorf("insert guided_review_items: %w", err)
		}
		orderIndex++
	}

	return rows.Err()
}

func (r *GuidedReviewRepositoryImpl) loadItems(ctx context.Context, reviewID uuid.UUID) ([]*entities.GuidedReviewItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, review_id, trade_id, bundle_key, symbol, side, pnl, trade_count,
		       intent, emotions, pattern_match, memo, order_index, created_at
		FROM guided_review_items
		WHERE review_id = $1
		ORDER BY order_index ASC
	`, reviewID)
	if err != nil {
		return nil, fmt.Errorf("query guided_review_items: %w", err)
	}
	defer rows.Close()

	var items []*entities.GuidedReviewItem
	for rows.Next() {
		var item entities.GuidedReviewItem
		if err := rows.Scan(
			&item.ID, &item.ReviewID, &item.TradeID, &item.BundleKey,
			&item.Symbol, &item.Side, &item.PnL, &item.TradeCount,
			&item.Intent, &item.Emotions, &item.PatternMatch, &item.Memo,
			&item.OrderIndex, &item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan guided_review_item: %w", err)
		}
		items = append(items, &item)
	}

	return items, rows.Err()
}

func (r *GuidedReviewRepositoryImpl) SubmitItem(ctx context.Context, userID uuid.UUID, itemID uuid.UUID, input repositories.SubmitItemInput) error {
	// Verify ownership: item belongs to a review owned by user
	var reviewUserID uuid.UUID
	var reviewID uuid.UUID
	err := r.pool.QueryRow(ctx, `
		SELECT gr.user_id, gr.id
		FROM guided_review_items gri
		JOIN guided_reviews gr ON gr.id = gri.review_id
		WHERE gri.id = $1
	`, itemID).Scan(&reviewUserID, &reviewID)
	if err == pgx.ErrNoRows {
		return fmt.Errorf("item not found")
	}
	if err != nil {
		return fmt.Errorf("verify item ownership: %w", err)
	}
	if reviewUserID != userID {
		return fmt.Errorf("item not found")
	}

	// Update item
	var intentPtr *string
	if input.Intent != "" {
		intentPtr = &input.Intent
	}
	var emotionsPtr json.RawMessage
	if len(input.Emotions) > 0 && string(input.Emotions) != "null" {
		emotionsPtr = input.Emotions
	}
	var patternPtr *string
	if input.PatternMatch != "" {
		patternPtr = &input.PatternMatch
	}
	var memoPtr *string
	if input.Memo != "" {
		memoPtr = &input.Memo
	}

	_, err = r.pool.Exec(ctx, `
		UPDATE guided_review_items
		SET intent = $1, emotions = $2, pattern_match = $3, memo = $4
		WHERE id = $5
	`, intentPtr, emotionsPtr, patternPtr, memoPtr, itemID)
	if err != nil {
		return fmt.Errorf("update guided_review_items: %w", err)
	}

	// Update review status to in_progress if still pending
	_, err = r.pool.Exec(ctx, `
		UPDATE guided_reviews
		SET status = $1
		WHERE id = $2 AND status = $3
	`, entities.GuidedReviewStatusInProgress, reviewID, entities.GuidedReviewStatusPending)

	return err
}

func (r *GuidedReviewRepositoryImpl) CompleteReview(ctx context.Context, userID uuid.UUID, reviewID uuid.UUID) (*entities.UserStreak, error) {
	// Verify ownership
	var review entities.GuidedReview
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, review_date, status FROM guided_reviews WHERE id = $1
	`, reviewID).Scan(&review.ID, &review.UserID, &review.ReviewDate, &review.Status)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("review not found")
	}
	if err != nil {
		return nil, fmt.Errorf("query review: %w", err)
	}
	if review.UserID != userID {
		return nil, fmt.Errorf("review not found")
	}

	// Mark review as completed
	now := time.Now().UTC()
	_, err = r.pool.Exec(ctx, `
		UPDATE guided_reviews
		SET status = $1, completed_at = $2
		WHERE id = $3
	`, entities.GuidedReviewStatusCompleted, now, reviewID)
	if err != nil {
		return nil, fmt.Errorf("complete review: %w", err)
	}

	// Update streak
	streak, err := r.updateStreak(ctx, userID, review.ReviewDate)
	if err != nil {
		return nil, fmt.Errorf("update streak: %w", err)
	}

	return streak, nil
}

func (r *GuidedReviewRepositoryImpl) updateStreak(ctx context.Context, userID uuid.UUID, reviewDate string) (*entities.UserStreak, error) {
	// Upsert user_streaks
	var streak entities.UserStreak
	err := r.pool.QueryRow(ctx, `
		SELECT user_id, current_streak, longest_streak, last_review_date, updated_at
		FROM user_streaks WHERE user_id = $1
	`, userID).Scan(&streak.UserID, &streak.CurrentStreak, &streak.LongestStreak, &streak.LastReviewDate, &streak.UpdatedAt)

	if err == pgx.ErrNoRows {
		// First ever review
		streak = entities.UserStreak{
			UserID:         userID,
			CurrentStreak:  1,
			LongestStreak:  1,
			LastReviewDate: &reviewDate,
			UpdatedAt:      time.Now().UTC(),
		}
		_, err = r.pool.Exec(ctx, `
			INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_review_date, updated_at)
			VALUES ($1, $2, $3, $4, $5)
		`, streak.UserID, streak.CurrentStreak, streak.LongestStreak, streak.LastReviewDate, streak.UpdatedAt)
		if err != nil {
			return nil, err
		}
		return &streak, nil
	}
	if err != nil {
		return nil, err
	}

	// Calculate new streak
	if streak.LastReviewDate != nil && *streak.LastReviewDate == reviewDate {
		// Same day, no change
		return &streak, nil
	}

	// Check if yesterday
	reviewTime, _ := time.Parse("2006-01-02", reviewDate)
	var isConsecutive bool
	if streak.LastReviewDate != nil {
		lastTime, _ := time.Parse("2006-01-02", *streak.LastReviewDate)
		diff := reviewTime.Sub(lastTime).Hours() / 24
		isConsecutive = diff >= 0.5 && diff <= 1.5
	}

	if isConsecutive {
		streak.CurrentStreak++
	} else {
		streak.CurrentStreak = 1
	}
	if streak.CurrentStreak > streak.LongestStreak {
		streak.LongestStreak = streak.CurrentStreak
	}
	streak.LastReviewDate = &reviewDate
	streak.UpdatedAt = time.Now().UTC()

	_, err = r.pool.Exec(ctx, `
		UPDATE user_streaks
		SET current_streak = $1, longest_streak = $2, last_review_date = $3, updated_at = $4
		WHERE user_id = $5
	`, streak.CurrentStreak, streak.LongestStreak, streak.LastReviewDate, streak.UpdatedAt, streak.UserID)
	if err != nil {
		return nil, err
	}

	return &streak, nil
}

func (r *GuidedReviewRepositoryImpl) GetStreak(ctx context.Context, userID uuid.UUID) (*entities.UserStreak, error) {
	var streak entities.UserStreak
	err := r.pool.QueryRow(ctx, `
		SELECT user_id, current_streak, longest_streak, last_review_date, updated_at
		FROM user_streaks WHERE user_id = $1
	`, userID).Scan(&streak.UserID, &streak.CurrentStreak, &streak.LongestStreak, &streak.LastReviewDate, &streak.UpdatedAt)

	if err == pgx.ErrNoRows {
		return &entities.UserStreak{
			UserID:        userID,
			CurrentStreak: 0,
			LongestStreak: 0,
			UpdatedAt:     time.Now().UTC(),
		}, nil
	}
	if err != nil {
		return nil, err
	}
	return &streak, nil
}

func (r *GuidedReviewRepositoryImpl) ListReviews(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*entities.GuidedReview, int, error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM guided_reviews WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, review_date, status, completed_at, created_at
		FROM guided_reviews
		WHERE user_id = $1
		ORDER BY review_date DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var reviews []*entities.GuidedReview
	for rows.Next() {
		var r entities.GuidedReview
		if err := rows.Scan(&r.ID, &r.UserID, &r.ReviewDate, &r.Status, &r.CompletedAt, &r.CreatedAt); err != nil {
			return nil, 0, err
		}
		reviews = append(reviews, &r)
	}

	return reviews, total, rows.Err()
}
