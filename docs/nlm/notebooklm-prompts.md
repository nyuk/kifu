# NotebookLM 바로 사용 프롬프트 모음

## 공통 오프닝 템플릿
- "지금부터 이 문서셋을 유일한 근거로 사용해. 추측이 필요하면 `추측` 표시하고 근거 파일명을 붙여줘. 답변은 한국어로 해줘."
- "요약은 8줄 이내, 액션은 번호순으로."

## 1) 기능 이해용 (Context Warmup)
- "다음 기준으로 summarize 해줘: `Summary Pack v1.1` 핵심 변경 이력, 인증 기준, 실패 케이스."
- "이 프로젝트의 `/api/v1/packs/generate-latest` 호출 경로를 엔드투엔드로 설명해줘. 관련 파일: `backend/internal/interfaces/http/routes.go`, `backend/internal/interfaces/http/handlers/pack_handler.go`, `backend/internal/infrastructure/repositories/run_repository_impl.go`."
- "`docs/spec/summary-pack-v1.md`와 `docs/runbook/summary-pack-v1.md` 차이점을 비교하고, 운영 팀이 꼭 알아야 할 포인트만 5개 뽑아줘."

## 2) 디버그용 (실패 진단)
- "아래 에러 로그 기준으로 원인 가설 3개 + 검증 절차 3개를 우선순위로 정리해줘: NO_COMPLETED_RUN / 404 / 타 사용자 데이터 노출 가능성."
- "로그: (원본 로그 붙여넣기). 관련 함수/쿼리를 추적해서 root cause 후보를 후보군별로 정리하고, 영향 범위를 표시해줘."
- "`generate-latest` 호출 직후 `GET /api/v1/packs/{pack_id}` 조회가 실패한다. 재현/검증 체크리스트 10단계와 `pack_id` 추적 포인트를 만들어줘."
- "디버그 후 수정이 끝나면 PR 리뷰 전에 `기대 동작`, `실제 동작`, `차이`, `회귀 리스크`를 표로 만들어줘."

## 3) 보안 점검용
- "현재 구조에서 사용자 스코프 분리를 위협할 수 있는 지점 5개와 완화 방안을 만들어줘."
- "민감정보 노출 위험 관점에서 `.env`, 로그, 에러 응답, API 메시지를 기준으로 점검 체크리스트를 만들어줘."
- "NO_COMPLETED_RUN 같은 비정상 응답을 사용자에게 노출할 때의 오해 포인트와 문구 가이드를 만들어줘."

## 4) 운영/변경 관리용
- "다음 스프린트 브리핑용으로, 최근 1주 변경사항(커밋 기준)을 `기능/테스트/위험/다음 액션` 4분면으로 정리해줘."
- "배포 전 smoke test용 checklist를 만들어줘. 최소 조건: 로그인, generate-latest 호출, pack 조회, 실패 케이스 2개."
- "변경 후 rollback 판정 기준(가시적 장애, 사용자 데이터 오염, 응답 SLA 위반)을 수치로 정의해줘."
- "이 저장소 기준으로 장애 트리아지 트리(Severity 1~3)와 대응 주체(개발/QA/운영)를 제안해줘."

## 5) 코드 리뷰/리팩토링용
- "repomix 산출본을 기준으로 중복/불일치된 개념을 찾아줘. 특히 `pack`, `run`, `summary` 용어 정합성을 체크."
- "현재 백엔드/프론트 경계를 기준으로 책임 분리 위반 후보 5개, 수정 방향을 제안해줘."
- "`generate-latest` 변경으로 생긴 사이드 이펙트 후보를 예상하고 최소 수정안으로 정리해줘."

## 6) 새 채팅 시작용 고정 문구 (복붙)
- "이 세션은 `docs/nlm/context-summary.md`, `docs/nlm/architecture.md`, `docs/nlm/repomix-output/*` 기준으로 이어서 진행. 추측은 추측으로 표시하고 파일 근거를 붙여줘."
