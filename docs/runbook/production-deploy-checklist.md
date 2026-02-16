> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# Production Deployment Checklist (kifu-project)

이 문서는 배포 전/후에 바로 실행할 수 있도록, 현재 코드 기준(Kifu) 운영 반영 체크리스트를 한 곳에 정리한 가이드입니다.

---

## 1) 사전 준비

### 1-1. 브랜치/커밋 상태 확인

- 배포 대상 커밋이 `main` 또는 운영 승인 브랜치에 존재하는지 확인
- 환경 변수/시크릿 변경이 있다면 PR/배포 설정에 반영

### 1-2. 운영 DB 백업 (필수)

배포 전 `pg_dump` 또는 운영 백업 스냅샷을 확보합니다.

```bash
pg_dump "$DATABASE_URL" > /tmp/kifu_prod_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 1-3. 런타임 환경 확인

백엔드 실행 방식에서 마이그레이션 자동 적용이 보장되지 않습니다.
`backend`에는 앱 기동 시 migration table/apply가 탐지되지 않았습니다.

⇒ **운영 DB 마이그레이션은 수동 실행 필수**

```bash
psql "$DATABASE_URL" -c "\conninfo"
```

---

## 2) 데이터베이스 마이그레이션 (운영 반영 필수)

현재 운영에서 요구되는 DDL (핵심)
- `backend/migrations/020_guided_review.sql`
- `backend/migrations/021_ai_allowlist.sql`
- `backend/migrations/022_create_runs_and_summary_packs.sql`

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /path/to/kifu-project/backend/migrations/020_guided_review.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /path/to/kifu-project/backend/migrations/021_ai_allowlist.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /path/to/kifu-project/backend/migrations/022_create_runs_and_summary_packs.sql
```

권장: 실행 중 실패 시 즉시 중단하고 원인 로그 확인 후 재시도.

### 2-1. 마이그레이션 반영 검증

```bash
# 필수 컬럼/테이블 확인
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='ai_allowlisted';"
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('runs','summary_packs','guided_reviews','guided_review_items','user_streaks');"

# FK/기본 행태 확인
psql "$DATABASE_URL" -c "SELECT COUNT(*) AS runs_count FROM runs;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) AS summary_packs_count FROM summary_packs;"
```

---

## 3) 환경 변수 점검 (Backend / Frontend)

### 3-1. Backend 필수

- `APP_ENV` (예: `production`)
- `DATABASE_URL`
- `JWT_SECRET`
- `KIFU_ENC_KEY`
- `AI_REQUIRE_ALLOWLIST`
- `AI_SERVICE_MONTHLY_CAP`
- `AI_RATE_LIMIT_RPM`
- `AI_RATE_LIMIT_BURST`
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` (운영 정책에 따라)

### 3-2. Frontend 필수

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_MODE` (`prod`)
- `NEXT_PUBLIC_DEMO_*` 관련 변수는 운영 모드에서 오버라이드 금지

### 3-3. 배포 오버라이드 우선순위

1. 배포 플랫폼 Secret/Environment 값
2. `.env`(로컬 확인용)
3. 하드코딩 값 없음

---

## 4) 배포 실행

### 4-1. Backend 배포

- 새 이미지/바이너리 빌드
- 환경변수 갱신
- `backend` start
- 초기 헬스체크 확인

```bash
curl -sS http://<BACKEND_HOST>/health
```

### 4-2. Frontend 배포

- 새 아티팩트 배포
- API base URL이 운영 엔드포인트를 가리키는지 확인

---

## 5) 배포 후 확인 (Post-Deploy Smoke)

### 5-1. Auth/API 기본

1. `GET /health` 200
2. `POST /api/v1/auth/register` (테스트 유저, 비운영)
3. `POST /api/v1/auth/login`
4. `GET /api/v1/users/me`
5. `GET /api/v1/trades/summary` (로그인 유지)

### 5-2. 핵심 기능 최소 검사

- 차트
  - `GET /api/v1/market/klines?symbol=BTCUSDT&interval=1d&limit=5`
- 말풍선 생성/조회
  - `POST /api/v1/bubbles`
  - `GET /api/v1/bubbles`
- AI 호출 방어(운영 정책 기준)
  - allowlist 미가입/정책에 따른 적절한 응답 확인
- 동기화 + 팩 생성 경로
  - 업비트/바이낸스 동기화 요청 후 `run_id` 수신
  - `POST /api/v1/packs/generate`
  - `GET /api/v1/packs/latest?range=30d`
  - `GET /api/v1/packs/{pack_id}`

예시:

```bash
curl -sS -X POST "http://<BACKEND_HOST>/api/v1/packs/generate" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"source_run_id":"<run-uuid>","range":"30d"}'
```

### 5-3. 프론트 화면 기본 동선

- 랜딩/로그인/홈 접근 정상
- 홈/차트/복기/포트폴리오 탭 진입
- 핵심 요약 카드/차트 렌더 오류 없는지 확인

---

## 6) 배포 후 운영 모니터링 (최소 1시간)

- 에러율 급증/502/connection-refused 모니터링
- DB 커넥션, CPU, 메모리, p95 응답시간 확인
- AI 사용량/쿼터 초과 경고 확인

---

## 7) 롤백 기준

아래 항목 1개 이상 발생 시 즉시 롤백 또는 설정 우회:

- `/health` 실패 지속
- DB 마이그레이션 중 에러로 서비스 시작 실패
- 핵심 API 5xx 급증 + 사용자 영향 심함
- 홈/차트/복기 탭 1개 이상 치명적 렌더 실패

롤백/완화 시나리오:
1. 이전 배포로 재배포
2. `AI_REQUIRE_ALLOWLIST` / 호출량 제한 환경변수 임시 완화
3. Frontend 모드 재설정 (`NEXT_PUBLIC_APP_MODE`)
4. 운영 이슈 재확인 후 재배포

---

## 8) 체크리스트 (복붙용)

- [ ] 운영 DB 백업 완료
- [ ] 020/021/022 마이그레이션 실행 완료
- [ ] 마이그레이션 반영 확인 쿼리 통과
- [ ] Backend/Frontend 필수 환경변수 점검
- [ ] `/health`, auth flow, 차트 klines, bubbles, packs API 5개 케이스 통과
- [ ] 프론트 주요 탭 진입 및 기본 렌더 확인
- [ ] 1시간 모니터링 1차 점검 완료
- [ ] 롤백 플랜 공유 완료

