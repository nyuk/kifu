> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# CLAUDE.md - Project Knowledge Base

> Shared context for coding assistants (Claude, Codex, ChatGPT, etc.).
> If recurring behavior issues happen, record fixes here first.

## Project Overview

**kifu** is a trading journal and review platform.

Primary capabilities:
- Collect trade/portfolio events from exchange sync and CSV import.
- Record trading intent and context as bubble notes.
- Collect AI opinions and compare with outcomes.
- Review and improve decision quality through replay/analysis flows.
- Publish Summary Pack reports.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand |
| Backend | Go 1.21, Fiber v2, PostgreSQL (pgx), JWT |
| Charts | `lightweight-charts` |

## Repository Structure

```text
kifu-project/
├── backend/
│   ├── cmd/
│   ├── internal/
│   │   ├── app/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   ├── interfaces/
│   │   └── services/
│   ├── migrations/
│   └── scripts/
├── frontend/
│   ├── app/
│   ├── src/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── types/
│   │   └── lib/
└── docs/
    ├── 01-plan/
    ├── 02-design/
    ├── 03-analysis/
    ├── 04-report/
    ├── runbook/
    ├── spec/
    ├── adr/
    └── nlm/
```

## Development Commands

```bash
# Backend
go mod download
cd backend
go run ./cmd
cd ..

# Frontend
cd frontend
npm install
npm run dev
npm run build
npm run lint
npm run typecheck
```

## Coding Conventions

### TypeScript / React
- Prefer `type` over `interface` where possible.
- Use functional components with hooks.
- State is managed via Zustand; avoid introducing alternate global state frameworks unless required.

### Go
- Keep handlers thin; keep domain/repository/application boundaries explicit.
- Use repository interfaces and concrete infrastructure implementations.
- Prefer clear error return values and consistent API shape.

### API Conventions
- RESTful routes under `/api/v1/{resource}`.
- Resource names are plural for collections.
- Use noun-based resources and verb-based actions (`/login`, `/logout`, `/refresh`).
- Error body format:
  ```json
  { "code": "VALIDATION_ERROR", "message": "Invalid input" }
  ```

## Testing Strategy

- Frontend: unit/integration tests first for changed modules.
- Backend: go test standard suite.
- API smoke before merge when touching endpoints.
- No large context dumps to external LLMs; pass only scoped snippets.

## Prohibited

- ❌ Commit `.env` or secret material.
- ❌ Use `console.log` in production logic; use structured logging.
- ❌ Introduce `any` in new TypeScript code.
- ❌ Read and modify huge files without targeted rationale.

## Reference Documents

- `SPEC.md` — active source of truth for current objective.
- `important_rules.md` — token and workflow playbook.
- `QA_CHECKLIST.md` — verification checklist.
- `docs/adr/*` — decision records.
