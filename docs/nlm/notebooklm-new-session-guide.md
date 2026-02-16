> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# 새 NotebookLM 세션 시작 가이드 (v1.0 전면 우선)

## 1) 이 노트북의 규칙 (반드시 상단 고정)
- v1.0이 기본 기준이다.
- v1.1(`generate-latest`)은 변경/확장 사항으로만 부록 처리한다.
- 답변은 항상 `[v1.0 기준]`, `[v1.1 변경사항]`, `[충돌/오해 포인트]` 3섹션으로 제한한다.
- 추측은 `추측` 표시 + 근거 파일명 기재.

## 2) 업로드 권장 순서(새 노트북)

### A. 핵심 기준문서 (먼저 업로드)
1. `docs/nlm/README.md`
2. `docs/nlm/notebooklm-prompts.md`
3. `docs/nlm/context-summary.md`
4. `docs/nlm/v1.0-system-overview.md`
5. `docs/nlm/architecture.md`
6. `docs/02-design/features/guided-review.design.md`
7. `docs/02-design/features/alert-notification.design.md`
8. `docs/03-analysis/kifu-full-project.analysis.md`
9. `docs/spec/summary-pack-v1.md`

### B. 운영/디버그/보안 (둘째 단계)
10. `docs/runbook/summary-pack-v1.md`
11. `docs/nlm/debug-playbook.md`
12. `docs/nlm/security-baseline.md`

### C. 변경사항(부록 단계, 마지막)
13. `docs/adr/0002-summary-pack-v1.1-decisions.md`
14. `docs/nlm/repomix-output/project-summary.md` (필요 시)
15. `docs/nlm/repomix-output/backend.md` (필요 시)
16. `docs/nlm/repomix-output/frontend.md` (필요 시)
17. `docs/nlm/repomix-output/docs.md` (필요 시)

## 3) 새 세션 시작 프롬프트(복붙)
`다음 규칙으로만 대화해줘. 기준은 v1.0-system-overview.md와 docs/nlm/architecture.md야.  
모든 답변은 `[v1.0 기준]`, `[v1.1 변경사항]`, `[충돌/오해 포인트]` 3섹션으로 고정해줘.  
v1.0에 없는 내용은 본문에 넣지 말고 `[v1.1 변경사항]`으로만 둬.  
근거 파일명과 라인 단서(가능하면)를 붙여줘. 추측이면 `추측`이라고 표시해줘.`

## 4) 사용 후 정리(매 1회)
- 각 세션 종료 시 `docs/nlm/context-summary.md` 하단에 마지막 업데이트 일시만 갱신.
- 주요 변경이 생기면 `README.md`의 `최종 갱신` 항목도 즉시 갱신.
- 코드 단위 추가/수정 후에는 관련 문서(Architecture/API/요약)만 재업로드하면 된다.

