> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# KIFU

**거래 복기와 AI 검증을 통해 의사결정 품질을 개선하는 트레이딩 저널 플랫폼**

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md)

KIFU는 거래/포트폴리오 활동을 다음 루프로 정리합니다.
- 거래·포트폴리오 이벤트 수집
- 판단 기록과 복기 노트 작성
- AI 의견을 실제 결과와 비교
- 지속적인 의사결정 개선

## KIFU가 해결하는 문제

1. 거래 후 데이터가 여러 도구로 분산되어 판단 근거가 사라짐
2. AI 조언을 실제 성과와 비교하기 어렵고 신뢰도 평가가 모호함
3. 복기 루틴이 불규칙해 개선 포인트가 축적되지 않음

KIFU는 이를 `수집 → 기록 → 복기 → 개선` 흐름으로 통합합니다.

## 현재 공개 기능 기준선 (2026-02-28)

- 거래·포트폴리오 수집(거래소 동기화, CSV 임포트, 수동 입력)
- 복기 워크스페이스(버블, 노트, Guided Review, Safety Review)
- 거래/포지션 KPI 요약 뷰
- 온체인 퀵 체크(Base ERC20 transfer 기반 facts pack)
- 관리자 워크스페이스(관리자 전용 정책/감사/운영 페이지)
- 인증:
  - 이메일/비밀번호
  - 구글 소셜 로그인

## 과금 개념 (Draft)

- **무료 플랜**: 말풍선 캔들 타임라인 중심의 기본 복기/포트폴리오 뷰
- **유료 전환 기준**: AI 의견 수집 건수를 기준으로 과금
  - 거래/이벤트마다 생성한 AI 의견을 저장할 때마다 **Opinion Credit** 1개 소모
  - 무료는 말풍선(캔들) 복기만 제공, AI 의견 수집은 횟수 제한 또는 제한해제되지 않음
  - 유료는 고빈도 AI 의견 수집 및 고급 분석 기능을 개방

### KIFU 2주 목표
- **1주차**
  - 과금 규칙 확정: 크레딧 정책, 무료 한도, 오버플로우 동작
  - 유료 전환 포인트 UI/문구 정비 및 이용자 가이드/온보딩 반영
- **2주차**
  - 결제 진입(포인트 구매) 흐름 및 사용량 대시보드 연결
  - 무료→유료 전환 퍼널 지표 수집 및 전환률 실험 실행

## Summary Pack

### v1.0 (기본)
- 클라이언트가 `source_run_id`를 직접 전달해 요약 팩 생성
- 소스 제어가 명확하고 재현성이 높음

### v1.1 (확장)
- 서버가 사용자의 최신 완료 run을 자동 선택
- 신규 API: `POST /api/v1/packs/generate-latest`
- 완료된 run이 없으면 `NO_COMPLETED_RUN` 반환

> 자세한 스펙: `docs/spec/summary-pack-v1.md`, 운영 가이드: `docs/runbook/summary-pack-v1.md`

## Onchain Quick Check (Base) — MVP

`POST /api/v1/onchain/quick-check`

- ERC20 Transfer(`alchemy_getAssetTransfers`) 기반의 결정론적 온디맨드 facts pack
- 10분 캐시 버킷 + IP 기준 레이트 리밋(분당 10회)
- 출력: 토큰 흐름 요약 + 경고(`LOW_ACTIVITY`, `HIGH_CONCENTRATION`, `TOO_MANY_UNIQUE_TOKENS`)
- 인증 필요: `Authorization: Bearer <JWT>`

예시:
```bash
curl -X POST "$API/api/v1/onchain/quick-check" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"chain":"base","address":"0x...","range":"30d"}'
```

## 예정/미구현 (공개 전)

- 운영 환경에서의 추가 소셜 로그인 제공자(카카오/네이버/애플)
- Opinion Credit 과금의 결제/체크아웃 전체 연동
- 관리자 운영 기능 고도화(자동화 제어/심화 메트릭)

## 아키텍처

- Backend: Go + Fiber
- Frontend: Next.js + TypeScript
- Data: PostgreSQL
- AI Provider: OpenAI / Claude / Gemini (서버 정책/자격 증명 기준으로 활성화)

## 빠른 시작

```bash
# 저장소 복사
# git clone https://github.com/nyuk/kifu.git
cd kifu-project

# Backend
cd backend
cp .env.example .env
go mod download
go run ./cmd

# Frontend (새 터미널)
cd frontend
cp .env.example .env
npm install
npm run dev
```

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`

## 문서

- 설계: `docs/01-plan/*`, `docs/02-design/*`
- 스펙: `docs/spec/*`
- 운영: `docs/runbook/*`
- 제출 체크리스트: `docs/runbook/2026-02-19-submission-checklist.md`
- 게스트 데이터 주입: `docs/runbook/guest-demo-data-seeding.md`
- 분석: `docs/03-analysis/*`
- NLM 정리: `docs/nlm/*`
- 제출 요약: `SUBMISSION.md`
- 보안 상태: `SECURITY_STATUS.md`

## GitHub 소개 텍스트(About)

GitHub 저장소 소개글(About)은 기본적으로 단일 문구라서 기본 언어는 영어로 두고, 한국어는 리드미 링크로 제공하는 방식이 권장됩니다.

- 권장 설명
  - `Trading journal and AI review platform for retrospective analysis: bubbles, portfolio, chart replay, and AI comparison.`
- 권장 태그
  - `trading`, `journal`, `review`, `trading-journal`, `go`, `fiber`, `nextjs`, `typescript`, `ai`, `portfolio`, `chart`

## 마케팅

- X(트위터) 운영 가이드: `docs/marketing/twitter-playbook.md`
- 게시물 샘플: `docs/marketing/x-post-queue.sample.json`

## Contributing

1. Issue 또는 PR로 제안
2. 변경 범위와 동작 영향, 테스트 범위를 명확히 기술
3. 운영 영향(보안/데이터/성능)을 함께 정리

## 라이선스

배포 전 `LICENSE` 또는 프로젝트 정책을 확인하세요.
