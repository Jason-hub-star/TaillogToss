# 배포 전 최종 게이트 감사표

> Last Updated: 2026-05-14 KST
> Scope: AUTH-001, APP-001, UI-001, LOG-001, AI-001, PRO-INTAKE-001, IAP-001, MSG-001, AD-001, B2B-001, REG-001
> Sources: `PROJECT-STATUS.md`, `11-FEATURE-PARITY-MATRIX.md`, `PROGRESS-CHECKLIST.md`, `MISSING-AND-UNIMPLEMENTED.md`, `PRELAUNCH-BLOCKER-SCAN.md`, `docs/ref/AIT-PUBLISHING-READINESS.md`

## Executive Verdict

| Verdict | Meaning | Release Decision |
|---|---|---|
| BLOCKED | 최신 QR/콘솔 진입은 확인됐지만, 실사용 QA에서 P0/P1 핫픽스가 필요함 | 현재 상태로는 최종 배포 승인 요청을 진행하지 않는다 |

현재 빌드와 주요 구현은 상당 부분 준비되어 있고 최신 ADB에서 AIT 실행, fresh Toss Login -> Supabase session bridge, IAP 결제 -> 서버 grant -> `completeProductGrant()` 증적까지 추가 확인됐다. 2026-05-14 기준으로 spouse account / spouse business registration path에서 최신 QR 진입, 검토 요청 버튼 활성화, dev 버튼 미노출도 확인됐다. 다만 사전 QA에서 quick log 저장 피드백, admin/ops 진입 가능성, 광고 침범, training monetization/affordance 문제가 발견되어 “콘솔 진입 가능”과 “심사 제출 가능”을 분리해 판단한다.

## Status Rubric

| Status | Definition |
|---|---|
| PASS | 구현과 최신 증적이 모두 있고, 배포 전 추가 차단 리스크가 낮음 |
| PARTIAL | 구현은 있으나 최신 실기기/콘솔/운영 증적 또는 일부 범위가 부족함 |
| BLOCKED | 심사 제출 또는 출시 결정 전에 반드시 해결해야 하는 미완료 항목이 있음 |

## Final Gate Table

