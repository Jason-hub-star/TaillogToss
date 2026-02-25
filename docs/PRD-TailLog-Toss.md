# TailLog(DogCoach) → Toss In-App 마이그레이션 마스터 개발명세서

- **프로젝트**: TailLog (DogCoach) → Toss In-App
- **문서 버전**: 2.0.0
- **작성일**: 2026-02-25
- **기준 템플릿**: `prdtamplate.md`
- **참고 스킬**: `skills/toss_apps/SKILL.md` (Section 1-8)
- **Context**: 이 문서는 AI 코딩 에이전트가 단독으로 프로젝트를 셋업하고 구현·배포·검증까지 수행하기 위한 절대적 기준 문서입니다. 에이전트는 본 문서의 규칙을 위반할 수 없습니다.

---

## 0. 메타 / 버전관리

### 0.1 문서 목적
본 문서는 DogCoach를 **토스 인앱(Apps in Toss)** 미니앱으로 마이그레이션하기 위한 단일 기준 문서다.
개발, 보안, 결제, 알림, 마케팅, AI 코딩 가이드, 운영, QA, 출시 기준까지 모두 포함한다.

### 0.2 변경 이력
| 버전 | 날짜 | 내용 |
|------|------|------|
| v2.0.0 | 2026-02-25 | 플랜 승인 후 완전판 작성 (토큰 정책, 데이터 보존, IAP SDK 방어, Smart Message 빈도 제한, 딥엔트리 라우팅 포함) |
| v1.0.1 | 2026-02-25 | 전체 문서 한글화 및 구조 재정리 |
| v1.0.0 | 2026-02-25 | 초기 통합본 작성 |

### 0.3 용어집
| 용어 | 설명 |
|------|------|
| TDS | Toss Design System — 토스 미니앱 필수 UI 시스템 |
| IAP | In-App Purchase — 토스 인앱 결제 |
| mTLS | Mutual TLS — 토스 S2S API 필수 인증 |
| S2S | Server-to-Server — 토스 백엔드 API |
| Edge Function | Supabase Deno 런타임 함수 |
| MCP | Model Context Protocol — AI 개발 도구 프로토콜 |
| PBKDF2 | Password-Based Key Derivation Function 2 |

---

## 1. 프로젝트 개요

### 1.1 배경
기존 DogCoach는 Next.js 16 + FastAPI + Supabase 기반의 반려견 행동 교정 AI 코칭 SaaS다.
토스 인앱으로 마이그레이션하여 토스의 대규모 트래픽, 결제(IAP), 알림(Smart Message), 포인트 인프라를 활용한다.

### 1.2 문제 정의
반려견 행동 문제를 과학적으로 추적/분석할 접근성 높은 도구가 부족하다.

### 1.3 목표
- 토스 미니앱으로 론칭
- 3개월 내 MAU 10,000명
- API 성능 p95 < 300ms

### 1.4 비목표 (v1)
- 앱스토어 독립 배포 없음
- React Native 전환 없음 (WebView only)
- v1에서 다국어 미지원

### 1.5 성공 지표
- Primary KPI: DAU, AI 코칭 전환율, PRO 구독 전환율
- SLO: 응답시간 95th percentile < 300ms, 가용성 99.9%

### 1.6 핵심 사용자 시나리오 (7개)

| # | Given | When | Then | AC |
|---|-------|------|------|-----|
| 1 | 토스 미니앱 진입 | 첫 방문 | 온보딩 설문 표시 | 7단계 설문 완료 → 반려견 프로필 생성 |
| 2 | 대시보드 진입 | 행동 기록 버튼 탭 | ABC 기록 폼 표시 | 기록 저장 → 대시보드 갱신 |
| 3 | 행동 기록 3건+ 존재 | AI 코칭 요청 | 맞춤 코칭 결과 표시 | 캐시 HIT 시 즉시, MISS 시 < 4초 |
| 4 | 코칭 결과 존재 | 분석 탭 진입 | 차트/타임라인 표시 | Radar + Bar + Heatmap 렌더링 < 500ms |
| 5 | 훈련 커리큘럼 진행 중 | 훈련 탭 진입 | 현재 스텝 표시 | 완료 시 다음 스텝 자동 진행 |
| 6 | 무료 한도 소진 | PRO 구매 버튼 탭 | IAP 결제 윈도우 | 결제 성공 → 즉시 PRO 활성화 |
| 7 | 알림 동의 상태 | 3일 미기록 | Smart Message 수신 | 10분 이내 발송 |

---

## 2. 핵심 아키텍처 결정

### 2.1 3-Layer 아키텍처 책임 경계 (mTLS 충돌 해소)

| 레이어 | 담당 | mTLS |
|--------|------|------|
| **Supabase Edge Function (Deno)** | Toss S2S API (로그인, IAP 검증, Smart Message, 포인트) | **전담** — `Deno.createHttpClient({ cert, key })` |
| **Fly.io FastAPI (Python)** | AI 코칭, 비즈니스 로직, 예산 제어 | **불필요** — Supabase JWT 검증만 |
| **Supabase** | DB, Auth, RLS, Storage | 해당 없음 |

> **절대 규칙**: Fly.io/FastAPI에는 mTLS 코드/인증서가 존재하지 않습니다. 모든 Toss S2S 통신은 Edge Function을 경유합니다.

### 2.2 Fly.io FastAPI 유지 필수 근거
- AI 코칭 엔진: 4단계 캐시 dedup + 3단계 예산 게이팅 + OpenAI 호출이 원자적으로 결합 (Edge Function 25초/128MB로 불가)
- Python 전용 로직: SQLAlchemy async, rule-based fallback 25개 템플릿, 비용 추적 upsert
- 코드 재작성 비용 >> 유지 비용 (300줄+ AI 로직을 Deno로 옮기면 버그 위험만 증가)

### 2.3 WebView 선택 근거 (React Native 불채택)
- DogCoach는 폼 입력 + 리스트 + 차트 중심, 네이티브 API(카메라/GPS) 미사용
- React Native 전환 시 132개 TSX 전면 재작성 필요 (8-10주, Recharts 16개+, Framer Motion 20개+ 재구현)
- WebView는 기존 웹 기술 재활용 + TDS WebView 컴포넌트 교체만으로 충분
- 토스 SKILL.md: "Mandatory TDS WebView for non-game apps"

### 2.4 인증 전략
- Supabase Auth를 **유지**하되, Toss Login을 **Supabase Edge Function**으로 브릿지
- 기존 DogCoach의 Supabase RLS/Auth 인프라를 최대한 재활용
- SKILL.md Section 8의 **Toss + Supabase 통합 패턴** 채택

