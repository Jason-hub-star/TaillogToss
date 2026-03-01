Section-ID: toss_apps-25
Auto-Enrich: false
Last-Reviewed: 2026-03-01
Primary-Sources: @toss/tds-react-native

## 3. Toss Design System (TDS) — React Native 전체 컴포넌트 카탈로그

### Foundation

#### Colors (`@toss/tds-react-native` → `colors.*`)
Perceptually uniform color space. `import { colors } from '@toss/tds-react-native'`

| 카테고리 | 토큰 범위 | 용도 |
|----------|----------|------|
| Grey 50~900 | `#f9fafb` ~ `#191f28` | 중립 배경/텍스트 |
| Blue 50~900 | `#e8f3ff` ~ `#194aa6` | 프라이머리 액션 |
| Red 50~900 | `#ffeeee` ~ `#a51926` | 에러/경고 |
| Orange/Yellow/Green/Teal/Purple | 각 10단계 | 보조 색상 |
| Grey Opacity 50~900 | 반투명 | 오버레이/딤 |

**Semantic 토큰** (하드코딩 금지 — 반드시 토큰 사용):
- `background` → `#FFFFFF` (기본 배경)
- `greyBackground` → 중립 서피스
- `layeredBackground` → 오버레이 백
- `floatedBackground` → 플로팅 요소

**프로젝트 컬러 매핑** (현재 하드코딩 → 토큰 전환 대상):
| 현재 하드코딩 | TDS 토큰 대체 |
|--------------|--------------|
| `#0064FF` | `colors.blue500` (Primary CTA) |
| `#202632` | `colors.grey900` (텍스트 기본) |
| `#333D4B` | `colors.grey800` (텍스트 보조) |
| `#8B95A1` | `colors.grey500` (라벨/힌트) |
| `#E5E8EB` | `colors.grey200` (보더) |
| `#F4F4F5` | `colors.grey100` (디바이더) |
| `#F8F9FA` | `colors.grey50` (서브 배경) |

#### Typography (토큰 스케일 — 하드코딩 금지)
동적 접근성 스케일링을 위해 반드시 토큰 사용. `fontSize` 직접 입력 금지.

| 토큰 | 크기 | 행간 | 용도 |
|------|------|------|------|
| Typography 1 | 30px | 40px | 대형 헤딩 (survey-result 타이틀) |
| Typography 2 | 26px | 35px | 페이지 헤딩 (Top 컴포넌트) |
| Typography 3 | 22px | 31px | 섹션 헤딩 (ListHeader) |
| Typography 4 | 20px | 29px | 소형 헤딩 (카드 타이틀) |
| Typography 5 | 17px | 25.5px | 본문 기본 (ListRow 텍스트) |
| Typography 6 | 15px | 22.5px | 본문 소형 (보조 설명) |
| Typography 7 | 13px | 19.5px | 캡션/라벨 (Badge, 타임스탬프) |

**접근성 스케일링**: iOS Large~A11y_xxxLarge (100%~310%), Android 연속 스케일.
기저 토큰 F11~F42 (42단계) → 위 7개 Typography로 조합. 하드코딩 시 동적 스케일 불가.

### 3-1. UI 컨트롤 (13)
| 컴포넌트 | 용도 | 핵심 Props |
|----------|------|-----------|
| `Button` | 기본 CTA 버튼 | `size`, `variant("primary"│"secondary"│"outline")`, `loading` |
| `TextButton` | 텍스트형 버튼 (링크 스타일) | `size`, `color` |
| `IconButton` | 아이콘 단독 버튼 | `icon`, `size`, `accessibilityLabel` |
| `Checkbox` | 다중 선택 | `checked`, `onChange`, `label` |
| `Radio` | 단일 선택 | `value`, `selected`, `onChange` |
| `Switch` | 토글 on/off | `value`, `onValueChange` |
| `SegmentedControl` | 탭형 세그먼트 선택 | `segments[]`, `selectedIndex`, `onChange` |
| `Dropdown` | 드롭다운 선택기 | `options[]`, `value`, `onChange` |
| `TextField` | 텍스트 입력 | `label`, `value`, `placeholder`, `error`, `maxLength` |
| `SearchField` | 검색 전용 입력 | `value`, `onSearch`, `placeholder` |
| `NumericSpinner` | 숫자 증감 입력 | `value`, `min`, `max`, `step` |
| `Stepper` | 단계 증감 (±) | `value`, `min`, `max`, `onValueChange` |
| `Slider` | 범위 슬라이더 | `value`, `min`, `max`, `onValueChange` |

