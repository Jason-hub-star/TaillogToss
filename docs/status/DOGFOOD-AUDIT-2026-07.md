---
tags: [audit, security, ux]
---

<!--
  dogfood-audit(2026-07-11) — ChatterBox `.claude/skills/dogfood-audit` 방법론을 TaillogToss 도메인에 적용.
  6 페르소나 서브에이전트(보안3+UX3) 병렬 도그푸딩 → 메인(Fable 5) 직접 원본 대조 검증.
  대상 브랜치: codex/ait-standalone-diagnosis (uncommitted 대규모 diff — IAP/auth/points 재작성).
  이 문서 = 발견 SSOT + 우선순위 백로그. 심각도는 메인이 실임팩트로 재조정한 값(워커 원판정과 다를 수 있음).
-->

# 도그푸딩 감사 2026-07-11 — TaillogToss

> **BLUF:** 인증·인가 골격은 대체로 견고(소유권 3단 체크·IAP 교차유저 차단·RLS·entitlement 서버판정·coaching 캡이 실측 반증됨). 진짜 갭은 **동시성/멱등성 계열 보안 2건(IAP 토큰 이중적립·포인트 큐 중복지급)**, **config 하드닝 1건(auth bridge 기본 시크릿 폴백)**, 그리고 **접근성 공백(터치요소 87% a11y 레이블 누락)·B2B 운영 CRUD 미완(퇴소/멤버관리 UI 없음)·온보딩 무음실패 UX**. 방법 = 6 페르소나 병렬 워커 → 메인 원본 대조. 워커가 부풀린 P0 3건은 실측으로 P1/P2/Refuted로 재조정함.

---

## §0. 우선순위 백로그 (심각도순 · 체크로 추적)

> **구현 라운드 2026-07-11:** SEC-1·SEC-2·AIT-1 코드 수정 완료(유닛테스트·타입체크 통과).
> **배포 완료 2026-07-11:** SEC-1(`verify-iap-order` v15)·SEC-2(`process-point-events` v1 + `claim_point_event` RPC) 프로드 배포 + 스모크 401 게이트 검증. AIT-1은 FE라 배포 불필요(Metro 번들). 마이그레이션은 Management API로 적용(idempotent `create or replace`) — `supabase_migrations` 미기록이라 다음 `db push`가 재적용(안전). **라이브 E2E는 로그인 이슈로 대기**(§8 참조).

### 보안 (P1 우선)
- [x] **SEC-1 (P1·Confirmed)** IAP `ai_tokens` 동시 이중적립 — **수정:** `verify-iap-order/main.ts` claim-first 재정렬(활성화 이전에 `toss_order_id` 유니크 insert 로 선점 → 선점 성공분만 활성화 → 결과로 grant_status 확정 UPDATE). 충돌 시 replay. **검증:** IAP 순수함수 테스트 22/22 + deno 타입 클린(handleRequest 는 유닛테스트 없음 → 라이브 DB 검증 필요).
- [x] **SEC-2 (P1·Confirmed)** 포인트 큐 중복지급 — **수정:** 새 마이그 `20260711000100_claim_point_event.sql`(원자적 claim RPC) + `process-point-events/index.ts` 지급 이전 claim-first. **검증:** 테스트 11/11(신규 중복지급 방지 테스트 포함).
- [ ] **SEC-3 (P1·Likely·config)** auth bridge 기본 시크릿 폴백 — `login-with-toss/index.ts:193` `'dev-bridge-secret'` 하드코딩 폴백. (미착수)
- [x] **SEC-4 (P2·Confirmed)** training 소유권 검증 누락 — **수정:** `training/router.py` 4개 엔드포인트(get_statuses·update_status·save_feedback·get_feedback)에 `verify_dog_ownership` 추가(형제 모듈 패턴 일치, body dog_id는 `UUID()` 래핑). **검증:** import OK + ownership/training 테스트 12 passed. **잔여:** FastAPI(DigitalOcean) 배포.
- [ ] **SEC-5 (P2·Likely)** report 메타데이터 존재 열거 — `generate-report/index.ts:87-99` fetch 후 인가. (미착수)

### 블로그 대응 (AIT 26-07-10)
- [x] **AIT-1 (라이브 QA 필요)** Android 배너+전면/보상형 동시로드 이벤트 실패 — **수정:** 새 `src/lib/ads/adCoordination.ts`(전면/보상형 활성 중 배너 억제) + 배너/보상형/전면 훅 게이팅. **검증:** 광고 훅 테스트 10/10 + tsc 클린. **잔여:** Android 실기기에서 이벤트 수신 확인.