---

## 3. 변경 요약 (현행 vs 목표)

| 영역 | 기존 (DogCoach) | 목표 (Toss 인앱) |
|------|-----------------|------------------|
| FE 프레임워크 | Next.js 16 + React 19 | `@apps-in-toss/web-framework` (WebView) |
| UI 시스템 | Tailwind CSS v4 + Radix UI + Framer Motion | **TDS (Toss Design System)** 전면 교체 |
| 인증 | Supabase Auth (Google/Kakao OAuth + 게스트) | **Toss Login → Supabase Edge Function → Supabase Auth** (브릿지 패턴) |
| 인증 mTLS | 없음 | **Supabase Edge Function(Deno)**에서 mTLS 인증서 처리 |
| 결제 | Stripe 플레이스홀더 | **Toss IAP** (소모품/비소모품) |
| 알림 | 미구현 (Kakao Alimtalk 예정) | **Toss Smart Message** (Push + Inbox + SMS + Alimtalk) |
| 프로모션 | 없음 | **토스 포인트** 연동 (3-step key 기반) |
| BE 보안 | HTTPS + Supabase JWT | S2S API는 **Supabase Edge Function에서 mTLS** 처리 |
| FE 배포 | Vercel | 토스 WebView 번들 배포 |
| BE 배포 | Fly.io | Fly.io 유지 (**Supabase JWT 검증만, mTLS 불필요**) |
| 랜딩 페이지 | 12개 섹션 (Framer Motion) | **제거** — 대시보드가 진입점 |
| 게스트 모드 | anonymous_sid 쿠키 기반 | **제거** — 토스 유저는 항상 인증됨 |

---

## 4. 기술 스택 & 제약

### 4.1 프론트엔드 (변경)
- `@apps-in-toss/web-framework` + TypeScript 5.x (strict)
- TDS 컴포넌트: Top, BottomCTA, ListRow, TextField, Checkbox, Switch, Skeleton, Badge, Asset 등
- TDS Hooks: useDialog, useToast, useBottomSheet, useVisualViewport
- 상태관리: TanStack Query v5 (서버상태) + Zustand (로컬상태)
- 차트: 경량 클라이언트 차트 라이브러리 (Recharts CSR 모드)

### 4.2 인증 레이어 (Toss + Supabase 브릿지 패턴)
1. 클라이언트: `appLogin()` → authorizationCode 획득
2. 클라이언트: `supabase.functions.invoke('login-with-toss', { body: { authorizationCode, referrer } })`
3. Edge Function: mTLS로 Toss `generate-token` API 호출 (authCode 유효기간 10분)
4. Edge Function: Bearer token으로 `login-me` API → `tossUserKey` + 암호화된 프로필
5. Edge Function: `tossUserKey + pepper` → PBKDF2 → Supabase Auth signIn/signUp
6. 클라이언트: `supabase.auth.setSession({ access_token, refresh_token })` → 온보딩 진행

**Edge Function 시크릿**:
- `TOSS_CLIENT_CERT_BASE64`, `TOSS_CLIENT_KEY_BASE64`
- `SUPER_SECRET_PEPPER`, `SUPABASE_SERVICE_ROLE_KEY`

### 4.3 백엔드 (대부분 유지)
- FastAPI + SQLAlchemy async + Supabase PostgreSQL (유지)
- OpenAI GPT-4o-mini (유지, 동일 비용 제어)
- Supabase JWT 검증 (기존 방식 유지 — Edge Function이 발급한 Supabase 토큰 사용)
- **신규**: Toss S2S API용 Edge Function 추가 (IAP 검증, Smart Message, 포인트)

### 4.4 인프라 제약
- Node.js 20.x LTS, Python 3.12+
- mTLS 인증서: Toss Developers Console 발급 → Base64 인코딩 → Supabase Edge Function secrets 저장
- Toss Inbound/Outbound IP 방화벽 허용 필수

### 4.5 토스앱 기능별 최소 버전

| 기능 | Android 최소 | iOS 최소 | 미만 시 대응 |
|------|-------------|----------|-------------|
| Toss Login (`appLogin`) | 5.219.0+ | 5.219.0+ | 미니앱 진입 자체 불가 (토스 자동 처리) |
| IAP 기본 (`createOneTimePurchaseOrder`) | 5.219.0+ | 5.219.0+ | IAP 객체 undefined → 구매 UI 숨김 + "앱 업데이트" 안내 |
| IAP 복구 (`getPendingOrders`) | **5.234.0+** | **5.231.0+** | 복구 함수 undefined → 복구 스킵, 수동 CS 안내 |
| IAP 이력 (`getCompletedOrRefundedOrders`) | 5.234.0+ | 5.231.0+ | 이력 조회 불가 → BE fallback 조회 |
| 토스 포인트 (`grantPromotionReward`) | **5.232.0+** | **5.232.0+** | 포인트 UI 숨김, "앱 업데이트 후 리워드 지급" 안내 |
| Smart Message (수신) | 버전 무관 | 버전 무관 | 서버 발송, 클라이언트 의존 없음 |

---

## 5. 디자인 시스템

- TDS Colors v5 (지각적 균일 색 공간, 다크/라이트 모드 계층 토큰)
- TDS Typography (동적 크기 + 접근성 토큰)
- **컴포넌트 매핑표**: DogCoach 30+ 컴포넌트 → TDS 대응 컴포넌트 1:1 매핑
- **제거 대상**: Tailwind CSS v4, Radix UI, Framer Motion, Lucide Icons → 전부 TDS로 교체
- Toss UX Writing 가이드 준수 (QA 심사 필수)

---

## 6. 데이터 모델 & 마이그레이션

