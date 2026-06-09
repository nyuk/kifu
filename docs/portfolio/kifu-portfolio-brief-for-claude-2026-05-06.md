# KIFU Portfolio Brief for Claude

Last updated: 2026-05-06

Purpose: use this as source material for building a portfolio page, case-study document, or submission deck about KIFU. Keep the final portfolio polished, but do not overclaim beyond the current implementation.

## 1. One-Line Summary

KIFU is a trading journal and AI review platform that turns trades, chart events, and portfolio activity into a repeatable feedback loop for improving decision quality.

## 2. Portfolio Positioning

Use this framing:

- Product: trading journal and AI-assisted retrospective review tool.
- Core loop: Ingest -> Record -> Review -> Improve.
- Target user: active retail traders who want to understand why they traded, how decisions performed, and what patterns to improve.
- Differentiator: KIFU does not only store trades; it links trades, chart context, notes, AI opinions, outcomes, and review routines into one workflow.

Suggested portfolio headline:

> KIFU: A full-stack trading review platform for turning trading history into decision-quality feedback.

Alternative shorter headline:

> A trading journal that connects charts, reviews, AI feedback, and outcomes.

## 3. Problem

Traders often have data scattered across exchange history, spreadsheets, screenshots, notes, and AI chat logs. This makes post-trade review inconsistent and hard to verify.

KIFU addresses three specific problems:

- Trade data and review notes are fragmented across tools.
- AI feedback is easy to generate but hard to compare with actual outcomes.
- Review routines are inconsistent, so learning does not compound.

## 4. Solution

KIFU provides a structured workflow:

1. Import or sync trading activity.
2. Visualize market context on a chart.
3. Attach "bubbles" as reviewable decision points.
4. Add notes, guided review answers, and safety review context.
5. Request AI opinions and store them against the relevant bubble.
6. Compare opinions and decisions against outcomes over time.
7. Surface portfolio, review, and admin telemetry for ongoing operation.

## 5. Product Scope Implemented

Current stable product areas:

- Auth and account flows:
  - Email/password auth.
  - Guest/demo flow.
  - Google social login policy path.
  - Social-account password setup/change flow.
- Trading data:
  - Exchange sync baseline.
  - CSV import.
  - Manual trade/position support.
  - Binance/Upbit-oriented market and trade handling.
- Chart and review:
  - Candlestick chart workspace.
  - Bubble create/list/update/delete.
  - Server-backed bubble deletion.
  - Trade and event markers.
  - Review page with outcome/AI linking paths.
  - Mobile first usable pass across app shell, home, chart, review, portfolio, settings, trades, bubbles, and onboarding.
- AI review:
  - Multi-provider AI opinion model support: OpenAI, Claude, Gemini, with server policy/credential controls.
  - AI opinions are persisted and can be evaluated against outcomes.
  - One-shot AI feedback path for chart/review context.
- Guided review:
  - Daily guided review flow.
  - Intent, emotion, pattern, and memo layers.
  - Streak tracking.
- Summary packs:
  - Source-run based summary pack generation.
  - `generate-latest` endpoint that selects the latest eligible completed run.
  - Run tracking for `summary_ondemand` success and failure states.
- Alerts and notifications:
  - Alert rules and triggered alerts.
  - Telegram notification channel support.
  - AI briefing path for alerts.
- Portfolio:
  - Portfolio dashboard.
  - Manual positions.
  - Position calculation job.
- Admin/operations:
  - Admin workspace.
  - Users, audit logs, policies, sim report, agent services.
  - Agent service poller policy controls.
  - Runs and operational telemetry.
- Onchain quick check:
  - Base ERC20 transfer fact pack endpoint.
  - Deterministic transfer summary with warnings.

## 6. Technical Stack

Frontend:

- Next.js 16
- React 19
- TypeScript
- Zustand
- Axios
- lightweight-charts
- Lucide icons
- Tailwind CSS
- Playwright tests

Backend:

- Go 1.24
- Fiber
- PostgreSQL via pgx
- JWT auth
- AES-256-GCM credential encryption
- Background jobs for trade polling, alert monitoring, outcome calculation, accuracy calculation, quota reset, position calculation, and plan matching

Infrastructure:

- Docker Compose production stack
- PostgreSQL
- Backend and frontend containers
- Production runbooks and smoke checklists

