package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AdminUsersHandler struct {
	userRepo repositories.UserRepository
}

type AdminUserItem struct {
	ID            uuid.UUID `json:"id"`
	Email         string    `json:"email"`
	Name          string    `json:"name"`
	AIAllowlisted bool      `json:"ai_allowlisted"`
	IsAdmin       bool      `json:"is_admin"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type AdminUsersListResponse struct {
	Users  []AdminUserItem `json:"users"`
	Total  int             `json:"total"`
	Limit  int             `json:"limit"`
	Offset int             `json:"offset"`
}

type AdminUpdateUserRoleRequest struct {
	IsAdmin bool `json:"is_admin"`
}

func NewAdminUsersHandler(userRepo repositories.UserRepository) *AdminUsersHandler {
	return &AdminUsersHandler{userRepo: userRepo}
}

func (h *AdminUsersHandler) List(c *fiber.Ctx) error {
	search := strings.TrimSpace(c.Query("search"))
	limit, err := parsePositiveIntOrDefault(c.Query("limit"), 50)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid limit"})
	}
	offset, err := parseIntOrDefault(c.Query("offset"), 0)
	if err != nil || offset < 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid offset"})
	}

	users, err := h.userRepo.ListForAdmin(c.Context(), limit, offset, search)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	total, err := h.userRepo.CountForAdmin(c.Context(), search)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]AdminUserItem, 0, len(users))
	for _, user := range users {
		items = append(items, AdminUserItem{
			ID:            user.ID,
			Email:         user.Email,
			Name:          user.Name,
			AIAllowlisted: user.AIAllowlisted,
			IsAdmin:       user.IsAdmin,
			CreatedAt:     user.CreatedAt,
			UpdatedAt:     user.UpdatedAt,
		})
	}

	return c.Status(http.StatusOK).JSON(AdminUsersListResponse{
		Users:  items,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

func (h *AdminUsersHandler) UpdateAdmin(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid user id"})
	}

	requesterID, ok := c.Locals("userID").(uuid.UUID)
	if ok && requesterID == id {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"code": "FORBIDDEN", "message": "cannot modify your own admin role from API"})
	}

	var req AdminUpdateUserRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid payload"})
	}

	if err := h.userRepo.SetAdmin(c.Context(), id, req.IsAdmin); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"message": "user role updated"})
}

func parseIntOrDefault(raw string, fallback int) (int, error) {
	if raw == "" {
		return fallback, nil
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return 0, err
	}
	return v, nil
}

func parsePositiveIntOrDefault(raw string, fallback int) (int, error) {
	v, err := parseIntOrDefault(raw, fallback)
	if err != nil {
		return 0, err
	}
	if v <= 0 {
		return fallback, nil
	}
	return v, nil
}
