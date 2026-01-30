# Bubble Timeframe Display - 상위 타임프레임에서 하위 버블 표시

## TL;DR

> **Quick Summary**: 1d 차트에서 1h 버블도 표시되도록 프론트엔드 필터링 로직 수정. 상위 타임프레임 차트에서 하위 타임프레임 버블을 해당 캔들에 매핑하여 표시.
> 
> **Deliverables**: 
> - Chart.tsx의 버블 필터링 로직 수정 (4곳)
> - 타임프레임 계층 헬퍼 함수 추가
> 
> **Estimated Effort**: Quick (30분 미만)
> **Parallel Execution**: NO - sequential
> **Critical Path**: Task 1 → Task 2 → Task 3

---

## Context

### Original Request
"1시간봉 버블이 1일봉 차트에서도 보이게 해달라" - 거래내역 480건이 1h 타임프레임으로 변환되어 1d 차트에서 안 보이는 문제 해결

### Interview Summary
**Key Discussions**:
- 각 타임프레임별로 독립적인 버블 존재 (의도된 설계)
- 사용자 선택: "옵션 A: 프론트엔드에서 통합 표시" (기존 데이터 유지, UI만 변경)

**Research Findings**:
- API(`/v1/bubbles`)는 이미 모든 타임프레임 버블 반환 (BubbleFilter에 timeframe 필터 없음)
- 백엔드 변경 불필요
- 프론트엔드 Chart.tsx에서 4곳 필터링 수정 필요

### Metis Review
**Identified Gaps** (addressed):
- 파일 경로 확인: `frontend/src/pages/Chart.tsx` (정확)
- 필터링 위치 4곳 (3곳이 아님): 337, 363, 556(파생), 742
- 클릭 감지 로직(742)도 수정 필요
- `alignToTimeframeSeconds`는 이미 차트 타임프레임 그리드에 정렬 (수정 불필요)

---

## Work Objectives

### Core Objective
상위 타임프레임 차트에서 하위 타임프레임 버블도 표시되도록 프론트엔드 수정

### Concrete Deliverables
- `frontend/src/pages/Chart.tsx` 수정:
  - `shouldShowBubble()` 헬퍼 함수 추가
  - 4곳의 필터링 로직에 적용

### Definition of Done
- [❌] 1d 차트에서 1m, 15m, 1h, 4h, 1d 버블 모두 표시 (BLOCKED: 필터링 코드 없음)
- [❌] 4h 차트에서 1m, 15m, 1h, 4h 버블 표시 (BLOCKED: 필터링 코드 없음)
- [⚠️] 버블 클릭 시 상세 패널 열림 (하위 TF 버블 포함) (런타임 작동, 소스코드 불일치)
- [✅] 기존 동일 타임프레임 버블 동작 유지

### Must Have
- 타임프레임 계층 로직: `1m < 15m < 1h < 4h < 1d`
- 하위 TF 버블이 상위 TF 캔들에 정렬되어 표시
- 클릭 감지 동작

### Must NOT Have (Guardrails)
- 백엔드 코드 수정 금지
- 새로운 UI 컴포넌트/토글 추가 금지
- 버블 집계/클러스터링 로직 추가 금지 (v1 스코프 아님)
- `alignToTimeframeSeconds` 함수 수정 금지
- 새로운 의존성 추가 금지

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (프론트엔드 테스트 없음)
- **User wants tests**: Manual-only
- **Framework**: none

### Manual QA Procedures
Each TODO includes detailed verification using Playwright browser automation.

---

## Execution Strategy

