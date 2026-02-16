> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# CODEX.md - AI Assistant Working Context

This document summarizes the project for handoff to AI coding assistants.

## Project Summary

**kifu** is a trading review application.
- Users record trading decisions as bubble events.
- AI opinions can be collected per event.
- Results are reviewed against future outcomes.
- The goal is to improve decision quality over time.

## Core Concepts

| Term | Meaning |
|---|---|
| Bubble | A recorded decision point tied to symbol, price, timeframe, and user notes |
| AI Opinion | A model-generated directional view (BUY / SELL / HOLD / neutral tags) |
| Outcome | Post-decision market movement at 1h / 4h / 1d windows |
| Accuracy | Rate of correct AI-direction decisions versus realized movement |
| Review Note | User post-review note, including lessons and emotional context |

## Architecture Snapshot

```text
┌──────────────────────┐   ┌───────────────────────┐
│ Frontend             │   │ Backend               │
│ - Next.js / React    │◄──┤ - Go + Fiber          │
│ - Zustand            │   │ - PostgreSQL          │
│ - lightweight-charts  │   │ - JWT Auth            │
└──────────┬───────────┘   └───────────┬───────────┘
           │                           │
           ▼                           ▼
  API consumers                API handlers and jobs
  (flows, modals, charts)      (runs, summary packs, jobs)
```

## Repo Structure

- `backend/internal/domain` — entities, repositories (interfaces)
- `backend/internal/infrastructure` — repository implementations, external clients
- `backend/internal/interfaces/http` — handlers/routes
- `backend/internal/jobs` — background jobs
- `frontend/src/components` — app components
- `frontend/src/stores` — state
- `frontend/src/lib` — API clients, helpers
- `docs` — planning/design/analysis/runbooks/specs/ADR

## API Surface (Selected)

- Auth: `/api/v1/auth/{register,login,refresh,logout}`
- Bubbles: `/api/v1/bubbles`
- Outcomes and Accuracy: `/api/v1/bubbles/:id/outcomes`, `/api/v1/review/*`
- Trades: `/api/v1/trades`, `/api/v1/trades/import`, `/api/v1/trades/convert-bubbles`
- AI Opinions: `/api/v1/bubbles/:id/ai-opinions`
- Summary Packs: `/api/v1/packs/generate` and `/api/v1/packs/generate-latest`

## Current Priority

- Keep behavior change-safe, and preserve explicit-user flows.
- For summary packs, use v1.0 explicit generation as baseline, with v1.1 auto-complete as an extension.
- Avoid touching unrelated files during scoped work.
- Update `SPEC.md` and related docs for every behavior decision.

## Reference Notes

- DB and entities evolve quickly; migration files are in `backend/migrations/*`.
- `kifu-project/docs/nlm` is the consolidated documentation pack for NotebookLM.
- For long-lived decisions, check ADR files under `docs/adr`.