### 6.1 User 모델 변경 (SKILL.md Section 8 DB Contract)

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  toss_user_key TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'trainer', 'admin'))
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual read access" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow individual update access" ON public.users FOR UPDATE USING (auth.uid() = id);
```

**절대 규칙**: integer `users.id`와 Supabase Auth UUID를 혼용하지 않음

### 6.2 마이그레이션 전략

**Big-bang (프로덕션 유저 미존재 시)**:
1. 기존 users 테이블 DROP (데이터 없음 확인 필수)
2. 새 스키마 CREATE (UUID PK + toss_user_key)
3. FK 참조 테이블 일괄 재생성 (dogs, behavior_logs 등 12+ 테이블의 user_id → UUID로 변경)
4. Alembic migration up/down 스크립트 작성 (롤백 가능)

**프로덕션 유저 존재 시 대안** (해당 시 재검토):
1. Dual-write: 기존 integer ID + 신규 UUID 컬럼 병행 (2주)
2. Backfill: 기존 유저에 UUID 매핑 + toss_user_key 연결 (1주)
3. Cutover: FK 재매핑 + 앱 코드 전환 + 기존 ID 컬럼 제거 (1주)
4. 롤백 조건: cutover 후 24시간 내 에러율 > 1% 시 롤백

### 6.3 신규 모델: toss_orders (2축 상태 분리 설계)

| 컬럼 | 설명 |
|------|------|
| `toss_status` | 토스가 알려주는 상태: PURCHASED \| PAYMENT_COMPLETED \| FAILED \| REFUNDED \| ORDER_IN_PROGRESS \| NOT_FOUND |
| `grant_status` | 우리 내부 지급 상태: PENDING \| GRANTED \| GRANT_FAILED \| RETRY_QUEUED \| REVOKED |
| `idempotency_key` | 중복 호출 방지용 UNIQUE 컬럼 |

왜 분리? → "결제 성공인데 지급 실패" 같은 상황에서 원인 추적이 쉬워지고, 재처리 큐 운영이 간단해짐

### 6.4 유지 모델 (14개 테이블)
dogs, dog_env, behavior_logs, ai_coaching, ai_recommendation_snapshots, ai_recommendation_feedback, user_training_status, training_behavior_snapshots, media_assets, subscriptions (스키마 변경), user_settings, noti_history, ai_cost_usage_daily, ai_cost_usage_monthly

### 6.5 신규 모델
- `toss_orders` — IAP 주문 상태 관리
- `edge_function_requests` — 멱등 로그 (`idempotency_key UNIQUE, function_name, status, response_json, created_at`)

---

## 7. 아키텍처 & 파일 구조

### 7.1 프론트엔드 신규 구조
```
pages/          # 파일 기반 라우팅
components/     # TDS 래퍼 컴포넌트
lib/            # API, hooks, utils
stores/         # Zustand 스토어
types/          # TypeScript 인터페이스
```

### 7.2 Supabase Edge Functions (신규 — Toss S2S 브릿지)
```
supabase/
├── config.toml                    # Edge Function 설정
└── functions/
    ├── login-with-toss/           # Toss OAuth2 → Supabase Auth 브릿지
    │   ├── index.ts               # mTLS + token exchange + user creation
    │   └── deno.json              # import map
    ├── verify-iap-order/          # IAP 주문 상태 검증 (mTLS)
    ├── send-smart-message/        # Smart Message 발송 (mTLS)
    └── grant-toss-points/         # 토스 포인트 지급 (mTLS)
