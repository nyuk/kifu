package main

import (
	"context"
	"fmt"
	"log"
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
	bubbleRepo := repositories.NewBubbleRepository(pool)
	opinionRepo := repositories.NewAIOpinionRepository(pool)
	outcomeRepo := repositories.NewOutcomeRepository(pool)

	user := ensureUser(ctx, userRepo, subRepo)
	seedBubbles(ctx, user, bubbleRepo, opinionRepo, outcomeRepo)

	log.Printf("Seeded dummy data for user %s", user.Email)
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

func seedBubbles(
	ctx context.Context,
	user *entities.User,
	bubbleRepo domainrepos.BubbleRepository,
	opinionRepo domainrepos.AIOpinionRepository,
	outcomeRepo domainrepos.OutcomeRepository,
) {
	symbol := "BTCUSDT"
	baseTime := time.Now().UTC().AddDate(0, 0, -360)

	entries := []struct {
		dayOffset  int
		price      string
		memo       string
		tags       []string
		bubbleType string
	}{
		{0, "43850", "주봉 지지 확인 후 분할 매수. tweet:/dummy/tweet-1.svg", []string{"breakout", "weekly"}, "manual"},
		{18, "45200", "리테스트 성공. tweet:/dummy/tweet-2.svg", []string{"retest", "macro"}, "manual"},
		{36, "46890", "추세 상단, 일부 익절", []string{"takeprofit"}, "manual"},
		{54, "44110", "매크로 리스크, 관망", []string{"riskoff", "macro"}, "manual"},
		{72, "42600", "저점 매수 시도. tweet:/dummy/tweet-3.svg", []string{"dip", "flow"}, "manual"},
		{90, "45900", "중기 추세 복귀", []string{"trend", "support"}, "manual"},
		{120, "48100", "돌파 확인", []string{"breakout"}, "manual"},
		{150, "50500", "과열 경고", []string{"overheat"}, "manual"},
		{180, "47800", "조정 대기", []string{"pullback"}, "manual"},
		{210, "52000", "상승 재개", []string{"trend"}, "manual"},
		{240, "49650", "눌림 매수", []string{"dip"}, "manual"},
		{270, "53200", "목표가 접근", []string{"target"}, "manual"},
	}

	for idx, entry := range entries {
		candleTime := baseTime.AddDate(0, 0, entry.dayOffset)
		bubble := &entities.Bubble{
			ID:         uuid.New(),
			UserID:     user.ID,
			Symbol:     symbol,
			Timeframe:  "1d",
			CandleTime: candleTime,
			Price:      entry.price,
			BubbleType: entry.bubbleType,
			Memo:       strPtr(entry.memo),
			Tags:       entry.tags,
			CreatedAt:  time.Now().UTC(),
		}

		if err := bubbleRepo.Create(ctx, bubble); err != nil {
			log.Printf("bubble create failed: %v", err)
			continue
		}

		createOpinions(ctx, bubble, opinionRepo, idx)
		createOutcomes(ctx, bubble, outcomeRepo, idx)
	}
}

func createOpinions(ctx context.Context, bubble *entities.Bubble, repo domainrepos.AIOpinionRepository, seed int) {
	responses := []struct {
		provider string
		model    string
		text     string
	}{
		{"openai", "gpt-4o", "리스크/보상 비율은 양호하지만, 레인지 상단에서 변동성이 확대될 수 있습니다."},
		{"claude", "claude-3-5-sonnet-latest", "이 가격대는 직전 유동성 구간이므로 손절 기준을 명확히 하세요."},
		{"gemini", "gemini-1.5-pro", "거래량이 유지된다면 상방 확률이 높습니다. 다만 눌림 가능성도 열어두세요."},
	}

	for idx, response := range responses {
		if (seed+idx)%2 == 1 {
			continue
		}
		opinion := &entities.AIOpinion{
			ID:             uuid.New(),
			BubbleID:       bubble.ID,
			Provider:       response.provider,
			Model:          response.model,
			PromptTemplate: "dummy-seed",
			Response:       response.text,
			TokensUsed:     intPtr(512 + idx*50),
			CreatedAt:      time.Now().UTC(),
		}
		if err := repo.Create(ctx, opinion); err != nil {
			log.Printf("opinion create failed: %v", err)
		}
	}
}

func createOutcomes(ctx context.Context, bubble *entities.Bubble, repo domainrepos.OutcomeRepository, seed int) {
	periods := []string{"1h", "4h", "1d"}
	for idx, period := range periods {
		pnl := fmt.Sprintf("%.2f", (float64(seed+idx%3)-1.0)*1.25)
		outcome := &entities.Outcome{
			ID:             uuid.New(),
			BubbleID:       bubble.ID,
			Period:         period,
			ReferencePrice: bubble.Price,
			OutcomePrice:   bubble.Price,
			PnLPercent:     pnl,
			CalculatedAt:   time.Now().UTC(),
		}
		if _, err := repo.CreateIfNotExists(ctx, outcome); err != nil {
			log.Printf("outcome create failed: %v", err)
		}
	}
}

func getenvOrFail(name string) string {
	value := os.Getenv(name)
	if value == "" {
		log.Fatalf("%s is required", name)
	}
	return value
}

func strPtr(value string) *string {
	return &value
}

func intPtr(value int) *int {
	return &value
}
