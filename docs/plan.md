TailLog (DogCoach) → Toss In-App 마이그레이션 개발명세서 작성 플랜
Context
기존 DogCoach(TailLog) 프로젝트는 Next.js 16 + FastAPI + Supabase 기반의 반려견 행동 교정 AI 코칭 SaaS입니다. 이를 토스 인앱(Apps in Toss) 미니앱으로 마이그레이션하여 토스의 대규모 트래픽과 결제/알림 인프라를 활용하려 합니다.

산출물: prdtamplate.md 형식을 따르는 마스터 개발명세서 (개발, 보안, AI코딩, 홍보, 결제 등 전체 아우르는 문서)

핵심 아키텍처 결정: SKILL.md Section 8의 Toss + Supabase 통합 패턴을 채택합니다.

Supabase Auth를 유지하되, Toss Login을 Supabase Edge Function으로 브릿지
FastAPI 백엔드에서 직접 Toss mTLS를 처리하는 것이 아니라, **Supabase Edge Function(Deno)**에서 mTLS 처리
기존 DogCoach의 Supabase RLS/Auth 인프라를 최대한 재활용
핵심 변경 사항 요약
영역	기존 (DogCoach)	토스 인앱 (신규)
FE 프레임워크	Next.js 16 + React 19	@apps-in-toss/web-framework (WebView)
UI 시스템	Tailwind CSS v4 + Radix UI + Framer Motion	TDS (Toss Design System) 전면 교체
인증	Supabase Auth (Google/Kakao OAuth + 게스트)	Toss Login → Supabase Edge Function → Supabase Auth (브릿지 패턴)
인증 mTLS	없음	**Supabase Edge Function(Deno)**에서 mTLS 인증서 처리
결제	Stripe 플레이스홀더	Toss IAP (소모품/비소모품)
알림	미구현 (Kakao Alimtalk 예정)	Toss Smart Message (Push + Inbox + SMS + Alimtalk)
프로모션	없음	토스 포인트 연동 (3-step key 기반)
BE 보안	HTTPS + Supabase JWT	S2S API는 Supabase Edge Function에서 mTLS 처리
FE 배포	Vercel	토스 WebView 번들 배포
BE 배포	Fly.io	Fly.io 유지 (Supabase JWT 검증 유지)
랜딩 페이지	12개 섹션 (Framer Motion)	제거 — 대시보드가 진입점
게스트 모드	anonymous_sid 쿠키 기반	제거 — 토스 유저는 항상 인증됨
명세서 문서 구조 (PRD 템플릿 기반)
섹션 0: 메타 / 버전관리
문서 버전, 변경 기록, 토스 전용 용어집 (TDS, IAP, mTLS, S2S, MCP 등)
섹션 1: 프로젝트 개요
Problem: 반려견 행동 문제를 과학적으로 추적/분석할 접근성 높은 도구 부재
Goal: 토스 미니앱으로 론칭, 3개월 내 MAU 10,000명, API p95 < 300ms
Non-goals: 앱스토어 독립 배포 없음, React Native 경로 없음 (WebView only), v1에서 다국어 미지원
User Stories: 온보딩, 행동기록, AI코칭, 분석, 훈련, PRO구독, 알림 등 7개 핵심 스토리 (Given/When/Then + AC)
섹션 2: 기술 스택 & 제약
프론트엔드 (변경):

@apps-in-toss/web-framework + TypeScript 5.x (strict)
TDS 컴포넌트: Top, BottomCTA, ListRow, TextField, Checkbox, Switch, Skeleton, Badge, Asset 등
TDS Hooks: useDialog, useToast, useBottomSheet, useVisualViewport
상태관리: TanStack Query v5 (서버상태) + Zustand (로컬상태)
차트: 경량 클라이언트 차트 라이브러리 (Recharts CSR 모드)
인증 레이어 (Toss + Supabase 브릿지 패턴 — SKILL.md Section 8):

클라이언트: appLogin() → authorizationCode 획득
Supabase Edge Function (login-with-toss): mTLS로 Toss OAuth API 호출
POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token (코드→토큰 교환, 유효기간 10분)
GET /api-partner/v1/apps-in-toss/user/oauth2/login-me (프로필 조회, AES-256-GCM 암호화)
tossUserKey + pepper → PBKDF2 deterministic password → Supabase Auth 유저 생성/로그인
클라이언트: supabase.auth.setSession() → 기존 Supabase JWT 인프라 그대로 활용
Edge Function 시크릿: TOSS_CLIENT_CERT_BASE64, TOSS_CLIENT_KEY_BASE64, SUPER_SECRET_PEPPER, SUPABASE_SERVICE_ROLE_KEY
DB 스키마: public.users 테이블에 toss_user_key TEXT UNIQUE NOT NULL + RLS 정책
Access Token 유효기간: 1시간, Refresh Token: 14일
백엔드 (대부분 유지):

FastAPI + SQLAlchemy async + Supabase PostgreSQL (유지)
OpenAI GPT-4o-mini (유지, 동일 비용 제어)
Supabase JWT 검증 (기존 방식 유지 — Edge Function이 발급한 Supabase 토큰 사용)
신규: Toss S2S API용 Edge Function 추가 (IAP 검증, Smart Message, 포인트)
인프라 제약:

