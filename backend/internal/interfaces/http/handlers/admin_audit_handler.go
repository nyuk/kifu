package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AdminAuditLogItem struct {
	ID             uuid.UUID      `json:"id"`
	ActorUserID    *string        `json:"actor_user_id"`
	ActorEmail     string         `json:"actor_email"`
	TargetUserID   *string        `json:"target_user_id"`
	TargetEmail    string         `json:"target_email"`
	Action         string         `json:"action"`
	ActionTarget   string         `json:"action_target"`
	ActionResource string         `json:"action_resource"`
	Details        map[string]any `json:"details"`
	CreatedAt      time.Time      `json:"created_at"`
}

type AdminAuditLogResponse struct {
	Logs   []AdminAuditLogItem `json:"logs"`
	Total  int                 `json:"total"`
	Limit  int                 `json:"limit"`
	Offset int                 `json:"offset"`
}

type AdminAuditHandler struct {
	pool *pgxpool.Pool
}

func NewAdminAuditHandler(pool *pgxpool.Pool) *AdminAuditHandler {
	return &AdminAuditHandler{pool: pool}
}

func (h *AdminAuditHandler) List(c *fiber.Ctx) error {
	search := strings.TrimSpace(c.Query("search"))
	limit, err := parsePositiveIntOrDefault(c.Query("limit"), 50)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid limit"})
	}
	offset, err := parseIntOrDefault(c.Query("offset"), 0)
	if err != nil || offset < 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid offset"})
	}

	logs, total, err := h.listAuditLogs(c.Context(), limit, offset, search)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(http.StatusOK).JSON(AdminAuditLogResponse{
		Logs:   logs,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

func (h *AdminAuditHandler) listAuditLogs(ctx context.Context, limit int, offset int, search string) ([]AdminAuditLogItem, int, error) {
	needle := strings.ToLower(search)
	if needle != "" {
		needle = "%" + strings.TrimSpace(needle) + "%"
	}

	logs := make([]AdminAuditLogItem, 0, limit)

	var total int
	var err error
	if needle == "" {
		total, err = h.countAdminAuditLogs(ctx, "")
		if err != nil {
			return nil, 0, err
		}
		rows, err := h.pool.Query(
			ctx,
			`SELECT
				l.id,
				l.actor_user_id,
				actor.email,
				l.target_user_id,
				target.email,
				l.action,
				l.action_target,
				l.action_resource,
				l.details,
				l.created_at
			 FROM admin_audit_logs l
			 LEFT JOIN users actor ON actor.id = l.actor_user_id
			 LEFT JOIN users target ON target.id = l.target_user_id
			 ORDER BY l.created_at DESC
			 LIMIT $1 OFFSET $2`,
			limit,
			offset,
		)
		if err != nil {
			return nil, 0, err
		}
		defer rows.Close()

		for rows.Next() {
			var item AdminAuditLogItem
			var actorUserID sql.NullString
			var targetUserID sql.NullString
			if err := rows.Scan(
				&item.ID,
				&actorUserID,
				&item.ActorEmail,
				&targetUserID,
				&item.TargetEmail,
				&item.Action,
				&item.ActionTarget,
				&item.ActionResource,
				&item.Details,
				&item.CreatedAt,
			); err != nil {
				return nil, 0, err
			}
			if actorUserID.Valid {
				item.ActorUserID = &actorUserID.String
			}
			if targetUserID.Valid {
				item.TargetUserID = &targetUserID.String
			}
			logs = append(logs, item)
		}
		if err := rows.Err(); err != nil {
			return nil, 0, err
		}
		return logs, total, nil
	}

	total, err = h.countAdminAuditLogs(ctx, needle)
	if err != nil {
		return nil, 0, err
	}

	rows, err := h.pool.Query(
		ctx,
		`SELECT
			l.id,
			l.actor_user_id,
			actor.email,
			l.target_user_id,
			target.email,
			l.action,
			l.action_target,
			l.action_resource,
			l.details,
			l.created_at
		 FROM admin_audit_logs l
		 LEFT JOIN users actor ON actor.id = l.actor_user_id
		 LEFT JOIN users target ON target.id = l.target_user_id
		 WHERE lower(actor.email) LIKE $1 OR lower(target.email) LIKE $1 OR lower(l.action) LIKE $1 OR lower(l.action_target) LIKE $1 OR lower(l.action_resource) LIKE $1
		 ORDER BY l.created_at DESC
		 LIMIT $2 OFFSET $3`,
		needle,
		limit,
		offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	for rows.Next() {
		var item AdminAuditLogItem
		var actorUserID sql.NullString
		var targetUserID sql.NullString
		if err := rows.Scan(
			&item.ID,
			&actorUserID,
			&item.ActorEmail,
			&targetUserID,
			&item.TargetEmail,
			&item.Action,
			&item.ActionTarget,
			&item.ActionResource,
			&item.Details,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		if actorUserID.Valid {
			item.ActorUserID = &actorUserID.String
		}
		if targetUserID.Valid {
			item.TargetUserID = &targetUserID.String
		}
		logs = append(logs, item)
	}

	return logs, total, rows.Err()
}

func (h *AdminAuditHandler) countAdminAuditLogs(ctx context.Context, needle string) (int, error) {
	var total int
	if needle == "" {
		return 0, h.pool.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs").Scan(&total)
	}
	query := `
		SELECT COUNT(*)
		FROM admin_audit_logs l
		LEFT JOIN users actor ON actor.id = l.actor_user_id
		LEFT JOIN users target ON target.id = l.target_user_id
		WHERE lower(actor.email) LIKE $1
		   OR lower(target.email) LIKE $1
		   OR lower(l.action) LIKE $1
		   OR lower(l.action_target) LIKE $1
		   OR lower(l.action_resource) LIKE $1
	`
	return total, h.pool.QueryRow(ctx, query, needle).Scan(&total)
}
