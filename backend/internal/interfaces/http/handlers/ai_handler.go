package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	cryptoutil "github.com/moneyvessel/kifu/internal/infrastructure/crypto"
)

const (
	providerOpenAI = "openai"
	providerClaude = "claude"
	providerGemini = "gemini"
)

type AIHandler struct {
	bubbleRepo       repositories.BubbleRepository
	opinionRepo      repositories.AIOpinionRepository
	providerRepo     repositories.AIProviderRepository
	userAIKeyRepo    repositories.UserAIKeyRepository
	subscriptionRepo repositories.SubscriptionRepository
	encryptionKey    []byte
	client           *http.Client
}

func NewAIHandler(
	bubbleRepo repositories.BubbleRepository,
	opinionRepo repositories.AIOpinionRepository,
	providerRepo repositories.AIProviderRepository,
	userAIKeyRepo repositories.UserAIKeyRepository,
	subscriptionRepo repositories.SubscriptionRepository,
	encryptionKey []byte,
) *AIHandler {
	return &AIHandler{
		bubbleRepo:       bubbleRepo,
		opinionRepo:      opinionRepo,
		providerRepo:     providerRepo,
		userAIKeyRepo:    userAIKeyRepo,
		subscriptionRepo: subscriptionRepo,
		encryptionKey:    encryptionKey,
		client: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

type AIOpinionRequest struct {
	Providers []string `json:"providers"`
}

type AIOpinionItem struct {
	Provider   string `json:"provider"`
	Model      string `json:"model"`
	Response   string `json:"response"`
	TokensUsed *int   `json:"tokens_used,omitempty"`
}

type AIOpinionError struct {
	Provider string `json:"provider"`
	Code     string `json:"code"`
	Message  string `json:"message"`
}

type AIOpinionResponse struct {
	Opinions       []AIOpinionItem  `json:"opinions"`
	Errors         []AIOpinionError `json:"errors,omitempty"`
	DataIncomplete bool             `json:"data_incomplete"`
}

type OneShotAIRequest struct {
	Provider     string `json:"provider"`
	PromptType   string `json:"prompt_type"`
	Symbol       string `json:"symbol"`
	Timeframe    string `json:"timeframe"`
	Price        string `json:"price"`
	EvidenceText string `json:"evidence_text"`
}

type OneShotAIResponse struct {
	Provider   string `json:"provider"`
	Model      string `json:"model"`
	PromptType string `json:"prompt_type"`
	Response   string `json:"response"`
	TokensUsed *int   `json:"tokens_used,omitempty"`
	CreatedAt  string `json:"created_at"`
}

type UserAIKeyRequest struct {
	Keys []UserAIKeyInput `json:"keys"`
}

type UserAIKeyInput struct {
	Provider string `json:"provider"`
	APIKey   string `json:"api_key"`
}

type UserAIKeyListResponse struct {
	Keys []UserAIKeyItem `json:"keys"`
}

type UserAIKeyItem struct {
	Provider string  `json:"provider"`
	Masked   *string `json:"masked"`
}

func (h *AIHandler) RequestOpinions(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	var req AIOpinionRequest
	if err := c.BodyParser(&req); err != nil && !errors.Is(err, io.EOF) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if bubble == nil {
		return c.Status(404).JSON(fiber.Map{"code": "BUBBLE_NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}

	providers, err := h.resolveProviders(c.Context(), req.Providers)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}
	if len(providers) == 0 {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "no providers available"})
	}

	subscription, err := h.subscriptionRepo.GetByUserID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if subscription == nil {
		return c.Status(404).JSON(fiber.Map{"code": "SUBSCRIPTION_NOT_FOUND", "message": "subscription not found"})
	}

	candles, incomplete, err := h.fetchKlines(c.Context(), bubble.Symbol, bubble.Timeframe, bubble.CandleTime)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_REQUEST_FAILED", "message": err.Error()})
	}

	prompt := buildPrompt(bubble, candles)

	perProviderKey := map[string]string{}
	for _, provider := range providers {
		key, err := h.resolveAPIKey(c.Context(), userID, provider)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		perProviderKey[provider] = key
	}

	serviceUsage := 0
	for _, provider := range providers {
		if usesServiceKey(provider, perProviderKey[provider]) {
			serviceUsage++
		}
	}

	if serviceUsage > 0 && subscription.AIQuotaRemaining < serviceUsage {
		return c.Status(429).JSON(fiber.Map{"code": "QUOTA_EXCEEDED", "message": "AI quota exceeded"})
	}

	opinions := make([]AIOpinionItem, 0, len(providers))
	errorsList := make([]AIOpinionError, 0)
	successfulServiceUsage := 0

	for _, provider := range providers {
		key := perProviderKey[provider]
		if key == "" {
			errorsList = append(errorsList, AIOpinionError{Provider: provider, Code: "MISSING_API_KEY", Message: "API key not configured"})
			continue
		}

		model, err := h.lookupModel(c.Context(), provider)
		if err != nil {
			errorsList = append(errorsList, AIOpinionError{Provider: provider, Code: "PROVIDER_ERROR", Message: err.Error()})
			continue
		}

		responseText, tokensUsed, err := h.callProvider(c.Context(), provider, model, key, prompt)
		if err != nil {
			errorsList = append(errorsList, AIOpinionError{Provider: provider, Code: "PROVIDER_ERROR", Message: err.Error()})
			continue
		}

		opinion := &entities.AIOpinion{
			ID:             uuid.New(),
			BubbleID:       bubble.ID,
			Provider:       provider,
			Model:          model,
			PromptTemplate: prompt,
			Response:       responseText,
			TokensUsed:     tokensUsed,
			CreatedAt:      time.Now().UTC(),
		}
		if err := h.opinionRepo.Create(c.Context(), opinion); err != nil {
			errorsList = append(errorsList, AIOpinionError{Provider: provider, Code: "INTERNAL_ERROR", Message: err.Error()})
			continue
		}

		opinions = append(opinions, AIOpinionItem{
			Provider:   provider,
			Model:      model,
			Response:   responseText,
			TokensUsed: tokensUsed,
		})

		if usesServiceKey(provider, key) {
			successfulServiceUsage++
		}
	}

	if successfulServiceUsage > 0 {
		ok, err := h.subscriptionRepo.DecrementQuota(c.Context(), userID, successfulServiceUsage)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		if !ok {
			return c.Status(429).JSON(fiber.Map{"code": "QUOTA_EXCEEDED", "message": "AI quota exceeded"})
		}
	}

	return c.Status(200).JSON(AIOpinionResponse{
		Opinions:       opinions,
		Errors:         errorsList,
		DataIncomplete: incomplete,
	})
}

func (h *AIHandler) RequestOneShot(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req OneShotAIRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	provider := strings.ToLower(strings.TrimSpace(req.Provider))
	if provider == "" {
		provider = providerOpenAI
	}
	if !isSupportedProvider(provider) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "unsupported provider"})
	}

	symbol := strings.TrimSpace(req.Symbol)
	timeframe := strings.TrimSpace(req.Timeframe)
	price := strings.TrimSpace(req.Price)
	if symbol == "" || timeframe == "" || price == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "symbol, timeframe, and price are required"})
	}

	subscription, err := h.subscriptionRepo.GetByUserID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if subscription == nil {
		return c.Status(404).JSON(fiber.Map{"code": "SUBSCRIPTION_NOT_FOUND", "message": "subscription not found"})
	}

	apiKey, err := h.resolveAPIKey(c.Context(), userID, provider)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if apiKey == "" {
		return c.Status(400).JSON(fiber.Map{"code": "MISSING_API_KEY", "message": "API key not configured"})
	}

	model, err := h.lookupModel(c.Context(), provider)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if usesServiceKey(provider, apiKey) && subscription.AIQuotaRemaining < 1 {
		return c.Status(429).JSON(fiber.Map{"code": "QUOTA_EXCEEDED", "message": "AI quota exceeded"})
	}

	prompt := buildOneShotPrompt(req)
	responseText := ""
	var tokensUsed *int
	if strings.TrimSpace(os.Getenv("AI_MOCK")) == "1" {
		responseText = mockOneShotResponse(req)
	} else {
		responseText, tokensUsed, err = h.callProvider(c.Context(), provider, model, apiKey, prompt)
		if err != nil {
			if strings.Contains(err.Error(), "openai error 502") || strings.Contains(err.Error(), "openai error 503") || strings.Contains(err.Error(), "openai error 504") {
				time.Sleep(800 * time.Millisecond)
				responseText, tokensUsed, err = h.callProvider(c.Context(), provider, model, apiKey, prompt)
			}
		}
		if err != nil {
			log.Printf("ai one-shot: provider=%s model=%s error=%v", provider, model, err)
			return c.Status(502).JSON(fiber.Map{"code": "PROVIDER_ERROR", "message": err.Error()})
		}
	}

	if usesServiceKey(provider, apiKey) {
		ok, err := h.subscriptionRepo.DecrementQuota(c.Context(), userID, 1)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		if !ok {
			return c.Status(429).JSON(fiber.Map{"code": "QUOTA_EXCEEDED", "message": "AI quota exceeded"})
		}
	}

	return c.Status(200).JSON(OneShotAIResponse{
		Provider:   provider,
		Model:      model,
		PromptType: strings.TrimSpace(req.PromptType),
		Response:   responseText,
		TokensUsed: tokensUsed,
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *AIHandler) ListOpinions(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if bubble == nil {
		return c.Status(404).JSON(fiber.Map{"code": "BUBBLE_NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}

	opinions, err := h.opinionRepo.ListByBubble(c.Context(), bubbleID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	response := make([]AIOpinionItem, 0, len(opinions))
	for _, opinion := range opinions {
		response = append(response, AIOpinionItem{
			Provider:   opinion.Provider,
			Model:      opinion.Model,
			Response:   opinion.Response,
			TokensUsed: opinion.TokensUsed,
		})
	}

	return c.Status(200).JSON(fiber.Map{"opinions": response})
}

func (h *AIHandler) GetUserAIKeys(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	keys, err := h.userAIKeyRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	keyMap := map[string]*entities.UserAIKey{}
	for _, key := range keys {
		keyMap[key.Provider] = key
	}

	providers := []string{providerOpenAI, providerClaude, providerGemini}
	response := UserAIKeyListResponse{Keys: make([]UserAIKeyItem, 0, len(providers))}
	for _, provider := range providers {
		if key, ok := keyMap[provider]; ok {
			masked := maskKey(key.APIKeyLast4)
			response.Keys = append(response.Keys, UserAIKeyItem{Provider: provider, Masked: &masked})
		} else {
			response.Keys = append(response.Keys, UserAIKeyItem{Provider: provider, Masked: nil})
		}
	}

	return c.Status(200).JSON(response)
}

func (h *AIHandler) UpdateUserAIKeys(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req UserAIKeyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if len(req.Keys) == 0 {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "keys are required"})
	}

	for _, entry := range req.Keys {
		provider := strings.ToLower(strings.TrimSpace(entry.Provider))
		apiKey := strings.TrimSpace(entry.APIKey)
		if !isSupportedProvider(provider) {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "unsupported provider"})
		}
		if apiKey == "" {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "api_key is required"})
		}

		encKey, err := cryptoutil.Encrypt(apiKey, h.encryptionKey)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}

		record := &entities.UserAIKey{
			ID:          uuid.New(),
			UserID:      userID,
			Provider:    provider,
			APIKeyEnc:   encKey,
			APIKeyLast4: lastFour(apiKey),
			CreatedAt:   time.Now().UTC(),
		}

		if err := h.userAIKeyRepo.Upsert(c.Context(), record); err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
	}

	return h.GetUserAIKeys(c)
}

