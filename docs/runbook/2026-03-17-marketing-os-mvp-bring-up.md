> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# 2026-03-17 Marketing OS MVP Bring-up

## Summary

Implemented the first Marketing OS MVP directly inside the Kifu repo, while keeping the backend model product-scoped for future multi-product expansion.

## What was added

### Backend

- `marketing_ideas`, `marketing_drafts`, `marketing_publications` migration
- marketing entity and repository layer
- marketing service with product-scoped validation
- endpoints:
  - `GET /api/v1/marketing/workspace`
  - `POST /api/v1/marketing/ideas`
  - `POST /api/v1/marketing/ideas/:id/drafts`
  - `PATCH /api/v1/marketing/drafts/:id`

### Frontend

- `/marketing` route
- first Marketing OS workspace UI
- idea inbox
- per-channel draft generation buttons
- draft editor and approval actions
- sidebar navigation entry

## Verification

### Code checks

- targeted frontend `eslint` passed for new Marketing OS files
- targeted backend package tests passed for:
  - `internal/services`
  - `internal/infrastructure/repositories`
  - `internal/interfaces/http`
  - `internal/app`

### End-to-end API check

Verified in a temporary local backend run on port `3090`:

1. guest login succeeded
2. idea creation succeeded
3. X draft generation succeeded
4. workspace summary returned the new idea and draft counts

## Local environment note

The current local DB was missing `033_monthly_reports.sql`, which caused recurring background-job log noise on backend startup.

For a cleaner local boot, apply:

1. `backend/migrations/033_monthly_reports.sql`
2. `backend/migrations/034_marketing_os.sql`

## Follow-up

Next implementation options:

1. add real publish/schedule infrastructure
2. add weekly report generation
3. add support for a second `product_key`
