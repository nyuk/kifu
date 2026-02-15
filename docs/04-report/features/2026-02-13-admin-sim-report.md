# 2026-02-13 Admin Sim Report (시간 압축 사용자 테스트)

## 1) 목적

실사용 한 달 흐름을 기다리지 않고 현재 시점에서 압축 검증할 수 있도록,
거래/버블/복기 루틴을 날짜 단위로 자동 실행하는 진단 도구를 추가했다.

## 2) 구현 범위

- 백엔드 API
  - `POST /api/v1/admin/sim-report/run`
  - 인증 사용자 기준으로 `N일(기본 30일, 최대 90일)` 시뮬레이션 실행
  - 실행 대상 모드:
    - `self`: 현재 로그인 사용자 계정에 직접 적재
    - `sandbox`: 테스트 전용 계정(`sim.<owner>@kifu.local`) 자동 생성/재사용
  - `sandbox_reset=true` 시 sandbox 계정의 이전 테스트 데이터 정리 후 새 실행
  - 항목:
    - synthetic trade 생성
    - synthetic bubble 생성
    - Guided Review `today(date override)` 생성/조회
    - Guided Review item submit + complete
    - Review note 생성
    - Alert rule 생성 후 정리(delete)
    - AI provider/key 점검(AI probe)
  - 반환:
    - 전체 집계(생성/제출/완료/무거래일/노트/알림/AI probe)
    - streak 결과
    - 일자별 상세 결과/에러 + 단계 로그(`steps`)

- 프론트 UI
  - 경로: `/admin/sim-report`
  - 기능:
    - 실행 파라미터 입력(`days`, `start_date`, `no_trade_rate`, `seed`, `timezone`)
    - 기능 토글(`include_notes`, `include_alerts`, `include_ai_probe`)
    - 실행 대상 토글(`sandbox`/`self`)
    - sandbox email/password 지정(선택), reset on run 옵션
    - 실행 결과 요약 카드
    - 일자별 결과 테이블 + 단계 로그 표시
    - warning 표시

- 진입 경로
  - Settings 탭에 `시뮬레이터 열기` 링크 추가

## 3) 변경 파일

- `backend/internal/interfaces/http/handlers/sim_report_handler.go` (신규)
- `backend/internal/interfaces/http/routes.go`
- `frontend/app/(app)/admin/sim-report/page.tsx` (신규)
- `frontend/src/components-old/Settings.tsx`

## 4) 검증

### Backend
- `cd backend && go test ./...` : PASS

### Frontend
- `cd frontend && npm run lint` : PASS (기존 warning 34건 유지)
- `cd frontend && npm run typecheck` : PASS
- `cd frontend && npm run build` : PASS

### CLI Smoke
- 임시 사용자 등록/로그인 후 시뮬레이션 API 호출:
  - `POST /api/v1/admin/sim-report/run` with `{"days":2,"timezone":"UTC","no_trade_rate":0.2,"seed":42}`
  - 응답 필드 `days=2`, `results` 존재 확인
  - 결과: PASS

## 5) 주의사항

- 시뮬레이터는 실제 DB에 synthetic trade/bubble/review 데이터를 기록한다.
- 운영 환경에서는 관리자 권한/환경 플래그 기반 접근 제한이 필요하다.
