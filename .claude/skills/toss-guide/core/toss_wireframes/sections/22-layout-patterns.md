Section-ID: toss_wireframes-22
Auto-Enrich: false
Last-Reviewed: 2026-03-01
Primary-Sources: internal

## 공통 레이아웃 패턴 (5가지)

화면 구현 시 아래 5가지 기본 패턴 중 하나를 베이스로 조합한다.

### 패턴 A: 목록형

```
┌─────────────────────────┐
│ Navbar                  │
├─────────────────────────┤
│ ListHeader              │
│ ListRow                 │
│ ListRow                 │
│ ListRow   (FlatList)    │
│ ...                     │
├─────────────────────────┤
│ BottomInfo              │
└─────────────────────────┘
```

**구조**: `Navbar` + `ListHeader` + `ListRow`(반복, `FlatList`/`ScrollView`) + `BottomInfo`
**사용 화면**: dashboard/index, ops/today, settings

### 패턴 B: 상세형

```
┌─────────────────────────┐
│ Navbar(.BackButton)     │
├─────────────────────────┤
│ ScrollView              │
│  ┌─────────────────┐   │
│  │ 콘텐츠 (Text,   │   │
│  │ Asset, ListRow)  │   │
│  └─────────────────┘   │
├─────────────────────────┤
│ BottomCTA > Button      │
└─────────────────────────┘
```

**구조**: `Navbar(.BackButton)` + `ScrollView` + 콘텐츠(`Text`, `Asset`, `ListRow` 등) + `BottomCTA`
**사용 화면**: coaching/result, welcome, survey-result, subscription, training-detail

### 패턴 C: 입력폼형

```
┌─────────────────────────┐
│ Navbar(.BackButton)     │
├─────────────────────────┤
│ ProgressBar (선택)      │
│                         │
│ TextField               │
│ TextField               │
│ Dropdown / Switch       │
│ ...                     │
├─────────────────────────┤
│ BottomCTA > Button      │
└─────────────────────────┘
```

**구조**: `Navbar(.BackButton)` + (선택)`ProgressBar` + `TextField`(들) + `BottomCTA`
**사용 화면**: onboarding/survey, dog/profile, dog/add

### 패턴 D: 탭형

```
┌─────────────────────────┐
│ Navbar                  │
├─────────────────────────┤
│ Tab                     │
├─────────────────────────┤
│ 콘텐츠 영역              │
│ (탭별 다른 콘텐츠)       │
├─────────────────────────┤
│ BottomCTA (선택)        │
└─────────────────────────┘
```

**구조**: `Navbar` + `Tab` + 컨텐츠영역 + (선택)`BottomCTA`
**사용 화면**: dashboard/index, dashboard/analysis, ops/today

### 패턴 E: 모달형 (BottomSheet)

```
┌─ useBottomSheet ────────┐
│ ListHeader              │
│                         │
│ 콘텐츠 (TextField,      │
│  ListRow, Button 등)    │
│                         │
│ Button (primary)        │
└─────────────────────────┘
```

**구조**: `useBottomSheet` + `ListHeader` + 콘텐츠(`ListRow`/`TextField`/`Button` 등)
**사용 화면**: dashboard/quick-log, dog-switcher, 필터/정렬 모달

---

### 패턴 조합 가이드

| 화면 | 기본 패턴 | 추가 조합 |
|------|----------|----------|
| login.tsx | — (단독) | `Asset` + `Button` + `TextButton` |
| onboarding/welcome.tsx | B (상세형) | 단일 카드 `Asset`(Lottie) + `BottomCTA` |
| onboarding/survey.tsx | C (입력폼형) | `ProgressBar` + 스텝별 입력 교체 |
| onboarding/survey-result.tsx | B (상세형) | `Skeleton`(블러) + `Badge` + 광고 CTA |
| onboarding/notification.tsx | B (상세형) | `Checkbox` × 3 + `Asset`(Lottie) |
| dashboard/index.tsx | D (탭형) + A (목록형) | `Tab` 내부에 `ListRow` 반복 |
| dashboard/quick-log.tsx | E (모달형) | `SegmentedControl`(빠른/상세) + 칩/Accordion |
| dashboard/analysis.tsx | D (탭형) | `BarChart` + `ListRow` 목록 |
| coaching/result.tsx | B (상세형) | `ScrollView` + 진단 중심 6블록 |
| training/academy.tsx | A (목록형) 변형 | `GridList` + `ProgressBar` |
| training/detail.tsx | B (상세형) | `Checkbox`(체크리스트) + `TextField`(메모) |
| dog/profile.tsx | C (입력폼형) | `Asset`(프로필) + `Switch` |
| dog/switcher.tsx | E (모달형) | `ListRow` × N + `Badge`("선택") |
| dog/add.tsx | C (입력폼형) | survey 축소판 (3필드) |
| settings/index.tsx | A (목록형) | `Switch` + `useDialog` |
| settings/subscription.tsx | B (상세형) | `TableRow`(비교) + `BoardRow`(플랜) + IAP |
| ops/today.tsx | D (탭형) + A (목록형) | `FlatList` 무한스크롤 + 프리셋/ABC 기록 모달 |

---

