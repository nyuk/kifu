package handlers

import (
	"encoding/json"
	"errors"
	"strings"
	"time"

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

type PackGenerateLatestResponse struct {
	PackID               uuid.UUID `json:"pack_id"`
	ReconciliationStatus string    `json:"reconciliation_status"`
	SourceRunID          uuid.UUID `json:"source_run_id"`
	AnchorTs             string    `json:"anchor_ts"`
}

type PackGenerateLatestRequest struct {
	Range string `json:"range"`
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

func (h *PackHandler) GenerateLatest(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req PackGenerateLatestRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid request body"})
	}

	rangeValue := strings.TrimSpace(req.Range)
	if rangeValue == "" {
		rangeValue = "30d"
	}

	now := time.Now().UTC()
	runMeta := map[string]interface{}{
		"source_query": "latest_completed_run",
		"provider":     "system",
		"range":        rangeValue,
		"policy_key":   "summary_pack_generate_latest",
	}
	runMetaJSON, _ := json.Marshal(runMeta)
	trackRun, err := h.runRepo.Create(c.Context(), userID, "summary_ondemand", "running", now, runMetaJSON)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	run, err := h.runRepo.GetLatestCompletedRun(
		c.Context(),
		userID,
		"exchange_sync",
		"trade_csv_import",
		"portfolio_csv_import",
	)
	if err != nil {
		finishedAt := time.Now().UTC()
		runMeta["error"] = err.Error()
		runMeta["result"] = "failed_lookup_latest_completed_run"
		failedMetaJSON, _ := json.Marshal(runMeta)
		_ = h.runRepo.UpdateStatus(c.Context(), trackRun.RunID, "failed", &finishedAt, failedMetaJSON)
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(404).JSON(fiber.Map{"code": "NO_COMPLETED_RUN", "message": "completed sync/import run not found"})
		}
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if run == nil {
		finishedAt := time.Now().UTC()
		runMeta["result"] = "failed_no_completed_run"
		failedMetaJSON, _ := json.Marshal(runMeta)
		_ = h.runRepo.UpdateStatus(c.Context(), trackRun.RunID, "failed", &finishedAt, failedMetaJSON)
		return c.Status(404).JSON(fiber.Map{"code": "NO_COMPLETED_RUN", "message": "completed sync/import run not found"})
	}
	runMeta["source_run_id"] = run.RunID.String()
	runMeta["source_run_type"] = run.RunType

	pack, _, err := h.summaryPackSvc.GeneratePack(c.Context(), userID, run, rangeValue)
	if err != nil {
		finishedAt := time.Now().UTC()
		runMeta["error"] = err.Error()
		runMeta["result"] = "failed_generate_pack"
		failedMetaJSON, _ := json.Marshal(runMeta)
		_ = h.runRepo.UpdateStatus(c.Context(), trackRun.RunID, "failed", &finishedAt, failedMetaJSON)
		return c.Status(400).JSON(fiber.Map{"code": "PACK_GENERATE_FAILED", "message": err.Error()})
	}

	if err := h.summaryPackRepo.Create(c.Context(), pack); err != nil {
		finishedAt := time.Now().UTC()
		runMeta["error"] = err.Error()
		runMeta["result"] = "failed_save_pack"
		failedMetaJSON, _ := json.Marshal(runMeta)
		_ = h.runRepo.UpdateStatus(c.Context(), trackRun.RunID, "failed", &finishedAt, failedMetaJSON)
		return c.Status(500).JSON(fiber.Map{"code": "PACK_SAVE_FAILED", "message": err.Error()})
	}
	finishedAt := time.Now().UTC()
	runMeta["result"] = "completed"
	runMeta["pack_id"] = pack.PackID.String()
	completedMetaJSON, _ := json.Marshal(runMeta)
	_ = h.runRepo.UpdateStatus(c.Context(), trackRun.RunID, "completed", &finishedAt, completedMetaJSON)

	anchorTs := run.StartedAt.Format(time.RFC3339)
	if run.FinishedAt != nil {
		anchorTs = run.FinishedAt.Format(time.RFC3339)
	}

	return c.Status(200).JSON(PackGenerateLatestResponse{
		PackID:               pack.PackID,
		ReconciliationStatus: pack.ReconciliationStatus,
		SourceRunID:          run.RunID,
		AnchorTs:             anchorTs,
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
