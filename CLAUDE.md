이 문서는 TaillogToss 프로젝트의 최우선 전역 규칙이다. 에이전트는 모든 작업 전에 반드시 읽고 따른다.

# TaillogToss — Toss 미니앱 프로젝트 가이드

DogCoach(Next.js PWA) → Toss 미니앱(React Native) 마이그레이션.
개 행동 교정 SaaS: ABC 기록 → 데이터 시각화 → AI 코칭.

## 저장소 경계 (MUST)

| 구분 | 경로 | 권한 |
|------|------|------|
| Write Repo | `C:\Users\gmdqn\tosstaillog` | 읽기/쓰기 |
| Read-Only Ref | `C:\Users\gmdqn\DogCoach` | 읽기 전용 — 수정 금지 |

## 에이전트 실행 규약 (MUST)

1. 코드/파일 수정 전에 변경 내용을 1~2문장으로 먼저 알린다.
2. 파일 수정 전 현재 내용을 반드시 직접 읽고 작업한다.
3. 작업 중간 진행상황을 짧게 주기적으로 공유한다.
4. 작업 완료 시 아래 **완료 포맷**으로 보고한다.
5. 모든 구현/수정 작업은 `docs/11-FEATURE-PARITY-MATRIX.md`의 Parity ID와 연결한다.
6. 주석 가능한 코드 파일 상단에 1~3줄 기능 요약 주석을 유지한다. (JSON/이미지/바이너리 등 주석 불가 파일은 제외)
7. 기존 코드(타입, 훅, 함수)를 우선 재사용하여 중복을 피한다.
8. 사용자 요청 없이 파괴적 명령(`reset --hard`, 대량 삭제 등)을 실행하지 않는다.
9. 하나의 Phase에 여러 Parity ID를 연결할 수 있지만, 완료 판정과 검증 근거는 Parity ID별로 분리한다.

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | `@granite-js/react-native` (토스 미니앱 샌드박스) |
| UI 시스템 | TDS React Native (`@toss/tds`) — Tailwind/Radix/Framer/Next.js 도입 금지 |
| 상태 관리 | React 내장 (useState/useContext) + TanStack Query |
| 백엔드 | 저장소 내 `Backend/`(FastAPI) + `supabase/functions/`(Toss S2S mTLS 전담 Edge Functions) |
| 인증 | Toss Login → Edge Function → Supabase Auth 브릿지 |
| 결제 | Toss IAP SDK (`verify-iap-order`) |
| 광고 | 토스 Ads SDK 2.0 ver2 (Rewarded/Interstitial/Banner) |
| 라우팅 | Granite 파일 기반 라우팅 — `pages/`(라우터 re-export) + `src/pages/`(실제 컴포넌트) |

## 스킬 활용 가이드

이 프로젝트에는 4개의 Claude 스킬이 있다. **구현 전 반드시 해당 스킬을 참조**한다.

| 스킬 | 용도 | 참조 시점 |
|------|------|-----------|
| `toss_wireframes` | 19개 화면 ASCII 와이어프레임 + TDS 컴포넌트 매핑 + 5개 레이아웃 패턴 | 화면 구현 전 |
| `toss_journey` | 6개 사용자 여정, 화면 전환 테이블(33행), 상태 전환, 인게이지먼트 훅 | 네비게이션/플로우 구현 전 |
| `toss_apps` | TDS 47개 컴포넌트 카탈로그, Supabase+Toss 연동 패턴, 차트/광고/TDS 갭 대안 | 컴포넌트/API 구현 전 |
| `toss_db_migration` | DogCoach→TaillogToss 스키마 비교(17→29테이블), Alembic 마이그레이션 계획, RLS 4-tier | DB/마이그레이션 작업 전 |

## 확정 기술 결정

### 차트: TDS BarChart + WebView 하이브리드
- Victory Native 사용 불가 (네이티브 모듈 링킹 불가, 샌드박스)
- TDS `BarChart` (단순 막대) + `@granite-js/native/react-native-webview` 내 Chart.js (Radar, Heatmap, Line)
- `lib/charts/ChartWebView.tsx` 재사용 컴포넌트 선 구축

### 광고: 토스 Ads SDK 2.0
- R1 (survey-result), R2 (dashboard), R3 (coaching-result) 터치포인트
- 토스 광고 우선. AdMob 폴백은 토스 통합 SDK가 공식 지원하는 범위에서만 활성화
- 토스 SDK에서 폴백 미지원 시 기본 동작은 광고 미노출(무광고 폴백)
- `react-native-google-mobile-ads` 직접 사용 불가 → 토스 통합 SDK 필수

### TDS 컴포넌트 갭 대안
| 누락 패턴 | 대안 |
|-----------|------|
| Chip/Tag (인터랙티브) | `TouchableOpacity` + `Badge` 래퍼 |
| Accordion/Collapsible | `Animated.View` height 보간 커스텀 |
| DatePicker | `SegmentedControl` + `Dropdown` + `NumericSpinner` 조합 |
| Radar/Heatmap 차트 | WebView + Chart.js |
| Speech Bubble | `View` + `Shadow` + `Border` 커스텀 |

### 인증 플로우
login → welcome(최초 1회) → survey → survey-result → notification → dashboard

### 권한 표준
- `UserRole` 표준: `user | trainer | org_owner | org_staff`
- B2B 화면/기능은 `trainer | org_owner | org_staff`만 접근 가능

