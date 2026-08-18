Section-ID: toss_wireframes-21
Auto-Enrich: false
Last-Reviewed: 2026-03-01
Primary-Sources: internal

## 9-1. login.tsx — Toss OAuth 브릿지

```
┌─────────────────────────┐
│                         │
│       [Asset: Logo]     │
│    "테일로그에 오신 걸    │
│     환영합니다"          │
│                         │
│                         │
│  ┌───────────────────┐  │
│  │  토스로 시작하기    │  │  ← Button(primary, full-width, loading)
│  └───────────────────┘  │
│                         │
│   이용약관 · 개인정보    │  ← TextButton × 2
└─────────────────────────┘
```

**사용 컴포넌트**: `Asset`, `Button`, `TextButton`, `Toast`, `Loader`
**로직**: `appLogin()` → Edge Function(`login-with-toss`) → `setSession()` → onboarding or dashboard
- 에러 시: `useToast("로그인에 실패했어요. 다시 시도해주세요")`
- Edge Function 콜드스타트 3-5초 대응 로딩 상태 포함

---

## 9-2. onboarding/survey.tsx — 7단계 반려견 설문

```
┌─────────────────────────┐
│ ← (BackButton)          │  ← Navbar.BackButton
│ ■■■■■□□  3/7            │  ← ProgressBar(value=3/7)
├─────────────────────────┤
│                         │
│ "반려견의 이름을          │
│  알려주세요"             │
│                         │
│ ┌───────────────────┐   │
│ │ 이름 입력           │   │  ← TextField(label="이름")
│ └───────────────────┘   │
│                         │
│ ┌───────────────────┐   │
│ │ 품종 선택           │   │  ← Dropdown(options=breeds)
│ └───────────────────┘   │
│                         │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │     다음           │  │  ← BottomCTA > Button
│  └───────────────────┘  │
└─────────────────────────┘
```

**사용 컴포넌트**: `Navbar(.BackButton)`, `ProgressBar`, `TextField`, `Dropdown`, `Radio`, `Checkbox`, `NumericSpinner`, `BottomCTA`, `Button`
**스텝 구성**: 이름 → 품종 → 나이(NumericSpinner×2: 년+개월) → 체중 → 중성화 → 문제행동(8개 Checkbox+기타 TextField) → 목표 설정
- Step 6 카테고리(8개): 짖음/울음, 공격성, 분리불안, 파괴행동, 마운팅, 과잉흥분, 배변문제, 공포/회피 + 기타 자유입력 TextField
- quick-log Fast 탭 프리셋과 연동 (서베이 선택 → quick-log 칩 자동 설정)
**팁**: 각 스텝은 동일 레이아웃에 입력 컴포넌트만 교체. `SegmentedControl`로 선택형 스텝 구현 가능.

---

## 9-3. dashboard/index.tsx — 메인 대시보드

```
┌─────────────────────────┐
│ 테일로그     [🔔] [⚙️]   │  ← Navbar(.Title, IconButton×2)
├─────────────────────────┤
│ [기록] [분석] [훈련●]  │  ← Tab(3탭, B2B는 +[운영])
├─────────────────────────┤
│ ┌───────────────────┐   │
│ │ 🐕 뽀삐  ▸        │   │  ← ListRow(.Icon, .Texts, .RightTexts)
│ │ 오늘 기록 3건      │   │     Badge("3", variant="info")
│ └───────────────────┘   │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  ← Border
│ ┌───────────────────┐   │
│ │ 📋 최근 ABC 기록   │   │  ← ListHeader
│ ├───────────────────┤   │
│ │ 짖음 → 산책 중     │   │  ← ListRow × N (스크롤)
│ │ 14:30  Badge:높음  │   │     Badge("높음", variant="danger")
│ ├───────────────────┤   │
│ │ 점프 → 손님 방문   │   │
│ │ 10:15  Badge:보통  │   │
│ └───────────────────┘   │
│                         │
│         (Skeleton)      │  ← Skeleton(pattern="topList") 로딩 시
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │   + 빠른 기록      │  │  ← BottomCTA > Button(primary)
│  └───────────────────┘  │
└─────────────────────────┘
```

**사용 컴포넌트**: `Navbar(.Title)`, `IconButton`, `Tab`, `ListRow(.Icon, .Texts, .RightTexts)`, `ListHeader`, `Badge`, `Border`, `Skeleton`, `BottomCTA`, `Button`
**Tab 구성**: Tab(3탭 B2C / 4탭 B2B — [기록][분석][훈련][운영])
- [훈련] 탭: Badge dot ● (미완료 미션 시)
- B2B [운영] 탭은 role 기반 동적 표시 (B2C에선 숨김)
**상태**: 로딩 시 `Skeleton(pattern="topList")`, 빈 목록 시 `Result` 컴포넌트로 빈 상태 표시

