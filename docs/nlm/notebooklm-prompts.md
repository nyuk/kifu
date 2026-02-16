> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# NotebookLM Prompt Library

## Core response format (required)

- Always answer with exactly 3 sections:
  - `[v1.0 baseline]`
  - `[v1.1 changes]`
  - `[conflicts / misunderstandings]`

## Grounding rule

- Base claims on v1.0-first sources first:
  1) `docs/nlm/architecture.md`
  2) `docs/spec/summary-pack-v1.md` (or equivalent)
  3) endpoint and handler files.
- Add v1.1 only in the dedicated appendix.

## Useful prompt templates

- "Summarize the current generate-latest flow in 8 lines with file evidence."
- "Debug this failure: NO_COMPLETED_RUN, 404, cross-user data leak. Provide ranked hypotheses and minimal fixes."
- "Compare v1.0 vs v1.1 for generate-latest in operation terms for on-call handoff."
- "Create a 10-step rollback/triage checklist for generate-latest deployment.
"
