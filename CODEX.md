> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# CODEX.md - AI Assistant Project Context

> 이 문서는 AI 코딩 어시스턴트(Codex, Claude, GPT 등)가 프로젝트를 빠르게 이해하고 작업을 이어받을 수 있도록 작성되었습니다.

## 프로젝트 개요

**kifu** - 트레이딩 판단 기록 및 복기 애플리케이션

트레이더가 자신의 매매 판단을 "버블(Bubble)"로 기록하고, AI 의견을 수집하며, 시간이 지난 후 결과를 분석하여 트레이딩 실력을 향상시키는 도구입니다.

### 핵심 개념

| 용어 | 설명 |
|------|------|
| **Bubble** | 특정 시점의 매매 판단 기록 (심볼, 가격, 타임프레임, 메모, 태그) |
| **AI Opinion** | 버블에 대한 AI 프로바이더들의 방향 예측 (BUY/SELL/HOLD) |
| **Outcome** | 버블 생성 후 1시간/4시간/1일 후의 실제 가격 변동 결과 |
| **Accuracy** | AI 예측과 실제 결과 비교를 통한 정확도 |
| **Review Note** | 매매에 대한 복기 노트 (배운 점, 감정 기록) |

---

## 기술 스택

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│  Next.js 16 + React 19 + TypeScript + Tailwind CSS      │
│  State: Zustand | Charts: lightweight-charts             │
│  Port: 5173                                              │
├─────────────────────────────────────────────────────────┤
│                       Backend                            │
│  Go 1.21 + Fiber v2 + PostgreSQL (pgx)                  │
│  Auth: JWT | Encryption: AES-GCM                         │
│  Port: 8080                                              │
├─────────────────────────────────────────────────────────┤
│                      Database                            │
│  PostgreSQL 15 | Port: 5432                              │
│  DB: kifu | User: kifu                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 디렉토리 구조

```
kifu-project/
├── backend/                      # Go 백엔드
│   ├── cmd/main.go              # 엔트리포인트
│   ├── internal/
│   │   ├── app/app.go           # 앱 초기화, DI, 서버 시작
│   │   ├── domain/
│   │   │   ├── entities/        # 도메인 엔티티 (Bubble, Trade, User 등)
│   │   │   └── repositories/    # 레포지토리 인터페이스
│   │   ├── infrastructure/
│   │   │   ├── crypto/          # AES 암호화
│   │   │   ├── database/        # PostgreSQL 연결
│   │   │   └── repositories/    # 레포지토리 구현체 (*_impl.go)
│   │   ├── interfaces/http/
│   │   │   ├── handlers/        # HTTP 핸들러 (API 엔드포인트)
│   │   │   └── routes.go        # 라우트 등록
│   │   └── jobs/                # 백그라운드 작업 (Poller, Calculator)
│   ├── migrations/              # SQL 마이그레이션 파일
│   └── scripts/                 # 시드 데이터 등
│
├── frontend/                    # Next.js 프론트엔드
│   ├── app/                     # App Router 페이지
│   │   ├── (app)/              # 인증 필요 페이지
│   │   │   ├── chart/          # 차트 페이지
│   │   │   ├── review/         # 복기 대시보드
│   │   │   ├── bubbles/        # 버블 목록
│   │   │   ├── trades/         # 거래 내역
│   │   │   └── settings/       # 설정
│   │   ├── login/              # 로그인
│   │   └── register/           # 회원가입
│   └── src/
│       ├── components/         # 컴포넌트
│       │   ├── chart/          # 차트 관련 (ChartReplay, TimeSlider)
│       │   ├── review/         # 복기 관련 (AccuracyChart, NoteList 등)
│       │   └── settings/       # 설정 관련 (AIKeyManager)
│       ├── stores/             # Zustand 스토어
│       ├── types/              # TypeScript 타입 정의
│       └── lib/                # 유틸리티 (api, i18n)
│
└── docs/                       # PDCA 문서
    ├── 01-plan/features/       # 기획 문서
    ├── 02-design/features/     # 설계 문서
    ├── 03-analysis/            # Gap 분석 결과
    └── 04-report/features/     # 완료 보고서
```

---

## 주요 엔티티 (Backend)

