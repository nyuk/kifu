package handlers

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

var (
	bubbleSymbolPattern = regexp.MustCompile(`^[A-Z0-9]{3,12}$`)
	bubbleTagPattern    = regexp.MustCompile(`^[a-z0-9_-]+$`)
	allowedTimeframes   = map[string]struct{}{
		"1m":  {},
		"15m": {},
		"1h":  {},
		"4h":  {},
		"1d":  {},
	}
)

type BubbleHandler struct {
	bubbleRepo repositories.BubbleRepository
}

func NewBubbleHandler(bubbleRepo repositories.BubbleRepository) *BubbleHandler {
	return &BubbleHandler{bubbleRepo: bubbleRepo}
}

type CreateBubbleRequest struct {
	Symbol     string    `json:"symbol"`
	Timeframe  string    `json:"timeframe"`
	CandleTime time.Time `json:"candle_time"`
	Price      string    `json:"price"`
	Memo       *string   `json:"memo"`
	Tags       []string  `json:"tags"`
}

type UpdateBubbleRequest struct {
	Memo *string  `json:"memo"`
	Tags []string `json:"tags"`
}

type BubbleResponse struct {
	ID         uuid.UUID `json:"id"`
	Symbol     string    `json:"symbol"`
	Timeframe  string    `json:"timeframe"`
	CandleTime time.Time `json:"candle_time"`
	Price      string    `json:"price"`
	BubbleType string    `json:"bubble_type"`
	Memo       *string   `json:"memo,omitempty"`
	Tags       []string  `json:"tags,omitempty"`
}

type BubbleListResponse struct {
	Page  int              `json:"page"`
	Limit int              `json:"limit"`
	Total int              `json:"total"`
	Items []BubbleResponse `json:"items"`
}

func (h *BubbleHandler) Create(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req CreateBubbleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	symbol := strings.ToUpper(strings.TrimSpace(req.Symbol))
	if symbol == "" || !bubbleSymbolPattern.MatchString(symbol) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "symbol is invalid"})
	}

	timeframe := strings.ToLower(strings.TrimSpace(req.Timeframe))
	if _, ok := allowedTimeframes[timeframe]; !ok {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_TIMEFRAME", "message": "timeframe is invalid"})
	}

	if req.CandleTime.IsZero() {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "candle_time is required"})
	}

	if strings.TrimSpace(req.Price) == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "price is required"})
	}

	cleanTags, err := normalizeTags(req.Tags)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_TAGS", "message": err.Error()})
	}

	bubble := &entities.Bubble{
		ID:         uuid.New(),
		UserID:     userID,
		Symbol:     symbol,
		Timeframe:  timeframe,
		CandleTime: req.CandleTime.UTC(),
		Price:      strings.TrimSpace(req.Price),
		BubbleType: "manual",
		Memo:       req.Memo,
		Tags:       cleanTags,
		CreatedAt:  time.Now().UTC(),
	}

	if err := h.bubbleRepo.Create(c.Context(), bubble); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(mapBubbleResponse(bubble))
}

func (h *BubbleHandler) List(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	symbol := strings.ToUpper(strings.TrimSpace(c.Query("symbol")))
	if symbol != "" && !bubbleSymbolPattern.MatchString(symbol) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "symbol is invalid"})
	}

	page, limit, err := parsePageLimit(c.Query("page"), c.Query("limit"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	var fromPtr *time.Time
	fromStr := strings.TrimSpace(c.Query("from"))
	if fromStr != "" {
		parsed, err := time.Parse(time.RFC3339, fromStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "from is invalid"})
		}
		parsed = parsed.UTC()
		fromPtr = &parsed
	}

	var toPtr *time.Time
	toStr := strings.TrimSpace(c.Query("to"))
	if toStr != "" {
		parsed, err := time.Parse(time.RFC3339, toStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "to is invalid"})
		}
		parsed = parsed.UTC()
		toPtr = &parsed
	}

	queryTags, err := normalizeTags(splitTags(c.Query("tags")))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_TAGS", "message": err.Error()})
	}

	sortOrder := strings.ToLower(strings.TrimSpace(c.Query("sort")))
	if sortOrder != "asc" {
		sortOrder = "desc"
	}

	filter := repositories.BubbleFilter{
		Symbol: symbol,
		Tags:   queryTags,
		From:   fromPtr,
		To:     toPtr,
		Limit:  limit,
		Offset: (page - 1) * limit,
		Sort:   sortOrder,
	}

	bubbles, total, err := h.bubbleRepo.List(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]BubbleResponse, 0, len(bubbles))
	for _, bubble := range bubbles {
		items = append(items, mapBubbleResponse(bubble))
	}

	return c.Status(200).JSON(BubbleListResponse{
		Page:  page,
		Limit: limit,
		Total: total,
		Items: items,
	})
}

