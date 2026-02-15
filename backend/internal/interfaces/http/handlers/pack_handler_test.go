package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/services"
)

type fakeRunRepo struct {
	runMap map[uuid.UUID]*entities.Run
	err    error
	calls  []uuid.UUID
}

func (f *fakeRunRepo) Create(_ context.Context, _ uuid.UUID, _ string, _ string, _ time.Time, _ json.RawMessage) (*entities.Run, error) {
	return nil, nil
}

func (f *fakeRunRepo) GetByID(_ context.Context, _ uuid.UUID, _ uuid.UUID) (*entities.Run, error) {
	return nil, nil
}

func (f *fakeRunRepo) UpdateStatus(_ context.Context, _ uuid.UUID, _ string, _ *time.Time, _ json.RawMessage) error {
	return nil
}

func (f *fakeRunRepo) GetLatestCompletedRun(ctx context.Context, userID uuid.UUID) (*entities.Run, error) {
	f.calls = append(f.calls, userID)
	if f.err != nil {
		return nil, f.err
	}
	if run, ok := f.runMap[userID]; ok {
		return run, nil
	}
	return nil, pgx.ErrNoRows
}

type fakeSummaryPackRepo struct {
	createErr error
}

func (f *fakeSummaryPackRepo) Create(_ context.Context, _ *entities.SummaryPack) error {
	return f.createErr
}

func (f *fakeSummaryPackRepo) GetByID(_ context.Context, _ uuid.UUID, _ uuid.UUID) (*entities.SummaryPack, error) {
	return nil, nil
}

func (f *fakeSummaryPackRepo) GetLatest(_ context.Context, _ uuid.UUID, _ string) (*entities.SummaryPack, error) {
	return nil, nil
}

type fakeTradeRepo struct{}

func (f *fakeTradeRepo) ListByTimeRange(_ context.Context, _ uuid.UUID, _ time.Time, _ time.Time) ([]*entities.Trade, error) {
	return nil, nil
}

func newTestPackHandler(runRepo repositories.RunRepository, summaryPackRepo repositories.SummaryPackRepository) *PackHandler {
	summaryPackSvc := services.NewSummaryPackService(&fakeTradeRepo{})
	return NewPackHandler(runRepo, summaryPackRepo, summaryPackSvc)
}

func newAuthApp(userID uuid.UUID, handler fiber.Handler) *fiber.App {
	app := fiber.New()
	app.Post("/api/v1/packs/generate-latest", func(c *fiber.Ctx) error {
		c.Locals("userID", userID)
		c.Request().Header.Set("Authorization", "Bearer test-token")
		return handler(c)
	})
	return app
}

func TestPackGenerateLatestSuccess(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	runID := uuid.New()
	run := &entities.Run{
		RunID:     runID,
		UserID:    userID,
		RunType:   "exchange_sync",
		Status:    "completed",
		StartedAt: time.Date(2026, 2, 13, 10, 0, 0, 0, time.UTC),
	}
	run.FinishedAt = ptrTime(time.Date(2026, 2, 13, 10, 30, 0, 0, time.UTC))

	runRepo := &fakeRunRepo{
		runMap: map[uuid.UUID]*entities.Run{userID: run},
	}
	packRepo := &fakeSummaryPackRepo{}
	handler := newTestPackHandler(runRepo, packRepo)
	app := newAuthApp(userID, handler.GenerateLatest)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/packs/generate-latest", bytes.NewBufferString(`{"range":"30d"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusOK)
	}

	var got struct {
		PackID               string `json:"pack_id"`
		SourceRunID          string `json:"source_run_id"`
		ReconciliationStatus string `json:"reconciliation_status"`
		AnchorTs             string `json:"anchor_ts"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("decode response failed: %v", err)
	}
	if got.SourceRunID != runID.String() {
		t.Fatalf("source_run_id=%s want=%s", got.SourceRunID, runID)
	}
	if got.ReconciliationStatus == "" {
		t.Fatalf("reconciliation_status empty")
	}
	if got.AnchorTs == "" {
		t.Fatalf("anchor_ts empty")
	}
}

func TestPackGenerateLatestNoCompletedRun(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	runRepo := &fakeRunRepo{err: pgx.ErrNoRows}
	packRepo := &fakeSummaryPackRepo{}
	handler := newTestPackHandler(runRepo, packRepo)
	app := newAuthApp(userID, handler.GenerateLatest)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/packs/generate-latest", bytes.NewBufferString(`{"range":"30d"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusNotFound)
	}

	var got struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("decode response failed: %v", err)
	}
	if got.Code != "NO_COMPLETED_RUN" {
		t.Fatalf("code=%s want=%s", got.Code, "NO_COMPLETED_RUN")
	}
}

func TestPackGenerateLatestUsesCallerScopeOnly(t *testing.T) {
	t.Parallel()

	ownerID := uuid.New()
	otherID := uuid.New()
	run := &entities.Run{
		RunID:     uuid.New(),
		UserID:    ownerID,
		RunType:   "exchange_sync",
		Status:    "completed",
		StartedAt: time.Now(),
	}

	runRepo := &fakeRunRepo{
		runMap: map[uuid.UUID]*entities.Run{
			ownerID: run,
		},
	}
	packRepo := &fakeSummaryPackRepo{}
	handler := newTestPackHandler(runRepo, packRepo)
	app := newAuthApp(otherID, handler.GenerateLatest)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/packs/generate-latest", bytes.NewBufferString(`{"range":"30d"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status=%d want=%d", resp.StatusCode, http.StatusNotFound)
	}
}

func ptrTime(v time.Time) *time.Time { return &v }
