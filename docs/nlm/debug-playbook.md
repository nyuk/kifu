> **Language policy (v1.0-first, English default):**
> - Primary language for repo documentation: English.
> - Baseline is v1.0; v1.1 changes are documented as extension notes only.
> - 한국어는 보조 문맥(필요 시)로 제공됩니다.

# 디버깅 플레이북 (generate-latest 우선)

## 1단계: 공통 확인
1. 인증 토큰 유효성 확인
2. 대상 사용자의 run 존재 여부 확인
3. 직전 배포 해시와 브랜치 확인(`main`)

## 2단계: API 재현
- 호출:
  - `POST /api/v1/packs/generate-latest`
- 기대:
  - 성공: `pack_id`, `source_run_id`, `anchor_ts` 반환
  - 실패: `NO_COMPLETED_RUN`(404)
- 즉시 검증:
  - `GET /api/v1/packs/{pack_id}`(성공 시)

## 에러 코드 대응

| 증상 | 우선 조치 | 확인 파일 |
|---|---|---|
| `NO_COMPLETED_RUN` | 최근 `completed` run 부재 확인 | `run_repository_impl.go`, `run` 저장테이블 |
| `500` 응답 | pack 생성기/저장 실패 로그 확인 | `pack_handler.go`, pack 생성 서비스 |
| 타 사용자 데이터 노출 의심 | 스코프 조건/쿼리에서 사용자 ID 조건 재확인 | `run_repository_impl.go` |

## 30d 버튼 전용 스모크 테스트
1. 로그인
2. ExchangeConnectionManager에서 “팩 생성(30d)” 실행
3. generate-latest 응답에서 `pack_id` 확보
4. `GET /api/v1/packs/{pack_id}`로 조회
5. 상태/요약 타임스탬프/결과 존재 여부 체크

## 재현 체크리스트
- 테스트 계정에서 completed run이 없는 상태에서 호출해 실패재현
- completed run이 다수인 상태에서 최신 규칙(finished_at, started_at) 충족 확인
- 서로 다른 사용자/계정에서 동일 요청을 병렬 실행해 scope 분리 확인