func (h *AIHandler) DeleteUserAIKey(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	provider := strings.ToLower(strings.TrimSpace(c.Params("provider")))
	if !isSupportedProvider(provider) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "unsupported provider"})
	}

	deleted, err := h.userAIKeyRepo.DeleteByUserAndProvider(c.Context(), userID, provider)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if !deleted {
		return c.Status(404).JSON(fiber.Map{"code": "AI_KEY_NOT_FOUND", "message": "API key not found"})
	}

	return c.Status(200).JSON(fiber.Map{"deleted": true})
}

func (h *AIHandler) resolveProviders(ctx context.Context, requested []string) ([]string, error) {
	if len(requested) == 0 {
		providers, err := h.providerRepo.ListEnabled(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]string, 0, len(providers))
		for _, provider := range providers {
			result = append(result, provider.Name)
		}
		return result, nil
	}

	result := make([]string, 0, len(requested))
	seen := map[string]struct{}{}
	for _, provider := range requested {
		normalized := strings.ToLower(strings.TrimSpace(provider))
		if normalized == "" {
			continue
		}
		if !isSupportedProvider(normalized) {
			return nil, fmt.Errorf("unsupported provider: %s", normalized)
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	return result, nil
}

func (h *AIHandler) resolveAPIKey(ctx context.Context, userID uuid.UUID, provider string) (string, error) {
	switch provider {
	case providerOpenAI:
		return strings.TrimSpace(os.Getenv("OPENAI_API_KEY")), nil
	case providerClaude:
		return strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY")), nil
	case providerGemini:
		return strings.TrimSpace(os.Getenv("GEMINI_API_KEY")), nil
	default:
		return "", nil
	}
}

func (h *AIHandler) lookupModel(ctx context.Context, provider string) (string, error) {
	item, err := h.providerRepo.GetByName(ctx, provider)
	if err != nil {
		return "", err
	}
	if item == nil || !item.Enabled {
		return "", errors.New("provider not enabled")
	}
	return item.Model, nil
}

func (h *AIHandler) callProvider(ctx context.Context, provider string, model string, apiKey string, prompt string) (string, *int, error) {
	switch provider {
	case providerOpenAI:
		return h.callOpenAI(ctx, model, apiKey, prompt)
	case providerClaude:
		return h.callClaude(ctx, model, apiKey, prompt)
	case providerGemini:
		return h.callGemini(ctx, model, apiKey, prompt)
	default:
		return "", nil, errors.New("unsupported provider")
	}
}

func (h *AIHandler) callOpenAI(ctx context.Context, model string, apiKey string, prompt string) (string, *int, error) {
	payload := map[string]interface{}{
		"model":       model,
		"input":       prompt,
		"temperature": 0.4,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/responses", bytes.NewReader(body))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := h.client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("openai error %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}

	var result struct {
		Output []struct {
			Type    string `json:"type"`
			Role    string `json:"role"`
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
		} `json:"output"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", nil, err
	}

	parts := make([]string, 0)
	for _, item := range result.Output {
		if item.Type != "message" {
			continue
		}
		for _, content := range item.Content {
			if content.Type == "output_text" && strings.TrimSpace(content.Text) != "" {
				parts = append(parts, strings.TrimSpace(content.Text))
			}
		}
	}
	if len(parts) == 0 {
		return "", nil, errors.New("openai returned no content")
	}

	tokens := result.Usage.TotalTokens
	return strings.TrimSpace(strings.Join(parts, "\n")), &tokens, nil
}

func (h *AIHandler) callClaude(ctx context.Context, model string, apiKey string, prompt string) (string, *int, error) {
	payload := map[string]interface{}{
		"model":       model,
		"max_tokens":  512,
		"temperature": 0.4,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := h.client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("claude error %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}

	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", nil, err
	}

	if len(result.Content) == 0 {
		return "", nil, errors.New("claude returned no content")
	}

	tokens := result.Usage.InputTokens + result.Usage.OutputTokens
	return strings.TrimSpace(result.Content[0].Text), &tokens, nil
}

func (h *AIHandler) callGemini(ctx context.Context, model string, apiKey string, prompt string) (string, *int, error) {
	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{{"text": prompt}}},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", nil, err
	}

	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, url.QueryEscape(apiKey))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("gemini error %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		UsageMetadata struct {
			TotalTokenCount int `json:"totalTokenCount"`
		} `json:"usageMetadata"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", nil, err
	}

	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", nil, errors.New("gemini returned no content")
	}

	tokens := result.UsageMetadata.TotalTokenCount
	if tokens == 0 {
		return strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text), nil, nil
	}
	return strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text), &tokens, nil
}