```

### 7.3 FastAPI 수정 구조
- 기존 서비스 유지 (AI 코칭, 비즈니스 로직, 예산 제어)
- Supabase JWT 검증 그대로
- 신규 라우터: `subscription` (IAP 상태 관리), `webhook` (Toss 콜백)
- 프론트엔드-백엔드 미러 구조 유지: `types/{domain}.ts` ↔ `models/{domain}.py`

---

## 8. 기능 명세

### 8.1 v1 출시 필수 범위 (Phase 0-5)

| 기능 | Phase | 변경 수준 | 설명 | 마이그레이션 | 테스트 | QA확인 |
|------|:-----:|-----------|------|:---:|:---:|:---:|
| 랜딩 페이지 | 0 | **제거** | 토스 미니앱은 기능 화면으로 바로 진입 | [ ] | N/A | N/A |
| OAuth 로그인 | 1 | **전면 교체** | Toss Login → Supabase Edge Function | [ ] | [ ] | [ ] |
| 연결해제 (신규) | 1 | **웹훅** | CS/관리자 대응 | [ ] | [ ] | [ ] |
| 온보딩 설문 | 2 | TDS 마이그레이션 | TextField, Checkbox, useBottomSheet | [ ] | [ ] | [ ] |
| 대시보드 | 2 | TDS 마이그레이션 | ListRow, Badge, 차트 | [ ] | [ ] | [ ] |
| 행동 기록 (ABC) | 2 | TDS 마이그레이션 | TextField, useBottomSheet | [ ] | [ ] | [ ] |
| 분석 & 타임라인 | 2 | 차트 변경 | CSR 차트, PDF 유지 | [ ] | [ ] | [ ] |
| AI 코칭 엔진 | 2 | **코어 유지** | GPT-4o-mini + 캐시 + 비용 제어 | [ ] | [ ] | [ ] |
| 훈련 아카데미 | 2 | TDS 마이그레이션 | ListRow, 진행률 | [ ] | [ ] | [ ] |
| 반려견 프로필 | 2 | TDS 마이그레이션 | Asset, TextField | [ ] | [ ] | [ ] |
| 설정 | 2 | TDS 마이그레이션 | Switch, 알림 설정 | [ ] | [ ] | [ ] |
| PRO 구독 (신규) | 3 | **Toss IAP** | 비소모품+소모품, 2축 상태 관리 | [ ] | [ ] | [ ] |
| 알림 (신규) | 4 | **Smart Message** | 훈련 리마인더, 행동기록 알림 | [ ] | [ ] | [ ] |
| 포인트 (신규) | 4 | **토스 포인트** | 3-step key, 중복 방지 | [ ] | [ ] | [ ] |
| 딥엔트리 (신규) | 4 | **앱 내 기능** | 행동기록 바로가기, 데일리코칭 진입점 | [ ] | [ ] | [ ] |
| 이벤트 분석 (신규) | 4 | **토스 분석 대시보드** | 기록→코칭→결제 퍼널 추적 | [ ] | [ ] | [ ] |

**v1 DoD (Definition of Done)**: 위 16개 기능 전체 마이그레이션/테스트/QA확인 완료 + Toss QA 심사 승인

### 8.2 Phase 2+ 백로그 (v1 출시 후 진행)

| 기능 | Phase | 변경 수준 | 설명 |
|------|:-----:|-----------|------|
| 세그먼트 리텐션 | 2+ | 세그먼트+Smart Message | 3일 미기록, 스트릭 직전, 행동 급증 자동 알림 |
| 공유 리워드 | 2+ | 바이럴 루프 | 친구 초대→조건부 포인트 보상 |
| 트레이너 인증 | 2-3 | 토스 인증 | 검증된 훈련사 매칭 |
| 인앱 광고 | 2+ | 토스 인앱 광고 | 무료 티어 수익화 |

### 8.3 DB 테이블 커버리지 체크 (14개 기존 + 2개 신규)
- [ ] users (toss_user_key 추가) / [ ] dogs / [ ] dog_env / [ ] behavior_logs
- [ ] ai_coaching / [ ] ai_recommendation_snapshots / [ ] ai_recommendation_feedback
- [ ] user_training_status / [ ] training_behavior_snapshots / [ ] media_assets
- [ ] subscriptions (스키마 변경) / [ ] user_settings / [ ] noti_history
- [ ] ai_cost_usage_daily / [ ] ai_cost_usage_monthly
- [ ] **toss_orders (신규)** / [ ] **edge_function_requests (신규)**

### 8.4 API 엔드포인트 커버리지 (20+ 기존 유지 + 6 신규)
- [ ] auth (Toss Login 교체) / [ ] onboarding / [ ] dashboard / [ ] logs
- [ ] coaching / [ ] recommendations / [ ] dogs / [ ] settings / [ ] training
- [ ] **subscription/toss-iap (신규)** / [ ] **webhook/toss-disconnect (신규)**

---

## 9. 상세 기능 명세

### 9.1 Toss Login 플로우 (Supabase 브릿지 패턴)

**플로우:**
1. 클라이언트: `appLogin()` → `{ authorizationCode, referrer }` 획득
2. 클라이언트: `supabase.functions.invoke('login-with-toss', { body: { authorizationCode, referrer } })`
3. Edge Function: mTLS로 Toss `generate-token` API 호출 (authCode 유효기간 10분)
4. Edge Function: Bearer token으로 `login-me` API → `tossUserKey` + 암호화된 프로필
5. Edge Function: `tossUserKey + pepper` → PBKDF2 → Supabase Auth signIn/signUp
6. 클라이언트: `supabase.auth.setSession({ access_token, refresh_token })` → 온보딩 진행

**에러 처리**: `invalid_grant`(만료 코드), `USER_NOT_FOUND`, mTLS 인증서 오류

**토큰 생명주기 전략:**
- **평상시**: Supabase refresh token으로 앱 세션 유지 (토스 토큰 불필요)
- **토스 프로필/스코프 재조회 필요 시**: Toss `refresh-token` API 호출
  - `POST .../oauth2/refresh-token` → 새 accessToken 발급 (refreshToken 유효기간 14일)
  - refreshToken 만료 시 → `appLogin()` 재호출 유도
- **로그아웃**: `POST .../oauth2/access/remove-by-access-token` (Bearer 헤더) → Supabase signOut

**토스 토큰 저장/갱신/폐기 정책:**
- **결정: Toss access/refresh token은 DB에 저장하지 않음**
  - 이유: Supabase Auth 세션이 앱 인증의 주체. Toss 토큰은 Edge Function 내부에서 1회성으로만 사용
  - 로그인 시: `generate-token` → `login-me` → Supabase 세션 발급 → Toss 토큰 즉시 폐기 (메모리에서만 처리)
  - **프로필 재조회 필요 시**: `appLogin()` 재호출 유도 (Toss refreshToken 14일 TTL 내라면 자동 갱신, 만료 시 재로그인)
  - **예외**: 향후 Toss 프로필 변경 실시간 동기화가 필요하면 재검토 → 그때 암호화 컬럼(`toss_tokens`) + "최신 1개만 유효" + TTL 정책 도입
- **Supabase 세션 토큰**: `supabase.auth.setSession()`으로 클라이언트에 저장 (Supabase SDK 기본 동작)

**연결해제 콜백:**
- Toss에서 `userKey + referrer` 전달. referrer 종류:
  - `UNLINK`: 사용자가 직접 연결 해제
  - `WITHDRAWAL_TERMS`: 동의 철회
  - `WITHDRAWAL_TOSS`: 토스 계정 탈퇴
- **관리자 연결 끊기**: `POST .../oauth2/access/remove-by-user-key` (CS 도구에서 사용)

**연결해제/탈퇴 데이터 보존 정책:**

| referrer | 즉시 처리 | 30일 유예 | 법적 보존 |
|----------|-----------|-----------|-----------|
| **UNLINK** | `toss_user_key` → NULL (재연결 가능) | 행동 로그/AI 코칭 데이터 → 30일 후 자동 삭제 | - |
| **WITHDRAWAL_TERMS** | PII 삭제 → 익명화 (`user_xxxxx`) | 나머지 데이터 삭제 | - |
| **WITHDRAWAL_TOSS** | 전체 데이터 삭제 (CASCADE) + Supabase Auth 삭제 | - | 결제 이력 5년 보존 (전자상거래법) |

- **관리자 `remove-by-user-key`**: UNLINK와 동일 정책 적용
- **구현**: `referrer` 값에 따라 분기 → 삭제/익명화/유예 처리 + `noti_history`에 처리 로그 기록

**`verify_jwt = false` 설정 필요** (로그인 전 호출이므로)

**login-with-toss 무인증 엔드포인트 방어 정책:**
| 방어 수단 | 설정값 |
|-----------|--------|
| Rate-limit | IP당 분당 10회, 초과 시 429 반환 |
| authorizationCode | 1회 사용 (Toss 자체 제공, 10분 TTL, 재사용 시 `invalid_grant`) |
| Nonce/Idempotency | authorizationCode를 멱등키 → DB 기록 → 동일 코드 재호출 시 첫 결과 반환 |
| 연속 실패 차단 | 동일 IP 연속 5회 실패 → 15분 차단 |
| 요청 서명 | FE에서 `timestamp + authorizationCode`의 HMAC-SHA256 서명 → Edge Function 검증 (5분 TTL) |
| 로깅 | 모든 실패 시도 기록 (IP, timestamp, error_code) → 이상 탐지 알림 |

### 9.2 Toss IAP 구매 플로우 (SDK 1.2.2+)

**플로우:**
1. `getProductItemList()` → 상품 목록 표시
2. `createOneTimePurchaseOrder()` → 결제 윈도우 → 콜백 (success/error)
3. 성공 시: BE에서 상품 지급 → `completeProductGrant(orderId)` 호출
4. **복구**: 앱 시작 시 `getPendingOrders()` → 미완료 주문 재처리 → `completeProductGrant()`

**주문 상태 6가지**: PURCHASED, PAYMENT_COMPLETED, FAILED, REFUNDED, ORDER_IN_PROGRESS, NOT_FOUND

**검증 API**: `POST /api-partner/v1/apps-in-toss/order/get-order-status` (헤더: `x-toss-user-key`)

**에러**: `PRODUCT_NOT_GRANTED_BY_PARTNER` → 재시도 큐

**Sandbox 필수 테스트 3가지**: 성공, 성공+서버실패(복구), 에러 조건

**절대 규칙 (SDK 버전 방어)**: `getPendingOrders` 반환 구조(필드명, sku 등)는 SDK 업데이트 시 변경 가능 → 타입가드 + 버전별 분기 처리 필수. 반환값을 `unknown`으로 받아 런타임 검증 후 사용. SDK changelog 모니터링을 Phase 5 QA 체크리스트에 포함

### 9.3 Smart Message (다채널 메시지 발송)

**API**: `POST /api-partner/v1/apps-in-toss/messenger/send-message` (헤더: `x-toss-user-key`)

**요청**: `{ templateSetCode: "string", context: { 변수: 값 } }`

**채널**: Push, Inbox, SMS, Alimtalk, Friendtalk (모두 단일 API로 발송)

**응답**: 채널별 `sentCount` + `fail[].reachFailReason` 상세 결과

**`userName`**: 자동 적용 (전달 불필요)

**글자 수 가이드** (하드 제한이 아닌 QA 권장):
- 제목 13자, 본문 20자 (한글 기준) — UX/심사 관점의 가이드
- **구현 방식**: 작성 UI에 글자수 카운터 + 초과 시 경고(노란색) 표시
- 서버에서는 "템플릿 context 변수 누락/치환 실패"만 하드 실패로 처리
- QA 체크리스트에서 "가이드 초과 여부" 검수 항목으로 배치

**빈도 제한/쿨다운 정책:**

| 메시지 유형 | 빈도 제한 | 시간 제한 |
|------------|-----------|-----------|
| 동일 templateSetCode | 사용자당 **10분 1회 / 하루 3회** | 초과 시 큐잉, 다음 슬롯에 발송 |
| 행동기록 리마인더 | - | **밤 10시~오전 8시 발송 금지** (사용자 timezone) |
| 프로모션 메시지 | **주 2회** 상한 | 이탈 방지 |
| 긴급 메시지 (행동 급증 알림) | **하루 1회** 상한 | 쿨다운 예외 허용 |

구현: Edge Function에서 `noti_history` 테이블 조회 → 쿨다운 위반 시 429 반환 or 큐잉

### 9.4 토스 포인트 프로모션 (3-step key)

**플로우:**
1. `POST .../promotion/execute-promotion/get-key` → Base64 key 획득 (유효기간 1시간)
2. `POST .../promotion/execute-promotion` → `{ promotionCode, key, amount }` → 포인트 지급
3. `POST .../promotion/execution-result` → SUCCESS/PENDING/FAILED 확인

**중복 방지 필수**: key 1회 사용 제한, 방어 로직 구현 필수

**에러코드**: 4100(미등록), 4109(비활성/예산소진), 4110(시스템오류→재시도), 4112(예산부족), 4113(중복key)

**예산 관리**: 80% 소진 시 이메일 알림, Console에서 충전

### 9.5 딥엔트리 — 앱 내 기능 바로가기

**등록할 딥엔트리 3종:**
| 엔트리 | 라벨 | 목적지 |
|--------|------|--------|
| `quick-log` | "오늘 행동 기록하기" | 대시보드 Quick Log 폼 |
| `daily-coach` | "오늘의 코칭 확인" | AI 코칭 결과 화면 |
| `training-today` | "오늘의 훈련 미션" | 훈련 아카데미 현재 스텝 |

**파라미터 프리필**: 진입 시 `?type=barking&location=home` 같은 쿼리로 폼 자동 채움

**권한/상태별 라우팅 규칙:**
| 진입점 | 상태 | 리다이렉트 |
|--------|------|-----------|
| `quick-log` | 온보딩 미완료 | 온보딩 화면 |
| `quick-log` | 반려견 미등록 | 반려견 등록 화면 |
| `daily-coach` | 온보딩 미완료 | 온보딩 |
| `daily-coach` | AI 코칭 미생성 | 대시보드 (코칭 요청 유도) |
| `training-today` | 온보딩 미완료 | 온보딩 |
| `training-today` | 훈련 시작 전 | 훈련 아카데미 메인 |
| 모든 진입점 | PRO 전용 화면 + 무료 유저 | PRO 업셀 바텀시트 |

공통: 모든 딥엔트리는 `authGuard` → `onboardingGuard` → `featureGuard` 순서로 미들웨어 체인 통과

**AC**: 딥엔트리 탭 → 해당 화면 1초 이내 진입, 파라미터 프리필 정상 동작, 미완료 상태 시 적절한 리다이렉트

### 9.6 이벤트 분석 — 기록→코칭→결제 퍼널

**TailLog 핵심 이벤트 (7개):**
| 이벤트 | 트리거 시점 | 속성 |
|--------|-----------|------|
| `onboarding_complete` | 온보딩 설문 완료 | - |
| `behavior_log_created` | 행동 기록 생성 | quick_log vs detailed |
| `ai_coach_requested` | AI 코칭 요청 | - |
| `ai_coach_completed` | AI 코칭 응답 수신 | source: ai vs rule |
| `iap_purchase_success` | IAP 결제 성공 | product_type |
| `training_step_completed` | 훈련 스텝 완료 | curriculum_id, step |
| `share_reward_sent` | 공유 리워드 링크 발송 | - |

**퍼널**: 온보딩 → 첫 기록 → 3일 연속 → AI 코칭 요청 → PRO 결제

**AC**: 모든 핵심 이벤트가 토스 대시보드에 실시간 반영 (지연 < 5분)

### 9.7 세그먼트 + Smart Message 리텐션 자동화 (Phase 2+)

**TailLog 맞춤 세그먼트:**
| 세그먼트 | 조건 | 자동 메시지 |
|----------|------|-----------|
| `inactive_3d` | 3일 연속 행동 기록 미작성 | "오늘 10초만 기록하면 코칭 정확도가 올라가요" |
| `streak_6d` | 6일 연속 기록 중 | "7일 스트릭 1일 남음 → 포인트 보상이 기다려요" |
| `behavior_spike` | 특정 행동 빈도 전주 대비 2배↑ | "짖음 빈도가 늘었어요. 맞춤 코칭을 확인해보세요" |
| `pre_pro_churn` | AI 코칭 5회 + PRO 미결제 | "PRO로 업그레이드하면 무제한 AI 코칭을 받을 수 있어요" |
| `new_d1/d3/d7` | 온보딩 후 D+1, D+3, D+7 | 드립 캠페인 |

### 9.8 공유 리워드 — 바이럴 추천 루프 (Phase 2+)
- 초대자: 고유 공유 링크 생성 (토스 공유 리워드 SDK)
- 피초대자: 링크 → 미니앱 진입 → 온보딩 → 첫 3일 기록 + 1회 AI 코칭 완료
- **조건 충족 시**: 초대자 + 피초대자 모두 토스 포인트 보상 (예: 각 500P)
- **악용 방지**: "첫 3일 기록 + 1회 코칭" 조건부 지급으로 허위 가입 차단

### 9.9 트레이너 인증 마켓플레이스 (Phase 2-3)
- 토스 인증(본인인증)으로 검증된 전문 훈련사 매칭
- v1에서는 AI 코칭만, v2에서 전문가 매칭 추가
- 비즈 모델: 상담 건당 수수료 or 훈련사 구독

### 9.10 인앱 광고 — 무료 티어 수익화 (Phase 2+)
- 추천 위치: 무료 티어 대시보드 하단 (PRO 업그레이드 CTA와 경쟁하지 않는 구간)
- "광고 제거"를 PRO 혜택에 포함 → 전환율 향상
- UX/QA 심사 리스크 있으므로 Phase 2 이후 도입

---

## 10. API 계약

### 10.1 표준 응답 형식
```json
{ "success": true, "data": {}, "error": null, "meta": {} }
```

### 10.2 인증 흐름 (2계층)
- **FE → Supabase Edge Function**: Toss OAuth 코드 전달 (mTLS는 Edge Function이 처리)
- **FE → FastAPI BE**: `Authorization: Bearer {supabase_jwt}` (기존 방식 유지)
- **Edge Function → Toss S2S**: mTLS + `Bearer {toss_access_token}` + `x-toss-user-key`

### 10.3 Toss S2S BaseURL
`https://apps-in-toss-api.toss.im`

