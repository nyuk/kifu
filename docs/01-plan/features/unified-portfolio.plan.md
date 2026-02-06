# Plan: Unified Portfolio & Timeline (CEX/DEX/Stocks)

> Created: 2026-02-03
> Status: Draft

## Objective

코인(CEX/DEX)과 주식(Broker)을 하나의 타임라인으로 통합하고, 자산군/거래소/소스별 필터와 포지션 요약을 제공한다. CSV → API → 지갑 연결 순으로 단계 확장한다.

## Requirements

### Must Have
- [ ] 통합 데이터 모델 확정 (asset_class, venue_type, venue, instrument, source)
- [ ] 하나의 타임라인 뷰 (CEX/DEX/주식 섞어서 표시)
- [ ] 필터: 자산군/거래소/소스/기간
- [ ] 포지션 요약(포지션 단위 합산) + 체결 단위 보기
- [ ] KRW/USDT 동시 표시 (환율 캐시)
- [ ] CSV 수입 통합 (코인/주식/DEX 모두)

### Should Have
- [ ] CEX API 연동: Binance, Upbit, Bybit, Bithumb
- [ ] 주식 API 연동: 한국투자증권
- [ ] DEX API 연동: Hyperliquid, Jupiter, Uniswap

### Could Have
- [ ] 지갑 연결 (온체인 자동 수집)
- [ ] LP/스테이킹 이벤트 반영
- [ ] 자동 포지션 라벨링

### Out of Scope (Now)
- 자동매매/주문 실행
- 소셜 기능/공유

## Success Criteria

- [ ] 동일 기간에서 CEX/DEX/주식 이벤트가 하나의 타임라인에 정확히 표시됨
- [ ] 필터 변경 시 2초 이내 응답
- [ ] CSV 수입 후 1분 내 타임라인 반영
- [ ] KRW/USDT 전환 시 UI 깨짐 없음

## Implementation Phases

### Phase 1: 공통 모델 + CSV 통합
1. DB 스키마 설계 및 마이그레이션
2. CSV 임포트 통합 엔드포인트
3. 타임라인 API + 기본 UI
4. 포지션 요약 산출(기본 룰)

### Phase 2: API 연동
1. Binance → Upbit → Bybit → Bithumb
2. 한국투자증권 API
3. Hyperliquid / Jupiter / Uniswap

### Phase 3: 지갑 연결
1. 지갑 연결 + 온체인 인덱서 연동
2. LP/스테이킹 이벤트 확장

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 심볼 표준화 실패 | High | instrument 매핑 테이블 + 정규화 규칙 |
| DEX 이벤트 스키마 다양성 | High | event_type + metadata(JSONB)로 확장 |
| 환율 적용 불일치 | Medium | fx_rate 테이블 + 기준 시점 명시 |
| 대량 데이터 성능 | Medium | 파티셔닝/인덱스/요약 캐시 |

## Approval
- [ ] Approved by:
- [ ] Date:
