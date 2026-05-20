# 2026-05-15 Subscription Pending Order Recovery Hardening

## Scope

- [x] IAP-001: Legacy/terminal-failed pending orders no longer re-enter `verify-iap-order` on every app start.
- [x] IAP-001: Unknown old test SKU (`sku_106`) and already failed `NOT_FOUND/FAILED/REFUNDED` orders are dismissed from SDK pending recovery.
- [x] IAP-001: Regression tests added for stale pending dismissal and normal partial recovery.

## Files

- `src/lib/api/iap.ts`
- `src/lib/api/__tests__/iap.test.ts`
- `docs/status/PROJECT-STATUS.md`
- `docs/status/PAGE-UPGRADE-BOARD.md`

## Validation

- [x] `npx jest src/lib/api/__tests__/iap.test.ts --runInBand --silent`
- [x] `npx tsc --noEmit`
- [x] Live DB 확인: legacy pending order `550e8400-e29b-41d4-a716-446655440000 / sku_106` already persisted as `NOT_FOUND / grant_failed`
- [x] Live Edge 재호출 확인: same order now returns `200 + grant_failed`, so repeated startup noise was stale pending recovery rather than a permanently broken edge function
- [x] DEV_LOCAL cold launch #1: `verify-iap-order 502` 재발 없이 `dismissing stale pending order ... sku_106`
- [x] DEV_LOCAL cold launch #2: SDK pending `count: 1` is still returned, but recovery no longer re-verifies and logs `stale pending order suppressed`
- [x] DB drift check: legacy `sku_106` rows exist only under old mock user `mock_stable_user_001` and not under the current active org-owner account
- [x] New AIT build: `deploymentId=019e2adc-e675-7951-8a8c-9231f7e2ad2d`, artifact SHA256 `c32f38644ab2e1d7550791bcf8d6918284714b1acb547f266266126b5918ebb4`
- [x] Bundle scan PASS: Supabase URL present, `brandIcon` uses Toss HTTPS URL, `ait-ad-test-*` count `0`, `isDevToolsEnabled() -> return false`
- [x] AIT upload PASS: `intoss-private://taillog-app?_deploymentId=019e2adc-e675-7951-8a8c-9231f7e2ad2d`

## Notes

- Startup recovery still runs, but it now short-circuits two noisy cases before re-verifying:
  - unknown non-catalog product IDs
  - known product IDs whose latest `toss_orders` row is already terminal (`grant_failed/refunded` + `NOT_FOUND/FAILED/REFUNDED`)
- The concrete noisy user was `mock_stable_user_001` and the stale order had already been recorded in `public.toss_orders`, so retrying it again at every DEV_LOCAL startup had no upside.
- `IAP.completeProductGrant()` alone did not clear the SDK pending list for this fake legacy order, so a local suppression marker was added as a second line of defense.
- Uploaded artifact snapshot preserved as `taillog-app-019e2adc-e675-7951-8a8c-9231f7e2ad2d.ait`.

## Board Sync

- `/settings/subscription`: `Done`
