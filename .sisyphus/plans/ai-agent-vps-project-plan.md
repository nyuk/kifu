# AI Agent Operations Expansion on VPS

## TL;DR

> **Quick Summary**: Unify KIFU’s AI execution layer, policy/runs governance, and context model so current OpenAI/Claude/Gemini flows and future local OpenAI-compatible providers can be operated as controlled agents on a low-cost VPS.
>
> **Deliverables**:
> - Provider abstraction layer that supports existing providers + configurable endpoint providers.
> - On-demand weekly/monthly summary generation and run-level telemetry for AI/summary workflows.
> - Domain-shared context model + governance controls for multi-project reuse.
> - Marketing/design pilot automation (content briefing only) as part of the same AI-operator platform.
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 6 waves
> **Critical Path**: AI provider abstraction -> run contract hardening -> summary run orchestration -> policy/admin rollout -> pilot execution

---

## Context

### Original Request
- 사용자 메시지에 있는 모든 영역을 누락 없이 실행 가능한 형태로 정리하고, 거래복기 프로젝트 중심으로 현실적으로 적용 가능한 AI 운영 구조를 수립하고자 함.
- 저비용 운영(Windows+소형 로컬 + VPS)에서 다중 프로젝트 운영 시 공통 도메인화 가능한 AI 오퍼레이터 계층이 필요.
- 1주/1달 요약은 기본 자동 생성 대신 우선 온디맨드로 검증.

### Interview Summary
- 목표 우선순위는 거래복기 핵심 실행 플로우, 나머지(온체인/결제/마케팅)는 공통 템플릿 방식으로 단계적 연결.
- 마케팅/디자인은 배제 대상이 아니라 스코프에 포함.
- 정책/감사/실행기록 구조는 보존하고 확장 기반으로 사용.

### Research Findings (from agents)
- AI 호출 체인: `backend/internal/interfaces/http/handlers/ai_handler.go`, `backend/internal/services/alert_briefing_service.go`, `backend/internal/interfaces/http/handlers/sim_report_handler.go`에 하드코드/중복 분기 존재.
- Run 조회/업데이트는 현재 `exchange_handler`/`import_handler`에 한정, 요약 생성/AI 오퍼레이션은 run 추적 미흡.
- 스키마는 확장 가능: `ai_providers`, `runs`, `admin_policies`는 문자열 기반 컬럼과 JSONB 메타로 초기 진입 장벽이 낮음.
- 정책은 코드 whitelist(`allowedAdminPolicyKeys`) 기반이라 새 정책은 백엔드/프론트 동시 반영 필요.

### Metis Review
- Missing scope guards identified around: provider 분기 포인트 누락, run 종료 상태 표준화 미흡, 정책 키/allowlist 확장 시 운영 UI 영향.
- 공통 가드: provider/run/state 변경은 단계적으로, 기존 동작은 Regression 테스트로 보존.

---

## Work Objectives

### Core Objective
`거래복기` 운영 흐름을 중심으로, 온디맨드 AI 요약/의견 생성/에이전트 실행을 `run` 가시성, 정책 게이트, 멀티 도메인 컨텍스트와 함께 안전하게 확장한다.

### Concrete Deliverables
- AI provider abstraction + local endpoint 지원
- 다층 run 정책(생성/상태/메타) 확장
- 온디맨드 1주/1개월 요약 가시화 + 실행 제어
- 도메인 템플릿 컨텍스트 저장소 베타 설계 및 결합 최소화
- Admin policy/run dashboard/allowlist/인증 상태의 확장

### Definition of Done
- [ ] 기존 OpenAI/Claude/Gemini 동작은 유지되고, 최소 하나의 로컬 OpenAI 호환 엔드포인트가 테스트 가능한 형태로 통합됨.
- [ ] `runs`가 요약 생성 + AI 의견 생성/에이전트 단계에 대해 추적할 수 있음.
- [ ] 정책 토글/감사 로그가 새 제어 플래그를 포괄.
- [ ] 마케팅 디자이너 지원 최소 플로우(요약/제안 생성 + 승인 요청) 구현됨.

### Must Have
- 기존 정책/감사/실행로그 시스템 유지.
- 기존 API/프론트 주요 UX(거래복기) 기능 불가침.
- 새 구조는 기존 `AI_REQUIRE_ALLOWLIST`, 월간 caps, 속도 제한을 존중.

### Must NOT Have (Guardrails)
- `admin_policy_handler` 화이트리스트를 업데이트하지 않고 정책 키를 노출하지 않는다.
- run/lifecycle 변경으로 기존 completed run 조회 API를 깨지 않는다.
- provider/credential 처리를 문자열 하드코드로 새로 늘리지 않는다.

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — 검증은 모두 에이전트 실행으로만 수행.

### Test Decision
- **Infrastructure exists**: YES (Go + Next/TypeScript)
- **Automated tests**: Tests-after
- **Framework**: backend `go test ./...`; frontend unit/CI commands existing when relevant (`npm run lint`, `npm run typecheck`)

### QA Policy
- 각 TODO는 최소 1개 정상 시나리오 + 1개 실패 시나리오를 가짐.
- Run/Policy/Provider 변경은 해당 엔드포인트/DB 상태를 curl + 코드로 검증.
- UI 검증은 Playwright 사용(모의 토큰/관리자 계정 기준).

### Evidence Path Convention
- `.sisyphus/evidence/task-<N>-<slug>.{log|png|json}`

---

## Execution Strategy

### Parallel Waves

Wave 1 (Foundation):
- Task 1: Schema foundation & config entities (low risk)
- Task 2: Provider registry and client interfaces (low risk)
- Task 3: Run state/type baseline changes (low risk)

Wave 2 (Backend provider core):
- Task 4: Refactor AI handler provider resolution path
- Task 5: Refactor alert briefing provider path to shared abstraction
- Task 6: Refactor sim-report provider availability checks

Wave 3 (Governance layer):
- Task 7: Run integration in pack generation and AI opinion request paths
- Task 8: Run repository validation + history endpoints/metrics alignment
- Task 9: Provider and policy endpoints for dynamic UI data

Wave 4 (Domain-context + onboarding):
- Task 10: 도메인-공유 컨텍스트 스키마 + 서비스 뼈대
- Task 11: 1주/1달 온디맨드 요약 API/서비스

Wave 5 (Frontend/admin integration):
- Task 12: AI provider UI 동적화 + 마케팅/정확도 차트 연계
- Task 13: 정책/텔레메트리 화면 확장

Wave 6 (Final verification):
- Task 14: End-to-end QA, rollback, and pilot hardening

---

## TODOs

