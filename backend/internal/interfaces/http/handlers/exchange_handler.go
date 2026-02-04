package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	cryptoutil "github.com/moneyvessel/kifu/internal/infrastructure/crypto"
	"github.com/moneyvessel/kifu/internal/jobs"
)

const (
	binanceSapiBaseURL = "https://api.binance.com"
	upbitBaseURL       = "https://api.upbit.com"
	binanceFuturesID   = "binance_futures"
	binanceSpotID      = "binance_spot"
	upbitExchangeID    = "upbit"
)

type ExchangeHandler struct {
	exchangeRepo  repositories.ExchangeCredentialRepository
	encryptionKey []byte
	client        *http.Client
	syncer        ExchangeSyncer
}

type ExchangeSyncer interface {
	SyncCredentialOnce(ctx context.Context, cred *entities.ExchangeCredential) error
}

type ExchangeSyncerWithOptions interface {
	SyncCredentialOnceWithOptions(ctx context.Context, cred *entities.ExchangeCredential, options jobs.SyncOptions) error
}

func NewExchangeHandler(
	exchangeRepo repositories.ExchangeCredentialRepository,
	encryptionKey []byte,
	syncer ExchangeSyncer,
) *ExchangeHandler {
	return &ExchangeHandler{
		exchangeRepo:  exchangeRepo,
		encryptionKey: encryptionKey,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		syncer: syncer,
	}
}

type RegisterExchangeRequest struct {
	Exchange  string `json:"exchange"`
	APIKey    string `json:"api_key"`
	APISecret string `json:"api_secret"`
}

type ExchangeResponse struct {
	ID           uuid.UUID `json:"id"`
	Exchange     string    `json:"exchange"`
	APIKeyMasked string    `json:"api_key_masked"`
	IsValid      bool      `json:"is_valid"`
}

type ExchangeListResponse struct {
	Items []ExchangeListItem `json:"items"`
}

type ExchangeListItem struct {
	ID           uuid.UUID `json:"id"`
	Exchange     string    `json:"exchange"`
	APIKeyMasked string    `json:"api_key_masked"`
	IsValid      bool      `json:"is_valid"`
	CreatedAt    time.Time `json:"created_at"`
}

type ExchangeTestResponse struct {
	Success   bool    `json:"success"`
	Message   string  `json:"message"`
	ExpiresAt *string `json:"expires_at,omitempty"`
}

type apiRestrictionsResponse struct {
	EnableReading              bool `json:"enableReading"`
	EnableSpotAndMarginTrading bool `json:"enableSpotAndMarginTrading"`
	EnableFutures              bool `json:"enableFutures"`
	EnableWithdrawals          bool `json:"enableWithdrawals"`
}

type upbitAPIKeyInfo struct {
	AccessKey string `json:"access_key"`
	ExpireAt  string `json:"expire_at"`
}