### Sequential Execution
```
Task 1: shouldShowBubble 헬퍼 함수 추가
    ↓
Task 2: 4곳 필터링 로직 수정
    ↓
Task 3: 브라우저 검증
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1 | None | 2 |
| 2 | 1 | 3 |
| 3 | 2 | None |

---

## TODOs

- [x] 1. shouldShowBubble 헬퍼 함수 추가

  **What to do**:
  - `frontend/src/pages/Chart.tsx` 상단 (line 50 근처, `intervals` 배열 아래)에 헬퍼 함수 추가:
  ```typescript
  // Timeframe hierarchy for bubble display
  // Lower timeframe bubbles should be visible on higher timeframe charts
  function shouldShowBubble(bubbleTimeframe: string, chartTimeframe: string): boolean {
    const hierarchy = ['1m', '15m', '1h', '4h', '1d']
    const bubbleIndex = hierarchy.indexOf(bubbleTimeframe)
    const chartIndex = hierarchy.indexOf(chartTimeframe)
    return bubbleIndex >= 0 && chartIndex >= 0 && bubbleIndex <= chartIndex
  }
  ```

  **Must NOT do**:
  - intervals 배열 수정하지 않기
  - 다른 유틸리티 함수 추가하지 않기

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 함수 추가, 명확한 위치
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: TypeScript/React 코드 패턴 이해

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `frontend/src/pages/Chart.tsx:50` - `intervals` 배열 위치 (여기 바로 아래에 추가)

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] TypeScript 컴파일 에러 없음: 브라우저 콘솔에 에러 없이 페이지 로드
  - [ ] 함수가 정의되어 있음: 다음 Task에서 사용 가능

  **Commit**: NO (Task 2와 함께 커밋)

---

- [⏭️] 2. 4곳 필터링 로직 수정 (SKIPPED: Code doesn't exist in current HEAD)

  **What to do**:
  
  **수정 위치 1 - Line 337** (1d 차트 auto-zoom 범위 계산):
  ```typescript
  // Before:
  .filter((bubble) => bubble.timeframe === '1d')
  
  // After:
  .filter((bubble) => shouldShowBubble(bubble.timeframe, '1d'))
  ```

  **수정 위치 2 - Line 363** (마커/오버레이 표시 필터):
  ```typescript
  // Before:
  .filter((bubble) => bubble.timeframe === timeframe)
  
  // After:
  .filter((bubble) => shouldShowBubble(bubble.timeframe, timeframe))
  ```

  **수정 위치 3 - Line 742** (클릭 감지 - findBubbleByTime 함수):
  ```typescript
  // Before:
  if (bubble.timeframe !== timeframe) continue
  
  // After:
  if (!shouldShowBubble(bubble.timeframe, timeframe)) continue
  ```

  **Must NOT do**:
  - `alignToTimeframeSeconds` 함수 수정하지 않기
  - 556줄 수정하지 않기 (363줄 결과를 사용하므로 자동으로 적용됨)
  - 새로운 상태 변수 추가하지 않기

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3곳의 간단한 조건문 수정
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: React 컴포넌트 수정 패턴

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `frontend/src/pages/Chart.tsx:337` - 1d 차트 버블 범위 계산
  - `frontend/src/pages/Chart.tsx:363` - 마커/오버레이 필터링
  - `frontend/src/pages/Chart.tsx:742` - findBubbleByTime 클릭 감지

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] TypeScript 컴파일 에러 없음
  - [ ] 3곳 모두 수정 완료 확인 (grep으로 `shouldShowBubble` 사용 확인)

  **Commit**: YES
  - Message: `feat(chart): show lower timeframe bubbles on higher timeframe charts`
  - Files: `frontend/src/pages/Chart.tsx`
  - Pre-commit: None (테스트 없음)

---

- [x] 3. 브라우저 검증

  **What to do**:
  - Playwright 또는 dev-browser 스킬로 실제 동작 검증
  - http://localhost:5173/chart/BTCUSDT 접속
  - 1d 타임프레임에서 1h 버블 표시 확인
  - 버블 클릭하여 상세 패널 열림 확인

  **Must NOT do**:
  - 코드 추가 수정하지 않기 (검증만)
  - 스크린샷 저장 위치 변경하지 않기

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 검증 작업
  - **Skills**: [`playwright`, `dev-browser`]
    - `playwright`: 브라우저 자동화 검증
    - `dev-browser`: 웹 페이지 상호작용

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (마지막)
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:

  **Documentation References**:
  - 로컬 프론트엔드: http://localhost:5173
  - 로그인: demo@kifu.local / password123

  **Acceptance Criteria**:

  **Using Playwright browser automation:**
  - [ ] Navigate to: `http://localhost:5173/chart/BTCUSDT`
  - [ ] 로그인 (demo@kifu.local / password123)
  - [ ] 1d 타임프레임 선택
  - [ ] Verify: 버블 마커가 차트에 표시됨 (이전에 없던 1h 버블 포함)
  - [ ] Action: 버블 마커 클릭
  - [ ] Verify: 버블 상세 패널 열림
  - [ ] Screenshot: `.sisyphus/evidence/bubble-tf-display-1d.png`

  **Commit**: NO (검증만)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `feat(chart): show lower timeframe bubbles on higher timeframe charts` | frontend/src/pages/Chart.tsx | 브라우저 수동 검증 |

---

## Success Criteria

### Verification Commands
```bash
# 수정 확인
grep -n "shouldShowBubble" frontend/src/pages/Chart.tsx
# Expected: 4줄 이상 (함수 정의 + 3곳 사용)
```

### Final Checklist
- [❌] 1d 차트에서 1h 버블 표시됨 (BLOCKED: 필터링 로직 없음)
- [⚠️] 버블 클릭 시 상세 패널 열림 (런타임 작동, 소스코드 불일치)
- [✅] 기존 동일 TF 버블 동작 유지
- [✅] 백엔드 코드 변경 없음
- [✅] 새 UI 컴포넌트 추가 없음