### 3-2. 네비게이션 / 레이아웃 (12)
| 컴포넌트 | 용도 | 핵심 Props / 서브컴포넌트 |
|----------|------|--------------------------|
| `Navbar` | 상단 네비게이션 바 | `.BackButton`, `.CloseButton`, `.TextButton`, `.Title` |
| `Tab` | 탭 네비게이션 | `tabs[]`, `selectedIndex`, `onChange` |
| `List` | 목록 컨테이너 | children: `ListRow[]` |
| `ListRow` | 목록 행 | `.Texts`(title, subtitle), `.RightTexts`, `.Icon`, `.Image` |
| `ListHeader` | 목록 섹션 헤더 | `title`, `description` |
| `ListFooter` | 목록 하단 정보 | `text` |
| `GridList` | 그리드형 목록 | `columns`, `gap`, children |
| `Carousel` | 가로 슬라이드 | `gap`, `snapToInterval`, children |
| `BoardRow` | 보드형 카드 행 | `title`, `description`, `image` |
| `TableRow` | 테이블 행 (key-value) | `label`, `value` |
| `Top` | 화면 최상단 영역 | `title`, `subtitle`, children |
| `BottomCTA` | 하단 고정 CTA 버튼 | children: `Button` |

### 3-3. 피드백 / 정보 (12)
| 컴포넌트 | 용도 | 핵심 Props |
|----------|------|-----------|
| `Badge` | 상태 뱃지 | `variant("info"│"success"│"warning"│"danger")`, `text` |
| `Toast` | 토스트 알림 | `message`, `duration`, `action` |
| `Dialog` | 대화상자 | `title`, `description`, `primaryButton`, `secondaryButton` |
| `Loader` | 로딩 인디케이터 | `size`, `color` |
| `Skeleton` | 로딩 플레이스홀더 | pattern: `topList`, `cardOnly`, `listOnly` |
| `ProgressBar` | 진행률 바 | `value(0-1)`, `color` |
| `Result` | 결과/완료 화면 | `icon`, `title`, `description`, children |
| `ErrorPage` | 에러 전체 화면 | `title`, `description`, `retryButton` |
| `BottomInfo` | 하단 부가 정보 | `text`, `icon` |
| `Post` | 게시글/콘텐츠 뷰 | `title`, `body`, `author`, `date` |
| `Rating` | 별점 표시/입력 | `value`, `max`, `onChange` |
| `Keypad` | 커스텀 키패드 | variant: `Alphabet`, `Secure`, `Number` |

### 3-4. 오버레이 / 훅 (4)
| 훅 | 용도 | 반환 |
|----|------|------|
| `useDialog` | 프로그래밍 방식 Dialog 표시 | `{ open(options), close() }` |
| `useToast` | 프로그래밍 방식 Toast 표시 | `{ show(message, options) }` |
| `useBottomSheet` | 바텀시트 표시/제어 | `{ open(content, options), close() }` |
| `useOverlay` | 범용 오버레이 관리 | `{ open(component), close() }` |

### 3-5. 시각 요소 (6)
| 컴포넌트 | 용도 |
|----------|------|
| `Border` | 구분선/테두리 데코레이터 |
| `Shadow` | 그림자 효과 래퍼 |
| `Gradient` | 그래디언트 배경 |
| `Highlight` | 강조 텍스트 래퍼 |
| `Asset` | 아이콘/이미지/비디오/Lottie 통합 미디어 |
| `AmountTop` | 금액 강조 상단 영역 |

### 3-6. 데이터 시각화 (1)
| 컴포넌트 | 용도 | 핵심 Props |
|----------|------|-----------|
| `BarChart` | 막대 차트 | `data[]`, `xKey`, `yKey`, `color` |

### 시스템 훅
- `useVisualViewport`: 키보드 등에 의한 뷰포트 변화 감지

## 4. Backend & Security (mTLS)
