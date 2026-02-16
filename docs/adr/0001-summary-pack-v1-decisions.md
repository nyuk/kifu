> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# ADR-0001 Summary Pack v1 설계 결정

## 제목
Summary Pack v1(요약 패턴) 생성 방식을 결정한다

## 상태
- 승인됨 (2026-02-13)
- 범위: `/api/v1/packs/*`, `runs`, `summary_packs`, Summary Pack v1 파이프라인

## 배경
Upbit/Binance 동기화 또는 CSV 임포트 완료 후, 거래/버블/포지션 데이터의 정합성을 간단하고 비용 효율적으로 요약해야 했다.  
목표는 “AI 없이도 재현 가능한 요약 + 건강검진 결과를 즉시 산출”하는 것이다.

### 문제 제기
1. 동기화 완료 직후 자동 요약이 생성되면 API 실패/네트워크 지연 시 사용자 UX가 깨짐.
2. 원본 거래를 외부로 보내는 것이 아니라 내부에서 결정론적으로 처리해야 함.
3. 운영 시 과금/트래픽을 고려한 최소 단위(회의/월별) 과금 구조와 맞물려야 함.

## 결정 1: 자동 생성 대신 수동 `팩 생성(30d)` 버튼
- **결정**: 동기화/임포트 후 자동으로 pack을 생성하지 않는다.
- **이유**
  - 동기화 성공/실패 여부와 무관하게 사용자가 시점/범위를 선택할 필요가 있다.
  - 대량 재시도 시 중복 생성 비용을 줄이기 위해 사용자 액션을 한 단계 분리한다.
- **대안**
  - 동기화 완료 트리거로 즉시 생성(버튼 0개)
  - 이벤트 큐 기반 비동기 생성(추가 인프라 필요)

## 결정 2: `runs`는 경량 메타, `source_run_id`는 `summary_packs`에만 보관
- **결정**: 거래/거래이벤트 테이블을 변경하지 않고 `runs` 테이블을 별도 트래킹 테이블로 사용한다.
- **이유**
  - 기존 동기화/임포트 로직을 건드리지 않고 최소 변경으로 운영 추적 가능.
  - `summary_packs`에서 `run`을 기준으로 추적하면 원인 분석(어느 동기화에서 생성됐는지)이 명확해짐.
- **대안**
  - 기존 테이블에 `source_run_id` 추가(모든 거래 테이블 전면 영향)
  - 완전 별도 이벤트 로그로만 관리(조회/권한 필터링 복잡도 증가)

## 결정 3: `funding_total` null 허용, funding 모듈이 없으면 missing 검사 생략
- **결정**: Summary Pack v1에서는 `funding_total`을 nullable로 둔다.
- **이유**
  - Binance 선물 모듈 미연동 환경이 혼재되어 있어 `0` 처리보다 `null`이 의미가 정확함.
  - `funding` 모듈이 제공되지 않는 경우 false-positive 누락경고를 방지.
- **실행 규칙**
  - run의 modules에 `funding`이 있으면서 선물 거래가 존재하면, 누락은 warning으로 판단.
  - funding 모듈이 없으면 해당 경고 규칙은 건너뛴다.

## 결정 4: `symbol_mapping_gap`는 strict 대신 `unknown/invalid` 시 warning만
- **결정**: 심볼 정규화 실패를 ERROR가 아니라 WARNING 처리한다.
- **이유**
  - 거래소별/데이터 공급자별 심볼 포맷 편차가 존재하여 정상 데이터도 잠깐씩 섞여 들어올 수 있음.
  - 초기에 과도한 실패 처리보다 사용자에게 보수적으로 알리는 게 운영상 유리.

## 결정 5: Summary Pack 자체는 **deterministic** 생성 + non-LLM
- **결정**:  v1에서는 LLM 호출 없이 규칙 기반 계산/건강검진.
- **이유**
  - 빠른 결과, 비용 예측 가능성, 회귀 테스트 쉬움.

## 결정 6: 팩 생성 멱등성 정책(현재)
- **결정**: 현재 구현은 `source_run_id + range` 기준으로 **중복 생성 가능**(매번 새 `pack_id`).
- **근거**
  - 디버깅 관점에서 재시도 이력을 모두 남길 수 있다.
  - 구현이 단순하고 즉시 배포 부담이 낮다.
- **추가 검토**
  - 운영 정책상 중복 폭주가 우려되면 `upsert` 또는 `GET latest then reuse`로 변경(ADR-0002 후보).

## 영향
- 라우팅: `/api/v1/packs/generate`, `/api/v1/packs/latest`, `/api/v1/packs/{pack_id}`
- 데이터: `runs`, `summary_packs` 마이그레이션 필요
- UI: 설정 화면에서 동기화 성공 후 `팩 생성(30d)` 버튼 노출

