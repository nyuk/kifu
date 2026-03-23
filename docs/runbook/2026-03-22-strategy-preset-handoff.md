# Strategy Preset v0.1 — Codex Handoff (2026-03-22)

## Status: PLAN COMPLETE → Phase 1 assumptions refined after review

## What Happened

Claude Code conducted a full backtest research cycle for the strategy preset feature.
The original plan (`docs/runbook/strategy-preset-backtest-alert-v0.1-spec.md`) had two critical problems:

### Problem 1: Data Source Mismatch

The original plan assumed reusing Python premium (김프) backtest data from MoneyVessel_python.
That data is from a **premium arbitrage strategy** (업비트-바이낸스 price spread trading with winrate-band DCA ladders).
It does NOT apply to single BTC pair directional presets. Completely different market structure.

### Problem 2: MA Cross Has Zero Edge on BTC

Exhaustive parameter sweep (`scripts/preset_backtest_sweep.py`):
- MA period: 10~80h
- TP/SL: all combinations
- Result: **ZERO** combinations had avg return > 0.3% after 0.08% fee
- The "추세 회복" preset was eliminated.

## What Was Built

### Backtest Scripts (already committed)

| Script | Purpose |
|--------|---------|
| `scripts/preset_backtest_sweep.py` | Parameter sweep: dip rebound, MA cross, volatility |
| `scripts/preset_backtest_sweep2.py` | Parameter sweep: RSI oversold, BTC cycle strategies |
| `scripts/preset_backtest_final.py` | Final backtest with confirmed 3 presets → JSON output |

### Backtest Data

| File | Contents |
|------|----------|
| `docs/runbook/preset_backtest_results_final.json` | Final results for 3 presets (summary_all/180d/90d, examples, alert templates) |
| `docs/runbook/preset_backtest_results.json` | Old results (DEPRECATED — from initial params, unusable avg returns) |

### Plan Document

`docs/01-plan/strategy-preset-v0.1-plan.md` — the implementation plan based on confirmed data.

## Confirmed 3 Presets

### Preset 1: 급락 반등 감시 (`extreme-dip-v1`)
- **Trigger**: 24h high → -15% drop
- **TP/SL/Timeout**: +5% / -7% / 24h
- **Results**: 41 trades, 68.3% WR, +1.67% avg, +68.6% cumulative
- **Risk**: High

### Preset 2: 변동성 급증 감시 (`vol-spike-v1`)
- **Trigger**: 12h volatility > 1.8x of 3.5d avg volatility
- **TP/SL/Timeout**: +5% / -7% / 48h
- **Results**: 171 trades, 60.8% WR, +0.72% avg, +123.5% cumulative
- **Risk**: Medium

### Preset 3: 사이클 저점 매수 (`cycle-accum-v1`)
- **Trigger**: 90d high → -20% drop
- **TP/SL/Timeout**: +30% / -20% / 90d
- **Results**: 30 trades, 60.0% WR, +8.88% avg, +266.4% cumulative
- **Risk**: High
- **Note**: This is a long-term strategy (avg hold = weeks/months)

## Eliminated Strategies (with evidence)

| Strategy | Why Eliminated |
|----------|----------------|
| MA cross (추세 회복) | 0 viable combos in exhaustive sweep across 218K bars |
| RSI oversold | Effective (+1.83% avg) but only 17 trades in 6 years — too infrequent for a preset |
| Python premium data reuse | Different market structure (arbitrage vs directional) — numbers don't transfer |

## Phase 1 Implementation Scope (For Codex)

**Goal**: Static preset cards in frontend → CTA links to RuleEditor with prefilled values.

**Phase 1 keeps the backend untouched.** All preset card data comes from static JSON.

### Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/types/preset.ts` | Type definitions (PresetStrategy, PresetSummary, PresetExample) |
| `frontend/src/components/presets/PresetCard.tsx` | Individual preset card component |
| `frontend/src/components/presets/PresetStrategies.tsx` | Tab page with 3 cards + risk notice |

