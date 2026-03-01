# shared/ — 앱 전역 공용 컴포넌트

레이아웃 패턴 5종 + 광고 래퍼 + Lottie 래퍼.

## 스킬 참조
- 레이아웃 패턴 A~E: `Skill("toss_wireframes")` §10
- 광고 SDK: `Skill("toss_apps")` §9
- 에셋 가이드: `docs/ref/ASSET-GUIDE.md`

## 하위 폴더

### layouts/ — 5가지 레이아웃 패턴

| 파일 | 패턴 | 사용 화면 |
|------|------|----------|
| `ListLayout.tsx` | A 목록형 | dashboard, settings, training-academy |
| `DetailLayout.tsx` | B 상세형 | coaching-result, profile, subscription |
| `FormLayout.tsx` | C 입력폼형 | survey, dog-add, dog-profile |
| `TabLayout.tsx` | D 탭형 | dashboard 3탭, analysis |
| `ModalLayout.tsx` | E 모달형 | quick-log, dog-switcher |

### ads/ — 광고 래퍼

| 파일 | 용도 |
|------|------|
| `RewardedAdButton.tsx` | 토스 Ads SDK 보상형 광고 R1/R2/R3 |

### 루트 파일

| 파일 | 용도 |
|------|------|
| `LottieAnimation.tsx` | Lottie JSON 래퍼 (3 에셋 등록) |
| `DevMenu.tsx` | 개발용 디버그 메뉴 (프로덕션 제거) |

## 규칙
- `tds-ext/`, `@toss/tds-react-native`, `lib/`, `types/`만 import 가능
- `features/` import 금지