---

## 9-4. dashboard/quick-log.tsx — ABC 빠른 기록 (2탭: 빠른/상세)

```
┌─ useBottomSheet ────────┐
│ ┌───────────────────┐   │
│ │  빠른 기록         │   │  ← ListHeader
│ └───────────────────┘   │
│                         │
│ ┌──────────┬──────────┐ │
│ │  [빠른]  │  [상세]   │ │  ← SegmentedControl(2 segments)
│ └──────────┴──────────┘ │
│                         │
│ ═══ 빠른 탭 (기본) ═══  │
│                         │
│ [짖음/울음] [공격성]     │  ← Chip ×8 (TouchableOpacity+Badge)
│ [분리불안] [파괴행동]    │     원탭 = 즉시저장(intensity=3)
│ [마운팅] [과잉흥분]      │     서베이 Step 6 동일 카테고리
│ [배변문제] [공포/회피]   │
│ [+ 기타]                │
│                         │
│ 날짜: 오늘 · 시간: 지금  │  ← 자동 기본값(today+now)
│ TextButton("변경")      │     → 확장 시:
│                         │     날짜 SegmentedControl
│                         │       [오늘/어제/날짜선택]
│                         │     시간 Dropdown[오전/오후]
│                         │       + NumericSpinner
│                         │
│ ═══ 상세 탭 ═══         │
│                         │
│ 행동(B) *필수            │  ← TextField(label="행동")
│ ┌───────────────────┐   │
│ │ 어떤 행동을 했나요? │   │
│ └───────────────────┘   │
│                         │
│ ▶ 선행(A)      [펼치기] │  ← Accordion(Animated.View)
│ ▶ 결과(C)      [펼치기] │     칩 프리셋 + 기타 TextField
│ ▶ 강도/시간    [펼치기] │     Slider + 날짜/시간 선택
│                         │
│ ┌───────────────────┐   │
│ │      저장          │   │  ← Button(primary)
│ └───────────────────┘   │
└─────────────────────────┘
```

**사용 컴포넌트**: `useBottomSheet`, `ListHeader`, `SegmentedControl`, `TouchableOpacity`+`Badge`(Chip), `TextField`, `Slider`, `NumericSpinner`, `Dropdown`, `Animated.View`(Accordion), `Button`
**로직**: 저장 시 Supabase `behavior_logs` 테이블 INSERT → 대시보드 리프레시
- Chip = TouchableOpacity + Badge 래퍼 (TDS 미지원)
- Accordion = Animated.View height 보간 (TDS 미지원)

---

## 9-5. dashboard/analysis.tsx — 행동 분석 차트

```
┌─────────────────────────┐
│ ← 행동 분석              │  ← Navbar(.BackButton, .Title)
├─────────────────────────┤
│ [주간] [월간] [전체]     │  ← SegmentedControl
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │ ▌                 │  │
│  │ ▌  ▌              │  │  ← BarChart(data=weeklyLogs)
│  │ ▌  ▌  ▌     ▌     │  │
│  │ 월 화 수 목 금 토 일│  │
│  └───────────────────┘  │
│                         │
│                         │
│  ┌───────────────────┐  │
│  │ 🕸 원인 분석       │  │  ← WebView(Chart.js Radar)
│  │ (5차원 레이더)     │  │     lib/charts/ChartWebView.tsx
│  │  [Radar Chart]    │  │     TDS 색상 토큰 매칭
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ 🗓 시간대별 밀도   │  │  ← WebView(Chart.js Heatmap)
│  │ (요일×시간)        │  │     lib/charts/ChartWebView.tsx
│  │  [Heatmap]        │  │
│  └───────────────────┘  │
│                         │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  ← Border
│ ┌───────────────────┐   │
│ │ 📋 행동별 빈도     │   │  ← ListHeader
│ ├───────────────────┤   │
│ │ 짖음       12회    │   │  ← ListRow(.Texts, .RightTexts)
│ ├───────────────────┤   │
│ │ 점프        8회    │   │  ← ListRow
│ ├───────────────────┤   │
│ │ 물기        3회    │   │  ← ListRow
│ └───────────────────┘   │
│                         │
│ 📊 전체 트렌드: 개선중 ↓ │  ← BottomInfo
└─────────────────────────┘
```

