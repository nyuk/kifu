package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/auth"
	"github.com/moneyvessel/kifu/internal/services"
)

type AuthHandler struct {
	userRepo         repositories.UserRepository
	userIdentityRepo repositories.UserIdentityRepository
	refreshTokenRepo repositories.RefreshTokenRepository
	subscriptionRepo repositories.SubscriptionRepository
	jwtSecret        string
	growthService    *services.GrowthOSService
}

func NewAuthHandler(
	userRepo repositories.UserRepository,
	userIdentityRepo repositories.UserIdentityRepository,
	refreshTokenRepo repositories.RefreshTokenRepository,
	subscriptionRepo repositories.SubscriptionRepository,
	jwtSecret string,
	growthServices ...*services.GrowthOSService,
) *AuthHandler {
	var growthService *services.GrowthOSService
	if len(growthServices) > 0 {
		growthService = growthServices[0]
	}
	return &AuthHandler{
		userRepo:         userRepo,
		userIdentityRepo: userIdentityRepo,
		refreshTokenRepo: refreshTokenRepo,
		subscriptionRepo: subscriptionRepo,
		jwtSecret:        jwtSecret,
		growthService:    growthService,
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
		Email:        strings.ToLower(req.Email),
		PasswordHash: passwordHash,
		PasswordSet:  true,
		Name:         req.Name,
		IsAdmin:      false,
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
		AIQuotaLimit:     20,
		LastResetAt:      now,
		ExpiresAt:        nil,
	}

	if err := h.subscriptionRepo.Create(c.Context(), subscription); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	trackGrowthMilestone(c.Context(), h.growthService, user.ID, entities.GrowthEventSignupCompleted, c.Path(), map[string]any{
		"auth_method": "password",
	})

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

	user, err := h.userRepo.GetByEmail(c.Context(), strings.ToLower(req.Email))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if user == nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid credentials"})
	}
	if !user.PasswordSet {
		return c.Status(403).JSON(fiber.Map{"code": "PASSWORD_LOGIN_DISABLED", "message": "password login is disabled for this account"})
	}

	if err := auth.ComparePassword(user.PasswordHash, req.Password); err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid credentials"})
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, auth.AdminRoleFromBool(user.IsAdmin), h.jwtSecret)
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

	user, err := h.userRepo.GetByID(c.Context(), token.UserID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if user == nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "user not found"})
	}

	accessToken, err := auth.GenerateAccessToken(token.UserID, auth.AdminRoleFromBool(user.IsAdmin), h.jwtSecret)
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

type AccountHelpRequest struct {
	Mode  string `json:"mode"`
	Email string `json:"email"`
}

type AccountHelpResponse struct {
	Message string `json:"message"`
}

const (
	accountHelpModeUsername = "username"
	accountHelpModePassword = "password"
	socialProviderGoogle    = "google"
	socialProviderApple     = "apple"
	socialProviderKakao     = "kakao"
	socialProviderNaver     = "naver"
)

type socialLoginUser struct {
	Email          string `json:"email"`
	Name           string `json:"name"`
	ProviderUserID string `json:"provider_user_id"`
}

type SocialLoginResponse struct {
	Provider string `json:"provider"`
	Status   string `json:"status"`
	Message  string `json:"message"`
	AuthURL  string `json:"auth_url,omitempty"`
}

type socialLoginState struct {
	Provider  string `json:"provider"`
	ReturnTo  string `json:"return_to"`
	CreatedAt int64  `json:"created_at"`
	Nonce     string `json:"nonce"`
}

type socialOAuthTokenResponse struct {
	AccessToken string `json:"access_token"`
	Error       string `json:"error"`
	ErrorDesc   string `json:"error_description"`
}

type socialGoogleProfileResponse struct {
	Email       string `json:"email"`
	Name        string `json:"name"`
	Sub         string `json:"sub"`
	EmailVerify bool   `json:"email_verified"`
}

type socialKakaoProfileResponse struct {
	ID           int64 `json:"id"`
	KakaoAccount struct {
		Email           string `json:"email"`
		IsEmailVerified bool   `json:"is_email_verified"`
		IsEmailValid    bool   `json:"is_email_valid"`
		Profile         struct {
			Nickname string `json:"nickname"`
		} `json:"profile"`
	} `json:"kakao_account"`
}

type socialNaverProfileResponse struct {
	ResultCode string `json:"resultcode"`
	Message    string `json:"message"`
	Response   struct {
		ID       string `json:"id"`
		Email    string `json:"email"`
		Name     string `json:"name"`
		Nickname string `json:"nickname"`
	} `json:"response"`
}

