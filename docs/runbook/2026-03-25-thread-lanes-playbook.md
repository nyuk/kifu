# Thread Lanes Playbook

## 목적

여러 환경과 여러 작업 축이 섞이면서 문맥이 자주 꼬였다.

예:
- 윈도우 Codex에서 Kifu 메인 제품 작업
- 윈도우 Codex에서 Kifu 디자인 작업
- 윈도우 Codex에서 Kifu 마케팅 작업
- 윈도우에서 프리미엄 알림봇 운영 작업
- 맥에서 프리미엄 백테스트 연구
- 맥에서 Kifu ACP / OpenClaw 관련 작업
- 맥에서 아이디어 정리

여기서 핵심 문제는 **환경과 레인을 한 덩어리로 부르면 실제 충돌을 놓치기 쉽다**는 점이다.

예를 들어:
- `윈도우 Kifu Main`
- `맥 Kifu Main`

이 둘은 이름이 달라 보여도 실제로는 같은 `Kifu Main` 레인이다.  
따라서 같은 파일이나 같은 화면을 동시에 만지면 충돌할 수 있다.

이 문서는 새 스레드를 시작할 때:

1. 현재 환경
2. 현재 레인
3. 현재 소유 범위(write scope)
4. 이번 목표

를 먼저 선언해서, 서로 다른 문맥과 수정 범위가 섞이지 않게 만드는 공용 플레이북이다.

이 문서는 Codex와 Claude 둘 다 사용할 수 있게 작성한다.

## 가장 중요한 규칙

### 환경과 레인을 분리해서 말한다

앞으로는 아래처럼 구분한다.

- `환경`: 윈도우 Codex / 맥 Codex / 윈도우 Claude / 배포 서버
- `레인`: Kifu Main / Kifu Design / Kifu Marketing / Premium Alert Bot / Premium Backtest / Kifu ACP / Ideas

즉, `윈도우 Kifu Main`은 하나의 이름이 아니라:

- 환경: `윈도우 Codex`
- 레인: `Kifu Main`

으로 나눠서 본다.

이렇게 해야 **같은 레인을 서로 다른 머신에서 동시에 잡고 있는지**를 바로 알아차릴 수 있다.

### 같은 레인을 여러 환경에서 동시에 돌릴 수는 있다

다만 이 경우에는 반드시:

- `소유 범위(write scope)`

를 함께 선언해야 한다.

예:
- 맥 Codex: `Kifu Main`, 소유 범위 = `backend/internal/services`, `backend/internal/interfaces/http/handlers`
- 윈도우 Codex: `Kifu Main`, 소유 범위 = `frontend/src/components/home`, `frontend/app/(app)/review`

이렇게 **서로 다른 쓰기 범위**가 명확하면 병행 가능하다.

반대로 아래처럼 하면 안 된다.

- 맥 Codex: `Kifu Main`, 차트/리뷰 수정
- 윈도우 Codex: `Kifu Main`, 차트/리뷰 수정

이건 사실상 같은 표면을 동시에 건드리는 것이어서 충돌 위험이 높다.

## 새 스레드에서 반드시 먼저 말할 것

새 스레드를 시작할 때는 아래 4가지를 먼저 말한다.

1. 현재 환경
2. 현재 레인
3. 현재 소유 범위
4. 이번 목표

이 4가지만 먼저 분명하면:
- 포트
- 경로
- `.env`
- git 문맥
- 수정 범위
- 충돌 위험

이 훨씬 덜 헷갈린다.

## 환경 분류

- `윈도우 Codex`
- `맥 Codex`
- `윈도우 Claude`
- `배포 서버`

중요한 점:
- 같은 Kifu 작업이라도 환경에 따라
  - repo 경로
  - shell 문법
  - frontend/backend 포트
  - `.env` 위치
  - 실행 방법
  - 현재 떠 있는 프로세스
  가 다를 수 있다.

## 레인 분류

### 1. Kifu Main

사용 시점:
- 거래복기 서비스 메인 기능 작업
- 리뷰, 차트, 버블, 성장, 프리셋, 알림, 설정, 온보딩

이 레인에서 기대하는 것:
- 실제 제품 기능 구현
- 백엔드/프런트 연동
- 핵심 사용자 흐름 개선

섞지 말아야 할 것:
- 마케팅 콘텐츠 운영
- 프리미엄 알림봇 운영
- 프리미엄 백테스트 연구

### 2. Kifu Design

사용 시점:
- 홈 / 리뷰 / 차트 / 버블 / 셸 구조 디자인
- 글자 크기, 버튼 표현, 간격, 정보 위계, 화면 정리

이 레인에서 기대하는 것:
- 거래복기 서비스처럼 느껴지게 만드는 UX 정리
- 시각적 통일성과 정보 구조 개선