### `entities/bubble.go`
```go
type Bubble struct {
    ID         uuid.UUID
    UserID     uuid.UUID
    Symbol     string    // e.g., "BTCUSDT"
    Timeframe  string    // "1m", "15m", "1h", "4h", "1d"
    CandleTime time.Time // 캔들 시작 시간
    Price      string    // 버블 생성 시점 가격
    BubbleType string    // "manual", "auto"
    Memo       *string
    Tags       []string
    CreatedAt  time.Time
}
```

### `entities/outcome.go`
```go
type Outcome struct {
    ID             uuid.UUID
    BubbleID       uuid.UUID
    Period         string    // "1h", "4h", "1d"
    ReferencePrice string
    OutcomePrice   string
    PnLPercent     string    // e.g., "+2.35%"
    CalculatedAt   time.Time
}
```

### `entities/review_note.go`
```go
type ReviewNote struct {
    ID            uuid.UUID
    UserID        uuid.UUID
    BubbleID      *uuid.UUID  // 선택적 버블 연결
    Title         string
    Content       string
    Tags          []string
    LessonLearned string
    Emotion       Emotion     // greedy, fearful, confident, uncertain, calm, frustrated
    CreatedAt     time.Time
    UpdatedAt     time.Time
}
```

---

## API 엔드포인트

### 인증
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/auth/register` | 회원가입 |
| POST | `/api/v1/auth/login` | 로그인 (JWT 발급) |
| POST | `/api/v1/auth/refresh` | 토큰 갱신 |
| POST | `/api/v1/auth/logout` | 로그아웃 |

### 버블
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/bubbles` | 버블 생성 |
| GET | `/api/v1/bubbles` | 버블 목록 |
| GET | `/api/v1/bubbles/:id` | 버블 상세 |
| PUT | `/api/v1/bubbles/:id` | 버블 수정 |
| DELETE | `/api/v1/bubbles/:id` | 버블 삭제 |
| GET | `/api/v1/bubbles/:id/outcomes` | 버블의 결과 목록 |
| GET | `/api/v1/bubbles/:id/accuracy` | 버블의 AI 정확도 |
| GET | `/api/v1/bubbles/:id/similar` | 유사 버블 검색 |
| GET | `/api/v1/bubbles/:id/notes` | 버블의 노트 목록 |
| GET | `/api/v1/bubbles/:id/trades` | 버블의 거래 목록 |

### AI 의견
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/bubbles/:id/ai-opinions` | AI 의견 요청 |
| GET | `/api/v1/bubbles/:id/ai-opinions` | AI 의견 목록 |

### 복기
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/review/stats` | 복기 통계 |
| GET | `/api/v1/review/accuracy` | AI 정확도 통계 |
| GET | `/api/v1/review/calendar` | 캘린더 데이터 |
| GET | `/api/v1/review/trend` | 성과 추세 데이터 |

### 노트
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/notes` | 노트 생성 |
| GET | `/api/v1/notes` | 노트 목록 |
| GET | `/api/v1/notes/:id` | 노트 상세 |
| PUT | `/api/v1/notes/:id` | 노트 수정 |
| DELETE | `/api/v1/notes/:id` | 노트 삭제 |

### 내보내기
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/export/stats` | 통계 CSV |
| GET | `/api/v1/export/accuracy` | AI 정확도 CSV |
| GET | `/api/v1/export/bubbles` | 버블 데이터 CSV |

### 거래
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/trades` | 거래 목록 |
| POST | `/api/v1/trades/import` | CSV 거래 가져오기 |
| POST | `/api/v1/trades/convert-bubbles` | 거래→버블 변환 |
| POST | `/api/v1/trades/link` | 거래-버블 연결 |
| POST | `/api/v1/trades/unlink` | 거래-버블 연결 해제 |

---

## 데이터베이스 스키마

### 주요 테이블
```sql
-- 사용자
users (id, email, password_hash, created_at)

-- 버블 (매매 판단)
bubbles (id, user_id, symbol, timeframe, candle_time, price, bubble_type, memo, tags, created_at)

-- 결과 (시간 경과 후 가격)
outcomes (id, bubble_id, period, reference_price, outcome_price, pnl_percent, calculated_at)
  UNIQUE(bubble_id, period)

