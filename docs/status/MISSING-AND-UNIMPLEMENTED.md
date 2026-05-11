# TaillogToss 누락 플랜 + 미구현 목록

> 작성일: 2026-02-28 | 최종 업데이트: 2026-05-11 | 기준: 수익화 재설계 반영 + 실기기 QA + 사진 권한 모드 분리

## 0. 수익화 배치 확정 대기 (Deferred — 모든 기능 완료 후 결정)

> **결정 원칙**: 광고 위치 및 Pro 전용 기능 목록은 나머지 기능 개발이 모두 완료된 후 최종 확정한다.
> 확정 전까지 현재 구조(아래)를 유지. 변경은 1-3줄 수준.

### 현재 수익화 구조 (2026-04-23 기준)

| 항목 | 현재 상태 | 결정 필요 여부 |
|------|----------|--------------|
| 코칭 6블록 | 전부 공개 (Pro 잠금 없음) | 유지 or 일부 재잠금 — **미확정** |
| 광고 위치 | R3 — `CoachingDetailContent` 상단 (`!isPro`) | 최종 위치 — **미확정** |
| Pro 혜택 | 광고 제거 + `/coaching/insights` + 일일 10회 | 추가 혜택 목록 — **미확정** |
| 코칭 히스토리 제한 | 무제한 (무료/Pro 동일) | 무료 3개 제한 검토 — **미확정** |
| 분석 기간 제한 | 없음 | 무료 7일 / Pro 30일 검토 — **미확정** |

### 광고 집행 전 필수 선행 작업

아래가 완료되어야 광고 배치 확정 가능:
1. ✅ `useRewardedAd.ts` — mock Promise → 이벤트 콜백 전환 (`AD-001`)
2. ✅ 콘솔 AdGroup ID 발급 및 live ID 7종 코드 fallback 반영
3. `AIT-ADS-SDK-REFERENCE.md §7` 체크리스트 이행: 새 `.ait` 업로드 후 실노출 최종 확인

레퍼런스: `docs/ref/AIT-ADS-SDK-REFERENCE.md` (광고), `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md §5` (IAP)

---

## 1. PRD 미구현 기능 (Phase 2+ Deferred)

### 1.1 리텐션 자동화 (PRD 9.7)

| 세그먼트 | 조건 | 자동 메시지 | 상태 |
|---------|------|----------|------|
| `inactive_3d` | 3일 연속 미기록 | "오늘 10초만 기록..." | 미구현 |
| `streak_6d` | 6일 연속 기록 중 | "7일 스트릭 1일 남음..." | 미구현 |
| `behavior_spike` | 행동 빈도 2배↑ | "짖음 빈도 증가..." | 미구현 |
| `pre_pro_churn` | AI코칭 5회+PRO미결제 | "PRO 업그레이드..." | 미구현 |
| `new_d1/d3/d7` | 온보딩 후 D+1,3,7 | Drip campaign | 미구현 |

필요: 세그먼트 계산 백엔드, 스트릭 추적, 이상 탐지, 스케줄러, Smart Message 트리거

### 1.2 바이럴 공유 보상 (PRD 9.8)

- `share_token` 고유 링크 생성
- `referral_link` 추적 (users.referrer_user_id 컬럼 없음)
- 초대 조건 검증: "첫 3일 기록 + 1회 AI 코칭"
- 조건 충족 시 포인트 자동 지급
- 중복 보상 방지 (user_referrals 테이블)
- FE 공유 링크 UI

### 1.3 트레이너 마켓플레이스 (PRD 9.9)

- `trainers` 테이블 (certification_status, verified_at, rating, hourly_rate)
- Toss 본인인증(KYC) 연동
- 훈련사 매칭 알고리즘
- 1:1 상담 예약 시스템
- 결제 분배 (수수료 관리, 정산)

### 1.4 Pepper 회전 프로토콜 (PRD 9.1)

- `pepper_version` 필드 존재 (auth.ts)
- 회전 스케줄러 미구현
- 이전 pepper로 암호화된 PII 마이그레이션 로직 미구현

