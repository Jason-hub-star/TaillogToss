# /dashboard QA Sync

- [x] UIUX-001: Recent-record header spacing tightened so the streak card and recent records read as one continuous dashboard section.
- [x] AD-001: Banner ad wrapper now collapses on no-fill/render failure, preventing unsupported local ad rendering from leaving a blank 96px gap.
- [x] AD-001: AIT banner ads also collapse shortly after `onAdImpression`, so a viewed banner does not keep occupying the dashboard content area.
- [x] UI-001: Local real-device QA captured `/dashboard` with the streak card followed immediately by `최근 기록`.

Validation:
- `npm run typecheck`
- `npx jest src/lib/api/__tests__/auth.test.ts src/lib/guards/__tests__/roleGuard.test.ts --runInBand`
- `npm run test:app -- --runInBand --passWithNoTests`
- `git diff --check`
- Local device: `intoss://taillog-app/dashboard` screenshot saved at `/tmp/taillog-dashboard-spacing.png`.
- Latest AIT deploy: `deploymentId=019e2553-ea81-7701-baac-73589c8e2ab5`.

Board Sync:
- `/dashboard`: `QA`