## 7. Architecture Summary

High-level architecture:

```text
Next.js frontend
  -> Fiber REST API
    -> PostgreSQL repositories
    -> Domain services
    -> Background jobs
    -> External APIs
       - Exchanges / market data
       - AI providers
       - Telegram
       - Onchain RPC provider
```

Key backend boundaries:

- `backend/internal/interfaces/http/handlers`: HTTP handlers.
- `backend/internal/domain/entities`: domain models.
- `backend/internal/domain/repositories`: repository contracts.
- `backend/internal/infrastructure/repositories`: PostgreSQL implementations.
- `backend/internal/services`: business logic services.
- `backend/internal/jobs`: background workers.

Key frontend areas:

- `frontend/app`: Next.js app routes.
- `frontend/src/components-old`: legacy main app surfaces still powering important product screens.
- `frontend/src/components`: newer focused components.
- `frontend/src/lib`: API clients and stores.

## 8. Strong Portfolio Angles

Choose 3-5 of these for the final portfolio page:

- Full-stack product delivery: backend, frontend, database, background jobs, production runbooks.
- Decision-quality product thinking: the product is designed around behavior improvement, not just CRUD.
- Real operational thinking: admin policies, run tracking, audit logs, smoke tests, deployment checklist.
- AI with evaluation loop: AI opinions are stored and compared against later outcomes.
- Data pipeline complexity: exchange sync, CSV import, summary pack generation, reconciliation, portfolio state.
- Mobile usability pass: the app was made usable across the core mobile surfaces after the main desktop flow existed.
- Security-aware implementation: credentials encrypted at rest, password hashing, refresh-token hashing, startup secret requirements.

## 9. Suggested Case Study Structure

Use this structure for the final portfolio:

1. Hero
   - Product name: KIFU
   - One-line value proposition.
   - 2-3 screenshots or a short product-flow collage.
2. Problem
   - Fragmented trading history.
   - Weak post-trade review habits.
   - AI advice without accountability.
3. Solution
   - The Ingest -> Record -> Review -> Improve loop.
4. Product walkthrough
   - Home snapshot.
   - Chart and bubbles.
   - Guided review.
   - Portfolio.
   - Admin/run tracking.
5. Technical implementation
   - Stack.
   - Architecture diagram.
   - Data model highlights.
   - Background jobs and external integrations.
6. Engineering depth
   - Run tracking.
   - Summary pack generation.
   - Credential encryption.
   - Tests/build/deployment readiness.
7. Outcome and learning
   - What is production-ready.
   - What is still planned.
   - What the project demonstrates about product and engineering skill.

## 10. Demo Flow for Portfolio

Recommended 2-3 minute demo:

1. Open KIFU and show the app shell.
2. Show Home snapshot and current trading/review status.
3. Open Chart and show candles, bubbles, and event markers.
4. Open a bubble detail and show AI opinion / review context.
5. Show Review or Portfolio tab.
6. Show Settings / exchange connection or summary-pack generation path.
7. If showing operations depth, show Admin -> Agent Services and runs.

If demo data is sparse, use the seeded guest/demo account flow described in `docs/runbook/2026-02-19-submission-checklist.md`.

## 11. Screenshot / Visual Asset Suggestions

Available local screenshot candidates from the recent mobile pass:

- `kifu-mobile-home-auth.png`
- `kifu-mobile-home-density-pass.png`
- `kifu-mobile-chart-after-buttons.png`
- `kifu-mobile-chart-after-label.png`
- `kifu-mobile-review.png`
- `kifu-mobile-portfolio.png`
- `kifu-mobile-settings.png`
- `kifu-mobile-onboarding-start.png`
- `kifu-mobile-onboarding-import.png`
- `kifu-mobile-onboarding-telegram.png`

Suggested visual grouping:

- First viewport: Home + Chart.
- Product flow: Chart -> Bubble detail -> Review.
- Operations depth: Admin Agent Services or Summary Pack run tracking.
- Mobile proof: 3-phone strip for Home, Chart, Review/Portfolio.

## 12. Recent Work Worth Mentioning

Recent commits on `main` include:

- Mobile first usable pass across core app surfaces.
- Server-backed bubble deletion and cleanup.
- Playwright typecheck stabilization.
- Trade poller unsupported Binance symbol noise reduction.
- Summary pack `generate-latest` failure run tracking.

