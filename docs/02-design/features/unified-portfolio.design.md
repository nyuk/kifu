# Design: Unified Portfolio & Timeline (CEX/DEX/Stocks)

> Created: 2026-02-03
> Status: Draft

## Goals

- 코인/주식을 하나의 타임라인으로 통합
- 자산군/거래소/소스/기간 필터 제공
- 포지션 요약(체결 기반 집계) 제공
- KRW/USDT 동시 표시 지원

## Data Model

### Core Enums
- `asset_class`: `crypto` | `stock`
- `venue_type`: `cex` | `dex` | `broker`
- `source`: `csv` | `api` | `wallet`
- `event_type`: `spot_trade` | `perp_trade` | `dex_swap` | `lp_add` | `lp_remove` | `transfer` | `fee`

### Tables (New)

#### `venues`
| column | type | notes |
|---|---|---|
| id | UUID | PK |
| code | VARCHAR(30) | binance, upbit, bybit, bithumb, kis, hyperliquid, jupiter, uniswap |
| venue_type | VARCHAR(10) | cex/dex/broker |
| display_name | VARCHAR(60) | 사용자 표시명 |
| chain | VARCHAR(30) | dex 체인 (optional) |
| created_at | TIMESTAMPTZ |  |

#### `accounts`
| column | type | notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK users |
| venue_id | UUID | FK venues |
| label | VARCHAR(60) | 계정 라벨 |
| address | VARCHAR(80) | 지갑 주소 (optional) |
| source | VARCHAR(10) | csv/api/wallet |
| created_at | TIMESTAMPTZ | |

#### `instruments`
| column | type | notes |
|---|---|---|
| id | UUID | PK |
| asset_class | VARCHAR(10) | crypto/stock |
| base_asset | VARCHAR(20) | BTC, ETH, AAPL |
| quote_asset | VARCHAR(20) | USDT, KRW |
| symbol | VARCHAR(40) | BTC/USDT, AAPL/KRW |
| created_at | TIMESTAMPTZ | |

#### `instrument_mappings`
| column | type | notes |
|---|---|---|
| id | UUID | PK |
| instrument_id | UUID | FK instruments |
| venue_id | UUID | FK venues |
| venue_symbol | VARCHAR(40) | 거래소 원본 심볼 |
| created_at | TIMESTAMPTZ | |

#### `trade_events`
| column | type | notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK users |
| account_id | UUID | FK accounts |
| venue_id | UUID | FK venues |
| instrument_id | UUID | FK instruments |
| asset_class | VARCHAR(10) | crypto/stock |
| venue_type | VARCHAR(10) | cex/dex/broker |
| event_type | VARCHAR(20) | spot_trade/perp_trade/dex_swap |
| side | VARCHAR(10) | buy/sell |
| qty | NUMERIC(30,10) | |
| price | NUMERIC(30,10) | |
| fee | NUMERIC(30,10) | |
| fee_asset | VARCHAR(20) | |
| executed_at | TIMESTAMPTZ | |
| source | VARCHAR(10) | csv/api/wallet |
| external_id | VARCHAR(80) | 거래소/체인 tx id |
| metadata | JSONB | DEX 스왑/LP 상세 |

#### `positions`
| column | type | notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK users |
| venue_id | UUID | FK venues |
| instrument_id | UUID | FK instruments |
| status | VARCHAR(10) | open/closed |
| size | NUMERIC(30,10) | |
| avg_entry | NUMERIC(30,10) | |
| avg_exit | NUMERIC(30,10) | |
| opened_at | TIMESTAMPTZ | |
| closed_at | TIMESTAMPTZ | |
| realized_pnl_usdt | NUMERIC(30,10) | |
| realized_pnl_krw | NUMERIC(30,10) | |
| fees_usdt | NUMERIC(30,10) | |
| fees_krw | NUMERIC(30,10) | |

#### `position_events`
| column | type | notes |
|---|---|---|
| id | UUID | PK |
| position_id | UUID | FK positions |
| trade_event_id | UUID | FK trade_events |
| role | VARCHAR(20) | open/add/reduce/close |

#### `fx_rates`
| column | type | notes |
|---|---|---|
| id | UUID | PK |
| base | VARCHAR(10) | USDT |
| quote | VARCHAR(10) | KRW |
| rate | NUMERIC(20,8) | |
| captured_at | TIMESTAMPTZ | |

### Legacy Compatibility
- 기존 `trades` 테이블은 유지
- `trade_events`로 점진적 마이그레이션
- 새 타임라인은 `trade_events` 기반

## API Design (New)

### Timeline
`GET /api/v1/portfolio/timeline`
- query: `from`, `to`, `asset_class`, `venue`, `source`, `event_type`
- response: 통합 이벤트 리스트 (trade_events 기반)

