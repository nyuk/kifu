package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type SummaryPack struct {
	PackID                 uuid.UUID       `json:"pack_id"`
	UserID                 uuid.UUID       `json:"user_id"`
	SourceRunID            uuid.UUID       `json:"source_run_id"`
	Range                  string          `json:"range"`
	SchemaVersion          string          `json:"schema_version"`
	CalcVersion            string          `json:"calc_version"`
	ContentHash            string          `json:"content_hash"`
	ReconciliationStatus   string          `json:"reconciliation_status"`
	MissingSuspectsCount   int             `json:"missing_suspects_count"`
	DuplicateSuspectsCount int             `json:"duplicate_suspects_count"`
	NormalizationWarnings  []string        `json:"normalization_warnings"`
	Payload                json.RawMessage `json:"payload"`
	CreatedAt              time.Time       `json:"created_at"`
}

type SummaryPackPayload struct {
	PackID          string                 `json:"pack_id"`
	SchemaVersion   string                 `json:"schema_version"`
	CalcVersion     string                 `json:"calc_version"`
	ContentHash     string                 `json:"content_hash"`
	TimeRange       map[string]interface{} `json:"time_range"`
	DataSources     map[string]interface{} `json:"data_sources"`
	PnlSummary      map[string]interface{} `json:"pnl_summary"`
	FlowSummary     map[string]interface{} `json:"flow_summary"`
	ActivitySummary map[string]interface{} `json:"activity_summary"`
	Reconciliation  map[string]interface{} `json:"reconciliation"`
	EvidenceIndex   map[string]interface{} `json:"evidence_index"`
}