Node.js 20.x LTS, Python 3.12+
mTLS 인증서는 Toss Developers Console에서 발급 → Base64 인코딩하여 Supabase Edge Function secrets에 저장
Toss Inbound/Outbound IP 방화벽 허용 필수
토스앱 기능별 최소 버전 (미만 시 해당 기능 숨김/대체 안내 필수):
기능	Android 최소	iOS 최소	미만 시 대응
Toss Login (appLogin)	5.219.0+	5.219.0+	미니앱 진입 자체 불가 (토스 자동 처리)
IAP 기본 (createOneTimePurchaseOrder)	5.219.0+	5.219.0+	IAP 객체 undefined → 구매 UI 숨김 + "앱 업데이트" 안내
IAP 복구 (getPendingOrders)	5.234.0+	5.231.0+	복구 함수 undefined → 복구 스킵, 수동 CS 안내
IAP 이력 (getCompletedOrRefundedOrders)	5.234.0+	5.231.0+	이력 조회 불가 → BE fallback 조회
토스 포인트 (grantPromotionReward)	5.232.0+	5.232.0+	포인트 UI 숨김, "앱 업데이트 후 리워드 지급" 안내
Smart Message (수신)	버전 무관	버전 무관	서버 발송, 클라이언트 의존 없음
섹션 3: 디자인 시스템
TDS Colors v5 (지각적 균일 색 공간, 다크/라이트 모드 계층 토큰)
TDS Typography (동적 크기 + 접근성 토큰)
컴포넌트 매핑표: DogCoach 30+ 컴포넌트 → TDS 대응 컴포넌트 1:1 매핑
Toss UX Writing 가이드 준수 (QA 심사 필수)
섹션 4: 데이터 모델 & 인터페이스
User 모델 변경 (SKILL.md Section 8 DB Contract 준수):

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  toss_user_key TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'trainer', 'admin'))
);
-- RLS 정책 + auth.uid() 기반 접근 제어
기존 DogCoach users 테이블을 UUID-based auth.users 연동으로 마이그레이션
절대 규칙: integer users.id와 Supabase Auth UUID를 혼용하지 않음
신규 모델: toss_orders — 2축 상태 분리 설계 (운영성 확보):
toss_status (토스가 알려주는 상태): PURCHASED | PAYMENT_COMPLETED | FAILED | REFUNDED | ORDER_IN_PROGRESS | NOT_FOUND
grant_status (우리 내부 지급 상태): PENDING | GRANTED | GRANT_FAILED | RETRY_QUEUED | REVOKED
왜 분리? → "결제 성공인데 지급 실패" 같은 상황에서 원인 추적이 쉬워지고, 재처리 큐 운영이 간단해짐
idempotency_key (멱등키): 중복 호출 방지용 UNIQUE 컬럼
구독 테이블 스키마 업데이트
유지 모델: dogs, dog_env, behavior_logs, ai_coaching, ai_recommendation_snapshots, user_training_status 등 12+ 테이블
DB 마이그레이션 스크립트 (Alembic) + 롤백 계획
섹션 5: 아키텍처 & 파일 구조
FE 신규 구조: pages/ (파일 기반 라우팅), components/ (TDS 래퍼), lib/ (API, hooks, utils), stores/, types/
Supabase Edge Functions (신규 — Toss S2S 브릿지):

supabase/
├── config.toml                    # Edge Function 설정
└── functions/
    ├── login-with-toss/           # Toss OAuth2 → Supabase Auth 브릿지
    │   ├── index.ts               # mTLS + token exchange + user creation
    │   └── deno.json              # import map
    ├── verify-iap-order/          # IAP 주문 상태 검증 (mTLS)
    ├── send-smart-message/        # Smart Message 발송 (mTLS)
    └── grant-toss-points/         # 토스 포인트 지급 (mTLS)
BE 수정 구조: FastAPI는 대부분 유지. Supabase JWT 검증 그대로. 신규 라우터: subscription (IAP 상태 관리), webhook (Toss 콜백)
프론트엔드-백엔드 미러 구조 유지: types/{domain}.ts ↔ models/{domain}.py
섹션 6: 기능 명세 & 비즈니스 로직
6.1 기능 마이그레이션 맵 + 전체 커버 체크박스 (누락 방지):

기능	변경 수준	설명	마이그레이션	테스트	QA확인
랜딩 페이지	제거	토스 미니앱은 기능 화면으로 바로 진입	[ ]	N/A	N/A
OAuth 로그인	전면 교체	Toss Login → Supabase Edge Function	[ ]	[ ]	[ ]
온보딩 설문	TDS 마이그레이션	TextField, Checkbox, useBottomSheet	[ ]	[ ]	[ ]
대시보드	TDS 마이그레이션	ListRow, Badge, 차트	[ ]	[ ]	[ ]
행동 기록 (ABC)	TDS 마이그레이션	TextField, useBottomSheet	[ ]	[ ]	[ ]
분석 & 타임라인	차트 변경	CSR 차트, PDF 유지	[ ]	[ ]	[ ]
AI 코칭 엔진	코어 유지	GPT-4o-mini + 캐시 + 비용 제어	[ ]	[ ]	[ ]
훈련 아카데미	TDS 마이그레이션	ListRow, 진행률	[ ]	[ ]	[ ]
반려견 프로필	TDS 마이그레이션	Asset, TextField	[ ]	[ ]	[ ]
설정	TDS 마이그레이션	Switch, 알림 설정	[ ]	[ ]	[ ]
PRO 구독 (신규)	Toss IAP	비소모품+소모품, 2축 상태 관리	[ ]	[ ]	[ ]
알림 (신규)	Smart Message	훈련 리마인더, 행동기록 알림	[ ]	[ ]	[ ]
포인트 (신규)	토스 포인트	3-step key, 중복 방지	[ ]	[ ]	[ ]
연결해제 (신규)	웹훅	CS/관리자 대응	[ ]	[ ]	[ ]
딥엔트리 (신규)	앱 내 기능	행동기록 바로가기, 데일리코칭 진입점	[ ]	[ ]	[ ]
세그먼트 리텐션 (신규)	세그먼트+Smart Message	3일 미기록, 스트릭 직전, 행동 급증 자동 알림	[ ]	[ ]	[ ]
공유 리워드 (신규)	바이럴 루프	친구 초대→조건부 포인트 보상	[ ]	[ ]	[ ]
이벤트 분석 (신규)	토스 분석 대시보드	기록→코칭→결제 퍼널 추적	[ ]	[ ]	[ ]
트레이너 인증 (v2)	토스 인증	검증된 훈련사 매칭 (Phase 2-3)	[ ]	[ ]	[ ]
인앱 광고 (v2)	토스 인앱 광고	무료 티어 수익화 (Phase 2+)	[ ]	[ ]	[ ]
DB 테이블 커버리지 체크 (14개 기존 + 2개 신규):

 users (toss_user_key 추가) / [ ] dogs / [ ] dog_env / [ ] behavior_logs
 ai_coaching / [ ] ai_recommendation_snapshots / [ ] ai_recommendation_feedback
 user_training_status / [ ] training_behavior_snapshots / [ ] media_assets
 subscriptions (스키마 변경) / [ ] user_settings / [ ] noti_history
 ai_cost_usage_daily / [ ] ai_cost_usage_monthly
 toss_orders (신규) / [ ] edge_function_requests (신규)