- [x] 1. AI 프로바이더 공용 인터페이스 스펙 확정 및 어댑터 계약 문서화

  **What to do**:
  - `provider -> credentials -> call contract` 경계를 정리해 `AIProviderClient`, `AIInvocation`, `AIInvocationResult` 인터페이스를 정립한다.
  - `backend/internal/domain/entities/ai_provider.go`에 프로바이더 타입, 기본 URL/타임아웃/재시도 정책 메타 필드를 확장한다.
  - OpenAI 호출 방식은 1차로 `chat/completions` 통일을 기본값으로 규정하고 Responses API를 옵션에서 비활성화한다.
  - 로컬 OpenAI 호환 테스트 시나리오를 문서로 추가해, base URL/토큰 누락/타임아웃 응답 처리 예외를 정의한다.

  **Must NOT do**:
  - 기존 인증·정책 키를 문자열 하드코딩으로 분기 처리하지 않는다.
  - 현재 운영중인 `/v1/responses` 호출을 임의로 제거해 기존 호환성을 깨뜨리지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 도메인 공통 계약 설계와 향후 다중 프로바이더 확장성에 대한 아키텍처 결정을 요구함.
  - **Skills**: `kifu-domain`
    - 기존 정책/런/도메인 엔티티 간 경계를 보존하고 확장 포인트를 잡는 데 필요.
  - **Skills Evaluated but Omitted**: `playwright`, `git-master` — UI/SCM 작업이 핵심이 아님.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Task 1, Task 2)
  - **Blocks**: Task 2, Task 4, Task 5
  - **Blocked By**: None

  **References**:
  - `backend/internal/domain/entities/ai_provider.go`
  - `backend/internal/interfaces/http/handlers/ai_handler.go:resolveProviders` 

  **Acceptance Criteria**:
  - `go test ./backend/...` 실행 시 계약 정의 관련 타입 컴파일 오류 없음.
  - OpenAI 호출 계약 문서가 새 인터페이스에 부합함을 확인한다.

  **QA Scenarios**:
  - Scenario: 계약 정합성 체크
    - Tool: Bash (cat/grep + go test)
    - Preconditions: 계획 반영된 계약 파일 반영
    - Steps:
      1. `cd backend` 실행
      2. `go test ./internal/domain/...` 실행
      3. `grep -n "type AIInvocation" internal/domain/entities` 실행
    - Expected Result: 컴파일 PASS, 인터페이스 타입이 3개 프로바이더에서 공유 가능하게 조회 가능
    - Failure Indicators: 타입 불일치, `AIProviderClient` 미정의
    - Evidence: `.sisyphus/evidence/task-1-contract-smoke.log`

  - Scenario: OpenAI 통합 기본값 보존 실패 체크
    - Tool: Bash (go test)
    - Preconditions: 기본 값이 `chat/completions`로 지정됨
    - Steps:
      1. `go test ./internal/...` 실행
      2. 실패 테스트 없이 `provider default` 케이스 검색
    - Expected Result: 기본값이 유효하고, 기존 호출 체인이 즉시 깨지지 않음
    - Failure Indicators: 기본값 미설정 또는 Responses API만 참조
    - Evidence: `.sisyphus/evidence/task-1-default-client.log`

- [x] 2. Provider 저장소/레지스트리 조회 계층 정비

  **What to do**:
  - `backend/internal/infrastructure/repositories` 또는 신규 `services/ai_operator`에 provider 조회 레이어를 추가해 active/default provider를 일관되게 해석한다.
  - `ai_providers`에 endpoint 오버라이드 컬럼 및 timeout/limit 메타를 반영한다.
  - 키 우선순위를 사용자 키 → 사용자 default provider override → 시스템 기본값 순으로 명확히 정리한다.

  **Must NOT do**:
  - DB 조회 없이 고정 프로바이더 배열을 계속 사용하지 않는다.
  - policy/allowlist 없이 provider 사용 권한을 열어두지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 레이어 분리와 저장소 조회 구현이 비교적 국소적이며 빠르게 정리 가능.
  - **Skills**: `kifu-domain`
    - DB/도메인 경계 해석과 현재 정책 게이트 보존에 필수.
  - **Skills Evaluated but Omitted**: `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Task 1, Task 2)
  - **Blocked By**: Task 1
  - **Blocks**: Task 4, Task 5, Task 6, Task 7, Task 9

  **References**:
  - `backend/internal/domain/entities/ai_provider.go`
  - `backend/internal/infrastructure/repositories`
  - `backend/internal/interfaces/http/handlers/ai_handler.go:resolveAPIKey`

  **Acceptance Criteria**:
  - provider 조회 시 기본값과 토글 상태가 runbook 기준으로 일치함
  - allowlist 위반 시 호출이 차단되고 감사 이벤트가 남음

  **QA Scenarios**:
  - Scenario: 기본 provider 조회
    - Tool: Bash (go test)
    - Preconditions: provider 레지스트리 조회 함수 작성
    - Steps:
      1. `cd backend`
      2. `go test ./internal/infrastructure/repositories -run Provider`
    - Expected Result: 기본 provider 1건 이상 조회 성공, 비활성 provider 제외
    - Failure Indicators: 조회 실패, 기본값 누락
    - Evidence: `.sisyphus/evidence/task-2-provider-lookup.log`

  - Scenario: 정책 미준수 차단
    - Tool: Bash (go test)
    - Preconditions: allowlist 정책 테스트 케이스 설정
    - Steps:
      1. `go test ./internal/services/... -run Policy`
    - Expected Result: 허용되지 않은 정책 키에서 provider 조회 실패 및 오류 코드 반환
    - Failure Indicators: 정책 우회 호출 허용
    - Evidence: `.sisyphus/evidence/task-2-provider-policy-error.log`

- [ ] 3. Run 타입/상태 커버리지 확장 및 완료 조회 정책 정비

  **What to do**:
  - `backend/internal/domain/repositories/run_repository.go`와 구현체에 AI/summary 전용 run 타입 조회 옵션을 추가한다.
  - `GetLatestCompletedRun` 필터에 `ai_summary`/`ai_opinion`과 같은 신규 타입을 선택적으로 허용하는 인자를 추가하거나 별도 조회 API로 분리한다.
  - failed 경로에서 `finishedAt`가 항상 채워지도록 run lifecycle 정합성 체크를 추가한다.

  **Must NOT do**:
  - 기존 거래복기 run 조회 API 응답형을 깨뜨리지 않는다.
  - 상태 문자열을 enum으로 강제 바꾸지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 저장소 인터페이스/구현 변경이 명확하고 범위가 좁음.
  - **Skills**: `kifu-domain`
    - 도메인 계약 유지 및 SQL 접근 패턴 보존 판단.
  - **Skills Evaluated but Omitted**: `playwright`, `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Task 3)
  - **Blocked By**: None
  - **Blocks**: Task 4, Task 7, Task 11

  **References**:
  - `backend/internal/domain/repositories/run_repository.go`
  - `backend/internal/infrastructure/repositories/run_repository_impl.go`
  - `backend/internal/domain/entities/run.go`

  **Acceptance Criteria**:
  - `go test` 시 run 조회용 쿼리/구현이 컴파일되고 기존 테스트가 통과한다.
  - 기존 `exchange_sync`·`trade_csv_import` 완료 조회 결과는 변경 없음.

  **QA Scenarios**:
  - Scenario: 신규 run 타입 조회 스모크
    - Tool: Bash (go test)
    - Preconditions: 신규 run 타입 쿼리 분기 구현
    - Steps:
      1. `cd backend`
      2. `go test ./internal/infrastructure/repositories -run Run`
      3. `go test ./internal/domain/repositories -run GetLatestCompletedRun`
    - Expected Result: `ai_summary` 조회가 optional하게 동작하고 기존 타입 출력 불변
    - Failure Indicators: 기존 타입 누락 또는 신규 타입이 모든 조회를 덮어씀
    - Evidence: `.sisyphus/evidence/task-3-run-latest.log`

  - Scenario: 종료 run의 종료시각 일관성
    - Tool: Bash (go test)
    - Preconditions: failed/completed 경로 테스트 추가
    - Steps:
      1. `go test ./internal/services/... -run Run`
    - Expected Result: 상태가 failed/completed 시 `finishedAt` 누락 케이스 없음
    - Failure Indicators: 실패/완료시점이 비어 있음
    - Evidence: `.sisyphus/evidence/task-3-run-finishedAt.log`

