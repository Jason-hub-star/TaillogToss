# components/ — 3계층 컴포넌트 구조

DogCoach 패턴 계승. **의존 방향은 단방향만 허용.**

```
의존 방향:  tds-ext  ←  shared  ←  features  ←  pages
```

## 계층별 역할

### ① tds-ext/ — TDS 갭 보완 프리미티브 (6종)

TDS에 없는 UI 패턴을 React Native 기본 컴포넌트로 구현.

| 파일 | 용도 |
|------|------|
| `Chip.tsx` | 인터랙티브 칩 + ChipGroup (빠른 기록 카테고리 선택) |
| `Accordion.tsx` | 접이식 섹션 (프로필 환경/건강/트리거) |
| `SpeechBubble.tsx` | 강아지 시점 메시지 (코칭 Block 3) |
| `DateTimePicker.tsx` | 시간 선택 (기록 발생 시각) |
| `EmptyState.tsx` | 데이터 없음 상태 |
| `ErrorState.tsx` | 에러 + 재시도 |

**import 가능**: `@toss/tds-react-native`, `types/`
**import 금지**: `shared/`, `features/`, `lib/`

### ② shared/ — 앱 전역 공용

| 폴더 | 파일 | 용도 |
|------|------|------|
| `layouts/` | `ListLayout.tsx` | 패턴A — 목록형 (대시보드, 설정) |
| | `DetailLayout.tsx` | 패턴B — 상세형 (코칭 결과, 프로필) |
| | `FormLayout.tsx` | 패턴C — 입력폼형 (설문, 기록) |
| | `TabLayout.tsx` | 패턴D — 탭형 (분석) |
| | `ModalLayout.tsx` | 패턴E — 바텀시트형 (빠른 기록) |
| `ads/` | `RewardedAdButton.tsx` | 토스 Ads SDK 래퍼 (R1/R2/R3) |

**import 가능**: `tds-ext/`, `@toss/tds-react-native`, `lib/`, `types/`
**import 금지**: `features/`

### ③ features/ — 도메인별 화면 전용

| 폴더 | Phase | 용도 |
|------|-------|------|
| `survey/` | 6 | 설문 위저드 (SurveyContainer, Step1~7) |
| `dashboard/` | 7 | DogCard, StreakBanner, QuickLogChips |
| `log/` | 7 | LogCard, ABCForm |
| `coaching/` | 8 | CoachingBlock, PlanSelector |
| `training/` | 8 | CurriculumCard, MissionChecklist |
| `settings/` | 9 | (비어있음 — SubscriptionCompare는 페이지 인라인) |
| `ops/` | B2B | OpsList, OpsListItem, OpsBadge, OpsBottomInfo, RecordModal, BulkActionBar, BulkPresetSheet, PresetChipGrid, ReportCard, ReportPreviewSheet, MemberList, InviteSheet, OrgStatsSheet, PresetManager (14개) |
| `parent/` | B2B | ReportViewer, ReactionForm (2개) |

**import 가능**: `tds-ext/`, `shared/`, `@toss/tds-react-native`, `lib/`, `types/`
**import 금지**: 다른 `features/` 폴더 (공유 필요 시 `shared/`로 승격)
