# 2026-02-11 Guided Review MVP 구현 보고서

## 목적
듀오링고 스타일의 버튼 기반 일일 거래 복기 MVP 구현.
기존 `HomeSafetyCheckCard` 패턴(거래 목록 → 버튼 탭 라벨링)을 확장하는 방식.

## 구현 상태: 코드 완료, 마이그레이션 미실행

---

## 1. DB 마이그레이션 (미실행 — 수동 필요)

### 파일: `backend/migrations/020_guided_review.sql`

MCP postgres가 읽기전용이라 DDL 실행 불가. 아래 SQL을 DB 클라이언트에서 직접 실행해야 함.

```sql
CREATE TABLE guided_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | in_progress | completed | skipped
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, review_date)
);

CREATE TABLE guided_review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES guided_reviews(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  bundle_key VARCHAR(100),
  symbol VARCHAR(50) NOT NULL,
  side VARCHAR(10),
  pnl NUMERIC,
  trade_count INT NOT NULL DEFAULT 1,
  intent VARCHAR(50),
  emotions JSONB,
  pattern_match VARCHAR(50),
  memo TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_review_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guided_reviews_user_date ON guided_reviews(user_id, review_date DESC);
CREATE INDEX idx_guided_review_items_review ON guided_review_items(review_id);
```

### 마이그레이션 실행 방법
1. DB 접속 (DBeaver, pgAdmin, DataGrip, 또는 psql)
2. 위 SQL 전체 복사 → 실행
3. 확인: `SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'guided%' OR table_name = 'user_streaks';` → 3개 테이블 확인

---

## 2. 백엔드 변경 사항

### 신규 파일

| 파일 | 설명 |
|------|------|
| `backend/migrations/020_guided_review.sql` | DDL 3 테이블 + 2 인덱스 |
| `backend/internal/domain/entities/guided_review.go` | `GuidedReview`, `GuidedReviewItem`, `UserStreak` 엔티티 + 상수 |
| `backend/internal/domain/repositories/guided_review_repository.go` | 인터페이스 5개 메서드 |
| `backend/internal/infrastructure/repositories/guided_review_repository_impl.go` | pgx 구현체 |
| `backend/internal/interfaces/http/handlers/guided_review_handler.go` | HTTP 핸들러 4개 엔드포인트 |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `backend/internal/app/app.go` | `guidedReviewRepo` DI 초기화 추가, `RegisterRoutes` 호출에 파라미터 추가 |
| `backend/internal/interfaces/http/routes.go` | 함수 시그니처에 `guidedReviewRepo` 추가, 핸들러 생성, 라우트 4개 등록 |

### API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/guided-reviews/today?timezone=Asia/Seoul` | 오늘의 복기 세션 조회/생성. 해당 날짜 trades 테이블에서 심볼별 그룹으로 아이템 자동 생성 |
| POST | `/api/v1/guided-reviews/items/:id/submit` | 아이템별 답변(intent, emotions[], pattern_match, memo) 제출 |
| POST | `/api/v1/guided-reviews/:id/complete` | 복기 완료 처리 + 스트릭 자동 업데이트 |
| GET | `/api/v1/guided-reviews/streak` | 스트릭 조회 (current_streak, longest_streak) |

### 핵심 로직: `GetOrCreateToday`
1. `guided_reviews` 테이블에서 `(user_id, review_date)` 조회
2. 없으면 새로 INSERT → `trades` 테이블에서 해당 날짜 거래를 `GROUP BY symbol`로 조회
3. 심볼별로 `guided_review_items` 자동 생성 (sample_trade_id, total_pnl, trade_count 포함)
4. 기존 리뷰가 있으면 아이템과 함께 그대로 반환

### 스트릭 로직: `CompleteReview` → `updateStreak`
1. `user_streaks` 테이블 조회 (없으면 streak=1로 INSERT)
2. `last_review_date`와 현재 `review_date` 비교
3. 연속이면 (1일 차이) `current_streak++`, 아니면 `current_streak = 1`
4. `longest_streak` 갱신