type klineItem struct {
	Time   int64  `json:"time"`
	Open   string `json:"open"`
	High   string `json:"high"`
	Low    string `json:"low"`
	Close  string `json:"close"`
	Volume string `json:"volume"`
}

func (h *AIHandler) fetchKlines(ctx context.Context, symbol string, interval string, candleTime time.Time) ([]klineItem, bool, error) {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", interval)
	params.Set("limit", "50")
	params.Set("endTime", fmt.Sprintf("%d", candleTime.UTC().UnixMilli()))

	requestURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/klines?%s", params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, false, err
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		return nil, false, fmt.Errorf("binance klines error %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, false, err
	}

	items := make([]klineItem, 0, len(raw))
	for _, row := range raw {
		if len(row) < 6 {
			continue
		}
		openTime, ok := asInt64(row[0])
		if !ok {
			continue
		}
		open, ok := asString(row[1])
		if !ok {
			continue
		}
		high, ok := asString(row[2])
		if !ok {
			continue
		}
		low, ok := asString(row[3])
		if !ok {
			continue
		}
		closeVal, ok := asString(row[4])
		if !ok {
			continue
		}
		volume, ok := asString(row[5])
		if !ok {
			continue
		}

		items = append(items, klineItem{
			Time:   openTime / 1000,
			Open:   open,
			High:   high,
			Low:    low,
			Close:  closeVal,
			Volume: volume,
		})
	}

	return items, len(items) < 50, nil
}

