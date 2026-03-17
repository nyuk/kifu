# Codex Handoff — 2026-03-17

## What Was Done (This Session)

### 1. PnL Currency Unified to USDT
All PnL display values changed from mixed KRW/USDT to consistent `+$X` / `-$X` format.

**Files changed:**
- `frontend/src/components/home/HomeMonthlyReportCard.tsx` — `formatPnl()` now returns `+$X` / `-$X`
- `frontend/app/(app)/reports/monthly/[year]/[month]/page.tsx` — same `formatPnl()` change
- `frontend/src/components/reports/MonthlyTrendChart.tsx` — tooltip and summary row use `+$` / `-$` prefix

### 2. Pretendard Font Added for Korean
- `frontend/src/index.css` line 2 — CDN import for Pretendard Variable
- `frontend/tailwind.config.js` — added `"Pretendard Variable"`, `"Pretendard"` after Space Grotesk in font stack

### 3. Text Color 3-Tier Hierarchy
In `frontend/src/index.css`, `.app-shell` overrides for text clarity:
```css
.app-shell .text-stone-400 { color: #a8afc0; }  /* labels */
.app-shell .text-stone-500 { color: #8891a4; }  /* secondary */
.app-shell .text-stone-600 { color: #6b7280; }  /* tertiary */
```

### 4. Card Opacity Raised
- `bg-white/[0.02]` → `bg-white/[0.05]` on section cards
- `bg-white/[0.04]` → inner items in HomeSnapshot, HomeSimilarPatterns, MonthlyTrendChart, report detail page

### 5. MonthlyTrendChart Bar Overflow Fix
- Added `overflow-hidden` to chart container
- Constrained bar max height: `BAR_HEIGHT / 2 - 8` for PnL mode
- Bars now centered with `left-1/2 -translate-x-1/2`
- Labels also centered

## What Still Needs Work

### HIGH PRIORITY — Font Crispness
**Problem:** App text looks softer/less crisp compared to the marketing landing page.
**Root cause:** Marketing uses `font-bold (700)` + `tracking-tight` + large sizes for headings. App uses `font-semibold (600)` with default tracking.

**Current app-shell settings** (`frontend/src/index.css` line 20-29):
```css
font-size: 1.02rem;
letter-spacing: 0.002em;
font-weight: 420;
```

**Marketing reference** (`frontend/src/components/landing/LandingPage.tsx`):
- H1: `text-5xl font-bold leading-[1.1] tracking-tight`
- Labels: `text-sm font-medium tracking-[0.2em] uppercase`
- Body: `text-lg text-neutral-400`

**Approach:** Do NOT blindly apply marketing styles globally — they are designed for large hero text. Instead:
1. Compare deployed production site (https://kifu site) with local for baseline
2. Consider increasing `font-weight` from 420 → 440-460 range
3. Add `letter-spacing: -0.01em` only to stat numbers (`.text-xl`, `.text-2xl`, etc.)
4. Test on actual device/browser — font rendering differs between Chrome and system
5. **IMPORTANT:** Do not change font-size globally — the user said it got smaller when we tried

### MEDIUM PRIORITY — Remaining Backend Changes (CRLF)
Many backend `.go` files show as changed due to LF→CRLF line ending conversion. These are NOT code changes — just whitespace.
- Consider: `git checkout -- backend/` to discard, OR commit separately as `chore: normalize line endings`
- The actual backend code changes (from earlier Codex sessions) are already in `routes.go`, `app.go`, etc.

### LOW PRIORITY — Monthly Report UX
- No monthly report **list page** exists yet — only the detail page at `/reports/monthly/[year]/[month]`
- No "Reports" link in the Shell.tsx sidebar navigation
- The `HomeMonthlyReportCard` shows latest report but there's no way to browse older months
- Report generation only via "리포트 재생성" button on detail page or background job (hourly)

## Environment Notes

### Two Postgres on port 5432
- **Docker container** (`kifu-local-postgres`): accessed via `docker exec psql`
- **Local/WSL postgres**: what Go backend actually connects to via `DATABASE_URL`
- Data created via `docker exec` goes to the wrong DB!
- Always use API or seed scripts to create test data

### Local Test Account
- Email: `admin2@kifu.local` / Password: `admin1234`
- User ID: `6b514f5b-3449-457d-8a70-19e917ba6edf`
- Has admin role, ~480 trades, monthly reports for Feb+Mar 2026

### Port Mapping
| Service | Port |
|---------|------|
| Backend (Go) | 3080 |
| Frontend dev | 5173 |
| Marketing site | 8080 |
| Postgres | 5432 (two instances!) |

### Frontend API Base
- `frontend/.env.local`: `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3080/api`
- Production: configured in docker-compose.prod.yml
