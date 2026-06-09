# Code Review

Review the current staged changes (`git diff --cached`) or recent changes.

## Read First

1. `OPERATIONS.md`
2. `CLAUDE.md`
3. relevant `docs/runbook/` entries for touched areas

## Check For
1. **Bugs**: Logic errors, edge cases
2. **Security**: XSS, injection, auth issues
3. **Performance**: N+1 queries, memory leaks
4. **Style**: Violations of CLAUDE.md conventions
5. **Operational regressions**: deploy flow, env handling, onchain rules, provider error parsing

## Output Format (strict)
```
### Critical (must fix)
- [issue 1]

### Warnings (should fix)
- [issue 1]

### Suggestions (nice to have)
- [suggestion 1]

### Summary
[1-2 sentences]
```
