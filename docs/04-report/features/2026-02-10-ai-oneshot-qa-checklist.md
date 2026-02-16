> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# AI One-shot 수동 QA 체크리스트 (brief/detailed/technical)

이 문서는 `BubbleCreateModal -> Ask AI -> /v1/ai/one-shot` 경로의 응답 품질을 수동으로 점검하기 위한 기준입니다.

## 목표
- 응답이 설명 위주가 아니라 `행동 제안` 중심으로 나오는지 확인
- 포지션/증거 패킷이 있을 때 실제 데이터 기반으로 답하는지 확인
- prompt type(`brief`, `detailed`, `technical`)별 포맷이 깨지지 않는지 확인

## 사전 조건
- 백엔드/프론트 실행 중
- AI 키 설정 완료(`OPENAI_API_KEY` 등)
- 테스트 계정 로그인 완료
- 차트에서 말풍선 생성 모달 열기 가능

## 공통 준비 데이터
1. 심볼: `BTCUSDT`
2. 타임프레임: `1d`
3. Evidence Packet: `패킷 데이터 포함 ON`
4. 현재 포지션 포함: `ON` (open position 1개 이상)
5. 메모 예시: `손절 기준 이탈 같아 보임. 축소/정리 중 무엇이 맞는지 확인`
6. 태그 예시: `risk,sl`

## 케이스 A: brief
1. Prompt Type을 `Brief`로 선택
2. `Ask AI` 실행

합격 기준:
1. 항목 수가 6개 포맷(상황/핵심근거/리스크/행동제안/사용자판단대비/결론)으로 유지
2. `행동 제안`이 `유지|축소|정리|추가|관망|진입` 중 하나로 시작
3. 포지션이 있을 때 기준 위반 맥락이면 `축소` 또는 `정리` 제안이 우선적으로 나옴
4. 패킷의 포지션/체결/요약 중 최소 1개를 직접 언급

실패 예:
- 행동 제안이 모호함(예: "상황을 지켜보세요"만 반복)
- 패킷 데이터 언급 없이 일반론만 출력

## 케이스 B: detailed
1. Prompt Type을 `Detailed`로 선택
2. `Ask AI` 실행

합격 기준:
1. 8개 포맷(요약/근거/리스크/유효무효/행동제안/사용자판단대비/체크리스트/결론) 유지
2. 각 항목이 1~2줄 내로 짧게 유지
3. `행동 제안`은 단일 방향(유지/축소/정리/추가/관망/진입) + 이유 1줄
4. `사용자 판단 대비`에 메모 의도와 `일치/상충`이 명시

실패 예:
- 항목 누락(특히 행동 제안/사용자 판단 대비)
- 체크리스트가 3개 초과로 과도하게 길어짐

## 케이스 C: technical
1. Prompt Type을 `Technical`로 선택
2. `Ask AI` 실행

합격 기준:
1. 8개 포맷(추세/핵심레벨/무효화/시나리오/행동제안/사용자판단대비/추가확인데이터/결론) 유지
2. 핵심 레벨(지지/저항)이 최소 1개 이상 명시
3. 행동 제안이 단일 결정 형태로 제시
4. 애매한 경우 `추가 확인 데이터`가 한 줄로 포함

실패 예:
- 추세 설명만 있고 액션 결론이 없음
- 레벨/조건이 수치 없이 추상적 표현만 존재

## 회귀 체크(필수)
1. 동일 입력으로 2회 연속 호출 시 응답 포맷이 깨지지 않는지
2. 에러 발생 시 사용자 메시지가 명확한지 (`AI 의견을 가져오는데 실패했습니다...`)
3. One-shot 응답 후 복기 노트 저장 동작이 유지되는지

## 판정
- `A/B/C` 3케이스 모두 합격 + 회귀 체크 3개 통과 시 `PASS`
- 하나라도 실패 시 `FAIL`로 기록하고 실패 케이스와 응답 원문을 첨부

## 실패 기록 템플릿
```text
[FAIL] yyyy-mm-dd hh:mm
prompt_type: brief|detailed|technical
symbol/timeframe: BTCUSDT / 1d
issue: (예: 행동 제안 모호, 패킷 미참조)
response_excerpt: (핵심 2~3줄)
```

