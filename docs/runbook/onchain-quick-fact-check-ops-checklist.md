# Onchain Quick Fact Check - 운영 체크리스트

**목표:** 배포/릴리즈 이후 API가 안정적으로 동작하고, 부분 실패를 빠르게 탐지한다.

## 1) 배포 전 준비
- `cd /srv/kifu/kifu`
- 브랜치/커밋 정합성 확인
  - `git status --short`
  - `git pull --ff-only origin main`
- 핵심 환경변수 확인
  - `.env` 존재
  - `BASE_RPC_URL` 설정
- 도메인 DNS 또는 Ingress 변경이 있으면 API 접점 확인

## 2) 배포 방식
- 코드만 반영(빌드 생략)
  - `REDEPLOY_PULL=1 REDEPLOY_BUILD=0 ./scripts/redeploy-backend-fast.sh`
- 종속성/이미지 변경 반영
  - `REDEPLOY_PULL=1 REDEPLOY_BUILD=1 ./scripts/redeploy-backend-fast.sh`
- 빌드 캐시 강제 무시가 필요한 경우
  - `REDEPLOY_PULL=1 REDEPLOY_BUILD=1 REDEPLOY_NO_CACHE=1 ./scripts/redeploy-backend-fast.sh`

## 3) API Smoke 테스트
- 로컬 API 기준으로 테스트
  - `export KIFU_API_BASE="http://127.0.0.1:8080"`
  - `export KIFU_SMOKE_EMAIL="..."`
  - `export KIFU_SMOKE_PASSWORD="..."`
  - `./scripts/smoke-onchain-quick-fact-check.sh`

## 4) 통과 기준
- `[OK] got token`
- `[OK] users/me=200`
- `[OK] onchain quick fact check returned valid status`
- 응답에 `evidence.block_range` 존재
- `tx_count_observed > 0` 일 때 `evidence.tx_hashes` 가 비어 있으면 안 됨
- 허용 레벨
  - `status=ok`
  - `status=warning` + `error_code=partial` (부분결과 허용)
  - `status=error`는 실패로 간주, 사유 분류 필요

## 5) 실패/경고 시 즉시 점검
- 반복 실패 항목
  - `service.provider_error`
  - `context deadline exceeded`
  - `source_unavailable`
- 지표 이상
  - `latency_ms` 급증
  - 동일 주소에서 반복되는 `MAX_EVENTS_EXCEEDED`
  - 반복 `error_code=partial` 다발
- 조치
  1. RPC/네트워크 상태 확인
  2. `docker logs --tail 300 kifu-backend` 로그에서 에러 패턴 수집
  3. `REDEPLOY_BUILD=1`로 재기동 후 스모크 재실행

## 6) 일일/운영 점검 주기
- 배포 직후 즉시 1회 스모크
- 운영 중 1일 1회 정기 스모크
- 이슈 발생 시 즉시 스모크 재실행 + 로그 캡처
- 2회 연속 실패 시 롤백 대상 항목 검토

## 7) 운영 메모
- 공개 도메인에서 `/api/v1/health`가 404이거나 인증게이트로 보일 수 있음
- 로컬 API(`127.0.0.1:8080`) 기준이 가장 정확한 점검 경로
