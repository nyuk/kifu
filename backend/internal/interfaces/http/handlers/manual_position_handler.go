package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type ManualPositionHandler struct {
	repo repositories.ManualPositionRepository
}

func NewManualPositionHandler(repo repositories.ManualPositionRepository) *ManualPositionHandler {
	return &ManualPositionHandler{repo: repo}
}

type ManualPositionRequest struct {
	Symbol       string  `json:"symbol"`
	AssetClass   string  `json:"asset_class"`
	Venue        *string `json:"venue,omitempty"`
	PositionSide string  `json:"position_side"`
	Size         *string `json:"size,omitempty"`
	EntryPrice   *string `json:"entry_price,omitempty"`
	StopLoss     *string `json:"stop_loss,omitempty"`
	TakeProfit   *string `json:"take_profit,omitempty"`
	Leverage     *string `json:"leverage,omitempty"`
	Strategy     *string `json:"strategy,omitempty"`
	Memo         *string `json:"memo,omitempty"`
	Status       string  `json:"status"`
	OpenedAt     *string `json:"opened_at,omitempty"`
	ClosedAt     *string `json:"closed_at,omitempty"`
}

type ManualPositionResponse struct {
	ID           string  `json:"id"`
	Symbol       string  `json:"symbol"`
	AssetClass   string  `json:"asset_class"`
	Venue        *string `json:"venue,omitempty"`
	PositionSide string  `json:"position_side"`
	Size         *string `json:"size,omitempty"`
	EntryPrice   *string `json:"entry_price,omitempty"`
	StopLoss     *string `json:"stop_loss,omitempty"`
	TakeProfit   *string `json:"take_profit,omitempty"`
	Leverage     *string `json:"leverage,omitempty"`
	Strategy     *string `json:"strategy,omitempty"`
	Memo         *string `json:"memo,omitempty"`
	Status       string  `json:"status"`
	OpenedAt     *string `json:"opened_at,omitempty"`
	ClosedAt     *string `json:"closed_at,omitempty"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

type ManualPositionsListResponse struct {
	Positions []ManualPositionResponse `json:"positions"`
}

func (h *ManualPositionHandler) List(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	status := strings.TrimSpace(strings.ToLower(c.Query("status")))
	filter := repositories.ManualPositionFilter{Status: status}
	positions, err := h.repo.List(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]ManualPositionResponse, 0, len(positions))
	for _, position := range positions {
		items = append(items, manualPositionToResponse(position))
	}

	return c.Status(200).JSON(ManualPositionsListResponse{Positions: items})
}

func (h *ManualPositionHandler) Create(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req ManualPositionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if strings.TrimSpace(req.Symbol) == "" || strings.TrimSpace(req.AssetClass) == "" || strings.TrimSpace(req.PositionSide) == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "symbol, asset_class, position_side are required"})
	}

	status := strings.TrimSpace(strings.ToLower(req.Status))
	if status == "" {
		status = "open"
	}

	openedAt, err := parseOptionalTime(req.OpenedAt)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "opened_at is invalid"})
	}
	closedAt, err := parseOptionalTime(req.ClosedAt)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "closed_at is invalid"})
	}
	if status == "closed" && closedAt == nil {
		now := time.Now().UTC()
		closedAt = &now
	}

	position := &entities.ManualPosition{
		UserID:       userID,
		Symbol:       strings.ToUpper(strings.TrimSpace(req.Symbol)),
		AssetClass:   strings.ToLower(strings.TrimSpace(req.AssetClass)),
		Venue:        normalizeOptionalString(req.Venue),
		PositionSide: strings.ToLower(strings.TrimSpace(req.PositionSide)),
		Size:         normalizeOptionalString(req.Size),
		EntryPrice:   normalizeOptionalString(req.EntryPrice),
		StopLoss:     normalizeOptionalString(req.StopLoss),
		TakeProfit:   normalizeOptionalString(req.TakeProfit),
		Leverage:     normalizeOptionalString(req.Leverage),
		Strategy:     normalizeOptionalString(req.Strategy),
		Memo:         normalizeOptionalString(req.Memo),
		Status:       status,
		OpenedAt:     openedAt,
		ClosedAt:     closedAt,
	}

	if err := h.repo.Create(c.Context(), position); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(201).JSON(manualPositionToResponse(position))
}

func (h *ManualPositionHandler) Update(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	var req ManualPositionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	position, err := h.repo.GetByID(c.Context(), id, userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "position not found"})
	}

	if strings.TrimSpace(req.Symbol) != "" {
		position.Symbol = strings.ToUpper(strings.TrimSpace(req.Symbol))
	}
	if strings.TrimSpace(req.AssetClass) != "" {
		position.AssetClass = strings.ToLower(strings.TrimSpace(req.AssetClass))
	}
	if strings.TrimSpace(req.PositionSide) != "" {
		position.PositionSide = strings.ToLower(strings.TrimSpace(req.PositionSide))
	}
	if req.Venue != nil {
		position.Venue = normalizeOptionalString(req.Venue)
	}
	if req.Size != nil {
		position.Size = normalizeOptionalString(req.Size)
	}
	if req.EntryPrice != nil {
		position.EntryPrice = normalizeOptionalString(req.EntryPrice)
	}
	if req.StopLoss != nil {
		position.StopLoss = normalizeOptionalString(req.StopLoss)
	}
	if req.TakeProfit != nil {
		position.TakeProfit = normalizeOptionalString(req.TakeProfit)
	}
	if req.Leverage != nil {
		position.Leverage = normalizeOptionalString(req.Leverage)
	}
	if req.Strategy != nil {
		position.Strategy = normalizeOptionalString(req.Strategy)
	}
	if req.Memo != nil {
		position.Memo = normalizeOptionalString(req.Memo)
	}
	if strings.TrimSpace(req.Status) != "" {
		position.Status = strings.ToLower(strings.TrimSpace(req.Status))
	}

	openedAt, err := parseOptionalTime(req.OpenedAt)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "opened_at is invalid"})
	}
	closedAt, err := parseOptionalTime(req.ClosedAt)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "closed_at is invalid"})
	}
	if req.OpenedAt != nil {
		position.OpenedAt = openedAt
	}
	if req.ClosedAt != nil {
		position.ClosedAt = closedAt
	}
	if position.Status == "closed" && position.ClosedAt == nil {
		now := time.Now().UTC()
		position.ClosedAt = &now
	}

	if err := h.repo.Update(c.Context(), position); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(manualPositionToResponse(position))
}

func (h *ManualPositionHandler) Delete(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	if err := h.repo.Delete(c.Context(), id, userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"deleted": true})
}

func manualPositionToResponse(position *entities.ManualPosition) ManualPositionResponse {
	return ManualPositionResponse{
		ID:           position.ID.String(),
		Symbol:       position.Symbol,
		AssetClass:   position.AssetClass,
		Venue:        position.Venue,
		PositionSide: position.PositionSide,
		Size:         position.Size,
		EntryPrice:   position.EntryPrice,
		StopLoss:     position.StopLoss,
		TakeProfit:   position.TakeProfit,
		Leverage:     position.Leverage,
		Strategy:     position.Strategy,
		Memo:         position.Memo,
		Status:       position.Status,
		OpenedAt:     formatOptionalTime(position.OpenedAt),
		ClosedAt:     formatOptionalTime(position.ClosedAt),
		CreatedAt:    position.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    position.UpdatedAt.Format(time.RFC3339),
	}
}

func parseOptionalTime(value *string) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func formatOptionalTime(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format(time.RFC3339)
	return &formatted
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
