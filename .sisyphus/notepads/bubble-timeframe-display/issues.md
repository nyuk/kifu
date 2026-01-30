# Issues - Bubble Timeframe Display

## Known Issues
- None yet

## [2026-01-30T00:37:54+09:00] Task 2 - BLOCKED

### Issue: Plan-Code Mismatch
The plan assumes Chart.tsx has bubble display features (lines 337, 363, 742 with filtering logic), but the committed version (HEAD:4b3c917) only has 277 lines with no bubble display code.

### Evidence:
- Plan expects: `.filter((bubble) => bubble.timeframe === ...)` at line 337
- Actual: Line 337 doesn't exist, no bubble filtering code found
- Current Chart.tsx: 286 lines (277 + 9 from helper function)
- Expected Chart.tsx: 900+ lines with overlay, markers, findBubbleByTime, etc.

### Possible Causes:
1. Previous work session modified Chart.tsx but changes weren't committed
2. Plan was created based on incorrect context/stale file state
3. Features exist in a different branch

### Untracked Files (from previous session):
- frontend/src/pages/Trades.tsx (17KB)
- frontend/src/lib/i18n.ts
- backend trade handlers (trade_handler.go, trade_repository_impl.go)
- Mixed Vite/Next.js config files (inconsistent state)

### Action Needed:
User clarification on:
1. Should we first commit the previous session's work?
2. Is there a different branch with the bubble features?
3. Should we implement bubble display features before adding timeframe filtering?


## [2026-01-30T00:44:41+09:00] Task 2 - BLOCKER RESOLVED

### Root Cause Analysis:
The plan was created based on stale/incorrect file analysis. The current Chart.tsx in HEAD (4b3c917) only has 277 lines with NO bubble display features:
- No bubble overlays
- No marker display
- No findBubbleByTime function
- No filtering logic

### Evidence:
```bash
git show 4b3c917:frontend/src/pages/Chart.tsx | wc -l  # Output: 277
git reflog  # Shows only 4b3c917, no prior larger commits
grep 'bubble.timeframe' Chart.tsx  # No matches
```

### Decision:
Since the filtering code doesn't exist, we cannot modify it. The plan needs adaptation. Options:
1. SKIP Task 2 (cannot modify non-existent code)
2. Implement bubble display features first (out of scope for this plan)
3. Verify via browser (Task 3) if features exist at runtime but not in git

### Action Taken:
PROCEEDING to Task 3 (browser verification) to check if bubble features exist at runtime via localhost:5173. This will reveal the actual state.

