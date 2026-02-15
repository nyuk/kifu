This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: **/*.go
- Files matching these patterns are excluded: **/*_test.go, **/testdata/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
cmd/
  main.go
internal/
  app/
    app.go
  domain/
    entities/
      ai_opinion_accuracy.go
      ai_opinion.go
      ai_provider.go
      alert_rule.go
      alert.go
      bubble.go
      exchange_credential.go
      guided_review.go
      manual_position.go
      notification.go
      outcome.go
      refresh_token.go
      review_note.go
      run.go
      subscription.go
      summary_pack.go
      trade_event.go
      trade_safety_review.go
      trade_sync_state.go
      trade.go
      user_ai_key.go
      user_symbol.go
      user.go
    repositories/
      ai_opinion_accuracy_repository.go
      ai_opinion_repository.go
      ai_provider_repository.go
      alert_repository.go
      alert_rule_repository.go
      bubble_repository.go
      exchange_credential_repository.go
      guided_review_repository.go
      manual_position_repository.go
      notification_repository.go
      outcome_repository.go
      portfolio_repository.go
      refresh_token_repository.go
      review_note_repository.go
      run_repository.go
      subscription_repository.go
      summary_pack_repository.go
      trade_repository.go
      trade_safety_review_repository.go
      trade_sync_state_repository.go
      user_ai_key_repository.go
      user_repository.go
      user_symbol_repository.go
  infrastructure/
    auth/
      jwt.go
      password.go
    crypto/
      aes.go
    database/
      postgres.go
    notification/
      sender.go
      telegram.go
    repositories/
      ai_opinion_accuracy_repository_impl.go
      ai_opinion_repository_impl.go
      ai_provider_repository_impl.go
      alert_repository_impl.go
      alert_rule_repository_impl.go
      bubble_repository_impl.go
      exchange_credential_repository_impl.go
      guided_review_repository_impl.go
      manual_position_repository_impl.go
      notification_repository_impl.go
      outcome_repository_impl.go
      portfolio_repository_impl.go
      refresh_token_repository_impl.go
      review_note_repository_impl.go
      run_repository_impl.go
      subscription_repository_impl.go
      summary_pack_repository_impl.go
      trade_repository_impl.go
      trade_safety_review_repository_impl.go
      trade_sync_state_repository_impl.go
      user_ai_key_repository_impl.go
      user_repository_impl.go
      user_symbol_repository_impl.go
  interfaces/
    http/
      handlers/
        ai_handler.go
        alert_notification_handler.go
        alert_rule_handler.go
        auth_handler.go
        bubble_handler.go
        connection_handler.go
        exchange_handler.go
        export_handler.go
        guided_review_handler.go
        helpers.go
        import_handler.go
        manual_position_handler.go
        market_handler.go
        note_handler.go
        notification_handler.go
        outcome_handler.go
        pack_handler.go
        portfolio_handler.go
        review_handler.go
        safety_handler.go
        sim_report_handler.go
        similar_handler.go
        trade_handler.go
        user_handler.go
      middleware/
        rate_limit.go
      routes.go
  jobs/
    accuracy_calculator.go
    alert_monitor.go
    alert_outcome_calc.go
    outcome_calculator.go
    position_calculator.go
    quota_reset.go
    trade_poller.go
  services/
    alert_briefing_service.go
    direction_extractor.go
    summary_pack_service.go
scripts/
  seed_trades/
    main.go
  seed_dummy.go
```

# Files

## File: cmd/main.go
```go
package main

import (
	"log"

	"github.com/moneyvessel/kifu/internal/app"
)

func main() {
	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
```

## File: internal/app/app.go
```go
package app

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	cryptoutil "github.com/moneyvessel/kifu/internal/infrastructure/crypto"
	"github.com/moneyvessel/kifu/internal/infrastructure/database"
	"github.com/moneyvessel/kifu/internal/infrastructure/notification"
	"github.com/moneyvessel/kifu/internal/infrastructure/repositories"
	"github.com/moneyvessel/kifu/internal/interfaces/http"
	"github.com/moneyvessel/kifu/internal/jobs"
	"github.com/moneyvessel/kifu/internal/services"
)

func Run() error {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return fmt.Errorf("JWT_SECRET environment variable is required")
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return fmt.Errorf("DATABASE_URL environment variable is required")
	}

	encKey, err := cryptoutil.LoadKeyFromEnv("KIFU_ENC_KEY")
	if err != nil {
		return fmt.Errorf("KIFU_ENC_KEY environment variable is required: %w", err)
	}

	pool, err := database.NewPostgresPool(databaseURL)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer pool.Close()

	userRepo := repositories.NewUserRepository(pool)
	refreshTokenRepo := repositories.NewRefreshTokenRepository(pool)
	subscriptionRepo := repositories.NewSubscriptionRepository(pool)
	exchangeRepo := repositories.NewExchangeCredentialRepository(pool)
	userSymbolRepo := repositories.NewUserSymbolRepository(pool)
	bubbleRepo := repositories.NewBubbleRepository(pool)
	tradeRepo := repositories.NewTradeRepository(pool)
	tradeSyncRepo := repositories.NewTradeSyncStateRepository(pool)
	runRepo := repositories.NewRunRepository(pool)
	summaryPackRepo := repositories.NewSummaryPackRepository(pool)
	aiProviderRepo := repositories.NewAIProviderRepository(pool)
	aiOpinionRepo := repositories.NewAIOpinionRepository(pool)
	userAIKeyRepo := repositories.NewUserAIKeyRepository(pool)
	outcomeRepo := repositories.NewOutcomeRepository(pool)
	accuracyRepo := repositories.NewAIOpinionAccuracyRepository(pool)
	noteRepo := repositories.NewReviewNoteRepository(pool)
	alertRuleRepo := repositories.NewAlertRuleRepository(pool)
	alertRepo := repositories.NewAlertRepository(pool)
	alertBriefingRepo := repositories.NewAlertBriefingRepository(pool)
	alertDecisionRepo := repositories.NewAlertDecisionRepository(pool)
	alertOutcomeRepo := repositories.NewAlertOutcomeRepository(pool)
	channelRepo := repositories.NewNotificationChannelRepository(pool)
	verifyCodeRepo := repositories.NewTelegramVerifyCodeRepository(pool)
	portfolioRepo := repositories.NewPortfolioRepository(pool)
	manualPositionRepo := repositories.NewManualPositionRepository(pool)
	safetyRepo := repositories.NewTradeSafetyReviewRepository(pool)
	guidedReviewRepo := repositories.NewGuidedReviewRepository(pool)
	poller := jobs.NewTradePoller(pool, exchangeRepo, userSymbolRepo, tradeSyncRepo, portfolioRepo, encKey)

	// Telegram sender (optional - only if TELEGRAM_BOT_TOKEN is set)
	var tgSender *notification.TelegramSender
	tgBotToken := strings.TrimSpace(os.Getenv("TELEGRAM_BOT_TOKEN"))
	tgBotUsername := strings.TrimSpace(os.Getenv("TELEGRAM_BOT_USERNAME"))
	if tgBotToken != "" {
		tgSender = notification.NewTelegramSender(tgBotToken, channelRepo)
	}

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			})
		},
	})

	corsOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "http://localhost:5173,http://localhost:3000"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowHeaders:     "Content-Type,Authorization,Origin,Accept",
		AllowCredentials: true,
	}))

	app.Use(func(c *fiber.Ctx) error {
		path := c.Path()
		if path == "/health" ||
			strings.HasPrefix(path, "/api/v1/auth/") ||
			path == "/api/v1/webhook/telegram" ||
			path == "/api/v1/market/klines" {
			return c.Next()
		}

		return jwtware.New(jwtware.Config{
			SigningKey:  jwtware.SigningKey{Key: []byte(jwtSecret)},
			TokenLookup: "header:Authorization",
			AuthScheme:  "Bearer",
			ErrorHandler: func(c *fiber.Ctx, err error) error {
				return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED"})
			},
			SuccessHandler: func(c *fiber.Ctx) error {
				token := c.Locals("user").(*jwt.Token)
				claims := token.Claims.(jwt.MapClaims)
				userIDStr := claims["sub"].(string)
				userID, err := uuid.Parse(userIDStr)
				if err != nil {
					return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED"})
				}
				c.Locals("userID", userID)
				return c.Next()
			},
		})(c)
	})

	summaryPackService := services.NewSummaryPackService(tradeRepo)

	http.RegisterRoutes(
		app,
		pool,
		userRepo,
		refreshTokenRepo,
		subscriptionRepo,
		exchangeRepo,
		userSymbolRepo,
		bubbleRepo,
		tradeRepo,
		aiOpinionRepo,
		aiProviderRepo,
		userAIKeyRepo,
		outcomeRepo,
		accuracyRepo,
		noteRepo,
		alertRuleRepo,
		alertRepo,
		alertBriefingRepo,
		alertDecisionRepo,
		alertOutcomeRepo,
		channelRepo,
		verifyCodeRepo,
		tgSender,
		tgBotUsername,
		portfolioRepo,
		manualPositionRepo,
		safetyRepo,
		guidedReviewRepo,
		poller,
		encKey,
		jwtSecret,
		runRepo,
		summaryPackRepo,
		summaryPackService,
	)

	go poller.Start(context.Background())

	quotaReset := jobs.NewQuotaResetJob(subscriptionRepo)
	quotaReset.Start(context.Background())

	outcomeCalcEnabled := !strings.EqualFold(strings.TrimSpace(os.Getenv("OUTCOME_CALC_ENABLED")), "false")
	if outcomeCalcEnabled {
		outcomes := jobs.NewOutcomeCalculator(outcomeRepo)
		outcomes.Start(context.Background())
	} else {
		log.Println("outcome calc: disabled by OUTCOME_CALC_ENABLED=false")
	}

	accuracyCalc := jobs.NewAccuracyCalculator(outcomeRepo, aiOpinionRepo, accuracyRepo)
	accuracyCalc.Start(context.Background())

	// Alert briefing service
	var briefingSender notification.Sender
	if tgSender != nil {
		briefingSender = tgSender
	}
	briefingService := services.NewAlertBriefingService(
		alertRepo, alertBriefingRepo, aiProviderRepo, userAIKeyRepo,
		channelRepo, tradeRepo, encKey, briefingSender,
	)

	// Alert monitor job
	alertMonitor := jobs.NewAlertMonitor(alertRuleRepo, alertRepo, briefingService.HandleTrigger)
	alertMonitor.Start(context.Background())

	// Alert outcome calculator job
	alertOutcomeCalc := jobs.NewAlertOutcomeCalculator(alertOutcomeRepo)
	alertOutcomeCalc.Start(context.Background())

	positionCalc := jobs.NewPositionCalculator(portfolioRepo)
	positionCalc.Start(context.Background())

	log.Printf("Server starting on port %s", port)
	return app.Listen(":" + port)
}
```

## File: internal/domain/entities/ai_opinion_accuracy.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type Direction string

const (
	DirectionBuy     Direction = "BUY"
	DirectionSell    Direction = "SELL"
	DirectionHold    Direction = "HOLD"
	DirectionUp      Direction = "UP"
	DirectionDown    Direction = "DOWN"
	DirectionNeutral Direction = "NEUTRAL"
)

type AIOpinionAccuracy struct {
	ID                 uuid.UUID `json:"id"`
	OpinionID          uuid.UUID `json:"opinion_id"`
	OutcomeID          uuid.UUID `json:"outcome_id"`
	BubbleID           uuid.UUID `json:"bubble_id"`
	Provider           string    `json:"provider"`
	Period             string    `json:"period"`
	PredictedDirection Direction `json:"predicted_direction"`
	ActualDirection    Direction `json:"actual_direction"`
	IsCorrect          bool      `json:"is_correct"`
	CreatedAt          time.Time `json:"created_at"`
}
```

## File: internal/domain/entities/ai_opinion.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type AIOpinion struct {
	ID             uuid.UUID `json:"id"`
	BubbleID       uuid.UUID `json:"bubble_id"`
	Provider       string    `json:"provider"`
	Model          string    `json:"model"`
	PromptTemplate string    `json:"prompt_template"`
	Response       string    `json:"response"`
	TokensUsed     *int      `json:"tokens_used,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}
```

## File: internal/domain/entities/ai_provider.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type AIProvider struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Model     string    `json:"model"`
	Enabled   bool      `json:"enabled"`
	IsDefault bool      `json:"is_default"`
	CreatedAt time.Time `json:"created_at"`
}
```

## File: internal/domain/entities/alert_rule.go
```go
package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type RuleType string

const (
	RuleTypePriceChange    RuleType = "price_change"
	RuleTypeMACross        RuleType = "ma_cross"
	RuleTypePriceLevel     RuleType = "price_level"
	RuleTypeVolatilitySpike RuleType = "volatility_spike"
)

type AlertRule struct {
	ID               uuid.UUID       `json:"id"`
	UserID           uuid.UUID       `json:"user_id"`
	Name             string          `json:"name"`
	Symbol           string          `json:"symbol"`
	RuleType         RuleType        `json:"rule_type"`
	Config           json.RawMessage `json:"config"`
	CooldownMinutes  int             `json:"cooldown_minutes"`
	Enabled          bool            `json:"enabled"`
	LastTriggeredAt  *time.Time      `json:"last_triggered_at,omitempty"`
	LastCheckState   json.RawMessage `json:"last_check_state,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type PriceChangeConfig struct {
	Direction      string `json:"direction"`       // "drop" | "rise" | "both"
	ThresholdType  string `json:"threshold_type"`  // "absolute" | "percent"
	ThresholdValue string `json:"threshold_value"`
	Reference      string `json:"reference"`       // "24h" | "1h" | "4h"
}

type MACrossConfig struct {
	MAPeriod    int    `json:"ma_period"`
	MATimeframe string `json:"ma_timeframe"`
	Direction   string `json:"direction"` // "below" | "above"
}

type PriceLevelConfig struct {
	Price     string `json:"price"`
	Direction string `json:"direction"` // "above" | "below"
}

type VolatilitySpikeConfig struct {
	Timeframe  string `json:"timeframe"`
	Multiplier string `json:"multiplier"`
}

type CheckState struct {
	LastPrice    string `json:"last_price,omitempty"`
	WasAboveMA   *bool  `json:"was_above_ma,omitempty"`
	WasAboveLevel *bool `json:"was_above_level,omitempty"`
}
```

## File: internal/domain/entities/alert.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type AlertSeverity string

const (
	AlertSeverityNormal AlertSeverity = "normal"
	AlertSeverityUrgent AlertSeverity = "urgent"
)

type AlertStatus string

const (
	AlertStatusPending AlertStatus = "pending"
	AlertStatusBriefed AlertStatus = "briefed"
	AlertStatusDecided AlertStatus = "decided"
	AlertStatusExpired AlertStatus = "expired"
)

type Alert struct {
	ID           uuid.UUID     `json:"id"`
	UserID       uuid.UUID     `json:"user_id"`
	RuleID       uuid.UUID     `json:"rule_id"`
	Symbol       string        `json:"symbol"`
	TriggerPrice string        `json:"trigger_price"`
	TriggerReason string       `json:"trigger_reason"`
	Severity     AlertSeverity `json:"severity"`
	Status       AlertStatus   `json:"status"`
	NotifiedAt   *time.Time    `json:"notified_at,omitempty"`
	CreatedAt    time.Time     `json:"created_at"`
}

type AlertBriefing struct {
	ID        uuid.UUID `json:"id"`
	AlertID   uuid.UUID `json:"alert_id"`
	Provider  string    `json:"provider"`
	Model     string    `json:"model"`
	Prompt    string    `json:"prompt"`
	Response  string    `json:"response"`
	TokensUsed *int     `json:"tokens_used,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type DecisionAction string

const (
	DecisionBuy    DecisionAction = "buy"
	DecisionSell   DecisionAction = "sell"
	DecisionHold   DecisionAction = "hold"
	DecisionClose  DecisionAction = "close"
	DecisionReduce DecisionAction = "reduce"
	DecisionAdd    DecisionAction = "add"
	DecisionIgnore DecisionAction = "ignore"
)

type Confidence string

const (
	ConfidenceHigh   Confidence = "high"
	ConfidenceMedium Confidence = "medium"
	ConfidenceLow    Confidence = "low"
)

type AlertDecision struct {
	ID         uuid.UUID      `json:"id"`
	AlertID    uuid.UUID      `json:"alert_id"`
	UserID     uuid.UUID      `json:"user_id"`
	Action     DecisionAction `json:"action"`
	Memo       *string        `json:"memo,omitempty"`
	Confidence *Confidence    `json:"confidence,omitempty"`
	ExecutedAt *time.Time     `json:"executed_at,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
}

type AlertOutcome struct {
	ID             uuid.UUID `json:"id"`
	AlertID        uuid.UUID `json:"alert_id"`
	DecisionID     uuid.UUID `json:"decision_id"`
	Period         string    `json:"period"`
	ReferencePrice string    `json:"reference_price"`
	OutcomePrice   string    `json:"outcome_price"`
	PnLPercent     string    `json:"pnl_percent"`
	CalculatedAt   time.Time `json:"calculated_at"`
}
```

## File: internal/domain/entities/bubble.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type Bubble struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	Symbol     string    `json:"symbol"`
	Timeframe  string    `json:"timeframe"`
	CandleTime time.Time `json:"candle_time"`
	Price      string    `json:"price"`
	BubbleType string    `json:"bubble_type"`
	AssetClass *string   `json:"asset_class,omitempty"`
	VenueName  *string   `json:"venue_name,omitempty"`
	Memo       *string   `json:"memo,omitempty"`
	Tags       []string  `json:"tags,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}
```

## File: internal/domain/entities/exchange_credential.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type ExchangeCredential struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"user_id"`
	Exchange     string    `json:"exchange"`
	APIKeyEnc    string    `json:"-"`
	APISecretEnc string    `json:"-"`
	APIKeyLast4  string    `json:"api_key_last4"`
	IsValid      bool      `json:"is_valid"`
	CreatedAt    time.Time `json:"created_at"`
}
```

## File: internal/domain/entities/guided_review.go
```go
package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// GuidedReview status constants
const (
	GuidedReviewStatusPending    = "pending"
	GuidedReviewStatusInProgress = "in_progress"
	GuidedReviewStatusCompleted  = "completed"
	GuidedReviewStatusSkipped    = "skipped"
)

// Intent constants (Layer 1)
const (
	IntentTechnicalSignal = "technical_signal"
	IntentNewsEvent       = "news_event"
	IntentEmotional       = "emotional"
	IntentPlannedRegular  = "planned_regular"
	IntentOther           = "other"
)

// Emotion constants (Layer 2)
const (
	EmotionGRConfident    = "confident"
	EmotionGRHalfDoubtful = "half_doubtful"
	EmotionGRAnxious      = "anxious"
	EmotionGRExcited      = "excited"
	EmotionGRCalm         = "calm"
	EmotionGRNervous      = "nervous"
	EmotionGRFomo         = "fomo"
	EmotionGRRevengeTrade = "revenge_trade"
	EmotionGRAsPlanned    = "as_planned"
)

// PatternMatch constants (Layer 3)
const (
	PatternSameDecision  = "same_decision"
	PatternAdjustTiming  = "adjust_timing"
	PatternReduceSize    = "reduce_size"
	PatternWouldNotTrade = "would_not_trade"
	PatternChangeSlTp    = "change_sl_tp"
)

type GuidedReview struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	ReviewDate  string     `json:"review_date"`
	Status      string     `json:"status"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type GuidedReviewItem struct {
	ID           uuid.UUID       `json:"id"`
	ReviewID     uuid.UUID       `json:"review_id"`
	TradeID      *uuid.UUID      `json:"trade_id,omitempty"`
	BundleKey    *string         `json:"bundle_key,omitempty"`
	Symbol       string          `json:"symbol"`
	Side         *string         `json:"side,omitempty"`
	PnL          *float64        `json:"pnl,omitempty"`
	TradeCount   int             `json:"trade_count"`
	Intent       *string         `json:"intent,omitempty"`
	Emotions     json.RawMessage `json:"emotions,omitempty"`
	PatternMatch *string         `json:"pattern_match,omitempty"`
	Memo         *string         `json:"memo,omitempty"`
	OrderIndex   int             `json:"order_index"`
	CreatedAt    time.Time       `json:"created_at"`
}

type UserStreak struct {
	UserID         uuid.UUID `json:"user_id"`
	CurrentStreak  int       `json:"current_streak"`
	LongestStreak  int       `json:"longest_streak"`
	LastReviewDate *string   `json:"last_review_date,omitempty"`
	UpdatedAt      time.Time `json:"updated_at"`
}
```

## File: internal/domain/entities/manual_position.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type ManualPosition struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	Symbol       string
	AssetClass   string
	Venue        *string
	PositionSide string
	Size         *string
	EntryPrice   *string
	StopLoss     *string
	TakeProfit   *string
	Leverage     *string
	Strategy     *string
	Memo         *string
	Status       string
	OpenedAt     *time.Time
	ClosedAt     *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
```

## File: internal/domain/entities/notification.go
```go
package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ChannelType string

const (
	ChannelTelegram ChannelType = "telegram"
	ChannelWebPush  ChannelType = "web_push"
)

type NotificationChannel struct {
	ID          uuid.UUID       `json:"id"`
	UserID      uuid.UUID       `json:"user_id"`
	ChannelType ChannelType     `json:"channel_type"`
	Config      json.RawMessage `json:"config"`
	Enabled     bool            `json:"enabled"`
	Verified    bool            `json:"verified"`
	CreatedAt   time.Time       `json:"created_at"`
}

type TelegramConfig struct {
	ChatID int64 `json:"chat_id"`
}

type TelegramVerifyCode struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expires_at"`
	Used      bool      `json:"used"`
	CreatedAt time.Time `json:"created_at"`
}
```

## File: internal/domain/entities/outcome.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type Outcome struct {
	ID             uuid.UUID `json:"id"`
	BubbleID       uuid.UUID `json:"bubble_id"`
	Period         string    `json:"period"`
	ReferencePrice string    `json:"reference_price"`
	OutcomePrice   string    `json:"outcome_price"`
	PnLPercent     string    `json:"pnl_percent"`
	CalculatedAt   time.Time `json:"calculated_at"`
}
```

## File: internal/domain/entities/refresh_token.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type RefreshToken struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"user_id"`
	TokenHash     string     `json:"-"`
	ExpiresAt     time.Time  `json:"expires_at"`
	CreatedAt     time.Time  `json:"created_at"`
	RevokedAt     *time.Time `json:"revoked_at,omitempty"`
	LastUsedAt    *time.Time `json:"last_used_at,omitempty"`
	ReplacedBy    *uuid.UUID `json:"replaced_by,omitempty"`
	RevokedReason *string    `json:"revoked_reason,omitempty"`
}
```

## File: internal/domain/entities/review_note.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type Emotion string

const (
	EmotionGreedy     Emotion = "greedy"
	EmotionFearful    Emotion = "fearful"
	EmotionConfident  Emotion = "confident"
	EmotionUncertain  Emotion = "uncertain"
	EmotionCalm       Emotion = "calm"
	EmotionFrustrated Emotion = "frustrated"
)

type ReviewNote struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"user_id"`
	BubbleID      *uuid.UUID `json:"bubble_id,omitempty"`
	Title         string     `json:"title"`
	Content       string     `json:"content"`
	Tags          []string   `json:"tags,omitempty"`
	LessonLearned string     `json:"lesson_learned,omitempty"`
	Emotion       Emotion    `json:"emotion,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}
```

## File: internal/domain/entities/run.go
```go
package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Run struct {
	RunID      uuid.UUID       `json:"run_id"`
	UserID     uuid.UUID       `json:"user_id"`
	RunType    string          `json:"run_type"`
	Status     string          `json:"status"`
	StartedAt  time.Time       `json:"started_at"`
	FinishedAt *time.Time      `json:"finished_at,omitempty"`
	Meta       json.RawMessage `json:"meta,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
}
```

## File: internal/domain/entities/subscription.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type Subscription struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	Tier             string     `json:"tier"`
	AIQuotaRemaining int        `json:"ai_quota_remaining"`
	AIQuotaLimit     int        `json:"ai_quota_limit"`
	LastResetAt      time.Time  `json:"last_reset_at"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
}
```

## File: internal/domain/entities/summary_pack.go
```go
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
```

## File: internal/domain/entities/trade_event.go
```go
package entities

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type TradeEvent struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	AccountID    *uuid.UUID
	VenueID      *uuid.UUID
	InstrumentID *uuid.UUID
	AssetClass   string
	VenueType    string
	EventType    string
	Side         *string
	Qty          *string
	Price        *string
	Fee          *string
	FeeAsset     *string
	ExecutedAt   time.Time
	Source       string
	ExternalID   *string
	Metadata     *json.RawMessage
	DedupeKey    *string
}
```

## File: internal/domain/entities/trade_safety_review.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type TradeSafetyVerdict string

const (
	TradeSafetyVerdictIntended TradeSafetyVerdict = "intended"
	TradeSafetyVerdictMistake  TradeSafetyVerdict = "mistake"
	TradeSafetyVerdictUnsure   TradeSafetyVerdict = "unsure"
)

type TradeSafetyReview struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	TradeID      *uuid.UUID
	TradeEventID *uuid.UUID
	Verdict      TradeSafetyVerdict
	Note         *string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
```

## File: internal/domain/entities/trade_sync_state.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type TradeSyncState struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Exchange    string    `json:"exchange"`
	Symbol      string    `json:"symbol"`
	LastTradeID int64     `json:"last_trade_id"`
	LastSyncAt  time.Time `json:"last_sync_at"`
}
```

## File: internal/domain/entities/trade.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type Trade struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	BubbleID       *uuid.UUID `json:"bubble_id,omitempty"`
	Exchange       string     `json:"exchange"`
	BinanceTradeID int64      `json:"binance_trade_id"`
	Symbol         string     `json:"symbol"`
	Side           string     `json:"side"`
	PositionSide   *string    `json:"position_side,omitempty"`
	OpenClose      *string    `json:"open_close,omitempty"`
	ReduceOnly     *bool      `json:"reduce_only,omitempty"`
	Quantity       string     `json:"quantity"`
	Price          string     `json:"price"`
	RealizedPnL    *string    `json:"realized_pnl,omitempty"`
	TradeTime      time.Time  `json:"trade_time"`
}
```

## File: internal/domain/entities/user_ai_key.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type UserAIKey struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Provider    string    `json:"provider"`
	APIKeyEnc   string    `json:"-"`
	APIKeyLast4 string    `json:"api_key_last4"`
	CreatedAt   time.Time `json:"created_at"`
}
```

## File: internal/domain/entities/user_symbol.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type UserSymbol struct {
	ID               uuid.UUID `json:"id"`
	UserID           uuid.UUID `json:"user_id"`
	Symbol           string    `json:"symbol"`
	TimeframeDefault string    `json:"timeframe_default"`
	CreatedAt        time.Time `json:"created_at"`
}
```

## File: internal/domain/entities/user.go
```go
package entities

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID            uuid.UUID `json:"id"`
	Email         string    `json:"email"`
	PasswordHash  string    `json:"-"`
	Name          string    `json:"name"`
	AIAllowlisted bool      `json:"ai_allowlisted"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
```

## File: internal/domain/repositories/ai_opinion_accuracy_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type ProviderAccuracyStats struct {
	Provider    string                                `json:"provider"`
	Total       int                                   `json:"total"`
	Evaluated   int                                   `json:"evaluated"`
	Correct     int                                   `json:"correct"`
	Accuracy    float64                               `json:"accuracy"`
	ByDirection map[entities.Direction]DirectionStats `json:"by_direction"`
}

type DirectionStats struct {
	Predicted int     `json:"predicted"`
	Correct   int     `json:"correct"`
	Accuracy  float64 `json:"accuracy"`
}

type AIOpinionAccuracyRepository interface {
	Create(ctx context.Context, accuracy *entities.AIOpinionAccuracy) error
	GetByBubbleID(ctx context.Context, bubbleID uuid.UUID) ([]*entities.AIOpinionAccuracy, error)
	GetByOpinionAndOutcome(ctx context.Context, opinionID, outcomeID uuid.UUID) (*entities.AIOpinionAccuracy, error)
	ExistsByOpinionAndOutcome(ctx context.Context, opinionID, outcomeID uuid.UUID) (bool, error)
	GetProviderStats(ctx context.Context, userID uuid.UUID, period string, outcomePeriod string, assetClass string, venueName string) (map[string]*ProviderAccuracyStats, error)
	GetTotalStats(ctx context.Context, userID uuid.UUID, period string, outcomePeriod string, assetClass string, venueName string) (total int, evaluated int, err error)
}
```

## File: internal/domain/repositories/ai_opinion_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type AIOpinionRepository interface {
	Create(ctx context.Context, opinion *entities.AIOpinion) error
	ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.AIOpinion, error)
}
```

## File: internal/domain/repositories/ai_provider_repository.go
```go
package repositories

import (
	"context"

	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type AIProviderRepository interface {
	ListEnabled(ctx context.Context) ([]*entities.AIProvider, error)
	GetByName(ctx context.Context, name string) (*entities.AIProvider, error)
}
```

## File: internal/domain/repositories/alert_repository.go
```go
package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type AlertRepository interface {
	Create(ctx context.Context, alert *entities.Alert) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Alert, error)
	ListByUser(ctx context.Context, userID uuid.UUID, status *entities.AlertStatus, limit, offset int) ([]*entities.Alert, int, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status entities.AlertStatus) error
	SetNotified(ctx context.Context, id uuid.UUID) error
	ExpireOlderThan(ctx context.Context, before time.Time) (int, error)
}

type AlertBriefingRepository interface {
	Create(ctx context.Context, briefing *entities.AlertBriefing) error
	ListByAlert(ctx context.Context, alertID uuid.UUID) ([]*entities.AlertBriefing, error)
}

type AlertDecisionRepository interface {
	Create(ctx context.Context, decision *entities.AlertDecision) error
	GetByAlert(ctx context.Context, alertID uuid.UUID) (*entities.AlertDecision, error)
}

type AlertOutcomeRepository interface {
	CreateIfNotExists(ctx context.Context, outcome *entities.AlertOutcome) (bool, error)
	ListByAlert(ctx context.Context, alertID uuid.UUID) ([]*entities.AlertOutcome, error)
	ListPendingDecisions(ctx context.Context, period string, cutoff time.Time, limit int) ([]*PendingAlertDecision, error)
}

type PendingAlertDecision struct {
	AlertID        uuid.UUID
	DecisionID     uuid.UUID
	Symbol         string
	TriggerPrice   string
	DecisionTime   time.Time
}
```

## File: internal/domain/repositories/alert_rule_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type AlertRuleRepository interface {
	Create(ctx context.Context, rule *entities.AlertRule) error
	Update(ctx context.Context, rule *entities.AlertRule) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.AlertRule, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.AlertRule, error)
	ListActiveBySymbol(ctx context.Context, symbol string) ([]*entities.AlertRule, error)
	ListAllActive(ctx context.Context) ([]*entities.AlertRule, error)
	SetEnabled(ctx context.Context, id, userID uuid.UUID, enabled bool) error
	UpdateLastTriggered(ctx context.Context, id uuid.UUID, checkState []byte) error
	UpdateCheckState(ctx context.Context, id uuid.UUID, checkState []byte) error
}
```

## File: internal/domain/repositories/bubble_repository.go
```go
package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type BubbleRepository interface {
	Create(ctx context.Context, bubble *entities.Bubble) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Bubble, error)
	List(ctx context.Context, userID uuid.UUID, filter BubbleFilter) ([]*entities.Bubble, int, error)
	ListByUser(ctx context.Context, userID uuid.UUID, limit int, offset int) ([]*entities.Bubble, int, error)
	ListSimilar(ctx context.Context, userID uuid.UUID, symbol string, tags []string, excludeID *uuid.UUID, period string, limit int, offset int) ([]*BubbleWithOutcome, int, error)
	SummarySimilar(ctx context.Context, userID uuid.UUID, symbol string, tags []string, excludeID *uuid.UUID, period string) (*SimilarSummary, error)
	Update(ctx context.Context, bubble *entities.Bubble) error
	DeleteByIDAndUser(ctx context.Context, id uuid.UUID, userID uuid.UUID) (bool, error)
	GetReviewStats(ctx context.Context, userID uuid.UUID, period string, symbol string, tag string, assetClass string, venueName string) (*ReviewStats, error)
	GetCalendarData(ctx context.Context, userID uuid.UUID, from time.Time, to time.Time, assetClass string, venueName string) (map[string]CalendarDay, error)
}

type BubbleFilter struct {
	Symbol string
	Tags   []string
	From   *time.Time
	To     *time.Time
	Limit  int
	Offset int
	Sort   string
}

type BubbleWithOutcome struct {
	Bubble  *entities.Bubble
	Outcome *entities.Outcome
}

type SimilarSummary struct {
	Wins   int
	Losses int
	AvgPnL *string
}

type ReviewStats struct {
	Period             string                 `json:"period"`
	TotalBubbles       int                    `json:"total_bubbles"`
	BubblesWithOutcome int                    `json:"bubbles_with_outcome"`
	Overall            OverallReviewStats     `json:"overall"`
	ByPeriod           map[string]PeriodStats `json:"by_period"`
	ByTag              map[string]TagStats    `json:"by_tag"`
	BySymbol           map[string]SymbolStats `json:"by_symbol"`
}

type OverallReviewStats struct {
	WinRate  float64 `json:"win_rate"`
	AvgPnL   string  `json:"avg_pnl"`
	TotalPnL string  `json:"total_pnl"`
	MaxGain  string  `json:"max_gain"`
	MaxLoss  string  `json:"max_loss"`
}

type PeriodStats struct {
	WinRate float64 `json:"win_rate"`
	AvgPnL  string  `json:"avg_pnl"`
	Count   int     `json:"count"`
}

type TagStats struct {
	Count   int     `json:"count"`
	WinRate float64 `json:"win_rate"`
	AvgPnL  string  `json:"avg_pnl"`
}

type SymbolStats struct {
	Count   int     `json:"count"`
	WinRate float64 `json:"win_rate"`
	AvgPnL  string  `json:"avg_pnl"`
}

type CalendarDay struct {
	BubbleCount int    `json:"bubble_count"`
	WinCount    int    `json:"win_count"`
	LossCount   int    `json:"loss_count"`
	TotalPnL    string `json:"total_pnl"`
}
```

## File: internal/domain/repositories/exchange_credential_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type ExchangeCredentialRepository interface {
	Create(ctx context.Context, cred *entities.ExchangeCredential) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.ExchangeCredential, error)
	GetByUserAndExchange(ctx context.Context, userID uuid.UUID, exchange string) (*entities.ExchangeCredential, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.ExchangeCredential, error)
	ListValid(ctx context.Context, exchange string) ([]*entities.ExchangeCredential, error)
	Update(ctx context.Context, cred *entities.ExchangeCredential) error
	DeleteByIDAndUser(ctx context.Context, id uuid.UUID, userID uuid.UUID) (bool, error)
}
```

## File: internal/domain/repositories/guided_review_repository.go
```go
package repositories

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type SubmitItemInput struct {
	Intent       string          `json:"intent"`
	Emotions     json.RawMessage `json:"emotions"`
	PatternMatch string          `json:"pattern_match"`
	Memo         string          `json:"memo"`
}

type GuidedReviewRepository interface {
	GetOrCreateToday(ctx context.Context, userID uuid.UUID, date string) (*entities.GuidedReview, []*entities.GuidedReviewItem, error)
	SubmitItem(ctx context.Context, userID uuid.UUID, itemID uuid.UUID, input SubmitItemInput) error
	CompleteReview(ctx context.Context, userID uuid.UUID, reviewID uuid.UUID) (*entities.UserStreak, error)
	GetStreak(ctx context.Context, userID uuid.UUID) (*entities.UserStreak, error)
	ListReviews(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*entities.GuidedReview, int, error)
}
```

## File: internal/domain/repositories/manual_position_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type ManualPositionFilter struct {
	Status string
}

type ManualPositionRepository interface {
	List(ctx context.Context, userID uuid.UUID, filter ManualPositionFilter) ([]*entities.ManualPosition, error)
	Create(ctx context.Context, position *entities.ManualPosition) error
	Update(ctx context.Context, position *entities.ManualPosition) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
	GetByID(ctx context.Context, id, userID uuid.UUID) (*entities.ManualPosition, error)
}
```

## File: internal/domain/repositories/notification_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type NotificationChannelRepository interface {
	Upsert(ctx context.Context, channel *entities.NotificationChannel) error
	GetByUserAndType(ctx context.Context, userID uuid.UUID, channelType entities.ChannelType) (*entities.NotificationChannel, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.NotificationChannel, error)
	DeleteByUserAndType(ctx context.Context, userID uuid.UUID, channelType entities.ChannelType) error
	ListVerifiedByUser(ctx context.Context, userID uuid.UUID) ([]*entities.NotificationChannel, error)
}

type TelegramVerifyCodeRepository interface {
	Create(ctx context.Context, code *entities.TelegramVerifyCode) error
	FindValidCode(ctx context.Context, code string) (*entities.TelegramVerifyCode, error)
	MarkUsed(ctx context.Context, id uuid.UUID) error
}
```

## File: internal/domain/repositories/outcome_repository.go
```go
package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type OutcomeRepository interface {
	CreateIfNotExists(ctx context.Context, outcome *entities.Outcome) (bool, error)
	ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.Outcome, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.Outcome, error)
	ListPending(ctx context.Context, period string, cutoff time.Time, limit int) ([]*PendingOutcomeBubble, error)
	ListRecentWithoutAccuracy(ctx context.Context, since time.Time, limit int) ([]*entities.Outcome, error)
}

type PendingOutcomeBubble struct {
	BubbleID   uuid.UUID
	Symbol     string
	CandleTime time.Time
	Price      string
}
```

## File: internal/domain/repositories/portfolio_repository.go
```go
package repositories

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type TimelineCursor struct {
	Time time.Time
	ID   uuid.UUID
}

type TimelineFilter struct {
	From         *time.Time
	To           *time.Time
	AssetClasses []string
	Venues       []string
	Sources      []string
	EventTypes   []string
	Limit        int
	Cursor       *TimelineCursor
}

type PositionFilter struct {
	From         *time.Time
	To           *time.Time
	AssetClasses []string
	Venues       []string
	Status       string
	Limit        int
}

type TimelineEvent struct {
	ID           uuid.UUID
	ExecutedAt   time.Time
	AssetClass   string
	VenueType    string
	VenueCode    string
	VenueName    string
	Instrument   string
	EventType    string
	Side         *string
	Qty          *string
	Price        *string
	Fee          *string
	FeeAsset     *string
	Source       string
	ExternalID   *string
	Metadata     *json.RawMessage
	AccountLabel *string
}

type PositionSummary struct {
	Instrument     string
	VenueCode      string
	VenueName      string
	AssetClass     string
	VenueType      string
	NetQty         string
	AvgEntry       string
	LastExecutedAt time.Time
	Status         string
	BuyQty         string
	SellQty        string
	BuyNotional    string
	SellNotional   string
	AccountLabel   *string
}

type PortfolioRepository interface {
	UpsertVenue(ctx context.Context, code string, venueType string, displayName string, chain string) (uuid.UUID, error)
	UpsertAccount(ctx context.Context, userID uuid.UUID, venueID uuid.UUID, label string, address *string, source string) (uuid.UUID, error)
	UpsertInstrument(ctx context.Context, assetClass string, baseAsset string, quoteAsset string, symbol string) (uuid.UUID, error)
	UpsertInstrumentMapping(ctx context.Context, instrumentID uuid.UUID, venueID uuid.UUID, venueSymbol string) error
	CreateTradeEvent(ctx context.Context, event *entities.TradeEvent) error
	ListTimeline(ctx context.Context, userID uuid.UUID, filter TimelineFilter) ([]TimelineEvent, error)
	ListPositions(ctx context.Context, userID uuid.UUID, filter PositionFilter) ([]PositionSummary, error)
	RebuildPositions(ctx context.Context, userID uuid.UUID) error
	ListUsersWithEvents(ctx context.Context, limit int) ([]uuid.UUID, error)
	BackfillBubblesFromEvents(ctx context.Context, userID uuid.UUID) (int64, error)
}
```

## File: internal/domain/repositories/refresh_token_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type RefreshTokenRepository interface {
	Create(ctx context.Context, token *entities.RefreshToken) error
	GetByTokenHash(ctx context.Context, tokenHash string) (*entities.RefreshToken, error)
	Update(ctx context.Context, token *entities.RefreshToken) error
	RevokeAllUserTokens(ctx context.Context, userID uuid.UUID, reason string) error
	Delete(ctx context.Context, id uuid.UUID) error
}
```

## File: internal/domain/repositories/review_note_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type ReviewNoteRepository interface {
	Create(ctx context.Context, note *entities.ReviewNote) error
	Update(ctx context.Context, note *entities.ReviewNote) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
	GetByID(ctx context.Context, id, userID uuid.UUID) (*entities.ReviewNote, error)
	ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*entities.ReviewNote, int, error)
	ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.ReviewNote, error)
	PruneAIGeneratedByUser(ctx context.Context, userID uuid.UUID, keep int) error
}
```

## File: internal/domain/repositories/run_repository.go
```go
package repositories

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type RunRepository interface {
	Create(ctx context.Context, userID uuid.UUID, runType string, status string, startedAt time.Time, meta json.RawMessage) (*entities.Run, error)
	GetByID(ctx context.Context, userID uuid.UUID, runID uuid.UUID) (*entities.Run, error)
	UpdateStatus(ctx context.Context, runID uuid.UUID, status string, finishedAt *time.Time, meta json.RawMessage) error
	GetLatestCompletedRun(ctx context.Context, userID uuid.UUID) (*entities.Run, error)
}
```

## File: internal/domain/repositories/subscription_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type SubscriptionRepository interface {
	Create(ctx context.Context, sub *entities.Subscription) error
	GetByUserID(ctx context.Context, userID uuid.UUID) (*entities.Subscription, error)
	ListAll(ctx context.Context) ([]*entities.Subscription, error)
	DecrementQuota(ctx context.Context, userID uuid.UUID, amount int) (bool, error)
	Update(ctx context.Context, sub *entities.Subscription) error
	Delete(ctx context.Context, id uuid.UUID) error
}
```

## File: internal/domain/repositories/summary_pack_repository.go
```go
package repositories

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type SummaryPackRepository interface {
	Create(ctx context.Context, pack *entities.SummaryPack) error
	GetByID(ctx context.Context, userID uuid.UUID, packID uuid.UUID) (*entities.SummaryPack, error)
	GetLatest(ctx context.Context, userID uuid.UUID, rangeValue string) (*entities.SummaryPack, error)
}

type SummaryPackPayloadStore struct {
	PackID                 uuid.UUID
	UserID                 uuid.UUID
	SourceRunID            uuid.UUID
	Range                  string
	SchemaVersion          string
	CalcVersion            string
	ContentHash            string
	ReconciliationStatus   string
	MissingSuspectsCount   int
	DuplicateSuspectsCount int
	NormalizationWarnings  []string
	Payload                json.RawMessage
}
```

## File: internal/domain/repositories/trade_repository.go
```go
package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type TradeFilter struct {
	Symbol   string
	Side     string
	Exchange string
	From     *time.Time
	To       *time.Time
	Limit    int
	Offset   int
	Sort     string
}

type TradeSummary struct {
	TotalTrades      int     `json:"total_trades"`
	BuyCount         int     `json:"buy_count"`
	SellCount        int     `json:"sell_count"`
	TotalVolume      string  `json:"total_volume"`
	RealizedPnLTotal *string `json:"realized_pnl_total"`
	Wins             int     `json:"wins"`
	Losses           int     `json:"losses"`
	Breakeven        int     `json:"breakeven"`
	AveragePnL       *string `json:"average_pnl"`
}

type TradeExchangeSummary struct {
	Exchange         string  `json:"exchange"`
	TradeCount       int     `json:"trade_count"`
	TotalTrades      int     `json:"total_trades"`
	BuyCount         int     `json:"buy_count"`
	SellCount        int     `json:"sell_count"`
	TotalVolume      string  `json:"total_volume"`
	RealizedPnLTotal *string `json:"realized_pnl_total"`
}

type TradeSideSummary struct {
	Side             string  `json:"side"`
	TradeCount       int     `json:"trade_count"`
	TotalTrades      int     `json:"total_trades"`
	TotalVolume      string  `json:"total_volume"`
	RealizedPnLTotal *string `json:"realized_pnl_total"`
}

type TradeSymbolSummary struct {
	Symbol           string  `json:"symbol"`
	TradeCount       int     `json:"trade_count"`
	TotalTrades      int     `json:"total_trades"`
	BuyCount         int     `json:"buy_count"`
	SellCount        int     `json:"sell_count"`
	TotalVolume      string  `json:"total_volume"`
	RealizedPnLTotal *string `json:"realized_pnl_total"`
	Wins             int     `json:"wins"`
	Losses           int     `json:"losses"`
}

type TradeRepository interface {
	Create(ctx context.Context, trade *entities.Trade) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Trade, error)
	List(ctx context.Context, userID uuid.UUID, filter TradeFilter) ([]*entities.Trade, int, error)
	ListByTimeRange(ctx context.Context, userID uuid.UUID, from, to time.Time) ([]*entities.Trade, error)
	ListByUserAndSymbol(ctx context.Context, userID uuid.UUID, symbol string) ([]*entities.Trade, error)
	ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.Trade, error)
	ListUnlinked(ctx context.Context, userID uuid.UUID, limit int) ([]*entities.Trade, error)
	Summary(ctx context.Context, userID uuid.UUID, filter TradeFilter) (TradeSummary, []TradeSideSummary, []TradeSymbolSummary, error)
	SummaryByExchange(ctx context.Context, userID uuid.UUID, filter TradeFilter) ([]TradeExchangeSummary, error)
	SummaryBySide(ctx context.Context, userID uuid.UUID, filter TradeFilter) ([]*TradeSideSummary, error)
	SummaryBySymbol(ctx context.Context, userID uuid.UUID, filter TradeFilter) ([]*TradeSymbolSummary, error)
	UpdateBubbleID(ctx context.Context, tradeID uuid.UUID, bubbleID uuid.UUID) error
	ClearBubbleID(ctx context.Context, tradeID uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
	BackfillBubbleMetadata(ctx context.Context, userID uuid.UUID) (int64, error)
}
```

## File: internal/domain/repositories/trade_safety_review_repository.go
```go
package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

var ErrSafetyTargetNotFound = errors.New("safety target not found")

type DailySafetyFilter struct {
	From        time.Time
	To          time.Time
	AssetClass  string
	Venue       string
	OnlyPending bool
	Limit       int
}

type DailySafetyItem struct {
	TargetType string
	TargetID   uuid.UUID
	ExecutedAt time.Time
	AssetClass string
	Venue      string
	VenueName  string
	Symbol     string
	Side       *string
	Qty        *string
	Price      *string
	Source     string
	Verdict    *string
	Note       *string
	ReviewedAt *time.Time
}

type DailySafetySummary struct {
	Total    int
	Reviewed int
	Pending  int
}

type UpsertSafetyReviewInput struct {
	TargetType string
	TargetID   uuid.UUID
	Verdict    entities.TradeSafetyVerdict
	Note       *string
}

type TradeSafetyReviewRepository interface {
	ListDaily(ctx context.Context, userID uuid.UUID, filter DailySafetyFilter) ([]DailySafetyItem, DailySafetySummary, error)
	Upsert(ctx context.Context, userID uuid.UUID, input UpsertSafetyReviewInput) (*entities.TradeSafetyReview, error)
}
```

## File: internal/domain/repositories/trade_sync_state_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type TradeSyncStateRepository interface {
	GetByUserAndSymbol(ctx context.Context, userID uuid.UUID, exchange string, symbol string) (*entities.TradeSyncState, error)
	Upsert(ctx context.Context, state *entities.TradeSyncState) error
}
```

## File: internal/domain/repositories/user_ai_key_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type UserAIKeyRepository interface {
	Upsert(ctx context.Context, key *entities.UserAIKey) error
	GetByUserAndProvider(ctx context.Context, userID uuid.UUID, provider string) (*entities.UserAIKey, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.UserAIKey, error)
	DeleteByUserAndProvider(ctx context.Context, userID uuid.UUID, provider string) (bool, error)
}
```

## File: internal/domain/repositories/user_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type UserRepository interface {
	Create(ctx context.Context, user *entities.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.User, error)
	GetByEmail(ctx context.Context, email string) (*entities.User, error)
	Update(ctx context.Context, user *entities.User) error
	Delete(ctx context.Context, id uuid.UUID) error
}
```

## File: internal/domain/repositories/user_symbol_repository.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

type UserSymbolRepository interface {
	Create(ctx context.Context, symbol *entities.UserSymbol) error
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.UserSymbol, error)
	ReplaceByUser(ctx context.Context, userID uuid.UUID, symbols []*entities.UserSymbol) error
}
```

## File: internal/infrastructure/auth/jwt.go
```go
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	AccessTokenExpiry  = 15 * time.Minute
	RefreshTokenExpiry = 30 * 24 * time.Hour
)

type Claims struct {
	UserID uuid.UUID `json:"sub"`
	jwt.RegisteredClaims
}

func GenerateAccessToken(userID uuid.UUID, secret string) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(AccessTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func GenerateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

func HashRefreshToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return base64.URLEncoding.EncodeToString(hash[:])
}

func ValidateAccessToken(tokenString, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}
```

## File: internal/infrastructure/auth/password.go
```go
package auth

import (
	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 10

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func ComparePassword(hashedPassword, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}
```

## File: internal/infrastructure/crypto/aes.go
```go
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
)

const encryptedValuePrefix = "v1"

func Encrypt(plaintext string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("key must be 32 bytes for AES-256")
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nil, nonce, []byte(plaintext), nil)

	return fmt.Sprintf("%s:%s:%s",
		encryptedValuePrefix,
		base64.StdEncoding.EncodeToString(nonce),
		base64.StdEncoding.EncodeToString(ciphertext),
	), nil
}

func Decrypt(encrypted string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("key must be 32 bytes for AES-256")
	}

	parts := strings.Split(encrypted, ":")
	if len(parts) != 3 || parts[0] != encryptedValuePrefix {
		return "", errors.New("invalid encrypted value format")
	}

	nonce, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", err
	}

	ciphertext, err := base64.StdEncoding.DecodeString(parts[2])
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	if len(nonce) != gcm.NonceSize() {
		return "", errors.New("invalid nonce size")
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func LoadKeyFromEnv(envVar string) ([]byte, error) {
	keyB64 := os.Getenv(envVar)
	if keyB64 == "" {
		return nil, errors.New("encryption key not set")
	}

	key, err := base64.StdEncoding.DecodeString(keyB64)
	if err != nil {
		return nil, err
	}

	if len(key) != 32 {
		return nil, errors.New("encryption key must be 32 bytes after base64 decoding")
	}

	return key, nil
}
```

## File: internal/infrastructure/database/postgres.go
```go
package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPostgresPool(databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	return pool, nil
}
```

## File: internal/infrastructure/notification/sender.go
```go
package notification

import (
	"context"

	"github.com/google/uuid"
)

type Message struct {
	Title    string
	Body     string
	Severity string // "normal" | "urgent"
	DeepLink string
}

type Sender interface {
	Send(ctx context.Context, userID uuid.UUID, msg Message) error
}
```

## File: internal/infrastructure/notification/telegram.go
```go
package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type TelegramSender struct {
	botToken    string
	channelRepo repositories.NotificationChannelRepository
	client      *http.Client
}

func NewTelegramSender(botToken string, channelRepo repositories.NotificationChannelRepository) *TelegramSender {
	return &TelegramSender{
		botToken:    botToken,
		channelRepo: channelRepo,
		client:      &http.Client{},
	}
}

func (t *TelegramSender) Send(ctx context.Context, userID uuid.UUID, msg Message) error {
	channel, err := t.channelRepo.GetByUserAndType(ctx, userID, entities.ChannelTelegram)
	if err != nil {
		return err
	}
	if channel == nil || !channel.Verified || !channel.Enabled {
		return nil // No verified Telegram channel
	}

	var tgConfig entities.TelegramConfig
	if err := json.Unmarshal(channel.Config, &tgConfig); err != nil {
		return err
	}
	if tgConfig.ChatID == 0 {
		return nil
	}

	text := formatTelegramMessage(msg)
	return t.sendMessage(ctx, tgConfig.ChatID, text)
}

func (t *TelegramSender) SendToChatID(ctx context.Context, chatID int64, text string) error {
	return t.sendMessage(ctx, chatID, text)
}

func (t *TelegramSender) sendMessage(ctx context.Context, chatID int64, text string) error {
	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "HTML",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	reqURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", t.botToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := t.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram sendMessage error %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	return nil
}

func formatTelegramMessage(msg Message) string {
	var b strings.Builder

	if msg.Severity == "urgent" {
		b.WriteString("\xf0\x9f\x94\xb4 <b>[긴급]</b> ")
	} else {
		b.WriteString("\xf0\x9f\x94\x94 ")
	}
	b.WriteString(fmt.Sprintf("<b>%s</b>\n\n", msg.Title))
	b.WriteString(msg.Body)

	if msg.DeepLink != "" {
		b.WriteString(fmt.Sprintf("\n\n<a href=\"%s\">상세 확인하기</a>", msg.DeepLink))
	}

	return b.String()
}
```

## File: internal/infrastructure/repositories/ai_opinion_accuracy_repository_impl.go
```go
package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AIOpinionAccuracyRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAIOpinionAccuracyRepository(pool *pgxpool.Pool) repositories.AIOpinionAccuracyRepository {
	return &AIOpinionAccuracyRepositoryImpl{pool: pool}
}

func (r *AIOpinionAccuracyRepositoryImpl) Create(ctx context.Context, accuracy *entities.AIOpinionAccuracy) error {
	query := `
		INSERT INTO ai_opinion_accuracies (id, opinion_id, outcome_id, bubble_id, provider, period, predicted_direction, actual_direction, is_correct, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.pool.Exec(ctx, query,
		accuracy.ID, accuracy.OpinionID, accuracy.OutcomeID, accuracy.BubbleID,
		accuracy.Provider, accuracy.Period, accuracy.PredictedDirection,
		accuracy.ActualDirection, accuracy.IsCorrect, accuracy.CreatedAt)
	return err
}

func (r *AIOpinionAccuracyRepositoryImpl) GetByBubbleID(ctx context.Context, bubbleID uuid.UUID) ([]*entities.AIOpinionAccuracy, error) {
	query := `
		SELECT id, opinion_id, outcome_id, bubble_id, provider, period, predicted_direction, actual_direction, is_correct, created_at
		FROM ai_opinion_accuracies
		WHERE bubble_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, bubbleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accuracies []*entities.AIOpinionAccuracy
	for rows.Next() {
		var acc entities.AIOpinionAccuracy
		if err := rows.Scan(
			&acc.ID, &acc.OpinionID, &acc.OutcomeID, &acc.BubbleID,
			&acc.Provider, &acc.Period, &acc.PredictedDirection,
			&acc.ActualDirection, &acc.IsCorrect, &acc.CreatedAt); err != nil {
			return nil, err
		}
		accuracies = append(accuracies, &acc)
	}

	return accuracies, rows.Err()
}

func (r *AIOpinionAccuracyRepositoryImpl) GetByOpinionAndOutcome(ctx context.Context, opinionID, outcomeID uuid.UUID) (*entities.AIOpinionAccuracy, error) {
	query := `
		SELECT id, opinion_id, outcome_id, bubble_id, provider, period, predicted_direction, actual_direction, is_correct, created_at
		FROM ai_opinion_accuracies
		WHERE opinion_id = $1 AND outcome_id = $2
	`
	var acc entities.AIOpinionAccuracy
	err := r.pool.QueryRow(ctx, query, opinionID, outcomeID).Scan(
		&acc.ID, &acc.OpinionID, &acc.OutcomeID, &acc.BubbleID,
		&acc.Provider, &acc.Period, &acc.PredictedDirection,
		&acc.ActualDirection, &acc.IsCorrect, &acc.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &acc, nil
}

func (r *AIOpinionAccuracyRepositoryImpl) ExistsByOpinionAndOutcome(ctx context.Context, opinionID, outcomeID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM ai_opinion_accuracies WHERE opinion_id = $1 AND outcome_id = $2)`
	var exists bool
	err := r.pool.QueryRow(ctx, query, opinionID, outcomeID).Scan(&exists)
	return exists, err
}

func (r *AIOpinionAccuracyRepositoryImpl) GetProviderStats(ctx context.Context, userID uuid.UUID, period string, outcomePeriod string, assetClass string, venueName string) (map[string]*repositories.ProviderAccuracyStats, error) {
	// Calculate date range
	var since time.Time
	switch period {
	case "7d":
		since = time.Now().AddDate(0, 0, -7)
	case "30d":
		since = time.Now().AddDate(0, 0, -30)
	default:
		since = time.Time{}
	}

	conditions := []string{"b.user_id = $1", "a.period = $2", "($3::timestamptz IS NULL OR b.candle_time >= $3)"}
	args := []interface{}{userID, outcomePeriod, nil}
	if !since.IsZero() {
		args[2] = since
	}
	argIndex := 4
	if assetClass != "" {
		conditions = append(conditions, fmt.Sprintf("b.asset_class = $%d", argIndex))
		args = append(args, assetClass)
		argIndex++
	}
	if venueName != "" {
		conditions = append(conditions, fmt.Sprintf("b.venue_name = $%d", argIndex))
		args = append(args, venueName)
		argIndex++
	}
	whereClause := strings.Join(conditions, " AND ")

	query := fmt.Sprintf(`
		SELECT
			a.provider,
			a.predicted_direction,
			COUNT(*) as total,
			SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct
		FROM ai_opinion_accuracies a
		JOIN bubbles b ON a.bubble_id = b.id
		WHERE %s
		GROUP BY a.provider, a.predicted_direction
		ORDER BY a.provider, a.predicted_direction
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats := make(map[string]*repositories.ProviderAccuracyStats)

	for rows.Next() {
		var provider string
		var direction string
		var total, correct int

		if err := rows.Scan(&provider, &direction, &total, &correct); err != nil {
			return nil, err
		}

		if _, ok := stats[provider]; !ok {
			stats[provider] = &repositories.ProviderAccuracyStats{
				Provider:    provider,
				ByDirection: make(map[entities.Direction]repositories.DirectionStats),
			}
		}

		ps := stats[provider]
		ps.Total += total
		ps.Correct += correct
		ps.Evaluated += total

		accuracy := 0.0
		if total > 0 {
			accuracy = float64(correct) / float64(total) * 100
		}

		ps.ByDirection[entities.Direction(direction)] = repositories.DirectionStats{
			Predicted: total,
			Correct:   correct,
			Accuracy:  accuracy,
		}
	}

	// Calculate overall accuracy for each provider
	for _, ps := range stats {
		if ps.Evaluated > 0 {
			ps.Accuracy = float64(ps.Correct) / float64(ps.Evaluated) * 100
		}
	}

	return stats, rows.Err()
}

func (r *AIOpinionAccuracyRepositoryImpl) GetTotalStats(ctx context.Context, userID uuid.UUID, period string, outcomePeriod string, assetClass string, venueName string) (total int, evaluated int, err error) {
	var since time.Time
	switch period {
	case "7d":
		since = time.Now().AddDate(0, 0, -7)
	case "30d":
		since = time.Now().AddDate(0, 0, -30)
	default:
		since = time.Time{}
	}

	conditions := []string{"b.user_id = $1", "($2::timestamptz IS NULL OR b.candle_time >= $2)"}
	args := []interface{}{userID, nil}
	if !since.IsZero() {
		args[1] = since
	}
	argIndex := 3
	if assetClass != "" {
		conditions = append(conditions, fmt.Sprintf("b.asset_class = $%d", argIndex))
		args = append(args, assetClass)
		argIndex++
	}
	if venueName != "" {
		conditions = append(conditions, fmt.Sprintf("b.venue_name = $%d", argIndex))
		args = append(args, venueName)
		argIndex++
	}
	whereClause := strings.Join(conditions, " AND ")

	// Total opinions count
	totalQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT ao.id)
		FROM ai_opinions ao
		JOIN bubbles b ON ao.bubble_id = b.id
		WHERE %s
	`, whereClause)

	// Evaluated (has accuracy record)
	evaluatedQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT a.opinion_id)
		FROM ai_opinion_accuracies a
		JOIN bubbles b ON a.bubble_id = b.id
		WHERE %s
		AND a.period = $%d
	`, whereClause, argIndex)

	evaluatedArgs := append([]interface{}{}, args...)
	evaluatedArgs = append(evaluatedArgs, outcomePeriod)

	if err = r.pool.QueryRow(ctx, totalQuery, args...).Scan(&total); err != nil {
		return
	}
	err = r.pool.QueryRow(ctx, evaluatedQuery, evaluatedArgs...).Scan(&evaluated)
	return
}
```

## File: internal/infrastructure/repositories/ai_opinion_repository_impl.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AIOpinionRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAIOpinionRepository(pool *pgxpool.Pool) repositories.AIOpinionRepository {
	return &AIOpinionRepositoryImpl{pool: pool}
}

func (r *AIOpinionRepositoryImpl) Create(ctx context.Context, opinion *entities.AIOpinion) error {
	query := `
        INSERT INTO ai_opinions (id, bubble_id, provider, model, prompt_template, response, tokens_used, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `
	_, err := r.pool.Exec(ctx, query,
		opinion.ID, opinion.BubbleID, opinion.Provider, opinion.Model, opinion.PromptTemplate, opinion.Response, opinion.TokensUsed, opinion.CreatedAt)
	return err
}

func (r *AIOpinionRepositoryImpl) ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.AIOpinion, error) {
	query := `
        SELECT id, bubble_id, provider, model, prompt_template, response, tokens_used, created_at
        FROM ai_opinions
        WHERE bubble_id = $1
        ORDER BY created_at DESC
    `
	rows, err := r.pool.Query(ctx, query, bubbleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var opinions []*entities.AIOpinion
	for rows.Next() {
		var opinion entities.AIOpinion
		if err := rows.Scan(
			&opinion.ID, &opinion.BubbleID, &opinion.Provider, &opinion.Model, &opinion.PromptTemplate, &opinion.Response, &opinion.TokensUsed, &opinion.CreatedAt); err != nil {
			return nil, err
		}
		opinions = append(opinions, &opinion)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return opinions, nil
}
```

## File: internal/infrastructure/repositories/ai_provider_repository_impl.go
```go
package repositories

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AIProviderRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAIProviderRepository(pool *pgxpool.Pool) repositories.AIProviderRepository {
	return &AIProviderRepositoryImpl{pool: pool}
}

func (r *AIProviderRepositoryImpl) ListEnabled(ctx context.Context) ([]*entities.AIProvider, error) {
	query := `
        SELECT id, name, model, enabled, is_default, created_at
        FROM ai_providers
        WHERE enabled = true
        ORDER BY name ASC
    `
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var providers []*entities.AIProvider
	for rows.Next() {
		var provider entities.AIProvider
		err := rows.Scan(&provider.ID, &provider.Name, &provider.Model, &provider.Enabled, &provider.IsDefault, &provider.CreatedAt)
		if err != nil {
			return nil, err
		}
		providers = append(providers, &provider)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return providers, nil
}

func (r *AIProviderRepositoryImpl) GetByName(ctx context.Context, name string) (*entities.AIProvider, error) {
	query := `
        SELECT id, name, model, enabled, is_default, created_at
        FROM ai_providers
        WHERE name = $1
    `
	var provider entities.AIProvider
	err := r.pool.QueryRow(ctx, query, name).Scan(
		&provider.ID, &provider.Name, &provider.Model, &provider.Enabled, &provider.IsDefault, &provider.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &provider, nil
}
```

## File: internal/infrastructure/repositories/alert_repository_impl.go
```go
package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

// --- Alert ---

type AlertRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAlertRepository(pool *pgxpool.Pool) repositories.AlertRepository {
	return &AlertRepositoryImpl{pool: pool}
}

func (r *AlertRepositoryImpl) Create(ctx context.Context, alert *entities.Alert) error {
	query := `
		INSERT INTO alerts (id, user_id, rule_id, symbol, trigger_price, trigger_reason, severity, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.pool.Exec(ctx, query,
		alert.ID, alert.UserID, alert.RuleID, alert.Symbol,
		alert.TriggerPrice, alert.TriggerReason, alert.Severity, alert.Status, alert.CreatedAt)
	return err
}

func (r *AlertRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.Alert, error) {
	query := `
		SELECT id, user_id, rule_id, symbol, trigger_price, trigger_reason, severity, status, notified_at, created_at
		FROM alerts WHERE id = $1
	`
	var a entities.Alert
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&a.ID, &a.UserID, &a.RuleID, &a.Symbol,
		&a.TriggerPrice, &a.TriggerReason, &a.Severity, &a.Status, &a.NotifiedAt, &a.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &a, nil
}

func (r *AlertRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID, status *entities.AlertStatus, limit, offset int) ([]*entities.Alert, int, error) {
	countQuery := `SELECT COUNT(*) FROM alerts WHERE user_id = $1`
	args := []interface{}{userID}
	if status != nil {
		countQuery += ` AND status = $2`
		args = append(args, *status)
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, user_id, rule_id, symbol, trigger_price, trigger_reason, severity, status, notified_at, created_at
		FROM alerts WHERE user_id = $1
	`
	queryArgs := []interface{}{userID}
	paramIdx := 2
	if status != nil {
		query += ` AND status = $2`
		queryArgs = append(queryArgs, *status)
		paramIdx = 3
	}
	query += ` ORDER BY created_at DESC LIMIT $` + itoa(paramIdx) + ` OFFSET $` + itoa(paramIdx+1)
	queryArgs = append(queryArgs, limit, offset)

	rows, err := r.pool.Query(ctx, query, queryArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var alerts []*entities.Alert
	for rows.Next() {
		var a entities.Alert
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.RuleID, &a.Symbol,
			&a.TriggerPrice, &a.TriggerReason, &a.Severity, &a.Status, &a.NotifiedAt, &a.CreatedAt); err != nil {
			return nil, 0, err
		}
		alerts = append(alerts, &a)
	}
	return alerts, total, rows.Err()
}

func (r *AlertRepositoryImpl) UpdateStatus(ctx context.Context, id uuid.UUID, status entities.AlertStatus) error {
	_, err := r.pool.Exec(ctx, `UPDATE alerts SET status = $1 WHERE id = $2`, status, id)
	return err
}

func (r *AlertRepositoryImpl) SetNotified(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE alerts SET notified_at = $1 WHERE id = $2`, time.Now().UTC(), id)
	return err
}

func (r *AlertRepositoryImpl) ExpireOlderThan(ctx context.Context, before time.Time) (int, error) {
	result, err := r.pool.Exec(ctx,
		`UPDATE alerts SET status = 'expired' WHERE status IN ('pending', 'briefed') AND created_at < $1`, before)
	if err != nil {
		return 0, err
	}
	return int(result.RowsAffected()), nil
}

// --- AlertBriefing ---

type AlertBriefingRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAlertBriefingRepository(pool *pgxpool.Pool) repositories.AlertBriefingRepository {
	return &AlertBriefingRepositoryImpl{pool: pool}
}

func (r *AlertBriefingRepositoryImpl) Create(ctx context.Context, b *entities.AlertBriefing) error {
	query := `
		INSERT INTO alert_briefings (id, alert_id, provider, model, prompt, response, tokens_used, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.pool.Exec(ctx, query,
		b.ID, b.AlertID, b.Provider, b.Model, b.Prompt, b.Response, b.TokensUsed, b.CreatedAt)
	return err
}

func (r *AlertBriefingRepositoryImpl) ListByAlert(ctx context.Context, alertID uuid.UUID) ([]*entities.AlertBriefing, error) {
	query := `
		SELECT id, alert_id, provider, model, prompt, response, tokens_used, created_at
		FROM alert_briefings WHERE alert_id = $1 ORDER BY created_at
	`
	rows, err := r.pool.Query(ctx, query, alertID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var briefings []*entities.AlertBriefing
	for rows.Next() {
		var b entities.AlertBriefing
		if err := rows.Scan(&b.ID, &b.AlertID, &b.Provider, &b.Model, &b.Prompt, &b.Response, &b.TokensUsed, &b.CreatedAt); err != nil {
			return nil, err
		}
		briefings = append(briefings, &b)
	}
	return briefings, rows.Err()
}

// --- AlertDecision ---

type AlertDecisionRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAlertDecisionRepository(pool *pgxpool.Pool) repositories.AlertDecisionRepository {
	return &AlertDecisionRepositoryImpl{pool: pool}
}

func (r *AlertDecisionRepositoryImpl) Create(ctx context.Context, d *entities.AlertDecision) error {
	query := `
		INSERT INTO alert_decisions (id, alert_id, user_id, action, memo, confidence, executed_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.pool.Exec(ctx, query,
		d.ID, d.AlertID, d.UserID, d.Action, d.Memo, d.Confidence, d.ExecutedAt, d.CreatedAt)
	return err
}

func (r *AlertDecisionRepositoryImpl) GetByAlert(ctx context.Context, alertID uuid.UUID) (*entities.AlertDecision, error) {
	query := `
		SELECT id, alert_id, user_id, action, memo, confidence, executed_at, created_at
		FROM alert_decisions WHERE alert_id = $1
	`
	var d entities.AlertDecision
	err := r.pool.QueryRow(ctx, query, alertID).Scan(
		&d.ID, &d.AlertID, &d.UserID, &d.Action, &d.Memo, &d.Confidence, &d.ExecutedAt, &d.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}

// --- AlertOutcome ---

type AlertOutcomeRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAlertOutcomeRepository(pool *pgxpool.Pool) repositories.AlertOutcomeRepository {
	return &AlertOutcomeRepositoryImpl{pool: pool}
}

func (r *AlertOutcomeRepositoryImpl) CreateIfNotExists(ctx context.Context, o *entities.AlertOutcome) (bool, error) {
	query := `
		INSERT INTO alert_outcomes (id, alert_id, decision_id, period, reference_price, outcome_price, pnl_percent, calculated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (alert_id, period) DO NOTHING
	`
	result, err := r.pool.Exec(ctx, query,
		o.ID, o.AlertID, o.DecisionID, o.Period, o.ReferencePrice, o.OutcomePrice, o.PnLPercent, o.CalculatedAt)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

func (r *AlertOutcomeRepositoryImpl) ListByAlert(ctx context.Context, alertID uuid.UUID) ([]*entities.AlertOutcome, error) {
	query := `
		SELECT id, alert_id, decision_id, period, reference_price, outcome_price, pnl_percent, calculated_at
		FROM alert_outcomes WHERE alert_id = $1 ORDER BY period
	`
	rows, err := r.pool.Query(ctx, query, alertID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var outcomes []*entities.AlertOutcome
	for rows.Next() {
		var o entities.AlertOutcome
		if err := rows.Scan(&o.ID, &o.AlertID, &o.DecisionID, &o.Period,
			&o.ReferencePrice, &o.OutcomePrice, &o.PnLPercent, &o.CalculatedAt); err != nil {
			return nil, err
		}
		outcomes = append(outcomes, &o)
	}
	return outcomes, rows.Err()
}

func (r *AlertOutcomeRepositoryImpl) ListPendingDecisions(ctx context.Context, period string, cutoff time.Time, limit int) ([]*repositories.PendingAlertDecision, error) {
	query := `
		SELECT a.id, d.id, a.symbol, a.trigger_price, d.created_at
		FROM alerts a
		JOIN alert_decisions d ON d.alert_id = a.id
		LEFT JOIN alert_outcomes o ON o.alert_id = a.id AND o.period = $1
		WHERE a.status = 'decided' AND o.id IS NULL AND d.created_at <= $2
		LIMIT $3
	`
	rows, err := r.pool.Query(ctx, query, period, cutoff, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pending []*repositories.PendingAlertDecision
	for rows.Next() {
		var p repositories.PendingAlertDecision
		if err := rows.Scan(&p.AlertID, &p.DecisionID, &p.Symbol, &p.TriggerPrice, &p.DecisionTime); err != nil {
			return nil, err
		}
		pending = append(pending, &p)
	}
	return pending, rows.Err()
}

func itoa(n int) string {
	return fmt.Sprintf("%d", n)
}
```

## File: internal/infrastructure/repositories/alert_rule_repository_impl.go
```go
package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AlertRuleRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewAlertRuleRepository(pool *pgxpool.Pool) repositories.AlertRuleRepository {
	return &AlertRuleRepositoryImpl{pool: pool}
}

func (r *AlertRuleRepositoryImpl) Create(ctx context.Context, rule *entities.AlertRule) error {
	query := `
		INSERT INTO alert_rules (id, user_id, name, symbol, rule_type, config, cooldown_minutes, enabled, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	rule.ID = uuid.New()
	now := time.Now().UTC()
	rule.CreatedAt = now
	rule.UpdatedAt = now

	_, err := r.pool.Exec(ctx, query,
		rule.ID, rule.UserID, rule.Name, rule.Symbol, rule.RuleType,
		rule.Config, rule.CooldownMinutes, rule.Enabled, rule.CreatedAt, rule.UpdatedAt)
	return err
}

func (r *AlertRuleRepositoryImpl) Update(ctx context.Context, rule *entities.AlertRule) error {
	query := `
		UPDATE alert_rules
		SET name = $1, symbol = $2, rule_type = $3, config = $4, cooldown_minutes = $5, enabled = $6, updated_at = $7
		WHERE id = $8 AND user_id = $9
	`
	rule.UpdatedAt = time.Now().UTC()
	_, err := r.pool.Exec(ctx, query,
		rule.Name, rule.Symbol, rule.RuleType, rule.Config,
		rule.CooldownMinutes, rule.Enabled, rule.UpdatedAt, rule.ID, rule.UserID)
	return err
}

func (r *AlertRuleRepositoryImpl) Delete(ctx context.Context, id, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM alert_rules WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (r *AlertRuleRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.AlertRule, error) {
	query := `
		SELECT id, user_id, name, symbol, rule_type, config, cooldown_minutes, enabled,
		       last_triggered_at, last_check_state, created_at, updated_at
		FROM alert_rules WHERE id = $1
	`
	return r.scanRule(r.pool.QueryRow(ctx, query, id))
}

func (r *AlertRuleRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.AlertRule, error) {
	query := `
		SELECT id, user_id, name, symbol, rule_type, config, cooldown_minutes, enabled,
		       last_triggered_at, last_check_state, created_at, updated_at
		FROM alert_rules WHERE user_id = $1 ORDER BY created_at DESC
	`
	return r.scanRules(ctx, query, userID)
}

func (r *AlertRuleRepositoryImpl) ListActiveBySymbol(ctx context.Context, symbol string) ([]*entities.AlertRule, error) {
	query := `
		SELECT id, user_id, name, symbol, rule_type, config, cooldown_minutes, enabled,
		       last_triggered_at, last_check_state, created_at, updated_at
		FROM alert_rules WHERE symbol = $1 AND enabled = true
	`
	return r.scanRules(ctx, query, symbol)
}

func (r *AlertRuleRepositoryImpl) ListAllActive(ctx context.Context) ([]*entities.AlertRule, error) {
	query := `
		SELECT id, user_id, name, symbol, rule_type, config, cooldown_minutes, enabled,
		       last_triggered_at, last_check_state, created_at, updated_at
		FROM alert_rules WHERE enabled = true
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []*entities.AlertRule
	for rows.Next() {
		rule, err := r.scanRuleFromRows(rows)
		if err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (r *AlertRuleRepositoryImpl) SetEnabled(ctx context.Context, id, userID uuid.UUID, enabled bool) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE alert_rules SET enabled = $1, updated_at = $2 WHERE id = $3 AND user_id = $4`,
		enabled, time.Now().UTC(), id, userID)
	return err
}

func (r *AlertRuleRepositoryImpl) UpdateLastTriggered(ctx context.Context, id uuid.UUID, checkState []byte) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE alert_rules SET last_triggered_at = $1, last_check_state = $2 WHERE id = $3`,
		time.Now().UTC(), checkState, id)
	return err
}

func (r *AlertRuleRepositoryImpl) UpdateCheckState(ctx context.Context, id uuid.UUID, checkState []byte) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE alert_rules SET last_check_state = $1 WHERE id = $2`,
		checkState, id)
	return err
}

func (r *AlertRuleRepositoryImpl) scanRules(ctx context.Context, query string, args ...interface{}) ([]*entities.AlertRule, error) {
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []*entities.AlertRule
	for rows.Next() {
		rule, err := r.scanRuleFromRows(rows)
		if err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (r *AlertRuleRepositoryImpl) scanRuleFromRows(rows pgx.Rows) (*entities.AlertRule, error) {
	var rule entities.AlertRule
	err := rows.Scan(
		&rule.ID, &rule.UserID, &rule.Name, &rule.Symbol, &rule.RuleType,
		&rule.Config, &rule.CooldownMinutes, &rule.Enabled,
		&rule.LastTriggeredAt, &rule.LastCheckState, &rule.CreatedAt, &rule.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &rule, nil
}

func (r *AlertRuleRepositoryImpl) scanRule(row pgx.Row) (*entities.AlertRule, error) {
	var rule entities.AlertRule
	err := row.Scan(
		&rule.ID, &rule.UserID, &rule.Name, &rule.Symbol, &rule.RuleType,
		&rule.Config, &rule.CooldownMinutes, &rule.Enabled,
		&rule.LastTriggeredAt, &rule.LastCheckState, &rule.CreatedAt, &rule.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &rule, nil
}
```

## File: internal/infrastructure/repositories/bubble_repository_impl.go
```go
package repositories

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type BubbleRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewBubbleRepository(pool *pgxpool.Pool) repositories.BubbleRepository {
	return &BubbleRepositoryImpl{pool: pool}
}

func (r *BubbleRepositoryImpl) Create(ctx context.Context, bubble *entities.Bubble) error {
	query := `
		INSERT INTO bubbles (id, user_id, symbol, timeframe, candle_time, price, bubble_type, asset_class, venue_name, memo, tags, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := r.pool.Exec(ctx, query,
		bubble.ID, bubble.UserID, bubble.Symbol, bubble.Timeframe, bubble.CandleTime, bubble.Price, bubble.BubbleType, bubble.AssetClass, bubble.VenueName, bubble.Memo, bubble.Tags, bubble.CreatedAt)
	return err
}

func (r *BubbleRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.Bubble, error) {
	query := `
		SELECT id, user_id, symbol, timeframe, candle_time, price, bubble_type, asset_class, venue_name, memo, tags, created_at
		FROM bubbles
		WHERE id = $1
	`
	var bubble entities.Bubble
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&bubble.ID, &bubble.UserID, &bubble.Symbol, &bubble.Timeframe, &bubble.CandleTime, &bubble.Price, &bubble.BubbleType, &bubble.AssetClass, &bubble.VenueName, &bubble.Memo, &bubble.Tags, &bubble.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &bubble, nil
}

func (r *BubbleRepositoryImpl) List(ctx context.Context, userID uuid.UUID, filter repositories.BubbleFilter) ([]*entities.Bubble, int, error) {
	conditions := []string{"user_id = $1"}
	args := []interface{}{userID}

	argIndex := 2
	if filter.Symbol != "" {
		conditions = append(conditions, fmt.Sprintf("symbol = $%d", argIndex))
		args = append(args, filter.Symbol)
		argIndex++
	}
	if len(filter.Tags) > 0 {
		conditions = append(conditions, fmt.Sprintf("tags && $%d", argIndex))
		args = append(args, filter.Tags)
		argIndex++
	}
	if filter.From != nil {
		conditions = append(conditions, fmt.Sprintf("candle_time >= $%d", argIndex))
		args = append(args, *filter.From)
		argIndex++
	}
	if filter.To != nil {
		conditions = append(conditions, fmt.Sprintf("candle_time <= $%d", argIndex))
		args = append(args, *filter.To)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")
	sortClause := "ORDER BY candle_time DESC"
	if filter.Sort == "asc" {
		sortClause = "ORDER BY candle_time ASC"
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM bubbles %s", whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQuery := fmt.Sprintf(`
		SELECT id, user_id, symbol, timeframe, candle_time, price, bubble_type, asset_class, venue_name, memo, tags, created_at
		FROM bubbles
		%s
		%s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortClause, argIndex, argIndex+1)
	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var bubbles []*entities.Bubble
	for rows.Next() {
		var bubble entities.Bubble
		err := rows.Scan(
			&bubble.ID, &bubble.UserID, &bubble.Symbol, &bubble.Timeframe, &bubble.CandleTime, &bubble.Price, &bubble.BubbleType, &bubble.AssetClass, &bubble.VenueName, &bubble.Memo, &bubble.Tags, &bubble.CreatedAt)
		if err != nil {
			return nil, 0, err
		}
		bubbles = append(bubbles, &bubble)
	}

	if rows.Err() != nil {
		return nil, 0, rows.Err()
	}

	return bubbles, total, nil
}

func (r *BubbleRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID, limit int, offset int) ([]*entities.Bubble, int, error) {
	countQuery := `SELECT COUNT(*) FROM bubbles WHERE user_id = $1`
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, user_id, symbol, timeframe, candle_time, price, bubble_type, asset_class, venue_name, memo, tags, created_at
		FROM bubbles
		WHERE user_id = $1
		ORDER BY candle_time DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var bubbles []*entities.Bubble
	for rows.Next() {
		var bubble entities.Bubble
		err := rows.Scan(
			&bubble.ID, &bubble.UserID, &bubble.Symbol, &bubble.Timeframe, &bubble.CandleTime, &bubble.Price, &bubble.BubbleType, &bubble.AssetClass, &bubble.VenueName, &bubble.Memo, &bubble.Tags, &bubble.CreatedAt)
		if err != nil {
			return nil, 0, err
		}
		bubbles = append(bubbles, &bubble)
	}

	if rows.Err() != nil {
		return nil, 0, rows.Err()
	}

	return bubbles, total, nil
}

func (r *BubbleRepositoryImpl) Update(ctx context.Context, bubble *entities.Bubble) error {
	query := `
		UPDATE bubbles
		SET memo = $2, tags = $3, asset_class = $4, venue_name = $5
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, bubble.ID, bubble.Memo, bubble.Tags, bubble.AssetClass, bubble.VenueName)
	return err
}

func (r *BubbleRepositoryImpl) DeleteByIDAndUser(ctx context.Context, id uuid.UUID, userID uuid.UUID) (bool, error) {
	query := `DELETE FROM bubbles WHERE id = $1 AND user_id = $2`
	commandTag, err := r.pool.Exec(ctx, query, id, userID)
	if err != nil {
		return false, err
	}
	return commandTag.RowsAffected() > 0, nil
}

func (r *BubbleRepositoryImpl) ListSimilar(ctx context.Context, userID uuid.UUID, symbol string, tags []string, excludeID *uuid.UUID, period string, limit int, offset int) ([]*repositories.BubbleWithOutcome, int, error) {
	conditions := []string{"b.user_id = $1", "b.symbol = $2", "b.tags && $3"}
	args := []interface{}{userID, symbol, tags}
	argIndex := 4
	if excludeID != nil {
		conditions = append(conditions, fmt.Sprintf("b.id <> $%d", argIndex))
		args = append(args, *excludeID)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM bubbles b %s", whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQuery := fmt.Sprintf(`
		SELECT b.id, b.user_id, b.symbol, b.timeframe, b.candle_time, b.price, b.bubble_type, b.asset_class, b.venue_name, b.memo, b.tags, b.created_at,
		       o.period, o.reference_price, o.outcome_price, o.pnl_percent, o.calculated_at
		FROM bubbles b
		LEFT JOIN outcomes o ON o.bubble_id = b.id AND o.period = $%d
		%s
		ORDER BY b.candle_time DESC
		LIMIT $%d OFFSET $%d
	`, argIndex, whereClause, argIndex+1, argIndex+2)
	args = append(args, period, limit, offset)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []*repositories.BubbleWithOutcome
	for rows.Next() {
		var bubble entities.Bubble
		var outcomePeriod *string
		var referencePrice *string
		var outcomePrice *string
		var pnlPercent *string
		var calculatedAt *time.Time
		err := rows.Scan(
			&bubble.ID, &bubble.UserID, &bubble.Symbol, &bubble.Timeframe, &bubble.CandleTime, &bubble.Price, &bubble.BubbleType, &bubble.AssetClass, &bubble.VenueName, &bubble.Memo, &bubble.Tags, &bubble.CreatedAt,
			&outcomePeriod, &referencePrice, &outcomePrice, &pnlPercent, &calculatedAt)
		if err != nil {
			return nil, 0, err
		}

		var outcome *entities.Outcome
		if outcomePeriod != nil {
			outcome = &entities.Outcome{
				ID:             uuid.Nil,
				BubbleID:       bubble.ID,
				Period:         *outcomePeriod,
				ReferencePrice: safeString(referencePrice),
				OutcomePrice:   safeString(outcomePrice),
				PnLPercent:     safeString(pnlPercent),
				CalculatedAt:   safeTime(calculatedAt),
			}
		}

		results = append(results, &repositories.BubbleWithOutcome{
			Bubble:  &bubble,
			Outcome: outcome,
		})
	}

	if rows.Err() != nil {
		return nil, 0, rows.Err()
	}

	return results, total, nil
}

func (r *BubbleRepositoryImpl) SummarySimilar(ctx context.Context, userID uuid.UUID, symbol string, tags []string, excludeID *uuid.UUID, period string) (*repositories.SimilarSummary, error) {
	conditions := []string{"b.user_id = $1", "b.symbol = $2", "b.tags && $3", "o.period = $4"}
	args := []interface{}{userID, symbol, tags, period}
	argIndex := 5
	if excludeID != nil {
		conditions = append(conditions, fmt.Sprintf("b.id <> $%d", argIndex))
		args = append(args, *excludeID)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")
	query := fmt.Sprintf(`
		SELECT o.pnl_percent
		FROM outcomes o
		JOIN bubbles b ON b.id = o.bubble_id
		%s
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var wins int
	var losses int
	count := 0
	sum := new(big.Rat)
	for rows.Next() {
		var pnlStr string
		if err := rows.Scan(&pnlStr); err != nil {
			return nil, err
		}
		pnl, ok := parseDecimal(pnlStr)
		if !ok {
			continue
		}
		if pnl.Sign() > 0 {
			wins++
		} else if pnl.Sign() < 0 {
			losses++
		}
		sum.Add(sum, pnl)
		count++
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	var avgPtr *string
	if count > 0 {
		avg := new(big.Rat).Quo(sum, big.NewRat(int64(count), 1))
		formatted := formatDecimal(avg, 8)
		avgPtr = &formatted
	}

	return &repositories.SimilarSummary{
		Wins:   wins,
		Losses: losses,
		AvgPnL: avgPtr,
	}, nil
}

func parseDecimal(value string) (*big.Rat, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, false
	}
	rat := new(big.Rat)
	if _, ok := rat.SetString(value); !ok {
		return nil, false
	}
	return rat, true
}

func formatDecimal(value *big.Rat, scale int) string {
	if value == nil {
		return ""
	}
	formatted := value.FloatString(scale)
	formatted = strings.TrimRight(formatted, "0")
	formatted = strings.TrimRight(formatted, ".")
	if formatted == "" || formatted == "-" {
		return "0"
	}
	return formatted
}

func safeString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func safeTime(value *time.Time) time.Time {
	if value == nil {
		return time.Time{}
	}
	return *value
}

func (r *BubbleRepositoryImpl) GetReviewStats(ctx context.Context, userID uuid.UUID, period string, symbol string, tag string, assetClass string, venueName string) (*repositories.ReviewStats, error) {
	// Calculate date range
	var since time.Time
	switch period {
	case "7d":
		since = time.Now().AddDate(0, 0, -7)
	case "30d":
		since = time.Now().AddDate(0, 0, -30)
	default:
		since = time.Time{}
	}

	// Build base conditions
	conditions := []string{"b.user_id = $1"}
	args := []interface{}{userID}
	argIndex := 2

	if !since.IsZero() {
		conditions = append(conditions, fmt.Sprintf("b.candle_time >= $%d", argIndex))
		args = append(args, since)
		argIndex++
	}
	if symbol != "" {
		conditions = append(conditions, fmt.Sprintf("b.symbol = $%d", argIndex))
		args = append(args, symbol)
		argIndex++
	}
	if tag != "" {
		conditions = append(conditions, fmt.Sprintf("$%d = ANY(b.tags)", argIndex))
		args = append(args, tag)
		argIndex++
	}
	if assetClass != "" {
		conditions = append(conditions, fmt.Sprintf("b.asset_class = $%d", argIndex))
		args = append(args, assetClass)
		argIndex++
	}
	if venueName != "" {
		conditions = append(conditions, fmt.Sprintf("b.venue_name = $%d", argIndex))
		args = append(args, venueName)
		argIndex++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Total bubbles count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM bubbles b WHERE %s", whereClause)
	var totalBubbles int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalBubbles); err != nil {
		return nil, err
	}

	// Bubbles with outcome count
	outcomeCountQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT b.id)
		FROM bubbles b
		JOIN outcomes o ON o.bubble_id = b.id
		WHERE %s
	`, whereClause)
	var bubblesWithOutcome int
	if err := r.pool.QueryRow(ctx, outcomeCountQuery, args...).Scan(&bubblesWithOutcome); err != nil {
		return nil, err
	}

	// Overall stats (using 1h period as default)
	overallQuery := fmt.Sprintf(`
		SELECT
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) > 0 THEN 1 ELSE 0 END), 0) as wins,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) <= 0 THEN 1 ELSE 0 END), 0) as losses,
			COALESCE(AVG(CAST(o.pnl_percent AS DECIMAL)), 0) as avg_pnl,
			COALESCE(SUM(CAST(o.pnl_percent AS DECIMAL)), 0) as total_pnl,
			COALESCE(MAX(CAST(o.pnl_percent AS DECIMAL)), 0) as max_gain,
			COALESCE(MIN(CAST(o.pnl_percent AS DECIMAL)), 0) as max_loss
		FROM bubbles b
		JOIN outcomes o ON o.bubble_id = b.id AND o.period = '1h'
		WHERE %s
	`, whereClause)

	var wins, losses int
	var avgPnL, totalPnL, maxGain, maxLoss float64
	if err := r.pool.QueryRow(ctx, overallQuery, args...).Scan(&wins, &losses, &avgPnL, &totalPnL, &maxGain, &maxLoss); err != nil {
		return nil, err
	}

	winRate := 0.0
	if wins+losses > 0 {
		winRate = float64(wins) / float64(wins+losses) * 100
	}

	// Stats by period
	periodQuery := fmt.Sprintf(`
		SELECT
			o.period,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) > 0 THEN 1 ELSE 0 END), 0) as wins,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) <= 0 THEN 1 ELSE 0 END), 0) as losses,
			COALESCE(AVG(CAST(o.pnl_percent AS DECIMAL)), 0) as avg_pnl,
			COUNT(*) as count
		FROM bubbles b
		JOIN outcomes o ON o.bubble_id = b.id
		WHERE %s
		GROUP BY o.period
	`, whereClause)

	periodRows, err := r.pool.Query(ctx, periodQuery, args...)
	if err != nil {
		return nil, err
	}
	defer periodRows.Close()

	byPeriod := make(map[string]repositories.PeriodStats)
	for periodRows.Next() {
		var p string
		var pWins, pLosses, pCount int
		var pAvgPnL float64
		if err := periodRows.Scan(&p, &pWins, &pLosses, &pAvgPnL, &pCount); err != nil {
			return nil, err
		}
		pWinRate := 0.0
		if pWins+pLosses > 0 {
			pWinRate = float64(pWins) / float64(pWins+pLosses) * 100
		}
		byPeriod[p] = repositories.PeriodStats{
			WinRate: pWinRate,
			AvgPnL:  fmt.Sprintf("%.4f", pAvgPnL),
			Count:   pCount,
		}
	}

	// Stats by tag
	tagQuery := fmt.Sprintf(`
		SELECT
			unnest(b.tags) as tag,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) > 0 THEN 1 ELSE 0 END), 0) as wins,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) <= 0 THEN 1 ELSE 0 END), 0) as losses,
			COALESCE(AVG(CAST(o.pnl_percent AS DECIMAL)), 0) as avg_pnl,
			COUNT(*) as count
		FROM bubbles b
		JOIN outcomes o ON o.bubble_id = b.id AND o.period = '1h'
		WHERE %s
		GROUP BY unnest(b.tags)
	`, whereClause)

	tagRows, err := r.pool.Query(ctx, tagQuery, args...)
	if err != nil {
		return nil, err
	}
	defer tagRows.Close()

	byTag := make(map[string]repositories.TagStats)
	for tagRows.Next() {
		var t string
		var tWins, tLosses, tCount int
		var tAvgPnL float64
		if err := tagRows.Scan(&t, &tWins, &tLosses, &tAvgPnL, &tCount); err != nil {
			return nil, err
		}
		tWinRate := 0.0
		if tWins+tLosses > 0 {
			tWinRate = float64(tWins) / float64(tWins+tLosses) * 100
		}
		byTag[t] = repositories.TagStats{
			Count:   tCount,
			WinRate: tWinRate,
			AvgPnL:  fmt.Sprintf("%.4f", tAvgPnL),
		}
	}

	// Stats by symbol
	symbolQuery := fmt.Sprintf(`
		SELECT
			b.symbol,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) > 0 THEN 1 ELSE 0 END), 0) as wins,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) <= 0 THEN 1 ELSE 0 END), 0) as losses,
			COALESCE(AVG(CAST(o.pnl_percent AS DECIMAL)), 0) as avg_pnl,
			COUNT(*) as count
		FROM bubbles b
		JOIN outcomes o ON o.bubble_id = b.id AND o.period = '1h'
		WHERE %s
		GROUP BY b.symbol
	`, whereClause)

	symbolRows, err := r.pool.Query(ctx, symbolQuery, args...)
	if err != nil {
		return nil, err
	}
	defer symbolRows.Close()

	bySymbol := make(map[string]repositories.SymbolStats)
	for symbolRows.Next() {
		var s string
		var sWins, sLosses, sCount int
		var sAvgPnL float64
		if err := symbolRows.Scan(&s, &sWins, &sLosses, &sAvgPnL, &sCount); err != nil {
			return nil, err
		}
		sWinRate := 0.0
		if sWins+sLosses > 0 {
			sWinRate = float64(sWins) / float64(sWins+sLosses) * 100
		}
		bySymbol[s] = repositories.SymbolStats{
			Count:   sCount,
			WinRate: sWinRate,
			AvgPnL:  fmt.Sprintf("%.4f", sAvgPnL),
		}
	}

	return &repositories.ReviewStats{
		Period:             period,
		TotalBubbles:       totalBubbles,
		BubblesWithOutcome: bubblesWithOutcome,
		Overall: repositories.OverallReviewStats{
			WinRate:  winRate,
			AvgPnL:   fmt.Sprintf("%.4f", avgPnL),
			TotalPnL: fmt.Sprintf("%.4f", totalPnL),
			MaxGain:  fmt.Sprintf("%.4f", maxGain),
			MaxLoss:  fmt.Sprintf("%.4f", maxLoss),
		},
		ByPeriod: byPeriod,
		ByTag:    byTag,
		BySymbol: bySymbol,
	}, nil
}

func (r *BubbleRepositoryImpl) GetCalendarData(ctx context.Context, userID uuid.UUID, from time.Time, to time.Time, assetClass string, venueName string) (map[string]repositories.CalendarDay, error) {
	conditions := []string{"b.user_id = $1", "b.candle_time >= $2", "b.candle_time < $3"}
	args := []interface{}{userID, from, to.AddDate(0, 0, 1)}
	argIndex := 4

	if assetClass != "" {
		conditions = append(conditions, fmt.Sprintf("b.asset_class = $%d", argIndex))
		args = append(args, assetClass)
		argIndex++
	}
	if venueName != "" {
		conditions = append(conditions, fmt.Sprintf("b.venue_name = $%d", argIndex))
		args = append(args, venueName)
		argIndex++
	}

	whereClause := strings.Join(conditions, " AND ")

	query := fmt.Sprintf(`
		SELECT
			DATE(b.candle_time) as date,
			COUNT(DISTINCT b.id) as bubble_count,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) > 0 THEN 1 ELSE 0 END), 0) as win_count,
			COALESCE(SUM(CASE WHEN CAST(o.pnl_percent AS DECIMAL) <= 0 THEN 1 ELSE 0 END), 0) as loss_count,
			COALESCE(SUM(CAST(o.pnl_percent AS DECIMAL)), 0) as total_pnl
		FROM bubbles b
		LEFT JOIN outcomes o ON o.bubble_id = b.id AND o.period = '1h'
		WHERE %s
		GROUP BY DATE(b.candle_time)
		ORDER BY date
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]repositories.CalendarDay)
	for rows.Next() {
		var date time.Time
		var bubbleCount, winCount, lossCount int
		var totalPnL float64
		if err := rows.Scan(&date, &bubbleCount, &winCount, &lossCount, &totalPnL); err != nil {
			return nil, err
		}
		result[date.Format("2006-01-02")] = repositories.CalendarDay{
			BubbleCount: bubbleCount,
			WinCount:    winCount,
			LossCount:   lossCount,
			TotalPnL:    fmt.Sprintf("%.4f", totalPnL),
		}
	}

	return result, rows.Err()
}
```

## File: internal/infrastructure/repositories/exchange_credential_repository_impl.go
```go
package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type ExchangeCredentialRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewExchangeCredentialRepository(pool *pgxpool.Pool) repositories.ExchangeCredentialRepository {
	return &ExchangeCredentialRepositoryImpl{pool: pool}
}

func (r *ExchangeCredentialRepositoryImpl) Create(ctx context.Context, cred *entities.ExchangeCredential) error {
	query := `
		INSERT INTO exchange_credentials (id, user_id, exchange, api_key_enc, api_secret_enc, api_key_last4, is_valid, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.pool.Exec(ctx, query,
		cred.ID, cred.UserID, cred.Exchange, cred.APIKeyEnc, cred.APISecretEnc, cred.APIKeyLast4, cred.IsValid, cred.CreatedAt)
	return err
}

func (r *ExchangeCredentialRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.ExchangeCredential, error) {
	query := `
		SELECT id, user_id, exchange, api_key_enc, api_secret_enc, api_key_last4, is_valid, created_at
		FROM exchange_credentials
		WHERE id = $1
	`
	var cred entities.ExchangeCredential
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&cred.ID, &cred.UserID, &cred.Exchange, &cred.APIKeyEnc, &cred.APISecretEnc, &cred.APIKeyLast4, &cred.IsValid, &cred.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &cred, nil
}

func (r *ExchangeCredentialRepositoryImpl) GetByUserAndExchange(ctx context.Context, userID uuid.UUID, exchange string) (*entities.ExchangeCredential, error) {
	query := `
		SELECT id, user_id, exchange, api_key_enc, api_secret_enc, api_key_last4, is_valid, created_at
		FROM exchange_credentials
		WHERE user_id = $1 AND exchange = $2
	`
	var cred entities.ExchangeCredential
	err := r.pool.QueryRow(ctx, query, userID, exchange).Scan(
		&cred.ID, &cred.UserID, &cred.Exchange, &cred.APIKeyEnc, &cred.APISecretEnc, &cred.APIKeyLast4, &cred.IsValid, &cred.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &cred, nil
}

func (r *ExchangeCredentialRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.ExchangeCredential, error) {
	query := `
		SELECT id, user_id, exchange, api_key_last4, is_valid, created_at
		FROM exchange_credentials
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creds []*entities.ExchangeCredential
	for rows.Next() {
		var cred entities.ExchangeCredential
		err := rows.Scan(
			&cred.ID, &cred.UserID, &cred.Exchange, &cred.APIKeyLast4, &cred.IsValid, &cred.CreatedAt)
		if err != nil {
			return nil, err
		}
		creds = append(creds, &cred)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return creds, nil
}

func (r *ExchangeCredentialRepositoryImpl) ListValid(ctx context.Context, exchange string) ([]*entities.ExchangeCredential, error) {
	query := `
		SELECT id, user_id, exchange, api_key_enc, api_secret_enc, api_key_last4, is_valid, created_at
		FROM exchange_credentials
		WHERE exchange = $1 AND is_valid = true
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, exchange)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creds []*entities.ExchangeCredential
	for rows.Next() {
		var cred entities.ExchangeCredential
		err := rows.Scan(
			&cred.ID, &cred.UserID, &cred.Exchange, &cred.APIKeyEnc, &cred.APISecretEnc, &cred.APIKeyLast4, &cred.IsValid, &cred.CreatedAt)
		if err != nil {
			return nil, err
		}
		creds = append(creds, &cred)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return creds, nil
}

func (r *ExchangeCredentialRepositoryImpl) Update(ctx context.Context, cred *entities.ExchangeCredential) error {
	query := `
		UPDATE exchange_credentials
		SET api_key_enc = $2, api_secret_enc = $3, api_key_last4 = $4, is_valid = $5
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		cred.ID, cred.APIKeyEnc, cred.APISecretEnc, cred.APIKeyLast4, cred.IsValid)
	return err
}

func (r *ExchangeCredentialRepositoryImpl) DeleteByIDAndUser(ctx context.Context, id uuid.UUID, userID uuid.UUID) (bool, error) {
	query := `DELETE FROM exchange_credentials WHERE id = $1 AND user_id = $2`
	commandTag, err := r.pool.Exec(ctx, query, id, userID)
	if err != nil {
		return false, err
	}
	return commandTag.RowsAffected() > 0, nil
}
```

## File: internal/infrastructure/repositories/guided_review_repository_impl.go
```go
package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type GuidedReviewRepositoryImpl struct {
	pool *pgxpool.Pool
}

type reviewTradeAgg struct {
	Symbol     string
	TradeCount int
	TotalPnL   float64
	Side       *string
}

func NewGuidedReviewRepository(pool *pgxpool.Pool) repositories.GuidedReviewRepository {
	return &GuidedReviewRepositoryImpl{pool: pool}
}

func (r *GuidedReviewRepositoryImpl) GetOrCreateToday(ctx context.Context, userID uuid.UUID, date string) (*entities.GuidedReview, []*entities.GuidedReviewItem, error) {
	// Try to get existing review for the date
	var review entities.GuidedReview
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, review_date::text, status, completed_at, created_at
		FROM guided_reviews
		WHERE user_id = $1 AND review_date = $2
	`, userID, date).Scan(
		&review.ID, &review.UserID, &review.ReviewDate,
		&review.Status, &review.CompletedAt, &review.CreatedAt,
	)

	if err == pgx.ErrNoRows {
		// Create new review
		review.ID = uuid.New()
		review.UserID = userID
		review.ReviewDate = date
		review.Status = entities.GuidedReviewStatusPending
		review.CreatedAt = time.Now().UTC()

		_, err = r.pool.Exec(ctx, `
			INSERT INTO guided_reviews (id, user_id, review_date, status, created_at)
			VALUES ($1, $2, $3, $4, $5)
		`, review.ID, review.UserID, review.ReviewDate, review.Status, review.CreatedAt)
		if err != nil {
			return nil, nil, fmt.Errorf("insert guided_reviews: %w", err)
		}

		// Auto-create items from trades for this date
		if err := r.createItemsFromTrades(ctx, userID, review.ID, date); err != nil {
			return nil, nil, fmt.Errorf("create items from trades: %w", err)
		}
	} else if err != nil {
		return nil, nil, fmt.Errorf("query guided_reviews: %w", err)
	}

	// Load items
	items, err := r.loadItems(ctx, review.ID)
	if err != nil {
		return nil, nil, err
	}

	// Recovery path: if a review row exists without items (e.g., partial create from previous error),
	// try to backfill items from trades and reload once.
	if len(items) == 0 {
		if err := r.createItemsFromTrades(ctx, userID, review.ID, date); err != nil {
			return nil, nil, fmt.Errorf("backfill items from trades: %w", err)
		}
		items, err = r.loadItems(ctx, review.ID)
		if err != nil {
			return nil, nil, err
		}
	}

	// If yesterday had post-complete trades that were not reviewed, carry them into today's review.
	if err := r.appendRolloverFromPreviousDay(ctx, userID, review.ID, date); err != nil {
		return nil, nil, fmt.Errorf("append rollover: %w", err)
	}

	// If today's review is completed and new trades occurred after completion, add supplement items.
	if review.Status == entities.GuidedReviewStatusCompleted {
		if err := r.appendSupplementItems(ctx, userID, review.ID, date, review.CompletedAt); err != nil {
			return nil, nil, fmt.Errorf("append supplement: %w", err)
		}
	}

	items, err = r.loadItems(ctx, review.ID)
	if err != nil {
		return nil, nil, err
	}

	return &review, items, nil
}

func (r *GuidedReviewRepositoryImpl) aggregateTradesAfter(ctx context.Context, userID uuid.UUID, date string, after *time.Time) (map[string]reviewTradeAgg, error) {
	base := `
		WITH base AS (
			SELECT
				symbol,
				UPPER(COALESCE(side, '')) AS side,
				trade_time,
				CASE
					WHEN realized_pnl::text ~ '^-?[0-9]+(\.[0-9]+)?$' THEN CAST(realized_pnl::text AS NUMERIC)
					ELSE 0
				END AS pnl
			FROM trades
			WHERE user_id = $1
			  AND trade_time::date = $2::date
	`
	args := []any{userID, date}
	if after != nil {
		base += ` AND trade_time > $3 `
		args = append(args, *after)
	}
	base += `
		),
		marked AS (
			SELECT
				symbol,
				side,
				trade_time,
				pnl,
				CASE
					WHEN LAG(trade_time) OVER (PARTITION BY symbol, side ORDER BY trade_time) IS NULL
						OR trade_time - LAG(trade_time) OVER (PARTITION BY symbol, side ORDER BY trade_time) > INTERVAL '90 seconds'
					THEN 1 ELSE 0
				END AS is_new_bundle
			FROM base
		),
		bundled AS (
			SELECT
				symbol,
				side,
				pnl,
				SUM(is_new_bundle) OVER (
					PARTITION BY symbol, side
					ORDER BY trade_time
					ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
				) AS bundle_idx
			FROM marked
		)
		SELECT
			symbol,
			COUNT(DISTINCT side || ':' || bundle_idx::text)::int AS trade_count,
			COALESCE(SUM(pnl), 0)::double precision AS total_pnl,
			MAX(side) AS side
		FROM bundled
		GROUP BY symbol
	`

	rows, err := r.pool.Query(ctx, base, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]reviewTradeAgg)
	for rows.Next() {
		var item reviewTradeAgg
		if err := rows.Scan(&item.Symbol, &item.TradeCount, &item.TotalPnL, &item.Side); err != nil {
			return nil, err
		}
		result[item.Symbol] = item
	}
	return result, rows.Err()
}

func (r *GuidedReviewRepositoryImpl) aggregateReviewItemsByPrefix(ctx context.Context, reviewID uuid.UUID, prefix string) (map[string]reviewTradeAgg, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			symbol,
			COALESCE(SUM(trade_count), 0)::int AS trade_count,
			COALESCE(SUM(COALESCE(pnl, 0)), 0)::double precision AS total_pnl,
			MAX(side) AS side
		FROM guided_review_items
		WHERE review_id = $1 AND bundle_key LIKE $2
		GROUP BY symbol
	`, reviewID, prefix+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]reviewTradeAgg)
	for rows.Next() {
		var item reviewTradeAgg
		if err := rows.Scan(&item.Symbol, &item.TradeCount, &item.TotalPnL, &item.Side); err != nil {
			return nil, err
		}
		result[item.Symbol] = item
	}
	return result, rows.Err()
}

func (r *GuidedReviewRepositoryImpl) appendSupplementItems(ctx context.Context, userID, reviewID uuid.UUID, date string, completedAt *time.Time) error {
	if completedAt == nil {
		return nil
	}
	tradesAfter, err := r.aggregateTradesAfter(ctx, userID, date, completedAt)
	if err != nil {
		return err
	}
	if len(tradesAfter) == 0 {
		return nil
	}
	orderBase := 1000
	for symbol, agg := range tradesAfter {
		var existingCount int
		var answeredCount int
		err := r.pool.QueryRow(ctx, `
			SELECT
				COALESCE(SUM(trade_count), 0)::int,
				COALESCE(SUM(CASE WHEN intent IS NOT NULL THEN 1 ELSE 0 END), 0)::int
			FROM guided_review_items
			WHERE review_id = $1
			  AND symbol = $2
			  AND bundle_key LIKE $3
		`, reviewID, symbol, "SUPPLEMENT:"+date+":"+symbol+":%").Scan(&existingCount, &answeredCount)
		if err != nil {
			return err
		}
		// Keep answered supplement rows immutable.
		if answeredCount > 0 {
			continue
		}

		// Rebuild unanswered supplement rows so trade_count reflects latest bundling rule.
		if _, err := r.pool.Exec(ctx, `
			DELETE FROM guided_review_items
			WHERE review_id = $1
			  AND symbol = $2
			  AND bundle_key LIKE $3
			  AND intent IS NULL
		`, reviewID, symbol, "SUPPLEMENT:"+date+":"+symbol+":%"); err != nil {
			return err
		}
		if agg.TradeCount <= 0 {
			continue
		}

		itemID := uuid.New()
		bundleKey := fmt.Sprintf("SUPPLEMENT:%s:%s:%d", date, symbol, time.Now().UnixNano())
		_, err = r.pool.Exec(ctx, `
			INSERT INTO guided_review_items (id, review_id, trade_id, bundle_key, symbol, side, pnl, trade_count, order_index, created_at)
			VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, NOW())
		`, itemID, reviewID, bundleKey, symbol, agg.Side, agg.TotalPnL, agg.TradeCount, orderBase)
		if err != nil {
			return err
		}
		orderBase++
	}
	return nil
}

func (r *GuidedReviewRepositoryImpl) appendRolloverFromPreviousDay(ctx context.Context, userID, todayReviewID uuid.UUID, date string) error {
	currentDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil
	}
	prevDate := currentDate.AddDate(0, 0, -1).Format("2006-01-02")

	// Skip if today's review already has rollover items from yesterday.
	var existingCount int
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM guided_review_items
		WHERE review_id = $1 AND bundle_key LIKE $2
	`, todayReviewID, "ROLLOVER:"+prevDate+":%").Scan(&existingCount); err != nil {
		return err
	}
	if existingCount > 0 {
		return nil
	}

	var prevReviewID uuid.UUID
	var prevCompletedAt *time.Time
	err = r.pool.QueryRow(ctx, `
		SELECT id, completed_at
		FROM guided_reviews
		WHERE user_id = $1 AND review_date = $2::date AND status = $3
	`, userID, prevDate, entities.GuidedReviewStatusCompleted).Scan(&prevReviewID, &prevCompletedAt)
	if err == pgx.ErrNoRows || prevCompletedAt == nil {
		return nil
	}
	if err != nil {
		return err
	}

	prevAfter, err := r.aggregateTradesAfter(ctx, userID, prevDate, prevCompletedAt)
	if err != nil {
		return err
	}
	if len(prevAfter) == 0 {
		return nil
	}
	prevSupp, err := r.aggregateReviewItemsByPrefix(ctx, prevReviewID, "SUPPLEMENT:")
	if err != nil {
		return err
	}

	orderBase := 2000
	for symbol, agg := range prevAfter {
		existing := prevSupp[symbol]
		deltaCount := agg.TradeCount - existing.TradeCount
		if deltaCount <= 0 {
			continue
		}
		deltaPnl := agg.TotalPnL - existing.TotalPnL
		itemID := uuid.New()
		bundleKey := fmt.Sprintf("ROLLOVER:%s:%s", prevDate, symbol)
		_, err := r.pool.Exec(ctx, `
			INSERT INTO guided_review_items (id, review_id, trade_id, bundle_key, symbol, side, pnl, trade_count, order_index, created_at)
			VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, NOW())
		`, itemID, todayReviewID, bundleKey, symbol, agg.Side, deltaPnl, deltaCount, orderBase)
		if err != nil {
			return err
		}
		orderBase++
	}
	return nil
}

func (r *GuidedReviewRepositoryImpl) createItemsFromTrades(ctx context.Context, userID, reviewID uuid.UUID, date string) error {
	// Query trades for this user on this date, grouped by symbol.
	// For guided review count, merge split fills into one "order-like" bundle when
	// same symbol+side trades occur within 90 seconds.
	rows, err := r.pool.Query(ctx, `
		WITH base AS (
			SELECT
				symbol,
				UPPER(COALESCE(side, '')) AS side,
				trade_time,
				CASE
					WHEN realized_pnl::text ~ '^-?[0-9]+(\.[0-9]+)?$' THEN CAST(realized_pnl::text AS NUMERIC)
					ELSE 0
				END AS pnl
			FROM trades
			WHERE user_id = $1
			  AND trade_time::date = $2::date
		),
		marked AS (
			SELECT
				symbol,
				side,
				trade_time,
				pnl,
				CASE
					WHEN LAG(trade_time) OVER (PARTITION BY symbol, side ORDER BY trade_time) IS NULL
						OR trade_time - LAG(trade_time) OVER (PARTITION BY symbol, side ORDER BY trade_time) > INTERVAL '90 seconds'
					THEN 1 ELSE 0
				END AS is_new_bundle
			FROM base
		),
		bundled AS (
			SELECT
				symbol,
				side,
				pnl,
				SUM(is_new_bundle) OVER (
					PARTITION BY symbol, side
					ORDER BY trade_time
					ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
				) AS bundle_idx
			FROM marked
		)
		SELECT
			symbol,
			MAX(side) AS side,
			COALESCE(SUM(pnl), 0) AS total_pnl,
			COUNT(DISTINCT side || ':' || bundle_idx::text)::int AS trade_count
		FROM bundled
		GROUP BY symbol
		ORDER BY COUNT(DISTINCT side || ':' || bundle_idx::text) DESC
	`, userID, date)
	if err != nil {
		return fmt.Errorf("query trades: %w", err)
	}
	defer rows.Close()

	orderIndex := 0
	createdCount := 0
	for rows.Next() {
		var symbol string
		var side *string
		var totalPnl *float64
		var tradeCount int

		if err := rows.Scan(&symbol, &side, &totalPnl, &tradeCount); err != nil {
			return fmt.Errorf("scan trade group: %w", err)
		}

		bundleKey := fmt.Sprintf("%s:%s", symbol, date)

		itemID := uuid.New()
		_, err = r.pool.Exec(ctx, `
			INSERT INTO guided_review_items (id, review_id, trade_id, bundle_key, symbol, side, pnl, trade_count, order_index, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
		`, itemID, reviewID, nil, bundleKey, symbol, side, totalPnl, tradeCount, orderIndex)
		if err != nil {
			return fmt.Errorf("insert guided_review_items: %w", err)
		}
		orderIndex++
		createdCount++
	}

	if err := rows.Err(); err != nil {
		return err
	}

	// No-trade day fallback: create one synthetic guided item so user can still complete routine.
	if createdCount == 0 {
		noTradeID := uuid.New()
		bundleKey := fmt.Sprintf("NO_TRADE:%s", date)
		_, err = r.pool.Exec(ctx, `
			INSERT INTO guided_review_items (id, review_id, trade_id, bundle_key, symbol, side, pnl, trade_count, order_index, created_at)
			VALUES ($1, $2, NULL, $3, $4, NULL, NULL, 0, 0, NOW())
		`, noTradeID, reviewID, bundleKey, "__NO_TRADE__")
		if err != nil {
			return fmt.Errorf("insert no-trade guided_review_item: %w", err)
		}
	}

	return nil
}

func (r *GuidedReviewRepositoryImpl) loadItems(ctx context.Context, reviewID uuid.UUID) ([]*entities.GuidedReviewItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, review_id, trade_id, bundle_key, symbol, side, pnl, trade_count,
		       intent, emotions, pattern_match, memo, order_index, created_at
		FROM guided_review_items
		WHERE review_id = $1
		ORDER BY order_index ASC
	`, reviewID)
	if err != nil {
		return nil, fmt.Errorf("query guided_review_items: %w", err)
	}
	defer rows.Close()

	var items []*entities.GuidedReviewItem
	for rows.Next() {
		var item entities.GuidedReviewItem
		if err := rows.Scan(
			&item.ID, &item.ReviewID, &item.TradeID, &item.BundleKey,
			&item.Symbol, &item.Side, &item.PnL, &item.TradeCount,
			&item.Intent, &item.Emotions, &item.PatternMatch, &item.Memo,
			&item.OrderIndex, &item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan guided_review_item: %w", err)
		}
		items = append(items, &item)
	}

	return items, rows.Err()
}

func (r *GuidedReviewRepositoryImpl) SubmitItem(ctx context.Context, userID uuid.UUID, itemID uuid.UUID, input repositories.SubmitItemInput) error {
	// Verify ownership: item belongs to a review owned by user
	var reviewUserID uuid.UUID
	var reviewID uuid.UUID
	err := r.pool.QueryRow(ctx, `
		SELECT gr.user_id, gr.id
		FROM guided_review_items gri
		JOIN guided_reviews gr ON gr.id = gri.review_id
		WHERE gri.id = $1
	`, itemID).Scan(&reviewUserID, &reviewID)
	if err == pgx.ErrNoRows {
		return fmt.Errorf("item not found")
	}
	if err != nil {
		return fmt.Errorf("verify item ownership: %w", err)
	}
	if reviewUserID != userID {
		return fmt.Errorf("item not found")
	}

	// Update item
	var intentPtr *string
	if input.Intent != "" {
		intentPtr = &input.Intent
	}
	var emotionsPtr json.RawMessage
	if len(input.Emotions) > 0 && string(input.Emotions) != "null" {
		emotionsPtr = input.Emotions
	}
	var patternPtr *string
	if input.PatternMatch != "" {
		patternPtr = &input.PatternMatch
	}
	var memoPtr *string
	if input.Memo != "" {
		memoPtr = &input.Memo
	}

	_, err = r.pool.Exec(ctx, `
		UPDATE guided_review_items
		SET intent = $1, emotions = $2, pattern_match = $3, memo = $4
		WHERE id = $5
	`, intentPtr, emotionsPtr, patternPtr, memoPtr, itemID)
	if err != nil {
		return fmt.Errorf("update guided_review_items: %w", err)
	}

	// Update review status to in_progress if still pending
	_, err = r.pool.Exec(ctx, `
		UPDATE guided_reviews
		SET status = $1
		WHERE id = $2 AND status = $3
	`, entities.GuidedReviewStatusInProgress, reviewID, entities.GuidedReviewStatusPending)

	return err
}

func (r *GuidedReviewRepositoryImpl) CompleteReview(ctx context.Context, userID uuid.UUID, reviewID uuid.UUID) (*entities.UserStreak, error) {
	// Verify ownership
	var review entities.GuidedReview
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, review_date::text, status FROM guided_reviews WHERE id = $1
	`, reviewID).Scan(&review.ID, &review.UserID, &review.ReviewDate, &review.Status)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("review not found")
	}
	if err != nil {
		return nil, fmt.Errorf("query review: %w", err)
	}
	if review.UserID != userID {
		return nil, fmt.Errorf("review not found")
	}

	// Mark review as completed
	now := time.Now().UTC()
	_, err = r.pool.Exec(ctx, `
		UPDATE guided_reviews
		SET status = $1, completed_at = $2
		WHERE id = $3
	`, entities.GuidedReviewStatusCompleted, now, reviewID)
	if err != nil {
		return nil, fmt.Errorf("complete review: %w", err)
	}

	// Update streak
	streak, err := r.updateStreak(ctx, userID, review.ReviewDate)
	if err != nil {
		return nil, fmt.Errorf("update streak: %w", err)
	}

	return streak, nil
}

func (r *GuidedReviewRepositoryImpl) updateStreak(ctx context.Context, userID uuid.UUID, reviewDate string) (*entities.UserStreak, error) {
	// Upsert user_streaks
	var streak entities.UserStreak
	err := r.pool.QueryRow(ctx, `
		SELECT user_id, current_streak, longest_streak, last_review_date::text, updated_at
		FROM user_streaks WHERE user_id = $1
	`, userID).Scan(&streak.UserID, &streak.CurrentStreak, &streak.LongestStreak, &streak.LastReviewDate, &streak.UpdatedAt)

	if err == pgx.ErrNoRows {
		// First ever review
		streak = entities.UserStreak{
			UserID:         userID,
			CurrentStreak:  1,
			LongestStreak:  1,
			LastReviewDate: &reviewDate,
			UpdatedAt:      time.Now().UTC(),
		}
		_, err = r.pool.Exec(ctx, `
			INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_review_date, updated_at)
			VALUES ($1, $2, $3, $4, $5)
		`, streak.UserID, streak.CurrentStreak, streak.LongestStreak, streak.LastReviewDate, streak.UpdatedAt)
		if err != nil {
			return nil, err
		}
		return &streak, nil
	}
	if err != nil {
		return nil, err
	}

	// Calculate new streak
	if streak.LastReviewDate != nil && *streak.LastReviewDate == reviewDate {
		// Same day, no change
		return &streak, nil
	}

	// Check if yesterday
	reviewTime, _ := time.Parse("2006-01-02", reviewDate)
	var isConsecutive bool
	if streak.LastReviewDate != nil {
		lastTime, _ := time.Parse("2006-01-02", *streak.LastReviewDate)
		diff := reviewTime.Sub(lastTime).Hours() / 24
		isConsecutive = diff >= 0.5 && diff <= 1.5
	}

	if isConsecutive {
		streak.CurrentStreak++
	} else {
		streak.CurrentStreak = 1
	}
	if streak.CurrentStreak > streak.LongestStreak {
		streak.LongestStreak = streak.CurrentStreak
	}
	streak.LastReviewDate = &reviewDate
	streak.UpdatedAt = time.Now().UTC()

	_, err = r.pool.Exec(ctx, `
		UPDATE user_streaks
		SET current_streak = $1, longest_streak = $2, last_review_date = $3, updated_at = $4
		WHERE user_id = $5
	`, streak.CurrentStreak, streak.LongestStreak, streak.LastReviewDate, streak.UpdatedAt, streak.UserID)
	if err != nil {
		return nil, err
	}

	return &streak, nil
}

func (r *GuidedReviewRepositoryImpl) GetStreak(ctx context.Context, userID uuid.UUID) (*entities.UserStreak, error) {
	var streak entities.UserStreak
	err := r.pool.QueryRow(ctx, `
		SELECT user_id, current_streak, longest_streak, last_review_date::text, updated_at
		FROM user_streaks WHERE user_id = $1
	`, userID).Scan(&streak.UserID, &streak.CurrentStreak, &streak.LongestStreak, &streak.LastReviewDate, &streak.UpdatedAt)

	if err == pgx.ErrNoRows {
		return &entities.UserStreak{
			UserID:        userID,
			CurrentStreak: 0,
			LongestStreak: 0,
			UpdatedAt:     time.Now().UTC(),
		}, nil
	}
	if err != nil {
		return nil, err
	}
	return &streak, nil
}

func (r *GuidedReviewRepositoryImpl) ListReviews(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*entities.GuidedReview, int, error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM guided_reviews WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, review_date::text, status, completed_at, created_at
		FROM guided_reviews
		WHERE user_id = $1
		ORDER BY review_date DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var reviews []*entities.GuidedReview
	for rows.Next() {
		var r entities.GuidedReview
		if err := rows.Scan(&r.ID, &r.UserID, &r.ReviewDate, &r.Status, &r.CompletedAt, &r.CreatedAt); err != nil {
			return nil, 0, err
		}
		reviews = append(reviews, &r)
	}

	return reviews, total, rows.Err()
}
```

## File: internal/infrastructure/repositories/manual_position_repository_impl.go
```go
package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type ManualPositionRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewManualPositionRepository(pool *pgxpool.Pool) repositories.ManualPositionRepository {
	return &ManualPositionRepositoryImpl{pool: pool}
}

func (r *ManualPositionRepositoryImpl) List(ctx context.Context, userID uuid.UUID, filter repositories.ManualPositionFilter) ([]*entities.ManualPosition, error) {
	query := `
		SELECT id, user_id, symbol, asset_class, venue, position_side, size, entry_price,
			stop_loss, take_profit, leverage, strategy, memo, status, opened_at, closed_at,
			created_at, updated_at
		FROM manual_positions
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	if filter.Status != "" && filter.Status != "all" {
		query += " AND status = $2"
		args = append(args, filter.Status)
	}
	query += " ORDER BY updated_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	positions := make([]*entities.ManualPosition, 0)
	for rows.Next() {
		var item entities.ManualPosition
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Symbol,
			&item.AssetClass,
			&item.Venue,
			&item.PositionSide,
			&item.Size,
			&item.EntryPrice,
			&item.StopLoss,
			&item.TakeProfit,
			&item.Leverage,
			&item.Strategy,
			&item.Memo,
			&item.Status,
			&item.OpenedAt,
			&item.ClosedAt,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		positions = append(positions, &item)
	}
	return positions, rows.Err()
}

func (r *ManualPositionRepositoryImpl) GetByID(ctx context.Context, id, userID uuid.UUID) (*entities.ManualPosition, error) {
	query := `
		SELECT id, user_id, symbol, asset_class, venue, position_side, size, entry_price,
			stop_loss, take_profit, leverage, strategy, memo, status, opened_at, closed_at,
			created_at, updated_at
		FROM manual_positions
		WHERE id = $1 AND user_id = $2
	`
	var item entities.ManualPosition
	if err := r.pool.QueryRow(ctx, query, id, userID).Scan(
		&item.ID,
		&item.UserID,
		&item.Symbol,
		&item.AssetClass,
		&item.Venue,
		&item.PositionSide,
		&item.Size,
		&item.EntryPrice,
		&item.StopLoss,
		&item.TakeProfit,
		&item.Leverage,
		&item.Strategy,
		&item.Memo,
		&item.Status,
		&item.OpenedAt,
		&item.ClosedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *ManualPositionRepositoryImpl) Create(ctx context.Context, position *entities.ManualPosition) error {
	position.ID = uuid.New()
	position.CreatedAt = time.Now().UTC()
	position.UpdatedAt = position.CreatedAt

	query := `
		INSERT INTO manual_positions (
			id, user_id, symbol, asset_class, venue, position_side, size, entry_price,
			stop_loss, take_profit, leverage, strategy, memo, status, opened_at, closed_at,
			created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
		)
	`
	_, err := r.pool.Exec(ctx, query,
		position.ID,
		position.UserID,
		position.Symbol,
		position.AssetClass,
		position.Venue,
		position.PositionSide,
		position.Size,
		position.EntryPrice,
		position.StopLoss,
		position.TakeProfit,
		position.Leverage,
		position.Strategy,
		position.Memo,
		position.Status,
		position.OpenedAt,
		position.ClosedAt,
		position.CreatedAt,
		position.UpdatedAt,
	)
	return err
}

func (r *ManualPositionRepositoryImpl) Update(ctx context.Context, position *entities.ManualPosition) error {
	position.UpdatedAt = time.Now().UTC()
	query := `
		UPDATE manual_positions
		SET symbol=$1, asset_class=$2, venue=$3, position_side=$4, size=$5, entry_price=$6,
			stop_loss=$7, take_profit=$8, leverage=$9, strategy=$10, memo=$11, status=$12,
			opened_at=$13, closed_at=$14, updated_at=$15
		WHERE id=$16 AND user_id=$17
	`
	_, err := r.pool.Exec(ctx, query,
		position.Symbol,
		position.AssetClass,
		position.Venue,
		position.PositionSide,
		position.Size,
		position.EntryPrice,
		position.StopLoss,
		position.TakeProfit,
		position.Leverage,
		position.Strategy,
		position.Memo,
		position.Status,
		position.OpenedAt,
		position.ClosedAt,
		position.UpdatedAt,
		position.ID,
		position.UserID,
	)
	return err
}

func (r *ManualPositionRepositoryImpl) Delete(ctx context.Context, id, userID uuid.UUID) error {
	query := `DELETE FROM manual_positions WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, id, userID)
	return err
}
```

## File: internal/infrastructure/repositories/notification_repository_impl.go
```go
package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

// --- NotificationChannel ---

type NotificationChannelRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewNotificationChannelRepository(pool *pgxpool.Pool) repositories.NotificationChannelRepository {
	return &NotificationChannelRepositoryImpl{pool: pool}
}

func (r *NotificationChannelRepositoryImpl) Upsert(ctx context.Context, ch *entities.NotificationChannel) error {
	query := `
		INSERT INTO notification_channels (id, user_id, channel_type, config, enabled, verified, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id, channel_type) DO UPDATE SET config = $4, enabled = $5, verified = $6
	`
	_, err := r.pool.Exec(ctx, query,
		ch.ID, ch.UserID, ch.ChannelType, ch.Config, ch.Enabled, ch.Verified, ch.CreatedAt)
	return err
}

func (r *NotificationChannelRepositoryImpl) GetByUserAndType(ctx context.Context, userID uuid.UUID, channelType entities.ChannelType) (*entities.NotificationChannel, error) {
	query := `
		SELECT id, user_id, channel_type, config, enabled, verified, created_at
		FROM notification_channels WHERE user_id = $1 AND channel_type = $2
	`
	var ch entities.NotificationChannel
	err := r.pool.QueryRow(ctx, query, userID, channelType).Scan(
		&ch.ID, &ch.UserID, &ch.ChannelType, &ch.Config, &ch.Enabled, &ch.Verified, &ch.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &ch, nil
}

func (r *NotificationChannelRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.NotificationChannel, error) {
	query := `
		SELECT id, user_id, channel_type, config, enabled, verified, created_at
		FROM notification_channels WHERE user_id = $1
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []*entities.NotificationChannel
	for rows.Next() {
		var ch entities.NotificationChannel
		if err := rows.Scan(&ch.ID, &ch.UserID, &ch.ChannelType, &ch.Config, &ch.Enabled, &ch.Verified, &ch.CreatedAt); err != nil {
			return nil, err
		}
		channels = append(channels, &ch)
	}
	return channels, rows.Err()
}

func (r *NotificationChannelRepositoryImpl) DeleteByUserAndType(ctx context.Context, userID uuid.UUID, channelType entities.ChannelType) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM notification_channels WHERE user_id = $1 AND channel_type = $2`, userID, channelType)
	return err
}

func (r *NotificationChannelRepositoryImpl) ListVerifiedByUser(ctx context.Context, userID uuid.UUID) ([]*entities.NotificationChannel, error) {
	query := `
		SELECT id, user_id, channel_type, config, enabled, verified, created_at
		FROM notification_channels WHERE user_id = $1 AND enabled = true AND verified = true
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []*entities.NotificationChannel
	for rows.Next() {
		var ch entities.NotificationChannel
		if err := rows.Scan(&ch.ID, &ch.UserID, &ch.ChannelType, &ch.Config, &ch.Enabled, &ch.Verified, &ch.CreatedAt); err != nil {
			return nil, err
		}
		channels = append(channels, &ch)
	}
	return channels, rows.Err()
}

// --- TelegramVerifyCode ---

type TelegramVerifyCodeRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewTelegramVerifyCodeRepository(pool *pgxpool.Pool) repositories.TelegramVerifyCodeRepository {
	return &TelegramVerifyCodeRepositoryImpl{pool: pool}
}

func (r *TelegramVerifyCodeRepositoryImpl) Create(ctx context.Context, code *entities.TelegramVerifyCode) error {
	query := `
		INSERT INTO telegram_verify_codes (id, user_id, code, expires_at, used, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	code.ID = uuid.New()
	code.CreatedAt = time.Now().UTC()
	_, err := r.pool.Exec(ctx, query,
		code.ID, code.UserID, code.Code, code.ExpiresAt, code.Used, code.CreatedAt)
	return err
}

func (r *TelegramVerifyCodeRepositoryImpl) FindValidCode(ctx context.Context, code string) (*entities.TelegramVerifyCode, error) {
	query := `
		SELECT id, user_id, code, expires_at, used, created_at
		FROM telegram_verify_codes
		WHERE code = $1 AND used = false AND expires_at > $2
		ORDER BY created_at DESC LIMIT 1
	`
	var vc entities.TelegramVerifyCode
	err := r.pool.QueryRow(ctx, query, code, time.Now().UTC()).Scan(
		&vc.ID, &vc.UserID, &vc.Code, &vc.ExpiresAt, &vc.Used, &vc.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &vc, nil
}

func (r *TelegramVerifyCodeRepositoryImpl) MarkUsed(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE telegram_verify_codes SET used = true WHERE id = $1`, id)
	return err
}
```

## File: internal/infrastructure/repositories/outcome_repository_impl.go
```go
package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type OutcomeRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewOutcomeRepository(pool *pgxpool.Pool) repositories.OutcomeRepository {
	return &OutcomeRepositoryImpl{pool: pool}
}

func (r *OutcomeRepositoryImpl) CreateIfNotExists(ctx context.Context, outcome *entities.Outcome) (bool, error) {
	query := `
        INSERT INTO outcomes (id, bubble_id, period, reference_price, outcome_price, pnl_percent, calculated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (bubble_id, period) DO NOTHING
    `
	result, err := r.pool.Exec(ctx, query,
		outcome.ID, outcome.BubbleID, outcome.Period, outcome.ReferencePrice, outcome.OutcomePrice, outcome.PnLPercent, outcome.CalculatedAt)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

func (r *OutcomeRepositoryImpl) ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.Outcome, error) {
	query := `
        SELECT id, bubble_id, period, reference_price, outcome_price, pnl_percent, calculated_at
        FROM outcomes
        WHERE bubble_id = $1
        ORDER BY calculated_at DESC
    `
	rows, err := r.pool.Query(ctx, query, bubbleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var outcomes []*entities.Outcome
	for rows.Next() {
		var outcome entities.Outcome
		if err := rows.Scan(
			&outcome.ID, &outcome.BubbleID, &outcome.Period, &outcome.ReferencePrice, &outcome.OutcomePrice, &outcome.PnLPercent, &outcome.CalculatedAt); err != nil {
			return nil, err
		}
		outcomes = append(outcomes, &outcome)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return outcomes, nil
}

func (r *OutcomeRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.Outcome, error) {
	query := `
        SELECT o.id, o.bubble_id, o.period, o.reference_price, o.outcome_price, o.pnl_percent, o.calculated_at
        FROM outcomes o
        JOIN bubbles b ON b.id = o.bubble_id
        WHERE b.user_id = $1
        ORDER BY o.calculated_at DESC
        LIMIT 1000
    `
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var outcomes []*entities.Outcome
	for rows.Next() {
		var outcome entities.Outcome
		if err := rows.Scan(
			&outcome.ID, &outcome.BubbleID, &outcome.Period, &outcome.ReferencePrice, &outcome.OutcomePrice, &outcome.PnLPercent, &outcome.CalculatedAt); err != nil {
			return nil, err
		}
		outcomes = append(outcomes, &outcome)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return outcomes, nil
}

func (r *OutcomeRepositoryImpl) ListPending(ctx context.Context, period string, cutoff time.Time, limit int) ([]*repositories.PendingOutcomeBubble, error) {
	query := `
        SELECT b.id, b.symbol, b.candle_time, b.price
        FROM bubbles b
        WHERE b.candle_time <= $1
          AND NOT EXISTS (
            SELECT 1 FROM outcomes o
            WHERE o.bubble_id = b.id AND o.period = $2
          )
        ORDER BY b.candle_time ASC
        LIMIT $3
    `
	rows, err := r.pool.Query(ctx, query, cutoff, period, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pending []*repositories.PendingOutcomeBubble
	for rows.Next() {
		var item repositories.PendingOutcomeBubble
		if err := rows.Scan(&item.BubbleID, &item.Symbol, &item.CandleTime, &item.Price); err != nil {
			return nil, err
		}
		pending = append(pending, &item)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return pending, nil
}

func (r *OutcomeRepositoryImpl) ListRecentWithoutAccuracy(ctx context.Context, since time.Time, limit int) ([]*entities.Outcome, error) {
	query := `
		SELECT o.id, o.bubble_id, o.period, o.reference_price, o.outcome_price, o.pnl_percent, o.calculated_at
		FROM outcomes o
		WHERE o.calculated_at >= $1
		  AND NOT EXISTS (
			SELECT 1 FROM ai_opinion_accuracies a
			WHERE a.outcome_id = o.id
		  )
		  AND EXISTS (
			SELECT 1 FROM ai_opinions ao
			WHERE ao.bubble_id = o.bubble_id
		  )
		ORDER BY o.calculated_at ASC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, since, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var outcomes []*entities.Outcome
	for rows.Next() {
		var outcome entities.Outcome
		if err := rows.Scan(
			&outcome.ID, &outcome.BubbleID, &outcome.Period, &outcome.ReferencePrice,
			&outcome.OutcomePrice, &outcome.PnLPercent, &outcome.CalculatedAt); err != nil {
			return nil, err
		}
		outcomes = append(outcomes, &outcome)
	}

	return outcomes, rows.Err()
}
```

## File: internal/infrastructure/repositories/portfolio_repository_impl.go
```go
package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type PortfolioRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewPortfolioRepository(pool *pgxpool.Pool) repositories.PortfolioRepository {
	return &PortfolioRepositoryImpl{pool: pool}
}

func (r *PortfolioRepositoryImpl) UpsertVenue(ctx context.Context, code string, venueType string, displayName string, chain string) (uuid.UUID, error) {
	query := `
		INSERT INTO venues (code, venue_type, display_name, chain)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (code) DO UPDATE
		SET venue_type = EXCLUDED.venue_type,
			display_name = EXCLUDED.display_name,
			chain = COALESCE(EXCLUDED.chain, venues.chain)
		RETURNING id
	`
	var id uuid.UUID
	err := r.pool.QueryRow(ctx, query, code, venueType, displayName, nullIfEmpty(chain)).Scan(&id)
	return id, err
}

func (r *PortfolioRepositoryImpl) UpsertAccount(ctx context.Context, userID uuid.UUID, venueID uuid.UUID, label string, address *string, source string) (uuid.UUID, error) {
	query := `
		INSERT INTO accounts (user_id, venue_id, label, address, source)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, venue_id, label) DO UPDATE
		SET address = COALESCE(EXCLUDED.address, accounts.address),
			source = EXCLUDED.source
		RETURNING id
	`
	var id uuid.UUID
	err := r.pool.QueryRow(ctx, query, userID, venueID, label, address, source).Scan(&id)
	return id, err
}

func (r *PortfolioRepositoryImpl) UpsertInstrument(ctx context.Context, assetClass string, baseAsset string, quoteAsset string, symbol string) (uuid.UUID, error) {
	query := `
		INSERT INTO instruments (asset_class, base_asset, quote_asset, symbol)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (asset_class, symbol) DO UPDATE
		SET base_asset = EXCLUDED.base_asset,
			quote_asset = EXCLUDED.quote_asset
		RETURNING id
	`
	var id uuid.UUID
	err := r.pool.QueryRow(ctx, query, assetClass, baseAsset, quoteAsset, symbol).Scan(&id)
	return id, err
}

func (r *PortfolioRepositoryImpl) UpsertInstrumentMapping(ctx context.Context, instrumentID uuid.UUID, venueID uuid.UUID, venueSymbol string) error {
	query := `
		INSERT INTO instrument_mappings (instrument_id, venue_id, venue_symbol)
		VALUES ($1, $2, $3)
		ON CONFLICT (venue_id, venue_symbol) DO UPDATE
		SET instrument_id = EXCLUDED.instrument_id
	`
	_, err := r.pool.Exec(ctx, query, instrumentID, venueID, venueSymbol)
	return err
}

func (r *PortfolioRepositoryImpl) CreateTradeEvent(ctx context.Context, event *entities.TradeEvent) error {
	query := `
		INSERT INTO trade_events (
			id, user_id, account_id, venue_id, instrument_id, asset_class, venue_type, event_type,
			side, qty, price, fee, fee_asset, executed_at, source, external_id, metadata, dedupe_key
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		)
	`
	_, err := r.pool.Exec(
		ctx,
		query,
		event.ID,
		event.UserID,
		event.AccountID,
		event.VenueID,
		event.InstrumentID,
		event.AssetClass,
		event.VenueType,
		event.EventType,
		event.Side,
		event.Qty,
		event.Price,
		event.Fee,
		event.FeeAsset,
		event.ExecutedAt,
		event.Source,
		event.ExternalID,
		event.Metadata,
		event.DedupeKey,
	)
	return err
}

func (r *PortfolioRepositoryImpl) ListTimeline(ctx context.Context, userID uuid.UUID, filter repositories.TimelineFilter) ([]repositories.TimelineEvent, error) {
	conditions := []string{"e.user_id = $1"}
	args := []interface{}{userID}
	argIndex := 2

	if filter.From != nil {
		conditions = append(conditions, fmt.Sprintf("e.executed_at >= $%d", argIndex))
		args = append(args, *filter.From)
		argIndex++
	}
	if filter.To != nil {
		conditions = append(conditions, fmt.Sprintf("e.executed_at <= $%d", argIndex))
		args = append(args, *filter.To)
		argIndex++
	}
	if len(filter.AssetClasses) > 0 {
		conditions = append(conditions, fmt.Sprintf("e.asset_class = ANY($%d)", argIndex))
		args = append(args, filter.AssetClasses)
		argIndex++
	}
	if len(filter.Venues) > 0 {
		conditions = append(conditions, fmt.Sprintf("v.code = ANY($%d)", argIndex))
		args = append(args, filter.Venues)
		argIndex++
	}
	if len(filter.Sources) > 0 {
		conditions = append(conditions, fmt.Sprintf("e.source = ANY($%d)", argIndex))
		args = append(args, filter.Sources)
		argIndex++
	}
	if len(filter.EventTypes) > 0 {
		conditions = append(conditions, fmt.Sprintf("e.event_type = ANY($%d)", argIndex))
		args = append(args, filter.EventTypes)
		argIndex++
	}
	if filter.Cursor != nil {
		conditions = append(conditions, fmt.Sprintf("(e.executed_at, e.id) < ($%d, $%d)", argIndex, argIndex+1))
		args = append(args, filter.Cursor.Time, filter.Cursor.ID)
		argIndex += 2
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	query := fmt.Sprintf(`
		SELECT
			e.id,
			e.executed_at,
			e.asset_class,
			e.venue_type,
			COALESCE(v.code, '') as venue_code,
			COALESCE(v.display_name, '') as venue_name,
			COALESCE(i.symbol, '') as instrument_symbol,
			e.event_type,
			e.side,
			e.qty,
			e.price,
			e.fee,
			e.fee_asset,
			e.source,
			e.external_id,
			e.metadata,
			a.label
		FROM trade_events e
		LEFT JOIN venues v ON e.venue_id = v.id
		LEFT JOIN instruments i ON e.instrument_id = i.id
		LEFT JOIN accounts a ON e.account_id = a.id
		%s
		ORDER BY e.executed_at DESC, e.id DESC
		LIMIT $%d
	`, whereClause, argIndex)

	args = append(args, limit)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]repositories.TimelineEvent, 0)
	for rows.Next() {
		var event repositories.TimelineEvent
		var metadata []byte
		if err := rows.Scan(
			&event.ID,
			&event.ExecutedAt,
			&event.AssetClass,
			&event.VenueType,
			&event.VenueCode,
			&event.VenueName,
			&event.Instrument,
			&event.EventType,
			&event.Side,
			&event.Qty,
			&event.Price,
			&event.Fee,
			&event.FeeAsset,
			&event.Source,
			&event.ExternalID,
			&metadata,
			&event.AccountLabel,
		); err != nil {
			return nil, err
		}

		if metadata != nil {
			raw := json.RawMessage(metadata)
			event.Metadata = &raw
		}

		events = append(events, event)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return events, nil
}

func (r *PortfolioRepositoryImpl) ListPositions(ctx context.Context, userID uuid.UUID, filter repositories.PositionFilter) ([]repositories.PositionSummary, error) {
	conditions := []string{"p.user_id = $1"}
	args := []interface{}{userID}
	argIndex := 2

	if filter.Status != "" && filter.Status != "all" {
		conditions = append(conditions, fmt.Sprintf("p.status = $%d", argIndex))
		args = append(args, filter.Status)
		argIndex++
	}
	if filter.From != nil {
		conditions = append(conditions, fmt.Sprintf("COALESCE(p.last_executed_at, p.opened_at) >= $%d", argIndex))
		args = append(args, *filter.From)
		argIndex++
	}
	if filter.To != nil {
		conditions = append(conditions, fmt.Sprintf("COALESCE(p.last_executed_at, p.opened_at) <= $%d", argIndex))
		args = append(args, *filter.To)
		argIndex++
	}
	if len(filter.AssetClasses) > 0 {
		conditions = append(conditions, fmt.Sprintf("i.asset_class = ANY($%d)", argIndex))
		args = append(args, filter.AssetClasses)
		argIndex++
	}
	if len(filter.Venues) > 0 {
		conditions = append(conditions, fmt.Sprintf("v.code = ANY($%d)", argIndex))
		args = append(args, filter.Venues)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")
	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	query := fmt.Sprintf(`
		SELECT
			COALESCE(i.symbol, '') as instrument_symbol,
			COALESCE(v.code, '') as venue_code,
			COALESCE(v.display_name, '') as venue_name,
			COALESCE(i.asset_class, '') as asset_class,
			COALESCE(v.venue_type, '') as venue_type,
			COALESCE(p.size, 0)::text as net_qty,
			COALESCE(p.avg_entry, 0)::text as avg_entry,
			p.status,
			COALESCE(p.buy_qty, 0)::text as buy_qty,
			COALESCE(p.sell_qty, 0)::text as sell_qty,
			COALESCE(p.buy_notional, 0)::text as buy_notional,
			COALESCE(p.sell_notional, 0)::text as sell_notional,
			COALESCE(p.last_executed_at, p.opened_at) as last_executed_at
		FROM positions p
		LEFT JOIN instruments i ON p.instrument_id = i.id
		LEFT JOIN venues v ON p.venue_id = v.id
		%s
		ORDER BY last_executed_at DESC NULLS LAST
		LIMIT $%d
	`, whereClause, argIndex)

	args = append(args, limit)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summaries := make([]repositories.PositionSummary, 0)
	for rows.Next() {
		var summary repositories.PositionSummary
		if err := rows.Scan(
			&summary.Instrument,
			&summary.VenueCode,
			&summary.VenueName,
			&summary.AssetClass,
			&summary.VenueType,
			&summary.NetQty,
			&summary.AvgEntry,
			&summary.Status,
			&summary.BuyQty,
			&summary.SellQty,
			&summary.BuyNotional,
			&summary.SellNotional,
			&summary.LastExecutedAt,
		); err != nil {
			return nil, err
		}

		summaries = append(summaries, summary)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return summaries, nil
}

func (r *PortfolioRepositoryImpl) RebuildPositions(ctx context.Context, userID uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "DELETE FROM positions WHERE user_id = $1", userID); err != nil {
		return err
	}

	query := `
		WITH aggregates AS (
			SELECT
				e.user_id,
				e.venue_id,
				e.instrument_id,
				SUM(CASE WHEN e.side = 'buy' THEN e.qty::numeric ELSE -e.qty::numeric END) AS net_qty,
				SUM(CASE WHEN e.side = 'buy' THEN e.qty::numeric ELSE 0 END) AS buy_qty,
				SUM(CASE WHEN e.side = 'buy' THEN e.qty::numeric * e.price::numeric ELSE 0 END) AS buy_notional,
				SUM(CASE WHEN e.side = 'sell' THEN e.qty::numeric ELSE 0 END) AS sell_qty,
				SUM(CASE WHEN e.side = 'sell' THEN e.qty::numeric * e.price::numeric ELSE 0 END) AS sell_notional,
				MIN(e.executed_at) AS opened_at,
				MAX(e.executed_at) AS last_executed_at
			FROM trade_events e
			WHERE e.user_id = $1
			AND e.event_type IN ('spot_trade', 'perp_trade', 'dex_swap')
			AND e.side IN ('buy', 'sell')
			GROUP BY e.user_id, e.venue_id, e.instrument_id
		)
		INSERT INTO positions (
			id,
			user_id,
			venue_id,
			instrument_id,
			status,
			size,
			avg_entry,
			opened_at,
			closed_at,
			buy_qty,
			sell_qty,
			buy_notional,
			sell_notional,
			last_executed_at,
			created_at,
			updated_at
		)
		SELECT
			gen_random_uuid(),
			user_id,
			venue_id,
			instrument_id,
			CASE WHEN net_qty = 0 THEN 'closed' ELSE 'open' END,
			net_qty,
			CASE
				WHEN net_qty > 0 AND buy_qty > 0 THEN buy_notional / NULLIF(buy_qty, 0)
				WHEN net_qty < 0 AND sell_qty > 0 THEN sell_notional / NULLIF(sell_qty, 0)
				ELSE NULL
			END,
			opened_at,
			CASE WHEN net_qty = 0 THEN last_executed_at ELSE NULL END,
			buy_qty,
			sell_qty,
			buy_notional,
			sell_notional,
			last_executed_at,
			NOW(),
			NOW()
		FROM aggregates
	`

	if _, err := tx.Exec(ctx, query, userID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PortfolioRepositoryImpl) ListUsersWithEvents(ctx context.Context, limit int) ([]uuid.UUID, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}

	query := `
		SELECT user_id
		FROM (
			SELECT user_id, MAX(executed_at) AS last_event
			FROM trade_events
			GROUP BY user_id
		) t
		ORDER BY last_event DESC
		LIMIT $1
	`

	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]uuid.UUID, 0)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		users = append(users, id)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return users, nil
}

func (r *PortfolioRepositoryImpl) BackfillBubblesFromEvents(ctx context.Context, userID uuid.UUID) (int64, error) {
	query := `
		INSERT INTO bubbles (
			id, user_id, symbol, timeframe, candle_time, price, bubble_type, asset_class, venue_name, memo, tags, created_at
		)
		SELECT
			gen_random_uuid(),
			e.user_id,
			i.symbol,
			'1h' as timeframe,
			e.executed_at as candle_time,
			e.price,
			'auto' as bubble_type,
			e.asset_class,
			COALESCE(v.display_name, v.code) as venue_name,
			CONCAT('Event sync: ', i.symbol, ' ', UPPER(COALESCE(e.side, '')), ' @ ', e.price),
			CASE
				WHEN e.side IS NULL THEN NULL
				ELSE ARRAY[e.side]
			END,
			NOW()
		FROM trade_events e
		LEFT JOIN instruments i ON e.instrument_id = i.id
		LEFT JOIN venues v ON e.venue_id = v.id
		WHERE e.user_id = $1
		AND e.event_type IN ('spot_trade', 'perp_trade', 'dex_swap')
		AND e.price IS NOT NULL
		AND i.symbol IS NOT NULL
		AND i.symbol <> ''
		AND NOT EXISTS (
			SELECT 1
			FROM bubbles b
			WHERE b.user_id = e.user_id
			AND b.symbol = i.symbol
			AND b.candle_time = e.executed_at
			AND b.price = e.price
			AND b.bubble_type = 'auto'
		)
	`
	result, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

func nullIfEmpty(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
```

## File: internal/infrastructure/repositories/refresh_token_repository_impl.go
```go
package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type RefreshTokenRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewRefreshTokenRepository(pool *pgxpool.Pool) repositories.RefreshTokenRepository {
	return &RefreshTokenRepositoryImpl{pool: pool}
}

func (r *RefreshTokenRepositoryImpl) Create(ctx context.Context, token *entities.RefreshToken) error {
	query := `
		INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked_at, last_used_at, replaced_by, revoked_reason)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.pool.Exec(ctx, query,
		token.ID, token.UserID, token.TokenHash, token.ExpiresAt, token.CreatedAt,
		token.RevokedAt, token.LastUsedAt, token.ReplacedBy, token.RevokedReason)
	return err
}

func (r *RefreshTokenRepositoryImpl) GetByTokenHash(ctx context.Context, tokenHash string) (*entities.RefreshToken, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, created_at, revoked_at, last_used_at, replaced_by, revoked_reason
		FROM refresh_tokens
		WHERE token_hash = $1
	`
	var token entities.RefreshToken
	err := r.pool.QueryRow(ctx, query, tokenHash).Scan(
		&token.ID, &token.UserID, &token.TokenHash, &token.ExpiresAt, &token.CreatedAt,
		&token.RevokedAt, &token.LastUsedAt, &token.ReplacedBy, &token.RevokedReason)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &token, nil
}

func (r *RefreshTokenRepositoryImpl) Update(ctx context.Context, token *entities.RefreshToken) error {
	query := `
		UPDATE refresh_tokens
		SET revoked_at = $2, last_used_at = $3, replaced_by = $4, revoked_reason = $5
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		token.ID, token.RevokedAt, token.LastUsedAt, token.ReplacedBy, token.RevokedReason)
	return err
}

func (r *RefreshTokenRepositoryImpl) RevokeAllUserTokens(ctx context.Context, userID uuid.UUID, reason string) error {
	query := `
		UPDATE refresh_tokens
		SET revoked_at = $2, revoked_reason = $3
		WHERE user_id = $1 AND revoked_at IS NULL
	`
	now := time.Now()
	_, err := r.pool.Exec(ctx, query, userID, now, reason)
	return err
}

func (r *RefreshTokenRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM refresh_tokens WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}
```

## File: internal/infrastructure/repositories/review_note_repository_impl.go
```go
package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type ReviewNoteRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewReviewNoteRepository(pool *pgxpool.Pool) repositories.ReviewNoteRepository {
	return &ReviewNoteRepositoryImpl{pool: pool}
}

func (r *ReviewNoteRepositoryImpl) Create(ctx context.Context, note *entities.ReviewNote) error {
	query := `
		INSERT INTO review_notes (id, user_id, bubble_id, title, content, tags, lesson_learned, emotion, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	note.ID = uuid.New()
	now := time.Now().UTC()
	note.CreatedAt = now
	note.UpdatedAt = now

	_, err := r.pool.Exec(ctx, query,
		note.ID, note.UserID, note.BubbleID, note.Title, note.Content,
		note.Tags, note.LessonLearned, note.Emotion, note.CreatedAt, note.UpdatedAt)
	return err
}

func (r *ReviewNoteRepositoryImpl) Update(ctx context.Context, note *entities.ReviewNote) error {
	query := `
		UPDATE review_notes
		SET title = $1, content = $2, tags = $3, lesson_learned = $4, emotion = $5, bubble_id = $6, updated_at = $7
		WHERE id = $8 AND user_id = $9
	`
	note.UpdatedAt = time.Now()
	_, err := r.pool.Exec(ctx, query,
		note.Title, note.Content, note.Tags, note.LessonLearned, note.Emotion,
		note.BubbleID, note.UpdatedAt, note.ID, note.UserID)
	return err
}

func (r *ReviewNoteRepositoryImpl) Delete(ctx context.Context, id, userID uuid.UUID) error {
	query := `DELETE FROM review_notes WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, id, userID)
	return err
}

func (r *ReviewNoteRepositoryImpl) GetByID(ctx context.Context, id, userID uuid.UUID) (*entities.ReviewNote, error) {
	query := `
		SELECT id, user_id, bubble_id, title, content, tags, lesson_learned, emotion, created_at, updated_at
		FROM review_notes
		WHERE id = $1 AND user_id = $2
	`
	var note entities.ReviewNote
	var emotion *string
	var lessonLearned *string

	err := r.pool.QueryRow(ctx, query, id, userID).Scan(
		&note.ID, &note.UserID, &note.BubbleID, &note.Title, &note.Content,
		&note.Tags, &lessonLearned, &emotion, &note.CreatedAt, &note.UpdatedAt)
	if err != nil {
		return nil, err
	}

	if emotion != nil {
		note.Emotion = entities.Emotion(*emotion)
	}
	if lessonLearned != nil {
		note.LessonLearned = *lessonLearned
	}

	return &note, nil
}

func (r *ReviewNoteRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*entities.ReviewNote, int, error) {
	countQuery := `SELECT COUNT(*) FROM review_notes WHERE user_id = $1`
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, user_id, bubble_id, title, content, tags, lesson_learned, emotion, created_at, updated_at
		FROM review_notes
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var notes []*entities.ReviewNote
	for rows.Next() {
		var note entities.ReviewNote
		var emotion *string
		var lessonLearned *string

		if err := rows.Scan(
			&note.ID, &note.UserID, &note.BubbleID, &note.Title, &note.Content,
			&note.Tags, &lessonLearned, &emotion, &note.CreatedAt, &note.UpdatedAt); err != nil {
			return nil, 0, err
		}

		if emotion != nil {
			note.Emotion = entities.Emotion(*emotion)
		}
		if lessonLearned != nil {
			note.LessonLearned = *lessonLearned
		}

		notes = append(notes, &note)
	}

	return notes, total, rows.Err()
}

func (r *ReviewNoteRepositoryImpl) ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.ReviewNote, error) {
	query := `
		SELECT id, user_id, bubble_id, title, content, tags, lesson_learned, emotion, created_at, updated_at
		FROM review_notes
		WHERE bubble_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, bubbleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []*entities.ReviewNote
	for rows.Next() {
		var note entities.ReviewNote
		var emotion *string
		var lessonLearned *string

		if err := rows.Scan(
			&note.ID, &note.UserID, &note.BubbleID, &note.Title, &note.Content,
			&note.Tags, &lessonLearned, &emotion, &note.CreatedAt, &note.UpdatedAt); err != nil {
			return nil, err
		}

		if emotion != nil {
			note.Emotion = entities.Emotion(*emotion)
		}
		if lessonLearned != nil {
			note.LessonLearned = *lessonLearned
		}

		notes = append(notes, &note)
	}

	return notes, rows.Err()
}

func (r *ReviewNoteRepositoryImpl) PruneAIGeneratedByUser(ctx context.Context, userID uuid.UUID, keep int) error {
	if keep <= 0 {
		return nil
	}
	query := `
		DELETE FROM review_notes
		WHERE user_id = $1
		  AND title = 'AI 복기 요약'
		  AND id NOT IN (
		    SELECT id FROM review_notes
		    WHERE user_id = $1
		      AND title = 'AI 복기 요약'
		    ORDER BY created_at DESC
		    LIMIT $2
		  )
	`
	_, err := r.pool.Exec(ctx, query, userID, keep)
	return err
}
```

## File: internal/infrastructure/repositories/run_repository_impl.go
```go
package repositories

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type RunRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewRunRepository(pool *pgxpool.Pool) repositories.RunRepository {
	return &RunRepositoryImpl{pool: pool}
}

func (r *RunRepositoryImpl) Create(
	ctx context.Context,
	userID uuid.UUID,
	runType string,
	status string,
	startedAt time.Time,
	meta json.RawMessage,
) (*entities.Run, error) {
	run := &entities.Run{
		RunID:     uuid.New(),
		UserID:    userID,
		RunType:   runType,
		Status:    status,
		StartedAt: startedAt,
		Meta:      meta,
	}

	query := `
		INSERT INTO runs (run_id, user_id, run_type, status, started_at, meta)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.pool.Exec(ctx, query,
		run.RunID, run.UserID, run.RunType, run.Status, run.StartedAt, run.Meta)
	if err != nil {
		return nil, err
	}
	return run, nil
}

func (r *RunRepositoryImpl) GetByID(ctx context.Context, userID uuid.UUID, runID uuid.UUID) (*entities.Run, error) {
	query := `
		SELECT run_id, user_id, run_type, status, started_at, finished_at, meta, created_at
		FROM runs
		WHERE run_id = $1 AND user_id = $2
	`
	var run entities.Run
	err := r.pool.QueryRow(ctx, query, runID, userID).Scan(
		&run.RunID, &run.UserID, &run.RunType, &run.Status, &run.StartedAt, &run.FinishedAt, &run.Meta, &run.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &run, nil
}

func (r *RunRepositoryImpl) UpdateStatus(ctx context.Context, runID uuid.UUID, status string, finishedAt *time.Time, meta json.RawMessage) error {
	if meta == nil {
		meta = []byte("{}")
	}
	if finishedAt == nil {
		query := `
			UPDATE runs
			SET status = $1, meta = $2
			WHERE run_id = $3
		`
		_, err := r.pool.Exec(ctx, query, status, meta, runID)
		return err
	}

	query := `
		UPDATE runs
		SET status = $1, finished_at = $2, meta = $3
		WHERE run_id = $4
	`
	_, err := r.pool.Exec(ctx, query, status, *finishedAt, meta, runID)
	return err
}

func (r *RunRepositoryImpl) GetLatestCompletedRun(ctx context.Context, userID uuid.UUID) (*entities.Run, error) {
	query := `
		SELECT run_id, user_id, run_type, status, started_at, finished_at, meta, created_at
		FROM runs
		WHERE user_id = $1
		  AND status = 'completed'
		  AND run_type IN ('exchange_sync', 'trade_csv_import', 'portfolio_csv_import')
		ORDER BY finished_at DESC NULLS LAST, started_at DESC
		LIMIT 1
	`

	var run entities.Run
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&run.RunID, &run.UserID, &run.RunType, &run.Status, &run.StartedAt, &run.FinishedAt, &run.Meta, &run.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &run, nil
}
```

## File: internal/infrastructure/repositories/subscription_repository_impl.go
```go
package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type SubscriptionRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewSubscriptionRepository(pool *pgxpool.Pool) repositories.SubscriptionRepository {
	return &SubscriptionRepositoryImpl{pool: pool}
}

func (r *SubscriptionRepositoryImpl) Create(ctx context.Context, sub *entities.Subscription) error {
	query := `
		INSERT INTO subscriptions (id, user_id, tier, ai_quota_remaining, ai_quota_limit, last_reset_at, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.pool.Exec(ctx, query,
		sub.ID, sub.UserID, sub.Tier, sub.AIQuotaRemaining, sub.AIQuotaLimit, sub.LastResetAt, sub.ExpiresAt)
	return err
}

func (r *SubscriptionRepositoryImpl) GetByUserID(ctx context.Context, userID uuid.UUID) (*entities.Subscription, error) {
	query := `
		SELECT id, user_id, tier, ai_quota_remaining, ai_quota_limit, last_reset_at, expires_at
		FROM subscriptions
		WHERE user_id = $1
	`
	var sub entities.Subscription
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&sub.ID, &sub.UserID, &sub.Tier, &sub.AIQuotaRemaining, &sub.AIQuotaLimit, &sub.LastResetAt, &sub.ExpiresAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &sub, nil
}

func (r *SubscriptionRepositoryImpl) ListAll(ctx context.Context) ([]*entities.Subscription, error) {
	query := `
		SELECT id, user_id, tier, ai_quota_remaining, ai_quota_limit, last_reset_at, expires_at
		FROM subscriptions
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []*entities.Subscription
	for rows.Next() {
		var sub entities.Subscription
		err := rows.Scan(&sub.ID, &sub.UserID, &sub.Tier, &sub.AIQuotaRemaining, &sub.AIQuotaLimit, &sub.LastResetAt, &sub.ExpiresAt)
		if err != nil {
			return nil, err
		}
		subs = append(subs, &sub)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return subs, nil
}

func (r *SubscriptionRepositoryImpl) Update(ctx context.Context, sub *entities.Subscription) error {
	query := `
		UPDATE subscriptions
		SET tier = $2, ai_quota_remaining = $3, ai_quota_limit = $4, last_reset_at = $5, expires_at = $6
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		sub.ID, sub.Tier, sub.AIQuotaRemaining, sub.AIQuotaLimit, sub.LastResetAt, sub.ExpiresAt)
	return err
}

func (r *SubscriptionRepositoryImpl) DecrementQuota(ctx context.Context, userID uuid.UUID, amount int) (bool, error) {
	query := `
		UPDATE subscriptions
		SET ai_quota_remaining = ai_quota_remaining - $2
		WHERE user_id = $1 AND ai_quota_remaining >= $2
	`
	result, err := r.pool.Exec(ctx, query, userID, amount)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

func (r *SubscriptionRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM subscriptions WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}
```

## File: internal/infrastructure/repositories/summary_pack_repository_impl.go
```go
package repositories

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type SummaryPackRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewSummaryPackRepository(pool *pgxpool.Pool) repositories.SummaryPackRepository {
	return &SummaryPackRepositoryImpl{pool: pool}
}

func (r *SummaryPackRepositoryImpl) Create(ctx context.Context, pack *entities.SummaryPack) error {
	query := `
		INSERT INTO summary_packs (
			pack_id, user_id, source_run_id, range, schema_version, calc_version, content_hash,
			reconciliation_status, missing_suspects_count, duplicate_suspects_count, normalization_warnings, payload
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := r.pool.Exec(ctx, query,
		pack.PackID,
		pack.UserID,
		pack.SourceRunID,
		pack.Range,
		pack.SchemaVersion,
		pack.CalcVersion,
		pack.ContentHash,
		pack.ReconciliationStatus,
		pack.MissingSuspectsCount,
		pack.DuplicateSuspectsCount,
		pack.NormalizationWarnings,
		pack.Payload,
	)
	return err
}

func (r *SummaryPackRepositoryImpl) GetByID(ctx context.Context, userID uuid.UUID, packID uuid.UUID) (*entities.SummaryPack, error) {
	query := `
		SELECT pack_id, user_id, source_run_id, range, schema_version, calc_version, content_hash,
			reconciliation_status, missing_suspects_count, duplicate_suspects_count, normalization_warnings, payload, created_at
		FROM summary_packs
		WHERE pack_id = $1 AND user_id = $2
	`
	var row entities.SummaryPack
	var payload json.RawMessage
	err := r.pool.QueryRow(ctx, query, packID, userID).Scan(
		&row.PackID,
		&row.UserID,
		&row.SourceRunID,
		&row.Range,
		&row.SchemaVersion,
		&row.CalcVersion,
		&row.ContentHash,
		&row.ReconciliationStatus,
		&row.MissingSuspectsCount,
		&row.DuplicateSuspectsCount,
		&row.NormalizationWarnings,
		&payload,
		&row.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	row.Payload = append([]byte(nil), payload...)
	return &row, nil
}

func (r *SummaryPackRepositoryImpl) GetLatest(ctx context.Context, userID uuid.UUID, rangeValue string) (*entities.SummaryPack, error) {
	query := `
		SELECT pack_id, user_id, source_run_id, range, schema_version, calc_version, content_hash,
			reconciliation_status, missing_suspects_count, duplicate_suspects_count, normalization_warnings, payload, created_at
		FROM summary_packs
		WHERE user_id = $1 AND range = $2
		ORDER BY created_at DESC
		LIMIT 1
	`
	var row entities.SummaryPack
	var payload json.RawMessage
	err := r.pool.QueryRow(ctx, query, userID, rangeValue).Scan(
		&row.PackID,
		&row.UserID,
		&row.SourceRunID,
		&row.Range,
		&row.SchemaVersion,
		&row.CalcVersion,
		&row.ContentHash,
		&row.ReconciliationStatus,
		&row.MissingSuspectsCount,
		&row.DuplicateSuspectsCount,
		&row.NormalizationWarnings,
		&payload,
		&row.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	row.Payload = append([]byte(nil), payload...)
	return &row, nil
}

func NormalizeNoRows(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return pgx.ErrNoRows
	}
	return err
}
```

## File: internal/infrastructure/repositories/trade_repository_impl.go
```go
package repositories

import (
	"context"
	"errors"
	"fmt"
	"time"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type TradeRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewTradeRepository(pool *pgxpool.Pool) repositories.TradeRepository {
	return &TradeRepositoryImpl{pool: pool}
}

func (r *TradeRepositoryImpl) Create(ctx context.Context, trade *entities.Trade) error {
	query := `
    INSERT INTO trades (id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, position_side, open_close, reduce_only, quantity, price, realized_pnl, trade_time)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  `
	_, err := r.pool.Exec(ctx, query,
		trade.ID, trade.UserID, trade.BubbleID, trade.BinanceTradeID, trade.Exchange, trade.Symbol, trade.Side, trade.PositionSide, trade.OpenClose, trade.ReduceOnly, trade.Quantity, trade.Price, trade.RealizedPnL, trade.TradeTime)
	return err
}

func (r *TradeRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.Trade, error) {
	query := `
    SELECT id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, position_side, open_close, reduce_only, quantity, price, realized_pnl, trade_time
    FROM trades
    WHERE id = $1
  `
	var trade entities.Trade
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&trade.ID, &trade.UserID, &trade.BubbleID, &trade.BinanceTradeID, &trade.Exchange, &trade.Symbol, &trade.Side, &trade.PositionSide, &trade.OpenClose, &trade.ReduceOnly, &trade.Quantity, &trade.Price, &trade.RealizedPnL, &trade.TradeTime)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &trade, nil
}

func (r *TradeRepositoryImpl) ListByUserAndSymbol(ctx context.Context, userID uuid.UUID, symbol string) ([]*entities.Trade, error) {
	query := `
    SELECT id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, position_side, open_close, reduce_only, quantity, price, realized_pnl, trade_time
    FROM trades
    WHERE user_id = $1 AND symbol = $2
    ORDER BY trade_time DESC
  `
	rows, err := r.pool.Query(ctx, query, userID, symbol)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trades []*entities.Trade
	for rows.Next() {
		var trade entities.Trade
		if err := rows.Scan(
			&trade.ID, &trade.UserID, &trade.BubbleID, &trade.BinanceTradeID, &trade.Exchange, &trade.Symbol, &trade.Side, &trade.PositionSide, &trade.OpenClose, &trade.ReduceOnly, &trade.Quantity, &trade.Price, &trade.RealizedPnL, &trade.TradeTime); err != nil {
			return nil, err
		}
		trades = append(trades, &trade)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return trades, nil
}

func (r *TradeRepositoryImpl) ListByBubble(ctx context.Context, bubbleID uuid.UUID) ([]*entities.Trade, error) {
	query := `
    SELECT id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, position_side, open_close, reduce_only, quantity, price, realized_pnl, trade_time
    FROM trades
    WHERE bubble_id = $1
    ORDER BY trade_time DESC
  `
	rows, err := r.pool.Query(ctx, query, bubbleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trades []*entities.Trade
	for rows.Next() {
		var trade entities.Trade
		if err := rows.Scan(
			&trade.ID, &trade.UserID, &trade.BubbleID, &trade.BinanceTradeID, &trade.Exchange, &trade.Symbol, &trade.Side, &trade.PositionSide, &trade.OpenClose, &trade.ReduceOnly, &trade.Quantity, &trade.Price, &trade.RealizedPnL, &trade.TradeTime); err != nil {
			return nil, err
		}
		trades = append(trades, &trade)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return trades, nil
}

func (r *TradeRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM trades WHERE id = $1", id)
	return err
}

func (r *TradeRepositoryImpl) List(ctx context.Context, userID uuid.UUID, filter repositories.TradeFilter) ([]*entities.Trade, int, error) {
	whereClause, args, argIndex := buildTradeWhere(userID, filter)

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM trades %s", whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	sortClause := "ORDER BY trade_time DESC"
	if filter.Sort == "asc" {
		sortClause = "ORDER BY trade_time ASC"
	}

	listQuery := fmt.Sprintf(`
    SELECT id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, position_side, open_close, reduce_only, quantity, price, realized_pnl, trade_time
    FROM trades
    %s
    %s
    LIMIT $%d OFFSET $%d
  `, whereClause, sortClause, argIndex, argIndex+1)
	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var trades []*entities.Trade
	for rows.Next() {
		var trade entities.Trade
		if err := rows.Scan(
			&trade.ID, &trade.UserID, &trade.BubbleID, &trade.BinanceTradeID, &trade.Exchange, &trade.Symbol, &trade.Side, &trade.PositionSide, &trade.OpenClose, &trade.ReduceOnly, &trade.Quantity, &trade.Price, &trade.RealizedPnL, &trade.TradeTime); err != nil {
			return nil, 0, err
		}
		trades = append(trades, &trade)
	}
	if rows.Err() != nil {
		return nil, 0, rows.Err()
	}
	return trades, total, nil
}

func (r *TradeRepositoryImpl) ListByTimeRange(ctx context.Context, userID uuid.UUID, from, to time.Time) ([]*entities.Trade, error) {
	query := `
    SELECT id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, position_side, open_close, reduce_only, quantity, price, realized_pnl, trade_time
    FROM trades
    WHERE user_id = $1 AND trade_time >= $2 AND trade_time <= $3
    ORDER BY trade_time ASC
  `
	rows, err := r.pool.Query(ctx, query, userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trades []*entities.Trade
	for rows.Next() {
		var trade entities.Trade
		if err := rows.Scan(
			&trade.ID, &trade.UserID, &trade.BubbleID, &trade.BinanceTradeID, &trade.Exchange, &trade.Symbol, &trade.Side, &trade.PositionSide, &trade.OpenClose, &trade.ReduceOnly, &trade.Quantity, &trade.Price, &trade.RealizedPnL, &trade.TradeTime); err != nil {
			return nil, err
		}
		trades = append(trades, &trade)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return trades, nil
}

func (r *TradeRepositoryImpl) Summary(ctx context.Context, userID uuid.UUID, filter repositories.TradeFilter) (repositories.TradeSummary, []repositories.TradeSideSummary, []repositories.TradeSymbolSummary, error) {
	whereClause, args, _ := buildTradeWhere(userID, filter)

	summaryQuery := fmt.Sprintf(`
    SELECT
      COUNT(*)::int,
      COALESCE(SUM(realized_pnl), 0)::text,
      COALESCE(SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END), 0)::int,
      COALESCE(SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END), 0)::int,
      COALESCE(SUM(CASE WHEN realized_pnl = 0 THEN 1 ELSE 0 END), 0)::int
    FROM trades
    %s
  `, whereClause)

	var summary repositories.TradeSummary
	if err := r.pool.QueryRow(ctx, summaryQuery, args...).Scan(
		&summary.TotalTrades, &summary.RealizedPnLTotal, &summary.Wins, &summary.Losses, &summary.Breakeven); err != nil {
		return repositories.TradeSummary{}, nil, nil, err
	}

	sideQuery := fmt.Sprintf(`
    SELECT side, COUNT(*)::int, COALESCE(SUM(realized_pnl), 0)::text
    FROM trades
    %s
    GROUP BY side
    ORDER BY side ASC
  `, whereClause)

	sideRows, err := r.pool.Query(ctx, sideQuery, args...)
	if err != nil {
		return repositories.TradeSummary{}, nil, nil, err
	}
	defer sideRows.Close()

	var sides []repositories.TradeSideSummary
	for sideRows.Next() {
		var side repositories.TradeSideSummary
		if err := sideRows.Scan(&side.Side, &side.TotalTrades, &side.RealizedPnLTotal); err != nil {
			return repositories.TradeSummary{}, nil, nil, err
		}
		sides = append(sides, side)
	}
	if sideRows.Err() != nil {
		return repositories.TradeSummary{}, nil, nil, sideRows.Err()
	}

	symbolQuery := fmt.Sprintf(`
    SELECT symbol,
      COUNT(*)::int,
      COALESCE(SUM(realized_pnl), 0)::text,
      COALESCE(SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END), 0)::int,
      COALESCE(SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END), 0)::int
    FROM trades
    %s
    GROUP BY symbol
    ORDER BY COUNT(*) DESC, symbol ASC
    LIMIT 20
  `, whereClause)

	symbolRows, err := r.pool.Query(ctx, symbolQuery, args...)
	if err != nil {
		return repositories.TradeSummary{}, nil, nil, err
	}
	defer symbolRows.Close()

	var symbols []repositories.TradeSymbolSummary
	for symbolRows.Next() {
		var item repositories.TradeSymbolSummary
		if err := symbolRows.Scan(&item.Symbol, &item.TotalTrades, &item.RealizedPnLTotal, &item.Wins, &item.Losses); err != nil {
			return repositories.TradeSummary{}, nil, nil, err
		}
		symbols = append(symbols, item)
	}
	if symbolRows.Err() != nil {
		return repositories.TradeSummary{}, nil, nil, symbolRows.Err()
	}

	return summary, sides, symbols, nil
}

func (r *TradeRepositoryImpl) SummaryByExchange(ctx context.Context, userID uuid.UUID, filter repositories.TradeFilter) ([]repositories.TradeExchangeSummary, error) {
	whereClause, args, _ := buildTradeWhere(userID, filter)

	query := fmt.Sprintf(`
		SELECT exchange,
			COUNT(*)::int,
			COALESCE(SUM(realized_pnl), 0)::text
		FROM trades
		%s
		GROUP BY exchange
		ORDER BY exchange ASC
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []repositories.TradeExchangeSummary
	for rows.Next() {
		var item repositories.TradeExchangeSummary
		if err := rows.Scan(&item.Exchange, &item.TotalTrades, &item.RealizedPnLTotal); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *TradeRepositoryImpl) SummaryBySide(ctx context.Context, userID uuid.UUID, filter repositories.TradeFilter) ([]*repositories.TradeSideSummary, error) {
	whereClause, args, _ := buildTradeWhere(userID, filter)

	query := fmt.Sprintf(`
		SELECT side,
			COUNT(*)::int,
			COUNT(*)::int,
			COALESCE(SUM(quantity), 0)::text,
			COALESCE(SUM(realized_pnl), 0)::text
		FROM trades
		%s
		GROUP BY side
		ORDER BY side ASC
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*repositories.TradeSideSummary
	for rows.Next() {
		var item repositories.TradeSideSummary
		if err := rows.Scan(&item.Side, &item.TradeCount, &item.TotalTrades, &item.TotalVolume, &item.RealizedPnLTotal); err != nil {
			return nil, err
		}
		items = append(items, &item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *TradeRepositoryImpl) SummaryBySymbol(ctx context.Context, userID uuid.UUID, filter repositories.TradeFilter) ([]*repositories.TradeSymbolSummary, error) {
	whereClause, args, _ := buildTradeWhere(userID, filter)

	query := fmt.Sprintf(`
		SELECT symbol,
			COUNT(*)::int,
			COUNT(*)::int,
			SUM(CASE WHEN side = 'BUY' THEN 1 ELSE 0 END)::int,
			SUM(CASE WHEN side = 'SELL' THEN 1 ELSE 0 END)::int,
			COALESCE(SUM(quantity), 0)::text,
			COALESCE(SUM(realized_pnl), 0)::text,
			SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END)::int,
			SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END)::int
		FROM trades
		%s
		GROUP BY symbol
		ORDER BY COUNT(*) DESC, symbol ASC
		LIMIT 20
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*repositories.TradeSymbolSummary
	for rows.Next() {
		var item repositories.TradeSymbolSummary
		if err := rows.Scan(&item.Symbol, &item.TradeCount, &item.TotalTrades, &item.BuyCount, &item.SellCount, &item.TotalVolume, &item.RealizedPnLTotal, &item.Wins, &item.Losses); err != nil {
			return nil, err
		}
		items = append(items, &item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *TradeRepositoryImpl) ListUnlinked(ctx context.Context, userID uuid.UUID, limit int) ([]*entities.Trade, error) {
	if limit <= 0 {
		limit = 500
	}
	query := `
		SELECT id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, position_side, open_close, reduce_only, quantity, price, realized_pnl, trade_time
		FROM trades
		WHERE user_id = $1 AND bubble_id IS NULL
		ORDER BY trade_time ASC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trades []*entities.Trade
	for rows.Next() {
		var trade entities.Trade
		if err := rows.Scan(
			&trade.ID, &trade.UserID, &trade.BubbleID, &trade.BinanceTradeID, &trade.Exchange, &trade.Symbol, &trade.Side, &trade.PositionSide, &trade.OpenClose, &trade.ReduceOnly, &trade.Quantity, &trade.Price, &trade.RealizedPnL, &trade.TradeTime); err != nil {
			return nil, err
		}
		trades = append(trades, &trade)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return trades, nil
}

func (r *TradeRepositoryImpl) UpdateBubbleID(ctx context.Context, tradeID uuid.UUID, bubbleID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "UPDATE trades SET bubble_id = $2 WHERE id = $1", tradeID, bubbleID)
	return err
}

func (r *TradeRepositoryImpl) ClearBubbleID(ctx context.Context, tradeID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "UPDATE trades SET bubble_id = NULL WHERE id = $1", tradeID)
	return err
}

func (r *TradeRepositoryImpl) BackfillBubbleMetadata(ctx context.Context, userID uuid.UUID) (int64, error) {
	query := `
		UPDATE bubbles b
		SET
			asset_class = COALESCE(b.asset_class, 'crypto'),
			venue_name = COALESCE(b.venue_name, t.exchange),
			memo = COALESCE(b.memo, CONCAT('Trade sync: ', t.symbol, ' ', UPPER(t.side), ' @ ', t.price)),
			tags = CASE
				WHEN b.tags IS NULL OR array_length(b.tags, 1) = 0 THEN ARRAY[t.side]
				ELSE b.tags
			END
		FROM trades t
		WHERE b.user_id = $1
		AND t.user_id = $1
		AND b.id = t.bubble_id
	`
	result, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

func buildTradeWhere(userID uuid.UUID, filter repositories.TradeFilter) (string, []interface{}, int) {
	conditions := []string{"user_id = $1"}
	args := []interface{}{userID}
	argIndex := 2

	if filter.Exchange != "" {
		conditions = append(conditions, fmt.Sprintf("exchange = $%d", argIndex))
		args = append(args, filter.Exchange)
		argIndex++
	}
	if filter.Symbol != "" {
		conditions = append(conditions, fmt.Sprintf("symbol = $%d", argIndex))
		args = append(args, filter.Symbol)
		argIndex++
	}
	if filter.Side != "" {
		conditions = append(conditions, fmt.Sprintf("side = $%d", argIndex))
		args = append(args, filter.Side)
		argIndex++
	}
	if filter.From != nil {
		conditions = append(conditions, fmt.Sprintf("trade_time >= $%d", argIndex))
		args = append(args, *filter.From)
		argIndex++
	}
	if filter.To != nil {
		conditions = append(conditions, fmt.Sprintf("trade_time <= $%d", argIndex))
		args = append(args, *filter.To)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")
	return whereClause, args, argIndex
}
```

## File: internal/infrastructure/repositories/trade_safety_review_repository_impl.go
```go
package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type TradeSafetyReviewRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewTradeSafetyReviewRepository(pool *pgxpool.Pool) repositories.TradeSafetyReviewRepository {
	return &TradeSafetyReviewRepositoryImpl{pool: pool}
}

func (r *TradeSafetyReviewRepositoryImpl) ListDaily(
	ctx context.Context,
	userID uuid.UUID,
	filter repositories.DailySafetyFilter,
) ([]repositories.DailySafetyItem, repositories.DailySafetySummary, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 20
	}

	baseArgs := []interface{}{userID, filter.From, filter.To}

	countArgs := append([]interface{}{}, baseArgs...)
	countWhere, countArgs, _ := buildDailySafetyWhere(filter, false, 4, countArgs)
	countQuery := dailySafetyBaseQuery + `
		SELECT
			COUNT(*)::int,
			COUNT(r.id)::int
		FROM daily d
		LEFT JOIN trade_safety_reviews r
			ON r.user_id = $1
			AND (
				(d.trade_id IS NOT NULL AND r.trade_id = d.trade_id::uuid)
				OR (d.trade_event_id IS NOT NULL AND r.trade_event_id = d.trade_event_id::uuid)
			)
		` + countWhere

	var total int
	var reviewed int
	if err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total, &reviewed); err != nil {
		return nil, repositories.DailySafetySummary{}, err
	}

	listArgs := append([]interface{}{}, baseArgs...)
	listWhere, listArgs, nextArg := buildDailySafetyWhere(filter, true, 4, listArgs)
	listQuery := dailySafetyBaseQuery + `
		SELECT
			d.target_type,
			d.trade_id,
			d.trade_event_id,
			d.executed_at,
			d.asset_class,
			d.venue,
			d.venue_name,
			d.symbol,
			d.side,
			d.qty,
			d.price,
			d.source,
			r.verdict,
			r.note,
			r.updated_at
		FROM daily d
		LEFT JOIN trade_safety_reviews r
			ON r.user_id = $1
			AND (
				(d.trade_id IS NOT NULL AND r.trade_id = d.trade_id::uuid)
				OR (d.trade_event_id IS NOT NULL AND r.trade_event_id = d.trade_event_id::uuid)
			)
		` + listWhere + fmt.Sprintf(`
		ORDER BY d.executed_at DESC, d.symbol ASC
		LIMIT $%d
	`, nextArg)
	listArgs = append(listArgs, limit)

	rows, err := r.pool.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return nil, repositories.DailySafetySummary{}, err
	}
	defer rows.Close()

	items := make([]repositories.DailySafetyItem, 0, limit)
	for rows.Next() {
		var item repositories.DailySafetyItem
		var tradeIDText pgtype.Text
		var tradeEventIDText pgtype.Text
		var sideText pgtype.Text
		var qtyText pgtype.Text
		var priceText pgtype.Text
		var verdictText pgtype.Text
		var noteText pgtype.Text
		var reviewedAt pgtype.Timestamptz

		if err := rows.Scan(
			&item.TargetType,
			&tradeIDText,
			&tradeEventIDText,
			&item.ExecutedAt,
			&item.AssetClass,
			&item.Venue,
			&item.VenueName,
			&item.Symbol,
			&sideText,
			&qtyText,
			&priceText,
			&item.Source,
			&verdictText,
			&noteText,
			&reviewedAt,
		); err != nil {
			return nil, repositories.DailySafetySummary{}, err
		}

		if sideText.Valid {
			side := sideText.String
			item.Side = &side
		}
		if qtyText.Valid {
			qty := qtyText.String
			item.Qty = &qty
		}
		if priceText.Valid {
			price := priceText.String
			item.Price = &price
		}
		if verdictText.Valid {
			verdict := verdictText.String
			item.Verdict = &verdict
		}
		if noteText.Valid {
			note := noteText.String
			item.Note = &note
		}
		if reviewedAt.Valid {
			timeValue := reviewedAt.Time
			item.ReviewedAt = &timeValue
		}

		targetID, parseErr := parseDailySafetyTargetID(item.TargetType, tradeIDText, tradeEventIDText)
		if parseErr != nil {
			return nil, repositories.DailySafetySummary{}, parseErr
		}
		item.TargetID = targetID

		items = append(items, item)
	}

	if rows.Err() != nil {
		return nil, repositories.DailySafetySummary{}, rows.Err()
	}

	summary := repositories.DailySafetySummary{
		Total:    total,
		Reviewed: reviewed,
		Pending:  total - reviewed,
	}
	if summary.Pending < 0 {
		summary.Pending = 0
	}

	return items, summary, nil
}

func (r *TradeSafetyReviewRepositoryImpl) Upsert(
	ctx context.Context,
	userID uuid.UUID,
	input repositories.UpsertSafetyReviewInput,
) (*entities.TradeSafetyReview, error) {
	normalizedType := strings.ToLower(strings.TrimSpace(input.TargetType))
	if normalizedType != "trade" && normalizedType != "trade_event" {
		return nil, repositories.ErrSafetyTargetNotFound
	}

	note := normalizeOptionalNote(input.Note)

	if normalizedType == "trade" {
		var exists bool
		err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM trades WHERE id = $1 AND user_id = $2)`, input.TargetID, userID).Scan(&exists)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, repositories.ErrSafetyTargetNotFound
		}

		query := `
			INSERT INTO trade_safety_reviews (id, user_id, trade_id, verdict, note, created_at, updated_at)
			VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
			ON CONFLICT (user_id, trade_id)
			WHERE trade_id IS NOT NULL
			DO UPDATE
			SET verdict = EXCLUDED.verdict,
				note = EXCLUDED.note,
				updated_at = NOW()
			RETURNING id, user_id, COALESCE(trade_id::text, ''), COALESCE(trade_event_id::text, ''), verdict, note, created_at, updated_at
		`
		return scanSafetyReview(r.pool.QueryRow(ctx, query, userID, input.TargetID, input.Verdict, note))
	}

	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM trade_events WHERE id = $1 AND user_id = $2)`, input.TargetID, userID).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, repositories.ErrSafetyTargetNotFound
	}

	query := `
		INSERT INTO trade_safety_reviews (id, user_id, trade_event_id, verdict, note, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (user_id, trade_event_id)
		WHERE trade_event_id IS NOT NULL
		DO UPDATE
		SET verdict = EXCLUDED.verdict,
			note = EXCLUDED.note,
			updated_at = NOW()
		RETURNING id, user_id, COALESCE(trade_id::text, ''), COALESCE(trade_event_id::text, ''), verdict, note, created_at, updated_at
	`
	return scanSafetyReview(r.pool.QueryRow(ctx, query, userID, input.TargetID, input.Verdict, note))
}

const dailySafetyBaseQuery = `
	WITH daily AS (
		SELECT
			'trade'::text AS target_type,
			t.id::text AS trade_id,
			NULL::text AS trade_event_id,
			t.trade_time AS executed_at,
			'crypto'::text AS asset_class,
			LOWER(COALESCE(NULLIF(t.exchange, ''), 'legacy')) AS venue,
			COALESCE(NULLIF(t.exchange, ''), 'Legacy') AS venue_name,
			t.symbol AS symbol,
			LOWER(t.side) AS side,
			t.quantity::text AS qty,
			t.price::text AS price,
			'api'::text AS source
		FROM trades t
		WHERE t.user_id = $1
			AND t.trade_time >= $2
			AND t.trade_time < $3

		UNION ALL

		SELECT
			'trade_event'::text AS target_type,
			NULL::text AS trade_id,
			e.id::text AS trade_event_id,
			e.executed_at,
			e.asset_class,
			LOWER(COALESCE(v.code, 'unknown')) AS venue,
			COALESCE(v.display_name, v.code, e.venue_type) AS venue_name,
			COALESCE(i.symbol, '-') AS symbol,
			e.side,
			e.qty::text,
			e.price::text,
			e.source
		FROM trade_events e
		LEFT JOIN venues v ON e.venue_id = v.id
		LEFT JOIN instruments i ON e.instrument_id = i.id
		WHERE e.user_id = $1
			AND e.executed_at >= $2
			AND e.executed_at < $3
			AND e.event_type IN ('spot_trade', 'perp_trade', 'dex_swap')
	)
`

func buildDailySafetyWhere(
	filter repositories.DailySafetyFilter,
	includeOnlyPending bool,
	argIndex int,
	args []interface{},
) (string, []interface{}, int) {
	conditions := make([]string, 0, 3)

	assetClass := strings.ToLower(strings.TrimSpace(filter.AssetClass))
	if assetClass != "" {
		conditions = append(conditions, fmt.Sprintf("d.asset_class = $%d", argIndex))
		args = append(args, assetClass)
		argIndex++
	}

	venue := strings.ToLower(strings.TrimSpace(filter.Venue))
	if venue != "" {
		conditions = append(conditions, fmt.Sprintf("(LOWER(d.venue) = $%d OR LOWER(d.venue_name) = $%d)", argIndex, argIndex))
		args = append(args, venue)
		argIndex++
	}

	if includeOnlyPending && filter.OnlyPending {
		conditions = append(conditions, "r.id IS NULL")
	}

	if len(conditions) == 0 {
		return "", args, argIndex
	}

	return " WHERE " + strings.Join(conditions, " AND "), args, argIndex
}

func parseDailySafetyTargetID(targetType string, tradeID pgtype.Text, tradeEventID pgtype.Text) (uuid.UUID, error) {
	if targetType == "trade" {
		if !tradeID.Valid {
			return uuid.Nil, fmt.Errorf("trade target is missing id")
		}
		return uuid.Parse(tradeID.String)
	}

	if targetType == "trade_event" {
		if !tradeEventID.Valid {
			return uuid.Nil, fmt.Errorf("trade_event target is missing id")
		}
		return uuid.Parse(tradeEventID.String)
	}

	return uuid.Nil, fmt.Errorf("unsupported target type: %s", targetType)
}

func scanSafetyReview(row interface {
	Scan(dest ...interface{}) error
}) (*entities.TradeSafetyReview, error) {
	var review entities.TradeSafetyReview
	var tradeIDRaw string
	var tradeEventIDRaw string
	var verdict string
	var noteText pgtype.Text

	if err := row.Scan(
		&review.ID,
		&review.UserID,
		&tradeIDRaw,
		&tradeEventIDRaw,
		&verdict,
		&noteText,
		&review.CreatedAt,
		&review.UpdatedAt,
	); err != nil {
		return nil, err
	}

	if tradeIDRaw != "" {
		parsed, err := uuid.Parse(tradeIDRaw)
		if err != nil {
			return nil, err
		}
		review.TradeID = &parsed
	}
	if tradeEventIDRaw != "" {
		parsed, err := uuid.Parse(tradeEventIDRaw)
		if err != nil {
			return nil, err
		}
		review.TradeEventID = &parsed
	}

	review.Verdict = entities.TradeSafetyVerdict(verdict)
	if noteText.Valid {
		note := noteText.String
		review.Note = &note
	}

	return &review, nil
}

func normalizeOptionalNote(note *string) *string {
	if note == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*note)
	if trimmed == "" {
		return nil
	}
	if len(trimmed) > 300 {
		trimmed = trimmed[:300]
	}
	return &trimmed
}
```

## File: internal/infrastructure/repositories/trade_sync_state_repository_impl.go
```go
package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type TradeSyncStateRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewTradeSyncStateRepository(pool *pgxpool.Pool) repositories.TradeSyncStateRepository {
	return &TradeSyncStateRepositoryImpl{pool: pool}
}

func (r *TradeSyncStateRepositoryImpl) GetByUserAndSymbol(ctx context.Context, userID uuid.UUID, exchange string, symbol string) (*entities.TradeSyncState, error) {
	query := `
		SELECT id, user_id, exchange, symbol, last_trade_id, last_sync_at
		FROM trade_sync_state
		WHERE user_id = $1 AND exchange = $2 AND symbol = $3
	`
	var state entities.TradeSyncState
	err := r.pool.QueryRow(ctx, query, userID, exchange, symbol).Scan(
		&state.ID, &state.UserID, &state.Exchange, &state.Symbol, &state.LastTradeID, &state.LastSyncAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &state, nil
}

func (r *TradeSyncStateRepositoryImpl) Upsert(ctx context.Context, state *entities.TradeSyncState) error {
	query := `
		INSERT INTO trade_sync_state (id, user_id, exchange, symbol, last_trade_id, last_sync_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, exchange, symbol)
		DO UPDATE SET last_trade_id = EXCLUDED.last_trade_id, last_sync_at = EXCLUDED.last_sync_at
	`
	_, err := r.pool.Exec(ctx, query,
		state.ID, state.UserID, state.Exchange, state.Symbol, state.LastTradeID, state.LastSyncAt)
	return err
}
```

## File: internal/infrastructure/repositories/user_ai_key_repository_impl.go
```go
package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type UserAIKeyRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewUserAIKeyRepository(pool *pgxpool.Pool) repositories.UserAIKeyRepository {
	return &UserAIKeyRepositoryImpl{pool: pool}
}

func (r *UserAIKeyRepositoryImpl) Upsert(ctx context.Context, key *entities.UserAIKey) error {
	query := `
        INSERT INTO user_ai_keys (id, user_id, provider, api_key_enc, api_key_last4, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, provider)
        DO UPDATE SET api_key_enc = EXCLUDED.api_key_enc, api_key_last4 = EXCLUDED.api_key_last4, created_at = EXCLUDED.created_at
    `
	_, err := r.pool.Exec(ctx, query,
		key.ID, key.UserID, key.Provider, key.APIKeyEnc, key.APIKeyLast4, key.CreatedAt)
	return err
}

func (r *UserAIKeyRepositoryImpl) GetByUserAndProvider(ctx context.Context, userID uuid.UUID, provider string) (*entities.UserAIKey, error) {
	query := `
        SELECT id, user_id, provider, api_key_enc, api_key_last4, created_at
        FROM user_ai_keys
        WHERE user_id = $1 AND provider = $2
    `
	var key entities.UserAIKey
	err := r.pool.QueryRow(ctx, query, userID, provider).Scan(
		&key.ID, &key.UserID, &key.Provider, &key.APIKeyEnc, &key.APIKeyLast4, &key.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &key, nil
}

func (r *UserAIKeyRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.UserAIKey, error) {
	query := `
        SELECT id, user_id, provider, api_key_enc, api_key_last4, created_at
        FROM user_ai_keys
        WHERE user_id = $1
        ORDER BY provider ASC
    `
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []*entities.UserAIKey
	for rows.Next() {
		var key entities.UserAIKey
		if err := rows.Scan(&key.ID, &key.UserID, &key.Provider, &key.APIKeyEnc, &key.APIKeyLast4, &key.CreatedAt); err != nil {
			return nil, err
		}
		keys = append(keys, &key)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return keys, nil
}

func (r *UserAIKeyRepositoryImpl) DeleteByUserAndProvider(ctx context.Context, userID uuid.UUID, provider string) (bool, error) {
	query := `DELETE FROM user_ai_keys WHERE user_id = $1 AND provider = $2`
	result, err := r.pool.Exec(ctx, query, userID, provider)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}
```

## File: internal/infrastructure/repositories/user_repository_impl.go
```go
package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type UserRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) repositories.UserRepository {
	return &UserRepositoryImpl{pool: pool}
}

func (r *UserRepositoryImpl) Create(ctx context.Context, user *entities.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, name, ai_allowlisted, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.pool.Exec(ctx, query,
		user.ID, user.Email, user.PasswordHash, user.Name, user.AIAllowlisted, user.CreatedAt, user.UpdatedAt)
	return err
}

func (r *UserRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*entities.User, error) {
	query := `
		SELECT id, email, password_hash, name, ai_allowlisted, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var user entities.User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.AIAllowlisted, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserRepositoryImpl) GetByEmail(ctx context.Context, email string) (*entities.User, error) {
	query := `
		SELECT id, email, password_hash, name, ai_allowlisted, created_at, updated_at
		FROM users
		WHERE LOWER(email) = LOWER($1)
	`
	var user entities.User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.AIAllowlisted, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserRepositoryImpl) Update(ctx context.Context, user *entities.User) error {
	query := `
		UPDATE users
		SET email = $2, password_hash = $3, name = $4, ai_allowlisted = $5, updated_at = $6
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		user.ID, user.Email, user.PasswordHash, user.Name, user.AIAllowlisted, user.UpdatedAt)
	return err
}

func (r *UserRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}
```

## File: internal/infrastructure/repositories/user_symbol_repository_impl.go
```go
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type UserSymbolRepositoryImpl struct {
	pool *pgxpool.Pool
}

func NewUserSymbolRepository(pool *pgxpool.Pool) repositories.UserSymbolRepository {
	return &UserSymbolRepositoryImpl{pool: pool}
}

func (r *UserSymbolRepositoryImpl) Create(ctx context.Context, symbol *entities.UserSymbol) error {
	query := `
		INSERT INTO user_symbols (id, user_id, symbol, timeframe_default, created_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, symbol) DO NOTHING
	`
	_, err := r.pool.Exec(ctx, query,
		symbol.ID, symbol.UserID, symbol.Symbol, symbol.TimeframeDefault, symbol.CreatedAt)
	return err
}

func (r *UserSymbolRepositoryImpl) ListByUser(ctx context.Context, userID uuid.UUID) ([]*entities.UserSymbol, error) {
	query := `
		SELECT id, user_id, symbol, timeframe_default, created_at
		FROM user_symbols
		WHERE user_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var symbols []*entities.UserSymbol
	for rows.Next() {
		var symbol entities.UserSymbol
		err := rows.Scan(
			&symbol.ID, &symbol.UserID, &symbol.Symbol, &symbol.TimeframeDefault, &symbol.CreatedAt)
		if err != nil {
			return nil, err
		}
		symbols = append(symbols, &symbol)
	}

	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return symbols, nil
}

func (r *UserSymbolRepositoryImpl) ReplaceByUser(ctx context.Context, userID uuid.UUID, symbols []*entities.UserSymbol) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	deleteQuery := `DELETE FROM user_symbols WHERE user_id = $1`
	if _, err = tx.Exec(ctx, deleteQuery, userID); err != nil {
		return err
	}

	insertQuery := `
		INSERT INTO user_symbols (id, user_id, symbol, timeframe_default, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	for _, symbol := range symbols {
		_, err = tx.Exec(ctx, insertQuery,
			symbol.ID, symbol.UserID, symbol.Symbol, symbol.TimeframeDefault, symbol.CreatedAt)
		if err != nil {
			return err
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return err
	}

	return nil
}
```

## File: internal/interfaces/http/handlers/ai_handler.go
```go
package handlers

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	cryptoutil "github.com/moneyvessel/kifu/internal/infrastructure/crypto"
)

const (
	providerOpenAI   = "openai"
	providerClaude   = "claude"
	providerGemini   = "gemini"
	oneShotMaxTokens = 260
)

var (
	errAIAllowlistRequired = errors.New("allowlist required")
)

type AIHandler struct {
	bubbleRepo        repositories.BubbleRepository
	opinionRepo       repositories.AIOpinionRepository
	providerRepo      repositories.AIProviderRepository
	userAIKeyRepo     repositories.UserAIKeyRepository
	userRepo          repositories.UserRepository
	subscriptionRepo  repositories.SubscriptionRepository
	encryptionKey     []byte
	client            *http.Client
	oneShotCache      *oneShotCache
	requireAllowlist  bool
	serviceMonthlyCap int
}

func NewAIHandler(
	bubbleRepo repositories.BubbleRepository,
	opinionRepo repositories.AIOpinionRepository,
	providerRepo repositories.AIProviderRepository,
	userAIKeyRepo repositories.UserAIKeyRepository,
	userRepo repositories.UserRepository,
	subscriptionRepo repositories.SubscriptionRepository,
	encryptionKey []byte,
) *AIHandler {
	requireAllowlist := envBoolWithDefault("AI_REQUIRE_ALLOWLIST", isProductionEnv())
	serviceMonthlyCap := envIntWithDefault("AI_SERVICE_MONTHLY_CAP", 0)
	if serviceMonthlyCap < 0 {
		serviceMonthlyCap = 0
	}

	return &AIHandler{
		bubbleRepo:       bubbleRepo,
		opinionRepo:      opinionRepo,
		providerRepo:     providerRepo,
		userAIKeyRepo:    userAIKeyRepo,
		userRepo:         userRepo,
		subscriptionRepo: subscriptionRepo,
		encryptionKey:    encryptionKey,
		client: &http.Client{
			Timeout: 20 * time.Second,
		},
		oneShotCache:      newOneShotCache(60 * time.Second),
		requireAllowlist:  requireAllowlist,
		serviceMonthlyCap: serviceMonthlyCap,
	}
}

type oneShotCacheEntry struct {
	response  OneShotAIResponse
	expiresAt time.Time
}

type oneShotCache struct {
	mu    sync.Mutex
	ttl   time.Duration
	items map[string]oneShotCacheEntry
}

func newOneShotCache(ttl time.Duration) *oneShotCache {
	return &oneShotCache{
		ttl:   ttl,
		items: make(map[string]oneShotCacheEntry),
	}
}

func (c *oneShotCache) get(key string) (OneShotAIResponse, bool) {
	if c == nil {
		return OneShotAIResponse{}, false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.items[key]
	if !ok {
		return OneShotAIResponse{}, false
	}
	if time.Now().After(entry.expiresAt) {
		delete(c.items, key)
		return OneShotAIResponse{}, false
	}
	return entry.response, true
}

func (c *oneShotCache) set(key string, response OneShotAIResponse) {
	if c == nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = oneShotCacheEntry{
		response:  response,
		expiresAt: time.Now().Add(c.ttl),
	}
}

func buildOneShotCacheKey(userID uuid.UUID, req OneShotAIRequest) string {
	parts := []string{
		userID.String(),
		strings.ToLower(strings.TrimSpace(req.Provider)),
		strings.ToLower(strings.TrimSpace(req.PromptType)),
		strings.ToUpper(strings.TrimSpace(req.Symbol)),
		strings.ToLower(strings.TrimSpace(req.Timeframe)),
		strings.TrimSpace(req.Price),
		strings.TrimSpace(req.EvidenceText),
	}
	raw := strings.Join(parts, "|")
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func envBoolWithDefault(key string, fallback bool) bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if raw == "" {
		return fallback
	}
	switch raw {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func envIntWithDefault(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return parsed
}

func isProductionEnv() bool {
	env := strings.TrimSpace(strings.ToLower(os.Getenv("APP_ENV")))
	if env == "" {
		env = strings.TrimSpace(strings.ToLower(os.Getenv("ENV")))
	}
	return env == "production" || env == "prod"
}

func (h *AIHandler) enforceAllowlist(ctx context.Context, userID uuid.UUID) error {
	if !h.requireAllowlist {
		return nil
	}
	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil || !user.AIAllowlisted {
		return errAIAllowlistRequired
	}
	return nil
}

func (h *AIHandler) exceedsServiceMonthlyCap(subscription *entities.Subscription, serviceUsage int) bool {
	if subscription == nil || serviceUsage <= 0 || h.serviceMonthlyCap <= 0 {
		return false
	}
	used := subscription.AIQuotaLimit - subscription.AIQuotaRemaining
	if used < 0 {
		used = 0
	}
	return used+serviceUsage > h.serviceMonthlyCap
}

type AIOpinionRequest struct {
	Providers []string `json:"providers"`
}

type AIOpinionItem struct {
	Provider   string `json:"provider"`
	Model      string `json:"model"`
	Response   string `json:"response"`
	TokensUsed *int   `json:"tokens_used,omitempty"`
}

type AIOpinionError struct {
	Provider string `json:"provider"`
	Code     string `json:"code"`
	Message  string `json:"message"`
}

type AIOpinionResponse struct {
	Opinions       []AIOpinionItem  `json:"opinions"`
	Errors         []AIOpinionError `json:"errors,omitempty"`
	DataIncomplete bool             `json:"data_incomplete"`
}

type OneShotAIRequest struct {
	Provider     string `json:"provider"`
	PromptType   string `json:"prompt_type"`
	Symbol       string `json:"symbol"`
	Timeframe    string `json:"timeframe"`
	Price        string `json:"price"`
	EvidenceText string `json:"evidence_text"`
}

type OneShotAIResponse struct {
	Provider   string `json:"provider"`
	Model      string `json:"model"`
	PromptType string `json:"prompt_type"`
	Response   string `json:"response"`
	TokensUsed *int   `json:"tokens_used,omitempty"`
	CreatedAt  string `json:"created_at"`
}

type UserAIKeyRequest struct {
	Keys []UserAIKeyInput `json:"keys"`
}

type UserAIKeyInput struct {
	Provider string `json:"provider"`
	APIKey   string `json:"api_key"`
}

type UserAIKeyListResponse struct {
	Keys []UserAIKeyItem `json:"keys"`
}

type UserAIKeyItem struct {
	Provider string  `json:"provider"`
	Masked   *string `json:"masked"`
}

func (h *AIHandler) RequestOpinions(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}
	if err := h.enforceAllowlist(c.Context(), userID); err != nil {
		if errors.Is(err, errAIAllowlistRequired) {
			return c.Status(403).JSON(fiber.Map{"code": "ALLOWLIST_REQUIRED", "message": "beta allowlist required"})
		}
		log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
	}

	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	var req AIOpinionRequest
	if err := c.BodyParser(&req); err != nil && !errors.Is(err, io.EOF) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
	}
	if bubble == nil {
		return c.Status(404).JSON(fiber.Map{"code": "BUBBLE_NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}

	providers, err := h.resolveProviders(c.Context(), req.Providers)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}
	if len(providers) == 0 {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "no providers available"})
	}

	subscription, err := h.subscriptionRepo.GetByUserID(c.Context(), userID)
	if err != nil {
		log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
	}
	if subscription == nil {
		return c.Status(404).JSON(fiber.Map{"code": "SUBSCRIPTION_NOT_FOUND", "message": "subscription not found"})
	}

	candles, incomplete, err := h.fetchKlines(c.Context(), bubble.Symbol, bubble.Timeframe, bubble.CandleTime)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_REQUEST_FAILED", "message": err.Error()})
	}

	prompt := buildPrompt(bubble, candles)

	perProviderKey := map[string]string{}
	for _, provider := range providers {
		key, err := h.resolveAPIKey(c.Context(), userID, provider)
		if err != nil {
			log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
		}
		perProviderKey[provider] = key
	}

	serviceUsage := 0
	for _, provider := range providers {
		if usesServiceKey(provider, perProviderKey[provider]) {
			serviceUsage++
		}
	}

	if serviceUsage > 0 && subscription.AIQuotaRemaining < serviceUsage {
		return c.Status(429).JSON(fiber.Map{"code": "QUOTA_EXCEEDED", "message": "AI quota exceeded"})
	}
	if h.exceedsServiceMonthlyCap(subscription, serviceUsage) {
		return c.Status(429).JSON(fiber.Map{"code": "BETA_CAP_EXCEEDED", "message": "monthly beta cap exceeded"})
	}

	opinions := make([]AIOpinionItem, 0, len(providers))
	errorsList := make([]AIOpinionError, 0)
	successfulServiceUsage := 0

	for _, provider := range providers {
		key := perProviderKey[provider]
		if key == "" {
			errorsList = append(errorsList, AIOpinionError{Provider: provider, Code: "MISSING_API_KEY", Message: "API key not configured"})
			continue
		}

		model, err := h.lookupModel(c.Context(), provider)
		if err != nil {
			errorsList = append(errorsList, AIOpinionError{Provider: provider, Code: "PROVIDER_ERROR", Message: err.Error()})
			continue
		}

		responseText, tokensUsed, err := h.callProvider(c.Context(), provider, model, key, prompt)
		if err != nil {
			errorsList = append(errorsList, AIOpinionError{Provider: provider, Code: "PROVIDER_ERROR", Message: err.Error()})
			continue
		}

		opinion := &entities.AIOpinion{
			ID:             uuid.New(),
			BubbleID:       bubble.ID,
			Provider:       provider,
			Model:          model,
			PromptTemplate: prompt,
			Response:       responseText,
			TokensUsed:     tokensUsed,
			CreatedAt:      time.Now().UTC(),
		}
		if err := h.opinionRepo.Create(c.Context(), opinion); err != nil {
			errorsList = append(errorsList, AIOpinionError{Provider: provider, Code: "INTERNAL_ERROR", Message: err.Error()})
			continue
		}

		opinions = append(opinions, AIOpinionItem{
			Provider:   provider,
			Model:      model,
			Response:   responseText,
			TokensUsed: tokensUsed,
		})

		if usesServiceKey(provider, key) {
			successfulServiceUsage++
		}
	}

	if successfulServiceUsage > 0 {
		ok, err := h.subscriptionRepo.DecrementQuota(c.Context(), userID, successfulServiceUsage)
		if err != nil {
			log.Printf("[RequestOpinions] DecrementQuota error for user=%s: %v", userID, err)
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
		}
		if !ok {
			return c.Status(429).JSON(fiber.Map{"code": "QUOTA_EXCEEDED", "message": "AI quota exceeded"})
		}
	}

	return c.Status(200).JSON(AIOpinionResponse{
		Opinions:       opinions,
		Errors:         errorsList,
		DataIncomplete: incomplete,
	})
}

func (h *AIHandler) RequestOneShot(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}
	if err := h.enforceAllowlist(c.Context(), userID); err != nil {
		if errors.Is(err, errAIAllowlistRequired) {
			return c.Status(403).JSON(fiber.Map{"code": "ALLOWLIST_REQUIRED", "message": "beta allowlist required"})
		}
		log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
	}

	var req OneShotAIRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	provider := strings.ToLower(strings.TrimSpace(req.Provider))
	if provider == "" {
		provider = providerOpenAI
	}
	if !isSupportedProvider(provider) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "unsupported provider"})
	}

	symbol := strings.TrimSpace(req.Symbol)
	timeframe := strings.TrimSpace(req.Timeframe)
	price := strings.TrimSpace(req.Price)
	if symbol == "" || timeframe == "" || price == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "symbol, timeframe, and price are required"})
	}

	subscription, err := h.subscriptionRepo.GetByUserID(c.Context(), userID)
	if err != nil {
		log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
	}
	if subscription == nil {
		return c.Status(404).JSON(fiber.Map{"code": "SUBSCRIPTION_NOT_FOUND", "message": "subscription not found"})
	}

	cacheKey := buildOneShotCacheKey(userID, req)
	if cached, ok := h.oneShotCache.get(cacheKey); ok {
		return c.Status(200).JSON(cached)
	}

	apiKey, err := h.resolveAPIKey(c.Context(), userID, provider)
	if err != nil {
		log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
	}
	if apiKey == "" {
		return c.Status(400).JSON(fiber.Map{"code": "MISSING_API_KEY", "message": "API key not configured"})
	}

	model, err := h.lookupModel(c.Context(), provider)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if usesServiceKey(provider, apiKey) && subscription.AIQuotaRemaining < 1 {
		return c.Status(429).JSON(fiber.Map{"code": "QUOTA_EXCEEDED", "message": "AI quota exceeded"})
	}
	if usesServiceKey(provider, apiKey) && h.exceedsServiceMonthlyCap(subscription, 1) {
		return c.Status(429).JSON(fiber.Map{"code": "BETA_CAP_EXCEEDED", "message": "monthly beta cap exceeded"})
	}

	prompt := buildOneShotPrompt(req)
	responseText := ""
	var tokensUsed *int
	if strings.TrimSpace(os.Getenv("AI_MOCK")) == "1" {
		responseText = mockOneShotResponse(req)
	} else {
		responseText, tokensUsed, err = h.callProvider(c.Context(), provider, model, apiKey, prompt)
		if err != nil {
			if strings.Contains(err.Error(), "openai error 502") || strings.Contains(err.Error(), "openai error 503") || strings.Contains(err.Error(), "openai error 504") {
				time.Sleep(800 * time.Millisecond)
				responseText, tokensUsed, err = h.callProvider(c.Context(), provider, model, apiKey, prompt)
			}
		}
		if err != nil {
			log.Printf("ai one-shot: provider=%s model=%s error=%v", provider, model, err)
			log.Printf("[ai_handler] provider error: provider=%s model=%s err=%v", provider, model, err)
			return c.Status(502).JSON(fiber.Map{"code": "PROVIDER_ERROR", "message": "AI provider request failed"})
		}
	}

	if usesServiceKey(provider, apiKey) {
		ok, err := h.subscriptionRepo.DecrementQuota(c.Context(), userID, 1)
		if err != nil {
			log.Printf("[RequestOneShot] DecrementQuota error for user=%s: %v", userID, err)
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
		}
		if !ok {
			return c.Status(429).JSON(fiber.Map{"code": "QUOTA_EXCEEDED", "message": "AI quota exceeded"})
		}
	}

	response := OneShotAIResponse{
		Provider:   provider,
		Model:      model,
		PromptType: strings.TrimSpace(req.PromptType),
		Response:   responseText,
		TokensUsed: tokensUsed,
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
	}
	h.oneShotCache.set(cacheKey, response)

	return c.Status(200).JSON(response)
}

func (h *AIHandler) ListOpinions(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
	}
	if bubble == nil {
		return c.Status(404).JSON(fiber.Map{"code": "BUBBLE_NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}

	opinions, err := h.opinionRepo.ListByBubble(c.Context(), bubbleID)
	if err != nil {
		log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
	}

	response := make([]AIOpinionItem, 0, len(opinions))
	for _, opinion := range opinions {
		response = append(response, AIOpinionItem{
			Provider:   opinion.Provider,
			Model:      opinion.Model,
			Response:   opinion.Response,
			TokensUsed: opinion.TokensUsed,
		})
	}

	return c.Status(200).JSON(fiber.Map{"opinions": response})
}

func (h *AIHandler) GetUserAIKeys(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	keys, err := h.userAIKeyRepo.ListByUser(c.Context(), userID)
	if err != nil {
		log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
	}

	keyMap := map[string]*entities.UserAIKey{}
	for _, key := range keys {
		keyMap[key.Provider] = key
	}

	providers := []string{providerOpenAI, providerClaude, providerGemini}
	response := UserAIKeyListResponse{Keys: make([]UserAIKeyItem, 0, len(providers))}
	for _, provider := range providers {
		if key, ok := keyMap[provider]; ok {
			masked := maskKey(key.APIKeyLast4)
			response.Keys = append(response.Keys, UserAIKeyItem{Provider: provider, Masked: &masked})
		} else {
			response.Keys = append(response.Keys, UserAIKeyItem{Provider: provider, Masked: nil})
		}
	}

	return c.Status(200).JSON(response)
}

func (h *AIHandler) UpdateUserAIKeys(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req UserAIKeyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if len(req.Keys) == 0 {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "keys are required"})
	}

	for _, entry := range req.Keys {
		provider := strings.ToLower(strings.TrimSpace(entry.Provider))
		apiKey := strings.TrimSpace(entry.APIKey)
		if !isSupportedProvider(provider) {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "unsupported provider"})
		}
		if apiKey == "" {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "api_key is required"})
		}

		encKey, err := cryptoutil.Encrypt(apiKey, h.encryptionKey)
		if err != nil {
			log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
		}

		record := &entities.UserAIKey{
			ID:          uuid.New(),
			UserID:      userID,
			Provider:    provider,
			APIKeyEnc:   encKey,
			APIKeyLast4: lastFour(apiKey),
			CreatedAt:   time.Now().UTC(),
		}

		if err := h.userAIKeyRepo.Upsert(c.Context(), record); err != nil {
			log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
		}
	}

	return h.GetUserAIKeys(c)
}

func (h *AIHandler) DeleteUserAIKey(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	provider := strings.ToLower(strings.TrimSpace(c.Params("provider")))
	if !isSupportedProvider(provider) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "unsupported provider"})
	}

	deleted, err := h.userAIKeyRepo.DeleteByUserAndProvider(c.Context(), userID, provider)
	if err != nil {
		log.Printf("[ai_handler] internal error: %v", err)
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "an internal error occurred"})
	}
	if !deleted {
		return c.Status(404).JSON(fiber.Map{"code": "AI_KEY_NOT_FOUND", "message": "API key not found"})
	}

	return c.Status(200).JSON(fiber.Map{"deleted": true})
}

func (h *AIHandler) resolveProviders(ctx context.Context, requested []string) ([]string, error) {
	if len(requested) == 0 {
		providers, err := h.providerRepo.ListEnabled(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]string, 0, len(providers))
		for _, provider := range providers {
			result = append(result, provider.Name)
		}
		return result, nil
	}

	result := make([]string, 0, len(requested))
	seen := map[string]struct{}{}
	for _, provider := range requested {
		normalized := strings.ToLower(strings.TrimSpace(provider))
		if normalized == "" {
			continue
		}
		if !isSupportedProvider(normalized) {
			return nil, fmt.Errorf("unsupported provider: %s", normalized)
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	return result, nil
}

func (h *AIHandler) resolveAPIKey(ctx context.Context, userID uuid.UUID, provider string) (string, error) {
	userKey, err := h.userAIKeyRepo.GetByUserAndProvider(ctx, userID, provider)
	if err != nil {
		log.Printf("[resolveAPIKey] failed to lookup user key for provider=%s: %v", provider, err)
	}
	if userKey != nil && userKey.APIKeyEnc != "" {
		decrypted, err := cryptoutil.Decrypt(userKey.APIKeyEnc, h.encryptionKey)
		if err != nil {
			log.Printf("[resolveAPIKey] failed to decrypt user key for provider=%s: %v", provider, err)
		} else if decrypted != "" {
			return decrypted, nil
		}
	}

	switch provider {
	case providerOpenAI:
		return strings.TrimSpace(os.Getenv("OPENAI_API_KEY")), nil
	case providerClaude:
		return strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY")), nil
	case providerGemini:
		return strings.TrimSpace(os.Getenv("GEMINI_API_KEY")), nil
	default:
		return "", nil
	}
}

func (h *AIHandler) lookupModel(ctx context.Context, provider string) (string, error) {
	item, err := h.providerRepo.GetByName(ctx, provider)
	if err != nil {
		return "", err
	}
	if item == nil || !item.Enabled {
		return "", errors.New("provider not enabled")
	}
	return item.Model, nil
}

func (h *AIHandler) callProvider(ctx context.Context, provider string, model string, apiKey string, prompt string) (string, *int, error) {
	switch provider {
	case providerOpenAI:
		return h.callOpenAI(ctx, model, apiKey, prompt)
	case providerClaude:
		return h.callClaude(ctx, model, apiKey, prompt)
	case providerGemini:
		return h.callGemini(ctx, model, apiKey, prompt)
	default:
		return "", nil, errors.New("unsupported provider")
	}
}

func (h *AIHandler) callOpenAI(ctx context.Context, model string, apiKey string, prompt string) (string, *int, error) {
	payload := map[string]interface{}{
		"model":             model,
		"input":             prompt,
		"temperature":       0.2,
		"max_output_tokens": oneShotMaxTokens,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/responses", bytes.NewReader(body))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := h.client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("openai error %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}

	var result struct {
		Output []struct {
			Type    string `json:"type"`
			Role    string `json:"role"`
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
		} `json:"output"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", nil, err
	}

	parts := make([]string, 0)
	for _, item := range result.Output {
		if item.Type != "message" {
			continue
		}
		for _, content := range item.Content {
			if content.Type == "output_text" && strings.TrimSpace(content.Text) != "" {
				parts = append(parts, strings.TrimSpace(content.Text))
			}
		}
	}
	if len(parts) == 0 {
		return "", nil, errors.New("openai returned no content")
	}

	tokens := result.Usage.TotalTokens
	return strings.TrimSpace(strings.Join(parts, "\n")), &tokens, nil
}

func (h *AIHandler) callClaude(ctx context.Context, model string, apiKey string, prompt string) (string, *int, error) {
	payload := map[string]interface{}{
		"model":       model,
		"max_tokens":  oneShotMaxTokens,
		"temperature": 0.2,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := h.client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("claude error %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}

	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", nil, err
	}

	if len(result.Content) == 0 {
		return "", nil, errors.New("claude returned no content")
	}

	tokens := result.Usage.InputTokens + result.Usage.OutputTokens
	return strings.TrimSpace(result.Content[0].Text), &tokens, nil
}

func (h *AIHandler) callGemini(ctx context.Context, model string, apiKey string, prompt string) (string, *int, error) {
	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{{"text": prompt}}},
		},
		"generationConfig": map[string]interface{}{
			"temperature":     0.2,
			"maxOutputTokens": oneShotMaxTokens,
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", nil, err
	}

	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, url.QueryEscape(apiKey))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("gemini error %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		UsageMetadata struct {
			TotalTokenCount int `json:"totalTokenCount"`
		} `json:"usageMetadata"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", nil, err
	}

	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", nil, errors.New("gemini returned no content")
	}

	tokens := result.UsageMetadata.TotalTokenCount
	if tokens == 0 {
		return strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text), nil, nil
	}
	return strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text), &tokens, nil
}

type klineItem struct {
	Time   int64  `json:"time"`
	Open   string `json:"open"`
	High   string `json:"high"`
	Low    string `json:"low"`
	Close  string `json:"close"`
	Volume string `json:"volume"`
}

func (h *AIHandler) fetchKlines(ctx context.Context, symbol string, interval string, candleTime time.Time) ([]klineItem, bool, error) {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", interval)
	params.Set("limit", "50")
	params.Set("endTime", fmt.Sprintf("%d", candleTime.UTC().UnixMilli()))

	requestURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/klines?%s", params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, false, err
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		return nil, false, fmt.Errorf("binance klines error %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, false, err
	}

	items := make([]klineItem, 0, len(raw))
	for _, row := range raw {
		if len(row) < 6 {
			continue
		}
		openTime, ok := asInt64(row[0])
		if !ok {
			continue
		}
		open, ok := asString(row[1])
		if !ok {
			continue
		}
		high, ok := asString(row[2])
		if !ok {
			continue
		}
		low, ok := asString(row[3])
		if !ok {
			continue
		}
		closeVal, ok := asString(row[4])
		if !ok {
			continue
		}
		volume, ok := asString(row[5])
		if !ok {
			continue
		}

		items = append(items, klineItem{
			Time:   openTime / 1000,
			Open:   open,
			High:   high,
			Low:    low,
			Close:  closeVal,
			Volume: volume,
		})
	}

	return items, len(items) < 50, nil
}

func buildPrompt(bubble *entities.Bubble, candles []klineItem) string {
	builder := strings.Builder{}
	builder.WriteString("당신은 암호화폐 시장 분석가입니다.\n\n")
	builder.WriteString("현재 상황:\n")
	builder.WriteString(fmt.Sprintf("- 심볼: %s\n", bubble.Symbol))
	builder.WriteString(fmt.Sprintf("- 타임프레임: %s\n", bubble.Timeframe))
	builder.WriteString(fmt.Sprintf("- 현재 가격: %s\n", bubble.Price))
	if bubble.Memo != nil && strings.TrimSpace(*bubble.Memo) != "" {
		builder.WriteString(fmt.Sprintf("- 사용자 메모: %s\n", strings.TrimSpace(*bubble.Memo)))
	}
	builder.WriteString("\n최근 50개 캔들 데이터:\n")

	for _, candle := range candles {
		builder.WriteString(fmt.Sprintf("%d, O:%s H:%s L:%s C:%s V:%s\n",
			candle.Time, candle.Open, candle.High, candle.Low, candle.Close, candle.Volume))
	}

	builder.WriteString("\n질문: 이 상황에서의 단기 전망과 주의할 점을 분석해주세요.\n")
	return builder.String()
}

func buildOneShotPrompt(req OneShotAIRequest) string {
	builder := strings.Builder{}
	builder.WriteString("당신은 트레이딩 복기 어시스턴트입니다.\n")
	builder.WriteString("응답은 한국어로 작성하고, 실행 가능한 조치 중심으로 짧게 제시하세요.\n")
	builder.WriteString("출력은 지정된 포맷만 사용하며 불필요한 서론/면책 문구는 금지합니다.\n\n")
	builder.WriteString("포맷 강제 규칙:\n")
	builder.WriteString("- 출력은 번호 항목만 작성(예: 1) ... 2) ...)\n")
	builder.WriteString("- 항목 순서 변경/누락 금지\n")
	builder.WriteString("- 각 항목은 최대 1문장\n")
	builder.WriteString("- 마지막 결론에서 행동 제안과 다른 말을 하지 말 것\n\n")
	builder.WriteString("핵심 규칙:\n")
	builder.WriteString("- 근거 없는 일반론 금지. 증거 패킷이 있으면 반드시 그 안의 데이터(포지션/체결/버블/요약)를 직접 인용\n")
	builder.WriteString("- 행동 제안은 반드시 하나의 방향으로 명확히 결정: 유지/축소/정리/추가/관망/진입 중 하나\n")
	builder.WriteString("- 포지션이 존재할 때는 '관망' 남발 금지. 관망을 제시하려면 현재 리스크가 낮다는 근거 1줄을 함께 제시\n")
	builder.WriteString("- 증거에 손절/익절/기준이 있으면 해당 기준의 준수/위반 여부를 1줄로 먼저 판정\n")
	builder.WriteString("- 사용자 메모에 '손절/정리/관망/진입/축소/추가' 의도가 있으면 그 의도와 일치/상충을 명시\n")
	builder.WriteString("- 숫자/레벨/조건은 가능하면 구체값으로 작성하고, 모르면 '데이터 부족'을 명시\n")
	builder.WriteString("- 문장은 짧게. 각 항목 1~2줄 이내\n\n")
	builder.WriteString("행동 제안 작성 규칙:\n")
	builder.WriteString("- 첫 단어를 반드시 [유지|축소|정리|추가|관망|진입] 중 하나로 시작\n")
	builder.WriteString("- 뒤에는 이유 1줄만 작성\n")
	builder.WriteString("- 포지션 보유 + 기준 위반 정황이 있으면 우선순위는 정리 또는 축소\n\n")
	builder.WriteString("현재 상황:\n")
	builder.WriteString(fmt.Sprintf("- 심볼: %s\n", strings.TrimSpace(req.Symbol)))
	builder.WriteString(fmt.Sprintf("- 타임프레임: %s\n", strings.TrimSpace(req.Timeframe)))
	builder.WriteString(fmt.Sprintf("- 현재 가격: %s\n", strings.TrimSpace(req.Price)))
	if intent := inferUserIntent(req.EvidenceText); intent != "" {
		builder.WriteString(fmt.Sprintf("- 사용자 의도(추정): %s\n", intent))
	}

	if strings.TrimSpace(req.EvidenceText) != "" {
		builder.WriteString("\n증거 패킷(요약):\n")
		builder.WriteString(strings.TrimSpace(req.EvidenceText))
		builder.WriteString("\n")
	}

	switch strings.ToLower(strings.TrimSpace(req.PromptType)) {
	case "detailed":
		builder.WriteString("\n출력 형식:\n")
		builder.WriteString("1) 요약: 한 줄\n")
		builder.WriteString("2) 핵심 근거: 2줄 이내(증거 패킷 기준)\n")
		builder.WriteString("3) 리스크: 2줄 이내\n")
		builder.WriteString("4) 유효/무효 조건: 2줄 이내\n")
		builder.WriteString("5) 행동 제안: [유지|축소|정리|추가|관망|진입] + 이유 1줄\n")
		builder.WriteString("6) 사용자 판단 대비: 한 줄(일치/상충)\n")
		builder.WriteString("7) 체크리스트: 불릿 3개 이하\n")
		builder.WriteString("8) 결론: 한 줄\n")
	case "technical":
		builder.WriteString("\n출력 형식:\n")
		builder.WriteString("1) 추세/모멘텀: 한 줄\n")
		builder.WriteString("2) 핵심 레벨: 지지/저항 1~2개씩\n")
		builder.WriteString("3) 무효화 조건: 한 줄\n")
		builder.WriteString("4) 시나리오: 상승/하락 각 1줄\n")
		builder.WriteString("5) 행동 제안: [유지|축소|정리|추가|관망|진입] + 이유 1줄\n")
		builder.WriteString("6) 사용자 판단 대비: 한 줄(일치/상충)\n")
		builder.WriteString("7) 추가 확인 데이터: 한 줄(애매할 때)\n")
		builder.WriteString("8) 결론: 한 줄\n")
	default:
		builder.WriteString("\n출력 형식:\n")
		builder.WriteString("1) 상황: 한 줄\n")
		builder.WriteString("2) 핵심 근거: 한 줄(증거 패킷 기준)\n")
		builder.WriteString("3) 리스크: 한 줄\n")
		builder.WriteString("4) 행동 제안: [유지|축소|정리|추가|관망|진입] + 이유 1줄\n")
		builder.WriteString("5) 사용자 판단 대비: 한 줄(일치/상충)\n")
		builder.WriteString("6) 결론: 한 줄\n")
	}
	return builder.String()
}

func inferUserIntent(evidenceText string) string {
	text := strings.ToLower(strings.TrimSpace(evidenceText))
	if text == "" {
		return ""
	}

	if strings.Contains(text, "손절") || strings.Contains(text, "정리") || strings.Contains(text, "청산") {
		return "손실 제한/포지션 정리 우선"
	}
	if strings.Contains(text, "추가매수") || strings.Contains(text, "추가 진입") || strings.Contains(text, "add") {
		return "기존 포지션에 추가 의도"
	}
	if strings.Contains(text, "관망") || strings.Contains(text, "기다") {
		return "신규 행동 보류 의도"
	}
	if strings.Contains(text, "롱") || strings.Contains(text, "매수") {
		return "상방 대응 의도"
	}
	if strings.Contains(text, "숏") || strings.Contains(text, "매도") {
		return "하방 대응 의도"
	}
	return ""
}

func mockOneShotResponse(req OneShotAIRequest) string {
	switch strings.ToLower(strings.TrimSpace(req.PromptType)) {
	case "detailed":
		return strings.TrimSpace(`1) 요약: 급격한 변동 이후 관망/확인 구간으로 보입니다.
2) 핵심 근거: 최근 변동성 확대와 거래량 증가 구간이 확인됩니다.
3) 리스크: 변동성 확대 구간에서 역추세 진입은 손실 확률이 높습니다.
4) 유효/무효 조건: 직전 고점 회복 실패 시 신중, 고점 회복 시 시나리오 재평가.
5) 행동 제안: 축소 손절 기준 재확인 전까지 포지션 크기를 줄여 리스크를 먼저 낮추세요.
6) 사용자 판단 대비: 손절 기준 점검 방향으로 일치.
7) 체크리스트: 손절 기준 확인 · 포지션 사이즈 축소 · 주요 뉴스/지표 확인
8) 결론: 기준 레벨 확인 전까지 무리한 진입은 피하는 편이 안전합니다.`)
	case "technical":
		return strings.TrimSpace(`1) 추세/모멘텀: 단기 모멘텀 약화, 방향성 불명확.
2) 핵심 레벨: 지지 1개/저항 1개 기준만 확인.
3) 무효화 조건: 직전 저점 이탈 시 하방 시나리오 강화.
4) 시나리오: 상승—저항 돌파 후 눌림 확인 / 하락—지지 이탈 후 반등 실패.
5) 행동 제안: 관망 레벨 돌파/이탈이 확인되기 전까지 신규 포지션 진입을 미루세요.
6) 사용자 판단 대비: 관망 판단과 일치.
7) 추가 확인 데이터: 거래량/뉴스 이벤트 확인.
8) 결론: 레벨 확인 전까지 관망이 합리적.`)
	default:
		return strings.TrimSpace(`1) 상황: 변동성 확대로 판단 구간이 빠르게 바뀌는 상태입니다.
2) 핵심 근거: 변동폭 확대와 방향성 불확실 구간이 동시에 나타납니다.
3) 리스크: 방향 확인 없이 추격 진입하면 손실 가능성이 높습니다.
4) 행동 제안: 정리 기준이 불명확한 보유 포지션은 우선 정리해 손실 확산 가능성을 줄이세요.
5) 사용자 판단 대비: 관망/축소 쪽으로 일치.
6) 결론: 신호 확인 전까지 관망 또는 소규모 대응이 적합합니다.`)
	}
}

func isSupportedProvider(provider string) bool {
	switch provider {
	case providerOpenAI, providerClaude, providerGemini:
		return true
	default:
		return false
	}
}

func usesServiceKey(provider string, key string) bool {
	if key == "" {
		return false
	}
	switch provider {
	case providerOpenAI:
		return strings.TrimSpace(os.Getenv("OPENAI_API_KEY")) == key
	case providerClaude:
		return strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY")) == key
	case providerGemini:
		return strings.TrimSpace(os.Getenv("GEMINI_API_KEY")) == key
	default:
		return false
	}
}
```

## File: internal/interfaces/http/handlers/alert_notification_handler.go
```go
package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AlertNotificationHandler struct {
	alertRepo    repositories.AlertRepository
	briefingRepo repositories.AlertBriefingRepository
	decisionRepo repositories.AlertDecisionRepository
	outcomeRepo  repositories.AlertOutcomeRepository
}

func NewAlertNotificationHandler(
	alertRepo repositories.AlertRepository,
	briefingRepo repositories.AlertBriefingRepository,
	decisionRepo repositories.AlertDecisionRepository,
	outcomeRepo repositories.AlertOutcomeRepository,
) *AlertNotificationHandler {
	return &AlertNotificationHandler{
		alertRepo:    alertRepo,
		briefingRepo: briefingRepo,
		decisionRepo: decisionRepo,
		outcomeRepo:  outcomeRepo,
	}
}

type AlertDetailResponse struct {
	Alert     *entities.Alert          `json:"alert"`
	Briefings []*entities.AlertBriefing `json:"briefings"`
	Decision  *entities.AlertDecision   `json:"decision,omitempty"`
	Outcomes  []*entities.AlertOutcome  `json:"outcomes,omitempty"`
}

type CreateDecisionRequest struct {
	Action     string  `json:"action"`
	Memo       *string `json:"memo,omitempty"`
	Confidence *string `json:"confidence,omitempty"`
}

func (h *AlertNotificationHandler) ListAlerts(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	var statusFilter *entities.AlertStatus
	if s := c.Query("status"); s != "" {
		status := entities.AlertStatus(s)
		statusFilter = &status
	}

	alerts, total, err := h.alertRepo.ListByUser(c.Context(), userID, statusFilter, limit, offset)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if alerts == nil {
		alerts = []*entities.Alert{}
	}

	return c.JSON(fiber.Map{"alerts": alerts, "total": total})
}

func (h *AlertNotificationHandler) GetAlert(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	alert, err := h.alertRepo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if alert == nil || alert.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "alert not found"})
	}

	briefings, err := h.briefingRepo.ListByAlert(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	decision, _ := h.decisionRepo.GetByAlert(c.Context(), id)
	outcomes, _ := h.outcomeRepo.ListByAlert(c.Context(), id)

	return c.JSON(AlertDetailResponse{
		Alert:     alert,
		Briefings: briefings,
		Decision:  decision,
		Outcomes:  outcomes,
	})
}

func (h *AlertNotificationHandler) CreateDecision(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	alertID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	alert, err := h.alertRepo.GetByID(c.Context(), alertID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if alert == nil || alert.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "alert not found"})
	}

	var req CreateDecisionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if !isValidAction(req.Action) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid action"})
	}

	var confidence *entities.Confidence
	if req.Confidence != nil {
		conf := entities.Confidence(*req.Confidence)
		confidence = &conf
	}

	now := time.Now().UTC()
	decision := &entities.AlertDecision{
		ID:         uuid.New(),
		AlertID:    alertID,
		UserID:     userID,
		Action:     entities.DecisionAction(req.Action),
		Memo:       req.Memo,
		Confidence: confidence,
		ExecutedAt: &now,
		CreatedAt:  now,
	}

	if err := h.decisionRepo.Create(c.Context(), decision); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if err := h.alertRepo.UpdateStatus(c.Context(), alertID, entities.AlertStatusDecided); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(201).JSON(decision)
}

func (h *AlertNotificationHandler) DismissAlert(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	alertID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	alert, err := h.alertRepo.GetByID(c.Context(), alertID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if alert == nil || alert.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "alert not found"})
	}

	if err := h.alertRepo.UpdateStatus(c.Context(), alertID, entities.AlertStatusExpired); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"dismissed": true})
}

func (h *AlertNotificationHandler) GetOutcome(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	alertID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	alert, err := h.alertRepo.GetByID(c.Context(), alertID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if alert == nil || alert.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "alert not found"})
	}

	outcomes, err := h.outcomeRepo.ListByAlert(c.Context(), alertID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if outcomes == nil {
		outcomes = []*entities.AlertOutcome{}
	}

	return c.JSON(fiber.Map{"outcomes": outcomes})
}

func isValidAction(action string) bool {
	switch entities.DecisionAction(action) {
	case entities.DecisionBuy, entities.DecisionSell, entities.DecisionHold,
		entities.DecisionClose, entities.DecisionReduce, entities.DecisionAdd, entities.DecisionIgnore:
		return true
	}
	return false
}
```

## File: internal/interfaces/http/handlers/alert_rule_handler.go
```go
package handlers

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AlertRuleHandler struct {
	ruleRepo repositories.AlertRuleRepository
}

func NewAlertRuleHandler(ruleRepo repositories.AlertRuleRepository) *AlertRuleHandler {
	return &AlertRuleHandler{ruleRepo: ruleRepo}
}

type CreateAlertRuleRequest struct {
	Name            string          `json:"name"`
	Symbol          string          `json:"symbol"`
	RuleType        string          `json:"rule_type"`
	Config          json.RawMessage `json:"config"`
	CooldownMinutes *int            `json:"cooldown_minutes,omitempty"`
}

type UpdateAlertRuleRequest struct {
	Name            string          `json:"name"`
	Symbol          string          `json:"symbol"`
	RuleType        string          `json:"rule_type"`
	Config          json.RawMessage `json:"config"`
	CooldownMinutes *int            `json:"cooldown_minutes,omitempty"`
	Enabled         *bool           `json:"enabled,omitempty"`
}

func (h *AlertRuleHandler) Create(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req CreateAlertRuleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if req.Name == "" || req.Symbol == "" || req.RuleType == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "name, symbol, and rule_type are required"})
	}

	if !isValidRuleType(req.RuleType) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid rule_type"})
	}

	cooldown := 60
	if req.CooldownMinutes != nil {
		cooldown = *req.CooldownMinutes
	}

	rule := &entities.AlertRule{
		UserID:          userID,
		Name:            req.Name,
		Symbol:          req.Symbol,
		RuleType:        entities.RuleType(req.RuleType),
		Config:          req.Config,
		CooldownMinutes: cooldown,
		Enabled:         true,
	}

	if err := h.ruleRepo.Create(c.Context(), rule); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(201).JSON(rule)
}

func (h *AlertRuleHandler) List(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	rules, err := h.ruleRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if rules == nil {
		rules = []*entities.AlertRule{}
	}

	return c.JSON(fiber.Map{"rules": rules})
}

func (h *AlertRuleHandler) GetByID(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	rule, err := h.ruleRepo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if rule == nil || rule.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "rule not found"})
	}

	return c.JSON(rule)
}

func (h *AlertRuleHandler) Update(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	existing, err := h.ruleRepo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if existing == nil || existing.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "rule not found"})
	}

	var req UpdateAlertRuleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Symbol != "" {
		existing.Symbol = req.Symbol
	}
	if req.RuleType != "" && isValidRuleType(req.RuleType) {
		existing.RuleType = entities.RuleType(req.RuleType)
	}
	if req.Config != nil {
		existing.Config = req.Config
	}
	if req.CooldownMinutes != nil {
		existing.CooldownMinutes = *req.CooldownMinutes
	}
	if req.Enabled != nil {
		existing.Enabled = *req.Enabled
	}

	if err := h.ruleRepo.Update(c.Context(), existing); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.JSON(existing)
}

func (h *AlertRuleHandler) Delete(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	if err := h.ruleRepo.Delete(c.Context(), id, userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"deleted": true})
}

func (h *AlertRuleHandler) Toggle(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	rule, err := h.ruleRepo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if rule == nil || rule.UserID != userID {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "rule not found"})
	}

	newEnabled := !rule.Enabled
	if err := h.ruleRepo.SetEnabled(c.Context(), id, userID, newEnabled); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"id": id, "enabled": newEnabled})
}

func isValidRuleType(rt string) bool {
	switch entities.RuleType(rt) {
	case entities.RuleTypePriceChange, entities.RuleTypeMACross,
		entities.RuleTypePriceLevel, entities.RuleTypeVolatilitySpike:
		return true
	}
	return false
}
```

## File: internal/interfaces/http/handlers/auth_handler.go
```go
package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/auth"
)

type AuthHandler struct {
	userRepo         repositories.UserRepository
	refreshTokenRepo repositories.RefreshTokenRepository
	subscriptionRepo repositories.SubscriptionRepository
	jwtSecret        string
}

func NewAuthHandler(
	userRepo repositories.UserRepository,
	refreshTokenRepo repositories.RefreshTokenRepository,
	subscriptionRepo repositories.SubscriptionRepository,
	jwtSecret string,
) *AuthHandler {
	return &AuthHandler{
		userRepo:         userRepo,
		refreshTokenRepo: refreshTokenRepo,
		subscriptionRepo: subscriptionRepo,
		jwtSecret:        jwtSecret,
	}
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type RegisterResponse struct {
	UserID string `json:"user_id"`
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "email, password, and name are required"})
	}

	existingUser, err := h.userRepo.GetByEmail(c.Context(), req.Email)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if existingUser != nil {
		return c.Status(409).JSON(fiber.Map{"code": "EMAIL_EXISTS", "message": "email already exists"})
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	now := time.Now()
	user := &entities.User{
		ID:           uuid.New(),
		Email:        strings.ToLower(req.Email),
		PasswordHash: passwordHash,
		Name:         req.Name,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := h.userRepo.Create(c.Context(), user); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	subscription := &entities.Subscription{
		ID:               uuid.New(),
		UserID:           user.ID,
		Tier:             "free",
		AIQuotaRemaining: 20,
		AIQuotaLimit:     20,
		LastResetAt:      now,
		ExpiresAt:        nil,
	}

	if err := h.subscriptionRepo.Create(c.Context(), subscription); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(RegisterResponse{UserID: user.ID.String()})
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	user, err := h.userRepo.GetByEmail(c.Context(), strings.ToLower(req.Email))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if user == nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid credentials"})
	}

	if err := auth.ComparePassword(user.PasswordHash, req.Password); err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid credentials"})
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, h.jwtSecret)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	refreshToken, err := auth.GenerateRefreshToken()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	tokenHash := auth.HashRefreshToken(refreshToken)
	now := time.Now()
	refreshTokenEntity := &entities.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: now.Add(auth.RefreshTokenExpiry),
		CreatedAt: now,
	}

	if err := h.refreshTokenRepo.Create(c.Context(), refreshTokenEntity); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	})
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type RefreshResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	tokenHash := auth.HashRefreshToken(req.RefreshToken)

	token, err := h.refreshTokenRepo.GetByTokenHash(c.Context(), tokenHash)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if token == nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid token"})
	}

	if token.RevokedAt != nil || token.ReplacedBy != nil {
		if err := h.refreshTokenRepo.RevokeAllUserTokens(c.Context(), token.UserID, "reuse_detected"); err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "token reuse detected"})
	}

	if token.ExpiresAt.Before(time.Now()) {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "token expired"})
	}

	accessToken, err := auth.GenerateAccessToken(token.UserID, h.jwtSecret)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	newRefreshToken, err := auth.GenerateRefreshToken()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	newTokenHash := auth.HashRefreshToken(newRefreshToken)
	now := time.Now()
	newTokenID := uuid.New()
	newRefreshTokenEntity := &entities.RefreshToken{
		ID:        newTokenID,
		UserID:    token.UserID,
		TokenHash: newTokenHash,
		ExpiresAt: now.Add(auth.RefreshTokenExpiry),
		CreatedAt: now,
	}

	if err := h.refreshTokenRepo.Create(c.Context(), newRefreshTokenEntity); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	revokedAt := now
	token.RevokedAt = &revokedAt
	token.ReplacedBy = &newTokenID
	token.LastUsedAt = &now

	if err := h.refreshTokenRepo.Update(c.Context(), token); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(RefreshResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
	})
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type LogoutResponse struct {
	Message string `json:"message"`
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	var req LogoutRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	tokenHash := auth.HashRefreshToken(req.RefreshToken)

	token, err := h.refreshTokenRepo.GetByTokenHash(c.Context(), tokenHash)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if token == nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid token"})
	}

	now := time.Now()
	token.RevokedAt = &now

	if err := h.refreshTokenRepo.Update(c.Context(), token); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(LogoutResponse{Message: "logged out"})
}

func ExtractUserID(c *fiber.Ctx) (uuid.UUID, error) {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return uuid.Nil, fiber.NewError(401, "missing authorization header")
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return uuid.Nil, fiber.NewError(401, "invalid authorization header")
	}

	userID := c.Locals("userID")
	if userID == nil {
		return uuid.Nil, fiber.NewError(401, "user not authenticated")
	}

	return userID.(uuid.UUID), nil
}
```

## File: internal/interfaces/http/handlers/bubble_handler.go
```go
package handlers

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

var (
	bubbleSymbolPattern = regexp.MustCompile(`^[A-Z0-9]{3,12}$`)
	bubbleTagPattern    = regexp.MustCompile(`^[a-z0-9_-]+$`)
	allowedTimeframes   = map[string]struct{}{
		"1m":  {},
		"15m": {},
		"1h":  {},
		"4h":  {},
		"1d":  {},
	}
)

type BubbleHandler struct {
	bubbleRepo repositories.BubbleRepository
}

func NewBubbleHandler(bubbleRepo repositories.BubbleRepository) *BubbleHandler {
	return &BubbleHandler{bubbleRepo: bubbleRepo}
}

type CreateBubbleRequest struct {
	Symbol     string    `json:"symbol"`
	Timeframe  string    `json:"timeframe"`
	CandleTime time.Time `json:"candle_time"`
	Price      string    `json:"price"`
	AssetClass *string   `json:"asset_class,omitempty"`
	VenueName  *string   `json:"venue_name,omitempty"`
	Memo       *string   `json:"memo"`
	Tags       []string  `json:"tags"`
}

type UpdateBubbleRequest struct {
	Memo       *string  `json:"memo"`
	Tags       []string `json:"tags"`
	AssetClass *string  `json:"asset_class,omitempty"`
	VenueName  *string  `json:"venue_name,omitempty"`
}

type BubbleResponse struct {
	ID         uuid.UUID `json:"id"`
	Symbol     string    `json:"symbol"`
	Timeframe  string    `json:"timeframe"`
	CandleTime time.Time `json:"candle_time"`
	Price      string    `json:"price"`
	BubbleType string    `json:"bubble_type"`
	AssetClass *string   `json:"asset_class,omitempty"`
	VenueName  *string   `json:"venue_name,omitempty"`
	Memo       *string   `json:"memo,omitempty"`
	Tags       []string  `json:"tags,omitempty"`
}

type BubbleListResponse struct {
	Page  int              `json:"page"`
	Limit int              `json:"limit"`
	Total int              `json:"total"`
	Items []BubbleResponse `json:"items"`
}

func (h *BubbleHandler) Create(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req CreateBubbleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	symbol := strings.ToUpper(strings.TrimSpace(req.Symbol))
	if symbol == "" || !bubbleSymbolPattern.MatchString(symbol) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "symbol is invalid"})
	}

	timeframe := strings.ToLower(strings.TrimSpace(req.Timeframe))
	if _, ok := allowedTimeframes[timeframe]; !ok {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_TIMEFRAME", "message": "timeframe is invalid"})
	}

	if req.CandleTime.IsZero() {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "candle_time is required"})
	}

	if strings.TrimSpace(req.Price) == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "price is required"})
	}

	cleanTags, err := normalizeTags(req.Tags)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_TAGS", "message": err.Error()})
	}

	bubble := &entities.Bubble{
		ID:         uuid.New(),
		UserID:     userID,
		Symbol:     symbol,
		Timeframe:  timeframe,
		CandleTime: req.CandleTime.UTC(),
		Price:      strings.TrimSpace(req.Price),
		BubbleType: "manual",
		AssetClass: normalizeOptionalLabel(req.AssetClass, 32),
		VenueName:  normalizeOptionalLabel(req.VenueName, 64),
		Memo:       req.Memo,
		Tags:       cleanTags,
		CreatedAt:  time.Now().UTC(),
	}

	if err := h.bubbleRepo.Create(c.Context(), bubble); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(mapBubbleResponse(bubble))
}

func (h *BubbleHandler) List(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	symbol := strings.ToUpper(strings.TrimSpace(c.Query("symbol")))
	if symbol != "" && !bubbleSymbolPattern.MatchString(symbol) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "symbol is invalid"})
	}

	page, limit, err := parsePageLimit(c.Query("page"), c.Query("limit"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	var fromPtr *time.Time
	fromStr := strings.TrimSpace(c.Query("from"))
	if fromStr != "" {
		parsed, err := time.Parse(time.RFC3339, fromStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "from is invalid"})
		}
		parsed = parsed.UTC()
		fromPtr = &parsed
	}

	var toPtr *time.Time
	toStr := strings.TrimSpace(c.Query("to"))
	if toStr != "" {
		parsed, err := time.Parse(time.RFC3339, toStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "to is invalid"})
		}
		parsed = parsed.UTC()
		toPtr = &parsed
	}

	queryTags, err := normalizeTags(splitTags(c.Query("tags")))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_TAGS", "message": err.Error()})
	}

	sortOrder := strings.ToLower(strings.TrimSpace(c.Query("sort")))
	if sortOrder != "asc" {
		sortOrder = "desc"
	}

	filter := repositories.BubbleFilter{
		Symbol: symbol,
		Tags:   queryTags,
		From:   fromPtr,
		To:     toPtr,
		Limit:  limit,
		Offset: (page - 1) * limit,
		Sort:   sortOrder,
	}

	bubbles, total, err := h.bubbleRepo.List(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]BubbleResponse, 0, len(bubbles))
	for _, bubble := range bubbles {
		items = append(items, mapBubbleResponse(bubble))
	}

	return c.Status(200).JSON(BubbleListResponse{
		Page:  page,
		Limit: limit,
		Total: total,
		Items: items,
	})
}

func (h *BubbleHandler) GetByID(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if bubble == nil {
		return c.Status(404).JSON(fiber.Map{"code": "BUBBLE_NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}

	return c.Status(200).JSON(mapBubbleResponse(bubble))
}

func (h *BubbleHandler) Update(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	var req UpdateBubbleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if bubble == nil {
		return c.Status(404).JSON(fiber.Map{"code": "BUBBLE_NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}

	if req.Memo != nil {
		bubble.Memo = req.Memo
	}
	if req.Tags != nil {
		cleanTags, err := normalizeTags(req.Tags)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_TAGS", "message": err.Error()})
		}
		bubble.Tags = cleanTags
	}
	if req.AssetClass != nil {
		bubble.AssetClass = normalizeOptionalLabel(req.AssetClass, 32)
	}
	if req.VenueName != nil {
		bubble.VenueName = normalizeOptionalLabel(req.VenueName, 64)
	}

	if err := h.bubbleRepo.Update(c.Context(), bubble); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"updated": true})
}

func (h *BubbleHandler) Delete(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	deleted, err := h.bubbleRepo.DeleteByIDAndUser(c.Context(), bubbleID, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if !deleted {
		return c.Status(404).JSON(fiber.Map{"code": "BUBBLE_NOT_FOUND", "message": "bubble not found"})
	}

	return c.Status(200).JSON(fiber.Map{"deleted": true})
}

func mapBubbleResponse(bubble *entities.Bubble) BubbleResponse {
	return BubbleResponse{
		ID:         bubble.ID,
		Symbol:     bubble.Symbol,
		Timeframe:  bubble.Timeframe,
		CandleTime: bubble.CandleTime,
		Price:      bubble.Price,
		BubbleType: bubble.BubbleType,
		AssetClass: bubble.AssetClass,
		VenueName:  bubble.VenueName,
		Memo:       bubble.Memo,
		Tags:       bubble.Tags,
	}
}

func normalizeOptionalLabel(value *string, maxLen int) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	if len(trimmed) > maxLen {
		trimmed = trimmed[:maxLen]
	}
	normalized := strings.ToLower(trimmed)
	return &normalized
}

func normalizeTags(tags []string) ([]string, error) {
	if len(tags) == 0 {
		return []string{}, nil
	}
	if len(tags) > 5 {
		return nil, errors.New("tags cannot exceed 5")
	}

	seen := map[string]struct{}{}
	cleaned := make([]string, 0, len(tags))
	for _, tag := range tags {
		trimmed := strings.ToLower(strings.TrimSpace(tag))
		if trimmed == "" {
			continue
		}
		if len(trimmed) > 20 {
			return nil, errors.New("tag length must be <= 20")
		}
		if !bubbleTagPattern.MatchString(trimmed) {
			return nil, errors.New("tag contains invalid characters")
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		cleaned = append(cleaned, trimmed)
	}

	return cleaned, nil
}

func splitTags(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	return parts
}

func parsePageLimit(pageStr string, limitStr string) (int, int, error) {
	page := 1
	limit := 50
	if pageStr != "" {
		parsed, err := parsePositiveInt(pageStr)
		if err != nil {
			return 0, 0, err
		}
		page = parsed
	}
	if limitStr != "" {
		parsed, err := parsePositiveInt(limitStr)
		if err != nil {
			return 0, 0, err
		}
		if parsed > 200 {
			parsed = 200
		}
		limit = parsed
	}
	return page, limit, nil
}

func parsePositiveInt(value string) (int, error) {
	parsed := 0
	for _, ch := range value {
		if ch < '0' || ch > '9' {
			return 0, errors.New("invalid number")
		}
		parsed = parsed*10 + int(ch-'0')
	}
	if parsed <= 0 {
		return 0, errors.New("invalid number")
	}
	return parsed, nil
}
```

## File: internal/interfaces/http/handlers/connection_handler.go
```go
package handlers

import "github.com/gofiber/fiber/v2"

type ConnectionHandler struct{}

func NewConnectionHandler() *ConnectionHandler {
	return &ConnectionHandler{}
}

type ConnectionRequest struct {
	Venue         string `json:"venue"`
	VenueType     string `json:"venue_type"`
	Source        string `json:"source"`
	Label         string `json:"label"`
	APIKey        string `json:"api_key"`
	APISecret     string `json:"api_secret"`
	WalletAddress string `json:"wallet_address"`
}

// Create registers a connection (stub)
func (h *ConnectionHandler) Create(c *fiber.Ctx) error {
	if _, err := ExtractUserID(c); err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req ConnectionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	return c.Status(202).JSON(fiber.Map{
		"status":  "accepted",
		"venue":   req.Venue,
		"source":  req.Source,
		"label":   req.Label,
		"message": "connection registered (stub)",
	})
}
```

## File: internal/interfaces/http/handlers/exchange_handler.go
```go
package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	cryptoutil "github.com/moneyvessel/kifu/internal/infrastructure/crypto"
	"github.com/moneyvessel/kifu/internal/jobs"
)

const (
	binanceSapiBaseURL = "https://api.binance.com"
	upbitBaseURL       = "https://api.upbit.com"
	binanceFuturesID   = "binance_futures"
	binanceSpotID      = "binance_spot"
	upbitExchangeID    = "upbit"
)

type ExchangeHandler struct {
	exchangeRepo  repositories.ExchangeCredentialRepository
	tradeRepo     repositories.TradeRepository
	runRepo       repositories.RunRepository
	encryptionKey []byte
	client        *http.Client
	syncer        ExchangeSyncer
}

type ExchangeSyncer interface {
	SyncCredentialOnce(ctx context.Context, cred *entities.ExchangeCredential) error
}

type ExchangeSyncerWithOptions interface {
	SyncCredentialOnceWithOptions(ctx context.Context, cred *entities.ExchangeCredential, options jobs.SyncOptions) error
}

func NewExchangeHandler(
	exchangeRepo repositories.ExchangeCredentialRepository,
	tradeRepo repositories.TradeRepository,
	encryptionKey []byte,
	syncer ExchangeSyncer,
	runRepo repositories.RunRepository,
) *ExchangeHandler {
	return &ExchangeHandler{
		exchangeRepo:  exchangeRepo,
		tradeRepo:     tradeRepo,
		runRepo:       runRepo,
		encryptionKey: encryptionKey,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		syncer: syncer,
	}
}

type RegisterExchangeRequest struct {
	Exchange  string `json:"exchange"`
	APIKey    string `json:"api_key"`
	APISecret string `json:"api_secret"`
}

type ExchangeResponse struct {
	ID           uuid.UUID `json:"id"`
	Exchange     string    `json:"exchange"`
	APIKeyMasked string    `json:"api_key_masked"`
	IsValid      bool      `json:"is_valid"`
}

type ExchangeListResponse struct {
	Items []ExchangeListItem `json:"items"`
}

type ExchangeListItem struct {
	ID           uuid.UUID `json:"id"`
	Exchange     string    `json:"exchange"`
	APIKeyMasked string    `json:"api_key_masked"`
	IsValid      bool      `json:"is_valid"`
	CreatedAt    time.Time `json:"created_at"`
}

type ExchangeTestResponse struct {
	Success   bool    `json:"success"`
	Message   string  `json:"message"`
	ExpiresAt *string `json:"expires_at,omitempty"`
}

type ExchangeSyncResponse struct {
	Success       bool   `json:"success"`
	Message       string `json:"message"`
	Exchange      string `json:"exchange"`
	BeforeCount   int    `json:"before_count,omitempty"`
	AfterCount    int    `json:"after_count,omitempty"`
	InsertedCount int    `json:"inserted_count,omitempty"`
	RunID         string `json:"run_id,omitempty"`
}

type apiRestrictionsResponse struct {
	EnableReading              bool `json:"enableReading"`
	EnableSpotAndMarginTrading bool `json:"enableSpotAndMarginTrading"`
	EnableFutures              bool `json:"enableFutures"`
	EnableWithdrawals          bool `json:"enableWithdrawals"`
}

type upbitAPIKeyInfo struct {
	AccessKey string `json:"access_key"`
	ExpireAt  string `json:"expire_at"`
}

func (h *ExchangeHandler) Register(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req RegisterExchangeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	req.Exchange = strings.TrimSpace(req.Exchange)
	req.APIKey = strings.TrimSpace(req.APIKey)
	req.APISecret = strings.TrimSpace(req.APISecret)

	if req.Exchange == "" || req.APIKey == "" || req.APISecret == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "exchange, api_key, and api_secret are required"})
	}

	if req.Exchange != binanceFuturesID && req.Exchange != binanceSpotID && req.Exchange != upbitExchangeID {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_EXCHANGE", "message": "unsupported exchange"})
	}

	switch req.Exchange {
	case binanceFuturesID:
		allowed, err := h.checkBinancePermissions(c.Context(), req.APIKey, req.APISecret, true)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_CHECK_FAILED", "message": err.Error()})
		}
		if !allowed {
			return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "Binance Futures 권한(read + futures)이 필요합니다."})
		}
	case binanceSpotID:
		allowed, err := h.checkBinancePermissions(c.Context(), req.APIKey, req.APISecret, false)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_CHECK_FAILED", "message": err.Error()})
		}
		if !allowed {
			return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "Binance Spot 조회 권한(read)이 필요합니다."})
		}
	case upbitExchangeID:
		// Upbit keys can be scoped in many ways; do not hard-fail registration on accounts scope.
		expireAt, err := h.getUpbitKeyExpiry(c.Context(), req.APIKey, req.APISecret)
		if err == nil && expireAt != nil && expireAt.Before(time.Now().UTC()) {
			return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "Upbit API key is expired. Reissue the key and try again."})
		}
	}

	apiKeyEnc, err := cryptoutil.Encrypt(req.APIKey, h.encryptionKey)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	apiSecretEnc, err := cryptoutil.Encrypt(req.APISecret, h.encryptionKey)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	last4 := lastFour(req.APIKey)

	existing, err := h.exchangeRepo.GetByUserAndExchange(c.Context(), userID, req.Exchange)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if existing != nil {
		existing.APIKeyEnc = apiKeyEnc
		existing.APISecretEnc = apiSecretEnc
		existing.APIKeyLast4 = last4
		existing.IsValid = true

		if err := h.exchangeRepo.Update(c.Context(), existing); err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}

		return c.Status(200).JSON(ExchangeResponse{
			ID:           existing.ID,
			Exchange:     existing.Exchange,
			APIKeyMasked: maskKey(existing.APIKeyLast4),
			IsValid:      existing.IsValid,
		})
	}

	cred := &entities.ExchangeCredential{
		ID:           uuid.New(),
		UserID:       userID,
		Exchange:     req.Exchange,
		APIKeyEnc:    apiKeyEnc,
		APISecretEnc: apiSecretEnc,
		APIKeyLast4:  last4,
		IsValid:      true,
		CreatedAt:    time.Now(),
	}

	if err := h.exchangeRepo.Create(c.Context(), cred); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(ExchangeResponse{
		ID:           cred.ID,
		Exchange:     cred.Exchange,
		APIKeyMasked: maskKey(cred.APIKeyLast4),
		IsValid:      cred.IsValid,
	})
}

func (h *ExchangeHandler) List(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	creds, err := h.exchangeRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]ExchangeListItem, 0, len(creds))
	for _, cred := range creds {
		items = append(items, ExchangeListItem{
			ID:           cred.ID,
			Exchange:     cred.Exchange,
			APIKeyMasked: maskKey(cred.APIKeyLast4),
			IsValid:      cred.IsValid,
			CreatedAt:    cred.CreatedAt,
		})
	}

	return c.Status(200).JSON(ExchangeListResponse{Items: items})
}

func (h *ExchangeHandler) Delete(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	credID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	deleted, err := h.exchangeRepo.DeleteByIDAndUser(c.Context(), credID, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if !deleted {
		return c.Status(404).JSON(fiber.Map{"code": "EXCHANGE_NOT_FOUND", "message": "exchange credential not found"})
	}

	return c.Status(200).JSON(fiber.Map{"deleted": true})
}

func (h *ExchangeHandler) Test(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	credID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	cred, err := h.exchangeRepo.GetByID(c.Context(), credID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if cred == nil {
		return c.Status(404).JSON(fiber.Map{"code": "EXCHANGE_NOT_FOUND", "message": "exchange credential not found"})
	}
	if cred.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}

	apiKey, err := cryptoutil.Decrypt(cred.APIKeyEnc, h.encryptionKey)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	apiSecret, err := cryptoutil.Decrypt(cred.APISecretEnc, h.encryptionKey)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	switch cred.Exchange {
	case binanceFuturesID:
		allowed, err := h.checkBinancePermissions(c.Context(), apiKey, apiSecret, true)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_CHECK_FAILED", "message": err.Error()})
		}
		if !allowed {
			return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "Binance Futures 권한(read + futures)이 필요합니다."})
		}
	case binanceSpotID:
		allowed, err := h.checkBinancePermissions(c.Context(), apiKey, apiSecret, false)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_CHECK_FAILED", "message": err.Error()})
		}
		if !allowed {
			return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "Binance Spot 조회 권한(read)이 필요합니다."})
		}
	case upbitExchangeID:
		expireAt, err := h.getUpbitKeyExpiry(c.Context(), apiKey, apiSecret)
		if err == nil && expireAt != nil {
			if expireAt.Before(time.Now().UTC()) {
				return c.Status(400).JSON(fiber.Map{"code": "EXCHANGE_PERMISSION_DENIED", "message": "Upbit API key is expired. Reissue the key and try again."})
			}
			expiresAt := expireAt.Format(time.RFC3339)
			return c.Status(200).JSON(ExchangeTestResponse{
				Success:   true,
				Message:   "connection successful",
				ExpiresAt: &expiresAt,
			})
		}
		return c.Status(200).JSON(ExchangeTestResponse{
			Success: true,
			Message: "connection saved. trade history scope will be verified during sync.",
		})
	default:
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_EXCHANGE", "message": "unsupported exchange"})
	}

	return c.Status(200).JSON(ExchangeTestResponse{Success: true, Message: "connection successful"})
}

func (h *ExchangeHandler) Sync(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	if h.syncer == nil {
		return c.Status(501).JSON(fiber.Map{"code": "NOT_IMPLEMENTED", "message": "sync service is not available"})
	}

	credID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	cred, err := h.exchangeRepo.GetByID(c.Context(), credID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if cred == nil {
		return c.Status(404).JSON(fiber.Map{"code": "EXCHANGE_NOT_FOUND", "message": "exchange credential not found"})
	}
	if cred.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}
	if !cred.IsValid {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_EXCHANGE", "message": "exchange credential is invalid"})
	}

	runStartedAt := time.Now().UTC()
	runMeta := map[string]any{
		"run_type":   "exchange_sync",
		"exchange":   cred.Exchange,
		"started_by": cred.ID.String(),
	}

	run, err := h.runRepo.Create(c.Context(), userID, "exchange_sync", "running", runStartedAt, mustJSON(runMeta))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	beforeCount := h.exchangeTradeCount(c.Context(), userID, cred.Exchange)
	runMeta["before_count"] = beforeCount
	runMeta["history_days_requested"] = strings.TrimSpace(c.Query("history_days"))
	runMeta["full_backfill_requested"] = strings.EqualFold(strings.TrimSpace(c.Query("full_backfill")), "true")
	_ = h.runRepo.UpdateStatus(c.Context(), run.RunID, "running", nil, runMetaJSON(runMeta))

	fullBackfill := strings.EqualFold(strings.TrimSpace(c.Query("full_backfill")), "true")
	historyDays := 0
	if raw := strings.TrimSpace(c.Query("history_days")); raw != "" {
		parsed, parseErr := parsePositiveInt(raw)
		if parseErr != nil {
			runFinishedAt := time.Now().UTC()
			_ = h.runRepo.UpdateStatus(c.Context(), run.RunID, "failed", &runFinishedAt, runMetaJSON(map[string]any{
				"run_id":      run.RunID.String(),
				"error":       "invalid history_days",
				"http_status": 400,
			}))
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "history_days is invalid"})
		}
		historyDays = parsed
	}

	var syncErr error
	if fullBackfill {
		if advanced, ok := h.syncer.(ExchangeSyncerWithOptions); ok {
			syncErr = advanced.SyncCredentialOnceWithOptions(c.Context(), cred, jobs.SyncOptions{
				FullBackfill: true,
				HistoryDays:  historyDays,
			})
		} else {
			syncErr = h.syncer.SyncCredentialOnce(c.Context(), cred)
		}
	} else {
		syncErr = h.syncer.SyncCredentialOnce(c.Context(), cred)
	}

	if syncErr != nil {
		if syncErr == jobs.ErrUnsupportedExchange {
			runFinishedAt := time.Now().UTC()
			_ = h.runRepo.UpdateStatus(c.Context(), run.RunID, "failed", &runFinishedAt, runMetaJSON(map[string]any{
				"run_id":      run.RunID.String(),
				"exchange":    cred.Exchange,
				"error":       syncErr.Error(),
				"http_status": 400,
			}))
			return c.Status(400).JSON(fiber.Map{
				"code":    "UNSUPPORTED_SYNC",
				"message": "이 거래소는 자동 동기화가 아직 준비중입니다. CSV import를 사용해주세요.",
			})
		}
		runFinishedAt := time.Now().UTC()
		_ = h.runRepo.UpdateStatus(c.Context(), run.RunID, "failed", &runFinishedAt, runMetaJSON(map[string]any{
			"run_id":      run.RunID.String(),
			"exchange":    cred.Exchange,
			"error":       syncErr.Error(),
			"http_status": 502,
		}))
		return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_SYNC_FAILED", "message": syncErr.Error()})
	}

	afterCount := h.exchangeTradeCount(c.Context(), userID, cred.Exchange)
	inserted := afterCount - beforeCount
	if inserted < 0 {
		inserted = 0
	}
	runFinishedAt := time.Now().UTC()
	_ = h.runRepo.UpdateStatus(c.Context(), run.RunID, "completed", &runFinishedAt, runMetaJSON(map[string]any{
		"run_id":        run.RunID.String(),
		"exchange":      cred.Exchange,
		"before_count":  beforeCount,
		"after_count":   afterCount,
		"inserted_count": inserted,
		"http_status":   200,
	}))

	return c.Status(200).JSON(ExchangeSyncResponse{
		Success:       true,
		Message:       "sync completed",
		Exchange:      cred.Exchange,
		BeforeCount:   beforeCount,
		AfterCount:    afterCount,
		InsertedCount: inserted,
		RunID:         run.RunID.String(),
	})
}

func (h *ExchangeHandler) exchangeTradeCount(ctx context.Context, userID uuid.UUID, exchange string) int {
	if h.tradeRepo == nil {
		return 0
	}
	summary, err := h.tradeRepo.SummaryByExchange(ctx, userID, repositories.TradeFilter{Exchange: exchange})
	if err != nil {
		return 0
	}
	if len(summary) == 0 {
		return 0
	}
	if summary[0].TradeCount > 0 {
		return summary[0].TradeCount
	}
	return summary[0].TotalTrades
}

func (h *ExchangeHandler) checkBinancePermissions(ctx context.Context, apiKey string, apiSecret string, requireFutures bool) (bool, error) {
	params := url.Values{}
	params.Set("timestamp", fmt.Sprintf("%d", time.Now().UnixMilli()))
	params.Set("recvWindow", "5000")

	signature := signRequest(apiSecret, params)
	params.Set("signature", signature)

	requestURL := fmt.Sprintf("%s/sapi/v1/account/apiRestrictions?%s", binanceSapiBaseURL, params.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return false, err
	}
	req.Header.Set("X-MBX-APIKEY", apiKey)

	resp, err := h.client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return false, fmt.Errorf("permission check failed with status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var result apiRestrictionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, err
	}

	if !result.EnableReading {
		return false, nil
	}
	if requireFutures && !result.EnableFutures {
		return false, nil
	}

	return true, nil
}

func (h *ExchangeHandler) getUpbitKeyExpiry(ctx context.Context, apiKey string, apiSecret string) (*time.Time, error) {
	token, err := generateUpbitJWT(apiKey, apiSecret)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, upbitBaseURL+"/v1/api_keys", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("api key metadata check failed with status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var keys []upbitAPIKeyInfo
	if err := json.NewDecoder(resp.Body).Decode(&keys); err != nil {
		return nil, err
	}

	for _, info := range keys {
		if strings.TrimSpace(info.AccessKey) != strings.TrimSpace(apiKey) {
			continue
		}
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(info.ExpireAt))
		if err != nil {
			return nil, err
		}
		utc := parsed.UTC()
		return &utc, nil
	}

	return nil, nil
}

func generateUpbitJWT(apiKey string, apiSecret string) (string, error) {
	claims := jwt.MapClaims{
		"access_key": apiKey,
		"nonce":      uuid.NewString(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)
	return token.SignedString([]byte(apiSecret))
}

func signRequest(secret string, params url.Values) string {
	h := hmac.New(sha256.New, []byte(secret))
	_, _ = h.Write([]byte(params.Encode()))
	return hex.EncodeToString(h.Sum(nil))
}

func runMetaJSON(meta map[string]any) json.RawMessage {
	raw, err := json.Marshal(meta)
	if err != nil {
		return []byte("{}")
	}
	return raw
}
```

## File: internal/interfaces/http/handlers/export_handler.go
```go
package handlers

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type ExportHandler struct {
	bubbleRepo   repositories.BubbleRepository
	outcomeRepo  repositories.OutcomeRepository
	accuracyRepo repositories.AIOpinionAccuracyRepository
}

func NewExportHandler(
	bubbleRepo repositories.BubbleRepository,
	outcomeRepo repositories.OutcomeRepository,
	accuracyRepo repositories.AIOpinionAccuracyRepository,
) *ExportHandler {
	return &ExportHandler{
		bubbleRepo:   bubbleRepo,
		outcomeRepo:  outcomeRepo,
		accuracyRepo: accuracyRepo,
	}
}

// ExportStats exports review statistics as CSV
func (h *ExportHandler) ExportStats(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	period := c.Query("period", "30d")

	stats, err := h.bubbleRepo.GetReviewStats(c.Context(), userID, period, "", "", "", "")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Header
	writer.Write([]string{"Category", "Metric", "Value"})

	// Overall Stats
	writer.Write([]string{"Overall", "Total Bubbles", fmt.Sprintf("%d", stats.TotalBubbles)})
	writer.Write([]string{"Overall", "Bubbles with Outcome", fmt.Sprintf("%d", stats.BubblesWithOutcome)})
	writer.Write([]string{"Overall", "Win Rate", fmt.Sprintf("%.2f%%", stats.Overall.WinRate)})
	writer.Write([]string{"Overall", "Average PnL", stats.Overall.AvgPnL})
	writer.Write([]string{"Overall", "Total PnL", stats.Overall.TotalPnL})
	writer.Write([]string{"Overall", "Max Gain", stats.Overall.MaxGain})
	writer.Write([]string{"Overall", "Max Loss", stats.Overall.MaxLoss})

	// Period Stats
	for period, periodStats := range stats.ByPeriod {
		writer.Write([]string{fmt.Sprintf("Period %s", period), "Win Rate", fmt.Sprintf("%.2f%%", periodStats.WinRate)})
		writer.Write([]string{fmt.Sprintf("Period %s", period), "Average PnL", periodStats.AvgPnL})
		writer.Write([]string{fmt.Sprintf("Period %s", period), "Count", fmt.Sprintf("%d", periodStats.Count)})
	}

	// Tag Stats
	for tag, tagStats := range stats.ByTag {
		writer.Write([]string{fmt.Sprintf("Tag: %s", tag), "Count", fmt.Sprintf("%d", tagStats.Count)})
		writer.Write([]string{fmt.Sprintf("Tag: %s", tag), "Win Rate", fmt.Sprintf("%.2f%%", tagStats.WinRate)})
		writer.Write([]string{fmt.Sprintf("Tag: %s", tag), "Average PnL", tagStats.AvgPnL})
	}

	// Symbol Stats
	for symbol, symbolStats := range stats.BySymbol {
		writer.Write([]string{fmt.Sprintf("Symbol: %s", symbol), "Count", fmt.Sprintf("%d", symbolStats.Count)})
		writer.Write([]string{fmt.Sprintf("Symbol: %s", symbol), "Win Rate", fmt.Sprintf("%.2f%%", symbolStats.WinRate)})
		writer.Write([]string{fmt.Sprintf("Symbol: %s", symbol), "Average PnL", symbolStats.AvgPnL})
	}

	writer.Flush()

	filename := fmt.Sprintf("kifu_stats_%s.csv", time.Now().Format("2006-01-02"))
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Set("Content-Type", "text/csv")

	return c.Send(buf.Bytes())
}

// ExportAccuracy exports AI accuracy data as CSV
func (h *ExportHandler) ExportAccuracy(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	period := c.Query("period", "30d")
	outcomePeriod := c.Query("outcome_period", "1h")

	providerStats, err := h.accuracyRepo.GetProviderStats(c.Context(), userID, period, outcomePeriod, "", "")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Header
	writer.Write([]string{"Provider", "Total Predictions", "Correct Predictions", "Accuracy %", "BUY Predictions", "BUY Correct", "BUY Accuracy", "SELL Predictions", "SELL Correct", "SELL Accuracy"})

	for provider, stats := range providerStats {
		buyStats := stats.ByDirection["BUY"]
		sellStats := stats.ByDirection["SELL"]

		writer.Write([]string{
			provider,
			fmt.Sprintf("%d", stats.Total),
			fmt.Sprintf("%d", stats.Correct),
			fmt.Sprintf("%.2f", stats.Accuracy),
			fmt.Sprintf("%d", buyStats.Predicted),
			fmt.Sprintf("%d", buyStats.Correct),
			fmt.Sprintf("%.2f", buyStats.Accuracy),
			fmt.Sprintf("%d", sellStats.Predicted),
			fmt.Sprintf("%d", sellStats.Correct),
			fmt.Sprintf("%.2f", sellStats.Accuracy),
		})
	}

	writer.Flush()

	filename := fmt.Sprintf("kifu_ai_accuracy_%s.csv", time.Now().Format("2006-01-02"))
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Set("Content-Type", "text/csv")

	return c.Send(buf.Bytes())
}

// ExportBubbles exports bubble data as CSV
func (h *ExportHandler) ExportBubbles(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	bubbles, _, err := h.bubbleRepo.ListByUser(c.Context(), userID, 1000, 0)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Header
	writer.Write([]string{"ID", "Symbol", "Timeframe", "Candle Time", "Price", "Type", "Asset Class", "Venue", "Memo", "Tags", "Created At"})

	for _, bubble := range bubbles {
		tags := ""
		if len(bubble.Tags) > 0 {
			for i, t := range bubble.Tags {
				if i > 0 {
					tags += ", "
				}
				tags += t
			}
		}

		memo := ""
		if bubble.Memo != nil {
			memo = *bubble.Memo
		}

		writer.Write([]string{
			bubble.ID.String(),
			bubble.Symbol,
			bubble.Timeframe,
			bubble.CandleTime.Format("2006-01-02 15:04:05"),
			bubble.Price,
			bubble.BubbleType,
			safeCsvValue(bubble.AssetClass),
			safeCsvValue(bubble.VenueName),
			memo,
			tags,
			bubble.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	writer.Flush()

	filename := fmt.Sprintf("kifu_bubbles_%s.csv", time.Now().Format("2006-01-02"))
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Set("Content-Type", "text/csv")

	return c.Send(buf.Bytes())
}

func safeCsvValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
```

## File: internal/interfaces/http/handlers/guided_review_handler.go
```go
package handlers

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type GuidedReviewHandler struct {
	repo repositories.GuidedReviewRepository
}

func NewGuidedReviewHandler(repo repositories.GuidedReviewRepository) *GuidedReviewHandler {
	return &GuidedReviewHandler{repo: repo}
}

func (h *GuidedReviewHandler) GetToday(c *fiber.Ctx) error {
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

	var date string
	dateRaw := strings.TrimSpace(c.Query("date"))
	if dateRaw == "" {
		date = time.Now().In(location).Format("2006-01-02")
	} else {
		_, parseErr := time.ParseInLocation("2006-01-02", dateRaw, location)
		if parseErr != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "date must be YYYY-MM-DD"})
		}
		date = dateRaw
	}

	review, items, err := h.repo.GetOrCreateToday(c.Context(), userID, date)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{
		"review": review,
		"items":  items,
	})
}

type SubmitItemRequest struct {
	Intent       string   `json:"intent"`
	Emotions     []string `json:"emotions"`
	PatternMatch string   `json:"pattern_match"`
	Memo         string   `json:"memo"`
}

func (h *GuidedReviewHandler) SubmitItem(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	itemID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid item id"})
	}

	var req SubmitItemRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid json body"})
	}

	if req.Intent == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "intent is required"})
	}

	var emotionsJSON json.RawMessage
	if len(req.Emotions) > 0 {
		b, _ := json.Marshal(req.Emotions)
		emotionsJSON = b
	}

	input := repositories.SubmitItemInput{
		Intent:       req.Intent,
		Emotions:     emotionsJSON,
		PatternMatch: req.PatternMatch,
		Memo:         req.Memo,
	}

	if err := h.repo.SubmitItem(c.Context(), userID, itemID, input); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "item not found"})
		}
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"ok": true})
}

func (h *GuidedReviewHandler) CompleteReview(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	reviewID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid review id"})
	}

	streak, err := h.repo.CompleteReview(c.Context(), userID, reviewID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "review not found"})
		}
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{
		"ok":     true,
		"streak": streak,
	})
}

func (h *GuidedReviewHandler) GetStreak(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	streak, err := h.repo.GetStreak(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(streak)
}
```

## File: internal/interfaces/http/handlers/helpers.go
```go
package handlers

import "strconv"

func asString(value interface{}) (string, bool) {
	switch v := value.(type) {
	case string:
		return v, true
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64), true
	default:
		return "", false
	}
}

func asInt64(value interface{}) (int64, bool) {
	switch v := value.(type) {
	case float64:
		return int64(v), true
	case int64:
		return v, true
	case int:
		return int64(v), true
	default:
		return 0, false
	}
}

func maskKey(last4 string) string {
	if last4 == "" {
		return ""
	}
	return "****" + last4
}

func lastFour(value string) string {
	if len(value) <= 4 {
		return value
	}
	return value[len(value)-4:]
}
```

## File: internal/interfaces/http/handlers/import_handler.go
```go
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
```

## File: internal/interfaces/http/handlers/manual_position_handler.go
```go
package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type ManualPositionHandler struct {
	repo repositories.ManualPositionRepository
}

func NewManualPositionHandler(repo repositories.ManualPositionRepository) *ManualPositionHandler {
	return &ManualPositionHandler{repo: repo}
}

type ManualPositionRequest struct {
	Symbol       string  `json:"symbol"`
	AssetClass   string  `json:"asset_class"`
	Venue        *string `json:"venue,omitempty"`
	PositionSide string  `json:"position_side"`
	Size         *string `json:"size,omitempty"`
	EntryPrice   *string `json:"entry_price,omitempty"`
	StopLoss     *string `json:"stop_loss,omitempty"`
	TakeProfit   *string `json:"take_profit,omitempty"`
	Leverage     *string `json:"leverage,omitempty"`
	Strategy     *string `json:"strategy,omitempty"`
	Memo         *string `json:"memo,omitempty"`
	Status       string  `json:"status"`
	OpenedAt     *string `json:"opened_at,omitempty"`
	ClosedAt     *string `json:"closed_at,omitempty"`
}

type ManualPositionResponse struct {
	ID           string  `json:"id"`
	Symbol       string  `json:"symbol"`
	AssetClass   string  `json:"asset_class"`
	Venue        *string `json:"venue,omitempty"`
	PositionSide string  `json:"position_side"`
	Size         *string `json:"size,omitempty"`
	EntryPrice   *string `json:"entry_price,omitempty"`
	StopLoss     *string `json:"stop_loss,omitempty"`
	TakeProfit   *string `json:"take_profit,omitempty"`
	Leverage     *string `json:"leverage,omitempty"`
	Strategy     *string `json:"strategy,omitempty"`
	Memo         *string `json:"memo,omitempty"`
	Status       string  `json:"status"`
	OpenedAt     *string `json:"opened_at,omitempty"`
	ClosedAt     *string `json:"closed_at,omitempty"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

type ManualPositionsListResponse struct {
	Positions []ManualPositionResponse `json:"positions"`
}

func (h *ManualPositionHandler) List(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	status := strings.TrimSpace(strings.ToLower(c.Query("status")))
	filter := repositories.ManualPositionFilter{Status: status}
	positions, err := h.repo.List(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]ManualPositionResponse, 0, len(positions))
	for _, position := range positions {
		items = append(items, manualPositionToResponse(position))
	}

	return c.Status(200).JSON(ManualPositionsListResponse{Positions: items})
}

func (h *ManualPositionHandler) Create(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req ManualPositionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if strings.TrimSpace(req.Symbol) == "" || strings.TrimSpace(req.AssetClass) == "" || strings.TrimSpace(req.PositionSide) == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "symbol, asset_class, position_side are required"})
	}

	status := strings.TrimSpace(strings.ToLower(req.Status))
	if status == "" {
		status = "open"
	}

	openedAt, err := parseOptionalTime(req.OpenedAt)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "opened_at is invalid"})
	}
	closedAt, err := parseOptionalTime(req.ClosedAt)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "closed_at is invalid"})
	}
	if status == "closed" && closedAt == nil {
		now := time.Now().UTC()
		closedAt = &now
	}

	position := &entities.ManualPosition{
		UserID:       userID,
		Symbol:       strings.ToUpper(strings.TrimSpace(req.Symbol)),
		AssetClass:   strings.ToLower(strings.TrimSpace(req.AssetClass)),
		Venue:        normalizeOptionalString(req.Venue),
		PositionSide: strings.ToLower(strings.TrimSpace(req.PositionSide)),
		Size:         normalizeOptionalString(req.Size),
		EntryPrice:   normalizeOptionalString(req.EntryPrice),
		StopLoss:     normalizeOptionalString(req.StopLoss),
		TakeProfit:   normalizeOptionalString(req.TakeProfit),
		Leverage:     normalizeOptionalString(req.Leverage),
		Strategy:     normalizeOptionalString(req.Strategy),
		Memo:         normalizeOptionalString(req.Memo),
		Status:       status,
		OpenedAt:     openedAt,
		ClosedAt:     closedAt,
	}

	if err := h.repo.Create(c.Context(), position); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(201).JSON(manualPositionToResponse(position))
}

func (h *ManualPositionHandler) Update(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	var req ManualPositionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	position, err := h.repo.GetByID(c.Context(), id, userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "position not found"})
	}

	if strings.TrimSpace(req.Symbol) != "" {
		position.Symbol = strings.ToUpper(strings.TrimSpace(req.Symbol))
	}
	if strings.TrimSpace(req.AssetClass) != "" {
		position.AssetClass = strings.ToLower(strings.TrimSpace(req.AssetClass))
	}
	if strings.TrimSpace(req.PositionSide) != "" {
		position.PositionSide = strings.ToLower(strings.TrimSpace(req.PositionSide))
	}
	if req.Venue != nil {
		position.Venue = normalizeOptionalString(req.Venue)
	}
	if req.Size != nil {
		position.Size = normalizeOptionalString(req.Size)
	}
	if req.EntryPrice != nil {
		position.EntryPrice = normalizeOptionalString(req.EntryPrice)
	}
	if req.StopLoss != nil {
		position.StopLoss = normalizeOptionalString(req.StopLoss)
	}
	if req.TakeProfit != nil {
		position.TakeProfit = normalizeOptionalString(req.TakeProfit)
	}
	if req.Leverage != nil {
		position.Leverage = normalizeOptionalString(req.Leverage)
	}
	if req.Strategy != nil {
		position.Strategy = normalizeOptionalString(req.Strategy)
	}
	if req.Memo != nil {
		position.Memo = normalizeOptionalString(req.Memo)
	}
	if strings.TrimSpace(req.Status) != "" {
		position.Status = strings.ToLower(strings.TrimSpace(req.Status))
	}

	openedAt, err := parseOptionalTime(req.OpenedAt)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "opened_at is invalid"})
	}
	closedAt, err := parseOptionalTime(req.ClosedAt)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "closed_at is invalid"})
	}
	if req.OpenedAt != nil {
		position.OpenedAt = openedAt
	}
	if req.ClosedAt != nil {
		position.ClosedAt = closedAt
	}
	if position.Status == "closed" && position.ClosedAt == nil {
		now := time.Now().UTC()
		position.ClosedAt = &now
	}

	if err := h.repo.Update(c.Context(), position); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(manualPositionToResponse(position))
}

func (h *ManualPositionHandler) Delete(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	if err := h.repo.Delete(c.Context(), id, userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"deleted": true})
}

func manualPositionToResponse(position *entities.ManualPosition) ManualPositionResponse {
	return ManualPositionResponse{
		ID:           position.ID.String(),
		Symbol:       position.Symbol,
		AssetClass:   position.AssetClass,
		Venue:        position.Venue,
		PositionSide: position.PositionSide,
		Size:         position.Size,
		EntryPrice:   position.EntryPrice,
		StopLoss:     position.StopLoss,
		TakeProfit:   position.TakeProfit,
		Leverage:     position.Leverage,
		Strategy:     position.Strategy,
		Memo:         position.Memo,
		Status:       position.Status,
		OpenedAt:     formatOptionalTime(position.OpenedAt),
		ClosedAt:     formatOptionalTime(position.ClosedAt),
		CreatedAt:    position.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    position.UpdatedAt.Format(time.RFC3339),
	}
}

func parseOptionalTime(value *string) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func formatOptionalTime(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format(time.RFC3339)
	return &formatted
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
```

## File: internal/interfaces/http/handlers/market_handler.go
```go
package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

const (
	binanceFapiBaseURL = "https://fapi.binance.com"
	upbitCandleBaseURL = "https://api.upbit.com/v1/candles"
	defaultSymbol      = "BTCUSDT"
	defaultTimeframe   = "1h"
)

var (
	symbolPattern    = regexp.MustCompile(`^[A-Z0-9-]{3,20}$`)
	upbitSymbolPattern = regexp.MustCompile(`^[A-Z]{3,5}-[A-Z0-9]{1,12}$`)
	allowedIntervals = map[string]struct{}{
		"1m":  {},
		"15m": {},
		"1h":  {},
		"4h":  {},
		"1d":  {},
	}
)

type MarketHandler struct {
	userSymbolRepo repositories.UserSymbolRepository
	client         *http.Client
	cache          *klineCache
}

type klineCache struct {
	mu    sync.RWMutex
	items map[string]klineCacheEntry
}

type klineCacheEntry struct {
	expiresAt time.Time
	payload   []byte
}

func NewMarketHandler(userSymbolRepo repositories.UserSymbolRepository) *MarketHandler {
	return &MarketHandler{
		userSymbolRepo: userSymbolRepo,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		cache: &klineCache{
			items: make(map[string]klineCacheEntry),
		},
	}
}

type UserSymbolsResponse struct {
	Symbols []UserSymbolItem `json:"symbols"`
}

type UserSymbolItem struct {
	Symbol           string `json:"symbol"`
	TimeframeDefault string `json:"timeframe_default"`
}

type UpdateSymbolsRequest struct {
	Symbols []UserSymbolItem `json:"symbols"`
}

type KlineItem struct {
	Time   int64  `json:"time"`
	Open   string `json:"open"`
	High   string `json:"high"`
	Low    string `json:"low"`
	Close  string `json:"close"`
	Volume string `json:"volume"`
}

func (h *MarketHandler) GetUserSymbols(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	symbols, err := h.userSymbolRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	if len(symbols) == 0 {
		defaultEntry := &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           userID,
			Symbol:           defaultSymbol,
			TimeframeDefault: defaultTimeframe,
			CreatedAt:        time.Now(),
		}
		if err := h.userSymbolRepo.Create(c.Context(), defaultEntry); err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		symbols = []*entities.UserSymbol{defaultEntry}
	}

	response := UserSymbolsResponse{Symbols: make([]UserSymbolItem, 0, len(symbols))}
	for _, symbol := range symbols {
		response.Symbols = append(response.Symbols, UserSymbolItem{
			Symbol:           symbol.Symbol,
			TimeframeDefault: symbol.TimeframeDefault,
		})
	}

	return c.Status(200).JSON(response)
}

func (h *MarketHandler) UpdateUserSymbols(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req UpdateSymbolsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if len(req.Symbols) == 0 {
		req.Symbols = []UserSymbolItem{{Symbol: defaultSymbol, TimeframeDefault: defaultTimeframe}}
	}

	now := time.Now()
	entitiesList := make([]*entities.UserSymbol, 0, len(req.Symbols))
	response := UserSymbolsResponse{Symbols: make([]UserSymbolItem, 0, len(req.Symbols))}

	for _, item := range req.Symbols {
		symbol := strings.ToUpper(strings.TrimSpace(item.Symbol))
		timeframe := strings.ToLower(strings.TrimSpace(item.TimeframeDefault))

		if symbol == "" {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "symbol is required"})
		}
		if !symbolPattern.MatchString(symbol) {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "symbol format is invalid"})
		}
		if timeframe == "" {
			timeframe = defaultTimeframe
		}
		if _, ok := allowedIntervals[timeframe]; !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_TIMEFRAME", "message": "timeframe is invalid"})
		}

		entitiesList = append(entitiesList, &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           userID,
			Symbol:           symbol,
			TimeframeDefault: timeframe,
			CreatedAt:        now,
		})

		response.Symbols = append(response.Symbols, UserSymbolItem{
			Symbol:           symbol,
			TimeframeDefault: timeframe,
		})
	}

	if err := h.userSymbolRepo.ReplaceByUser(c.Context(), userID, entitiesList); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(response)
}

func (h *MarketHandler) GetKlines(c *fiber.Ctx) error {
	symbol := strings.ToUpper(strings.TrimSpace(c.Query("symbol")))
	interval := strings.ToLower(strings.TrimSpace(c.Query("interval")))
	exchange := strings.ToLower(strings.TrimSpace(c.Query("exchange")))
	limitStr := strings.TrimSpace(c.Query("limit"))

	if symbol == "" || !symbolPattern.MatchString(symbol) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "symbol is required"})
	}
	if _, ok := allowedIntervals[interval]; !ok {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_TIMEFRAME", "message": "interval is invalid"})
	}

	endTimeStr := strings.TrimSpace(c.Query("endTime"))

	limit := 500
	if limitStr != "" {
		parsed, err := strconv.Atoi(limitStr)
		if err != nil || parsed <= 0 {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "limit is invalid"})
		}
		if parsed > 1500 {
			parsed = 1500
		}
		limit = parsed
	}

	var endTime int64
	if endTimeStr != "" {
		parsed, err := strconv.ParseInt(endTimeStr, 10, 64)
		if err == nil {
			endTime = parsed
		}
	}

	cacheKey := fmt.Sprintf("%s|%s|%s|%d|%d", exchange, symbol, interval, limit, endTime)
	if payload, ok := h.cache.get(cacheKey); ok {
		c.Set("Content-Type", "application/json")
		return c.Status(200).Send(payload)
	}

	if exchange == "upbit" {
		if !upbitSymbolPattern.MatchString(symbol) {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "upbit symbol format is invalid"})
		}
		payload, err := fetchUpbitKlines(c.Context(), h.client, symbol, interval, limit, endTime)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_REQUEST_FAILED", "message": err.Error()})
		}
		h.cache.set(cacheKey, payload, 30*time.Second)
		c.Set("Content-Type", "application/json")
		return c.Status(200).Send(payload)
	}

	requestURL := buildKlinesURL(symbol, interval, limit, endTime)
	req, err := http.NewRequestWithContext(c.Context(), http.MethodGet, requestURL, nil)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_REQUEST_FAILED", "message": err.Error()})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_REQUEST_FAILED", "message": strings.TrimSpace(string(body))})
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return c.Status(502).JSON(fiber.Map{"code": "EXCHANGE_REQUEST_FAILED", "message": err.Error()})
	}

	items := make([]KlineItem, 0, len(raw))
	for _, row := range raw {
		if len(row) < 6 {
			continue
		}

		openTime, ok := asInt64(row[0])
		if !ok {
			continue
		}

		open, ok := asString(row[1])
		if !ok {
			continue
		}
		high, ok := asString(row[2])
		if !ok {
			continue
		}
		low, ok := asString(row[3])
		if !ok {
			continue
		}
		closeVal, ok := asString(row[4])
		if !ok {
			continue
		}
		volume, ok := asString(row[5])
		if !ok {
			continue
		}

		items = append(items, KlineItem{
			Time:   openTime / 1000,
			Open:   open,
			High:   high,
			Low:    low,
			Close:  closeVal,
			Volume: volume,
		})
	}

	payload, err := json.Marshal(items)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	h.cache.set(cacheKey, payload, 30*time.Second)
	c.Set("Content-Type", "application/json")
	return c.Status(200).Send(payload)
}

func buildKlinesURL(symbol string, interval string, limit int, endTime int64) string {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", interval)
	params.Set("limit", strconv.Itoa(limit))
	if endTime > 0 {
		// Binance FAPI Expects milliseconds
		// If our input is unix seconds (which app usually uses internally), convert?
		// Wait, standard for API is usually ms.
		// Let's assume input is ms since we usually deal with ms from frontend timestamps if raw.
		// But our KlineItem.Time is seconds.
		// Frontend sends what? Usually the time field is seconds.
		// Binance needs MS.
		params.Set("endTime", strconv.FormatInt(endTime, 10))
	}
	return fmt.Sprintf("%s/fapi/v1/klines?%s", binanceFapiBaseURL, params.Encode())
}

type upbitKlineItem struct {
	Timestamp    int64   `json:"timestamp"`
	OpenPrice    float64 `json:"opening_price"`
	HighPrice    float64 `json:"high_price"`
	LowPrice     float64 `json:"low_price"`
	ClosePrice   float64 `json:"trade_price"`
	AccVolume    float64 `json:"candle_acc_trade_volume"`
}

func upbitIntervalPath(interval string) (string, bool) {
	switch interval {
	case "1m":
		return "minutes/1", true
	case "15m":
		return "minutes/15", true
	case "1h":
		return "minutes/60", true
	case "4h":
		return "minutes/240", true
	case "1d":
		return "days", true
	default:
		return "", false
	}
}

func fetchUpbitKlines(ctx context.Context, client *http.Client, symbol string, interval string, limit int, endTime int64) ([]byte, error) {
	path, ok := upbitIntervalPath(interval)
	if !ok {
		return nil, fmt.Errorf("interval is invalid")
	}
	if limit > 200 {
		limit = 200
	}

	params := url.Values{}
	params.Set("market", symbol)
	params.Set("count", strconv.Itoa(limit))
	if endTime > 0 {
		params.Set("to", time.UnixMilli(endTime).UTC().Format(time.RFC3339))
	}

	requestURL := fmt.Sprintf("%s/%s?%s", upbitCandleBaseURL, path, params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("%s", strings.TrimSpace(string(body)))
	}

	var raw []upbitKlineItem
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	items := make([]KlineItem, 0, len(raw))
	for i := len(raw) - 1; i >= 0; i-- {
		row := raw[i]
		items = append(items, KlineItem{
			Time:   row.Timestamp / 1000,
			Open:   strconv.FormatFloat(row.OpenPrice, 'f', -1, 64),
			High:   strconv.FormatFloat(row.HighPrice, 'f', -1, 64),
			Low:    strconv.FormatFloat(row.LowPrice, 'f', -1, 64),
			Close:  strconv.FormatFloat(row.ClosePrice, 'f', -1, 64),
			Volume: strconv.FormatFloat(row.AccVolume, 'f', -1, 64),
		})
	}

	return json.Marshal(items)
}

func (c *klineCache) get(key string) ([]byte, bool) {
	c.mu.RLock()
	entry, ok := c.items[key]
	c.mu.RUnlock()
	if !ok {
		return nil, false
	}
	if time.Now().After(entry.expiresAt) {
		c.mu.Lock()
		delete(c.items, key)
		c.mu.Unlock()
		return nil, false
	}
	return entry.payload, true
}

func (c *klineCache) set(key string, payload []byte, ttl time.Duration) {
	c.mu.Lock()
	c.items[key] = klineCacheEntry{
		expiresAt: time.Now().Add(ttl),
		payload:   payload,
	}
	c.mu.Unlock()
}
```

## File: internal/interfaces/http/handlers/note_handler.go
```go
package handlers

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

const (
	aiReviewNoteTitle     = "AI 복기 요약"
	defaultAINoteKeepMax  = 200
	aiReviewNoteKeepEnv   = "AI_REVIEW_NOTES_KEEP"
)

type NoteHandler struct {
	noteRepo repositories.ReviewNoteRepository
}

func NewNoteHandler(noteRepo repositories.ReviewNoteRepository) *NoteHandler {
	return &NoteHandler{noteRepo: noteRepo}
}

type CreateNoteRequest struct {
	BubbleID      *string  `json:"bubble_id,omitempty"`
	Title         string   `json:"title"`
	Content       string   `json:"content"`
	Tags          []string `json:"tags,omitempty"`
	LessonLearned string   `json:"lesson_learned,omitempty"`
	Emotion       string   `json:"emotion,omitempty"`
}

type UpdateNoteRequest struct {
	BubbleID      *string  `json:"bubble_id,omitempty"`
	Title         string   `json:"title"`
	Content       string   `json:"content"`
	Tags          []string `json:"tags,omitempty"`
	LessonLearned string   `json:"lesson_learned,omitempty"`
	Emotion       string   `json:"emotion,omitempty"`
}

type NoteResponse struct {
	ID            string   `json:"id"`
	BubbleID      *string  `json:"bubble_id,omitempty"`
	Title         string   `json:"title"`
	Content       string   `json:"content"`
	Tags          []string `json:"tags,omitempty"`
	LessonLearned string   `json:"lesson_learned,omitempty"`
	Emotion       string   `json:"emotion,omitempty"`
	CreatedAt     string   `json:"created_at"`
	UpdatedAt     string   `json:"updated_at"`
}

type NotesListResponse struct {
	Notes      []NoteResponse `json:"notes"`
	Total      int            `json:"total"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
	TotalPages int            `json:"total_pages"`
}

func noteToResponse(note *entities.ReviewNote) NoteResponse {
	resp := NoteResponse{
		ID:            note.ID.String(),
		Title:         note.Title,
		Content:       note.Content,
		Tags:          note.Tags,
		LessonLearned: note.LessonLearned,
		Emotion:       string(note.Emotion),
		CreatedAt:     note.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:     note.UpdatedAt.UTC().Format(time.RFC3339),
	}
	if note.BubbleID != nil {
		bubbleStr := note.BubbleID.String()
		resp.BubbleID = &bubbleStr
	}
	return resp
}

// CreateNote creates a new review note
func (h *NoteHandler) CreateNote(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req CreateNoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.Title == "" || req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title and content are required"})
	}

	note := &entities.ReviewNote{
		UserID:        userID,
		Title:         req.Title,
		Content:       req.Content,
		Tags:          req.Tags,
		LessonLearned: req.LessonLearned,
		Emotion:       entities.Emotion(req.Emotion),
	}

	if req.BubbleID != nil && *req.BubbleID != "" {
		bubbleUUID, err := uuid.Parse(*req.BubbleID)
		if err == nil {
			note.BubbleID = &bubbleUUID
		}
	}

	if err := h.noteRepo.Create(c.Context(), note); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if shouldPruneAINote(req.Title) {
		keep := resolveAINoteKeepMax()
		if err := h.noteRepo.PruneAIGeneratedByUser(c.Context(), userID, keep); err != nil {
			log.Printf("note prune failed: user=%s keep=%d err=%v", userID.String(), keep, err)
		}
	}

	return c.Status(fiber.StatusCreated).JSON(noteToResponse(note))
}

// UpdateNote updates an existing review note
func (h *NoteHandler) UpdateNote(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	noteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid note id"})
	}

	var req UpdateNoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	note, err := h.noteRepo.GetByID(c.Context(), noteID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "note not found"})
	}

	note.Title = req.Title
	note.Content = req.Content
	note.Tags = req.Tags
	note.LessonLearned = req.LessonLearned
	note.Emotion = entities.Emotion(req.Emotion)

	if req.BubbleID != nil && *req.BubbleID != "" {
		bubbleUUID, err := uuid.Parse(*req.BubbleID)
		if err == nil {
			note.BubbleID = &bubbleUUID
		}
	} else {
		note.BubbleID = nil
	}

	if err := h.noteRepo.Update(c.Context(), note); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(noteToResponse(note))
}

// DeleteNote deletes a review note
func (h *NoteHandler) DeleteNote(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	noteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid note id"})
	}

	if err := h.noteRepo.Delete(c.Context(), noteID, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusNoContent).Send(nil)
}

// GetNote returns a single note
func (h *NoteHandler) GetNote(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	noteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid note id"})
	}

	note, err := h.noteRepo.GetByID(c.Context(), noteID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "note not found"})
	}

	return c.JSON(noteToResponse(note))
}

// ListNotes returns paginated list of notes
func (h *NoteHandler) ListNotes(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	notes, total, err := h.noteRepo.ListByUser(c.Context(), userID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	noteResponses := make([]NoteResponse, 0, len(notes))
	for _, note := range notes {
		noteResponses = append(noteResponses, noteToResponse(note))
	}

	totalPages := (total + limit - 1) / limit

	return c.JSON(NotesListResponse{
		Notes:      noteResponses,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	})
}

// ListNotesByBubble returns notes for a specific bubble
func (h *NoteHandler) ListNotesByBubble(c *fiber.Ctx) error {
	bubbleID, err := uuid.Parse(c.Params("bubbleId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid bubble id"})
	}

	notes, err := h.noteRepo.ListByBubble(c.Context(), bubbleID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	noteResponses := make([]NoteResponse, 0, len(notes))
	for _, note := range notes {
		noteResponses = append(noteResponses, noteToResponse(note))
	}

	return c.JSON(fiber.Map{"notes": noteResponses})
}

func shouldPruneAINote(title string) bool {
	return strings.TrimSpace(title) == aiReviewNoteTitle
}

func resolveAINoteKeepMax() int {
	raw := strings.TrimSpace(os.Getenv(aiReviewNoteKeepEnv))
	if raw == "" {
		return defaultAINoteKeepMax
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 1 {
		return defaultAINoteKeepMax
	}
	if value > 2000 {
		return 2000
	}
	return value
}
```

## File: internal/interfaces/http/handlers/notification_handler.go
```go
package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/notification"
)

type NotificationHandler struct {
	channelRepo    repositories.NotificationChannelRepository
	verifyRepo     repositories.TelegramVerifyCodeRepository
	tgSender       *notification.TelegramSender
	tgBotUsername  string
}

func NewNotificationHandler(
	channelRepo repositories.NotificationChannelRepository,
	verifyRepo repositories.TelegramVerifyCodeRepository,
	tgSender *notification.TelegramSender,
	tgBotUsername string,
) *NotificationHandler {
	return &NotificationHandler{
		channelRepo:   channelRepo,
		verifyRepo:    verifyRepo,
		tgSender:      tgSender,
		tgBotUsername: tgBotUsername,
	}
}

type TelegramConnectResponse struct {
	Code      string `json:"code"`
	ExpiresIn int    `json:"expires_in"`
	Message   string `json:"message"`
	BotURL    string `json:"bot_url,omitempty"`
}

type TelegramWebhookRequest struct {
	Message *struct {
		Chat struct {
			ID int64 `json:"id"`
		} `json:"chat"`
		Text string `json:"text"`
	} `json:"message"`
}

func (h *NotificationHandler) TelegramConnect(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	code := generateVerifyCode()
	verifyCode := &entities.TelegramVerifyCode{
		UserID:    userID,
		Code:      code,
		ExpiresAt: time.Now().UTC().Add(5 * time.Minute),
		Used:      false,
	}

	if err := h.verifyRepo.Create(c.Context(), verifyCode); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	resp := TelegramConnectResponse{
		Code:      code,
		ExpiresIn: 300,
		Message:   fmt.Sprintf("Telegram Bot에게 /start %s 를 보내세요", code),
	}
	if h.tgBotUsername != "" {
		resp.BotURL = fmt.Sprintf("https://t.me/%s?start=%s", h.tgBotUsername, code)
	}
	return c.JSON(resp)
}

func (h *NotificationHandler) TelegramWebhook(c *fiber.Ctx) error {
	var req TelegramWebhookRequest
	if err := c.BodyParser(&req); err != nil || req.Message == nil {
		return c.SendStatus(200)
	}

	text := req.Message.Text
	chatID := req.Message.Chat.ID

	// Parse /start {code}
	if len(text) < 8 || text[:7] != "/start " {
		if h.tgSender != nil {
			_ = h.tgSender.SendToChatID(c.Context(), chatID, "사용법: /start <인증코드>")
		}
		return c.SendStatus(200)
	}

	code := text[7:]
	verifyCode, err := h.verifyRepo.FindValidCode(c.Context(), code)
	if err != nil || verifyCode == nil {
		if h.tgSender != nil {
			_ = h.tgSender.SendToChatID(c.Context(), chatID, "유효하지 않거나 만료된 인증코드입니다.")
		}
		return c.SendStatus(200)
	}

	// Mark code as used
	if err := h.verifyRepo.MarkUsed(c.Context(), verifyCode.ID); err != nil {
		return c.SendStatus(200)
	}

	// Save notification channel
	configJSON, _ := json.Marshal(entities.TelegramConfig{ChatID: chatID})
	channel := &entities.NotificationChannel{
		ID:          uuid.New(),
		UserID:      verifyCode.UserID,
		ChannelType: entities.ChannelTelegram,
		Config:      configJSON,
		Enabled:     true,
		Verified:    true,
		CreatedAt:   time.Now().UTC(),
	}

	if err := h.channelRepo.Upsert(c.Context(), channel); err != nil {
		return c.SendStatus(200)
	}

	if h.tgSender != nil {
		_ = h.tgSender.SendToChatID(c.Context(), chatID, "kifu 알림이 연동되었습니다! 알림 규칙을 설정하면 여기로 알림이 옵니다.")
	}

	return c.SendStatus(200)
}

func (h *NotificationHandler) TelegramDisconnect(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	if err := h.channelRepo.DeleteByUserAndType(c.Context(), userID, entities.ChannelTelegram); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"disconnected": true})
}

func (h *NotificationHandler) ListChannels(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	channels, err := h.channelRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	type channelItem struct {
		Type     string `json:"type"`
		Enabled  bool   `json:"enabled"`
		Verified bool   `json:"verified"`
	}

	items := make([]channelItem, 0, len(channels))
	for _, ch := range channels {
		items = append(items, channelItem{
			Type:     string(ch.ChannelType),
			Enabled:  ch.Enabled,
			Verified: ch.Verified,
		})
	}

	return c.JSON(fiber.Map{"channels": items})
}

func generateVerifyCode() string {
	max := big.NewInt(999999)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "000000"
	}
	return fmt.Sprintf("%06d", n.Int64())
}
```

## File: internal/interfaces/http/handlers/outcome_handler.go
```go
package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type OutcomeHandler struct {
	bubbleRepo  repositories.BubbleRepository
	outcomeRepo repositories.OutcomeRepository
}

func NewOutcomeHandler(bubbleRepo repositories.BubbleRepository, outcomeRepo repositories.OutcomeRepository) *OutcomeHandler {
	return &OutcomeHandler{
		bubbleRepo:  bubbleRepo,
		outcomeRepo: outcomeRepo,
	}
}

type OutcomeResponse struct {
	Period         string  `json:"period"`
	ReferencePrice string  `json:"reference_price"`
	OutcomePrice   *string `json:"outcome_price"`
	PnLPercent     *string `json:"pnl_percent"`
}

func (h *OutcomeHandler) ListByBubble(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if bubble == nil {
		return c.Status(404).JSON(fiber.Map{"code": "BUBBLE_NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}

	outcomes, err := h.outcomeRepo.ListByBubble(c.Context(), bubbleID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	outcomeMap := map[string]*entities.Outcome{}
	for _, outcome := range outcomes {
		outcomeMap[outcome.Period] = outcome
	}

	periods := []string{"1h", "4h", "1d"}
	items := make([]OutcomeResponse, 0, len(periods))
	for _, period := range periods {
		if outcome, ok := outcomeMap[period]; ok {
			outcomePrice := outcome.OutcomePrice
			pnl := outcome.PnLPercent
			items = append(items, OutcomeResponse{
				Period:         period,
				ReferencePrice: bubble.Price,
				OutcomePrice:   &outcomePrice,
				PnLPercent:     &pnl,
			})
			continue
		}

		items = append(items, OutcomeResponse{
			Period:         period,
			ReferencePrice: bubble.Price,
			OutcomePrice:   nil,
			PnLPercent:     nil,
		})
	}

	return c.Status(200).JSON(fiber.Map{"outcomes": items})
}
```

## File: internal/interfaces/http/handlers/pack_handler.go
```go
package handlers

import (
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
	Range string `json:"range"`
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

	rangeValue := strings.TrimSpace(req.Range)
	if rangeValue == "" {
		rangeValue = "30d"
	}

	run, err := h.runRepo.GetLatestCompletedRun(c.Context(), userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(404).JSON(fiber.Map{"code": "NO_COMPLETED_RUN", "message": "completed sync/import run not found"})
		}
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if run == nil {
		return c.Status(404).JSON(fiber.Map{"code": "NO_COMPLETED_RUN", "message": "completed sync/import run not found"})
	}

	pack, _, err := h.summaryPackSvc.GeneratePack(c.Context(), userID, run, rangeValue)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "PACK_GENERATE_FAILED", "message": err.Error()})
	}

	if err := h.summaryPackRepo.Create(c.Context(), pack); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "PACK_SAVE_FAILED", "message": err.Error()})
	}

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
```

## File: internal/interfaces/http/handlers/portfolio_handler.go
```go
package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type PortfolioHandler struct {
	portfolioRepo repositories.PortfolioRepository
	tradeRepo     repositories.TradeRepository
}

func NewPortfolioHandler(portfolioRepo repositories.PortfolioRepository, tradeRepo repositories.TradeRepository) *PortfolioHandler {
	return &PortfolioHandler{
		portfolioRepo: portfolioRepo,
		tradeRepo:     tradeRepo,
	}
}

type TimelineItem struct {
	ID           string           `json:"id"`
	ExecutedAt   string           `json:"executed_at"`
	AssetClass   string           `json:"asset_class"`
	VenueType    string           `json:"venue_type"`
	Venue        string           `json:"venue"`
	VenueName    string           `json:"venue_name"`
	AccountLabel *string          `json:"account_label,omitempty"`
	Instrument   string           `json:"instrument"`
	EventType    string           `json:"event_type"`
	Side         *string          `json:"side,omitempty"`
	Qty          *string          `json:"qty,omitempty"`
	Price        *string          `json:"price,omitempty"`
	Fee          *string          `json:"fee,omitempty"`
	FeeAsset     *string          `json:"fee_asset,omitempty"`
	Source       string           `json:"source"`
	ExternalID   *string          `json:"external_id,omitempty"`
	Metadata     *json.RawMessage `json:"metadata,omitempty"`
}

type PositionItem struct {
	Key            string  `json:"key"`
	Instrument     string  `json:"instrument"`
	Venue          string  `json:"venue"`
	VenueName      string  `json:"venue_name"`
	AccountLabel   *string `json:"account_label,omitempty"`
	AssetClass     string  `json:"asset_class"`
	VenueType      string  `json:"venue_type"`
	Status         string  `json:"status"`
	NetQty         string  `json:"net_qty"`
	AvgEntry       string  `json:"avg_entry"`
	BuyQty         string  `json:"buy_qty"`
	SellQty        string  `json:"sell_qty"`
	BuyNotional    string  `json:"buy_notional"`
	SellNotional   string  `json:"sell_notional"`
	LastExecutedAt string  `json:"last_executed_at"`
}

// Timeline returns unified timeline events
func (h *PortfolioHandler) Timeline(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	limit := 50
	if limitStr := strings.TrimSpace(c.Query("limit")); limitStr != "" {
		parsed, err := parsePositiveInt(limitStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "limit is invalid"})
		}
		if parsed > 200 {
			parsed = 200
		}
		limit = parsed
	}

	var fromPtr *time.Time
	fromStr := strings.TrimSpace(c.Query("from"))
	if fromStr != "" {
		parsed, ok := parseTime(fromStr)
		if !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "from is invalid"})
		}
		fromPtr = &parsed
	}

	var toPtr *time.Time
	toStr := strings.TrimSpace(c.Query("to"))
	if toStr != "" {
		parsed, ok := parseTime(toStr)
		if !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "to is invalid"})
		}
		toPtr = &parsed
	}

	cursorStr := strings.TrimSpace(c.Query("cursor"))
	var cursor *repositories.TimelineCursor
	if cursorStr != "" {
		decoded, err := decodeCursor(cursorStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "cursor is invalid"})
		}
		cursor = decoded
	}

	filter := repositories.TimelineFilter{
		From:         fromPtr,
		To:           toPtr,
		AssetClasses: splitListQuery(c.Query("asset_class")),
		Venues:       splitListQuery(c.Query("venue")),
		Sources:      splitListQuery(c.Query("source")),
		EventTypes:   splitListQuery(c.Query("event_type")),
		Limit:        limit,
		Cursor:       cursor,
	}

	events, err := h.portfolioRepo.ListTimeline(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]TimelineItem, 0, len(events))
	for _, event := range events {
		items = append(items, TimelineItem{
			ID:           event.ID.String(),
			ExecutedAt:   event.ExecutedAt.Format(time.RFC3339),
			AssetClass:   event.AssetClass,
			VenueType:    event.VenueType,
			Venue:        event.VenueCode,
			VenueName:    event.VenueName,
			AccountLabel: event.AccountLabel,
			Instrument:   event.Instrument,
			EventType:    event.EventType,
			Side:         event.Side,
			Qty:          event.Qty,
			Price:        event.Price,
			Fee:          event.Fee,
			FeeAsset:     event.FeeAsset,
			Source:       event.Source,
			ExternalID:   event.ExternalID,
			Metadata:     event.Metadata,
		})
	}

	var nextCursor *string
	if len(events) == limit {
		last := events[len(events)-1]
		encoded := encodeCursor(last.ExecutedAt, last.ID)
		nextCursor = &encoded
	}

	return c.Status(200).JSON(fiber.Map{
		"items":       items,
		"next_cursor": nextCursor,
	})
}

// Positions returns position summaries (stub)
func (h *PortfolioHandler) Positions(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	limit := 50
	if limitStr := strings.TrimSpace(c.Query("limit")); limitStr != "" {
		parsed, err := parsePositiveInt(limitStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "limit is invalid"})
		}
		if parsed > 200 {
			parsed = 200
		}
		limit = parsed
	}

	status := strings.ToLower(strings.TrimSpace(c.Query("status")))
	if status != "" && status != "open" && status != "closed" && status != "all" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "status must be open, closed, or all"})
	}

	var fromPtr *time.Time
	fromStr := strings.TrimSpace(c.Query("from"))
	if fromStr != "" {
		parsed, ok := parseTime(fromStr)
		if !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "from is invalid"})
		}
		fromPtr = &parsed
	}

	var toPtr *time.Time
	toStr := strings.TrimSpace(c.Query("to"))
	if toStr != "" {
		parsed, ok := parseTime(toStr)
		if !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "to is invalid"})
		}
		toPtr = &parsed
	}

	filter := repositories.PositionFilter{
		From:         fromPtr,
		To:           toPtr,
		AssetClasses: splitListQuery(c.Query("asset_class")),
		Venues:       splitListQuery(c.Query("venue")),
		Status:       status,
		Limit:        limit,
	}

	positions, err := h.portfolioRepo.ListPositions(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]PositionItem, 0, len(positions))
	for _, position := range positions {
		key := position.VenueCode + "|" + position.Instrument + "|" + position.AssetClass
		items = append(items, PositionItem{
			Key:            key,
			Instrument:     position.Instrument,
			Venue:          position.VenueCode,
			VenueName:      position.VenueName,
			AccountLabel:   position.AccountLabel,
			AssetClass:     position.AssetClass,
			VenueType:      position.VenueType,
			Status:         position.Status,
			NetQty:         position.NetQty,
			AvgEntry:       position.AvgEntry,
			BuyQty:         position.BuyQty,
			SellQty:        position.SellQty,
			BuyNotional:    position.BuyNotional,
			SellNotional:   position.SellNotional,
			LastExecutedAt: position.LastExecutedAt.Format(time.RFC3339),
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"positions": items,
		"count":     len(items),
	})
}

// BackfillEventsFromTrades creates trade_events from trades table (API syncs)
func (h *PortfolioHandler) BackfillEventsFromTrades(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	limit := 1000
	if limitStr := strings.TrimSpace(c.Query("limit")); limitStr != "" {
		parsed, err := parsePositiveInt(limitStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "limit is invalid"})
		}
		if parsed > 5000 {
			parsed = 5000
		}
		limit = parsed
	}

	processed := 0
	created := 0
	skipped := 0
	page := 1

	for {
		filter := repositories.TradeFilter{
			Limit:  limit,
			Offset: (page - 1) * limit,
			Sort:   "asc",
		}
		trades, _, err := h.tradeRepo.List(c.Context(), userID, filter)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		if len(trades) == 0 {
			break
		}

		for _, trade := range trades {
			event, err := h.buildEventFromTrade(c.Context(), userID, trade)
			if err != nil {
				skipped += 1
				continue
			}
			if err := h.portfolioRepo.CreateTradeEvent(c.Context(), event); err != nil {
				if isUniqueViolationError(err) {
					skipped += 1
					continue
				}
				return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
			}
			created += 1
		}

		processed += len(trades)
		if len(trades) < limit {
			break
		}
		page += 1
	}

	positionsRefreshed := false
	var positionRefreshError string
	if created > 0 {
		if err := h.portfolioRepo.RebuildPositions(c.Context(), userID); err != nil {
			positionRefreshError = err.Error()
		} else {
			positionsRefreshed = true
		}
	}

	return c.Status(200).JSON(fiber.Map{
		"processed":               processed,
		"created":                 created,
		"skipped":                 skipped,
		"positions_refreshed":     positionsRefreshed,
		"positions_refresh_error": positionRefreshError,
	})
}

func (h *PortfolioHandler) buildEventFromTrade(ctx context.Context, userID uuid.UUID, trade *entities.Trade) (*entities.TradeEvent, error) {
	if trade == nil {
		return nil, fmt.Errorf("trade is nil")
	}
	symbol := strings.ToUpper(strings.TrimSpace(trade.Symbol))
	if symbol == "" {
		return nil, fmt.Errorf("symbol is empty")
	}

	venueCode, venueType, venueName := resolveVenueFromExchange(trade.Exchange)
	venueID, err := h.portfolioRepo.UpsertVenue(ctx, venueCode, venueType, venueName, "")
	if err != nil {
		return nil, err
	}

	base, quote, normalizedSymbol := parseInstrumentSymbol(symbol, venueCode)
	instrumentID, err := h.portfolioRepo.UpsertInstrument(ctx, "crypto", base, quote, normalizedSymbol)
	if err != nil {
		return nil, err
	}
	_ = h.portfolioRepo.UpsertInstrumentMapping(ctx, instrumentID, venueID, symbol)

	accountID, err := h.portfolioRepo.UpsertAccount(ctx, userID, venueID, "api-sync", nil, "api")
	if err != nil {
		return nil, err
	}

	side := strings.ToLower(strings.TrimSpace(trade.Side))
	if side == "" {
		side = "buy"
	}
	qty := normalizeOptionalLiteral(trade.Quantity)
	price := normalizeOptionalLiteral(trade.Price)

	externalID := ""
	if trade.BinanceTradeID != 0 {
		externalID = fmt.Sprintf("%d", trade.BinanceTradeID)
	} else {
		externalID = trade.ID.String()
	}

	eventType := resolveEventType(trade.Exchange)
	eventRecord := &portfolioTradeEventRecord{
		Symbol:     normalizedSymbol,
		EventType:  eventType,
		Side:       &side,
		Qty:        qty,
		Price:      price,
		ExecutedAt: trade.TradeTime,
		ExternalID: &externalID,
	}

	dedupe := buildTradeEventDedupeKey(venueCode, "crypto", eventRecord)
	metadata := map[string]string{
		"trade_id": trade.ID.String(),
		"exchange": trade.Exchange,
	}
	metadataRaw, _ := json.Marshal(metadata)
	raw := json.RawMessage(metadataRaw)

	return &entities.TradeEvent{
		ID:           uuid.New(),
		UserID:       userID,
		AccountID:    &accountID,
		VenueID:      &venueID,
		InstrumentID: &instrumentID,
		AssetClass:   "crypto",
		VenueType:    venueType,
		EventType:    eventType,
		Side:         &side,
		Qty:          qty,
		Price:        price,
		ExecutedAt:   trade.TradeTime,
		Source:       "api",
		ExternalID:   &externalID,
		Metadata:     &raw,
		DedupeKey:    &dedupe,
	}, nil
}

// BackfillBubbles creates auto bubbles from trade events (stocks/DEX included)
func (h *PortfolioHandler) BackfillBubbles(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	updated, err := h.portfolioRepo.BackfillBubblesFromEvents(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"created": updated})
}

// Instruments returns normalized instruments (stub)
func (h *PortfolioHandler) Instruments(c *fiber.Ctx) error {
	if _, err := ExtractUserID(c); err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	return c.Status(200).JSON(fiber.Map{
		"items": []fiber.Map{},
	})
}

func splitListQuery(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.ToLower(strings.TrimSpace(part))
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func encodeCursor(timeValue time.Time, id uuid.UUID) string {
	payload := timeValue.UTC().Format(time.RFC3339Nano) + "|" + id.String()
	return base64.RawURLEncoding.EncodeToString([]byte(payload))
}

func decodeCursor(raw string) (*repositories.TimelineCursor, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return nil, err
	}
	parts := strings.SplitN(string(decoded), "|", 2)
	if len(parts) != 2 {
		return nil, errors.New("invalid cursor format")
	}
	parsedTime, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return nil, err
	}
	parsedID, err := uuid.Parse(parts[1])
	if err != nil {
		return nil, err
	}
	return &repositories.TimelineCursor{Time: parsedTime, ID: parsedID}, nil
}

type portfolioTradeEventRecord struct {
	Symbol     string
	EventType  string
	Side       *string
	Qty        *string
	Price      *string
	Fee        *string
	FeeAsset   *string
	ExecutedAt time.Time
	ExternalID *string
}

func resolveVenueFromExchange(exchange string) (code string, venueType string, displayName string) {
	normalized := strings.ToLower(strings.TrimSpace(exchange))
	if normalized == "" {
		return "unknown", "cex", "Unknown"
	}
	switch normalized {
	case "binance_futures":
		return normalized, "cex", "Binance Futures"
	case "binance_spot":
		return normalized, "cex", "Binance Spot"
	case "upbit":
		return normalized, "cex", "Upbit"
	default:
		return normalized, "cex", titleizeVenue(normalized)
	}
}

func titleizeVenue(value string) string {
	parts := strings.Split(value, "_")
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
	}
	return strings.Join(parts, " ")
}

func parseInstrumentSymbol(symbol string, venueCode string) (base string, quote string, normalized string) {
	normalized = strings.ToUpper(strings.TrimSpace(symbol))
	if normalized == "" {
		return "UNKNOWN", portfolioDefaultQuoteForVenue(venueCode), "UNKNOWN"
	}
	if strings.Contains(normalized, "-") {
		parts := strings.Split(normalized, "-")
		if len(parts) == 2 {
			quote = parts[0]
			base = parts[1]
			normalized = base + quote
			return base, quote, normalized
		}
	}

	quotes := []string{"USDT", "USDC", "USD", "KRW", "BTC", "ETH"}
	for _, q := range quotes {
		if strings.HasSuffix(normalized, q) && len(normalized) > len(q) {
			base = strings.TrimSuffix(normalized, q)
			quote = q
			return base, quote, normalized
		}
	}

	quote = portfolioDefaultQuoteForVenue(venueCode)
	base = normalized
	return base, quote, normalized
}

func portfolioDefaultQuoteForVenue(venue string) string {
	switch venue {
	case "upbit", "bithumb", "kis":
		return "KRW"
	default:
		return "USDT"
	}
}

func resolveEventType(exchange string) string {
	value := strings.ToLower(strings.TrimSpace(exchange))
	if strings.Contains(value, "futures") || strings.Contains(value, "perp") {
		return "perp_trade"
	}
	return "spot_trade"
}

func buildTradeEventDedupeKey(venue string, assetClass string, record *portfolioTradeEventRecord) string {
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

func isUniqueViolationError(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func normalizeOptionalLiteral(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
```

## File: internal/interfaces/http/handlers/review_handler.go
```go
package handlers

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type ReviewHandler struct {
	bubbleRepo   repositories.BubbleRepository
	outcomeRepo  repositories.OutcomeRepository
	accuracyRepo repositories.AIOpinionAccuracyRepository
}

func NewReviewHandler(
	bubbleRepo repositories.BubbleRepository,
	outcomeRepo repositories.OutcomeRepository,
	accuracyRepo repositories.AIOpinionAccuracyRepository,
) *ReviewHandler {
	return &ReviewHandler{
		bubbleRepo:   bubbleRepo,
		outcomeRepo:  outcomeRepo,
		accuracyRepo: accuracyRepo,
	}
}

type ReviewStatsResponse struct {
	Period             string                 `json:"period"`
	TotalBubbles       int                    `json:"total_bubbles"`
	BubblesWithOutcome int                    `json:"bubbles_with_outcome"`
	Overall            OverallStats           `json:"overall"`
	ByPeriod           map[string]PeriodStats `json:"by_period"`
	ByTag              map[string]TagStats    `json:"by_tag"`
	BySymbol           map[string]SymbolStats `json:"by_symbol"`
}

type OverallStats struct {
	WinRate  float64 `json:"win_rate"`
	AvgPnL   string  `json:"avg_pnl"`
	TotalPnL string  `json:"total_pnl"`
	MaxGain  string  `json:"max_gain"`
	MaxLoss  string  `json:"max_loss"`
}

type PeriodStats struct {
	WinRate float64 `json:"win_rate"`
	AvgPnL  string  `json:"avg_pnl"`
	Count   int     `json:"count"`
}

type TagStats struct {
	Count   int     `json:"count"`
	WinRate float64 `json:"win_rate"`
	AvgPnL  string  `json:"avg_pnl"`
}

type SymbolStats struct {
	Count   int     `json:"count"`
	WinRate float64 `json:"win_rate"`
	AvgPnL  string  `json:"avg_pnl"`
}

// GetStats returns review statistics
func (h *ReviewHandler) GetStats(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	period := c.Query("period", "30d")
	symbol := c.Query("symbol", "")
	tag := c.Query("tag", "")
	assetClass := strings.ToLower(strings.TrimSpace(c.Query("asset_class", "")))
	venueName := strings.ToLower(strings.TrimSpace(c.Query("venue", "")))

	stats, err := h.bubbleRepo.GetReviewStats(c.Context(), userID, period, symbol, tag, assetClass, venueName)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(stats)
}

type AccuracyResponse struct {
	Period            string                                         `json:"period"`
	OutcomePeriod     string                                         `json:"outcome_period"`
	TotalOpinions     int                                            `json:"total_opinions"`
	EvaluatedOpinions int                                            `json:"evaluated_opinions"`
	ByProvider        map[string]*repositories.ProviderAccuracyStats `json:"by_provider"`
	Ranking           []ProviderRanking                              `json:"ranking"`
}

type ProviderRanking struct {
	Provider string  `json:"provider"`
	Accuracy float64 `json:"accuracy"`
	Rank     int     `json:"rank"`
}

// GetAccuracy returns AI provider accuracy statistics
func (h *ReviewHandler) GetAccuracy(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	period := c.Query("period", "30d")
	outcomePeriod := c.Query("outcome_period", "1h")
	assetClass := strings.ToLower(strings.TrimSpace(c.Query("asset_class", "")))
	venueName := strings.ToLower(strings.TrimSpace(c.Query("venue", "")))

	// Get provider stats
	byProvider, err := h.accuracyRepo.GetProviderStats(c.Context(), userID, period, outcomePeriod, assetClass, venueName)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Get total stats
	totalOpinions, evaluatedOpinions, err := h.accuracyRepo.GetTotalStats(c.Context(), userID, period, outcomePeriod, assetClass, venueName)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Build ranking
	ranking := buildProviderRanking(byProvider)

	response := AccuracyResponse{
		Period:            period,
		OutcomePeriod:     outcomePeriod,
		TotalOpinions:     totalOpinions,
		EvaluatedOpinions: evaluatedOpinions,
		ByProvider:        byProvider,
		Ranking:           ranking,
	}

	return c.JSON(response)
}

func buildProviderRanking(byProvider map[string]*repositories.ProviderAccuracyStats) []ProviderRanking {
	ranking := make([]ProviderRanking, 0, len(byProvider))
	for provider, stats := range byProvider {
		ranking = append(ranking, ProviderRanking{
			Provider: provider,
			Accuracy: stats.Accuracy,
		})
	}

	// Sort by accuracy descending
	sort.Slice(ranking, func(i, j int) bool {
		return ranking[i].Accuracy > ranking[j].Accuracy
	})

	// Assign ranks
	for i := range ranking {
		ranking[i].Rank = i + 1
	}

	return ranking
}

type CalendarResponse struct {
	From string                              `json:"from"`
	To   string                              `json:"to"`
	Days map[string]repositories.CalendarDay `json:"days"`
}

// GetCalendar returns calendar view data
func (h *ReviewHandler) GetCalendar(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	fromStr := c.Query("from", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	toStr := c.Query("to", time.Now().Format("2006-01-02"))
	assetClass := strings.ToLower(strings.TrimSpace(c.Query("asset_class", "")))
	venueName := strings.ToLower(strings.TrimSpace(c.Query("venue", "")))

	from, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid from date"})
	}
	to, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid to date"})
	}

	calendarData, err := h.bubbleRepo.GetCalendarData(c.Context(), userID, from, to, assetClass, venueName)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(CalendarResponse{
		From: fromStr,
		To:   toStr,
		Days: calendarData,
	})
}

type BubbleAccuracyResponse struct {
	BubbleID   uuid.UUID            `json:"bubble_id"`
	Accuracies []BubbleAccuracyItem `json:"accuracies"`
}

type BubbleAccuracyItem struct {
	OpinionID          uuid.UUID          `json:"opinion_id"`
	Provider           string             `json:"provider"`
	Period             string             `json:"period"`
	PredictedDirection entities.Direction `json:"predicted_direction"`
	ActualDirection    entities.Direction `json:"actual_direction"`
	IsCorrect          bool               `json:"is_correct"`
	PnLPercent         string             `json:"pnl_percent,omitempty"`
}

// GetBubbleAccuracy returns AI accuracy for a specific bubble
func (h *ReviewHandler) GetBubbleAccuracy(c *fiber.Ctx) error {
	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid bubble id"})
	}

	accuracies, err := h.accuracyRepo.GetByBubbleID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Get outcomes for PnL info
	outcomes, err := h.outcomeRepo.ListByBubble(c.Context(), bubbleID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	outcomeMap := make(map[string]string) // period -> pnl_percent
	for _, o := range outcomes {
		outcomeMap[o.Period] = o.PnLPercent
	}

	items := make([]BubbleAccuracyItem, 0, len(accuracies))
	for _, acc := range accuracies {
		item := BubbleAccuracyItem{
			OpinionID:          acc.OpinionID,
			Provider:           acc.Provider,
			Period:             acc.Period,
			PredictedDirection: acc.PredictedDirection,
			ActualDirection:    acc.ActualDirection,
			IsCorrect:          acc.IsCorrect,
			PnLPercent:         outcomeMap[acc.Period],
		}
		items = append(items, item)
	}

	return c.JSON(BubbleAccuracyResponse{
		BubbleID:   bubbleID,
		Accuracies: items,
	})
}

type TrendDataPoint struct {
	Date          string  `json:"date"`
	PnL           float64 `json:"pnl"`
	CumulativePnL float64 `json:"cumulative_pnl"`
	WinRate       float64 `json:"win_rate"`
	BubbleCount   int     `json:"bubble_count"`
}

type TrendResponse struct {
	Period string           `json:"period"`
	Data   []TrendDataPoint `json:"data"`
}

// GetTrend returns performance trend data over time
func (h *ReviewHandler) GetTrend(c *fiber.Ctx) error {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	period := c.Query("period", "30d")

	// Calculate date range
	var days int
	switch period {
	case "7d":
		days = 7
	case "30d":
		days = 30
	case "all":
		days = 365 // max 1 year
	default:
		days = 30
	}

	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -days)

	// Get bubbles with outcomes in the period
	bubbles, _, err := h.bubbleRepo.ListByUser(c.Context(), userID, 1000, 0)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Get all outcomes
	outcomes, err := h.outcomeRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Create outcome map by bubble ID
	outcomeMap := make(map[uuid.UUID]*entities.Outcome)
	for _, o := range outcomes {
		if o.Period == "1h" { // Use 1h as default
			outcomeMap[o.BubbleID] = o
		}
	}

	// Aggregate by date
	dailyData := make(map[string]*TrendDataPoint)
	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		dailyData[dateStr] = &TrendDataPoint{
			Date: dateStr,
		}
	}

	for _, bubble := range bubbles {
		dateStr := bubble.CreatedAt.Format("2006-01-02")
		if dp, exists := dailyData[dateStr]; exists {
			dp.BubbleCount++

			if outcome, hasOutcome := outcomeMap[bubble.ID]; hasOutcome {
				pnl := parsePnL(outcome.PnLPercent)
				dp.PnL += pnl
				if pnl > 0 {
					dp.WinRate += 1
				}
			}
		}
	}

	// Build sorted data and calculate cumulative
	data := make([]TrendDataPoint, 0, len(dailyData))
	var dates []string
	for date := range dailyData {
		dates = append(dates, date)
	}
	sort.Strings(dates)

	cumulative := 0.0
	for _, date := range dates {
		dp := dailyData[date]
		cumulative += dp.PnL
		dp.CumulativePnL = cumulative
		if dp.BubbleCount > 0 {
			dp.WinRate = (dp.WinRate / float64(dp.BubbleCount)) * 100
		}
		data = append(data, *dp)
	}

	return c.JSON(TrendResponse{
		Period: period,
		Data:   data,
	})
}

func parsePnL(pnlStr string) float64 {
	var pnl float64
	// Remove % sign and parse
	pnlStr = pnlStr[:len(pnlStr)-1]
	fmt.Sscanf(pnlStr, "%f", &pnl)
	return pnl
}

func getUserIDFromContext(c *fiber.Ctx) (uuid.UUID, error) {
	userID := c.Locals("userID")
	if userID == nil {
		return uuid.UUID{}, fiber.ErrUnauthorized
	}
	return userID.(uuid.UUID), nil
}
```

## File: internal/interfaces/http/handlers/safety_handler.go
```go
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
```

## File: internal/interfaces/http/handlers/sim_report_handler.go
```go
package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/auth"
)

type SimReportHandler struct {
	pool             *pgxpool.Pool
	userRepo         repositories.UserRepository
	subscriptionRepo repositories.SubscriptionRepository
	tradeRepo        repositories.TradeRepository
	bubbleRepo       repositories.BubbleRepository
	guidedReviewRepo repositories.GuidedReviewRepository
	noteRepo         repositories.ReviewNoteRepository
	alertRuleRepo    repositories.AlertRuleRepository
	aiProviderRepo   repositories.AIProviderRepository
	userAIKeyRepo    repositories.UserAIKeyRepository
	userSymbolRepo   repositories.UserSymbolRepository
	portfolioRepo    repositories.PortfolioRepository
	manualPosRepo    repositories.ManualPositionRepository
	outcomeRepo      repositories.OutcomeRepository
	aiOpinionRepo    repositories.AIOpinionRepository
	accuracyRepo     repositories.AIOpinionAccuracyRepository
}

func NewSimReportHandler(
	pool *pgxpool.Pool,
	userRepo repositories.UserRepository,
	subscriptionRepo repositories.SubscriptionRepository,
	tradeRepo repositories.TradeRepository,
	bubbleRepo repositories.BubbleRepository,
	guidedReviewRepo repositories.GuidedReviewRepository,
	noteRepo repositories.ReviewNoteRepository,
	alertRuleRepo repositories.AlertRuleRepository,
	aiProviderRepo repositories.AIProviderRepository,
	userAIKeyRepo repositories.UserAIKeyRepository,
	userSymbolRepo repositories.UserSymbolRepository,
	portfolioRepo repositories.PortfolioRepository,
	manualPosRepo repositories.ManualPositionRepository,
	outcomeRepo repositories.OutcomeRepository,
	aiOpinionRepo repositories.AIOpinionRepository,
	accuracyRepo repositories.AIOpinionAccuracyRepository,
) *SimReportHandler {
	return &SimReportHandler{
		pool:             pool,
		userRepo:         userRepo,
		subscriptionRepo: subscriptionRepo,
		tradeRepo:        tradeRepo,
		bubbleRepo:       bubbleRepo,
		guidedReviewRepo: guidedReviewRepo,
		noteRepo:         noteRepo,
		alertRuleRepo:    alertRuleRepo,
		aiProviderRepo:   aiProviderRepo,
		userAIKeyRepo:    userAIKeyRepo,
		userSymbolRepo:   userSymbolRepo,
		portfolioRepo:    portfolioRepo,
		manualPosRepo:    manualPosRepo,
		outcomeRepo:      outcomeRepo,
		aiOpinionRepo:    aiOpinionRepo,
		accuracyRepo:     accuracyRepo,
	}
}

type SimReportRunRequest struct {
	Days            int      `json:"days"`
	StartDate       string   `json:"start_date"`
	Timezone        string   `json:"timezone"`
	NoTradeRate     *float64 `json:"no_trade_rate"`
	Seed            *int64   `json:"seed"`
	IncludeNotes    *bool    `json:"include_notes"`
	IncludeAlerts   *bool    `json:"include_alerts"`
	IncludeAIProbe  *bool    `json:"include_ai_probe"`
	TargetMode      string   `json:"target_mode"`
	SandboxEmail    string   `json:"sandbox_email"`
	SandboxPassword string   `json:"sandbox_password"`
	SandboxReset    *bool    `json:"sandbox_reset"`
}

type SimReportTotals struct {
	TradesCreated      int `json:"trades_created"`
	BubblesCreated     int `json:"bubbles_created"`
	OutcomesCreated    int `json:"outcomes_created"`
	AIOpinionsCreated  int `json:"ai_opinions_created"`
	AccuracyRows       int `json:"accuracy_rows"`
	AINotesCreated     int `json:"ai_notes_created"`
	TradeEventsCreated int `json:"trade_events_created"`
	TradeEventsSkipped int `json:"trade_events_skipped"`
	StockEventsCreated int `json:"stock_events_created"`
	ReviewDaysTouched  int `json:"review_days_touched"`
	ReviewDaysComplete int `json:"review_days_complete"`
	ItemsTotal         int `json:"items_total"`
	ItemsSubmitted     int `json:"items_submitted"`
	NoTradeDays        int `json:"no_trade_days"`
	NotesCreated       int `json:"notes_created"`
	ManualPositions    int `json:"manual_positions_created"`
	UserSymbolsUpdated int `json:"user_symbols_updated"`
	AlertRulesCreated  int `json:"alert_rules_created"`
	AIProbePass        int `json:"ai_probe_pass"`
	AIProbeFail        int `json:"ai_probe_fail"`
}

type SimReportStreak struct {
	Current       int     `json:"current"`
	Longest       int     `json:"longest"`
	LastReviewDay *string `json:"last_review_day,omitempty"`
}

type SimStepResult struct {
	Step    string `json:"step"`
	OK      bool   `json:"ok"`
	Message string `json:"message,omitempty"`
}

type SimReportDay struct {
	Date           string          `json:"date"`
	NoTradeDay     bool            `json:"no_trade_day"`
	TradesCreated  int             `json:"trades_created"`
	BubblesCreated int             `json:"bubbles_created"`
	ReviewID       string          `json:"review_id,omitempty"`
	ReviewStatus   string          `json:"review_status,omitempty"`
	Items          int             `json:"items"`
	Submitted      int             `json:"submitted"`
	Completed      bool            `json:"completed"`
	Symbols        []string        `json:"symbols,omitempty"`
	Steps          []SimStepResult `json:"steps,omitempty"`
	Error          string          `json:"error,omitempty"`
}

type SimReportRunResponse struct {
	RunID         string                 `json:"run_id"`
	Seed          int64                  `json:"seed"`
	Timezone      string                 `json:"timezone"`
	StartDate     string                 `json:"start_date"`
	EndDate       string                 `json:"end_date"`
	Days          int                    `json:"days"`
	StartedAt     time.Time              `json:"started_at"`
	FinishedAt    time.Time              `json:"finished_at"`
	Totals        SimReportTotals        `json:"totals"`
	Streak        SimReportStreak        `json:"streak"`
	EffectiveUser SimReportEffectiveUser `json:"effective_user"`
	Results       []SimReportDay         `json:"results"`
	Warnings      []string               `json:"warnings,omitempty"`
}

type SimReportEffectiveUser struct {
	Mode           string `json:"mode"`
	UserID         string `json:"user_id"`
	Email          string `json:"email"`
	Password       string `json:"password,omitempty"`
	ResetPerformed bool   `json:"reset_performed"`
}

func (h *SimReportHandler) Run(c *fiber.Ctx) error {
	ownerUserID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	req := SimReportRunRequest{
		Days:       30,
		Timezone:   "UTC",
		StartDate:  "",
		TargetMode: "sandbox",
	}
	if len(c.Body()) > 0 {
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid json body"})
		}
	}

	if req.Days <= 0 {
		req.Days = 30
	}
	if req.Days > 180 {
		req.Days = 180
	}
	includeNotes := boolOrDefault(req.IncludeNotes, true)
	includeAlerts := boolOrDefault(req.IncludeAlerts, true)
	includeAIProbe := boolOrDefault(req.IncludeAIProbe, true)
	sandboxReset := boolOrDefault(req.SandboxReset, true)
	targetMode := strings.ToLower(strings.TrimSpace(req.TargetMode))
	if targetMode == "" {
		targetMode = "sandbox"
	}
	if targetMode != "self" && targetMode != "sandbox" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "target_mode must be self or sandbox"})
	}

	timezone := strings.TrimSpace(req.Timezone)
	if timezone == "" {
		timezone = "UTC"
	}
	location, err := time.LoadLocation(timezone)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "timezone is invalid"})
	}

	anchorDate, err := parseSimStartDate(req.StartDate, location)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "start_date must be YYYY-MM-DD"})
	}
	simStartDate := anchorDate.AddDate(0, 0, -(req.Days - 1))

	noTradeRate := 0.25
	if req.NoTradeRate != nil {
		noTradeRate = *req.NoTradeRate
	}
	if noTradeRate < 0 {
		noTradeRate = 0
	}
	if noTradeRate > 0.95 {
		noTradeRate = 0.95
	}

	seed := time.Now().UnixNano()
	if req.Seed != nil {
		seed = *req.Seed
	}
	rng := rand.New(rand.NewSource(seed))
	startedAt := time.Now().UTC()
	runID := uuid.New().String()

	totals := SimReportTotals{}
	results := make([]SimReportDay, 0, req.Days)
	warnings := make([]string, 0)
	finalStreak := SimReportStreak{}
	effectiveUser := SimReportEffectiveUser{
		Mode: targetMode,
	}

	executionUserID := ownerUserID
	if targetMode == "self" {
		ownerUser, ownerErr := h.userRepo.GetByID(c.Context(), ownerUserID)
		if ownerErr != nil || ownerUser == nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "failed to load current user"})
		}
		effectiveUser.UserID = ownerUserID.String()
		effectiveUser.Email = ownerUser.Email
		effectiveUser.ResetPerformed = false
	} else {
		sandboxUser, plainPassword, createdOrUpdated, sandboxErr := h.ensureSandboxUser(c.Context(), ownerUserID, req.SandboxEmail, req.SandboxPassword)
		if sandboxErr != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": sandboxErr.Error()})
		}
		executionUserID = sandboxUser.ID
		effectiveUser.UserID = sandboxUser.ID.String()
		effectiveUser.Email = sandboxUser.Email
		effectiveUser.Password = plainPassword
		effectiveUser.ResetPerformed = false
		if createdOrUpdated {
			warnings = append(warnings, "sandbox user credential was refreshed")
		}
		if sandboxReset {
			if resetErr := h.resetSandboxUserData(c.Context(), sandboxUser.ID); resetErr != nil {
				return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": fmt.Sprintf("sandbox reset failed: %s", resetErr.Error())})
			}
			effectiveUser.ResetPerformed = true
		}
	}

	for dayIndex := 0; dayIndex < req.Days; dayIndex++ {
		currentDate := simStartDate.AddDate(0, 0, dayIndex)
		currentDateText := currentDate.Format("2006-01-02")
		dayResult := SimReportDay{
			Date:  currentDateText,
			Steps: make([]SimStepResult, 0, 12),
		}

		noTradeDay := rng.Float64() < noTradeRate
		dayResult.NoTradeDay = noTradeDay
		if noTradeDay {
			totals.NoTradeDays++
			dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "trade_phase", OK: true, Message: "no-trade day"})
		}

		var createdBubbles []*entities.Bubble
		if !noTradeDay {
			createdTrades, createdBubbleCount, symbols, bubblesForDay, createErr := h.createSyntheticActivity(
				c.Context(),
				executionUserID,
				currentDate,
				location,
				dayIndex,
				seed,
				rng,
			)
			dayResult.TradesCreated = createdTrades
			dayResult.BubblesCreated = createdBubbleCount
			dayResult.Symbols = symbols
			createdBubbles = bubblesForDay
			totals.TradesCreated += createdTrades
			totals.BubblesCreated += createdBubbleCount
			if createErr != nil {
				dayResult.Error = createErr.Error()
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "trade_phase", OK: false, Message: createErr.Error()})
				results = append(results, dayResult)
				warnings = append(warnings, fmt.Sprintf("%s activity creation failed: %s", currentDateText, createErr.Error()))
				continue
			}
			dayResult.Steps = append(dayResult.Steps, SimStepResult{
				Step:    "trade_phase",
				OK:      true,
				Message: fmt.Sprintf("trades=%d bubbles=%d", createdTrades, createdBubbleCount),
			})

			outcomesCreated, opinionsCreated, accuracyRows, aiErr := h.createSyntheticAIArtifacts(
				c.Context(),
				executionUserID,
				createdBubbles,
				rng,
			)
			if aiErr != nil {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "ai_mock", OK: false, Message: aiErr.Error()})
				warnings = append(warnings, fmt.Sprintf("%s ai mock failed: %s", currentDateText, aiErr.Error()))
			} else {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{
					Step:    "ai_mock",
					OK:      true,
					Message: fmt.Sprintf("outcomes=%d opinions=%d accuracy=%d", outcomesCreated, opinionsCreated, accuracyRows),
				})
				totals.OutcomesCreated += outcomesCreated
				totals.AIOpinionsCreated += opinionsCreated
				totals.AccuracyRows += accuracyRows

				if len(createdBubbles) > 0 {
					aiNoteID, aiNoteErr := h.createSyntheticAINote(c.Context(), executionUserID, createdBubbles[0], rng)
					if aiNoteErr != nil {
						dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "ai_note", OK: false, Message: aiNoteErr.Error()})
						warnings = append(warnings, fmt.Sprintf("%s ai note failed: %s", currentDateText, aiNoteErr.Error()))
					} else {
						dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "ai_note", OK: true, Message: aiNoteID.String()})
						totals.AINotesCreated++
					}
				}
			}
		}

		review, items, reviewErr := h.guidedReviewRepo.GetOrCreateToday(c.Context(), executionUserID, currentDateText)
		if reviewErr != nil {
			dayResult.Error = reviewErr.Error()
			dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "guided_review_load", OK: false, Message: reviewErr.Error()})
			results = append(results, dayResult)
			warnings = append(warnings, fmt.Sprintf("%s review load failed: %s", currentDateText, reviewErr.Error()))
			continue
		}
		dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "guided_review_load", OK: true, Message: "loaded"})

		dayResult.ReviewID = review.ID.String()
		dayResult.ReviewStatus = review.Status
		dayResult.Items = len(items)
		totals.ReviewDaysTouched++
		totals.ItemsTotal += len(items)

		submittedCount := 0
		for _, item := range items {
			if item.Intent != nil && strings.TrimSpace(*item.Intent) != "" {
				continue
			}
			if err := h.submitSyntheticAnswer(c.Context(), executionUserID, item, rng); err != nil {
				dayResult.Error = err.Error()
				break
			}
			submittedCount++
		}
		dayResult.Submitted = submittedCount
		totals.ItemsSubmitted += submittedCount
		if dayResult.Error != "" {
			dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "guided_review_submit", OK: false, Message: dayResult.Error})
			results = append(results, dayResult)
			warnings = append(warnings, fmt.Sprintf("%s item submit failed: %s", currentDateText, dayResult.Error))
			continue
		}
		dayResult.Steps = append(dayResult.Steps, SimStepResult{
			Step:    "guided_review_submit",
			OK:      true,
			Message: fmt.Sprintf("submitted=%d", submittedCount),
		})

		streak, completeErr := h.guidedReviewRepo.CompleteReview(c.Context(), executionUserID, review.ID)
		if completeErr != nil {
			dayResult.Error = completeErr.Error()
			dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "guided_review_complete", OK: false, Message: completeErr.Error()})
			results = append(results, dayResult)
			warnings = append(warnings, fmt.Sprintf("%s complete failed: %s", currentDateText, completeErr.Error()))
			continue
		}
		dayResult.Completed = true
		dayResult.ReviewStatus = entities.GuidedReviewStatusCompleted
		dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "guided_review_complete", OK: true, Message: "completed"})
		totals.ReviewDaysComplete++
		finalStreak = SimReportStreak{
			Current:       streak.CurrentStreak,
			Longest:       streak.LongestStreak,
			LastReviewDay: streak.LastReviewDate,
		}

		if includeNotes {
			var noteBubbleID *uuid.UUID
			if len(createdBubbles) > 0 {
				noteBubbleID = &createdBubbles[0].ID
			}
			noteID, noteErr := h.createSyntheticNote(c.Context(), executionUserID, currentDateText, noteBubbleID, rng)
			if noteErr != nil {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "note_create", OK: false, Message: noteErr.Error()})
				warnings = append(warnings, fmt.Sprintf("%s note create failed: %s", currentDateText, noteErr.Error()))
			} else {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "note_create", OK: true, Message: noteID.String()})
				totals.NotesCreated++
			}
		}

		if includeAlerts && len(dayResult.Symbols) > 0 {
			alertID, alertErr := h.createSyntheticAlertRule(c.Context(), executionUserID, dayResult.Symbols[0], currentDateText)
			if alertErr != nil {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "alert_create", OK: false, Message: alertErr.Error()})
				warnings = append(warnings, fmt.Sprintf("%s alert create failed: %s", currentDateText, alertErr.Error()))
			} else {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "alert_create", OK: true, Message: alertID.String()})
				totals.AlertRulesCreated++
				if cleanupErr := h.alertRuleRepo.Delete(c.Context(), alertID, executionUserID); cleanupErr != nil {
					dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "alert_cleanup", OK: false, Message: cleanupErr.Error()})
					warnings = append(warnings, fmt.Sprintf("%s alert cleanup failed: %s", currentDateText, cleanupErr.Error()))
				} else {
					dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "alert_cleanup", OK: true, Message: "deleted"})
				}
			}
		}

		if includeAIProbe {
			ok, message, probeErr := h.runAIProbe(c.Context(), executionUserID)
			if probeErr != nil {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "ai_probe", OK: false, Message: probeErr.Error()})
				totals.AIProbeFail++
				warnings = append(warnings, fmt.Sprintf("%s ai probe failed: %s", currentDateText, probeErr.Error()))
			} else {
				dayResult.Steps = append(dayResult.Steps, SimStepResult{Step: "ai_probe", OK: ok, Message: message})
				if ok {
					totals.AIProbePass++
				} else {
					totals.AIProbeFail++
				}
			}
		}

		results = append(results, dayResult)
	}

	tradeEventsCreated, tradeEventsSkipped, stockEventsCreated, portfolioErr := h.syncPortfolioFromTradesAndStocks(
		c.Context(),
		executionUserID,
		simStartDate,
		anchorDate,
		rng,
	)
	if portfolioErr != nil {
		warnings = append(warnings, fmt.Sprintf("portfolio sync failed: %s", portfolioErr.Error()))
	} else {
		totals.TradeEventsCreated += tradeEventsCreated
		totals.TradeEventsSkipped += tradeEventsSkipped
		totals.StockEventsCreated += stockEventsCreated
	}

	manualPositionsCreated, manualPosErr := h.seedManualPositionsFromPortfolio(c.Context(), executionUserID, rng)
	if manualPosErr != nil {
		warnings = append(warnings, fmt.Sprintf("manual position seed failed: %s", manualPosErr.Error()))
	} else {
		totals.ManualPositions += manualPositionsCreated
	}

	userSymbolsUpdated, symbolErr := h.syncUserSymbolsFromTrades(c.Context(), executionUserID)
	if symbolErr != nil {
		warnings = append(warnings, fmt.Sprintf("user symbol sync failed: %s", symbolErr.Error()))
	} else {
		totals.UserSymbolsUpdated = userSymbolsUpdated
	}

	if finalStreak.Current == 0 && finalStreak.Longest == 0 {
		streak, streakErr := h.guidedReviewRepo.GetStreak(c.Context(), executionUserID)
		if streakErr == nil && streak != nil {
			finalStreak = SimReportStreak{
				Current:       streak.CurrentStreak,
				Longest:       streak.LongestStreak,
				LastReviewDay: streak.LastReviewDate,
			}
		}
	}

	endDate := anchorDate.Format("2006-01-02")
	response := SimReportRunResponse{
		RunID:         runID,
		Seed:          seed,
		Timezone:      timezone,
		StartDate:     simStartDate.Format("2006-01-02"),
		EndDate:       endDate,
		Days:          req.Days,
		StartedAt:     startedAt,
		FinishedAt:    time.Now().UTC(),
		Totals:        totals,
		Streak:        finalStreak,
		EffectiveUser: effectiveUser,
		Results:       results,
		Warnings:      warnings,
	}

	return c.Status(200).JSON(response)
}

func boolOrDefault(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}

func parseSimStartDate(value string, location *time.Location) (time.Time, error) {
	raw := strings.TrimSpace(value)
	if raw == "" {
		now := time.Now().In(location)
		return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location), nil
	}
	parsed, err := time.ParseInLocation("2006-01-02", raw, location)
	if err != nil {
		return time.Time{}, err
	}
	return time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, location), nil
}

func (h *SimReportHandler) createSyntheticActivity(
	ctx context.Context,
	userID uuid.UUID,
	currentDate time.Time,
	location *time.Location,
	dayIndex int,
	seed int64,
	rng *rand.Rand,
) (int, int, []string, []*entities.Bubble, error) {
	exchanges := []string{"binance_futures", "upbit"}
	byExchangeSymbols := map[string][]string{
		"binance_futures": {"BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT"},
		"upbit":           {"KRW-BTC", "KRW-ETH", "KRW-SOL", "KRW-XRP", "KRW-ADA"},
	}
	seenSymbols := map[string]struct{}{}
	createdBubbles := make([]*entities.Bubble, 0, 4)
	tradeCount := 2 + rng.Intn(4)
	tradesCreated := 0
	bubblesCreated := 0

	for i := 0; i < tradeCount; i++ {
		exchange := exchanges[rng.Intn(len(exchanges))]
		symbols := byExchangeSymbols[exchange]
		symbol := symbols[rng.Intn(len(symbols))]
		side := "BUY"
		if rng.Intn(2) == 1 {
			side = "SELL"
		}

		basePrice := syntheticPrice(symbol)
		priceWithNoise := basePrice * (1 + (rng.Float64()-0.5)*0.08)
		quantity := 0.05 + rng.Float64()*1.8
		tradeTimeLocal := time.Date(
			currentDate.Year(),
			currentDate.Month(),
			currentDate.Day(),
			9+rng.Intn(11),
			rng.Intn(60),
			0,
			0,
			location,
		)

		var realizedPnL *string
		if side == "SELL" && rng.Float64() < 0.7 {
			pnlValue := (rng.Float64()*2 - 1) * 120
			pnlText := fmt.Sprintf("%.2f", pnlValue)
			realizedPnL = &pnlText
		}

		seedAbs := int64(math.Abs(float64(seed % 100000000)))
		binanceTradeID := seedAbs*100000 + int64(dayIndex*100+i+1)
		trade := &entities.Trade{
			ID:             uuid.New(),
			UserID:         userID,
			Exchange:       exchange,
			BinanceTradeID: binanceTradeID,
			Symbol:         symbol,
			Side:           side,
			Quantity:       fmt.Sprintf("%.6f", quantity),
			Price:          fmt.Sprintf("%.4f", priceWithNoise),
			RealizedPnL:    realizedPnL,
			TradeTime:      tradeTimeLocal.UTC(),
		}
		if err := h.tradeRepo.Create(ctx, trade); err != nil {
			return tradesCreated, bubblesCreated, sortedKeys(seenSymbols), createdBubbles, fmt.Errorf("trade create failed: %w", err)
		}
		tradesCreated++
		seenSymbols[symbol] = struct{}{}

		// Roughly 70% of synthetic trades emit a bubble.
		if rng.Float64() > 0.7 {
			continue
		}

		timeframes := []string{"1d", "1d", "4h", "1h"}
		timeframe := timeframes[rng.Intn(len(timeframes))]
		memo := fmt.Sprintf("Simulated note day %d: %s %s @ %.4f", dayIndex+1, symbol, side, priceWithNoise)
		assetClass := "crypto"
		venueName := exchange
		bubble := &entities.Bubble{
			ID:         uuid.New(),
			UserID:     userID,
			Symbol:     strings.ToUpper(strings.TrimSpace(strings.ReplaceAll(symbol, "-", ""))),
			Timeframe:  timeframe,
			CandleTime: floorSyntheticCandle(trade.TradeTime, timeframe),
			Price:      trade.Price,
			BubbleType: "manual",
			AssetClass: &assetClass,
			VenueName:  &venueName,
			Memo:       &memo,
			Tags:       []string{"sim", strings.ToLower(strings.ReplaceAll(symbol, "-", ""))},
			CreatedAt:  time.Now().UTC(),
		}
		if err := h.bubbleRepo.Create(ctx, bubble); err != nil {
			return tradesCreated, bubblesCreated, sortedKeys(seenSymbols), createdBubbles, fmt.Errorf("bubble create failed: %w", err)
		}
		bubblesCreated++
		createdBubbles = append(createdBubbles, bubble)
	}

	return tradesCreated, bubblesCreated, sortedKeys(seenSymbols), createdBubbles, nil
}

func (h *SimReportHandler) submitSyntheticAnswer(ctx context.Context, userID uuid.UUID, item *entities.GuidedReviewItem, rng *rand.Rand) error {
	intentCandidates := []string{
		entities.IntentTechnicalSignal,
		entities.IntentPlannedRegular,
		entities.IntentNewsEvent,
		entities.IntentEmotional,
	}
	patternCandidates := []string{
		entities.PatternSameDecision,
		entities.PatternAdjustTiming,
		entities.PatternReduceSize,
		entities.PatternChangeSlTp,
	}
	emotionCandidates := []string{
		entities.EmotionGRConfident,
		entities.EmotionGRCalm,
		entities.EmotionGRHalfDoubtful,
		entities.EmotionGRAnxious,
		entities.EmotionGRAsPlanned,
	}

	intent := intentCandidates[rng.Intn(len(intentCandidates))]
	if item.Symbol == "__NO_TRADE__" {
		intent = entities.IntentOther
	}
	pattern := patternCandidates[rng.Intn(len(patternCandidates))]
	emotion := []string{emotionCandidates[rng.Intn(len(emotionCandidates))]}
	if rng.Float64() < 0.35 {
		emotion = append(emotion, emotionCandidates[rng.Intn(len(emotionCandidates))])
	}
	emotionsJSON, _ := json.Marshal(emotion)
	memo := fmt.Sprintf("simulated review for %s", item.Symbol)

	return h.guidedReviewRepo.SubmitItem(
		ctx,
		userID,
		item.ID,
		repositories.SubmitItemInput{
			Intent:       intent,
			Emotions:     emotionsJSON,
			PatternMatch: pattern,
			Memo:         memo,
		},
	)
}

func (h *SimReportHandler) createSyntheticNote(
	ctx context.Context,
	userID uuid.UUID,
	dateText string,
	bubbleID *uuid.UUID,
	rng *rand.Rand,
) (uuid.UUID, error) {
	emotions := []entities.Emotion{
		entities.EmotionCalm,
		entities.EmotionConfident,
		entities.EmotionUncertain,
		entities.EmotionFearful,
	}
	note := &entities.ReviewNote{
		UserID:        userID,
		BubbleID:      bubbleID,
		Title:         fmt.Sprintf("Sim Review %s", dateText),
		Content:       "자동 시뮬레이션에서 생성한 복기 노트입니다.",
		Tags:          []string{"sim", "daily-review"},
		LessonLearned: "빠른 테스트에서 기능 연결 상태를 확인했습니다.",
		Emotion:       emotions[rng.Intn(len(emotions))],
	}
	if err := h.noteRepo.Create(ctx, note); err != nil {
		return uuid.Nil, err
	}
	return note.ID, nil
}

func (h *SimReportHandler) createSyntheticAlertRule(
	ctx context.Context,
	userID uuid.UUID,
	symbol string,
	dateText string,
) (uuid.UUID, error) {
	config, _ := json.Marshal(map[string]string{
		"direction":       "both",
		"threshold_type":  "percent",
		"threshold_value": "2.0",
		"reference":       "24h",
	})
	rule := &entities.AlertRule{
		UserID:          userID,
		Name:            fmt.Sprintf("SIM %s %s", dateText, symbol),
		Symbol:          symbol,
		RuleType:        entities.RuleTypePriceChange,
		Config:          config,
		CooldownMinutes: 60,
		Enabled:         true,
	}
	if err := h.alertRuleRepo.Create(ctx, rule); err != nil {
		return uuid.Nil, err
	}
	return rule.ID, nil
}

func (h *SimReportHandler) runAIProbe(ctx context.Context, userID uuid.UUID) (bool, string, error) {
	providers, err := h.aiProviderRepo.ListEnabled(ctx)
	if err != nil {
		return false, "", err
	}
	if len(providers) == 0 {
		return false, "enabled providers not found", nil
	}

	available := make([]string, 0, len(providers))
	missing := make([]string, 0, len(providers))
	for _, provider := range providers {
		ok, checkErr := h.isProviderAvailableForUser(ctx, userID, provider.Name)
		if checkErr != nil {
			return false, "", checkErr
		}
		if ok {
			available = append(available, provider.Name)
		} else {
			missing = append(missing, provider.Name)
		}
	}

	if len(available) == 0 {
		return false, fmt.Sprintf("no keys configured (missing=%s)", strings.Join(missing, ",")), nil
	}
	if len(missing) == 0 {
		return true, fmt.Sprintf("all providers available (%s)", strings.Join(available, ",")), nil
	}
	return true, fmt.Sprintf("partial providers available (%s), missing (%s)", strings.Join(available, ","), strings.Join(missing, ",")), nil
}

func (h *SimReportHandler) isProviderAvailableForUser(ctx context.Context, userID uuid.UUID, provider string) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "openai":
		if strings.TrimSpace(os.Getenv("OPENAI_API_KEY")) != "" {
			return true, nil
		}
	case "claude":
		if strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY")) != "" {
			return true, nil
		}
	case "gemini":
		if strings.TrimSpace(os.Getenv("GEMINI_API_KEY")) != "" {
			return true, nil
		}
	}

	key, err := h.userAIKeyRepo.GetByUserAndProvider(ctx, userID, provider)
	if err != nil {
		return false, err
	}
	return key != nil && strings.TrimSpace(key.APIKeyEnc) != "", nil
}

func (h *SimReportHandler) ensureSandboxUser(
	ctx context.Context,
	ownerUserID uuid.UUID,
	requestedEmail string,
	requestedPassword string,
) (*entities.User, string, bool, error) {
	ownerPrefix := strings.ReplaceAll(ownerUserID.String(), "-", "")
	if len(ownerPrefix) > 12 {
		ownerPrefix = ownerPrefix[:12]
	}

	email := strings.ToLower(strings.TrimSpace(requestedEmail))
	if email == "" {
		email = fmt.Sprintf("sim.%s@kifu.local", ownerPrefix)
	}

	plainPassword := strings.TrimSpace(requestedPassword)
	if plainPassword == "" {
		plainPassword = "SimPass123!"
	}
	passwordHash, err := auth.HashPassword(plainPassword)
	if err != nil {
		return nil, "", false, err
	}

	now := time.Now().UTC()
	user, err := h.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, "", false, err
	}

	updated := false
	if user == nil {
		user = &entities.User{
			ID:            uuid.New(),
			Email:         email,
			PasswordHash:  passwordHash,
			Name:          "Simulation Sandbox",
			AIAllowlisted: true,
			CreatedAt:     now,
			UpdatedAt:     now,
		}
		if err := h.userRepo.Create(ctx, user); err != nil {
			return nil, "", false, err
		}
		updated = true
	} else {
		user.PasswordHash = passwordHash
		user.Name = "Simulation Sandbox"
		user.AIAllowlisted = true
		user.UpdatedAt = now
		if err := h.userRepo.Update(ctx, user); err != nil {
			return nil, "", false, err
		}
		updated = true
	}

	subscription, err := h.subscriptionRepo.GetByUserID(ctx, user.ID)
	if err != nil {
		return nil, "", false, err
	}
	if subscription == nil {
		subscription = &entities.Subscription{
			ID:               uuid.New(),
			UserID:           user.ID,
			Tier:             "free",
			AIQuotaRemaining: 200,
			AIQuotaLimit:     200,
			LastResetAt:      now,
		}
		if err := h.subscriptionRepo.Create(ctx, subscription); err != nil {
			return nil, "", false, err
		}
		updated = true
	}

	return user, plainPassword, updated, nil
}

func (h *SimReportHandler) resetSandboxUserData(ctx context.Context, userID uuid.UUID) error {
	if h.pool == nil {
		return fmt.Errorf("database pool is not configured")
	}

	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	queries := []string{
		`DELETE FROM trade_safety_reviews WHERE user_id = $1`,
		`DELETE FROM alert_decisions WHERE user_id = $1`,
		`DELETE FROM alerts WHERE user_id = $1`,
		`DELETE FROM alert_rules WHERE user_id = $1`,
		`DELETE FROM review_notes WHERE user_id = $1`,
		`DELETE FROM guided_reviews WHERE user_id = $1`,
		`DELETE FROM user_streaks WHERE user_id = $1`,
		`DELETE FROM manual_positions WHERE user_id = $1`,
		`DELETE FROM position_events WHERE position_id IN (SELECT id FROM positions WHERE user_id = $1)`,
		`DELETE FROM positions WHERE user_id = $1`,
		`DELETE FROM trade_events WHERE user_id = $1`,
		`DELETE FROM accounts WHERE user_id = $1`,
		`DELETE FROM user_symbols WHERE user_id = $1`,
		`DELETE FROM ai_opinion_accuracies WHERE bubble_id IN (SELECT id FROM bubbles WHERE user_id = $1)`,
		`DELETE FROM ai_opinions WHERE bubble_id IN (SELECT id FROM bubbles WHERE user_id = $1)`,
		`DELETE FROM outcomes WHERE bubble_id IN (SELECT id FROM bubbles WHERE user_id = $1)`,
		`DELETE FROM trades WHERE user_id = $1`,
		`DELETE FROM bubbles WHERE user_id = $1`,
		`DELETE FROM trade_sync_state WHERE user_id = $1`,
	}

	for _, query := range queries {
		if _, err := tx.Exec(ctx, query, userID); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (h *SimReportHandler) createSyntheticAIArtifacts(
	ctx context.Context,
	userID uuid.UUID,
	bubbles []*entities.Bubble,
	rng *rand.Rand,
) (int, int, int, error) {
	if len(bubbles) == 0 {
		return 0, 0, 0, nil
	}

	periodSpecs := []struct {
		period   string
		duration time.Duration
		maxAbs   float64
	}{
		{period: "1h", duration: time.Hour, maxAbs: 1.4},
		{period: "4h", duration: 4 * time.Hour, maxAbs: 3.0},
		{period: "1d", duration: 24 * time.Hour, maxAbs: 6.2},
	}
	providers := []struct {
		name  string
		model string
	}{
		{name: "openai", model: "gpt-5-mini"},
		{name: "claude", model: "claude-3-5-sonnet"},
		{name: "gemini", model: "gemini-2.0-flash"},
	}

	outcomesCreated := 0
	aiOpinionsCreated := 0
	accuracyRows := 0

	for _, bubble := range bubbles {
		if bubble == nil {
			continue
		}
		referencePrice := parseFloatOrFallback(bubble.Price, syntheticPrice(bubble.Symbol))
		periodPnL := make(map[string]float64, len(periodSpecs))

		for _, spec := range periodSpecs {
			pnl := (rng.Float64()*2 - 1) * spec.maxAbs
			if math.Abs(pnl) < 0.07 {
				pnl = 0
			}
			periodPnL[spec.period] = pnl
			outcomePrice := referencePrice * (1 + pnl/100)

			outcome := &entities.Outcome{
				ID:             uuid.New(),
				BubbleID:       bubble.ID,
				Period:         spec.period,
				ReferencePrice: fmt.Sprintf("%.8f", referencePrice),
				OutcomePrice:   fmt.Sprintf("%.8f", outcomePrice),
				PnLPercent:     fmt.Sprintf("%.4f", pnl),
				CalculatedAt:   bubble.CandleTime.Add(spec.duration),
			}

			created, err := h.outcomeRepo.CreateIfNotExists(ctx, outcome)
			if err != nil {
				return outcomesCreated, aiOpinionsCreated, accuracyRows, err
			}
			if created {
				outcomesCreated++
			}
		}

		outcomeRows, err := h.outcomeRepo.ListByBubble(ctx, bubble.ID)
		if err != nil {
			return outcomesCreated, aiOpinionsCreated, accuracyRows, err
		}
		outcomeByPeriod := make(map[string]*entities.Outcome, len(outcomeRows))
		for _, outcome := range outcomeRows {
			outcomeByPeriod[strings.TrimSpace(outcome.Period)] = outcome
		}
		if len(outcomeByPeriod) == 0 {
			continue
		}

		predictedDirection := pickPredictedDirection(periodPnL["1h"], rng)
		promptTemplate := "simulated_packet_v1"
		responseText := buildSyntheticAIResponse(bubble.Symbol, bubble.Timeframe, periodPnL["1h"], predictedDirection)

		for _, provider := range providers {
			tokensUsed := 180 + rng.Intn(260)
			opinion := &entities.AIOpinion{
				ID:             uuid.New(),
				BubbleID:       bubble.ID,
				Provider:       provider.name,
				Model:          provider.model,
				PromptTemplate: promptTemplate,
				Response:       responseText,
				TokensUsed:     &tokensUsed,
				CreatedAt:      time.Now().UTC(),
			}
			if err := h.aiOpinionRepo.Create(ctx, opinion); err != nil {
				return outcomesCreated, aiOpinionsCreated, accuracyRows, err
			}
			aiOpinionsCreated++

			for _, spec := range periodSpecs {
				outcome := outcomeByPeriod[spec.period]
				if outcome == nil {
					continue
				}
				actualDirection := directionFromPnL(parseFloatOrFallback(outcome.PnLPercent, 0))
				accuracy := &entities.AIOpinionAccuracy{
					ID:                 uuid.New(),
					OpinionID:          opinion.ID,
					OutcomeID:          outcome.ID,
					BubbleID:           bubble.ID,
					Provider:           provider.name,
					Period:             spec.period,
					PredictedDirection: predictedDirection,
					ActualDirection:    actualDirection,
					IsCorrect:          predictedDirection == actualDirection,
					CreatedAt:          time.Now().UTC(),
				}
				if err := h.accuracyRepo.Create(ctx, accuracy); err != nil {
					return outcomesCreated, aiOpinionsCreated, accuracyRows, err
				}
				accuracyRows++
			}
		}
	}

	_ = userID // reserved for future provider personalization
	return outcomesCreated, aiOpinionsCreated, accuracyRows, nil
}

func (h *SimReportHandler) createSyntheticAINote(
	ctx context.Context,
	userID uuid.UUID,
	bubble *entities.Bubble,
	rng *rand.Rand,
) (uuid.UUID, error) {
	if bubble == nil {
		return uuid.Nil, fmt.Errorf("bubble is nil")
	}
	verdict := "관망"
	if rng.Float64() < 0.45 {
		verdict = "조건부 진입"
	}
	content := fmt.Sprintf(
		"상황\n%s %s 구간 재점검\n핵심 근거\n- 변동성 대비 거래량 비율 점검\n- 직전 지지/저항 위치 확인\n리스크\n- 손절 미준수 시 손실 확장 가능\n행동 제안\n%s\n결론\n조건 충족 시에만 실행하고 체크리스트를 유지하세요.",
		bubble.Symbol,
		strings.ToUpper(strings.TrimSpace(bubble.Timeframe)),
		verdict,
	)
	note := &entities.ReviewNote{
		UserID:        userID,
		BubbleID:      &bubble.ID,
		Title:         fmt.Sprintf("AI 요약 · %s", bubble.Symbol),
		Content:       content,
		Tags:          []string{"ai", "one-shot", "sim"},
		LessonLearned: "시뮬레이션 생성 AI 요약 노트",
		Emotion:       entities.EmotionCalm,
	}
	if err := h.noteRepo.Create(ctx, note); err != nil {
		return uuid.Nil, err
	}
	return note.ID, nil
}

func (h *SimReportHandler) syncPortfolioFromTradesAndStocks(
	ctx context.Context,
	userID uuid.UUID,
	startDate time.Time,
	endDate time.Time,
	rng *rand.Rand,
) (int, int, int, error) {
	processed := 0
	created := 0
	skipped := 0
	page := 1
	limit := 1000

	for {
		filter := repositories.TradeFilter{
			Limit:  limit,
			Offset: (page - 1) * limit,
			Sort:   "asc",
		}
		trades, _, err := h.tradeRepo.List(ctx, userID, filter)
		if err != nil {
			return created, skipped, 0, err
		}
		if len(trades) == 0 {
			break
		}

		for _, trade := range trades {
			event, buildErr := h.buildEventFromTradeForSim(ctx, userID, trade)
			if buildErr != nil {
				skipped++
				continue
			}
			if err := h.portfolioRepo.CreateTradeEvent(ctx, event); err != nil {
				if isUniqueViolationError(err) {
					skipped++
					continue
				}
				return created, skipped, 0, err
			}
			created++
		}

		processed += len(trades)
		if len(trades) < limit {
			break
		}
		page++
	}

	stockEventsCreated, stockErr := h.createSyntheticStockEvents(ctx, userID, startDate, endDate, rng)
	if stockErr != nil {
		return created, skipped, stockEventsCreated, stockErr
	}

	if processed > 0 || stockEventsCreated > 0 {
		if err := h.portfolioRepo.RebuildPositions(ctx, userID); err != nil {
			return created, skipped, stockEventsCreated, err
		}
	}

	return created, skipped, stockEventsCreated, nil
}

func (h *SimReportHandler) buildEventFromTradeForSim(ctx context.Context, userID uuid.UUID, trade *entities.Trade) (*entities.TradeEvent, error) {
	if trade == nil {
		return nil, fmt.Errorf("trade is nil")
	}
	symbol := strings.ToUpper(strings.TrimSpace(trade.Symbol))
	if symbol == "" {
		return nil, fmt.Errorf("symbol is empty")
	}

	venueCode, venueType, venueName := resolveVenueFromExchange(trade.Exchange)
	venueID, err := h.portfolioRepo.UpsertVenue(ctx, venueCode, venueType, venueName, "")
	if err != nil {
		return nil, err
	}

	base, quote, normalizedSymbol := parseInstrumentSymbol(symbol, venueCode)
	instrumentID, err := h.portfolioRepo.UpsertInstrument(ctx, "crypto", base, quote, normalizedSymbol)
	if err != nil {
		return nil, err
	}
	_ = h.portfolioRepo.UpsertInstrumentMapping(ctx, instrumentID, venueID, symbol)

	accountID, err := h.portfolioRepo.UpsertAccount(ctx, userID, venueID, "sim-api", nil, "api")
	if err != nil {
		return nil, err
	}

	side := strings.ToLower(strings.TrimSpace(trade.Side))
	if side == "" {
		side = "buy"
	}
	qty := normalizeOptionalLiteral(trade.Quantity)
	price := normalizeOptionalLiteral(trade.Price)

	externalID := trade.ID.String()
	if trade.BinanceTradeID != 0 {
		externalID = fmt.Sprintf("%s-%d", strings.ToLower(strings.TrimSpace(trade.Exchange)), trade.BinanceTradeID)
	}

	eventType := resolveEventType(trade.Exchange)
	eventRecord := &portfolioTradeEventRecord{
		Symbol:     normalizedSymbol,
		EventType:  eventType,
		Side:       &side,
		Qty:        qty,
		Price:      price,
		ExecutedAt: trade.TradeTime,
		ExternalID: &externalID,
	}

	dedupe := buildTradeEventDedupeKey(venueCode, "crypto", eventRecord)
	metadata := map[string]string{
		"trade_id": trade.ID.String(),
		"exchange": trade.Exchange,
		"source":   "sim",
	}
	metadataRaw, _ := json.Marshal(metadata)
	raw := json.RawMessage(metadataRaw)

	return &entities.TradeEvent{
		ID:           uuid.New(),
		UserID:       userID,
		AccountID:    &accountID,
		VenueID:      &venueID,
		InstrumentID: &instrumentID,
		AssetClass:   "crypto",
		VenueType:    venueType,
		EventType:    eventType,
		Side:         &side,
		Qty:          qty,
		Price:        price,
		ExecutedAt:   trade.TradeTime,
		Source:       "api",
		ExternalID:   &externalID,
		Metadata:     &raw,
		DedupeKey:    &dedupe,
	}, nil
}

func (h *SimReportHandler) createSyntheticStockEvents(
	ctx context.Context,
	userID uuid.UUID,
	startDate time.Time,
	endDate time.Time,
	rng *rand.Rand,
) (int, error) {
	venueCode := "kis"
	venueID, err := h.portfolioRepo.UpsertVenue(ctx, venueCode, "broker", "KIS", "")
	if err != nil {
		return 0, err
	}
	accountID, err := h.portfolioRepo.UpsertAccount(ctx, userID, venueID, "sim-kis", nil, "api")
	if err != nil {
		return 0, err
	}

	stockUniverse := []struct {
		symbol string
		quote  string
		price  float64
	}{
		{symbol: "005930.KS", quote: "KRW", price: 76000},
		{symbol: "035420.KS", quote: "KRW", price: 184000},
		{symbol: "AAPL", quote: "USD", price: 205},
		{symbol: "MSFT", quote: "USD", price: 425},
	}

	days := int(endDate.Sub(startDate).Hours()/24) + 1
	if days <= 0 {
		days = 1
	}

	created := 0
	for i := 0; i < days; i++ {
		if rng.Float64() > 0.20 {
			continue
		}
		tradeDay := startDate.AddDate(0, 0, i)
		stock := stockUniverse[rng.Intn(len(stockUniverse))]
		basePrice := stock.price * (1 + (rng.Float64()-0.5)*0.10)
		qty := 1 + rng.Float64()*8
		side := "buy"
		if rng.Intn(2) == 1 {
			side = "sell"
		}

		instrumentID, upsertErr := h.portfolioRepo.UpsertInstrument(ctx, "stock", stock.symbol, stock.quote, stock.symbol)
		if upsertErr != nil {
			return created, upsertErr
		}
		_ = h.portfolioRepo.UpsertInstrumentMapping(ctx, instrumentID, venueID, stock.symbol)

		qtyText := fmt.Sprintf("%.4f", qty)
		priceText := fmt.Sprintf("%.4f", basePrice)
		executedAt := time.Date(tradeDay.Year(), tradeDay.Month(), tradeDay.Day(), 10+rng.Intn(6), rng.Intn(60), 0, 0, time.UTC)
		externalID := fmt.Sprintf("sim-stock-%d-%s", i+1, strings.ReplaceAll(stock.symbol, ".", ""))

		eventRecord := &portfolioTradeEventRecord{
			Symbol:     stock.symbol,
			EventType:  "spot_trade",
			Side:       &side,
			Qty:        &qtyText,
			Price:      &priceText,
			ExecutedAt: executedAt,
			ExternalID: &externalID,
		}
		dedupe := buildTradeEventDedupeKey(venueCode, "stock", eventRecord)
		metadataRaw, _ := json.Marshal(map[string]string{
			"source": "sim",
			"type":   "stock_seed",
		})
		raw := json.RawMessage(metadataRaw)

		event := &entities.TradeEvent{
			ID:           uuid.New(),
			UserID:       userID,
			AccountID:    &accountID,
			VenueID:      &venueID,
			InstrumentID: &instrumentID,
			AssetClass:   "stock",
			VenueType:    "broker",
			EventType:    "spot_trade",
			Side:         &side,
			Qty:          &qtyText,
			Price:        &priceText,
			ExecutedAt:   executedAt,
			Source:       "api",
			ExternalID:   &externalID,
			Metadata:     &raw,
			DedupeKey:    &dedupe,
		}

		if err := h.portfolioRepo.CreateTradeEvent(ctx, event); err != nil {
			if isUniqueViolationError(err) {
				continue
			}
			return created, err
		}
		created++
	}

	return created, nil
}

func (h *SimReportHandler) seedManualPositionsFromPortfolio(ctx context.Context, userID uuid.UUID, rng *rand.Rand) (int, error) {
	existing, err := h.manualPosRepo.List(ctx, userID, repositories.ManualPositionFilter{Status: "open"})
	if err != nil {
		return 0, err
	}
	if len(existing) > 0 {
		return 0, nil
	}

	positions, err := h.portfolioRepo.ListPositions(ctx, userID, repositories.PositionFilter{
		Status: "open",
		Limit:  10,
	})
	if err != nil {
		return 0, err
	}
	if len(positions) == 0 {
		return 0, nil
	}

	created := 0
	maxCreate := 2
	if len(positions) < maxCreate {
		maxCreate = len(positions)
	}
	for i := 0; i < maxCreate; i++ {
		position := positions[i]
		netQty := parseFloatOrFallback(position.NetQty, 0)
		side := "long"
		if netQty < 0 {
			side = "short"
		}
		sizeText := strings.TrimSpace(position.NetQty)
		if sizeText == "" {
			sizeText = fmt.Sprintf("%.4f", math.Abs(netQty))
		}
		if strings.HasPrefix(sizeText, "-") {
			sizeText = strings.TrimPrefix(sizeText, "-")
		}

		entryPrice := strings.TrimSpace(position.AvgEntry)
		venue := position.VenueCode
		now := time.Now().UTC()
		openAt := now.Add(-time.Duration(rng.Intn(120)+10) * time.Minute)

		manual := &entities.ManualPosition{
			UserID:       userID,
			Symbol:       position.Instrument,
			AssetClass:   position.AssetClass,
			Venue:        &venue,
			PositionSide: side,
			Size:         &sizeText,
			EntryPrice:   &entryPrice,
			Status:       "open",
			OpenedAt:     &openAt,
		}
		if err := h.manualPosRepo.Create(ctx, manual); err != nil {
			return created, err
		}
		created++
	}
	return created, nil
}

func (h *SimReportHandler) syncUserSymbolsFromTrades(ctx context.Context, userID uuid.UUID) (int, error) {
	_, _, bySymbol, err := h.tradeRepo.Summary(ctx, userID, repositories.TradeFilter{})
	if err != nil {
		return 0, err
	}
	if len(bySymbol) == 0 {
		return 0, nil
	}

	now := time.Now().UTC()
	maxSymbols := 12
	if len(bySymbol) < maxSymbols {
		maxSymbols = len(bySymbol)
	}
	symbols := make([]*entities.UserSymbol, 0, maxSymbols)
	for i := 0; i < maxSymbols; i++ {
		symbol := strings.ToUpper(strings.TrimSpace(bySymbol[i].Symbol))
		if symbol == "" {
			continue
		}
		timeframe := "1d"
		if strings.HasSuffix(symbol, "USDT") || strings.HasPrefix(symbol, "KRW-") {
			timeframe = "4h"
		}
		symbols = append(symbols, &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           userID,
			Symbol:           symbol,
			TimeframeDefault: timeframe,
			CreatedAt:        now,
		})
	}
	if len(symbols) == 0 {
		return 0, nil
	}

	if err := h.userSymbolRepo.ReplaceByUser(ctx, userID, symbols); err != nil {
		return 0, err
	}
	return len(symbols), nil
}

func parseFloatOrFallback(raw string, fallback float64) float64 {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(trimmed, 64)
	if err != nil || math.IsNaN(parsed) || math.IsInf(parsed, 0) {
		return fallback
	}
	return parsed
}

func directionFromPnL(pnl float64) entities.Direction {
	if pnl > 0.05 {
		return entities.DirectionUp
	}
	if pnl < -0.05 {
		return entities.DirectionDown
	}
	return entities.DirectionNeutral
}

func pickPredictedDirection(pnl float64, rng *rand.Rand) entities.Direction {
	actual := directionFromPnL(pnl)
	if rng.Float64() < 0.62 {
		return actual
	}
	if actual == entities.DirectionUp {
		return entities.DirectionDown
	}
	if actual == entities.DirectionDown {
		return entities.DirectionUp
	}
	return []entities.Direction{entities.DirectionUp, entities.DirectionDown, entities.DirectionNeutral}[rng.Intn(3)]
}

func buildSyntheticAIResponse(symbol string, timeframe string, pnl1h float64, predicted entities.Direction) string {
	stance := "관망"
	switch predicted {
	case entities.DirectionUp:
		stance = "조건부 매수"
	case entities.DirectionDown:
		stance = "리스크 축소"
	}
	return fmt.Sprintf(
		"상황\n%s %s 기준 변동성 점검이 필요합니다.\n핵심 근거\n- 단기 추세 강도와 거래량 변화를 확인했습니다.\n- 1h 기대 손익은 %.2f%%로 추정됩니다.\n리스크\n- 손절 조건 미준수 시 연속 손실로 이어질 수 있습니다.\n행동 제안\n%s\n결론\n체크리스트 확인 후 계획된 규모로만 실행하세요.",
		symbol,
		strings.ToUpper(strings.TrimSpace(timeframe)),
		pnl1h,
		stance,
	)
}

func syntheticPrice(symbol string) float64 {
	switch strings.ToUpper(symbol) {
	case "BTCUSDT", "KRW-BTC":
		return 98000
	case "ETHUSDT", "KRW-ETH":
		return 3200
	case "SOLUSDT", "KRW-SOL":
		return 180
	case "XRPUSDT", "KRW-XRP":
		return 1.1
	case "ADAUSDT", "KRW-ADA":
		return 0.8
	default:
		return 100
	}
}

func floorSyntheticCandle(value time.Time, timeframe string) time.Time {
	utc := value.UTC()
	switch timeframe {
	case "1d":
		return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
	case "4h":
		hour := (utc.Hour() / 4) * 4
		return time.Date(utc.Year(), utc.Month(), utc.Day(), hour, 0, 0, 0, time.UTC)
	case "1h":
		return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), 0, 0, 0, time.UTC)
	default:
		return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
	}
}

func sortedKeys(values map[string]struct{}) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}
```

## File: internal/interfaces/http/handlers/similar_handler.go
```go
package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type SimilarHandler struct {
	bubbleRepo repositories.BubbleRepository
}

func NewSimilarHandler(bubbleRepo repositories.BubbleRepository) *SimilarHandler {
	return &SimilarHandler{bubbleRepo: bubbleRepo}
}

type SimilarBubbleItem struct {
	ID         uuid.UUID    `json:"id"`
	Symbol     string       `json:"symbol"`
	Timeframe  string       `json:"timeframe"`
	CandleTime string       `json:"candle_time"`
	Price      string       `json:"price"`
	BubbleType string       `json:"bubble_type"`
	Memo       *string      `json:"memo,omitempty"`
	Tags       []string     `json:"tags,omitempty"`
	Outcome    *OutcomeItem `json:"outcome,omitempty"`
}

type OutcomeItem struct {
	Period     string  `json:"period"`
	PnLPercent *string `json:"pnl_percent"`
}

type SimilarSummaryResponse struct {
	Period string  `json:"period"`
	Wins   int     `json:"wins"`
	Losses int     `json:"losses"`
	AvgPnL *string `json:"avg_pnl"`
}

func (h *SimilarHandler) SimilarByBubble(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid id"})
	}

	period := normalizePeriod(c.Query("period"))
	if period == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "period is invalid"})
	}

	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if bubble == nil {
		return c.Status(404).JSON(fiber.Map{"code": "BUBBLE_NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "access denied"})
	}

	if len(bubble.Tags) == 0 {
		return c.Status(200).JSON(fiber.Map{
			"similar_count": 0,
			"summary":       SimilarSummaryResponse{Period: period, Wins: 0, Losses: 0, AvgPnL: nil},
			"bubbles":       []SimilarBubbleItem{},
		})
	}

	page, limit, err := parsePageLimit(c.Query("page"), c.Query("limit"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	items, total, err := h.bubbleRepo.ListSimilar(c.Context(), userID, bubble.Symbol, bubble.Tags, &bubble.ID, period, limit, (page-1)*limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	summary, err := h.bubbleRepo.SummarySimilar(c.Context(), userID, bubble.Symbol, bubble.Tags, &bubble.ID, period)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{
		"similar_count": total,
		"summary":       SimilarSummaryResponse{Period: period, Wins: summary.Wins, Losses: summary.Losses, AvgPnL: summary.AvgPnL},
		"bubbles":       mapSimilarItems(items),
	})
}

func (h *SimilarHandler) Search(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	symbol := strings.ToUpper(strings.TrimSpace(c.Query("symbol")))
	if symbol == "" || !bubbleSymbolPattern.MatchString(symbol) {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_SYMBOL", "message": "symbol is invalid"})
	}

	period := normalizePeriod(c.Query("period"))
	if period == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "period is invalid"})
	}

	queryTags, err := normalizeTags(splitTags(c.Query("tags")))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_TAGS", "message": err.Error()})
	}
	if len(queryTags) == 0 {
		return c.Status(200).JSON(fiber.Map{
			"page":  1,
			"limit": 50,
			"total": 0,
			"items": []SimilarBubbleItem{},
		})
	}

	page, limit, err := parsePageLimit(c.Query("page"), c.Query("limit"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	items, total, err := h.bubbleRepo.ListSimilar(c.Context(), userID, symbol, queryTags, nil, period, limit, (page-1)*limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{
		"page":  page,
		"limit": limit,
		"total": total,
		"items": mapSimilarItems(items),
	})
}

func mapSimilarItems(items []*repositories.BubbleWithOutcome) []SimilarBubbleItem {
	response := make([]SimilarBubbleItem, 0, len(items))
	for _, item := range items {
		bubble := item.Bubble
		if bubble == nil {
			continue
		}
		var outcome *OutcomeItem
		if item.Outcome != nil {
			pnl := item.Outcome.PnLPercent
			outcome = &OutcomeItem{Period: item.Outcome.Period, PnLPercent: &pnl}
		}
		response = append(response, SimilarBubbleItem{
			ID:         bubble.ID,
			Symbol:     bubble.Symbol,
			Timeframe:  bubble.Timeframe,
			CandleTime: bubble.CandleTime.Format(time.RFC3339),
			Price:      bubble.Price,
			BubbleType: bubble.BubbleType,
			Memo:       bubble.Memo,
			Tags:       bubble.Tags,
			Outcome:    outcome,
		})
	}
	return response
}

func normalizePeriod(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "1h"
	}
	if value == "1h" || value == "4h" || value == "1d" {
		return value
	}
	return ""
}
```

## File: internal/interfaces/http/handlers/trade_handler.go
```go
package handlers

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"io"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

const defaultExchange = "binance_futures"

var allowedExchanges = map[string]struct{}{
	"binance_futures": {},
	"binance_spot":    {},
	"upbit":           {},
}

type TradeHandler struct {
	tradeRepo      repositories.TradeRepository
	bubbleRepo     repositories.BubbleRepository
	userSymbolRepo repositories.UserSymbolRepository
	portfolioRepo  repositories.PortfolioRepository
}

func NewTradeHandler(
	tradeRepo repositories.TradeRepository,
	bubbleRepo repositories.BubbleRepository,
	userSymbolRepo repositories.UserSymbolRepository,
	portfolioRepo repositories.PortfolioRepository,
) *TradeHandler {
	return &TradeHandler{
		tradeRepo:      tradeRepo,
		bubbleRepo:     bubbleRepo,
		userSymbolRepo: userSymbolRepo,
		portfolioRepo:  portfolioRepo,
	}
}

type TradeItem struct {
	ID             string  `json:"id"`
	BubbleID       *string `json:"bubble_id,omitempty"`
	Exchange       string  `json:"exchange"`
	Symbol         string  `json:"symbol"`
	Side           string  `json:"side"`
	PositionSide   *string `json:"position_side,omitempty"`
	OpenClose      *string `json:"open_close,omitempty"`
	ReduceOnly     *bool   `json:"reduce_only,omitempty"`
	Quantity       string  `json:"quantity"`
	Price          string  `json:"price"`
	RealizedPnL    *string `json:"realized_pnl,omitempty"`
	TradeTime      string  `json:"trade_time"`
	BinanceTradeID int64   `json:"binance_trade_id"`
}

type TradeListResponse struct {
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
	Total int         `json:"total"`
	Items []TradeItem `json:"items"`
}

type TradeImportResponse struct {
	Imported int `json:"imported"`
	Skipped  int `json:"skipped"`
}

type TradeConvertResponse struct {
	Created int `json:"created"`
	Skipped int `json:"skipped"`
}

type TradeSummaryResponse struct {
	Exchange   string                              `json:"exchange"`
	Totals     repositories.TradeSummary           `json:"totals"`
	ByExchange []repositories.TradeExchangeSummary `json:"by_exchange"`
	BySide     []repositories.TradeSideSummary     `json:"by_side"`
	BySymbol   []repositories.TradeSymbolSummary   `json:"by_symbol"`
}

func (h *TradeHandler) List(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	exchange := strings.TrimSpace(c.Query("exchange"))
	if exchange != "" {
		if _, ok := allowedExchanges[exchange]; !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_EXCHANGE", "message": "unsupported exchange"})
		}
	}

	page, limit, err := parsePageLimit(c.Query("page"), c.Query("limit"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	symbol := strings.ToUpper(strings.TrimSpace(c.Query("symbol")))
	side := strings.ToUpper(strings.TrimSpace(c.Query("side")))
	if side != "" && side != "BUY" && side != "SELL" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "side is invalid"})
	}

	from, err := parseTimeQuery(c.Query("from"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "from is invalid"})
	}
	to, err := parseTimeQuery(c.Query("to"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "to is invalid"})
	}

	filter := repositories.TradeFilter{
		Exchange: exchange,
		Symbol:   symbol,
		Side:     side,
		From:     from,
		To:       to,
		Limit:    limit,
		Offset:   (page - 1) * limit,
		Sort:     strings.ToLower(strings.TrimSpace(c.Query("sort"))),
	}

	trades, total, err := h.tradeRepo.List(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]TradeItem, 0, len(trades))
	for _, trade := range trades {
		item := TradeItem{
			ID:             trade.ID.String(),
			Exchange:       trade.Exchange,
			Symbol:         trade.Symbol,
			Side:           trade.Side,
			PositionSide:   trade.PositionSide,
			OpenClose:      trade.OpenClose,
			ReduceOnly:     trade.ReduceOnly,
			Quantity:       trade.Quantity,
			Price:          trade.Price,
			RealizedPnL:    trade.RealizedPnL,
			TradeTime:      trade.TradeTime.Format(time.RFC3339),
			BinanceTradeID: trade.BinanceTradeID,
		}
		if trade.BubbleID != nil {
			id := trade.BubbleID.String()
			item.BubbleID = &id
		}
		items = append(items, item)
	}

	return c.Status(200).JSON(TradeListResponse{Page: page, Limit: limit, Total: total, Items: items})
}

func (h *TradeHandler) Summary(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	exchange := strings.TrimSpace(c.Query("exchange"))
	if exchange != "" {
		if _, ok := allowedExchanges[exchange]; !ok {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_EXCHANGE", "message": "unsupported exchange"})
		}
	}

	symbol := strings.ToUpper(strings.TrimSpace(c.Query("symbol")))
	side := strings.ToUpper(strings.TrimSpace(c.Query("side")))
	if side != "" && side != "BUY" && side != "SELL" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "side is invalid"})
	}

	from, err := parseTimeQuery(c.Query("from"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "from is invalid"})
	}
	to, err := parseTimeQuery(c.Query("to"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "to is invalid"})
	}

	filter := repositories.TradeFilter{
		Exchange: exchange,
		Symbol:   symbol,
		Side:     side,
		From:     from,
		To:       to,
	}

	totals, bySide, bySymbol, err := h.tradeRepo.Summary(c.Context(), userID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	var byExchange []repositories.TradeExchangeSummary
	if exchange == "" {
		byExchange, err = h.tradeRepo.SummaryByExchange(c.Context(), userID, filter)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
	} else {
		byExchange = []repositories.TradeExchangeSummary{
			{
				Exchange:         exchange,
				TotalTrades:      totals.TotalTrades,
				RealizedPnLTotal: totals.RealizedPnLTotal,
			},
		}
	}

	response := TradeSummaryResponse{
		Exchange:   exchange,
		Totals:     totals,
		ByExchange: byExchange,
		BySide:     bySide,
		BySymbol:   bySymbol,
	}
	return c.Status(200).JSON(response)
}

func (h *TradeHandler) Import(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "csv file is required"})
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
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "failed to read header"})
	}

	index := mapCsvHeader(header)
	missing := missingCsvColumns(index, []string{"exchange", "symbol", "side", "quantity", "price", "trade_time"})
	if len(missing) > 0 {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "missing columns: " + strings.Join(missing, ", ")})
	}

	imported := 0
	skipped := 0
	for {
		row, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "failed to read csv"})
		}

		payload, err := parseCsvTradeRow(row, index)
		if err != nil {
			skipped += 1
			continue
		}

		bubble := &entities.Bubble{
			ID:         uuid.New(),
			UserID:     userID,
			Symbol:     payload.Symbol,
			Timeframe:  payload.Timeframe,
			CandleTime: floorToTimeframe(payload.TradeTime, payload.Timeframe),
			Price:      payload.Price,
			BubbleType: "auto",
			AssetClass: normalizeOptionalLabelPtr("crypto"),
			VenueName:  normalizeOptionalLabelPtr(payload.Exchange),
			Memo:       payload.Memo,
			Tags:       payload.Tags,
			CreatedAt:  time.Now().UTC(),
		}

		if err := h.bubbleRepo.Create(c.Context(), bubble); err != nil {
			skipped += 1
			continue
		}

		trade := &entities.Trade{
			ID:             uuid.New(),
			UserID:         userID,
			BubbleID:       &bubble.ID,
			BinanceTradeID: payload.TradeID,
			Exchange:       payload.Exchange,
			Symbol:         payload.Symbol,
			Side:           payload.Side,
			Quantity:       payload.Quantity,
			Price:          payload.Price,
			RealizedPnL:    payload.RealizedPnL,
			TradeTime:      payload.TradeTime,
		}

		if err := h.tradeRepo.Create(c.Context(), trade); err != nil {
			if isUniqueViolation(err) {
				_, _ = h.bubbleRepo.DeleteByIDAndUser(c.Context(), bubble.ID, userID)
				skipped += 1
				continue
			}
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}

		if h.portfolioRepo != nil {
			if err := h.syncTradeEventFromCSV(c.Context(), userID, payload, trade); err != nil {
				// Keep CSV import resilient; log and continue.
				fmt.Printf("trade import: trade_event sync failed user=%s exchange=%s trade=%s err=%v\n", userID.String(), payload.Exchange, trade.ID.String(), err)
			}
		}

		imported += 1
	}

	return c.Status(200).JSON(TradeImportResponse{Imported: imported, Skipped: skipped})
}

func (h *TradeHandler) ConvertBubbles(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	limit := 500
	if limitStr := strings.TrimSpace(c.Query("limit")); limitStr != "" {
		parsed, err := strconv.Atoi(limitStr)
		if err != nil || parsed <= 0 {
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "limit is invalid"})
		}
		if parsed > 2000 {
			parsed = 2000
		}
		limit = parsed
	}

	defaultTimeframe := strings.ToLower(strings.TrimSpace(c.Query("default_timeframe")))
	if defaultTimeframe == "" {
		defaultTimeframe = "1d"
	}
	if defaultTimeframe != "1m" && defaultTimeframe != "15m" && defaultTimeframe != "1h" && defaultTimeframe != "4h" && defaultTimeframe != "1d" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "default_timeframe is invalid"})
	}

	symbols, err := h.userSymbolRepo.ListByUser(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	symbolTimeframes := map[string]string{}
	for _, symbol := range symbols {
		symbolTimeframes[symbol.Symbol] = symbol.TimeframeDefault
	}

	created := 0
	skipped := 0
	for {
		trades, err := h.tradeRepo.ListUnlinked(c.Context(), userID, limit)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		if len(trades) == 0 {
			break
		}

		for _, trade := range trades {
			if trade.BubbleID != nil {
				skipped += 1
				continue
			}

			timeframe := symbolTimeframes[trade.Symbol]
			if timeframe == "" {
				timeframe = defaultTimeframe
			}

			memo := fmt.Sprintf("Trade sync: %s %s @ %s", trade.Symbol, trade.Side, trade.Price)
			memoPtr := &memo
			tags := buildSideTags(trade.Side, "")

			bubble := &entities.Bubble{
				ID:         uuid.New(),
				UserID:     trade.UserID,
				Symbol:     trade.Symbol,
				Timeframe:  timeframe,
				CandleTime: floorToTimeframe(trade.TradeTime, timeframe),
				Price:      trade.Price,
				BubbleType: "auto",
				AssetClass: normalizeOptionalLabelPtr("crypto"),
				VenueName:  normalizeOptionalLabelPtr(trade.Exchange),
				Memo:       memoPtr,
				Tags:       tags,
				CreatedAt:  time.Now().UTC(),
			}

			if err := h.bubbleRepo.Create(c.Context(), bubble); err != nil {
				skipped += 1
				continue
			}

			if err := h.tradeRepo.UpdateBubbleID(c.Context(), trade.ID, bubble.ID); err != nil {
				_, _ = h.bubbleRepo.DeleteByIDAndUser(c.Context(), bubble.ID, userID)
				return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
			}

			created += 1
		}
	}

	return c.Status(200).JSON(TradeConvertResponse{Created: created, Skipped: skipped})
}

func (h *TradeHandler) BackfillBubbles(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	updated, err := h.tradeRepo.BackfillBubbleMetadata(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"updated": updated})
}

type csvTradePayload struct {
	Exchange    string
	Symbol      string
	Side        string
	Quantity    string
	Price       string
	RealizedPnL *string
	TradeTime   time.Time
	Timeframe   string
	Tags        []string
	Memo        *string
	TradeID     int64
}

func mapCsvHeader(header []string) map[string]int {
	index := make(map[string]int)
	for i, name := range header {
		trimmed := strings.ToLower(strings.TrimSpace(name))
		if trimmed == "" {
			continue
		}
		index[trimmed] = i
	}
	return index
}

func normalizeOptionalLabelPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	normalized := strings.ToLower(trimmed)
	return &normalized
}

func missingCsvColumns(index map[string]int, columns []string) []string {
	missing := []string{}
	for _, column := range columns {
		if _, ok := index[column]; !ok {
			missing = append(missing, column)
		}
	}
	return missing
}

func parseCsvTradeRow(row []string, index map[string]int) (csvTradePayload, error) {
	get := func(key string) string {
		idx, ok := index[key]
		if !ok || idx >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[idx])
	}

	exchange := strings.ToLower(get("exchange"))
	if exchange == "" || (exchange != "binance_futures" && exchange != "upbit") {
		return csvTradePayload{}, errors.New("invalid exchange")
	}

	symbol := strings.ToUpper(get("symbol"))
	if !csvSymbolPattern.MatchString(symbol) {
		return csvTradePayload{}, errors.New("invalid symbol")
	}

	side := normalizeCsvSide(get("side"))
	if side == "" {
		return csvTradePayload{}, errors.New("invalid side")
	}

	quantity := get("quantity")
	price := get("price")
	if quantity == "" || price == "" {
		return csvTradePayload{}, errors.New("missing quantity or price")
	}

	tradeTime, err := time.Parse(time.RFC3339, get("trade_time"))
	if err != nil {
		return csvTradePayload{}, errors.New("invalid trade_time")
	}

	var realizedPnL *string
	if value := get("realized_pnl"); value != "" {
		pnl := value
		realizedPnL = &pnl
	}

	tradeID := deriveCsvTradeID(exchange, symbol, side, quantity, price, tradeTime, realizedPnL)
	annotation := fmt.Sprintf("CSV import: %s %s @ %s", symbol, side, price)
	annotationPtr := &annotation

	return csvTradePayload{
		Exchange:    exchange,
		Symbol:      symbol,
		Side:        side,
		Quantity:    quantity,
		Price:       price,
		RealizedPnL: realizedPnL,
		TradeTime:   tradeTime,
		Timeframe:   normalizeCsvTimeframe(get("timeframe")),
		Tags:        buildSideTags(side, get("tags")),
		Memo:        annotationPtr,
		TradeID:     tradeID,
	}, nil
}

var csvSymbolPattern = regexp.MustCompile(`^[A-Z0-9-]{3,20}$`)

func normalizeCsvSide(value string) string {
	trimmed := strings.ToLower(strings.TrimSpace(value))
	switch trimmed {
	case "buy", "bid":
		return "BUY"
	case "sell", "ask":
		return "SELL"
	default:
		return ""
	}
}

func normalizeCsvTimeframe(value string) string {
	trimmed := strings.ToLower(strings.TrimSpace(value))
	switch trimmed {
	case "1m", "15m", "1h", "4h", "1d":
		return trimmed
	default:
		return "1d"
	}
}

func buildSideTags(side string, rawTags string) []string {
	tags := []string{}
	for _, value := range strings.Split(rawTags, ",") {
		trimmed := strings.ToLower(strings.TrimSpace(value))
		if trimmed == "" {
			continue
		}
		tags = append(tags, trimmed)
	}
	if side == "BUY" {
		tags = append(tags, "buy")
	}
	if side == "SELL" {
		tags = append(tags, "sell")
	}
	return tags
}

func deriveCsvTradeID(exchange string, symbol string, side string, quantity string, price string, tradeTime time.Time, pnl *string) int64 {
	value := exchange + "|" + symbol + "|" + side + "|" + quantity + "|" + price + "|" + tradeTime.Format(time.RFC3339)
	if pnl != nil {
		value = value + "|" + *pnl
	}
	hasher := fnv.New64a()
	_, _ = hasher.Write([]byte(value))
	return int64(hasher.Sum64())
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func floorToTimeframe(timeValue time.Time, timeframe string) time.Time {
	utc := timeValue.UTC()
	switch timeframe {
	case "1d":
		return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
	case "4h":
		hour := (utc.Hour() / 4) * 4
		return time.Date(utc.Year(), utc.Month(), utc.Day(), hour, 0, 0, 0, time.UTC)
	case "1h":
		return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), 0, 0, 0, time.UTC)
	case "15m":
		minute := (utc.Minute() / 15) * 15
		return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), minute, 0, 0, time.UTC)
	default:
		return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), utc.Minute(), 0, 0, time.UTC)
	}
}

func parseTimeQuery(value string) (*time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, nil
	}
	layouts := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02",
	}
	var parsed time.Time
	var err error
	for _, layout := range layouts {
		parsed, err = time.Parse(layout, trimmed)
		if err == nil {
			return &parsed, nil
		}
	}
	return nil, err
}

func (h *TradeHandler) syncTradeEventFromCSV(ctx context.Context, userID uuid.UUID, payload csvTradePayload, trade *entities.Trade) error {
	if trade == nil {
		return fmt.Errorf("trade is nil")
	}

	venueCode, venueType, venueName := resolveVenueFromExchange(payload.Exchange)
	venueID, err := h.portfolioRepo.UpsertVenue(ctx, venueCode, venueType, venueName, "")
	if err != nil {
		return err
	}

	base, quote, normalizedSymbol := parseInstrumentSymbol(payload.Symbol, venueCode)
	instrumentID, err := h.portfolioRepo.UpsertInstrument(ctx, "crypto", base, quote, normalizedSymbol)
	if err != nil {
		return err
	}
	_ = h.portfolioRepo.UpsertInstrumentMapping(ctx, instrumentID, venueID, payload.Symbol)

	accountID, err := h.portfolioRepo.UpsertAccount(ctx, userID, venueID, "csv-import", nil, "csv")
	if err != nil {
		return err
	}

	side := strings.ToLower(strings.TrimSpace(payload.Side))
	if side == "" {
		side = "buy"
	}
	qty := normalizeOptionalLiteral(payload.Quantity)
	price := normalizeOptionalLiteral(payload.Price)

	externalID := ""
	if payload.TradeID != 0 {
		externalID = fmt.Sprintf("%d", payload.TradeID)
	} else {
		externalID = trade.ID.String()
	}

	eventType := resolveEventType(payload.Exchange)
	record := &portfolioTradeEventRecord{
		Symbol:     normalizedSymbol,
		EventType:  eventType,
		Side:       &side,
		Qty:        qty,
		Price:      price,
		ExecutedAt: payload.TradeTime,
		ExternalID: &externalID,
	}
	dedupe := buildTradeEventDedupeKey(venueCode, "crypto", record)

	metadata := map[string]string{
		"trade_id": trade.ID.String(),
		"exchange": payload.Exchange,
	}
	metadataRaw, _ := json.Marshal(metadata)
	raw := json.RawMessage(metadataRaw)

	event := &entities.TradeEvent{
		ID:           uuid.New(),
		UserID:       userID,
		AccountID:    &accountID,
		VenueID:      &venueID,
		InstrumentID: &instrumentID,
		AssetClass:   "crypto",
		VenueType:    venueType,
		EventType:    eventType,
		Side:         &side,
		Qty:          qty,
		Price:        price,
		ExecutedAt:   payload.TradeTime,
		Source:       "csv",
		ExternalID:   &externalID,
		Metadata:     &raw,
		DedupeKey:    &dedupe,
	}

	if err := h.portfolioRepo.CreateTradeEvent(ctx, event); err != nil {
		if isUniqueViolationError(err) {
			return nil
		}
		return err
	}
	return nil
}

type LinkTradeRequest struct {
	TradeID  string `json:"trade_id"`
	BubbleID string `json:"bubble_id"`
}

type UnlinkTradeRequest struct {
	TradeID string `json:"trade_id"`
}

// LinkToBubble links a trade to a bubble
func (h *TradeHandler) LinkToBubble(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req LinkTradeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid request body"})
	}

	tradeID, err := uuid.Parse(req.TradeID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid trade_id"})
	}

	bubbleID, err := uuid.Parse(req.BubbleID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid bubble_id"})
	}

	// Verify trade belongs to user
	trade, err := h.tradeRepo.GetByID(c.Context(), tradeID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "trade not found"})
	}
	if trade.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "trade does not belong to user"})
	}

	// Verify bubble belongs to user
	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "bubble does not belong to user"})
	}

	// Link trade to bubble
	if err := h.tradeRepo.UpdateBubbleID(c.Context(), tradeID, bubbleID); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"success": true, "trade_id": tradeID.String(), "bubble_id": bubbleID.String()})
}

// UnlinkFromBubble unlinks a trade from its bubble
func (h *TradeHandler) UnlinkFromBubble(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req UnlinkTradeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid request body"})
	}

	tradeID, err := uuid.Parse(req.TradeID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid trade_id"})
	}

	// Verify trade belongs to user
	trade, err := h.tradeRepo.GetByID(c.Context(), tradeID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "trade not found"})
	}
	if trade.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "trade does not belong to user"})
	}

	// Unlink trade from bubble
	if err := h.tradeRepo.ClearBubbleID(c.Context(), tradeID); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"success": true, "trade_id": tradeID.String()})
}

// ListByBubble returns trades linked to a specific bubble
func (h *TradeHandler) ListByBubble(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	bubbleID, err := uuid.Parse(c.Params("bubbleId"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "invalid bubble_id"})
	}

	// Verify bubble belongs to user
	bubble, err := h.bubbleRepo.GetByID(c.Context(), bubbleID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"code": "NOT_FOUND", "message": "bubble not found"})
	}
	if bubble.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "bubble does not belong to user"})
	}

	trades, err := h.tradeRepo.ListByBubble(c.Context(), bubbleID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	items := make([]TradeItem, 0, len(trades))
	for _, trade := range trades {
		item := TradeItem{
			ID:             trade.ID.String(),
			Exchange:       trade.Exchange,
			Symbol:         trade.Symbol,
			Side:           trade.Side,
			Quantity:       trade.Quantity,
			Price:          trade.Price,
			RealizedPnL:    trade.RealizedPnL,
			TradeTime:      trade.TradeTime.Format(time.RFC3339),
			BinanceTradeID: trade.BinanceTradeID,
		}
		if trade.BubbleID != nil {
			id := trade.BubbleID.String()
			item.BubbleID = &id
		}
		items = append(items, item)
	}

	return c.Status(200).JSON(fiber.Map{"trades": items})
}
```

## File: internal/interfaces/http/handlers/user_handler.go
```go
package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type UserHandler struct {
	userRepo         repositories.UserRepository
	subscriptionRepo repositories.SubscriptionRepository
}

func NewUserHandler(
	userRepo repositories.UserRepository,
	subscriptionRepo repositories.SubscriptionRepository,
) *UserHandler {
	return &UserHandler{
		userRepo:         userRepo,
		subscriptionRepo: subscriptionRepo,
	}
}

type SubscriptionInfo struct {
	Tier             string     `json:"tier"`
	AIQuotaRemaining int        `json:"ai_quota_remaining"`
	AIQuotaLimit     int        `json:"ai_quota_limit"`
	LastResetAt      *time.Time `json:"last_reset_at,omitempty"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
}

type UserProfileResponse struct {
	ID            uuid.UUID         `json:"id"`
	Email         string            `json:"email"`
	Name          string            `json:"name"`
	AIAllowlisted bool              `json:"ai_allowlisted"`
	CreatedAt     time.Time         `json:"created_at"`
	Subscription  *SubscriptionInfo `json:"subscription,omitempty"`
}

type UpdateProfileRequest struct {
	Name string `json:"name"`
}

type SubscriptionResponse struct {
	Tier             string     `json:"tier"`
	AIQuotaRemaining int        `json:"ai_quota_remaining"`
	AIQuotaLimit     int        `json:"ai_quota_limit"`
	LastResetAt      *time.Time `json:"last_reset_at,omitempty"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
}

// GetProfile returns the authenticated user's profile with subscription info
func (h *UserHandler) GetProfile(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	user, err := h.userRepo.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if user == nil {
		return c.Status(404).JSON(fiber.Map{"code": "USER_NOT_FOUND", "message": "user not found"})
	}

	subscription, err := h.subscriptionRepo.GetByUserID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	var subInfo *SubscriptionInfo
	if subscription != nil {
		subInfo = &SubscriptionInfo{
			Tier:             subscription.Tier,
			AIQuotaRemaining: subscription.AIQuotaRemaining,
			AIQuotaLimit:     subscription.AIQuotaLimit,
			LastResetAt:      &subscription.LastResetAt,
			ExpiresAt:        subscription.ExpiresAt,
		}
	}

	response := UserProfileResponse{
		ID:            user.ID,
		Email:         user.Email,
		Name:          user.Name,
		AIAllowlisted: user.AIAllowlisted,
		CreatedAt:     user.CreatedAt,
		Subscription:  subInfo,
	}

	return c.Status(200).JSON(response)
}

// UpdateProfile updates the authenticated user's profile (name only)
func (h *UserHandler) UpdateProfile(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": err.Error()})
	}

	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"code": "INVALID_REQUEST", "message": "name is required"})
	}

	user, err := h.userRepo.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if user == nil {
		return c.Status(404).JSON(fiber.Map{"code": "USER_NOT_FOUND", "message": "user not found"})
	}

	user.Name = req.Name
	user.UpdatedAt = time.Now()

	if err := h.userRepo.Update(c.Context(), user); err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	subscription, err := h.subscriptionRepo.GetByUserID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}

	var subInfo *SubscriptionInfo
	if subscription != nil {
		subInfo = &SubscriptionInfo{
			Tier:             subscription.Tier,
			AIQuotaRemaining: subscription.AIQuotaRemaining,
			LastResetAt:      &subscription.LastResetAt,
			ExpiresAt:        subscription.ExpiresAt,
		}
	}

	response := UserProfileResponse{
		ID:            user.ID,
		Email:         user.Email,
		Name:          user.Name,
		AIAllowlisted: user.AIAllowlisted,
		CreatedAt:     user.CreatedAt,
		Subscription:  subInfo,
	}

	return c.Status(200).JSON(response)
}

// GetSubscription returns the authenticated user's subscription details
func (h *UserHandler) GetSubscription(c *fiber.Ctx) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
	}

	subscription, err := h.subscriptionRepo.GetByUserID(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
	}
	if subscription == nil {
		return c.Status(404).JSON(fiber.Map{"code": "SUBSCRIPTION_NOT_FOUND", "message": "subscription not found"})
	}

	response := SubscriptionResponse{
		Tier:             subscription.Tier,
		AIQuotaRemaining: subscription.AIQuotaRemaining,
		AIQuotaLimit:     subscription.AIQuotaLimit,
		LastResetAt:      &subscription.LastResetAt,
		ExpiresAt:        subscription.ExpiresAt,
	}

	return c.Status(200).JSON(response)
}
```

## File: internal/interfaces/http/middleware/rate_limit.go
```go
package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/time/rate"
)

type UserRateLimiter struct {
	mu       sync.Mutex
	limiters map[uuid.UUID]*rate.Limiter
	lastSeen map[uuid.UUID]time.Time
	rate     rate.Limit
	burst    int
}

func NewUserRateLimiter(limit rate.Limit, burst int) *UserRateLimiter {
	return &UserRateLimiter{
		limiters: make(map[uuid.UUID]*rate.Limiter),
		lastSeen: make(map[uuid.UUID]time.Time),
		rate:     limit,
		burst:    burst,
	}
}

func (u *UserRateLimiter) getLimiter(userID uuid.UUID) *rate.Limiter {
	u.mu.Lock()
	defer u.mu.Unlock()

	limiter, ok := u.limiters[userID]
	if !ok {
		limiter = rate.NewLimiter(u.rate, u.burst)
		u.limiters[userID] = limiter
	}
	u.lastSeen[userID] = time.Now()

	// Cleanup stale entries (simple guard to avoid unbounded growth)
	if len(u.lastSeen) > 1000 {
		cutoff := time.Now().Add(-2 * time.Hour)
		for id, last := range u.lastSeen {
			if last.Before(cutoff) {
				delete(u.lastSeen, id)
				delete(u.limiters, id)
			}
		}
	}

	return limiter
}

func (u *UserRateLimiter) Allow(userID uuid.UUID) bool {
	return u.getLimiter(userID).Allow()
}

func RateLimit(limiter *UserRateLimiter) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(uuid.UUID)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED"})
		}
		if limiter == nil || !limiter.Allow(userID) {
			return c.Status(429).JSON(fiber.Map{"code": "RATE_LIMITED", "message": "too many requests"})
		}
		return c.Next()
	}
}
```

## File: internal/interfaces/http/routes.go
```go
package http

import (
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/notification"
	"github.com/moneyvessel/kifu/internal/interfaces/http/handlers"
	"github.com/moneyvessel/kifu/internal/interfaces/http/middleware"
	"github.com/moneyvessel/kifu/internal/services"
	"golang.org/x/time/rate"
)

func RegisterRoutes(
	app *fiber.App,
	pool *pgxpool.Pool,
	userRepo repositories.UserRepository,
	refreshTokenRepo repositories.RefreshTokenRepository,
	subscriptionRepo repositories.SubscriptionRepository,
	exchangeRepo repositories.ExchangeCredentialRepository,
	userSymbolRepo repositories.UserSymbolRepository,
	bubbleRepo repositories.BubbleRepository,
	tradeRepo repositories.TradeRepository,
	aiOpinionRepo repositories.AIOpinionRepository,
	aiProviderRepo repositories.AIProviderRepository,
	userAIKeyRepo repositories.UserAIKeyRepository,
	outcomeRepo repositories.OutcomeRepository,
	accuracyRepo repositories.AIOpinionAccuracyRepository,
	noteRepo repositories.ReviewNoteRepository,
	alertRuleRepo repositories.AlertRuleRepository,
	alertRepo repositories.AlertRepository,
	alertBriefingRepo repositories.AlertBriefingRepository,
	alertDecisionRepo repositories.AlertDecisionRepository,
	alertOutcomeRepo repositories.AlertOutcomeRepository,
	channelRepo repositories.NotificationChannelRepository,
	verifyCodeRepo repositories.TelegramVerifyCodeRepository,
	tgSender *notification.TelegramSender,
	tgBotUsername string,
	portfolioRepo repositories.PortfolioRepository,
	manualPositionRepo repositories.ManualPositionRepository,
	safetyRepo repositories.TradeSafetyReviewRepository,
	guidedReviewRepo repositories.GuidedReviewRepository,
	exchangeSyncer handlers.ExchangeSyncer,
	encryptionKey []byte,
	jwtSecret string,
	runRepo repositories.RunRepository,
	summaryPackRepo repositories.SummaryPackRepository,
	summaryPackService *services.SummaryPackService,
) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "healthy"})
	})

	authHandler := handlers.NewAuthHandler(userRepo, refreshTokenRepo, subscriptionRepo, jwtSecret)
	userHandler := handlers.NewUserHandler(userRepo, subscriptionRepo)
	exchangeHandler := handlers.NewExchangeHandler(exchangeRepo, tradeRepo, encryptionKey, exchangeSyncer, runRepo)
	marketHandler := handlers.NewMarketHandler(userSymbolRepo)
	bubbleHandler := handlers.NewBubbleHandler(bubbleRepo)
	tradeHandler := handlers.NewTradeHandler(tradeRepo, bubbleRepo, userSymbolRepo, portfolioRepo)
	aiHandler := handlers.NewAIHandler(bubbleRepo, aiOpinionRepo, aiProviderRepo, userAIKeyRepo, userRepo, subscriptionRepo, encryptionKey)
	outcomeHandler := handlers.NewOutcomeHandler(bubbleRepo, outcomeRepo)
	similarHandler := handlers.NewSimilarHandler(bubbleRepo)
	reviewHandler := handlers.NewReviewHandler(bubbleRepo, outcomeRepo, accuracyRepo)
	noteHandler := handlers.NewNoteHandler(noteRepo)
	exportHandler := handlers.NewExportHandler(bubbleRepo, outcomeRepo, accuracyRepo)
	alertRuleHandler := handlers.NewAlertRuleHandler(alertRuleRepo)
	alertNotifHandler := handlers.NewAlertNotificationHandler(alertRepo, alertBriefingRepo, alertDecisionRepo, alertOutcomeRepo)
	notificationHandler := handlers.NewNotificationHandler(channelRepo, verifyCodeRepo, tgSender, tgBotUsername)
	portfolioHandler := handlers.NewPortfolioHandler(portfolioRepo, tradeRepo)
	importHandler := handlers.NewImportHandler(portfolioRepo, runRepo)
	connectionHandler := handlers.NewConnectionHandler()
	safetyHandler := handlers.NewSafetyHandler(safetyRepo)
	guidedReviewHandler := handlers.NewGuidedReviewHandler(guidedReviewRepo)
	manualPositionHandler := handlers.NewManualPositionHandler(manualPositionRepo)
	packHandler := handlers.NewPackHandler(runRepo, summaryPackRepo, summaryPackService)
	simReportHandler := handlers.NewSimReportHandler(
		pool,
		userRepo,
		subscriptionRepo,
		tradeRepo,
		bubbleRepo,
		guidedReviewRepo,
		noteRepo,
		alertRuleRepo,
		aiProviderRepo,
		userAIKeyRepo,
		userSymbolRepo,
		portfolioRepo,
		manualPositionRepo,
		outcomeRepo,
		aiOpinionRepo,
		accuracyRepo,
	)

	aiRPM := parseIntFromEnv("AI_RATE_LIMIT_RPM", 3)
	if aiRPM < 1 {
		aiRPM = 3
	}
	aiBurst := parseIntFromEnv("AI_RATE_LIMIT_BURST", 2)
	if aiBurst < 1 {
		aiBurst = 2
	}
	aiRateLimiter := middleware.NewUserRateLimiter(rate.Every(time.Minute/time.Duration(aiRPM)), aiBurst)

	api := app.Group("/api/v1")
	auth := api.Group("/auth")

	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.Refresh)
	auth.Post("/logout", authHandler.Logout)

	users := api.Group("/users")
	users.Get("/me", userHandler.GetProfile)
	users.Put("/me", userHandler.UpdateProfile)
	users.Get("/me/subscription", userHandler.GetSubscription)
	users.Get("/me/symbols", marketHandler.GetUserSymbols)
	users.Put("/me/symbols", marketHandler.UpdateUserSymbols)
	users.Get("/me/ai-keys", aiHandler.GetUserAIKeys)
	users.Put("/me/ai-keys", aiHandler.UpdateUserAIKeys)
	users.Delete("/me/ai-keys/:provider", aiHandler.DeleteUserAIKey)

	exchanges := api.Group("/exchanges")
	exchanges.Post("/", exchangeHandler.Register)
	exchanges.Get("/", exchangeHandler.List)
	exchanges.Delete("/:id", exchangeHandler.Delete)
	exchanges.Post("/:id/test", exchangeHandler.Test)
	exchanges.Post("/:id/sync", exchangeHandler.Sync)

	market := api.Group("/market")
	market.Get("/klines", marketHandler.GetKlines)

	bubbles := api.Group("/bubbles")
	bubbles.Post("/", bubbleHandler.Create)
	bubbles.Get("/", bubbleHandler.List)
	bubbles.Get("/:id", bubbleHandler.GetByID)
	bubbles.Put("/:id", bubbleHandler.Update)
	bubbles.Delete("/:id", bubbleHandler.Delete)
	bubbles.Get("/:id/outcomes", outcomeHandler.ListByBubble)
	bubbles.Get("/:id/similar", similarHandler.SimilarByBubble)
	bubbles.Get("/search", similarHandler.Search)

	bubbleAI := api.Group("/bubbles")
	bubbleAI.Post("/:id/ai-opinions", middleware.RateLimit(aiRateLimiter), aiHandler.RequestOpinions)
	bubbleAI.Get("/:id/ai-opinions", aiHandler.ListOpinions)

	ai := api.Group("/ai")
	ai.Post("/one-shot", middleware.RateLimit(aiRateLimiter), aiHandler.RequestOneShot)

	trades := api.Group("/trades")
	trades.Post("/import", tradeHandler.Import)
	trades.Get("/", tradeHandler.List)
	trades.Get("/summary", tradeHandler.Summary)
	trades.Post("/convert-bubbles", tradeHandler.ConvertBubbles)
	trades.Post("/backfill-bubbles", tradeHandler.BackfillBubbles)
	trades.Post("/link", tradeHandler.LinkToBubble)
	trades.Post("/unlink", tradeHandler.UnlinkFromBubble)

	// Trades by bubble
	bubbles.Get("/:bubbleId/trades", tradeHandler.ListByBubble)

	// Review endpoints
	review := api.Group("/review")
	review.Get("/stats", reviewHandler.GetStats)
	review.Get("/accuracy", reviewHandler.GetAccuracy)
	review.Get("/calendar", reviewHandler.GetCalendar)
	review.Get("/trend", reviewHandler.GetTrend)

	// Bubble accuracy endpoint
	bubbles.Get("/:id/accuracy", reviewHandler.GetBubbleAccuracy)

	// Notes endpoints
	notes := api.Group("/notes")
	notes.Post("/", noteHandler.CreateNote)
	notes.Get("/", noteHandler.ListNotes)
	notes.Get("/:id", noteHandler.GetNote)
	notes.Put("/:id", noteHandler.UpdateNote)
	notes.Delete("/:id", noteHandler.DeleteNote)

	// Notes by bubble
	bubbles.Get("/:bubbleId/notes", noteHandler.ListNotesByBubble)

	// Export endpoints
	export := api.Group("/export")
	export.Get("/stats", exportHandler.ExportStats)
	export.Get("/accuracy", exportHandler.ExportAccuracy)
	export.Get("/bubbles", exportHandler.ExportBubbles)

	// Alert Rules
	alertRules := api.Group("/alert-rules")
	alertRules.Post("/", alertRuleHandler.Create)
	alertRules.Get("/", alertRuleHandler.List)
	alertRules.Get("/:id", alertRuleHandler.GetByID)
	alertRules.Put("/:id", alertRuleHandler.Update)
	alertRules.Delete("/:id", alertRuleHandler.Delete)
	alertRules.Patch("/:id/toggle", alertRuleHandler.Toggle)

	// Alerts
	alerts := api.Group("/alerts")
	alerts.Get("/", alertNotifHandler.ListAlerts)
	alerts.Get("/:id", alertNotifHandler.GetAlert)
	alerts.Post("/:id/decision", alertNotifHandler.CreateDecision)
	alerts.Patch("/:id/dismiss", alertNotifHandler.DismissAlert)
	alerts.Get("/:id/outcome", alertNotifHandler.GetOutcome)

	// Notifications
	notif := api.Group("/notifications")
	notif.Post("/telegram/connect", notificationHandler.TelegramConnect)
	notif.Delete("/telegram", notificationHandler.TelegramDisconnect)
	notif.Get("/channels", notificationHandler.ListChannels)

	// Telegram webhook (no auth)
	app.Post("/api/v1/webhook/telegram", notificationHandler.TelegramWebhook)

	// Unified portfolio endpoints
	portfolio := api.Group("/portfolio")
	portfolio.Get("/timeline", portfolioHandler.Timeline)
	portfolio.Get("/positions", portfolioHandler.Positions)
	portfolio.Post("/backfill-bubbles", portfolioHandler.BackfillBubbles)
	portfolio.Post("/backfill-events", portfolioHandler.BackfillEventsFromTrades)

	api.Get("/instruments", portfolioHandler.Instruments)

	manualPositions := api.Group("/manual-positions")
	manualPositions.Get("/", manualPositionHandler.List)
	manualPositions.Post("/", manualPositionHandler.Create)
	manualPositions.Put("/:id", manualPositionHandler.Update)
	manualPositions.Delete("/:id", manualPositionHandler.Delete)

	imports := api.Group("/imports")
	imports.Post("/trades", importHandler.ImportTrades)

	packs := api.Group("/packs")
	packs.Post("/generate", packHandler.Generate)
	packs.Post("/generate-latest", packHandler.GenerateLatest)
	packs.Get("/latest", packHandler.GetLatest)
	packs.Get("/:pack_id", packHandler.GetByID)

	connections := api.Group("/connections")
	connections.Post("/", connectionHandler.Create)

	safety := api.Group("/safety")
	safety.Get("/today", safetyHandler.ListDaily)
	safety.Post("/reviews", safetyHandler.UpsertReview)

	// Guided Review
	guidedReviews := api.Group("/guided-reviews")
	guidedReviews.Get("/today", guidedReviewHandler.GetToday)
	guidedReviews.Post("/items/:id/submit", guidedReviewHandler.SubmitItem)
	guidedReviews.Post("/:id/complete", guidedReviewHandler.CompleteReview)
	guidedReviews.Get("/streak", guidedReviewHandler.GetStreak)

	// Admin sim report (dev/operator diagnostic utility)
	admin := api.Group("/admin")
	admin.Post("/sim-report/run", simReportHandler.Run)
}

func parseIntFromEnv(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return parsed
}
```

## File: internal/jobs/accuracy_calculator.go
```go
package jobs

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/services"
)

type AccuracyCalculator struct {
	outcomeRepo     repositories.OutcomeRepository
	opinionRepo     repositories.AIOpinionRepository
	accuracyRepo    repositories.AIOpinionAccuracyRepository
	extractor       *services.DirectionExtractor
	processedPeriod time.Duration
}

func NewAccuracyCalculator(
	outcomeRepo repositories.OutcomeRepository,
	opinionRepo repositories.AIOpinionRepository,
	accuracyRepo repositories.AIOpinionAccuracyRepository,
) *AccuracyCalculator {
	return &AccuracyCalculator{
		outcomeRepo:     outcomeRepo,
		opinionRepo:     opinionRepo,
		accuracyRepo:    accuracyRepo,
		extractor:       services.NewDirectionExtractor(),
		processedPeriod: 48 * time.Hour, // Look back 48 hours for unprocessed outcomes
	}
}

func (c *AccuracyCalculator) Start(ctx context.Context) {
	ticker := time.NewTicker(90 * time.Second) // Run every 90 seconds (offset from outcome calc)
	go func() {
		defer ticker.Stop()
		// Run once immediately
		c.runOnce(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				c.runOnce(ctx)
			}
		}
	}()
}

func (c *AccuracyCalculator) runOnce(ctx context.Context) {
	// Find outcomes created in the last 48 hours that don't have accuracy records
	since := time.Now().Add(-c.processedPeriod)
	outcomes, err := c.outcomeRepo.ListRecentWithoutAccuracy(ctx, since, 100)
	if err != nil {
		log.Printf("accuracy calc: list recent outcomes failed: %v", err)
		return
	}

	for _, outcome := range outcomes {
		if err := c.processOutcome(ctx, outcome); err != nil {
			log.Printf("accuracy calc: process outcome %s failed: %v", outcome.ID, err)
		}
	}
}

func (c *AccuracyCalculator) processOutcome(ctx context.Context, outcome *entities.Outcome) error {
	// Get all AI opinions for this bubble
	opinions, err := c.opinionRepo.ListByBubble(ctx, outcome.BubbleID)
	if err != nil {
		return err
	}

	if len(opinions) == 0 {
		return nil // No opinions to evaluate
	}

	// Determine actual direction from PnL
	actualDirection := services.DetermineActualDirection(outcome.PnLPercent)

	for _, opinion := range opinions {
		// Check if already processed
		exists, err := c.accuracyRepo.ExistsByOpinionAndOutcome(ctx, opinion.ID, outcome.ID)
		if err != nil {
			log.Printf("accuracy calc: check exists failed: %v", err)
			continue
		}
		if exists {
			continue
		}

		// Extract predicted direction from AI response
		predictedDirection := c.extractor.Extract(opinion.Response)

		// Determine if correct
		isCorrect := services.IsCorrect(predictedDirection, actualDirection)

		// Create accuracy record
		accuracy := &entities.AIOpinionAccuracy{
			ID:                 uuid.New(),
			OpinionID:          opinion.ID,
			OutcomeID:          outcome.ID,
			BubbleID:           outcome.BubbleID,
			Provider:           opinion.Provider,
			Period:             outcome.Period,
			PredictedDirection: predictedDirection,
			ActualDirection:    actualDirection,
			IsCorrect:          isCorrect,
			CreatedAt:          time.Now().UTC(),
		}

		if err := c.accuracyRepo.Create(ctx, accuracy); err != nil {
			log.Printf("accuracy calc: create accuracy for opinion %s failed: %v", opinion.ID, err)
		}
	}

	return nil
}
```

## File: internal/jobs/alert_monitor.go
```go
package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AlertMonitor struct {
	ruleRepo     repositories.AlertRuleRepository
	alertRepo    repositories.AlertRepository
	onTrigger    func(ctx context.Context, alert *entities.Alert, rule *entities.AlertRule)
	client       *http.Client
	priceCache   map[string]*priceSnapshot
	priceMu      sync.RWMutex
}

type priceSnapshot struct {
	Price     string
	FetchedAt time.Time
}

func NewAlertMonitor(
	ruleRepo repositories.AlertRuleRepository,
	alertRepo repositories.AlertRepository,
	onTrigger func(ctx context.Context, alert *entities.Alert, rule *entities.AlertRule),
) *AlertMonitor {
	return &AlertMonitor{
		ruleRepo:   ruleRepo,
		alertRepo:  alertRepo,
		onTrigger:  onTrigger,
		client:     &http.Client{Timeout: 10 * time.Second},
		priceCache: make(map[string]*priceSnapshot),
	}
}

func (m *AlertMonitor) Start(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				m.runOnce(ctx)
			}
		}
	}()
}

func (m *AlertMonitor) runOnce(ctx context.Context) {
	rules, err := m.ruleRepo.ListAllActive(ctx)
	if err != nil {
		log.Printf("alert monitor: list rules failed: %v", err)
		return
	}
	if len(rules) == 0 {
		return
	}

	// Group by symbol to minimize API calls
	symbolRules := make(map[string][]*entities.AlertRule)
	for _, rule := range rules {
		if !m.isCooldownPassed(rule) {
			continue
		}
		symbolRules[rule.Symbol] = append(symbolRules[rule.Symbol], rule)
	}

	for symbol, rules := range symbolRules {
		currentPrice, err := m.fetchCurrentPrice(ctx, symbol)
		if err != nil {
			log.Printf("alert monitor: fetch price %s failed: %v", symbol, err)
			continue
		}

		for _, rule := range rules {
			triggered, reason, severity := m.evaluate(ctx, rule, currentPrice, symbol)

			// Always update check state for crossing-based rules (price_level, ma_cross)
			if rule.RuleType == entities.RuleTypePriceLevel || rule.RuleType == entities.RuleTypeMACross {
				state := m.buildCheckState(ctx, currentPrice, rule, symbol)
				stateJSON, _ := json.Marshal(state)
				if !triggered {
					// Save state without updating last_triggered_at
					m.ruleRepo.UpdateCheckState(ctx, rule.ID, stateJSON)
				}
			}

			if !triggered {
				continue
			}

			alert := &entities.Alert{
				ID:            uuid.New(),
				UserID:        rule.UserID,
				RuleID:        rule.ID,
				Symbol:        rule.Symbol,
				TriggerPrice:  currentPrice,
				TriggerReason: reason,
				Severity:      severity,
				Status:        entities.AlertStatusPending,
				CreatedAt:     time.Now().UTC(),
			}

			if err := m.alertRepo.Create(ctx, alert); err != nil {
				log.Printf("alert monitor: create alert failed: %v", err)
				continue
			}

			state := m.buildCheckState(ctx, currentPrice, rule, symbol)
			stateJSON, _ := json.Marshal(state)
			if err := m.ruleRepo.UpdateLastTriggered(ctx, rule.ID, stateJSON); err != nil {
				log.Printf("alert monitor: update triggered failed: %v", err)
			}

			log.Printf("alert monitor: triggered [%s] %s - %s", rule.Symbol, rule.Name, reason)

			if m.onTrigger != nil {
				go m.onTrigger(ctx, alert, rule)
			}
		}
	}

	// Expire old alerts
	cutoff := time.Now().UTC().Add(-24 * time.Hour)
	if expired, err := m.alertRepo.ExpireOlderThan(ctx, cutoff); err != nil {
		log.Printf("alert monitor: expire failed: %v", err)
	} else if expired > 0 {
		log.Printf("alert monitor: expired %d old alerts", expired)
	}
}

func (m *AlertMonitor) evaluate(ctx context.Context, rule *entities.AlertRule, currentPrice string, symbol string) (bool, string, entities.AlertSeverity) {
	switch rule.RuleType {
	case entities.RuleTypePriceChange:
		return m.evalPriceChange(ctx, rule, currentPrice, symbol)
	case entities.RuleTypePriceLevel:
		return m.evalPriceLevel(rule, currentPrice)
	case entities.RuleTypeMACross:
		return m.evalMACross(ctx, rule, currentPrice, symbol)
	case entities.RuleTypeVolatilitySpike:
		return m.evalVolatilitySpike(ctx, rule, currentPrice, symbol)
	default:
		return false, "", entities.AlertSeverityNormal
	}
}

func (m *AlertMonitor) evalPriceChange(ctx context.Context, rule *entities.AlertRule, currentPrice string, symbol string) (bool, string, entities.AlertSeverity) {
	var cfg entities.PriceChangeConfig
	if err := json.Unmarshal(rule.Config, &cfg); err != nil {
		return false, "", entities.AlertSeverityNormal
	}

	refDuration := parseDuration(cfg.Reference)
	refPrice, err := m.fetchHistoricalPrice(ctx, symbol, refDuration)
	if err != nil || refPrice == "" {
		return false, "", entities.AlertSeverityNormal
	}

	cur, ok := parseDecimal(currentPrice)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}
	ref, ok := parseDecimal(refPrice)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}

	diff := new(big.Rat).Sub(cur, ref)
	absDiff := new(big.Rat).Abs(diff)

	threshold, ok := parseDecimal(cfg.ThresholdValue)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}

	if cfg.ThresholdType == "percent" {
		// Convert threshold to absolute: ref * threshold / 100
		pctThreshold := new(big.Rat).Mul(ref, threshold)
		pctThreshold.Quo(pctThreshold, big.NewRat(100, 1))
		threshold = new(big.Rat).Abs(pctThreshold)
	}

	if absDiff.Cmp(threshold) < 0 {
		return false, "", entities.AlertSeverityNormal
	}

	// Check direction
	isDown := diff.Sign() < 0
	if cfg.Direction == "drop" && !isDown {
		return false, "", entities.AlertSeverityNormal
	}
	if cfg.Direction == "rise" && isDown {
		return false, "", entities.AlertSeverityNormal
	}

	pctChange := new(big.Rat).Quo(diff, ref)
	pctChange.Mul(pctChange, big.NewRat(100, 1))

	direction := "상승"
	if isDown {
		direction = "하락"
	}

	reason := fmt.Sprintf("%s %s $%s (%s 대비 %s%%)",
		symbol, direction, formatDecimal(absDiff, 2), cfg.Reference, formatDecimal(pctChange, 2))

	severity := entities.AlertSeverityNormal
	pctAbs := new(big.Rat).Abs(pctChange)
	fivePct := big.NewRat(5, 1)
	if pctAbs.Cmp(fivePct) >= 0 {
		severity = entities.AlertSeverityUrgent
	}

	return true, reason, severity
}

func (m *AlertMonitor) evalPriceLevel(rule *entities.AlertRule, currentPrice string) (bool, string, entities.AlertSeverity) {
	var cfg entities.PriceLevelConfig
	if err := json.Unmarshal(rule.Config, &cfg); err != nil {
		return false, "", entities.AlertSeverityNormal
	}

	cur, ok := parseDecimal(currentPrice)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}
	target, ok := parseDecimal(cfg.Price)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}

	// Check previous state to detect crossing
	var prevState entities.CheckState
	if len(rule.LastCheckState) > 0 {
		_ = json.Unmarshal(rule.LastCheckState, &prevState)
	}

	isAbove := cur.Cmp(target) >= 0

	// Simple threshold check (gte/lte) - no crossing detection needed
	if cfg.Direction == "gte" {
		if !isAbove {
			return false, "", entities.AlertSeverityNormal
		}
		reason := fmt.Sprintf("%s $%s 이상 도달 (현재 $%s)", rule.Symbol, cfg.Price, currentPrice)
		return true, reason, entities.AlertSeverityNormal
	}
	if cfg.Direction == "lte" {
		if isAbove {
			return false, "", entities.AlertSeverityNormal
		}
		reason := fmt.Sprintf("%s $%s 이하 도달 (현재 $%s)", rule.Symbol, cfg.Price, currentPrice)
		return true, reason, entities.AlertSeverityNormal
	}

	// Crossing detection (above/below)
	if prevState.WasAboveLevel == nil {
		// First check, just record state
		return false, "", entities.AlertSeverityNormal
	}

	crossed := false
	if cfg.Direction == "above" && !*prevState.WasAboveLevel && isAbove {
		crossed = true
	}
	if cfg.Direction == "below" && *prevState.WasAboveLevel && !isAbove {
		crossed = true
	}

	if !crossed {
		return false, "", entities.AlertSeverityNormal
	}

	action := "돌파"
	if cfg.Direction == "below" {
		action = "이탈"
	}
	reason := fmt.Sprintf("%s $%s %s (현재 $%s)", rule.Symbol, cfg.Price, action, currentPrice)

	return true, reason, entities.AlertSeverityNormal
}

func (m *AlertMonitor) evalMACross(ctx context.Context, rule *entities.AlertRule, currentPrice string, symbol string) (bool, string, entities.AlertSeverity) {
	var cfg entities.MACrossConfig
	if err := json.Unmarshal(rule.Config, &cfg); err != nil {
		return false, "", entities.AlertSeverityNormal
	}

	ma, err := m.calculateSMA(ctx, symbol, cfg.MATimeframe, cfg.MAPeriod)
	if err != nil || ma == "" {
		return false, "", entities.AlertSeverityNormal
	}

	cur, ok := parseDecimal(currentPrice)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}
	maVal, ok := parseDecimal(ma)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}

	isAbove := cur.Cmp(maVal) >= 0

	var prevState entities.CheckState
	if len(rule.LastCheckState) > 0 {
		_ = json.Unmarshal(rule.LastCheckState, &prevState)
	}

	if prevState.WasAboveMA == nil {
		return false, "", entities.AlertSeverityNormal
	}

	crossed := false
	if cfg.Direction == "below" && *prevState.WasAboveMA && !isAbove {
		crossed = true
	}
	if cfg.Direction == "above" && !*prevState.WasAboveMA && isAbove {
		crossed = true
	}

	if !crossed {
		return false, "", entities.AlertSeverityNormal
	}

	action := "하향 돌파"
	if cfg.Direction == "above" {
		action = "상향 돌파"
	}
	reason := fmt.Sprintf("%s %d일 이평선 %s (MA: $%s, 현재: $%s)",
		symbol, cfg.MAPeriod, action, ma, currentPrice)

	return true, reason, entities.AlertSeverityUrgent
}

func (m *AlertMonitor) evalVolatilitySpike(ctx context.Context, rule *entities.AlertRule, currentPrice string, symbol string) (bool, string, entities.AlertSeverity) {
	var cfg entities.VolatilitySpikeConfig
	if err := json.Unmarshal(rule.Config, &cfg); err != nil {
		return false, "", entities.AlertSeverityNormal
	}

	timeframe := cfg.Timeframe
	if timeframe == "" {
		timeframe = "1h"
	}

	multiplier, ok := parseDecimal(cfg.Multiplier)
	if !ok {
		return false, "", entities.AlertSeverityNormal
	}

	// Fetch 20 recent klines to calculate stddev
	const klineCount = 20
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", timeframe)
	params.Set("limit", fmt.Sprintf("%d", klineCount+1)) // +1 for current candle

	reqURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/klines?%s", params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return false, "", entities.AlertSeverityNormal
	}

	resp, err := m.client.Do(req)
	if err != nil {
		return false, "", entities.AlertSeverityNormal
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, "", entities.AlertSeverityNormal
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return false, "", entities.AlertSeverityNormal
	}

	if len(raw) < klineCount+1 {
		return false, "", entities.AlertSeverityNormal
	}

	// Use all but last candle for stddev baseline, last candle is current
	historical := raw[:len(raw)-1]
	latest := raw[len(raw)-1]

	// Calculate close price changes (absolute) for historical candles
	var changes []*big.Rat
	for _, row := range historical {
		if len(row) < 5 {
			continue
		}
		highStr, ok1 := asString(row[2])
		lowStr, ok2 := asString(row[3])
		if !ok1 || !ok2 {
			continue
		}
		high, ok1 := parseDecimal(highStr)
		low, ok2 := parseDecimal(lowStr)
		if !ok1 || !ok2 {
			continue
		}
		rng := new(big.Rat).Sub(high, low)
		changes = append(changes, rng)
	}

	if len(changes) < 2 {
		return false, "", entities.AlertSeverityNormal
	}

	// Mean of ranges
	sum := new(big.Rat)
	for _, c := range changes {
		sum.Add(sum, c)
	}
	n := int64(len(changes))
	mean := new(big.Rat).Quo(sum, big.NewRat(n, 1))

	// Variance = sum((x - mean)^2) / n
	varSum := new(big.Rat)
	for _, c := range changes {
		diff := new(big.Rat).Sub(c, mean)
		diff2 := new(big.Rat).Mul(diff, diff)
		varSum.Add(varSum, diff2)
	}
	variance := new(big.Rat).Quo(varSum, big.NewRat(n, 1))

	// stddev approximation: use variance comparison instead of sqrt
	// Trigger if (currentRange - mean)^2 > (multiplier * stddev)^2 = multiplier^2 * variance
	if len(latest) < 5 {
		return false, "", entities.AlertSeverityNormal
	}
	latestHighStr, ok1 := asString(latest[2])
	latestLowStr, ok2 := asString(latest[3])
	if !ok1 || !ok2 {
		return false, "", entities.AlertSeverityNormal
	}
	latestHigh, ok1 := parseDecimal(latestHighStr)
	latestLow, ok2 := parseDecimal(latestLowStr)
	if !ok1 || !ok2 {
		return false, "", entities.AlertSeverityNormal
	}

	latestRange := new(big.Rat).Sub(latestHigh, latestLow)
	excess := new(big.Rat).Sub(latestRange, mean)

	// Only trigger if range exceeds mean (i.e., positive excess)
	if excess.Sign() <= 0 {
		return false, "", entities.AlertSeverityNormal
	}

	// Compare excess^2 vs multiplier^2 * variance
	excessSq := new(big.Rat).Mul(excess, excess)
	multSq := new(big.Rat).Mul(multiplier, multiplier)
	threshold := new(big.Rat).Mul(multSq, variance)

	if excessSq.Cmp(threshold) < 0 {
		return false, "", entities.AlertSeverityNormal
	}

	reason := fmt.Sprintf("%s 변동성 급등 감지 (%s 기준, 현재 범위: $%s, 평균: $%s)",
		symbol, timeframe, formatDecimal(latestRange, 2), formatDecimal(mean, 2))

	return true, reason, entities.AlertSeverityUrgent
}

func (m *AlertMonitor) buildCheckState(ctx context.Context, currentPrice string, rule *entities.AlertRule, symbol string) entities.CheckState {
	state := entities.CheckState{LastPrice: currentPrice}

	switch rule.RuleType {
	case entities.RuleTypePriceLevel:
		var cfg entities.PriceLevelConfig
		if err := json.Unmarshal(rule.Config, &cfg); err == nil {
			cur, ok1 := parseDecimal(currentPrice)
			target, ok2 := parseDecimal(cfg.Price)
			if ok1 && ok2 {
				above := cur.Cmp(target) >= 0
				state.WasAboveLevel = &above
			}
		}
	case entities.RuleTypeMACross:
		var cfg entities.MACrossConfig
		if err := json.Unmarshal(rule.Config, &cfg); err == nil {
			ma, err := m.calculateSMA(ctx, symbol, cfg.MATimeframe, cfg.MAPeriod)
			if err == nil && ma != "" {
				cur, ok1 := parseDecimal(currentPrice)
				maVal, ok2 := parseDecimal(ma)
				if ok1 && ok2 {
					above := cur.Cmp(maVal) >= 0
					state.WasAboveMA = &above
				}
			}
		}
	}

	return state
}

func (m *AlertMonitor) isCooldownPassed(rule *entities.AlertRule) bool {
	if rule.LastTriggeredAt == nil {
		return true
	}
	cooldown := time.Duration(rule.CooldownMinutes) * time.Minute
	return time.Now().UTC().After(rule.LastTriggeredAt.Add(cooldown))
}

// --- Price fetching ---

func (m *AlertMonitor) fetchCurrentPrice(ctx context.Context, symbol string) (string, error) {
	m.priceMu.RLock()
	cached, ok := m.priceCache[symbol]
	m.priceMu.RUnlock()

	if ok && time.Since(cached.FetchedAt) < 10*time.Second {
		return cached.Price, nil
	}

	params := url.Values{}
	params.Set("symbol", symbol)
	reqURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/ticker/price?%s", params.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := m.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("binance ticker error %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var result struct {
		Price string `json:"price"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	m.priceMu.Lock()
	m.priceCache[symbol] = &priceSnapshot{Price: result.Price, FetchedAt: time.Now()}
	m.priceMu.Unlock()

	return result.Price, nil
}

func (m *AlertMonitor) fetchHistoricalPrice(ctx context.Context, symbol string, ago time.Duration) (string, error) {
	target := time.Now().UTC().Add(-ago)
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", "1m")
	params.Set("startTime", fmt.Sprintf("%d", target.UnixMilli()))
	params.Set("limit", "1")

	reqURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/klines?%s", params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := m.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("binance klines error %d", resp.StatusCode)
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return "", err
	}
	if len(raw) == 0 || len(raw[0]) < 5 {
		return "", nil
	}

	closeVal, ok := asString(raw[0][4])
	if !ok {
		return "", nil
	}
	return closeVal, nil
}

func (m *AlertMonitor) calculateSMA(ctx context.Context, symbol string, timeframe string, period int) (string, error) {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", timeframe)
	params.Set("limit", fmt.Sprintf("%d", period))

	reqURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/klines?%s", params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := m.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("binance klines error %d", resp.StatusCode)
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return "", err
	}

	if len(raw) < period {
		return "", nil
	}

	sum := new(big.Rat)
	for _, row := range raw {
		if len(row) < 5 {
			continue
		}
		closeStr, ok := asString(row[4])
		if !ok {
			continue
		}
		val, ok := parseDecimal(closeStr)
		if !ok {
			continue
		}
		sum.Add(sum, val)
	}

	avg := new(big.Rat).Quo(sum, big.NewRat(int64(len(raw)), 1))
	return formatDecimal(avg, 2), nil
}

func parseDuration(ref string) time.Duration {
	switch ref {
	case "1h":
		return time.Hour
	case "4h":
		return 4 * time.Hour
	case "24h":
		return 24 * time.Hour
	default:
		return 24 * time.Hour
	}
}
```

## File: internal/jobs/alert_outcome_calc.go
```go
package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type AlertOutcomeCalculator struct {
	outcomeRepo repositories.AlertOutcomeRepository
	client      *http.Client
	intervals   []alertOutcomeInterval
}

type alertOutcomeInterval struct {
	Period   string
	Duration time.Duration
}

func NewAlertOutcomeCalculator(outcomeRepo repositories.AlertOutcomeRepository) *AlertOutcomeCalculator {
	return &AlertOutcomeCalculator{
		outcomeRepo: outcomeRepo,
		client:      &http.Client{Timeout: 12 * time.Second},
		intervals: []alertOutcomeInterval{
			{Period: "1h", Duration: time.Hour},
			{Period: "4h", Duration: 4 * time.Hour},
			{Period: "1d", Duration: 24 * time.Hour},
		},
	}
}

func (c *AlertOutcomeCalculator) Start(ctx context.Context) {
	ticker := time.NewTicker(60 * time.Second)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				c.runOnce(ctx)
			}
		}
	}()
}

func (c *AlertOutcomeCalculator) runOnce(ctx context.Context) {
	now := time.Now().UTC()
	for _, interval := range c.intervals {
		cutoff := now.Add(-interval.Duration)
		pending, err := c.outcomeRepo.ListPendingDecisions(ctx, interval.Period, cutoff, 100)
		if err != nil {
			log.Printf("alert outcome calc: list pending failed: %v", err)
			continue
		}

		for _, item := range pending {
			if err := c.calculateForDecision(ctx, interval, item); err != nil {
				log.Printf("alert outcome calc: alert %s error: %v", item.AlertID.String(), err)
			}
		}
	}
}

func (c *AlertOutcomeCalculator) calculateForDecision(ctx context.Context, interval alertOutcomeInterval, item *repositories.PendingAlertDecision) error {
	targetTime := item.DecisionTime.UTC().Add(interval.Duration).Truncate(time.Minute)

	outcomePrice, err := c.fetchPrice(ctx, item.Symbol, targetTime)
	if err != nil {
		return err
	}
	if outcomePrice == "" {
		return nil // Not yet available
	}

	pnl, err := c.calculatePnL(item.TriggerPrice, outcomePrice)
	if err != nil {
		return err
	}

	outcome := &entities.AlertOutcome{
		ID:             uuid.New(),
		AlertID:        item.AlertID,
		DecisionID:     item.DecisionID,
		Period:         interval.Period,
		ReferencePrice: item.TriggerPrice,
		OutcomePrice:   outcomePrice,
		PnLPercent:     pnl,
		CalculatedAt:   time.Now().UTC(),
	}

	_, err = c.outcomeRepo.CreateIfNotExists(ctx, outcome)
	return err
}

func (c *AlertOutcomeCalculator) fetchPrice(ctx context.Context, symbol string, target time.Time) (string, error) {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", "1m")
	params.Set("startTime", fmt.Sprintf("%d", target.UnixMilli()))
	params.Set("limit", "1")

	reqURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/klines?%s", params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("binance klines error %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return "", err
	}
	if len(raw) == 0 || len(raw[0]) < 5 {
		return "", nil
	}

	closeVal, ok := asString(raw[0][4])
	if !ok {
		return "", nil
	}
	return closeVal, nil
}

func (c *AlertOutcomeCalculator) calculatePnL(reference, outcome string) (string, error) {
	ref, ok := parseDecimal(reference)
	if !ok {
		return "", errors.New("invalid reference price")
	}
	out, ok := parseDecimal(outcome)
	if !ok {
		return "", errors.New("invalid outcome price")
	}
	if ref.Sign() == 0 {
		return "", errors.New("reference price is zero")
	}

	diff := new(big.Rat).Sub(out, ref)
	ratio := new(big.Rat).Quo(diff, ref)
	ratio.Mul(ratio, big.NewRat(100, 1))
	return formatDecimal(ratio, 8), nil
}
```

## File: internal/jobs/outcome_calculator.go
```go
package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

const (
	outcomeKlineBaseURL = "https://fapi.binance.com"
)

var outcomeUpbitCandleBaseURL = upbitAPIBaseURL

type outcomePriceSource string

const (
	outcomePriceSourceBinance outcomePriceSource = "binance"
	outcomePriceSourceUpbit   outcomePriceSource = "upbit"
)

type OutcomeCalculator struct {
	outcomeRepo repositories.OutcomeRepository
	client      *http.Client
	intervals   []outcomeInterval
	mu                 sync.Mutex
	upbitCooldownUntil time.Time
}

type outcomeInterval struct {
	Period   string
	Duration time.Duration
}

func NewOutcomeCalculator(outcomeRepo repositories.OutcomeRepository) *OutcomeCalculator {
	return &OutcomeCalculator{
		outcomeRepo: outcomeRepo,
		client: &http.Client{
			Timeout: 12 * time.Second,
		},
		intervals: parseOutcomeIntervals(),
	}
}

func (c *OutcomeCalculator) Start(ctx context.Context) {
	ticker := time.NewTicker(60 * time.Second)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				c.runOnce(ctx)
			}
		}
	}()
}

func (c *OutcomeCalculator) runOnce(ctx context.Context) {
	now := time.Now().UTC()
	for _, interval := range c.intervals {
		cutoff := now.Add(-interval.Duration)
		pending, err := c.outcomeRepo.ListPending(ctx, interval.Period, cutoff, 200)
		if err != nil {
			log.Printf("outcome calc: list pending failed: %v", err)
			continue
		}

		for _, item := range pending {
			if item == nil {
				continue
			}
			if err := c.calculateForBubble(ctx, interval, item); err != nil {
				log.Printf("outcome calc: bubble %s error: %v", item.BubbleID.String(), err)
			}
		}
	}
}

func (c *OutcomeCalculator) calculateForBubble(ctx context.Context, interval outcomeInterval, bubble *repositories.PendingOutcomeBubble) error {
	targetTime := bubble.CandleTime.UTC().Add(interval.Duration)
	targetTime = floorToMinute(targetTime)

	outcomePrice, ok, err := c.fetchOutcomePrice(ctx, bubble.Symbol, targetTime)
	if err != nil {
		return err
	}
	if !ok {
		return nil
	}

	pnl, err := calculatePnLPercent(bubble.Price, outcomePrice)
	if err != nil {
		return err
	}

	outcome := &entities.Outcome{
		ID:             uuid.New(),
		BubbleID:       bubble.BubbleID,
		Period:         interval.Period,
		ReferencePrice: bubble.Price,
		OutcomePrice:   outcomePrice,
		PnLPercent:     pnl,
		CalculatedAt:   time.Now().UTC(),
	}

	_, err = c.outcomeRepo.CreateIfNotExists(ctx, outcome)
	return err
}

func (c *OutcomeCalculator) fetchOutcomePrice(ctx context.Context, symbol string, target time.Time) (string, bool, error) {
	normalizedSymbol, source, ok := resolveOutcomeSymbolSource(symbol)
	if !ok {
		// Unsupported symbols should not fail the calculator loop.
		return "", false, nil
	}

	if source == outcomePriceSourceUpbit {
		if c.isUpbitCoolingDown() {
			return "", false, nil
		}

		price, found, err := c.requestUpbitCandleClose(ctx, normalizedSymbol, target.Add(1*time.Minute), 1)
		if err != nil {
			return "", false, err
		}
		if found {
			return price, true, nil
		}

		fallbackTo := target
		if fallbackTo.IsZero() {
			fallbackTo = time.Now().UTC()
		}
		price, found, err = c.requestUpbitCandleClose(ctx, normalizedSymbol, fallbackTo, 5)
		if err != nil {
			return "", false, err
		}
		if found {
			return price, true, nil
		}
		return "", false, nil
	}

	price, ok, err := c.requestKlineClose(ctx, normalizedSymbol, target, target.Add(1*time.Minute), 1)
	if err != nil {
		return "", false, err
	}
	if ok {
		return price, true, nil
	}

	fallbackStart := target.Add(-5 * time.Minute)
	price, ok, err = c.requestKlineClose(ctx, normalizedSymbol, fallbackStart, target, 5)
	if err != nil {
		return "", false, err
	}
	if ok {
		return price, true, nil
	}

	return "", false, nil
}

func (c *OutcomeCalculator) requestUpbitCandleClose(ctx context.Context, market string, to time.Time, count int) (string, bool, error) {
	params := url.Values{}
	params.Set("market", market)
	params.Set("to", to.UTC().Format(time.RFC3339))
	params.Set("count", fmt.Sprintf("%d", count))

	requestURL := fmt.Sprintf("%s/v1/candles/minutes/1?%s", outcomeUpbitCandleBaseURL, params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return "", false, err
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return "", false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		c.applyUpbitCooldown(resp.Header.Get("Retry-After"))
		return "", false, nil
	}

	if resp.StatusCode == http.StatusNotFound {
		// Upbit returns 404 "Code not found" for unsupported/delisted markets.
		// Treat it as non-fatal so the calculator loop can continue.
		return "", false, nil
	}

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		return "", false, fmt.Errorf("upbit candles error %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}

	type upbitMinuteCandle struct {
		TradePrice float64 `json:"trade_price"`
	}

	var candles []upbitMinuteCandle
	if err := json.NewDecoder(resp.Body).Decode(&candles); err != nil {
		return "", false, err
	}
	if len(candles) == 0 {
		return "", false, nil
	}

	price := strings.TrimRight(strings.TrimRight(strconv.FormatFloat(candles[0].TradePrice, 'f', 8, 64), "0"), ".")
	if price == "" {
		price = "0"
	}
	return price, true, nil
}

func (c *OutcomeCalculator) isUpbitCoolingDown() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return time.Now().UTC().Before(c.upbitCooldownUntil)
}

func (c *OutcomeCalculator) applyUpbitCooldown(retryAfterHeader string) {
	cooldown := parseRetryAfter(retryAfterHeader, 60*time.Second)
	until := time.Now().UTC().Add(cooldown)

	c.mu.Lock()
	if until.After(c.upbitCooldownUntil) {
		c.upbitCooldownUntil = until
	}
	c.mu.Unlock()
}

func parseRetryAfter(headerValue string, fallback time.Duration) time.Duration {
	trimmed := strings.TrimSpace(headerValue)
	if trimmed == "" {
		return fallback
	}

	if seconds, err := strconv.Atoi(trimmed); err == nil {
		if seconds <= 0 {
			return fallback
		}
		return time.Duration(seconds) * time.Second
	}

	if parsed, err := http.ParseTime(trimmed); err == nil {
		duration := time.Until(parsed)
		if duration <= 0 {
			return fallback
		}
		return duration
	}

	return fallback
}

func resolveOutcomeSymbolSource(symbol string) (string, outcomePriceSource, bool) {
	trimmed := strings.ToUpper(strings.TrimSpace(symbol))
	if trimmed == "" {
		return "", "", false
	}

	if market := toUpbitMarket(trimmed); strings.HasPrefix(market, "KRW-") {
		return market, outcomePriceSourceUpbit, true
	}

	if isSupportedBinanceSymbol(trimmed, binanceFuturesID) || isSupportedBinanceSymbol(trimmed, binanceSpotID) {
		return trimmed, outcomePriceSourceBinance, true
	}

	return "", "", false
}

func (c *OutcomeCalculator) requestKlineClose(ctx context.Context, symbol string, start time.Time, end time.Time, limit int) (string, bool, error) {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", "1m")
	params.Set("startTime", fmt.Sprintf("%d", start.UTC().UnixMilli()))
	params.Set("endTime", fmt.Sprintf("%d", end.UTC().UnixMilli()))
	params.Set("limit", fmt.Sprintf("%d", limit))

	requestURL := fmt.Sprintf("%s/fapi/v1/klines?%s", outcomeKlineBaseURL, params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return "", false, err
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return "", false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		return "", false, fmt.Errorf("binance klines error %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return "", false, err
	}
	if len(raw) == 0 {
		return "", false, nil
	}

	row := raw[len(raw)-1]
	if len(row) < 5 {
		return "", false, nil
	}
	closeVal, ok := asString(row[4])
	if !ok {
		return "", false, nil
	}
	return closeVal, true, nil
}

func parseOutcomeIntervals() []outcomeInterval {
	env := strings.TrimSpace(os.Getenv("OUTCOME_INTERVALS"))
	if env == "" {
		return []outcomeInterval{
			{Period: "1h", Duration: time.Hour},
			{Period: "4h", Duration: 4 * time.Hour},
			{Period: "1d", Duration: 24 * time.Hour},
		}
	}

	parts := strings.Split(env, ",")
	intervals := make([]outcomeInterval, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		switch trimmed {
		case "1m":
			intervals = append(intervals, outcomeInterval{Period: "1h", Duration: time.Minute})
		case "5m":
			intervals = append(intervals, outcomeInterval{Period: "4h", Duration: 5 * time.Minute})
		case "15m":
			intervals = append(intervals, outcomeInterval{Period: "1d", Duration: 15 * time.Minute})
		}
	}

	if len(intervals) == 0 {
		return []outcomeInterval{
			{Period: "1h", Duration: time.Hour},
			{Period: "4h", Duration: 4 * time.Hour},
			{Period: "1d", Duration: 24 * time.Hour},
		}
	}

	return intervals
}

func calculatePnLPercent(reference string, outcome string) (string, error) {
	ref, ok := parseDecimal(reference)
	if !ok {
		return "", errors.New("invalid reference price")
	}
	out, ok := parseDecimal(outcome)
	if !ok {
		return "", errors.New("invalid outcome price")
	}
	if ref.Sign() == 0 {
		return "", errors.New("reference price is zero")
	}

	diff := new(big.Rat).Sub(out, ref)
	ratio := new(big.Rat).Quo(diff, ref)
	ratio.Mul(ratio, big.NewRat(100, 1))
	return formatDecimal(ratio, 8), nil
}

func parseDecimal(value string) (*big.Rat, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, false
	}
	rat := new(big.Rat)
	if _, ok := rat.SetString(value); !ok {
		return nil, false
	}
	return rat, true
}

func formatDecimal(value *big.Rat, scale int) string {
	if value == nil {
		return ""
	}
	formatted := value.FloatString(scale)
	formatted = strings.TrimRight(formatted, "0")
	formatted = strings.TrimRight(formatted, ".")
	if formatted == "" || formatted == "-" {
		return "0"
	}
	return formatted
}

func floorToMinute(t time.Time) time.Time {
	return t.Truncate(time.Minute)
}

func asString(value interface{}) (string, bool) {
	switch v := value.(type) {
	case string:
		return v, true
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64), true
	default:
		return "", false
	}
}
```

## File: internal/jobs/position_calculator.go
```go
package jobs

import (
	"context"
	"log"
	"time"

	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type PositionCalculator struct {
	portfolioRepo repositories.PortfolioRepository
	interval      time.Duration
	limit         int
}

func NewPositionCalculator(portfolioRepo repositories.PortfolioRepository) *PositionCalculator {
	return &PositionCalculator{
		portfolioRepo: portfolioRepo,
		interval:      10 * time.Minute,
		limit:         200,
	}
}

func (c *PositionCalculator) Start(ctx context.Context) {
	ticker := time.NewTicker(c.interval)
	go func() {
		defer ticker.Stop()
		c.runOnce(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				c.runOnce(ctx)
			}
		}
	}()
}

func (c *PositionCalculator) runOnce(ctx context.Context) {
	users, err := c.portfolioRepo.ListUsersWithEvents(ctx, c.limit)
	if err != nil {
		log.Printf("position calc: list users failed: %v", err)
		return
	}

	for _, userID := range users {
		if err := c.portfolioRepo.RebuildPositions(ctx, userID); err != nil {
			log.Printf("position calc: user %s rebuild failed: %v", userID.String(), err)
		}
	}
}
```

## File: internal/jobs/quota_reset.go
```go
package jobs

import (
	"context"
	"log"
	"time"

	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

type QuotaResetJob struct {
	subscriptionRepo repositories.SubscriptionRepository
}

func NewQuotaResetJob(subscriptionRepo repositories.SubscriptionRepository) *QuotaResetJob {
	return &QuotaResetJob{subscriptionRepo: subscriptionRepo}
}

func (j *QuotaResetJob) Start(ctx context.Context) {
	go func() {
		timer := time.NewTimer(timeUntilNextReset())
		for {
			select {
			case <-ctx.Done():
				timer.Stop()
				return
			case <-timer.C:
				j.runOnce(ctx)
				timer.Reset(24 * time.Hour)
			}
		}
	}()
}

func (j *QuotaResetJob) runOnce(ctx context.Context) {
	subs, err := j.subscriptionRepo.ListAll(ctx)
	if err != nil {
		log.Printf("quota reset: list subscriptions failed: %v", err)
		return
	}

	now := time.Now().UTC()
	for _, sub := range subs {
		if sub == nil {
			continue
		}

		if sub.ExpiresAt != nil && sub.ExpiresAt.Before(now) {
			applyTierReset(sub, "free", now)
		} else if monthChanged(sub.LastResetAt, now) {
			applyTierReset(sub, sub.Tier, now)
		} else {
			continue
		}

		if err := j.subscriptionRepo.Update(ctx, sub); err != nil {
			log.Printf("quota reset: update failed for user %s: %v", sub.UserID.String(), err)
		}
	}
}

func timeUntilNextReset() time.Duration {
	now := time.Now().UTC()
	next := time.Date(now.Year(), now.Month(), now.Day(), 0, 5, 0, 0, time.UTC)
	if !next.After(now) {
		next = next.Add(24 * time.Hour)
	}
	return next.Sub(now)
}

func monthChanged(lastReset time.Time, now time.Time) bool {
	return lastReset.Year() != now.Year() || lastReset.Month() != now.Month()
}

func applyTierReset(sub *entities.Subscription, tier string, now time.Time) {
	sub.Tier = tier
	limit := quotaForTier(tier)
	sub.AIQuotaLimit = limit
	sub.AIQuotaRemaining = limit
	sub.LastResetAt = now
	if tier == "free" {
		sub.ExpiresAt = nil
	}
}

func quotaForTier(tier string) int {
	switch tier {
	case "silver":
		return 200
	case "gold":
		return 1000
	case "vip":
		return 5000
	default:
		return 20
	}
}
```

## File: internal/jobs/trade_poller.go
```go
package jobs

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	cryptoutil "github.com/moneyvessel/kifu/internal/infrastructure/crypto"
)

const (
	binanceFapiBaseURL  = "https://fapi.binance.com"
	binanceAPIBaseURL   = "https://api.binance.com"
	upbitAPIBaseURL     = "https://api.upbit.com"
	binanceFuturesID    = "binance_futures"
	binanceSpotID       = "binance_spot"
	upbitExchangeID     = "upbit"
	defaultPollInterval = 300 * time.Second
)

type TradePoller struct {
	pool           *pgxpool.Pool
	exchangeRepo   repositories.ExchangeCredentialRepository
	userSymbolRepo repositories.UserSymbolRepository
	syncStateRepo  repositories.TradeSyncStateRepository
	portfolioRepo  repositories.PortfolioRepository
	encryptionKey  []byte
	pollInterval   time.Duration
	client         *http.Client
	runningPollers map[string]context.CancelFunc
	mu             sync.Mutex
	useMockTrades  bool
	mockTradesPath string
}

type SyncOptions struct {
	FullBackfill bool
	HistoryDays  int
}

type normalizedTrade struct {
	ID           int64
	Symbol       string
	Side         string
	PositionSide *string
	OpenClose    *string
	ReduceOnly   *bool
	Quantity     string
	Price        string
	RealizedPnL  string
	TradeTime    int64
}

type binanceFuturesTrade struct {
	ID           int64  `json:"id"`
	Symbol       string `json:"symbol"`
	Side         string `json:"side"`
	Quantity     string `json:"qty"`
	Price        string `json:"price"`
	RealizedPnL  string `json:"realizedPnl"`
	TradeTime    int64  `json:"time"`
	PositionSide string `json:"positionSide"`
	Maker        bool   `json:"maker"`
}

type binanceSpotTrade struct {
	ID        int64  `json:"id"`
	Symbol    string `json:"symbol"`
	Price     string `json:"price"`
	Quantity  string `json:"qty"`
	TradeTime int64  `json:"time"`
	IsBuyer   bool   `json:"isBuyer"`
}

type upbitClosedOrder struct {
	UUID           string            `json:"uuid"`
	Side           string            `json:"side"`
	OrdType        string            `json:"ord_type"`
	Price          string            `json:"price"`
	AvgPrice       string            `json:"avg_price"`
	Funds          string            `json:"funds"`
	State          string            `json:"state"`
	Market         string            `json:"market"`
	CreatedAt      string            `json:"created_at"`
	ExecutedVolume string            `json:"executed_volume"`
	ExecutedFund   *string           `json:"executed_fund"`
	ExecutedFunds  *string           `json:"executed_funds"`
	Trades         []upbitOrderTrade `json:"trades"`
}

type upbitOrderTrade struct {
	Price  string `json:"price"`
	Volume string `json:"volume"`
}

type mockTrade struct {
	ID        int64  `json:"id"`
	Symbol    string `json:"symbol"`
	Side      string `json:"side"`
	Quantity  string `json:"qty"`
	Price     string `json:"price"`
	TradeTime string `json:"trade_time"`
}

func NewTradePoller(
	pool *pgxpool.Pool,
	exchangeRepo repositories.ExchangeCredentialRepository,
	userSymbolRepo repositories.UserSymbolRepository,
	syncStateRepo repositories.TradeSyncStateRepository,
	portfolioRepo repositories.PortfolioRepository,
	encryptionKey []byte,
) *TradePoller {
	useMock := strings.EqualFold(os.Getenv("MOCK_BINANCE_TRADES"), "true")
	mockPath := filepath.Join("kifu", "backend", "fixtures", "trades.json")
	if pathOverride := os.Getenv("MOCK_BINANCE_TRADES_PATH"); pathOverride != "" {
		mockPath = pathOverride
	}

	return &TradePoller{
		pool:           pool,
		exchangeRepo:   exchangeRepo,
		userSymbolRepo: userSymbolRepo,
		syncStateRepo:  syncStateRepo,
		portfolioRepo:  portfolioRepo,
		encryptionKey:  encryptionKey,
		pollInterval:   defaultPollInterval,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
		runningPollers: make(map[string]context.CancelFunc),
		useMockTrades:  useMock,
		mockTradesPath: mockPath,
	}
}

func (p *TradePoller) Start(ctx context.Context) {
	for _, exchange := range []string{binanceFuturesID, binanceSpotID, upbitExchangeID} {
		creds, err := p.exchangeRepo.ListValid(ctx, exchange)
		if err != nil {
			log.Printf("trade poller: failed to list exchange credentials (%s): %v", exchange, err)
			continue
		}

		for _, cred := range creds {
			p.startUserPoller(ctx, cred)
		}
	}
}

func (p *TradePoller) startUserPoller(ctx context.Context, cred *entities.ExchangeCredential) {
	key := fmt.Sprintf("%s|%s", cred.UserID.String(), cred.Exchange)

	p.mu.Lock()
	if _, exists := p.runningPollers[key]; exists {
		p.mu.Unlock()
		return
	}
	userCtx, cancel := context.WithCancel(ctx)
	p.runningPollers[key] = cancel
	p.mu.Unlock()

	log.Printf("trade poller: starting for user %s (%s)", cred.UserID.String(), cred.Exchange)

	go func() {
		ticker := time.NewTicker(p.pollInterval)
		defer ticker.Stop()
		for {
			if err := p.pollOnce(userCtx, cred, nil); err != nil {
				log.Printf("trade poller: user %s (%s) error: %v", cred.UserID.String(), cred.Exchange, err)
			}
			select {
			case <-userCtx.Done():
				log.Printf("trade poller: stopped for user %s (%s)", cred.UserID.String(), cred.Exchange)
				return
			case <-ticker.C:
			}
		}
	}()
}

func (p *TradePoller) pollOnce(ctx context.Context, cred *entities.ExchangeCredential, options *SyncOptions) error {
	if cred.Exchange != binanceFuturesID && cred.Exchange != binanceSpotID && cred.Exchange != upbitExchangeID {
		return ErrUnsupportedExchange
	}

	apiKey, err := cryptoutil.Decrypt(cred.APIKeyEnc, p.encryptionKey)
	if err != nil {
		return err
	}
	apiSecret, err := cryptoutil.Decrypt(cred.APISecretEnc, p.encryptionKey)
	if err != nil {
		return err
	}

	symbols, err := p.userSymbolRepo.ListByUser(ctx, cred.UserID)
	if err != nil {
		return err
	}
	if len(symbols) == 0 {
		defaultSymbol := "BTCUSDT"
		if cred.Exchange == upbitExchangeID {
			defaultSymbol = "KRW-BTC"
		}
		defaultEntry := &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           cred.UserID,
			Symbol:           defaultSymbol,
			TimeframeDefault: "1h",
			CreatedAt:        time.Now().UTC(),
		}
		if err := p.userSymbolRepo.Create(ctx, defaultEntry); err != nil {
			return err
		}
		symbols = []*entities.UserSymbol{defaultEntry}
	}

	if len(symbols) > 20 {
		log.Printf("trade poller: user %s has %d symbols, limiting to 20", cred.UserID.String(), len(symbols))
		symbols = symbols[:20]
	}

	if cred.Exchange == upbitExchangeID {
		symbols = normalizeUpbitSymbols(symbols)
	} else if cred.Exchange == binanceFuturesID || cred.Exchange == binanceSpotID {
		symbols = normalizeBinanceSymbols(symbols, cred.Exchange)
	}

	if cred.Exchange == upbitExchangeID {
		virtualSymbol := &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           cred.UserID,
			Symbol:           "ALL_MARKETS",
			TimeframeDefault: "1h",
			CreatedAt:        time.Now().UTC(),
		}
		if p.useMockTrades {
			err = p.handleMockTrades(ctx, cred.UserID, cred.Exchange, virtualSymbol)
		} else {
			err = p.fetchAndStoreTrades(ctx, cred.UserID, cred.Exchange, virtualSymbol, apiKey, apiSecret, options)
		}
		if err != nil {
			log.Printf("trade poller: user %s (%s) symbol %s error: %v", cred.UserID.String(), cred.Exchange, virtualSymbol.Symbol, err)
			return err
		}
		return nil
	}

	for _, symbol := range symbols {
		if p.useMockTrades {
			err = p.handleMockTrades(ctx, cred.UserID, cred.Exchange, symbol)
		} else {
			err = p.fetchAndStoreTrades(ctx, cred.UserID, cred.Exchange, symbol, apiKey, apiSecret, options)
		}
		if err != nil {
			log.Printf("trade poller: user %s (%s) symbol %s error: %v", cred.UserID.String(), cred.Exchange, symbol.Symbol, err)
		}
	}

	return nil
}

func (p *TradePoller) SyncCredentialOnce(ctx context.Context, cred *entities.ExchangeCredential) error {
	if cred == nil {
		return fmt.Errorf("credential is required")
	}
	return p.pollOnce(ctx, cred, nil)
}

func (p *TradePoller) SyncCredentialOnceWithOptions(ctx context.Context, cred *entities.ExchangeCredential, options SyncOptions) error {
	if cred == nil {
		return fmt.Errorf("credential is required")
	}
	return p.pollOnce(ctx, cred, &options)
}

func (p *TradePoller) fetchAndStoreTrades(ctx context.Context, userID uuid.UUID, exchange string, symbol *entities.UserSymbol, apiKey string, apiSecret string, options *SyncOptions) error {
	state, err := p.syncStateRepo.GetByUserAndSymbol(ctx, userID, exchange, symbol.Symbol)
	if err != nil {
		return err
	}

	fromID := int64(0)
	useFromID := false
	startTime := int64(0)
	if options != nil && options.FullBackfill {
		if exchange == binanceFuturesID || exchange == binanceSpotID {
			// Binance userTrades supports cursor paging by fromId; use it for deep history backfill.
			useFromID = true
			fromID = 0
		} else if exchange == upbitExchangeID {
			// Upbit full backfill: all history by default, but respect explicit history_days when provided.
			if options.HistoryDays > 0 {
				historyDays := options.HistoryDays
				if historyDays > 3650 {
					historyDays = 3650
				}
				startTime = time.Now().Add(time.Duration(-historyDays) * 24 * time.Hour).UnixMilli()
			} else {
				startTime = 0
			}
		} else {
			historyDays := options.HistoryDays
			if historyDays <= 0 {
				historyDays = 365
			}
			if historyDays > 3650 {
				historyDays = 3650
			}
			startTime = time.Now().Add(time.Duration(-historyDays) * 24 * time.Hour).UnixMilli()
		}
	} else if exchange == upbitExchangeID && state != nil {
		// Upbit closed orders can appear slightly earlier than the last sync timestamp.
		// Use a wider overlap so recent market buys aren't skipped.
		startTime = state.LastSyncAt.Add(-5 * time.Minute).UnixMilli()
	} else if state != nil && state.LastTradeID > 0 {
		fromID = state.LastTradeID + 1
		useFromID = true
	} else {
		startTime = time.Now().Add(-7 * 24 * time.Hour).UnixMilli()
	}

	var latestID int64
	for {
		var trades []normalizedTrade
		var lastID int64
		switch exchange {
		case binanceFuturesID:
			trades, lastID, err = p.requestFuturesTrades(ctx, apiKey, apiSecret, symbol.Symbol, fromID, useFromID, startTime)
		case binanceSpotID:
			trades, lastID, err = p.requestSpotTrades(ctx, apiKey, apiSecret, symbol.Symbol, fromID, useFromID, startTime)
		case upbitExchangeID:
			trades, lastID, err = p.requestUpbitTrades(ctx, apiKey, apiSecret, symbol.Symbol, startTime, useFromID)
		default:
			return ErrUnsupportedExchange
		}
		if err != nil {
			return err
		}
		if len(trades) == 0 {
			break
		}

		if lastID > latestID {
			latestID = lastID
		}

		if err := p.persistTrades(ctx, userID, exchange, symbol, trades); err != nil {
			return err
		}

		if len(trades) < 1000 {
			break
		}
		if exchange == upbitExchangeID {
			break
		}

		fromID = lastID + 1
		useFromID = true
		startTime = 0
	}

	if latestID > 0 {
		lastSync := time.Now().UTC()
		if exchange == upbitExchangeID {
			lastSync = time.UnixMilli(latestID).UTC()
		}
		stateToSave := &entities.TradeSyncState{
			ID:          uuid.New(),
			UserID:      userID,
			Exchange:    exchange,
			Symbol:      symbol.Symbol,
			LastTradeID: latestID,
			LastSyncAt:  lastSync,
		}
		if err := p.syncStateRepo.Upsert(ctx, stateToSave); err != nil {
			return err
		}
	}

	return nil
}

func (p *TradePoller) requestFuturesTrades(ctx context.Context, apiKey string, apiSecret string, symbol string, fromID int64, useFromID bool, startTime int64) ([]normalizedTrade, int64, error) {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("timestamp", fmt.Sprintf("%d", time.Now().UnixMilli()))
	params.Set("recvWindow", "5000")
	params.Set("limit", "1000")
	if useFromID {
		params.Set("fromId", fmt.Sprintf("%d", fromID))
	} else if startTime > 0 {
		params.Set("startTime", fmt.Sprintf("%d", startTime))
	}

	signature := signParams(apiSecret, params)
	params.Set("signature", signature)

	requestURL := fmt.Sprintf("%s/fapi/v1/userTrades?%s", binanceFapiBaseURL, params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("X-MBX-APIKEY", apiKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, 0, fmt.Errorf("binance futures userTrades failed %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var raw []binanceFuturesTrade
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, 0, err
	}

	trades := make([]normalizedTrade, 0, len(raw))
	var lastID int64
	for _, trade := range raw {
		if trade.ID > lastID {
			lastID = trade.ID
		}
		trades = append(trades, normalizedTrade{
			ID:           trade.ID,
			Symbol:       trade.Symbol,
			Side:         strings.ToUpper(trade.Side),
			PositionSide: normalizePositionSide(trade.PositionSide),
			OpenClose:    deriveOpenClose(trade),
			ReduceOnly:   deriveReduceOnly(trade),
			Quantity:     trade.Quantity,
			Price:        trade.Price,
			RealizedPnL:  trade.RealizedPnL,
			TradeTime:    trade.TradeTime,
		})
	}

	return trades, lastID, nil
}

func (p *TradePoller) requestSpotTrades(ctx context.Context, apiKey string, apiSecret string, symbol string, fromID int64, useFromID bool, startTime int64) ([]normalizedTrade, int64, error) {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("timestamp", fmt.Sprintf("%d", time.Now().UnixMilli()))
	params.Set("recvWindow", "5000")
	params.Set("limit", "1000")
	if useFromID {
		params.Set("fromId", fmt.Sprintf("%d", fromID))
	} else if startTime > 0 {
		params.Set("startTime", fmt.Sprintf("%d", startTime))
	}

	signature := signParams(apiSecret, params)
	params.Set("signature", signature)

	requestURL := fmt.Sprintf("%s/api/v3/myTrades?%s", binanceAPIBaseURL, params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("X-MBX-APIKEY", apiKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, 0, fmt.Errorf("binance spot myTrades failed %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var raw []binanceSpotTrade
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, 0, err
	}

	trades := make([]normalizedTrade, 0, len(raw))
	var lastID int64
	for _, trade := range raw {
		if trade.ID > lastID {
			lastID = trade.ID
		}
		side := "SELL"
		if trade.IsBuyer {
			side = "BUY"
		}
		trades = append(trades, normalizedTrade{
			ID:        trade.ID,
			Symbol:    trade.Symbol,
			Side:      side,
			Quantity:  trade.Quantity,
			Price:     trade.Price,
			TradeTime: trade.TradeTime,
		})
	}

	return trades, lastID, nil
}

func (p *TradePoller) requestUpbitTrades(ctx context.Context, apiKey string, apiSecret string, symbol string, startTime int64, useFromID bool) ([]normalizedTrade, int64, error) {
	market := toUpbitMarket(symbol)
	allKRW := strings.EqualFold(strings.TrimSpace(symbol), "ALL_KRW")
	allMarkets := strings.EqualFold(strings.TrimSpace(symbol), "ALL_MARKETS")
	mode := symbol
	if strings.TrimSpace(mode) == "" {
		mode = market
	}
	if !allKRW && !allMarkets && (market == "" || !strings.HasPrefix(market, "KRW-")) {
		return nil, 0, nil
	}

	trades := make([]normalizedTrade, 0, 400)
	seen := map[string]struct{}{}
	var lastID int64
	nonKRWOnly := false
	nonKRWCount := 0
	krwCount := 0
	loggedPriceSample := false
	totalRaw := 0
	windowCount := 0
	emptyWindows := 0
	skippedEmptyQty := 0
	skippedEmptyPrice := 0
	skippedInvalidSide := 0
	skippedBadTime := 0
	const (
		upbitWindowSizeMs = int64(7 * 24 * time.Hour / time.Millisecond)
		upbitLimit        = 1000
	)
	nowMs := time.Now().UTC().UnixMilli()
	oldestMs := startTime
	if oldestMs <= 0 {
		// Full-backfill default: fetch up to 10 years.
		oldestMs = nowMs - int64(3650*24*time.Hour/time.Millisecond)
	}

	for windowEnd := nowMs; windowEnd > oldestMs; windowEnd -= upbitWindowSizeMs {
		windowStart := windowEnd - upbitWindowSizeMs
		if windowStart < oldestMs {
			windowStart = oldestMs
		}
		windowCount++
		windowRawCount := 0

		for page := 1; page <= 50; page++ {
			pageHasFull := false
			states := []string{"done", "cancel"}
			for _, stateValue := range states {
				params := url.Values{}
				if !allKRW && !allMarkets {
					params.Set("market", market)
				}
				params.Set("state", stateValue)
				params.Set("order_by", "desc")
				params.Set("limit", strconv.Itoa(upbitLimit))
				params.Set("page", strconv.Itoa(page))
				params.Set("start_time", strconv.FormatInt(windowStart, 10))
				params.Set("end_time", strconv.FormatInt(windowEnd, 10))

				token, err := signUpbitJWT(apiKey, apiSecret, params)
				if err != nil {
					return nil, 0, err
				}

				requestURL := fmt.Sprintf("%s/v1/orders/closed?%s", upbitAPIBaseURL, params.Encode())
				req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
				if err != nil {
					return nil, 0, err
				}
				req.Header.Set("Authorization", "Bearer "+token)

				var resp *http.Response
				for attempt := 1; attempt <= 3; attempt++ {
					resp, err = p.client.Do(req)
					if err != nil {
						return nil, 0, err
					}
					if resp.StatusCode != http.StatusTooManyRequests {
						break
					}

					retryAfter := strings.TrimSpace(resp.Header.Get("Retry-After"))
					resp.Body.Close()
					wait := 2 * time.Second
					if retryAfter != "" {
						if sec, parseErr := strconv.Atoi(retryAfter); parseErr == nil && sec > 0 {
							wait = time.Duration(sec) * time.Second
						}
					}
					log.Printf("trade poller: upbit rate limited, retrying in %s (attempt %d/3)", wait.String(), attempt)
					time.Sleep(wait)
				}
				if resp == nil {
					return nil, 0, fmt.Errorf("upbit closed orders failed: empty response")
				}
				if resp.StatusCode != http.StatusOK {
					body, _ := io.ReadAll(resp.Body)
					resp.Body.Close()
					return nil, 0, fmt.Errorf("upbit closed orders failed %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
				}

				var raw []upbitClosedOrder
				if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
					resp.Body.Close()
					return nil, 0, err
				}
				resp.Body.Close()

				totalRaw += len(raw)
				windowRawCount += len(raw)
				if len(raw) > 0 {
					for _, order := range raw {
						if strings.EqualFold(order.Market, "KRW-ADA") || strings.EqualFold(order.Market, "ADA-KRW") {
							log.Printf("trade poller: upbit ADA raw state=%s uuid=%s side=%s ord_type=%s execVol=%s price=%s avg=%s funds=%s",
								stateValue, order.UUID, order.Side, order.OrdType, order.ExecutedVolume, order.Price, order.AvgPrice, order.Funds)
							break
						}
					}
				}
				if len(raw) == 0 {
					break
				}

				for _, order := range raw {
					isAda := strings.EqualFold(order.Market, "KRW-ADA") || strings.EqualFold(order.Market, "ADA-KRW")
					hasFill := strings.TrimSpace(order.ExecutedVolume) != "" && strings.TrimSpace(order.ExecutedVolume) != "0"
					if !hasFill && len(order.Trades) > 0 {
						hasFill = true
					}
					if !hasFill && order.ExecutedFunds != nil && strings.TrimSpace(*order.ExecutedFunds) != "" {
						hasFill = true
					}
					if !hasFill && order.ExecutedFund != nil && strings.TrimSpace(*order.ExecutedFund) != "" {
						hasFill = true
					}
					if !strings.EqualFold(order.State, "done") && !(strings.EqualFold(order.State, "cancel") && hasFill) {
						if isAda {
							log.Printf("trade poller: upbit skip (state=%s, hasFill=%t) uuid=%s market=%s side=%s ord_type=%s",
								order.State, hasFill, order.UUID, order.Market, order.Side, order.OrdType)
						}
						continue
					}
					createdAt, err := time.Parse(time.RFC3339, strings.TrimSpace(order.CreatedAt))
					if err != nil {
						if isAda {
							log.Printf("trade poller: upbit skip (bad time) uuid=%s market=%s created_at=%q",
								order.UUID, order.Market, order.CreatedAt)
						}
						skippedBadTime++
						continue
					}
					if startTime > 0 && createdAt.UnixMilli() < startTime {
						if isAda {
							log.Printf("trade poller: upbit skip (before startTime) uuid=%s market=%s created_at=%s startTime=%d",
								order.UUID, order.Market, createdAt.Format(time.RFC3339), startTime)
						}
						continue
					}
					isKRW := strings.HasPrefix(strings.ToUpper(order.Market), "KRW-")
					if isKRW {
						krwCount++
					} else {
						nonKRWCount++
					}
					if allKRW && !isKRW {
						if isAda {
							log.Printf("trade poller: upbit skip (non-KRW) uuid=%s market=%s", order.UUID, order.Market)
						}
						continue
					}

					qty := strings.TrimSpace(order.ExecutedVolume)
					if qty == "" || qty == "0" {
						qty = deriveVolumeFromUpbitTrades(order.Trades)
					}
					price := strings.TrimSpace(order.Price)
					if price == "" || price == "0" {
						price = strings.TrimSpace(order.AvgPrice)
					}
					if (price == "" || price == "0") && order.ExecutedFunds != nil {
						price = deriveAvgPrice(*order.ExecutedFunds, qty)
					}
					if (price == "" || price == "0") && order.ExecutedFund != nil {
						price = deriveAvgPrice(*order.ExecutedFund, qty)
					}
					if price == "" || price == "0" {
						price = deriveAvgPrice(order.Funds, qty)
					}
					if price == "" || price == "0" {
						price = deriveAvgPriceFromUpbitTrades(order.Trades)
					}
					if (qty == "" || qty == "0") && price != "" && price != "0" {
						if order.ExecutedFunds != nil {
							qty = deriveQtyFromFunds(*order.ExecutedFunds, price)
						}
						if (qty == "" || qty == "0") && order.ExecutedFund != nil {
							qty = deriveQtyFromFunds(*order.ExecutedFund, price)
						}
						if qty == "" || qty == "0" {
							qty = deriveQtyFromFunds(order.Funds, price)
						}
					}
					if qty == "" || qty == "0" {
						if isAda {
							log.Printf("trade poller: upbit skip (empty qty) uuid=%s market=%s side=%s ord_type=%s price=%q avg_price=%q funds=%q executed_fund=%v executed_funds=%v trades=%d",
								order.UUID, order.Market, order.Side, order.OrdType, order.Price, order.AvgPrice, order.Funds, order.ExecutedFund, order.ExecutedFunds, len(order.Trades))
						}
						skippedEmptyQty++
						continue
					}
					if price == "" || price == "0" {
						if isAda {
							log.Printf("trade poller: upbit skip (empty price) uuid=%s market=%s side=%s ord_type=%s qty=%q avg_price=%q funds=%q executed_fund=%v executed_funds=%v trades=%d",
								order.UUID, order.Market, order.Side, order.OrdType, qty, order.AvgPrice, order.Funds, order.ExecutedFund, order.ExecutedFunds, len(order.Trades))
						}
						skippedEmptyPrice++
						if !loggedPriceSample {
							firstFillPrice := ""
							firstFillVolume := ""
							if len(order.Trades) > 0 {
								firstFillPrice = order.Trades[0].Price
								firstFillVolume = order.Trades[0].Volume
							}
							log.Printf(
								"trade poller: upbit sample missing price uuid=%s market=%s ord_type=%s side=%s price=%q avg_price=%q funds=%q executed_fund=%v executed_funds=%v trades=%d first_fill_price=%q first_fill_volume=%q",
								order.UUID, order.Market, order.OrdType, order.Side, order.Price, order.AvgPrice, order.Funds, order.ExecutedFund, order.ExecutedFunds, len(order.Trades), firstFillPrice, firstFillVolume,
							)
							loggedPriceSample = true
						}
						continue
					}

					sideRaw := strings.ToUpper(strings.TrimSpace(order.Side))
					side := sideRaw
					switch sideRaw {
					case "BID":
						side = "BUY"
					case "ASK":
						side = "SELL"
					}
					if side != "BUY" && side != "SELL" {
						if isAda {
							log.Printf("trade poller: upbit skip (invalid side) uuid=%s market=%s side=%q", order.UUID, order.Market, order.Side)
						}
						skippedInvalidSide++
						continue
					}

					key := order.UUID + "|" + side
					if _, exists := seen[key]; exists {
						continue
					}
					seen[key] = struct{}{}

					tradeID := hashStringToInt64(order.UUID + "|" + order.Market + "|" + side + "|" + createdAt.Format(time.RFC3339Nano))
					if createdAt.UnixMilli() > lastID {
						lastID = createdAt.UnixMilli()
					}

					trades = append(trades, normalizedTrade{
						ID:        tradeID,
						Symbol:    toInternalSymbol(order.Market),
						Side:      side,
						Quantity:  qty,
						Price:     price,
						TradeTime: createdAt.UnixMilli(),
					})
					if isAda {
						log.Printf("trade poller: upbit ADA included uuid=%s side=%s qty=%s price=%s state=%s ord_type=%s",
							order.UUID, side, qty, price, order.State, order.OrdType)
					}
				}

				if len(raw) >= upbitLimit {
					pageHasFull = true
				}
			}
			if !pageHasFull {
				break
			}
		}

		if windowRawCount == 0 {
			emptyWindows++
		} else {
			emptyWindows = 0
		}
		// Full backfill guardrail: if we keep hitting empty old windows, stop early.
		if startTime <= 0 && emptyWindows >= 12 {
			break
		}
	}

	if allKRW && len(trades) == 0 && nonKRWCount > 0 && krwCount == 0 {
		nonKRWOnly = true
	}

	if nonKRWOnly {
		// Fallback: when account has only non-KRW fills, sync them instead of returning 0 forever.
		log.Printf("trade poller: upbit %s has no KRW fills (non_krw=%d), falling back to ALL_MARKETS", mode, nonKRWCount)
		return p.requestUpbitTrades(ctx, apiKey, apiSecret, "ALL_MARKETS", startTime, useFromID)
	}
	log.Printf(
		"trade poller: upbit %s summary fetched=%d raw=%d windows=%d krw_seen=%d non_krw_seen=%d start_time=%d skipped_qty=%d skipped_price=%d skipped_side=%d skipped_time=%d",
		mode, len(trades), totalRaw, windowCount, krwCount, nonKRWCount, startTime, skippedEmptyQty, skippedEmptyPrice, skippedInvalidSide, skippedBadTime,
	)
	if len(trades) == 0 {
		log.Printf(
			"trade poller: upbit %s returned 0 trades (krw_seen=%d non_krw_seen=%d start_time=%d skipped_qty=%d skipped_price=%d skipped_side=%d skipped_time=%d)",
			mode, krwCount, nonKRWCount, startTime, skippedEmptyQty, skippedEmptyPrice, skippedInvalidSide, skippedBadTime,
		)
	}

	return trades, lastID, nil
}

func (p *TradePoller) persistTrades(ctx context.Context, userID uuid.UUID, exchange string, symbol *entities.UserSymbol, trades []normalizedTrade) error {
	if p.userSymbolRepo != nil && len(trades) > 0 {
		timeframe := "1d"
		if symbol != nil && symbol.TimeframeDefault != "" {
			timeframe = symbol.TimeframeDefault
		}
		uniqueSymbols := make(map[string]struct{}, len(trades))
		for _, trade := range trades {
			if trade.Symbol == "" {
				continue
			}
			uniqueSymbols[strings.ToUpper(trade.Symbol)] = struct{}{}
		}
		for sym := range uniqueSymbols {
			userSymbol := &entities.UserSymbol{
				ID:               uuid.New(),
				UserID:           userID,
				Symbol:           sym,
				TimeframeDefault: timeframe,
				CreatedAt:        time.Now().UTC(),
			}
			if err := p.userSymbolRepo.Create(ctx, userSymbol); err != nil {
				log.Printf("trade poller: failed to upsert user symbol (user=%s symbol=%s): %v", userID.String(), sym, err)
			}
		}
	}

	for _, trade := range trades {
		tradeTime := time.UnixMilli(trade.TradeTime).UTC()
		candleTime := floorToTimeframe(tradeTime, symbol.TimeframeDefault)

		memo := fmt.Sprintf("자동 기록: %s %s @ %s", trade.Symbol, trade.Side, trade.Price)
		memoPtr := &memo

		bubble := &entities.Bubble{
			ID:         uuid.New(),
			UserID:     userID,
			Symbol:     trade.Symbol,
			Timeframe:  symbol.TimeframeDefault,
			CandleTime: candleTime,
			Price:      trade.Price,
			BubbleType: "auto",
			Memo:       memoPtr,
			Tags:       []string{},
			CreatedAt:  time.Now().UTC(),
		}

		tradeRecord := &entities.Trade{
			ID:             uuid.New(),
			UserID:         userID,
			BubbleID:       &bubble.ID,
			Exchange:       exchange,
			BinanceTradeID: trade.ID,
			Symbol:         trade.Symbol,
			Side:           trade.Side,
			PositionSide:   trade.PositionSide,
			OpenClose:      trade.OpenClose,
			ReduceOnly:     trade.ReduceOnly,
			Quantity:       trade.Quantity,
			Price:          trade.Price,
			TradeTime:      tradeTime,
		}
		if trade.RealizedPnL != "" {
			realized := trade.RealizedPnL
			tradeRecord.RealizedPnL = &realized
		}

		if err := p.insertBubbleTradeTx(ctx, bubble, tradeRecord); err != nil {
			if errors.Is(err, errDuplicateTrade) {
				continue
			}
			return err
		}

		if p.portfolioRepo != nil {
			if err := p.ensureTradeEvent(ctx, userID, exchange, tradeRecord); err != nil {
				log.Printf("trade poller: trade_event sync failed (user=%s exchange=%s trade=%s): %v", userID.String(), exchange, tradeRecord.ID.String(), err)
			}
		}
	}

	return nil
}

func (p *TradePoller) insertBubbleTradeTx(ctx context.Context, bubble *entities.Bubble, trade *entities.Trade) error {
	tx, err := p.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	tradeInsert := `
		INSERT INTO trades (id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, quantity, price, realized_pnl, trade_time)
		VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (user_id, exchange, symbol, binance_trade_id) DO NOTHING
	`
	result, err := tx.Exec(ctx, tradeInsert,
		trade.ID, trade.UserID, trade.BinanceTradeID, trade.Exchange, trade.Symbol, trade.Side, trade.Quantity, trade.Price, trade.RealizedPnL, trade.TradeTime)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errDuplicateTrade
	}

	bubbleInsert := `
		INSERT INTO bubbles (id, user_id, symbol, timeframe, candle_time, price, bubble_type, memo, tags, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err = tx.Exec(ctx, bubbleInsert,
		bubble.ID, bubble.UserID, bubble.Symbol, bubble.Timeframe, bubble.CandleTime, bubble.Price, bubble.BubbleType, bubble.Memo, bubble.Tags, bubble.CreatedAt)
	if err != nil {
		return err
	}

	updateTrade := `UPDATE trades SET bubble_id = $2 WHERE id = $1`
	_, err = tx.Exec(ctx, updateTrade, trade.ID, bubble.ID)
	if err != nil {
		return err
	}

	if err = tx.Commit(ctx); err != nil {
		return err
	}
	committed = true
	return nil
}

type tradeEventRecord struct {
	Symbol     string
	EventType  string
	Side       *string
	Qty        *string
	Price      *string
	ExecutedAt time.Time
	ExternalID *string
}

func (p *TradePoller) ensureTradeEvent(ctx context.Context, userID uuid.UUID, exchange string, trade *entities.Trade) error {
	if trade == nil {
		return fmt.Errorf("trade is nil")
	}
	symbol := strings.ToUpper(strings.TrimSpace(trade.Symbol))
	if symbol == "" {
		return fmt.Errorf("symbol is empty")
	}

	venueCode, venueType, venueName := resolveVenueFromExchange(exchange)
	venueID, err := p.portfolioRepo.UpsertVenue(ctx, venueCode, venueType, venueName, "")
	if err != nil {
		return err
	}

	base, quote, normalizedSymbol := parseInstrumentSymbol(symbol, venueCode)
	instrumentID, err := p.portfolioRepo.UpsertInstrument(ctx, "crypto", base, quote, normalizedSymbol)
	if err != nil {
		return err
	}
	_ = p.portfolioRepo.UpsertInstrumentMapping(ctx, instrumentID, venueID, symbol)

	accountID, err := p.portfolioRepo.UpsertAccount(ctx, userID, venueID, "api-sync", nil, "api")
	if err != nil {
		return err
	}

	side := strings.ToLower(strings.TrimSpace(trade.Side))
	if side == "" {
		side = "buy"
	}
	qty := normalizeOptionalLiteral(trade.Quantity)
	price := normalizeOptionalLiteral(trade.Price)

	externalID := ""
	if trade.BinanceTradeID != 0 {
		externalID = fmt.Sprintf("%d", trade.BinanceTradeID)
	} else {
		externalID = trade.ID.String()
	}

	eventType := resolveEventType(exchange)
	eventRecord := &tradeEventRecord{
		Symbol:     normalizedSymbol,
		EventType:  eventType,
		Side:       &side,
		Qty:        qty,
		Price:      price,
		ExecutedAt: trade.TradeTime,
		ExternalID: &externalID,
	}

	dedupe := buildTradeEventDedupeKey(venueCode, "crypto", eventRecord)

	metadata := map[string]string{
		"trade_id": trade.ID.String(),
		"exchange": exchange,
	}
	metadataRaw, _ := json.Marshal(metadata)
	raw := json.RawMessage(metadataRaw)

	event := &entities.TradeEvent{
		ID:           uuid.New(),
		UserID:       userID,
		AccountID:    &accountID,
		VenueID:      &venueID,
		InstrumentID: &instrumentID,
		AssetClass:   "crypto",
		VenueType:    venueType,
		EventType:    eventType,
		Side:         &side,
		Qty:          qty,
		Price:        price,
		ExecutedAt:   trade.TradeTime,
		Source:       "api",
		ExternalID:   &externalID,
		Metadata:     &raw,
		DedupeKey:    &dedupe,
	}

	if err := p.portfolioRepo.CreateTradeEvent(ctx, event); err != nil {
		if isUniqueViolation(err) {
			return nil
		}
		return err
	}
	return nil
}

func resolveVenueFromExchange(exchange string) (code string, venueType string, displayName string) {
	normalized := strings.ToLower(strings.TrimSpace(exchange))
	if normalized == "" {
		return "unknown", "cex", "Unknown"
	}
	switch normalized {
	case "binance_futures":
		return normalized, "cex", "Binance Futures"
	case "binance_spot":
		return normalized, "cex", "Binance Spot"
	case "upbit":
		return normalized, "cex", "Upbit"
	default:
		return normalized, "cex", titleizeVenue(normalized)
	}
}

func titleizeVenue(value string) string {
	parts := strings.Split(value, "_")
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
	}
	return strings.Join(parts, " ")
}

func parseInstrumentSymbol(symbol string, venueCode string) (base string, quote string, normalized string) {
	normalized = strings.ToUpper(strings.TrimSpace(symbol))
	if normalized == "" {
		return "UNKNOWN", defaultQuoteForVenue(venueCode), "UNKNOWN"
	}
	if strings.Contains(normalized, "-") {
		parts := strings.Split(normalized, "-")
		if len(parts) == 2 {
			quote = parts[0]
			base = parts[1]
			normalized = base + quote
			return base, quote, normalized
		}
	}

	quotes := []string{"USDT", "USDC", "USD", "KRW", "BTC", "ETH"}
	for _, q := range quotes {
		if strings.HasSuffix(normalized, q) && len(normalized) > len(q) {
			base = strings.TrimSuffix(normalized, q)
			quote = q
			return base, quote, normalized
		}
	}

	quote = defaultQuoteForVenue(venueCode)
	base = normalized
	return base, quote, normalized
}

func defaultQuoteForVenue(venue string) string {
	switch venue {
	case "upbit", "bithumb", "kis":
		return "KRW"
	default:
		return "USDT"
	}
}

func resolveEventType(exchange string) string {
	value := strings.ToLower(strings.TrimSpace(exchange))
	if strings.Contains(value, "futures") || strings.Contains(value, "perp") {
		return "perp_trade"
	}
	return "spot_trade"
}

func buildTradeEventDedupeKey(venue string, assetClass string, record *tradeEventRecord) string {
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
	parts = append(parts, record.ExecutedAt.UTC().Format(time.RFC3339Nano))
	if record.ExternalID != nil {
		parts = append(parts, *record.ExternalID)
	}
	payload := strings.Join(parts, "|")
	hash := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(hash[:])
}

func normalizeOptionalLiteral(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func (p *TradePoller) handleMockTrades(ctx context.Context, userID uuid.UUID, exchange string, symbol *entities.UserSymbol) error {
	data, err := os.ReadFile(p.mockTradesPath)
	if err != nil {
		return err
	}

	var trades []mockTrade
	if err := json.Unmarshal(data, &trades); err != nil {
		return err
	}

	filtered := make([]normalizedTrade, 0, len(trades))
	for _, trade := range trades {
		if trade.Symbol != symbol.Symbol {
			continue
		}
		parsedTime, err := time.Parse(time.RFC3339, trade.TradeTime)
		if err != nil {
			return err
		}
		filtered = append(filtered, normalizedTrade{
			ID:        trade.ID,
			Symbol:    trade.Symbol,
			Side:      strings.ToUpper(trade.Side),
			Quantity:  trade.Quantity,
			Price:     trade.Price,
			TradeTime: parsedTime.UnixMilli(),
		})
	}

	if len(filtered) == 0 {
		return nil
	}

	return p.persistTrades(ctx, userID, exchange, symbol, filtered)
}

func signParams(secret string, params url.Values) string {
	h := hmac.New(sha256.New, []byte(secret))
	_, _ = h.Write([]byte(params.Encode()))
	return hex.EncodeToString(h.Sum(nil))
}

func floorToTimeframe(t time.Time, timeframe string) time.Time {
	utc := t.UTC()
	switch timeframe {
	case "1m":
		return utc.Truncate(time.Minute)
	case "15m":
		minute := (utc.Minute() / 15) * 15
		return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), minute, 0, 0, time.UTC)
	case "1h":
		return time.Date(utc.Year(), utc.Month(), utc.Day(), utc.Hour(), 0, 0, 0, time.UTC)
	case "4h":
		hour := (utc.Hour() / 4) * 4
		return time.Date(utc.Year(), utc.Month(), utc.Day(), hour, 0, 0, 0, time.UTC)
	case "1d":
		return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
	default:
		return utc.Truncate(time.Hour)
	}
}

var errDuplicateTrade = errors.New("duplicate trade")

var ErrUnsupportedExchange = errors.New("unsupported exchange for sync")

func normalizeUpbitSymbols(symbols []*entities.UserSymbol) []*entities.UserSymbol {
	out := make([]*entities.UserSymbol, 0, len(symbols))
	seen := map[string]struct{}{}
	userID := uuid.Nil
	if len(symbols) > 0 {
		userID = symbols[0].UserID
	}
	for _, symbol := range symbols {
		market := toUpbitMarket(symbol.Symbol)
		if market == "" || !strings.HasPrefix(market, "KRW-") {
			continue
		}
		if _, ok := seen[market]; ok {
			continue
		}
		seen[market] = struct{}{}
		copied := *symbol
		copied.Symbol = market
		out = append(out, &copied)
	}
	if len(out) == 0 {
		out = append(out, &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           userID,
			Symbol:           "KRW-BTC",
			TimeframeDefault: "1h",
			CreatedAt:        time.Now().UTC(),
		})
	}
	return out
}

func normalizeBinanceSymbols(symbols []*entities.UserSymbol, exchange string) []*entities.UserSymbol {
	out := make([]*entities.UserSymbol, 0, len(symbols))
	seen := map[string]struct{}{}
	userID := uuid.Nil
	if len(symbols) > 0 {
		userID = symbols[0].UserID
	}

	for _, symbol := range symbols {
		market := strings.ToUpper(strings.TrimSpace(symbol.Symbol))
		// If user tracks KRW pairs (e.g., XRPKRW from Upbit), try USDT equivalent on Binance.
		if strings.HasSuffix(market, "KRW") && len(market) > 3 {
			market = strings.TrimSuffix(market, "KRW") + "USDT"
		}
		if !isSupportedBinanceSymbol(market, exchange) {
			continue
		}
		if _, ok := seen[market]; ok {
			continue
		}
		seen[market] = struct{}{}
		copied := *symbol
		copied.Symbol = market
		out = append(out, &copied)
	}

	if len(out) == 0 {
		out = append(out, &entities.UserSymbol{
			ID:               uuid.New(),
			UserID:           userID,
			Symbol:           "BTCUSDT",
			TimeframeDefault: "1h",
			CreatedAt:        time.Now().UTC(),
		})
	}

	return out
}

func isSupportedBinanceSymbol(symbol string, exchange string) bool {
	market := strings.ToUpper(strings.TrimSpace(symbol))
	if market == "" || strings.Contains(market, "-") || strings.Contains(market, "/") {
		return false
	}

	// Prevent cross-exchange symbols like ADAKRW from being queried on Binance.
	if strings.HasSuffix(market, "KRW") {
		return false
	}

	quotes := []string{"USDT", "USDC", "BUSD"}
	if exchange == binanceSpotID {
		quotes = append(quotes, "FDUSD", "BTC", "ETH", "BNB", "TUSD", "EUR", "TRY", "BRL")
	}

	for _, quote := range quotes {
		if strings.HasSuffix(market, quote) && len(market) > len(quote) {
			return true
		}
	}

	return false
}

func toUpbitMarket(symbol string) string {
	trimmed := strings.ToUpper(strings.TrimSpace(symbol))
	if trimmed == "" {
		return ""
	}
	if trimmed == "ALL_MARKETS" {
		return "ALL_MARKETS"
	}
	if strings.Contains(trimmed, "-") {
		return trimmed
	}
	if strings.Contains(trimmed, "/") {
		parts := strings.Split(trimmed, "/")
		if len(parts) == 2 {
			return parts[1] + "-" + parts[0]
		}
	}
	if strings.HasSuffix(trimmed, "KRW") && len(trimmed) > 3 {
		base := strings.TrimSuffix(trimmed, "KRW")
		return "KRW-" + base
	}
	return ""
}

func toInternalSymbol(market string) string {
	parts := strings.Split(strings.ToUpper(strings.TrimSpace(market)), "-")
	if len(parts) != 2 {
		return market
	}
	return parts[1] + parts[0]
}

func signUpbitJWT(apiKey string, apiSecret string, params url.Values) (string, error) {
	query := params.Encode()
	hash := sha512.Sum512([]byte(query))
	queryHash := hex.EncodeToString(hash[:])

	claims := jwt.MapClaims{
		"access_key":     apiKey,
		"nonce":          uuid.NewString(),
		"query_hash":     queryHash,
		"query_hash_alg": "SHA512",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)
	return token.SignedString([]byte(apiSecret))
}

func hashStringToInt64(value string) int64 {
	h := sha256.Sum256([]byte(value))
	var out int64
	for i := 0; i < 8; i++ {
		out = (out << 8) | int64(h[i])
	}
	if out < 0 {
		return -out
	}
	return out
}

func deriveAvgPrice(executedFund string, executedVolume string) string {
	fund := strings.TrimSpace(executedFund)
	volume := strings.TrimSpace(executedVolume)
	if fund == "" || volume == "" || volume == "0" {
		return ""
	}
	f, err1 := strconv.ParseFloat(fund, 64)
	v, err2 := strconv.ParseFloat(volume, 64)
	if err1 != nil || err2 != nil || v == 0 {
		return ""
	}
	return strconv.FormatFloat(f/v, 'f', 8, 64)
}

func deriveQtyFromFunds(executedFund string, price string) string {
	fund := strings.TrimSpace(executedFund)
	p := strings.TrimSpace(price)
	if fund == "" || p == "" || p == "0" {
		return ""
	}
	f, err1 := strconv.ParseFloat(fund, 64)
	px, err2 := strconv.ParseFloat(p, 64)
	if err1 != nil || err2 != nil || px == 0 {
		return ""
	}
	return strconv.FormatFloat(f/px, 'f', 8, 64)
}

func deriveVolumeFromUpbitTrades(trades []upbitOrderTrade) string {
	if len(trades) == 0 {
		return ""
	}
	total := 0.0
	for _, fill := range trades {
		vol := strings.TrimSpace(fill.Volume)
		if vol == "" {
			continue
		}
		v, err := strconv.ParseFloat(vol, 64)
		if err != nil || v <= 0 {
			continue
		}
		total += v
	}
	if total == 0 {
		return ""
	}
	return strconv.FormatFloat(total, 'f', 8, 64)
}

func deriveAvgPriceFromUpbitTrades(trades []upbitOrderTrade) string {
	if len(trades) == 0 {
		return ""
	}
	totalFunds := 0.0
	totalVolume := 0.0
	for _, fill := range trades {
		price := strings.TrimSpace(fill.Price)
		volume := strings.TrimSpace(fill.Volume)
		if price == "" || volume == "" {
			continue
		}
		p, err1 := strconv.ParseFloat(price, 64)
		v, err2 := strconv.ParseFloat(volume, 64)
		if err1 != nil || err2 != nil || v <= 0 || p <= 0 {
			continue
		}
		totalFunds += p * v
		totalVolume += v
	}
	if totalVolume == 0 {
		return ""
	}
	return strconv.FormatFloat(totalFunds/totalVolume, 'f', 8, 64)
}

func normalizePositionSide(raw string) *string {
	value := strings.ToUpper(strings.TrimSpace(raw))
	if value == "" || value == "BOTH" {
		return nil
	}
	if value != "LONG" && value != "SHORT" {
		return nil
	}
	return &value
}

func deriveOpenClose(trade binanceFuturesTrade) *string {
	side := strings.ToUpper(strings.TrimSpace(trade.Side))
	positionSide := strings.ToUpper(strings.TrimSpace(trade.PositionSide))
	if positionSide == "LONG" {
		if side == "BUY" {
			value := "OPEN"
			return &value
		}
		if side == "SELL" {
			value := "CLOSE"
			return &value
		}
	}
	if positionSide == "SHORT" {
		if side == "SELL" {
			value := "OPEN"
			return &value
		}
		if side == "BUY" {
			value := "CLOSE"
			return &value
		}
	}
	return nil
}

func deriveReduceOnly(trade binanceFuturesTrade) *bool {
	if strings.TrimSpace(trade.RealizedPnL) == "" || strings.TrimSpace(trade.RealizedPnL) == "0" || strings.TrimSpace(trade.RealizedPnL) == "0.0" {
		return nil
	}
	openClose := deriveOpenClose(trade)
	if openClose != nil && *openClose == "CLOSE" {
		value := true
		return &value
	}
	return nil
}
```

## File: internal/services/alert_briefing_service.go
```go
package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	cryptoutil "github.com/moneyvessel/kifu/internal/infrastructure/crypto"
	"github.com/moneyvessel/kifu/internal/infrastructure/notification"
)

type AlertBriefingService struct {
	alertRepo    repositories.AlertRepository
	briefingRepo repositories.AlertBriefingRepository
	providerRepo repositories.AIProviderRepository
	userKeyRepo  repositories.UserAIKeyRepository
	channelRepo  repositories.NotificationChannelRepository
	tradeRepo    repositories.TradeRepository
	encKey       []byte
	sender       notification.Sender
	client       *http.Client
	appBaseURL   string
}

func NewAlertBriefingService(
	alertRepo repositories.AlertRepository,
	briefingRepo repositories.AlertBriefingRepository,
	providerRepo repositories.AIProviderRepository,
	userKeyRepo repositories.UserAIKeyRepository,
	channelRepo repositories.NotificationChannelRepository,
	tradeRepo repositories.TradeRepository,
	encKey []byte,
	sender notification.Sender,
) *AlertBriefingService {
	appURL := os.Getenv("APP_BASE_URL")
	if appURL == "" {
		appURL = "http://localhost:5173"
	}
	return &AlertBriefingService{
		alertRepo:    alertRepo,
		briefingRepo: briefingRepo,
		providerRepo: providerRepo,
		userKeyRepo:  userKeyRepo,
		channelRepo:  channelRepo,
		tradeRepo:    tradeRepo,
		encKey:       encKey,
		sender:       sender,
		client:       &http.Client{Timeout: 30 * time.Second},
		appBaseURL:   appURL,
	}
}

// HandleTrigger is called by AlertMonitor when an alert fires
func (s *AlertBriefingService) HandleTrigger(ctx context.Context, alert *entities.Alert, rule *entities.AlertRule) {
	log.Printf("alert briefing: HandleTrigger called for alert %s (rule: %s, symbol: %s)", alert.ID, rule.Name, alert.Symbol)

	// 1. Fetch market context
	candles, err := s.fetchKlines(ctx, alert.Symbol, "1h", 50)
	if err != nil {
		log.Printf("alert briefing: fetch klines failed: %v", err)
	}

	// 2. Fetch user positions (from trades)
	positions := s.getUserPositionSummary(ctx, alert.UserID, alert.Symbol)

	// 3. Build alert-specific prompt
	prompt := buildAlertPrompt(alert, candles, positions)

	// 4. Call all enabled AI providers
	providers, err := s.providerRepo.ListEnabled(ctx)
	if err != nil {
		log.Printf("alert briefing: list providers failed: %v", err)
		return
	}
	log.Printf("alert briefing: found %d enabled providers", len(providers))

	var briefingSummaries []string

	for _, provider := range providers {
		apiKey, err := s.resolveAPIKey(ctx, alert.UserID, provider.Name)
		if err != nil {
			log.Printf("alert briefing: %s key resolve error: %v", provider.Name, err)
			continue
		}
		if apiKey == "" {
			log.Printf("alert briefing: %s skipped (no API key)", provider.Name)
			continue
		}
		log.Printf("alert briefing: calling %s (model: %s, key: %s...)", provider.Name, provider.Model, apiKey[:min(8, len(apiKey))])

		model := provider.Model
		responseText, tokensUsed, err := s.callProvider(ctx, provider.Name, model, apiKey, prompt)
		if err != nil {
			log.Printf("alert briefing: %s call failed: %v", provider.Name, err)
			continue
		}
		log.Printf("alert briefing: %s responded (%d chars)", provider.Name, len(responseText))

		briefing := &entities.AlertBriefing{
			ID:        uuid.New(),
			AlertID:   alert.ID,
			Provider:  provider.Name,
			Model:     model,
			Prompt:    prompt,
			Response:  responseText,
			TokensUsed: tokensUsed,
			CreatedAt: time.Now().UTC(),
		}

		if err := s.briefingRepo.Create(ctx, briefing); err != nil {
			log.Printf("alert briefing: save failed: %v", err)
			continue
		}

		briefingSummaries = append(briefingSummaries, responseText)
	}

	// 5. Update alert status
	if err := s.alertRepo.UpdateStatus(ctx, alert.ID, entities.AlertStatusBriefed); err != nil {
		log.Printf("alert briefing: update status failed: %v", err)
	}

	// 6. Send notification
	if s.sender == nil {
		return
	}

	body := fmt.Sprintf("현재: $%s\n%s", alert.TriggerPrice, positions)
	if len(briefingSummaries) > 0 {
		body += "\n\n📊 AI 브리핑:\n" + briefingSummaries[0]
	}

	msg := notification.Message{
		Title:    alert.TriggerReason,
		Body:     body,
		Severity: string(alert.Severity),
		DeepLink: fmt.Sprintf("%s/alerts/%s", s.appBaseURL, alert.ID.String()),
	}

	if err := s.sender.Send(ctx, alert.UserID, msg); err != nil {
		log.Printf("alert briefing: send notification failed: %v", err)
	} else {
		_ = s.alertRepo.SetNotified(ctx, alert.ID)
	}
}

func (s *AlertBriefingService) getUserPositionSummary(ctx context.Context, userID uuid.UUID, symbol string) string {
	trades, err := s.tradeRepo.ListByUserAndSymbol(ctx, userID, symbol)
	if err != nil || len(trades) == 0 {
		return "포지션: 없음"
	}

	// Simple aggregation of recent trades
	var totalBuy, totalSell float64
	for _, t := range trades {
		qty := parseFloat(t.Quantity)
		if strings.EqualFold(t.Side, "BUY") {
			totalBuy += qty
		} else {
			totalSell += qty
		}
	}

	net := totalBuy - totalSell
	if net > 0.0001 {
		return fmt.Sprintf("포지션: Long %.4f %s", net, symbol)
	} else if net < -0.0001 {
		return fmt.Sprintf("포지션: Short %.4f %s", -net, symbol)
	}
	return "포지션: 없음 (최근 거래 있음)"
}

func parseFloat(s string) float64 {
	var f float64
	fmt.Sscanf(s, "%f", &f)
	return f
}

type klineItem struct {
	Time   int64
	Open   string
	High   string
	Low    string
	Close  string
	Volume string
}

func (s *AlertBriefingService) fetchKlines(ctx context.Context, symbol string, interval string, limit int) ([]klineItem, error) {
	params := url.Values{}
	params.Set("symbol", symbol)
	params.Set("interval", interval)
	params.Set("limit", fmt.Sprintf("%d", limit))

	reqURL := fmt.Sprintf("https://fapi.binance.com/fapi/v1/klines?%s", params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("klines error %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var raw [][]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	items := make([]klineItem, 0, len(raw))
	for _, row := range raw {
		if len(row) < 6 {
			continue
		}
		openTime, _ := row[0].(float64)
		open, _ := row[1].(string)
		high, _ := row[2].(string)
		low, _ := row[3].(string)
		closeVal, _ := row[4].(string)
		volume, _ := row[5].(string)

		items = append(items, klineItem{
			Time:   int64(openTime) / 1000,
			Open:   open,
			High:   high,
			Low:    low,
			Close:  closeVal,
			Volume: volume,
		})
	}

	return items, nil
}

func (s *AlertBriefingService) resolveAPIKey(ctx context.Context, userID uuid.UUID, provider string) (string, error) {
	key, err := s.userKeyRepo.GetByUserAndProvider(ctx, userID, provider)
	if err != nil {
		return "", err
	}
	if key != nil {
		return cryptoutil.Decrypt(key.APIKeyEnc, s.encKey)
	}

	switch provider {
	case "openai":
		return strings.TrimSpace(os.Getenv("OPENAI_API_KEY")), nil
	case "claude":
		return strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY")), nil
	case "gemini":
		return strings.TrimSpace(os.Getenv("GEMINI_API_KEY")), nil
	}
	return "", nil
}

func (s *AlertBriefingService) callProvider(ctx context.Context, provider, model, apiKey, prompt string) (string, *int, error) {
	switch provider {
	case "openai":
		return s.callOpenAI(ctx, model, apiKey, prompt)
	case "claude":
		return s.callClaude(ctx, model, apiKey, prompt)
	case "gemini":
		return s.callGemini(ctx, model, apiKey, prompt)
	}
	return "", nil, errors.New("unsupported provider")
}

func (s *AlertBriefingService) callOpenAI(ctx context.Context, model, apiKey, prompt string) (string, *int, error) {
	payload := map[string]interface{}{
		"model":       model,
		"messages":    []map[string]string{{"role": "user", "content": prompt}},
		"temperature": 0.3,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("openai error %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		Choices []struct {
			Message struct{ Content string } `json:"message"`
		} `json:"choices"`
		Usage struct{ TotalTokens int `json:"total_tokens"` } `json:"usage"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	if len(result.Choices) == 0 {
		return "", nil, errors.New("no choices")
	}
	t := result.Usage.TotalTokens
	return strings.TrimSpace(result.Choices[0].Message.Content), &t, nil
}

func (s *AlertBriefingService) callClaude(ctx context.Context, model, apiKey, prompt string) (string, *int, error) {
	payload := map[string]interface{}{
		"model":       model,
		"max_tokens":  512,
		"temperature": 0.3,
		"messages":    []map[string]string{{"role": "user", "content": prompt}},
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("claude error %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		Content []struct{ Text string } `json:"content"`
		Usage   struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	if len(result.Content) == 0 {
		return "", nil, errors.New("no content")
	}
	t := result.Usage.InputTokens + result.Usage.OutputTokens
	return strings.TrimSpace(result.Content[0].Text), &t, nil
}

func (s *AlertBriefingService) callGemini(ctx context.Context, model, apiKey, prompt string) (string, *int, error) {
	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{{"text": prompt}}},
		},
	}
	body, _ := json.Marshal(payload)

	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, url.QueryEscape(apiKey))
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("gemini error %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct{ Text string } `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		UsageMetadata struct{ TotalTokenCount int `json:"totalTokenCount"` } `json:"usageMetadata"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", nil, errors.New("no content")
	}
	t := result.UsageMetadata.TotalTokenCount
	if t == 0 {
		return strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text), nil, nil
	}
	return strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text), &t, nil
}

func buildAlertPrompt(alert *entities.Alert, candles []klineItem, positionSummary string) string {
	var b strings.Builder
	b.WriteString("당신은 암호화폐 트레이딩 위기 대응 어드바이저입니다.\n\n")
	b.WriteString("## 긴급 상황\n")
	b.WriteString(fmt.Sprintf("- 심볼: %s\n", alert.Symbol))
	b.WriteString(fmt.Sprintf("- 트리거: %s\n", alert.TriggerReason))
	b.WriteString(fmt.Sprintf("- 현재가: $%s\n", alert.TriggerPrice))
	b.WriteString(fmt.Sprintf("- 시각: %s\n\n", alert.CreatedAt.Format("2006-01-02 15:04 UTC")))

	b.WriteString(fmt.Sprintf("## 유저 포지션\n%s\n\n", positionSummary))

	if len(candles) > 0 {
		b.WriteString("## 최근 시장 데이터 (1h 캔들)\n")
		for _, c := range candles {
			b.WriteString(fmt.Sprintf("%d, O:%s H:%s L:%s C:%s V:%s\n",
				c.Time, c.Open, c.High, c.Low, c.Close, c.Volume))
		}
		b.WriteString("\n")
	}

	b.WriteString(`## 요청
1. 현재 상황을 3줄로 요약
2. 즉시 행동 권고 (매수/매도/홀드/감축 중 택 1)
3. 권고 이유 (2줄)
4. 주의할 리스크 (1줄)
5. 확신도 (1~10)

간결하게 답변하세요. 숫자와 근거 중심으로.`)

	return b.String()
}

func firstLine(s string) string {
	idx := strings.IndexByte(s, '\n')
	if idx < 0 {
		if len(s) > 100 {
			return s[:100] + "..."
		}
		return s
	}
	line := s[:idx]
	if len(line) > 100 {
		return line[:100] + "..."
	}
	return line
}
```

## File: internal/services/direction_extractor.go
```go
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
```

## File: internal/services/summary_pack_service.go
```go
package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/entities"
)

const (
	summaryPackSchemaV1 = "summary_pack_v1"
	summaryPackCalcV1   = "ledger_calc_v1.0.0"
)

var (
	range30d                 = 30 * 24 * time.Hour
	range7d                  = 7 * 24 * time.Hour
	fixRange6h               = 6 * time.Hour
	minMissingTradeThreshold = 10

	symbolRegex = regexp.MustCompile(`^[A-Z0-9]+(?:-[A-Z0-9]+)?$`)
)

type tradeRangeQuerier interface {
	ListByTimeRange(ctx context.Context, userID uuid.UUID, from, to time.Time) ([]*entities.Trade, error)
}

type SummaryPackService struct {
	tradeRepo tradeRangeQuerier
	now       func() time.Time
}

func NewSummaryPackService(tradeRepo tradeRangeQuerier) *SummaryPackService {
	return &SummaryPackService{
		tradeRepo: tradeRepo,
		now:       time.Now,
	}
}

type summaryPackRange struct {
	start time.Time
	end   time.Time
}

func resolveRange(rangeValue string, now time.Time) (summaryPackRange, error) {
	now = now.UTC()
	switch strings.TrimSpace(rangeValue) {
	case "", "30d":
		return summaryPackRange{
			start: now.Add(-range30d),
			end:   now,
		}, nil
	case "7d":
		return summaryPackRange{
			start: now.Add(-range7d),
			end:   now,
		}, nil
	case "all":
		return summaryPackRange{
			start: now.AddDate(-10, 0, 0),
			end:   now,
		}, nil
	default:
		return summaryPackRange{}, fmt.Errorf("unsupported range: %s", rangeValue)
	}
}

func normalizeDecimal(value *big.Rat) *string {
	if value == nil {
		return nil
	}

	if value.Sign() == 0 {
		return ptr("0")
	}

	s := value.FloatString(8)
	s = strings.TrimRight(s, "0")
	s = strings.TrimRight(s, ".")
	if s == "" || s == "-0" {
		s = "0"
	}
	return &s
}

func ptr(value string) *string {
	v := value
	return &v
}

func parseDecimal(raw string) *big.Rat {
	r := new(big.Rat)
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}
	if _, ok := r.SetString(trimmed); ok {
		return r
	}
	return nil
}

func toTradeSymbolNormalized(raw string) string {
	trimmed := strings.ToUpper(strings.TrimSpace(raw))
	if trimmed == "" {
		return "unknown"
	}
	if strings.Contains(trimmed, " ") || strings.Contains(trimmed, "/") || strings.Contains(trimmed, "_") {
		return "invalid"
	}
	if symbolRegex.MatchString(trimmed) {
		return trimmed
	}
	return "invalid"
}

func hasWarning(list []string, target string) bool {
	for _, item := range list {
		if item == target {
			return true
		}
	}
	return false
}

func addUniqueWarning(list *[]string, message string) {
	if !hasWarning(*list, message) {
		*list = append(*list, message)
	}
}

type summaryPackTimeRangeV1 struct {
	Timezone string `json:"timezone"`
	StartTs  string `json:"start_ts"`
	EndTs    string `json:"end_ts"`
}

type summaryPackDataSourcesV1 struct {
	Exchanges   []string `json:"exchanges"`
	CSVImported bool     `json:"csv_imported"`
	Modules     []string `json:"modules"`
}

type summaryPackPnLV1 struct {
	RealizedPnLTotal      *string `json:"realized_pnl_total"`
	UnrealizedPnLSnapshot *string `json:"unrealized_pnl_snapshot"`
	FeesTotal             *string `json:"fees_total"`
	FundingTotal          *string `json:"funding_total"`
}

type summaryPackFlowV1 struct {
	NetExchangeFlow *string `json:"net_exchange_flow"`
	NetWalletFlow   *string `json:"net_wallet_flow"`
}

type summaryPackActivityV1 struct {
	TradeCount          int     `json:"trade_count"`
	NotionalVolumeTotal *string `json:"notional_volume_total"`
	LongShortRatio      *string `json:"long_short_ratio"`
	LeverageSummary     *string `json:"leverage_summary"`
	MaxDrawdownEst      *string `json:"max_drawdown_est"`
}

type summaryPackReconciliationV1 struct {
	ReconciliationStatus   string   `json:"reconciliation_status"`
	MissingSuspectsCount   int      `json:"missing_suspects_count"`
	DuplicateSuspectsCount int      `json:"duplicate_suspects_count"`
	NormalizationWarnings  []string `json:"normalization_warnings"`
}

type summaryPackEvidenceV1 struct {
	ExchangeTradeIDsSample []string `json:"exchange_trade_ids_sample"`
	EvidencePackRef        string   `json:"evidence_pack_ref"`
}

type summaryPackPayloadV1 struct {
	PackID          string                      `json:"pack_id"`
	SchemaVersion   string                      `json:"schema_version"`
	CalcVersion     string                      `json:"calc_version"`
	ContentHash     string                      `json:"content_hash"`
	TimeRange       summaryPackTimeRangeV1      `json:"time_range"`
	DataSources     summaryPackDataSourcesV1    `json:"data_sources"`
	PnLSummary      summaryPackPnLV1            `json:"pnl_summary"`
	FlowSummary     summaryPackFlowV1           `json:"flow_summary"`
	ActivitySummary summaryPackActivityV1       `json:"activity_summary"`
	Reconciliation  summaryPackReconciliationV1 `json:"reconciliation"`
	EvidenceIndex   summaryPackEvidenceV1       `json:"evidence_index"`
}

type runInfoForSummary struct {
	runType string
	meta    map[string]any
}

func buildRunInfo(run *entities.Run) runInfoForSummary {
	meta := map[string]any{}
	if run != nil && len(run.Meta) > 0 {
		_ = json.Unmarshal(run.Meta, &meta)
	}
	if run == nil {
		return runInfoForSummary{}
	}
	return runInfoForSummary{
		runType: run.RunType,
		meta:    meta,
	}
}

func (s *SummaryPackService) GeneratePack(ctx context.Context, userID uuid.UUID, sourceRun *entities.Run, rangeValue string) (*entities.SummaryPack, string, error) {
	if sourceRun == nil {
		return nil, "", errors.New("source run is required")
	}

	resolvedRange, err := resolveRange(rangeValue, s.now())
	if err != nil {
		return nil, "", err
	}

	trades, err := s.tradeRepo.ListByTimeRange(ctx, userID, resolvedRange.start, resolvedRange.end)
	if err != nil {
		return nil, "", err
	}

	var (
		exchanges            = map[string]struct{}{}
		seenTradeKeys        = map[string]struct{}{}
		timeStamps           = make([]int64, 0, len(trades))
		realizedPnL          = new(big.Rat)
		feesTotal            = new(big.Rat)
		flowExchange         = new(big.Rat)
		notional             = new(big.Rat)
		duplicateCount       int
		buyCount             int
		sellCount            int
		warnings             []string
		samples              []string
		runCtx               = buildRunInfo(sourceRun)
		fundingModuleEnabled bool
		modules              = map[string]struct{}{"trades": {}}
	)

	if rawModules, ok := runCtx.meta["modules"]; ok {
		if arr, ok := rawModules.([]any); ok {
			for _, item := range arr {
				if module, ok := item.(string); ok {
					module = strings.ToLower(strings.TrimSpace(module))
					if module != "" {
						modules[module] = struct{}{}
						if module == "funding" {
							fundingModuleEnabled = true
						}
					}
				}
			}
		}
	}
	if runCtx.runType == "exchange_sync" {
		modules["trades"] = struct{}{}
		if rawExchange, ok := runCtx.meta["exchange"]; ok {
			if exchange, ok := rawExchange.(string); ok && strings.TrimSpace(exchange) != "" {
				exchanges[strings.ToLower(strings.TrimSpace(exchange))] = struct{}{}
			}
		}
	}

	if fundingModuleEnabled {
		modules["funding"] = struct{}{}
	}

	for _, trade := range trades {
		if trade == nil {
			continue
		}
		exchange := strings.ToLower(strings.TrimSpace(trade.Exchange))
		if exchange != "" {
			exchanges[exchange] = struct{}{}
		}

		normalized := toTradeSymbolNormalized(trade.Symbol)
		if normalized == "unknown" || normalized == "invalid" {
			addUniqueWarning(&warnings, "symbol_mapping_gap")
		}

		key := fmt.Sprintf("fallback:%s|%s|%s|%s|%s", trade.Exchange, trade.Symbol, trade.Side, trade.Price, trade.Quantity)
		if trade.BinanceTradeID != 0 {
			key = fmt.Sprintf("id:%d", trade.BinanceTradeID)
		}
		if _, exists := seenTradeKeys[key]; exists {
			duplicateCount += 1
		} else {
			seenTradeKeys[key] = struct{}{}
		}

		timeStamps = append(timeStamps, trade.TradeTime.Unix())

		if len(samples) < 10 && trade.BinanceTradeID != 0 {
			samples = append(samples, fmt.Sprintf("%d", trade.BinanceTradeID))
		}

		if trade.Side == "BUY" {
			buyCount += 1
		} else if trade.Side == "SELL" {
			sellCount += 1
		}

		if trade.RealizedPnL != nil {
			if pnl := parseDecimal(*trade.RealizedPnL); pnl != nil {
				realizedPnL.Add(realizedPnL, pnl)
			}
		}

		qtyRat := parseDecimal(trade.Quantity)
		priceRat := parseDecimal(trade.Price)
		if qtyRat != nil && priceRat != nil {
			notionalPart := new(big.Rat).Mul(qtyRat, priceRat)
			notional.Add(notional, notionalPart)
			tmp := new(big.Rat).Set(notionalPart)
			if trade.Side == "SELL" {
				tmp.Neg(tmp)
			}
			flowExchange.Add(flowExchange, tmp)
		}
	}

	if len(timeStamps) >= 2 {
		sorted := append([]int64{}, timeStamps...)
		sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })
		median := sorted[len(sorted)/2]
		for _, unixTs := range timeStamps {
			diff := time.Duration(absInt64(unixTs-median)) * time.Second
			if diff > fixRange6h {
				addUniqueWarning(&warnings, "time_skew")
				break
			}
		}
	}

	exchangeIDs := make([]string, 0, len(exchanges))
	for exchange := range exchanges {
		exchangeIDs = append(exchangeIDs, exchange)
	}
	sort.Strings(exchangeIDs)

	moduleNames := make([]string, 0, len(modules))
	for module := range modules {
		moduleNames = append(moduleNames, module)
	}
	sort.Strings(moduleNames)

	isFundingData := fundingModuleEnabled && hasFuturesExchange(exchanges)
	missingCount := 0
	if len(trades) >= minMissingTradeThreshold && feesTotal.Sign() == 0 {
		missingCount += 1
	}
	if isFundingData && len(trades) >= minMissingTradeThreshold && isZeroRatOrNil(nil) {
		missingCount += 1
	}

	var fundingTotal *string
	if isFundingData {
		fundingTotal = nil
	}

	var lsr *string
	if sellCount > 0 && buyCount > 0 {
		ratio := new(big.Rat).SetFrac(big.NewInt(int64(buyCount)), big.NewInt(int64(sellCount)))
		lsr = normalizeDecimal(ratio)
	}

	notionalTotal := normalizeDecimal(notional)
	recoStatus := "ok"
	if missingCount >= 10 {
		recoStatus = "error"
	}
	if missingCount > 0 || duplicateCount > 0 || len(warnings) > 0 {
		if recoStatus != "error" {
			recoStatus = "warning"
		}
	}

	payload := summaryPackPayloadV1{
		PackID:        uuid.New().String(),
		SchemaVersion: summaryPackSchemaV1,
		CalcVersion:   summaryPackCalcV1,
		ContentHash:   "",
		TimeRange: summaryPackTimeRangeV1{
			Timezone: "Asia/Seoul",
			StartTs:  resolvedRange.start.UTC().Format(time.RFC3339),
			EndTs:    resolvedRange.end.UTC().Format(time.RFC3339),
		},
		DataSources: summaryPackDataSourcesV1{
			Exchanges:   exchangeIDs,
			CSVImported: runCtx.runType == "trade_csv_import" || runCtx.runType == "portfolio_csv_import",
			Modules:     moduleNames,
		},
		PnLSummary: summaryPackPnLV1{
			RealizedPnLTotal:      normalizeDecimal(realizedPnL),
			UnrealizedPnLSnapshot: nil,
			FeesTotal:             normalizeDecimal(feesTotal),
			FundingTotal:          fundingTotal,
		},
		FlowSummary: summaryPackFlowV1{
			NetExchangeFlow: normalizeDecimal(flowExchange),
			NetWalletFlow:   nil,
		},
		ActivitySummary: summaryPackActivityV1{
			TradeCount:          len(trades),
			NotionalVolumeTotal: notionalTotal,
			LongShortRatio:      lsr,
			LeverageSummary:     nil,
			MaxDrawdownEst:      nil,
		},
		Reconciliation: summaryPackReconciliationV1{
			ReconciliationStatus:   recoStatus,
			MissingSuspectsCount:   missingCount,
			DuplicateSuspectsCount: duplicateCount,
			NormalizationWarnings:  warnings,
		},
		EvidenceIndex: summaryPackEvidenceV1{
			ExchangeTradeIDsSample: samples,
			EvidencePackRef:        "",
		},
	}

	payloadWithoutHash := payload
	hashInput, err := json.Marshal(payloadWithoutHash)
	if err != nil {
		return nil, "", err
	}
	contentHash := sha256.Sum256(hashInput)
	hashHex := hex.EncodeToString(contentHash[:])

	payload.ContentHash = hashHex

	packed, err := json.Marshal(payload)
	if err != nil {
		return nil, "", err
	}

	pack := &entities.SummaryPack{
		PackID:                 uuid.MustParse(payload.PackID),
		UserID:                 userID,
		SourceRunID:            sourceRun.RunID,
		Range:                  strings.TrimSpace(rangeValue),
		SchemaVersion:          summaryPackSchemaV1,
		CalcVersion:            summaryPackCalcV1,
		ContentHash:            hashHex,
		ReconciliationStatus:   recoStatus,
		MissingSuspectsCount:   missingCount,
		DuplicateSuspectsCount: duplicateCount,
		NormalizationWarnings:  warnings,
		Payload:                packed,
	}

	if pack.Range == "" {
		pack.Range = "30d"
	}

	// Pack-level evidence ref after payload creation.
	payload.EvidenceIndex.EvidencePackRef = fmt.Sprintf("evidence_pack://%s", pack.PackID)
	// Recompute hash with evidence ref included.
	payloadHashInput, err := json.Marshal(payload)
	if err != nil {
		return nil, "", err
	}
	recompute := sha256.Sum256(payloadHashInput)
	pack.ContentHash = hex.EncodeToString(recompute[:])
	pack.Payload, err = json.Marshal(payload)
	if err != nil {
		return nil, "", err
	}

	return pack, pack.ContentHash, nil
}

func absInt64(value int64) int64 {
	if value < 0 {
		return -value
	}
	return value
}

func hasFuturesExchange(exchanges map[string]struct{}) bool {
	_, ok := exchanges["binance_futures"]
	return ok
}

func isZeroRatOrNil(value *string) bool {
	if value == nil {
		return true
	}
	r := new(big.Rat)
	if _, ok := r.SetString(*value); !ok {
		return false
	}
	return r.Sign() == 0
}

// Parse summary range strings only from the v1 spec.
func ParseSummaryRange(rangeValue string) (time.Duration, error) {
	switch strings.TrimSpace(rangeValue) {
	case "", "30d":
		return range30d, nil
	case "7d":
		return range7d, nil
	case "all":
		return 0, nil
	default:
		return 0, fmt.Errorf("unsupported range: %s", rangeValue)
	}
}
```

## File: scripts/seed_trades/main.go
```go
package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	domainrepos "github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/auth"
	"github.com/moneyvessel/kifu/internal/infrastructure/database"
	"github.com/moneyvessel/kifu/internal/infrastructure/repositories"
)

func main() {
	_ = godotenv.Load()
	ctx := context.Background()

	databaseURL := getenvOrFail("DATABASE_URL")
	pool, err := database.NewPostgresPool(databaseURL)
	if err != nil {
		log.Fatalf("db connect failed: %v", err)
	}
	defer pool.Close()

	userRepo := repositories.NewUserRepository(pool)
	subRepo := repositories.NewSubscriptionRepository(pool)
	tradeRepo := repositories.NewTradeRepository(pool)

	user := ensureUser(ctx, userRepo, subRepo)

	seedTrades(ctx, tradeRepo, user, "binance_futures", []string{"BTCUSDT", "ETHUSDT", "SOLUSDT"}, 240, 100000)
	seedTrades(ctx, tradeRepo, user, "upbit", []string{"BTC-KRW", "ETH-KRW", "XRP-KRW"}, 240, 200000)

	log.Printf("Seeded dummy trades for user %s", user.Email)
}

func seedTrades(
	ctx context.Context,
	tradeRepo domainrepos.TradeRepository,
	user *entities.User,
	exchange string,
	symbols []string,
	count int,
	idStart int64,
) {
	randSource := rand.New(rand.NewSource(time.Now().UnixNano()))
	for idx := 0; idx < count; idx++ {
		symbol := symbols[idx%len(symbols)]
		side := "BUY"
		if idx%2 == 1 {
			side = "SELL"
		}
		price := 20000 + randSource.Float64()*25000
		quantity := 0.05 + randSource.Float64()*0.5
		realizedPnL := (randSource.Float64()*2 - 1) * 120

		tradeTime := time.Now().UTC().Add(-time.Duration(randSource.Intn(180*24)) * time.Hour)
		trade := &entities.Trade{
			ID:             uuid.New(),
			UserID:         user.ID,
			BinanceTradeID: idStart + int64(idx),
			Exchange:       exchange,
			Symbol:         symbol,
			Side:           side,
			Quantity:       fmt.Sprintf("%.4f", quantity),
			Price:          fmt.Sprintf("%.2f", price),
			TradeTime:      tradeTime,
		}
		pnl := fmt.Sprintf("%.2f", realizedPnL)
		trade.RealizedPnL = &pnl

		if err := tradeRepo.Create(ctx, trade); err != nil {
			log.Printf("trade create failed: %v", err)
		}
	}
}

func ensureUser(ctx context.Context, userRepo domainrepos.UserRepository, subRepo domainrepos.SubscriptionRepository) *entities.User {
	email := getenvOrDefault("SEED_USER_EMAIL", "guest.preview@kifu.local")
	password := getenvOrDefault("SEED_USER_PASSWORD", "guest1234")
	name := getenvOrDefault("SEED_USER_NAME", "Guest Preview")

	user, err := userRepo.GetByEmail(ctx, email)
	if err != nil {
		log.Fatalf("fetch user failed: %v", err)
	}
	if user != nil {
		return user
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatalf("hash password failed: %v", err)
	}

	newUser := &entities.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: hash,
		Name:         name,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	if err := userRepo.Create(ctx, newUser); err != nil {
		log.Fatalf("create user failed: %v", err)
	}

	if err := subRepo.Create(ctx, &entities.Subscription{
		ID:               uuid.New(),
		UserID:           newUser.ID,
		Tier:             "free",
		AIQuotaRemaining: 20,
		AIQuotaLimit:     20,
		LastResetAt:      time.Now().UTC(),
		ExpiresAt:        nil,
	}); err != nil {
		log.Fatalf("create subscription failed: %v", err)
	}

	return newUser
}

func getenvOrFail(name string) string {
	value := os.Getenv(name)
	if value == "" {
		log.Fatalf("%s is required", name)
	}
	return value
}

func getenvOrDefault(name, defaultValue string) string {
	value := os.Getenv(name)
	if value == "" {
		return defaultValue
	}
	return value
}
```

## File: scripts/seed_dummy.go
```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	domainrepos "github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/auth"
	"github.com/moneyvessel/kifu/internal/infrastructure/database"
	"github.com/moneyvessel/kifu/internal/infrastructure/repositories"
)

func main() {
	_ = godotenv.Load()
	ctx := context.Background()

	databaseURL := getenvOrFail("DATABASE_URL")
	pool, err := database.NewPostgresPool(databaseURL)
	if err != nil {
		log.Fatalf("db connect failed: %v", err)
	}
	defer pool.Close()

	userRepo := repositories.NewUserRepository(pool)
	subRepo := repositories.NewSubscriptionRepository(pool)
	bubbleRepo := repositories.NewBubbleRepository(pool)
	opinionRepo := repositories.NewAIOpinionRepository(pool)
	outcomeRepo := repositories.NewOutcomeRepository(pool)

	user := ensureUser(ctx, userRepo, subRepo)
	seedBubbles(ctx, user, bubbleRepo, opinionRepo, outcomeRepo)

	log.Printf("Seeded dummy data for user %s", user.Email)
}

func ensureUser(ctx context.Context, userRepo domainrepos.UserRepository, subRepo domainrepos.SubscriptionRepository) *entities.User {
	email := getenvOrDefault("SEED_USER_EMAIL", "guest.preview@kifu.local")
	password := getenvOrDefault("SEED_USER_PASSWORD", "guest1234")
	name := getenvOrDefault("SEED_USER_NAME", "Guest Preview")

	user, err := userRepo.GetByEmail(ctx, email)
	if err != nil {
		log.Fatalf("fetch user failed: %v", err)
	}
	if user != nil {
		return user
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatalf("hash password failed: %v", err)
	}

	newUser := &entities.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: hash,
		Name:         name,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	if err := userRepo.Create(ctx, newUser); err != nil {
		log.Fatalf("create user failed: %v", err)
	}

	if err := subRepo.Create(ctx, &entities.Subscription{
		ID:               uuid.New(),
		UserID:           newUser.ID,
		Tier:             "free",
		AIQuotaRemaining: 20,
		AIQuotaLimit:     20,
		LastResetAt:      time.Now().UTC(),
		ExpiresAt:        nil,
	}); err != nil {
		log.Fatalf("create subscription failed: %v", err)
	}

	return newUser
}

func seedBubbles(
	ctx context.Context,
	user *entities.User,
	bubbleRepo domainrepos.BubbleRepository,
	opinionRepo domainrepos.AIOpinionRepository,
	outcomeRepo domainrepos.OutcomeRepository,
) {
	symbol := "BTCUSDT"
	baseTime := time.Now().UTC().AddDate(0, 0, -360)

	entries := []struct {
		dayOffset  int
		price      string
		memo       string
		tags       []string
		bubbleType string
	}{
		{0, "43850", "주봉 지지 확인 후 분할 매수. tweet:/dummy/tweet-1.svg", []string{"breakout", "weekly"}, "manual"},
		{18, "45200", "리테스트 성공. tweet:/dummy/tweet-2.svg", []string{"retest", "macro"}, "manual"},
		{36, "46890", "추세 상단, 일부 익절", []string{"takeprofit"}, "manual"},
		{54, "44110", "매크로 리스크, 관망", []string{"riskoff", "macro"}, "manual"},
		{72, "42600", "저점 매수 시도. tweet:/dummy/tweet-3.svg", []string{"dip", "flow"}, "manual"},
		{90, "45900", "중기 추세 복귀", []string{"trend", "support"}, "manual"},
		{120, "48100", "돌파 확인", []string{"breakout"}, "manual"},
		{150, "50500", "과열 경고", []string{"overheat"}, "manual"},
		{180, "47800", "조정 대기", []string{"pullback"}, "manual"},
		{210, "52000", "상승 재개", []string{"trend"}, "manual"},
		{240, "49650", "눌림 매수", []string{"dip"}, "manual"},
		{270, "53200", "목표가 접근", []string{"target"}, "manual"},
	}

	for idx, entry := range entries {
		candleTime := baseTime.AddDate(0, 0, entry.dayOffset)
		bubble := &entities.Bubble{
			ID:         uuid.New(),
			UserID:     user.ID,
			Symbol:     symbol,
			Timeframe:  "1d",
			CandleTime: candleTime,
			Price:      entry.price,
			BubbleType: entry.bubbleType,
			Memo:       strPtr(entry.memo),
			Tags:       entry.tags,
			CreatedAt:  time.Now().UTC(),
		}

		if err := bubbleRepo.Create(ctx, bubble); err != nil {
			log.Printf("bubble create failed: %v", err)
			continue
		}

		createOpinions(ctx, bubble, opinionRepo, idx)
		createOutcomes(ctx, bubble, outcomeRepo, idx)
	}
}

func createOpinions(ctx context.Context, bubble *entities.Bubble, repo domainrepos.AIOpinionRepository, seed int) {
	responses := []struct {
		provider string
		model    string
		text     string
	}{
		{"openai", "gpt-4o", "리스크/보상 비율은 양호하지만, 레인지 상단에서 변동성이 확대될 수 있습니다."},
		{"claude", "claude-3-5-sonnet-latest", "이 가격대는 직전 유동성 구간이므로 손절 기준을 명확히 하세요."},
		{"gemini", "gemini-1.5-pro", "거래량이 유지된다면 상방 확률이 높습니다. 다만 눌림 가능성도 열어두세요."},
	}

	for idx, response := range responses {
		if (seed+idx)%2 == 1 {
			continue
		}
		opinion := &entities.AIOpinion{
			ID:             uuid.New(),
			BubbleID:       bubble.ID,
			Provider:       response.provider,
			Model:          response.model,
			PromptTemplate: "dummy-seed",
			Response:       response.text,
			TokensUsed:     intPtr(512 + idx*50),
			CreatedAt:      time.Now().UTC(),
		}
		if err := repo.Create(ctx, opinion); err != nil {
			log.Printf("opinion create failed: %v", err)
		}
	}
}

func createOutcomes(ctx context.Context, bubble *entities.Bubble, repo domainrepos.OutcomeRepository, seed int) {
	periods := []string{"1h", "4h", "1d"}
	for idx, period := range periods {
		pnl := fmt.Sprintf("%.2f", (float64(seed+idx%3)-1.0)*1.25)
		outcome := &entities.Outcome{
			ID:             uuid.New(),
			BubbleID:       bubble.ID,
			Period:         period,
			ReferencePrice: bubble.Price,
			OutcomePrice:   bubble.Price,
			PnLPercent:     pnl,
			CalculatedAt:   time.Now().UTC(),
		}
		if _, err := repo.CreateIfNotExists(ctx, outcome); err != nil {
			log.Printf("outcome create failed: %v", err)
		}
	}
}

func getenvOrFail(name string) string {
	value := os.Getenv(name)
	if value == "" {
		log.Fatalf("%s is required", name)
	}
	return value
}

func getenvOrDefault(name, defaultValue string) string {
	value := os.Getenv(name)
	if value == "" {
		return defaultValue
	}
	return value
}

func strPtr(value string) *string {
	return &value
}

func intPtr(value int) *int {
	return &value
}
```
