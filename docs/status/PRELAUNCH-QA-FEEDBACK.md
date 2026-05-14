# Prelaunch QA Feedback

> Last Updated: 2026-05-14 KST
> Source: spouse-account latest QR QA, review request button enabled, dev button absent
> Release Decision: QA hotfix required before review submission. Keep the current QR/build as evidence, fix in development mode, then rebuild and re-QA.

## Confirmed Evidence

| Check | Status | Note |
|---|---|---|
| Latest QR opens app on spouse phone | PASS | Latest QR entry works; previous "outdated QR" concern is cleared for this device/account path |
| Review request button | PASS | Button is enabled in Apps in Toss console |
| Dev button | PASS | No dev button observed in current QA build |
| Current phase | QA | Do not submit review until P0/P1 feedback below is fixed and rechecked |

## Feedback Triage

| Priority | Feedback | User Impact | Fix Direction | Candidate Files | Acceptance Criteria |
|---|---|---|---|---|---|
| P0 | Quick log save shows "saving" but no clear "saved" state | User cannot tell whether data was saved and the flow feels stuck | Add explicit saved state, success toast/sheet, and deterministic next/back behavior after save | `src/pages/dashboard/quick-log.tsx`, `src/components/features/log/QuickLogForm.tsx`, `src/components/tds-ext/Toast.tsx`, `src/lib/hooks/useLogs.ts`, `src/lib/api/log.ts` | Save shows "저장 완료" or equivalent, then moves to the intended next screen or returns with refreshed data |
| P0 | App unexpectedly entered an admin/ops page during start | A normal user may be exposed to internal surfaces or confusing routes | Audit startup route guards, dev menu visibility, B2B/org redirect paths, and deep-link fallback | `src/_app.tsx`, `src/components/shared/DevMenu.tsx`, `src/lib/hooks/usePageGuard.ts`, `src/lib/hooks/pageGuardEvaluator.ts`, `src/lib/guards/authGuard.ts`, `src/lib/guards/featureGuard.ts`, `src/stores/OrgContext.tsx`, `src/router.gen.ts` | Non-admin B2C user cannot land on `/ops/*` or admin-like pages from app start or accidental tap |
| P1 | Quick log ad is too large | Main task is interrupted before the user finishes a core action | Reduce or remove quick-log in-flow card ad; prefer small bottom/non-blocking ad or no ad on save-critical path | `src/pages/dashboard/quick-log.tsx`, `src/types/ads.ts`, `src/components/shared/ads/BannerAd.tsx`, `src/lib/hooks/useBannerAd.ts` | Quick log primary content and save button are visible without a large fixed/interruptive ad |
| P1 | Ads are too central, fixed, and cover too much even after tap | Monetization feels more important than the app task | Move ads away from core action areas and cap height/frequency; avoid sticky half-screen placement | `src/types/ads.ts`, `src/components/shared/ads/BannerAd.tsx`, `src/components/shared/ads/InterstitialAd.tsx`, `src/pages/dashboard/quick-log.tsx`, `src/pages/training/academy.tsx`, `src/pages/training/detail.tsx` | Ads never obscure the main task, save button, or training content; frequency and size feel secondary |
| P1 | Basic/simple training should be free; Pro should start at problem behavior or advanced personalization | User expects common training to be available without heavy monetization | Split free basic curriculum from Pro problem-behavior/AI-personalized curriculum; reduce ads on free basics | `src/pages/training/academy.tsx`, `src/lib/data/published/runtime.ts`, `src/lib/data/recommendation/engine.ts`, `src/lib/data/mappings/behaviorToCurriculum.ts`, `src/lib/guards/featureGuard.ts`, `src/components/shared/ads/InterstitialAd.tsx` | Basic training opens directly or with light monetization; Pro positioning is reserved for problem behavior and deep personalization |
| P1 | Completed training text uses strikethrough | Completed content becomes hard to reread | Replace strikethrough with medal/badge/check state that preserves readability | `src/components/features/training/MissionChecklist.tsx`, `src/components/features/training/DaySummarySheet.tsx`, `src/components/features/training/CelebrationModal.tsx` | Completed steps remain fully readable and show a positive completion marker |
| P1 | "맞춤 훈련을 준비했어요" looks clickable but is not clickable | User wastes taps on a non-action surface | Either make the area tappable with a clear destination or visually reduce clickable affordance | `src/components/features/training/AIPersonalizedHero.tsx`, `src/pages/training/academy.tsx`, `src/components/features/training/RecommendedCurriculumCard.tsx` | Every card-like surface either responds to tap or clearly reads as informational |
| P1 | Bottom navigation icons do not match Toss mood | Visual style feels less polished and less native to Toss | Replace/normalize icon set to simple, calm, TDS-aligned icons; avoid emoji-like visuals | `src/components/shared/BottomNavBar.tsx`, `src/lib/data/iconSources.ts`, `src/assets/icons/*` | Bottom nav appears consistent with Toss-style minimal UI on device |
| P2 | Pro offer is too aggressive before users experience basic value | Conversion may drop because trust has not formed | Let users complete several useful free actions before Pro upsell; reserve Pro for real problem behavior, AI reports, and trainer-level detail | `src/lib/guards/featureGuard.ts`, `src/pages/training/academy.tsx`, `src/pages/coaching/result.tsx`, `src/pages/settings/subscription.tsx` | Free path gives immediate value; Pro appears at natural advanced moments |

## Proposed Hotfix Order

1. Fix P0 quick-log save confirmation/navigation and P0 admin/ops route leakage first.
2. Reduce quick-log and core-action ad intrusion before any new review submission.
3. Adjust training monetization boundaries: free basic training first, Pro for problem behavior and advanced AI.
4. Polish training completion state, AI hero affordance, and bottom navigation icons.
5. Rebuild AIT, rerun QR/device QA, then submit review.

## Development Mode Note

These fixes should be made in development mode first. The current QR/test build is useful as QA evidence, but it should not be modified in place. After the hotfix branch passes typecheck, app tests, backend tests where relevant, and device QA, create a new AIT build and retest the review path.
