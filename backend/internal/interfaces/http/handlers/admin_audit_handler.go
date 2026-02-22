package handlers

import (
	"context"
	"database/sql"
	"fmt"
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
	action := strings.ToLower(strings.TrimSpace(c.Query("action")))
	resource := strings.ToLower(strings.TrimSpace(c.Query("resource")))

	limit, err := parsePositiveIntOrDefault(c.Query("limit"), 50)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid limit"})
	}
	offset, err := parseIntOrDefault(c.Query("offset"), 0)
	if err != nil || offset < 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid offset"})
	}

	logs, total, err := h.listAuditLogs(c.Context(), limit, offset, search, action, resource)
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

func (h *AdminAuditHandler) listAuditLogs(ctx context.Context, limit int, offset int, search string, action string, resource string) ([]AdminAuditLogItem, int, error) {
	where, args := buildAuditLogFilters(search, action, resource)

	query := `
		SELECT
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
		 LEFT JOIN users target ON target.id = l.target_user_id`
	if where != "" {
		query = fmt.Sprintf("%s WHERE %s", query, where)
	}
	query = fmt.Sprintf("%s ORDER BY l.created_at DESC LIMIT $%d OFFSET $%d", query, len(args)+1, len(args)+2)

	queryArgs := make([]any, 0, len(args)+2)
	queryArgs = append(queryArgs, args...)
	queryArgs = append(queryArgs, limit, offset)

	total, err := h.countAdminAuditLogs(ctx, where, args)
	if err != nil {
		return nil, 0, err
	}

	rows, err := h.pool.Query(ctx, query, queryArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	logs := make([]AdminAuditLogItem, 0, limit)
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

func buildAuditLogFilters(search string, action string, resource string) (string, []any) {
	conditions := make([]string, 0, 3)
	args := make([]any, 0, 5)

	if action != "" {
		args = append(args, action)
		conditions = append(conditions, fmt.Sprintf("lower(l.action) = $%d", len(args)))
	}

	if resource != "" {
		args = append(args, resource)
		conditions = append(conditions, fmt.Sprintf("lower(l.action_resource) = $%d", len(args)))
	}

	searchNeedle := strings.TrimSpace(strings.ToLower(search))
	if searchNeedle != "" {
		searchNeedle = "%" + searchNeedle + "%"
		args = append(args, searchNeedle)
		searchIndex := len(args)
		conditions = append(conditions, fmt.Sprintf(
			"(lower(actor.email) LIKE $%d OR lower(target.email) LIKE $%d OR lower(l.action) LIKE $%d OR lower(l.action_target) LIKE $%d OR lower(l.action_resource) LIKE $%d)",
			searchIndex, searchIndex, searchIndex, searchIndex, searchIndex,
		))
	}

	return strings.Join(conditions, " AND "), args
}

func (h *AdminAuditHandler) countAdminAuditLogs(ctx context.Context, where string, args []any) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM admin_audit_logs l
		LEFT JOIN users actor ON actor.id = l.actor_user_id
		LEFT JOIN users target ON target.id = l.target_user_id`
	if where != "" {
		query = fmt.Sprintf("%s WHERE %s", query, where)
	}

	var total int
	if len(args) == 0 {
		return 0, h.pool.QueryRow(ctx, query).Scan(&total)
	}
	return total, h.pool.QueryRow(ctx, query, args...).Scan(&total)
}
