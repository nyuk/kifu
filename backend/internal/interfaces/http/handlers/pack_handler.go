package handlers

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/services"
)

type PackHandler struct {
	runRepo         repositories.RunRepository
	summaryPackRepo repositories.SummaryPackRepository
	summaryPackSvc  *services.SummaryPackService
}

type PackGenerateRequest struct {
	SourceRunID string `json:"source_run_id"`
	Range       string `json:"range"`
}

type PackGenerateResponse struct {
	PackID               uuid.UUID `json:"pack_id"`
	ReconciliationStatus string    `json:"reconciliation_status"`
}

func NewPackHandler(
	runRepo repositories.RunRepository,
	summaryPackRepo repositories.SummaryPackRepository,
	summaryPackService *services.SummaryPackService,
) *PackHandler {
	return &PackHandler{
		runRepo:         runRepo,
		summaryPackRepo: summaryPackRepo,
		summaryPackSvc:  summaryPackService,
	}
}

func (h *PackHandler) Generate(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req PackGenerateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid request body"})
	}

	sourceRunID := strings.TrimSpace(req.SourceRunID)
	if sourceRunID == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "source_run_id is required"})
	}

	runID, err := uuid.Parse(sourceRunID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "source_run_id is invalid"})
	}

	rangeValue := strings.TrimSpace(req.Range)
	if rangeValue == "" {
		rangeValue = "30d"
	}

	run, err := h.runRepo.GetByID(c.Context(), userID, runID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(404).JSON(fiber.Map{"code": "RUN_NOT_FOUND", "message": "sync/import run not found"})
		}
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if run == nil {
		return c.Status(404).JSON(fiber.Map{"code": "RUN_NOT_FOUND", "message": "sync/import run not found"})
	}

	pack, _, err := h.summaryPackSvc.GeneratePack(c.Context(), userID, run, rangeValue)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "PACK_GENERATE_FAILED", "message": err.Error()})
	}

	if err := h.summaryPackRepo.Create(c.Context(), pack); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "PACK_SAVE_FAILED", "message": err.Error()})
	}

	return c.Status(200).JSON(PackGenerateResponse{
		PackID:               pack.PackID,
		ReconciliationStatus: pack.ReconciliationStatus,
	})
}

func (h *PackHandler) GetLatest(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	rangeValue := strings.TrimSpace(c.Query("range"))
	if rangeValue == "" {
		rangeValue = "30d"
	}

	pack, err := h.summaryPackRepo.GetLatest(c.Context(), userID, rangeValue)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(404).JSON(fiber.Map{"code": "PACK_NOT_FOUND", "message": "latest pack not found"})
		}
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(pack)
}

func (h *PackHandler) GetByID(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	packID, err := uuid.Parse(c.Params("pack_id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "pack_id is invalid"})
	}

	pack, err := h.summaryPackRepo.GetByID(c.Context(), userID, packID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(404).JSON(fiber.Map{"code": "PACK_NOT_FOUND", "message": "pack not found"})
		}
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if pack == nil {
		return c.Status(404).JSON(fiber.Map{"code": "PACK_NOT_FOUND", "message": "pack not found"})
	}

	return c.Status(200).JSON(pack)
}
