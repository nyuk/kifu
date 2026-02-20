package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type authTestUserRepo struct {
	users map[string]*entities.User
	err   error
}

func (r *authTestUserRepo) Create(_ context.Context, _ *entities.User) error { return nil }
func (r *authTestUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*entities.User, error) {
	return nil, nil
}
func (r *authTestUserRepo) GetByEmail(_ context.Context, email string) (*entities.User, error) {
	if r.err != nil {
		return nil, r.err
	}
	if r.users == nil {
		return nil, nil
	}
	return r.users[email], nil
}
func (r *authTestUserRepo) Update(_ context.Context, _ *entities.User) error { return nil }
func (r *authTestUserRepo) Delete(_ context.Context, _ uuid.UUID) error      { return nil }

type authTestRefreshTokenRepo struct{}

func (r *authTestRefreshTokenRepo) Create(_ context.Context, _ *entities.RefreshToken) error {
	return nil
}
func (r *authTestRefreshTokenRepo) GetByTokenHash(_ context.Context, _ string) (*entities.RefreshToken, error) {
	return nil, nil
}
func (r *authTestRefreshTokenRepo) Update(_ context.Context, _ *entities.RefreshToken) error {
	return nil
}
func (r *authTestRefreshTokenRepo) RevokeAllUserTokens(_ context.Context, _ uuid.UUID, _ string) error {
	return nil
}
func (r *authTestRefreshTokenRepo) Delete(_ context.Context, _ uuid.UUID) error { return nil }

type authTestSubscriptionRepo struct{}

func (r *authTestSubscriptionRepo) Create(_ context.Context, _ *entities.Subscription) error {
	return nil
}
func (r *authTestSubscriptionRepo) GetByUserID(_ context.Context, _ uuid.UUID) (*entities.Subscription, error) {
	return nil, nil
}
func (r *authTestSubscriptionRepo) ListAll(_ context.Context) ([]*entities.Subscription, error) {
	return nil, nil
}
func (r *authTestSubscriptionRepo) DecrementQuota(_ context.Context, _ uuid.UUID, _ int) (bool, error) {
	return false, nil
}
func (r *authTestSubscriptionRepo) Update(_ context.Context, _ *entities.Subscription) error {
	return nil
}
func (r *authTestSubscriptionRepo) Delete(_ context.Context, _ uuid.UUID) error { return nil }

func TestAccountHelpUsernameRequest(t *testing.T) {
	t.Parallel()

	userRepo := &authTestUserRepo{
		users: map[string]*entities.User{
			"guest@example.com": {
				ID:    uuid.New(),
				Email: "guest@example.com",
			},
		},
	}
	handler := NewAuthHandler(userRepo, &authTestRefreshTokenRepo{}, &authTestSubscriptionRepo{}, "test-secret")
	app := fiber.New()
	app.Post("/api/v1/auth/account-help", handler.AccountHelp)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/account-help", bytes.NewBufferString(`{"mode":"username","email":"guest@example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusOK)
	}

	var got AccountHelpResponse
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("decode response failed: %v", err)
	}
	if got.Message == "" {
		t.Fatal("message should not be empty")
	}
}

func TestAccountHelpMissingEmail(t *testing.T) {
	t.Parallel()

	handler := NewAuthHandler(&authTestUserRepo{}, &authTestRefreshTokenRepo{}, &authTestSubscriptionRepo{}, "test-secret")
	app := fiber.New()
	app.Post("/api/v1/auth/account-help", handler.AccountHelp)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/account-help", bytes.NewBufferString(`{"mode":"password","email":""}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestAccountHelpUnknownEmailIsAccepted(t *testing.T) {
	t.Parallel()

	handler := NewAuthHandler(&authTestUserRepo{}, &authTestRefreshTokenRepo{}, &authTestSubscriptionRepo{}, "test-secret")
	app := fiber.New()
	app.Post("/api/v1/auth/account-help", handler.AccountHelp)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/account-help", bytes.NewBufferString(`{"mode":"password","email":"nobody@example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusOK)
	}
}

func TestAccountHelpInternalError(t *testing.T) {
	t.Parallel()

	userRepo := &authTestUserRepo{
		err: errors.New("db down"),
	}
	handler := NewAuthHandler(userRepo, &authTestRefreshTokenRepo{}, &authTestSubscriptionRepo{}, "test-secret")
	app := fiber.New()
	app.Post("/api/v1/auth/account-help", handler.AccountHelp)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/account-help", bytes.NewBufferString(`{"mode":"username","email":"guest@example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusInternalServerError)
	}
}

func TestSocialLoginStartComingSoon(t *testing.T) {
	t.Parallel()

	app := fiber.New()
	app.Get("/api/v1/auth/social-login/:provider", (&AuthHandler{}).SocialLoginStart)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/social-login/google", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusOK)
	}

	var got SocialLoginResponse
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("decode response failed: %v", err)
	}
	if got.Provider != "google" {
		t.Fatalf("provider=%s want=%s", got.Provider, "google")
	}
	if got.Status != "coming_soon" {
		t.Fatalf("status=%s want=%s", got.Status, "coming_soon")
	}
}

func TestSocialLoginStartUnsupportedProvider(t *testing.T) {
	t.Parallel()

	app := fiber.New()
	app.Get("/api/v1/auth/social-login/:provider", (&AuthHandler{}).SocialLoginStart)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/social-login/twitter", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusBadRequest)
	}
}

var _ repositories.UserRepository = &authTestUserRepo{}
var _ repositories.RefreshTokenRepository = &authTestRefreshTokenRepo{}
var _ repositories.SubscriptionRepository = &authTestSubscriptionRepo{}
