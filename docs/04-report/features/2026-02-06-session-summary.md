# 2026-02-06 작업 요약

## 개요
- AI 실호출(Responses API) 기반 `one-shot` 라우트 추가 및 프롬프트 개선
- 증거 패킷(Evidence Packet) 생성/미리보기/첨부 기능 추가
- AI 응답을 카드 형태로 강조 표시
- AI 응답을 복기 노트로 자동 저장
- 복기 대시보드에서 AI 요약 카드 노출
- 게스트/계정 표시 및 설정 UI 정리(개인 키 등록 제거)

## 주요 변경사항
### 백엔드
- `POST /api/v1/ai/one-shot` 추가
  - Evidence Packet 요약 텍스트를 받아 AI 응답 생성
  - OpenAI Responses API 호출
  - 502/503/504 발생 시 1회 재시도
- 개인 AI 키 사용 비활성화(서버 키만 사용)
- 프롬프트 구조 강화(행동 제안 포함)

### 프론트
- Bubble 생성 모달에 Evidence Packet UI 추가
  - 최근 체결 10건 / 최근 7일 요약 선택
  - 미리보기 제공
- AI 응답을 카드 구조(요약/리스크/결론 등)로 표시
- AI 응답 자동 복기 노트 저장
- 복기 대시보드에 AI 요약 카드 섹션 추가
- 설정 페이지에서 개인 AI 키 등록 UI 제거

## 파일 변경
- 백엔드
  - `backend/internal/interfaces/http/handlers/ai_handler.go`
  - `backend/internal/interfaces/http/routes.go`
- 프론트
  - `frontend/src/components/BubbleCreateModal.tsx`
  - `frontend/src/components-old/Bubbles.tsx`
  - `frontend/app/(app)/review/page.tsx`
  - `frontend/src/components-old/Settings.tsx`
  - `frontend/src/lib/evidencePacket.ts`
  - `frontend/src/lib/aiResponseFormat.ts`
  - `frontend/src/lib/mockAi.ts`

## 동작 방식
1. 사용자가 Ask AI 클릭
2. Evidence Packet 옵션에 따라 요약 데이터 생성
3. `/v1/ai/one-shot` 호출 → OpenAI 응답
4. 응답은 카드로 표시 + 복기 노트 저장
5. 복기 대시보드에서 최근 AI 요약 카드 노출

## 확인 방법
- 차트 페이지 → 버블 생성 → Ask AI
- 복기 탭 → AI 복기 요약 카드 확인
- 복기 노트에 `AI 복기 요약` 자동 생성 확인

## 남은 작업/메모
- Claude/Gemini 연동은 추후 진행
- Evidence Packet 고도화(필터/기간 옵션 확장) 가능
- AI 요약 카드에 심볼/타임프레임 배지 추가 고려
