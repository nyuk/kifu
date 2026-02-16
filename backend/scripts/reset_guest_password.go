package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/moneyvessel/kifu/internal/domain/entities"
	domainrepos "github.com/moneyvessel/kifu/internal/domain/repositories"
	"github.com/moneyvessel/kifu/internal/infrastructure/auth"
	"github.com/moneyvessel/kifu/internal/infrastructure/database"
	"github.com/moneyvessel/kifu/internal/infrastructure/repositories"
)

func getenvOrFail(name string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		log.Fatalf("%s is required", name)
	}
	return value
}

func getenvOrDefault(name, defaultValue string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return defaultValue
	}
	return value
}

func main() {
	_ = godotenv.Load()

	databaseURL := getenvOrFail("DATABASE_URL")
	pool, err := database.NewPostgresPool(databaseURL)
	if err != nil {
		log.Fatalf("db connect failed: %v", err)
	}
	defer pool.Close()

	email := getenvOrDefault("RESET_GUEST_EMAIL", "guest.preview@kifu.local")
	password := getenvOrFail("RESET_GUEST_PASSWORD")

	userRepo := repositories.NewUserRepository(pool)

	ctx := context.Background()
	user, err := userRepo.GetByEmail(ctx, strings.ToLower(email))
	if err != nil {
		log.Fatalf("get user failed: %v", err)
	}
	if user == nil {
		log.Fatalf("guest user not found: %s", email)
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatalf("hash password failed: %v", err)
	}

	resetUser := &entities.User{
		ID:            user.ID,
		Email:         user.Email,
		PasswordHash:  hash,
		Name:          user.Name,
		AIAllowlisted: user.AIAllowlisted,
		CreatedAt:     user.CreatedAt,
		UpdatedAt:     time.Now().UTC(),
	}

	if err := userRepo.Update(ctx, resetUser); err != nil {
		log.Fatalf("update password failed: %v", err)
	}

	fmt.Printf("updated guest password for %s\n", email)
}
