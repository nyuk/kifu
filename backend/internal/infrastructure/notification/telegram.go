package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type TelegramSender struct {
	botToken    string
	channelRepo repositories.NotificationChannelRepository
	client      *http.Client
}

func NewTelegramSender(botToken string, channelRepo repositories.NotificationChannelRepository) *TelegramSender {
	return &TelegramSender{
		botToken:    botToken,
		channelRepo: channelRepo,
		client:      &http.Client{},
	}
}

func (t *TelegramSender) Send(ctx context.Context, userID uuid.UUID, msg Message) error {
	channel, err := t.channelRepo.GetByUserAndType(ctx, userID, entities.ChannelTelegram)
	if err != nil {
		return err
	}
	if channel == nil || !channel.Verified || !channel.Enabled {
		return nil // No verified Telegram channel
	}

	var tgConfig entities.TelegramConfig
	if err := json.Unmarshal(channel.Config, &tgConfig); err != nil {
		return err
	}
	if tgConfig.ChatID == 0 {
		return nil
	}

	text := formatTelegramMessage(msg)
	return t.sendMessage(ctx, tgConfig.ChatID, text)
}

func (t *TelegramSender) SendToChatID(ctx context.Context, chatID int64, text string) error {
	return t.sendMessage(ctx, chatID, text)
}

func (t *TelegramSender) sendMessage(ctx context.Context, chatID int64, text string) error {
	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "HTML",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	reqURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", t.botToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := t.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram sendMessage error %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	return nil
}

func formatTelegramMessage(msg Message) string {
	var b strings.Builder

	if msg.Severity == "urgent" {
		b.WriteString("\xf0\x9f\x94\xb4 <b>[긴급]</b> ")
	} else {
		b.WriteString("\xf0\x9f\x94\x94 ")
	}
	b.WriteString(fmt.Sprintf("<b>%s</b>\n\n", msg.Title))
	b.WriteString(msg.Body)

	if msg.DeepLink != "" {
		b.WriteString(fmt.Sprintf("\n\n<a href=\"%s\">상세 확인하기</a>", msg.DeepLink))
	}

	return b.String()
}
