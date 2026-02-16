> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# Kifu MVP Manual QA Checklist

This checklist validates the full end-to-end flow without automated tests.

## Environment Setup

- [ ] Backend .env configured (`kifu/backend/.env`)
- [ ] Frontend .env configured (`kifu/frontend/.env`)
- [ ] PostgreSQL running via Docker Compose

### Backend

```bash
cd kifu/backend
go mod download
go run cmd/main.go
```

### Frontend

```bash
cd kifu/frontend
npm install
npm run dev
```

---

## Auth Flow

- [ ] Register user (POST `/api/v1/auth/register`) returns success
- [ ] Login (POST `/api/v1/auth/login`) returns `access_token` + `refresh_token`
- [ ] Refresh (POST `/api/v1/auth/refresh`) returns rotated tokens
- [ ] Logout (POST `/api/v1/auth/logout`) revokes refresh token

## Profile & Subscription

- [ ] GET `/api/v1/users/me` returns email/name/subscription
- [ ] PUT `/api/v1/users/me` updates name
- [ ] GET `/api/v1/users/me/subscription` returns tier + quota

## Exchange API Keys

- [ ] POST `/api/v1/exchanges` rejects keys with withdrawal/spot permissions
- [ ] POST `/api/v1/exchanges` accepts read-only futures key
- [ ] GET `/api/v1/exchanges` returns masked key
- [ ] POST `/api/v1/exchanges/:id/test` succeeds
- [ ] DELETE `/api/v1/exchanges/:id` removes credential

## User Symbols + Market Klines

- [ ] GET `/api/v1/users/me/symbols` returns default symbol
- [ ] PUT `/api/v1/users/me/symbols` updates list
- [ ] GET `/api/v1/market/klines` returns candle data

## Bubbles CRUD

- [ ] POST `/api/v1/bubbles` creates a bubble
- [ ] GET `/api/v1/bubbles` returns list with pagination
- [ ] GET `/api/v1/bubbles/:id` returns details
- [ ] PUT `/api/v1/bubbles/:id` updates memo/tags
- [ ] DELETE `/api/v1/bubbles/:id` deletes

## Trade Polling (Optional)

- [ ] With `MOCK_BINANCE_TRADES=true`, auto bubbles/trades created
- [ ] New trades create bubbles with type `auto`

## AI Opinions

- [ ] PUT `/api/v1/users/me/ai-keys` saves user AI keys
- [ ] GET `/api/v1/users/me/ai-keys` returns masked keys
- [ ] POST `/api/v1/bubbles/:id/ai-opinions` returns opinions
- [ ] GET `/api/v1/bubbles/:id/ai-opinions` returns stored opinions

## Outcomes

- [ ] Background job creates outcomes for 1h/4h/1d
- [ ] GET `/api/v1/bubbles/:id/outcomes` returns outcomes

## Similar Search

- [ ] GET `/api/v1/bubbles/:id/similar?period=1h` returns summary + matches
- [ ] GET `/api/v1/bubbles/search?symbol=...&tags=...` returns matches

## Frontend UI

- [ ] Login/Register flows redirect correctly
- [ ] Chart page renders candlesticks
- [ ] Bubble create modal submits and closes
- [ ] Bubbles page shows list, AI opinions, outcomes, similar panels
- [ ] Logout clears session and redirects to /login
