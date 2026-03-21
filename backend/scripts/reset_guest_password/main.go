package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/moneyvessel/kifu/internal/domain/entities"
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
	forceAdmin, _ := strconv.ParseBool(getenvOrDefault("RESET_GUEST_IS_ADMIN", "false"))

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
		PasswordSet:   true,
		Name:          user.Name,
		AIAllowlisted: user.AIAllowlisted,
		IsAdmin:       user.IsAdmin || forceAdmin,
		CreatedAt:     user.CreatedAt,
		UpdatedAt:     time.Now().UTC(),
	}

	if err := userRepo.Update(ctx, resetUser); err != nil {
		log.Fatalf("update password failed: %v", err)
	}

	fmt.Printf("updated password for %s (is_admin=%t)\n", email, resetUser.IsAdmin)
}
