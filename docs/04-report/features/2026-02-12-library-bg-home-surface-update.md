# Library Background & Home Surface Update (2026-02-12)

## Summary

홈 화면의 과도한 검은 배경 덮임을 줄이고, `app-shell` 기반의 서재 느낌 배경(따뜻한 톤 + 텍스처 + 비네팅)이 드러나도록 스타일을 조정했다.

## Implemented Changes

### 1) App Shell Background Layering

- Added noise texture asset:
  - `frontend/public/textures/noise.png` (128x128)
- Added `.app-shell` layered background styles in:
  - `frontend/src/index.css`
- Layer 구성:
  - warm radial gradient (`::before`)
  - vignette + noise overlay (`::after`)

### 2) Shell Wrapper Integration

- Updated shell root wrapper to use `app-shell`:
  - `frontend/src/components/Shell.tsx`
- 콘텐츠는 `relative z-10`으로 유지하여 레이어 위에 렌더링되도록 구성.

### 3) Home Root Wrapper / Tone Alignment

- Home root wrapper 배경이 shell 배경을 덮지 않도록 조정:
  - `bg-neutral-950` 계열 제거
  - `bg-transparent` 적용
- text tone을 zinc 계열로 통일:
  - `text-neutral-100` -> `text-zinc-100`
- File:
  - `frontend/src/components/home/HomeSnapshot.tsx`

### 4) Home Surface Color Replacement

아래 치환 규칙을 Home 영역 컴포넌트에 일괄 적용:

- `bg-neutral-950/80` -> `bg-zinc-900/60`
- `bg-neutral-950/60` -> `bg-zinc-900/50`
- `bg-neutral-900/70` -> `bg-zinc-900/55`
- `bg-neutral-900/60` -> `bg-zinc-900/50`

Applied files:

- `frontend/src/components/home/HomeSnapshot.tsx`
- `frontend/src/components/home/HomeSafetyCheckCard.tsx`
- `frontend/src/components/home/HomeGuidedReviewCard.tsx`

### 5) Login Guest Continue Fix

- 로그인 페이지의 `게스트로 계속하기` 버튼 동작 보완:
  - 게스트 계정 로그인 시도 -> 성공 시 `/home`
  - 실패 시 폴백으로 `/guest`
- File:
  - `frontend/src/components-old/Login.tsx`

## Validation

Executed:

```bash
cd frontend
npm run typecheck
npm run build
```

Result:

- TypeScript check passed
- Next.js build passed

