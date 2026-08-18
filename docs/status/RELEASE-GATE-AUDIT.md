# 배포 전 최종 게이트 감사표

> Last Updated: 2026-05-22 KST
> Scope: AUTH-001, APP-001, UI-001, LOG-001, AI-001, PRO-INTAKE-001, IAP-001, MSG-001, AD-001, B2B-001, REG-001
> Sources: `PROJECT-STATUS.md`, `11-FEATURE-PARITY-MATRIX.md`, `PROGRESS-CHECKLIST.md`, `MISSING-AND-UNIMPLEMENTED.md`, `PRELAUNCH-BLOCKER-SCAN.md`, `docs/ref/AIT-PUBLISHING-READINESS.md`

> Snapshot note: this audit is retained as the 2026-05-22 release/submission snapshot. For current work intake, treat `PROJECT-STATUS.md`, `11-FEATURE-PARITY-MATRIX.md`, `PAGE-UPGRADE-BOARD.md`, and `PROGRESS-CHECKLIST.md` as fresher; 2026-05-26/05-27 Ads/Login/Coaching evidence supersedes some PARTIAL rows below.

## Executive Verdict

| Verdict | Meaning | Release Decision |
|---|---|---|
| RELEASED / SUBMISSION-READY | 사용자 보고 기준 실제 토스 앱에서 한글 미니앱 이름 검색 노출 및 공개 공유 URL 캡처 완료 | 챌린지 출품 폼에는 `https://minion.toss.im/L1o5uCsg`를 사용한다 |

현재 빌드와 주요 구현은 상당 부분 준비되어 있고 최신 ADB에서 AIT 실행, fresh Toss Login -> Supabase session bridge, IAP 결제 -> 서버 grant -> `completeProductGrant()` 증적까지 추가 확인됐다. 2026-05-22 사용자 보고 기준으로 `출시하기` 후 실제 토스 검색 노출과 미니앱 공개 공유 URL `https://minion.toss.im/L1o5uCsg` 확보가 완료되었으므로, 이 문서는 출시 차단 판정이 아니라 출품/운영 잔여 액션 추적 문서로 전환한다.

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
| Behavior logs | LOG-001 | PARTIAL | FastAPI log API and quick log flows implemented; backend tests pass (BUG-01: daily_activity JSONB 정합성 수정 2026-05-19); local Wave 1~3 E2E 로그 생성/저장 완료 | App/device E2E for create/read behavior log remains open | Create behavior log on device, verify dashboard/analysis refresh and backend row |
| AI coaching | AI-001 | PARTIAL | Deep coaching schema, training references, OpenAI fixture work, and Pro intake extensions implemented (BUG-02: StepReaction enum 정합성 수정 2026-05-19); local Wave 4~6 E2E 코칭 생성/피드백 완료 | App/device FastAPI coaching generation E2E final evidence missing | Generate coaching from latest AIT and verify 6-block result plus Pro detail fields |
| Pro intake | PRO-INTAKE-001 | PASS | Stage 3 Pro 상담지 expansion and profile summary marked Done in parity docs | No release-blocking gap known | Keep regression check in final route sweep |
| IAP | IAP-001 | PASS | IAP products, proxy, failure/recovery UI, grant state machine, and backend paths implemented; manual-approved `10회` charge on final AIT produced DB order `af8c5cb4-6446-40ce-9ff5-8ed818dd049f` with `toss_status=PAYMENT_COMPLETED` and `grant_status=granted`; logcat captured `processProductGrant`, `verifyAndGrant`, `completeProductGrant done`, and `GRANT_COMPLETED`; `iap.test.ts` PASS (17 tests) | No release-blocking IAP success gap known; 2026-05-14 신규 정기 결제는 v1 범위에서 보류 | Keep latest log/DB evidence in review packet; rerun only if product IDs, IAP SDK, or grant Edge changes |
| Smart Message | MSG-001 | PASS | `log_reminder` current-user HTTP 200 and `noti_history.success=true` evidence exists | Additional campaigns are not release-critical for v1 | Treat only `log_reminder` as v1 scope; keep other campaigns post-release |
| Ads | AD-001 | PARTIAL | Live adGroupId wiring and SDK calls verified; fallback path exists | Current environment returns `code=1007`; supported-environment render/no-fill final 판정 missing | Decide release scope: keep graceful fallback, then verify render/no-fill after supported environment opens |
| B2B trainer flow | B2B-001 | PARTIAL | Org setup, role, dog add/profile work exists; B2C release can proceed | 40-dog FlatList, share link, B2C regression, `verify_parent_phone_last4` final checks remain | Do not block B2C release; gate B2B claims separately |
| Registration / console | REG-001 | PASS/PARTIAL | App info, review candidate, mTLS real mode, bundle size and AI disclosure work are documented; official console URL was reached; latest spouse-phone QA confirms QR entry works, review request button is enabled, and dev button is absent; 2026-05-22 사용자 보고 기준 실제 토스 검색 노출 및 공개 공유 URL `https://minion.toss.im/L1o5uCsg` 확보 완료 | Business category, support channel, cert expiry calendar, callback final checks remain operational follow-ups | Paste the captured public mini-app URL into the challenge form |
| Prelaunch QA hotfix | UI-001 / LOG-001 / AD-001 | PARTIAL | Local hotfix now covers quick-log save completion, quick-log ad removal, beginner/free training boundary, Pro Day 1 preview, I1 daily cap, B2B route guard, AI hero tap target, checklist marker cleanup, and Imagen blue icon replacement; local AIT build `019e2520-b4ac-778b-8182-40c0718038dc` / SHA256 `bc2c3aefb30a651215f612b8dc0622cba9e3b628b28005191796715032aeadd0` passed bundle scans | AIT deploy/console QR refresh is blocked by missing local deploy API key/profile; spouse-phone QR/device QA remains pending | Add Apps in Toss deploy API key/profile, deploy the new AIT, then rerun spouse-phone QR/device QA |
| Security / privacy | REG-001 | PARTIAL | mTLS real mode documented for critical functions, privacy delegation text and AI disclosure exist | Secret rotation/token hygiene and expiry calendar remain operational risks | Rotate leaked Telegram bot token, register mTLS expiry calendar, confirm production env values |
| Performance / reliability | APP-001 | PARTIAL | Cached-first and startup markers improved; standalone first paint evidence exists | Railway sleep/cold-start and first backend call latency remain | Decide: keep-warm/paid no-sleep, or accept v1 risk with clear monitoring |
| Automation / AI data loop | AI-TRAIN-001 | PARTIAL | Telegram review material collection v1 and orchestrator cleanup implemented | Production bot token should be rotated; loop intentionally does not auto-publish curriculum | Keep as internal ops only until 50+ reviewed samples and separate improvement approval |