---

## 3. 프론트엔드 변경 사항

### 신규 파일

| 파일 | 설명 |
|------|------|
| `frontend/src/types/guidedReview.ts` | 타입 정의 + `INTENT_OPTIONS`, `EMOTION_OPTIONS`, `PATTERN_OPTIONS` 상수 |
| `frontend/src/stores/guidedReviewStore.ts` | Zustand 스토어: fetchToday, submitItem, completeReview, fetchStreak, step 관리 |
| `frontend/src/components/home/HomeGuidedReviewCard.tsx` | 홈 카드: 스트릭 표시, 진행상태 요약, "복기 시작" 버튼, 완료 시 축하 메시지 |
| `frontend/src/components/guided-review/GuidedReviewFlow.tsx` | 4단계 복기 플로우 (intent→emotions→pattern→memo), 아이템별 진행 |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/components/home/HomeSnapshot.tsx` | `HomeGuidedReviewCard` import 추가, `<HomeSafetyCheckCard />` 위에 배치 |

### 복기 플로우 UX
1. 홈 카드에서 "오늘의 복기 시작" 버튼 클릭
2. 첫 번째 거래 아이템 표시 (심볼, side, PnL, 건수)
3. Layer 1: 의도 선택 (5개 버튼)
4. Layer 2: 감정 선택 (9개 버튼, 복수 선택)
5. Layer 3: 패턴 매칭 (5개 버튼)
6. Layer 4: 한 줄 메모 (선택, textarea)
7. 제출 → 다음 아이템으로 자동 이동
8. 전체 완료 → "복기 완료하기" 버튼 → 스트릭 업데이트 + 축하 화면

---

## 4. 빌드 검증

| 항목 | 결과 |
|------|------|
| `go build ./...` | 통과 |
| `tsc --noEmit` | 통과 |
| DB 마이그레이션 | **미실행** (수동 필요) |

---

## 5. 테스트/검증 체크리스트

마이그레이션 실행 후 확인할 항목:

- [ ] 마이그레이션 SQL 실행 (`guided_reviews`, `guided_review_items`, `user_streaks` 테이블 생성 확인)
- [ ] 백엔드 재시작
- [ ] `GET /api/v1/guided-reviews/today?timezone=Asia/Seoul` → 거래 데이터 기반 아이템 자동 생성 확인
- [ ] `POST /api/v1/guided-reviews/items/:id/submit` → 답변 저장 확인
- [ ] `POST /api/v1/guided-reviews/:id/complete` → 복기 완료 + 스트릭 업데이트 확인
- [ ] `GET /api/v1/guided-reviews/streak` → 스트릭 조회 확인
- [ ] 프론트엔드 홈에서 카드 렌더링 확인
- [ ] 복기 플로우 동작 확인 (4단계 진행 + 제출 + 완료)
- [ ] 거래가 없는 날: "오늘 거래 기록이 없습니다" 표시 확인

---

## 6. 아키텍처 참고

```
[trades 테이블]
       │
       ▼ (GetOrCreateToday에서 GROUP BY symbol)
[guided_review_items] ←── submit (intent, emotions, pattern, memo)
       │
       ▼
[guided_reviews] ←── complete → [user_streaks] 업데이트
       │
       ▼
[HomeGuidedReviewCard] → [GuidedReviewFlow] → 4-Layer 버튼 UI
```

---

## 7. 후속 작업 (Phase 2)

- [ ] 다수 거래 묶기 (같은 심볼 5건+ → 하나의 묶음)
- [ ] 비거래일 복기 플로우
- [ ] 주간 인사이트 (AI 기반 요약)
- [ ] 히스토리 리스트 뷰 (`ListReviews` API는 구현 완료)
- [ ] 푸시 알림 / 알림 트리거