### 10.4 Edge Function 4종 공통 운영 정책 (절대 규칙)

| 정책 | 설명 | 적용 대상 |
|------|------|----------|
| **멱등키** | 요청마다 고유 키 → DB 로그 → 동일 키 2회 시 첫 결과 리턴 | verify-iap-order, grant-toss-points, send-smart-message |
| **재시도** | 5xx/타임아웃만 재시도 (최대 2회, 지수 백오프 1s→2s). 4xx 재시도 안함 | 전 함수 |
| **타임아웃** | Toss S2S 호출 3초, 전체 Edge Function 실행 5초 | 전 함수 |
| **서킷브레이커** | 연속 5회 실패 → 30초간 fast-fail 반환 → 자동 복구 시도 | verify-iap-order, grant-toss-points |

---

## 11. 테스트 / 검증 전략

- **Unit**: pytest (BE 80%+), Vitest (FE 75%+)
- **Integration**: Toss Auth 모의, IAP 주문 상태 6단계 시뮬레이션
- **E2E**: **Toss Sandbox App** (필수), QR 테스트 (`intoss-private://`)
- **Toss QA 심사**: UX Writing 가이드 준수, 다크 패턴 방지, 성능 기준 충족
- **성능**: WebView 60fps 스크롤, API p95 < 300ms, 차트 렌더링 < 500ms

