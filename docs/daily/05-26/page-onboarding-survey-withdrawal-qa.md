# Page Onboarding Survey + Withdrawal QA

Date: 2026-05-26 KST
Scope: AUTH-001, APP-001, UIUX-004

## Changes

- [x] `withdraw-user` now clears older-schema user references before deleting `public.users`, covering B2B owner/trainer/report references that can block account deletion.
- [x] `withdraw-user` now also clears `pii_access_log.org_dog_id` for B2B org-dog rows owned by or parent-linked to the withdrawing user, preventing org_dogs cascade FK blocks.
- [x] `withdraw-user` is now explicitly configured with `verify_jwt=false` so the function can perform its own ES256/Admin API JWT verification instead of being blocked by the Supabase gateway.
- [x] Client withdrawal refreshes a missing session token once and clears local survey draft/result caches after successful deletion.
- [x] Legacy `/onboarding/survey` now autosaves a user-scoped draft and restores partial survey input after app/process interruption.
- [x] Legacy `/onboarding/survey` final submit now uses a submit latch and disabled CTA state to prevent duplicate dog creation on rapid taps.
- [x] `/onboarding/survey-result` now restores the completed survey from local cache before falling back to `/dashboard` or `/onboarding/survey`.

## Validation

- [x] `npx jest supabase/functions/__tests__/withdraw-user.test.ts --runInBand` PASS (16/16).
- [x] `git diff --check` PASS for touched files.
- [x] `npx tsc --noEmit --pretty false` reached only pre-existing `ShareRewardCard.tsx(22,35)` unused `userId` error; no new errors in touched files.
- [x] `supabase functions deploy withdraw-user --no-verify-jwt` PASS on project `gxvtgrcqkbdibkyeqyil`; `withdraw-user` ACTIVE v11 at `2026-05-26 07:00:33 UTC`.
- [x] Unauthenticated POST smoke now reaches function code and returns app envelope `UNAUTHORIZED` instead of gateway `UNAUTHORIZED_NO_AUTH_HEADER`.
- [x] `adb devices` PASS: `R3CXB0QH0LY`.
- [x] `adb reverse tcp:8765 tcp:8765 && adb reverse tcp:8081 tcp:8081 && adb reverse tcp:5173 tcp:5173` PASS.
- [x] DEV_LOCAL sandbox launch smoke: `intoss://taillog-app/onboarding/survey` reached `GraniteActivity` and logged `Running "shared"` with the survey scheme.
- [x] DEV_LOCAL survey required-field fallback PASS: `/onboarding/survey` rendered step `1/4`, empty required inputs kept `다음` disabled.
- [x] DEV_LOCAL draft restore PASS: entered `DraftDog`, force-stopped the app, relaunched the survey deep link, and UIAutomator restored `text="DraftDog"` with `다음` still disabled until required fields are completed.
- [x] `node_modules/.bin/ait build` PASS: created `taillog-app.ait` with deploymentId `019e62a6-02f8-74c1-9a42-2cff6e029b37`.
- [x] Post-loop validation fix build PASS: `node_modules/.bin/ait build` created `taillog-app.ait` with deploymentId `019e62d6-acfb-7dcd-a250-c3e3f87a83ba`.
- [x] Submit-lock fix AIT build/deploy PASS: deploymentId `019e6307-4cd4-7d2d-b493-815b57e6368f`.
- [x] AIT bundle scan PASS: Supabase URL targets `gxvtgrcqkbdibkyeqyil`, brand icon is HTTPS, no local `./src` brand icon path, `isDevToolsEnabled()` returns `false`.
- [x] `node_modules/.bin/ait deploy --scheme-only` PASS: `intoss-private://taillog-app?_deploymentId=019e62a6-02f8-74c1-9a42-2cff6e029b37`.
- [x] Post-loop validation fix deploy PASS: `intoss-private://taillog-app?_deploymentId=019e62d6-acfb-7dcd-a250-c3e3f87a83ba`.
- [x] Actual Toss private URL launch PASS: `viva.republica.toss` opened the deployed AIT bundle and logged `Running "shared"` with deploymentId `019e62a6-02f8-74c1-9a42-2cff6e029b37`.
- [x] AIT survey route launch PASS: `intoss-private://taillog-app/onboarding/survey?_deploymentId=019e62a6-02f8-74c1-9a42-2cff6e029b37` rendered `반려견 프로필` step `1/4`.
- [x] AIT required-field fallback PASS: empty required fields kept the `다음` button `enabled="false"`.
- [x] AIT draft restore PASS: entered `AITDog`, force-stopped `viva.republica.toss`, relaunched the survey private URL, and UIAutomator restored `text="AITDog"` while keeping `다음` disabled.
- [x] Full visual survey-variable sweep baseline complete for required-field and draft-interruption variables on unlocked real device.
- [x] Real account withdrawal E2E PASS with disposable test account: settings `회원탈퇴` → native confirm `탈퇴하기` → no failure alert → `/onboarding/welcome` rendered with `토스로 시작하기`.
- [x] Post-withdraw auth guard PASS: relaunching AIT private URLs for `/settings` and `/dashboard` both rendered the logged-out welcome screen instead of protected content.
- [x] AIT fresh login recovery PASS on deploymentId `019e62d6-acfb-7dcd-a250-c3e3f87a83ba`: `토스로 시작하기` → `login-with-toss success` user `fbf45f6c-e239-4dd5-9767-ceb861755a10` → `/onboarding/survey` step `1/4`.
- [x] AIT photo-cancel PASS: Android Photo Picker opened and Back returned to survey step `1/4` without crash or route reset.
- [x] AIT submit-network-failure PASS: Wi-Fi/data disabled at final submit showed `저장 실패` alert, preserved editable Step4 state, and created no `AITLoop526` dog row before retry.
- [x] AIT submit-double-tap fix PASS: pre-fix deployment created duplicate `AITLoop526` dog rows (2); fixed deployment `019e6307-4cd4-7d2d-b493-815b57e6368f` produced exactly one `AITTap526` row after rapid double tap.
- [x] B2B FK withdrawal PASS: synthetic user `aca30b05-1d18-45f6-bc2c-50c5b11114c9` had 1 row each across users/dogs/org owner/org_members/org_dogs/behavior_logs/pii_access_log/dog_assignments/daily_reports/parent_interactions/org_subscriptions/ai_cost_usage_org before withdrawal, `withdraw-user` returned 200, all user references were 0 afterward, and Auth Admin returned 404.

