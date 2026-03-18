# ACP Quickstart

이 트랙의 목적은 `onchainQuickFactCheckCompactJson` ACP offering을
`점검 -> smoke -> seller 실행` 흐름으로 다루는 것입니다.

## 기억할 파일

1. `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/scripts/acpctl.sh`
2. `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/acp/.env`
3. `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/scripts/smoke-onchain-quick-fact-check.sh`

## 로컬 기준 순서

```bash
cd /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project

./scripts/acpctl.sh install
./scripts/devctl.sh restart backend
./scripts/acpctl.sh preflight
./scripts/acpctl.sh smoke
./scripts/acpctl.sh seller
```

## acp/.env에 필요한 값

```dotenv
WHITELISTED_WALLET_PRIVATE_KEY=
SELLER_AGENT_WALLET_ADDRESS=
SELLER_ENTITY_ID=

KIFU_API_BASE=http://127.0.0.1:8080
KIFU_EMAIL=
KIFU_PASSWORD=
```

## 명령 설명

### `./scripts/acpctl.sh preflight`
- `acp/.env` 존재 여부 확인
- 필수 env 존재 여부 확인
- `python3`, `dotenv`, `requests`, `virtuals_acp` 확인
- `KIFU_API_BASE/health` 확인

### `./scripts/acpctl.sh install`
- `acp/requirements.txt` 기반 Python 의존성 설치

### `./scripts/acpctl.sh smoke`
- `scripts/smoke-onchain-quick-fact-check.sh` 실행
- `KIFU_EMAIL`, `KIFU_PASSWORD`를 기본 로그인 계정으로 사용

### `./scripts/acpctl.sh seller`
- 필수 env와 python 의존성이 모두 있을 때만 seller 시작
- 실제 seller는 `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/acp/seller.py`

## 관련 문서

- `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/docs/acp_onchain_quick_fact_check_job.md`
- `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/docs/runbook/acp-onchain-job-preflight-checklist.md`
- `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/docs/runbook/2026-02-22-onchain-quick-fact-check-ops-smoke.md`

## 한 줄 기억법

`devctl`로 백엔드 올리고, `acpctl`로 ACP를 점검한다.
