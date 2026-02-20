package handlers

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AdminTelemetryResponse struct {
	SnapshotAt         time.Time `json:"snapshot_at"`
	TotalUsers         int64     `json:"total_users"`
	TotalAdmins        int64     `json:"total_admins"`
	TotalSubscriptions int64     `json:"total_subscriptions"`
	TotalTrades        int64     `json:"total_trades"`
	TotalBubbles       int64     `json:"total_bubbles"`
	TotalReviewNotes   int64     `json:"total_review_notes"`
	TotalRuns          int64     `json:"total_runs"`
	TotalSummaryPacks  int64     `json:"total_summary_packs"`
}

type AdminServiceSummary struct {
	RunType       string     `json:"run_type"`
	TotalRuns     int64      `json:"total_runs"`
	RunningRuns   int64      `json:"running_runs"`
	CompletedRuns int64      `json:"completed_runs"`
	FailedRuns    int64      `json:"failed_runs"`
	OtherRuns     int64      `json:"other_runs"`
	LastStarted   *time.Time `json:"last_started_at"`
}

type AdminServiceRun struct {
	RunID      string         `json:"run_id"`
	RunType    string         `json:"run_type"`
	Status     string         `json:"status"`
	UserID     string         `json:"user_id"`
	UserEmail  string         `json:"user_email"`
	StartedAt  time.Time      `json:"started_at"`
	FinishedAt *time.Time     `json:"finished_at"`
	Meta       map[string]any `json:"meta"`
}

type AdminServicesResponse struct {
	SnapshotAt time.Time             `json:"snapshot_at"`
	Services   []AdminServiceSummary `json:"services"`
	Runs       []AdminServiceRun     `json:"runs"`
}

type AdminMetricsHandler struct {
	pool *pgxpool.Pool
}

func NewAdminMetricsHandler(pool *pgxpool.Pool) *AdminMetricsHandler {
	return &AdminMetricsHandler{pool: pool}
}

func (h *AdminMetricsHandler) Telemetry(c *fiber.Ctx) error {
	query := `
		SELECT
			(SELECT COUNT(*) FROM users),
			(SELECT COUNT(*) FROM users WHERE is_admin = true),
			(SELECT COUNT(*) FROM subscriptions),
			(SELECT COUNT(*) FROM trades),
			(SELECT COUNT(*) FROM bubbles),
			(SELECT COUNT(*) FROM review_notes),
			(SELECT COUNT(*) FROM runs),
			(SELECT COUNT(*) FROM summary_packs)
	`
	var totalUsers, totalAdmins, totalSubscriptions, totalTrades, totalBubbles, totalReviewNotes, totalRuns, totalSummaryPacks int64
	err := h.pool.QueryRow(c.Context(), query).Scan(
		&totalUsers,
		&totalAdmins,
		&totalSubscriptions,
		&totalTrades,
		&totalBubbles,
		&totalReviewNotes,
		&totalRuns,
		&totalSummaryPacks,
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"code":    "INTERNAL_ERROR",
			"message": err.Error(),
		})
	}

	return c.JSON(AdminTelemetryResponse{
		SnapshotAt:         time.Now().UTC(),
		TotalUsers:         totalUsers,
		TotalAdmins:        totalAdmins,
		TotalSubscriptions: totalSubscriptions,
		TotalTrades:        totalTrades,
		TotalBubbles:       totalBubbles,
		TotalReviewNotes:   totalReviewNotes,
		TotalRuns:          totalRuns,
		TotalSummaryPacks:  totalSummaryPacks,
	})
}

func (h *AdminMetricsHandler) AgentServices(c *fiber.Ctx) error {
	services, err := h.fetchAgentServices(c)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"code":    "INTERNAL_ERROR",
			"message": err.Error(),
		})
	}

	runs, err := h.fetchAgentRuns(c, 50)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"code":    "INTERNAL_ERROR",
			"message": err.Error(),
		})
	}

	return c.JSON(AdminServicesResponse{
		SnapshotAt: time.Now().UTC(),
		Services:   services,
		Runs:       runs,
	})
}

func (h *AdminMetricsHandler) fetchAgentServices(c *fiber.Ctx) ([]AdminServiceSummary, error) {
	query := `
		SELECT
			run_type,
			COUNT(*)::bigint AS total_runs,
			COUNT(*) FILTER (WHERE status = 'running')::bigint AS running_runs,
			COUNT(*) FILTER (WHERE status = 'completed')::bigint AS completed_runs,
			COUNT(*) FILTER (WHERE status = 'failed')::bigint AS failed_runs,
			COUNT(*) FILTER (WHERE status NOT IN ('running', 'completed', 'failed'))::bigint AS other_runs,
			MAX(started_at) AS last_started_at
		FROM runs
		GROUP BY run_type
		ORDER BY run_type
	`

	rows, err := h.pool.Query(c.Context(), query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	services := make([]AdminServiceSummary, 0)
	for rows.Next() {
		var service AdminServiceSummary
		if err := rows.Scan(
			&service.RunType,
			&service.TotalRuns,
			&service.RunningRuns,
			&service.CompletedRuns,
			&service.FailedRuns,
			&service.OtherRuns,
			&service.LastStarted,
		); err != nil {
			return nil, err
		}
		services = append(services, service)
	}
	return services, nil
}

func (h *AdminMetricsHandler) fetchAgentRuns(c *fiber.Ctx, limit int) ([]AdminServiceRun, error) {
	query := `
		SELECT
			r.run_id,
			r.user_id,
			u.email,
			r.run_type,
			r.status,
			r.started_at,
			r.finished_at,
			COALESCE(r.meta, '{}'::jsonb)
		FROM runs r
		LEFT JOIN users u ON u.id = r.user_id
		ORDER BY r.started_at DESC
		LIMIT $1
	`

	rows, err := h.pool.Query(c.Context(), query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	runs := make([]AdminServiceRun, 0)
	for rows.Next() {
		var (
			run       AdminServiceRun
			runID     uuid.UUID
			userID    uuid.UUID
			userEmail sql.NullString
			metaRaw   []byte
		)
		if err := rows.Scan(
			&runID,
			&userID,
			&userEmail,
			&run.RunType,
			&run.Status,
			&run.StartedAt,
			&run.FinishedAt,
			&metaRaw,
		); err != nil {
			return nil, err
		}

		run.RunID = runID.String()
		run.UserID = userID.String()
		run.UserEmail = userEmail.String
		if err := json.Unmarshal(metaRaw, &run.Meta); err != nil {
			run.Meta = map[string]any{
				"meta_parse_error": err.Error(),
			}
		}
		runs = append(runs, run)
	}

	return runs, nil
}