| Area | Parity ID | Status | Evidence | Remaining Gap | Required Action |
|---|---|---|---|---|---|
| App launch / AIT | APP-001 | PARTIAL | Final AIT `019e2052-c020-7ff5-8ecf-f69bfd4e7513` uploaded and launched on production Toss; bundle load, dashboard UI, and release log markers observed without fatal/Metro/semver markers | Full final-AIT E2E route chain with behavior-log/coaching actions and real photo selection evidence is not complete | Run one uninterrupted final-AIT route chain: login -> dashboard -> quick log -> analysis -> training -> coaching -> profile -> settings/subscription |
| Toss Login | AUTH-001 | PASS | Fresh AIT login evidence captured: `appLogin`, `login-with-toss success`, `supabase setSession start/done`, `getUser verify ok=true`, `session bridge done sessionEstablished=true`, `onboarding sync success`, dashboard entry markers | No release-blocking auth gap known; keep stale authCode/invalid_grant as negative regression evidence | Keep fresh-code evidence attached to final review packet and rerun only if auth code or mTLS config changes |
| Core UI visual QA | UI-001 | PARTIAL | Key pages have been upgraded and typechecked across prior work | Full real-device visual sweep and text-overlap pass are not complete | Run visual pass for managed routes and record screenshots or log evidence |
| Behavior logs | LOG-001 | PARTIAL | FastAPI log API and quick log flows implemented; backend tests previously pass | App/device E2E for create/read behavior log remains open | Create behavior log on device, verify dashboard/analysis refresh and backend row |
| AI coaching | AI-001 | PARTIAL | Deep coaching schema, training references, OpenAI fixture work, and Pro intake extensions implemented | App/device FastAPI coaching generation E2E final evidence missing | Generate coaching from latest AIT and verify 6-block result plus Pro detail fields |
| Pro intake | PRO-INTAKE-001 | PASS | Stage 3 Pro 상담지 expansion and profile summary marked Done in parity docs | No release-blocking gap known | Keep regression check in final route sweep |
| IAP | IAP-001 | PASS | IAP products, proxy, failure/recovery UI, grant state machine, and backend paths implemented; manual-approved `10회` charge on final AIT produced DB order `af8c5cb4-6446-40ce-9ff5-8ed818dd049f` with `toss_status=PAYMENT_COMPLETED` and `grant_status=granted`; logcat captured `processProductGrant`, `verifyAndGrant`, `completeProductGrant done`, and `GRANT_COMPLETED`; `iap.test.ts` PASS (17 tests) | No release-blocking IAP success gap known; 2026-05-14 신규 정기 결제는 v1 범위에서 보류 | Keep latest log/DB evidence in review packet; rerun only if product IDs, IAP SDK, or grant Edge changes |
| Smart Message | MSG-001 | PASS | `log_reminder` current-user HTTP 200 and `noti_history.success=true` evidence exists | Additional campaigns are not release-critical for v1 | Treat only `log_reminder` as v1 scope; keep other campaigns post-release |
| Ads | AD-001 | PARTIAL | Live adGroupId wiring and SDK calls verified; fallback path exists | Current environment returns `code=1007`; supported-environment render/no-fill final 판정 missing | Decide release scope: keep graceful fallback, then verify render/no-fill after supported environment opens |
| B2B trainer flow | B2B-001 | PARTIAL | Org setup, role, dog add/profile work exists; B2C release can proceed | 40-dog FlatList, share link, B2C regression, `verify_parent_phone_last4` final checks remain | Do not block B2C release; gate B2B claims separately |
| Registration / console | REG-001 | PARTIAL | App info, review candidate, mTLS real mode, bundle size and AI disclosure work are documented; official console URL was reached; latest spouse-phone QA confirms QR entry works, review request button is enabled, and dev button is absent | Business category, support channel, cert expiry calendar, callback final checks, and final review packet attachment still need operator confirmation | Keep console evidence, complete remaining non-code publishing checks, and submit only after QA hotfix retest |
| Prelaunch QA hotfix | UI-001 / LOG-001 / AD-001 | BLOCKED | `docs/status/PRELAUNCH-QA-FEEDBACK.md` records latest user QA: quick-log save ambiguity, possible admin/ops route leakage, intrusive ads, training monetization boundary, completion strikethrough, false clickable hero, and bottom nav icon mismatch | P0/P1 UX issues need code fixes and device retest before review submission | Fix in development mode, rebuild AIT, then rerun spouse-phone QR/device QA |
| Security / privacy | REG-001 | PARTIAL | mTLS real mode documented for critical functions, privacy delegation text and AI disclosure exist | Secret rotation/token hygiene and expiry calendar remain operational risks | Rotate leaked Telegram bot token, register mTLS expiry calendar, confirm production env values |
| Performance / reliability | APP-001 | PARTIAL | Cached-first and startup markers improved; standalone first paint evidence exists | Railway sleep/cold-start and first backend call latency remain | Decide: keep-warm/paid no-sleep, or accept v1 risk with clear monitoring |
| Automation / AI data loop | AI-TRAIN-001 | PARTIAL | Telegram review material collection v1 and orchestrator cleanup implemented | Production bot token should be rotated; loop intentionally does not auto-publish curriculum | Keep as internal ops only until 50+ reviewed samples and separate improvement approval |

## Hard Blockers

| Priority | Blocker | Why It Blocks | Owner Action |
|---|---|---|---|
| P0 | Quick-log save confirmation and possible admin/ops route leakage | Core logging must feel saved and normal B2C users must not see internal/admin routes | Fix save completion UX and audit route guards/startup redirects |
| P1 | Real-device core action sweep | Route render proof exists, but action proof is still fragmented | Sweep dashboard -> quick log create -> analysis refresh -> training detail -> coaching generate -> profile save -> settings |
| P1 | Ad intrusion and training monetization boundary | Review and user trust can suffer if ads dominate core actions or Pro appears before basic value | Reduce quick-log/core-action ad footprint and keep basic training free/light before Pro |
| P1 | Publishing operations checks | Non-code console mismatches can cause review rejection | Confirm business category, support channel, callback, certificate expiry calendar |

## Release Scope Recommendation

| Scope Item | Recommendation |
|---|---|
| B2C core logging/training/coaching | Proceed only after P0 blockers pass |
| Pro / IAP | Keep enabled only after final success scenario passes; otherwise hide paid entry or hold release |
| Smart Message | Ship `log_reminder` only; keep additional templates as post-release scope |
| Ads | Ship with graceful fallback/no-fill handling; avoid promising ad monetization until environment support is confirmed |
| B2B | Do not market as complete in v1; keep as limited/internal beta until B2B-001 gaps close |
| AI training data loop | Internal ops only; no automatic curriculum publishing before review dataset threshold and separate approval |