type socialProviderConfig struct {
	AuthURL      string
	TokenURL     string
	UserInfoURL  string
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

const (
	socialLoginStatusReady      = "ready"
	socialLoginStatusComingSoon = "coming_soon"
	socialLoginNotReadyMessage  = "소셜 로그인이 준비중입니다."
	socialLoginAuthNotReady     = "해당 소셜 로그인은 준비중입니다."
	socialLoginSuccessMessage   = "OAuth 로그인 주소를 준비했습니다."
	socialLoginStateTTLSeconds  = int64(10 * 60)
	socialLoginCallbackPath     = "/social-callback"
	socialLoginSuccessPath      = "/home"
)

var errSocialAccountLinkRequired = errors.New("social account link requires manual verification")

var (
	socialLoginProviders = map[string]struct{}{
		socialProviderGoogle: {},
		socialProviderApple:  {},
		socialProviderKakao:  {},
		socialProviderNaver:  {},
	}
	socialOAuthConfig = map[string]socialProviderConfig{
		socialProviderGoogle: {
			AuthURL:     "https://accounts.google.com/o/oauth2/v2/auth",
			TokenURL:    "https://oauth2.googleapis.com/token",
			UserInfoURL: "https://www.googleapis.com/oauth2/v3/userinfo",
		},
		socialProviderKakao: {
			AuthURL:     "https://kauth.kakao.com/oauth/authorize",
			TokenURL:    "https://kauth.kakao.com/oauth/token",
			UserInfoURL: "https://kapi.kakao.com/v2/user/me",
		},
		socialProviderNaver: {
			AuthURL:     "https://nid.naver.com/oauth2.0/authorize",
			TokenURL:    "https://nid.naver.com/oauth2.0/token",
			UserInfoURL: "https://openapi.naver.com/v1/nid/me",
		},
	}
	socialHTTPClient = &http.Client{Timeout: 10 * time.Second}
)

func (h *AuthHandler) SocialLoginStart(c *fiber.Ctx) error {
	provider := strings.ToLower(strings.TrimSpace(c.Params("provider")))
	if provider == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "provider is required"})
	}
	if _, ok := socialLoginProviders[provider]; !ok {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_PROVIDER", "message": "unsupported social provider"})
	}

	cfg, err := h.resolveSocialProviderConfig(c, provider)
	if err != nil {
		return c.Status(http.StatusOK).JSON(SocialLoginResponse{
			Provider: provider,
			Status:   socialLoginStatusComingSoon,
			Message:  socialLoginNotReadyMessage,
		})
	}

	returnTo := strings.TrimSpace(c.Query("return_to"))
	state, err := h.buildSocialState(provider, returnTo)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	authURL, err := h.socialAuthURL(provider, cfg, state)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(http.StatusOK).JSON(SocialLoginResponse{
		Provider: provider,
		Status:   socialLoginStatusReady,
		Message:  socialLoginSuccessMessage,
		AuthURL:  authURL,
	})
}

func (h *AuthHandler) SocialLoginCallback(c *fiber.Ctx) error {
	provider := strings.ToLower(strings.TrimSpace(c.Params("provider")))
	if provider == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "provider is required"})
	}
	if _, ok := socialLoginProviders[provider]; !ok {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_PROVIDER", "message": "unsupported social provider"})
	}
	if errText := strings.TrimSpace(c.Query("error")); errText != "" {
		detail := strings.TrimSpace(c.Query("error_description"))
		return h.redirectSocialCallbackError(c, socialLoginSuccessPath, "AUTH_ERROR", firstNonEmpty(detail, errText))
	}

	state, err := h.parseSocialState(c.Query("state"))
	if err != nil {
		return h.redirectSocialCallbackError(c, socialLoginSuccessPath, "INVALID_STATE", "invalid social login state")
	}
	if state.Provider != provider {
		return h.redirectSocialCallbackError(c, socialLoginSuccessPath, "INVALID_STATE", "provider mismatch")
	}

	next := strings.TrimSpace(state.ReturnTo)
	if next == "" || !strings.HasPrefix(next, "/") {
		next = socialLoginSuccessPath
	}

	code := strings.TrimSpace(c.Query("code"))
	if code == "" {
		return h.redirectSocialCallbackError(c, next, "INVALID_REQUEST", "authorization code is required")
	}

	profile, err := h.fetchSocialProfile(c.Context(), c, provider, code)
	if err != nil {
		return h.redirectSocialCallbackError(c, next, "AUTH_FAILED", err.Error())
	}
	user, err := h.resolveSocialUser(c.Context(), provider, profile)
	if err != nil {
		if errors.Is(err, errSocialAccountLinkRequired) {
			return h.redirectSocialCallbackError(c, next, "ACCOUNT_LINK_REQUIRED", "existing account found; please login with password first")
		}
		return h.redirectSocialCallbackError(c, next, "INTERNAL_ERROR", "failed to finalize social login")
	}

	accessToken, refreshToken, err := h.issueTokens(c.Context(), user)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	values := url.Values{
		"access_token":  []string{accessToken},
		"refresh_token": []string{refreshToken},
		"next":          []string{next},
	}
	return c.Redirect(h.socialLoginCallbackBase(c)+socialLoginCallbackPath+"?"+values.Encode(), http.StatusFound)
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

