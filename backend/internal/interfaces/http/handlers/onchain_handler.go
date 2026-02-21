package handlers

import (
	"errors"
	"fmt"
	"log"
	"strings"
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
	requestID := strings.TrimSpace(c.Get("X-Request-ID"))
	if requestID == "" {
		requestID = fmt.Sprintf("onchain-quick-check-%d", time.Now().UnixNano())
	}
	clientIP := c.IP()

	if h.service == nil {
		log.Printf("[incident:onchain] severity=error event=handler.request_denied request_id=%s ip=%s reason=service_unavailable", requestID, clientIP)
		return c.Status(500).JSON(fiber.Map{
			"code":    "INTERNAL_ERROR",
			"message": "onchain service unavailable",
		})
	}

	if h.limiter != nil && !h.limiter.Allow(c.IP()) {
		log.Printf("[incident:onchain] severity=warning event=handler.rate_limited request_id=%s ip=%s", requestID, clientIP)
		return c.Status(429).JSON(fiber.Map{
			"code":    "RATE_LIMITED",
			"message": "too many requests",
		})
	}

	var req OnchainQuickCheckRequest
	if err := c.BodyParser(&req); err != nil {
		log.Printf("[incident:onchain] severity=warning event=handler.invalid_payload request_id=%s ip=%s body_error=%q", requestID, clientIP, err.Error())
		return c.Status(400).JSON(fiber.Map{
			"code":    "INVALID_REQUEST",
			"message": "invalid request body",
		})
	}
	log.Printf("[incident:onchain] severity=info event=handler.request_received request_id=%s ip=%s chain=%s address=%s range=%s", requestID, clientIP, strings.ToLower(strings.TrimSpace(req.Chain)), strings.ToLower(strings.TrimSpace(req.Address)), strings.TrimSpace(req.Range))

	start := time.Now()
	response, err := h.service.BuildQuickCheck(c.Context(), services.OnchainQuickCheckRequest{
		Chain:   req.Chain,
		Address: req.Address,
		Range:   req.Range,
	})
	elapsedMs := time.Since(start).Milliseconds()
	if err != nil {
		log.Printf("[incident:onchain] severity=error event=service.call_error request_id=%s ip=%s chain=%s address=%s range=%s elapsed_ms=%d err=%v", requestID, clientIP, strings.ToLower(strings.TrimSpace(req.Chain)), strings.ToLower(strings.TrimSpace(req.Address)), strings.TrimSpace(req.Range), elapsedMs, err)
		switch {
		case errors.Is(err, services.ErrInvalidChain):
			log.Printf("[incident:onchain] severity=warning event=handler.validation_fail request_id=%s code=INVALID_CHAIN ip=%s", requestID, clientIP)
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_CHAIN", "message": "only base chain is supported"})
		case errors.Is(err, services.ErrInvalidAddress):
			log.Printf("[incident:onchain] severity=warning event=handler.validation_fail request_id=%s code=INVALID_ADDRESS ip=%s address=%s", requestID, clientIP, strings.ToLower(strings.TrimSpace(req.Address)))
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_ADDRESS", "message": "address must be 0x + 40 hex"})
		case errors.Is(err, services.ErrInvalidRange):
			log.Printf("[incident:onchain] severity=warning event=handler.validation_fail request_id=%s code=INVALID_RANGE ip=%s range=%s", requestID, clientIP, strings.TrimSpace(req.Range))
			return c.Status(400).JSON(fiber.Map{"code": "INVALID_RANGE", "message": "range must be 7d or 30d"})
		default:
			log.Printf("[incident:onchain] severity=error event=handler.unexpected_error request_id=%s ip=%s elapsed_ms=%d", requestID, clientIP, elapsedMs)
			return c.Status(500).JSON(fiber.Map{"code": "INTERNAL_ERROR", "message": "failed to build onchain quick check"})
		}
	}
	log.Printf("[incident:onchain] severity=debug event=handler.response_ready request_id=%s ip=%s chain=%s address=%s range=%s status=%s elapsed_ms=%d warning_count=%d", requestID, clientIP, response.Chain, response.Address, response.Range, response.Status, elapsedMs, len(response.Warnings))

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
