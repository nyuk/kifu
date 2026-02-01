# Generate Commit Message

Analyze staged changes and generate a conventional commit message.

## Steps
1. Run `git diff --cached` to see staged changes
2. Analyze the nature of changes

## Commit Format
```
<type>(<scope>): <subject>

<body - what and why, not how>
```

## Types
- feat: New feature
- fix: Bug fix
- refactor: Code restructuring
- docs: Documentation
- style: Formatting
- test: Tests
- chore: Maintenance

## Rules
- Subject max 50 chars
- Body max 72 chars per line
- Use imperative mood ("add" not "added")

## Output
Just the commit message, ready to use.