Do not frame these as a polished final commercial release. Frame them as evidence of iteration, operational care, and readiness work.

## 13. Quality / Deployment Signals

Recent pre-deploy checks passed locally:

- `go test ./... -count=1`
- `go build ./cmd`
- `npm run typecheck`
- `npm run lint` with warnings but no errors
- `npm run build`

Production deployment runbook exists:

- `docs/runbook/production-deploy-checklist.md`

Submission smoke checklist exists:

- `docs/runbook/2026-02-19-submission-checklist.md`

## 14. Security Claims: Safe Wording

Accurate to claim:

- Exchange API credentials and user AI keys are encrypted at rest.
- Passwords are stored as bcrypt hashes.
- Refresh tokens are stored as SHA-256 hashes.
- Security-critical secrets are required at backend startup.
- Admin routes use server-side admin checks.

Do not claim:

- Full zero-knowledge encryption.
- End-to-end encrypted user records.
- Mature key rotation workflow.
- Fully automated production migration safety.

Reference:

- `SECURITY_STATUS.md`

## 15. Known Limits / Honest Caveats

Mention these only if the portfolio format has a "current limitations" section:

- Some UI surfaces still contain legacy component paths.
- Billing/checkout is a pricing concept, not fully implemented.
- Non-Google social providers are guarded or marked as coming soon in production policy.
- Some advanced review features remain planned, such as deeper weekly AI insights.
- Production migrations require manual care; runbooks exist, but full automation is not complete.
- Some repo docs contain older snapshots and may not reflect the latest May 2026 iteration.

## 16. Claude Instructions for Final Portfolio

When generating the final portfolio:

- Write in Korean unless the final submission requires English.
- Use a confident but honest tone.
- Focus on product thinking and engineering depth together.
- Avoid turning it into a generic SaaS landing page.
- Show the app as an actual tool with workflows, not just a concept.
- Use concise captions on screenshots.
- Do not overclaim revenue, user count, investment performance, or production scale.
- Prefer "implemented", "validated", "prepared for deployment", and "current limitation" language where appropriate.
- Include a compact architecture diagram.
- Include a short "What I built" section that makes individual ownership visible.

## 17. Copy Blocks Claude Can Reuse

Short intro:

> KIFU is a full-stack trading journal and AI review platform. It helps traders move from scattered trade history to a structured review loop by connecting exchange data, chart context, decision notes, AI opinions, and later outcomes.

Problem block:

> Most trading journals stop at recording entries and exits. KIFU was designed around a harder question: how can a trader repeatedly inspect the quality of their decisions? The product connects each trade to chart context, review notes, AI feedback, and outcome tracking so that review becomes a repeatable system.

Engineering block:

> The system uses a Next.js/TypeScript frontend, a Go/Fiber API, PostgreSQL repositories, and background jobs for trade polling, alert monitoring, outcome calculation, portfolio updates, and AI accuracy tracking. Operational features such as admin policies, audit logs, run tracking, deployment checklists, and smoke tests were built into the project rather than added as an afterthought.

Security block:

> Security-sensitive credentials are encrypted at rest, passwords are hashed, refresh tokens are stored as hashes, and critical backend secrets are required at startup. The project documents its current security boundary clearly and avoids claiming full zero-knowledge encryption before that architecture is implemented.

Outcome block:

> KIFU demonstrates end-to-end product engineering: domain modeling, data ingestion, chart interaction, AI-assisted review, operational controls, mobile usability, and deployment readiness. The strongest part of the project is not a single feature, but the way the pieces form a feedback loop for better trading decisions.

## 18. Source References

Use these files as factual source material:

- `README.md`
- `SUBMISSION.md`
- `SECURITY_STATUS.md`
- `docs/roadmap.md`
- `docs/CHANGELOG.md`
- `docs/runbook/2026-02-19-submission-checklist.md`
- `docs/runbook/production-deploy-checklist.md`
- `docs/spec/summary-pack-v1.md`
- `docs/nlm/architecture.md`
- `backend/internal/interfaces/http/routes.go`
- `backend/internal/interfaces/http/handlers/pack_handler.go`
- `backend/internal/interfaces/http/handlers/ai_handler.go`
- `backend/internal/jobs/trade_poller.go`
- `frontend/package.json`
- `backend/go.mod`

