> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# API 엔드포인트 정리 (NotebookLM 전용)

## Pack API

### `POST /api/v1/packs/generate-latest`
- 설명: 인증 사용자의 최근 completed run 기반으로 summary pack 생성
- Request
  - 인증 헤더: `Authorization: Bearer <token>`
  - Body: 없음(파라미터 없음)
- 동작
  - 완료된 run를 사용자 기준으로 자동 선택
  - run_type 허용: `exchange_sync`, `trade_csv_import`, `portfolio_csv_import`
  - 정렬: `finished_at DESC NULLS LAST`, 동률 시 `started_at DESC`
- Response
  - `pack_id`
  - `reconciliation_status`
  - `source_run_id`
  - `anchor_ts`
- 실패
  - 완료 run 없음: `NO_COMPLETED_RUN` + 404

## 기존 generate 엔드포인트
- 기존 동작: 특정 `source_run_id` 기반 생성 플로우
- UI는 30d 기준 자동 생성용으로 기존 ID 지정 방식에서 `generate-latest`로 전환됨

## 운영 점검 포인트
- 인증 미스: 401
- 사용자 스코프 격리: 타 사용자 run이 선택되면 안 됨
- 시간 순서 검증: `finished_at` 누락 run(혹은 NULL)은 마지막으로 처리
- 응답 일관성: `pack_id`/`source_run_id`가 유효한지 즉시 조회 확인
