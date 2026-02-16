![KIFU](frontend/public/logo/kifu-logo-wordmark.svg)

# KIFU

**거래 복기(Review)와 AI 검증을 연결하는 트레이딩 저널 플랫폼**

![KIFU Hero](docs/marketing/assets/readme-hero-home.svg)

KIFU는 거래 기록을 남기고, 과거 판단을 다시 점검하며, AI 의견과 실제 성과를 비교해 **결정 품질을 개선**하는 워크플로우를 만드는 프로젝트입니다.

## 한 줄 소개

- 거래·포트폴리오·AI 의견을 한 곳에서 관리
- 과거 판단 패턴을 구조화해 반복 개선
- 차트/버블/AI 분석을 결합한 리뷰 루틴 제공

## 프로젝트가 해결하는 문제

1. 거래 후 복기 데이터가 파편화되어 판단 근거를 잃어버림
2. AI 조언을 실제 성과와 비교하지 못해 체감 품질 판단이 어렵다
3. 정해진 주기 리뷰 루틴이 깨져 개선 포인트가 누적되지 않음

KIFU는 위 문제를 **데이터 수집 → 이벤트 기록 → 복기 세션 → 분석/리포트**의 일관된 흐름으로 해결합니다.

## 주요 기능

- 거래·포트폴리오 수집(거래소 동기화, CSV 임포트, 수동 입력)
- AI 의견 기록과 신뢰도 기반 비교 분석
- 복기 세션: 감정, 패턴, 근거를 한 번에 남기는 Layer 질문형 흐름
- 버블(판단 이벤트) 타임라인 + 차트 리플레이 대조
- 요약 대시보드 및 성과 지표 정리
- 알림/보안/토큰 관리를 포함한 운영성 향상 기능

## Summary Pack

### v1.0 (기본 컨셉)
- 사용자가 `source_run_id`를 직접 지정해 요약 팩을 생성
- 명확한 데이터 소스 제어와 재현성에 초점

### v1.1 (확장)
- 인증된 사용자의 최신 완료 run을 시스템이 자동 선택
- `POST /api/v1/packs/generate-latest` 추가
- 완료 run 미존재 시 `NO_COMPLETED_RUN`으로 명시 실패

> 전체 스펙은 `docs/spec/summary-pack-v1.md`, 운영은 `docs/runbook/summary-pack-v1.md` 참고

## 기술 스택

- Backend: **Go + Fiber**
- Frontend: **React + TypeScript + Vite**
- Data: **PostgreSQL, Redis**
- AI: OpenAI / Claude / Gemini (토글 기반)

## 빠른 시작

```bash
# 1) 저장소 클론
# git clone https://github.com/nyuk/kifu.git
cd kifu-project

# 2) 백엔드
cd backend
cp .env.example .env
go mod download
go run ./cmd

# 3) 프론트엔드 (새 터미널)
cd frontend
cp .env.example .env
npm install
npm run dev
```

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`

## 문서와 운영 가이드

- 설계: `docs/01-plan/*`, `docs/02-design/*`
- 분석: `docs/03-analysis/*`
- 스펙: `docs/spec/*`
- 운영/QA: `docs/runbook/*`
- NLM/요약 리포트 준비: `docs/nlm/*`

## GitHub 저장소 소개(About) 설정 추천

### Description
`Trading journal and AI review platform for retrospective analysis: bubbles, portfolio, chart replay, and AI comparison.`

### Topics 추천
`trading`, `journal`, `trading-journal`, `review`, `go`, `fiber`, `react`, `vite`, `ai`, `portfolio`, `chart`

## 마케팅 시작 가이드

- X(트위터) 계정 운영 가이드는 `docs/marketing/twitter-playbook.md`
- 게시물 운영 샘플 JSON: `docs/marketing/x-post-queue.sample.json`
- 제품 핵심 메시지: "거래 기록을 복기와 결정 추적으로 바꾸는 플랫폼"

## Contributing

이 레포는 현재 개선 중인 진행형 프로젝트입니다. 기능 제안, 버그 재현, 기획 피드백 모두 환영합니다.

1. 이슈 또는 PR로 제안
2. 변경 범위(기능, 스펙, 테스트 범위) 명시
3. 운영 영향(보안/데이터/성능) 체크

## 라이선스

현재 프로젝트는 내부 정책 및 배포 목적에 따라 라이선스 적용이 분리될 수 있습니다. 배포 전 `LICENSE` 또는 프로젝트 라이선스 정책을 확인하세요.
