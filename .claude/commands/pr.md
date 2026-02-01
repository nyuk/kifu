# Generate PR Description

Analyze the current branch vs main and generate a pull request description.

## Steps
1. Run `git log main..HEAD --oneline` to see commits
2. Run `git diff main...HEAD --stat` to see changed files
3. Analyze the changes

## Output Format
```markdown
## Summary
- [Main change 1]
- [Main change 2]

## Changes
| File | Change |
|------|--------|
| path/file.ts | Description |

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Docs

## Testing
- [ ] Lint passes
- [ ] Manual testing done

## Notes
[Any additional context]
```