func (h *BubbleHandler) GetByID(c *fiber.Ctx) error {
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

	return c.Status(200).JSON(mapBubbleResponse(bubble))
}

func (h *BubbleHandler) Update(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	var req UpdateBubbleRequest
	if err := c.BodyParser(&req); err != nil {
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

	if req.Memo != nil {
		bubble.Memo = req.Memo
	}
	if req.Tags != nil {
		cleanTags, err := normalizeTags(req.Tags)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_TAGS", "message": err.Error()})
		}
		bubble.Tags = cleanTags
	}

	if err := h.bubbleRepo.Update(c.Context(), bubble); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"updated": true})
}

func (h *BubbleHandler) Delete(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	deleted, err := h.bubbleRepo.DeleteByIDAndUser(c.Context(), bubbleID, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if !deleted {
		return c.Status(404).JSON(fiber.Map{"code": "BUBBLE_NOT_FOUND", "message": "bubble not found"})
	}

	return c.Status(200).JSON(fiber.Map{"deleted": true})
}

func mapBubbleResponse(bubble *entities.Bubble) BubbleResponse {
	return BubbleResponse{
		ID:         bubble.ID,
		Symbol:     bubble.Symbol,
		Timeframe:  bubble.Timeframe,
		CandleTime: bubble.CandleTime,
		Price:      bubble.Price,
		BubbleType: bubble.BubbleType,
		Memo:       bubble.Memo,
		Tags:       bubble.Tags,
	}
}

func normalizeTags(tags []string) ([]string, error) {
	if len(tags) == 0 {
		return []string{}, nil
	}
	if len(tags) > 5 {
		return nil, errors.New("tags cannot exceed 5")
	}

	seen := map[string]struct{}{}
	cleaned := make([]string, 0, len(tags))
	for _, tag := range tags {
		trimmed := strings.ToLower(strings.TrimSpace(tag))
		if trimmed == "" {
			continue
		}
		if len(trimmed) > 20 {
			return nil, errors.New("tag length must be <= 20")
		}
		if !bubbleTagPattern.MatchString(trimmed) {
			return nil, errors.New("tag contains invalid characters")
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		cleaned = append(cleaned, trimmed)
	}

	return cleaned, nil
}

func splitTags(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	return parts
}

func parsePageLimit(pageStr string, limitStr string) (int, int, error) {
	page := 1
	limit := 50
	if pageStr != "" {
		parsed, err := parsePositiveInt(pageStr)
		if err != nil {
			return 0, 0, err
		}
		page = parsed
	}
	if limitStr != "" {
		parsed, err := parsePositiveInt(limitStr)
		if err != nil {
			return 0, 0, err
		}
		if parsed > 200 {
			parsed = 200
		}
		limit = parsed
	}
	return page, limit, nil
}

func parsePositiveInt(value string) (int, error) {
	parsed := 0
	for _, ch := range value {
		if ch < '0' || ch > '9' {
			return 0, errors.New("invalid number")
		}
		parsed = parsed*10 + int(ch-'0')
	}
	if parsed <= 0 {
		return 0, errors.New("invalid number")
	}
	return parsed, nil
}