API 엔드포인트 커버리지 (20+ 기존 유지 + 6 신규):

 auth (Toss Login 교체) / [ ] onboarding / [ ] dashboard / [ ] logs
 coaching / [ ] recommendations / [ ] dogs / [ ] settings / [ ] training
 subscription/toss-iap (신규) / [ ] webhook/toss-disconnect (신규)
6.2 상세 기능 명세 (각 기능별 — 목적, 유저 플로우, API Contract, 에러 케이스, 수락 기준 포함):

6.2.1 Toss Login 플로우 (Supabase 브릿지 패턴):

클라이언트: appLogin() → { authorizationCode, referrer } 획득
클라이언트: supabase.functions.invoke('login-with-toss', { body: { authorizationCode, referrer } })
Edge Function: mTLS로 Toss generate-token API 호출 (authCode 유효기간 10분)
Edge Function: Bearer token으로 login-me API → tossUserKey + 암호화된 프로필
Edge Function: tossUserKey + pepper → PBKDF2 → Supabase Auth signIn/signUp
클라이언트: supabase.auth.setSession({ access_token, refresh_token }) → 온보딩 진행
에러: invalid_grant(만료 코드), USER_NOT_FOUND, mTLS 인증서 오류
토큰 생명주기 전략 (빠진 조각 A 반영):

평상시: Supabase refresh token으로 앱 세션 유지 (토스 토큰 불필요)
토스 프로필/스코프 재조회 필요 시: Toss refresh-token API 호출
POST .../oauth2/refresh-token → 새 accessToken 발급 (refreshToken 유효기간 14일)
refreshToken 만료 시 → appLogin() 재호출 유도
로그아웃: POST .../oauth2/access/remove-by-access-token (Bearer 헤더) → Supabase signOut
연결해제 콜백 (운영/CS 대응):
Toss에서 userKey + referrer 전달. referrer 종류:
UNLINK: 사용자가 직접 연결 해제
WITHDRAWAL_TERMS: 동의 철회
WITHDRAWAL_TOSS: 토스 계정 탈퇴
관리자 연결 끊기: POST .../oauth2/access/remove-by-user-key (CS 도구에서 사용)
연결해제 시: 데이터 보존 정책 결정 (즉시 삭제 vs 30일 유예 후 삭제)
verify_jwt = false 설정 필요 (로그인 전 호출이므로)
6.2.2 Toss IAP 구매 플로우 (SDK 1.2.2+ 필수):

getProductItemList() → 상품 목록 표시
createOneTimePurchaseOrder() → 결제 윈도우 → 콜백 (success/error)
성공 시: BE에서 상품 지급 → completeProductGrant(orderId) 호출
복구: 앱 시작 시 getPendingOrders() → 미완료 주문 재처리 → completeProductGrant()
주문 상태 6가지: PURCHASED, PAYMENT_COMPLETED, FAILED, REFUNDED, ORDER_IN_PROGRESS, NOT_FOUND
검증 API: POST /api-partner/v1/apps-in-toss/order/get-order-status (헤더: x-toss-user-key)
에러: PRODUCT_NOT_GRANTED_BY_PARTNER → 재시도 큐
Sandbox 필수 테스트 3가지: 성공, 성공+서버실패(복구), 에러 조건
6.2.3 Smart Message (다채널 메시지 발송):

API: POST /api-partner/v1/apps-in-toss/messenger/send-message (헤더: x-toss-user-key)
요청: { templateSetCode: "string", context: { 변수: 값 } }
채널: Push, Inbox, SMS, Alimtalk, Friendtalk (모두 단일 API로 발송)
응답: 채널별 sentCount + fail[].reachFailReason 상세 결과
userName: 자동 적용 (전달 불필요)
글자 수 가이드 (하드 제한이 아닌 QA 권장):
제목 13자, 본문 20자 (한글 기준) — UX/심사 관점의 가이드
구현 방식: 작성 UI에 글자수 카운터 + 초과 시 경고(노란색) 표시
서버에서는 "템플릿 context 변수 누락/치환 실패"만 하드 실패로 처리
QA 체크리스트에서 "가이드 초과 여부" 검수 항목으로 배치
6.2.4 토스 포인트 프로모션 (3-step key 기반):

