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
