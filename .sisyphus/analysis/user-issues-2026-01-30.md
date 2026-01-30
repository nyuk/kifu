# 사용자 보고 이슈 종합 분석
**날짜**: 2026-01-30
**보고자**: 사용자 (한국어)
**총 이슈 수**: 9개

## 이슈 요약

### 1. i18n 언어 설정 문제 ⚠️ 부분 구현됨
**사용자 보고**: "언어가 설정이 제대로 안되어있는거같아 전에 아이18엔 이걸로 통합해서 사용자의 언어에따라 보여준다고했던거같아"

**현재 상태**:
- ✅ i18n 시스템 구현됨 (`frontend/src/lib/i18n.ts`)
- ✅ 영어/한국어 번역 사전 완성 (230+ 키)
- ✅ 브라우저 언어 자동 감지 (`navigator.language`)
- ❌ 언어 전환 UI 없음
- ❌ 언어 설정 저장 기능 없음
- ⚠️ 일부 컴포넌트만 i18n 사용 중

**문제점**:
1. `components/Shell.tsx` - 하드코딩된 영어 문자열
2. `components/BubbleCreateModal.tsx` - 하드코딩된 한국어 문자열 (일관성 없음!)
3. `components-old/Trades.tsx` - i18n 사용 (올바른 패턴)
4. `components-old/Bubbles.tsx` - i18n 사용 (올바른 패턴)

**해결 방법**:
- 모든 현재 컴포넌트에 `useI18n()` 훅 적용
- Settings 페이지에 언어 선택기 추가
- localStorage에 언어 설정 저장
- `useLocale()` 수정하여 저장된 설정 우선 사용

---

### 2. 캔들 클릭 시 버블 상호작용 ❌ 미구현
**사용자 보고**: "캔들을 클릭시 기존버블이 있으면 기존버블 정보가 나와야하고 없는 캔들이면 버블 생성화면이 나와야해"

**현재 상태**:
- ❌ 캔들 클릭 이벤트 핸들러 없음
- ✅ "Create Bubble" 버튼만 존재 (항상 새 버블 생성)
- ✅ BubbleCreateModal 컴포넌트 존재
- ❌ 기존 버블 편집/상세 모달 없음

**필요한 구현**:
1. TradingView chart에 클릭 이벤트 리스너 추가
2. 클릭한 좌표를 시간/가격으로 변환
3. 해당 캔들에 버블이 있는지 확인
4. 있으면: 버블 상세/편집 모달 표시
5. 없으면: 버블 생성 모달 표시 (시간/가격 자동 입력)

**기술적 접근**:
- `chart.subscribeClick()` 사용
- `chart.timeScale().coordinateToTime()` - X좌표 → 시간
- `series.coordinateToPrice()` - Y좌표 → 가격
- 버블 데이터와 클릭 시간 매칭 (timeframe 고려)

---

### 3. 버블 위치 문제 🐛 버그
**사용자 보고**: "버블이 1일봉에만있는거같고 차트에 위치해있지 않아 이상해"

**현재 상태**:
- ✅ `shouldShowBubble()` 함수 구현됨 (timeframe 계층 필터링)
- ✅ 버블 좌표 계산 로직 구현됨
- 🐛 **버그 가능성**: 좌표 계산 또는 필터링 로직 오류

**분석**:
```typescript
// Chart.tsx lines 222-258
const positions = visibleBubbles.map(bubble => {
  const x = chartRef.current?.timeScale().timeToCoordinate(time)
  const y = seriesRef.current?.priceToCoordinate(price)
  // ...
})
```

**가능한 원인**:
1. `shouldShowBubble()` 로직 오류 - 1d만 통과?
2. 버블 데이터의 `timeframe` 필드가 모두 '1d'?
3. 좌표 계산 시 null 반환으로 필터링됨?
4. 차트 timeScale/priceScale 초기화 타이밍 문제?

**디버깅 필요**:
- 버블 데이터 확인 (timeframe 분포)
- 좌표 계산 결과 로깅
- `shouldShowBubble()` 반환값 확인

---

### 4. 기본 타임프레임 설정 ⚙️ 설정 변경 필요
**사용자 보고**: "첫화면 디폴트는 일봉 차트를 보여주는걸로하자"

**현재 상태**:
```typescript
// Chart.tsx line 94
const defaultInterval = match?.timeframe_default || symbols[0].timeframe_default || '1h'
```
- 현재 기본값: `'1h'` (1시간봉)
- 사용자 요청: `'1d'` (일봉)

**해결 방법**:
```typescript
const defaultInterval = match?.timeframe_default || symbols[0].timeframe_default || '1d'
```

**간단한 수정**: 1줄 변경

---

### 5. Bubbles 페이지 스크롤 문제 🎨 UX 개선 필요
**사용자 보고**: "버블스에서 최근 버블스들이 많아서 스크롤 내리기가 힘들어 이부분을 스크롤하기 쉽게 수정해줘 더미데이터들도"

**현재 상태**:
- `Bubbles.tsx` - 542줄의 긴 컴포넌트
- 버블 리스트: 50개 제한 (`limit: 50`)
- 스크롤 컨테이너 없음 (전체 페이지 스크롤)

**문제점**:
1. 버블 리스트 섹션에 고정 높이 + 스크롤 없음
2. 페이지네이션 없음
3. 무한 스크롤 없음
4. 가상 스크롤 없음

**해결 방법**:
```typescript
// Bubbles.tsx line 255 수정
<div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto">
  {bubbles.map(...)}
</div>
```

