# /dashboard — FREE B1 banner persistence

Date: 2026-05-26 KST

## Scope
- [x] UIUX-001 `/dashboard`
- [x] AD-001 B1 dashboard banner behavior

## Finding
- [x] FREE users correctly pass the `/dashboard` B1 ad gate after entitlement resolution.
- [x] B1 disappeared after a successful impression because `BannerAd` defaults `collapseAfterImpression` to `true`.
- [x] Navigating away and returning to `/dashboard` could also hide B1 after the app-level `dailyLimit: 2` impression counter was reached.

## Change
- [x] `/dashboard` now renders B1 with `collapseAfterImpression={false}` so FREE users keep the banner visible after the first impression.
- [x] B1 now has no app-level daily cap (`Number.POSITIVE_INFINITY`) so FREE users remain eligible after dashboard re-entry; B2/B3 retain `dailyLimit: 2`.

## Validation
- [x] `git diff --check -- src/pages/dashboard/index.tsx` PASS
- [x] DEV_LOCAL free gate: QA subscription temporarily set `is_active=false`; `/dashboard` requested B1 with live ad group `ait.v2.live.e93e93f42ff840cb`.
- [x] DEV_LOCAL SDK result: B1 returned `ad_error`, so no visible banner proof was available in local dev mode. Evidence: `/tmp/taillog-b1-dev-free-08s.png`, `/tmp/taillog-b1-dev-free-16s.png`.
- [x] Component regression: `npx jest src/components/shared/ads/BannerAd.test.tsx --runInBand` PASS; `collapseAfterImpression={false}` keeps B1 mounted after impression.
- [x] Re-entry regression: `npx jest src/components/shared/ads/BannerAd.test.tsx src/lib/hooks/__tests__/useBannerAd.test.ts --runInBand` PASS; B1 remains eligible after repeated impressions while B2 still caps at 2.
- [x] AIT build/upload: deploymentId `019e634b-fe95-7d46-91ce-e3290bf84979`, artifact `taillog-app-019e634b-fe95-7d46-91ce-e3290bf84979.ait`, bundle scan PASS (`ait-ad-test` literal 0, B1 live id present, DevTools false, HTTPS brand icon).
- [x] Actual Toss Metro-off visual QA: FREE B1 banner remained visible at 10s and 22s after launch. Evidence: `/tmp/taillog-b1-ait-free-10s.png`, `/tmp/taillog-b1-ait-free-22s.png`.
- [x] DEV_LOCAL dashboard re-entry QA after B1 cap removal: dashboard -> training -> dashboard loop requested B1 again on each return. Evidence: `ad_requested` at 17:31:46, 17:33:01, 17:33:13 KST; local Ads SDK still returned `code=1007` as expected in dev mode.
- [x] AIT re-entry build/upload: deploymentId `019e6387-ace2-78d2-87cb-07bb0c2d166c`, artifact `taillog-app-019e6387-ace2-78d2-87cb-07bb0c2d166c.ait`, bundle scan PASS (`ait-ad-test` literal 0, B1 live id present, DevTools false, HTTPS brand icon).
- [x] Actual Toss Metro-off re-entry visual QA: FREE B1 banner remained visible on initial dashboard, after 1st training -> home return, and after 2nd training -> home return. Evidence: `/tmp/taillog-b1-ait-reentry-initial.png`, `/tmp/taillog-b1-ait-reentry-cycle1.png`, `/tmp/taillog-b1-ait-reentry-cycle2.png`.
- [x] QA subscription restored to original `PRO_MONTHLY is_active=true` after verification.
- [ ] `npx tsc --noEmit` blocked by existing unrelated `src/components/features/dashboard/ShareRewardCard.tsx(22,35)` unused `userId` error.

## Board Sync
- [x] `docs/status/PAGE-UPGRADE-BOARD.md` `/dashboard` remains `QA`, `last_updated=2026-05-26`.

## Risks
- [x] 실기기 AIT에서 FREE 계정으로 B1이 impression 이후에도 유지되는지 최종 시각 QA 완료.
- [x] 실기기 AIT에서 FREE 계정으로 다른 탭 이동 후 dashboard 복귀 시 B1이 계속 노출되는지 최종 시각 QA 완료.
