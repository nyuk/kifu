# Onchain Quick Fact Check 운영 운영 절차 (deploy + smoke)

## 1) 빠른 백엔드 재배포

기본 동작(재빌드 없음, 최소 비용 재기동):

```bash
cd /srv/kifu/kifu
git pull --ff-only origin main
REDEPLOY_BUILD=0 REDEPLOY_PULL=0 ./scripts/redeploy-backend-fast.sh
```

변경된 코드까지 반영하려면 `REDEPLOY_PULL=1` 추가:

```bash
cd /srv/kifu/kifu
REDEPLOY_PULL=1 REDEPLOY_BUILD=0 ./scripts/redeploy-backend-fast.sh
```

의존성이 바뀌거나 Dockerfile/모듈을 변경한 경우에만 강제 빌드:

```bash
cd /srv/kifu/kifu
REDEPLOY_PULL=1 REDEPLOY_BUILD=1 ./scripts/redeploy-backend-fast.sh
```

`REDEPLOY_BUILD=1`에서 강한 캐시 정합이 필요하면:

```bash
cd /srv/kifu/kifu
REDEPLOY_PULL=1 REDEPLOY_BUILD=1 REDEPLOY_NO_CACHE=1 ./scripts/redeploy-backend-fast.sh
```

## 2) 배포 직후 smoke checklist

아래를 최소 5분 내 점검.

### 2-1) 기본 API
- `GET /health` -> `200`
- `POST /api/v1/auth/login` -> `200` (테스트 계정)
- `GET /api/v1/users/me` -> `200` (JWT)

### 2-2) feature flow smoke (onchain quick fact check)
```bash
export KIFU_API_BASE="https://kifu.moneyvessel.kr" # 또는 http://127.0.0.1:8080
export KIFU_SMOKE_EMAIL="admin@example.com"
export KIFU_SMOKE_PASSWORD="your-password"
./scripts/smoke-onchain-quick-fact-check.sh
```

확인 포인트:
- 응답에 `status`가 `ok`/`warning`/`error` 중 하나 존재
- `evidence.tx_hashes` 배열 존재 (`warning`/`error`에서도 evidence block_range는 존재해야 함)
- `error_code=partial`이면 `uncertainty.is_partial=true` 일관성 점검
- `status=error`면 HTTP code 5xx 또는 `error_code=source_unavailable/timeout` 등 확인

## 3) 정기 점검 권장

배포 후 10분 동안 다음 로그 모니터링:
```bash
docker logs --tail 200 kifu-backend | grep -E "incident:onchain|request_received|handler.request_received|service.provider_error|source_unavailable|timeout"
```

`service.provider_error` 다량 발생 시:
- RPC 엔드포인트 key/이벤트 제한/네트워크 상태 점검
- provider timeout 상향 또는 범위 축소(lookback 단축) 검토
