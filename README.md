# KIFU — Trading Journal + AI Review Platform

`KIFU`는 거래·포트폴리오·AI 의견·결과를 한 프레임에서 연결해 복기(Review)하는 웹서비스입니다.  
개별 매매 판단을 기록하고, 과거 데이터를 기반으로 AI 판단 정확도와 실제 결과를 비교해 판단 퀄리티를 개선합니다.

## 한 줄 설명

트레이더가 거래 기록을 남기고, 복기·차트 리플레이·AI 비교 분석까지 한 번에 수행할 수 있는 종합 회고 플랫폼입니다.

## 핵심 기능

- 거래·포트폴리오 수집(거래소 동기화, CSV 임포트, 수동 입력)
- 버블(판단 이벤트) 생성 및 AI 의견 수집
- 복기(Review) 세션: Layer 기반 질문형 복기, 감정/패턴 기록, 스트릭 관리
- 차트 리플레이 + 거래/버블/AI 의견 시계열 비교
- AI 정확도/성과 분석 대시보드(프로바이더/기간/심볼 기준)
- 알림/브리핑, 안전성 점검, 사용자 토큰 관리
- 요약 팩(Summary Pack) 생성/조회
  - v1.0: 기존 `source_run_id` 기반 생성 플로우
  - v1.1: 최신 완료 run 자동 선정 API(`generate-latest`)로 간소화

## 배포/실행 목적

- 실거래 판단의 재현성 확보
- 과거 판단 패턴 가시화
- AI 조언의 품질 추적과 개선 피드백
- 주간/월간 복기 루틴 자동화

## 빠른 시작

```bash
# 프로젝트 루트
git clone https://github.com/nyuk/kifu.git
cd kifu-project
```

### Backend

```bash
cd backend
cp .env.example .env
go mod download
go run ./cmd
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## 실행 포인트 (기본)

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`
- PostgreSQL: `localhost:5432`

## 아키텍처

- **Backend**: Go + Fiber
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **DB / Infra**: PostgreSQL, Redis, Docker
- **AI**: OpenAI / Claude / Gemini (기능 플래그 및 키 기반)

## 리포지토리/문서

- 설계: `docs/01-plan/*`, `docs/02-design/*`
- 분석/리스크: `docs/03-analysis/*`
- 스펙: `docs/spec/*`
- 운영/QA: `docs/runbook/*`, `docs/04-report/*`
- v1.1 지식 베이스: `docs/nlm/*`

## 개발 상태

- 기본 목표: 복기/리뷰/차트/성과 비교의 통합된 사용자 루틴 제공
- 현재 진행: Summary Pack v1.1 확장(자동 최신 run 선택) 반영
- 보안 정책: 민감정보 마스킹, 사용자 스코프 분리, 에러 응답의 보안성 유지

## GitHub 소개(About) 추천 설정

### Description

`Trading journal and AI review platform for retrospective analysis: bubbles, portfolio, chart replay, and AI comparison.`

### Topics(권장)

`trading`, `journal`, `trading-journal`, `review`, `nextjs`, `go`, `fiber`, `ai`, `web`, `portfolio`, `chart`

## 트위터(현재 X) 마케팅 가이드

- 이 저장소의 핵심 메시지: **“거래 기록을 복기와 결정 추적으로 바꾸는 플랫폼”**
- 자세한 시작 가이드: `docs/marketing/twitter-playbook.md`

## 라이선스

현재 사내/개인 프로젝트 문서와 소스는 별도 라이선스 정책을 따릅니다.  
배포 전 `LICENSE` 파일/프로젝트 정책을 확인하세요.

