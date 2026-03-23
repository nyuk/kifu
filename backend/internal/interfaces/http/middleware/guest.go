package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/moneyvessel/kifu/internal/domain/repositories"
)

const guestPreviewEmail = "guest.preview@kifu.local"

var guestBlockedReadPrefixes = []string{
	"/api/v1/export/",
}

func RequireGuestReadOnly(userRepo repositories.UserRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(uuid.UUID)
		if !ok {
			return c.Next()
		}

		user, err := userRepo.GetByID(c.Context(), userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			})
		}
		if user == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"code":    "USER_NOT_FOUND",
				"message": "user not found",
			})
		}

		isGuest := strings.EqualFold(strings.TrimSpace(user.Email), guestPreviewEmail)
		c.Locals("isGuestUser", isGuest)
		if !isGuest {
			return c.Next()
		}

		if !guestRequestAllowed(c.Method(), c.Path()) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"code":    "GUEST_WRITE_FORBIDDEN",
				"message": "guest mode is read-only; create a web account to save, connect, or export data",
			})
		}

		return c.Next()
	}
}

func guestRequestAllowed(method string, path string) bool {
	normalizedMethod := strings.ToUpper(strings.TrimSpace(method))
	normalizedPath := strings.TrimSpace(path)

	for _, prefix := range guestBlockedReadPrefixes {
		if strings.HasPrefix(normalizedPath, prefix) {
			return false
		}
	}

	switch normalizedMethod {
	case fiber.MethodGet, fiber.MethodHead, fiber.MethodOptions:
		return true
	default:
		return false
	}
}
