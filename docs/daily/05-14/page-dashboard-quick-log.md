# 2026-05-14 Prelaunch QA Hotfix

## Scope

- [x] LOG-001: Quick log save now shows a completion Toast and returns to `/dashboard` after save.
- [x] AD-001: Quick-log in-flow ad removed; training interstitial I1 is capped at one show per user per day and skipped for free/beginner training.
- [x] UI-TRAINING-PERSONALIZATION-001: AI hero is tappable and routes to the recommended training.
- [x] UI-TRAINING-DETAIL-001: Locked Pro curriculum shows a limited Day 1 preview before CTA.
- [x] UIUX-005: Mission checklist keeps the check icon and removes completed-text strikethrough.
- [x] B2B-001: `/parent/reports` now uses the B2B-only guard; B2C accidental entry redirects to `/dashboard`.
- [x] UI-001: Imagen blue icon system applied to all `iconSources.ts` assets; dog imagery is limited to `ic-dog`, `ic-paw`, stage/empty illustration contexts.
- [x] APP-001: New local AIT build completed.
- [x] APP-001: Latest AIT build with the QA hotfixes was deployed via `AIT_DEPLOY_API_KEY`.
- [ ] APP-001: Spouse-phone QR real-device QA remains pending after deploy.

## Files

- `src/pages/dashboard/quick-log.tsx`
- `src/types/ads.ts`
- `src/lib/data/trainingAccess.ts`
- `src/lib/data/__tests__/trainingAccess.test.ts`
- `src/pages/training/academy.tsx`
- `src/pages/training/detail.tsx`
- `src/components/features/training/AIPersonalizedHero.tsx`
- `src/components/features/training/CurriculumJourneyMap.tsx`
- `src/components/features/training/CurriculumShowcaseCard.tsx`
- `src/components/features/training/MissionChecklist.tsx`
- `src/pages/parent/reports.tsx`
- `src/lib/guards/__tests__/roleGuard.test.ts`
- `src/assets/icons/*.png`
- `src/lib/data/iconSources.ts`
- `src/assets/icons/generated/imagen-system-blue-contact-sheet-20260514.png`
- `src/assets/icons/generated/imagen-system-blue-applied-preview-20260514.png`

## Validation

- [x] `npx jest src/lib/data/__tests__/trainingAccess.test.ts src/lib/guards/__tests__/roleGuard.test.ts --runInBand`
- [x] `npm run typecheck`
- [x] `npm run test:app -- --runInBand --passWithNoTests`
- [x] `git diff --check`
- [x] `node_modules/.bin/ait build` -> `deploymentId=019e2520-b4ac-778b-8182-40c0718038dc`, artifact `taillog-app-019e2520-b4ac-778b-8182-40c0718038dc.ait`, SHA256 `bc2c3aefb30a651215f612b8dc0622cba9e3b628b28005191796715032aeadd0`
- [x] Latest rebuild/deploy after dashboard ad-collapse hotfix -> `deploymentId=019e2553-ea81-7701-baac-73589c8e2ab5`, artifact `taillog-app-019e2553-ea81-7701-baac-73589c8e2ab5.ait`, SHA256 `2e5f2de88691371ad46106e8952cf237962f99847a173152c00b53cba0949a9c`
- [x] Bundle scan: Supabase fallback present, HTTPS `brandIcon` present, local/data URI `brandIcon` absent, `isDevToolsEnabled() -> return false`, `ait-ad-test-*` count `0`
- [x] `node_modules/.bin/ait deploy --api-key "$AIT_DEPLOY_API_KEY" --location ./taillog-app.ait --scheme-only` -> `intoss-private://taillog-app?_deploymentId=019e2553-ea81-7701-baac-73589c8e2ab5`
- [ ] Spouse-phone QR real-device QA

## Board Sync

- `/dashboard/quick-log`: `QA`
- `/training/academy`: `QA`
- `/training/detail`: `QA`
- `/parent/reports`: `QA`