섞지 말아야 할 것:
- 운영 툴/관리자 화면 작업
- 마케팅 생성 흐름
- 프리미엄 봇/백테스트 맥락

### 3. Kifu Marketing

사용 시점:
- Marketing OS
- X / 블로그 초안 생성
- 승인 / 발행 / 마케팅 워크플로우

이 레인에서 기대하는 것:
- 콘텐츠 운영 UX
- 마케팅 초안 품질 개선
- Marketing OS와 제품 기능 연결

섞지 말아야 할 것:
- 차트 / 리뷰 메인 UX
- 프리미엄 봇 운영
- 백테스트 연구

### 4. Premium Alert Bot

사용 시점:
- 프리미엄 알림봇 런처
- 중복 실행
- watchdog
- health
- 실제로 봇이 돌고 있는지 확인

이 레인에서 기대하는 것:
- 운영 점검
- 런타임 이슈 해결
- 배치/런처/상태 파일 확인

섞지 말아야 할 것:
- Kifu 프런트 디자인
- Marketing OS
- 백테스트 연구

### 5. Premium Backtest

사용 시점:
- 프리미엄 전략 백테스트
- 실험 비교
- challenger / champion 판단
- sweep 결과 해석

이 레인에서 기대하는 것:
- 연구 결과 해석
- 대시보드 반영 전 판단
- 실험 결과 정리

섞지 말아야 할 것:
- Kifu 메인 UI 작업
- 프리미엄 봇 런타임 운영

### 6. Kifu ACP

사용 시점:
- ACP
- OpenClaw spike
- seller flow
- onchain quick fact check

이 레인에서 기대하는 것:
- ACP / OpenClaw 판단
- 전달 경로 정리
- seller 자산/문서/체크리스트 관리

섞지 말아야 할 것:
- 일반 Kifu 기능 작업
- 마케팅
- 프리미엄 백테스트

### 7. Ideas

사용 시점:
- 아이디어만 정리하고 싶을 때
- 아직 구현/운영/디자인 어느 쪽으로 갈지 안 정했을 때

이 레인에서 기대하는 것:
- 아이디어 압축
- 우선순위 정리
- 다음에 어느 레인으로 보낼지 판단

섞지 말아야 할 것:
- 바로 코드 구현
- 운영 명령 실행

## 소유 범위(write scope) 예시

소유 범위는 “이번 스레드에서 실제로 수정해도 되는 파일/표면 범위”다.

예:
- `frontend/src/components/home`
- `frontend/app/(app)/review`
- `frontend/src/components-old/Chart.tsx`
- `backend/internal/interfaces/http/handlers/guided_review_handler.go`
- `docs/runbook/*`

좋은 소유 범위 예시:
- `Kifu Main`, 소유 범위 = `frontend/src/components/home`, `frontend/app/(app)/review`
- `Kifu Main`, 소유 범위 = `backend/internal/services`, `backend/internal/interfaces/http/handlers`
- `Kifu Design`, 소유 범위 = `frontend/src/components`, `frontend/src/index.css`

좋지 않은 예시:
- `Kifu Main`, 소유 범위 = `전체`
- `Kifu Main`, 소유 범위 = `아무거나`

그렇게 하면 다른 스레드와 바로 충돌한다.

## 새 스레드 시작 템플릿

아래 형식을 그대로 복붙해서 시작하면 된다.

```text
현재 환경: [윈도우 Codex / 맥 Codex / 윈도우 Claude / 배포 서버]
현재 레인: [Kifu Main / Kifu Design / Kifu Marketing / Premium Alert Bot / Premium Backtest / Kifu ACP / Ideas]
현재 소유 범위: [이번 스레드에서 실제로 건드릴 파일/화면/모듈 범위]
이번 목표: [이번 스레드에서 하고 싶은 일]

이 스레드에서는 이 레인과 소유 범위 안에서만 생각하고,
다른 레인이나 다른 소유 범위 문맥은 섞지 말아줘.
필요하면 먼저 읽어야 할 파일/문서부터 짚어줘.
```

## 바로 쓸 수 있는 예시

### 예시 1. 윈도우에서 Kifu 메인 프런트 작업

```text
현재 환경: 윈도우 Codex
현재 레인: Kifu Main
현재 소유 범위: frontend/src/components/home, frontend/app/(app)/review
이번 목표: 리뷰 완료 후 홈으로 돌아오는 흐름과 복기 시작 UX를 정리하고 싶어.

이 스레드에서는 이 범위 안에서만 보고,
차트나 백엔드 서비스 문맥은 최소화해줘.
```

### 예시 2. 맥에서 Kifu 메인 백엔드 작업

