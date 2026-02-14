package handlers

import (
	"bytes"
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"math/big"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type ImportHandler struct {
	portfolioRepo repositories.PortfolioRepository
	runRepo       repositories.RunRepository
}

type ImportResponse struct {
	Imported               int           `json:"imported"`
	Skipped                int           `json:"skipped"`
	Duplicates             int           `json:"duplicates"`
	Issues                 []importIssue `json:"issues"`
	IssueCount             int           `json:"issue_count"`
	IssuesTruncated        bool          `json:"issues_truncated"`
	PositionsRefreshed     bool          `json:"positions_refreshed"`
	PositionRefreshError   string        `json:"positions_refresh_error"`
	Venue                  string        `json:"venue"`
	Source                 string        `json:"source"`
	RunID                  string        `json:"run_id"`
}

func NewImportHandler(portfolioRepo repositories.PortfolioRepository, runRepo repositories.RunRepository) *ImportHandler {
	return &ImportHandler{
		portfolioRepo: portfolioRepo,
		runRepo:       runRepo,
	}
}

const maxImportIssues = 100

var venueTypeMap = map[string]string{
	"binance":     "cex",
	"upbit":       "cex",
	"bybit":       "cex",
	"bithumb":     "cex",
	"kis":         "broker",
	"hyperliquid": "dex",
	"jupiter":     "dex",
	"uniswap":     "dex",
}

var venueDisplayMap = map[string]string{
	"binance":     "Binance",
	"upbit":       "Upbit",
	"bybit":       "Bybit",
	"bithumb":     "Bithumb",
	"kis":         "Korea Investment & Securities",
	"hyperliquid": "Hyperliquid",
	"jupiter":     "Jupiter",
	"uniswap":     "Uniswap",
}

var validEventTypes = map[string]struct{}{
	"spot_trade": {},
	"perp_trade": {},
	"dex_swap":   {},
	"lp_add":     {},
	"lp_remove":  {},
	"transfer":   {},
	"fee":        {},
}

type csvColumns struct {
	executedAt int
	symbol     int
	side       int
	qty        int
	price      int
	fee        int
	feeAsset   int
	eventType  int
	externalID int
	venueSymbol int
	baseAsset  int
	quoteAsset int
	metadata   int
}

type importIssue struct {
	Row    int    `json:"row"`
	Reason string `json:"reason"`
}

// ImportTrades accepts CSV imports for unified portfolio
func (h *ImportHandler) ImportTrades(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "file is required"})
	}

	venue := strings.ToLower(strings.TrimSpace(c.FormValue("venue")))
	assetClass := strings.ToLower(strings.TrimSpace(c.FormValue("asset_class")))
	source := strings.ToLower(strings.TrimSpace(c.FormValue("source")))
	venueType := strings.ToLower(strings.TrimSpace(c.FormValue("venue_type")))
	accountLabel := strings.TrimSpace(c.FormValue("account_label"))
	address := strings.TrimSpace(c.FormValue("address"))

	if venue == "" || assetClass == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "venue and asset_class are required"})
	}
	if assetClass != "crypto" && assetClass != "stock" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "asset_class must be crypto or stock"})
	}
	if source == "" {
		source = "csv"
	}
	if source != "csv" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "source must be csv"})
	}
	if venueType == "" {
		venueType = venueTypeMap[venue]
	}
	if venueType == "" {
		venueType = "cex"
	}
	if venueType != "cex" && venueType != "dex" && venueType != "broker" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "venue_type must be cex, dex, or broker"})
	}
	if accountLabel == "" {
		accountLabel = "default"
	}

	runMeta := map[string]interface{}{
		"run_type":      "trade_csv_import",
		"source":        source,
		"venue":         venue,
		"asset_class":   assetClass,
		"venue_type":    venueType,
		"account_label": accountLabel,
		"address":       address,
	}
	runStartedAt := time.Now().UTC()
	run, err := h.runRepo.Create(c.Context(), userID, "trade_csv_import", "running", runStartedAt, mustJSON(runMeta))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	displayName := venueDisplayMap[venue]
	if displayName == "" {
		displayName = strings.ToUpper(venue)
	}

	venueID, err := h.portfolioRepo.UpsertVenue(c.Context(), venue, venueType, displayName, "")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	var addressPtr *string
	if address != "" {
		addressPtr = &address
	}

	accountID, err := h.portfolioRepo.UpsertAccount(c.Context(), userID, venueID, accountLabel, addressPtr, source)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "failed to open csv"})
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.TrimLeadingSpace = true
	header, err := reader.Read()
	if err != nil {
		_ = h.runRepo.UpdateStatus(c.Context(), run.RunID, "failed", nil, mustJSON(map[string]any{
			"run_id":      run.RunID.String(),
			"venue":       venue,
			"error":       "failed to read header",
			"http_status": http.StatusBadRequest,
		}))
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "failed to read header"})
	}

	cols, missing := resolveCsvColumns(header)
	if len(missing) > 0 {
		_ = h.runRepo.UpdateStatus(c.Context(), run.RunID, "failed", nil, mustJSON(map[string]any{
			"run_id":      run.RunID.String(),
			"venue":       venue,
			"error":       "missing columns",
			"missing":     missing,
			"http_status": http.StatusBadRequest,
		}))
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "missing columns: " + strings.Join(missing, ", ")})
	}

	imported := 0
	skipped := 0
	duplicates := 0
	rowNumber := 1
	seen := make(map[string]struct{})
	issues := make([]importIssue, 0, 10)
	issuesTruncated := false
	addIssue := func(row int, reason string) {
		if len(issues) >= maxImportIssues {
			issuesTruncated = true
			return
		}
		issues = append(issues, importIssue{Row: row, Reason: reason})
	}
	for {
		row, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			_ = h.runRepo.UpdateStatus(c.Context(), run.RunID, "failed", nil, mustJSON(map[string]any{
				"run_id":      run.RunID.String(),
				"venue":       venue,
				"error":       "failed to read csv",
				"http_status": http.StatusBadRequest,
			}))
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "failed to read csv"})
		}
		rowNumber += 1
		if isRowEmpty(row) {
			continue
		}

		record, reason := parseTradeEventRow(row, cols, venue, assetClass, venueType)
		if reason != "" {
			skipped += 1
			addIssue(rowNumber, reason)
			continue
		}

		dedupeKey := buildDedupeKey(venue, assetClass, record)
		if _, exists := seen[dedupeKey]; exists {
			skipped += 1
			duplicates += 1
			addIssue(rowNumber, "duplicate row in file")
			continue
		}
		seen[dedupeKey] = struct{}{}

		instrumentID, err := h.portfolioRepo.UpsertInstrument(
			c.Context(),
			assetClass,
			record.BaseAsset,
			record.QuoteAsset,
			record.Symbol,
		)
		if err != nil {
			skipped += 1
			addIssue(rowNumber, "failed to upsert instrument")
			continue
		}

		if record.VenueSymbol != "" {
			if err := h.portfolioRepo.UpsertInstrumentMapping(c.Context(), instrumentID, venueID, record.VenueSymbol); err != nil {
				skipped += 1
				addIssue(rowNumber, "failed to upsert instrument mapping")
				continue
			}
		}

		event := &entities.TradeEvent{
			ID:           uuid.New(),
			UserID:       userID,
			AccountID:    &accountID,
			VenueID:      &venueID,
			InstrumentID: &instrumentID,
			AssetClass:   assetClass,
			VenueType:    venueType,
			EventType:    record.EventType,
			Side:         record.Side,
			Qty:          record.Qty,
			Price:        record.Price,
			Fee:          record.Fee,
			FeeAsset:     record.FeeAsset,
			ExecutedAt:   record.ExecutedAt,
			Source:       source,
			ExternalID:   record.ExternalID,
			Metadata:     record.Metadata,
			DedupeKey:    &dedupeKey,
		}

		if err := h.portfolioRepo.CreateTradeEvent(c.Context(), event); err != nil {
			if isUniqueViolation(err) {
				skipped += 1
				duplicates += 1
				addIssue(rowNumber, "duplicate event already imported")
				continue
			}
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}

		imported += 1
	}

	report := strings.ToLower(strings.TrimSpace(c.Query("report")))
	if report == "" {
		report = strings.ToLower(strings.TrimSpace(c.FormValue("report")))
	}

	var positionsRefreshed bool
	var positionRefreshError string
	if imported > 0 {
		if err := h.portfolioRepo.RebuildPositions(c.Context(), userID); err != nil {
			positionRefreshError = err.Error()
		} else {
			positionsRefreshed = true
		}
	}

	runFinishedAt := time.Now().UTC()
	runSummaryMeta := map[string]any{
		"run_id":                run.RunID.String(),
		"exchange_rows_imported": imported,
		"exchange_rows_skipped":  skipped,
		"exchange_rows_duplicated": duplicates,
		"positions_refreshed":    positionsRefreshed,
		"positions_error":        positionRefreshError,
		"http_status":            http.StatusOK,
	}
	_ = h.runRepo.UpdateStatus(c.Context(), run.RunID, "completed", &runFinishedAt, mergeJSON(mustJSON(runMeta), runSummaryMeta))

	if report == "csv" {
		var buffer bytes.Buffer
		writer := csv.NewWriter(&buffer)
		_ = writer.Write([]string{"row", "reason"})
		for _, issue := range issues {
			_ = writer.Write([]string{fmt.Sprintf("%d", issue.Row), issue.Reason})
		}
		if issuesTruncated {
			_ = writer.Write([]string{"0", "issues truncated"})
		}
		writer.Flush()

		filename := fmt.Sprintf("import_issues_%s.csv", time.Now().UTC().Format("20060102_150405"))
		c.Set("Content-Type", "text/csv; charset=utf-8")
		c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
		c.Set("X-Import-Imported", fmt.Sprintf("%d", imported))
		c.Set("X-Import-Skipped", fmt.Sprintf("%d", skipped))
		c.Set("X-Import-Duplicates", fmt.Sprintf("%d", duplicates))
		c.Set("X-Positions-Refreshed", fmt.Sprintf("%t", positionsRefreshed))
		return c.Status(200).Send(buffer.Bytes())
	}

	return c.Status(200).JSON(fiber.Map{
		"imported":               imported,
		"skipped":                skipped,
		"duplicates":             duplicates,
		"issues":                 issues,
		"issue_count":            len(issues),
		"issues_truncated":       issuesTruncated,
		"positions_refreshed":    positionsRefreshed,
		"positions_refresh_error": positionRefreshError,
		"venue":                  venue,
		"source":                 source,
		"run_id":                 run.RunID.String(),
	})
}