- [ ] 4. AI Handler 분기 통합 및 공통 호출로 이관

  **What to do**:
  - `backend/internal/interfaces/http/handlers/ai_handler.go`의 `callProvider`/`callOpenAI`/`resolveAPIKey`를 공통 서비스 인터페이스에 맞춰 호출하게 리팩터링한다.
  - provider 명시/모델 해석 흐름을 공유 유틸로 추출한다.
  - 실패 메시지 포맷을 기존 API 에러 스키마(`code`,`message`)로 정규화한다.

  **Must NOT do**:
  - 현재 `/api/v1/ai` 엔드포인트 시그니처와 인증 미들웨어를 변경하지 않는다.
  - OpenAI와 Claude/Gemini 호출을 서로 다른 에러 처리 패턴으로 유지하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 핸들러 내 분기 정리를 수행하는 경량 수정.
  - **Skills**: `kifu-domain`
    - 도메인/서비스 경계를 유지하며 핸들러 책임을 제한.
  - **Skills Evaluated but Omitted**: `playwright`, `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (Task 4)
  - **Blocked By**: Task 1, Task 2, Task 3
  - **Blocks**: Task 6, Task 10, Task 11

  **References**:
  - `backend/internal/interfaces/http/handlers/ai_handler.go`
  - `backend/internal/interfaces/http/handlers/ai_handler.go:callOpenAI`

  **Acceptance Criteria**:
  - `/api/v1/ai`의 동일 입력에서 provider별 호출 실패/성공 처리 구조가 동일한 코드 경로를 거침.
  - 기존 정상 응답 스키마 유지.

  **QA Scenarios**:
  - Scenario: 공통 provider 경로 성공 호출
    - Tool: Bash (curl)
    - Preconditions: Mock API 키/모의 응답 설정
    - Steps:
      1. `API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}" TOKEN="${TOKEN:?set TOKEN}" curl -sS -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/ai" -d '{"provider":"openai","prompt":"ping"}'`
      2. 동일 payload로 `provider": "claude"`와 `"gemini"`를 연속 실행
      3. `jq`로 `code/message` 필드 검사
    - Expected Result: 각 응답이 동일한 JSON 에러/성공 envelope를 사용
    - Failure Indicators: provider별 응답 구조가 달라짐
    - Evidence: `.sisyphus/evidence/task-4-ai-handler-success.log`

  - Scenario: provider 불가 호출 거부
    - Tool: Bash (curl)
    - Preconditions: 허용되지 않은 provider/허가되지 않은 키
    - Steps:
      1. `API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}" TOKEN="${TOKEN:?set TOKEN}" curl -sS -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/ai" -d '{"provider":"unknown"}'`
      2. `curl -sS -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/ai" -d '{"provider":"openai","text":"x"}'`(필수 파라미터 미비)
    - Expected Result: 400 또는 허가 오류 응답
    - Failure Indicators: 기본 provider로 폴백되어 호출됨
    - Evidence: `.sisyphus/evidence/task-4-ai-handler-error.log`

- [ ] 5. Alert briefing Service provider 분기 통합

  **What to do**:
  - `backend/internal/services/alert_briefing_service.go`의 provider 분기 및 API 키 해석을 Task 4에서 정한 계약으로 이동한다.
  - OpenAI 호출 경로를 `chat/completions` 규격으로 통일하고, responses 전용 옵션을 게이트 플래그로 분리한다.
  - 알림 브리핑 요청과 실패 응답의 메타(logging)를 동일한 audit 포맷으로 정리한다.

  **Must NOT do**:
  - 기존 알림 플로우의 텍스트 처리/템플릿 동작을 변경하지 않는다.
  - `alert_briefing_service`의 예외 처리에서 원본 에러를 모두 마스킹하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 서비스 레이어 내 중복 제거 및 규격 통일이 목적.
  - **Skills**: `kifu-domain`
    - 서비스 경계 규칙 보존과 에러 스키마 일치 점검에 필요.
  - **Skills Evaluated but Omitted**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (Task 5)
  - **Blocked By**: Task 1, Task 2, Task 4
  - **Blocks**: Task 7

  **References**:
  - `backend/internal/services/alert_briefing_service.go`
  - `backend/internal/interfaces/http/handlers/ai_handler.go`
  - `backend/internal/domain/entities/ai_provider.go`

  **Acceptance Criteria**:
  - 기존 알림 브리핑 동작이 동일 response 형태로 유지되며 provider 분기 중복이 제거됨.
  - OpenAI 호출 포맷이 공통 계약과 일치함.

  **QA Scenarios**:
  - Scenario: alert briefing provider 전환
    - Tool: Bash (go test)
    - Preconditions: 서비스 단위 테스트/모의 핸들러 준비
    - Steps:
      1. `cd backend`
      2. `go test ./internal/services -run Alert`
    - Expected Result: openai/claude/gemini 경로 모두 동일한 결과 DTO 반환
    - Failure Indicators: provider별 결과 필드 불일치
    - Evidence: `.sisyphus/evidence/task-5-alert-refactor.log`

  - Scenario: 공통 메타 데이터 오류 보존
    - Tool: Bash (go test)
    - Preconditions: 오류 주입 fixture
    - Steps:
      1. `go test ./internal/services -run Alert -count=1`
    - Expected Result: 에러 응답 내 에러 코드/메시지 보존
    - Failure Indicators: 원인 메시지 손실
    - Evidence: `.sisyphus/evidence/task-5-alert-error.log`