-- AI 의견
ai_opinions (id, bubble_id, provider, direction, confidence, reasoning, created_at)

-- AI 정확도
ai_opinion_accuracies (id, opinion_id, outcome_id, bubble_id, provider, period,
  predicted_direction, actual_direction, is_correct, created_at)

-- 복기 노트
review_notes (id, user_id, bubble_id, title, content, tags, lesson_learned, emotion, created_at, updated_at)

-- 거래
trades (id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, quantity, price, realized_pnl, trade_time)

-- 사용자 AI 키
user_ai_keys (id, user_id, provider, encrypted_key, created_at)
```

---

## 개발 명령어

```bash
# 백엔드 실행
cd backend
go run ./cmd/main.go

# 프론트엔드 실행
cd frontend
npm run dev

# 프론트엔드 빌드
npm run build

# 백엔드 빌드
go build -o main ./cmd/main.go

# 마이그레이션 실행 (수동)
psql -U kifu -d kifu -f migrations/006_review_notes.sql
```

---

## 환경 변수 (.env)

```env
# Backend
PORT=8080
JWT_SECRET=your-jwt-secret
DATABASE_URL=postgres://kifu:password@localhost:5432/kifu?sslmode=disable
KIFU_ENC_KEY=32-byte-base64-encoded-key

# Frontend (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

---

## 최근 구현 완료 (2026-02-03)

### 1. 복기 대시보드 (`/review`)
- **StatsOverview**: 전체 통계 (승률, 평균 PnL, 총 PnL)
- **AccuracyChart**: AI 프로바이더별 정확도 차트
- **TagPerformance**: 태그별 성과 분석
- **SymbolPerformance**: 심볼별 성과 분석
- **CalendarView**: 일별 성과 캘린더
- **PerformanceTrendChart**: 누적 수익률 추세 차트

### 2. 복기 노트 기능
- **NoteEditor**: 노트 작성/수정 모달 (감정, 태그, 배운 점)
- **NoteList**: 노트 목록 및 페이지네이션

### 3. CSV 내보내기
- **ExportButtons**: 통계, AI 정확도, 버블 데이터 내보내기

### 4. Trade-Bubble 연동
- 거래와 버블 연결/해제 API
- 버블별 거래 목록 조회

---

## 알려진 이슈 / 개선 필요 사항

1. **차트 리플레이**: `ChartReplay` 컴포넌트 존재하나 UI 통합 미완성
2. **실시간 가격**: WebSocket 연동 구현 필요
3. **AI 프로바이더**: OpenAI/Anthropic 실제 API 연동 구현 필요 (현재 mock)
4. **테스트**: 단위 테스트 및 E2E 테스트 부재
5. **i18n**: 한국어/영어 다국어 지원 부분 구현

---

## 코딩 컨벤션

### TypeScript/React
- `type` 사용 (interface 대신)
- `enum` 사용 금지 → string literal union
- 함수형 컴포넌트 + hooks
- Zustand로 상태 관리

### Go
- Clean Architecture (domain/infrastructure/interfaces)
- Fiber v2 핸들러 패턴
- pgx로 PostgreSQL 접근
- context.Context 전달 필수

### 파일 명명
- 컴포넌트: `PascalCase.tsx`
- 스토어: `camelCaseStore.ts`
- Go 파일: `snake_case.go`
- Go 구현체: `*_impl.go`

---

## 참고 문서

- `CLAUDE.md` - Claude Code 전용 지침
- `SPEC.md` - 프로젝트 사양
- `docs/01-plan/features/` - 기능별 기획 문서
- `docs/02-design/features/` - 기능별 설계 문서

---

## Quick Start for AI Assistant

1. **프로젝트 이해**: 이 문서와 `CLAUDE.md` 읽기
2. **코드 탐색**: `backend/internal/` 및 `frontend/src/` 확인
3. **API 확인**: `routes.go`에서 전체 엔드포인트 파악
4. **타입 확인**: `frontend/src/types/review.ts` 참조
5. **컴포넌트 확인**: `frontend/src/components/` 탐색

작업 시 항상 기존 패턴을 따르고, 새 기능 추가 시 관련 엔티티→레포지토리→핸들러→라우트→프론트엔드 순서로 구현하세요.
