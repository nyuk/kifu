# OpenClaw Spike Day 1 Questions

## 목적

Day 1의 목표는 코드를 만드는 것이 아니라,
OpenClaw가 현재 KIFU의 `onchainQuickFactCheckCompactJson` offering을
대체하거나 병행할 수 있는 플랫폼인지 판단하는 것이다.

즉, 오늘 끝나야 하는 산출물은 `답변`이지 `구현`이 아니다.

## 질문 1. OpenClaw는 service-only job에 맞는가?

- JSON requirement를 입력으로 받는 작업을 만들 수 있는가?
- 사용자 요청이 단순 텍스트가 아니라 구조화된 JSON이어도 되는가?
- seller/worker/agent가 외부 API를 호출해서 결과를 돌려주는 패턴이 가능한가?
- 결과 deliverable을 compact JSON 형태로 그대로 반환할 수 있는가?

### 기대 답변 형식
- 가능 / 불가능 / 불명확
- 근거 링크 또는 문서 위치
- 제약 조건

## 질문 2. 입력 스키마를 그대로 유지할 수 있는가?

현재 KIFU가 기대하는 requirement 핵심:
- `chain`
- `address`
- `timeWindow`
- optional: `tokenList`, `riskFlags`, `limits`, `clientMeta`

확인할 것:
- 중첩 JSON object 입력이 가능한가?
- validation을 플랫폼 레벨에서 할 수 있는가, 아니면 worker에서만 해야 하는가?
- 필수/선택 필드 구분이 가능한가?

## 질문 3. 출력 스키마를 그대로 유지할 수 있는가?

현재 deliverable 핵심:
- `schema_version`
- `job_type`
- `status`
- `confidence`
- `error_code`
- `uncertainty`
- `summary`
- `evidence`
- `meta`

확인할 것:
- structured JSON deliverable이 가능한가?
- `ok / warning / error` 상태값과 error taxonomy를 유지할 수 있는가?
- evidence block 같은 큰 JSON도 문제없는가?

## 질문 4. 실행 주체는 seller와 어떻게 대응되는가?

ACP 현재 구조:
- seller가 request 수신
- requirement 검증
- KIFU API 호출
- compact JSON deliver

OpenClaw에서 확인할 것:
- worker / agent / handler 중 무엇이 seller 역할을 대신하는가?
- 장기 실행 프로세스가 필요한가?
- webhook 기반인가, polling 기반인가?
- wallet/entity 개념이 꼭 필요한가?

## 질문 5. 인증/정산 모델은 어떻게 다른가?

ACP 현재 기준:
- wallet
- entity
- requiredFunds
- price
- SLA

OpenClaw에서 확인할 것:
- price / funds / payout 구조가 있는가?
- 외부 정산/결제 개념이 어떻게 매핑되는가?
- SLA 개념이 있는가?
- 이 차이 때문에 기존 offering 설명을 크게 바꿔야 하는가?

## 질문 6. KIFU API 재사용이 가능한가?

현재 재사용하고 싶은 것은:
- `POST /api/v1/jobs/onchain-quick-fact-check`
- `POST /api/v1/onchain/quick-fact-check-compact`

확인할 것:
- OpenClaw worker에서 외부 HTTP API 호출이 가능한가?
- auth token 발급/login 흐름을 넣을 수 있는가?
- 기존 `KIFU_EMAIL / KIFU_PASSWORD` 방식이 안전하게 들어갈 수 있는가?

## 질문 7. 승인/온보딩 리스크는 ACP보다 나은가?

핵심 질문:
- OpenClaw도 별도 승인/검수/온보딩 대기가 긴가?
- ACP에서 막힌 이유와 같은 류의 blocker가 다시 생길 가능성이 큰가?
- 실제로 "메일을 한 달 기다리는" 문제가 해결되는가?

## 질문 8. 1주 안에 어디까지 가능한가?

선택지:
- 판단 문서만 가능
- 얕은 adapter spike 가능
- 실제 등록/업로드 가능
- 운영 시작 가능

이 질문은 반드시 현실적으로 답해야 한다.

## Day 1 종료 기준

아래 표를 채우면 Day 1 종료로 본다.

| 질문 | 답변 | 확신도 | 근거 |
|---|---|---|---|
| service-only job 적합성 |  |  |  |
| JSON requirement 지원 |  |  |  |
| JSON deliverable 지원 |  |  |  |
| seller 대응 구조 존재 |  |  |  |
| 결제/정산 구조 적합성 |  |  |  |
| KIFU API 재사용 가능성 |  |  |  |
| 승인/온보딩 리스크 우위 |  |  |  |
| 1주 내 구현 가능성 |  |  |  |

## Day 1 끝나고 내려야 할 임시 결론

아래 셋 중 하나:

1. `Continue`
   - OpenClaw spike 계속 진행

2. `Pause`
   - 정보 부족으로 추가 조사 필요

3. `Drop`
   - ACP보다 명확히 낫지 않음
