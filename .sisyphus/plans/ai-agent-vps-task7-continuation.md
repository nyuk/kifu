# Task 7 Continuation: Pack/Opinion Run Tracking Integration

## TL;DR

> **Quick Summary**: 문서 정합성 기준으로 Task 7의 실행 범위를 선명하게 고정하고, 7번 작업에서 실제 코드 변경 시 필요한 순서·판단·검증 시나리오를 한 번에 정리한다.

> **Deliverables**:
> - Task 7 사전 정리(경계/의존성 재정의)
> - `pack_handler.go:GenerateLatest` + `ai_handler.go:RequestOpinions` run 추적 구현 범위
> - run 타입 오염 방지 및 실패/성공 evidence 기반 검증 시나리오

> **Estimated Effort**: Medium
> **Parallel Execution**: NO (1 task block, 내부 세부 작업은 순차)
> **Critical Path**: 선행 확인(Task 7.0) -> 핸들러 구현(Task 7.1) -> QA(Task 7.2)

---

## Context

### Original Request
문서 정합성 정리 작업 상태에서 바로 착수 가능한 형태로 Task 7 실행 계획만 수립한다.

### Interview Summary
- 사용자 요청은 "코드 수정은 최소화/문서 정합성 중심"에서 시작했으나, Task 7 착수 전 필요한 범위를 정확히 문서화해 다음 실행 단계로 넘기는 것을 목표로 함.
- Task 7은 run 추적 강화를 통한 운영 가시성 확보가 핵심이며, 기능 롤백/성능 저해 없이 기존 v1.0 동작을 유지해야 함.

### Research Findings
- bg_1cb3bd5a: Task 7 의존성, scope, QA, 참고 파일이 모두 명시됨.
- bg_dbaf3ac1: 관리자 UI/백엔드 패턴(라우팅, middleware, policy 키, audit log)을 확인해 구현 위치 정합성 확보.
- bg_e7faf044: 문서 baseline-vs-extension 분리 규칙 및 roadmap/todo 구조 확인.

### Metis Review (applied)
- 핵심 리스크 1: `GetLatestCompletedRun`이 type filter 없이 쓰이면 `summary_ondemand`가 source-run로 오염될 수 있음.
- 핵심 리스크 2: 기존 QA 실패 시나리오의 `provider` 필드는 현재 요청 스키마와 불일치.
- 핵심 리스크 3: Task 7은 `ai_handler.go` runRepo DI 및 라우팅 wiring 변경이 선행되어야 완결.
- 핵심 리스크 4: `RequestOpinions` 다중 provider 호출 시 run 집계 단위(요청당 1건 vs provider당 1건) 합의 필요.

---

## Work Objectives

### Core Objective
Task 7을 실행 가능한 수준의 문서 계획으로 변환하고, run 추적 구현 시 생길 수 있는 회귀(소스 run 오염, 실패 기록 부재, 오용한 실패 시나리오, DI 누락) 방지를 가이드한다.

### Concrete Deliverables
- Task 7 선행 체크리스트: 블록/차단 해소 및 실행 가드 반영
- run 타입 등록 + run 메타 저장 규칙 확정
- `GenerateLatest`/`RequestOpinions` 공통 run lifecycle 규칙 수립 및 evidence 시나리오 정리

### Definition of Done
- [ ] Task 7 실행 계획 파일이 `.sisyphus/plans/ai-agent-vps-task7-continuation.md`에 완성됨
- [ ] Task 7 선행 가드(특히 `GetLatestCompletedRun` type filter)와 run lifecycle 기준이 Acceptance Criteria에 반영됨
- [ ] Task 7 성공/실패 QA가 각기 1개 이상 도식화되어 evidence path가 지정됨

### Must Have
- v1.0 문서/기존 동작과 충돌하지 않는 설명
- Task 7 scope는 Task 3/4/5/9 완료 전제(차단 조건) 그대로 유지
- Task 9의 `policy_key`는 정책 토글 연동 관점에서만 의존 처리

### Must NOT Have
- `pack_handler`에서 기존 `generate-latest` v1.0 동작 변경
- run tracking을 이름만 추가하고 상태 전이 누락
- 문서와 구현 경계(진행/미진행) 혼재

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — 실행/검증은 에이전트 수행 기반만 허용.

### Test Decision
- **Infrastructure exists**: YES (Go + Next/TypeScript)
- **Automated tests**: Tests-after
- **Framework**: go test / Bash curl + jq assertions

