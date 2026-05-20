# 2026-05-15 Training Academy UX Softening

## Scope

- [x] UIUX-002, UIUX-003: Academy card tap no longer shows a pre-entry interstitial ad.
- [x] UI-TRAINING-DETAIL-001: Locked paid curriculum keeps title + Day 1 partial preview available before upgrade CTA.
- [x] AD-001: Training monetization friction reduced by moving upsell after entry instead of before content.
- [x] UI-001: Academy PRO banner tone softened from hard-sell to optional advanced-features messaging.
- [x] APP-001: DEV_LOCAL behavior aligned with device QA by removing training preview `__DEV__` bypasses.

## Files

- `src/pages/training/academy.tsx`
- `src/pages/training/detail.tsx`
- `src/components/features/training/CurriculumJourneyMap.tsx`
- `src/components/features/training/ProUpgradeBanner.tsx`
- `src/lib/data/__tests__/trainingAccess.test.ts`
- `docs/status/PROJECT-STATUS.md`
- `docs/status/PAGE-UPGRADE-BOARD.md`
- `docs/status/PRELAUNCH-QA-FEEDBACK.md`

## Validation

- [x] `npx tsc --noEmit`
- [x] `npx jest src/lib/data/__tests__/trainingAccess.test.ts --runInBand`
- [x] DEV_LOCAL Metro + FastAPI (`8765`) boot
- [x] `adb reverse tcp:8081 tcp:8081`
- [x] `adb reverse tcp:8765 tcp:8765`
- [x] Free user academy route loads in DEV_LOCAL (`/training/academy::screen`, Metro bundle evidence)
- [x] Free curriculum detail deep link -> direct detail entry (`curriculum_id=basic_obedience`)
- [x] Locked curriculum detail deep link -> direct detail entry + Day 1 partial preview (`curriculum_id=leash_manners`)
- [x] Locked preview device screenshot captured: `/tmp/taillog-leash-manners-detail.png`
- [x] Free curriculum device screenshot captured: `/tmp/taillog-basic-obedience-detail.png`
- [ ] Academy bottom banner reads as optional, not aggressive

## Notes

- DEV_LOCAL Metro evidence:
  - `packager-status:running`
  - `Running "shared"` with `scheme:"intoss://taillog-app/training/academy"`
  - `/training/academy::screen` analytics log observed
- Locked detail preview evidence:
  - Screenshot shows `1일차 일부를 먼저 볼 수 있어요`
  - CTA `PRO로 전체 훈련 열기` visible on device
- Pre-existing runtime noise:
  - pending IAP recovery still logs `verify-iap-order` 502 in DEV_LOCAL startup; unrelated to academy UX change

## Board Sync

- `/training/academy`: `QA`
- `/training/detail`: `QA`
