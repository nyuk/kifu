# NotebookLM 핵심 마인드맵

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
  BR --> R1["/api/v1/packs/generate-latest"]
  BH --> H1[pack_handler.go]
  BL --> H2[run_repository.go]
  BL --> H3[run_repository_impl.go]
  
  F --> FC[ExchangeConnectionManager.tsx]
  FC --> FB["Button: 팩 생성(30d)"]
  FB --> R1
  
  D --> DS[spec/summary-pack-v1.md]
  D --> DR[runbook/summary-pack-v1.md]
  D --> DA[adr/0002-summary-pack-v1.1-decisions.md]
  
  R --> RT["Smoke test"]
  RT --> T1[generate-latest 호출]
  RT --> T2[/api/v1/packs/{id} 조회]
  RT --> E1[NO_COMPLETED_RUN]
  
  S --> ST[Scope 분리]
  S --> SK[Secret 관리]
  S --> SM[민감정보 마스킹]
```

## 사용법
- 이 파일은 노트북LM에서 개념 관계를 빠르게 복원할 때 참고
- 에러 토의 전에 이 맵으로 영향 범위를 먼저 정한 뒤 세부 파일로 내려가야 함