### QA Policy
- 모든 TODO에 최소 1개 happy path + 1개 failure 시나리오
- 실행 증적은 `.sisyphus/evidence/task-7-<slug>.log`로 고정
- 실패 시나리오는 현재 API 스펙(`/packs/generate-latest`)에 맞게 구성

---

## Execution Strategy

### Parallel Waves

Wave 1 (Task 7 foundations)
- Task 7.0: Task 7 경계 정비 및 사전 회귀 가드 정렬
- Task 7.1: run 추적 핵심 구현

Wave 2 (Task 7 verification)
- Task 7.2: run 추적 시나리오 검증 및 증적 수집

### Dependency Matrix
- **7.0**: — → 7.1
- **7.1**: 7.0, Task 3,4,5,9 → 7.2
- **7.2**: 7.1 → Done

---

## TODOs

- [ ] 7.0. Task 7 execution boundary lock + preflight guards

  **What to do**:
  - `Task 7` 범위를 `summary_ondemand`, `ai_opinion` run 유형 및 메타 저장으로 한정하고, 기존 v1.0 경로는 변경하지 않도록 금지 규칙을 재정의한다.
  - `GetLatestCompletedRun`의 호출 지점(특히 `GenerateLatest` 상위 플로우)을 분석해 Task 7에서 source-run 조회가 `ai_summary/ai_opinion`를 오인식하지 않도록 필터 요구사항을 문서화한다.
  - `RequestOpinions`의 run 단위를 **요청당 1개 run**으로 기본 정의하고, provider별 부분 추적은 내부 meta 확장으로 보완한다.
  - `api`: `provider` 요청 필드가 없는 경로(`/packs/generate-latest`) 실패 시나리오는 제거/수정하고 실제 실패 트리거로 대체한다.
  - DI gap: `ai_handler`에서 runRepo 의존성이 필요한 경우 라우트 wiring 변경(`routes.go`)을 반영 범위에 포함시킨다.

  **Must NOT do**:
  - source run를 특정 타입으로 오염시키는 포괄형 조회 허용
  - Task 7 범위를 Policy API 전체 변경이나 `/api/v1/ai` 시그니처 변경으로 확장

  **Recommended Agent Profile**:
  - Category: `quick`
    - Reason: 사전 정렬은 문서/의존성/경계 정합성 확정이 핵심으로 짧은 리스크로 수행 가능
  - Skills: `kifu-domain`
    - Why: 도메인 run/lifecycle 경계와 정책 연동 영향도를 판단해야 함
  - Skills Evaluated but Omitted: `playwright`, `visual-engineering`
    - Why: UI 변경이 없는 계획 단계에서는 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (Task 7.0)
  - **Blocked By**: Task 3, Task 4, Task 5, Task 9
  - **Blocks**: Task 7.1

  **References**:
  - `.sisyphus/plans/ai-agent-vps-project-plan.md:447-479` - Task 7 원본 정의 및 QA
  - `.sisyphus/plans/ai-agent-vps-project-plan.md:465-469` - Blocked/Blocks 라인
  - `backend/internal/interfaces/http/routes.go` - 핸들러 DI wiring 위치
  - `backend/internal/interfaces/http/handlers/ai_handler.go:AIInvocationService.InvokeProvider, resolveAPIKey` - 기존 provider 경로
  - `backend/internal/interfaces/http/handlers/pack_handler.go:GenerateLatest` - source-run 및 run 생성 위치

  **Acceptance Criteria**:
  - [ ] Task 7 실행 경계에서 제외될 항목/포함 항목이 문서로 명시되어 승인 가능 상태가 된다.
  - [ ] `GetLatestCompletedRun` 오염 리스크가 해결 요구사항으로 별도 acceptance 항목에 반영된다.

  **QA Scenarios**:
  - Scenario: source run 오염 경고 체크
    - Tool: Bash
    - Preconditions: Plan has explicit filter requirement
    - Steps:
      1. `rg "GetLatestCompletedRun\(" backend/internal/interfaces/http/handlers/pack_handler.go`
      2. 확인된 호출부에 run_type filter 요구사항이 문서에 정렬되어 있는지 검토
    - Expected Result: summary_ondemand/ai_opinion로 인한 오염 가능 구간이 식별되고 대응 방안이 plan에 반영
    - Failure Indicators: 오염 위험이 계획에서 누락
    - Evidence: `.sisyphus/evidence/task-7-0-guard-review.log`

