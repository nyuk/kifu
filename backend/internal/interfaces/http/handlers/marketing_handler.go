package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/services"
)

type MarketingHandler struct {
	service *services.MarketingService
}

func NewMarketingHandler(service *services.MarketingService) *MarketingHandler {
	return &MarketingHandler{service: service}
}

type CreateMarketingIdeaRequest struct {
	ProductKey    string   `json:"product_key"`
	Title         string   `json:"title"`
	RawNote       string   `json:"raw_note"`
	AngleType     string   `json:"angle_type"`
	MessagePillar string   `json:"message_pillar"`
	Channels      []string `json:"channels"`
	SourceLink    *string  `json:"source_link"`
}

type GenerateMarketingDraftRequest struct {
	ProductKey string `json:"product_key"`
	Channel    string `json:"channel"`
	Tone       string `json:"tone"`
}

type UpdateMarketingDraftRequest struct {
	ProductKey string   `json:"product_key"`
	Title      *string  `json:"title"`
	Content    *string  `json:"content"`
	Tone       *string  `json:"tone"`
	RiskFlags  []string `json:"risk_flags"`
	Status     *string  `json:"status"`
}

func (h *MarketingHandler) GetWorkspace(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "로그인이 필요합니다"})
	}

	workspace, err := h.service.GetWorkspace(c.Context(), userID, c.Query("product_key"))
	if err != nil {
		return h.writeMarketingError(c, err)
	}
	return c.JSON(workspace)
}

func (h *MarketingHandler) CreateIdea(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "로그인이 필요합니다"})
	}

	var req CreateMarketingIdeaRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "요청 본문 형식이 올바르지 않습니다"})
	}

	idea, err := h.service.CreateIdea(c.Context(), services.CreateMarketingIdeaInput{
		UserID:        userID,
		ProductKey:    req.ProductKey,
		Title:         req.Title,
		RawNote:       req.RawNote,
		AngleType:     req.AngleType,
		MessagePillar: req.MessagePillar,
		Channels:      req.Channels,
		SourceLink:    req.SourceLink,
	})
	if err != nil {
		return h.writeMarketingError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(idea)
}

func (h *MarketingHandler) GenerateDraft(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "로그인이 필요합니다"})
	}

	ideaID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "아이디어 ID 형식이 올바르지 않습니다"})
	}

	var req GenerateMarketingDraftRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "요청 본문 형식이 올바르지 않습니다"})
	}

	draft, err := h.service.GenerateDraft(c.Context(), services.GenerateMarketingDraftInput{
		UserID:     userID,
		ProductKey: req.ProductKey,
		IdeaID:     ideaID,
		Channel:    req.Channel,
		Tone:       req.Tone,
	})
	if err != nil {
		return h.writeMarketingError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(draft)
}

func (h *MarketingHandler) UpdateDraft(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "로그인이 필요합니다"})
	}

	draftID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "초안 ID 형식이 올바르지 않습니다"})
	}

	var req UpdateMarketingDraftRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "요청 본문 형식이 올바르지 않습니다"})
	}

	var riskFlags []string
	if req.RiskFlags != nil {
		riskFlags = req.RiskFlags
	}

	draft, err := h.service.UpdateDraft(c.Context(), services.UpdateMarketingDraftInput{
		UserID:     userID,
		ProductKey: req.ProductKey,
		DraftID:    draftID,
		Title:      req.Title,
		Content:    req.Content,
		Tone:       req.Tone,
		RiskFlags:  riskFlags,
		Status:     req.Status,
	})
	if err != nil {
		return h.writeMarketingError(c, err)
	}
	return c.JSON(draft)
}

func (h *MarketingHandler) writeMarketingError(c *fiber.Ctx, err error) error {
	var marketingErr *services.MarketingError
	if errors.As(err, &marketingErr) {
		status := fiber.StatusBadRequest
		switch marketingErr.Code {
		case services.MarketingErrorNotFound:
			status = fiber.StatusNotFound
		case services.MarketingErrorForbidden:
			status = fiber.StatusForbidden
		}
		return c.Status(status).JSON(fiber.Map{
			"code":    string(marketingErr.Code),
			"message": marketingErr.Message,
		})
	}

	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
		"code":    "INTERNAL_ERROR",
		"message": "마케팅 요청을 처리하는 중 오류가 발생했습니다",
	})
}
