package jobs

import (
    "context"
    "log"
    "time"

    "github.com/moneyvessel/kifu/internal/domain/entities"
    "github.com/moneyvessel/kifu/internal/domain/repositories"
)

type QuotaResetJob struct {
    subscriptionRepo repositories.SubscriptionRepository
}

func NewQuotaResetJob(subscriptionRepo repositories.SubscriptionRepository) *QuotaResetJob {
    return &QuotaResetJob{subscriptionRepo: subscriptionRepo}
}

func (j *QuotaResetJob) Start(ctx context.Context) {
    go func() {
        timer := time.NewTimer(timeUntilNextReset())
        for {
            select {
            case <-ctx.Done():
                timer.Stop()
                return
            case <-timer.C:
                j.runOnce(ctx)
                timer.Reset(24 * time.Hour)
            }
        }
    }()
}

func (j *QuotaResetJob) runOnce(ctx context.Context) {
    subs, err := j.subscriptionRepo.ListAll(ctx)
    if err != nil {
        log.Printf("quota reset: list subscriptions failed: %v", err)
        return
    }

    now := time.Now().UTC()
    for _, sub := range subs {
        if sub == nil {
            continue
        }

        if sub.ExpiresAt != nil && sub.ExpiresAt.Before(now) {
            applyTierReset(sub, "free", now)
        } else if monthChanged(sub.LastResetAt, now) {
            applyTierReset(sub, sub.Tier, now)
        } else {
            continue
        }

        if err := j.subscriptionRepo.Update(ctx, sub); err != nil {
            log.Printf("quota reset: update failed for user %s: %v", sub.UserID.String(), err)
        }
    }
}

func timeUntilNextReset() time.Duration {
    now := time.Now().UTC()
    next := time.Date(now.Year(), now.Month(), now.Day(), 0, 5, 0, 0, time.UTC)
    if !next.After(now) {
        next = next.Add(24 * time.Hour)
    }
    return next.Sub(now)
}

func monthChanged(lastReset time.Time, now time.Time) bool {
    return lastReset.Year() != now.Year() || lastReset.Month() != now.Month()
}

func applyTierReset(sub *entities.Subscription, tier string, now time.Time) {
    sub.Tier = tier
    sub.AIQuotaRemaining = quotaForTier(tier)
    sub.LastResetAt = now
    if tier == "free" {
        sub.ExpiresAt = nil
    }
}

func quotaForTier(tier string) int {
    switch tier {
    case "silver":
        return 200
    case "gold":
        return 1000
    case "vip":
        return 5000
    default:
        return 20
    }
}