---

## 12. CI/CD & 배포 전략

- Git: trunk-based + feature branch, Conventional Commits
- CI: GitHub Actions (build → lint → typecheck → test → e2e)
- **FE 배포**: 토스 WebView 번들 (Vercel 아님)
- **BE 배포**: Fly.io (Supabase JWT 검증만, mTLS 불필요)
- **론칭 파이프라인**: 개발 → Sandbox → QR 테스트 → QA 심사 제출 → 승인 → 론칭

---

## 13. 보안 & 개인정보

### 13.1 mTLS
- 인증서를 Base64 인코딩 → **Supabase Edge Function secrets**에 저장
- Edge Function에서 `Deno.createHttpClient({ cert, key })` 로 mTLS 클라이언트 생성
- **FastAPI 백엔드에는 mTLS 불필요** (Supabase JWT만 검증)

### 13.2 인증 보안
- Toss AccessToken 유효기간: 1시간, RefreshToken: 14일
- Supabase 세션 토큰으로 변환하여 기존 RLS 인프라 활용
- PBKDF2 deterministic password: `SUPER_SECRET_PEPPER` 필수 (유출 시 전체 계정 위험)

### 13.3 PII 암호화
- Toss 프로필 개인정보는 **AES-256-GCM** 암호화 상태로 전달
- 복호화 키: 이메일로 별도 전달, AAD 파라미터 + IV(12바이트) 추출 필요
- 사용 가능 필드: name, phone, birthday(yyyyMMdd), ci, gender, nationality, email(미인증)
- 비암호화 필드: userKey(숫자), scope, agreedTerms

### 13.4 Edge Function 로그 PII 정책 (절대 규칙)
- **로그 금지**: phone, ci, birthday, email, name, gender, nationality, accessToken, refreshToken
- **로그 허용**: requestId, userKey(해시), toss_status, grant_status, latency_ms, error_code
- **마스킹**: 전화번호 → `010****1234`, 이메일 → `a***@example.com`

### 13.5 PII 복호화 키 관리
- AES-256-GCM 복호화 키는 Supabase Edge Function secrets에 저장
- **키 회전**: Toss에서 신규 키 발급 시 즉시 교체 (기존 키 7일 유예 후 삭제)
- **접근 통제**: 복호화는 `login-with-toss` Edge Function에서만 실행
- **원칙**: "복호화는 필요한 순간에만" — 메모리에서만 처리, DB 저장 시 재암호화 or 저장 안함

### 13.6 verify_jwt 함수별 분리 (보안사고 방지)

| 함수 | verify_jwt | 추가 검증 |
|------|-----------|-----------|
| `login-with-toss` | **false** (유일한 예외) | 9.1의 무인증 방어 정책 적용 |
| `verify-iap-order` | true | Supabase JWT 유효성 |
| `send-smart-message` | true | 관리자 Role 체크 |
| `grant-toss-points` | true | 관리자 Role 체크 |

### 13.7 기타
- 데이터 프라이버시: nullable 프로필 처리 (사용자 동의 기반), GDPR/PIPA 준수
- 시크릿 관리: Edge Function secrets + Fly.io secrets + Supabase secrets
- 네트워크: Toss IP 화이트리스트, TLS 1.2+, per-user/per-IP 레이트 리밋

---

## 14. 관찰성

- 구조화 JSON 로깅, Sentry 에러 추적 (토스 미니앱 컨텍스트 태그)
- 메트릭: API 응답시간, 오류율, AI 코칭 지연, IAP 전환율
- 헬스체크: `/health` (DB + Toss S2S 연결)
- 알림: 에러율 급증, 지연 증가, mTLS 인증서 만료 30일 전 경고

---

## 15. 성능 & 확장성

- FE: WebView 번들 < 500KB gzipped, 라우트별 코드 스플리팅
- BE: AI 캐시-우선 전략 유지, DB 인덱스 최적화, 커넥션 풀링
- 레이트 리밋: AI 코칭 10회/시간(무료), 50회/시간(PRO)

