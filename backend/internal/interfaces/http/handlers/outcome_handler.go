package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type OutcomeHandler struct {
	bubbleRepo  repositories.BubbleRepository
	outcomeRepo repositories.OutcomeRepository
}

func NewOutcomeHandler(bubbleRepo repositories.BubbleRepository, outcomeRepo repositories.OutcomeRepository) *OutcomeHandler {
	return &OutcomeHandler{
		bubbleRepo:  bubbleRepo,
		outcomeRepo: outcomeRepo,
	}
}

type OutcomeResponse struct {
	Period         string  `json:"period"`
	ReferencePrice string  `json:"reference_price"`
	OutcomePrice   *string `json:"outcome_price"`
	PnLPercent     *string `json:"pnl_percent"`
}

func (h *OutcomeHandler) ListByBubble(c *fiber.Ctx) error {
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

	outcomes, err := h.outcomeRepo.ListByBubble(c.Context(), bubbleID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	outcomeMap := map[string]*entities.Outcome{}
	for _, outcome := range outcomes {
		outcomeMap[outcome.Period] = outcome
	}

	periods := []string{"1h", "4h", "1d"}
	items := make([]OutcomeResponse, 0, len(periods))
	for _, period := range periods {
		if outcome, ok := outcomeMap[period]; ok {
			outcomePrice := outcome.OutcomePrice
			pnl := outcome.PnLPercent
			items = append(items, OutcomeResponse{
				Period:         period,
				ReferencePrice: bubble.Price,
				OutcomePrice:   &outcomePrice,
				PnLPercent:     &pnl,
			})
			continue
		}

		items = append(items, OutcomeResponse{
			Period:         period,
			ReferencePrice: bubble.Price,
			OutcomePrice:   nil,
			PnLPercent:     nil,
		})
	}

	return c.Status(200).JSON(fiber.Map{"outcomes": items})
}
