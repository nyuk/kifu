# Repomix 업로드 절차

목표: 코드베이스를 NotebookLM용으로 압축 정리하고 Git에서 버전관리한다.

## 1) 환경 준비
- Node: 이미 설치됨 (`node`/`npm` 사용 가능)
- repomix 설치(1회):
  - `npm i -D repomix`
  - 또는 `npm exec --yes repomix -- --version` 확인

## 2) 산출물 생성(권장 4개 분할)
- 백엔드: `backend`
- 프런트: `frontend`
- 문서: `docs`
- 테스트/스크립트: `backend`, `frontend`, `scripts`, `docs`

## 3) 기본 실행 예시
```bash
mkdir -p docs/nlm/repomix-output
npx repomix backend --output docs/nlm/repomix-output/backend.md --include "**/*.go"
npx repomix frontend --output docs/nlm/repomix-output/frontend.md --include "**/*.{ts,tsx}"
npx repomix docs --output docs/nlm/repomix-output/docs-summary.md --include "**/*.md"
```

## 4) 커밋 규칙
- 산출물은 `docs/nlm/repomix-output/`에 저장
- 매 릴리스 또는 주 1회 갱신
- 커밋 메시지 예시: `docs(nlm): refresh repomix outputs for notebooklm`

## 주의
- `.gitignore` 또는 민감 파일은 출력 대상에서 제외
- 로그 파일, 키/비밀정보 파일, `.env`는 절대 포함하지 않음
- repomix가 장시간 걸리는 경우, 경로별 분할 실행으로 실패 지점을 줄임
