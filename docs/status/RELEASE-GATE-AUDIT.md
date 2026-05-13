# 배포 전 최종 게이트 감사표

> Last Updated: 2026-05-13 KST  
> Scope: AUTH-001, APP-001, UI-001, LOG-001, AI-001, PRO-INTAKE-001, IAP-001, MSG-001, AD-001, B2B-001, REG-001  
> Sources: `PROJECT-STATUS.md`, `11-FEATURE-PARITY-MATRIX.md`, `PROGRESS-CHECKLIST.md`, `MISSING-AND-UNIMPLEMENTED.md`, `PRELAUNCH-BLOCKER-SCAN.md`, `docs/ref/AIT-PUBLISHING-READINESS.md`

## Executive Verdict

| Verdict | Meaning | Release Decision |
|---|---|---|
| BLOCKED | 심사 제출 전 필수 증적이 아직 비어 있음 | 현재 상태로는 최종 배포 승인 요청을 진행하지 않는다 |

현재 빌드와 주요 구현은 상당 부분 준비되어 있지만, 최종 배포 게이트 기준에서는 `IAP 성공 시나리오`, `QR 테스트/콘솔 제출 활성화`, `fresh Toss Login authCode happy path`, `실기기 전체 주요 경로 스모크` 증적이 남아 있다. 따라서 “코드가 대체로 준비됨”과 “배포 게이트 통과”를 분리해 판단한다.

## Status Rubric

| Status | Definition |
|---|---|
| PASS | 구현과 최신 증적이 모두 있고, 배포 전 추가 차단 리스크가 낮음 |
| PARTIAL | 구현은 있으나 최신 실기기/콘솔/운영 증적 또는 일부 범위가 부족함 |
| BLOCKED | 심사 제출 또는 출시 결정 전에 반드시 해결해야 하는 미완료 항목이 있음 |

## Final Gate Table

| Area | Parity ID | Status | Evidence | Remaining Gap | Required Action |
|---|---|---|---|---|---|
| App launch / AIT | APP-001 | PARTIAL | Production Toss standalone AIT launch PASS, Metro off onboarding render evidence exists; final review AIT `019e0219-fcc0-7eaf-aa96-6853fd8a7553` built and submitted | Final submitted AIT after-review route sweep and real photo selection evidence are not complete | Latest AIT on real device: onboarding, dashboard, training, dog profile, settings, subscription route sweep |
| Toss Login | AUTH-001 | BLOCKED | Login bridge and Supabase auth bridge implemented; previous sandbox evidence exists | Fresh authCode happy-path HTTP 200 and session restore evidence missing | Use new authCode on real device, capture login success, session persistence, logout/relogin |
| Core UI visual QA | UI-001 | PARTIAL | Key pages have been upgraded and typechecked across prior work | Full real-device visual sweep and text-overlap pass are not complete | Run visual pass for managed routes and record screenshots or log evidence |
| Behavior logs | LOG-001 | PARTIAL | FastAPI log API and quick log flows implemented; backend tests previously pass | App/device E2E for create/read behavior log remains open | Create behavior log on device, verify dashboard/analysis refresh and backend row |
| AI coaching | AI-001 | PARTIAL | Deep coaching schema, training references, OpenAI fixture work, and Pro intake extensions implemented | App/device FastAPI coaching generation E2E final evidence missing | Generate coaching from latest AIT and verify 6-block result plus Pro detail fields |
| Pro intake | PRO-INTAKE-001 | PASS | Stage 3 Pro 상담지 expansion and profile summary marked Done in parity docs | No release-blocking gap known | Keep regression check in final route sweep |
| IAP | IAP-001 | BLOCKED | IAP products, proxy, failure/recovery UI, grant state machine, and backend paths implemented | Sandbox success final scenario still missing on latest AIT | Complete purchase success -> server grant -> `subscriptions.is_active=true` -> `completeProductGrant()` evidence |
| Smart Message | MSG-001 | PASS | `log_reminder` current-user HTTP 200 and `noti_history.success=true` evidence exists | Additional campaigns are not release-critical for v1 | Treat only `log_reminder` as v1 scope; keep other campaigns post-release |
| Ads | AD-001 | PARTIAL | Live adGroupId wiring and SDK calls verified; fallback path exists | Current environment returns `code=1007`; supported-environment render/no-fill final 판정 missing | Decide release scope: keep graceful fallback, then verify render/no-fill after supported environment opens |
| B2B trainer flow | B2B-001 | PARTIAL | Org setup, role, dog add/profile work exists; B2C release can proceed | 40-dog FlatList, share link, B2C regression, `verify_parent_phone_last4` final checks remain | Do not block B2C release; gate B2B claims separately |
| Registration / console | REG-001 | BLOCKED | App info, review candidate, mTLS real mode, bundle size and AI disclosure work are documented | QR test minimum 1, business category match, support channel check, cert expiry calendar, console callback final checks remain | Finish console checklist before review/final release |
| Security / privacy | REG-001 | PARTIAL | mTLS real mode documented for critical functions, privacy delegation text and AI disclosure exist | Secret rotation/token hygiene and expiry calendar remain operational risks | Rotate leaked Telegram bot token, register mTLS expiry calendar, confirm production env values |
| Performance / reliability | APP-001 | PARTIAL | Cached-first and startup markers improved; standalone first paint evidence exists | Railway sleep/cold-start and first backend call latency remain | Decide: keep-warm/paid no-sleep, or accept v1 risk with clear monitoring |
| Automation / AI data loop | AI-TRAIN-001 | PARTIAL | Telegram review material collection v1 and orchestrator cleanup implemented | Production bot token should be rotated; loop intentionally does not auto-publish curriculum | Keep as internal ops only until 50+ reviewed samples and separate improvement approval |

## Hard Blockers

| Priority | Blocker | Why It Blocks | Owner Action |
|---|---|---|---|
| P0 | IAP success final scenario | Paid feature cannot be trusted without successful purchase/grant/complete evidence | Run latest AIT purchase success test and capture DB + app evidence |
| P0 | QR test and console review activation | Apps in Toss review flow can be blocked if console test requirement is unmet | Run console QR test at least once and confirm review button state |
| P0 | Fresh Toss Login authCode happy path | New-user entry is the first release-critical path | Capture fresh authCode login 200, session creation, dashboard entry |
| P1 | Real-device core route sweep | Current proof is fragmented by feature/session | Sweep onboarding -> dashboard -> log -> analysis -> training -> coaching -> profile -> settings |
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

## Next 3

1. Run one strict real-device gate script: fresh login -> dashboard -> quick log -> analysis refresh -> training academy/detail -> coaching generate -> dog profile -> settings/subscription.
2. Finish monetization and console P0s: IAP success final, QR test, review button activation, business/support/cert expiry checks.
3. Decide release toggles before submission: B2B limited beta, Ads fallback-only, Smart Message `log_reminder` only, AI training loop internal-only.

## Audit Notes

- This audit is stricter than a code-readiness scan. A feature with implemented code can still be `PARTIAL` or `BLOCKED` if the latest production Toss/console evidence is missing.
- B2B remains `PARTIAL`, not `BLOCKED`, because it can be scoped out of B2C release claims.
- Ads remains `PARTIAL`, not `BLOCKED`, if the app keeps graceful no-fill/fallback behavior and does not depend on ad revenue for v1 acceptance.
- IAP is `BLOCKED` while paid entry remains visible because success evidence is required for user trust and review safety.