## Variable Matrix For Device Sweep

- [ ] Missing survey result context: complete survey, force-stop/relaunch into `/onboarding/survey-result`, expect cached result recovery.
- [x] Incomplete survey draft: fill step 1/2, force-stop/relaunch into `/onboarding/survey`, expect draft restored.
- [x] Empty required fields: name/breed/age and behavior/temperament omitted, expect CTA disabled and validation copy.
- [x] Optional omissions: no health notes, no custom trigger, no profile image, expect save succeeds with defaults.
- [x] Session edge: post-withdraw local auth state cleared; protected route relaunches require login again.
- [x] FK edge: account with B2B owner/trainer/report rows, expect `withdraw-user` succeeds after cleanup.

## Expanded Survey Variable Matrix

### Automatable Without Logged-In Account

- [x] Logged-out survey guard: AIT private deep link `/onboarding/survey` after withdrawal redirects to the logged-out welcome screen instead of exposing survey content.
- [x] S1-restored-partial: DEV_LOCAL restored prior partial draft `DraftDog`; expect `반려견 프로필`, `1/4`, and `다음` disabled with missing age/breed.
- [x] S1-age-no-breed: select age without breed; expect `다음` disabled.
- [x] S1-breed-free-text: enter non-list breed/free-text `MixLoop`; expect value accepted and `다음` enabled once name/age/breed are present.
- [ ] S1-sex-neuter-toggle: toggle `여아` and neutered switch; expect no crash, no route reset, draft survives relaunch.
- [x] S1-scroll-boundary: scroll to 생활 환경 and back; expect bottom CTA remains visible/fixed and no text overlap.
- [x] S1-photo-cancel: tap photo picker then cancel/deny; expect no crash and survey remains editable.
- [x] Draft-force-stop: after partial S1 input, force-stop `viva.republica.toss`, relaunch same private URL, expect draft restored.
- [x] Hardware-back-S1: Android back on step 1; expect route falls back to welcome/onBack without crash.

