> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as appendix sections only.
> - Korean is optional supplementary context.

# NotebookLM Concept Mindmap

```mermaid
graph TD
  K[kifu-project]
  K --> B[Backend]
  K --> F[Frontend]
  K --> D[Docs]
  K --> R[Runbook]
  K --> S[Security]
  
  B --> BR[Routes]
  B --> BH[Handlers]
  B --> BL[Repository]
  BR --> R1["POST /api/v1/packs/generate-latest"]
  BH --> H1[pack_handler.go]
  BL --> H2[run_repository.go]
  BL --> H3[run_repository_impl.go]
  
  F --> FC[ExchangeConnectionManager.tsx]
  FC --> FB["Generate Pack (30d)"]
  FB --> R1
  
  D --> DS[docs/spec/summary-pack-v1.md]
  D --> DR[docs/runbook/summary-pack-v1.md]
  D --> DA[docs/adr/0002-summary-pack-v1.1-decisions.md]
  
  R --> RT[Smoke test]
  RT --> T1[generate-latest]
  RT --> T2[GET /api/v1/packs/{id}]
  RT --> E1[NO_COMPLETED_RUN]
  
  S --> ST[Scope isolation]
  S --> SK[Secret handling]
  S --> SM[Data masking]
```

Use this map when tracing impact before deep file review.
