# KIFU Submission Brief (Vibe Labs)

Last updated: 2026-02-17

## 1) Project Summary

KIFU is a trading journal and AI review platform focused on improving decision quality through a repeatable loop:

`Ingest -> Record -> Review -> Improve`

It helps users:
- ingest trades/portfolio changes,
- record reasoning (bubble/review flow),
- compare AI feedback against outcomes,
- improve future decisions with retrospective context.

## 2) Current Status

### Delivered
- Public GitHub repository is live.
- Production server is deployed and reachable.
- Core auth flow (email/password + guest mode) is working.
- Core app navigation is working (`home`, `chart`, `review`, `portfolio`, `settings`).
- Summary Pack v1.1 endpoint implemented:
  - `POST /api/v1/packs/generate-latest`
- Runbook and deployment debugging notes are documented.

### Not yet delivered (known limits)
- Google/Naver social login is not implemented yet.
- Dedicated managed DB infrastructure is not finalized (currently PostgreSQL setup in current deployment stack).
- Some UX/polish items remain incomplete.

## 3) Demo Flow (recommended for judges)

1. Open landing page.
2. Start with guest flow or login.
3. Show `home` snapshot and one chart/review navigation.
4. Show exchange/summary flow:
   - if completed run exists: generate/retrieve latest summary pack,
   - if not: show expected `NO_COMPLETED_RUN` handling.

## 4) Scope Positioning for Evaluation

This submission is an early production candidate, not a fully finalized product.
The strongest points today are:
- end-to-end architecture,
- deployed runnable product,
- core review loop implementation,
- reproducible runbooks and operations notes.

## 5) Immediate Next Milestones (post-submission)

- Social login integration (Google, Naver).
- Security hardening expansion for user content privacy mode.
- Production deployment automation and migration guardrails.
- UX pass on onboarding and error messaging.

