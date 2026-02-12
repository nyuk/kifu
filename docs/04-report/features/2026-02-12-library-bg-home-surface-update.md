# Dark Leather Texture & Unified Surface Update (2026-02-12)

## Summary

전체 앱의 배경을 CSS-only 다크 레더 + 메탈 텍스쳐로 통일하고, 모든 페이지의 카드/섹션 배경을 투명 유리(glass) 스타일로 변경하여 텍스쳐가 모든 탭에서 일관되게 비쳐 보이도록 했다.

## Background & Decision

### 시도한 접근법
1. **DALL-E 이미지** - 서재 배경 이미지 생성 → 해상도 한계 (1536x1024 max), 로딩 시간/데이터 비용 문제
2. **WebP 변환** - PNG → WebP (2MB → 108KB) → 여전히 해상도 부족
3. **CSS-only 다크 레더 + 메탈 텍스쳐** (최종 선택) - 해상도 무관, 경량, 스케일링 자유

### 핵심 발견
- `Shell.tsx`의 사이드바(`bg-zinc-900/70`)와 메인 영역(`bg-zinc-900/45`)이 거의 불투명하여 모든 배경 효과를 가렸음
- 각 페이지 컴포넌트도 `bg-neutral-950`, `bg-zinc-900` 등 불투명 배경을 가지고 있어 이중으로 가림
- 해결: 모든 패널을 `bg-white/[0.03]` 수준의 투명 유리로 변경

## Implemented Changes

### 1) CSS-only Background System (`index.css`)

`.app-shell::before` (Layer 1 - 텍스쳐):
- Warm candle glow (좌상단, rgba 220/140/50, 0.50)
- Secondary warm glow (우하단, rgba 180/100/30, 0.30)
- Green accent (우측, rgba 60/140/70, 0.22)
- Amber center fill (중앙, rgba 160/100/40, 0.28)
- Brushed metal grain (수평 반복, rgba 255/255/255, 0.06)
- Leather vertical grain (수직 반복, rgba 200/150/90, 0.08)
- Base leather gradient (#2a1f14 → #120e08 → #1e1812)

`.app-shell::after` (Layer 2 - 비네트):
- Subtle edge vignette (0.55 max, 기존 0.80에서 약화)

### 2) Shell Panel Transparency (`Shell.tsx`)

| Element | Before | After |
|---------|--------|-------|
| Sidebar (mounted) | `bg-black/40 backdrop-blur-xl` | `bg-white/[0.03] backdrop-blur-xl` |
| Sidebar (SSR) | `bg-zinc-900/70 backdrop-blur-md` | `bg-white/[0.03] backdrop-blur-xl` |
| Main content (mounted) | `bg-black/30 backdrop-blur-sm` | `bg-white/[0.02] backdrop-blur-sm` |
| Main content (SSR) | `bg-zinc-900/45 backdrop-blur-sm` | `bg-white/[0.02] backdrop-blur-sm` |
| Session card | `bg-zinc-900/75` | `bg-white/[0.04]` |
| Sidebar border | `border-white/[0.08]` | `border-amber-900/20` |

### 3) Page Root Backgrounds Removed

| Page | Before | After |
|------|--------|-------|
| alert/page.tsx | `bg-neutral-950` | removed |
| review/page.tsx | `bg-zinc-900` | removed |
| PortfolioDashboard.tsx | `bg-neutral-950` | removed |

### 4) Unified Card/Section Surface (38 files)

일괄 치환 규칙:

| Old Pattern | New Pattern | Usage |
|---|---|---|
| `bg-neutral-900/60`, `/50`, `/40` | `bg-white/[0.04]` | Cards, sections |
| `bg-neutral-900/30` | `bg-white/[0.03]` | Subtle containers |
| `bg-neutral-900` (on inputs) | `bg-white/[0.06]` | Select, input fields |
| `bg-neutral-950/40` | `bg-black/20` | Inner items |
| `bg-neutral-950/60` | `bg-black/25` | Textarea, code blocks |
| `bg-neutral-950/70` | `bg-black/30` | Modals footer |
| `bg-neutral-800/40` | `bg-white/[0.04]` | Skeleton loaders |
| `bg-neutral-800` (tags) | `bg-white/[0.08]` | Badge/pill backgrounds |
| `border-neutral-800/60` | `border-white/[0.08]` | Card borders |
| `border-neutral-800` | `border-white/[0.08]` | Section borders |
| `border-neutral-800/70` | `border-white/[0.06]` | Inner item borders |

### 5) Base Color Alignment

| Element | Before | After |
|---------|--------|-------|
| `body` (layout.tsx) | `#0a0a0c` | `#120e08` |
| `.app-shell` background | `#0a0a0c` | `#120e08` |

## Files Modified (39 total)

### Core
- `frontend/src/index.css`
- `frontend/src/components/Shell.tsx`
- `frontend/app/layout.tsx`

### App Pages
- `frontend/app/(app)/alert/page.tsx`
- `frontend/app/(app)/alerts/page.tsx`
- `frontend/app/(app)/alerts/[id]/page.tsx`
- `frontend/app/(app)/alerts/rules/page.tsx`
- `frontend/app/(app)/review/page.tsx`

### Components
- `frontend/src/components/home/HomeSnapshot.tsx`
- `frontend/src/components/home/HomeGuidedReviewCard.tsx`
- `frontend/src/components/home/HomeSafetyCheckCard.tsx`
- `frontend/src/components/portfolio/PortfolioDashboard.tsx`
- `frontend/src/components/positions/PositionManager.tsx`
- `frontend/src/components/alerts/AlertCard.tsx`
- `frontend/src/components/alerts/AlertBriefings.tsx`
- `frontend/src/components/alerts/AlertOutcomes.tsx`
- `frontend/src/components/alerts/DecisionForm.tsx`
- `frontend/src/components/alerts/RuleList.tsx`
- `frontend/src/components/alerts/RuleEditor.tsx`
- `frontend/src/components/alerts/RuleConfigForm.tsx`
- `frontend/src/components/review/NoteList.tsx`
- `frontend/src/components/review/NoteEditor.tsx`
- `frontend/src/components/review/StatsOverview.tsx`
- `frontend/src/components/review/BubbleAccuracy.tsx`
- `frontend/src/components/settings/ExchangeConnectionManager.tsx`
- `frontend/src/components/settings/AIKeyManager.tsx`
- `frontend/src/components/chart/ChartReplay.tsx`
- `frontend/src/components/chart/ReplayControls.tsx`
- `frontend/src/components/guided-review/GuidedReviewFlow.tsx`
- `frontend/src/components/BubbleCreateModal.tsx`
- `frontend/src/components/ui/FilterPills.tsx`

### Components-old
- `frontend/src/components-old/Trades.tsx`
- `frontend/src/components-old/Bubbles.tsx`
- `frontend/src/components-old/Chart.tsx`
- `frontend/src/components-old/Login.tsx`
- `frontend/src/components-old/Register.tsx`
- `frontend/src/components-old/NotFound.tsx`

## Intentionally Not Changed
- `LandingPage.tsx` - Shell 밖 공개 페이지
- `Toast.tsx` - 오버레이는 가독성을 위해 불투명 유지
- Accent 버튼 (`bg-neutral-100 text-neutral-950`) - CTA 버튼 대비 유지
- Checkbox/radio 입력 요소 - 인터랙션 요소 유지
