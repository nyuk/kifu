package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
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
	Tier              string     `json:"tier"`
	AIQuotaRemaining  int        `json:"ai_quota_remaining"`
	LastResetAt       *time.Time `json:"last_reset_at,omitempty"`
	ExpiresAt         *time.Time `json:"expires_at,omitempty"`
}

type UserProfileResponse struct {
	ID           uuid.UUID          `json:"id"`
	Email        string             `json:"email"`
	Name         string             `json:"name"`
	CreatedAt    time.Time          `json:"created_at"`
	Subscription *SubscriptionInfo  `json:"subscription,omitempty"`
}

type UpdateProfileRequest struct {
	Name string `json:"name"`
}

type SubscriptionResponse struct {
	Tier              string     `json:"tier"`
	AIQuotaRemaining  int        `json:"ai_quota_remaining"`
	LastResetAt       *time.Time `json:"last_reset_at,omitempty"`
	ExpiresAt         *time.Time `json:"expires_at,omitempty"`
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
			LastResetAt:      &subscription.LastResetAt,
			ExpiresAt:        subscription.ExpiresAt,
		}
	}

	response := UserProfileResponse{
		ID:           user.ID,
		Email:        user.Email,
		Name:         user.Name,
		CreatedAt:    user.CreatedAt,
		Subscription: subInfo,
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
		ID:           user.ID,
		Email:        user.Email,
		Name:         user.Name,
		CreatedAt:    user.CreatedAt,
		Subscription: subInfo,
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
		LastResetAt:      &subscription.LastResetAt,
		ExpiresAt:        subscription.ExpiresAt,
	}

	return c.Status(200).JSON(response)
}