func (h *ExchangeHandler) Register(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req RegisterExchangeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	req.Exchange = strings.TrimSpace(req.Exchange)
	req.APIKey = strings.TrimSpace(req.APIKey)
	req.APISecret = strings.TrimSpace(req.APISecret)

	if req.Exchange == "" || req.APIKey == "" || req.APISecret == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "exchange, api_key, and api_secret are required"})
	}

	if req.Exchange != binanceFuturesID && req.Exchange != binanceSpotID && req.Exchange != upbitExchangeID {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_EXCHANGE", "message": "unsupported exchange"})
	}

	switch req.Exchange {
	case binanceFuturesID:
		allowed, err := h.checkBinancePermissions(c.Context(), req.APIKey, req.APISecret, true)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_CHECK_FAILED", "message": err.Error()})
		}
		if !allowed {
			return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "Binance Futures 권한(read + futures)이 필요합니다."})
		}
	case binanceSpotID:
		allowed, err := h.checkBinancePermissions(c.Context(), req.APIKey, req.APISecret, false)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_CHECK_FAILED", "message": err.Error()})
		}
		if !allowed {
			return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "Binance Spot 조회 권한(read)이 필요합니다."})
		}
	case upbitExchangeID:
		// Upbit keys can be scoped in many ways; do not hard-fail registration on accounts scope.
		expireAt, err := h.getUpbitKeyExpiry(c.Context(), req.APIKey, req.APISecret)
		if err == nil && expireAt != nil && expireAt.Before(time.Now().UTC()) {
			return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "Upbit API key is expired. Reissue the key and try again."})
		}
	}

	apiKeyEnc, err := cryptoutil.Encrypt(req.APIKey, h.encryptionKey)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	apiSecretEnc, err := cryptoutil.Encrypt(req.APISecret, h.encryptionKey)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	last4 := lastFour(req.APIKey)

	existing, err := h.exchangeRepo.GetByUserAndExchange(c.Context(), userID, req.Exchange)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if existing != nil {
		existing.APIKeyEnc = apiKeyEnc
		existing.APISecretEnc = apiSecretEnc
		existing.APIKeyLast4 = last4
		existing.IsValid = true

		if err := h.exchangeRepo.Update(c.Context(), existing); err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}

		return c.Status(200).JSON(ExchangeResponse{
			ID:           existing.ID,
			Exchange:     existing.Exchange,
			APIKeyMasked: maskKey(existing.APIKeyLast4),
			IsValid:      existing.IsValid,
		})
	}

	cred := &entities.ExchangeCredential{
		ID:           uuid.New(),
		UserID:       userID,
		Exchange:     req.Exchange,
		APIKeyEnc:    apiKeyEnc,
		APISecretEnc: apiSecretEnc,
		APIKeyLast4:  last4,
		IsValid:      true,
		CreatedAt:    time.Now(),
	}

	if err := h.exchangeRepo.Create(c.Context(), cred); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(ExchangeResponse{
		ID:           cred.ID,
		Exchange:     cred.Exchange,
		APIKeyMasked: maskKey(cred.APIKeyLast4),
		IsValid:      cred.IsValid,
	})
}

func (h *ExchangeHandler) List(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	creds, err := h.exchangeRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]ExchangeListItem, 0, len(creds))
	for _, cred := range creds {
		items = append(items, ExchangeListItem{
			ID:           cred.ID,
			Exchange:     cred.Exchange,
			APIKeyMasked: maskKey(cred.APIKeyLast4),
			IsValid:      cred.IsValid,
			CreatedAt:    cred.CreatedAt,
		})
	}

	return c.Status(200).JSON(ExchangeListResponse{Items: items})
}

func (h *ExchangeHandler) Delete(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	credID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	deleted, err := h.exchangeRepo.DeleteByIDAndUser(c.Context(), credID, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if !deleted {
		return c.Status(404).JSON(fiber.Map{"code": "EXCHANGE_NOT_FOUND", "message": "exchange credential not found"})
	}

	return c.Status(200).JSON(fiber.Map{"deleted": true})
}

func (h *ExchangeHandler) Test(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	credID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	cred, err := h.exchangeRepo.GetByID(c.Context(), credID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if cred == nil {
		return c.Status(404).JSON(fiber.Map{"code": "EXCHANGE_NOT_FOUND", "message": "exchange credential not found"})
	}
	if cred.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}

	apiKey, err := cryptoutil.Decrypt(cred.APIKeyEnc, h.encryptionKey)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	apiSecret, err := cryptoutil.Decrypt(cred.APISecretEnc, h.encryptionKey)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	switch cred.Exchange {
	case binanceFuturesID:
		allowed, err := h.checkBinancePermissions(c.Context(), apiKey, apiSecret, true)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_CHECK_FAILED", "message": err.Error()})
		}
		if !allowed {
			return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "Binance Futures 권한(read + futures)이 필요합니다."})
		}
	case binanceSpotID:
		allowed, err := h.checkBinancePermissions(c.Context(), apiKey, apiSecret, false)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_CHECK_FAILED", "message": err.Error()})
		}
		if !allowed {
			return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "Binance Spot 조회 권한(read)이 필요합니다."})
		}
	case upbitExchangeID:
		expireAt, err := h.getUpbitKeyExpiry(c.Context(), apiKey, apiSecret)
		if err == nil && expireAt != nil {
			if expireAt.Before(time.Now().UTC()) {
				return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "Upbit API key is expired. Reissue the key and try again."})
			}
			expiresAt := expireAt.Format(time.RFC3339)
			return c.Status(200).JSON(ExchangeTestResponse{
				Success:   true,
				Message:   "connection successful",
				ExpiresAt: &expiresAt,
			})
		}
		return c.Status(200).JSON(ExchangeTestResponse{
			Success: true,
			Message: "connection saved. trade history scope will be verified during sync.",
		})
	default:
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_EXCHANGE", "message": "unsupported exchange"})
	}

	return c.Status(200).JSON(ExchangeTestResponse{Success: true, Message: "connection successful"})
}