func (h *AuthHandler) AccountHelp(c *fiber.Ctx) error {
	var req AccountHelpRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	mode := strings.TrimSpace(strings.ToLower(req.Mode))
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if mode != accountHelpModeUsername && mode != accountHelpModePassword {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "mode must be username or password"})
	}
	if email == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "email is required"})
	}

	if _, err := h.userRepo.GetByEmail(c.Context(), email); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	log.Printf("[auth] account_help_request mode=%s email=%s", mode, email)

	message := "요청이 접수되었습니다. 등록된 이메일이면 안내를 전송합니다."
	if mode == accountHelpModePassword {
		message = "요청이 접수되었습니다. 비밀번호 재설정 안내를 준비 중입니다."
	} else {
		message = "요청이 접수되었습니다. 아이디 복구 안내를 준비 중입니다."
	}

	return c.Status(http.StatusOK).JSON(AccountHelpResponse{Message: message})
}

const guestEmail = "guest.preview@kifu.local"
const guestName = "Guest"

func (h *AuthHandler) Guest(c *fiber.Ctx) error {
	// Find or create guest user
	user, err := h.userRepo.GetByEmail(c.Context(), guestEmail)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if user == nil {
		// Auto-create guest account
		randomPassword := make([]byte, 32)
		if _, err := rand.Read(randomPassword); err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		passwordHash, err := auth.HashPassword(base64.RawURLEncoding.EncodeToString(randomPassword))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}

		now := time.Now()
		user = &entities.User{
			ID:           uuid.New(),
			Email:        guestEmail,
			PasswordHash: passwordHash,
			PasswordSet:  false,
			Name:         guestName,
			IsAdmin:      false,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		if err := h.userRepo.Create(c.Context(), user); err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}

		if err := h.subscriptionRepo.Create(c.Context(), &entities.Subscription{
			ID:               uuid.New(),
			UserID:           user.ID,
			Tier:             "free",
			AIQuotaRemaining: 20,
			AIQuotaLimit:     20,
			LastResetAt:      now,
		}); err != nil {
			log.Printf("[auth] guest subscription create error: %v", err)
		}
	}

	accessToken, refreshToken, err := h.issueTokens(c.Context(), user)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	})
}

