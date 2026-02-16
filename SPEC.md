> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# Project Specification (SPEC.md)

> **Role**: This file is the SINGLE SOURCE OF TRUTH for the project's current objective.  
> **Rule**: Do not explain requirements in chat. Update this file instead.  
> **Working Mode**: Small tasks + diff-based changes only (see §3.5).

---

## 0. Project Summary (One-liner)-(1~3 days)-COMPLETED
A chart-based journaling & review tool where users attach “bubble notes” to specific timepoints (candles), optionally collect AI agents’ opinions for that timepoint, and later review outcomes vs actions.

---

## 1. Current Goal (Objectives) — MVP (4~6 days)
> **Goal**: Produce a working “bubble note” flow on the chart with persistence + minimal agent opinion collection.

### 1.1 Must-have (MVP)
- [ ] **Timepoint selection**: user can click a candle/timepoint on the chart and see the selected timestamp/price.
- [ ] **Bubble CRUD**: user can create/edit/delete a bubble note anchored to the selected timepoint.
- [ ] **Persistence**: bubbles survive refresh/reopen (initially local/offline is OK).
- [ ] **Collect Opinion (1 provider)**: user can click “Collect Opinion” and save at least one agent response into the bubble.
- [ ] **Review view**: user can open any existing bubble from the chart and read: note + agent response + meta.

### 1.2 Nice-to-have (if time permits)
- [ ] Bubble “tags”: `BUY/SELL/TP/SL/NO_ACTION`, plus optional free-text reason.
- [ ] Quick filters: show only `BUY/SELL`, show only “has agent response”
- [ ] Basic export/import of bubbles (JSON file)

### 1.3 Explicit NON-goals (for MVP)
- [ ] Payments/subscriptions
- [ ] Friends/SNS/sharing
- [ ] Automated trading or execution
- [ ] Backtesting, performance analytics, “strategy recommendation”
- [ ] Full UI polish / design overhaul
- [ ] Large refactors of big files (Chart.tsx/Bubbles.tsx) unless strictly necessary

---

## 2. Scope (Boundaries)

### ✅ In-Scope (Work on these)
#### Features
- Bubble notes attached to candle/timepoint
- Local/offline persistence (first)
- Minimal agent opinion collection (first: 1 provider)
- Bubble review UX on chart
- Basic “import/export” (optional)

#### Target Files (expected touchpoints)
- `frontend/src/pages/Chart.tsx` (currently large; keep edits minimal + diff-based)
- `frontend/src/components/Bubbles.tsx` (currently large; keep edits minimal)
- `frontend/src/lib/*` (new helper modules allowed)
- `backend/*` (only if we decide server persistence now; otherwise skip backend for MVP)

### ❌ Out-of-Scope (Do not touch)
- DB migration / schema redesign (unless we explicitly adopt SQLite for MVP)
- Re-architecting chart library
- Replacing Cloudflare / infra
- “AI multi-agent orchestration” beyond the minimal 1 provider in MVP

---

## 2.5 User Scenarios (Minimum)
- **Scenario A (Note)**: user clicks a candle → clicks “New Bubble” → writes note → saves → bubble appears on chart.
- **Scenario B (Opinion)**: user opens a bubble → clicks “Collect Opinion” → response is saved into bubble → can read later.
- **Scenario C (Review)**: later, user navigates chart → opens past bubble(s) → sees what was thought + what was done.

---

## 3. Constraints & Tech Stack
- **Frontend**: Next.js (React) + Tailwind CSS
- **Backend**: Go (Fiber) - Port 8080
- **Database**: PostgreSQL (Docker)
- **Persistence (MVP default)**: `localStorage` or local JSON file download/upload
- **Style**: keep changes localized; avoid touching unrelated code
- **Security**: never store raw API keys in server logs; do not expose keys to client if server-proxy is used

### 3.1 Data Model (MVP)
A bubble record (schema reference):

