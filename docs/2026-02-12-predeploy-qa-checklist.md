> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# 2026-02-12 Pre-Deploy QA Checklist

Pre-deployment checklist for flow validity, data consistency, and operational safeguards.

## 1) Core E2E flow

- [ ] Signup complete
- [ ] Onboarding branch check
  - [ ] Post-signup selection: `Import trades / Start mindset test`
  - [ ] Test path opens correctly
  - [ ] Import path opens correctly
- [ ] Login and landing to `/home` succeeds
- [ ] Symbol switching works in chart
- [ ] Bubble create/save succeeds
- [ ] `Ask AI` succeeds without UI errors
- [ ] Review tab shows newly created records

Notes:

---

## 2) Exchange sync and consistency

- [ ] Upbit sync succeeds
- [ ] Binance sync succeeds
- [ ] Most recent real trades appear in trades list
- [ ] Home / portfolio / review KPI values are approximately consistent with trade data
- [ ] No duplicate trade records
- [ ] Timestamp consistency
  - [ ] Candle time
  - [ ] Created time
  - [ ] Review display time

Notes:

---

## 3) Basic UI/UX checks

- [ ] Login failure message remains visible long enough
- [ ] Login input values are not unexpectedly cleared
- [ ] Onboarding layout alignment is stable
- [ ] Chart controls do not overlap heavily
- [ ] Bubble/position markers stay within chart bounds
- [ ] Modal save button accessible on mobile/narrow screens

Notes:

---

## 4) AI calls and cost protection

- [ ] `Ask AI` debounce blocks rapid duplicate clicks
- [ ] Failure state message displayed correctly
- [ ] Quota/rate-limit handling path works as expected
- [ ] Demo mode behavior differs clearly from production mode

Notes:

---

## 5) Operational safeguards (before deploy)

- [ ] Frontend env variables
  - [ ] `NEXT_PUBLIC_API_BASE_URL`
  - [ ] `NEXT_PUBLIC_APP_MODE`
- [ ] Backend env variables
  - [ ] `OPENAI_API_KEY`
  - [ ] Database credentials
  - [ ] JWT/session secrets
- [ ] DB migration version confirmed
- [ ] Rollback commit SHA recorded
- [ ] Health-check URL recorded

Rollback SHA:

Health URL:

---

## 6) Execution commands

```bash
cd /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/frontend
npm run typecheck
npm run build
```

```bash
# Backend
cd /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/backend
go test ./...
```

Run results:

---

## 7) Final verdict

- [ ] Go / release
- [ ] Hold deployment

Hold reason (if any):
