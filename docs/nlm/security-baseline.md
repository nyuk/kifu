> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# Security Baseline

## Core rules

- Do not place secrets in code or docs.
- Store secrets only in `.env` + CI secret store.
- Keep user scope checks in repository and service layers.

## Authentication and authorization

- JWT-based user resolution required for all protected endpoints.
- `generate-latest` must be strictly scoped to requester user.
- Mask authorization headers in debug logs.

## Sensitive data handling

- Logs: mask JWT, cookies, trade IDs when needed.
- Shared docs: strip PII (email, account identifiers).
- Exclude `.env`, local runtime logs, and sensitive scripts from public sharing.

## Monthly checks

1. Verify user-scope filters in run and pack queries.
2. Verify `NO_COMPLETED_RUN` does not leak stack details.
3. Validate CI logs for accidental token traces.
4. Validate repo sharing artifacts are sanitized.
