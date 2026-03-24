# Marketing Thread Handoff

기준 시점: 2026-03-23  
기준 브랜치: `main`  
권장 방식: **새 스레드에서 이어서 작업**

## 왜 새 스레드가 더 나은가

이전 스레드에는 아래 작업이 한꺼번에 섞여 있었다.

- Marketing OS MVP
- Growth OS v0.1
- 차트 탭 UX 수정
- Bubble AI 워크스페이스 수정
- 프리셋 전략 / 알림 UX

그래서 새 스레드에서는 **마케팅만 따로 떼서** 진행하는 편이 낫다.  
특히 “현재 마케팅 코드가 어디까지 구현돼 있는지”와 “이전 대화에서 아이디어로만 나온 것”을 분리해서 보는 게 중요하다.

## 지금 코드에 실제로 있는 것

### 프런트

- 라우트: [frontend/app/(app)/marketing/page.tsx](C:/Users/nyuk8/PycharmProjects/kifu/kifu/frontend/app/(app)/marketing/page.tsx)
- 메인 화면: [frontend/src/components/marketing/MarketingWorkspace.tsx](C:/Users/nyuk8/PycharmProjects/kifu/kifu/frontend/src/components/marketing/MarketingWorkspace.tsx)
- API 클라이언트: [frontend/src/lib/marketing.ts](C:/Users/nyuk8/PycharmProjects/kifu/kifu/frontend/src/lib/marketing.ts)
- 타입: [frontend/src/types/marketing.ts](C:/Users/nyuk8/PycharmProjects/kifu/kifu/frontend/src/types/marketing.ts)

### 백엔드

- 마이그레이션: [backend/migrations/034_marketing_os.sql](C:/Users/nyuk8/PycharmProjects/kifu/kifu/backend/migrations/034_marketing_os.sql)
- 서비스: [backend/internal/services/marketing_service.go](C:/Users/nyuk8/PycharmProjects/kifu/kifu/backend/internal/services/marketing_service.go)
- 핸들러: [backend/internal/interfaces/http/handlers/marketing_handler.go](C:/Users/nyuk8/PycharmProjects/kifu/kifu/backend/internal/interfaces/http/handlers/marketing_handler.go)
- 라우트 연결: [backend/internal/interfaces/http/routes.go](C:/Users/nyuk8/PycharmProjects/kifu/kifu/backend/internal/interfaces/http/routes.go)
- 리포지토리 인터페이스: [backend/internal/domain/repositories/marketing_repository.go](C:/Users/nyuk8/PycharmProjects/kifu/kifu/backend/internal/domain/repositories/marketing_repository.go)
- 리포지토리 구현: [backend/internal/infrastructure/repositories/marketing_repository_impl.go](C:/Users/nyuk8/PycharmProjects/kifu/kifu/backend/internal/infrastructure/repositories/marketing_repository_impl.go)

### 현재 API 범위

현재 `main` 기준으로 실제 연결된 엔드포인트는 아래 4개다.

- `GET /api/v1/marketing/workspace`
- `POST /api/v1/marketing/ideas`
- `POST /api/v1/marketing/ideas/:id/drafts`
- `PATCH /api/v1/marketing/drafts/:id`

즉, **지금 코드상 확실한 범위는 “아이디어 저장 -> 드래프트 생성 -> 편집/상태 변경”**이다.

## 현재 제품 범위 해석

Marketing OS는 지금 **`product_key = kifu` 기준의 MVP**로 보는 게 맞다.

- 공통 구조는 어느 정도 분리돼 있지만
- 실제 운영 대상은 지금 `Kifu` 하나로 보는 편이 안전하다
- 예전 대화에서 나왔던 다중 제품/워크스페이스 확장은 현재 main의 확정 범위로 보지 않는 편이 낫다

## 새 스레드에서 믿어야 하는 것 vs 보류해야 하는 것

### 믿어도 되는 것