```text
현재 환경: 맥 Codex
현재 레인: Kifu Main
현재 소유 범위: backend/internal/services, backend/internal/interfaces/http/handlers
이번 목표: guided review와 growth 이벤트 연결을 정리하고 싶어.

이 스레드에서는 이 범위 안에서만 보고,
윈도우 프런트 작업 범위와 겹치지 않게 해줘.
```

### 예시 3. 윈도우에서 Kifu 디자인 작업

```text
현재 환경: 윈도우 Codex
현재 레인: Kifu Design
현재 소유 범위: frontend/src/components-old/Chart.tsx, frontend/src/components/BubbleCreateModal.tsx, frontend/src/index.css
이번 목표: 차트와 버블 워크스페이스를 더 읽기 쉽게 정리하고 싶어.

이 스레드에서는 디자인과 정보 구조 중심으로만 봐줘.
```

### 예시 4. 윈도우에서 마케팅 작업

```text
현재 환경: 윈도우 Codex
현재 레인: Kifu Marketing
현재 소유 범위: frontend/src/components/marketing, backend/internal/services/marketing_service.go
이번 목표: X 초안과 블로그 초안 흐름을 다듬고 싶어.

이 스레드에서는 마케팅 워크플로우만 보고,
메인 제품 UX 문맥은 섞지 말아줘.
```

### 예시 5. 윈도우에서 프리미엄 알림봇 운영

```text
현재 환경: 윈도우 Codex
현재 레인: Premium Alert Bot
현재 소유 범위: launcher, health, runtime logs
이번 목표: 지금 알림봇이 실제로 돌고 있는지와 중복 실행 여부를 확인하고 싶어.
```

### 예시 6. 맥에서 프리미엄 백테스트 연구

```text
현재 환경: 맥 Codex
현재 레인: Premium Backtest
현재 소유 범위: backtest result docs, preset result JSON, research summaries
이번 목표: 전략 후보 두 개를 비교해서 유지할 후보를 판단하고 싶어.
```

### 예시 7. 맥에서 ACP / OpenClaw 판단

```text
현재 환경: 맥 Codex
현재 레인: Kifu ACP
현재 소유 범위: acp docs, seller flow, OpenClaw comparison docs
이번 목표: ACP 유지/병행/전환 중 어떤 쪽이 맞는지 정리하고 싶어.
```

### 예시 8. 맥에서 아이디어 정리

```text
현재 환경: 맥 Codex
현재 레인: Ideas
현재 소유 범위: IDEAS.md, 아이디어 문서 정리
이번 목표: 생각 중인 아이디어를 정리하고 어떤 레인으로 보낼지 분류하고 싶어.
```

## 충돌 방지 규칙

### 같은 레인을 여러 환경에서 동시에 돌릴 때

반드시 확인할 것:

1. 소유 범위가 겹치는가?
2. 같은 파일을 같이 수정하는가?
3. 같은 화면/기능 흐름을 동시에 만지는가?

하나라도 `예`면:
- 같은 시점 병행 작업을 피하는 것이 좋다
- 먼저 한쪽이 끝나거나
- 더 작은 범위로 다시 나눠야 한다

### 안전한 병행 작업

예:
- 맥 Codex: `Kifu Main`, backend handler/service만
- 윈도우 Codex: `Kifu Main`, home/review frontend만

이건 비교적 안전하다.

### 위험한 병행 작업

예:
- 맥 Codex: `Kifu Main`, chart/review
- 윈도우 Codex: `Kifu Main`, chart/review

이건 높은 확률로 충돌한다.

## Codex / Claude 공통 사용법

이 문서는 특정 에이전트 전용이 아니다.

Codex든 Claude든 새 스레드에서 아래 4가지를 먼저 말하면 된다.

```text
현재 환경: ...
현재 레인: ...
현재 소유 범위: ...
이번 목표: ...
```

그 다음부터는:
- 먼저 읽을 파일
- 피해야 할 문맥
- 바로 들어갈 구현/정리 범위
를 정리해 달라고 하면 된다.

## 추천 운영 방식

### Codex

- 레인별로 스레드를 나눠서 유지
- 같은 레인이라도 소유 범위가 다르면 병행 가능
- 같은 레인 + 같은 소유 범위면 새 스레드보다 먼저 충돌 여부를 점검

### Claude

- 꼭 같은 스레드 구조를 만들 필요는 없다
- 대신 새 작업을 시작할 때마다
  - 현재 환경
  - 현재 레인
  - 현재 소유 범위
  - 이번 목표
  를 먼저 붙이면 충분하다

## 기억할 것

가장 중요한 것은 스레드마다 아래 4가지를 먼저 분명히 하는 것이다.

1. 지금 어디서 작업하는지
2. 지금 어떤 레인인지
3. 이번에 실제로 어디를 수정할 건지
4. 이번 스레드 목표가 무엇인지

이 4개만 먼저 분명하면, 포트/경로/문서/명령/문맥/충돌이 크게 줄어든다.
