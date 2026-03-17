> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - Korean can be shared in chat as supplementary operator guidance.

# Kifu Marketing OS Quickstart

> Last verified: 2026-03-17
> Scope: local operator setup for the first Marketing OS MVP
> Korean operator guide: `docs/marketing/marketing-os-quickstart.ko.md`

## What is live in source now

The current workspace now includes:

- frontend route: `/marketing`
- backend marketing API under `/api/v1/marketing/*`
- DB migration: `backend/migrations/034_marketing_os.sql`

This first MVP is implemented **inside Kifu**, but the API and tables are already scoped by `product_key`.

Current first product:

- `product_key = kifu`

## Current MVP scope

The first usable flow is:

1. save an idea to the inbox
2. generate a channel-specific draft
3. review and edit the draft
4. move the draft through approval states

Current channels:

- `X`
- `Naver Blog`
- `YouTube`

Current generation style:

- template-driven server generation
- human approval first
- no auto-publishing job yet

## Local files that matter

For local development, the important env files are:

- `backend/.env`
- `frontend/.env`

Current local ports in this workspace:

- frontend: `5173`
- backend: `3080`
- postgres: `5432`

The frontend local env should point to:

- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3080/api`

The backend local env should stay aligned to:

- `PORT=3080`

## Required migrations

Apply at least:

- `backend/migrations/033_monthly_reports.sql`
- `backend/migrations/034_marketing_os.sql`

`034_marketing_os.sql` creates:

- `marketing_ideas`
- `marketing_drafts`
- `marketing_publications`

## Run locally

### Backend

```bash
cd backend
go mod download
go run ./cmd
```

If Go cache permission errors happen on Windows:

```bash
set GOCACHE=C:\path\to\kifu\backend\.gocache
go run ./cmd
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Open the page

Open:

- `http://localhost:5173/marketing`

The route now exists in source and returns `200` in local dev when the frontend is running.

## 5-minute operator flow

### 1. Enter Marketing OS

1. log in
2. open `/marketing`

### 2. Save an idea

Fill:

- title
- raw note
- angle
- message pillar
- channel(s)
- optional source link

Then click:

- `Save to inbox`

### 3. Generate a draft

From an idea card, click:

- `Generate X`
- `Generate Naver Blog`
- `Generate YouTube`

### 4. Review the draft

In the draft editor, update:

- title
- tone
- content
- risk flags
- approval status

### 5. Move the draft forward

Use:

- `Save draft`
- `Approve`
- `Hold`
- `Discard`

## What is real vs not yet built

### Real now

- idea persistence
- draft persistence
- approval state updates
- product-scoped API model
- first `/marketing` UI

### Not yet built

- scheduled posting
- direct `X` publishing
- weekly performance report
- external metrics sync
- LLM-based draft generation

## Current recommendation

Use this MVP to validate:

1. whether the inbox flow is fast enough
2. whether the generated draft structure is useful enough for approval
3. whether `Kifu` should remain the first workspace before adding more products
