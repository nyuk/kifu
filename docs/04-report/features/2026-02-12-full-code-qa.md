> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# 2026-02-12 전체 코드 레벨 QA 리포트

## 점검 범위
- Frontend: TypeScript 타입 체크, ESLint, 12개 변경 파일 코드 리뷰
- Backend: 7개 변경 파일 코드 리뷰 (보안, 패턴, 에러 핸들링)
- API 커버리지: QA_CHECKLIST.md vs routes.go 대조

## 종합 점수

| 영역 | 점수 | 상태 |
|------|------|------|
| Frontend | 72 → 85/100 | 크리티컬 3건 수정 완료 |
| Backend | 72 → 88/100 | 크리티컬 3건 + WARNING 1건 수정 완료 |
| API 커버리지 | 24/81 → 27/81 (33%) | ai-keys 3개 라우트 등록 완료 |
| TypeScript 컴파일 | PASS | 수정 후 재검증 통과 |
| ESLint | 83 errors | 대부분 deprecated 파일의 `any` 타입 (미수정) |

---

## CRITICAL (즉시 수정 필요) - 8건

### Backend

| # | 파일 | 이슈 | 영향 |
|---|------|------|------|
| B-C1 | `ai_handler.go:696-707` | **resolveAPIKey가 유저 저장 키를 무시함.** user_ai_keys에 저장된 키를 조회/복호화하지 않고 항상 서버 env 변수만 반환. 유저가 키를 저장해도 사용 안 됨 | 기능 결함 |
| B-C2 | `app.go:104-109` | **CORS: `AllowOrigins: "*"` + `AllowCredentials: true`** 브라우저 스펙 위반. 프로덕션에서 보안 위험 | 보안 |
| B-C3 | `ai_handler.go:395-406` | **쿼터 차감 레이스 컨디션.** check-then-decrement 사이에 동시 요청이 쿼터 초과 가능 | 과금/쿼터 |

### Frontend

| # | 파일 | 이슈 | 영향 |
|---|------|------|------|
| F-C1 | `components-old/Login.tsx:24-39` | **Rules of Hooks 위반.** `isDemoMode` early return 뒤에 `useEffect` 호출 → 런타임 에러 | 크래시 |
| F-C2 | `components-old/Register.tsx:25-40` | **동일한 Hooks 위반.** Login.tsx와 동일 패턴 | 크래시 |
| F-C3 | `routes/RequireAuth.tsx:16-18` | **데모 모드에서 보호 콘텐츠 1프레임 노출.** mount 전에 `{children}` 렌더링 후 redirect | 보안 UX |

### API 라우트

| # | 파일 | 이슈 | 영향 |
|---|------|------|------|
| A-C1 | `routes.go` | **AI keys 엔드포인트 미등록.** `GET/PUT /users/me/ai-keys` 핸들러는 있지만 라우트 미연결 → 404 | 기능 불능 |
| A-C2 | `routes.go` | **`DELETE /users/me/ai-keys` 핸들러도 미등록** (ai_handler.go:642) | 기능 불능 |

---

## WARNING (개선 권장) - 14건

### Backend (9건)

| # | 위치 | 이슈 |
|---|------|------|
| B-W1 | `ai_handler.go` 다수 | 내부 에러 메시지(`err.Error()`)가 클라이언트에 노출 |
| B-W2 | 전체 핸들러 | 에러 응답 포맷이 CLAUDE.md 규격(`{"error":{...}}`)과 불일치 (flat 구조) |
| B-W3 | `ai_handler.go:488` | HTTP 핸들러 내 `time.Sleep(800ms)` 블로킹 |
| B-W4 | `ai_handler.go:85-130` | `oneShotCache` 메모리 캐시 크기 제한 없음 |
| B-W5 | `guided_review_repository_impl.go:31-103` | `GetOrCreateToday` 트랜잭션 없이 다중 INSERT |
| B-W6 | `guided_review_repository_impl.go:106-176` | SQL 문자열 연결 방식 (파라미터화는 됨) |
| B-W7 | `guided_review_handler.go:100,122` | `strings.Contains(err.Error(), "not found")` 문자열 매칭 |
| B-W8 | `ai_handler.go:868` | Gemini API 키가 URL 쿼리에 노출 (Google 표준이나 로그 주의) |
| B-W9 | `ai_handler.go`, `routes.go` | `envBoolWithDefault`/`envIntWithDefault` 유틸 중복 |

### Frontend (5건)