### 구독/결제
- PRO 월간 ₩4,900, 토큰 10회 ₩1,900, 토큰 30회 ₩4,900
- B2B 플랜은 v1에서 기본 숨김이며, Wave 3 게이트 통과 후 활성화
- 멀티독: 무료 1마리, PRO 5마리
- 가격 기준일: 2026-02-26, 변경 시 `docs/PRD-TailLog-Toss.md`를 단일 기준으로 동기화

## 개발 가이드라인

### React Native 가드레일
- `@granite-js/react-native`를 기본 런타임 기준으로 작업 (`@apps-in-toss/react-native-framework` 템플릿 사용 가능)
- TDS React Native 우선 — 외부 UI 라이브러리 신규 도입 금지
- Toss S2S mTLS는 Supabase Edge Function 전담, FastAPI에 mTLS 구현 금지
- 네이티브 모듈 직접 링킹 불가 — `@granite-js/native/*` 프리인스톨만 사용

### 백엔드 경로 계약
- FastAPI/API/서비스/마이그레이션은 저장소 내 `Backend/` 하위에서 관리한다.
- 경로 기준: `Backend/app/...`, `Backend/alembic/...`
- Toss S2S/mTLS 브릿지는 `supabase/functions/...`에서 관리한다.

### Granite 프로젝트 구조
```
pages/            # 라우터 엔트리 (thin re-export) — require.context가 스캔
src/
  _app.tsx        # 앱 컨테이너 (Granite.registerApp)
  pages/          # 실제 페이지 컴포넌트 (createRoute)
  components/     # 3계층: tds-ext ← shared ← features
  lib/            # API, hooks, charts, guards, analytics, data, security
  types/          # 도메인별 타입 (BE 미러)
  stores/         # QueryClient, Context providers
supabase/functions/  # Edge Function (Toss S2S mTLS)
Backend/             # FastAPI + Alembic
```

### 레이어 의존성
- `src/pages/` (화면) → components, lib, types 의존 가능
- `src/components/` → lib, types 의존 가능
- `src/lib/` → types만 의존 (컴포넌트 import 금지)

### Toss 미니앱 개발 검수 방법 (3단계)
1. 로컬 개발 (기본)
   - `npm run dev`로 Granite 로컬 개발 서버 실행
   - iOS Simulator / Android Emulator에서 토스 샌드박스 앱으로 로컬 서버 연결
   - Android 에뮬레이터 연결 시 `adb reverse tcp:8081 tcp:8081` + `adb reverse tcp:5173 tcp:5173` 적용
   - 샌드박스 앱 내 진입 버튼은 문서 표기(`Bedrock 열기`) 기준으로 확인
   - Hot Reload 사용, 개발 중 단축키 `r`(reload), `d`(dev menu), `j`(debugger)
   - 원칙: 일상 UI/로직 개발은 에뮬레이터 중심으로 진행
2. 코드 레벨 테스트 (자동화)
   - FE 단위: Jest + React Native Testing Library (컴포넌트/훅/로직)
   - BE 단위: pytest (API/서비스 레이어)
   - 통합: Toss Auth mock + IAP 시뮬레이션 + Edge Function contract test (`verify-iap-order` 실패 복구 포함)
3. Sandbox/실기기 검증 (출시 전 필수)
   - 토스 Sandbox 앱 실기기 테스트 최소 1회 완료 후 심사 요청
   - `.ait` 번들 업로드 후 QR 테스트로 실제 플로우 검증
   - IAP 3개 시나리오 필수: 구매 성공 / 서버 실패 복구 / 에러 처리
   - 광고는 Sandbox 앱 미지원이므로 토스 앱 QR 테스트로 별도 검증
   - 인증/결제 등 일부 시나리오는 토스 앱이 설치된 실기기 확인이 필요할 수 있음

### 커밋 전 체크리스트
1. RN 빌드 성공 확인
2. 백엔드 모델 변경 시 프론트엔드 타입 동기화 확인
3. 새 파일/수정 파일 상단에 기능 요약 주석 확인
4. Parity ID 매핑 확인 (`docs/11-FEATURE-PARITY-MATRIX.md`)
5. 인증/결제/광고 핵심 플로우 스모크 테스트 결과 첨부 (최소 1회)

## 완료 포맷

```
- Scope: Parity ID 목록
- Files: 변경 파일 목록
- Validation: 실행/검증 결과
- Risks: 미해결 리스크와 다음 액션
- Self-Review: 이번 작업에서 잘한 점 / 부족한 점 / 남은 검증 공백
- Next-Session Docs: 다음 세션 시작 전에 읽어야 할 문서 + 이번에 업데이트한 문서
- Next Recommendations: 다음 세션 우선순위 작업 1~3개(짧은 이유 포함)
```

## 참고 문서

| 문서 | 경로 |
|------|------|
| 마스터 PRD v2.2.0 | `docs/PRD-TailLog-Toss.md` |
| B2B 확장 PRD | `docs/PRD-TailLog-B2B.md` |
| B2B 스키마 | `docs/SCHEMA-B2B.md` |
| 마이그레이션 운영 모델 | `docs/10-MIGRATION-OPERATING-MODEL.md` |
| 기능 패리티 매트릭스 | `docs/11-FEATURE-PARITY-MATRIX.md` |
| 마이그레이션 웨이브 | `docs/12-MIGRATION-WAVES-AND-GATES.md` |
| 원본 DogCoach (읽기 전용) | `C:\Users\gmdqn\DogCoach` |