### Requires Step Progression

- [x] S2-empty: valid S1 then step 2 with no behavior; expect `고민되는 행동을 하나 이상 선택해주세요` and `다음` disabled. DEV_LOCAL first found the copy hidden below the nested step content; fixed by rendering the validation banner above the step body, then rechecked visible copy.
- [x] S2-max-3: select 4 behavior chips; expect max 3 effective selections, no overflow or crash. DEV_LOCAL confirmed route stability and CTA enable after behavior selection.
- [ ] S2-other-empty: select `직접 입력(기타)` with empty description; expect step validity if behavior selected, no text input crash.
- [ ] S2-other-long: enter long Korean text in other behavior/custom trigger; expect no layout overlap and draft restore.
- [x] S2-trigger-optional: select behavior but no trigger/custom trigger; expect next allowed.
- [ ] S2-severity-change: change severity 1/3/5; expect selection state stable after draft restore.
- [x] S3-empty: valid S1+S2 then step 3 with no energy/social; expect `기질 점수를 모두 선택해주세요` and `다음` disabled. DEV_LOCAL first found the copy hidden below the nested step content; fixed by rendering the validation banner above the step body, then rechecked visible copy.
- [ ] S3-partial-rating: energy only or social only; expect disabled until both selected.
- [x] S3-energy-social-rating: selecting visible energy/social ratings enables `다음`.
- [ ] S3-custom-command: add command, delete custom chip; expect no duplicate/overflow crash.
- [ ] S3-switches: toggle trainer-help and notification consent; expect state survives draft restore.
- [x] S4-optional-all-empty: leave health notes empty and switches off; expect `완료` enabled.
- [ ] S4-ratings-and-options: noise rating + visitor frequency changes; expect stable submit state.
- [x] Hardware-back-step-stack: on steps 2/3/4, Android back decrements step instead of leaving route.

### Requires Logged-In Test Account

- [x] Submit-success-minimal: complete required fields only; expect dog creation, onboarding complete, and `/onboarding/survey-result`.
- [x] Result-cache-reopen: after submit, force-stop and deep link `/onboarding/survey-result`; expect completed survey cache restores result.
- [x] Submit-optional-omissions: no photo, no health notes, no trigger, no command; expect save succeeds with defaults.
- [x] Submit-network-failure: block backend/network during final submit; expect `저장 실패` alert and editable state preserved.
- [x] Submit-double-tap: double tap `완료`; expect no duplicate dog rows or duplicate navigation.
- [ ] Logout/withdraw-cleanup: after logout/withdraw, relaunch `/onboarding/survey`; expect prior user-scoped draft/result cache not visible.

## Loop Evidence 2026-05-26

