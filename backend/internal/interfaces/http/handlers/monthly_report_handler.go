package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/services"
)

type MonthlyReportHandler struct {
	reportService *services.MonthlyReportService
	reportRepo    repositories.MonthlyReportRepository
}

func NewMonthlyReportHandler(
	reportService *services.MonthlyReportService,
	reportRepo repositories.MonthlyReportRepository,
) *MonthlyReportHandler {
	return &MonthlyReportHandler{
		reportService: reportService,
		reportRepo:    reportRepo,
	}
}

// GetLatest returns the most recent monthly report for the authenticated user.
func (h *MonthlyReportHandler) GetLatest(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	report, err := h.reportRepo.GetLatest(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if report == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no monthly report found"})
	}

	return c.JSON(report)
}

// GetByMonth returns the monthly report for a specific year/month.
func (h *MonthlyReportHandler) GetByMonth(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	year, err := strconv.Atoi(c.Params("year"))
	if err != nil || year < 2020 || year > 2100 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid year"})
	}
	month, err := strconv.Atoi(c.Params("month"))
	if err != nil || month < 1 || month > 12 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid month"})
	}

	report, err := h.reportRepo.GetByMonth(c.Context(), userID, year, month)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if report == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "report not found"})
	}

	return c.JSON(report)
}

// ListReports returns recent monthly reports for the authenticated user.
func (h *MonthlyReportHandler) ListReports(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	limit, _ := strconv.Atoi(c.Query("limit", "12"))
	if limit <= 0 || limit > 36 {
		limit = 12
	}

	reports, err := h.reportRepo.List(c.Context(), userID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"reports": reports,
		"count":   len(reports),
	})
}

// GenerateNow manually triggers report generation for a specific month.
func (h *MonthlyReportHandler) GenerateNow(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	type request struct {
		Year  int `json:"year"`
		Month int `json:"month"`
	}
	var req request
	if err := c.BodyParser(&req); err != nil {
		// Default to previous month
		now := time.Now().UTC()
		req.Year = now.Year()
		req.Month = int(now.Month()) - 1
		if req.Month == 0 {
			req.Month = 12
			req.Year--
		}
	}

	if req.Year < 2020 || req.Year > 2100 || req.Month < 1 || req.Month > 12 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid year or month"})
	}

	report, err := h.reportService.Generate(c.Context(), userID, req.Year, req.Month)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(report)
}