또는:
- 페이지네이션 추가
- 무한 스크롤 구현 (react-infinite-scroll-component)
- 가상 스크롤 (react-window)

---

### 6. AI 조언 더미 데이터 ❓ 기능 확인 필요
**사용자 보고**: "예전에는. 특정 버블을 누르면. 더미데이터로 이 에이아이는 이런 조언을했다고 나왔었어."

**현재 상태**:
- ✅ AI 의견 기능 완전 구현됨 (`Bubbles.tsx`)
- ✅ API 엔드포인트 존재:
  - `GET /v1/bubbles/{id}/ai-opinions` - 기존 의견 조회
  - `POST /v1/bubbles/{id}/ai-opinions` - 새 의견 요청
- ✅ 3개 프로바이더 지원: OpenAI, Claude, Gemini
- ❌ 더미 데이터 없음 (실제 API 호출만)

**가능성**:
1. 이전에 더미 데이터가 있었으나 삭제됨
2. 백엔드 API가 더미 응답을 반환했었음
3. 사용자가 실제 API 응답을 더미로 착각

**확인 필요**:
- 백엔드 AI opinion 핸들러 확인
- 더미 데이터 필요 여부 확인
- 개발 환경용 mock 데이터 추가?

---

### 7. 거래 패턴 분석 기능 📊 기능 확인 필요
**사용자 보고**: "그리고 버블이 많아서그런지 원래 기능이 추가가 안되었는지는 모르는데. 내 거래 패턴을 분석하는것도 필요해."

**현재 상태**:
- ✅ Trades 페이지 존재 (`Trades.tsx`)
- ✅ 거래 요약 통계:
  - 총 거래 수
  - 순 손익 (Net P&L)
  - 승률 (Win Rate)
  - 본전 거래 수
- ✅ 분석 기능:
  - 거래소별 분석
  - 매수/매도별 분석
  - 종목별 분석
  - P&L 분포 히스토그램
- ✅ 필터링: 거래소, 기간

**추가 가능한 패턴 분석**:
1. 시간대별 승률 (아침/점심/저녁)
2. 요일별 성과
3. 평균 보유 시간
4. 손절/익절 비율
5. 연속 승/패 패턴
6. 심볼별 승률 히트맵
7. 거래 빈도 추세

**구현 여부**: 사용자 요구사항 명확화 필요

---

### 8. 거래소 연동 및 CSV 업로드 ⚠️ 부분 구현됨
**사용자 보고**: "업비트 바이낸스에서 자동으로 거래내역 가져오는기능, 씨에스브이 파일을 업로드하면 자동으로 거래내역 등록해주는기능도 넣었었어."

**현재 상태**:

#### CSV 업로드:
- ✅ 프론트엔드 UI 존재 (`Trades.tsx`)
- ✅ 백엔드 핸들러 구현 (`TradeHandler.Import()`)
- ❌ **라우트 미등록** - `POST /api/v1/trades/import` 없음!
- ✅ CSV 파싱 로직 완성
- ✅ 버블 자동 생성 기능

#### 바이낸스 자동 연동:
- ✅ API 키 관리 (`ExchangeHandler`)
- ✅ 백그라운드 폴링 작업 (`TradePoller`)
- ✅ 300초마다 자동 동기화
- ✅ 증분 동기화 (마지막 trade ID 추적)
- ✅ API 키 암호화 (AES-256)

#### 업비트 연동:
- ⚠️ CSV 파싱에서 "upbit" 지원
- ❌ API 연동 미구현
- ❌ 자동 폴링 미구현

**문제점**:
1. **Trade 라우트 미등록** - 가장 큰 문제!
   ```go
   // routes.go에 추가 필요:
   trades := api.Group("/trades")
   trades.Post("/import", tradeHandler.Import)
   trades.Get("/", tradeHandler.List)
   trades.Get("/summary", tradeHandler.Summary)
   ```

2. **업비트 API 미구현**

**해결 우선순위**:
1. Trade 라우트 등록 (즉시)
2. 업비트 API 연동 (추후)

---

### 9. 추가 기억나는 기능 📝 대기 중
**사용자 보고**: "추후 또 기억나는게 있으면 말해줄게"

**대응**: 추가 요구사항 대기

---

## 우선순위 분류

### 🔴 긴급 (Blocker)
1. **Trade 라우트 미등록** - CSV 업로드 기능 작동 안 함
2. **버블 위치 버그** - 1d만 표시되는 문제

### 🟡 높음 (High Priority)
3. **캔들 클릭 상호작용** - 핵심 UX 기능
4. **i18n 통합** - 일관성 없는 언어 표시

### 🟢 중간 (Medium Priority)
5. **기본 타임프레임 변경** - 1줄 수정
6. **Bubbles 스크롤 개선** - UX 개선
7. **거래 패턴 분석** - 추가 기능

### 🔵 낮음 (Low Priority)
8. **AI 더미 데이터** - 확인 필요
9. **업비트 API 연동** - 추후 구현

---

## 다음 단계

1. **즉시 수정 (Quick Wins)**:
   - Trade 라우트 등록 (5분)
   - 기본 타임프레임 '1d'로 변경 (1분)
   - Bubbles 스크롤 컨테이너 추가 (5분)

2. **버그 수정**:
   - 버블 위치 문제 디버깅 및 수정

3. **기능 구현**:
   - 캔들 클릭 이벤트 핸들러
   - i18n 통합 (모든 컴포넌트)
   - 언어 선택기 UI

4. **사용자 확인 필요**:
   - AI 더미 데이터 필요 여부
   - 거래 패턴 분석 구체적 요구사항
   - 업비트 연동 우선순위