type tradeEventRecord struct {
	Symbol      string
	BaseAsset   string
	QuoteAsset  string
	VenueSymbol string
	EventType   string
	Side        *string
	Qty         *string
	Price       *string
	Fee         *string
	FeeAsset    *string
	ExecutedAt  time.Time
	ExternalID  *string
	Metadata    *json.RawMessage
}

func resolveCsvColumns(header []string) (csvColumns, []string) {
	index := make(map[string]int, len(header))
	for i, col := range header {
		index[normalizeHeader(col)] = i
	}

	resolve := func(aliases ...string) int {
		for _, alias := range aliases {
			if idx, ok := index[alias]; ok {
				return idx
			}
		}
		return -1
	}

	cols := csvColumns{
		executedAt: resolve("executed_at", "trade_time", "timestamp", "time", "datetime"),
		symbol:     resolve("symbol", "pair", "instrument"),
		side:       resolve("side", "type"),
		qty:        resolve("qty", "quantity", "amount", "size"),
		price:      resolve("price", "avg_price", "executed_price"),
		fee:        resolve("fee", "commission"),
		feeAsset:   resolve("fee_asset", "fee_currency", "commission_asset"),
		eventType:  resolve("event_type"),
		externalID: resolve("external_id", "trade_id", "tx_hash"),
		venueSymbol: resolve("venue_symbol", "exchange_symbol"),
		baseAsset:  resolve("base_asset", "base"),
		quoteAsset: resolve("quote_asset", "quote"),
		metadata:   resolve("metadata"),
	}

	var missing []string
	if cols.executedAt < 0 {
		missing = append(missing, "executed_at")
	}
	if cols.symbol < 0 {
		missing = append(missing, "symbol")
	}
	if cols.side < 0 {
		missing = append(missing, "side")
	}
	if cols.qty < 0 {
		missing = append(missing, "qty")
	}
	if cols.price < 0 {
		missing = append(missing, "price")
	}
	return cols, missing
}

