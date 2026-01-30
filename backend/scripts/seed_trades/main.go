package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	domainrepos "github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/auth"
	"github.com/moneyvessel/kifu/internal/infrastructure/database"
	"github.com/moneyvessel/kifu/internal/infrastructure/repositories"
)

func main() {
	_ = godotenv.Load()
	ctx := context.Background()

	databaseURL := getenvOrFail("DATABASE_URL")
	pool, err := database.NewPostgresPool(databaseURL)
	if err != nil {
		log.Fatalf("db connect failed: %v", err)
	}
	defer pool.Close()

	userRepo := repositories.NewUserRepository(pool)
	subRepo := repositories.NewSubscriptionRepository(pool)
	tradeRepo := repositories.NewTradeRepository(pool)

	user := ensureUser(ctx, userRepo, subRepo)

	seedTrades(ctx, tradeRepo, user, "binance_futures", []string{"BTCUSDT", "ETHUSDT", "SOLUSDT"}, 240, 100000)
	seedTrades(ctx, tradeRepo, user, "upbit", []string{"BTC-KRW", "ETH-KRW", "XRP-KRW"}, 240, 200000)

	log.Printf("Seeded dummy trades for user %s", user.Email)
}

func seedTrades(
	ctx context.Context,
	tradeRepo domainrepos.TradeRepository,
	user *entities.User,
	exchange string,
	symbols []string,
	count int,
	idStart int64,
) {
	randSource := rand.New(rand.NewSource(time.Now().UnixNano()))
	for idx := 0; idx < count; idx++ {
		symbol := symbols[idx%len(symbols)]
		side := "BUY"
		if idx%2 == 1 {
			side = "SELL"
		}
		price := 20000 + randSource.Float64()*25000
		quantity := 0.05 + randSource.Float64()*0.5
		realizedPnL := (randSource.Float64()*2 - 1) * 120

		tradeTime := time.Now().UTC().Add(-time.Duration(randSource.Intn(180*24)) * time.Hour)
		trade := &entities.Trade{
			ID:             uuid.New(),
			UserID:         user.ID,
			BinanceTradeID: idStart + int64(idx),
			Exchange:       exchange,
			Symbol:         symbol,
			Side:           side,
			Quantity:       fmt.Sprintf("%.4f", quantity),
			Price:          fmt.Sprintf("%.2f", price),
			TradeTime:      tradeTime,
		}
		pnl := fmt.Sprintf("%.2f", realizedPnL)
		trade.RealizedPnL = &pnl

		if err := tradeRepo.Create(ctx, trade); err != nil {
			log.Printf("trade create failed: %v", err)
		}
	}
}

func ensureUser(ctx context.Context, userRepo domainrepos.UserRepository, subRepo domainrepos.SubscriptionRepository) *entities.User {
	const email = "demo@kifu.local"
	const password = "password123"
	name := "Demo Trader"

	user, err := userRepo.GetByEmail(ctx, email)
	if err != nil {
		log.Fatalf("fetch user failed: %v", err)
	}
	if user != nil {
		return user
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatalf("hash password failed: %v", err)
	}

	newUser := &entities.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: hash,
		Name:         name,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	if err := userRepo.Create(ctx, newUser); err != nil {
		log.Fatalf("create user failed: %v", err)
	}

	if err := subRepo.Create(ctx, &entities.Subscription{
		ID:               uuid.New(),
		UserID:           newUser.ID,
		Tier:             "free",
		AIQuotaRemaining: 20,
		LastResetAt:      time.Now().UTC(),
		ExpiresAt:        nil,
	}); err != nil {
		log.Fatalf("create subscription failed: %v", err)
	}

	return newUser
}

func getenvOrFail(name string) string {
	value := os.Getenv(name)
	if value == "" {
		log.Fatalf("%s is required", name)
	}
	return value
}
