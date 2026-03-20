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
	userIdentityRepo := repositories.NewUserIdentityRepository(pool)
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
	tradePlanRepo := repositories.NewTradePlanRepository(pool)
	marketingRepo := repositories.NewMarketingRepository(pool)
	growthRepo := repositories.NewGrowthRepository(pool)
	poller := jobs.NewTradePoller(pool, exchangeRepo, userSymbolRepo, tradeSyncRepo, portfolioRepo, encKey)

	// Telegram sender (optional - only if TELEGRAM_BOT_TOKEN is set)
	var tgSender *notification.TelegramSender
	tgBotToken := strings.TrimSpace(os.Getenv("TELEGRAM_BOT_TOKEN"))
	tgBotUsername := strings.TrimSpace(os.Getenv("TELEGRAM_BOT_USERNAME"))
	if tgBotToken != "" {
		tgSender = notification.NewTelegramSender(tgBotToken, channelRepo)
	}

	// Review bot service (Telegram trade plan recording)
	var reviewBot *services.ReviewBotService
	if tgSender != nil {
		reviewBot = services.NewReviewBotService(tradePlanRepo, channelRepo, alertRepo, tradeRepo, tgSender)
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
		corsOrigins = strings.Join([]string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
			"http://localhost:3001",
			"http://127.0.0.1:3001",
			"http://localhost:3000",
			"http://127.0.0.1:3000",
		}, ",")
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
			path == "/api/v1/growth/events" ||
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

	monthlyReportRepo := repositories.NewMonthlyReportRepository(pool)
	monthlyReportService := services.NewMonthlyReportService(
		monthlyReportRepo, tradeRepo, bubbleRepo, accuracyRepo, safetyRepo,
	)
	growthService := services.NewGrowthOSService(growthRepo, tradeRepo)

	http.RegisterRoutes(
		app,
		pool,
		userRepo,
		userIdentityRepo,
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
		reviewBot,
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
		monthlyReportRepo,
		monthlyReportService,
		marketingRepo,
		growthService,
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

	// Hook review bot into briefing service
	if reviewBot != nil {
		briefingService.SetReviewBot(reviewBot)
	}

	// Alert monitor job
	alertMonitor := jobs.NewAlertMonitor(alertRuleRepo, alertRepo, briefingService.HandleTrigger)
	alertMonitor.Start(context.Background())

	// Alert outcome calculator job
	alertOutcomeCalc := jobs.NewAlertOutcomeCalculator(alertOutcomeRepo)
	alertOutcomeCalc.Start(context.Background())

	positionCalc := jobs.NewPositionCalculator(portfolioRepo)
	positionCalc.Start(context.Background())

	// Plan matcher job (matches trade plans with actual Binance trades)
	planMatcher := jobs.NewPlanMatcher(tradePlanRepo, tgSender)
	planMatcher.Start(context.Background())

	// Monthly report auto-generation job
	monthlyReportJob := jobs.NewMonthlyReportJob(monthlyReportService, userRepo, monthlyReportRepo)
	monthlyReportJob.Start(context.Background())

	if strings.EqualFold(strings.TrimSpace(os.Getenv("GROWTH_OS_ENABLED")), "true") {
		growthJob := jobs.NewGrowthOSJob(growthService)
		growthJob.Start(context.Background())
	} else {
		log.Println("growth os: disabled by GROWTH_OS_ENABLED")
	}

	log.Printf("Server starting on port %s", port)
	return app.Listen(":" + port)
}