func parseTradeEventRow(row []string, cols csvColumns, venue string, assetClass string, venueType string) (*tradeEventRecord, string) {
	executedRaw := strings.TrimSpace(getCell(row, cols.executedAt))
	if executedRaw == "" {
		return nil, "executed_at is required"
	}

	executedAt, ok := parseTime(executedRaw)
	if !ok {
		return nil, "invalid executed_at"
	}

	symbolRaw := strings.TrimSpace(getCell(row, cols.symbol))
	if symbolRaw == "" {
		return nil, "symbol is required"
	}

	venueSymbol := strings.TrimSpace(getCell(row, cols.venueSymbol))
	if venueSymbol == "" {
		venueSymbol = symbolRaw
	}

	sideRaw := strings.ToLower(strings.TrimSpace(getCell(row, cols.side)))
	var sidePtr *string
	if sideRaw != "" {
		switch sideRaw {
		case "buy", "b", "long":
			s := "buy"
			sidePtr = &s
		case "sell", "s", "short":
			s := "sell"
			sidePtr = &s
		default:
			// ignore unknown side
		}
	}

	qtyRaw := strings.TrimSpace(getCell(row, cols.qty))
	priceRaw := strings.TrimSpace(getCell(row, cols.price))

	feeRaw := strings.TrimSpace(getCell(row, cols.fee))
	feeValue, feeOk := parseDecimalOptional(feeRaw)
	if !feeOk {
		return nil, "invalid fee"
	}

	feeAssetRaw := strings.TrimSpace(getCell(row, cols.feeAsset))
	var feeAssetPtr *string
	if feeAssetRaw != "" {
		feeAssetPtr = &feeAssetRaw
	}

	baseRaw := strings.TrimSpace(getCell(row, cols.baseAsset))
	quoteRaw := strings.TrimSpace(getCell(row, cols.quoteAsset))

	normalizedSymbol, baseAsset, quoteAsset, ok := normalizeSymbol(symbolRaw, baseRaw, quoteRaw, venue, assetClass)
	if !ok {
		return nil, "invalid symbol format"
	}

	eventType := strings.ToLower(strings.TrimSpace(getCell(row, cols.eventType)))
	if _, ok := validEventTypes[eventType]; !ok {
		eventType = defaultEventType(venueType)
	}
	isTradeLike := eventType == "spot_trade" || eventType == "perp_trade" || eventType == "dex_swap"

	qtyValue, ok := parseDecimalWithCheck(qtyRaw, !isTradeLike)
	if !ok {
		return nil, "invalid qty"
	}
	priceValue, ok := parseDecimalWithCheck(priceRaw, !isTradeLike)
	if !ok {
		return nil, "invalid price"
	}

	if isTradeLike && sidePtr == nil {
		return nil, "side is required for trade events"
	}

	externalRaw := strings.TrimSpace(getCell(row, cols.externalID))
	var externalID *string
	if externalRaw != "" {
		externalID = &externalRaw
	}

	metadataRaw := strings.TrimSpace(getCell(row, cols.metadata))
	var metadataPtr *json.RawMessage
	if metadataRaw != "" {
		if json.Valid([]byte(metadataRaw)) {
			raw := json.RawMessage(metadataRaw)
			metadataPtr = &raw
		} else {
			return nil, "metadata must be valid JSON"
		}
	}

	qtyPtr := &qtyValue
	pricePtr := &priceValue

	return &tradeEventRecord{
		Symbol:      normalizedSymbol,
		BaseAsset:   baseAsset,
		QuoteAsset:  quoteAsset,
		VenueSymbol: venueSymbol,
		EventType:   eventType,
		Side:        sidePtr,
		Qty:         qtyPtr,
		Price:       pricePtr,
		Fee:         feeValue,
		FeeAsset:    feeAssetPtr,
		ExecutedAt:  executedAt,
		ExternalID:  externalID,
		Metadata:    metadataPtr,
	}, ""
}