### 1.5 재연결 시나리오 (PRD 9.1 L-2)

- Toss 연동 해제 후 재연결 시 기존 데이터 복구 로직 미정의
- `toss-disconnect` → 재로그인 시 `users.status: inactive → active` 복구 필요

---

## 2. 백엔드 구현 상태

**현재 상태**: ✅ BE-P1~P8 전체 완료 + INFRA-1 DB 마이그레이션 적용 (2026-02-28)

| Phase | 범위 | 상태 | 핵심 내용 |
|-------|------|------|----------|
| BE-P1 | 스캐폴딩 + config | ✅ 완료 | FastAPI 앱, requirements.txt, Dockerfile, Alembic |
| BE-P2 | SQL 마이그레이션 | ✅ 완료 | Supabase MCP로 적용 (26→38테이블 + RLS 30+정책) |
| BE-P3 | 모델 + 스키마 | ✅ 완료 | SQLAlchemy 27모델 + 22 enum (models.py 단일 파일) |
| BE-P4 | Dogs + Log CRUD | ✅ 완료 | auth, onboarding, dogs, log, dashboard (5 feature 모듈) |
| BE-P5 | AI 코칭 엔진 | ✅ 완료 | 6블록 생성 + 예산 게이팅 + 룰 폴백 |
| BE-P6 | Training + Settings | ✅ 완료 | training, settings, subscription, notification |
| BE-P7 | B2B Org + Report | ✅ 완료 | org 14 endpoints, report 9 endpoints |
| BE-P8 | 테스트 | ✅ 완료 | pytest 39 tests 전체 통과 |

**INFRA-1**: Supabase MCP로 DB 마이그레이션 적용 완료
- `20260228015912_b2c_column_gaps_and_enum_migration` — user_role/user_status enum 마이그레이션 + 8개 테이블 컬럼 추가 + toss_orders/edge_function_requests 신규
- `20260228020042_b2b_tables_and_extensions` — B2B 10개 테이블 + ALTER 3개 + RLS 헬퍼 3함수 + PII 함수 + RLS 30+정책

**남은 백엔드 작업**:
- INFRA-2: Edge Function Secrets 등록 + 실연동 검증 (수동) — 7종 배포 + invoke/auth-policy smoke 검증 완료(2026-02-28, MCP+HTTP). 잔여: happy-path payload 검증, secrets drift 점검
- INFRA-3: 토스 콘솔 등록 + mTLS 인증서 (수동)
- FE→BE 연결: `src/lib/api/backend.ts` 추가 완료. 도메인별 전환은 `coaching/org dogs/log/report/settings/subscription/notification/dashboard/training` 완료

---

## 3. Feature Parity Matrix 잔여 TODO

| Parity ID | 잔여 TODO |
|-----------|----------|
| AUTH-001 | 실패 케이스 400 증적 추가 (실기기) |
| APP-001 | 실기기 라우팅 완전 검증 |
| UI-001 | ~~토큰화/Lottie/상태UI/UX라이팅~~ → 완료. 실기기 비주얼 QA (23화면) |
| LOG-001 | FastAPI 로그 API 실기기 E2E 증적 |
| AI-001 | ~~Backend/ 미존재~~ → BE-P5 완료. FastAPI 코칭 API backend-first 전환 완료, 실연동 E2E 증적 필요 |
| IAP-001 | 3시나리오 패널/실패/복구 증적 확보. false-success/loading 잔여 버그 수정 완료. 새 AIT 업로드 후 성공 테스트 실패 피드백 + 버튼 복귀 확인. Edge/proxy 404 원인 정리 잔여 |
| MSG-001 | `TAILLOG_BEHAVIOR_REMIND` HTTP 200 + noti_history success=true 확보. 추가 캠페인 등록 잔여 |
| AD-001 | 실 Ad Group ID 교체 + 상수 fallback 완료. 새 AIT 업로드 후 mock fallback 제거 + B1 real SDK `ad_error` 확인. render success/no-fill 사유 세부값 확보 잔여 |
| B2B-001 | 40마리 FlatList 성능, 공유 링크 실기기, B2C 회귀 테스트, verify_parent_phone_last4 RPC |

