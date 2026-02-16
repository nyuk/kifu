> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# kifu-project NLM Knowledge Base (for NotebookLM)

This directory contains a compressed, reusable knowledge set for continuation sessions.

## Use rules

1. Source of truth remains repository code.
2. This is a compression layer for NotebookLM ingestion.
3. Do not include secrets (keys, tokens, PII).
4. Keep version snapshots aligned to commit boundaries.

## Snapshot metadata

- branch: `main`
- last_commit: `3629cb0`
- last_updated_at: `2026-02-15`

## File roles

- `context-summary.md`: latest state summary
- `v1.0-system-overview.md`: v1.0 baseline
- `architecture.md`: backend/frontend flow
- `api-endpoints.md`: endpoint catalog and response contracts
- `debug-playbook.md`: failure triage and reproduction
- `security-baseline.md`: security checks and constraints
- `mindmap-notebooklm.md`: concept map
- `repomix/README.md`: repomix generation and refresh rules

## Recommended upload order (for new NotebookLM instance)

1. `docs/nlm/context-summary.md`
2. `docs/nlm/architecture.md`
3. `docs/nlm/api-endpoints.md`
4. `docs/nlm/debug-playbook.md`
5. `docs/nlm/security-baseline.md`
6. `docs/nlm/mindmap-notebooklm.md`
7. `docs/nlm/repomix-output/backend.md`
8. `docs/nlm/repomix-output/frontend.md`
9. `docs/nlm/repomix-output/docs.md`
10. `docs/nlm/repomix-output/project-summary.md`

## Operational prompt baseline

- Keep answers in `[v1.0 baseline]` and `[v1.1 changes]` sections only.
- If a claim is uncertain, mark it as `Assumption` and cite the file.

## Version order requirement

- Always process v1.0 docs first.
- Place extension topics in v1.1 appendix.
- Do not mix v1.1 behavior into the v1.0 baseline body.
