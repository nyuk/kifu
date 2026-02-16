> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# Multi-Model, Multi-Agent Token Optimization Playbook

Goal: keep quality stable while reducing unnecessary context and token use.

## 1) Unit of cost to optimize

- Chat subscriptions (Claude/Gemini/other UIs) usually consume usage quotas.
- API usage (Codex/CLI agents) is usually request/budget based and affected by spend and rate limits.
- This matters because total bill is decided by how much context you feed the agent, not only by model output size.

## 2) Recommended execution order

1. Run local tooling first (`go test`, `npm run lint`, `npm run build`).
2. Use diff-based snippets only.
3. Keep context windows narrow:
   - Provide changed files and around-20-line neighbors.
   - Avoid sharing full large files unless required.
4. Let the model reason on minimal evidence + exact ask.

## 3) Message format (every request)

- Problem statement: one sentence.
- Scope: files / routes / test area.
- Constraints: backward compatibility, security, tests.
- Output requirement:
  - Patch or diff-first
  - Max 10-line explanation summary.

## 4) Debugging workflow

- 1st pass: reproduce with exact command.
- 2nd pass: capture only 20 lines around failing log and previous 50 lines.
- 3rd pass: ask for 3 hypotheses + 1 minimal fix each.

## 5) Model routing recommendation

- Default: one primary builder model.
- Secondary reviewer: only for final validation or review.
- Escalate to larger model only on hard blocks (no automatic roundtrip every change).

## 6) Anti-patterns

- Don’t paste full codebases.
- Don’t ask the same problem in multiple models before one result is digested.
- Don’t request unrestricted broad refactors for small behavior changes.

## 7) Security reminders

- Never share `.env`, tokens, private keys, or PII snapshots in prompts.
- Never request sensitive logs unless explicitly required.
- Hide/abbreviate session IDs and tokens in any shared output.