func normalizeHeader(value string) string {
	cleaned := strings.TrimSpace(strings.ToLower(value))
	cleaned = strings.TrimPrefix(cleaned, "\ufeff")
	cleaned = strings.ReplaceAll(cleaned, " ", "_")
	cleaned = strings.ReplaceAll(cleaned, "-", "_")
	cleaned = strings.ReplaceAll(cleaned, ".", "_")
	return cleaned
}

func parseTime(value string) (time.Time, bool) {
	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed.UTC(), true
		}
	}
	return time.Time{}, false
}

func parseDecimal(value string) (string, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", false
	}
	return parseDecimalWithCheck(trimmed, false)
}

func parseDecimalWithCheck(value string, allowZero bool) (string, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", false
	}
	rat, ok := new(big.Rat).SetString(trimmed)
	if !ok {
		return "", false
	}
	if allowZero {
		if rat.Sign() < 0 {
			return "", false
		}
		return trimmed, true
	}
	if rat.Sign() <= 0 {
		return "", false
	}
	return trimmed, true
}

func parseDecimalOptional(value string) (*string, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, true
	}
	rat, ok := new(big.Rat).SetString(trimmed)
	if !ok {
		return nil, false
	}
	if rat.Sign() < 0 {
		return nil, false
	}
	return &trimmed, true
}