## Operational Follow-ups

| Priority | Follow-up | Why It Matters | Owner Action |
|---|---|---|---|
| P0 | 바이브코딩 챌린지 공개 공유 URL 제출 | 공개 URL `https://minion.toss.im/L1o5uCsg` 확보 완료. 출품 폼 입력만 남음 | 출품 폼 `미니앱 공유하기 URL`에 붙여넣기 |
| P1 | Real-device confirmation for quick-log and B2B route guard | Local hotfix is implemented, but release decision needs device evidence that save returns to dashboard and B2C accidental B2B entry returns to `/dashboard` | Verify on the rebuilt AIT after bottom nav icon replacement |
| P1 | Real-device core action sweep | Route render proof exists, but action proof is still fragmented | Sweep dashboard -> quick log create -> analysis refresh -> training detail -> coaching generate -> profile save -> settings |
| P2 | Publishing operations checks | Non-code console mismatches can cause later operations issues | Confirm business category, support channel, callback, certificate expiry calendar |

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

1. Add Apps in Toss deploy API key/profile and deploy local AIT `019e2520-b4ac-778b-8182-40c0718038dc`.
2. Rerun spouse-phone QR/device QA: quick log create -> analysis refresh -> training detail -> coaching generate -> profile save -> subscription restore.
3. Complete final console operations checks: business category, support channel, callback, certificate expiry calendar, review packet attachments.

## Audit Notes

- This audit is stricter than a code-readiness scan. A feature with implemented code can still be `PARTIAL` or `BLOCKED` if the latest production Toss/console evidence is missing.
- B2B remains `PARTIAL`, not `BLOCKED`, because it can be scoped out of B2C release claims.
- Ads remains `PARTIAL`, not `BLOCKED`, if the app keeps graceful no-fill/fallback behavior and does not depend on ad revenue for v1 acceptance.
- IAP is now `PASS` for the latest paid success gate; keep product/SDK/Edge changes under regression control.
