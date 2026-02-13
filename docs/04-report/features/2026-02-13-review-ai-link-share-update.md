# 2026-02-13 Review AI Link/Share Update

## 목적
- Review 탭의 AI 요약 카드에서 차트 이동 성공률을 높인다.
- 공유 링크 버튼의 의도를 명확하게 전달한다.

## 변경 사항
1. 차트 이동 URL 생성 로직 보강
- 위치: `frontend/app/(app)/review/page.tsx`
- 추가 함수:
  - `normalizeAiSymbol(value)`
  - `normalizeAiTimeframe(value)`
  - `buildAiChartUrl(note)`
- 동작:
  - 심볼은 대문자/공백 제거
  - 타임프레임은 `1m | 15m | 1h | 4h | 1d`만 허용, 그 외 `1d`
  - 포커스 시각은 `candle_time` 우선, 없으면 `created_at` 사용

2. AI 요약 카드 CTA 문구 개선
- 기존: `차트 이동`
- 변경: `해당 캔들로 이동`

3. 공유 링크 UI 문구 개선
- 기존: `링크 복사` / `복사 완료`
- 변경: `AI 요약 필터 링크 복사` / `링크 공유 완료`
- 현재 공유 범위 라인 추가:
  - `현재 공유 범위: [심볼] / [타임프레임]`

4. TODO 상태 반영
- 위치: `docs/todo.md`
- 완료 처리:
  - `AI 요약 카드 클릭 시 차트 탭(해당 캔들)까지 바로 이동 연결`
  - `AI 요약 필터 상태 공유 링크(복사 버튼) 동작 가이드 문구 다듬기`

## 검증
- `cd frontend && npm run lint` 통과 (error 0, warning only)
- `cd frontend && npm run build` 통과

## 커밋
- `92006be` `refine review ai note sharing and chart jump links`
