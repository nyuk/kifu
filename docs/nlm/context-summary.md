> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# 현재 상태 요약 (NotebookLM 단일 진실 소스용)

## 프로젝트 핵심
- 제품: 거래/요약 패키지 백엔드 + Next/React 기반 프런트
- 목표: `Summary Pack v1.1`의 최신 completed run 기반 생성 플로우 정착
- 상태: `generate-latest` 엔드포인트 추가 및 UI 연동 완료

## 완료된 핵심 변경
- 백엔드 API: `POST /api/v1/packs/generate-latest` 추가
- 라우팅: `backend/internal/interfaces/http/routes.go`
- 핸들러:
  - `backend/internal/interfaces/http/handlers/pack_handler.go`
- 도메인 인터페이스/리포지토리:
  - `backend/internal/domain/repositories/run_repository.go`
  - `backend/internal/infrastructure/repositories/run_repository_impl.go`
- UI: `frontend/src/components/settings/ExchangeConnectionManager.tsx`
  - “팩 생성(30d)”가 `/v1/packs/generate-latest` 호출로 전환
- 테스트:
  - `backend/internal/interfaces/http/handlers/pack_handler_test.go`
  - 성공, `NO_COMPLETED_RUN`(404), 사용자 스코프 분리 검증
- 문서:
  - `docs/spec/summary-pack-v1.md`
  - `docs/runbook/summary-pack-v1.md`
  - `docs/adr/0002-summary-pack-v1.1-decisions.md`

## 핵심 규칙
- `run_type` 필터: `exchange_sync`, `trade_csv_import`, `portfolio_csv_import`
- `status='completed'`만 대상
- 정렬: `finished_at DESC NULLS LAST`, 동률이면 `started_at DESC`
- 대상 run 없으면 `NO_COMPLETED_RUN`으로 404

## 다음 작업 후보
1. 로컬/스테이징 배포 반영 후 smoke 테스트
2. `NO_COMPLETED_RUN` UX 메시지 정교화
3. 기존 플로우 연장 작업 진행