### UX (Blocker 우선)
- [ ] **UX-1 (Blocker·a11y)** 터치요소 129개 중 ~87% `accessibilityLabel` 누락 — 스크린리더 사용 불가.
- [ ] **UX-2 (Blocker·B2B)** 강아지 퇴소 UI 없음 — 훅·엔드포인트는 있으나 컨트롤 부재.
- [ ] **UX-3 (Blocker·B2B)** 멤버 제거/역할변경 UI 없음 + PATCH 엔드포인트 부재.
- [ ] **UX-4 (High)** 온보딩 알림저장 무음 catch — `onboarding/notification.tsx:89`.
- [ ] **UX-5 (High)** 30+ `fontSize` 하드코딩 — 동적 글자 크기 스케일 불가.

---

## §1. 보안 발견 (심각도순 — 메인 재조정값)

| ID | 취약점 | 심각도 | Confidence | file:line | 익스플로잇 | 정수정 |
|---|---|---|---|---|---|---|
| SEC-1 | IAP ai_tokens 동시 이중적립 | P1 | Confirmed | `verify-iap-order/main.ts:573-574` (활성화 930 vs insert 942) | 실제 결제완료 주문 1건으로, idempotencyKey를 달리한 동시 요청 2개를 보내 둘 다 `findExistingTossOrder`(874) 통과 → 둘 다 Toss 검증·`activateSubscription` 통과 → `ai_tokens += grant` 가 2회 적용. 이후 하나의 insert만 `uq_toss_orders_toss_order_id`로 성공하고 다른 하나는 409지만, **토큰은 이미 2배 적립됨**. 창은 좁고 실결제 주문 필요 → 자기 결제분에 한정. | order row insert를 **claim으로 선행**(유니크 승자만 활성화), 또는 `ai_tokens`를 주문당 멱등한 원자적 SQL 증가(`update ... set ai_tokens = ai_tokens + g where not exists(granted for this order)`)로. read-modify-write 제거. |
| SEC-2 | 포인트 큐 중복지급 (at-least-once) | P1 | Confirmed | `process-point-events/index.ts:134-234` | 드레이너가 `point_events WHERE processed=false`를 **원자적 claim 없이** SELECT하고, Toss 지급을 **먼저** 한 뒤 마지막에 `processed=true` 마킹(231). 두 드레이너 실행이 겹치거나, 지급 성공 후 배치 중단(edge timeout)되면 다음 실행이 같은 이벤트를 재지급. grant-toss-points 멱등성은 in-memory(`idempotency.ts:94`)라 워커 재시작·수평확장에서 무효. `point_transactions.point_event_id`는 **평범한 인덱스**(unique 아님, `20260523000100:53`)라 DB 이벤트 레벨 방어도 없음. **service_role 전용이라 외부공격 아님** — 내부 신뢰성 결함. blast radius = 월 5만원 예산 가드(114·170)로 제한. | claim-first: `update point_events set processed=true where id=? and processed=false` 결과 rowcount=1일 때만 지급(at-most-once). 또는 `point_transactions(point_event_id)` UNIQUE + 지급 전 존재확인. 또는 `for update skip locked`. |
| SEC-3 | auth bridge 기본 시크릿 폴백 | P1 | Likely (config) | `login-with-toss/index.ts:193` | 브릿지 비번 = `SHA-256(userKey : AUTH_BRIDGE_SECRET ?? SUPER_SECRET_PEPPER ?? 'dev-bridge-secret')`. 두 env가 **모두 미설정**이면 시크릿이 소스에 공개된 `'dev-bridge-secret'`으로 고정 → 이메일(`toss_<userKey>@taillog.local`)+파생비번을 anon 키로 `/auth/v1/token?grant_type=password`에 직접 넣어 임의 유저 세션 위조. userKey는 opaque이나, 시크릿 폴백이 결정성을 무력화. | env 미설정 시 **fail-closed**(500) — 하드코딩 기본 시크릿 제거. 프로드 배포게이트에 `AUTH_BRIDGE_SECRET` 필수 체크 추가. |
| SEC-4 | training 소유권 검증 누락 | P2 | Confirmed | `training/router.py:19,29,56,67` | 4개 엔드포인트 모두 `verify_dog_ownership` 미호출. **단 service는 전부 `user_id==인증유저`로 스코프**(`service.py:25,43,100,119`)라 피해자 데이터 열거는 불가(워커의 "enumerate victim data" 주장 반증). 실임팩트 = 미소유 dog_id로 자기 훈련행 쓰기(정합성/그리핑) + 모든 형제 모듈(coaching/log/analytics)과 불일치. | 4곳에 `await verify_dog_ownership(db, dog_id, user_id=user_id)` 추가 — coaching/log/analytics 패턴과 동일하게. |
| SEC-5 | report 메타데이터 존재 열거 | P2 | Likely | `generate-report/index.ts:87-99` | reportId로 service_role fetch 후(97) **인가는 fetch 다음**(308)에 수행. 접근 거부돼도 리포트 존재/스코프 메타는 노출 가능. 실데이터 본문은 인가로 보호됨. | `daily_reports` SELECT에 RLS(멤버십/트레이너 소유) 적용해 DB 레벨에서 존재 자체를 가림. |