- `id`: string (uuid)
- `symbol`: string (e.g., `BTCUSDT`)
- `timeframe`: string (e.g., `1d`)
- `ts`: number (epoch ms)
- `price`: number
- `note`: string
- `tags`: string[] (optional)
- `action`: `BUY|SELL|HOLD|TP|SL|NONE` (optional)
- `agents`: array of agent responses (optional)
  - `provider`: string
  - `model`: string
  - `prompt_type`: `brief|detailed|history|custom`
  - `response`: string
  - `created_at`: ISO string
- `created_at`: ISO string
- `updated_at`: ISO string

#### Example JSON
```json
{
  "id": "uuid",
  "symbol": "BTCUSDT",
  "timeframe": "1d",
  "ts": 1700000000000,
  "price": 43000.12,
  "note": "string",
  "tags": ["BUY", "RISK"],
  "action": "BUY",
  "agents": [
    {
      "provider": "one-provider",
      "model": "string",
      "prompt_type": "brief",
      "response": "string",
      "created_at": "2026-01-31T12:34:56Z"
    }
  ],
  "created_at": "2026-01-31T12:00:00Z",
  "updated_at": "2026-01-31T12:10:00Z"
}
```

### 3.2 Opinion Prompt Types (MVP)
- `brief`: 5~8 lines, “what matters now”
- `detailed`: structured bullets (risk, scenario, invalidation)
- `history`: **NOT MVP** (requires historical lookup)
- `custom`: **NOT MVP** (free-form advanced prompt)

### 3.3 Compliance / Responsibility Guardrails
- The product is a **logging & aggregation tool**, not investment advice.
- Always label AI output as “agent opinion / non-advice”.
- Do not generate “trade signals” as default behavior. User must explicitly request prompt type.

### 3.4 Token Budget Rules (Hard rules)
- Do not paste full files into chat. Use **`git diff` only**.
- One task per commit/PR (30–60 min chunk).
- Output format for any agent response: **max 10 lines explanation + diff**.
- Prefer “offline/localStorage” first to avoid extra API + complexity.

### 3.5 Key Handling (MVP decision)
- **Default**: no keys required for MVP (bubble-only works offline).
- If “Collect Opinion (1 provider)” is implemented:
  - **Option A (fastest)**: user pastes a token per session (stored in memory only, not persisted)
  - **Option B (safer)**: backend proxy with env var key (more work)
- MVP preference: **Option A** unless security constraints require proxy.

---

## 4. Definition of Done (MVP Acceptance Criteria)
- [ ] User can select a candle and see selected timepoint shown in UI.
- [ ] User can create/edit/delete a bubble and see it rendered on the chart.
- [ ] Bubbles persist after refresh (localStorage or equivalent).
- [ ] User can open a bubble and read its content.
- [ ] “Collect Opinion” saves at least 1 response into the bubble (if enabled).
- [ ] No console crash on errors (show user-friendly message).
- [ ] No major refactor; minimal diffs; code stays buildable.

---

## 5. Execution Plan (1~3 Days)

### Day 1: Bubble foundation (offline)
- [ ] Timepoint selection UI + state
- [ ] Bubble create/edit/delete UI
- [ ] Persist bubbles in localStorage
- [ ] Render bubble markers on chart

### Day 2: Review UX + export/import (optional)
- [ ] Bubble list / quick filter (optional)
- [ ] Export JSON / Import JSON (optional)
- [ ] Tag/action UI (optional)

### Day 3: Collect Opinion (1 provider)
- [ ] “Collect Opinion” button
- [ ] Minimal prompt templates (`brief` / `detailed`)
- [ ] Save response into bubble
- [ ] Basic error handling (rate-limit, network)

---

## 6. Future Backlog (Post-MVP)
> These are ideas; do not implement unless moved into §1.

### 6.1 Trade History Overlay (Upbit/Binance)
- Import CSV (fast path) and map fills to chart markers
- Optional API sync (with exchange limitations & pagination)
- Cross-device sync as paid feature (cloud storage)

