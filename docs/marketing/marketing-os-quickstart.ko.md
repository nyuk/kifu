# Kifu 마케팅 OS 5분 사용 가이드

> 마지막 확인: 2026-03-17
> 범위: 첫 번째 Marketing OS MVP의 로컬 실행과 기본 운영 흐름

## 지금 가능한 것

현재 워크스페이스에는 아래가 들어가 있습니다.

- 프런트 경로: `/marketing`
- 백엔드 API: `/api/v1/marketing/*`
- DB 마이그레이션: `backend/migrations/034_marketing_os.sql`

이 MVP는 **Kifu 안에서 먼저 시작**하지만, 데이터와 API는 `product_key` 기준으로 나뉘어 있어서 나중에 다른 제품도 붙일 수 있습니다.

현재 기본 제품 키:

- `product_key = kifu`

## 현재 MVP 범위

지금 바로 써볼 수 있는 흐름은 아래입니다.

1. 아이디어를 인박스에 저장
2. 채널별 초안 생성
3. 초안 검토 및 편집
4. 승인 상태 변경

현재 채널:

- `X`
- `네이버 블로그`
- `유튜브`

현재 생성 방식:

- 템플릿 기반 서버 생성
- 사람 승인 우선
- 자동 발행 잡은 아직 없음

## 로컬에서 중요한 설정

확인할 env 파일:

- `backend/.env`
- `frontend/.env`

현재 로컬 포트:

- 프런트: `5173`
- 백엔드: `3080`
- PostgreSQL: `5432`

프런트 env:

- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3080/api`

백엔드 env:

- `PORT=3080`

## 필요한 마이그레이션

최소 아래 둘은 적용해야 합니다.

- `backend/migrations/033_monthly_reports.sql`
- `backend/migrations/034_marketing_os.sql`

`034_marketing_os.sql`이 만드는 테이블:

- `marketing_ideas`
- `marketing_drafts`
- `marketing_publications`

## 로컬 실행

### 백엔드

```bash
cd backend
go mod download
go run ./cmd
```

Windows에서 Go 캐시 권한 문제가 나면:

```bash
set GOCACHE=C:\path\to\kifu\backend\.gocache
go run ./cmd
```

### 프런트

```bash
cd frontend
npm install
npm run dev
```

## 페이지 열기

브라우저에서:

- `http://localhost:5173/marketing`

## 5분 운영 흐름

### 1. 마케팅 OS 들어가기

1. 로그인
2. `/marketing` 열기

### 2. 아이디어 저장

입력 항목:

- 제목
- 원본 메모
- 콘텐츠 각도
- 핵심 메시지
- 채널
- 선택 사항인 참고 링크

버튼:

- `인박스에 저장`

### 3. 초안 생성

아이디어 카드에서 원하는 채널 버튼을 누릅니다.

- `X 초안 생성`
- `네이버 블로그 초안 생성`
- `유튜브 초안 생성`

### 4. 초안 검토

초안 편집기에서 아래를 수정합니다.

- 제목
- 톤
- 본문
- 리스크 플래그
- 승인 상태

### 5. 승인 상태 변경

사용 버튼:

- `초안 저장`
- `승인`
- `보류`
- `폐기`

## 지금 실제로 되는 것

- 아이디어 저장
- 초안 저장
- 승인 상태 업데이트
- `product_key` 기반 구조
- 첫 `/marketing` UI

## 아직 없는 것

- 예약 발행
- 직접 X 발행
- 주간 성과 리포트
- 외부 지표 수집
- LLM 기반 초안 생성

## 지금 확인하면 좋은 포인트

1. 아이디어 저장 흐름이 정말 빠른지
2. 생성된 초안 구조가 승인하기에 충분한지
3. Kifu를 첫 워크스페이스로 유지한 채 다른 제품까지 확장해도 되는지