---

## 16. 운영 / 유지보수

- Supabase 자동 백업, Alembic 마이그레이션 (up/down)
- mTLS 인증서 갱신 운영 런북 (만료 30일 전 알림)
- PII 복호화 키 회전 절차 (Toss 키 교체 → Edge Function secrets 업데이트 → 7일 유예)
- OpenAPI 자동 생성 API 문서

**CS/관리자 운영 도구:**
- 사용자 연결 끊기: `remove-by-user-key` API (CS 대응)
- IAP 수동 재처리: `grant_status = RETRY_QUEUED` → 재처리 큐 수동 실행
- 포인트 지급 이력 조회: `edge_function_requests` 테이블 기반
- 토스 프로모션 예산 잔액 모니터링 (Console + 80% 알림)

---

## 17. 위험관리

| 리스크 | 확률 | 영향 | 완화 조치 |
|--------|------|------|-----------|
| Toss QA 심사 반려 | 중 | 높음 | 사전 점검 체크리스트 적용 (부록 C) |
| mTLS 인증서 장애 | 낮음 | 치명적 | 갱신 30일 전 알림, 모니터링, 인증서 2벌 보관 |
| TDS 컴포넌트 제약 | 중 | 중간 | 필요 컴포넌트 사전 검증, 커스텀 fallback 준비 |
| WebView 차트 성능 | 중 | 중간 | 경량 차트 라이브러리, lazy load |
| IAP 결제성공+지급실패 | **높음** | **높음** | toss_status/grant_status 2축 분리 + 재처리 큐 + getPendingOrders 복구 |
| IAP 환불 후 상품 미회수 | 중 | 중간 | 연결해제/환불 웹훅 → grant_status=REVOKED + 유예기간 |
| 포인트 중복 지급 | 중 | 높음 | 멱등키 + key 1회 사용 + 4113 방어 로직 |
| Edge Function 연쇄 장애 | 낮음 | 높음 | 서킷브레이커(30초 fast-fail) + 알림 |
| PII 복호화 키 유출 | 낮음 | 치명적 | KMS 저장, 접근 Role 제한, 키 회전 절차 |
| getPendingOrders 미지원 기기 | 중 | 중간 | 안드 5.234.0 / iOS 5.231.0 미만 → 복구 스킵 + CS 안내 |

**QA 반려 사전 점검 체크리스트:**
- [ ] UX Writing 가이드 전체 텍스트 검수 완료
- [ ] 다크 패턴 없음 (조작적 긴급감, 숨은 비용, 불명확 CTA 없음)
- [ ] 미니앱 브랜딩 가이드 준수 (아이콘, 설명문)
- [ ] 접근성 가이드 (스크린리더, 키보드 탐색)
- [ ] IAP 상품 설명 정확, 환불 정책 고지 위치 확인
- [ ] Smart Message 글자 수 가이드 준수 확인
- [ ] Sandbox + QR 테스트 스크린샷 첨부
- [ ] 에러 상태 전체 사용자 친화적 메시지 확인

---

## 18. 산출물 & 수락 기준

### 18.1 v1 DoD (출시 필수 — Phase 2+ 백로그는 별도)
- [ ] TypeScript strict zero errors, 테스트 통과, CI green
- [ ] TDS 전용 (Tailwind/Radix/Framer Motion 임포트 0건)
- [ ] mTLS: Edge Function에서만 처리, Fly.io에 mTLS 코드/인증서 없음 확인
- [ ] Toss Login → Supabase Auth 브릿지 E2E 통과
- [ ] IAP 구매+복구+검증 Sandbox 3시나리오 통과
- [ ] Smart Message 템플릿 발송 성공
- [ ] 토스 포인트 테스트 프로모션 1회 성공
- [ ] 딥엔트리 3종 진입 정상 확인
- [ ] 이벤트 분석 핵심 7개 이벤트 토스 대시보드 반영 확인
- [ ] UX Writing 가이드 전체 텍스트 검수 완료
- [ ] 성능 SLO 충족 (API p95 < 300ms, WebView 60fps, 번들 < 500KB)
- [ ] **Toss QA 심사 승인**

---

## 19. Agent 운영 프롬프트

**절대 규칙:**
- `@apps-in-toss/web-framework` + TDS only (Tailwind/Radix/Framer Motion 임포트 금지)
- Toss Login only (기존 OAuth 제거)
- mTLS는 Edge Function 전담 (FastAPI에 mTLS 코드 금지)
- Edge Function `verify_jwt` 분리: `login-with-toss`만 `false`, 나머지 `true`

**개발 프로세스:**
- 파일 읽기 선행, 코드 재사용, BE↔FE 동기화
- 생성 순서: types → api → hooks → components → pages → backend → tests
- 3-Layer Architecture: Router → Service → Repository

**토스 전용 규칙:**
- Smart Message: UI 카운터+경고, 서버는 context 치환 실패만 하드 실패, 빈도 제한 정책 준수
- IAP: 반드시 `getPendingOrders()` 복구 로직 포함 + `toss_status`/`grant_status` 2축 관리
- IAP SDK 버전 체크: `typeof getPendingOrders === 'undefined'` → 복구 스킵 + CS 안내
- IAP SDK 업데이트 시 반환 구조 변경 가능 → `unknown` + 타입가드 필수
- Toss 프로필 nullable 필드 처리 (name, phone, email 모두 null 가능)
- mTLS 인증서 하드코딩 금지 (반드시 secrets)
- Edge Function에서 PII 로그 금지
- 모든 Edge Function에 멱등키 구현 필수

---

## 20. 빠른 시작 체크리스트

- [ ] Node 20.x, Python 3.12+ 설치
- [ ] Toss Developers Console 앱 등록
- [ ] mTLS 인증서 발급 → Base64 → Supabase secrets 저장
- [ ] MCP 서버 설정 (`scoop install ax` → `claude mcp add`)
- [ ] IAP 테스트 상품 등록
- [ ] Smart Message 템플릿 생성
- [ ] Sandbox App 설치
- [ ] 토스 포인트 테스트 1회 성공 확인

---

## 부록 A. 마케팅 & 프로모션 전략

### A.1 토스 포인트 캠페인
- 첫 행동 기록 보상, 7일 연속 스트릭, 추천 보상
- 예산 관리: Console에서 설정, 80% 소진 알림, 사업자 지갑 충전
- 에러 처리: 4109(예산소진) → 캠페인 자동 중단, 4110 → 재시도

