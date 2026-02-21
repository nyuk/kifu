package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
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
func (r *authTestUserRepo) ListForAdmin(_ context.Context, _ int, _ int, _ string) ([]*entities.User, error) {
	return nil, nil
}
func (r *authTestUserRepo) CountForAdmin(_ context.Context, _ string) (int, error) { return 0, nil }
func (r *authTestUserRepo) SetAdmin(_ context.Context, _ uuid.UUID, _ bool) error  { return nil }
func (r *authTestUserRepo) Update(_ context.Context, _ *entities.User) error       { return nil }
func (r *authTestUserRepo) Delete(_ context.Context, _ uuid.UUID) error            { return nil }

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

type socialCallbackUserRepo struct {
	users         map[string]*entities.User
	getByEmailErr error
	createCount   int
}

func (r *socialCallbackUserRepo) Create(_ context.Context, user *entities.User) error {
	r.createCount++
	if r.users == nil {
		r.users = make(map[string]*entities.User)
	}
	r.users[user.Email] = user
	return nil
}
func (r *socialCallbackUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*entities.User, error) {
	return nil, nil
}
func (r *socialCallbackUserRepo) GetByEmail(_ context.Context, email string) (*entities.User, error) {
	if r.getByEmailErr != nil {
		return nil, r.getByEmailErr
	}
	if r.users == nil {
		return nil, nil
	}
	return r.users[email], nil
}
func (r *socialCallbackUserRepo) ListForAdmin(_ context.Context, _ int, _ int, _ string) ([]*entities.User, error) {
	return nil, nil
}
func (r *socialCallbackUserRepo) CountForAdmin(_ context.Context, _ string) (int, error) {
	return 0, nil
}
func (r *socialCallbackUserRepo) SetAdmin(_ context.Context, _ uuid.UUID, _ bool) error { return nil }
func (r *socialCallbackUserRepo) Update(_ context.Context, _ *entities.User) error      { return nil }
func (r *socialCallbackUserRepo) Delete(_ context.Context, _ uuid.UUID) error           { return nil }

type socialCallbackRefreshTokenRepo struct {
	createCount int
}

func (r *socialCallbackRefreshTokenRepo) Create(_ context.Context, _ *entities.RefreshToken) error {
	r.createCount++
	return nil
}
func (r *socialCallbackRefreshTokenRepo) GetByTokenHash(_ context.Context, _ string) (*entities.RefreshToken, error) {
	return nil, nil
}
func (r *socialCallbackRefreshTokenRepo) Update(_ context.Context, _ *entities.RefreshToken) error {
	return nil
}
func (r *socialCallbackRefreshTokenRepo) RevokeAllUserTokens(_ context.Context, _ uuid.UUID, _ string) error {
	return nil
}
func (r *socialCallbackRefreshTokenRepo) Delete(_ context.Context, _ uuid.UUID) error { return nil }

type socialCallbackSubscriptionRepo struct {
	createCount int
}

func (r *socialCallbackSubscriptionRepo) Create(_ context.Context, _ *entities.Subscription) error {
	r.createCount++
	return nil
}
func (r *socialCallbackSubscriptionRepo) GetByUserID(_ context.Context, _ uuid.UUID) (*entities.Subscription, error) {
	return nil, nil
}
func (r *socialCallbackSubscriptionRepo) ListAll(_ context.Context) ([]*entities.Subscription, error) {
	return nil, nil
}
func (r *socialCallbackSubscriptionRepo) DecrementQuota(_ context.Context, _ uuid.UUID, _ int) (bool, error) {
	return false, nil
}
func (r *socialCallbackSubscriptionRepo) Update(_ context.Context, _ *entities.Subscription) error {
	return nil
}
func (r *socialCallbackSubscriptionRepo) Delete(_ context.Context, _ uuid.UUID) error { return nil }

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