**사용 컴포넌트**: `Navbar(.BackButton, .Title)`, `SegmentedControl`, `BarChart`, `WebView`(Chart.js via `@granite-js/native/react-native-webview`), `Border`, `ListHeader`, `ListRow(.Texts, .RightTexts)`, `BottomInfo`
**데이터**: Supabase `behavior_logs` 집계 쿼리 → 차트 데이터 변환
- `lib/charts/ChartWebView.tsx` 재사용 컴포넌트 (WebView + Chart.js, TDS 색상 토큰 매칭)
- Victory Native 사용 불가 (토스 미니앱 샌드박스 제한). TDS BarChart(단순 막대) + WebView Chart.js(Radar, Heatmap) 하이브리드

---

## 9-6. coaching/result.tsx — AI 행동 진단 (6블록)

```
┌─────────────────────────┐
│ ← AI 행동 진단           │  ← Navbar(.BackButton, .Title)
├─────────────────────────┤
│  ScrollView              │
│                         │
│  ┌───────────────────┐  │  ← ① insight (무료)
│  │ [Asset: AI 아이콘] │  │     패턴 요약 텍스트
│  │ "뽀삐의 짖음은     │  │
│  │  분리불안 패턴과    │  │
│  │  일치합니다."      │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │  ← ② action_plan (무료)
│  │ 📋 3단계 교정      │  │     ListHeader + ListRow×3
│  │    프로토콜        │  │     Badge("1단계"/"2단계"/"3단계")
│  ├───────────────────┤  │
│  │ Step 1: 탈감작     │  │
│  │ Step 2: 안전 공간  │  │
│  │ Step 3: 보상 체계  │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │  ← ③ dog_voice (무료)
│  │ 🐕 뽀삐의 마음     │  │     말풍선 커스텀
│  │ ┌─ 말풍선 ──────┐ │  │     View + Shadow + Border
│  │ │"혼자 있으면    │ │  │
│  │ │ 불안해요."     │ │  │
│  │ └───────────────┘ │  │
│  └───────────────────┘  │
│                         │
│  ═══ 잠금 영역 ═══      │  ← PRO/광고 해제 필요
│                         │
│  ┌───────────────────┐  │  ← ④ next_7_days_plan (Skeleton)
│  │ 📅 7일 훈련 계획   │  │     ListHeader + ListRow×7
│  │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  │     Skeleton 블러
│  │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  │
│  │                   │  │
│  │ TextButton:       │  │  ← "다른 접근 방식 보기"
│  │ "다른 접근 방식    │  │     → Plan B/C 바텀시트
│  │  보기"            │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │  ← ⑤ risk_signals (Skeleton)
│  │ ⚠️ 위험 신호       │  │     Badge(variant="danger")×N
│  │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  │     Skeleton 블러
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │  ← ⑥ consultation_questions (Skeleton)
│  │ 💬 전문가 질문     │  │     ListRow×3
│  │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  │     Skeleton 블러
│  └───────────────────┘  │
│                         │
│  TextButton:            │  ← R3 Rewarded Ad
│  "광고 보고 오늘의      │     → 잠긴 ④⑤⑥ 1회 해제
│   코칭 열기"            │
│                         │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │  훈련 시작하기     │  │  ← BottomCTA > Button(primary)
│  └───────────────────┘  │     → training-academy
│  TextButton("PDF 리포트 │  ← PRO 전용
│   다운로드(PRO)")       │
└─────────────────────────┘
```

**사용 컴포넌트**: `Navbar(.BackButton, .Title)`, `ScrollView`, `Asset`, `ListHeader`×6, `ListRow`×N, `Badge`, `Shadow`, `Border`, `Skeleton`(블러), `TextButton`, `BottomCTA`, `Button`
**로직**:
- 잠금 범위: ①②③ = 무료, ④⑤⑥ = Skeleton (PRO/광고 해제)
- R3 Rewarded Ad: "광고 보고 오늘의 코칭 열기" → 잠긴 3블록 1회 해제
- Plan B/C: ④7일플랜 하단 "다른 접근 방식 보기" TextButton → 바텀시트(현재/대안1/대안2)
- 데이터: Edge Function `generate-coaching` → insight, action_plan, dog_voice, next_7_days_plan, risk_signals, consultation_questions

---

## 9-7. training/academy.tsx — 훈련 아카데미 (커리큘럼 기반)

