package app

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/moneyvessel/kifu/internal/infrastructure/auth"
	"github.com/moneyvessel/kifu/internal/infrastructure/database"
	"github.com/moneyvessel/kifu/internal/infrastructure/repositories"
	"github.com/moneyvessel/kifu/internal/interfaces/http"
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

	pool, err := database.NewPostgresPool(databaseURL)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer pool.Close()

	userRepo := repositories.NewUserRepository(pool)
	refreshTokenRepo := repositories.NewRefreshTokenRepository(pool)
	subscriptionRepo := repositories.NewSubscriptionRepository(pool)

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

	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:5173",
		AllowMethods: "GET,POST,PUT,DELETE",
		AllowHeaders: "Content-Type,Authorization",
	}))

	app.Use(func(c *fiber.Ctx) error {
		path := c.Path()
		if path == "/health" || strings.HasPrefix(path, "/api/v1/auth/") {
			return c.Next()
		}

		return jwtware.New(jwtware.Config{
			SigningKey: jwtware.SigningKey{Key: []byte(jwtSecret)},
			TokenLookup: "header:Authorization",
			AuthScheme: "Bearer",
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

	http.RegisterRoutes(app, userRepo, refreshTokenRepo, subscriptionRepo, jwtSecret)

	log.Printf("Server starting on port %s", port)
	return app.Listen(":" + port)
}
