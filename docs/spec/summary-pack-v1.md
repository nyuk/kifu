# Summary Pack v1 API Spec

## 버전
- Schema: `summary_pack_v1`
- Calc version: `ledger_calc_v1.0.0`
- Base path: `/api/v1/packs`

## 공통
- 인증: 기존 auth/세션 또는 JWT
- 권한: 본인 사용자 소유 데이터만 접근 (`401`/`404` 정책 적용)
- Content-Type: `application/json`

## 1) POST `/api/v1/packs/generate`

### Request
```json
{
  "source_run_id": "9f1f9b2d-4f2e-4f88-b9d4-... (uuid)",
  "range": "30d"
}
```

#### Fields
| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `source_run_id` | string(uuid) | Y | 동기화/임포트 run id |
| `range` | string(enum) | N | `30d` \| `7d` \| `all` (default: `30d`) |

### Response 200
```json
{
  "pack_id": "c6d4...-uuid",
  "reconciliation_status": "ok"
}
```

#### Response fields
| 필드 | 타입 | 설명 |
|---|---|---|
| `pack_id` | string(uuid) | 생성된 Summary Pack id |
| `reconciliation_status` | enum | `ok` / `warning` / `error` |

### Possible Errors
- `400 INVALID_REQUEST` : `source_run_id` 누락/형식 오류, range 미지원
- `401 UNAUTHORIZED` : 세션/토큰 없음
- `404 RUN_NOT_FOUND` : 본인 run_id가 아님/삭제됨
- `500 PACK_SAVE_FAILED` : DB 저장 실패

## 1.1) POST `/api/v1/packs/generate-latest`

### Request
```json
{
  "range": "30d"
}
```

#### Fields
| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `range` | string(enum) | N | `30d` \| `7d` \| `all` (default: `30d`) |

### Behavior
- 서버가 인증 사용자의 **최근 성공한 동기화/임포트 run**(`exchange_sync`, `trade_csv_import`, `portfolio_csv_import`) 중 최신 완료된 1개를 자동 선택.
- 선택 기준: `ORDER BY finished_at DESC NULLS LAST, started_at DESC`
- `run_id`는 내부에서 결정되며 클라이언트는 알릴 필요 없음.

### Response 200
```json
{
  "pack_id": "c6d4...-uuid",
  "reconciliation_status": "ok",
  "source_run_id": "9f1f9b2d-4f2e-4f88-b9d4-...",
  "anchor_ts": "2026-02-13T09:00:00Z"
}
```

#### Response fields
| 필드 | 타입 | 설명 |
|---|---|---|
| `pack_id` | string(uuid) | 생성된 Summary Pack id |
| `reconciliation_status` | enum | `ok` / `warning` / `error` |
| `source_run_id` | string(uuid) | 서버가 자동 선택한 기준 run |
| `anchor_ts` | string(ISO8601) | run의 `finished_at` (없으면 `started_at`) |

### Possible Errors
- `404 NO_COMPLETED_RUN` : 최근 완료 run이 없어 생성할 수 없음

## 2) GET `/api/v1/packs/latest`

### Query
- `range` (string, default `30d`)

### Response
Summary Pack 전체 엔티티 (pack_id, user_id, source_run_id, range, schema_version, calc_version, content_hash, reconciliation_status, missing/duplicate counts, normalization_warnings, payload JSONB, created_at 포함).

### Error
- `404 PACK_NOT_FOUND` : 해당 range의 pack 없음

### 권장 UI 플로우 (v1.1)
- 기본 동작: `POST /api/v1/packs/generate-latest` (run 자동 선택) + `GET /api/v1/packs/{pack_id}`
- 참고(고급): 기존 `POST /api/v1/packs/generate`는 디버그/고급 모드 전용으로 유지

## 3) GET `/api/v1/packs/{pack_id}`

### Path
- `pack_id` (string(uuid))

### Response
Summary Pack 전체 엔티티 (GetLatest와 동일 형태)

## 4) Summary Pack payload schema

```json
{
  "pack_id": "uuid",
  "schema_version": "summary_pack_v1",
  "calc_version": "ledger_calc_v1.0.0",
  "content_hash": "sha256_hex",
  "time_range": {
    "timezone": "Asia/Seoul",
    "start_ts": "2026-01-01T00:00:00Z",
    "end_ts": "2026-02-01T00:00:00Z"
  },
  "data_sources": {
    "exchanges": ["upbit", "binance_futures"],
    "csv_imported": false,
    "modules": ["trades", "funding"]
  },
  "pnl_summary": {
    "realized_pnl_total": "1234.56",
    "unrealized_pnl_snapshot": null,
    "fees_total": "12.34",
    "funding_total": null
  },
  "flow_summary": {
    "net_exchange_flow": "10000.00",
    "net_wallet_flow": null
  },
  "activity_summary": {
    "trade_count": 123,
    "notional_volume_total": "250000.00",
    "long_short_ratio": "1.05",
    "leverage_summary": null,
    "max_drawdown_est": null
  },
  "reconciliation": {
    "reconciliation_status": "ok",
    "missing_suspects_count": 0,
    "duplicate_suspects_count": 0,
    "normalization_warnings": []
  },
  "evidence_index": {
    "exchange_trade_ids_sample": ["111", "112"],
    "evidence_pack_ref": "evidence_pack://c6d4...-uuid"
  }
}
```

## 5) 타입 제약/Nullable
- `pack_id`, `schema_version`, `calc_version`, `content_hash`, `reconciliation_status`, `time_range.*`는 null 불가
- `unrealized_pnl_snapshot`, `funding_total`, `net_wallet_flow`, `leverage_summary`, `max_drawdown_est`는 null 허용
- `flow_summary.net_exchange_flow`는 계산이 가능한 경우 문자열 수치, 실패 시 null이 될 수 있음

## 6) Health rules (요약)
### duplicate
- 동일 `exchange_trade_id` 또는 fallback 키(`exchange|symbol|side|price|qty`) 중복 시 가중치

### missing
- `trade_count >= 10` 이고 `fees_total == 0` => `missing + 1`
- 선물 관련 모듈 존재 + 선물 거래 있음 + funding 데이터 미존재 => `missing + 1`

### warnings
- 시간 왜곡(`time_skew`) : timestamp가 median 대비 6시간 초과 이탈
- 심볼 매핑 실패(`symbol_mapping_gap`) : `unknown/invalid` 정규화

### 상태 산정
- `error`: `missing_suspects_count >= 10`
- `warning`: `missing > 0` 또는 `duplicate > 0` 또는 warnings non-empty
- `ok`: 모두 정상

## 7) 멱등성 정책 (v1)
- 현재 동작: **`source_run_id + range` 기준으로 중복 생성 허용**(버튼 누를 때마다 신규 pack 생성)
- 운영 정책 변경 시:
  - 최신 pack 재사용 우선(동일 요청은 기존 pack 반환)
  - 또는 `unique (user_id, source_run_id, range)` 제약 + `ON CONFLICT UPDATE` 전환