---

## §2. 반증 — 안전 확인 (거짓양성 억제 · 메인 직접 검증)

- **mock-mode 프로덕션 우회 = 안전(fail-closed)** — `_shared/mtlsMode.ts:57-65`. production-like거나 env 비면 무조건 `real`. `mock`은 `APP_ENV/NODE_ENV` 등이 명시적 dev/test/local일 때만. (데이터절취 워커가 이 경로를 의심했으나 실측 반증.)
- **IAP 교차유저 주문 재사용 = 차단** — `verify-iap-order/main.ts:880` `isIapReplayCompatible`가 `row.user_id === resolvedUserId` 확인.
- **`toss_order_id` 중복 행 = DB 유니크로 차단** — `migrations/20260601001600_lock_toss_order_id_reuse.sql:6`. (경제 워커가 초기 마이그만 보고 "유니크 없음 P0"로 올렸으나 후속 마이그가 추가함 → **P0 판정 파기**. 잔여 리스크는 SEC-1의 활성화-선행 창뿐.)
- **entitlement 클라 플래그 우회 = 안전** — `subscription/router.py:218` + `entitlements.py`가 DB `subscriptions`/`UserEntitlement`로만 판정, 클라 입력 미신뢰.
- **coaching 비용 DoS = 안전** — `coaching/router.py:30-57` burst(2회/10분) + daily(티어별) 캡.
- **grant-toss-points 무단호출 = 안전** — `index.ts:118` service_role 아니면 403.
- **withdraw-user JWT 위조 = 안전** — `withdraw-user/index.ts:70-90` Supabase Admin `/auth/v1/user`로 서명 검증.
- **users/dogs RLS = 활성** — `20260420000000_toss_project_init.sql` RLS enable + own-row 정책, `using(true)` 공개정책 없음.
- **org 경계·B2B 로그 접근 = 안전** — `org/service.py` `verify_org_membership` + org-dog active 체크, `log/router.py:28-56` `verify_org_log_access`.
- **report share token = 안전** — `report/service.py:99-132` 토큰검증 + IP당 8회/10분 스로틀 + 만료 + parent_phone_last4 요구.

---

## §3. UX 마찰 (Blocker → High → Med)

**신규 유저 (온보딩 → 첫 코칭)**
- [High] 알림 저장 무음 실패 — `onboarding/notification.tsx:89` — 설정 API 실패해도 피드백 0, 저장된 줄 알고 대시보드로 진행. → 에러 토스트/배너.
- [High] 동기화 타임아웃 시 화면 깜빡임 — `onboarding/welcome.tsx:263-267` — 10s 타임아웃 발화 시 `setIsLoading(false)`가 finally(280)에서 먼저 떠 리다이렉트 전 화면이 순간 blank.
- [Med] 대시보드 빈 상태 CTA가 스크롤 아래 — `dashboard/index.tsx:233-238` — Lottie+카피는 좋으나 첫 기록 버튼이 fold 아래. → 빈 상태 안에 직접 CTA.
- [Med] survey 제출 실패 시 버튼 stuck — `onboarding/survey.tsx:58-66` — mutation 에러 시 `submittingRef.current`가 true로 남아 재시도 차단.

**B2B 운영자**
- [Blocker] 강아지 퇴소 UI 없음 — `ops/settings.tsx`·`ops/today.tsx` — `useDischargeDog` 훅+엔드포인트 존재하나 컨트롤 부재. 등록 후 영구 active.
- [Blocker] 멤버 제거/역할변경 UI 없음 — `components/features/ops/MemberList.tsx:28` — 초대만 가능. 게다가 `PATCH /org/{org_id}/members/{member_id}` 엔드포인트 **부재**.
- [High] 대량 저장 확인 없음 — `ops/today.tsx:362` — 선택 프리뷰/카운트 확인 없이 즉시 저장, 오선택 위험.
- [High] 부모 전화 검증 없음 — `ops/dog-add.tsx:232` — 형식 검증 없이 raw 저장.
- [Med] 의료정보 필드 수집만 되고 저장 안 됨 — `ops/dog-add.tsx:58` (vet_name/animal_reg_no/parent_address) — UI는 받으나 `org/service.py:454-460`이 미기록(TODO).

