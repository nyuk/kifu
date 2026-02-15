# kifu-project NLM Knowledge Base (NotebookLM용)

이 디렉터리는 새 채팅에서 계속 이어가기 위해 코드를 **재구성하여** 제공하는 정리본이다.

원칙
1. Git 소스코드가 최종 진실(ground truth)이다.
2. 이 문서는 NotebookLM용 압축 지식으로 사용한다.
3. 민감정보(키/비밀번호/토큰/개인정보)는 저장하지 않는다.
4. 버전은 커밋 단위로 고정하고 항상 최신화한다.

최종 갱신
- branch: `main`
- last_commit: `3629cb0`
- last_updated_at: `2026-02-15`

구성
- `context-summary.md`: 현재 상태 핵심 한줄 요약
- `architecture.md`: 백엔드/프런트 구성과 흐름
- `api-endpoints.md`: API 목록과 응답 규칙
- `debug-playbook.md`: 에러 대응, 재현, 검증 체크리스트
- `security-baseline.md`: 보안 기본 규칙 및 대응 체계
- `mindmap-notebooklm.md`: 핵심 개념 연결 마인드맵
- `repomix/README.md`: repomix 생성 규칙과 갱신 절차

NotebookLM 프롬프트 기본 템플릿
- "이번 대화는 docs/nlm 기준으로만 답변. 추측이면 `추측`으로 표시하고 근거 파일명을 붙여줘."
- "요청: 에러 로그 기준 원인 가설 3개 + 최소 수정안만 제시. 각 안에 영향 범위/검증 포인트를 달아줘."
- "요청: 이번 주 변경 내역을 generate-latest 플로우 중심으로 시간순으로 정리해줘."

## NotebookLM 업로드 실행 순서 (권장)

### 1) 업로드 전 점검
- 업로드 대상 폴더 확인:
  - `docs/nlm/repomix-output/backend.md`
  - `docs/nlm/repomix-output/frontend.md`
  - `docs/nlm/repomix-output/docs.md`
  - `docs/nlm/repomix-output/project-summary.md`
- 최신성 확인:
  - `docs/nlm/context-summary.md`의 커밋 라인이 직전 변경 커밋을 반영하는지 확인
  - `README.md` 및 핵심 문서에서 `/api/v1/packs/generate-latest` 기준이 맞는지 확인
- 민감정보 점검:
  - `.env`, API Key/Secret, 개인식별정보, 계좌/로그인 관련 원문이 없는지 재확인

### 2) 추천 업로드 순서(검색 효율 극대화)
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

### 3) 업로드 후 즉시 질문 템플릿
- "이 문서셋을 기준으로 `generate-latest` 플로우 의존성 지도를 8줄로 정리해줘."
- "실패 시나리오 3개(NO_COMPLETED_RUN, 500, 사용자 스코프 이슈) 기준으로 원인 가설을 우선순위로 정리해줘."
- "보안 기준으로 위험 요소 5개와 대응 체크리스트를 생성해줘."
- "다음 배포 전 점검 항목 10개로 체크리스트 만들어줘."

### 4) 업데이트 루틴
- 수정이 있을 때마다 repomix 산출본을 갱신 후 같은 파일을 덮어쓴다.
- 새 채팅 첫 메시지 시작 문구:
  - "`docs/nlm/context-summary.md`와 `docs/nlm/repomix-output/*` 기준으로 이어서."
- 작업 후 `/api/v1/packs/{id}` 조회 결과를 `debug-playbook.md`에 메모(성공/실패/원인).
