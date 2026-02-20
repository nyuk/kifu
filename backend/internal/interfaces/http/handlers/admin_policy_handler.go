package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var allowedAdminPolicyKeys = map[string]struct{}{
	"admin_user_signup_enabled":     {},
	"maintenance_mode":              {},
	"notification_delivery_enabled": {},
}

type AdminPolicy struct {
	Key         string    `json:"key"`
	Value       bool      `json:"value"`
	Description string    `json:"description"`
	UpdatedBy   *string   `json:"updated_by"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type AdminPolicyListResponse struct {
	Policies []AdminPolicy `json:"policies"`
}

type AdminPolicyUpsertRequest struct {
	Key   string `json:"key"`
	Value bool   `json:"value"`
}

type AdminPolicyHandler struct {
	pool *pgxpool.Pool
}

func NewAdminPolicyHandler(pool *pgxpool.Pool) *AdminPolicyHandler {
	return &AdminPolicyHandler{pool: pool}
}

func (h *AdminPolicyHandler) List(c *fiber.Ctx) error {
	query := `
		SELECT
			key,
			value,
			description,
			updated_by,
			updated_at
		FROM admin_policies
		ORDER BY key`
	rows, err := h.pool.Query(c.Context(), query)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	defer rows.Close()

	policies := make([]AdminPolicy, 0)
	for rows.Next() {
		var (
			policy    AdminPolicy
			updatedBy sql.NullString
			rawValue  []byte
		)

		if err := rows.Scan(
			&policy.Key,
			&rawValue,
			&policy.Description,
			&updatedBy,
			&policy.UpdatedAt,
		); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}

		if updatedBy.Valid {
			policy.UpdatedBy = &updatedBy.String
		}

		var value bool
		if err := json.Unmarshal(rawValue, &value); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INVALID_POLICY_VALUE", "message": "invalid policy value in DB: " + policy.Key})
		}
		policy.Value = value
		policies = append(policies, policy)
	}
	if err := rows.Err(); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(http.StatusOK).JSON(AdminPolicyListResponse{Policies: policies})
}

func (h *AdminPolicyHandler) Upsert(c *fiber.Ctx) error {
	var req AdminPolicyUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid payload"})
	}

	key := strings.TrimSpace(req.Key)
	if key == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "policy key is required"})
	}
	if _, ok := allowedAdminPolicyKeys[key]; !ok {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "unsupported policy key"})
	}

	requesterID, _ := c.Locals("userID").(uuid.UUID)
	if requesterID == uuid.Nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	policy, err := h.upsertPolicy(c.Context(), requesterID, key, req.Value)
	if err != nil {
		if err == pgx.ErrNoRows {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"code": "NOT_FOUND", "message": "policy not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if err := h.logPolicyUpdate(c.Context(), requesterID, policy); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "failed to record policy update audit"})
	}

	return c.Status(http.StatusOK).JSON(policy)
}

func (h *AdminPolicyHandler) upsertPolicy(ctx context.Context, actorID uuid.UUID, key string, value bool) (AdminPolicy, error) {
	const upsertQuery = `
		UPDATE admin_policies
		SET value = to_jsonb($1::boolean), updated_by = $2, updated_at = NOW()
		WHERE key = $3
		RETURNING
			key,
			value,
			description,
			updated_by,
			updated_at
	`

	var (
		policy    AdminPolicy
		updatedBy sql.NullString
		rawValue  []byte
	)

	err := h.pool.QueryRow(ctx, upsertQuery, value, actorID, key).Scan(
		&policy.Key,
		&rawValue,
		&policy.Description,
		&updatedBy,
		&policy.UpdatedAt,
	)
	if err != nil {
		return policy, err
	}

	if err := json.Unmarshal(rawValue, &policy.Value); err != nil {
		return policy, err
	}
	if updatedBy.Valid {
		policy.UpdatedBy = &updatedBy.String
	}

	return policy, nil
}

func (h *AdminPolicyHandler) logPolicyUpdate(ctx context.Context, actorID uuid.UUID, policy AdminPolicy) error {
	if h.pool == nil || actorID == uuid.Nil {
		return nil
	}

	actionDetails := map[string]any{
		"key":   policy.Key,
		"value": policy.Value,
	}

	_, err := h.pool.Exec(
		ctx,
		`INSERT INTO admin_audit_logs (actor_user_id, action, action_target, action_resource, details)
		VALUES ($1, $2, $3, $4, $5)`,
		actorID,
		"admin.policy.update",
		"policy",
		"admin",
		actionDetails,
	)
	return err
}