- `/marketing` 라우트가 있다
- 아이디어 인박스와 드래프트 생성 흐름이 있다
- `X / 네이버 블로그 / 유튜브` 채널 타입은 코드에 있다
- 서버는 템플릿 기반 초안 생성 로직을 갖고 있다

### 바로 믿으면 안 되는 것

아래는 이전 대화에서 많이 논의됐지만, 현재 `main` 코드 기준으로는 다시 확인해야 한다.

- 실제 X 발행/예약 자동화
- 발행 URL 저장 UI
- 블로그 설정 카드
- 콘텐츠 성격 / 근거 출처 / 표현 형식 셀렉터
- LLM 연동 기반의 고도화된 초안 생성

즉, 새 스레드에서는 **파일과 라우트 기준으로만 현재 상태를 판단**하는 게 좋다.

## 로컬 실행 기준

### 프런트

- `http://127.0.0.1:5173`

### 백엔드

- `http://127.0.0.1:3080`

### 주의

- 현재 Codex 셸에서는 `next dev`가 가끔 `spawn EPERM`을 낼 수 있다
- 이 경우 일반 Windows 터미널/PowerShell에서 실행하는 편이 안정적이었다
- stale `.next/dev` 캐시가 오래 남아 있으면 이상한 빌드 에러가 날 수 있으니, 이상하면 dev 서버와 `.next/dev`를 먼저 정리하는 편이 좋다

## 새 스레드 첫 작업 추천

새 스레드에서는 아래 순서가 가장 자연스럽다.

1. `/marketing` 현재 동작 확인
2. 현재 UI/문구가 깨져 있거나 이상한지 확인
3. “지금 코드 기준으로 실제 가능한 글 작성 흐름”을 다시 잡기
4. 그 다음에 아래 둘 중 하나로 간다
   - `운영용 글 작성 워크플로우 정리`
   - `Marketing OS 기능 확장`

### 추천 1순위

새 스레드 첫 작업은 **기능 확장보다 “지금 Marketing OS로 실제 글 한 편을 쓰는 흐름”을 다시 정리하는 것**이 좋다.

이유:

- 이 저장소는 최근 차트/Growth/프리셋 수정이 많아서 마케팅 화면도 재검증이 필요하다
- 현재 코드 기준과 예전 대화 기준이 섞이면 또 혼선이 생긴다
- 먼저 “지금 상태로 무엇이 되는지”를 고정해야 다음 기능 우선순위가 선다

## 새 스레드 시작 프롬프트 추천

아래 문장을 그대로 새 스레드 첫 메시지로 써도 된다.

```text
Kifu Marketing OS 작업만 새로 이어가자.

먼저 현재 main 기준으로 /marketing이 실제로 어디까지 구현되어 있는지 파일/라우트 기준으로 확인해줘.
예전 대화에서 나온 가정은 믿지 말고, 현재 코드 상태만 기준으로 봐줘.

우선 읽을 파일:
- /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/frontend/app/(app)/marketing/page.tsx
- /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/frontend/src/components/marketing/MarketingWorkspace.tsx
- /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/frontend/src/lib/marketing.ts
- /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/frontend/src/types/marketing.ts
- /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/backend/internal/services/marketing_service.go
- /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/backend/internal/interfaces/http/handlers/marketing_handler.go
- /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/backend/internal/interfaces/http/routes.go
- /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/backend/migrations/034_marketing_os.sql

확인 후에는:
1. 현재 구현 범위를 짧게 정리
2. 지금 상태로 실제 글 한 편 쓰는 운영 흐름 제안
3. 다음 작업 2~3개 우선순위 추천
이 순서로 진행해줘.
```

## 마지막 메모

이 handoff의 목적은 “예전 대화 기억”이 아니라 **현재 repo 상태를 기준으로 마케팅 작업을 새로 분리**하는 것이다.  
새 스레드에서는 반드시 **현재 파일/라우트 기준**으로 다시 확인하고 시작하는 편이 좋다.
