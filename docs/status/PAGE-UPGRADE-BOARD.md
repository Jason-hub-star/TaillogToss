# Page Upgrade Board

Source of truth for page-by-page UI/UX and feature hardening.
Route list is synced from `src/components/shared/DevMenu.tsx`.

| route | label | group | priority | status | owner | parity_ids | page_skill | support_skills | must_read_docs | last_updated |
|---|---|---|---|---|---|---|---|---|---|---|
| `/onboarding/stage1-form` | Stage 1 설문 (필수) | Onboarding | P0 | Done | claude | APP-001 | — | `feature-form-validation-and-submit` | `docs/status/PROJECT-STATUS.md` | 2026-05-01 |
| `/onboarding/stage2-form` | Stage 2 설문 (소프트 인터셉트) | Onboarding | P0 | Done | claude | APP-001 | — | `feature-form-validation-and-submit` | `docs/status/PROJECT-STATUS.md` | 2026-05-01 |
| `/onboarding/stage3-form` | Stage 3 설문 (Pro 유도) | Onboarding | P1 | Done | claude | APP-001 | — | `feature-form-validation-and-submit` | `docs/status/PROJECT-STATUS.md` | 2026-05-01 |
| `/onboarding/welcome` | Welcome (로그인 통합) | Onboarding | P0 | Done | claude | AUTH-001, UIUX-004 | `page-onboarding-welcome-upgrade` | `feature-navigation-and-gesture`, `feature-analytics-and-tracking` | `docs/status/PROJECT-STATUS.md` | 2026-04-20 |
| `/onboarding/survey` | Survey | Onboarding | P0 | Done | claude | UIUX-004 | `page-onboarding-survey-upgrade` | `feature-form-validation-and-submit`, `feature-data-binding-and-loading` | `docs/status/PROJECT-STATUS.md`, `docs/status/MISSING-AND-UNIMPLEMENTED.md` | 2026-03-02 |
| `/onboarding/survey-result` | Survey Result | Onboarding | P1 | Done | claude | UI-001 | `page-onboarding-survey-result-upgrade` | `feature-ui-empty-and-skeleton`, `feature-analytics-and-tracking` | `docs/status/PROJECT-STATUS.md` | 2026-04-02 |
| `/onboarding/notification` | Notification | Onboarding | P1 | Done | claude | APP-001 | `page-onboarding-notification-upgrade` | `feature-form-validation-and-submit`, `feature-error-and-retry-state` | `docs/status/PROJECT-STATUS.md` | 2026-04-20 |
| `/dashboard` | Dashboard | Main | P1 | Done | claude | UIUX-001, B2B-001, UIUX-006 | `page-dashboard-upgrade` | `feature-ui-empty-and-skeleton`, `feature-data-binding-and-loading` | `docs/status/PROJECT-STATUS.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | 2026-04-28 |
| `/dashboard/quick-log` | Quick Log | Main | P1 | Done | claude | LOG-001 | `page-dashboard-quick-log-upgrade` | `feature-form-validation-and-submit`, `feature-analytics-and-tracking` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | 2026-05-01 |
| `/dashboard/analysis` | Analysis | Main | P0 | Done | claude | UIUX-001, UIUX-005 | `page-dashboard-analysis-upgrade` | `feature-ui-empty-and-skeleton`, `feature-data-binding-and-loading` | `docs/status/PROJECT-STATUS.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | 2026-04-28 |
| `/coaching/result` | Coaching Result | Main | P0 | Done | claude | UIUX-005, AI-001, AI-COACHING-ANALYTICS-001, monetization-redesign | `page-coaching-result-upgrade` | `feature-ui-empty-and-skeleton`, `feature-data-binding-and-loading` | `docs/status/PROJECT-STATUS.md`, `docs/status/MISSING-AND-UNIMPLEMENTED.md` | 2026-04-28 |
| `/training/academy` | Academy | Training | P0 | Done | claude | UIUX-002, UIUX-003, UI-TRAINING-PERSONALIZATION-001, MEMO-001 | `page-training-academy-upgrade` | `feature-navigation-and-gesture`, `feature-data-binding-and-loading` | `docs/status/PROJECT-STATUS.md`, `docs/ref/TRAINING-PERSONALIZATION-GUIDE.md` | 2026-05-01 |
| `/training/detail` | Training Detail | Training | P0 | Done | claude | UIUX-005, UI-TRAINING-DETAIL-001 | `page-training-detail-upgrade` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | `docs/status/PROJECT-STATUS.md`, `docs/ref/TRAINING-PERSONALIZATION-GUIDE.md` | 2026-05-01 |
| `/dog/profile` | Dog Profile | Dog | P0 | Done | claude | UIUX-006 | `page-dog-profile-upgrade` | `feature-data-binding-and-loading`, `feature-form-validation-and-submit` | `docs/status/PROJECT-STATUS.md` | 2026-04-22 |
| `/dog/add` | Dog Add | Dog | P1 | Done | claude | APP-001 | `page-dog-add-upgrade` | `feature-form-validation-and-submit`, `feature-error-and-retry-state` | `docs/status/PROJECT-STATUS.md` | 2026-04-02 |
| `/dog/switcher` | Dog Switcher | Dog | P0 | Done | claude | UIUX-006 | `page-dog-switcher-upgrade` | `feature-navigation-and-gesture`, `feature-data-binding-and-loading` | `docs/status/PROJECT-STATUS.md` | 2026-04-02 |
| `/settings` | Settings | Settings | P1 | Done | claude | APP-001 | `page-settings-upgrade` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | 2026-04-22 |
| `/settings/subscription` | Subscription | Settings | P1 | Done | claude | IAP-001 | `page-settings-subscription-upgrade` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | `docs/status/11-FEATURE-PARITY-MATRIX.md`, `docs/status/MISSING-AND-UNIMPLEMENTED.md`, `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md` | 2026-04-27 |
| `/legal/terms` | Terms | Legal | P2 | Done | claude | APP-001 | `page-legal-terms-upgrade` | `feature-navigation-and-gesture` | `docs/ref/PRD-TailLog-Toss.md` | 2026-04-02 |
| `/legal/privacy` | Privacy | Legal | P2 | Done | claude | APP-001 | `page-legal-privacy-upgrade` | `feature-navigation-and-gesture` | `docs/ref/PRD-TailLog-Toss.md` | 2026-04-27 |
| `/ops/setup` | Ops Setup | B2B | P1 | Done | claude | B2B-001 | `page-ops-setup-upgrade` | `feature-form-validation-and-submit` | `docs/ref/SCHEMA-B2B.md` | 2026-04-21 |
| `/ops/dog-add` | Ops Dog Add | B2B | P1 | Done | claude | B2B-001 | `page-ops-dog-add-upgrade` | `feature-form-validation-and-submit`, `feature-error-and-retry-state` | `docs/ref/SCHEMA-B2B.md` | 2026-04-21 |
| `/ops/today` | Ops Today | B2B | P2 | Done | claude | B2B-001 | `page-ops-today-upgrade` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | `docs/ref/SCHEMA-B2B.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | 2026-04-21 |
| `/ops/settings` | Ops Settings | B2B | P2 | Done | claude | B2B-001, B2B-002 | `page-ops-settings-upgrade` | `feature-form-validation-and-submit`, `feature-data-binding-and-loading` | `docs/ref/SCHEMA-B2B.md` | 2026-04-21 |
| `/parent/reports` | Parent Reports | B2B | P2 | Done | claude | B2B-001 | `page-parent-reports-upgrade` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | `docs/ref/SCHEMA-B2B.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | 2026-03-01 |

## Status Flow

`Ready -> InProgress -> QA -> Done` (`Hold` is allowed for blocked work).

## Working Rule

- One session should focus on one route only.
- Load one `page-*` skill and at most two `feature-*` skills.
- Record evidence in `docs/daily/MM-DD/page-<route-slug>.md`.