func (h *ExchangeHandler) Sync(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	if h.syncer == nil {
		return c.Status(501).JSON(fiber.Map{"code": "NOT_IMPLEMENTED", "message": "sync service is not available"})
	}

	credID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	cred, err := h.exchangeRepo.GetByID(c.Context(), credID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if cred == nil {
		return c.Status(404).JSON(fiber.Map{"code": "EXCHANGE_NOT_FOUND", "message": "exchange credential not found"})
	}
	if cred.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}
	if !cred.IsValid {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_EXCHANGE", "message": "exchange credential is invalid"})
	}

	fullBackfill := strings.EqualFold(strings.TrimSpace(c.Query("full_backfill")), "true")
	historyDays := 0
	if raw := strings.TrimSpace(c.Query("history_days")); raw != "" {
		parsed, parseErr := parsePositiveInt(raw)
		if parseErr != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "history_days is invalid"})
		}
		historyDays = parsed
	}

	var syncErr error
	if fullBackfill {
		if advanced, ok := h.syncer.(ExchangeSyncerWithOptions); ok {
			syncErr = advanced.SyncCredentialOnceWithOptions(c.Context(), cred, jobs.SyncOptions{
				FullBackfill: true,
				HistoryDays:  historyDays,
			})
		} else {
			syncErr = h.syncer.SyncCredentialOnce(c.Context(), cred)
		}
	} else {
		syncErr = h.syncer.SyncCredentialOnce(c.Context(), cred)
	}

	if syncErr != nil {
		if syncErr == jobs.ErrUnsupportedExchange {
			return c.Status(400).JSON(fiber.Map{
				"code":    "UNSUPPORTED_SYNC",
				"message": "이 거래소는 자동 동기화가 아직 준비중입니다. CSV import를 사용해주세요.",
			})
		}
		return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_SYNC_FAILED", "message": syncErr.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"success": true, "message": "sync completed"})
}

func (h *ExchangeHandler) checkBinancePermissions(ctx context.Context, apiKey string, apiSecret string, requireFutures bool) (bool, error) {
	params := url.Values{}
	params.Set("timestamp", fmt.Sprintf("%d", time.Now().UnixMilli()))
	params.Set("recvWindow", "5000")

	signature := signRequest(apiSecret, params)
	params.Set("signature", signature)

	requestURL := fmt.Sprintf("%s/sapi/v1/account/apiRestrictions?%s", binanceSapiBaseURL, params.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return false, err
	}
	req.Header.Set("X-MBX-APIKEY", apiKey)

	resp, err := h.client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return false, fmt.Errorf("permission check failed with status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var result apiRestrictionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, err
	}

	if !result.EnableReading {
		return false, nil
	}
	if requireFutures && !result.EnableFutures {
		return false, nil
	}

	return true, nil
}

func (h *ExchangeHandler) getUpbitKeyExpiry(ctx context.Context, apiKey string, apiSecret string) (*time.Time, error) {
	token, err := generateUpbitJWT(apiKey, apiSecret)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, upbitBaseURL+"/v1/api_keys", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("api key metadata check failed with status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var keys []upbitAPIKeyInfo
	if err := json.NewDecoder(resp.Body).Decode(&keys); err != nil {
		return nil, err
	}

	for _, info := range keys {
		if strings.TrimSpace(info.AccessKey) != strings.TrimSpace(apiKey) {
			continue
		}
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(info.ExpireAt))
		if err != nil {
			return nil, err
		}
		utc := parsed.UTC()
		return &utc, nil
	}

	return nil, nil
}

func generateUpbitJWT(apiKey string, apiSecret string) (string, error) {
	claims := jwt.MapClaims{
		"access_key": apiKey,
		"nonce":      uuid.NewString(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)
	return token.SignedString([]byte(apiSecret))
}

func signRequest(secret string, params url.Values) string {
	h := hmac.New(sha256.New, []byte(secret))
	_, _ = h.Write([]byte(params.Encode()))
	return hex.EncodeToString(h.Sum(nil))
}
