package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/auth"
)

type UserHandler struct {
	userRepo         repositories.UserRepository
	subscriptionRepo repositories.SubscriptionRepository
}

func NewUserHandler(
	userRepo repositories.UserRepository,
	subscriptionRepo repositories.SubscriptionRepository,
) *UserHandler {
	return &UserHandler{
		userRepo:         userRepo,
		subscriptionRepo: subscriptionRepo,
	}
}

type SubscriptionInfo struct {
	Tier             string     `json:"tier"`
	AIQuotaRemaining int        `json:"ai_quota_remaining"`
	AIQuotaLimit     int        `json:"ai_quota_limit"`
	LastResetAt      *time.Time `json:"last_reset_at,omitempty"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
}

type UserProfileResponse struct {
	ID            uuid.UUID         `json:"id"`
	Email         string            `json:"email"`
	Name          string            `json:"name"`
	PasswordSet   bool              `json:"password_set"`
	AIAllowlisted bool              `json:"ai_allowlisted"`
	IsAdmin       bool              `json:"is_admin"`
	CreatedAt     time.Time         `json:"created_at"`
	Subscription  *SubscriptionInfo `json:"subscription,omitempty"`
}

type UpdateProfileRequest struct {
	Name string `json:"name"`
}

type SetPasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type SubscriptionResponse struct {
	Tier             string     `json:"tier"`
	AIQuotaRemaining int        `json:"ai_quota_remaining"`
	AIQuotaLimit     int        `json:"ai_quota_limit"`
	LastResetAt      *time.Time `json:"last_reset_at,omitempty"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
}

// GetProfile returns the authenticated user's profile with subscription info
func (h *UserHandler) GetProfile(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	user, err := h.userRepo.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if user == nil {
		return c.Status(404).JSON(fiber.Map{"code": "USER_NOT_FOUND", "message": "user not found"})
	}

	subscription, err := h.subscriptionRepo.GetByUserID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	var subInfo *SubscriptionInfo
	if subscription != nil {
		subInfo = &SubscriptionInfo{
			Tier:             subscription.Tier,
			AIQuotaRemaining: subscription.AIQuotaRemaining,
			AIQuotaLimit:     subscription.AIQuotaLimit,
			LastResetAt:      &subscription.LastResetAt,
			ExpiresAt:        subscription.ExpiresAt,
		}
	}

	response := UserProfileResponse{
		ID:            user.ID,
		Email:         user.Email,
		Name:          user.Name,
		PasswordSet:   user.PasswordSet,
		AIAllowlisted: user.AIAllowlisted,
		IsAdmin:       user.IsAdmin,
		CreatedAt:     user.CreatedAt,
		Subscription:  subInfo,
	}

	return c.Status(200).JSON(response)
}

// UpdateProfile updates the authenticated user's profile (name only)
func (h *UserHandler) UpdateProfile(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "name is required"})
	}

	user, err := h.userRepo.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if user == nil {
		return c.Status(404).JSON(fiber.Map{"code": "USER_NOT_FOUND", "message": "user not found"})
	}

	user.Name = req.Name
	user.UpdatedAt = time.Now()

	if err := h.userRepo.Update(c.Context(), user); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	subscription, err := h.subscriptionRepo.GetByUserID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	var subInfo *SubscriptionInfo
	if subscription != nil {
		subInfo = &SubscriptionInfo{
			Tier:             subscription.Tier,
			AIQuotaRemaining: subscription.AIQuotaRemaining,
			LastResetAt:      &subscription.LastResetAt,
			ExpiresAt:        subscription.ExpiresAt,
		}
	}

	response := UserProfileResponse{
		ID:            user.ID,
		Email:         user.Email,
		Name:          user.Name,
		PasswordSet:   user.PasswordSet,
		AIAllowlisted: user.AIAllowlisted,
		IsAdmin:       user.IsAdmin,
		CreatedAt:     user.CreatedAt,
		Subscription:  subInfo,
	}

	return c.Status(200).JSON(response)
}

// GetSubscription returns the authenticated user's subscription details
func (h *UserHandler) GetSubscription(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	subscription, err := h.subscriptionRepo.GetByUserID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if subscription == nil {
		return c.Status(404).JSON(fiber.Map{"code": "SUBSCRIPTION_NOT_FOUND", "message": "subscription not found"})
	}

	response := SubscriptionResponse{
		Tier:             subscription.Tier,
		AIQuotaRemaining: subscription.AIQuotaRemaining,
		AIQuotaLimit:     subscription.AIQuotaLimit,
		LastResetAt:      &subscription.LastResetAt,
		ExpiresAt:        subscription.ExpiresAt,
	}

	return c.Status(200).JSON(response)
}

// SetPassword sets or changes the authenticated user's password.
// - For password_set=false accounts (social-only), current_password is not required.
// - For password_set=true accounts, current_password must match.
func (h *UserHandler) SetPassword(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req SetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}
	if req.NewPassword == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "new_password is required"})
	}

	user, err := h.userRepo.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if user == nil {
		return c.Status(404).JSON(fiber.Map{"code": "USER_NOT_FOUND", "message": "user not found"})
	}

	if user.PasswordSet {
		if req.CurrentPassword == "" {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "current_password is required"})
		}
		if err := auth.ComparePassword(user.PasswordHash, req.CurrentPassword); err != nil {
			return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid current password"})
		}
	}

	passwordHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	user.PasswordHash = passwordHash
	user.PasswordSet = true
	user.UpdatedAt = time.Now().UTC()
	if err := h.userRepo.Update(c.Context(), user); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"message": "password updated"})
}
