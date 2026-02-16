> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# Web MCP Mini Smoke Rules (Kifu)

A quick browser-based manual-check list used alongside automated tests.

## Common Setup

- Backend: `http://127.0.0.1:8080`
- Frontend: `http://127.0.0.1:5173`
- Use sandbox/test account.
- Start with private window; avoid cache side effects.

## Case A — Auth/session

- Login succeeds and `/home` renders
- Tab navigation followed by refresh keeps session (no forced `/login`)
- No route loop on browser back/forward after login

## Case B — Exchange sync

- Exchange list is shown
- Sync response and error logs look normal
- Trade count increases appropriately after sync
- Home/Portfolio/Review summaries update consistently

## Case C — Chart and bubble consistency

- Symbol switch works (BTCUSDT and symbol with history)
- Interval switch (`1d/4h/1h`) updates data
- At least 5 recent bubbles visible
- Bubble click aligns with chart timestamp

## Case D — Review consistency

- Home key metrics match Review data and Trades context
- Review ranges align with bubble/trade timestamps
- Show neutral-state message when no review data exists

## Case E — AI opinion

- Trigger opinion collection from bubble detail or review
- Response shape includes `context`, `reason`, `action`
- 502/401/network errors show retry-safe UI behavior

## Case F — Performance/layout

- No clipping or overlap on tab switch
- Contrast and text size pass readability
- No major layout loss between mobile and desktop widths

## Case G — Quick consistency extract

```bash
KIFU_AUDIT_EMAIL=<email> KIFU_AUDIT_PASSWORD=<password> \
python3 scripts/kifu_state_audit.py --api http://127.0.0.1:8080 --summary --save /tmp/kifu-audit.json
python3 scripts/kifu_audit_extract.py /tmp/kifu-audit.json
```

## Log template

- Scenario:
- Account:
- Time:
- Backend/frontend:
- Case result:
  - A:
  - B:
  - C:
  - D:
  - E:
  - F:
- Failures:
  - Trade:
  - Review:
  - Portfolio:
  - Bubble:
  - Chart:
- Network logs:
- Screenshots:
