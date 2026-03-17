> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# 2026-03-17 Marketing OS Local Status

## Summary

Operator guidance and the checked-out source were out of sync.

The workspace had a Marketing OS quickstart document, but the actual source tree did not contain:

- a frontend `/marketing` route
- marketing UI components
- backend marketing handlers
- a marketing migration file

## What was verified

### Frontend

- `http://127.0.0.1:5173/login` returned `200`
- `http://127.0.0.1:5173/marketing` returned the Next.js app 404 page

### Backend

- `http://127.0.0.1:3080/health` returned `200`
- guest auth on `POST /api/v1/auth/guest` returned tokens
- authenticated `GET /api/v1/marketing/workspace` returned `404`

### Local env alignment

- `frontend/.env` already pointed to `http://127.0.0.1:3080/api`
- `backend/.env` had `PORT=8080`, which did not match the active local frontend target
- local backend env was updated to `PORT=3080` for alignment

## Root cause

Documentation drift:

- the quickstart described a planned or previously discussed Marketing OS flow
- the current working tree did not actually include that implementation
- the quickstart also implied a repo-root env workflow that does not match how local commands are normally run in this repo

## Fix applied

### Documentation

Updated:

- `docs/marketing/marketing-os-quickstart.md`

The quickstart now states:

- which local env files matter
- which ports are active in this workspace
- what can be verified now
- that the Marketing OS route is currently unavailable in source

### Local env

Updated:

- `backend/.env`

Change:

- `PORT=3080`

## Recommended follow-up

If the product goal is to actually use Marketing OS in this workspace, implement or restore:

1. frontend `/marketing` route
2. marketing workspace UI
3. backend marketing API
4. marketing database migration
