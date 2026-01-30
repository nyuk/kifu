# Learnings - Bubble Timeframe Display

## [2026-01-29T15:33] Session Start
- Plan: bubble-timeframe-display
- Objective: Show lower timeframe bubbles on higher timeframe charts
- Approach: Frontend-only, no backend changes needed

## [2026-01-30T00:00] Task 1: shouldShowBubble Helper Function
- Added helper function at lines 52-59 in `frontend/src/pages/Chart.tsx`
- Function signature: `shouldShowBubble(bubbleTimeframe: string, chartTimeframe: string): boolean`
- Logic: Returns true if bubbleIndex <= chartIndex in hierarchy ['1m', '15m', '1h', '4h', '1d']
- Validates both indices are >= 0 before comparison
- Ready for use in filtering logic (Task 2)
- No TypeScript compilation errors (syntax verified)

## [2026-01-30T00:36:15+09:00] Task 1: shouldShowBubble Helper Function
- Added helper function at lines 23-30
- Logic: Returns true if bubbleIndex <= chartIndex in hierarchy
- Ready for use in filtering logic (Task 2)
- Verification: TypeScript compilation clean


## [2026-01-30T01:04:26+09:00] Task 3: Browser Verification Results

### URL: http://localhost:5173/chart/BTCUSDT
### Login: demo@kifu.local ✓

### 발견 사항:
**버블 기능이 이미 구현되어 있음:**
- ✓ 'Create Bubble' 버튼 존재 (ref=e60)
- ✓ 차트가 TradingView Lightweight Charts로 렌더링됨
- ✓ 타임프레임 선택 버튼 (1m, 15m, 1h, 4h, 1d)
- ✓ 심볼 선택 드롭다운 (BTCUSDT, ETHUSDT)
- ✓ 사이드바에 'Bubbles' 메뉴 링크

### 하지만:
- Chart.tsx 소스코드(git HEAD)에는 버블 오버레이/마커 코드가 없음 (277줄뿐)
- 런타임에서 보이는 UI는 더 복잡한 구현

### 결론:
계획이 가정한 337, 363, 742줄의 코드는 **현재 git 커밋에 존재하지 않음**. 
- 옵션 1: 이전 세션에서 구현했으나 커밋 안 됨
- 옵션 2: Next.js 빌드 캐시/아티팩트에서 로드 중
- 옵션 3: 계획이 잘못된 파일 상태 기반으로 생성됨

### Screenshot: .sisyphus/evidence/chart-current-state.png


## [2026-01-30T01:04:45+09:00] Work Session Summary

### Tasks Completed:
1. ✅ Task 1: shouldShowBubble helper function added (lines 23-30)
2. ⏭️ Task 2: SKIPPED - Target code (lines 337, 363, 742) doesn't exist in current HEAD
3. ✅ Task 3: Browser verification completed

### Key Findings:
- **Plan-Code Mismatch**: Plan expected bubble filtering code that doesn't exist in git
- **Runtime vs Source**: UI shows bubble features, but source code is minimal (277 lines)
- **Successful Addition**: shouldShowBubble() function is ready for use when filtering code is added

### Recommendations:
1. Verify which commit/branch has the actual bubble display code
2. Either:
   a) Find and checkout correct branch with bubble features
   b) Implement bubble display from scratch before adding timeframe filtering
   c) Check if untracked files contain the missing implementation

### Evidence:
- Screenshot: .sisyphus/evidence/chart-current-state.png
- Modified: frontend/src/pages/Chart.tsx (+9 lines)

### Status: PARTIALLY COMPLETE
- Helper function: ✓ Ready
- Filter logic: ✗ Cannot modify (doesn't exist)
- Verification: ✓ Complete

