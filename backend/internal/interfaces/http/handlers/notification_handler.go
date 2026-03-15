package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/notification"
	"github.com/moneyvessel/kifu/internal/services"
)

type NotificationHandler struct {
	channelRepo   repositories.NotificationChannelRepository
	verifyRepo    repositories.TelegramVerifyCodeRepository
	tgSender      *notification.TelegramSender
	tgBotUsername string
	reviewBot     *services.ReviewBotService
}

func NewNotificationHandler(
	channelRepo repositories.NotificationChannelRepository,
	verifyRepo repositories.TelegramVerifyCodeRepository,
	tgSender *notification.TelegramSender,
	tgBotUsername string,
	reviewBot *services.ReviewBotService,
) *NotificationHandler {
	return &NotificationHandler{
		channelRepo:   channelRepo,
		verifyRepo:    verifyRepo,
		tgSender:      tgSender,
		tgBotUsername: tgBotUsername,
		reviewBot:     reviewBot,
	}
}

type TelegramConnectResponse struct {
	Code      string `json:"code"`
	ExpiresIn int    `json:"expires_in"`
	Message   string `json:"message"`
	BotURL    string `json:"bot_url,omitempty"`
}

// TelegramWebhookRequest supports both messages and callback queries.
type TelegramWebhookRequest struct {
	Message *struct {
		Chat struct {
			ID int64 `json:"id"`
		} `json:"chat"`
		Text string `json:"text"`
	} `json:"message"`
	CallbackQuery *struct {
		ID   string `json:"id"`
		From struct {
			ID int64 `json:"id"`
		} `json:"from"`
		Message *struct {
			Chat struct {
				ID int64 `json:"id"`
			} `json:"chat"`
		} `json:"message"`
		Data string `json:"data"`
	} `json:"callback_query"`
}

func (h *NotificationHandler) TelegramConnect(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	code := generateVerifyCode()
	verifyCode := &entities.TelegramVerifyCode{
		UserID:    userID,
		Code:      code,
		ExpiresAt: time.Now().UTC().Add(5 * time.Minute),
		Used:      false,
	}

	if err := h.verifyRepo.Create(c.Context(), verifyCode); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	resp := TelegramConnectResponse{
		Code:      code,
		ExpiresIn: 300,
		Message:   fmt.Sprintf("Telegram Bot에게 /start %s 를 보내세요", code),
	}
	if h.tgBotUsername != "" {
		resp.BotURL = fmt.Sprintf("https://t.me/%s?start=%s", h.tgBotUsername, code)
	}
	return c.JSON(resp)
}

func (h *NotificationHandler) TelegramWebhook(c *fiber.Ctx) error {
	var req TelegramWebhookRequest
	if err := c.BodyParser(&req); err != nil {
		log.Printf("telegram webhook: parse error: %v", err)
		return c.SendStatus(200)
	}

	// Handle callback queries (inline keyboard button presses)
	if req.CallbackQuery != nil {
		log.Printf("telegram webhook: callback from chat %d, data=%s", req.CallbackQuery.Message.Chat.ID, req.CallbackQuery.Data)
		h.handleCallbackQuery(c, req.CallbackQuery)
		return c.SendStatus(200)
	}

	// Handle text messages
	if req.Message == nil {
		return c.SendStatus(200)
	}

	text := req.Message.Text
	chatID := req.Message.Chat.ID
	log.Printf("telegram webhook: message from chat %d: %s", chatID, text)

	// /start {code} — verification flow
	if len(text) >= 7 && text[:7] == "/start " {
		h.handleStartCommand(c, chatID, text[7:])
		return c.SendStatus(200)
	}

	// /test — E2E test: send mock plan keyboard
	if text == "/test" {
		h.handleTestCommand(c, chatID)
		return c.SendStatus(200)
	}

	// /plans — show recent plans
	if text == "/plans" {
		h.handlePlansCommand(c, chatID)
		return c.SendStatus(200)
	}

	// Free text — delegate to review bot (stop-loss, custom reason)
	if h.reviewBot != nil {
		reply, keyboard := h.reviewBot.HandleText(c.Context(), chatID, text)
		if reply != "" {
			_ = h.tgSender.SendKeyboardToChatID(c.Context(), chatID, reply, keyboard)
		}
		return c.SendStatus(200)
	}

	if h.tgSender != nil {
		_ = h.tgSender.SendToChatID(c.Context(), chatID,
			"kifu 복기봇입니다.\n\n"+
				"/plans — 최근 거래 계획\n"+
				"/test — 테스트 복기 시작\n\n"+
				"알림이 오면 자동으로 복기가 시작됩니다.")
	}
	return c.SendStatus(200)
}

func (h *NotificationHandler) handleCallbackQuery(c *fiber.Ctx, cb *TelegramWebhookRequest_CallbackQuery) {
	if h.tgSender != nil {
		_ = h.tgSender.AnswerCallbackQuery(c.Context(), cb.ID)
	}

	if h.reviewBot == nil {
		return
	}

	chatID := cb.Message.Chat.ID
	data := cb.Data

	var reply string
	var keyboard *notification.InlineKeyboard

	switch {
	case strings.HasPrefix(data, "plan:"):
		// plan:{action}:{alertID}
		parts := strings.SplitN(data, ":", 3)
		if len(parts) == 3 {
			reply, keyboard = h.reviewBot.HandleAction(c.Context(), chatID, parts[2], parts[1])
		}
	case strings.HasPrefix(data, "reason:"):
		// reason:{planID}:{reason}
		parts := strings.SplitN(data, ":", 3)
		if len(parts) == 3 {
			reply, keyboard = h.reviewBot.HandleReason(c.Context(), parts[1], parts[2])
		}
	}

	if reply != "" && h.tgSender != nil {
		_ = h.tgSender.SendKeyboardToChatID(c.Context(), chatID, reply, keyboard)
	}
}