| # | 위치 | 이슈 |
|---|------|------|
| F-W1 | `BubbleCreateModal.tsx` 4곳 | `any` 타입 사용 (catch, mapAiErrorMessage, `as any` 캐스트) |
| F-W2 | `BubbleCreateModal.tsx` | 30+ useState, ~340줄 단일 컴포넌트 → 분리 필요 |
| F-W3 | `HomeSnapshot.tsx` | 959줄 단일 파일 → 하위 컴포넌트 분리 필요 |
| F-W4 | `HomeSnapshot.tsx` + `HomeSafetyCheckCard.tsx` | `formatDateTime` 함수 중복 |
| F-W5 | `GuidedReviewFlow.tsx:83-98` | `submitItem` 실패 시 유저에게 에러 피드백 없음 |

---

## API 커버리지 현황

| 카테고리 | 수 | 상태 |
|----------|-----|------|
| QA 체크리스트에 있고 라우트에도 있음 | 24 | 커버됨 |
| 체크리스트에 있지만 라우트에 없음 | 2 | **BROKEN** (ai-keys) |
| 라우트에 있지만 체크리스트에 없음 | 55 | 미테스트 |

### 미테스트 주요 기능 그룹 (55개)
- **Trades**: import, list, summary, convert/backfill/link (7개)
- **Notes**: CRUD + bubble별 (6개)
- **Alert Rules**: CRUD + toggle (6개)
- **Alerts**: list, get, decision, dismiss, outcome (5개)
- **Notification/Telegram**: connect, disconnect, channels, webhook (4개)
- **Portfolio**: timeline, positions, backfill (4개)
- **Guided Review**: today, submit, complete, streak (4개)
- **Safety**: today, upsert (2개)
- **Review Stats**: stats, accuracy, calendar, trend (4개)
- **Export**: stats, accuracy, bubbles (3개)
- **기타**: instruments, manual-positions, imports, connections, health (10개)

---

## 수정 우선순위

### P0 - 프로덕션 배포 전 필수
1. **A-C1/C2**: AI keys 라우트 등록 (routes.go에 3줄 추가)
2. **F-C1/C2**: Login.tsx, Register.tsx Hooks 순서 수정
3. **F-C3**: RequireAuth 데모모드 flash 수정
4. **B-C2**: CORS AllowOrigins를 명시적 도메인으로 변경

### P1 - 배포 후 빠른 시일 내
5. **B-C1**: resolveAPIKey에서 유저 키 우선 조회 복원
6. **B-C3**: 쿼터 차감 atomic UPDATE로 변경
7. **B-W1**: 500 응답에서 내부 에러 메시지 제거

### P2 - 다음 스프린트
8. 대형 파일 분리 (HomeSnapshot 959줄, ai_handler 1162줄, trade_poller 1538줄)
9. QA_CHECKLIST.md 업데이트 (55개 미커버 엔드포인트 추가)
10. ESLint `any` 타입 정리

---

## 수정 완료 내역 (2026-02-12)

| 이슈 ID | 심각도 | 파일 | 수정 내용 |
|---------|--------|------|----------|
| A-C1/C2 | CRITICAL | `routes.go` | AI keys GET/PUT/DELETE 3개 라우트 등록 |
| F-C1 | CRITICAL | `components-old/Login.tsx` | `useEffect`를 early return 위로 이동 (Hooks 위반 해소) |
| F-C2 | CRITICAL | `components-old/Register.tsx` | 동일 수정 |
| F-C3 | CRITICAL | `routes/RequireAuth.tsx` | 데모모드 mount 전 `null` 반환 (보호 콘텐츠 flash 방지) |
| B-C2 | CRITICAL | `app.go` | CORS를 `CORS_ALLOWED_ORIGINS` 환경변수 기반으로 변경 (기본: localhost) |
| B-C1 | CRITICAL | `ai_handler.go` | `resolveAPIKey`에서 유저 저장 키 우선 조회 + 복호화 후 env 폴백 |
| B-C3 | CRITICAL | `ai_handler.go` | stale `exceedsServiceMonthlyCap` 재체크 제거, atomic `DecrementQuota`에만 의존 |
| B-W1 | WARNING | `ai_handler.go` | 13개소 500/502 응답에서 `err.Error()` → 서버 로깅 + 제네릭 메시지 |

### 배포 시 필요한 환경변수
- `CORS_ALLOWED_ORIGINS`: 프론트엔드 도메인 (예: `https://kifu.app,https://preview.kifu.app`)

---

## 안티그래비티에서 추가 확인 필요 사항
- [ ] 데모 모드 전체 플로우 (게스트 → 화면 탐색 → AI mock 응답)
- [ ] 로그인/회원가입 화면 정상 렌더링 (Hooks 수정 후)
- [ ] RequireAuth redirect 동작 확인
- [ ] Guided Review 전체 플로우 UI/UX
- [ ] Safety Check 카드 그룹별 제출 동작
- [ ] 반응형 레이아웃 확인
- [ ] HomeSnapshot 각 섹션 데이터 렌더링
