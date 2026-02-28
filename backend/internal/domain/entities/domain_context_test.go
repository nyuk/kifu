package entities

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestDomainContextCreation(t *testing.T) {
	ownerID := uuid.New()
	now := time.Now().UTC()
	payload := json.RawMessage(`{"key":"value","count":1}`)

	dc := DomainContext{
		ID:        uuid.New(),
		Scope:     "trading",
		Domain:    "kifu",
		Version:   "v1",
		OwnerID:   ownerID,
		Context:   payload,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if dc.ID == uuid.Nil {
		t.Fatalf("expected non-nil ID")
	}
	if dc.Scope != "trading" {
		t.Fatalf("expected scope trading, got %s", dc.Scope)
	}
	if dc.Domain != "kifu" {
		t.Fatalf("expected domain kifu, got %s", dc.Domain)
	}
	if dc.Version != "v1" {
		t.Fatalf("expected version v1, got %s", dc.Version)
	}
	if dc.OwnerID != ownerID {
		t.Fatalf("expected ownerID %s, got %s", ownerID, dc.OwnerID)
	}
	if string(dc.Context) != string(payload) {
		t.Fatalf("expected context %s, got %s", payload, dc.Context)
	}
	if dc.CreatedAt.IsZero() || dc.UpdatedAt.IsZero() {
		t.Fatalf("expected non-zero timestamps")
	}
}

func TestDomainContextJSONMarshalUnmarshal(t *testing.T) {
	ownerID := uuid.New()
	dc := DomainContext{
		ID:      uuid.New(),
		Scope:   "onchain",
		Domain:  "shared",
		Version: "v1",
		OwnerID: ownerID,
		Context: json.RawMessage(`{"chain":"base","token_count":3}`),
	}

	b, err := json.Marshal(dc)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded DomainContext
	if err := json.Unmarshal(b, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if decoded.ID != dc.ID {
		t.Fatalf("expected ID %s, got %s", dc.ID, decoded.ID)
	}
	if decoded.OwnerID != ownerID {
		t.Fatalf("expected ownerID %s, got %s", ownerID, decoded.OwnerID)
	}
	if decoded.Scope != "onchain" {
		t.Fatalf("expected scope onchain, got %s", decoded.Scope)
	}
	if string(decoded.Context) != `{"chain":"base","token_count":3}` {
		t.Fatalf("unexpected context: %s", decoded.Context)
	}
}
