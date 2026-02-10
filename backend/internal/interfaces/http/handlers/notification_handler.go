package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/notification"
)

type NotificationHandler struct {
	channelRepo    repositories.NotificationChannelRepository
	verifyRepo     repositories.TelegramVerifyCodeRepository
	tgSender       *notification.TelegramSender
	tgBotUsername  string
}

func NewNotificationHandler(
	channelRepo repositories.NotificationChannelRepository,
	verifyRepo repositories.TelegramVerifyCodeRepository,
	tgSender *notification.TelegramSender,
	tgBotUsername string,
) *NotificationHandler {
	return &NotificationHandler{
		channelRepo:   channelRepo,
		verifyRepo:    verifyRepo,
		tgSender:      tgSender,
		tgBotUsername: tgBotUsername,
	}
}

type TelegramConnectResponse struct {
	Code      string `json:"code"`
	ExpiresIn int    `json:"expires_in"`
	Message   string `json:"message"`
	BotURL    string `json:"bot_url,omitempty"`
}

type TelegramWebhookRequest struct {
	Message *struct {
		Chat struct {
			ID int64 `json:"id"`
		} `json:"chat"`
		Text string `json:"text"`
	} `json:"message"`
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
	if err := c.BodyParser(&req); err != nil || req.Message == nil {
		return c.SendStatus(200)
	}

	text := req.Message.Text
	chatID := req.Message.Chat.ID

	// Parse /start {code}
	if len(text) < 8 || text[:7] != "/start " {
		if h.tgSender != nil {
			_ = h.tgSender.SendToChatID(c.Context(), chatID, "사용법: /start <인증코드>")
		}
		return c.SendStatus(200)
	}

	code := text[7:]
	verifyCode, err := h.verifyRepo.FindValidCode(c.Context(), code)
	if err != nil || verifyCode == nil {
		if h.tgSender != nil {
			_ = h.tgSender.SendToChatID(c.Context(), chatID, "유효하지 않거나 만료된 인증코드입니다.")
		}
		return c.SendStatus(200)
	}

	// Mark code as used
	if err := h.verifyRepo.MarkUsed(c.Context(), verifyCode.ID); err != nil {
		return c.SendStatus(200)
	}

	// Save notification channel
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
		return c.SendStatus(200)
	}

	if h.tgSender != nil {
		_ = h.tgSender.SendToChatID(c.Context(), chatID, "kifu 알림이 연동되었습니다! 알림 규칙을 설정하면 여기로 알림이 옵니다.")
	}

	return c.SendStatus(200)
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
