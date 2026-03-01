# Skill Doc Matrix

Decision-complete mapping between page skills, code touch points, and required references.

| page_skill | target_route | primary_code_paths | required_docs | optional_docs | feature_skills | acceptance_checks |
|---|---|---|---|---|---|---|
| `page-login-upgrade` | `/login` | `src/pages/login.tsx`, `src/lib/api/auth.ts`, `src/lib/hooks/useAuth.ts` | `docs/status/PROJECT-STATUS.md` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | `feature-form-validation-and-submit`, `feature-error-and-retry-state` | auth guard pass, error states clear |
| `page-onboarding-welcome-upgrade` | `/onboarding/welcome` | `src/pages/onboarding/welcome.tsx` | `docs/status/PROJECT-STATUS.md` | `docs/ref/PRD-TailLog-Toss.md` | `feature-navigation-and-gesture`, `feature-analytics-and-tracking` | first load UX, CTA tracking |
| `page-onboarding-survey-upgrade` | `/onboarding/survey` | `src/pages/onboarding/survey.tsx`, `src/components/features/survey/*` | `docs/status/PROJECT-STATUS.md`, `docs/status/MISSING-AND-UNIMPLEMENTED.md` | `docs/ref/PRD-TailLog-Toss.md` | `feature-form-validation-and-submit`, `feature-data-binding-and-loading` | field validation, submit payload |
| `page-onboarding-survey-result-upgrade` | `/onboarding/survey-result` | `src/pages/onboarding/survey-result.tsx` | `docs/status/PROJECT-STATUS.md` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | `feature-ui-empty-and-skeleton`, `feature-analytics-and-tracking` | loading/empty/final state parity |
| `page-onboarding-notification-upgrade` | `/onboarding/notification` | `src/pages/onboarding/notification.tsx`, `src/lib/api/settings.ts` | `docs/status/PROJECT-STATUS.md` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | `feature-form-validation-and-submit`, `feature-error-and-retry-state` | permission flow, save outcome |
| `page-dashboard-upgrade` | `/dashboard` | `src/pages/dashboard/index.tsx`, `src/components/features/dashboard/*` | `docs/status/PROJECT-STATUS.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | `docs/status/MISSING-AND-UNIMPLEMENTED.md` | `feature-ui-empty-and-skeleton`, `feature-data-binding-and-loading` | no-data structure fixed |
| `page-dashboard-quick-log-upgrade` | `/dashboard/quick-log` | `src/pages/dashboard/quick-log.tsx`, `src/components/features/log/*` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | `docs/status/PROJECT-STATUS.md` | `feature-form-validation-and-submit`, `feature-analytics-and-tracking` | quick log submit + tracking |
| `page-dashboard-analysis-upgrade` | `/dashboard/analysis` | `src/pages/dashboard/analysis.tsx`, `src/lib/charts/*` | `docs/status/PROJECT-STATUS.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | `docs/status/MISSING-AND-UNIMPLEMENTED.md` | `feature-ui-empty-and-skeleton`, `feature-data-binding-and-loading` | chart states and data sync |
| `page-coaching-result-upgrade` | `/coaching/result` | `src/pages/coaching/result.tsx`, `src/components/features/coaching/*` | `docs/status/PROJECT-STATUS.md`, `docs/status/MISSING-AND-UNIMPLEMENTED.md` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | `feature-ui-empty-and-skeleton`, `feature-data-binding-and-loading` | block completeness + fallback |
| `page-training-academy-upgrade` | `/training/academy` | `src/pages/training/academy.tsx`, `src/components/features/training/*` | `docs/status/PROJECT-STATUS.md` | `docs/ref/PRD-TailLog-Toss.md` | `feature-navigation-and-gesture`, `feature-data-binding-and-loading` | curriculum visibility |
| `page-training-detail-upgrade` | `/training/detail` | `src/pages/training/detail.tsx`, `src/components/features/training/*` | `docs/status/PROJECT-STATUS.md` | `docs/status/MISSING-AND-UNIMPLEMENTED.md` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | detail data path verified |
| `page-dog-profile-upgrade` | `/dog/profile` | `src/pages/dog/profile.tsx`, `src/components/features/dog/*` | `docs/status/PROJECT-STATUS.md` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | `feature-data-binding-and-loading`, `feature-form-validation-and-submit` | real data rendering |
| `page-dog-add-upgrade` | `/dog/add` | `src/pages/dog/add.tsx` | `docs/status/PROJECT-STATUS.md` | `docs/ref/PRD-TailLog-Toss.md` | `feature-form-validation-and-submit`, `feature-error-and-retry-state` | create flow result |
| `page-dog-switcher-upgrade` | `/dog/switcher` | `src/pages/dog/switcher.tsx`, `src/components/features/dog/*` | `docs/status/PROJECT-STATUS.md` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | `feature-navigation-and-gesture`, `feature-data-binding-and-loading` | switch action + active dog sync |
| `page-settings-upgrade` | `/settings` | `src/pages/settings/index.tsx` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | `docs/status/PROJECT-STATUS.md` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | settings save + refetch |
| `page-settings-subscription-upgrade` | `/settings/subscription` | `src/pages/settings/subscription.tsx`, `src/lib/hooks/useSubscription.ts` | `docs/status/11-FEATURE-PARITY-MATRIX.md`, `docs/status/MISSING-AND-UNIMPLEMENTED.md` | `docs/ref/PRD-TailLog-Toss.md` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | IAP state and recovery |
| `page-legal-terms-upgrade` | `/legal/terms` | `src/pages/legal/terms.tsx` | `docs/ref/PRD-TailLog-Toss.md` | `docs/status/PROJECT-STATUS.md` | `feature-navigation-and-gesture` | legal text and scroll behavior |
| `page-legal-privacy-upgrade` | `/legal/privacy` | `src/pages/legal/privacy.tsx` | `docs/ref/PRD-TailLog-Toss.md` | `docs/status/PROJECT-STATUS.md` | `feature-navigation-and-gesture` | legal text and links |
| `page-ops-today-upgrade` | `/ops/today` | `src/pages/ops/today.tsx`, `src/components/features/ops/*`, `src/lib/api/org.ts` | `docs/ref/SCHEMA-B2B.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | `docs/status/PROJECT-STATUS.md` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | org today stats and list |
| `page-ops-settings-upgrade` | `/ops/settings` | `src/pages/ops/settings.tsx`, `src/components/features/ops/*` | `docs/ref/SCHEMA-B2B.md` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | `feature-form-validation-and-submit`, `feature-data-binding-and-loading` | org settings save |
| `page-parent-reports-upgrade` | `/parent/reports` | `src/pages/parent/reports.tsx`, `src/components/features/parent/*`, `src/lib/api/report.ts` | `docs/ref/SCHEMA-B2B.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | `docs/status/PROJECT-STATUS.md` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | report fetch/render/reaction |

## Global Rules

- Page skill root: `.claude/skills/page-skills/page/`
- Feature skill root: `.claude/skills/page-skills/feature/`
- Load one page skill + up to two feature skills.
- Keep context inputs narrow to route-specific files and docs.
- Update `PAGE-UPGRADE-BOARD.md` status and date at task end.
