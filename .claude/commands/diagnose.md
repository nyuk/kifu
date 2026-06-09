# Diagnose Issue

Investigate the following issue:

$ARGUMENTS

## Read First

1. `OPERATIONS.md`
2. `CLAUDE.md`
3. relevant `docs/runbook/` entries

## Investigation Order

1. Classify the issue:
   - frontend
   - backend
   - deploy/runtime
   - provider integration
2. Identify the smallest affected surface.
3. Read only the relevant files and logs.
4. Check whether a similar issue is already covered in `docs/runbook/`.
5. Prefer root cause over symptom-level fixes.

## Priority Checks

- env/config mismatch
- deploy flow mismatch
- route/handler/service boundary mistakes
- provider limits or auth failures
- missing error-body parsing
- timeout-chain mismatches
- onchain rule violations

## Output Format

```text
## Issue
[one-line problem statement]

## Likely Root Cause
[what is most likely wrong]

## Evidence
- [file/path or log]
- [what it shows]

## Minimal Fix
[smallest safe fix]

## Verification
[exact checks to run]

## Residual Risk
[what is still uncertain]
```
