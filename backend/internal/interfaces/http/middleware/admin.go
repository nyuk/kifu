package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

// RequireAdmin validates that the authenticated user exists and has is_admin=true in DB.
// It intentionally uses DB authority as the single source of truth.
func RequireAdmin(userRepo repositories.UserRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(uuid.UUID)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED", "message": "invalid or missing JWT"})
		}

		user, err := userRepo.GetByID(c.Context(), userID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": err.Error()})
		}
		if user == nil {
			return c.Status(404).JSON(fiber.Map{"code": "USER_NOT_FOUND", "message": "user not found"})
		}

		if !user.IsAdmin {
			return c.Status(403).JSON(fiber.Map{"code": "FORBIDDEN", "message": "admin access required"})
		}

		return c.Next()
	}
}
