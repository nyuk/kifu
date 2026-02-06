package services

import (
	"bytes"
	"context"
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

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	cryptoutil "github.com/moneyvessel/kifu/internal/infrastructure/crypto"
	"github.com/moneyvessel/kifu/internal/infrastructure/notification"
)

type AlertBriefingService struct {
	alertRepo    repositories.AlertRepository
	briefingRepo repositories.AlertBriefingRepository
	providerRepo repositories.AIProviderRepository
	userKeyRepo  repositories.UserAIKeyRepository
	channelRepo  repositories.NotificationChannelRepository
	tradeRepo    repositories.TradeRepository
	encKey       []byte
	sender       notification.Sender
	client       *http.Client
	appBaseURL   string
}

func NewAlertBriefingService(
	alertRepo repositories.AlertRepository,
	briefingRepo repositories.AlertBriefingRepository,
	providerRepo repositories.AIProviderRepository,
	userKeyRepo repositories.UserAIKeyRepository,
	channelRepo repositories.NotificationChannelRepository,
	tradeRepo repositories.TradeRepository,
	encKey []byte,
	sender notification.Sender,
) *AlertBriefingService {
	appURL := os.Getenv("APP_BASE_URL")
	if appURL == "" {
		appURL = "http://localhost:5173"
	}
	return &AlertBriefingService{
		alertRepo:    alertRepo,
		briefingRepo: briefingRepo,
		providerRepo: providerRepo,
		userKeyRepo:  userKeyRepo,
		channelRepo:  channelRepo,
		tradeRepo:    tradeRepo,
		encKey:       encKey,
		sender:       sender,
		client:       &http.Client{Timeout: 30 * time.Second},
		appBaseURL:   appURL,
	}
}

// HandleTrigger is called by AlertMonitor when an alert fires
func (s *AlertBriefingService) HandleTrigger(ctx context.Context, alert *entities.Alert, rule *entities.AlertRule) {
	// 1. Fetch market context
	candles, err := s.fetchKlines(ctx, alert.Symbol, "1h", 50)
	if err != nil {
		log.Printf("alert briefing: fetch klines failed: %v", err)
	}

	// 2. Fetch user positions (from trades)
	positions := s.getUserPositionSummary(ctx, alert.UserID, alert.Symbol)

	// 3. Build alert-specific prompt
	prompt := buildAlertPrompt(alert, candles, positions)

	// 4. Call all enabled AI providers
	providers, err := s.providerRepo.ListEnabled(ctx)
	if err != nil {
		log.Printf("alert briefing: list providers failed: %v", err)
		return
	}

	var briefingSummaries []string

	for _, provider := range providers {
		apiKey, err := s.resolveAPIKey(ctx, alert.UserID, provider.Name)
		if err != nil || apiKey == "" {
			continue
		}

		model := provider.Model
		responseText, tokensUsed, err := s.callProvider(ctx, provider.Name, model, apiKey, prompt)
		if err != nil {
			log.Printf("alert briefing: %s call failed: %v", provider.Name, err)
			continue
		}

		briefing := &entities.AlertBriefing{
			ID:        uuid.New(),
			AlertID:   alert.ID,
			Provider:  provider.Name,
			Model:     model,
			Prompt:    prompt,
			Response:  responseText,
			TokensUsed: tokensUsed,
			CreatedAt: time.Now().UTC(),
		}

		if err := s.briefingRepo.Create(ctx, briefing); err != nil {
			log.Printf("alert briefing: save failed: %v", err)
			continue
		}

		// Extract first line as summary
		summary := firstLine(responseText)
		briefingSummaries = append(briefingSummaries, fmt.Sprintf("%s: %s", provider.Name, summary))
	}

	// 5. Update alert status
	if err := s.alertRepo.UpdateStatus(ctx, alert.ID, entities.AlertStatusBriefed); err != nil {
		log.Printf("alert briefing: update status failed: %v", err)
	}

	// 6. Send notification
	if s.sender == nil {
		return
	}

	body := fmt.Sprintf("현재: $%s\n%s", alert.TriggerPrice, positions)
	if len(briefingSummaries) > 0 {
		body += "\n\nAI 브리핑:\n"
		for _, s := range briefingSummaries {
			body += fmt.Sprintf("- %s\n", s)
		}
	}

	msg := notification.Message{
		Title:    alert.TriggerReason,
		Body:     body,
		Severity: string(alert.Severity),
		DeepLink: fmt.Sprintf("%s/alerts/%s", s.appBaseURL, alert.ID.String()),
	}

	if err := s.sender.Send(ctx, alert.UserID, msg); err != nil {
		log.Printf("alert briefing: send notification failed: %v", err)
	} else {
		_ = s.alertRepo.SetNotified(ctx, alert.ID)
	}
}

