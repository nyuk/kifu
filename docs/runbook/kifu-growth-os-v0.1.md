# KIFU Growth OS v0.1

## 1. 전체 설계 요약

Growth OS v0.1의 목표는 새로운 기능을 더 붙이는 것이 아니라, KIFU가 외부 사용자 행동을 측정하고 반복 가능한 운영 루프를 만들도록 하는 것입니다.

핵심 원칙:
- 기능 고도화보다 운영 자동화와 측정 가능성을 우선한다.
- 랜딩 전체 개편, 대형 리팩토링, 신규 구독 구조는 v0.1 범위 밖으로 둔다.
- 기존 코드베이스에 이미 있는 `jobs`, `marketing_os`, `monthly_reports` 패턴 위에 얹는다.

v0.1에서 실제로 만드는 축:
1. 퍼널 이벤트를 쌓는 이벤트 저장소
2. 전일 데이터를 바탕으로 X 초안/복기 요약을 만드는 일일 콘텐츠 파이프라인
3. 전일 성장 리포트를 저장하는 일일 배치
4. 외부 반응/내부 메모/개선 아이디어를 Inbox/Next/Later로 적재하는 피드백 저장소

## 2. 추천 파일 구조

### Backend
- `backend/migrations/036_growth_os_v0_1.sql`
  - growth 전용 테이블 추가
- `backend/internal/domain/entities/growth.go`
  - Growth OS 엔티티/상수
- `backend/internal/domain/repositories/growth_repository.go`
  - 저장소 인터페이스
- `backend/internal/infrastructure/repositories/growth_repository_impl.go`
  - Postgres 구현
- `backend/internal/services/growth_os_service.go`
  - 이벤트 기록, 콘텐츠 초안 생성, 일일 리포트 생성
- `backend/internal/jobs/growth_os.go`
  - 일일 리포트 생성 배치
- `backend/internal/interfaces/http/handlers/growth_handler.go`
  - 이벤트 수집 / 피드백 적재 / 최신 리포트 조회 핸들러

### Existing modules reused
- `backend/internal/jobs/monthly_report.go`
  - 배치 패턴 참고
- `backend/internal/services/marketing_service.go`
  - 콘텐츠 초안 저장/운영 OS 패턴 참고
- `backend/internal/domain/repositories/trade_repository.go`
  - 전일 거래 요약 재사용

## 3. 데이터 모델 / 저장 포맷 초안

### 3-1. growth_funnel_events
목적: 사용자의 성장 퍼널 이벤트를 raw log 형태로 저장

주요 컬럼:
- `user_id` nullable
- `guest_session_id` nullable
- `event_name`
- `source_path`
- `referrer`
- `metadata jsonb`
- `occurred_at`

예시:
```json
{
  "event_name": "guest_start",
  "guest_session_id": "guest-ab12cd34",
  "source_path": "/guest?mode=preview",
  "metadata": {
    "utm_source": "x",
    "entry_point": "landing_secondary_cta"
  },
  "occurred_at": "2026-03-21T00:14:00Z"
}
```

### 3-2. growth_feedback_items
목적: 외부 반응 / 내부 메모 / 개선 아이디어를 Inbox / Next / Later / Done으로 저장

주요 컬럼:
- `product_key`
- `source_type`
  - `external_reaction`
  - `internal_memo`
  - `improvement_idea`
- `bucket`
  - `inbox`, `next`, `later`, `done`
- `title`
- `body`
- `source_url`
- `metadata jsonb`

예시:
```json
{
  "product_key": "kifu",
  "source_type": "external_reaction",
  "bucket": "inbox",
  "title": "게스트 시작 후 CSV 업로드 위치를 모르겠다는 반응",
  "body": "X DM에서 온 피드백. guest 진입 후 다음 행동이 모호하다고 함.",
  "source_url": "https://x.com/...",
  "metadata": {
    "channel": "x",
    "handle": "@example"
  }
}
```

### 3-3. growth_daily_reports
목적: 전일 Growth OS 결과를 요약한 운영 리포트를 저장

주요 컬럼:
- `report_date`
- `status`
- `payload jsonb`
- `content_drafts_count`
- `issues_count`

payload 예시:
```json
{
  "generated_at": "2026-03-21T00:05:00Z",
  "report_date": "2026-03-20",
  "funnel": {
    "counts": {
      "visit": 42,
      "guest_start": 9,
      "signup_completed": 4,
      "csv_upload_completed": 2,
      "api_connect_completed": 1,
      "first_review_completed": 1
    },
    "drop_offs": [
      {
        "from": "visit",
        "to": "guest_start",
        "lost": 33,
        "note": "visit -> guest_start 전환에서 33명 이탈"
      }
    ]
  },
  "content": {
    "source_status": "ready",
    "review_summary": "전일 14건 거래 기준 가장 많이 다룬 심볼은 BTCUSDT였습니다.",
    "x_drafts": [
      {
        "kind": "problem",
        "title": "초안 1 · 기록이 없으면 판단도 없다",
        "content": "..."
      }
    ]
  },
  "issues": [
    {
      "code": "signup_without_import",
      "severity": "warning",
      "message": "회원가입 이후 CSV 업로드나 API 연결 완료가 없습니다."
    }
  ],
  "operator": {
    "recommended_actions": [
      "자동 생성된 X 초안 중 오늘 게시할 1개를 선택합니다."
    ]
  }
}
```

