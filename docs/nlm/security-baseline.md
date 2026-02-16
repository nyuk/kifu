> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# 보안 베이스라인

## 기본 원칙
- 비밀정보는 `.env`, CI Secret, vault, 또는 보안 비밀 저장소만 사용
- 코드/문서에는 토큰, API 키, DB 비밀번호, 개인정보를 넣지 않음
- 사용자 스코프 조건은 항상 쿼리와 서비스 레이어에서 이중 확인

## 인증/권한
- API는 인증 토큰 기반으로 사용자 식별
- `generate-latest`는 호출자 사용자 식별자로만 run/pack을 조회
- 테스트/디버그 로그에 `Authorization` 값이 노출되지 않게 마스킹

## 민감정보 처리 정책
- 로그: JWT, 쿠키값, 거래 데이터, 계좌/포트폴리오 원본 식별자 마스킹
- Git: `.env`, `backend-run.log` 등 민감 환경 로그는 업로드 대상에서 제외
- 협업 공유: 공유 전 문서에서 사용자 이메일/도메인 노출 최소화

## 보안 점검 항목 (월 1회)
1. run/pack 조회 쿼리에서 사용자 범위 조건 누락 여부
2. NO_COMPLETED_RUN 경로의 상세 에러 메세지 과다 노출 여부
3. 디버그 노트/노트북 업로드 문서의 PII 누락 검사
4. 배포/CI 로그에서 임시 토큰/키 잔존 여부
