package services

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"
)

type fakeOnchainProvider struct {
	events []TransferEvent
	err    error
}

func (f *fakeOnchainProvider) ListERC20Transfers(_ context.Context, _ string, _, _ time.Time) ([]TransferEvent, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.events, nil
}

func newTestOnchainService(provider OnchainProvider, now time.Time) *OnchainPackService {
	svc := NewOnchainPackService(provider)
	svc.now = func() time.Time { return now }
	return svc
}

func warningExists(warnings []OnchainWarning, target string) bool {
	for _, warning := range warnings {
		if warning.Code == target {
			return true
		}
	}
	return false
}

func TestValidateEVMAddress(t *testing.T) {
	t.Parallel()

	valid := "0x1111111111111111111111111111111111111111"
	invalidPrefix := "1111111111111111111111111111111111111111"
	invalidLength := "0x111111111111111111111111111111111111111"
	invalidHex := "0x111111111111111111111111111111111111111G"

	if !ValidateEVMAddress(valid) {
		t.Fatalf("expected valid address: %s", valid)
	}
	if ValidateEVMAddress(invalidPrefix) {
		t.Fatalf("expected invalid address (prefix): %s", invalidPrefix)
	}
	if ValidateEVMAddress(invalidLength) {
		t.Fatalf("expected invalid address (length): %s", invalidLength)
	}
	if ValidateEVMAddress(invalidHex) {
		t.Fatalf("expected invalid address (hex): %s", invalidHex)
	}
}

func TestOnchainQuickCheckInvalidAddress(t *testing.T) {
	t.Parallel()

	svc := newTestOnchainService(&fakeOnchainProvider{}, time.Date(2026, 2, 18, 12, 0, 0, 0, time.UTC))
	_, err := svc.BuildQuickCheck(context.Background(), OnchainQuickCheckRequest{
		Chain:   "base",
		Address: "0x1234",
		Range:   "30d",
	})
	if !errors.Is(err, ErrInvalidAddress) {
		t.Fatalf("expected ErrInvalidAddress, got %v", err)
	}
}

func TestOnchainWarningsLowActivity(t *testing.T) {
	t.Parallel()

	svc := newTestOnchainService(&fakeOnchainProvider{
		events: []TransferEvent{},
	}, time.Date(2026, 2, 18, 12, 0, 0, 0, time.UTC))

	resp, err := svc.BuildQuickCheck(context.Background(), OnchainQuickCheckRequest{
		Chain:   "base",
		Address: "0x1111111111111111111111111111111111111111",
		Range:   "30d",
	})
	if err != nil {
		t.Fatalf("BuildQuickCheck failed: %v", err)
	}
	if !warningExists(resp.Warnings, "LOW_ACTIVITY") {
		t.Fatalf("expected LOW_ACTIVITY warning, got %#v", resp.Warnings)
	}
}

func TestOnchainWarningsHighConcentration(t *testing.T) {
	t.Parallel()

	target := "0x2222222222222222222222222222222222222222"
	svc := newTestOnchainService(&fakeOnchainProvider{
		events: []TransferEvent{
			{
				TokenAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
				From:         "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
				To:           target,
				AmountRaw:    "800",
			},
			{
				TokenAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
				From:         "0xdddddddddddddddddddddddddddddddddddddddd",
				To:           target,
				AmountRaw:    "200",
			},
		},
	}, time.Date(2026, 2, 18, 12, 0, 0, 0, time.UTC))

	resp, err := svc.BuildQuickCheck(context.Background(), OnchainQuickCheckRequest{
		Chain:   "base",
		Address: target,
		Range:   "30d",
	})
	if err != nil {
		t.Fatalf("BuildQuickCheck failed: %v", err)
	}
	if !warningExists(resp.Warnings, "HIGH_CONCENTRATION") {
		t.Fatalf("expected HIGH_CONCENTRATION warning, got %#v", resp.Warnings)
	}
}