func buildPrompt(bubble *entities.Bubble, candles []klineItem) string {
	builder := strings.Builder{}
	builder.WriteString("당신은 암호화폐 시장 분석가입니다.\n\n")
	builder.WriteString("현재 상황:\n")
	builder.WriteString(fmt.Sprintf("- 심볼: %s\n", bubble.Symbol))
	builder.WriteString(fmt.Sprintf("- 타임프레임: %s\n", bubble.Timeframe))
	builder.WriteString(fmt.Sprintf("- 현재 가격: %s\n", bubble.Price))
	if bubble.Memo != nil && strings.TrimSpace(*bubble.Memo) != "" {
		builder.WriteString(fmt.Sprintf("- 사용자 메모: %s\n", strings.TrimSpace(*bubble.Memo)))
	}
	builder.WriteString("\n최근 50개 캔들 데이터:\n")

	for _, candle := range candles {
		builder.WriteString(fmt.Sprintf("%d, O:%s H:%s L:%s C:%s V:%s\n",
			candle.Time, candle.Open, candle.High, candle.Low, candle.Close, candle.Volume))
	}

	builder.WriteString("\n질문: 이 상황에서의 단기 전망과 주의할 점을 분석해주세요.\n")
	return builder.String()
}

func buildOneShotPrompt(req OneShotAIRequest) string {
	builder := strings.Builder{}
	builder.WriteString("당신은 트레이딩 복기 어시스턴트입니다.\n")
	builder.WriteString("응답은 한국어로 간결하고 명확하게 작성하세요.\n")
	builder.WriteString("출력은 지정된 포맷만 사용하며 불필요한 서론은 생략하세요.\n\n")
	builder.WriteString("규칙:\n")
	builder.WriteString("- 근거 없는 일반론 금지, 증거 패킷이 있으면 최소 1줄 이상 구체적으로 언급\n")
	builder.WriteString("- 애매하면 '추가로 확인할 데이터'를 1줄 포함\n")
	builder.WriteString("- 숫자/레벨/조건을 가능한 구체적으로 제시\n\n")
	builder.WriteString("- 증거 패킷에 Open positions가 있으면 최소 1개 포지션을 언급하고 그 기준으로 행동 제안\n")
	builder.WriteString("- 포지션에 손절/익절 가격이 있으면 해당 레벨을 반드시 언급\n\n")
	builder.WriteString("현재 상황:\n")
	builder.WriteString(fmt.Sprintf("- 심볼: %s\n", strings.TrimSpace(req.Symbol)))
	builder.WriteString(fmt.Sprintf("- 타임프레임: %s\n", strings.TrimSpace(req.Timeframe)))
	builder.WriteString(fmt.Sprintf("- 현재 가격: %s\n", strings.TrimSpace(req.Price)))

	if strings.TrimSpace(req.EvidenceText) != "" {
		builder.WriteString("\n증거 패킷(요약):\n")
		builder.WriteString(strings.TrimSpace(req.EvidenceText))
		builder.WriteString("\n")
	}

	switch strings.ToLower(strings.TrimSpace(req.PromptType)) {
	case "detailed":
		builder.WriteString("\n출력 형식:\n")
		builder.WriteString("1) 요약: 한 줄\n")
		builder.WriteString("2) 핵심 근거: 2줄 이내(증거 패킷 기준)\n")
		builder.WriteString("3) 리스크: 2줄 이내\n")
		builder.WriteString("4) 유효/무효 조건: 2줄 이내\n")
		builder.WriteString("5) 행동 제안: 포지션 있으면 유지/축소/정리/추가 중 하나, 없으면 관망/진입/축소 + 이유 1줄\n")
		builder.WriteString("6) 체크리스트: 불릿 3개 이하\n")
		builder.WriteString("7) 결론: 한 줄\n")
	case "technical":
		builder.WriteString("\n출력 형식:\n")
		builder.WriteString("1) 추세/모멘텀: 한 줄\n")
		builder.WriteString("2) 핵심 레벨: 지지/저항 1~2개씩\n")
		builder.WriteString("3) 무효화 조건: 한 줄\n")
		builder.WriteString("4) 시나리오: 상승/하락 각 1줄\n")
		builder.WriteString("5) 행동 제안: 포지션 있으면 유지/축소/정리/추가 중 하나, 없으면 관망/진입/축소\n")
		builder.WriteString("6) 추가 확인 데이터: 한 줄(애매할 때)\n")
		builder.WriteString("7) 결론: 한 줄\n")
	default:
		builder.WriteString("\n출력 형식:\n")
		builder.WriteString("1) 상황: 한 줄\n")
		builder.WriteString("2) 핵심 근거: 한 줄(증거 패킷 기준)\n")
		builder.WriteString("3) 리스크: 한 줄\n")
		builder.WriteString("4) 행동 제안: 포지션 있으면 유지/축소/정리/추가, 없으면 관망/진입/축소\n")
		builder.WriteString("5) 결론: 한 줄\n")
	}
	return builder.String()
}