- [ ] 7.1. Implement run tracking in GenerateLatest and RequestOpinions

  **What to do**:
  - `backend/internal/interfaces/http/handlers/pack_handler.go:GenerateLatest`에서 `summary_ondemand` run 생성/완료/실패 전이 규칙을 적용한다.
  - `backend/internal/interfaces/http/handlers/ai_handler.go:RequestOpinions`에서 `ai_opinion` run 생성 및 완료/실패 전이 규칙을 적용한다.
  - `run_repository` 계열에 필요한 추가 조회/저장 메타 필드(`source_query`, `provider`, `range`, `policy_key`) 갱신 정책을 반영한다.
  - run 메타가 `provider` 미지정/정책 제한/범위(range) 예외를 포함해 감사 가능한 최소 필드를 갖추도록 한다.
  - `alert_notification_handler` 연계 포인트는 run lifecycle의 실패 보조 메트릭으로만 참조 범위를 제한한다.

  **Must NOT do**:
  - 기존 `summary` 즉시 동작을 변경하거나 신규 provider fallback 로직을 v1.0에 강제 주입
  - 장시간 sync run 블로킹을 유도하는 방식으로 run lifecycle을 구현

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
    - Reason: 운영 가시성과 백엔드 핵심 경로가 결합되어 실수 비용이 크므로 심층 판단 필요
  - Skills: `kifu-domain`
    - Why: run lifecycle, policy key, repository 계약 정합성 보증
  - Skills Evaluated but Omitted: `playwright`, `visual-engineering`
    - Why: frontend 변경 범위를 포함하지 않음

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (Task 7.1)
  - **Blocked By**: Task 7.0, Task 3, Task 4, Task 5, Task 9
  - **Blocks**: Task 7.2, Task 11

  **References**:
  - `backend/internal/interfaces/http/handlers/pack_handler.go:GenerateLatest`
  - `backend/internal/interfaces/http/handlers/ai_handler.go:RequestOpinions`
  - `backend/internal/interfaces/http/handlers/alert_notification_handler.go`
  - `backend/internal/domain/repositories/run_repository.go`
  - `backend/internal/interfaces/http/routes.go`

  **Acceptance Criteria**:
  - [ ] `GenerateLatest` 호출 시 `summary_ondemand` run이 `running -> completed` 또는 `running -> failed`로 전이됨
  - [ ] `RequestOpinions` 요청당 run 1개 정책으로 생성되어 성공/실패 모두 `ai_opinion` run 메타를 남김
  - [ ] `source_query`, `provider`, `range`, `policy_key`가 실패/성공 모두 기록됨

  **QA Scenarios**:
  - Scenario: on-demand summary run lifecycle
    - Tool: Bash (curl)
    - Preconditions: admin token and test pack token scope
    - Steps:
      1. `API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}"`
      2. `TOKEN="${TOKEN:?set TOKEN}"`
      3. `curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/packs/generate-latest" -d '{"range":"7d"}'`
      4. `curl -sS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/admin/agent-services" | tee .sisyphus/evidence/task-7-pack-run.log`
      5. `jq -e '.runs | any(.run_type=="summary_ondemand" and .status=="completed" and (.meta.range=="7d"))' .sisyphus/evidence/task-7-pack-run.log`
    - Expected Result: completed status run + meta range 저장 확인
    - Failure Indicators: run 누락, status 미전이, meta 미기록
    - Evidence: `.sisyphus/evidence/task-7-pack-run.log`

  - Scenario: no completed source run failure capture
    - Tool: Bash (curl)
    - Preconditions: 동일한 admin token
    - Steps:
      1. `curl -sS -i -X POST -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' "${API_BASE}/packs/generate-latest" -d '{"range":"7d"}' | tee .sisyphus/evidence/task-7-pack-run-failed.log`
      2. `cat .sisyphus/evidence/task-7-pack-run-failed.log`
    - Expected Result: 4xx + NO_COMPLETED_RUN 응답 + 실패 run 기록 유무 확인(실패 경로 메타 보강)
    - Failure Indicators: 2xx로 강제 성공하거나 run 기록 없음
    - Evidence: `.sisyphus/evidence/task-7-pack-run-failed.log`