---

## 4. Mock/Placeholder 구현 목록

> 공식 API 레퍼런스: `docs/ref/AIT-ADS-SDK-REFERENCE.md` (Ads), `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md` (IAP/MSG/Points)
> SDK 마이그레이션: `docs/ref/AIT-SDK-2X-MIGRATION.md` | 퍼블리싱: `docs/ref/AIT-PUBLISHING-READINESS.md`

| 항목 | 위치 | 현재 | 전환 필요 |
|------|------|------|----------|
| Ads SDK | `src/lib/ads/config.ts` | ✅ real FullScreen SDK wrapper + live Ad Group ID 7종 상수 fallback 적용. 새 AIT `019e00c2...` test ad id 0개, B1 real SDK `ad_error` 확인 | render success 또는 no-fill 사유 세부값 확보 |
| IAP | `src/lib/api/iap.ts` | ✅ 실 SDK `createOneTimePurchaseOrder`/`getPendingOrders`/`completeProductGrant` 연결. 서버 grant 실패 시 `GRANT_FAILED` 처리 | 새 AIT 업로드 후 성공 UI 최종 재검증 |
| generate-report | `supabase/functions/generate-report/` | 배포 완료(v3), mock/real 스위치(`REPORT_AI_MODE`) + staff role guard | OpenAI 실키 검증 (BE-P7) |
| verify-iap-order | `supabase/functions/verify-iap-order/` | real mTLS | Sandbox order 검증 404 원인 확인 및 성공 경로 재검증 |
| send-smart-message | `supabase/functions/send-smart-message/` | ✅ real mTLS + `toss_user_key` 해석 후 실발송 200 확인 | 추가 캠페인 등록/회귀 발송 |
| grant-toss-points | `supabase/functions/grant-toss-points/` | mock mTLS | real mTLS 전환 |
| IAP 복원 | `src/lib/api/iap.ts`, `src/lib/hooks/useSubscription.ts` | ✅ SDK `getPendingOrders()` 우선 + DB fallback | 서버 검증 성공 order로 복원 완료 증적 추가 |

### 4.1 2026-05-05 실기기 QA 반영

