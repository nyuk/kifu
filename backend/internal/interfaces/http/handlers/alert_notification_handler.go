package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AlertNotificationHandler struct {
	alertRepo    repositories.AlertRepository
	briefingRepo repositories.AlertBriefingRepository
	decisionRepo repositories.AlertDecisionRepository
	outcomeRepo  repositories.AlertOutcomeRepository
}

func NewAlertNotificationHandler(
	alertRepo repositories.AlertRepository,
	briefingRepo repositories.AlertBriefingRepository,
	decisionRepo repositories.AlertDecisionRepository,
	outcomeRepo repositories.AlertOutcomeRepository,
) *AlertNotificationHandler {
	return &AlertNotificationHandler{
		alertRepo:    alertRepo,
		briefingRepo: briefingRepo,
		decisionRepo: decisionRepo,
		outcomeRepo:  outcomeRepo,
	}
}

type AlertDetailResponse struct {
	Alert     *entities.Alert          `json:"alert"`
	Briefings []*entities.AlertBriefing `json:"briefings"`
	Decision  *entities.AlertDecision   `json:"decision,omitempty"`
	Outcomes  []*entities.AlertOutcome  `json:"outcomes,omitempty"`
}

type CreateDecisionRequest struct {
	Action     string  `json:"action"`
	Memo       *string `json:"memo,omitempty"`
	Confidence *string `json:"confidence,omitempty"`
}

func (h *AlertNotificationHandler) ListAlerts(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	var statusFilter *entities.AlertStatus
	if s := c.Query("status"); s != "" {
		status := entities.AlertStatus(s)
		statusFilter = &status
	}

	alerts, total, err := h.alertRepo.ListByUser(c.Context(), userID, statusFilter, limit, offset)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if alerts == nil {
		alerts = []*entities.Alert{}
	}

	return c.JSON(fiber.Map{"alerts": alerts, "total": total})
}

func (h *AlertNotificationHandler) GetAlert(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	alert, err := h.alertRepo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if alert == nil || alert.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "alert not found"})
	}

	briefings, err := h.briefingRepo.ListByAlert(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	decision, _ := h.decisionRepo.GetByAlert(c.Context(), id)
	outcomes, _ := h.outcomeRepo.ListByAlert(c.Context(), id)

	return c.JSON(AlertDetailResponse{
		Alert:     alert,
		Briefings: briefings,
		Decision:  decision,
		Outcomes:  outcomes,
	})
}

func (h *AlertNotificationHandler) CreateDecision(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	alertID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	alert, err := h.alertRepo.GetByID(c.Context(), alertID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if alert == nil || alert.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "alert not found"})
	}

	var req CreateDecisionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if !isValidAction(req.Action) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid action"})
	}

	var confidence *entities.Confidence
	if req.Confidence != nil {
		conf := entities.Confidence(*req.Confidence)
		confidence = &conf
	}

	now := time.Now().UTC()
	decision := &entities.AlertDecision{
		ID:         uuid.New(),
		AlertID:    alertID,
		UserID:     userID,
		Action:     entities.DecisionAction(req.Action),
		Memo:       req.Memo,
		Confidence: confidence,
		ExecutedAt: &now,
		CreatedAt:  now,
	}

	if err := h.decisionRepo.Create(c.Context(), decision); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if err := h.alertRepo.UpdateStatus(c.Context(), alertID, entities.AlertStatusDecided); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(201).JSON(decision)
}

func (h *AlertNotificationHandler) DismissAlert(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	alertID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	alert, err := h.alertRepo.GetByID(c.Context(), alertID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if alert == nil || alert.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "alert not found"})
	}

	if err := h.alertRepo.UpdateStatus(c.Context(), alertID, entities.AlertStatusExpired); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"dismissed": true})
}

func (h *AlertNotificationHandler) GetOutcome(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	alertID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	alert, err := h.alertRepo.GetByID(c.Context(), alertID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if alert == nil || alert.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "alert not found"})
	}

	outcomes, err := h.outcomeRepo.ListByAlert(c.Context(), alertID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if outcomes == nil {
		outcomes = []*entities.AlertOutcome{}
	}

	return c.JSON(fiber.Map{"outcomes": outcomes})
}

func isValidAction(action string) bool {
	switch entities.DecisionAction(action) {
	case entities.DecisionBuy, entities.DecisionSell, entities.DecisionHold,
		entities.DecisionClose, entities.DecisionReduce, entities.DecisionAdd, entities.DecisionIgnore:
		return true
	}
	return false
}
