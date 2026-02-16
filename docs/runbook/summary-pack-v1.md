> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# Summary Pack v1 Runbook

## 목적
운영 중 Summary Pack v1 생성/조회가 실패할 때 빠르게 원인 분류하고 복구하는 지침서.

## 전제
- 마이그레이션 `022_create_runs_and_summary_packs.sql` 반영됨
- 백엔드 API `POST /api/v1/packs/generate`, `POST /api/v1/packs/generate-latest`, `GET /api/v1/packs/latest`, `GET /api/v1/packs/{pack_id}` 가 배포됨
- 사용자 인증 토큰(또는 쿠키 세션) 정상 동작

## 1. 기본 실행 흐름
1. 동기화 또는 CSV 임포트 완료 후 `run_id`를 확보한다.
2. `POST /api/v1/packs/generate` 호출:
   ```json
   { "source_run_id": "<run_id>", "range": "30d" }
   ```
3. 응답의 `pack_id`를 저장한다.
4. `GET /api/v1/packs/{pack_id}`로 결과 JSON을 확인한다.
5. `reconciliation_status`, `missing_suspects_count`, `duplicate_suspects_count`을 리뷰한다.

### v1.1 권장 플로우
1. 동기화/임포트 완료 후 직접 `run_id` 입력 없이:
   `POST /api/v1/packs/generate-latest` 호출.
2. 응답 `source_run_id`, `anchor_ts`를 화면에 표시.
3. 응답 `pack_id`로 `GET /api/v1/packs/{pack_id}` 조회.
4. 필요시 `GET /api/v1/packs/latest?range=30d`로 최신값 확인.

## 2. 점검 우선순위

### P0: 인증/권한
- 증상
  - `401 UNAUTHORIZED`, `404 RUN_NOT_FOUND`
- 확인
  - 동일 브라우저/세션에서 `GET /api/v1/auth/me` 호출 가능 여부
  - 토큰 만료/로그아웃 반복 여부
  - `run_id`가 본인 user 소유인지 확인

### P1: 생성 실패
- 증상
  - `PACK_GENERATE_FAILED`, `PACK_SAVE_FAILED`
- 확인
  - 요청 body의 `source_run_id`가 UUID 형식인지
  - 범위값이 허용값(`30d|7d|all`)인지
  - 백엔드 로그에서 `GeneratePack`/`Create` 에러 존재 여부
- 조치
  - `run_id`와 `range`를 변경해 재시도
  - 동일 실패가 계속되면 해당 run에 연결된 거래건 수/메타를 확인

### P1: 조회 실패
- 증상
- `PACK_NOT_FOUND` 또는 404 응답
- 확인
  - generate가 실제로 200 반환했는지
  - 네트워크 에러로 응답이 중간 손실되지 않았는지
- 조치
  - `GET /api/v1/packs/latest?range=30d`로 최신 생성 여부 확인

### P0: 최근 완료 run 없음
- 증상
  - `404 NO_COMPLETED_RUN`
- 확인
  - 인증 사용자 기준 최근 `exchange_sync`/`trade_csv_import`/`portfolio_csv_import` run 중 `status='completed'` 존재 여부
  - 동기화/임포트 완료 메시지 후 run가 성공으로 마무리됐는지 (`finished_at` 존재 여부)
- 조치
  - 동기화/임포트 완료 후 재시도
  - run가 실패한 경우 로그를 확인해 상태/메타 보완 후 재동기화

### P2: `reconciliation_status=warning/error`
- warning 조건
  - `duplicate_suspects_count > 0`
  - `missing_suspects_count > 0`
  - `normalization_warnings` 비어있지 않음
- error 조건
  - `missing_suspects_count >= 10`
- 조치
  - UI/보고서에 노출된 카드에 warning 상세를 표시해 사용자에게 원인 전달

## 3. 운영용 점검 쿼리
아래는 DB에서 빠른 정합성 확인용. 운영시 환경에 맞는 권한/뷰로 실행.

```sql
-- 최근 생성된 pack
SELECT pack_id, user_id, source_run_id, range, reconciliation_status,
       missing_suspects_count, duplicate_suspects_count, created_at
FROM summary_packs
ORDER BY created_at DESC
LIMIT 20;

-- 특정 run의 생성 추적
SELECT run_id, user_id, run_type, status, started_at, finished_at, meta
FROM runs
WHERE run_id = '<run_uuid>';

-- warning 분포
SELECT range, reconciliation_status, COUNT(*) AS cnt
FROM summary_packs
GROUP BY range, reconciliation_status
ORDER BY range, reconciliation_status;
```

## 4. 장애 대응 체크리스트

| 증상 | 즉시 확인 | 1차 대응 | 2차 대응 |
|---|---|---|---|
| `pack generate` 느림/타임아웃 | 백엔드 CPU/DB 지연 | 사용자에게 재시도 가이드, range 감소(7d) | 재시도 로그 수집 후 배치 동시성 점검 |
| 계속 warning만 발생 | normalization warnings 확인 | 심볼 정규화/메타데이터 점검 | 규칙 임계치(감도) 조정 |
| 중복 pack 다량 생성 | 동일 run_id 재클릭 여부 | 버튼 disable/디바운스 적용 | ADR-0002에서 idempotency 정책 확정 |
| 범위 데이터가 0개 | run 완료 전 시간 기준 | run 완료 시각 이후로 재요청 | UI에서 run_id 최신값 동기화 |

## 5. 릴리즈 직전 점검
1. migration 적용 여부 확인 (`migrate` 상태/버전 비교)
2. auth 토큰 만료 정책 + CORS/쿠키 정책 검증
3. 샘플 계정으로 `generate → latest → pack_id 조회` 시나리오 1회 이상 통과
4. 타 사용자 접근 시 404/403 동작 점검

## 6. 롤백/긴급 조치
- 심각한 실패 확산 시:
  1) UI에서 버튼 비활성화
  2) API 라우팅 임시 유지(읽기만 허용)
  3) 신규 migration 미적용 상태로 롤백은 하지 말고, root cause fix 후 핫픽스 배포
