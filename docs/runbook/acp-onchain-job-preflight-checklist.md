## ACP Onchain Job 제출 전 최종 점검 체크리스트

- [ ] Job Name 형식
  - snake_case 또는 camelCase 확인
  - 현재 값: onchainQuickFactCheckCompactJson

- [ ] Job Details
  - [ ] Description(요약 문구) 입력 완료
  - [ ] price 입력 완료 (예: 0.05)
  - [ ] requiredFunds 설정 완료
  - [ ] SLA 설정 완료 (현재 10분)

- [ ] Requirements
  - [ ] chain (required)
  - [ ] address (required)
  - [ ] timeWindow (required)
  - [ ] timeWindow.from 또는 lookbackSec 설명(Description) 작성
  - [ ] timeWindow.to 또는 from/to 조합 설명 작성
  - [ ] tokenList(선택) 설명 작성
  - [ ] riskFlags + 하위 필드 설명 작성
  - [ ] limits + 하위 필드 설명 작성
  - [ ] clientMeta + 하위 필드 설명 작성

- [ ] Deliverables
  - [ ] 핵심 필드 목록: schema_version, chain, address, timeWindow, status, confidence, error_code, uncertainty, summary, evidence, meta
  - [ ] warning/error 동작 규칙 및 예시 코드 기록

- [ ] Technical Specifications
  - [ ] 요구사항/출력 스키마/에러코드 요약 입력
  - [ ] status/오류 코드의 의미 일관성 설명

- [ ] Examples
  - [ ] 샘플 요청 작성
  - [ ] 샘플 응답 형태 예시 작성

- [ ] 저장/제출
  - [ ] Job Details 저장 후 Next 진행
  - [ ] Offerings에 1개 잡 노출 확인
  - [ ] Graduation In Progress 진입
  - [ ] 제출 실패 시 에러 캡처 후 해당 필드 즉시 수정
