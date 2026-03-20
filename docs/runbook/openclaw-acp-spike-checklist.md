# OpenClaw ACP Spike Checklist

## 목적

기존 ACP용 `onchainQuickFactCheckCompactJson` 자산을 버리지 않고,
OpenClaw 쪽으로 전환하거나 병행할 수 있는지 빠르게 판단한다.

이 스파이크의 목표는 구현이 아니라 아래 질문에 답하는 것이다.

1. OpenClaw가 현재 ACP seller 흐름을 대체할 수 있는가?
2. 기존 KIFU API와 onchain quick fact check 서비스 코어를 그대로 재사용할 수 있는가?
3. 전환 비용이 승인 대기 비용보다 낮은가?

## 현재 재사용 가능 자산

- 서비스 명세:
  - `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/docs/acp_onchain_quick_fact_check_job.md`
- 제출 전 체크리스트:
  - `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/docs/runbook/acp-onchain-job-preflight-checklist.md`
- 로컬 운영 입구:
  - `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/scripts/acpctl.sh`
  - `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/ACP-QUICKSTART.md`
- seller 런타임:
  - `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/acp/seller.py`
- 실제 서비스 엔드포인트:
  - `POST /api/v1/jobs/onchain-quick-fact-check`
  - `POST /api/v1/onchain/quick-fact-check-compact`

## Spike 범위

### 1. 플랫폼 적합성 확인

- [ ] OpenClaw가 `service-only job` 형태를 지원하는지 확인
- [ ] 입력 스키마(JSON requirement)를 그대로 받을 수 있는지 확인
- [ ] 출력이 compact JSON deliverable 형태로 전달 가능한지 확인
- [ ] wallet / seller / entity 개념이 ACP와 어떻게 대응되는지 확인
- [ ] 수수료 / 정산 / SLA / required funds 개념이 어떻게 매핑되는지 확인

### 2. 연동 방식 결정

- [ ] `KIFU API 직접 호출형`으로 붙일 수 있는지 확인
- [ ] seller가 꼭 필요한지, 아니면 webhook/worker 형태면 되는지 확인
- [ ] 기존 `/api/v1/jobs/onchain-quick-fact-check` 응답을 그대로 전달 가능한지 확인
- [ ] 인증 방식이 기존 `KIFU_EMAIL/KIFU_PASSWORD` 로그인 토큰 흐름과 충돌 없는지 확인

### 3. 최소 구현 시나리오 정의

- [ ] OpenClaw용 최소 adapter가 필요한지 정의
- [ ] 필요한 경우 새 디렉토리 후보 정하기
  - 예: `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/openclaw/`
- [ ] 기존 `acp/seller.py`를 복사할지, 공통 모듈로 분리할지 결정
- [ ] 입력 검증 로직 재사용 범위 정하기
- [ ] 오류 코드/상태값(`ok|warning|error`) 유지 여부 정하기

### 4. 운영 리스크 점검

- [ ] 승인 메일/온보딩 지연 문제가 OpenClaw에서도 반복될 가능성 확인
- [ ] 외부 플랫폼 의존 리스크 비교
  - ACP 승인 대기
  - OpenClaw 도입/학습/정책 리스크
- [ ] 비용 구조 비교
  - 구현 비용
  - 호출 비용
  - 운영 비용
  - 승인 대기 기회비용

### 5. 의사결정 문서 만들기

- [ ] `유지`: ACP 계속 대기
- [ ] `병행`: ACP 유지 + OpenClaw spike 시작
- [ ] `전환`: OpenClaw 중심으로 이동
- [ ] 위 3안에 대해 각각
  - 장점
  - 단점
  - 예상 작업량
  - 막히는 외부 의존성
  - 1주 내 가능한 결과
  정리

## 구현 전 금지선

- [ ] OpenClaw 쪽 실구현에 바로 들어가지 않는다
- [ ] 기존 ACP seller를 섣불리 버리지 않는다
- [ ] KIFU API 계약(`/jobs/onchain-quick-fact-check`)을 먼저 깨지 않는다
- [ ] 외부 플랫폼 상세를 모른 채 디렉토리만 대량 생성하지 않는다

## 스파이크 산출물

이 스파이크가 끝나면 최소 아래 3개가 있어야 한다.

1. OpenClaw 적합성 판단 요약 1장
2. 재사용 가능 자산 / 새로 필요한 것 분리표
3. `유지 vs 병행 vs 전환` 결정안

## Done 기준

아래가 되면 spike 종료로 본다.

- [ ] OpenClaw가 ACP 대체/병행 후보인지 결론이 있다
- [ ] 기존 자산 재사용 범위가 명확하다
- [ ] 다음 단계가 `구현`인지 `보류`인지 결정됐다

## 지금 바로 할 첫 질문

OpenClaw에서 아래가 가능한지부터 확인한다.

1. JSON requirement 기반 서비스 job
2. compact JSON deliverable 반환
3. seller/worker 또는 그에 준하는 백엔드 처리 방식
