이 문서는 TaillogToss 프로젝트의 최우선 전역 규칙이다. 에이전트는 모든 작업 전에 반드시 읽고 따른다.

# TaillogToss — Toss 미니앱 프로젝트 가이드

DogCoach(Next.js PWA) → Toss 미니앱(React Native) 마이그레이션.
개 행동 교정 SaaS: ABC 기록 → 데이터 시각화 → AI 코칭.

## 세션 시작 가이드 (MUST)

새 세션/컨텍스트 시작 시 아래 순서로 문서를 읽는다. 이 문서(CLAUDE.md)는 자동 로드되므로 2번부터 실행.

| 순서 | 문서 | 읽는 이유 | 필수 |
|------|------|----------|------|
| 1 | `CLAUDE.md` (이 파일) | 규칙 + 스택 + Phase 상태 + 우선순위 | 자동 |
| 2 | `docs/11-FEATURE-PARITY-MATRIX.md` | Parity ID별 체크리스트 — 작업 전 현재 상태 파악 | ✅ |
| 3 | `docs/BACKEND-PLAN.md` | BE 구조 + FE↔BE API 매핑 60+ endpoints | ✅ |
| 4 | `docs/MISSING-AND-UNIMPLEMENTED.md` | 잔여 작업 + 블로커 + Mock 목록 + Edge Function 상태 | ✅ |
| 5 | `docs/2-28/PHASE13-FE-BE-ROLLING-MIGRATION.md` | 현재 전환 진행상태 + 체크리스트 + 롤백 포인트 | ✅ |

### 자동 참조 번들 (MUST)

`CLAUDE.md`만 주어져도 아래 번들을 자동 참조한다.

1. 기본 번들(항상): `11-FEATURE-PARITY-MATRIX` → `BACKEND-PLAN` → `MISSING-AND-UNIMPLEMENTED` → `2-28/PHASE13-FE-BE-ROLLING-MIGRATION`
2. DB/마이그레이션 작업: `SCHEMA-B2B.md` 추가
3. 실기기/Sandbox 검증: `2-27/PHASE13-E2E-SANDBOX-PLAYBOOK.md` 추가
4. 화면/플로우 구현: `Skill("toss_wireframes")` + `Skill("toss_journey")` 추가
5. 정책/요건 확인: `PRD-TailLog-Toss.md`, `PRD-TailLog-B2B.md` 추가

**작업별 추가 참조**:
- DB/마이그레이션 작업 → `docs/SCHEMA-B2B.md`
- E2E/Sandbox 테스트 → `docs/2-27/PHASE13-E2E-SANDBOX-PLAYBOOK.md`
- 화면 구현 → `Skill("toss_wireframes")` + `Skill("toss_journey")`
- 기능 상세 스펙 → `docs/PRD-TailLog-Toss.md` (B2C) / `docs/PRD-TailLog-B2B.md` (B2B)

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

이 프로젝트에는 4개의 Claude 스킬이 있다. **구현 전 반드시 `Skill` 도구로 해당 스킬을 로드**한다.

| 스킬 | 용도 | 참조 시점 | Skill 호출 예 |
|------|------|-----------|-------------|
| `toss_wireframes` | 19개 화면 ASCII 와이어프레임 + TDS 컴포넌트 매핑 + 5개 레이아웃 패턴 | 화면 구현 전 | `Skill("toss_wireframes")` |
| `toss_journey` | 6개 사용자 여정, 화면 전환 테이블(33행), 상태 전환, 인게이지먼트 훅 | 네비게이션/플로우 구현 전 | `Skill("toss_journey")` |
| `toss_apps` | TDS 47개 컴포넌트 카탈로그, Supabase+Toss 연동 패턴, 차트/광고/TDS 갭 대안 | 컴포넌트/API 구현 전 | `Skill("toss_apps")` |
| `toss_db_migration` | DogCoach→TaillogToss 스키마 비교(17→29테이블), Alembic 마이그레이션 계획, RLS 4-tier | DB/마이그레이션 작업 전 | `Skill("toss_db_migration")` |

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
  lib/            # API, hooks, ads, charts, guards, analytics, data, security
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

## Phase 진행 현황

| Phase | 내용 | 상태 | 비고 |
|-------|------|------|------|
| 1~10 | 초기화 → 인증 가드 | Done | FE 전체 완료 |
| 11 | 보안 (PII가드, rate-limit) | Done | mTLS 실연동 + `login-with-toss` v12 배포 완료 |
| 12 | 광고 (Toss Ads SDK R1/R2/R3) | Done | mock SDK. 실 Ad Group ID 반영/검증 대기 |
| 13 | E2E 테스트 + 배포 준비 | In progress | Sandbox 실기기 로그인 성공(Edge 200)까지 확보, IAP/광고 E2E 잔여 |
| B2B | B2B 확장 (P1~P7) + 정합성 수정 | Done | 코드+문서정합성 완료. 성능/실기기 검증 대기 |
| REG | 토스 콘솔 등록 준비 | Done | legal 4종 + toss-disconnect + RealMTLSClient + 앱 내 약관 페이지 |
| FIX | 공식 문서 갭 수정 | Done | config.toml 7종, Ads SDK ver2 정렬, Settings 실구현, 뒤로가기 전수, CORS, 멱등성 |
| IMPL | dog 프로필/추가 + IAP 패턴 | Done | profile.tsx/add.tsx 실 구현, IAP 공식 패턴 래퍼, 미완료 주문 복구 |
| BE | Backend FastAPI 전체 구현 | Done | BE-P1~P8: 48파일, 12모듈, 60+ endpoints, 27모델, pytest 39 tests |
| INFRA | Supabase DB 마이그레이션 | Done | INFRA-1: 26→38 테이블, enum 마이그레이션, RLS 30+정책, PII 함수 |

