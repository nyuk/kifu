package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/services"
)

type GrowthHandler struct {
	service *services.GrowthOSService
}

type TrackGrowthEventRequest struct {
	GuestSessionID *string        `json:"guest_session_id"`
	EventName      string         `json:"event_name"`
	SourcePath     *string        `json:"source_path"`
	Referrer       *string        `json:"referrer"`
	Metadata       map[string]any `json:"metadata"`
	OccurredAt     *time.Time     `json:"occurred_at"`
}

type CreateGrowthFeedbackRequest struct {
	ProductKey string         `json:"product_key"`
	SourceType string         `json:"source_type"`
	Bucket     string         `json:"bucket"`
	Title      string         `json:"title"`
	Body       string         `json:"body"`
	SourceURL  *string        `json:"source_url"`
	Metadata   map[string]any `json:"metadata"`
}

func NewGrowthHandler(service *services.GrowthOSService) *GrowthHandler {
	return &GrowthHandler{service: service}
}

func (h *GrowthHandler) TrackEvent(c *fiber.Ctx) error {
	var req TrackGrowthEventRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    "INVALID_REQUEST",
			"message": "invalid growth event payload",
		})
	}

	if strings.TrimSpace(req.EventName) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    "INVALID_REQUEST",
			"message": "event_name is required",
		})
	}

	if err := h.service.TrackEvent(c.Context(), services.GrowthEventInput{
		GuestSessionID: req.GuestSessionID,
		EventName:      req.EventName,
		SourcePath:     req.SourcePath,
		Referrer:       req.Referrer,
		Metadata:       req.Metadata,
		OccurredAt:     req.OccurredAt,
	}); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    "INVALID_REQUEST",
			"message": err.Error(),
		})
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"ok": true})
}

func (h *GrowthHandler) CreateFeedback(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"code": "UNAUTHORIZED"})
	}

	var req CreateGrowthFeedbackRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    "INVALID_REQUEST",
			"message": "invalid feedback payload",
		})
	}

	item, err := h.service.CreateFeedbackItem(c.Context(), services.CreateGrowthFeedbackInput{
		ProductKey: req.ProductKey,
		SourceType: req.SourceType,
		Bucket:     req.Bucket,
		Title:      req.Title,
		Body:       req.Body,
		SourceURL:  req.SourceURL,
		Metadata:   req.Metadata,
		CreatedBy:  &userID,
	})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    "INVALID_REQUEST",
			"message": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(item)
}

func (h *GrowthHandler) GetLatestDailyReport(c *fiber.Ctx) error {
	forceRefresh := strings.EqualFold(strings.TrimSpace(c.Query("refresh")), "1") ||
		strings.EqualFold(strings.TrimSpace(c.Query("refresh")), "true")

	report, err := h.service.GetOperationalDailyReport(c.Context(), forceRefresh)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    "INTERNAL_ERROR",
			"message": err.Error(),
		})
	}
	return c.JSON(report)
}