### 6.2 Multi-agent Expansion
- Multiple providers in parallel
- Per-agent prompt customization
- “Consensus / disagreement” visualization

### 6.3 Social / Sharing (optional)
- Friends, shared bubbles, notifications
- Privacy controls & permissions

### 6.4 Monetization (optional)
- Free: daily timeframe only + offline only
- Paid: intraday timeframes + cloud sync + multi-agent bundles

---

## 7. History / Changelog (Recent)
- 2026-01-31: Created SPEC.md (MVP defined: bubble notes + minimal opinion collection)



## Phase 2 (Day4~Day6) — Productization
# Project Specification (SPEC.md)

> **Role**: This file is the SINGLE SOURCE OF TRUTH for the project's current objective.
> **Rule**: Do not explain requirements in chat. Update this file instead.
> **Workflow**: One task at a time → output as git diff only.

---

## 0. Status
- ✅ Day1~Day3 MVP 완료 (Timepoint selection / Bubble CRUD / Persistence / Opinion collection v1 / Review-mode)
- Next: Phase 2 (Productization) 시작

---

## 1. Current Goal (Objectives)
### Phase 2 Goal (Day4~Day6)
- [ ] **Data portability & safety**: Export/Import(JSON) + schema version + validation
- [ ] **Trade overlay (CSV import v1)**: 거래내역 CSV 업로드 → 차트에 매수/매도 마커 표시
- [ ] Day 6: Stability & UX (Error boundaries, toast notifications, loading states)

### Design Track (Parallel)
- [ ] Landing v1: Hero + How it works + Features + CTA (Design System: The Rock)
- [ ] Brand assets: hero-rock.webp상태/로딩 처리 최소 기준 충족

---

## 2. Scope (Boundaries)

### ✅ In-Scope (Work on these)
- **Frontend**
  - Export/Import UI (JSON)
  - CSV Import UI (Upbit/Binance format v1)
  - Trade markers overlay rendering
  - Minimal error handling + toasts/alerts (단순)
- **Data**
  - `schemaVersion` 기반 저장 포맷
  - local-first 유지 (브라우저/로컬 파일 기반)

### ❌ Out-of-Scope (Do not touch yet)
- Cloud sync / multi-device account system (유료 플랜 후보, Phase 3)
- 결제/구독 시스템 (Phase 3)
- “완벽한” 거래소 API 연동(역사 데이터 풀 동기화) (Phase 3)
- UI 폴리싱/디자인 리뉴얼 (기능 안정화 후)

---

## 3. Constraints & Tech Stack
- **UI/Frontend**: (현재 프로젝트 그대로 유지)
- **Persistence**: localStorage(기존) + file export/import(JSON)
- **Rule**: 작은 diff, 큰 리팩토링 금지. 필요하면 리팩토링은 별도 태스크로만 수행.

---

## 4. Definition of Done (DoD)
### Global DoD
- [ ] 새로고침 후 데이터 유지 (기존 Persistence 유지)
- [ ] Export → Import 왕복(round-trip) 시 데이터 손실 없음 (버블)
- [ ] CSV Import 후 trade markers가 차트에 보임
- [ ] Import/CSV 에러 시 “조용히 실패”하지 않고 사용자에게 최소 안내(1줄) 제공
- [ ] 에이전트 작업 결과는 항상 `git diff`로 검토 가능

---

## 5. Data Schemas (Phase 2)

### 5.1 Bubble Export Format (JSON)
- 최상위:
  - `schemaVersion: 1`
  - `exportedAt: ISO string`
  - `appVersion?: string`
  - `bubbles: Bubble[]`
  - `trades?: Trade[]` (Day5부터)