### 현재 Mock/대기 항목
- **mTLS 인증서**: `supabase/functions/_shared/mTLSClient.ts` — RealMTLSClient + `TOSS_MTLS_MODE` 반영 완료. cert/key secret 등록 + digest 검증 완료
- **Ad Group ID**: `src/lib/ads/config.ts` — 공식 SDK ver2 시그니처 적용 완료, 테스트 ID 사용 중 (실 ID 교체/검증 대기)
- **Supabase 실 연동**: Edge Function `login-with-toss` v12 배포 완료 + Sandbox 실기기 `POST 200` 증적 확보 (request id: `f52019d7-0162-48bf-b021-de8bc80539de`, `92de76c2-abaa-4d8c-81cc-3e7329fe6d21`)
- **ChartWebView**: `@granite-js/native` WebView 실제 연결 대기
- **IAP SDK**: `lib/api/iap.ts` 래퍼 구현 완료 (createOneTimePurchaseOrder + getPendingOrders). `@apps-in-toss/framework` 확인 후 실 SDK 교체

### 상태 업데이트 (2026-02-27)
- 사업자등록 완료 (사용자 보고)
- 토스 앱 배포 완료 (사용자 보고)
- Sandbox 실기기+Metro 연결 및 라우팅 로그 확인 (`/_404 -> /login -> /onboarding/welcome -> /onboarding/survey`)
- Sandbox 실기기 로그인 성공 확인 (`/login -> /onboarding/welcome`, `appLogin referrer=SANDBOX`, Edge `login-with-toss` `POST 200`)
- 남은 리스크는 외부 승인 이슈가 아니라 **실연동 증적 확보** 영역(로그인/IAP/광고)임

### 상태 업데이트 (2026-02-28)
- Backend FastAPI 전체 구현 완료 (BE-P1~P8: 48파일, 12모듈, 60+ endpoints, 27모델, pytest 39 tests)
- Supabase INFRA-1 DB 마이그레이션 적용 완료 (26→38 테이블, enum 마이그레이션, B2B 10테이블+RLS)
- FE/Edge Jest 검증: app 43 tests + edge 30 tests 통과
- typecheck 0 에러 달성
- `login-with-toss` v12 배포 완료 (MCP), FE API backend-first 전환(log/report/settings/subscription/notification) 반영
- FE API backend-first 전환 완료: `dashboard`, `training` 추가 반영 + app test 보강(2026-02-28)

### 다음 우선순위 (Single Source — 다른 문서는 이 섹션 참조)

**코드 레벨 (실기기 불필요)**:
1. INFRA-2: Edge Function 나머지 6종 배포 + Secrets 등록 — `supabase functions deploy` + 환경변수
2. Phase 13 E2E 테스트 프레임워크 — Toss Auth mock + IAP 시뮬레이션 + FE↔BE 통합
3. training 모델 정합 후속 — FE `training_progress` ↔ BE `user_training_status` 매핑 검증/정리

**외부/실기기 필요**:
4. INFRA-3: mTLS 인증서 발급 + 토스 콘솔 등록 — Developers Console 접속 필요
5. AUTH-001 실패 400 증적 + IAP/MSG/AD Sandbox E2E — 실기기 Sandbox 앱
6. Ad Group ID 실 교체 — Developers Console 발급 후 `src/lib/ads/config.ts` 교체

### 완료 항목 (2026-02-28)
- ~~B2B IAP 공식 패턴 정렬~~ → usePurchaseB2BIAP + usePendingOrderRecoveryB2B 구현 완료
- ~~typecheck 에러~~ → 0 에러 (tsconfig supabase exclude + Granite 전환 + iap/404 수정)
- ~~useRewardedAd 테스트 실패~~ → mock 메서드명 교정, 5/5 통과
- ~~Jest 테스트 보강~~ → app 43 + edge 30 tests 통과
- ~~AUTH uuid user_id 블로커~~ → `login-with-toss` v12 배포 + auth bridge 정렬 완료
- ~~FE→BE dashboard/training 잔여~~ → backend-first + fallback 전환 완료, API 단위테스트 추가

## 참고 문서

| 문서 | 경로 |
|------|------|
| 마스터 PRD v2.2.0 | `docs/PRD-TailLog-Toss.md` |
| B2B 확장 PRD | `docs/PRD-TailLog-B2B.md` |
| B2B 스키마 | `docs/SCHEMA-B2B.md` |
| 마이그레이션 운영 모델 | `docs/10-MIGRATION-OPERATING-MODEL.md` |
| 기능 패리티 매트릭스 | `docs/11-FEATURE-PARITY-MATRIX.md` |
| 마이그레이션 웨이브 | `docs/12-MIGRATION-WAVES-AND-GATES.md` |
| Phase 11 런타임 증적 | `docs/2-27/PHASE11-RUNTIME-EVIDENCE.md` |
| Phase 13 E2E/Sandbox 플레이북 | `docs/2-27/PHASE13-E2E-SANDBOX-PLAYBOOK.md` |
| Phase 13 FE-BE 롤링 마이그레이션 | `docs/2-28/PHASE13-FE-BE-ROLLING-MIGRATION.md` |
| Backend 구현 플랜 | `docs/BACKEND-PLAN.md` |
| 누락/미구현 목록 | `docs/MISSING-AND-UNIMPLEMENTED.md` |
| 원본 DogCoach (읽기 전용) | `C:\Users\gmdqn\DogCoach` |