func TestSocialLoginCallbackSuccessCreatesUserAndRedirects(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("token method=%s want=%s", r.Method, http.MethodPost)
		}
		token := map[string]string{"access_token": "google-access-token"}
		if err := json.NewEncoder(w).Encode(token); err != nil {
			t.Fatalf("encode token response: %v", err)
		}
	})
	mux.HandleFunc("/userinfo", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("userinfo method=%s want=%s", r.Method, http.MethodGet)
		}
		profile := socialGoogleProfileResponse{
			Email:       "social@example.com",
			Name:        "Social User",
			EmailVerify: true,
		}
		if err := json.NewEncoder(w).Encode(profile); err != nil {
			t.Fatalf("encode userinfo response: %v", err)
		}
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	oldOAuthConfig := socialOAuthConfig[socialProviderGoogle]
	oldHTTPClient := socialHTTPClient
	defer func() {
		socialOAuthConfig[socialProviderGoogle] = oldOAuthConfig
		socialHTTPClient = oldHTTPClient
	}()
	socialOAuthConfig[socialProviderGoogle] = socialProviderConfig{
		AuthURL:     oldOAuthConfig.AuthURL,
		TokenURL:    server.URL + "/token",
		UserInfoURL: server.URL + "/userinfo",
	}
	socialHTTPClient = server.Client()

	oldClientID, hasClientID := os.LookupEnv("GOOGLE_CLIENT_ID")
	oldClientSecret, hasClientSecret := os.LookupEnv("GOOGLE_CLIENT_SECRET")
	os.Setenv("GOOGLE_CLIENT_ID", "test-google-client-id")
	os.Setenv("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
	defer func() {
		if hasClientID {
			os.Setenv("GOOGLE_CLIENT_ID", oldClientID)
		} else {
			os.Unsetenv("GOOGLE_CLIENT_ID")
		}
		if hasClientSecret {
			os.Setenv("GOOGLE_CLIENT_SECRET", oldClientSecret)
		} else {
			os.Unsetenv("GOOGLE_CLIENT_SECRET")
		}
	}()

	userRepo := &socialCallbackUserRepo{}
	refreshRepo := &socialCallbackRefreshTokenRepo{}
	subscriptionRepo := &socialCallbackSubscriptionRepo{}
	handler := NewAuthHandler(userRepo, refreshRepo, subscriptionRepo, "test-secret")
	state, err := handler.buildSocialState(socialProviderGoogle, "/dashboard")
	if err != nil {
		t.Fatalf("buildSocialState: %v", err)
	}
	app := fiber.New()
	app.Get("/api/v1/auth/social-login/:provider/callback", handler.SocialLoginCallback)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/social-login/google/callback?code=auth-code&state="+state, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusFound {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusFound)
	}
	location, err := url.Parse(resp.Header.Get("Location"))
	if err != nil {
		t.Fatalf("location parse: %v", err)
	}
	if location.Path != "/auth/social-callback" {
		t.Fatalf("path=%s want=%s", location.Path, "/auth/social-callback")
	}
	q := location.Query()
	if q.Get("next") != "/dashboard" {
		t.Fatalf("next=%s want=%s", q.Get("next"), "/dashboard")
	}
	if q.Get("access_token") == "" || q.Get("refresh_token") == "" {
		t.Fatalf("missing token in redirect query: %v", q.Encode())
	}
	if userRepo.createCount != 1 {
		t.Fatalf("createCount=%d want=%d", userRepo.createCount, 1)
	}
	if refreshRepo.createCount != 1 {
		t.Fatalf("refresh createCount=%d want=%d", refreshRepo.createCount, 1)
	}
	if subscriptionRepo.createCount != 1 {
		t.Fatalf("subscription createCount=%d want=%d", subscriptionRepo.createCount, 1)
	}
}

func TestSocialLoginCallbackReturnsAuthFailedWhenTokenExchangeFails(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"invalid_grant"}`))
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	oldOAuthConfig := socialOAuthConfig[socialProviderGoogle]
	oldHTTPClient := socialHTTPClient
	defer func() {
		socialOAuthConfig[socialProviderGoogle] = oldOAuthConfig
		socialHTTPClient = oldHTTPClient
	}()
	socialOAuthConfig[socialProviderGoogle] = socialProviderConfig{
		AuthURL:  oldOAuthConfig.AuthURL,
		TokenURL: server.URL + "/token",
	}
	socialHTTPClient = server.Client()

	oldClientID, hasClientID := os.LookupEnv("GOOGLE_CLIENT_ID")
	oldClientSecret, hasClientSecret := os.LookupEnv("GOOGLE_CLIENT_SECRET")
	os.Setenv("GOOGLE_CLIENT_ID", "test-google-client-id")
	os.Setenv("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
	defer func() {
		if hasClientID {
			os.Setenv("GOOGLE_CLIENT_ID", oldClientID)
		} else {
			os.Unsetenv("GOOGLE_CLIENT_ID")
		}
		if hasClientSecret {
			os.Setenv("GOOGLE_CLIENT_SECRET", oldClientSecret)
		} else {
			os.Unsetenv("GOOGLE_CLIENT_SECRET")
		}
	}()

	handler := NewAuthHandler(&socialCallbackUserRepo{}, &socialCallbackRefreshTokenRepo{}, &socialCallbackSubscriptionRepo{}, "test-secret")
	state, err := handler.buildSocialState(socialProviderGoogle, "/")
	if err != nil {
		t.Fatalf("buildSocialState: %v", err)
	}
	app := fiber.New()
	app.Get("/api/v1/auth/social-login/:provider/callback", handler.SocialLoginCallback)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/social-login/google/callback?code=auth-code&state="+state, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusUnauthorized)
	}
}

var _ repositories.UserRepository = &authTestUserRepo{}
var _ repositories.RefreshTokenRepository = &authTestRefreshTokenRepo{}
var _ repositories.SubscriptionRepository = &authTestSubscriptionRepo{}
var _ repositories.UserRepository = &socialCallbackUserRepo{}
var _ repositories.RefreshTokenRepository = &socialCallbackRefreshTokenRepo{}
var _ repositories.SubscriptionRepository = &socialCallbackSubscriptionRepo{}
