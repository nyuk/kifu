> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - Korean is optional supplementary context when needed.

# KIFU

**A trading journal and AI review platform for better decision quality.**

[🇺🇸 English](./README.md) · [🇰🇷 Korean](./README.ko.md)

KIFU turns trading activity into a structured feedback loop:
- Capture trades and portfolio changes
- Add context-driven review notes
- Compare AI feedback with actual outcomes
- Improve decision quality over time

## Problem KIFU Solves

1. Post-trade review data is fragmented across tools.
2. AI advice is hard to validate against actual results.
3. Review routines are not consistent, so improvement repeats less.

KIFU unifies this as: **Ingest → Record → Review → Improve**.

## Core Features

- Trading & portfolio ingestion (exchange sync, CSV import, manual input)
- AI opinion capture and comparison
- Layer-based review sessions for sentiment, pattern, and reasoning logging
- Bubble timeline and chart replay for side-by-side analysis
- KPI dashboards and outcome analysis
- Alerting, secure auth, token management

## Pricing Concept (Draft)

- **Free tier**: bubble candlestick journal + portfolio snapshot (limited review baseline)
- **Paid tier trigger**: AI opinion collection count is the main gating metric
  - Each AI-generated opinion stored against a trade/event consumes one **Opinion Credit**.
  - Free users can use only the bubble candlestick flow; opinion collection is capped or disabled.
  - Paid users can consume high-frequency opinion credits and unlock richer analysis features.

### 2-week roadmap (KIFU)
- **Week 1**
  - Finalize paid behavior: credit policy, free quota, overflow behavior, payment entry
  - Add billing prompt and hard stop for free users after credit limit
  - Add guardrails on free tier features and copy in onboarding
- **Week 2**
  - Add pricing/checkout UI + usage dashboard
  - Launch small in-app experiment and track conversion from free users into paid usage

## Summary Pack

### v1.0 (default baseline)
- Client explicitly provides `source_run_id` to generate a pack.
- Focus: predictable, source-controlled generation and reproducibility.

### v1.1 (extension)
- Server automatically selects the latest eligible completed run.
- New endpoint: `POST /api/v1/packs/generate-latest`
- Returns `NO_COMPLETED_RUN` when no completed run is available.

> See `docs/spec/summary-pack-v1.md` and `docs/runbook/summary-pack-v1.md`.

## Onchain Quick Check (Base) — MVP

`POST /api/v1/onchain/quick-check`

- Deterministic on-demand facts pack from ERC20 Transfers (`alchemy_getAssetTransfers`)
- 10-minute cache bucket + IP rate limit (10 req/min)
- Output: token flow summary + warnings (`LOW_ACTIVITY`, `HIGH_CONCENTRATION`, `TOO_MANY_UNIQUE_TOKENS`)
- Auth required: `Authorization: Bearer <JWT>`

Example:
```bash
curl -X POST "$API/api/v1/onchain/quick-check" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"chain":"base","address":"0x...","range":"30d"}'
```

Verified response snapshot (2026-02-19):
- `address`: `0xcf979e05c91450e1fb5d98139101f0efcd934d07`
- `range`: `7d`
- `token_transfer_count`: `111014`
- `unique_token_count`: `6`
- `status`: `warning` (`HIGH_CONCENTRATION`)

## Architecture

- Backend: Go + Fiber
- Frontend: Next.js + TypeScript
- Data: PostgreSQL
- AI Providers: OpenAI / Claude / Gemini (feature-flagged)

## Quick Start

```bash
# Clone
# git clone https://github.com/nyuk/kifu.git
cd kifu-project

# Backend
cd backend
cp .env.example .env
go mod download
go run ./cmd

# Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`

## Docs

- Design: `docs/01-plan/*`, `docs/02-design/*`
- Specs: `docs/spec/*`
- Runbooks: `docs/runbook/*`
- Submission checklist: `docs/runbook/2026-02-19-submission-checklist.md`
- Guest demo seeding: `docs/runbook/guest-demo-data-seeding.md`
- Analysis: `docs/03-analysis/*`
- NLM bundle: `docs/nlm/*`
- Submission brief: `SUBMISSION.md`
- Security status: `SECURITY_STATUS.md`

## GitHub profile text (About)

GitHub repository **description** supports a single text field, so use English as default and keep Korean in README:

- **Recommended Description**
  - `Trading journal and AI review platform for retrospective analysis: bubbles, portfolio, chart replay, and AI comparison.`
- **Recommended Topics**
  - `trading`, `journal`, `review`, `trading-journal`, `go`, `fiber`, `nextjs`, `typescript`, `ai`, `portfolio`, `chart`

## Marketing

- X(Twitter) playbook: `docs/marketing/twitter-playbook.md`
- Post queue sample: `docs/marketing/x-post-queue.sample.json`
- Core message: "turn trading records into decision-quality feedback"

## Contributing

1. Open an Issue or PR.
2. Describe scope, behavior change, and test impact.
3. Note operational impacts (security/data/performance).

## License

Project and content licensing is governed by internal policy. Check `LICENSE` or your release documentation before public distribution.