- [ ] 6. AI probe 경로(시뮬) 통합 및 실제 호출 게이트웨이화

  **What to do**:
  - `backend/internal/interfaces/http/handlers/sim_report_handler.go`의 `runAIProbe`/`isProviderAvailableForUser` 로직을 공통 provider service로 연결한다.
  - 현재 synthetic response 우회 분기를 유지하되 실제 호출 경로 사용 시 audit/run telemetry를 기록하도록 전환 가능 플래그를 둔다.
  - 프로브에서 provider 가용성 체크 결과를 캐시하는 최소 TTL 정책을 추가한다.

  **Must NOT do**:
  - `sim` 엔드포인트의 빠른 탐색/목업 특성을 제거하지 않는다.
  - probe 전용 경로에서 운영 키를 강제 사용하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 기존 흐름과 실 호출 경로를 안전하게 분리하면서도 기능 유지가 필요.
  - **Skills**: `kifu-domain`
    - 호출 게이트 정책 정합성 판단 및 모듈 간 영향 평가.
  - **Skills Evaluated but Omitted**: `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (Task 6)
  - **Blocked By**: Task 2
  - **Blocks**: Task 11

  **References**:
  - `backend/internal/interfaces/http/handlers/sim_report_handler.go`
  - `backend/internal/services/alert_briefing_service.go`
  - `backend/internal/interfaces/http/handlers/ai_handler.go`

  **Acceptance Criteria**:
  - probe API는 기존 dry-run 모드에서 동일한 응답 구조를 유지한다.
  - 운영 키 미보유 시 명확한 `provider unavailable` 오류를 반환한다.

  **QA Scenarios**:
  - Scenario: dry-run 모드 유지
    - Tool: Bash (curl)
    - Preconditions: sim-report endpoint 토글 옵션 동작 검증 가능 상태
    - Steps:
      1. `API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}" TOKEN="${TOKEN:?set TOKEN}" curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/admin/sim-report/run" -d '{"days":1,"target_mode":"sandbox","include_ai_probe":false}'`
    - Expected Result: status=200, synthetic artifact payload 존재
    - Failure Indicators: 실제 외부 API 강제 호출
    - Evidence: `.sisyphus/evidence/task-6-sim-dryrun.log`

  - Scenario: 실 호출 가드
    - Tool: Bash (curl)
    - Preconditions: 사용 불가 provider key
    - Steps:
      1. `API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}" TOKEN="${TOKEN:?set TOKEN}" curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/admin/sim-report/run" -d '{"days":1,"target_mode":"sandbox","include_ai_probe":true}'`
    - Expected Result: provider unavailable 오류와 적절 코드 반환
    - Failure Indicators: call attempt without credential
    - Evidence: `.sisyphus/evidence/task-6-sim-guard-error.log`

- [ ] 7. Pack/요약 + AI opinon 경로 run 기록 연동

  **What to do**:
  - `backend/internal/interfaces/http/handlers/pack_handler.go:GenerateLatest` 및 AI opinion 생성 경로에 run 생성/완료 업데이트를 추가한다.
  - 새 run_type(예: `summary_ondemand`, `ai_opinion`)를 등록해 audit trail로 추적한다.
  - run 메타에 `source_query`, `provider`, `range`, `policy_key`를 저장한다.

  **Must NOT do**:
  - 기존 교차 실행(교차 트랜잭션) 없이 sync path에서 장시간 블로킹을 만들지 않는다.
  - 기존 생성된 summary v1 동작을 변경하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 핵심 운영 가시성 확보로 run lifecycle을 결합해야 함.
  - **Skills**: `kifu-domain`
    - 트랜잭션 경계와 기록/조회 일관성 보장.
  - **Skills Evaluated but Omitted**: `visual-engineering`, `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (Task 7)
  - **Blocked By**: Task 3, Task 4, Task 5, Task 9
  - **Blocks**: Task 11, Task 14

  **References**:
  - `backend/internal/interfaces/http/handlers/pack_handler.go:GenerateLatest`
  - `backend/internal/interfaces/http/handlers/ai_handler.go:RequestOpinions`
  - `backend/internal/interfaces/http/handlers/alert_notification_handler.go`
  - `backend/internal/domain/repositories/run_repository.go`

  **Acceptance Criteria**:
  - `GenerateLatest` 호출 시 run 항목이 `running -> completed/failed`로 기록됨.
  - AI opinion 엔드포인트도 동일 방식 run 메타 기록 보장.

  **QA Scenarios**:
  - Scenario: 온디맨드 요약 run 추적
    - Tool: Bash (curl)
    - Preconditions: pack endpoint 사용 가능한 상태
    - Steps:
      1. `API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}" TOKEN="${TOKEN:?set TOKEN}" curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/packs/generate-latest" -d '{"range":"7d"}'`
      2. `curl -sS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/admin/agent-services"`
    - Expected Result: runs 배열 내 새 `summary_ondemand` run이 `completed` 상태로 포함되고 메타에 `range=7d` 기록
    - Failure Indicators: run 생성 누락 또는 타입 미기록
    - Evidence: `.sisyphus/evidence/task-7-pack-run.log`

  - Scenario: 요약 실패 run 감사
    - Tool: Bash (curl)
    - Preconditions: 의도적 invalid provider 키 주입
    - Steps:
      1. `API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}" TOKEN="${TOKEN:?set TOKEN}" curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/packs/generate-latest" -d '{"range":"7d","provider":"openai"}'`
      2. `curl -sS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/admin/agent-services"`
    - Expected Result: runs 배열 내 `summary_ondemand` 실패 항목이 `failed` 상태로 남고 meta에 `provider`/`error` 관련 단서가 기록
    - Failure Indicators: 실패 상태 미기록
    - Evidence: `.sisyphus/evidence/task-7-pack-run-failed.log`