**모바일/접근성**
- [Blocker] 터치요소 ~129개 중 `accessibilityLabel` ~10개(8%) — QuickLogChips/LogCard/DogSwitcherItem 등 아이콘 버튼 스크린리더 불가. → `accessibilityLabel`+`accessibilityRole="button"` 일괄.
- [High] `fontSize` 하드코딩 30+ — `Accordion.tsx:12`, `CurriculumJourneyMap.tsx:14`, `LogCard.tsx:124` 등 — 동적 스케일 불가. → `typography.*` 토큰.
- [High] 터치타겟 <44px + hitSlop 없음 — `SpeechBubble.tsx`(12·22px)·`SettingsStepperRow.tsx`(28px). → `hitSlop` 또는 44dp 보장.
- [Med] 하드코딩 hex `#0064FF08` — `PlanSelector.tsx` → 토큰.

---

## §4. 기능 갭 (effort)

- **멤버 제거/역할변경** (M) — `PATCH /org/members/{member_id}` 신설 + MemberList 액션메뉴 + 확인모달(owner만 제거 권한).
- **강아지 퇴소 UI** (S) — OpsListItem long-press → 바텀시트 → 확인 → refetch. 기존 RecordModal 재사용.
- **대량 액션 프리뷰 모달** (S) — handleBulkSave 전 이름/프리셋/메모 확인.
- **부모 전화 검증** (S) — 마스크 + last4 추출.
- **의료 필드 영속화** (M) — dogs 3컬럼 마이그 + service 기록.

---

## §5. 잘되는 점 (회귀 금지)

- **인증 타임아웃 명시적·유저대면** — `welcome.tsx:41-194` 4단 임계값 + 실패모드별 로컬라이즈 메시지.
- **폼 초안 자동복구** — `stage1-form.tsx:76-92` useDraftSave, 이탈 후 복귀 무손실.
- **스켈레톤 전략 일관** — `SkeletonDashboard/Academy` 로딩 중 렌더, blank flash 없음(`dashboard/index.tsx:180-186`).
- **ErrorState+재시도 패턴** — `ErrorState.tsx` 항상 `onRetry`+"다시 시도", coaching/training/dashboard 공통.
- **BackButton = a11y 모범** — `BackButton.tsx:40-41` label+role+hitSlop. 다른 컴포넌트 표준으로 삼을 것.
- **org 캐시 무효화 클린** — assign/unassign 후 `queryKeys.assignments.all`+org dogs 무효화, stale 없음.
- **PII 분리** — 부모 전화 last4/full 분리 저장(org_dogs / org_dogs_pii).

---

## §6. 방법 & 검증 노트

- **방법:** ChatterBox `dogfood-audit` 3단 파이프라인을 TaillogToss 도메인으로 재매핑. 페르소나 = 악성유저(IDOR/tenant) · 경제공격자(IAP/points/referral) · 데이터절취(auth-bridge/RLS/PII) · 신규유저 · B2B운영자 · 모바일/a11y. 6개 병렬 워커(general-purpose) → 메인(Fable 5)이 최고심각도 Confirmed를 **원본 라인 직접 대조**로 재조정.
- **메인이 파기/강등한 워커 판정:** ① IAP "no unique constraint → 이중지급 P0" → 유니크 존재 확인(20260601001600) → **파기**, 잔여 SEC-1(활성화 선행 P1)로 재정의. ② points/grant-key "외부공격자 5000pt 2배 P0" → service_role 전용 확인 → **내부 at-least-once P1로 강등**. ③ training IDOR "victim 데이터 열거 P1" → service user_id 스코프 확인 → **P2(쓰기 정합성)로 강등**. ④ auth-bridge P0 → 결정적 비번은 시크릿 유출 시 문제일 뿐 → **실결함은 기본 시크릿 폴백(SEC-3 P1)**로 재정의.
- **소스 기준:** 배포본이 소스보다 오래됐을 수 있음(브랜치 미커밋 diff). RLS/스토리지 traversal은 외부런타임 정규화 의존 항목은 라이브 테스트 권고.

---

## §8. 배포 & 라이브 E2E 상태 (2026-07-11)