## Evidence Map

| Evidence | Location |
|---|---|
| Latest status and AIT review notes | `docs/status/PROJECT-STATUS.md` |
| Feature parity and remaining IDs | `docs/status/11-FEATURE-PARITY-MATRIX.md` |
| Prelaunch blocker scan | `docs/status/PRELAUNCH-BLOCKER-SCAN.md` |
| Overall progress checklist | `docs/status/PROGRESS-CHECKLIST.md` |
| Publishing readiness details | `docs/ref/AIT-PUBLISHING-READINESS.md` |
| Missing and unimplemented inventory | `docs/status/MISSING-AND-UNIMPLEMENTED.md` |

## Latest ADB Evidence (2026-05-13 KST)

| Item | Result |
|---|---|
| Current uploaded AIT | `019e2052-c020-7ff5-8ecf-f69bfd4e7513` |
| Current root artifact | `taillog-app-019e2052-c020-7ff5-8ecf-f69bfd4e7513.ait` |
| Artifact SHA256 | `d7f2c408568e76c09856a8dec8f15579dae327637346d8acb5ed20784e23d440` |
| Bundle scan | PASS: `[AUTH-001]` and `[IAP-001]` release logs present, HTTPS `brandIcon` present, local brand icon absent, `ait-ad-test-*` count `0`, `isDevToolsEnabled()` returns `false` |
| ADB launch | PASS: production Toss `GraniteActivity`, `Running "shared"`, bundle loaded, dashboard UI visible |
| Route render sweep | PASS/PARTIAL: dashboard, analysis, quick-log, training academy, dog profile/switcher, settings/subscription, legal, onboarding survey rendered on uploaded AIT lineage |
| AUTH fresh path | PASS: fresh `appLogin` -> `login-with-toss success` -> Supabase `setSession` -> `getUser verify ok=true` -> `session bridge done` -> `onboarding sync success` -> dashboard markers |
| IAP paid success | PASS: manual-approved `10회` charge -> DB `PAYMENT_COMPLETED` + `grant_status=granted`; direct `completeProductGrant done` and `GRANT_COMPLETED` log captured |
| Console QR/review | PASS/PARTIAL: latest QR opens on spouse phone, review request button is enabled, and dev button is absent; remaining console business/support/callback/cert checks are still pending |
| Local validation | PASS: typecheck, auth jest, IAP jest, `git diff --check`, AIT build |

## 2026-05-14 Apps in Toss Update Check

| Item | Result |
|---|---|
| Official update | 앱 정보 등록 간소화, 앱 상세 페이지, IAP 정기 결제 공개 |
| Local SDK | `@apps-in-toss/framework 2.4.1`, `@apps-in-toss/native-modules 2.4.1`; npm latest `2.5.1` |
| Device Toss app | Android `v5.259.0`; 정기 결제 최소 버전(Android `v5.253.0`) 충족 |
| Metro | `localhost:8081` connection refused during check, so current evidence is not Metro-backed |
| Recurring subscription | Deferred for v1. Existing `PRO_MONTHLY` remains one-time/non-consumable style IAP until separate subscription migration |
| QR root-cause judgment | Latest spouse-phone QR entry works, so the previous sandbox QR failure is no longer treated as an outdated-SDK blocker. Keep SDK 2.5.1 upgrade as a post-hotfix maintenance task unless Toss review specifically requires it. |

## Next 3

1. Fix prelaunch QA hotfixes in development mode: quick-log save completion, admin/ops route guard, ad footprint, training Pro/free boundary, completion marker, AI hero affordance, bottom nav icon mood.
2. Rebuild AIT and rerun spouse-phone QR/device QA: quick log create -> analysis refresh -> training detail -> coaching generate -> profile save -> subscription restore.
3. Complete final console operations checks: business category, support channel, callback, certificate expiry calendar, review packet attachments.

## Audit Notes

- This audit is stricter than a code-readiness scan. A feature with implemented code can still be `PARTIAL` or `BLOCKED` if the latest production Toss/console evidence is missing.
- B2B remains `PARTIAL`, not `BLOCKED`, because it can be scoped out of B2C release claims.
- Ads remains `PARTIAL`, not `BLOCKED`, if the app keeps graceful no-fill/fallback behavior and does not depend on ad revenue for v1 acceptance.
- IAP is now `PASS` for the latest paid success gate; keep product/SDK/Edge changes under regression control.
