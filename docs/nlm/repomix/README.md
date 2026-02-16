> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# Repomix Generation Procedure

Goal: keep codebase snapshots for NotebookLM in versioned docs.

## 1) Setup

- Install repomix when needed:
  - `npm i -D repomix`

## 2) Recommended outputs

- `docs/nlm/repomix-output/backend.md`
- `docs/nlm/repomix-output/frontend.md`
- `docs/nlm/repomix-output/docs.md`
- `docs/nlm/repomix-output/project-summary.md`

## 3) Commands

```bash
mkdir -p docs/nlm/repomix-output
npx repomix backend --output docs/nlm/repomix-output/backend.md --include "**/*.go"
npx repomix frontend --output docs/nlm/repomix-output/frontend.md --include "**/*.{ts,tsx}"
npx repomix docs --output docs/nlm/repomix-output/docs.md --include "**/*.md"
npx repomix backend frontend docs scripts --output docs/nlm/repomix-output/project-summary.md --include "**/*"
```

## 4) Operational rules

- Exclude `.gitignore` paths and secret files.
- Refresh on release or weekly.
- Commit with message like:
  - `docs(nlm): refresh repomix outputs for NotebookLM`