func (s *AlertBriefingService) getUserPositionSummary(ctx context.Context, userID uuid.UUID, symbol string) string {
	trades, err := s.tradeRepo.ListByUserAndSymbol(ctx, userID, symbol)
	if err != nil || len(trades) == 0 {
		return "포지션: 없음"
	}

	// Simple aggregation of recent trades
	var totalBuy, totalSell float64
	for _, t := range trades {
		qty := parseFloat(t.Quantity)
		if strings.EqualFold(t.Side, "BUY") {
			totalBuy += qty
		} else {
			totalSell += qty
		}
	}

	net := totalBuy - totalSell
	if net > 0.0001 {
		return fmt.Sprintf("포지션: Long %.4f %s", net, symbol)
	} else if net < -0.0001 {
		return fmt.Sprintf("포지션: Short %.4f %s", -net, symbol)
	}
	return "포지션: 없음 (최근 거래 있음)"
}

func parseFloat(s string) float64 {
	var f float64
	fmt.Sscanf(s, "%f", &f)
	return f
}

type klineItem struct {
	Time   int64
	Open   string
	High   string
	Low    string
	Close  string
	Volume string
}

func (s *AlertBriefingService) fetchKlines(ctx context.Context, symbol string, interval string, limit int) ([]klineItem, error) {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", interval)
	params.Set("limit", fmt.Sprintf("%d", limit))

	reqURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/klines?%s", params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("klines error %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	items := make([]klineItem, 0, len(raw))
	for _, row := range raw {
		if len(row) < 6 {
			continue
		}
		openTime, _ := row[0].(float64)
		open, _ := row[1].(string)
		high, _ := row[2].(string)
		low, _ := row[3].(string)
		closeVal, _ := row[4].(string)
		volume, _ := row[5].(string)

		items = append(items, klineItem{
			Time:   int64(openTime) / 1000,
			Open:   open,
			High:   high,
			Low:    low,
			Close:  closeVal,
			Volume: volume,
		})
	}

	return items, nil
}

func (s *AlertBriefingService) resolveAPIKey(ctx context.Context, userID uuid.UUID, provider string) (string, error) {
	key, err := s.userKeyRepo.GetByUserAndProvider(ctx, userID, provider)
	if err != nil {
		return "", err
	}
	if key != nil {
		return cryptoutil.Decrypt(key.APIKeyEnc, s.encKey)
	}

	switch provider {
	case "openai":
		return strings.TrimSpace(os.Getenv("OPENAI_API_KEY")), nil
	case "claude":
		return strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY")), nil
	case "gemini":
		return strings.TrimSpace(os.Getenv("GEMINI_API_KEY")), nil
	}
	return "", nil
}

func (s *AlertBriefingService) callProvider(ctx context.Context, provider, model, apiKey, prompt string) (string, *int, error) {
	switch provider {
	case "openai":
		return s.callOpenAI(ctx, model, apiKey, prompt)
	case "claude":
		return s.callClaude(ctx, model, apiKey, prompt)
	case "gemini":
		return s.callGemini(ctx, model, apiKey, prompt)
	}
	return "", nil, errors.New("unsupported provider")
}

