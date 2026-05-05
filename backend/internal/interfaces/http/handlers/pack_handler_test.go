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
	runMap  map[uuid.UUID]*entities.Run
	err     error
	calls   []uuid.UUID
	creates []fakeRunCreate
	updates []fakeRunUpdate
}

type fakeRunCreate struct {
	userID  uuid.UUID
	runType string
	status  string
	meta    map[string]interface{}
}

type fakeRunUpdate struct {
	runID      uuid.UUID
	status     string
	finishedAt *time.Time
	meta       map[string]interface{}
}

func (f *fakeRunRepo) Create(_ context.Context, userID uuid.UUID, runType string, status string, _ time.Time, meta json.RawMessage) (*entities.Run, error) {
	run := &entities.Run{RunID: uuid.New(), UserID: userID, RunType: runType, Status: status}
	f.creates = append(f.creates, fakeRunCreate{
		userID:  userID,
		runType: runType,
		status:  status,
		meta:    decodeMetaForTest(meta),
	})
	return run, nil
}

func (f *fakeRunRepo) GetByID(_ context.Context, _ uuid.UUID, _ uuid.UUID) (*entities.Run, error) {
	return nil, nil
}

func (f *fakeRunRepo) UpdateStatus(_ context.Context, runID uuid.UUID, status string, finishedAt *time.Time, meta json.RawMessage) error {
	f.updates = append(f.updates, fakeRunUpdate{
		runID:      runID,
		status:     status,
		finishedAt: finishedAt,
		meta:       decodeMetaForTest(meta),
	})
	return nil
}

func (f *fakeRunRepo) GetLatestCompletedRun(ctx context.Context, userID uuid.UUID, runTypes ...string) (*entities.Run, error) {
	f.calls = append(f.calls, userID)
	if f.err != nil {
		return nil, f.err
	}
	if run, ok := f.runMap[userID]; ok {
		return run, nil
	}
	return nil, pgx.ErrNoRows
}

func decodeMetaForTest(raw json.RawMessage) map[string]interface{} {
	meta := map[string]interface{}{}
	if len(raw) == 0 {
		return meta
	}
	_ = json.Unmarshal(raw, &meta)
	return meta
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
	if len(runRepo.creates) != 1 {
		t.Fatalf("run creates=%d want=1", len(runRepo.creates))
	}
	if runRepo.creates[0].runType != "summary_ondemand" || runRepo.creates[0].status != "running" {
		t.Fatalf("created run=%s/%s want summary_ondemand/running", runRepo.creates[0].runType, runRepo.creates[0].status)
	}
	if len(runRepo.updates) != 1 {
		t.Fatalf("run updates=%d want=1", len(runRepo.updates))
	}
	if runRepo.updates[0].status != "completed" {
		t.Fatalf("updated status=%s want=completed", runRepo.updates[0].status)
	}
	if runRepo.updates[0].meta["source_run_id"] != runID.String() {
		t.Fatalf("source_run_id meta=%v want=%s", runRepo.updates[0].meta["source_run_id"], runID)
	}
	if runRepo.updates[0].meta["range"] != "30d" {
		t.Fatalf("range meta=%v want=30d", runRepo.updates[0].meta["range"])
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
	if len(runRepo.creates) != 1 {
		t.Fatalf("run creates=%d want=1", len(runRepo.creates))
	}
	if runRepo.creates[0].runType != "summary_ondemand" || runRepo.creates[0].status != "running" {
		t.Fatalf("created run=%s/%s want summary_ondemand/running", runRepo.creates[0].runType, runRepo.creates[0].status)
	}
	if runRepo.creates[0].meta["range"] != "30d" {
		t.Fatalf("created range meta=%v want=30d", runRepo.creates[0].meta["range"])
	}
	if len(runRepo.updates) != 1 {
		t.Fatalf("run updates=%d want=1", len(runRepo.updates))
	}
	if runRepo.updates[0].status != "failed" {
		t.Fatalf("updated status=%s want=failed", runRepo.updates[0].status)
	}
	if runRepo.updates[0].finishedAt == nil {
		t.Fatalf("finishedAt nil")
	}
	if runRepo.updates[0].meta["result"] != "failed_no_completed_run" {
		t.Fatalf("result meta=%v want=failed_no_completed_run", runRepo.updates[0].meta["result"])
	}
	if runRepo.updates[0].meta["error"] == "" {
		t.Fatalf("error meta empty")
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

func TestValidateRange(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{name: "valid 7d", input: "7d", wantErr: false},
		{name: "valid 30d", input: "30d", wantErr: false},
		{name: "invalid bad", input: "bad", wantErr: true},
		{name: "invalid 1h", input: "1h", wantErr: true},
		{name: "empty defaults to 30d", input: "", wantErr: false},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			normalized := normalizeRange(tc.input)
			err := validateRange(normalized)
			if (err != nil) != tc.wantErr {
				t.Fatalf("validateRange(%q) error=%v wantErr=%v", tc.input, err, tc.wantErr)
			}
		})
	}
}

func TestPackGenerateLatestRangeValidation(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	for _, tc := range []struct {
		name       string
		body       string
		wantStatus int
		wantCode   string
	}{
		{name: "valid 7d", body: `{"range":"7d"}`, wantStatus: http.StatusNotFound, wantCode: "NO_COMPLETED_RUN"},
		{name: "valid 30d", body: `{"range":"30d"}`, wantStatus: http.StatusNotFound, wantCode: "NO_COMPLETED_RUN"},
		{name: "empty defaults to 30d", body: `{}`, wantStatus: http.StatusNotFound, wantCode: "NO_COMPLETED_RUN"},
		{name: "invalid bad", body: `{"range":"bad"}`, wantStatus: http.StatusBadRequest, wantCode: "VALIDATION_ERROR"},
		{name: "invalid 1h", body: `{"range":"1h"}`, wantStatus: http.StatusBadRequest, wantCode: "VALIDATION_ERROR"},
	} {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			runRepo := &fakeRunRepo{err: pgx.ErrNoRows}
			packRepo := &fakeSummaryPackRepo{}
			handler := newTestPackHandler(runRepo, packRepo)
			app := newAuthApp(userID, handler.GenerateLatest)

			req := httptest.NewRequest(http.MethodPost, "/api/v1/packs/generate-latest", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			resp, err := app.Test(req, -1)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tc.wantStatus {
				t.Fatalf("status=%d want=%d", resp.StatusCode, tc.wantStatus)
			}

			var got struct {
				Code string `json:"code"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
				t.Fatalf("decode response failed: %v", err)
			}
			if got.Code != tc.wantCode {
				t.Fatalf("code=%s want=%s", got.Code, tc.wantCode)
			}
		})
	}
}