| 항목 | 위치 | 확인/조치 | 잔여 |
|------|------|-----------|------|
| Subscription API 500 | `Backend/app/features/subscription/router.py` | `next_billing_date`/`created_at`/`updated_at` 응답 타입을 실제 `date/datetime`과 맞춰 수정. 실기기 `/settings/subscription` 200 확인 | 없음 |
| IAP Jest harness | `src/lib/api/__tests__/iap.test.ts` | `@apps-in-toss/native-modules` mock 추가. `npm test` 전체 통과 | 실기기 Sandbox 결제/복구/실패 증적 필요 |
| Edge remote drift | `supabase/functions/{send-smart-message,grant-toss-points,generate-report}` | Supabase CLI로 배포. `supabase functions list` 기준 9개 ACTIVE 확인 | `REPORT_AI_MODE=real`, mTLS real, Smart Message 승인 후 happy-path 검증 |
| Root/404 리다이렉트 | `src/pages/index.tsx`, `src/pages/_404.tsx` | 인증/온보딩 상태 기반 리다이렉트로 대기 화면 고착 수정 | 딥링크 전체 route sweep 추가 권장 |
| 텍스트 이모지 아이콘 | onboarding stage1/2/3/notification/survey-result, coaching result, training detail, dashboard/dog common avatars, subscription | 기존 `iconSources.ts` custom asset으로 1차 교체. Stage1/2/3 칩, notification hero, survey-result/header, legacy survey profile/container/deep labels, `/training/detail` widgets/sheets, coaching trend/locked/error/empty icons, common empty/error/speech fallback, dashboard/dog avatar fallback, subscription PRO features 교체 완료 | DevMenu 개발 표식, 보호자 리포트 reaction emoji, 별점/닫기/체크 같은 의미형 텍스트 컨트롤은 의도 잔여. 전용 imagegen icon set 적용 시 2차 정리 |
| DevMenu FAB 가림 | `src/lib/devTools.ts`, `src/_app.tsx`, `src/components/shared/DevMenu.tsx` | ✅ `EXPO_PUBLIC_SHOW_DEV_MENU=true`일 때만 DevMenu/플랜 override/가드 bypass/DEV IAP bypass 활성. 새 AIT에서 `isDevToolsEnabled() -> return false` 확인 | 업로드 후 FAB 미노출 실기기 확인 |
| AIT standalone host error | `src/_app.tsx`, `granite.config.ts`, `taillog-app.ait` | ⚠️ `brand.icon` 로컬 경로/data URI 후보와 `Granite.registerApp` 직접 사용 후보 소거 완료. 콘솔 HTTPS 로고 URL + 공식 `AppsInToss.registerApp` 적용 후 API deploy `019e01b9-3c4c-7677-b6b9-d80529a2d868` 성공, 번들 스캔/문법검사/tsc 통과. 그러나 Metro-off standalone에서 JS 진입 전 host error가 계속 재현됨 | Toss 개발자 커뮤니티/지원에 deploymentId `019e01b9...`, CLI URL, no-JS-marker logcat, UI error text를 전달해 test host/deployment 실행, 샌드박스앱 버전, QR 실행 경로 차이를 확인 요청 |
| Dog Profile route crash | `src/pages/dog/profile.tsx` | ✅ `dogEnv.triggers` live shape 정규화 완료. DEV_LOCAL 재진입 PASS | 회귀 테스트 유지 |
| Shared report dynamic route | `src/pages/report/[shareToken].tsx` | ✅ React Navigation raw params로 bracket/colon strict mismatch 회피. 잘못된 토큰은 정상 empty/error state 표시 | 실제 share token happy-path 검증 필요 |
| Onboarding direct-entry fallback | `src/pages/onboarding/stage2-form.tsx`, `src/pages/onboarding/stage3-form.tsx` | ✅ `activeDog` fallback + dog id 부재 submit guard 추가. 단독 딥링크 `undefined` 문구 제거 | 신규 유저 dog 없음 상태 UX 확인 필요 |
| Settings AI persona | `src/pages/settings/index.tsx`, `Backend/app/features/coaching/*` | ✅ DB 저장 확인 후 backend coaching prompt/ask-coach 컨텍스트에 `ai_persona` 반영 | 실제 OpenAI 응답 톤 차이 샘플 증적 추가 권장 |
| IAP/Ads/Smart Message 실기기 QA | `src/lib/api/iap.ts`, `src/lib/ads/config.ts`, `supabase/functions/send-smart-message/index.ts` | ✅ IAP 3시나리오 패널 진입, 실패/복구 UI 증적, false-success/loading 수정 및 새 AIT 버튼 복귀 확인. ✅ Smart Message 200 + noti_history success. ✅ Ads live ID 상수 fallback + 새 AIT test id 0개 + B1 real SDK `ad_error` | Ads render success/no-fill 사유 세부값 + IAP Edge/proxy 404 원인 정리 |

---

## 5. Edge Function 배포/호출 상태

| Function | 배포 | verify_jwt | 실연동 |
|----------|------|-----------|--------|
| login-with-toss | v13 ✅ (ACTIVE) | false | ✅ Sandbox 200 + 실패 400 증적 / stale code 502(`invalid_grant`) 이력 |
| legal | ✅ | false | ✅ URL 접근 + invoke smoke(GET 200 / POST 405) |
| toss-disconnect | ✅ | false | ✅ invoke smoke(GET/POST 401, 인증정책 동작) / 콘솔 콜백 대기 |
| verify-iap-order | ⚠️ Mock mTLS (v12) | false | ✅ 실기기 `POST 200` 누적 5건 + `toss_orders` 영속(`order_count=5`, `latest_order_at=2026-02-28 22:31:22 KST`) / 잔여: 앱 UI 3시나리오 증적 |
| send-smart-message | ⚠️ Mock mTLS (v9) | true | ✅ invoke smoke + 위조 `x-user-role` 우회 차단(POST 403) + 429(`QUIET_HOURS`) 확인 / 신청·승인 완료 후 Sandbox 실발송 검증 |
| grant-toss-points | ⚠️ Mock mTLS (v9) | true | ✅ invoke smoke + 위조 `x-user-role` 우회 차단(POST 403), happy-path 미검증 |
| generate-report | ✅ v3 (mock/real switch) | true | ✅ invoke smoke + 위조 `x-user-role` 우회 차단(POST 403, v3), ⚠️ OpenAI 실키/실모드 미검증 |

