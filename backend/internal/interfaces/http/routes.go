package http

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/notification"
	onchaininfra "github.com/moneyvessel/kifu/internal/infrastructure/onchain"
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
	baseRPCURL := strings.TrimSpace(os.Getenv("BASE_RPC_URL"))
	if baseRPCURL == "" {
		log.Println("[onchain] WARNING: BASE_RPC_URL not set, falling back to public RPC")
	} else {
		// Log only the host portion for debugging, not the full key
		parts := strings.SplitN(baseRPCURL, "/v2/", 2)
		log.Printf("[onchain] BASE_RPC_URL configured: %s/v2/***", parts[0])
	}
	baseRPCClient := onchaininfra.NewBaseRPCClient(baseRPCURL)
	onchainPackService := services.NewOnchainPackService(baseRPCClient)
	onchainHandler := handlers.NewOnchainHandler(onchainPackService)
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

	onchain := api.Group("/onchain")
	onchain.Post("/quick-check", onchainHandler.QuickCheck)

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
