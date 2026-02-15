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