POST .../promotion/execute-promotion/get-key → Base64 key 획득 (유효기간 1시간)
POST .../promotion/execute-promotion → { promotionCode, key, amount } → 포인트 지급
POST .../promotion/execution-result → SUCCESS/PENDING/FAILED 확인
중복 방지 필수: key 1회 사용 제한, 방어 로직 구현 필수
에러코드: 4100(미등록), 4109(비활성/예산소진), 4110(시스템오류→재시도), 4112(예산부족), 4113(중복key)
예산 관리: 80% 소진 시 이메일 알림, Console에서 충전
6.2.5 딥엔트리 — 앱 내 기능 바로가기 (웹에서 못 하던 것 #1):

왜 강력한가: 웹은 "즐겨찾기/푸시 딥링크"가 약한데, 토스는 미니앱 안에 바로가기 진입점을 공식 등록 가능
등록할 딥엔트리 3종:
quick-log: "오늘 행동 기록하기" → 대시보드의 Quick Log 폼으로 바로 진입
daily-coach: "오늘의 코칭 확인" → AI 코칭 결과 화면으로 진입
training-today: "오늘의 훈련 미션" → 훈련 아카데미 현재 스텝으로 진입
파라미터 프리필: 진입 시 ?type=barking&location=home 같은 쿼리로 폼 자동 채움
Console 등록: Toss Developers Console에서 앱 내 기능 등록 + 아이콘/설명 설정
AC: 딥엔트리 탭 → 해당 화면 1초 이내 진입, 파라미터 프리필 정상 동작
6.2.6 세그먼트 + Smart Message 리텐션 자동화 (웹에서 못 하던 것 #2):

왜 강력한가: 웹에서 가장 어려운 게 "정교한 타겟팅 + 자동 메시지 운영"인데, 토스는 세그먼트/스마트발송을 제품으로 제공
TailLog 맞춤 세그먼트 정의 (Console에서 설정):
inactive_3d: 3일 연속 행동 기록 미작성 유저
streak_6d: 6일 연속 기록 중 (7일 스트릭 1일 전)
behavior_spike: 특정 행동(짖음/공격성) 빈도가 전주 대비 2배 이상 급증
pre_pro_churn: AI 코칭 5회 사용 + PRO 미결제 (결제 직전 이탈)
new_d1/d3/d7: 온보딩 후 D+1, D+3, D+7 (드립 캠페인)
자동 메시지 매핑:
inactive_3d → "오늘 10초만 기록하면 코칭 정확도가 올라가요"
streak_6d → "7일 스트릭 1일 남음 → 포인트 보상이 기다려요"
behavior_spike → "짖음 빈도가 늘었어요. 맞춤 코칭을 확인해보세요"
pre_pro_churn → "PRO로 업그레이드하면 무제한 AI 코칭을 받을 수 있어요"
구현: 이벤트 로그 기반으로 세그먼트 자동 업데이트 → Smart Message 트리거
AC: 세그먼트 조건 충족 후 5분 이내 메시지 발송
6.2.7 공유 리워드 — 바이럴 추천 루프 (웹에서 못 하던 것 #3):

왜 강력한가: 웹 추천은 추적/보상/악용 방지가 어렵고 운영비 큼. 토스는 공유 리워드를 공식 기능으로 제공
TailLog 설계:
초대자: 고유 공유 링크 생성 (토스 공유 리워드 SDK)
피초대자: 링크 → 미니앱 진입 → 온보딩 → 첫 3일 기록 + 1회 AI 코칭 완료
조건 충족 시: 초대자 + 피초대자 모두 토스 포인트 보상 (예: 각 500P)
악용 방지: "첫 3일 기록 + 1회 코칭" 조건부 지급으로 허위 가입 차단
Console 설정: 공유 리워드 캠페인 등록, 예산 설정, 조건부 지급 규칙
S2S API: 조건 충족 확인 → 포인트 자동 지급 (grant-toss-points Edge Function 재활용)
AC: 공유 링크 → 피초대자 조건 충족 → 양측 포인트 지급 완료 (자동, 수동 개입 없음)
6.2.8 이벤트 분석 — 기록→코칭→결제 퍼널 (웹에서 못 하던 것 #4):

왜 강력한가: 웹도 GA/Amplitude로 가능하지만, 토스는 앱인토스 전용 분석 대시보드를 제공하여 "심사/운영/성장"에 바로 연결
TailLog 핵심 이벤트 (최소 셋):
onboarding_complete: 온보딩 설문 완료 시점
behavior_log_created: 행동 기록 생성 (quick_log vs detailed 구분)
ai_coach_requested: AI 코칭 요청 시점
ai_coach_completed: AI 코칭 응답 수신 (source: ai vs rule 구분)
iap_purchase_success: IAP 결제 성공 (product_type 구분)
training_step_completed: 훈련 스텝 완료
share_reward_sent: 공유 리워드 링크 발송
퍼널 정의: 온보딩 → 첫 기록 → 3일 연속 → AI 코칭 요청 → PRO 결제
Console 대시보드: 이벤트 로그 기반 DAU/WAU, 퍼널 전환율, 세그먼트별 리텐션
AC: 모든 핵심 이벤트가 토스 대시보드에 실시간 반영 (지연 < 5분)
6.2.9 트레이너 인증 마켓플레이스 (Phase 2-3, 웹에서 못 하던 것 #5):

왜 강력한가: 토스 인증(본인인증)을 활용하면 "검증된 전문 훈련사" 매칭 서비스가 가능
사용처:
검증된 훈련사 상담/코칭 매칭 (1:1 채팅 or 화상)
문제행동 심각 케이스(공격성 등) 전문 상담에서 최소한의 안전장치
토스 인증 연동: 훈련사 회원가입 시 본인인증 → ci 값으로 실명 확인
Phase 2-3에서 구현: v1에서는 AI 코칭만, v2에서 전문가 매칭 추가
비즈 모델: 상담 건당 수수료 or 훈련사 구독
6.2.10 인앱 광고 — 무료 티어 수익화 (Phase 2+, 웹에서 못 하던 것 #6):

왜 강력한가: 토스 인앱 광고는 토스 생태계 내 자연스러운 광고 포맷 제공
추천 위치: 무료 티어 대시보드 하단 (PRO 업그레이드 CTA와 경쟁하지 않는 구간)
주의: UX/QA 심사 리스크 있으므로 Phase 2 이후 도입 권장
광고 + PRO 전략: "광고 제거"를 PRO 혜택에 포함 → 전환율 향상
섹션 7: API 계약
표준 응답 형식: { success, data, error, meta }
인증 흐름 (2계층):
FE → Supabase Edge Function: Toss OAuth 코드 전달 (mTLS는 Edge Function이 처리)
FE → FastAPI BE: Authorization: Bearer {supabase_jwt} (기존 방식 유지)
Edge Function → Toss S2S: mTLS + Bearer {toss_access_token} + x-toss-user-key
Toss S2S BaseURL: https://apps-in-toss-api.toss.im
신규 Edge Function 엔드포인트:
login-with-toss: Toss OAuth → Supabase Auth 브릿지
verify-iap-order: IAP 주문 상태 검증
send-smart-message: Smart Message 발송
grant-toss-points: 토스 포인트 지급
신규 BE 엔드포인트: /webhook/toss-disconnect (연결해제 콜백), /subscription/status
유지 엔드포인트: dogs, behavior-logs, coaching, training, analytics (20+ 엔드포인트 — Supabase JWT 인증 그대로)
Edge Function 4종 공통 운영 정책 (절대 규칙):

정책	설명	적용 대상
멱등키(Idempotency-Key)	요청마다 고유 키 생성 → DB에 요청 로그 저장 → 동일 키 2회 호출 시 첫 결과 리턴	verify-iap-order, grant-toss-points, send-smart-message
재시도	5xx/타임아웃만 재시도 (최대 2회, 지수 백오프 1s→2s). 4xx는 재시도 안함	전 함수
타임아웃	Toss S2S 호출 3초, 전체 Edge Function 실행 5초	전 함수
서킷브레이커	연속 5회 실패 시 30초간 빠른 실패(fast-fail) 반환 → 자동 복구 시도	verify-iap-order, grant-toss-points
포인트 key는 1회성이므로 "우리 쪽 멱등" 특히 중요 (에러 4113 방어)
멱등 로그 테이블: edge_function_requests(idempotency_key UNIQUE, function_name, status, response_json, created_at)
섹션 8: 테스트 / 검증 전략
Unit: pytest (BE 80%+), Vitest (FE 75%+)
Integration: Toss Auth 모의, IAP 주문 상태 6단계 시뮬레이션
E2E: Toss Sandbox App (필수), QR 테스트 (intoss-private://)
Toss QA 심사: UX Writing 가이드 준수, 다크 패턴 방지, 성능 기준 충족
성능: WebView 60fps 스크롤, API p95 < 300ms, 차트 렌더링 < 500ms
섹션 9: CI/CD & 배포 전략
Git: trunk-based + feature branch, Conventional Commits
CI: GitHub Actions (build → lint → typecheck → test → e2e)
FE 배포: 토스 WebView 번들 (Vercel 아님)
BE 배포: Fly.io + mTLS 인증서 볼륨 마운트
토스 론칭 파이프라인: 개발 → Sandbox → QR 테스트 → QA 심사 제출 → 승인 → 론칭
섹션 10: 보안 & 개인정보
mTLS: 인증서를 Base64 인코딩 → Supabase Edge Function secrets에 저장 (TOSS_CLIENT_CERT_BASE64, TOSS_CLIENT_KEY_BASE64)
Edge Function에서 Deno.createHttpClient({ cert, key }) 로 mTLS 클라이언트 생성
FastAPI 백엔드에는 mTLS 불필요 (Supabase JWT만 검증)
인증 보안:
Toss AccessToken 유효기간: 1시간, RefreshToken: 14일
Supabase 세션 토큰으로 변환하여 기존 RLS 인프라 활용
PBKDF2 deterministic password: SUPER_SECRET_PEPPER 필수 (유출 시 전체 계정 위험)
PII 암호화: Toss 프로필 개인정보는 AES-256-GCM 암호화 상태로 전달
복호화 키: 이메일로 별도 전달, AAD 파라미터 + IV(12바이트) 추출 필요
사용 가능 필드: name, phone, birthday(yyyyMMdd), ci, gender, nationality, email(미인증)
비암호화 필드: userKey(숫자), scope, agreedTerms
Edge Function 로그 PII 정책 (절대 규칙):
로그 금지 필드: phone, ci, birthday, email, name, gender, nationality, accessToken, refreshToken
로그 허용 필드: requestId, userKey(해시), toss_status, grant_status, latency_ms, error_code
마스킹 규칙: 전화번호 → 010****1234, 이메일 → a***@example.com
PII 복호화 키 관리 (운영 리스크 완화):
AES-256-GCM 복호화 키는 Supabase Edge Function secrets에 저장
키 회전: Toss에서 신규 키 발급 시 즉시 교체 (기존 키 7일 유예 후 삭제)
접근 통제: 복호화는 login-with-toss Edge Function에서만 실행, 다른 함수/BE에서 접근 불가
원칙: "복호화는 필요한 순간에만" — 복호화된 값은 메모리에서만 처리, DB 저장 시 재암호화 or 저장 안함
verify_jwt 함수별 분리 (보안사고 방지):
login-with-toss: verify_jwt = false (유일한 예외 — 로그인 전 JWT 없으므로)
verify-iap-order: verify_jwt = true + Supabase JWT 유효성 검증
send-smart-message: verify_jwt = true + 관리자 Role 체크
grant-toss-points: verify_jwt = true + 관리자 Role 체크
"예외는 로그인 함수 1개뿐" — 이 규칙을 섹션 16 Agent 프롬프트에도 명시
데이터 프라이버시: nullable 프로필 처리 (사용자 동의 기반), GDPR/PIPA 준수
시크릿 관리: Edge Function secrets + Fly.io secrets + Supabase secrets
네트워크: Toss IP 화이트리스트, TLS 1.2+, per-user/per-IP 레이트 리밋
섹션 11: 관찰성
구조화 JSON 로깅, Sentry 에러 추적 (토스 미니앱 컨텍스트 태그)
메트릭: API 응답시간, 오류율, AI 코칭 지연, IAP 전환율
헬스체크: /health (DB + Toss S2S 연결)
알림: 에러율 급증, 지연 증가, mTLS 인증서 만료 30일 전 경고
섹션 12: 성능 & 확장성
FE: WebView 번들 < 500KB gzipped, 라우트별 코드 스플리팅
BE: AI 캐시-우선 전략 유지, DB 인덱스 최적화, 커넥션 풀링
레이트 리밋: AI 코칭 10회/시간(무료), 50회/시간(PRO)
섹션 13: 운영 / 유지보수
Supabase 자동 백업, Alembic 마이그레이션 (up/down)
mTLS 인증서 갱신 운영 런북 (만료 30일 전 알림)
PII 복호화 키 회전 절차 (Toss 키 교체 → Edge Function secrets 업데이트 → 7일 유예)
OpenAPI 자동 생성 API 문서
CS/관리자 운영 도구:
사용자 연결 끊기: remove-by-user-key API (CS 대응)
IAP 수동 재처리: grant_status = RETRY_QUEUED → 재처리 큐 수동 실행
포인트 지급 이력 조회: edge_function_requests 테이블 기반
토스 프로모션 예산 잔액 모니터링 (Console + 80% 알림)
섹션 14: 위험관리
리스크	확률	영향	완화 조치
Toss QA 심사 반려	중	높음	아래 사전 점검 체크리스트 적용 (부록 C와 중복 배치)
mTLS 인증서 장애	낮음	치명적	갱신 30일 전 알림, 모니터링, 인증서 2벌 보관
TDS 컴포넌트 제약	중	중간	필요 컴포넌트 사전 검증, 커스텀 fallback 준비
WebView 차트 성능	중	중간	경량 차트 라이브러리, lazy load
IAP 결제성공+지급실패	높음	높음	toss_status/grant_status 2축 분리 + 재처리 큐 + getPendingOrders 복구
IAP 환불 후 상품 미회수	중	중간	연결해제/환불 웹훅 → grant_status=REVOKED + 유예기간
포인트 중복 지급	중	높음	멱등키 + key 1회 사용 + 4113 방어 로직
Edge Function 연쇄 장애	낮음	높음	서킷브레이커(30초 fast-fail) + 알림
PII 복호화 키 유출	낮음	치명적	KMS 저장, 접근 Role 제한, 키 회전 절차
getPendingOrders 미지원 기기	중	중간	안드 5.234.0 / iOS 5.231.0 미만 → 복구 스킵 + CS 안내
QA 반려 사전 점검 체크리스트 (Top 반려 사유 예방):

 UX Writing 가이드 전체 텍스트 검수 완료
 다크 패턴 없음 (조작적 긴급감, 숨은 비용, 불명확 CTA 없음)
 미니앱 브랜딩 가이드 준수 (아이콘, 설명문)
 접근성 가이드 (스크린리더, 키보드 탐색)
 IAP 상품 설명 정확, 환불 정책 고지 위치 확인
 Smart Message 글자 수 가이드 준수 확인
 Sandbox + QR 테스트 스크린샷 첨부
 에러 상태 전체 사용자 친화적 메시지 확인
섹션 15: 산출물 & 수락 기준
TypeScript strict zero errors, 테스트 통과, CI green
TDS 전용 (Tailwind/Radix 없음), mTLS 스테이징 검증
Toss Login/IAP/Smart Message 전체 플로우 테스트
UX Writing 준수, 성능 SLO 충족, Toss QA 승인
섹션 16: Agent 운영 프롬프트
절대 규칙: @apps-in-toss/web-framework + TDS only, Toss Login only, mTLS 필수
개발 프로세스: 파일 읽기 선행, 코드 재사용, BE↔FE 동기화
생성 순서: types → api → hooks → components → pages → backend → tests
토스 전용 규칙: Smart Message 글자 수, IAP 복구 로직, nullable 프로필 처리
섹션 17: 빠른 시작 체크리스트
Node 20.x, Python 3.12+, Toss Console 계정, mTLS 인증서
MCP 서버 설정, IAP 테스트 상품 등록, Sandbox App 설치
부록 A: 마케팅 & 프로모션 전략
토스 포인트 프로모션 (S2S API, 3-step key 기반):
첫 행동 기록 보상, 7일 연속 스트릭, 추천 보상
예산 관리: Console에서 설정, 80% 소진 알림, 사업자 지갑 충전
에러 처리: 4109(예산소진) → 캠페인 자동 중단, 4110 → 재시도
Smart Message 캠페인 (Console + API 혼합):
기능 메시지 (API): 훈련 리마인더, 기록 알림 (template + context 변수)
프로모션 메시지 (Console): 온보딩 드립 (D+1,3,7), 재활성화, PRO 유도
세그먼트: 토스 Console에서 타겟 세그먼트 관리
채널: Push + Inbox + SMS + Alimtalk + Friendtalk (단일 API, 채널별 결과 추적)
공유 리워드: 친구 초대 → 포인트 보상 (Console 설정 + S2S API)
분석: 토스 대시보드 (이벤트 로그 기반 사용자 행동 추적)
성장 가이드: 사용자 유입 → 리텐션 → 바이럴 공유 → 대시보드 인사이트
가격 전략:
PRO Monthly: 4,900원 (무제한 AI코칭, 고급 분석, PDF)
AI 토큰팩 10개: 1,900원 (소모품)
AI 토큰팩 30개: 4,900원 (소모품)
무료 티어: 월 3회 AI코칭, 기본 분석, 무제한 행동기록
수익화 옵션 비교:
IAP: PRO 구독 + AI 토큰팩 (주력)
토스페이: 실물 상품 판매 시 (현재 해당 없음)
인앱 광고: 무료 티어 사용자 대상 (Phase 2 이후 검토)
부록 B: AI 코딩 개발 가이드라인 (CLAUDE.md 리팩토링)
B.1 MCP 서버 설정 (AI 개발 도구):

Windows: scoop bucket add toss https://github.com/toss/scoop-bucket.git && scoop install ax
macOS: brew tap toss/tap && brew install ax
Claude Code: claude mcp add --transport stdio apps-in-toss ax mcp start
Cursor: .cursor/mcp.json에 { "mcpServers": { "apps-in-toss": { "command": "ax", "args": ["mcp", "start"] } } }
docs-search 도구: llms-full.txt 기반 키워드 + 시맨틱 유사도 검색
B.2 LLM 참조 문서 URL:

용도	URL
핵심 문서	https://developers-apps-in-toss.toss.im/llms.txt
전체 문서	https://developers-apps-in-toss.toss.im/llms-full.txt
예제 코드	https://developers-apps-in-toss.toss.im/tutorials/examples.md
TDS WebView	https://tossmini-docs.toss.im/tds-mobile/llms-full.txt
TDS React Native	https://tossmini-docs.toss.im/tds-react-native/llms-full.txt
B.3 스킬 설치:

Codex: $skill-installer → repo toss/apps-in-toss-skills path apps-in-toss
Claude Code 플러그인: /plugin marketplace add toss/apps-in-toss-skills
Cursor @docs: @docs [Apps In Toss 기능 질문] — 규제 기반 코드에 높은 정확도
B.4 기존 CLAUDE.md 핵심 원칙 계승:

파일 읽기 선행, 폴더별 CLAUDE.md 우선, 파일 헤더 요약 주석
코드 재사용 우선, BE-FE 타입 동기화 필수
3-Layer Architecture: Router → Service → Repository
B.5 토스 전용 AI 코딩 규칙:

TDS 컴포넌트만 사용 (Tailwind/Radix/Framer Motion 임포트 금지)
Smart Message 글자 수 → UI 카운터+경고, 서버는 context 치환 실패만 하드 실패
IAP 코드에 반드시 getPendingOrders() 복구 로직 포함 + toss_status/grant_status 2축 관리
IAP SDK 버전 체크: typeof getPendingOrders === 'undefined' → 복구 스킵 + CS 안내
Toss 프로필 nullable 필드 처리 (name, phone, email 모두 null 가능)
Edge Function verify_jwt 분리: login-with-toss만 false (유일한 예외), 나머지 전부 true
mTLS 인증서를 코드에 하드코딩하지 않음 (반드시 secrets)
Edge Function에서 PII 로그 금지 (phone, ci, birthday, email, name, token 등)
모든 Edge Function에 멱등키(Idempotency-Key) 구현 필수 (grant-points, verify-iap 특히)
B.6 코드 품질 게이트:

TypeScript strict mode, zero errors, no any (unknown + type guards)
Pydantic (BE) + TypeScript interfaces (FE) 동기화
모든 API 응답 타입 정의, 모든 Edge Function 에러 핸들링
부록 C: Toss QA 심사 체크리스트
UX Writing 가이드 준수 (https://developers-apps-in-toss.toss.im/design/ux-writing.html)
다크 패턴 방지 정책 준수 (https://developers-apps-in-toss.toss.im/design/dark-pattern.html 참조)
미니앱 브랜딩 가이드 준수
접근성 가이드 준수
AI 콘텐츠 정책 (코칭 응답의 의학적 조언 면책)
IAP 상품 설명 정확성, 환불 정책 명시
Sandbox/QR 테스트 완료 (intoss-private://)
WebView 성능 기준 충족 (60fps 스크롤, 앱 진입 2초 이내)
mTLS 연결 검증, 에러 상태 사용자 친화적 처리
부록 D: 추가 스킬화 필요 항목 (토스 개발자 사이트 기반)
현재 SKILL.md에 미반영된 토스 개발자 사이트 기능 중, 명세서 구현에 필요한 항목들:

토스 기능	스킬화 필요도	명세서 반영 섹션	참조 URL
세그먼트 (사용자 타겟팅)	높음	부록 A 마케팅	/marketing/segment
공유 리워드 (바이럴)	중간	부록 A 마케팅	/share-reward/
분석 대시보드 (이벤트 로그)	높음	섹션 11 관찰성	/analytics/
Firebase 연동 (FCM, Crashlytics)	중간	섹션 11 관찰성	/development/firebase
Sentry 모니터링	높음	섹션 11 관찰성	/development/sentry
토스 인증 (본인인증)	낮음 (v1 불필요)	-	/toss-cert/
인앱 광고	낮음 (Phase 2)	-	/ad/
토스페이	낮음 (실물상품 시)	-	/tosspay/
게임 프로필/리더보드	없음	-	/game-profile/
해상도 가이드	중간	섹션 3 디자인	/design/resolution
OG 이미지 가이드	중간	부록 A 마케팅	/marketing/og-image
권장 스킬화 우선순위:

세그먼트 + 분석 (마케팅 타겟팅 핵심)
Sentry 연동 (운영 모니터링)
공유 리워드 (바이럴 성장)
Firebase 연동 (Push 보조 채널)
실행 계획 (페이즈별)
Phase 0: 셋업 & 인프라 (1-2주)
Toss Developers Console 앱 등록
mTLS 인증서 발급 → Base64 인코딩 → Supabase secrets 저장
@apps-in-toss/web-framework 프로젝트 스캐폴드
MCP 서버 설정 (scoop install ax → claude mcp add)
CI/CD 파이프라인 구성
IAP 테스트 상품 등록 + Smart Message 템플릿 생성
토스 포인트 테스트 프로모션 코드로 get-key → execute → result 1회 성공 확인 (스크린샷/로그 첨부) — 실서비스 전 필수 선행 조건
Phase 1: 인증 & 데이터 레이어 (2-3주)
Supabase Edge Function login-with-toss 구현 (핵심):
Deno에서 mTLS 클라이언트 생성 (TOSS_CLIENT_CERT_BASE64 + TOSS_CLIENT_KEY_BASE64)
Toss generate-token + login-me API 호출
PBKDF2 deterministic password → Supabase Auth 유저 생성/로그인
public.users 테이블에 toss_user_key 삽입
supabase/config.toml에 verify_jwt = false 설정
FE에서 appLogin() → Edge Function 호출 → supabase.auth.setSession() 구현
DB 마이그레이션: users 테이블에 toss_user_key TEXT UNIQUE NOT NULL + RLS 정책
FastAPI: 기존 Supabase JWT 검증 유지 (변경 최소화)
Toss 연결해제 콜백 웹훅 엔드포인트 구현 (UNLINK/WITHDRAWAL_TERMS/WITHDRAWAL_TOSS 분기 처리)
토큰 갱신 전략 구현: Supabase refresh로 앱 세션 유지 + Toss refresh-token API 래퍼 (프로필 재조회 시)
Phase 2: UI → TDS 마이그레이션 (3-5주)
레이아웃 컴포넌트 (Top, BottomCTA, PageLayout)
온보딩 설문 → TDS
대시보드 → TDS (ListRow, Badge, 차트)
행동 기록 폼 → TDS (TextField, useBottomSheet)
분석 페이지 → TDS (차트, 타임라인)
AI 코칭 인터페이스 → TDS (Bubble, ListRow)
훈련 아카데미 → TDS
반려견 프로필, 설정 → TDS
Phase 3: 결제 & 수익화 (5-6주)
IAP 상품 목록 UI + 구매 플로우 (SDK 1.2.2+)
Edge Function verify-iap-order: mTLS로 주문 상태 검증
completeProductGrant() + 앱 시작 시 getPendingOrders() 복구 로직
Sandbox 필수 테스트 3가지 (성공, 성공+서버실패, 에러)
BE 구독 상태 관리 + toss_orders 테이블
Phase 4: 알림 & 마케팅 (6-7주)
Edge Function send-smart-message: mTLS로 Smart Message API 호출
Edge Function grant-toss-points: mTLS로 포인트 3-step 지급
템플릿 코드 등록 (Console) + context 변수 매핑
세그먼트 설정 (Console) + 프로모션 캠페인
Sentry 연동 (토스 미니앱 컨텍스트 태깅)
Phase 5: 테스트 & QA 심사 (7-9주)
단위/통합/E2E 테스트 완성
Sandbox App + QR 테스트
UX Writing 준수 검토
Toss QA 심사 제출 (2-3 영업일)
Phase 6: 론칭 & 운영 (9-10주)
QA 승인 후 프로덕션 배포
모니터링 + Smart Message 캠페인 활성화
론칭 후 72시간 집중 모니터링
수정/생성 대상 핵심 파일
파일	역할
tosstaillog/CLAUDE.md	AI 코딩 가이드라인 → 리팩토링하여 섹션 16 + 부록 B에 반영
tosstaillog/prdtamplate.md	PRD 템플릿 → 명세서 구조의 기반
tosstaillog/skills/toss_apps/SKILL.md	토스 플랫폼 기술 레퍼런스 (Section 1-8) → 모든 기술 섹션에 반영
Taillog/DogCoach/Frontend/	기존 FE 코드 → TDS 마이그레이션 참조
Taillog/DogCoach/Backend/	기존 BE 코드 → Edge Function 분리 + FastAPI 유지 참조
산출물: tosstaillog/PRD-TailLog-Toss.md	마스터 개발명세서 (신규 생성)
추가 스킬화 작업 (SKILL.md 보강)
현재 SKILL.md에 아직 없지만 개발자 사이트에서 확인된 핵심 정보를 스킬로 추가:

Toss Login 상세 — OAuth2 full flow (generate-token, login-me, refresh-token, logout, 연결해제 콜백, PII 복호화 AES-256-GCM)
Toss IAP 상세 — SDK 메서드 5개, 주문 상태 6가지, Sandbox 테스트 3시나리오, 버전 요구사항
Smart Message 상세 — 5채널 (Push/Inbox/SMS/Alimtalk/Friendtalk), 템플릿+context, 응답 구조
토스 포인트 상세 — 3-step key 기반, 에러코드 5종, 중복방지, 예산관리
세그먼트/분석 — Console 타겟팅, 이벤트 로그 대시보드
Sentry/Firebase 연동 — 모니터링 통합 패턴
검증 방법
명세서 완성도: PRD 템플릿 17개 섹션 + 부록 4개 (A~D) 모두 작성 확인
기술 정합성: SKILL.md Section 1-8 (특히 Section 8 Toss+Supabase 패턴)의 모든 요구사항이 명세서에 반영됐는지 확인
기존 기능 커버리지: DogCoach의 모든 기능(14개 테이블, 20+ API, 10개 페이지)이 마이그레이션 맵에 포함됐는지 확인
CLAUDE.md 가이드라인: 기존 개발 원칙이 토스 맥락으로 확장/리팩토링됐는지 확인
Toss S2S API 정합성: Login, IAP, Smart Message, Points 각 API의 엔드포인트/파라미터/에러코드가 명세서에 정확히 반영됐는지
Edge Function 아키텍처: mTLS 처리가 모두 Supabase Edge Function으로 분리됐는지 (FastAPI에 mTLS 코드 없음 확인)
MCP 서버 동작: ax mcp start → docs-search 도구로 TDS 컴포넌트, API 레퍼런스 검색 가능 확인