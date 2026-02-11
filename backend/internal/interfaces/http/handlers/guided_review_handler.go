package handlers

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type GuidedReviewHandler struct {
	repo repositories.GuidedReviewRepository
}

func NewGuidedReviewHandler(repo repositories.GuidedReviewRepository) *GuidedReviewHandler {
	return &GuidedReviewHandler{repo: repo}
}

func (h *GuidedReviewHandler) GetToday(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	timezone := strings.TrimSpace(c.Query("timezone"))
	if timezone == "" {
		timezone = "UTC"
	}
	location, err := time.LoadLocation(timezone)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "timezone is invalid"})
	}

	var date string
	dateRaw := strings.TrimSpace(c.Query("date"))
	if dateRaw == "" {
		date = time.Now().In(location).Format("2006-01-02")
	} else {
		_, parseErr := time.ParseInLocation("2006-01-02", dateRaw, location)
		if parseErr != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "date must be YYYY-MM-DD"})
		}
		date = dateRaw
	}

	review, items, err := h.repo.GetOrCreateToday(c.Context(), userID, date)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{
		"review": review,
		"items":  items,
	})
}

type SubmitItemRequest struct {
	Intent       string   `json:"intent"`
	Emotions     []string `json:"emotions"`
	PatternMatch string   `json:"pattern_match"`
	Memo         string   `json:"memo"`
}

func (h *GuidedReviewHandler) SubmitItem(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	itemID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid item id"})
	}

	var req SubmitItemRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid json body"})
	}

	if req.Intent == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "intent is required"})
	}

	var emotionsJSON json.RawMessage
	if len(req.Emotions) > 0 {
		b, _ := json.Marshal(req.Emotions)
		emotionsJSON = b
	}

	input := repositories.SubmitItemInput{
		Intent:       req.Intent,
		Emotions:     emotionsJSON,
		PatternMatch: req.PatternMatch,
		Memo:         req.Memo,
	}

	if err := h.repo.SubmitItem(c.Context(), userID, itemID, input); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "item not found"})
		}
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"ok": true})
}

func (h *GuidedReviewHandler) CompleteReview(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	reviewID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid review id"})
	}

	streak, err := h.repo.CompleteReview(c.Context(), userID, reviewID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "review not found"})
		}
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{
		"ok":     true,
		"streak": streak,
	})
}

func (h *GuidedReviewHandler) GetStreak(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	streak, err := h.repo.GetStreak(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(streak)
}
