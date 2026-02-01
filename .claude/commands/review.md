# Code Review

Review the current staged changes (`git diff --cached`) or recent changes.

## Check For
1. **Bugs**: Logic errors, edge cases
2. **Security**: XSS, injection, auth issues
3. **Performance**: N+1 queries, memory leaks
4. **Style**: Violations of CLAUDE.md conventions

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
