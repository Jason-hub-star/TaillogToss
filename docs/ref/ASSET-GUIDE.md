# TaillogToss 에셋 가이드

## 1. Lottie 애니메이션 (복사 완료)

DogCoach에서 재사용. `src/assets/lottie/`에 위치.

| 파일 | 원본 | 크기 | 용도 | 적용 화면 |
|------|------|------|------|----------|
| `cute-doggie.json` | DogCoach `Cute Doggie.json` | 57KB | 걷는 강아지 | welcome, 로딩 |
| `jackie.json` | DogCoach `Jackie.json` | 81KB | 걷는 강아지 (상세) | 대시보드 로딩 |
| `long-dog.json` | DogCoach `Long Dog.json` | 54KB | 닥스훈트 스타일 | 빈 상태 화면 |

**사용법**: `LottieAnimation` 컴포넌트 (`src/components/shared/LottieAnimation.tsx`)
```tsx
import { LottieAnimation } from 'components/shared/LottieAnimation';
<LottieAnimation asset="cute-doggie" size={240} />
```

**추가 예정**: 사용자가 추후 더 다양한 Lottie 파일 추가 예정.
새 파일 추가 시 `LottieAnimation.tsx`의 `LOTTIE_SOURCES`에 등록.

## 2. 필요 이미지 목록

V1 출시에 필요한 정적 이미지/일러스트 목록.

### 2-1. 필수 (V1 출시 전)

| # | 용도 | 종류 | 크기 | 배치 경로 | 비고 |
|---|------|------|------|----------|------|
| 1 | 앱 아이콘 | PNG | 1024x1024 + 다양한 사이즈 | `src/assets/icon/` | 토스 콘솔 등록 필수 |
| 2 | 온보딩 welcome 히어로 | SVG/PNG | 360xauto | `src/assets/images/` | 강아지+주인 일러스트. Lottie `cute-doggie`로 대체 가능 |
| 3 | 빈 상태: 기록 없음 | SVG/PNG | 200x200 | `src/assets/images/` | 대시보드 로그 없을 때. Lottie `long-dog`으로 대체 가능 |
| 4 | 빈 상태: 코칭 없음 | SVG/PNG | 200x200 | `src/assets/images/` | 코칭 결과 없을 때 |
| 5 | 빈 상태: 훈련 시작 전 | SVG/PNG | 200x200 | `src/assets/images/` | 훈련 아카데미 미시작 |
| 6 | 빈 상태: 등록된 강아지 없음 (B2B) | SVG/PNG | 200x200 | `src/assets/images/` | Ops 화면 |

### 2-2. 권장 (UX 품질 향상)

| # | 용도 | 종류 | 크기 | 비고 |
|---|------|------|------|------|
| 7 | 스트릭 배지 3일 | PNG | 64x64 | 연속 기록 달성 |
| 8 | 스트릭 배지 7일 | PNG | 64x64 | |
| 9 | 스트릭 배지 14일 | PNG | 64x64 | |
| 10 | 스트릭 배지 30일 | PNG | 64x64 | |
| 11 | 구독 비교 비주얼 | SVG/PNG | 360xauto | FREE vs PRO 카드 |
| 12 | 에러 상태 일러스트 | SVG/PNG | 200x200 | 네트워크 오류 등 |

### 2-3. V2 이후

| # | 용도 | 비고 |
|---|------|------|
| 13 | 커뮤니티 빈 상태 | V2 커뮤니티 기능 |
| 14 | 달성 뱃지 세트 (10종+) | 게이미피케이션 확장 |
| 15 | 견종별 아이콘 | 프로필 커스텀 |

## 3. Lottie 대체 전략

일러스트 제작 전까지 Lottie + 이모지로 대체 가능:

| 화면 | 현재 | Lottie 대체 |
|------|------|------------|
| welcome | 🐕 이모지 | `cute-doggie` 애니메이션 |
| 대시보드 로딩 | ActivityIndicator | `jackie` 애니메이션 |
| 빈 상태 (로그) | 텍스트 | `long-dog` 애니메이션 |
| 빈 상태 (코칭) | 텍스트 | `long-dog` 애니메이션 (재사용) |
| 빈 상태 (훈련) | 텍스트 | `cute-doggie` 애니메이션 (재사용) |

## 4. 비디오

V1에서는 비디오 불필요. 훈련 상세 페이지에 교육 영상 임베드는 V2 고려.
`@granite-js/native/react-native-video` 사용 가능 (확인됨).

## 5. 디렉토리 구조

```
src/assets/
  lottie/
    cute-doggie.json    ✅ 복사 완료
    jackie.json         ✅ 복사 완료
    long-dog.json       ✅ 복사 완료
  images/               (생성 대기)
    welcome-hero.png
    empty-log.png
    empty-coaching.png
    empty-training.png
    empty-b2b.png
    error.png
  icon/                 (생성 대기)
    app-icon-1024.png
  badges/               (생성 대기)
    streak-3.png
    streak-7.png
    streak-14.png
    streak-30.png
```