```
┌─────────────────────────┐
│ ← 훈련 아카데미          │  ← Navbar(.BackButton, .Title)
├─────────────────────────┤
│ ┌───────────────────┐   │
│ │ 📋 오늘의 훈련     │   │  ← ListHeader + ListRow
│ ├───────────────────┤   │     Badge("D-3")
│ │ 분리불안 Day 3     │   │     현재 진행 중인 커리큘럼 스텝
│ └───────────────────┘   │
│                         │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  ← Border
│                         │
│ ┌──────┐ ┌──────┐      │
│ │ 🎯   │ │ 🦮   │      │  ← GridList(columns=2)
│ │분리   │ │짖음   │      │     7개 커리큘럼 카드
│ │불안   │ │소음   │      │     DogCoach 정적 데이터 포팅
│ │Badge: │ │Badge: │      │
│ │추천 ✓ │ │진행중 │      │     Badge("추천"): AI 서베이 기반
│ │60%   │ │30%   │      │     ProgressBar 진행률
│ └──────┘ └──────┘      │
│ ┌──────┐ ┌──────┐      │
│ │ 🐾   │ │ 🏠   │      │
│ │배변   │ │이식증 │      │
│ │Badge: │ │Badge: │      │
│ │미시작 │ │잠금🔒 │      │     무료: 추천 1개 전체
│ └──────┘ └──────┘      │     PRO: 7개 전체 + Plan C
│ ┌──────┐ ┌──────┐      │
│ │ 🦶   │ │ 🐕🐕 │      │
│ │산책   │ │다견   │      │
│ │Badge: │ │Badge: │      │
│ │미시작 │ │잠금🔒 │      │
│ └──────┘ └──────┘      │
│ ┌──────┐               │
│ │ 😰   │               │
│ │공포   │               │
│ │Badge: │               │
│ │잠금🔒 │               │
│ └──────┘               │
└─────────────────────────┘
```

**사용 컴포넌트**: `Navbar(.BackButton, .Title)`, `ListHeader`, `ListRow`, `Badge`("추천"/"진행중"/"미시작"/"잠금"), `GridList`, `ProgressBar`, `Border`
- 7개 커리큘럼: separation_anxiety, barking_noise, toilet_training, pica_correction, leash_walking, multi_dog, fear_avoidance
- DogCoach Frontend/src/data/curriculum/ 정적 데이터 포팅 (각 5-6일 × 3스텝, ~100스텝, ~150대안)
- 구독 차별화: 무료=AI추천 1개 전체 접근, PRO=7개 전체+Plan C(AI 동적 생성)
- 진행 방식: 권장 순서 표시 + 자유 접근 (Day 선택 가능)

---

## 9-8. dog/profile.tsx — 반려견 프로필

```
┌─────────────────────────┐
│ ← 반려견 프로필           │  ← Navbar(.BackButton, .Title)
├─────────────────────────┤
│        ┌─────┐          │
│        │ 📷  │          │  ← Asset(type="image", circular)
│        │프로필│          │     TouchableOpacity → 이미지 변경
│        └─────┘          │
│                         │
│ ┌───────────────────┐   │
│ │ 이름     [뽀삐   ]│   │  ← TextField(label="이름")
│ └───────────────────┘   │
│ ┌───────────────────┐   │
│ │ 품종     [비숑   ]│   │  ← TextField(label="품종")
│ └───────────────────┘   │
│ ┌───────────────────┐   │
│ │ 나이     [3살    ]│   │  ← TextField(label="나이")
│ └───────────────────┘   │
│ ┌───────────────────┐   │
│ │ 체중     [5.2 kg ]│   │  ← TextField(label="체중")
│ └───────────────────┘   │
│                         │
│ ┌───────────────────┐   │
│ │ 중성화 여부    [●]│   │  ← Switch
│ └───────────────────┘   │
│                         │
│ ┌───────────────────┐   │
│ │ ▶ 환경 정보       │   │  ← Accordion(접이식)
│ │  주거형태 Dropdown │   │     아파트/주택/빌라
│ │  가족 수 NumericSp │   │     NumericSpinner
│ │  주 양육자 TextField│  │
│ └───────────────────┘   │
│ ┌───────────────────┐   │
│ │ ▶ 건강 정보       │   │  ← Accordion(접이식)
│ │  건강 상태 Dropdown│   │     양호/질환있음/관리중
│ │  선호 간식 TextField│  │
│ └───────────────────┘   │
│ ┌───────────────────┐   │
│ │ ▶ 행동 트리거     │   │  ← Accordion(접이식)
│ │  문제행동 Checkbox │   │     서베이 Step 6 편집 가능
│ │  (8개 카테고리)    │   │     짖음/공격성/분리불안/...
│ └───────────────────┘   │
│                         │
│ ┌───────────────────┐   │
│ │  반려견 삭제        │   │  ← TextButton(color="danger")
│ └───────────────────┘   │     → useDialog 확인
│                         │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │      저장          │  │  ← BottomCTA > Button(primary)
│  └───────────────────┘  │
└─────────────────────────┘
```