**배포 완료(프로드):**
- SEC-2: `claim_point_event` RPC 적용(Management API, HTTP 201, DB 존재 확인) + `process-point-events` v1 배포. 스모크: 무인증 → 401 `UNAUTHORIZED_NO_AUTH_HEADER`(verify_jwt 게이트).
- SEC-1: `verify-iap-order` v14→v15 배포. 스모크: 무인증 → 401 `AUTH_UNAUTHORIZED`(함수 게이트, `_shared` 번들 정상, 500 아님).
- 마이그레이션은 `supabase_migrations` 미기록 → 다음 `db push`(DB 비번 보유 시)가 idempotent 재적용. 드리프트 없음.

**라이브 E2E 블로커 — 로그인 실패(내 코드/배포 무관):**
- 시퀀스: `appLogin`(Toss 네이티브) **성공** → `login-with-toss start` → **`AUTH_BRIDGE_TIMEOUT`**(welcome.tsx 25s). Metro 로그에 `TypeError: Network request failed` 다수.
- 판정: 미니앱의 `fetch`가 `https://<ref>.supabase.co`(정상 공개 URL)에 못 나감. Toss SDK는 네이티브 브릿지라 되지만 미니앱 fetch는 실패 → **기기/샌드박스 네트워크 문제**(login-with-toss v13 미변경, edge 로그 빈 결과 = 요청 미도달). 진단 중 기기가 adb에서 이탈(연결 불안정).
- 재개 조건: USB 재연결+디버깅 인증 → `adb reverse tcp:8081/5173/8765` 재등록 → 기기 Wi-Fi 인터넷 확인 → 미니앱 재진입 → 로그인 재시도. 그 후 AIT-1(광고)·SEC-1/2 E2E 검증.

---

## §7. Apps-in-Toss 플랫폼 업데이트 대조 (2026-07-10 블로그)

출처: `toss.im/apps-in-toss/blog/update-26-07-10`. 업데이트 4건을 TaillogToss 코드에 대조.

| 업데이트 | TaillogToss 관련성 | 판정 | 근거 |
|---|---|---|---|
| **Android 광고 이벤트 실패** — 배너 + 전면/보상형 **동시 로드** 시 이벤트 전달 실패. SDK v5.268.0(토스 슈퍼앱 네이티브, 7/10~13) 전까지 순차 로드 권고 | Ads SDK 2.0 R/B/I 슬롯 사용 | **AIT-1 (라이브 QA 필요)** | 한 화면 co-mount는 없음(대시보드=배너 B1만 `dashboard/index.tsx:225`, analysis·coaching=보상형만 `analysis.tsx:281`/`CoachingDetailContent.tsx:176`). 단 배너는 마운트 시 로드(`useBannerAd`), 전면/보상형은 `showAd()` 온디맨드 로드(`useInterstitialAd`). 스택 네비에서 대시보드 배너가 살아있는 채 analysis/coaching 보상형이 뜨면 **크로스 스크린 동시 로드** 가능 → Android 실기기 검증 필요 |
| **내비바 커스터마이징** — RN `useTopNavigation()` 훅 (back/home·타이틀·투명·다크·액세서리 아이콘) | 네비게이션/a11y UX | **AIT-2 (미채택 기회)** | `useTopNavigation` grep 0건. UX-1(a11y)·네비 개선에 활용 가능. 버그 아님 |
| **익명 유저 푸시** — Toss `getAnonymousKey()` + `x-anon-key` 헤더 | Smart Message(MSG-001) | **미해당** | 코드의 `anonKey`는 전부 Supabase anon 키(`supabase.ts:26`), Toss 익명키 아님. TaillogToss는 Toss 로그인 필수라 관련성 낮음 |
| **Console MCP** — Claude로 콘솔(심사제출·배포·통계·IAP·ads·push) 자연어 관리 | 운영/배포 워크플로 | **운영 기회** | 코드 무관. 심사제출·번들배포 자동화에 활용 가능 |

**AIT-1 정수정(라이브 확인 후):** 전면/보상형 `showAd()` 직전 화면의 배너를 언마운트/일시정지(또는 배너 `loaded` 대기 후 순차) → Android 이벤트 유실 방지. `getAdsSdk()` 싱글턴이 전면·보상형 공용(`config.ts:186`)이라 배너만 분리 제어하면 됨.

**라이브 QA 체크리스트(기기 연결 시):**
- [ ] AIT-1: Android에서 대시보드(배너 B1) → analysis(보상형) 이동 후 보상형 `impression/userEarnedReward` 이벤트 정상 수신 확인
- [ ] SEC-4: training 엔드포인트에 타 유저 dog_id로 요청 시 403 확인(수정 후)
- [ ] UX-1: TalkBack으로 QuickLogChips/설정/강아지전환 버튼 레이블 낭독 확인
- [ ] UX-2/3: ops/settings·MemberList에서 퇴소·멤버제거 컨트롤 부재 재확인
</content>
</invoke>