- [ ] 8. run 조회/메트릭 정합성 검증 API 보강

  **What to do**:
  - 기존 `/api/v1/admin/agent-services` 조회 API를 확장해 `run_type`, `status`, `limit` 쿼리로 runs 하위 배열의 필터/정렬/페이징을 지원한다.
  - 기존 run 집계 응답 스키마/정렬 기본값을 유지하면서 신규 run 타입 집계만 확장하고 정합성 검증 로직을 추가한다.
  - 최근 완료 기준 조회에서 정책별 허용 타입 파라미터를 추가하고 기본 동작을 유지한다.
  - run 메타에서 AI 실행 소요시간/비용 가드 지표를 집계할 수 있는 쿼리 뷰를 확장한다.

  **Must NOT do**:
  - admin 또는 프론트의 기존 run 히스토리 렌더링 포맷을 변경하지 않는다.
  - 오래된 completed run를 무시하는 파라미터를 기본값으로 변경하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 조회 계층 조정이며 인터페이스 영향이 제한적.
  - **Skills**: `kifu-domain`
    - 조회 정합성 검증과 SQL 경로 영향 분석에 적합.
  - **Skills Evaluated but Omitted**: `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (Task 8)
  - **Blocked By**: Task 3
  - **Blocks**: Task 12

  **References**:
  - `backend/internal/domain/repositories/run_repository.go`
  - `backend/internal/infrastructure/repositories/run_repository_impl.go`
  - `backend/internal/interfaces/http/handlers/admin_metrics_handler.go`
  - `backend/internal/interfaces/http/routes.go`

  **Acceptance Criteria**:
  - 기존 API 결과 스키마와 상태 유지, 신규 타입만 선택 조회 가능.
  - 완료 run 조회 응답에서 신규 타입 누락 시 빈 목록만 반환, 에러 아님.

  **QA Scenarios**:
  - Scenario: run 타입 필터 조회 정합성
    - Tool: Bash (curl)
    - Preconditions: run 데이터가 적어도 1건 존재
    - Steps:
      1. `curl '/api/v1/admin/agent-services?run_type=exchange_sync&limit=20'`
      2. `curl '/api/v1/admin/agent-services?run_type=summary_ondemand&status=completed&limit=20'`
    - Expected Result: 각 호출에서 runs 배열은 요청한 run_type으로만 제한됨
    - Failure Indicators: 전체 타입 강제 노출/필터 무시
    - Evidence: `.sisyphus/evidence/task-8-run-filter.log`

  - Scenario: 타입 파라미터 미지정 호환성
    - Tool: Bash (curl)
    - Preconditions: 타입 파라미터 누락 기본 요청
    - Steps:
      1. `curl /api/v1/admin/agent-services`
    - Expected Result: 기존 기준과 동일한 services/runs 구조 유지
    - Failure Indicators: 기존 completed run 목록이 변경됨
    - Evidence: `.sisyphus/evidence/task-8-run-default.log`

  **Execution Snippet**:

  ```bash
  API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}"
  TOKEN="${TOKEN:?set TOKEN}"

  h=("Authorization: Bearer ${TOKEN}")

  # Baseline
  curl -sS -H "${h[@]}" "${API_BASE}/admin/agent-services" \
    | tee .sisyphus/evidence/task-8-run-default.log

  # run_type filter
  curl -sS -H "${h[@]}" "${API_BASE}/admin/agent-services?run_type=exchange_sync&limit=20" \
    | tee .sisyphus/evidence/task-8-run-filter.log

  # run_type + status filter
  curl -sS -H "${h[@]}" "${API_BASE}/admin/agent-services?run_type=summary_ondemand&status=completed&limit=20" \
    | tee -a .sisyphus/evidence/task-8-run-filter.log

  # bad status validation
  curl -sS -i -H "${h[@]}" "${API_BASE}/admin/agent-services?status=weird" \
    | tee .sisyphus/evidence/task-8-run-filter-bad-status.log
  ```

  **Validation by jq (sample assertions):**

  ```bash
  # baseline shape
  jq -e 'has("snapshot_at") and has("services") and has("runs")' .sisyphus/evidence/task-8-run-default.log

  # only exchange_sync
  jq -e '.runs | all(.run_type == "exchange_sync")' .sisyphus/evidence/task-8-run-filter.log

  # summary_ondemand + completed
  jq -e '.runs | all(.run_type == "summary_ondemand" and .status == "completed")' .sisyphus/evidence/task-8-run-filter.log
  ```

  **Task 7 link point (when running with Task 7):**

  - Success: `admin/agent-services?run_type=summary_ondemand&status=completed&limit=20`
  - Failure: `admin/agent-services?run_type=summary_ondemand&status=failed&limit=20`
  - Expected: `runs` 배열에서 상태/메타를 직접 판정

- [ ] 9. 정책/어드민 게이트 동적 데이터 노출 API 설계 및 토글 체계 확장

  **What to do**:
  - 기존 `admin_policy_handler.go`의 `allowedAdminPolicyKeys` 구조를 유지하되 AI 운영 관련 키(`ai_provider_toggle`, `ai_run_telemetry`, `ai_local_gateway`)를 추가한다.
  - 정책 조회/업데이트 API에 run/agent 관측성, provider override, 요약 자동화 토글을 노출한다.
  - 관리자 UI에서 읽기/쓰기 가능한 정책 키를 동일 JSON 형태로 제공한다.

  **Must NOT do**:
  - `allowedAdminPolicyKeys`를 무검증 동적 키로 바꾸지 않는다.
  - 기존 허용 정책과 비즈니스 정책 사이의 충돌을 허용하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 보안·거버넌스와 연계된 정책 확장이라 판단이 필요함.
  - **Skills**: `kifu-domain`
    - 정책 키의 영향 범위를 추적하고 기존 게이트와 충돌을 방지.
  - **Skills Evaluated but Omitted**: `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (Task 9, Task 10)
  - **Blocked By**: Task 2
  - **Blocks**: Task 12, Task 13

  **References**:
  - `backend/internal/interfaces/http/handlers/admin_policy_handler.go`
  - `backend/internal/app/app.go`
  - `frontend/app/(app)/admin/agent-services/page.tsx`

  **Acceptance Criteria**:
  - 허용 정책 키가 DB/memory 캐시 동기 없이도 즉시 반영되며 불허 키는 거부됨.
  - 정책 변경 시 감사 로그/관리자 화면에 상태 변화가 보임.

  **QA Scenarios**:
  - Scenario: 정책 키 확장 허용 검증
    - Tool: Bash (curl)
    - Preconditions: admin 토큰 발급
    - Steps:
      1. `API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}" TOKEN="${TOKEN:?set TOKEN}" curl -sS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/admin/policies"`
      2. `curl -sS -X PUT -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/admin/policies" -d '{"key":"ai_local_gateway","enabled":true}'`
      3. `curl -sS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/admin/policies"`
    - Expected Result: 신규 키가 목록 조회 및 변경 모두 반영됨
    - Failure Indicators: 새 키가 목록에서 보이지 않거나 값 반영 실패
    - Evidence: `.sisyphus/evidence/task-9-policy-key-ok.log`

  - Scenario: 허용되지 않은 키 차단
    - Tool: Bash (curl)
    - Preconditions: unknown key payload
    - Steps:
      1. `API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}" TOKEN="${TOKEN:?set TOKEN}" curl -sS -X PUT -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/admin/policies" -d '{"key":"bad_key","enabled":true}'`
    - Expected Result: 400 에러 및 변경 미반영
    - Failure Indicators: unknown key가 저장됨
    - Evidence: `.sisyphus/evidence/task-9-policy-key-block.log`

