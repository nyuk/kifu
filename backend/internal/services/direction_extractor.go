package services

import (
	"math/big"
	"regexp"
	"strings"

	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type DirectionExtractor struct {
	buyPatterns  []*regexp.Regexp
	sellPatterns []*regexp.Regexp
	holdPatterns []*regexp.Regexp
}

func NewDirectionExtractor() *DirectionExtractor {
	return &DirectionExtractor{
		buyPatterns: []*regexp.Regexp{
			// English patterns
			regexp.MustCompile(`(?i)\b(buy|long|bullish|uptrend|upward|rally|pump)\b`),
			regexp.MustCompile(`(?i)(go\s+long|enter\s+long|long\s+position|buying\s+opportunity)`),
			regexp.MustCompile(`(?i)(price.*increase|price.*rise|expect.*up|likely.*up)`),
			regexp.MustCompile(`(?i)(positive\s+outlook|optimistic|favorable)`),
			// Korean patterns
			regexp.MustCompile(`(?i)(매수|롱|상승|불리시|긍정적|올라|오를|상방|강세)`),
			regexp.MustCompile(`(?i)(진입.*롱|롱.*진입|매수.*추천|추천.*매수)`),
			regexp.MustCompile(`(?i)(상승.*예상|상승.*전망|오를.*것)`),
		},
		sellPatterns: []*regexp.Regexp{
			// English patterns
			regexp.MustCompile(`(?i)\b(sell|short|bearish|downtrend|downward|dump|crash)\b`),
			regexp.MustCompile(`(?i)(go\s+short|enter\s+short|short\s+position|selling\s+opportunity)`),
			regexp.MustCompile(`(?i)(price.*decrease|price.*drop|price.*fall|expect.*down|likely.*down)`),
			regexp.MustCompile(`(?i)(negative\s+outlook|pessimistic|unfavorable)`),
			// Korean patterns
			regexp.MustCompile(`(?i)(매도|숏|하락|베어리시|부정적|내려|내릴|하방|약세)`),
			regexp.MustCompile(`(?i)(진입.*숏|숏.*진입|매도.*추천|추천.*매도)`),
			regexp.MustCompile(`(?i)(하락.*예상|하락.*전망|내릴.*것)`),
		},
		holdPatterns: []*regexp.Regexp{
			// English patterns
			regexp.MustCompile(`(?i)\b(hold|wait|neutral|sideways|consolidation|range)\b`),
			regexp.MustCompile(`(?i)(no\s+clear\s+direction|unclear|uncertain|wait\s+and\s+see)`),
			regexp.MustCompile(`(?i)(difficult\s+to\s+predict|hard\s+to\s+say|mixed\s+signals)`),
			// Korean patterns
			regexp.MustCompile(`(?i)(관망|횡보|중립|대기|지켜보|기다려)`),
			regexp.MustCompile(`(?i)(명확하지.*않|불확실|판단.*어려|애매)`),
			regexp.MustCompile(`(?i)(방향.*불분명|추세.*없|박스권)`),
		},
	}
}

// Extract analyzes the AI response and returns the predicted direction
func (e *DirectionExtractor) Extract(response string) entities.Direction {
	response = strings.ToLower(response)

	buyScore := e.countMatches(response, e.buyPatterns)
	sellScore := e.countMatches(response, e.sellPatterns)
	holdScore := e.countMatches(response, e.holdPatterns)

	// Score-based decision with minimum threshold
	maxScore := max(buyScore, sellScore, holdScore)

	if maxScore == 0 {
		return entities.DirectionHold
	}

	// If scores are very close, default to HOLD (uncertainty)
	if buyScore == sellScore && buyScore >= holdScore {
		return entities.DirectionHold
	}

	if buyScore > sellScore && buyScore > holdScore {
		return entities.DirectionBuy
	}
	if sellScore > buyScore && sellScore > holdScore {
		return entities.DirectionSell
	}
	return entities.DirectionHold
}

func (e *DirectionExtractor) countMatches(text string, patterns []*regexp.Regexp) int {
	count := 0
	for _, pattern := range patterns {
		matches := pattern.FindAllString(text, -1)
		count += len(matches)
	}
	return count
}

// DetermineActualDirection determines the actual market direction based on PnL
// Threshold: > 0.5% = UP, < -0.5% = DOWN, otherwise NEUTRAL
func DetermineActualDirection(pnlPercent string) entities.Direction {
	if pnlPercent == "" {
		return entities.DirectionNeutral
	}

	pnl, ok := new(big.Rat).SetString(pnlPercent)
	if !ok {
		return entities.DirectionNeutral
	}

	threshold := big.NewRat(1, 2) // 0.5
	negThreshold := big.NewRat(-1, 2)

	if pnl.Cmp(threshold) > 0 {
		return entities.DirectionUp
	}
	if pnl.Cmp(negThreshold) < 0 {
		return entities.DirectionDown
	}
	return entities.DirectionNeutral
}

// IsCorrect checks if the prediction was correct based on actual outcome
func IsCorrect(predicted, actual entities.Direction) bool {
	switch predicted {
	case entities.DirectionBuy:
		return actual == entities.DirectionUp
	case entities.DirectionSell:
		return actual == entities.DirectionDown
	case entities.DirectionHold:
		return actual == entities.DirectionNeutral
	}
	return false
}

func max(values ...int) int {
	m := values[0]
	for _, v := range values[1:] {
		if v > m {
			m = v
		}
	}
	return m
}