#### Bubble (v1)
- `id: string`
- `ts: number` (epoch ms)
- `price?: number`
- `symbol?: string` (optional)
- `title?: string`
- `note?: string`
- `tags?: string[]`
- `actions?: Array<{ type: "buy"|"sell"|"tp"|"sl"|"hedge"|"none", size?: number, memo?: string }>`
- `agentReplies?: Array<{ provider: string, mode: "brief"|"detail"|"risk", content: string, createdAt: string }>`
- `createdAt: string`
- `updatedAt: string`

#### Trade (v1)  (Day5)
- `id: string`
- `exchange: "upbit"|"binance"`
- `symbol: string` (e.g., BTC/KRW, BTCUSDT)
- `side: "buy"|"sell"`
- `ts: number` (epoch ms)
- `price?: number`
- `qty?: number`
- `fee?: number`
- `raw?: object` (원본 row를 옵션으로 저장)

---

## 6. Execution Plan (Day4~Day6)

### Day4: Export/Import(JSON) + Validation
- [ ] Export 버튼: 현재 데이터(bubbles)를 JSON 파일로 다운로드
- [ ] Import 버튼: JSON 파일 업로드 → validation → 로드
- [ ] Validation 최소 규칙:
  - schemaVersion == 1
  - bubbles is array
  - bubble.id, bubble.ts, bubble.createdAt 존재
- [ ] Import 정책(v1):
  - 기본: **Replace All** (기존 데이터 전부 덮어쓰기)
  - (옵션) Append는 Day6 이후로

**Day4 DoD**
- [ ] Export 받은 파일을 바로 Import해도 동일하게 복구됨
- [ ] 잘못된 파일이면 1줄 에러 메시지 표시

---

### Day5: Trade CSV Import v1 + 차트 오버레이
- [ ] CSV 업로드 UI (Upbit/Binance 중 하나부터 시작)
- [ ] 파서(v1): 최소 컬럼만 지원
  - 공통 필수: time, side, symbol, (price or avg_price), (qty optional)
- [ ] trade markers overlay:
  - buy: upward marker
  - sell: downward marker
  - 클릭하면 간단 tooltip(시간/side/price/qty)
- [ ] Export 포맷에 `trades` 포함 (선택)

**Day5 DoD**
- [ ] 샘플 CSV 1개로 업로드 → 마커 표시 확인
- [ ] bubbles와 trades가 동시에 유지/Export 가능

---

### Day6: 안정화 + UX + 간단 공유 루프
- [ ] 빈 상태/로딩/에러 처리(최소) 정리
- [ ] Import 시 충돌/중복에 대한 안내 문구(Replace All 명시)
- [ ] “피드백용 공유”:
  - Export 파일 1개로 팀원/테스터가 Import하여 동일 화면을 볼 수 있음
- [ ] (옵션) Append Import(merge 정책) 초안
  - id 충돌 시 새 id 발급 or 덮어쓰기 중 하나 선택

**Day6 DoD**
- [ ] 사용자가 실패해도 ‘왜 안되는지’ 최소 안내가 있음
- [ ] 팀원이 export 파일로 동일 상태 재현 가능

---

## 7. GTM Owner (Phase 2에서의 최소 역할)
> 아직 “세일즈”가 아니라 “피드백 파이프라인” 구축이 목적

- [ ] 테스터 3명 확보(지인/커뮤니티/팀)
- [ ] Day6까지 Export 파일로 사용성 피드백 회수 (5분 인터뷰)
- [ ] 가장 자주 나오는 3개 불만/요구를 backlog로 정리

---

## 8. Work Rules (Token Budget)
- 한 번에 **1 task**만 지시한다.
- 결과는 `git diff`만 받는다.
- 범위가 바뀌면 chat이 아니라 SPEC를 업데이트한다.

---

## 9. History / Changelog
- 2026-02-01: MVP(Day1~Day3) 완료
- 2026-02-01: Phase 2 spec added (Day4~Day6: Export/Import + CSV Trade Overlay)

Landing v1: Hero + How it works + Features + CTA 연결 (디자인 시스템 적용)

 Brand assets: hero-rock.webp + og-image.png + favicon