기준: 2026-02-28 22:31 KST (Supabase MCP Edge Logs + DB 집계)

---

## 6. 테스트 갭

| 테스트 유형 | 상태 | 갭 |
|-----------|------|-----|
| FE 단위 테스트 | 완료 | Jest 77 tests, 21 suites (auth 7 + iap 8 + roleGuard 8 + ads 5 + guards 8 + pageGuard 5 + postLogin 2 + training/dashboard API 포함) |
| BE 단위 테스트 | 완료 | pytest 39 tests (health 3 + models 12 + schemas 14 + security 7 + routers 6) |
| BE↔DB 통합 테스트 | 미구현 | FastAPI + 실 Supabase 연결 테스트 (DB 마이그레이션 완료, 연결만 미검증) |
| E2E 테스트 | 부분 | 로그인 + Edge invoke smoke 검증, IAP/광고 happy-path 미검증 |
| 성능 테스트 | 미구현 | 40마리 FlatList, API p95 < 300ms |
| 보안 테스트 | 부분 | mTLS real mode, PII 암호화 단위 + Edge role-header 우회 차단 검증 완료(send-smart/grant/iap/report) |

---

## 7. 크리티컬 패스 블로커

### 🔴 CRITICAL (출시 차단)

1. ~~Backend AI 코칭 엔진 (BE-P5)~~ → ✅ 완료
2. ~~FastAPI 프로젝트 초기화 (BE-P1~P4)~~ → ✅ 완료
3. **Edge Function Real mTLS (INFRA-3)** — 로그인 외 Toss API 호출 전부 (인증서 발급 필요)
4. ~~FE→BE API 연결 잔여 도메인~~ — ✅ dashboard/training 포함 완료 (backend-first + fallback)
5. **AUTH 브릿지 실기기 재검증** — login-with-toss v13 ACTIVE, Sandbox 증적 보강 필요

### 🟠 HIGH (주요 기능 미완성)

6. IAP E2E 테스트 (Sandbox 결제 플로우)
7. B2B RPC 함수 (verify_parent_phone_last4)
8. Ads 실 Ad Group ID 교체

### 🟡 MEDIUM (론칭 영향 없음)

9. 세그먼트 + 리텐션 자동화 (Phase 2+)
10. 공유 리워드 (Phase 2+)
11. 트레이너 마켓플레이스 (Phase 2-3)

---

## 8. 추천 기능 (V1/V2)

### V1 출시 전 추가 권장

| 기능 | 임팩트 | 난이도 |
|------|--------|--------|
| 오프라인 큐 (네트워크 끊김 시 로그 로컬 저장 → 복구) | 높음 | 중 |
| 데이터 내보내기 (CSV/PDF) | 중 | 낮음 |
| 강아지 프로필 사진 AIT 실 Toss 검증 | 높음 | 중 |
| 주간 리포트 알림 (Smart Message 주간 요약) | 높음 | 낮음 |

### V2 이후 추가 권장

| 기능 | 임팩트 |
|------|--------|
| 커뮤니티 게시판 (같은 견종/문제 연결) | 높음 |
| 수의사 연동 (행동 기록 공유) | 높음 |
| 웨어러블 연동 (활동량 자동 수집) | 중 |
| 음성 기록 (산책 중 빠른 기록) | 중 |
| 강아지 AI 챗봇 (대화형 조언) | 높음 |
| 다크 모드 (토스 앱 연동) | 중 |

---

## 9. 다음 실행 순서

> **Single Source**: `CLAUDE.md` → "다음 우선순위" 섹션 참조.
> 이 문서에서는 중복 관리하지 않는다.