- [ ] 7.2. Run tracking evidence & rollout readiness

  **What to do**:
  - Task 7 구현 산출물을 기준으로 evidence 파일명을 정리하고 검증 재현 절차를 문서화한다.
  - Task 8/11과의 API 연계 점검 포인트( `admin/agent-services` run_type 필터) 전달 항목으로 정리한다.
  - Task 7 completion 후 Task 11/14로 넘어가기 위한 수락 조건(조건 위반시 차단)을 정리한다.

  **Must NOT do**:
  - 실패 시나리오를 과도한 mock 기반만으로 대체(실제 endpoint evidence 필수)
  - 증적 파일명을 `.sisyphus/evidence` 외부로 분산 저장

  **Recommended Agent Profile**:
  - Category: `quick`
    - Reason: 계획 후반부 검증 기록 정리와 전달용 가이드 생성
  - Skills: `kifu-domain`
    - Why: Task 7 의존/차단 정합성 판단 필요
  - Skills Evaluated but Omitted: `playwright`
    - Why: UI 수행이 아닌 backend 중심 QA

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocked By**: 7.1
  - **Blocks**: F1-F4

  **References**:
  - `.sisyphus/plans/ai-agent-vps-project-plan.md:481-500`
  - `backend/internal/interfaces/http/handlers/pack_handler.go`
  - `backend/internal/interfaces/http/handlers/admin_metrics_handler.go` (optional linkage)

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/task-7-pack-run.log` 및 `.sisyphus/evidence/task-7-pack-run-failed.log` 생성
  - [ ] Task 7 종료 조건과 Task 11/14 Blocking 조건이 명시됨

  **QA Scenarios**:
  - Scenario: evidence completeness
    - Tool: Bash
    - Preconditions: 이전 Task에서 evidence 파일 생성 여부 확인
    - Steps:
      1. `ls -1 .sisyphus/evidence/task-7-pack-run*.log`
      2. `wc -l .sisyphus/evidence/task-7-pack-run.log .sisyphus/evidence/task-7-pack-run-failed.log`
    - Expected Result: 두 로그 파일 모두 존재 및 실행 출력이 기록됨
    - Failure Indicators: evidence 미존재/0바이트
    - Evidence: `.sisyphus/evidence/task-7-evidence-check.log`

  - Scenario: dependency gate summary
    - Tool: Bash
    - Preconditions: plan draft/refs available
    - Steps:
      1. `echo "task3/task4/task5/task9 done? required" > .sisyphus/evidence/task-7-dependency-check.txt`
      2. `cat .sisyphus/evidence/task-7-dependency-check.txt`
    - Expected Result: Task 7 start criteria가 실행팀에 전달됨
    - Failure Indicators: Task 3/4/5/9 상태 미기록
    - Evidence: `.sisyphus/evidence/task-7-dependency-check.txt`

## Final Verification Wave

- [ ] F1. Plan compliance and no scope drift check — `unspecified-high`
  - Task 7 계획/Task 7 선행 조건, acceptance, evidence path가 실제 구현 요청 범위를 벗어나지 않는지 점검한다.

- [ ] F2. Preflight guard quality check — `oracle`
  - `GetLatestCompletedRun` 오염 위험, run_type 필터, DI wiring 누락 리스크가 명시되었는지 검증한다.

- [ ] F3. QA evidence readiness check — `unspecified-high`
  - `.sisyphus/evidence/task-7-*.log` 생성 요구 충족 여부와 실행 커맨드 재현성을 확인한다.

- [ ] F4. Next-step handoff check — `deep`
  - Task 11/14 진입 조건을 팀이 바로 이해할 수 있도록 `문서로 정리된 다음 단계`가 남아 있는지 확인한다.

## Commit Strategy

- Task 7는 계획문서 산출물만 작성 단계이므로 커밋은 보류. Task 7 코드 구현 단계에서 별도 커밋 계획 수립.

## Success Criteria

### Verification Commands
```bash
ls .sisyphus/plans/ai-agent-vps-task7-continuation.md  # Plan artifact exists
rg "Task 7\.0|Task 7\.1|Task 7\.2|evidence" .sisyphus/plans/ai-agent-vps-task7-continuation.md
```

### Final Checklist
- [ ] 모든 Task 7 사전 경계가 명확히 문서화되었는가
- [ ] 의존성(Task 3/4/5/9) 및 차단 조건이 실행 명세에 반영되었는가
- [ ] 실패 시나리오가 현재 API 스펙에 맞게 보정되었는가
- [ ] 실행 시작 시점(요건 충족) 가이드가 유지되는가
