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
	Range    string `json:"range"`
	DryRun   bool   `json:"dry_run"`
	Provider string `json:"provider"`
	Force    bool   `json:"force"`
}

var validRanges = map[string]struct{}{"7d": {}, "30d": {}}

func normalizeRange(r string) string {
	rangeValue := strings.TrimSpace(r)
	if rangeValue == "" {
		return "30d"
	}
	return rangeValue
}

func validateRange(r string) error {
	if _, ok := validRanges[r]; !ok {
		return errors.New("range must be 7d or 30d")
	}
	return nil
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

	rangeValue := normalizeRange(req.Range)
	if err := validateRange(rangeValue); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "VALIDATION_ERROR", "message": err.Error()})
	}

	provider := strings.TrimSpace(req.Provider)
	if provider == "" {
		provider = "system"
	}

	runMeta := map[string]interface{}{
		"source_query": "latest_completed_run",
		"provider":     provider,
		"range":        rangeValue,
		"force":        req.Force,
		"policy_key":   "summary_pack_generate_latest",
	}

	var trackRunID uuid.UUID
	finishTrackedRun := func(status string, result string, runErr error) {
		if trackRunID == uuid.Nil {
			return
		}
		finishedAt := time.Now().UTC()
		runMeta["result"] = result
		if runErr != nil {
			runMeta["error"] = runErr.Error()
		}
		metaJSON, _ := json.Marshal(runMeta)
		_ = h.runRepo.UpdateStatus(c.Context(), trackRunID, status, &finishedAt, metaJSON)
	}

	if !req.DryRun {
		runMetaJSON, _ := json.Marshal(runMeta)
		trackRun, err := h.runRepo.Create(c.Context(), userID, "summary_ondemand", "running", time.Now().UTC(), runMetaJSON)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		if trackRun == nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "run tracking failed"})
		}
		trackRunID = trackRun.RunID
	}

	run, err := h.runRepo.GetLatestCompletedRun(
		c.Context(),
		userID,
		"exchange_sync",
		"trade_csv_import",
		"portfolio_csv_import",
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			finishTrackedRun("failed", "failed_no_completed_run", errors.New("completed sync/import run not found"))
			return c.Status(404).JSON(fiber.Map{"code": "NO_COMPLETED_RUN", "message": "completed sync/import run not found"})
		}
		finishTrackedRun("failed", "failed_lookup_source_run", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if run == nil {
		finishTrackedRun("failed", "failed_no_completed_run", errors.New("completed sync/import run not found"))
		return c.Status(404).JSON(fiber.Map{"code": "NO_COMPLETED_RUN", "message": "completed sync/import run not found"})
	}

	if req.DryRun {
		return c.Status(200).JSON(fiber.Map{
			"source_run_id": run.RunID,
			"range":         rangeValue,
			"dry_run":       true,
		})
	}

	runMeta["source_run_id"] = run.RunID.String()
	runMeta["source_run_type"] = run.RunType

	pack, _, err := h.summaryPackSvc.GeneratePack(c.Context(), userID, run, rangeValue)
	if err != nil {
		finishTrackedRun("failed", "failed_generate_pack", err)
		return c.Status(400).JSON(fiber.Map{"code": "PACK_GENERATE_FAILED", "message": err.Error()})
	}

	if err := h.summaryPackRepo.Create(c.Context(), pack); err != nil {
		finishTrackedRun("failed", "failed_save_pack", err)
		return c.Status(500).JSON(fiber.Map{"code": "PACK_SAVE_FAILED", "message": err.Error()})
	}
	runMeta["pack_id"] = pack.PackID.String()
	finishTrackedRun("completed", "completed", nil)

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