func (s *AlertBriefingService) callOpenAI(ctx context.Context, model, apiKey, prompt string) (string, *int, error) {
	payload := map[string]interface{}{
		"model":       model,
		"messages":    []map[string]string{{"role": "user", "content": prompt}},
		"temperature": 0.3,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("openai error %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		Choices []struct {
			Message struct{ Content string } `json:"message"`
		} `json:"choices"`
		Usage struct{ TotalTokens int `json:"total_tokens"` } `json:"usage"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	if len(result.Choices) == 0 {
		return "", nil, errors.New("no choices")
	}
	t := result.Usage.TotalTokens
	return strings.TrimSpace(result.Choices[0].Message.Content), &t, nil
}

func (s *AlertBriefingService) callClaude(ctx context.Context, model, apiKey, prompt string) (string, *int, error) {
	payload := map[string]interface{}{
		"model":       model,
		"max_tokens":  512,
		"temperature": 0.3,
		"messages":    []map[string]string{{"role": "user", "content": prompt}},
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("claude error %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		Content []struct{ Text string } `json:"content"`
		Usage   struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	if len(result.Content) == 0 {
		return "", nil, errors.New("no content")
	}
	t := result.Usage.InputTokens + result.Usage.OutputTokens
	return strings.TrimSpace(result.Content[0].Text), &t, nil
}

func (s *AlertBriefingService) callGemini(ctx context.Context, model, apiKey, prompt string) (string, *int, error) {
	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{{"text": prompt}}},
		},
	}
	body, _ := json.Marshal(payload)

	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, url.QueryEscape(apiKey))
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("gemini error %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct{ Text string } `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		UsageMetadata struct{ TotalTokenCount int `json:"totalTokenCount"` } `json:"usageMetadata"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", nil, errors.New("no content")
	}
	t := result.UsageMetadata.TotalTokenCount
	if t == 0 {
		return strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text), nil, nil
	}
	return strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text), &t, nil
}

func buildAlertPrompt(alert *entities.Alert, candles []klineItem, positionSummary string) string {
	var b strings.Builder
	b.WriteString("당신은 암호화폐 트레이딩 위기 대응 어드바이저입니다.\n\n")
	b.WriteString("## 긴급 상황\n")
	b.WriteString(fmt.Sprintf("- 심볼: %s\n", alert.Symbol))
	b.WriteString(fmt.Sprintf("- 트리거: %s\n", alert.TriggerReason))
	b.WriteString(fmt.Sprintf("- 현재가: $%s\n", alert.TriggerPrice))
	b.WriteString(fmt.Sprintf("- 시각: %s\n\n", alert.CreatedAt.Format("2006-01-02 15:04 UTC")))

	b.WriteString(fmt.Sprintf("## 유저 포지션\n%s\n\n", positionSummary))

	if len(candles) > 0 {
		b.WriteString("## 최근 시장 데이터 (1h 캔들)\n")
		for _, c := range candles {
			b.WriteString(fmt.Sprintf("%d, O:%s H:%s L:%s C:%s V:%s\n",
				c.Time, c.Open, c.High, c.Low, c.Close, c.Volume))
		}
		b.WriteString("\n")
	}

	b.WriteString(`## 요청
1. 현재 상황을 3줄로 요약
2. 즉시 행동 권고 (매수/매도/홀드/감축 중 택 1)
3. 권고 이유 (2줄)
4. 주의할 리스크 (1줄)
5. 확신도 (1~10)

간결하게 답변하세요. 숫자와 근거 중심으로.`)

	return b.String()
}

func firstLine(s string) string {
	idx := strings.IndexByte(s, '\n')
	if idx < 0 {
		if len(s) > 100 {
			return s[:100] + "..."
		}
		return s
	}
	line := s[:idx]
	if len(line) > 100 {
		return line[:100] + "..."
	}
	return line
}
