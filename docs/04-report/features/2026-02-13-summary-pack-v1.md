# 2026-02-13 Summary Pack v1 (기본 정합성 스냅샷)

## 목표
- Upbit/Binance 동기화 또는 CSV 임포트 완료 이후, 실행 가능한 run 기반으로
  `summary_packs`를 생성/저장하고 UI에서 조회·다운로드할 수 있도록 v1 스펙을 완성한다.
- AI 판단 없이 통계/건강검진은 결정론적으로 생성한다.

## 구현 범위

### 백엔드
- 라우트 `/api/v1/packs/*` 추가
  - `POST /api/v1/packs/generate`
  - `GET /api/v1/packs/latest`
  - `GET /api/v1/packs/{pack_id}`
- `runs` + `summary_packs` 마이그레이션 추가 (`backend/migrations/022_create_runs_and_summary_packs.sql`)
- `summary_packs`:
  - `source_run_id`는 run의 id를 참조하도록 FK 적용
  - 인덱스: `(user_id, created_at desc)`, `(user_id, range, created_at desc)`, `(user_id, source_run_id)`
- 엔티티/리포지토리/서비스:
  - `Run` 엔티티/레포지토리
  - `SummaryPack` 엔티티
  - `SummaryPackRepository`
  - `SummaryPackService.GeneratePack` (교차 검증 및 v1 payload 생성)
- 동기화/CSV 임포트 훅:
  - `exchange_handler.Sync`는 run_id를 생성/업데이트하고 응답에 반환
  - `import_handler`는 CSV 임포트 시작 시 run 생성, 완료 시 run_id 반환

### 프론트
- `ExchangeConnectionManager.tsx`에 팩 생성 버튼 동작 추가
  - 동기화 완료 run_id를 저장
  - `POST /v1/packs/generate`
  - `GET /v1/packs/{pack_id}`
  - 상태 배지 + 4개 핵심지표 + missing/duplicate 카운트 + JSON 다운로드

## 결정 반영
- `funding_total`은 v1에서 `null` 허용.
- `runs`는 가볍게 관리하고 `source_run_id`는 `summary_packs`에만 보관.
- symbol 정규화 실패/부적합은 `symbol_mapping_gap` 경고만 추가.
- 동기화 직후 자동 pack 생성은 하지 않고, UI에서 수동 생성 버튼으로 호출.

## 건강검진 규칙 (v1)
- duplicate: 동일 키가 반복되면 `duplicate_suspects_count` 증가
- missing:
  - 10건 이상인데 `fees_total == 0`이면 `missing + 1`
  - futures + `funding` 모듈인데 `funding_total` 유효값이 비어 있으면 추가 `+1`
- time_skew: median 대비 절대 편차가 6시간 이상이면 warning `time_skew`
- symbol_mapping_gap: symbol 정규화 결과가 `unknown/invalid`면 warning
- status:
  - `error`: missing >= 10
  - `warning`: missing/duplicate/warnings 존재
  - `ok`: 모두 정상

## 변경 파일
- `backend/internal/domain/entities/run.go` (신규)
- `backend/internal/domain/entities/summary_pack.go` (신규)
- `backend/internal/domain/repositories/run_repository.go` (신규)
- `backend/internal/domain/repositories/summary_pack_repository.go` (신규)
- `backend/internal/infrastructure/repositories/run_repository_impl.go` (신규)
- `backend/internal/infrastructure/repositories/summary_pack_repository_impl.go` (신규)
- `backend/internal/interfaces/http/handlers/pack_handler.go` (신규)
- `backend/internal/interfaces/http/handlers/exchange_handler.go`
- `backend/internal/interfaces/http/handlers/import_handler.go`
- `backend/internal/interfaces/http/routes.go`
- `backend/internal/services/summary_pack_service.go` (신규)
- `backend/internal/app/app.go`
- `backend/internal/domain/repositories/trade_repository.go` (trade range 조회 인터페이스 사용 시그니처 반영)
- `backend/internal/infrastructure/repositories/trade_repository_impl.go` (range 조회 구현)
- `backend/internal/services/summary_pack_service_test.go` (신규)
- `backend/migrations/022_create_runs_and_summary_packs.sql`
- `frontend/src/components/settings/ExchangeConnectionManager.tsx`

## 검증
- 단위 테스트
  - `go test ./internal/services` 통과
- 전체 백엔드 테스트
  - `go test ./...` 통과
- API 포맷/경로
  - `/api/v1/packs/generate`
  - `/api/v1/packs/latest`
  - `/api/v1/packs/{pack_id}`

## 실행/확인 절차
1. DB 마이그레이션 실행 (`migrate`)
2. 동기화/임포트 실행 후 run_id 획득
3. 설정 화면에서 해당 exchange의 `팩 생성(30d)` 실행
4. 상태 배지/경고/핵심 지표/JSON 다운로드 결과 확인
5. 타 사용자의 pack 접근이 안 되는지(권한 제한) API로 확인

## API 호출 예시
```bash
# 1) 로그인 (예시)
curl -s -X POST "http://127.0.0.1:8080/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"change-me"}'

# 2) 동기화 후 받은 run_id로 팩 생성
curl -s -X POST "http://127.0.0.1:8080/api/v1/packs/generate" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"source_run_id":"<run-id>","range":"30d"}'

# 3) 최신 팩 조회
curl -s "http://127.0.0.1:8080/api/v1/packs/latest?range=30d" \
  -H "Authorization: Bearer <JWT>"

# 4) 특정 pack_id 조회
curl -s "http://127.0.0.1:8080/api/v1/packs/<pack-id>" \
  -H "Authorization: Bearer <JWT>"
```

## 남은 과제
- pack 생성 API에 대한 HTTP smoke test(Generate->Get->권한오류) 추가 고려
- `summary_pack_service` missing 카운트 임계치 확장(현재 규칙으로는 `error` 트리거가 어렵다는 이슈 검토)
