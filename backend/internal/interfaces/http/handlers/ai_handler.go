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
	key, err := h.userAIKeyRepo.GetByUserAndProvider(ctx, userID, provider)
	if err != nil {
		return "", err
	}
	if key != nil {
		return cryptoutil.Decrypt(key.APIKeyEnc, h.encryptionKey)
	}

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
		"model": model,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"temperature": 0.4,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
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
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", nil, err
	}

	if len(result.Choices) == 0 {
		return "", nil, errors.New("openai returned no choices")
	}

	tokens := result.Usage.TotalTokens
	return strings.TrimSpace(result.Choices[0].Message.Content), &tokens, nil
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
