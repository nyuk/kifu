package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/auth"
)

type userPasswordTestRepo struct {
	user *entities.User
}

func (r *userPasswordTestRepo) Create(_ context.Context, _ *entities.User) error { return nil }
func (r *userPasswordTestRepo) GetByID(_ context.Context, id uuid.UUID) (*entities.User, error) {
	if r.user != nil && r.user.ID == id {
		return r.user, nil
	}
	return nil, nil
}
func (r *userPasswordTestRepo) GetByEmail(_ context.Context, _ string) (*entities.User, error) {
	return nil, nil
}
func (r *userPasswordTestRepo) ListForAdmin(_ context.Context, _ int, _ int, _ string) ([]*entities.User, error) {
	return nil, nil
}
func (r *userPasswordTestRepo) CountForAdmin(_ context.Context, _ string) (int, error) { return 0, nil }
func (r *userPasswordTestRepo) SetAdmin(_ context.Context, _ uuid.UUID, _ bool) error  { return nil }
func (r *userPasswordTestRepo) Update(_ context.Context, user *entities.User) error {
	r.user = user
	return nil
}
func (r *userPasswordTestRepo) Delete(_ context.Context, _ uuid.UUID) error { return nil }
func (r *userPasswordTestRepo) ListActive(_ context.Context) ([]*entities.User, error) {
	return nil, nil
}

type userPasswordTestSubRepo struct{}

func (r *userPasswordTestSubRepo) Create(_ context.Context, _ *entities.Subscription) error {
	return nil
}
func (r *userPasswordTestSubRepo) GetByUserID(_ context.Context, _ uuid.UUID) (*entities.Subscription, error) {
	return nil, nil
}
func (r *userPasswordTestSubRepo) ListAll(_ context.Context) ([]*entities.Subscription, error) {
	return nil, nil
}
func (r *userPasswordTestSubRepo) DecrementQuota(_ context.Context, _ uuid.UUID, _ int) (bool, error) {
	return false, nil
}
func (r *userPasswordTestSubRepo) Update(_ context.Context, _ *entities.Subscription) error {
	return nil
}
func (r *userPasswordTestSubRepo) Delete(_ context.Context, _ uuid.UUID) error { return nil }

func makeAuthUserApp(user *entities.User) *fiber.App {
	repo := &userPasswordTestRepo{user: user}
	handler := NewUserHandler(repo, &userPasswordTestSubRepo{})
	app := fiber.New()
	app.Post("/api/v1/users/me/password", func(c *fiber.Ctx) error {
		c.Locals("userID", user.ID)
		return handler.SetPassword(c)
	})
	return app
}

func TestSetPassword_AllowsSocialOnlyAccountWithoutCurrentPassword(t *testing.T) {
	hashed, err := auth.HashPassword("random-internal-password")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	user := &entities.User{
		ID:           uuid.New(),
		Email:        "social-only@example.com",
		PasswordHash: hashed,
		PasswordSet:  false,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	app := makeAuthUserApp(user)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/me/password", bytes.NewBufferString(`{"new_password":"NewPass123!"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusOK)
	}
	if !user.PasswordSet {
		t.Fatalf("password_set should be true after setting password")
	}
	if err := auth.ComparePassword(user.PasswordHash, "NewPass123!"); err != nil {
		t.Fatalf("new password should match hash")
	}
}

func TestSetPassword_RequiresCurrentPasswordWhenAlreadySet(t *testing.T) {
	hashed, err := auth.HashPassword("OldPass123!")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	user := &entities.User{
		ID:           uuid.New(),
		Email:        "normal@example.com",
		PasswordHash: hashed,
		PasswordSet:  true,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	app := makeAuthUserApp(user)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/me/password", bytes.NewBufferString(`{"new_password":"NewPass123!"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestSetPassword_RejectsWrongCurrentPassword(t *testing.T) {
	hashed, err := auth.HashPassword("OldPass123!")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	user := &entities.User{
		ID:           uuid.New(),
		Email:        "normal@example.com",
		PasswordHash: hashed,
		PasswordSet:  true,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	app := makeAuthUserApp(user)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/me/password", bytes.NewBufferString(`{"current_password":"WrongPass","new_password":"NewPass123!"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusUnauthorized)
	}
}

var _ repositories.UserRepository = &userPasswordTestRepo{}
var _ repositories.SubscriptionRepository = &userPasswordTestSubRepo{}
