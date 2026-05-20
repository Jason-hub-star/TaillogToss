# tds-ext/ — TDS 갭 보완 프리미티브

TDS에 없는 UI 패턴을 React Native 기본 컴포넌트로 구현.

| 파일 | 용도 |
|------|------|
| `IntensitySelector.tsx` | 1~10 강도 선택 + 좌우 스와이프 조절 |
| `OccurrenceSelector.tsx` | 기록 횟수 프리셋 선택 |

## 스킬 참조
- TDS 컴포넌트 갭: `Skill("toss_apps")` §7.5
- 디자인 토큰: `Skill("toss_apps")` §3 Foundation

## 파일

| 파일 | 용도 | 사용 화면 |
|------|------|----------|
| `Chip.tsx` | 인터랙티브 칩 + ChipGroup | quick-log 카테고리 8개, survey |
| `Accordion.tsx` | 접이식 섹션 | dog-profile 환경/건강/트리거 |
| `SpeechBubble.tsx` | 강아지 시점 메시지 (감정 5종) | coaching-result Block 3 |
| `DateTimePicker.tsx` | 시간 선택 (빠른옵션 + 시:분) | quick-log 발생 시각 |
| `EmptyState.tsx` | 데이터 없음 + Lottie 지원 | 모든 빈 상태 |
| `ErrorState.tsx` | 에러 + 재시도 버튼 | 모든 에러 상태 |
| `index.ts` | barrel export | — |

## 규칙
- `@toss/tds-react-native`과 `types/`만 import 가능
- `shared/`, `features/`, `lib/` import 금지 (EmptyState의 LottieAnimation은 예외)
- 디자인 토큰 `styles/tokens` 필수 사용
