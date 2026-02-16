> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# 공개 레포 시크릿 점검 리포트 (kifu)

작성일: 2026-02-09

## 1) HEAD 스캔 결과
- 실제 키/토큰 패턴(예: `sk-`, `sk-ant-`, `AIza`, `BEGIN PRIVATE KEY`) 없음.
- 환경변수 참조/예시만 존재.
- 로컬 전용 `.env` 파일은 Git 추적 제외 확인.

### 확인된 항목 (정상/예시)
- `docker-compose.yml`: `POSTGRES_PASSWORD` 등 환경변수 참조
- `.env.example`: 더미 값
- `backend/.env.example`: 더미 값
- `.github/workflows/claude.yml`: GitHub Secrets 참조
- `frontend/.env.example`: 공개 가능한 로컬 예시

## 2) 히스토리 스캔 결과
- Git 전체 히스토리 기준 시크릿 패턴 매칭 0건.

## 3) 정리 및 방지 조치
- `frontend/.env` 추적 제거, `.gitignore`에 추가.
- `.env.example` 유지.
- 과거 히스토리에서 `.env`/`docker-compose.yml` 제거 완료(필터 리라이트).

## 4) 남은 권장 조치
- GitHub Secret Scanning / Push Protection 활성화
- 정기적으로 gitleaks 등 CI 스캔 도입

## 결론
공개 레포 기준으로 실제 시크릿 노출 흔적 없음.
