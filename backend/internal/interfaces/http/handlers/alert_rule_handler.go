package handlers

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AlertRuleHandler struct {
	ruleRepo repositories.AlertRuleRepository
}

func NewAlertRuleHandler(ruleRepo repositories.AlertRuleRepository) *AlertRuleHandler {
	return &AlertRuleHandler{ruleRepo: ruleRepo}
}

type CreateAlertRuleRequest struct {
	Name            string          `json:"name"`
	Symbol          string          `json:"symbol"`
	RuleType        string          `json:"rule_type"`
	Config          json.RawMessage `json:"config"`
	CooldownMinutes *int            `json:"cooldown_minutes,omitempty"`
}

type UpdateAlertRuleRequest struct {
	Name            string          `json:"name"`
	Symbol          string          `json:"symbol"`
	RuleType        string          `json:"rule_type"`
	Config          json.RawMessage `json:"config"`
	CooldownMinutes *int            `json:"cooldown_minutes,omitempty"`
	Enabled         *bool           `json:"enabled,omitempty"`
}

func (h *AlertRuleHandler) Create(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req CreateAlertRuleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if req.Name == "" || req.Symbol == "" || req.RuleType == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "name, symbol, and rule_type are required"})
	}

	if !isValidRuleType(req.RuleType) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid rule_type"})
	}

	cooldown := 60
	if req.CooldownMinutes != nil {
		cooldown = *req.CooldownMinutes
	}

	rule := &entities.AlertRule{
		UserID:          userID,
		Name:            req.Name,
		Symbol:          req.Symbol,
		RuleType:        entities.RuleType(req.RuleType),
		Config:          req.Config,
		CooldownMinutes: cooldown,
		Enabled:         true,
	}

	if err := h.ruleRepo.Create(c.Context(), rule); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(201).JSON(rule)
}

func (h *AlertRuleHandler) List(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	rules, err := h.ruleRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if rules == nil {
		rules = []*entities.AlertRule{}
	}

	return c.JSON(fiber.Map{"rules": rules})
}

func (h *AlertRuleHandler) GetByID(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	rule, err := h.ruleRepo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if rule == nil || rule.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "rule not found"})
	}

	return c.JSON(rule)
}

func (h *AlertRuleHandler) Update(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	existing, err := h.ruleRepo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if existing == nil || existing.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "rule not found"})
	}

	var req UpdateAlertRuleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Symbol != "" {
		existing.Symbol = req.Symbol
	}
	if req.RuleType != "" && isValidRuleType(req.RuleType) {
		existing.RuleType = entities.RuleType(req.RuleType)
	}
	if req.Config != nil {
		existing.Config = req.Config
	}
	if req.CooldownMinutes != nil {
		existing.CooldownMinutes = *req.CooldownMinutes
	}
	if req.Enabled != nil {
		existing.Enabled = *req.Enabled
	}

	if err := h.ruleRepo.Update(c.Context(), existing); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.JSON(existing)
}

func (h *AlertRuleHandler) Delete(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	if err := h.ruleRepo.Delete(c.Context(), id, userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"deleted": true})
}

func (h *AlertRuleHandler) Toggle(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	rule, err := h.ruleRepo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if rule == nil || rule.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "rule not found"})
	}

	newEnabled := !rule.Enabled
	if err := h.ruleRepo.SetEnabled(c.Context(), id, userID, newEnabled); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"id": id, "enabled": newEnabled})
}

func isValidRuleType(rt string) bool {
	switch entities.RuleType(rt) {
	case entities.RuleTypePriceChange, entities.RuleTypeMACross,
		entities.RuleTypePriceLevel, entities.RuleTypeVolatilitySpike:
		return true
	}
	return false
}
