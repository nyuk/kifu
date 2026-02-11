package handlers

import (
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type SafetyHandler struct {
	reviewRepo repositories.TradeSafetyReviewRepository
}

func NewSafetyHandler(reviewRepo repositories.TradeSafetyReviewRepository) *SafetyHandler {
	return &SafetyHandler{reviewRepo: reviewRepo}
}

type SafetyTodayItem struct {
	TargetType string  `json:"target_type"`
	TargetID   string  `json:"target_id"`
	ExecutedAt string  `json:"executed_at"`
	AssetClass string  `json:"asset_class"`
	Venue      string  `json:"venue"`
	VenueName  string  `json:"venue_name"`
	Symbol     string  `json:"symbol"`
	Side       *string `json:"side,omitempty"`
	Qty        *string `json:"qty,omitempty"`
	Price      *string `json:"price,omitempty"`
	Source     string  `json:"source"`
	Reviewed   bool    `json:"reviewed"`
	Verdict    *string `json:"verdict,omitempty"`
	Note       *string `json:"note,omitempty"`
	ReviewedAt *string `json:"reviewed_at,omitempty"`
	GroupSize  int     `json:"group_size,omitempty"`
	Members    []SafetyTargetMember `json:"member_targets,omitempty"`
}

type SafetyTargetMember struct {
	TargetType string  `json:"target_type"`
	TargetID   string  `json:"target_id"`
	Reviewed   bool    `json:"reviewed"`
	Verdict    *string `json:"verdict,omitempty"`
}

type SafetyTodayResponse struct {
	Date     string            `json:"date"`
	Timezone string            `json:"timezone"`
	Total    int               `json:"total"`
	Reviewed int               `json:"reviewed"`
	Pending  int               `json:"pending"`
	Items    []SafetyTodayItem `json:"items"`
}

type UpsertSafetyReviewRequest struct {
	TargetType string  `json:"target_type"`
	TargetID   string  `json:"target_id"`
	Verdict    string  `json:"verdict"`
	Note       *string `json:"note"`
}

type SafetyReviewResponse struct {
	ID         string  `json:"id"`
	TargetType string  `json:"target_type"`
	TargetID   string  `json:"target_id"`
	Verdict    string  `json:"verdict"`
	Note       *string `json:"note,omitempty"`
	CreatedAt  string  `json:"created_at"`
	UpdatedAt  string  `json:"updated_at"`
}

func (h *SafetyHandler) ListDaily(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	timezone := strings.TrimSpace(c.Query("timezone"))
	if timezone == "" {
		timezone = "UTC"
	}
	location, err := time.LoadLocation(timezone)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "timezone is invalid"})
	}

	var dayStart time.Time
	dateRaw := strings.TrimSpace(c.Query("date"))
	if dateRaw == "" {
		now := time.Now().In(location)
		dayStart = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location)
	} else {
		parsed, parseErr := time.ParseInLocation("2006-01-02", dateRaw, location)
		if parseErr != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "date must be YYYY-MM-DD"})
		}
		dayStart = parsed
	}
	dayEnd := dayStart.Add(24 * time.Hour)

	assetClass := strings.ToLower(strings.TrimSpace(c.Query("asset_class")))
	if assetClass != "" && assetClass != "crypto" && assetClass != "stock" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "asset_class must be crypto or stock"})
	}

	limit := 20
	if limitRaw := strings.TrimSpace(c.Query("limit")); limitRaw != "" {
		parsed, parseErr := parsePositiveInt(limitRaw)
		if parseErr != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "limit is invalid"})
		}
		if parsed > 200 {
			parsed = 200
		}
		limit = parsed
	}

	filter := repositories.DailySafetyFilter{
		From:        dayStart.UTC(),
		To:          dayEnd.UTC(),
		AssetClass:  assetClass,
		Venue:       strings.ToLower(strings.TrimSpace(c.Query("venue"))),
		OnlyPending: parseBoolQuery(c.Query("only_pending")),
		Limit:       limit,
	}

	items, _, err := h.reviewRepo.ListDaily(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	responseItems := make([]SafetyTodayItem, 0, len(items))
	for _, item := range items {
		responseItem := SafetyTodayItem{
			TargetType: item.TargetType,
			TargetID:   item.TargetID.String(),
			ExecutedAt: item.ExecutedAt.Format(time.RFC3339),
			AssetClass: item.AssetClass,
			Venue:      item.Venue,
			VenueName:  item.VenueName,
			Symbol:     item.Symbol,
			Side:       normalizeCasePtr(item.Side, true),
			Qty:        item.Qty,
			Price:      item.Price,
			Source:     item.Source,
			Reviewed:   item.Verdict != nil,
			Verdict:    item.Verdict,
			Note:       item.Note,
		}
		if item.ReviewedAt != nil {
			reviewedAt := item.ReviewedAt.Format(time.RFC3339)
			responseItem.ReviewedAt = &reviewedAt
		}
		responseItem.Members = []SafetyTargetMember{
			{
				TargetType: responseItem.TargetType,
				TargetID:   responseItem.TargetID,
				Reviewed:   responseItem.Reviewed,
				Verdict:    responseItem.Verdict,
			},
		}
		responseItem.GroupSize = 1
		responseItems = append(responseItems, responseItem)
	}

	groupedItems := groupSafetyItems(responseItems)
	groupedTotal := len(groupedItems)
	groupedReviewed := 0
	for _, item := range groupedItems {
		if item.Reviewed {
			groupedReviewed++
		}
	}
	groupedPending := groupedTotal - groupedReviewed
	if groupedPending < 0 {
		groupedPending = 0
	}

	return c.Status(200).JSON(SafetyTodayResponse{
		Date:     dayStart.Format("2006-01-02"),
		Timezone: timezone,
		Total:    groupedTotal,
		Reviewed: groupedReviewed,
		Pending:  groupedPending,
		Items:    groupedItems,
	})
}

