> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# 2026-02-10 작업 요약

## 목적
- 거래 동기화/조회 불일치와 심볼 라우팅 오류를 줄이고, 자동 잡(outcome calc)에서 발생하는 반복 에러를 안정화.
- 프론트 필터/요약 화면이 실제 DB 데이터를 더 정확하게 반영하도록 보정.

## 백엔드 변경

### 1) 거래/심볼 처리 안정화
- `backend/internal/jobs/trade_poller.go`
- 거래소별 심볼 정규화 강화:
  - Upbit: `KRW-*` 포맷 정규화
  - Binance: 지원 가능한 심볼만 조회(예: `*KRW` 제외)
- 목적: `Invalid symbol` 불필요 호출 감소, 동기화 일관성 개선.

### 2) Outcome 계산기 라우팅/내결함성 개선
- `backend/internal/jobs/outcome_calculator.go`
- 심볼 소스 판별 추가:
  - Binance 심볼은 Binance klines 조회
  - Upbit 심볼(`KRW-*`, `*KRW`)은 Upbit candles 조회
- Upbit 레이트리밋/예외 방어:
  - `429 too_many_requests` 발생 시 `Retry-After` 기반 쿨다운 후 스킵
  - `404 Code not found`는 치명 오류가 아닌 스킵 처리
- 환경변수 토글 추가:
  - `OUTCOME_CALC_ENABLED=false`면 outcome 스케줄러 비활성화
  - 위치: `backend/internal/app/app.go`

### 3) 요청 파라미터 파싱 보강
- `backend/internal/interfaces/http/handlers/trade_handler.go`
- 시간 파라미터 파싱 허용 범위 확대(`RFC3339`, `RFC3339Nano`, `YYYY-MM-DD`).

## 프론트엔드 변경

### 1) 거래소/필터 표기/조회 보정
- `frontend/src/lib/exchangeFilters.ts` (신규)
- 적용 파일:
  - `frontend/src/components/home/HomeSnapshot.tsx`
  - `frontend/src/stores/reviewStore.ts`
  - `frontend/src/components/portfolio/PortfolioDashboard.tsx`
  - `frontend/src/components/review/PeriodFilter.tsx`
- 목적: 기간/거래소 필터 조건의 일관성 개선.

### 2) 거래 화면 동작 보정
- `frontend/src/components-old/Trades.tsx`
- 필터 초기화 동작 추가/보정.

### 3) 차트 관련 보정(진행 중 포함)
- `frontend/src/components-old/Chart.tsx`
- 심볼/오버레이 처리 안정화 관련 수정 반영.

## 테스트/검증

### 자동 테스트
- `go test ./...` 통과
- 추가 테스트:
  - `backend/internal/jobs/outcome_calculator_test.go`
  - `backend/internal/interfaces/http/handlers/trade_handler_time_test.go`

### 수동 확인 포인트
1. 거래내역 탭에서 필터 초기화 + 새로고침 시 신규 체결 반영 여부
2. 백엔드 로그에서 다음 오류 반복 여부
   - `binance klines error ... Invalid symbol`
   - `upbit candles error ... too_many_requests`
   - `upbit candles error ... Code not found`
3. 필요 시 outcome 계산 일시 중지
   - `.env`에 `OUTCOME_CALC_ENABLED=false` 설정 후 백엔드 재시작

## 남은 이슈/메모
- 일부 UI/차트 표시(말풍선/포지션 배치)는 추가 UX 튜닝 필요.
- 거래내역/복기/홈 간 데이터 반영 시점 차이는 추가 계측(log/trace)로 추적 권장.

## 추가 업데이트 (온보딩/세션, 2026-02-10 후반)

### 1) 신규 계정에 기존 말풍선이 보이는 문제 수정
- 원인: `bubble-storage-v2` 로컬 캐시가 계정 전환 시 그대로 남아 차트 초기 렌더에 노출.
- 대응:
  - 로그인/회원가입/로그아웃 시 버블/트레이드 세션 데이터 초기화.
  - 차트 진입 시 로그인 사용자는 서버 버블 재동기화, 게스트/비로그인은 로컬 세션 초기화.
- 관련 파일:
  - `frontend/src/lib/bubbleStore.ts`
  - `frontend/src/components-old/Login.tsx`
  - `frontend/src/components-old/Register.tsx`
  - `frontend/src/components/Shell.tsx`
  - `frontend/src/components-old/Chart.tsx`

### 2) 인증 흐름/온보딩 분기 보정
- 로그인/회원가입 API는 401 인터셉터 리다이렉트 예외 처리.
- 회원가입 기본 진입 경로를 `/onboarding/start`로 정렬.
- `next/from` 파라미터를 안전 파싱하여 `/onboarding/test`, `/onboarding/import` 우선 라우팅.
- 인증 완료 시 `window.location.replace(...)`를 사용해 뒤로가기 히스토리 혼선 완화.
- 관련 파일:
  - `frontend/src/lib/api.ts`
  - `frontend/src/components-old/Login.tsx`
  - `frontend/src/components-old/Register.tsx`

### 3) 온보딩 화면 UX 정리
- `start/import/test` 페이지를 화면 중앙 정렬로 통일.
- 시작 페이지에서 불필요한 로그인 후 진행 버튼 제거.
- 테스트 페이지에서 진단 중 외부 이동 링크 제거.
- 테스트 선택값(포지션/근거/현재 문항)을 자동저장(초안)하도록 추가.
- 관련 파일:
  - `frontend/app/onboarding/start/page.tsx`
  - `frontend/app/onboarding/import/page.tsx`
  - `frontend/app/onboarding/test/page.tsx`
  - `frontend/src/lib/onboardingProfile.ts`

### 4) 성향 프로필 계정 분리 저장
- 원인: 성향 프로필 키가 계정 공용(`kifu-onboarding-profile-v1`)이라 계정 간 오염.
- 대응:
  - JWT `sub` 기준 계정별 키로 저장/조회.
  - 홈/긴급 탭 읽기 로직이 계정별 키를 사용하도록 조정.
- 관련 파일:
  - `frontend/src/lib/onboardingProfile.ts`
  - `frontend/src/components/home/HomeSnapshot.tsx`
  - `frontend/app/(app)/alert/page.tsx` (읽기 경로 영향)

### 5) 협업 충돌 주의(Claude 작업과 병행)
- Claude가 알림 탭(`alert`)을 수정 중이라면 충돌 가능.
- 우선순위:
  1. API/상태 타입 계약 유지 (`recommended_mode`, action log 구조)
  2. 레이아웃/카피 변경은 후순위 머지
  3. 충돌 시 `alert` 페이지는 기능 기준(데이터/상태) 우선, 스타일은 후속 재적용