func TestOnchainWarningsTooManyUniqueTokens(t *testing.T) {
	t.Parallel()

	target := "0x3333333333333333333333333333333333333333"
	events := make([]TransferEvent, 0, 50)
	for i := 0; i < 50; i++ {
		token := fmt.Sprintf("0x%040x", i+1)
		events = append(events, TransferEvent{
			TokenAddress: token,
			From:         "0x4444444444444444444444444444444444444444",
			To:           target,
			AmountRaw:    "1",
		})
	}

	svc := newTestOnchainService(&fakeOnchainProvider{events: events}, time.Date(2026, 2, 18, 12, 0, 0, 0, time.UTC))
	resp, err := svc.BuildQuickCheck(context.Background(), OnchainQuickCheckRequest{
		Chain:   "base",
		Address: target,
		Range:   "30d",
	})
	if err != nil {
		t.Fatalf("BuildQuickCheck failed: %v", err)
	}
	if !warningExists(resp.Warnings, "TOO_MANY_UNIQUE_TOKENS") {
		t.Fatalf("expected TOO_MANY_UNIQUE_TOKENS warning, got %#v", resp.Warnings)
	}
}

func TestOnchainSummaryDeterministicWithProviderMock(t *testing.T) {
	t.Parallel()

	target := "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	svc := newTestOnchainService(&fakeOnchainProvider{
		events: []TransferEvent{
			{
				TokenAddress: "0x1111111111111111111111111111111111111111",
				From:         "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
				To:           target,
				AmountRaw:    "40",
			},
			{
				TokenAddress: "0x1111111111111111111111111111111111111111",
				From:         "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
				To:           target,
				AmountRaw:    "50",
			},
			{
				TokenAddress: "0x2222222222222222222222222222222222222222",
				From:         "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
				To:           target,
				AmountRaw:    "80",
			},
			{
				TokenAddress: "0x3333333333333333333333333333333333333333",
				From:         target,
				To:           "0xcccccccccccccccccccccccccccccccccccccccc",
				AmountRaw:    "90",
			},
			{
				TokenAddress: "0x1111111111111111111111111111111111111111",
				From:         target,
				To:           "0xcccccccccccccccccccccccccccccccccccccccc",
				AmountRaw:    "20",
			},
		},
	}, time.Date(2026, 2, 18, 12, 0, 0, 0, time.UTC))

	resp, err := svc.BuildQuickCheck(context.Background(), OnchainQuickCheckRequest{
		Chain:   "base",
		Address: target,
		Range:   "30d",
	})
	if err != nil {
		t.Fatalf("BuildQuickCheck failed: %v", err)
	}

	if resp.Summary.TokenTransferCount != 5 {
		t.Fatalf("token_transfer_count=%d want=5", resp.Summary.TokenTransferCount)
	}
	if resp.Summary.UniqueTokenCount != 3 {
		t.Fatalf("unique_token_count=%d want=3", resp.Summary.UniqueTokenCount)
	}

	if len(resp.Summary.TopIn) < 2 {
		t.Fatalf("expected at least 2 top_in rows, got %d", len(resp.Summary.TopIn))
	}
	if resp.Summary.TopIn[0].Token != "0x1111111111111111111111111111111111111111" || resp.Summary.TopIn[0].Amount != "90" {
		t.Fatalf("top_in[0]=%+v want token1 amount 90", resp.Summary.TopIn[0])
	}
	if resp.Summary.TopIn[1].Token != "0x2222222222222222222222222222222222222222" || resp.Summary.TopIn[1].Amount != "80" {
		t.Fatalf("top_in[1]=%+v want token2 amount 80", resp.Summary.TopIn[1])
	}

	if len(resp.Summary.TopOut) < 2 {
		t.Fatalf("expected at least 2 top_out rows, got %d", len(resp.Summary.TopOut))
	}
	if resp.Summary.TopOut[0].Token != "0x3333333333333333333333333333333333333333" || resp.Summary.TopOut[0].Amount != "90" {
		t.Fatalf("top_out[0]=%+v want token3 amount 90", resp.Summary.TopOut[0])
	}
	if resp.Summary.TopOut[1].Token != "0x1111111111111111111111111111111111111111" || resp.Summary.TopOut[1].Amount != "20" {
		t.Fatalf("top_out[1]=%+v want token1 amount 20", resp.Summary.TopOut[1])
	}
	if resp.Status != "ok" {
		t.Fatalf("status=%s want=ok", resp.Status)
	}
}