- [ ] 10. 도메인 공유 컨텍스트 저장소 스키마 및 서비스 베이스라인

  **What to do**:
  - `backend/internal/domain`에서 도메인 공용 컨텍스트(`domain_context`)를 저장/조회할 수 있는 인터페이스를 추가한다.
  - `context JSONB + ownership(scope,domain,version)` 형태 최소 스키마를 설계해 거래복기/온체인/결제/마케팅 확장에 대비한다.
  - 권한 없는 cross-domain 조회는 차단하고, read-through cache 전략으로 성능을 확보한다.

  **Must NOT do**:
  - 사용자 개인 메모/의사결정 log를 cross-project로 평문 공유하지 않는다.
  - 마이그레이션 없이 운영 데이터 구조를 강제 재작성하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 도메인 간 공유 모델은 장기 운영 설계를 좌우함.
  - **Skills**: `kifu-domain`
    - 도메인 경계/소유권 정의와 확장 패턴 제시가 필요.
  - **Skills Evaluated but Omitted**: `playwright`, `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (Task 10)
  - **Blocked By**: Task 9, Task 3
  - **Blocks**: Task 11, Task 13

  **References**:
  - `backend/internal/domain/entities/run.go`
  - `backend/internal/domain/repositories/run_repository.go`
  - `backend/internal/infrastructure/repositories/run_repository_impl.go`

  **Acceptance Criteria**:
  - 새 컨텍스트 저장소 계약이 1개 도메인에서 조회/작성되고 2개 이상 도메인 확장 포인트가 설계됨.
  - 기존 도메인 데이터에 영향 없음.

  **QA Scenarios**:
  - Scenario: 컨텍스트 생성/조회
    - Tool: Bash (go test)
    - Preconditions: 컨텍스트 계약 인터페이스 작성
    - Steps:
      1. `cd backend`
      2. `go test ./internal/domain/... -run DomainContext`
      3. `go test ./internal/infrastructure/... -run DomainContext`
    - Expected Result: 도메인/범위 기반 저장/조회 단위 테스트 통과
    - Failure Indicators: scope 경계 무시
    - Evidence: `.sisyphus/evidence/task-10-context-contract.log`

  - Scenario: 잘못된 도메인 접근 차단
    - Tool: Bash (go test)
    - Preconditions: 권한 없는 조회 케이스 설정
    - Steps:
      1. `go test ./internal/services/... -run DomainContext`
    - Expected Result: 교차 도메인 접근이 거부됨
    - Failure Indicators: 무권한 노출
    - Evidence: `.sisyphus/evidence/task-10-context-acl.log`

- [ ] 11. 온디맨드 주간/월간 요약 엔드포인트 및 운영 제어

  **What to do**:
  - `pack_handler`와 신규 summary 서비스에 `7d/30d` range를 명시 지원하고 기본값 `30d` 유지.
  - 요청에서 `dry_run`, `provider`, `force` 옵션을 받되, force는 정책 게이트 아래에서만 허용.
  - 요약 요청 직전 최신 완료 run 선택 로직과 AI run 기록을 일치시킨다.

  **Must NOT do**:
  - 자동 스케줄러로 즉시 월간 자동생성을 켜지 않는다.
  - 기존 v1.0 요약 재현성 규칙을 깨뜨리지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: API 파라미터 확장과 제어 로직 추가가 상대적으로 단일 범위.
  - **Skills**: `kifu-domain`
    - v1.0 규격과의 backward compatibility 검증이 필수.
  - **Skills Evaluated but Omitted**: `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (Task 11)
  - **Blocked By**: Task 3, Task 7, Task 10
  - **Blocks**: Task 12, Task 14

  **References**:
  - `backend/internal/interfaces/http/handlers/pack_handler.go:GenerateLatest`
  - `backend/internal/domain/entities/run.go`

  **Acceptance Criteria**:
  - `range=7d`가 7일 구간에서 동작하고 `range=30d`가 기존 동작 대체 없음.
  - 잘못된 range 요청 시 400 응답.

  **QA Scenarios**:
  - Scenario: 온디맨드 요약 7d 정상 동작
    - Tool: Bash (curl)
    - Preconditions: 테스트 계정 및 권한 확보
    - Steps:
      1. `API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}" TOKEN="${TOKEN:?set TOKEN}" curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/packs/generate-latest" -d '{"range":"7d"}'`
      2. 1~2초 대기 후 run 조회
    - Expected Result: 새 요약 생성 완료, 7d 메타 기록
    - Failure Indicators: 30d로 강제 변환
    - Evidence: `.sisyphus/evidence/task-11-summary-7d.log`

  - Scenario: 잘못된 range 처리
    - Tool: Bash (curl)
    - Preconditions: invalid range 요청
    - Steps:
      1. `API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}" TOKEN="${TOKEN:?set TOKEN}" curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/packs/generate-latest" -d '{"range":"bad"}'`
    - Expected Result: validation error with code 반환
    - Failure Indicators: 기본값으로 무조건 성공 처리
    - Evidence: `.sisyphus/evidence/task-11-summary-invalid-range.log`