func (h *AuthHandler) resolveSocialProviderConfig(c *fiber.Ctx, provider string) (socialProviderConfig, error) {
	// Temporary rollout policy: only Google social login is open in production.
	if provider != socialProviderGoogle {
		return socialProviderConfig{}, errors.New(socialLoginAuthNotReady)
	}

	cfg, ok := socialOAuthConfig[provider]
	if !ok {
		return socialProviderConfig{}, errors.New(socialLoginAuthNotReady)
	}

	switch provider {
	case socialProviderGoogle:
		cfg.ClientID = strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID"))
		cfg.ClientSecret = strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_SECRET"))
		if cfg.ClientID == "" || cfg.ClientSecret == "" {
			return socialProviderConfig{}, errors.New(socialLoginAuthNotReady)
		}
		cfg.RedirectURI = strings.TrimSpace(os.Getenv("GOOGLE_REDIRECT_URI"))
		if cfg.RedirectURI == "" {
			scheme, host := requestSchemeAndHost(c)
			cfg.RedirectURI = fmt.Sprintf("%s://%s/api/v1/auth/social-login/%s/callback", scheme, host, provider)
		}
		return cfg, nil
	case socialProviderKakao:
		if !socialProviderEnabled(socialProviderKakao) {
			return socialProviderConfig{}, errors.New(socialLoginAuthNotReady)
		}
		cfg.ClientID = strings.TrimSpace(os.Getenv("KAKAO_CLIENT_ID"))
		cfg.ClientSecret = strings.TrimSpace(os.Getenv("KAKAO_CLIENT_SECRET"))
		if cfg.ClientID == "" {
			return socialProviderConfig{}, errors.New(socialLoginAuthNotReady)
		}
		cfg.RedirectURI = strings.TrimSpace(os.Getenv("KAKAO_REDIRECT_URI"))
		if cfg.RedirectURI == "" {
			scheme, host := requestSchemeAndHost(c)
			cfg.RedirectURI = fmt.Sprintf("%s://%s/api/v1/auth/social-login/%s/callback", scheme, host, provider)
		}
		return cfg, nil
	case socialProviderNaver:
		if !socialProviderEnabled(socialProviderNaver) {
			return socialProviderConfig{}, errors.New(socialLoginAuthNotReady)
		}
		cfg.ClientID = strings.TrimSpace(os.Getenv("NAVER_CLIENT_ID"))
		cfg.ClientSecret = strings.TrimSpace(os.Getenv("NAVER_CLIENT_SECRET"))
		if cfg.ClientID == "" || cfg.ClientSecret == "" {
			return socialProviderConfig{}, errors.New(socialLoginAuthNotReady)
		}
		cfg.RedirectURI = strings.TrimSpace(os.Getenv("NAVER_REDIRECT_URI"))
		if cfg.RedirectURI == "" {
			scheme, host := requestSchemeAndHost(c)
			cfg.RedirectURI = fmt.Sprintf("%s://%s/api/v1/auth/social-login/%s/callback", scheme, host, provider)
		}
		return cfg, nil
	default:
		return socialProviderConfig{}, errors.New(socialLoginAuthNotReady)
	}
}

func socialProviderEnabled(provider string) bool {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case socialProviderKakao:
		raw := strings.TrimSpace(strings.ToLower(os.Getenv("SOCIAL_LOGIN_KAKAO_ENABLED")))
		return raw == "1" || raw == "true" || raw == "on" || raw == "yes"
	case socialProviderNaver:
		raw := strings.TrimSpace(strings.ToLower(os.Getenv("SOCIAL_LOGIN_NAVER_ENABLED")))
		return raw == "1" || raw == "true" || raw == "on" || raw == "yes"
	default:
		return true
	}
}

func (h *AuthHandler) socialAuthURL(provider string, cfg socialProviderConfig, state string) (string, error) {
	u, err := url.Parse(cfg.AuthURL)
	if err != nil {
		return "", err
	}
	params := url.Values{
		"client_id":     {cfg.ClientID},
		"redirect_uri":  {cfg.RedirectURI},
		"response_type": {"code"},
		"state":         {state},
	}

	switch provider {
	case socialProviderGoogle:
		params.Set("scope", "openid email profile")
		params.Set("access_type", "offline")
		params.Set("prompt", "select_account")
	case socialProviderKakao:
		params.Set("scope", "account_email profile_nickname")
	case socialProviderNaver:
		params.Set("scope", "name email")
	default:
		return "", errors.New(socialLoginAuthNotReady)
	}

	u.RawQuery = params.Encode()
	return u.String(), nil
}

func (h *AuthHandler) buildSocialState(provider string, returnTo string) (string, error) {
	nonce := make([]byte, 18)
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	payload := socialLoginState{
		Provider:  provider,
		ReturnTo:  strings.TrimSpace(returnTo),
		CreatedAt: time.Now().Unix(),
		Nonce:     base64.RawURLEncoding.EncodeToString(nonce),
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	mac := hmac.New(sha256.New, []byte(h.socialStateSecret()))
	mac.Write(payloadBytes)
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return base64.RawURLEncoding.EncodeToString(payloadBytes) + "." + signature, nil
}

func (h *AuthHandler) parseSocialState(raw string) (socialLoginState, error) {
	parts := strings.Split(raw, ".")
	if len(parts) != 2 {
		return socialLoginState{}, errors.New("invalid state")
	}
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return socialLoginState{}, errors.New("invalid state")
	}
	sig, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return socialLoginState{}, errors.New("invalid state")
	}

	var state socialLoginState
	if err := json.Unmarshal(payloadBytes, &state); err != nil {
		return socialLoginState{}, errors.New("invalid state")
	}
	if time.Since(time.Unix(state.CreatedAt, 0)) > time.Duration(socialLoginStateTTLSeconds)*time.Second {
		return socialLoginState{}, errors.New("state expired")
	}

	mac := hmac.New(sha256.New, []byte(h.socialStateSecret()))
	mac.Write(payloadBytes)
	if !hmac.Equal(sig, mac.Sum(nil)) {
		return socialLoginState{}, errors.New("invalid state")
	}
	return state, nil
}