#### Timeline Response (Draft)
```json
{
  "items": [
    {
      "id": "uuid",
      "executed_at": "2026-02-03T10:15:00Z",
      "asset_class": "crypto",
      "venue_type": "cex",
      "venue": "binance",
      "venue_name": "Binance",
      "account_label": "default",
      "instrument": "BTC/USDT",
      "event_type": "spot_trade",
      "side": "buy",
      "qty": "0.1",
      "price": "68000",
      "fee": "5",
      "fee_asset": "USDT",
      "source": "csv",
      "external_id": "12345",
      "metadata": null
    }
  ],
  "next_cursor": "base64cursor"
}
```

### Positions
`GET /api/v1/portfolio/positions`
- query: `status`, `asset_class`, `venue`
- response: 포지션 요약

#### Positions Response (Draft)
```json
{
  "positions": [
    {
      "key": "binance|BTC/USDT|crypto",
      "instrument": "BTC/USDT",
      "venue": "binance",
      "venue_name": "Binance",
      "account_label": "default",
      "asset_class": "crypto",
      "venue_type": "cex",
      "status": "open",
      "net_qty": "0.12",
      "avg_entry": "64210.5",
      "buy_qty": "0.2",
      "sell_qty": "0.08",
      "buy_notional": "12842.1",
      "sell_notional": "5136.8",
      "last_executed_at": "2026-02-03T10:18:00Z"
    }
  ],
  "count": 1
}
```

### Instruments
`GET /api/v1/instruments`
- query: `asset_class`, `venue`

### CSV Import
`POST /api/v1/imports/trades`
- body: CSV 파일 + `venue`, `asset_class`, `source`
- response: import summary

### Connections
`POST /api/v1/connections`
- CEX/Broker API 키 or Wallet 주소 등록

## CSV Import Spec (Phase 1)

### Endpoint
`POST /api/v1/imports/trades` (multipart/form-data)

Optional query: `?report=csv` (issues CSV 다운로드)

### Form Fields
| field | required | notes |
|---|---|---|
| file | yes | CSV 파일 |
| venue | yes | binance, upbit, bybit, bithumb, kis, hyperliquid, jupiter, uniswap |
| asset_class | yes | crypto/stock |
| source | yes | csv |
| account_label | no | 계정 라벨 |
| venue_type | no | cex/dex/broker (없으면 venue로 추정) |

### Required CSV Columns
| column | type | notes |
|---|---|---|
| executed_at | datetime | RFC3339 (UTC 권장) |
| symbol | string | BTC/USDT, AAPL/KRW |
| side | string | buy/sell |
| qty | number | 체결 수량 |
| price | number | 체결 가격 |

### Optional CSV Columns
| column | type | notes |
|---|---|---|
| fee | number | 수수료 |
| fee_asset | string | 수수료 자산 |
| event_type | string | spot_trade/perp_trade/dex_swap/lp_add/lp_remove/transfer/fee |
| external_id | string | 거래소 ID 또는 tx hash |
| venue_symbol | string | 거래소 원본 심볼 |
| base_asset | string | BTC |
| quote_asset | string | USDT, KRW |
| metadata | json | DEX 상세 |

### Normalization
- `symbol`은 `BASE/QUOTE` 형식 권장
- quote가 없으면 venue 기본 통화로 추정 (예: KIS=KRW, CEX=USDT)
- DEX 이벤트는 `metadata`에 세부 정보 보관

### Response (Draft)
```json
{
  "imported": 120,
  "skipped": 4,
  "duplicates": 2,
  "issue_count": 4,
  "issues_truncated": false,
  "issues": [
    { "row": 12, "reason": "invalid price" },
    { "row": 29, "reason": "duplicate event already imported" }
  ],
  "positions_refreshed": true,
  "positions_refresh_error": "",
  "venue": "binance",
  "source": "csv"
}
```

## Normalization Rules

- `instrument.symbol`은 `BASE/QUOTE` 형식으로 통일
- 거래소 원본 심볼은 `instrument_mappings`에 보관
- DEX 이벤트는 `metadata`로 세부 저장
- 환율은 `fx_rates` 기준 시점을 함께 기록

## UI Structure

### Home Snapshot
- 통합 타임라인 상단 요약
- KRW/USDT 토글
- 자산군/거래소/소스 필터

### Timeline View
- 기본: 체결 이벤트 카드 리스트
- 토글: 포지션 요약 카드
- 배지: `CEX/DEX/BROKER`, `CRYPTO/STOCK`

### Position Summary
- 종목별 포지션 테이블
- 손익/수수료/기간

## Migration Strategy

1. `venues`, `accounts`, `instruments` 테이블 추가
2. `trade_events` 생성 후 CSV 임포트부터 사용
3. 기존 `trades`는 읽기 전용 유지
4. 단계적으로 API/지갑 연결 추가

## Open Questions

- KIS API 권한 범위
- DEX 이벤트 상세 매핑 범위
- 포지션 산출 룰(spot 기준 vs perp 기준)
