> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# ADR-0002 Summary Pack v1.1 generate-latest

## 배경
- 동기화/임포트 완료 후 사용자에게 run id를 강제로 요구하면 UI 실수가 빈번해지고 테스트/재시도가 늘어남.
- 이전 흐름은 `POST /api/v1/packs/generate`에서 사용자가 직접 `source_run_id`를 선택해야 했고, UI는 실패 시 재시도 시나리오가 단절됨.

## 결정 1: 최근 완료 run 기반 자동 선택 API 추가
- `/api/v1/packs/generate-latest`를 추가한다.
- 인증 사용자 기준으로 최근 완료된 run 1건만 자동 선택해 pack을 생성한다.
- 선택 규칙:
  - `status='completed'`
  - `run_type IN ('exchange_sync','trade_csv_import','portfolio_csv_import')`
  - `ORDER BY finished_at DESC NULLS LAST, started_at DESC`
  - 1건만

## 결정 2: 수동 생성 시점은 유지
- 동기화 직후 자동 생성은 하지 않고, 사용자가 버튼을 눌렀을 때 생성하도록 유지한다.
- 다만 UI가 run id를 노출/요구하지 않고 `generate-latest`만 호출하도록 변경한다.

## 결정 3: 엔드포인트 응답에 `source_run_id`와 `anchor_ts` 반환
- `source_run_id`: 서버가 자동 선택한 기준 run id
- `anchor_ts`: `run.finished_at`(없으면 `run.started_at`)을 ISO8601로 반환해 기준 시점을 명시한다.

## 결정 4: 예외 상태 추가
- 최근 완료 run가 없을 때는 `NO_COMPLETED_RUN`를 반환해 UX에서 동기화 미완료를 명확히 노출한다.

## 운영 영향
- 기존 `/api/v1/packs/generate`는 유지(디버그/고급 사용).
- v1.1 기본 흐름은 `/api/v1/packs/generate-latest`로 전환.
- 백엔드에는 추가 DB 스키마 변경 없이 `runs` 조회 로직만 추가.
