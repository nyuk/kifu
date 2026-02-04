package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
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
	portfolioRepo repositories.PortfolioRepository,
	safetyRepo repositories.TradeSafetyReviewRepository,
	exchangeSyncer handlers.ExchangeSyncer,
	encryptionKey []byte,
	jwtSecret string,
) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "healthy"})
	})

	authHandler := handlers.NewAuthHandler(userRepo, refreshTokenRepo, subscriptionRepo, jwtSecret)
	userHandler := handlers.NewUserHandler(userRepo, subscriptionRepo)
	exchangeHandler := handlers.NewExchangeHandler(exchangeRepo, tradeRepo, encryptionKey, exchangeSyncer)
	marketHandler := handlers.NewMarketHandler(userSymbolRepo)
	bubbleHandler := handlers.NewBubbleHandler(bubbleRepo)
	tradeHandler := handlers.NewTradeHandler(tradeRepo, bubbleRepo, userSymbolRepo)
	aiHandler := handlers.NewAIHandler(bubbleRepo, aiOpinionRepo, aiProviderRepo, userAIKeyRepo, subscriptionRepo, encryptionKey)
	outcomeHandler := handlers.NewOutcomeHandler(bubbleRepo, outcomeRepo)
	similarHandler := handlers.NewSimilarHandler(bubbleRepo)
	reviewHandler := handlers.NewReviewHandler(bubbleRepo, outcomeRepo, accuracyRepo)
	noteHandler := handlers.NewNoteHandler(noteRepo)
	exportHandler := handlers.NewExportHandler(bubbleRepo, outcomeRepo, accuracyRepo)
	portfolioHandler := handlers.NewPortfolioHandler(portfolioRepo)
	importHandler := handlers.NewImportHandler(portfolioRepo)
	connectionHandler := handlers.NewConnectionHandler()
	safetyHandler := handlers.NewSafetyHandler(safetyRepo)

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

	ai := api.Group("/bubbles")
	ai.Post("/:id/ai-opinions", aiHandler.RequestOpinions)
	ai.Get("/:id/ai-opinions", aiHandler.ListOpinions)

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

	// Unified portfolio endpoints (stubs)
	portfolio := api.Group("/portfolio")
	portfolio.Get("/timeline", portfolioHandler.Timeline)
	portfolio.Get("/positions", portfolioHandler.Positions)
	portfolio.Post("/backfill-bubbles", portfolioHandler.BackfillBubbles)

	api.Get("/instruments", portfolioHandler.Instruments)

	imports := api.Group("/imports")
	imports.Post("/trades", importHandler.ImportTrades)

	connections := api.Group("/connections")
	connections.Post("/", connectionHandler.Create)

	safety := api.Group("/safety")
	safety.Get("/today", safetyHandler.ListDaily)
	safety.Post("/reviews", safetyHandler.UpsertReview)
}
