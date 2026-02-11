# 2026-02-11 AI 베타 가드레일 + 데모 모드 적용 보고

## 목적
- 배포 프리뷰(Preview)에서 실 AI 호출/로그인을 막고 UI 흐름만 검증
- 프로덕션에서 AI 호출을 화이트리스트 + 쿼터/레이트리밋으로 방어
- 기존 기능(차트/복기/동기화) 영향 최소화

## 적용 범위

### 1) 백엔드 가드레일
- AI 엔드포인트에 allowlist 검사 추가
  - 비허용 사용자는 `403 ALLOWLIST_REQUIRED`
- 월 베타 상한(hard cap) 검사 추가
  - 상한 초과 시 `429 BETA_CAP_EXCEEDED`
- AI 레이트리밋을 환경변수로 제어 가능하게 변경

대상 파일:
- `backend/internal/interfaces/http/handlers/ai_handler.go`
- `backend/internal/interfaces/http/routes.go`

### 2) 사용자 allowlist 필드 추가
- `users.ai_allowlisted boolean not null default false`
- true 사용자 조회 최적화를 위한 부분 인덱스 추가

대상 파일:
- `backend/migrations/021_ai_allowlist.sql`
- `backend/internal/domain/entities/user.go`
- `backend/internal/infrastructure/repositories/user_repository_impl.go`
- `backend/internal/interfaces/http/handlers/user_handler.go`

### 3) 프론트 데모 모드
- `NEXT_PUBLIC_APP_MODE=demo`일 때:
  - AI 실호출 차단, 시나리오 기반 mock 응답 반환
  - 로그인/회원가입 화면에서 게스트 체험 안내
  - 보호 라우트 진입 시 `/guest`로 유도
- mock 시나리오 8종:
  - 상승/하락/횡보/급등/급락/변동성 급증/뉴스 충격/저유동성

대상 파일:
- `frontend/src/lib/appMode.ts`
- `frontend/src/lib/mockAi.ts`
- `frontend/src/components/BubbleCreateModal.tsx`
- `frontend/src/components-old/Login.tsx`
- `frontend/src/components-old/Register.tsx`
- `frontend/src/routes/RequireAuth.tsx`

## 환경변수 정책

### Backend (Fly.io/Production 권장)
- `APP_ENV=production`
- `AI_REQUIRE_ALLOWLIST=true`
- `AI_SERVICE_MONTHLY_CAP=50` (베타 기준 예시)
- `AI_RATE_LIMIT_RPM=3`
- `AI_RATE_LIMIT_BURST=2`

### Frontend (Netlify)
- Preview:
  - `NEXT_PUBLIC_APP_MODE=demo`
- Production:
  - `NEXT_PUBLIC_APP_MODE=prod`
  - `NEXT_PUBLIC_API_BASE_URL=https://<your-api-domain>/api`

## 마이그레이션
- 신규 SQL:
  - `backend/migrations/021_ai_allowlist.sql`
- 실행 예시:
  - `psql "$DATABASE_URL" -f backend/migrations/021_ai_allowlist.sql`

## API 동작 요약
- `/api/v1/ai/one-shot`
  - allowlist 미등록 사용자: `403 ALLOWLIST_REQUIRED`
  - 월 베타 상한 초과: `429 BETA_CAP_EXCEEDED`
  - 기존 쿼터 초과: `429 QUOTA_EXCEEDED`
  - 과호출: `429 RATE_LIMITED`

## 검증 결과
- `go test ./...` 통과
- `npx tsc -p tsconfig.json --noEmit` 통과
- 스모크:
  - 일반 모드: one-shot 정상 응답
  - `AI_REQUIRE_ALLOWLIST=1`: one-shot `ALLOWLIST_REQUIRED` 확인

## 운영 메모
- 이 변경은 “AI 접근 게이트” 중심이며, 기존 차트/복기/동기화 핵심 로직에는 직접 영향이 거의 없음
- 베타 운영 중에는 상한/레이트리밋 값을 환경변수만으로 빠르게 조정 가능
