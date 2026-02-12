# 2026-02-11 Step 1: 운영 반영 체크리스트 (Preview=Demo / Production=Beta)

## 범위
- Production DB 마이그레이션 적용
- Production/Preview 환경변수 반영
- 모드 전환/접근제어 정상 동작 확인

## 1) Production DB 마이그레이션

`users.ai_allowlisted` 컬럼이 필수입니다.

```bash
psql "$DATABASE_URL" -f backend/migrations/021_ai_allowlist.sql
```

검증:

```bash
psql "$DATABASE_URL" -Atc "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='ai_allowlisted';"
```

기대 결과:
- `ai_allowlisted`

## 2) Backend(Fly.io) 환경변수

필수값:
- `APP_ENV=production`
- `AI_REQUIRE_ALLOWLIST=true`
- `AI_SERVICE_MONTHLY_CAP=50`
- `AI_RATE_LIMIT_RPM=3`
- `AI_RATE_LIMIT_BURST=2`

예시(Fly CLI):

```bash
fly secrets set \
  APP_ENV=production \
  AI_REQUIRE_ALLOWLIST=true \
  AI_SERVICE_MONTHLY_CAP=50 \
  AI_RATE_LIMIT_RPM=3 \
  AI_RATE_LIMIT_BURST=2
```

## 3) Frontend(Netlify) 환경변수

### Deploy Preview
- `NEXT_PUBLIC_APP_MODE=demo`

### Production
- `NEXT_PUBLIC_APP_MODE=prod`
- `NEXT_PUBLIC_API_BASE_URL=https://<api-domain>/api`

## 4) 동작 검증 (배포 후)

### Preview URL
- 로그인/회원가입 화면 진입 시 게스트 체험 안내 노출
- `/app/*` 직접 접근 시 `/guest` 유도
- Ask AI 클릭 시 mock 응답(실제 AI 호출 없음)

### Production URL
- 로그인 가능
- allowlist 미등록 계정에서 AI 호출 시 `ALLOWLIST_REQUIRED`
- allowlist 등록 계정은 AI 호출 가능

## 5) 장애 시 롤백 포인트
- `AI_REQUIRE_ALLOWLIST=false`로 즉시 우회 가능
- `AI_SERVICE_MONTHLY_CAP=0`로 월 상한 일시 해제 가능
- `NEXT_PUBLIC_APP_MODE=prod`로 프론트 데모 분기 해제 가능

## 6) 오늘 반영 상태 (로컬 확인)
- 로컬 DB `ai_allowlisted` 컬럼 존재 확인 완료
- 코드/문서 기준 env 키 동기화 완료
