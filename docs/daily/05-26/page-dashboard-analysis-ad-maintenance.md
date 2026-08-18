# /dashboard/analysis AD-001 Maintenance - 2026-05-26

Scope: AD-001, `/dashboard/analysis`, R1/R2 deletion-prevention notice.

## Trigger

Apps in Toss notified that these live rewarded ad groups for `taillog-app` have had no impressions for 23 days and may be deleted on 2026-06-02 unless shown before then:

- R1 `ait.v2.live.2f60e3d012a8440e` — `REWARD / 보상형-설문결과`
- R2 `ait.v2.live.b2cbe7034b754c70` — `REWARD / 보상형-분석대시보드`

## Code Check

- [x] Live IDs are present in `.env` and `src/lib/ads/config.ts` fallback constants.
- [x] R1 is wired in `/onboarding/survey-result` via `RewardedAdButton`.
- [x] R2 is wired in `/dashboard/analysis` via `RewardedAdButton`.
- [x] R2 reward path changed from no-op to opening `/coaching/result`, so the rewarded ad has a clear user-visible benefit.
- [x] Fullscreen ad `impression` callbacks now emit local `tracker.adImpression` diagnostics for R1/R2/R3/I1.

## Manual Exposure Runbook

- [x] Connect a Toss-supported device/account before 2026-06-02.
- [x] Launch a latest AIT build or live mini-app in actual Toss, not Metro-only dev host.
- [x] R1: enter `/onboarding/survey-result` with a free B2C account and tap `광고 보고 전체 분석 보기`; confirm the ad starts, not only no-fill/error.
- [x] R2: enter `/dashboard/analysis` with a free B2C account and tap the rewarded CTA `광고 보고 AI 코칭 열기`; confirm the ad starts, not only no-fill/error.
- [x] R2 reward flow: after rewarded ad close, confirm `/coaching/result` opens.
- [ ] Check Apps in Toss console after propagation and verify both ad groups have a fresh impression.

## Live Device Evidence

- Device: `R3CXB0QH0LY`
- Actual Toss package: `viva.republica.toss` 5.260.0
- Deployment: `019e53a0-3658-7c2e-9d58-68766b1a2890`
- R1 `/onboarding/survey-result`: survey result reached through the onboarding survey flow and the rewarded CTA opened `com.google.android.gms.ads.AdActivity`.
  - Evidence: `/tmp/taillog-qa/ads-r1-r2-20260526/r1-after-tap2.png`, `/tmp/taillog-qa/ads-r1-r2-20260526/r1-after-tap2.xml`, `/tmp/taillog-qa/ads-r1-r2-20260526/r1-logcat2.txt`
- R2 `/dashboard/analysis`: the account's active PRO subscription hid the free rewarded CTA, so `subscriptions.id=65487723-d68d-4683-8847-d683a7412ba0` was temporarily set `is_active=false`, the R2 CTA was tapped, and the rewarded ad opened `com.google.android.gms.ads.AdActivity`.
  - Evidence: `/tmp/taillog-qa/ads-r1-r2-20260526/r2-after-tap.png`, `/tmp/taillog-qa/ads-r1-r2-20260526/r2-after-tap.xml`, `/tmp/taillog-qa/ads-r1-r2-20260526/r2-logcat.txt`
- Restoration: the same subscription row was restored to `is_active=true` immediately after R2 validation.

## Latest AIT Upload And Reward Flow

- Build/upload skill: `toss-ait-build-ops`
- Build: `node_modules/.bin/ait build` PASS, RN 0.84.0 and 0.72.6 both `0 errors / 0 warnings`
- Deployment: `019e61bd-9356-72f9-99d7-03031aabec4b`
- Private URL: `intoss-private://taillog-app?_deploymentId=019e61bd-9356-72f9-99d7-03031aabec4b`
- Artifact: `taillog-app.ait`, SHA256 `6b487d0b13255801ebc4cbdbfd3a4a05c8e02d185abe5c59831c803c9684eea4`
- Bundle scan PASS: Supabase URL inline, DigitalOcean backend inline, HTTPS brand icon, local/data icon `0`, `ait-ad-test-*` `0`, live ad IDs `7`.
- Bundle code check: R2 block includes label `광고 보고 AI 코칭 열기` and `navigation.navigate("/coaching/result")`.
- Actual Toss verification: `viva.republica.toss` opened the new deployment at `/dashboard/analysis`; R2 CTA rendered as `광고 보고 AI 코칭 열기`.
- Reward flow PASS: R2 opened `com.google.android.gms.ads.AdActivity`; after closing the rewarded ad path, `/coaching/result` rendered with `AI 행동 진단`, `새 코칭 받기`, and `오늘 0/8회 사용`.
  - Evidence: `/tmp/taillog-qa/ait-r2-reward-20260526/r2-new-cta.png`, `/tmp/taillog-qa/ait-r2-reward-20260526/r2-new-ad-start.png`, `/tmp/taillog-qa/ait-r2-reward-20260526/r2-new-after-play-close.png`, `/tmp/taillog-qa/ait-r2-reward-20260526/r2-new-reward-flow-logcat.txt`
- Restoration: the temporary subscription change for CTA exposure was restored to `PRO_MONTHLY / is_active=true / next_billing_date=2026-06-10`.

## Remaining

- Apps in Toss console may lag device impressions; verify both R1/R2 ad groups show fresh impressions after propagation.
- If the Apps in Toss console still shows no fresh R2 impression after propagation, rerun the same new deployment URL and confirm the console time window.

## Board Sync

- `/dashboard/analysis` remains `QA`.
- `PAGE-UPGRADE-BOARD.md` updated to include `AD-001` and `last_updated=2026-05-26`.
