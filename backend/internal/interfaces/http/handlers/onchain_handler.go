package handlers

import (
	"errors"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/moneyvessel/kifu/internal/services"
	"golang.org/x/time/rate"
)

type OnchainHandler struct {
	service *services.OnchainPackService
	limiter *onchainIPRateLimiter
}

type OnchainQuickCheckRequest struct {
	Chain   string `json:"chain"`
	Address string `json:"address"`
	Range   string `json:"range"`
}

func NewOnchainHandler(service *services.OnchainPackService) *OnchainHandler {
	return &OnchainHandler{
		service: service,
		limiter: newOnchainIPRateLimiter(rate.Every(time.Minute/10), 10),
	}
}

func (h *OnchainHandler) QuickCheck(c *fiber.Ctx) error {
	if h.service == nil {
		return c.Status(500).JSON(fiber.Map{
			"code":    "INTERNAL_ERROR",
			"message": "onchain service unavailable",
		})
	}

	if h.limiter != nil && !h.limiter.Allow(c.IP()) {
		return c.Status(429).JSON(fiber.Map{
			"code":    "RATE_LIMITED",
			"message": "too many requests",
		})
	}

	var req OnchainQuickCheckRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"code":    "INVALID_REQUEST",
			"message": "invalid request body",
		})
	}

	response, err := h.service.BuildQuickCheck(c.Context(), services.OnchainQuickCheckRequest{
		Chain:   req.Chain,
		Address: req.Address,
		Range:   req.Range,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidChain):
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_CHAIN", "message": "only base chain is supported"})
		case errors.Is(err, services.ErrInvalidAddress):
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_ADDRESS", "message": "address must be 0x + 40 hex"})
		case errors.Is(err, services.ErrInvalidRange):
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_RANGE", "message": "range must be 7d or 30d"})
		default:
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "failed to build onchain quick check"})
		}
	}

	return c.Status(200).JSON(response)
}

type onchainIPRateLimiter struct {
	mu       sync.Mutex
	limiters map[string]*rate.Limiter
	lastSeen map[string]time.Time
	rate     rate.Limit
	burst    int
}

func newOnchainIPRateLimiter(limit rate.Limit, burst int) *onchainIPRateLimiter {
	return &onchainIPRateLimiter{
		limiters: make(map[string]*rate.Limiter),
		lastSeen: make(map[string]time.Time),
		rate:     limit,
		burst:    burst,
	}
}

func (l *onchainIPRateLimiter) Allow(ip string) bool {
	if l == nil {
		return true
	}

	key := ip
	if key == "" {
		key = "unknown"
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	limiter, ok := l.limiters[key]
	if !ok {
		limiter = rate.NewLimiter(l.rate, l.burst)
		l.limiters[key] = limiter
	}
	l.lastSeen[key] = time.Now()

	if len(l.lastSeen) > 1000 {
		cutoff := time.Now().Add(-2 * time.Hour)
		for candidate, seenAt := range l.lastSeen {
			if seenAt.Before(cutoff) {
				delete(l.lastSeen, candidate)
				delete(l.limiters, candidate)
			}
		}
	}

	return limiter.Allow()
}
