# 2026-02-22 Admin Audit Visibility Extension

## 작업 정리

### 1) 관리자 대시보드 상세화 보강
- `/admin`에서 최근 감사 로그 요약을 추가
  - 최근 15건 조회로 핵심 변경량을 즉시 노출
  - Top 액션 / Top 대상 / Top 액터 집계 카드 추가
- 감사 로그 행에 액션/대상 배지를 추가해 가독성 개선
- 최근 감사 로그 리스트에서 정책/액션 기반 하이라이트를 적용

### 2) 감사 로그 페이지 하이라이트 확장
- `/admin/audit-logs`에 액션/리소스별 뱃지 스타일 적용
- 주요 행(`admin.policy.update`, `user.admin.update`) 배경 강조
- 상세 정보 렌더를 명확하게 분리 (`대상`과 `대상 상세` 컬럼 정렬)

### 3) 감사 로그 탐색 UX 확장
- 필터 칩(Quick Filter) 추가
  - 액션 칩: `권한 변경`, `정책 변경`
  - 리소스 칩: `user`, `policy`, `admin`
- 칩 토글 동작
  - 동일 칩 재클릭 시 필터 해제
  - 다중 선택 가능 + `필터 해제` 즉시 초기화
- 기존 셀렉트 필터는 유지

### 4) 문서 업데이트
- `docs/todo.md` 항목 완료 반영
- `docs/roadmap.md` 완료 상태 반영

## 검증

- Backend
  - 커밋 기반 변경은 프론트/백엔드 API 정합성 위주로 진행
- Frontend
  - `cd frontend && npm run typecheck` ✅
  - `cd frontend && npm run build` ✅
  - `cd frontend && npm run lint` ⚠️
    - 기존 베이스 이슈: `frontend/app/guest/page.tsx`의 `React Hook "useMemo"` 조건부 호출 (새 변경사항과 무관)

## 커밋

- `0fcd744` feat(admin): enrich dashboard audit summary and log highlights
- `9e42317` feat(admin): add quick filters to audit logs

## 다음 단계(추천)

- `/admin/audit-logs`에 액션별/리소스별 일별 집계 차트 추가
- 로그 상세 JSON을 key-value 뱃지 형태로 파싱해서 노출
- 필터 상태를 URL 쿼리로 동기화해 공유 가능한 감사 로그 URL 제공