- [ ] 12. 관리자 AI provider/텔레메트리 UI 연동

  **What to do**:
  - 프론트 관리자 화면에서 provider/도메인 공통 컨텍스트/요약 run 상태를 동적 표시한다.
  - 토글 상태 변경 시 백엔드 정책 API와 동기화하고, 실패 시 rollback 알림을 표시한다.
  - 마케팅/정확도 차트는 최소 MVP로 요약 요청량, 성공률, 지연시간만 표시.
  - **Playwright 테스트 파일 생성**: `frontend/tests/admin-agent-services.spec.ts`를 생성해 admin 화면 로드, provider 토글, run 필터링 동작을 검증한다 (F3 검증용).

  **Must NOT do**:
  - 기존 거래복기 핵심 대시보드 레이아웃을 재설계하지 않는다.
  - 전체 데이터 조회 페이지를 새 페이지로 분리해 탐색성을 악화하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 관리자 화면의 정보 밀도 조정이 UX 설계 의도가 필요함.
  - **Skills**: `kifu-domain`
    - AI 운영/정책 경계를 UI상에 과장 없이 반영.
  - **Skills Evaluated but Omitted**: `playwright` (verification only)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (Task 12, Task 13)
  - **Blocked By**: Task 9, Task 8, Task 11
  - **Blocks**: Task 14

  **References**:
  - `frontend/app/(app)/admin/agent-services/page.tsx`
  - `frontend/src/lib/api.ts`
  - `backend/internal/interfaces/http/handlers/admin_policy_handler.go`

  **Acceptance Criteria**:
  - 정책 토글/조회 결과와 백엔드 상태가 5초 내 정합되며, 불일치가 있을 때 경고 표기.
  - 화면에서 새 run 타입이 필터링되어 보임.

  **QA Scenarios**:
  - Scenario: 관리자 화면 동기화
    - Tool: Playwright
    - Preconditions: 테스트 admin 계정 및 mock data
    - Steps:
      1. 관리자 페이지(`/admin/agent-services`) 이동
      2. provider 토글 1개 변경
      3. API 응답과 토글 상태 일치 여부 검증
    - Expected Result: 변경 즉시 버튼/상태가 응답 값과 동일
    - Failure Indicators: 상태 반영 지연 또는 500 에러
    - Evidence: `.sisyphus/evidence/task-12-admin-ui.png`

  - Scenario: 정책 연동 실패 UX
    - Tool: Playwright
    - Preconditions: API 에러 주입 또는 네트워크 차단
    - Steps:
      1. 토글 변경 시도
      2. 실패 메시지와 재시도 버튼 노출 여부 확인
    - Expected Result: 명확한 오류 안내 및 상태 롤백
    - Failure Indicators: 실패 무시/무한 로딩
    - Evidence: `.sisyphus/evidence/task-12-admin-ui-error.png`

- [ ] 13. 정책/실행 보드 화면 확장 및 마케팅 디자인 템플릿 최소 연동

  **What to do**:
  - 마케팅/디자인 파일럿 탭에 `콘텐츠 제안 생성 -> 승인 대기 -> 실행`의 최소 워크플로우를 추가한다.
  - 정책 토글(`marketing_content_enabled`)과 run 기록을 같은 화면에서 조회하도록 연결한다.
  - 승인된 항목은 수동 발행 단계로만 이동되도록 설정해 자동 게시를 제한한다.

  **Must NOT do**:
  - 외부 SNS 자동 업로드를 1차 파일럿에서 시행하지 않는다.
  - 거래복기 핵심 알림 플로우에 마케팅 큐를 결합하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 사용자 여정이 짧은 최소형 승인 인터페이스 필요.
  - **Skills**: `kifu-domain`
    - 정책/운영 흐름 제약을 UI 동작으로 강제하는 조건 설정.
  - **Skills Evaluated but Omitted**: `playwright`, `quick`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (Task 13)
  - **Blocked By**: Task 12, Task 10, Task 9
  - **Blocks**: Task 14

  **References**:
  - `frontend/app/(app)/admin/agent-services/page.tsx`
  - `docs/marketing/twitter-playbook.md`
  - `backend/internal/interfaces/http/handlers/admin_policy_handler.go`

  **Acceptance Criteria**:
  - 마케팅 콘텐츠 제안이 생성/승인/요청 로그로 분리되어 저장됨.
  - 승인 전 게시 실행 버튼이 비활성화됨.

  **QA Scenarios**:
  - Scenario: 최소 승인 플로우
    - Tool: Playwright
    - Preconditions: 마케팅 기능 토글 ON
    - Steps:
      1. 마케팅 탭에서 샘플 요청 생성
      2. 승인 버튼 클릭 후 상태가 `approved`
      3. 실행 버튼 노출 상태 확인
    - Expected Result: 승인 후에만 실행 단계로 이동
    - Failure Indicators: 승인 없이 실행 가능
    - Evidence: `.sisyphus/evidence/task-13-marketing-flow.png`

  - Scenario: 업로드 자동화 제한
    - Tool: Playwright
    - Preconditions: 승인되지 않은 항목 존재
    - Steps:
      1. 승인되지 않은 항목에서 배포/업로드 버튼 클릭
    - Expected Result: 경고 메시지 또는 버튼 비활성화
    - Failure Indicators: 바로 외부 발행 동작 진입
    - Evidence: `.sisyphus/evidence/task-13-marketing-block.png`

- [ ] 14. 최종 검증, 롤백 포인트 설계, 운영 하드닝

  **What to do**:
  - Task 1~13 변경사항을 중심으로 회귀 시나리오와 rollback playbook을 한 번에 정리한다.
  - provider/run/정책의 3층 가드(코드/환경/데이터) 검증 스크립트를 작성한다.
  - **엔드포인트 검증 스크립트 생성**: `.sisyphus/scripts/verify-all-endpoints.sh`를 생성해 8개 핵심 API (ai, packs, admin/policies, admin/agent-services 등)를 순차 호출하고 결과를 기록한다 (F3 검증용).
  - 모니터링 지표(실패율, 응답지연, run backlog)를 기준으로 초기 경보 임계값을 설정한다.

  **Must NOT do**:
  - “all-or-nothing” 재배포로 롤백 경로를 복잡하게 만들지 않는다.
  - 운영 중단을 유발할 수 있는 대규모 동시 변경을 한 번에 묶지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 엔드투엔드 검증과 위험 관리가 다수 도메인에 걸쳐 있음.
  - **Skills**: `kifu-domain`
    - 변경범위/리스크 평가와 실행후 감사 기준 정립.
  - **Skills Evaluated but Omitted**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 6 (Task 14)
  - **Blocked By**: Task 7, 8, 9, 10, 11, 12, 13
  - **Blocks**: Final verification

  **References**:
  - `backend/internal/services/alert_briefing_service.go`
  - `backend/internal/interfaces/http/handlers/pack_handler.go`
  - `backend/internal/interfaces/http/handlers/admin_policy_handler.go`

  **Acceptance Criteria**:
  - 실행 가이드와 rollback 단계가 `.sisyphus/evidence/`로 남아있음.
  - 핵심 지표 경보 임계값이 배포 전 문서화됨.

  **QA Scenarios**:
  - Scenario: 전체 Happy path 점검
    - Tool: Bash + Playwright
    - Preconditions: 작업 완료 후 모든 엔드포인트 실행
    - Steps:
      1. run + policy + provider + summary 온디맨드 API 8개를 순차 실행
      2. 핵심 화면 2개를 Playwright로 렌더/요청 응답 확인
    - Expected Result: 모든 필수 API 성공률 100%, UI 렌더 오류 없음
    - Failure Indicators: 회귀 에러 또는 응답형 불일치
    - Evidence: `.sisyphus/evidence/task-14-final-flow.log`

  - Scenario: 롤백 절차 검증
    - Tool: Bash
    - Preconditions: 위험 경로 시뮬레이션 환경
    - Steps:
      1. 프로바이더 기능을 1개 정책 키로 비활성화
      2. fallback 동작 및 운영 API 영향 확인
  - Expected Result: 제한된 rollback 동작으로 서비스 가용성 유지
  - Failure Indicators: 전체 기능 정지
  - Evidence: `.sisyphus/evidence/task-14-rollback.log`

