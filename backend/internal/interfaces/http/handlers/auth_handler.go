package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/auth"
)

type AuthHandler struct {
	userRepo         repositories.UserRepository
	refreshTokenRepo repositories.RefreshTokenRepository
	subscriptionRepo repositories.SubscriptionRepository
	jwtSecret        string
}

func NewAuthHandler(
	userRepo repositories.UserRepository,
	refreshTokenRepo repositories.RefreshTokenRepository,
	subscriptionRepo repositories.SubscriptionRepository,
	jwtSecret string,
) *AuthHandler {
	return &AuthHandler{
		userRepo:         userRepo,
		refreshTokenRepo: refreshTokenRepo,
		subscriptionRepo: subscriptionRepo,
		jwtSecret:        jwtSecret,
	}
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type RegisterResponse struct {
	UserID string `json:"user_id"`
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "email, password, and name are required"})
	}

	existingUser, err := h.userRepo.GetByEmail(c.Context(), req.Email)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if existingUser != nil {
		return c.Status(409).JSON(fiber.Map{"code": "EMAIL_EXISTS", "message": "email already exists"})
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	now := time.Now()
	user := &entities.User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: passwordHash,
		Name:         req.Name,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := h.userRepo.Create(c.Context(), user); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	subscription := &entities.Subscription{
		ID:               uuid.New(),
		UserID:           user.ID,
		Tier:             "free",
		AIQuotaRemaining: 20,
		LastResetAt:      now,
		ExpiresAt:        nil,
	}

	if err := h.subscriptionRepo.Create(c.Context(), subscription); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(RegisterResponse{UserID: user.ID.String()})
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	user, err := h.userRepo.GetByEmail(c.Context(), req.Email)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if user == nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid credentials"})
	}

	if err := auth.ComparePassword(user.PasswordHash, req.Password); err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid credentials"})
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, h.jwtSecret)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	refreshToken, err := auth.GenerateRefreshToken()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	tokenHash := auth.HashRefreshToken(refreshToken)
	now := time.Now()
	refreshTokenEntity := &entities.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: now.Add(auth.RefreshTokenExpiry),
		CreatedAt: now,
	}

	if err := h.refreshTokenRepo.Create(c.Context(), refreshTokenEntity); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	})
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type RefreshResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	tokenHash := auth.HashRefreshToken(req.RefreshToken)

	token, err := h.refreshTokenRepo.GetByTokenHash(c.Context(), tokenHash)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if token == nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid token"})
	}

	if token.RevokedAt != nil || token.ReplacedBy != nil {
		if err := h.refreshTokenRepo.RevokeAllUserTokens(c.Context(), token.UserID, "reuse_detected"); err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "token reuse detected"})
	}

	if token.ExpiresAt.Before(time.Now()) {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "token expired"})
	}

	accessToken, err := auth.GenerateAccessToken(token.UserID, h.jwtSecret)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	newRefreshToken, err := auth.GenerateRefreshToken()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	newTokenHash := auth.HashRefreshToken(newRefreshToken)
	now := time.Now()
	newTokenID := uuid.New()
	newRefreshTokenEntity := &entities.RefreshToken{
		ID:        newTokenID,
		UserID:    token.UserID,
		TokenHash: newTokenHash,
		ExpiresAt: now.Add(auth.RefreshTokenExpiry),
		CreatedAt: now,
	}

	if err := h.refreshTokenRepo.Create(c.Context(), newRefreshTokenEntity); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	revokedAt := now
	token.RevokedAt = &revokedAt
	token.ReplacedBy = &newTokenID
	token.LastUsedAt = &now

	if err := h.refreshTokenRepo.Update(c.Context(), token); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(RefreshResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
	})
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type LogoutResponse struct {
	Message string `json:"message"`
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	var req LogoutRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	tokenHash := auth.HashRefreshToken(req.RefreshToken)

	token, err := h.refreshTokenRepo.GetByTokenHash(c.Context(), tokenHash)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if token == nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid token"})
	}

	now := time.Now()
	token.RevokedAt = &now

	if err := h.refreshTokenRepo.Update(c.Context(), token); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(LogoutResponse{Message: "logged out"})
}

func ExtractUserID(c *fiber.Ctx) (uuid.UUID, error) {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return uuid.Nil, fiber.NewError(401, "missing authorization header")
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return uuid.Nil, fiber.NewError(401, "invalid authorization header")
	}

	userID := c.Locals("userID")
	if userID == nil {
		return uuid.Nil, fiber.NewError(401, "user not authenticated")
	}

	return userID.(uuid.UUID), nil
}