### Files to Modify

| File | Change |
|------|--------|
| `frontend/src/components/alerts/` | Add "Strategy Presets" tab to alerts section |
| Alert RuleEditor | Support prefill props from preset's `alert_rule_template` |

### Phase 1 Constraints (current)

- **Preset 3 CTA disabled** — show card with metrics but CTA says "준비 중" (90d not supported yet)
- **12h volatility timeframe is already supported in current `RuleConfigForm.tsx`**
- **JSON must live in `frontend/src/data/` at runtime**; `docs/runbook/` copy remains the research source of truth

### What NOT to Build

- No new backend API
- No new DB tables or migrations
- No real-time backtest recalculation
- No multi-symbol support (BTC only)
- No strategy builder or parameter editing

### UI Requirements

1. Cards show: name, risk badge (중간/높음), description, 4 metrics (WR, avg return, trade count, avg hold time)
2. `generated_at` date on each card; stale badge if > 7 days old
3. Risk notice always visible: "과거 성과는 미래 결과를 보장하지 않습니다"
4. CTA "이 전략으로 알림 받기" → opens RuleEditor with prefilled symbol/rule_type/config
5. Preset 1,2 show hold time in hours; Preset 3 shows hold time in days

### Type Definitions

Full type definitions are in `docs/01-plan/strategy-preset-v0.1-plan.md` → "Frontend Types" section.

### Data Source

Use `frontend/src/data/presetBacktestResults.json` as the app runtime import.
Keep `docs/runbook/preset_backtest_results_final.json` as the research/script source of truth.
Each preset includes `alert_rule_template` with exact `CreateAlertRuleRequest` shape for RuleEditor prefill.

## Copy Rules

- Allowed tone: 관찰, 감시, 실험, 확인
- Forbidden tone: 추천, 확실한 수익, 자동 매매
- Must include: "과거 성과는 미래 결과를 보장하지 않습니다", data range (2020~2026), fee disclosure (0.08%)

## Codex Review Findings (2026-03-22) — All Resolved

### [P1] Preset 3 — 90d reference not supported (CONFIRMED)
- `alert.ts:8`: `reference: '24h' | '1h' | '4h'` — no 90d
- `alert_monitor.go:658-668`: `parseDuration()` default = 24h for unknown values
- **Resolution**: Phase 1 CTA disabled ("준비 중"). Phase 2 adds 90d to type + parseDuration + editor.

### [P1] Preset 2 — 12h timeframe missing from RuleEditor (RESOLVED IN CURRENT MAIN)
- Current code now includes `<option value="12h">12h</option>` in `RuleConfigForm.tsx`
- Backend is string-based, so this preset can keep the 12h template as-is
- **Resolution**: no additional Phase 1 work required; keep as regression check

### [P2] JSON import path outside frontend (RESOLVED IN CURRENT MAIN)
- `next.config.mjs` still has no external directory import setup
- Current app uses `frontend/src/data/presetBacktestResults.json`
- **Resolution**: keep `docs/runbook/` copy as script/source-of-truth artifact, but treat `frontend/src/data/` as runtime input

## Remaining Product Risk After Review

Only one Phase 1 limitation is intentionally still open:

1. **Preset 3 / 90d reference**
   - `alert.ts` still limits `PriceChangeConfig.reference` to `1h | 4h | 24h`
   - `alert_monitor.go` still defaults unknown durations to `24h`
   - therefore `cycle-accum-v1` remains **card-only + CTA disabled** until Phase 2

## Pending Non-Preset Work

| Item | Status |
|------|--------|
| Gemini API fix (hardcoded URL) | Committed but NOT deployed to prod yet |
| AI opinion quality fix | Committed but NOT deployed to prod yet |
| CRLF noise (~100 Go files) | LF→CRLF from Mac sync, NOT committed, not content changes |
