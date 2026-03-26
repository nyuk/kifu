# Marketing OS Operator Checklist

기준 날짜: 2026-03-25  
기준 브랜치: `main`  
대상 레인: `Windows Kifu Marketing`

## 목적

이 문서는 현재 `/marketing` 구현 기준으로
실제로 글 1편을 만들 때 자주 막히는 지점을 빠르게 체크하기 위한 운영 메모다.

SOP가 전체 흐름을 설명한다면,
이 문서는 "지금 어디서 막히는가"와 "무엇을 먼저 확인해야 하는가"에 집중한다.

## 오늘 글 1편 체크리스트

1. 관리자 세션으로 `/marketing`에 들어간다.
2. 오늘 글의 채널을 먼저 정한다.
3. `원본 메모`가 60자 미만이면 초안 생성 전에 보강한다.
4. 뉴스나 인용 기반이면 `참고 링크`를 반드시 넣는다.
5. 스크린샷이나 생성 이미지 기반이면 이미지를 붙이고, 무엇이 보이는지 메모를 남긴다.
6. `news_reaction + X` 조합이면 숫자나 사건명 같은 구체 포인트를 메모 안에 넣는다.
7. 아이디어 카드의 `초안 생성 체크`에서 `보강 필요`가 없을 때 초안을 만든다.
8. 생성된 초안은 완성본이 아니라 검토용 초안으로 본다.
9. 리뷰 탭에서 첫 문단이 실제 장면이나 문제를 잡고 있는지 먼저 확인한다.
10. 제품 연결이 과하거나 추상적이면 줄인다.
11. 발행 전 `승인` 상태로 바꾼다.
12. 실제 외부 채널에 수동 발행한다.
13. 발행한 채널의 URL을 `/marketing`에 다시 남긴다.

## 초안 생성 전 필수 확인

다음 중 하나라도 빠지면 초안 생성이 막히거나 품질이 급격히 떨어진다.

1. `원본 메모`
당시 장면, 왜 중요했는지, 무엇을 다시 확인하고 싶은지가 들어 있어야 한다.

2. `참고 링크`
근거 출처가 `news` 또는 `quote`면 사실상 필수다.

3. `이미지 첨부`
근거 출처가 `screenshot` 또는 `generated_image`면 실제 첨부가 필요하다.

4. `화면/차트 설명`
이미지를 붙였더라도 `어떤 화면`, `어떤 카드`, `어떤 차트 구간`인지 메모가 있으면 결과가 더 좋아진다.

5. `숫자나 사건명`
`news_reaction` 형식은 숫자, 사건명, 출처 같은 앵커가 있어야 제네릭한 초안으로 덜 흐른다.

## 리뷰 탭 체크리스트

1. 첫 문단이 뉴스 요약만 하고 끝나지 않는지 본다.
2. 두 번째 문단이 추상 문장만 반복하지 않는지 본다.
3. `도움을 준다`, `중요하다` 같은 제네릭 표현이 많으면 줄인다.
4. X 초안이면 길이와 리듬을 다시 다듬는다.
5. 블로그 초안이면 우측 미리보기와 `발행용 복사` 결과를 함께 본다.
6. 리스크 플래그에 걸린 표현은 발행 전에 정리한다.

## 실제 운영에서 자주 막히는 지점

1. 아이디어는 저장됐는데 초안 생성이 안 된다.
원인은 대부분 `메모가 짧음`, `뉴스 링크 없음`, `이미지 근거인데 첨부 없음`이다.

2. 초안이 너무 제네릭하다.
원인은 대부분 `메모에 실제 장면이 없음`, `숫자/사건명/출처가 약함`, `문제의식보다 제품 설명이 먼저 들어감`이다.

3. 발행까지 했는데 `/marketing` 기록이 비어 있다.
현재는 수동 발행 후 다시 돌아와 URL을 넣어야 한다.

4. 예전 아이디어나 초안이 안 보인다.
현재 워크스페이스 목록은 최신 12개 아이디어, 12개 초안만 보여준다.

## 현재 UI 기준으로 꼭 알아야 할 현실 메모

1. 발행 URL 기록 패널은 현재 리뷰 탭에서 채널 공통으로 노출된다.
서비스 API와 UI 모두 `X / 네이버 블로그 / 유튜브` 초안 기준으로 publication 기록을 남길 수 있다.

2. 네이버 블로그는 현재 `발행용 복사` 중심 흐름이다.
초안을 만든 뒤 미리보기와 복사용 본문을 확인하고 외부 채널에서 수동 발행해야 한다.

3. 초안 품질은 항상 일정하지 않다.
현재 서비스는 AI 초안이 실패하거나 품질 기준을 통과하지 못하면 fallback 초안으로 내려간다.

4. 요약 카드의 개수와 현재 보이는 목록 수는 다를 수 있다.
상단 summary는 전체 개수를 보여주지만, 목록은 최신 일부만 보여준다.

## 지금 상태에서 바로 손보면 좋은 우선순위

1. publication UI를 X 전용이 아니라 채널 공통으로 보일지 결정
2. 아이디어/초안 목록의 12개 제한을 운영 화면에서 더 분명히 표시
3. 초안 생성 실패나 보강 필요 메시지를 더 눈에 띄게 정리
4. 발행 후 URL 기록을 더 자연스럽게 이어주는 후속 액션 추가

## 기준 파일

- [page.tsx](C:/Users/nyuk8/PycharmProjects/kifu/kifu/frontend/app/%28app%29/marketing/page.tsx)
- [MarketingWorkspace.tsx](C:/Users/nyuk8/PycharmProjects/kifu/kifu/frontend/src/components/marketing/MarketingWorkspace.tsx)
- [marketing.ts](C:/Users/nyuk8/PycharmProjects/kifu/kifu/frontend/src/lib/marketing.ts)
- [marketing.ts](C:/Users/nyuk8/PycharmProjects/kifu/kifu/frontend/src/types/marketing.ts)
- [routes.go](C:/Users/nyuk8/PycharmProjects/kifu/kifu/backend/internal/interfaces/http/routes.go)
- [marketing_handler.go](C:/Users/nyuk8/PycharmProjects/kifu/kifu/backend/internal/interfaces/http/handlers/marketing_handler.go)
- [marketing_service.go](C:/Users/nyuk8/PycharmProjects/kifu/kifu/backend/internal/services/marketing_service.go)
- [marketing_repository_impl.go](C:/Users/nyuk8/PycharmProjects/kifu/kifu/backend/internal/infrastructure/repositories/marketing_repository_impl.go)
