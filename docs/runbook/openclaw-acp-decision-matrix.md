# ACP vs OpenClaw Decision Matrix

## 목적

현재 `ACP 승인 대기`가 길어지는 상황에서,
기존 ACP 트랙을 유지할지, OpenClaw를 병행할지, 아예 전환할지 판단한다.

판단 대상 서비스는 현재 레포에 있는 `onchainQuickFactCheckCompactJson` offering이다.

관련 자산:
- `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/acp/seller.py`
- `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/scripts/acpctl.sh`
- `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/ACP-QUICKSTART.md`
- `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/docs/acp_onchain_quick_fact_check_job.md`
- `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/docs/runbook/openclaw-acp-spike-checklist.md`

## 현재 전제

### 이미 있는 것
- KIFU API 엔드포인트는 이미 있음
- seller 코드와 smoke 흐름도 있음
- offering 명세/제출 문서도 있음

### 현재 막힌 것
- ACP 외부 승인/허용 메일이 장기 지연 중
- ACP 쪽은 기술보다 외부 플랫폼 의존이 blocker
- OpenClaw 쪽은 아직 레포 구현이 없음

## 옵션 비교

| 옵션 | 설명 | 장점 | 단점 | 예상 작업량 | 외부 의존성 | 1주 내 결과 가능성 |
|---|---|---|---|---|---|---|
| 유지 | ACP만 계속 대기 | 기존 자산 보존, 추가 구현 최소 | 승인 지연이 계속되면 진척 없음 | 낮음 | 높음 | 낮음 |
| 병행 | ACP는 유지하고 OpenClaw spike 병행 | 리스크 분산, 기존 자산 버리지 않음, 판단 품질 높음 | 관리 포인트 증가, 문서/판단 작업 필요 | 중간 | 중간 | 높음 |
| 전환 | ACP를 사실상 접고 OpenClaw 중심으로 이동 | 방향이 명확함, 승인 지연 스트레스 감소 가능 | OpenClaw 적합성 미확인, 기존 ACP 문맥 단절 위험 | 높음 | 높음 | 중간 |

## 세부 비교

### 1. 구현 재사용성

#### 유지
- 재사용률 최고
- 기존 ACP seller, 명세, smoke 그대로 사용

#### 병행
- 서비스 코어 재사용 가능
- seller/adaptor 계층만 새로 볼 수 있음

#### 전환
- API/명세 일부는 재사용 가능
- seller/제출 방식은 사실상 새로 설계 가능성 큼

### 2. 시간 대비 성과

#### 유지
- 승인 메일 오기 전까지 기술적 성과가 잘 안 쌓임

#### 병행
- 최소한 `판단 문서`, `재사용 범위`, `전환 비용`이 쌓임
- 외부 승인 없더라도 내부 진척이 남음

#### 전환
- 방향은 시원하지만, OpenClaw 정보가 부족하면 시간이 새기 쉬움

### 3. 운영 리스크

#### 유지
- 플랫폼 지연 리스크에 그대로 노출

#### 병행
- 승인 지연 리스크를 낮춤
- 다만 두 트랙을 헷갈리지 않게 문서화가 필요

#### 전환
- ACP 맥락을 너무 빨리 버릴 위험
- OpenClaw 정책/온보딩도 똑같이 막히면 손해가 큼

## 현재 추천

## 추천안: 병행

이유:
1. 기존 ACP 자산이 이미 적지 않다
2. 현재 blocker는 코드가 아니라 외부 승인이다
3. OpenClaw는 아직 정보가 부족해서 즉시 전환은 리스크가 크다
4. 병행은 `기다리는 동안 아무것도 못 하는 상태`를 피할 수 있다

즉:
- ACP 코드는 버리지 않는다
- ACP 구현을 더 깊게 늘리지도 않는다
- 그 대신 OpenClaw spike로 `전환 가능성`만 검증한다

## 1주 제안 플랜

### Day 1
- OpenClaw가 service-only job / JSON requirement / JSON deliverable을 지원하는지 확인

### Day 2
- ACP seller 구조와 OpenClaw 필요 구조 매핑
- 재사용 가능 코드 / 새로 필요한 코드 분리

### Day 3
- `유지 vs 병행 vs 전환` 초안 결론 작성

### Day 4-5
- 필요하면 아주 얕은 adapter spike 범위만 정의
- 실제 구현은 아직 보류

## 당장 하지 말 것

- ACP seller를 버리는 것
- OpenClaw 전용 디렉토리를 대량 생성하는 것
- 외부 플랫폼 세부 조건을 모르고 코드부터 복사하는 것

## 결정 게이트

아래 질문 중 2개 이상이 `예`면 병행을 유지한다.

1. ACP 승인 대기 리스크가 계속 높다
2. OpenClaw가 JSON service job에 맞을 가능성이 있다
3. 기존 KIFU API를 거의 그대로 재사용할 수 있다
4. 전환 비용이 seller/adaptor 수준에서 끝날 가능성이 있다

아래 질문 중 2개 이상이 `아니오`면 전환을 보류한다.

1. OpenClaw 적합성이 확인됐다
2. 기존 자산을 대부분 재사용할 수 있다
3. 1주 내 구현 착수가 가능하다
