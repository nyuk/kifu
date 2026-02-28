package services

import (
	"context"
	"encoding/json"
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
	"github.com/moneyvessel/kifu/internal/domain/interfaces"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/ai_providers"
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
	aiInvocation *AIInvocationService
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
		aiInvocation: newAlertBriefingAIInvocationService(providerRepo, userKeyRepo, encKey),
	}
}

func newAlertBriefingAIInvocationService(
	providerRepo repositories.AIProviderRepository,
	userKeyRepo repositories.UserAIKeyRepository,
	encryptionKey []byte,
) *AIInvocationService {
	httpClient := &http.Client{Timeout: 30 * time.Second}
	registry := ai_providers.NewProviderRegistry(nil)
	registry.RegisterClient(entities.ProviderTypeOpenAI, ai_providers.NewOpenAIClient(httpClient))
	registry.RegisterClient(entities.ProviderTypeAnthropic, ai_providers.NewClaudeClient(httpClient))
	registry.RegisterClient(entities.ProviderTypeGoogle, ai_providers.NewGeminiClient(httpClient))
	credentialResolver := NewAICredentialResolver(userKeyRepo, providerRepo, encryptionKey)
	return NewAIInvocationService(providerRepo, credentialResolver, registry)
}

// HandleTrigger is called by AlertMonitor when an alert fires
func (s *AlertBriefingService) HandleTrigger(ctx context.Context, alert *entities.Alert, rule *entities.AlertRule) {
	log.Printf("alert briefing: HandleTrigger called for alert %s (rule: %s, symbol: %s)", alert.ID, rule.Name, alert.Symbol)

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
	log.Printf("alert briefing: found %d enabled providers", len(providers))

	var briefingSummaries []string

	for _, provider := range providers {
		model := provider.Model
		if strings.TrimSpace(model) == "" {
			log.Printf("alert briefing: %s skipped (no model)", provider.Name)
			continue
		}
		messages := []interfaces.AIMessage{
			{Role: "user", Content: prompt},
		}
		result, err := s.aiInvocation.InvokeProvider(ctx, alert.UserID, provider.Name, model, messages, nil)
		if err != nil {
			log.Printf("alert briefing: %s call failed: %v", provider.Name, err)
			continue
		}
		responseText := strings.TrimSpace(result.Content)
		var tokensUsed *int
		if result.TokensUsed > 0 {
			tokensUsed = &result.TokensUsed
		}
		log.Printf("alert briefing: %s responded (%d chars)", provider.Name, len(responseText))

		briefing := &entities.AlertBriefing{
			ID:         uuid.New(),
			AlertID:    alert.ID,
			Provider:   provider.Name,
			Model:      model,
			Prompt:     prompt,
			Response:   responseText,
			TokensUsed: tokensUsed,
			CreatedAt:  time.Now().UTC(),
		}

		if err := s.briefingRepo.Create(ctx, briefing); err != nil {
			log.Printf("alert briefing: save failed: %v", err)
			continue
		}

		briefingSummaries = append(briefingSummaries, responseText)
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
		body += "\n\n📊 AI 브리핑:\n" + briefingSummaries[0]
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
