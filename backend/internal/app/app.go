package app

import (
	"github.com/gofiber/fiber/v2"
	"github.com/moneyvessel/kifu/internal/interfaces/http"
)

func Run() error {
	app := fiber.New()
	http.RegisterRoutes(app)
	return app.Listen(":3000")
}
