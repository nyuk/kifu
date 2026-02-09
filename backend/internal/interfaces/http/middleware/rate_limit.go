package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/time/rate"
)

type UserRateLimiter struct {
	mu       sync.Mutex
	limiters map[uuid.UUID]*rate.Limiter
	lastSeen map[uuid.UUID]time.Time
	rate     rate.Limit
	burst    int
}

func NewUserRateLimiter(limit rate.Limit, burst int) *UserRateLimiter {
	return &UserRateLimiter{
		limiters: make(map[uuid.UUID]*rate.Limiter),
		lastSeen: make(map[uuid.UUID]time.Time),
		rate:     limit,
		burst:    burst,
	}
}

func (u *UserRateLimiter) getLimiter(userID uuid.UUID) *rate.Limiter {
	u.mu.Lock()
	defer u.mu.Unlock()

	limiter, ok := u.limiters[userID]
	if !ok {
		limiter = rate.NewLimiter(u.rate, u.burst)
		u.limiters[userID] = limiter
	}
	u.lastSeen[userID] = time.Now()

	// Cleanup stale entries (simple guard to avoid unbounded growth)
	if len(u.lastSeen) > 1000 {
		cutoff := time.Now().Add(-2 * time.Hour)
		for id, last := range u.lastSeen {
			if last.Before(cutoff) {
				delete(u.lastSeen, id)
				delete(u.limiters, id)
			}
		}
	}

	return limiter
}

func (u *UserRateLimiter) Allow(userID uuid.UUID) bool {
	return u.getLimiter(userID).Allow()
}

func RateLimit(limiter *UserRateLimiter) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(uuid.UUID)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"code": "UNAUTHORIZED"})
		}
		if limiter == nil || !limiter.Allow(userID) {
			return c.Status(429).JSON(fiber.Map{"code": "RATE_LIMITED", "message": "too many requests"})
		}
		return c.Next()
	}
}
