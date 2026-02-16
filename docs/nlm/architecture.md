> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# 아키텍처 요약

## 백엔드
- 라우팅: `backend/internal/interfaces/http/routes.go`
- HTTP 핸들러: `backend/internal/interfaces/http/handlers/pack_handler.go`
- 도메인 레이어:
  - `backend/internal/domain/repositories/run_repository.go`
  - `backend/internal/domain/entities` (실행(run), pack, reconciliation 도메인)
- 영속성/리포지토리 구현:
  - `backend/internal/infrastructure/repositories/run_repository_impl.go`

## 플로우 (generate-latest)
1. 클라이언트 요청 `POST /api/v1/packs/generate-latest`
2. 인증 사용자 기반으로 최신 완료된 run 조회
3. 필터/정렬 후 run 미존재 시 `NO_COMPLETED_RUN` 404 반환
4. 존재 시 Summary Pack 생성 서비스 호출
5. 결과 `pack_id`, `reconciliation_status`, `source_run_id`, `anchor_ts` 반환

## 프론트
- `frontend/src/components/settings/ExchangeConnectionManager.tsx`
- 30d 팩 생성 버튼에서 기존 `generate(source_run_id)` 호출을 제거하고
  `generate-latest` 기반 자동 선택으로 전환

## 문서/운영 경로
- API 스펙: `docs/spec/summary-pack-v1.md`
- 운영 대응: `docs/runbook/summary-pack-v1.md`
- 의사결정 이력: `docs/adr/0002-summary-pack-v1.1-decisions.md`