func normalizeSymbol(raw string, base string, quote string, venue string, assetClass string) (string, string, string, bool) {
	normalizedRaw := strings.TrimSpace(raw)
	if normalizedRaw == "" {
		return "", "", "", false
	}
	if base == "" || quote == "" {
		base, quote = splitSymbol(normalizedRaw)
	}
	if base == "" && quote == "" && assetClass == "stock" {
		base = normalizedRaw
		quote = defaultQuoteForVenue(venue, assetClass)
	}
	if quote == "" {
		quote = defaultQuoteForVenue(venue, assetClass)
	}
	if base == "" {
		return "", "", "", false
	}

	base = strings.ToUpper(strings.TrimSpace(base))
	quote = strings.ToUpper(strings.TrimSpace(quote))
	if quote == "" {
		return "", "", "", false
	}

	return base + "/" + quote, base, quote, true
}

func splitSymbol(value string) (string, string) {
	if strings.Contains(value, "/") {
		parts := strings.Split(value, "/")
		if len(parts) == 2 {
			return parts[0], parts[1]
		}
	}
	if strings.Contains(value, "-") {
		parts := strings.Split(value, "-")
		if len(parts) == 2 {
			return parts[0], parts[1]
		}
	}
	if strings.Contains(value, "_") {
		parts := strings.Split(value, "_")
		if len(parts) == 2 {
			return parts[0], parts[1]
		}
	}

	upper := strings.ToUpper(value)
	quotes := []string{"USDT", "USDC", "BUSD", "USD", "KRW", "BTC", "ETH", "EUR"}
	for _, quote := range quotes {
		if strings.HasSuffix(upper, quote) && len(upper) > len(quote) {
			return upper[:len(upper)-len(quote)], quote
		}
	}
	return "", ""
}

func defaultQuoteForVenue(venue string, assetClass string) string {
	if assetClass == "stock" {
		return "KRW"
	}
	switch venue {
	case "upbit", "bithumb", "kis":
		return "KRW"
	default:
		return "USDT"
	}
}

func defaultEventType(venueType string) string {
	if venueType == "dex" {
		return "dex_swap"
	}
	return "spot_trade"
}

func buildDedupeKey(venue string, assetClass string, record *tradeEventRecord) string {
	parts := []string{
		strings.ToLower(strings.TrimSpace(venue)),
		strings.ToLower(strings.TrimSpace(assetClass)),
		record.Symbol,
		record.EventType,
	}
	if record.Side != nil {
		parts = append(parts, *record.Side)
	}
	if record.Qty != nil {
		parts = append(parts, *record.Qty)
	}
	if record.Price != nil {
		parts = append(parts, *record.Price)
	}
	if record.Fee != nil {
		parts = append(parts, *record.Fee)
	}
	if record.FeeAsset != nil {
		parts = append(parts, *record.FeeAsset)
	}
	parts = append(parts, record.ExecutedAt.UTC().Format(time.RFC3339Nano))
	if record.ExternalID != nil {
		parts = append(parts, *record.ExternalID)
	}
	payload := strings.Join(parts, "|")
	hash := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(hash[:])
}

func getCell(row []string, index int) string {
	if index < 0 || index >= len(row) {
		return ""
	}
	return row[index]
}

func isRowEmpty(row []string) bool {
	for _, cell := range row {
		if strings.TrimSpace(cell) != "" {
			return false
		}
	}
	return true
}

func mustJSON(value any) json.RawMessage {
	if value == nil {
		return []byte("{}")
	}

	raw, err := json.Marshal(value)
	if err != nil {
		return []byte("{}")
	}
	return raw
}

func mergeJSON(base json.RawMessage, overlay map[string]any) json.RawMessage {
	merged := map[string]any{}
	if len(base) > 0 {
		_ = json.Unmarshal(base, &merged)
	}
	for key, value := range overlay {
		merged[key] = value
	}
	return mustJSON(merged)
}