**사용 컴포넌트**: `Navbar(.BackButton, .Title)`, `Asset`, `TextField` × 4, `Switch`, `Animated.View`(Accordion), `Dropdown`, `NumericSpinner`, `Checkbox`, `TextButton`, `useDialog`, `BottomCTA`, `Button`
**검증**: 필수 필드(이름, 품종) 미입력 시 `TextField(error="필수 항목입니다")`, Button disabled 처리

---

## 9-9. settings.tsx — 설정

```
┌─────────────────────────┐
│ ← 설정                   │  ← Navbar(.BackButton, .Title)
├─────────────────────────┤
│ ┌───────────────────┐   │
│ │ 📋 알림 설정       │   │  ← ListHeader
│ ├───────────────────┤   │
│ │ 푸시 알림      [●] │   │  ← ListRow + Switch
│ ├───────────────────┤   │
│ │ 훈련 리마인더  [●] │   │  ← ListRow + Switch
│ ├───────────────────┤   │
│ │ 코칭 알림      [○] │   │  ← ListRow + Switch
│ └───────────────────┘   │
│                         │
│ ┌───────────────────┐   │
│ │ 📋 계정           │   │  ← ListHeader
│ ├───────────────────┤   │
│ │ 프로필 편집     ▸  │   │  ← ListRow(.Texts, .RightTexts)
│ ├───────────────────┤   │
│ │ 이용약관        ▸  │   │  ← ListRow
│ ├───────────────────┤   │
│ │ 개인정보 처리방침 ▸│   │  ← ListRow
│ └───────────────────┘   │
│                         │
│ ┌───────────────────┐   │
│ │ 📋 서비스          │   │  ← ListHeader
│ ├───────────────────┤   │
│ │ 구독 관리       ▸  │   │  ← ListRow → subscription
│ ├───────────────────┤   │
│ │ 내 반려견        ▸  │   │  ← ListRow → dog-profile
│ └───────────────────┘   │
│                         │
│ ┌───────────────────┐   │
│ │ 로그아웃            │   │  ← TextButton(color="danger")
│ └───────────────────┘   │
│ ┌───────────────────┐   │
│ │ 회원탈퇴            │   │  ← TextButton(color="danger")
│ └───────────────────┘   │     → useDialog(확인 다이얼로그)
│                         │
│ v1.0.0                  │  ← BottomInfo
└─────────────────────────┘
```

**사용 컴포넌트**: `Navbar(.BackButton, .Title)`, `ListHeader`(알림/계정/서비스/로그아웃 4섹션), `ListRow`, `Switch`, `TextButton`, `useDialog`, `BottomInfo`
**로직**: 회원탈퇴 시 `useDialog` → 확인 → Supabase Auth `deleteUser()` → 로그인 화면 이동

---

## 9-10. ops/today.tsx — B2B Ops Queue (트레이너/관리자용)

```
┌─────────────────────────┐
│ Ops 대시보드    [👤 관리자]│  ← Navbar(.Title) + Badge("관리자")
├─────────────────────────┤
│ [미기록] [주의필요] [리포트미발송] [내담당] │  ← Tab(4개 탭, B2B PRD 기준)
├─────────────────────────┤
│ ┌───────────────────┐   │
│ │ 🐕 뽀삐 / 김지영  │   │  ← ListRow(.Icon, .Texts)
│ │ "짖음 문제"       │   │     Badge("긴급", variant="danger")
│ │ 14:30 접수        │   │
│ ├───────────────────┤   │
│ │ 🐕 초코 / 박민수  │   │  ← ListRow
│ │ "산책 교정"       │   │     Badge("일반", variant="info")
│ │ 13:00 접수        │   │
│ ├───────────────────┤   │
│ │ 🐕 루비 / 이수진  │   │  ← ListRow
│ │ "분리불안"        │   │     Badge("대기", variant="warning")
│ │ 11:30 접수        │   │
│ └───────────────────┘   │
│                         │
│ FlatList (무한 스크롤)    │  ← RN FlatList + Loader
│                         │
│ 총 12건 / 오늘 완료 5건  │  ← BottomInfo
└─────────────────────────┘
```

**사용 컴포넌트**: `Navbar(.Title)`, `Badge`, `Tab`, `ListRow(.Icon, .Texts)`, `FlatList`(RN 기본), `Loader`, `BottomInfo`
**권한**: `role IN ('trainer', 'org_owner', 'org_staff')` RLS 정책 필수. 일반 사용자 접근 시 `ErrorPage` 표시

---