- AIT logged-out guard loop: `/onboarding/survey` private deep link after withdrawal rendered welcome/login, confirming survey is not exposed while logged out.
- DEV_LOCAL loop2: S1 restored draft, disabled CTA, scroll-boundary checks passed; initial breed coordinate misses caused false-negative follow-ons.
- DEV_LOCAL loop3: free-text breed `MixLoop`, Step2 entry, Step2 disabled CTA, and Step2 hardware-back recovery passed; Step2 validation copy was not visible.
- DEV_LOCAL loop4: Step2 4-chip tap stability, Step3 entry, Step3 disabled CTA, and Step3 hardware-back recovery passed; Step3 validation copy was not visible.
- DEV_LOCAL loop5: Step3 rating enablement, Step4 optional-empty completion, and Step4 hardware-back recovery passed.
- DEV_LOCAL loop6: minimal submit reached `/onboarding/survey-result`.
- DEV_LOCAL loop7: force-stop and deep link `/onboarding/survey-result` restored cached result with `DraftDog`.
- DEV_LOCAL validation-fix loop: Step1 required-field copy, Step2 empty behavior copy, and Step3 empty temperament copy are visible in UIAutomator XML after moving the validation banner above the step content.
- AIT fresh-login replay: deploymentId `019e62d6-acfb-7dcd-a250-c3e3f87a83ba` recovered the real Toss login path and rendered `/onboarding/survey`.
- AIT variable replay: photo-cancel, Submit-network-failure, and Submit-double-tap were exercised on real device; submit-lock fix was deployed as `019e6307-4cd4-7d2d-b493-815b57e6368f`.
- B2B FK withdrawal replay: first pass found `pii_access_log.org_dog_id` blocking `org_dogs` cascade; function v11 fixed it, retry passed, and a fresh full-FK account also passed.
- Evidence files: `/tmp/taillog-survey-loop2-*`, `/tmp/taillog-survey-loop3-*`, `/tmp/taillog-survey-loop4-*`, `/tmp/taillog-survey-loop5-*`, `/tmp/taillog-survey-loop6-*`, `/tmp/taillog-survey-loop7-*`.
- Validation-fix evidence files: `/tmp/taillog-survey-validation-fix-report.txt`, `/tmp/taillog-survey-validation-fix2-report.txt`, `/tmp/taillog-survey-validation-fix3-report.txt`.
- AIT evidence files: `/tmp/taillog-ait-photo-picker-open.xml`, `/tmp/taillog-ait-photo-cancel-return.xml`, `/tmp/taillog-ait-submit-network-failure.xml`, `/tmp/taillog-ait-submit-network-restored.xml`, `/tmp/taillog-ait-submit-double-tap-result.xml`, `/tmp/taillog-ait-fixed-doubletap2-result.xml`, `/tmp/taillog-ait-submit-counts-before-cleanup.json`.
- B2B FK evidence files: `/tmp/taillog-b2b-withdraw-fk-retry-report.json`, `/tmp/taillog-b2b-withdraw-fk-full-pass-report.json`.

## Findings

- [x] Fixed during loop: Step2 empty validation copy was not visible even though `다음` was disabled. Expected copy `고민되는 행동을 하나 이상 선택해주세요` is now visible in DEV_LOCAL after the `SurveyContainer` banner placement fix.
- [x] Fixed during loop: Step3 empty validation copy was not visible even though `다음` was disabled. Expected copy `기질 점수를 모두 선택해주세요` is now visible in DEV_LOCAL after the `SurveyContainer` banner placement fix.
- [x] Fixed during loop: Actual AIT fresh login recovered on deploymentId `019e62d6-acfb-7dcd-a250-c3e3f87a83ba`; login-with-toss succeeded and survey rendered.
- [x] Fixed during loop: Rapid final submit could create duplicate dog rows (`AITLoop526` count 2). Submit latch + CTA disabled state now limits fixed-deployment double tap to one row (`AITTap526` count 1).
- [x] Fixed during loop: B2B withdrawal could be blocked by `pii_access_log.org_dog_id` referencing org_dogs during dog cascade. `withdraw-user` v11 clears those references before public/auth deletion.

## Result

Board sync: `/onboarding/survey` remains `Done`; `/onboarding/survey-result` remains `Done`; real-device DEV_LOCAL and AIT evidence collected for required-field fallback, interrupted survey draft restore, minimal submit, result-cache restore, validation-copy fallback, photo cancel, network failure, double-tap submit locking, disposable account withdrawal E2E, and B2B FK withdrawal cleanup.
