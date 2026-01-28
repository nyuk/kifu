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
	aiOpinionRepo repositories.AIOpinionRepository,
	aiProviderRepo repositories.AIProviderRepository,
	userAIKeyRepo repositories.UserAIKeyRepository,
	outcomeRepo repositories.OutcomeRepository,
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
	aiHandler := handlers.NewAIHandler(bubbleRepo, aiOpinionRepo, aiProviderRepo, userAIKeyRepo, subscriptionRepo, encryptionKey)
	outcomeHandler := handlers.NewOutcomeHandler(bubbleRepo, outcomeRepo)
	similarHandler := handlers.NewSimilarHandler(bubbleRepo)

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
}