func groupSafetyItems(items []SafetyTodayItem) []SafetyTodayItem {
	if len(items) == 0 {
		return items
	}

	sorted := make([]SafetyTodayItem, len(items))
	copy(sorted, items)
	sort.Slice(sorted, func(i, j int) bool {
		ti := parseRFC3339Millis(sorted[i].ExecutedAt)
		tj := parseRFC3339Millis(sorted[j].ExecutedAt)
		return ti < tj
	})

	groups := make([]SafetyTodayItem, 0, len(sorted))
	for _, item := range sorted {
		if len(groups) == 0 {
			groups = append(groups, item)
			continue
		}

		last := &groups[len(groups)-1]
		lastTime := parseRFC3339Millis(last.ExecutedAt)
		currentTime := parseRFC3339Millis(item.ExecutedAt)
		sameVenue := strings.EqualFold(last.Venue, item.Venue)
		sameSymbol := strings.EqualFold(last.Symbol, item.Symbol)
		sameSide := strings.EqualFold(stringOrEmpty(last.Side), stringOrEmpty(item.Side))
		withinWindow := math.Abs(float64(currentTime-lastTime)) <= float64(90*time.Second/time.Millisecond)

		if !(sameVenue && sameSymbol && sameSide && withinWindow) {
			groups = append(groups, item)
			continue
		}

		last.GroupSize += item.GroupSize
		last.Members = append(last.Members, item.Members...)
		if currentTime > lastTime {
			last.ExecutedAt = item.ExecutedAt
		}

		mergedQty, mergedPrice := mergeQtyPrice(last.Qty, last.Price, item.Qty, item.Price)
		last.Qty = mergedQty
		last.Price = mergedPrice
	}

	for i := range groups {
		allReviewed := true
		var verdict string
		verdictSet := map[string]struct{}{}
		for _, member := range groups[i].Members {
			if !member.Reviewed {
				allReviewed = false
			}
			if member.Verdict != nil && strings.TrimSpace(*member.Verdict) != "" {
				verdictSet[*member.Verdict] = struct{}{}
				verdict = *member.Verdict
			}
		}
		groups[i].Reviewed = allReviewed
		if allReviewed && len(verdictSet) == 1 {
			groups[i].Verdict = &verdict
		} else {
			groups[i].Verdict = nil
		}
		if groups[i].GroupSize <= 0 {
			groups[i].GroupSize = 1
		}
	}

	sort.Slice(groups, func(i, j int) bool {
		ti := parseRFC3339Millis(groups[i].ExecutedAt)
		tj := parseRFC3339Millis(groups[j].ExecutedAt)
		return ti > tj
	})

	return groups
}