func (h *AuthHandler) fetchSocialProfile(ctx context.Context, c *fiber.Ctx, provider string, code string) (socialLoginUser, error) {
	cfg, err := h.resolveSocialProviderConfig(c, provider)
	if err != nil {
		return socialLoginUser{}, err
	}

	switch provider {
	case socialProviderGoogle:
		token, err := h.exchangeGoogleToken(ctx, cfg, code)
		if err != nil {
			return socialLoginUser{}, err
		}
		return h.fetchGoogleProfile(ctx, cfg, token.AccessToken)
	case socialProviderKakao:
		token, err := h.exchangeKakaoToken(ctx, cfg, code)
		if err != nil {
			return socialLoginUser{}, err
		}
		return h.fetchKakaoProfile(ctx, cfg, token.AccessToken)
	case socialProviderNaver:
		token, err := h.exchangeNaverToken(ctx, cfg, code, c.Query("state"))
		if err != nil {
			return socialLoginUser{}, err
		}
		return h.fetchNaverProfile(ctx, cfg, token.AccessToken)
	default:
		return socialLoginUser{}, errors.New(socialLoginAuthNotReady)
	}
}

func (h *AuthHandler) exchangeGoogleToken(ctx context.Context, cfg socialProviderConfig, code string) (socialOAuthTokenResponse, error) {
	form := url.Values{
		"code":          {code},
		"client_id":     {cfg.ClientID},
		"client_secret": {cfg.ClientSecret},
		"redirect_uri":  {cfg.RedirectURI},
		"grant_type":    {"authorization_code"},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.TokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return socialOAuthTokenResponse{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := socialHTTPClient.Do(req)
	if err != nil {
		return socialOAuthTokenResponse{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return socialOAuthTokenResponse{}, err
	}
	if res.StatusCode != http.StatusOK {
		return socialOAuthTokenResponse{}, fmt.Errorf("oauth token exchange failed: %s", strings.TrimSpace(string(body)))
	}

	var token socialOAuthTokenResponse
	if err := json.Unmarshal(body, &token); err != nil {
		return socialOAuthTokenResponse{}, err
	}
	if token.Error != "" {
		if token.ErrorDesc != "" {
			return socialOAuthTokenResponse{}, fmt.Errorf("%s: %s", token.Error, token.ErrorDesc)
		}
		return socialOAuthTokenResponse{}, errors.New(token.Error)
	}
	if token.AccessToken == "" {
		return socialOAuthTokenResponse{}, errors.New("oauth access token missing")
	}
	return token, nil
}

func (h *AuthHandler) exchangeKakaoToken(ctx context.Context, cfg socialProviderConfig, code string) (socialOAuthTokenResponse, error) {
	form := url.Values{
		"grant_type":   {"authorization_code"},
		"client_id":    {cfg.ClientID},
		"redirect_uri": {cfg.RedirectURI},
		"code":         {code},
	}
	if strings.TrimSpace(cfg.ClientSecret) != "" {
		form.Set("client_secret", cfg.ClientSecret)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.TokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return socialOAuthTokenResponse{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := socialHTTPClient.Do(req)
	if err != nil {
		return socialOAuthTokenResponse{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return socialOAuthTokenResponse{}, err
	}
	if res.StatusCode != http.StatusOK {
		return socialOAuthTokenResponse{}, fmt.Errorf("oauth token exchange failed: %s", strings.TrimSpace(string(body)))
	}

	var token socialOAuthTokenResponse
	if err := json.Unmarshal(body, &token); err != nil {
		return socialOAuthTokenResponse{}, err
	}
	if token.Error != "" {
		if token.ErrorDesc != "" {
			return socialOAuthTokenResponse{}, fmt.Errorf("%s: %s", token.Error, token.ErrorDesc)
		}
		return socialOAuthTokenResponse{}, errors.New(token.Error)
	}
	if token.AccessToken == "" {
		return socialOAuthTokenResponse{}, errors.New("oauth access token missing")
	}
	return token, nil
}

func (h *AuthHandler) exchangeNaverToken(ctx context.Context, cfg socialProviderConfig, code string, state string) (socialOAuthTokenResponse, error) {
	params := url.Values{
		"grant_type":    {"authorization_code"},
		"client_id":     {cfg.ClientID},
		"client_secret": {cfg.ClientSecret},
		"redirect_uri":  {cfg.RedirectURI},
		"code":          {code},
		"state":         {state},
	}
	tokenURL := cfg.TokenURL + "?" + params.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, tokenURL, nil)
	if err != nil {
		return socialOAuthTokenResponse{}, err
	}

	res, err := socialHTTPClient.Do(req)
	if err != nil {
		return socialOAuthTokenResponse{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return socialOAuthTokenResponse{}, err
	}
	if res.StatusCode != http.StatusOK {
		return socialOAuthTokenResponse{}, fmt.Errorf("oauth token exchange failed: %s", strings.TrimSpace(string(body)))
	}

	var token socialOAuthTokenResponse
	if err := json.Unmarshal(body, &token); err != nil {
		return socialOAuthTokenResponse{}, err
	}
	if token.Error != "" {
		if token.ErrorDesc != "" {
			return socialOAuthTokenResponse{}, fmt.Errorf("%s: %s", token.Error, token.ErrorDesc)
		}
		return socialOAuthTokenResponse{}, errors.New(token.Error)
	}
	if token.AccessToken == "" {
		return socialOAuthTokenResponse{}, errors.New("oauth access token missing")
	}
	return token, nil
}

func (h *AuthHandler) fetchGoogleProfile(ctx context.Context, cfg socialProviderConfig, accessToken string) (socialLoginUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cfg.UserInfoURL, nil)
	if err != nil {
		return socialLoginUser{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	res, err := socialHTTPClient.Do(req)
	if err != nil {
		return socialLoginUser{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return socialLoginUser{}, err
	}
	if res.StatusCode != http.StatusOK {
		return socialLoginUser{}, fmt.Errorf("oauth profile fetch failed: %s", strings.TrimSpace(string(body)))
	}

	var userInfo socialGoogleProfileResponse
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return socialLoginUser{}, err
	}

	email := strings.ToLower(strings.TrimSpace(userInfo.Email))
	if email == "" {
		return socialLoginUser{}, errors.New("oauth profile missing email")
	}
	if !userInfo.EmailVerify {
		return socialLoginUser{}, errors.New("oauth profile email is not verified")
	}

	name := strings.TrimSpace(userInfo.Name)
	if name == "" {
		name = strings.TrimSpace(strings.SplitN(email, "@", 2)[0])
	}
	return socialLoginUser{
		Email:          email,
		Name:           name,
		ProviderUserID: strings.TrimSpace(userInfo.Sub),
	}, nil
}

func (h *AuthHandler) fetchKakaoProfile(ctx context.Context, cfg socialProviderConfig, accessToken string) (socialLoginUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cfg.UserInfoURL, nil)
	if err != nil {
		return socialLoginUser{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	res, err := socialHTTPClient.Do(req)
	if err != nil {
		return socialLoginUser{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return socialLoginUser{}, err
	}
	if res.StatusCode != http.StatusOK {
		return socialLoginUser{}, fmt.Errorf("oauth profile fetch failed: %s", strings.TrimSpace(string(body)))
	}

	var userInfo socialKakaoProfileResponse
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return socialLoginUser{}, err
	}

	email := strings.ToLower(strings.TrimSpace(userInfo.KakaoAccount.Email))
	if email == "" {
		return socialLoginUser{}, errors.New("oauth profile missing email")
	}
	if !userInfo.KakaoAccount.IsEmailVerified || !userInfo.KakaoAccount.IsEmailValid {
		return socialLoginUser{}, errors.New("oauth profile email is not verified")
	}
	if userInfo.ID == 0 {
		return socialLoginUser{}, errors.New("oauth profile missing provider user id")
	}

	name := strings.TrimSpace(userInfo.KakaoAccount.Profile.Nickname)
	if name == "" {
		name = strings.TrimSpace(strings.SplitN(email, "@", 2)[0])
	}
	return socialLoginUser{
		Email:          email,
		Name:           name,
		ProviderUserID: fmt.Sprintf("%d", userInfo.ID),
	}, nil
}

func (h *AuthHandler) fetchNaverProfile(ctx context.Context, cfg socialProviderConfig, accessToken string) (socialLoginUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cfg.UserInfoURL, nil)
	if err != nil {
		return socialLoginUser{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	res, err := socialHTTPClient.Do(req)
	if err != nil {
		return socialLoginUser{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return socialLoginUser{}, err
	}
	if res.StatusCode != http.StatusOK {
		return socialLoginUser{}, fmt.Errorf("oauth profile fetch failed: %s", strings.TrimSpace(string(body)))
	}

	var userInfo socialNaverProfileResponse
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return socialLoginUser{}, err
	}
	email := strings.ToLower(strings.TrimSpace(userInfo.Response.Email))
	if email == "" {
		return socialLoginUser{}, errors.New("oauth profile missing email")
	}
	providerUserID := strings.TrimSpace(userInfo.Response.ID)
	if providerUserID == "" {
		return socialLoginUser{}, errors.New("oauth profile missing provider user id")
	}

	name := strings.TrimSpace(userInfo.Response.Name)
	if name == "" {
		name = strings.TrimSpace(userInfo.Response.Nickname)
	}
	if name == "" {
		name = strings.TrimSpace(strings.SplitN(email, "@", 2)[0])
	}
	return socialLoginUser{
		Email:          email,
		Name:           name,
		ProviderUserID: providerUserID,
	}, nil
}

func (h *AuthHandler) resolveSocialUser(ctx context.Context, provider string, profile socialLoginUser) (*entities.User, error) {
	email := strings.ToLower(strings.TrimSpace(profile.Email))
	if email == "" {
		return nil, errors.New("oauth email is empty")
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	providerUserID := strings.TrimSpace(profile.ProviderUserID)

	if h.userIdentityRepo != nil && providerUserID != "" {
		identity, err := h.userIdentityRepo.GetByProviderUserID(ctx, provider, providerUserID)
		if err != nil {
			return nil, err
		}
		if identity != nil {
			user, err := h.userRepo.GetByID(ctx, identity.UserID)
			if err != nil {
				return nil, err
			}
			if user == nil {
				return nil, errors.New("social identity is linked to missing user")
			}
			return user, nil
		}
	}

	user, err := h.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if user != nil {
		if !socialLoginAutoLinkByEmail() {
			return nil, errSocialAccountLinkRequired
		}
		if err := h.ensureSocialIdentityLink(ctx, user, provider, providerUserID, email); err != nil {
			return nil, err
		}
		return user, nil
	}

	newUser, err := h.createSocialUser(ctx, email, profile.Name)
	if err != nil {
		return nil, err
	}
	if err := h.ensureSocialIdentityLink(ctx, newUser, provider, providerUserID, email); err != nil {
		return nil, err
	}
	return newUser, nil
}

func (h *AuthHandler) createSocialUser(ctx context.Context, email string, name string) (*entities.User, error) {
	randomPassword := make([]byte, 32)
	if _, err := rand.Read(randomPassword); err != nil {
		return nil, err
	}
	passwordHash, err := auth.HashPassword(base64.RawURLEncoding.EncodeToString(randomPassword))
	if err != nil {
		return nil, err
	}

	now := time.Now()
	finalName := strings.TrimSpace(name)
	if finalName == "" {
		finalName = strings.TrimSpace(strings.SplitN(email, "@", 2)[0])
	}
	if finalName == "" {
		finalName = "social_user"
	}
	newUser := &entities.User{
		ID:            uuid.New(),
		Email:         email,
		PasswordHash:  passwordHash,
		PasswordSet:   false,
		Name:          finalName,
		AIAllowlisted: false,
		IsAdmin:       false,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := h.userRepo.Create(ctx, newUser); err != nil {
		return nil, err
	}
	if err := h.subscriptionRepo.Create(ctx, &entities.Subscription{
		ID:               uuid.New(),
		UserID:           newUser.ID,
		Tier:             "free",
		AIQuotaRemaining: 20,
		AIQuotaLimit:     20,
		LastResetAt:      now,
		ExpiresAt:        nil,
	}); err != nil {
		return nil, err
	}
	trackGrowthMilestone(ctx, h.growthService, newUser.ID, entities.GrowthEventSignupCompleted, "/api/v1/auth/social-login/callback", map[string]any{
		"auth_method": "social",
	})
	return newUser, nil
}

func (h *AuthHandler) ensureSocialIdentityLink(ctx context.Context, user *entities.User, provider string, providerUserID string, email string) error {
	if h.userIdentityRepo == nil {
		return nil
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	providerUserID = strings.TrimSpace(providerUserID)
	if provider == "" || providerUserID == "" {
		return nil
	}

	existingByProviderID, err := h.userIdentityRepo.GetByProviderUserID(ctx, provider, providerUserID)
	if err != nil {
		return err
	}
	if existingByProviderID != nil {
		if existingByProviderID.UserID != user.ID {
			return errors.New("social identity already linked to another user")
		}
		return nil
	}

	existingByUserProvider, err := h.userIdentityRepo.GetByUserAndProvider(ctx, user.ID, provider)
	if err != nil {
		return err
	}
	if existingByUserProvider != nil {
		if existingByUserProvider.ProviderUserID != providerUserID {
			return errors.New("user already has different social identity for provider")
		}
		return nil
	}

	identity := &entities.UserIdentity{
		ID:             uuid.New(),
		UserID:         user.ID,
		Provider:       provider,
		ProviderUserID: providerUserID,
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}
	if email = strings.TrimSpace(strings.ToLower(email)); email != "" {
		identity.Email = &email
	}
	if err := h.userIdentityRepo.Create(ctx, identity); err != nil {
		if isPGUniqueViolation(err) {
			return nil
		}
		return err
	}
	return nil
}

func socialLoginAutoLinkByEmail() bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv("SOCIAL_LOGIN_AUTO_LINK_BY_EMAIL")))
	if raw == "" {
		return true
	}
	return raw != "false" && raw != "0" && raw != "off" && raw != "no"
}

func (h *AuthHandler) issueTokens(ctx context.Context, user *entities.User) (string, string, error) {
	accessToken, err := auth.GenerateAccessToken(user.ID, auth.AdminRoleFromBool(user.IsAdmin), h.jwtSecret)
	if err != nil {
		return "", "", err
	}
	refreshToken, err := auth.GenerateRefreshToken()
	if err != nil {
		return "", "", err
	}
	now := time.Now()
	refreshTokenEntity := &entities.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: auth.HashRefreshToken(refreshToken),
		ExpiresAt: now.Add(auth.RefreshTokenExpiry),
		CreatedAt: now,
	}
	if err := h.refreshTokenRepo.Create(ctx, refreshTokenEntity); err != nil {
		return "", "", err
	}
	return accessToken, refreshToken, nil
}

func (h *AuthHandler) socialStateSecret() string {
	secret := strings.TrimSpace(os.Getenv("SOCIAL_LOGIN_STATE_SECRET"))
	if secret != "" {
		return secret
	}
	if h.jwtSecret != "" {
		return h.jwtSecret
	}
	return "kifu_social_state_secret"
}

func (h *AuthHandler) socialLoginCallbackBase(c *fiber.Ctx) string {
	base := strings.TrimSpace(os.Getenv("FRONTEND_BASE_URL"))
	if base == "" {
		base = requestBase(c)
	}
	base = strings.TrimSpace(strings.TrimSuffix(base, "/"))
	base = strings.TrimSuffix(base, "/api")
	base = strings.TrimSuffix(base, "/")
	return base
}

func (h *AuthHandler) redirectSocialCallbackError(c *fiber.Ctx, next string, code string, message string) error {
	values := url.Values{
		"error":             []string{code},
		"error_description": []string{message},
	}
	if strings.HasPrefix(next, "/") {
		values.Set("next", next)
	}
	return c.Redirect(h.socialLoginCallbackBase(c)+socialLoginCallbackPath+"?"+values.Encode(), http.StatusFound)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func isPGUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func requestBase(c *fiber.Ctx) string {
	scheme := strings.TrimSpace(c.Get("X-Forwarded-Proto"))
	if scheme == "" {
		scheme = c.Protocol()
	}
	if scheme == "" {
		scheme = "https"
	}
	host := strings.TrimSpace(c.Get("X-Forwarded-Host"))
	if host == "" {
		host = strings.TrimSpace(c.Get("Host"))
	}
	if host == "" {
		host = "127.0.0.1:3001"
	}
	return strings.TrimSuffix(fmt.Sprintf("%s://%s", scheme, host), "/")
}

func requestSchemeAndHost(c *fiber.Ctx) (string, string) {
	scheme := strings.TrimSpace(c.Get("X-Forwarded-Proto"))
	if scheme == "" {
		scheme = c.Protocol()
	}
	if scheme == "" {
		scheme = "https"
	}
	host := strings.TrimSpace(c.Get("X-Forwarded-Host"))
	if host == "" {
		host = strings.TrimSpace(c.Get("Host"))
	}
	if host == "" {
		host = "127.0.0.1:3001"
	}
	return scheme, host
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
