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
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	cryptoutil "github.com/moneyvessel/kifu/internal/infrastructure/crypto"
)

const (
	binanceSapiBaseURL = "https://api.binance.com"
	binanceExchangeID  = "binance_futures"
)

type ExchangeHandler struct {
	exchangeRepo  repositories.ExchangeCredentialRepository
	encryptionKey []byte
	client        *http.Client
}

func NewExchangeHandler(
	exchangeRepo repositories.ExchangeCredentialRepository,
	encryptionKey []byte,
) *ExchangeHandler {
	return &ExchangeHandler{
		exchangeRepo:  exchangeRepo,
		encryptionKey: encryptionKey,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
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
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type apiRestrictionsResponse struct {
	EnableReading              bool `json:"enableReading"`
	EnableSpotAndMarginTrading bool `json:"enableSpotAndMarginTrading"`
	EnableFutures              bool `json:"enableFutures"`
	EnableWithdrawals          bool `json:"enableWithdrawals"`
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

	if req.Exchange != binanceExchangeID {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_EXCHANGE", "message": "unsupported exchange"})
	}

	allowed, err := h.checkBinancePermissions(c.Context(), req.APIKey, req.APISecret)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_CHECK_FAILED", "message": err.Error()})
	}
	if !allowed {
		return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "API key permissions must be read-only futures"})
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

	allowed, err := h.checkBinancePermissions(c.Context(), apiKey, apiSecret)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_CHECK_FAILED", "message": err.Error()})
	}
	if !allowed {
		return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "API key permissions must be read-only futures"})
	}

	return c.Status(200).JSON(ExchangeTestResponse{Success: true, Message: "connection successful"})
}

func (h *ExchangeHandler) checkBinancePermissions(ctx context.Context, apiKey string, apiSecret string) (bool, error) {
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

	if !result.EnableFutures {
		return false, nil
	}
	if result.EnableWithdrawals || result.EnableSpotAndMarginTrading {
		return false, nil
	}

	return true, nil
}

func signRequest(secret string, params url.Values) string {
	h := hmac.New(sha256.New, []byte(secret))
	_, _ = h.Write([]byte(params.Encode()))
	return hex.EncodeToString(h.Sum(nil))
}