func parseRFC3339Millis(value string) int64 {
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(value))
	if err != nil {
		return 0
	}
	return parsed.UnixMilli()
}

func stringOrEmpty(v *string) string {
	if v == nil {
		return ""
	}
	return strings.TrimSpace(*v)
}

func parseFloatPtr(value *string) (float64, bool) {
	if value == nil {
		return 0, false
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return 0, false
	}
	parsed, err := strconv.ParseFloat(trimmed, 64)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func formatFloatPtr(value float64) *string {
	formatted := fmt.Sprintf("%.10f", value)
	formatted = strings.TrimRight(strings.TrimRight(formatted, "0"), ".")
	return &formatted
}

func mergeQtyPrice(q1, p1, q2, p2 *string) (*string, *string) {
	qty1, okQty1 := parseFloatPtr(q1)
	price1, okPrice1 := parseFloatPtr(p1)
	qty2, okQty2 := parseFloatPtr(q2)
	price2, okPrice2 := parseFloatPtr(p2)

	if okQty1 && okPrice1 && okQty2 && okPrice2 {
		totalQty := qty1 + qty2
		if totalQty > 0 {
			weightedPrice := (qty1*price1 + qty2*price2) / totalQty
			return formatFloatPtr(totalQty), formatFloatPtr(weightedPrice)
		}
	}

	if q1 != nil && p1 != nil {
		return q1, p1
	}
	return q2, p2
}

func (h *SafetyHandler) UpsertReview(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var request UpsertSafetyReviewRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid json body"})
	}

	targetType := strings.ToLower(strings.TrimSpace(request.TargetType))
	if targetType != "trade" && targetType != "trade_event" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "target_type must be trade or trade_event"})
	}

	targetID, err := uuid.Parse(strings.TrimSpace(request.TargetID))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "target_id is invalid"})
	}

	verdict := entities.TradeSafetyVerdict(strings.ToLower(strings.TrimSpace(request.Verdict)))
	if verdict != entities.TradeSafetyVerdictIntended && verdict != entities.TradeSafetyVerdictMistake && verdict != entities.TradeSafetyVerdictUnsure {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "verdict must be intended, mistake, or unsure"})
	}

	review, err := h.reviewRepo.Upsert(c.Context(), userID, repositories.UpsertSafetyReviewInput{
		TargetType: targetType,
		TargetID:   targetID,
		Verdict:    verdict,
		Note:       request.Note,
	})
	if err != nil {
		if errors.Is(err, repositories.ErrSafetyTargetNotFound) {
			return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "trade target not found"})
		}
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	response := SafetyReviewResponse{
		ID:        review.ID.String(),
		Verdict:   string(review.Verdict),
		Note:      review.Note,
		CreatedAt: review.CreatedAt.Format(time.RFC3339),
		UpdatedAt: review.UpdatedAt.Format(time.RFC3339),
	}
	if review.TradeID != nil {
		response.TargetType = "trade"
		response.TargetID = review.TradeID.String()
	} else if review.TradeEventID != nil {
		response.TargetType = "trade_event"
		response.TargetID = review.TradeEventID.String()
	}

	return c.Status(200).JSON(response)
}

func parseBoolQuery(raw string) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes", "y", "on":
		return true
	default:
		return false
	}
}

func normalizeCasePtr(value *string, upper bool) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	if upper {
		normalized := strings.ToUpper(trimmed)
		return &normalized
	}
	normalized := strings.ToLower(trimmed)
	return &normalized
}