---

## Final Verification Wave

- [ ] F1. Plan Compliance Audit

  **What to do**: 모든 필수 산출물(Provider 계약, run 타입, 정책 키, 온디맨드 range, 컨텍스트, 마케팅 승인 플로우)의 구현/문서/증적 파일을 대조한다.
  
  **QA Scenarios**:
  - Scenario: 증적 파일 완전성 검증
    - Tool: Bash
    - Steps:
      1. `ls -1 .sisyphus/evidence/task-*.{log,png,json} | wc -l` — 최소 28개 이상 (Task 1~14 각 2개)
      2. `grep -l "Expected Result" .sisyphus/evidence/*.log | wc -l` — 최소 14개
    - Expected Result: 모든 Task의 성공/실패 시나리오 증적 존재
    - Failure Indicators: 증적 파일 누락
    - Evidence: `.sisyphus/evidence/final-f1-compliance.log`
  
  **Acceptance Criteria**: `Must Have` 100% 충족, `Must Not` 100% 미반영, 증적 파일 누락 없음.

- [ ] F2. Code Quality Review

  **What to do**: `go test`, `go vet`, `npm run lint`, `npm run typecheck`를 실행하고 변경 파일의 정책 위반을 점검한다.
  
  **QA Scenarios**:
  - Scenario: 백엔드 정적 분석
    - Tool: Bash
    - Steps:
      1. `cd backend && go test ./... 2>&1 | tee ../.sisyphus/evidence/final-f2-go-test.log`
      2. `go vet ./... 2>&1 | tee -a ../.sisyphus/evidence/final-f2-go-test.log`
    - Expected Result: 모든 테스트 통과, vet 경고 없음
    - Failure Indicators: 테스트 실패, vet 경고
    - Evidence: `.sisyphus/evidence/final-f2-go-test.log`
  
  - Scenario: 프론트엔드 정적 분석
    - Tool: Bash
    - Steps:
      1. `cd frontend && npm run lint 2>&1 | tee ../.sisyphus/evidence/final-f2-npm-lint.log`
      2. `npm run typecheck 2>&1 | tee -a ../.sisyphus/evidence/final-f2-npm-lint.log`
    - Expected Result: lint/typecheck 통과
    - Failure Indicators: lint 오류, 타입 오류
    - Evidence: `.sisyphus/evidence/final-f2-npm-lint.log`
  
  **Acceptance Criteria**: 정적분석 통과, 신규 하드코딩 키/오류 처리 누락 없음.

- [ ] F3. End-to-End Scenario Verification

  **What to do**: Task 1~14의 핵심 시나리오를 Playwright/Bash로 재실행한다. UI 경로는 최소 2개, API 경로는 8개, 실패 케이스 포함.
  
  **QA Scenarios**:
  - Scenario: 관리자 UI 통합 검증
    - Tool: Playwright
    - Steps:
      1. `cd frontend && npx playwright test tests/qa-smoke.spec.ts --grep admin 2>&1 | tee ../.sisyphus/evidence/final-f3-playwright.log` (Task 12에서 admin-agent-services 검증 추가 필요)
    - Expected Result: 관리자 화면 로드, provider 토글, run 필터링 동작
    - Failure Indicators: 페이지 로드 실패, 토글 미동작
    - Evidence: `.sisyphus/evidence/final-f3-playwright.log`, `.sisyphus/evidence/final-f3-playwright.png`
  
  - Scenario: API 엔드포인트 통합 검증
    - Tool: Bash (curl)
    - Steps:
      1. `API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}" TOKEN="${TOKEN:?set TOKEN}" bash .sisyphus/scripts/verify-all-endpoints.sh 2>&1 | tee .sisyphus/evidence/final-f3-api.log` (Task 14에서 스크립트 생성)
    - Expected Result: 8개 핵심 API (ai, packs, admin/policies, admin/agent-services 등) 모두 200/400 정상 응답
    - Failure Indicators: 500 에러, 타임아웃
    - Evidence: `.sisyphus/evidence/final-f3-api.log`
  
  **Acceptance Criteria**: `.sisyphus/evidence/`의 happy/error 증적 모두 존재, 증적 파일 누락 없음.

- [ ] F4. Scope Fidelity Check

  **What to do**: 스코프 바깥 변경(예: 거래복기 핵심 기능 무관한 UI/알고리즘 변경)과 과도한 리팩토링 유무를 검사한다.
  
  **QA Scenarios**:
  - Scenario: 변경 범위 검증
    - Tool: Bash (git diff)
    - Steps:
      1. `git diff main --stat | tee .sisyphus/evidence/final-f4-scope.log`
      2. `git diff main --name-only | grep -v -E '(backend/internal/(domain|infrastructure|interfaces/http/handlers|services)|frontend/app/\(app\)/admin|.sisyphus)' | tee -a .sisyphus/evidence/final-f4-scope.log`
    - Expected Result: 변경 파일이 Plan TODO 범위 내, 거래복기 핵심 로직 미변경
    - Failure Indicators: 스코프 외 파일 변경 (예: 거래 로직, 인증 핵심)
    - Evidence: `.sisyphus/evidence/final-f4-scope.log`
  
  **Acceptance Criteria**: 변경 범위가 Plan의 TODO와 일치하고 제외 항목이 침범되지 않음.

## Commit Strategy

- 1차: `feat(ai): plan backend provider abstraction and run telemetry foundation`
- 2차: `feat(ai): wire run-tracked on-demand summary and policy controls`
- 3차: `feat(ai): add marketing/design pilot approval flow`
- 4차: `chore(ai): finalize verification and rollout hardening`

## Success Criteria

### Verification Commands

```bash
go test ./...
npm run lint
npm run typecheck
```

### Final Checklist

- [ ] 기존 OpenAI/Claude/Gemini 핵심 동작 유지
- [ ] run 추적(요약/의견) 누락 없음
- [ ] 마케팅 승인형 파일럿 최소 플로우 동작
- [ ] policy allowlist 변경이 백엔드/프론트에 동기 반영
- [ ] 에러 시그널 및 rollback 경로가 문서화됨
