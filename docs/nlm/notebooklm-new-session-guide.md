> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# New NotebookLM Session Guide (v1.0-first)

## 1) Rules to keep enabled

- v1.0 is baseline.
- v1.1 belongs only to appendix.
- Use 3 sections only:
  - `[v1.0 baseline]`
  - `[v1.1 changes]`
  - `[conflicts / misunderstandings]`
- Mark assumptions clearly.

## 2) Upload order

1. `docs/nlm/context-summary.md`
2. `docs/nlm/architecture.md`
3. `docs/nlm/api-endpoints.md`
4. `docs/nlm/debug-playbook.md`
5. `docs/nlm/security-baseline.md`
6. `docs/nlm/v1.0-system-overview.md`
7. `docs/runbook/summary-pack-v1.md`
8. `docs/03-analysis/kifu-full-project.analysis.md`

## 3) Optional appendix (after core)

- `docs/adr/0002-summary-pack-v1.1-decisions.md`
- `docs/spec/summary-pack-v1.md`
- `docs/nlm/repomix-output/*`

## 4) Session close rules

- Update `docs/nlm/context-summary.md` with last run timestamp.
- Update `README.md` metadata if commit pointer changes.
