# TaillogToss 누락 플랜 + 미구현 목록

> 작성일: 2026-02-28 | 최종 업데이트: 2026-04-02 | 기준: SDK 2.x 마이그레이션 완료 반영

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
| IAP-001 | 결제/복구/실패 3시나리오 앱 UI 증적 정리 |
| MSG-001 | Smart Message 신청/승인 완료 후 Sandbox 실발송 검증 |
| AD-001 | 실 Ad Group ID 교체, Sandbox 광고 검증 |
| B2B-001 | 40마리 FlatList 성능, 공유 링크 실기기, B2C 회귀 테스트, verify_parent_phone_last4 RPC |

---

## 4. Mock/Placeholder 구현 목록

> 공식 API 레퍼런스: `docs/ref/AIT-ADS-SDK-REFERENCE.md` (Ads), `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md` (IAP/MSG/Points)
> SDK 마이그레이션: `docs/ref/AIT-SDK-2X-MIGRATION.md` | 퍼블리싱: `docs/ref/AIT-PUBLISHING-READINESS.md`

| 항목 | 위치 | 현재 | 전환 필요 |
|------|------|------|----------|
| Ads SDK | `src/lib/ads/config.ts` | mock SDK (Promise 패턴) | `loadFullScreenAd`/`showFullScreenAd` 이벤트 콜백 패턴으로 전환 + 실 Ad Group ID 교체 |
| IAP | `src/lib/api/iap.ts` | 래퍼 구현 완료 | 실 SDK 교체 + `completeProductGrant()` 복원 호출 추가 |
| generate-report | `supabase/functions/generate-report/` | 배포 완료(v3), mock/real 스위치(`REPORT_AI_MODE`) + staff role guard | OpenAI 실키 검증 (BE-P7) |
| verify-iap-order | `supabase/functions/verify-iap-order/` | mock mTLS | real mTLS 전환 |
| send-smart-message | `supabase/functions/send-smart-message/` | mock mTLS | real mTLS 전환 |
| grant-toss-points | `supabase/functions/grant-toss-points/` | mock mTLS | real mTLS 전환 |
| IAP 복원 | `src/lib/api/subscription.ts:62` | DB 조회 대체 | Toss IAP 복원 API 공개 대기 |

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
| 강아지 프로필 사진 | 높음 | 중 |
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