### A.2 Smart Message 캠페인
- 기능 메시지 (API): 훈련 리마인더, 기록 알림 (template + context 변수)
- 프로모션 메시지 (Console): 온보딩 드립 (D+1,3,7), 재활성화, PRO 유도
- 채널: Push + Inbox + SMS + Alimtalk + Friendtalk (단일 API, 채널별 결과 추적)

### A.3 가격 전략

| 상품 | 가격 | 유형 |
|------|------|------|
| PRO Monthly | 4,900원 | 비소모품 (무제한 AI코칭, 고급 분석, PDF) |
| AI 토큰팩 10개 | 1,900원 | 소모품 |
| AI 토큰팩 30개 | 4,900원 | 소모품 |
| 무료 티어 | 0원 | 월 3회 AI코칭, 기본 분석, 무제한 행동기록 |

### A.4 수익화 옵션 비교
- **IAP**: PRO 구독 + AI 토큰팩 (주력)
- **토스페이**: 실물 상품 판매 시 (현재 해당 없음)
- **인앱 광고**: 무료 티어 사용자 대상 (Phase 2 이후 검토)

---

## 부록 B. AI 코딩 개발 가이드라인 (CLAUDE.md 리팩토링)

### B.1 MCP 서버 설정
- Windows: `scoop bucket add toss https://github.com/toss/scoop-bucket.git && scoop install ax`
- macOS: `brew tap toss/tap && brew install ax`
- **Claude Code**: `claude mcp add --transport stdio apps-in-toss ax mcp start`
- **Cursor**: `.cursor/mcp.json`에 설정

### B.2 LLM 참조 문서 URL

| 용도 | URL |
|------|-----|
| 핵심 문서 | `https://developers-apps-in-toss.toss.im/llms.txt` |
| 전체 문서 | `https://developers-apps-in-toss.toss.im/llms-full.txt` |
| 예제 코드 | `https://developers-apps-in-toss.toss.im/tutorials/examples.md` |
| TDS WebView | `https://tossmini-docs.toss.im/tds-mobile/llms-full.txt` |
| TDS React Native | `https://tossmini-docs.toss.im/tds-react-native/llms-full.txt` **(참조 전용 — 본 프로젝트 WebView only, 미사용)** |

### B.3 기존 CLAUDE.md 핵심 원칙 계승
- 파일 읽기 선행, 폴더별 CLAUDE.md 우선, 파일 헤더 요약 주석
- 코드 재사용 우선, BE-FE 타입 동기화 필수
- 3-Layer Architecture: Router → Service → Repository

### B.4 코드 품질 게이트
- TypeScript strict mode, zero errors, no `any` (unknown + type guards)
- Pydantic (BE) + TypeScript interfaces (FE) 동기화
- 모든 API 응답 타입 정의, 모든 Edge Function 에러 핸들링

---

## 부록 C. Toss QA 심사 체크리스트

- [ ] UX Writing 가이드 준수
- [ ] 다크 패턴 방지 정책 준수
- [ ] 미니앱 브랜딩 가이드 준수
- [ ] 접근성 가이드 준수
- [ ] AI 콘텐츠 정책 (코칭 응답의 의학적 조언 면책)
- [ ] IAP 상품 설명 정확성, 환불 정책 명시
- [ ] Smart Message 빈도 제한/쿨다운 정책 적용 확인
- [ ] Sandbox/QR 테스트 완료
- [ ] WebView 성능 기준 충족 (60fps 스크롤, 앱 진입 2초 이내)
- [ ] mTLS 연결 검증, 에러 상태 사용자 친화적 처리
- [ ] SDK changelog 확인 (getPendingOrders 반환 구조 변경 여부)

---

## 부록 D. 추가 스킬화 필요 항목

| 토스 기능 | 우선순위 | 명세서 반영 섹션 |
|-----------|---------|-----------------|
| **세그먼트** (사용자 타겟팅) | 높음 | 부록 A 마케팅 |
| **분석 대시보드** (이벤트 로그) | 높음 | 섹션 14 관찰성 |
| **Sentry 모니터링** | 높음 | 섹션 14 관찰성 |
| **공유 리워드** (바이럴) | 중간 | 부록 A 마케팅 |
| **Firebase 연동** | 중간 | 섹션 14 관찰성 |

---

## 실행 계획 (페이즈별)

### Phase 0: 셋업 & 인프라 (1-2주)
1. Toss Developers Console 앱 등록
2. mTLS 인증서 발급 → Base64 인코딩 → Supabase secrets 저장
3. `@apps-in-toss/web-framework` 프로젝트 스캐폴드
4. MCP 서버 설정
5. CI/CD 파이프라인 구성
6. IAP 테스트 상품 등록 + Smart Message 템플릿 생성
7. **토스 포인트 테스트 프로모션 1회 성공 확인** (필수 선행 조건)

### Phase 1: 인증 & 데이터 레이어 (2-3주)
1. Supabase Edge Function `login-with-toss` 구현 (mTLS + PBKDF2 + Supabase Auth)
2. FE에서 `appLogin()` → Edge Function → `setSession()` 구현
3. DB 마이그레이션 (users 테이블 UUID + toss_user_key + RLS)
4. FastAPI: 기존 Supabase JWT 검증 유지
5. Toss 연결해제 콜백 웹훅 + 데이터 보존 정책 구현
6. 토큰 갱신 전략 구현

### Phase 2: UI → TDS 마이그레이션 (3-5주)
1. 레이아웃 (Top, BottomCTA, PageLayout)
2. 온보딩, 대시보드, 행동 기록, 분석, AI 코칭, 훈련, 프로필, 설정 → TDS

### Phase 3: 결제 & 수익화 (5-6주)
1. IAP 상품 목록 + 구매 플로우
2. Edge Function `verify-iap-order`
3. 복구 로직 + Sandbox 3시나리오 테스트
4. BE 구독 상태 관리 + `toss_orders` 테이블

### Phase 4: 알림 & 마케팅 (6-7주)
1. Edge Function `send-smart-message` + `grant-toss-points`
2. 템플릿 + 세그먼트 + 프로모션 캠페인
3. 딥엔트리 3종 등록 + 이벤트 분석 7개 이벤트
4. Sentry 연동

### Phase 5: 테스트 & QA 심사 (7-9주)
1. 단위/통합/E2E 테스트 완성
2. Sandbox App + QR 테스트
3. UX Writing 준수 검토
4. Toss QA 심사 제출

### Phase 6: 론칭 & 운영 (9-10주)
1. QA 승인 후 프로덕션 배포
2. 모니터링 + Smart Message 캠페인 활성화
3. 론칭 후 72시간 집중 모니터링
