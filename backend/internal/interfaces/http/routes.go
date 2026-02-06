package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/notification"
	"github.com/moneyvessel/kifu/internal/interfaces/http/handlers"
)

func RegisterRoutes(
	app *fiber.App,
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
	encryptionKey []byte,
	jwtSecret string,
) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "healthy"})
	})

	authHandler := handlers.NewAuthHandler(userRepo, refreshTokenRepo, subscriptionRepo, jwtSecret)
	userHandler := handlers.NewUserHandler(userRepo, subscriptionRepo)
	exchangeHandler := handlers.NewExchangeHandler(exchangeRepo, encryptionKey)
	marketHandler := handlers.NewMarketHandler(userSymbolRepo)
	bubbleHandler := handlers.NewBubbleHandler(bubbleRepo)
	tradeHandler := handlers.NewTradeHandler(tradeRepo, bubbleRepo, userSymbolRepo)
	aiHandler := handlers.NewAIHandler(bubbleRepo, aiOpinionRepo, aiProviderRepo, userAIKeyRepo, subscriptionRepo, encryptionKey)
	outcomeHandler := handlers.NewOutcomeHandler(bubbleRepo, outcomeRepo)
	similarHandler := handlers.NewSimilarHandler(bubbleRepo)
	reviewHandler := handlers.NewReviewHandler(bubbleRepo, outcomeRepo, accuracyRepo)
	noteHandler := handlers.NewNoteHandler(noteRepo)
	exportHandler := handlers.NewExportHandler(bubbleRepo, outcomeRepo, accuracyRepo)
	alertRuleHandler := handlers.NewAlertRuleHandler(alertRuleRepo)
	alertNotifHandler := handlers.NewAlertNotificationHandler(alertRepo, alertBriefingRepo, alertDecisionRepo, alertOutcomeRepo)
	notificationHandler := handlers.NewNotificationHandler(channelRepo, verifyCodeRepo, tgSender)

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

	ai := api.Group("/bubbles")
	ai.Post("/:id/ai-opinions", aiHandler.RequestOpinions)
	ai.Get("/:id/ai-opinions", aiHandler.ListOpinions)

	trades := api.Group("/trades")
	trades.Post("/import", tradeHandler.Import)
	trades.Get("/", tradeHandler.List)
	trades.Get("/summary", tradeHandler.Summary)
	trades.Post("/convert-bubbles", tradeHandler.ConvertBubbles)
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
}