// Type alias for the callback query struct to use in method signature
type TelegramWebhookRequest_CallbackQuery = struct {
	ID   string `json:"id"`
	From struct {
		ID int64 `json:"id"`
	} `json:"from"`
	Message *struct {
		Chat struct {
			ID int64 `json:"id"`
		} `json:"chat"`
	} `json:"message"`
	Data string `json:"data"`
}

func (h *NotificationHandler) handleStartCommand(c *fiber.Ctx, chatID int64, code string) {
	verifyCode, err := h.verifyRepo.FindValidCode(c.Context(), code)
	if err != nil || verifyCode == nil {
		if h.tgSender != nil {
			_ = h.tgSender.SendToChatID(c.Context(), chatID, "유효하지 않거나 만료된 인증코드입니다.")
		}
		return
	}

	if err := h.verifyRepo.MarkUsed(c.Context(), verifyCode.ID); err != nil {
		return
	}

	configJSON, _ := json.Marshal(entities.TelegramConfig{ChatID: chatID})
	channel := &entities.NotificationChannel{
		ID:          uuid.New(),
		UserID:      verifyCode.UserID,
		ChannelType: entities.ChannelTelegram,
		Config:      configJSON,
		Enabled:     true,
		Verified:    true,
		CreatedAt:   time.Now().UTC(),
	}

	if err := h.channelRepo.Upsert(c.Context(), channel); err != nil {
		return
	}

	if h.tgSender != nil {
		_ = h.tgSender.SendToChatID(c.Context(), chatID,
			"kifu 알림이 연동되었습니다!\n\n"+
				"알림이 오면 매수/패스 버튼으로 15초 만에 거래 복기를 기록할 수 있습니다.\n"+
				"/plans — 최근 거래 계획 보기")
	}
}

func (h *NotificationHandler) handleTestCommand(c *fiber.Ctx, chatID int64) {
	if h.tgSender == nil {
		return
	}

	// Send a mock trade plan keyboard for E2E testing
	testAlertID := uuid.New()
	keyboard := notification.InlineKeyboard{
		InlineKeyboard: [][]notification.InlineButton{
			{
				{Text: "매수한다", CallbackData: fmt.Sprintf("plan:buy:%s", testAlertID)},
				{Text: "안 한다", CallbackData: fmt.Sprintf("plan:skip:%s", testAlertID)},
			},
		},
	}

	text := "<b>테스트 복기</b> — BTCUSDT\n\n" +
		"이 알림을 보고 매수할 건가요?"

	if err := h.tgSender.SendKeyboardToChatID(c.Context(), chatID, text, &keyboard); err != nil {
		log.Printf("telegram test: send keyboard failed: %v", err)
	}
}

func (h *NotificationHandler) handlePlansCommand(c *fiber.Ctx, chatID int64) {
	if h.reviewBot == nil || h.tgSender == nil {
		return
	}

	channel, err := h.channelRepo.GetByChatID(c.Context(), chatID)
	if err != nil || channel == nil {
		_ = h.tgSender.SendToChatID(c.Context(), chatID, "먼저 /start로 연동해주세요.")
		return
	}

	plans, err := h.reviewBot.GetRecentPlans(c.Context(), channel.UserID, 5)
	if err != nil || len(plans) == 0 {
		_ = h.tgSender.SendToChatID(c.Context(), chatID, "아직 거래 계획이 없습니다.\n알림이 오면 자동으로 복기가 시작됩니다.")
		return
	}

	var b strings.Builder
	b.WriteString("<b>최근 거래 계획</b>\n\n")
	for i, p := range plans {
		action := "매수"
		if p.Action == "skip" {
			action = "패스"
		}
		status := ""
		if p.PlanPnLPercent != nil {
			status = fmt.Sprintf(" → %s%%", *p.PlanPnLPercent)
		}
		b.WriteString(fmt.Sprintf("%d. %s %s %s%s\n",
			i+1, p.CreatedAt.Format("01/02 15:04"), p.Symbol, action, status))
	}
	_ = h.tgSender.SendToChatID(c.Context(), chatID, b.String())
}

func (h *NotificationHandler) TelegramDisconnect(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	if err := h.channelRepo.DeleteByUserAndType(c.Context(), userID, entities.ChannelTelegram); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"disconnected": true})
}

func (h *NotificationHandler) ListChannels(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	channels, err := h.channelRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	type channelItem struct {
		Type     string `json:"type"`
		Enabled  bool   `json:"enabled"`
		Verified bool   `json:"verified"`
	}

	items := make([]channelItem, 0, len(channels))
	for _, ch := range channels {
		items = append(items, channelItem{
			Type:     string(ch.ChannelType),
			Enabled:  ch.Enabled,
			Verified: ch.Verified,
		})
	}

	return c.JSON(fiber.Map{"channels": items})
}

func generateVerifyCode() string {
	max := big.NewInt(999999)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "000000"
	}
	return fmt.Sprintf("%06d", n.Int64())
}