## 4. 이벤트 로깅 방식

v0.1에서는 두 층으로 나눈다.

### A. 즉시 가능한 방식
- `POST /api/v1/growth/events`
- public endpoint
- 프론트에서 `visit`, `guest_start`, 주요 이탈 포인트 같은 이벤트를 직접 쏠 수 있음

### B. 더 정확한 backend-side event (다음 단계)
- 회원가입 성공 직후: `signup_completed`
- CSV import 성공 직후: `csv_upload_completed`
- 거래소 sync 성공 직후: `api_connect_completed`
- 첫 guided review 완료 직후: `first_review_completed`

v0.1에서는 우선 event ingestion endpoint와 저장 구조를 만들고,
실제 핸들러 연결은 순차적으로 붙이는 것을 권장한다.

## 5. 일일 배치 흐름

배치 이름: `GrowthOSJob`

실행 방식:
- 서버 부팅 시 시작
- 1시간마다 체크
- 실제 대상은 `Asia/Seoul` 기준 전일 (`now - 1 day`)
- 같은 날짜 리포트가 이미 있으면 재생성하지 않음

흐름:
1. 전일 퍼널 이벤트 집계
2. `GROWTH_CONTENT_USER_ID` 기반 거래 요약 생성
3. X 초안 2~3개 + 복기용 요약 텍스트 생성
4. 주요 이슈 계산
5. operator action 제안 생성
6. `growth_daily_reports`에 저장

환경 변수:
- `GROWTH_OS_ENABLED=true`
- `GROWTH_CONTENT_USER_ID=<uuid>`

## 6. 초안 코드 / pseudocode

### Event ingestion
```go
POST /api/v1/growth/events
body := {
  event_name,
  guest_session_id,
  source_path,
  referrer,
  metadata,
  occurred_at,
}
service.TrackEvent(...)
```

### Daily report generation
```go
func (s *GrowthOSService) GenerateDailyReport(ctx, day) {
  counts := growthRepo.CountFunnelEventsByRange(dayStart, dayEnd)
  content := buildContentSection(GROWTH_CONTENT_USER_ID, tradeRepo.Summary(...))
  issues := buildFunnelIssues(counts) + contentIssues
  payload := {
    funnel: counts,
    content: content,
    issues: issues,
    operator: recommendedActions,
  }
  growthRepo.CreateDailyReport(payload)
}
```

### Content draft generation
```go
summary, _, symbols := tradeRepo.Summary(userID, yesterdayFilter)
reviewSummary := buildReviewSummary(summary, symbols)
xdrafts := buildXDrafts(summary, symbols)
```

## 7. 바로 착수할 TODO 리스트

### Phase 1 — 지금 바로 시작
1. `036_growth_os_v0_1.sql` 배포 적용
2. `GROWTH_OS_ENABLED`, `GROWTH_CONTENT_USER_ID` 설정
3. admin에서 최신 growth report를 보는 경로 연결
4. 프론트에서 `visit`, `guest_start` 이벤트부터 `/api/v1/growth/events`로 전송

### Phase 2 — 정확도 올리기
5. 회원가입 성공 시 `signup_completed` 로깅
6. CSV 업로드 완료 시 `csv_upload_completed` 로깅
7. API 연결 성공 시 `api_connect_completed` 로깅
8. 첫 guided review 완료 시 `first_review_completed` 로깅

### Phase 3 — 운영 루프 닫기
9. `growth_feedback_items`를 admin UI나 간단한 문서 export와 연결
10. X 초안 승인/게시 반자동 흐름 설계
11. 주요 이슈를 Slack/Telegram/이메일 중 한 채널로 요약 전송

## 8. 지금 당장 만들 필요 없는 것
- 랜딩 전체 개편
- 퍼널 시각화 대시보드 대형 구축
- AI 모델 추가/교체
- 자동 게시
- 구독/결제 구조 확대
- 세그먼트 기반 복잡한 실험 시스템

## 9. v0.1 판단 기준
v0.1이 성공인지 판단하는 기준은 기능 수가 아니라 아래 지표다.
- 외부 사용자 5명이 실제 사용
- 3명이 CSV 업로드 또는 API 연결 완료
- 2명이 첫 복기 완료
- 전일 퍼널 리포트가 매일 생성됨
- X 초안이 매일 2~3개 자동 생성됨