func mockOneShotResponse(req OneShotAIRequest) string {
	switch strings.ToLower(strings.TrimSpace(req.PromptType)) {
	case "detailed":
		return strings.TrimSpace(`1) 요약: 급격한 변동 이후 관망/확인 구간으로 보입니다.
2) 핵심 근거: 최근 변동성 확대와 거래량 증가 구간이 확인됩니다.
3) 리스크: 변동성 확대 구간에서 역추세 진입은 손실 확률이 높습니다.
4) 유효/무효 조건: 직전 고점 회복 실패 시 신중, 고점 회복 시 시나리오 재평가.
5) 행동 제안: 보유 중이면 손절 기준 점검 후 축소 또는 정리 검토.
6) 체크리스트: 손절 기준 확인 · 포지션 사이즈 축소 · 주요 뉴스/지표 확인
7) 결론: 기준 레벨 확인 전까지 무리한 진입은 피하는 편이 안전합니다.`)
	case "technical":
		return strings.TrimSpace(`1) 추세/모멘텀: 단기 모멘텀 약화, 방향성 불명확.
2) 핵심 레벨: 지지 1개/저항 1개 기준만 확인.
3) 무효화 조건: 직전 저점 이탈 시 하방 시나리오 강화.
4) 시나리오: 상승—저항 돌파 후 눌림 확인 / 하락—지지 이탈 후 반등 실패.
5) 행동 제안: 보유 중이면 리스크 축소, 신규 진입은 관망.
6) 추가 확인 데이터: 거래량/뉴스 이벤트 확인.
7) 결론: 레벨 확인 전까지 관망이 합리적.`)
	default:
		return strings.TrimSpace(`1) 상황: 변동성 확대로 판단 구간이 빠르게 바뀌는 상태입니다.
2) 핵심 근거: 변동폭 확대와 방향성 불확실 구간이 동시에 나타납니다.
3) 리스크: 방향 확인 없이 추격 진입하면 손실 가능성이 높습니다.
4) 행동 제안: 보유 중이면 축소 또는 정리 우선, 신규 진입은 관망.
5) 결론: 신호 확인 전까지 관망 또는 소규모 대응이 적합합니다.`)
	}
}

func isSupportedProvider(provider string) bool {
	switch provider {
	case providerOpenAI, providerClaude, providerGemini:
		return true
	default:
		return false
	}
}

func usesServiceKey(provider string, key string) bool {
	if key == "" {
		return false
	}
	switch provider {
	case providerOpenAI:
		return strings.TrimSpace(os.Getenv("OPENAI_API_KEY")) == key
	case providerClaude:
		return strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY")) == key
	case providerGemini:
		return strings.TrimSpace(os.Getenv("GEMINI_API_KEY")) == key
	default:
		return false
	}
}
