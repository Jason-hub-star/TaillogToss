# Page Upgrade Board

Source of truth for page-by-page UI/UX and feature hardening.
Route list is synced from `src/components/shared/DevMenu.tsx`.

| route | label | group | priority | status | owner | parity_ids | page_skill | support_skills | must_read_docs | last_updated |
|---|---|---|---|---|---|---|---|---|---|---|
| `/onboarding/stage1-form` | Stage 1 설문 (필수) | Onboarding | P0 | Done | claude | APP-001 | — | `feature-form-validation-and-submit` | `docs/status/PROJECT-STATUS.md` | 2026-05-20 |
| `/onboarding/stage2-form` | Stage 2 설문 (소프트 인터셉트) | Onboarding | P0 | Done | claude | APP-001 | — | `feature-form-validation-and-submit` | `docs/status/PROJECT-STATUS.md` | 2026-05-20 |
| `/onboarding/stage3-form` | Stage 3 Pro 상담지 | Onboarding | P0 | Done | codex | APP-001, AI-001, PRO-INTAKE-001 | — | `feature-form-validation-and-submit`, `feature-data-binding-and-loading` | `docs/status/PROJECT-STATUS.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | 2026-05-20 |
| `/onboarding/welcome` | Welcome (로그인 통합) | Onboarding | P0 | QA | codex | AUTH-001, UIUX-004, B2B-001 | `page-onboarding-welcome-upgrade` | `feature-navigation-and-gesture`, `feature-analytics-and-tracking` | `docs/status/PROJECT-STATUS.md`, `docs/status/PRELAUNCH-QA-FEEDBACK.md` | 2026-05-20 |
| `/onboarding/survey` | Survey | Onboarding | P0 | Done | claude | UIUX-004 | `page-onboarding-survey-upgrade` | `feature-form-validation-and-submit`, `feature-data-binding-and-loading` | `docs/status/PROJECT-STATUS.md`, `docs/status/MISSING-AND-UNIMPLEMENTED.md` | 2026-03-02 |
| `/onboarding/survey-result` | Survey Result | Onboarding | P1 | Done | claude | UI-001 | `page-onboarding-survey-result-upgrade` | `feature-ui-empty-and-skeleton`, `feature-analytics-and-tracking` | `docs/status/PROJECT-STATUS.md` | 2026-05-20 |
| `/onboarding/notification` | Notification | Onboarding | P1 | Done | claude | APP-001 | `page-onboarding-notification-upgrade` | `feature-form-validation-and-submit`, `feature-error-and-retry-state` | `docs/status/PROJECT-STATUS.md` | 2026-05-05 |
| `/dashboard` | Dashboard | Main | P1 | QA | codex | UIUX-001, AD-001, B2B-001, UIUX-006, AI-001 | `page-dashboard-upgrade` | `feature-ui-empty-and-skeleton`, `feature-data-binding-and-loading` | `docs/status/PROJECT-STATUS.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | 2026-05-20 |
| `/dashboard/quick-log` | Quick Log | Main | P1 | QA | codex | LOG-001, AD-001, UIUX-001 | `page-dashboard-quick-log-upgrade` | `feature-form-validation-and-submit`, `feature-navigation-and-gesture` | `docs/status/11-FEATURE-PARITY-MATRIX.md`, `docs/status/PRELAUNCH-QA-FEEDBACK.md` | 2026-05-20 |
| `/dashboard/analysis` | Analysis | Main | P0 | QA | codex | UIUX-001, UIUX-005 | `page-dashboard-analysis-upgrade` | `feature-data-binding-and-loading`, `feature-navigation-and-gesture` | `docs/status/PROJECT-STATUS.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | 2026-05-20 |
| `/coaching/result` | Coaching Result | Main | P0 | QA | codex | UIUX-005, AI-001, AI-COACHING-ANALYTICS-001, UI-TRAINING-PERSONALIZATION-001, PRO-INTAKE-001 | `page-coaching-result-upgrade` | `feature-ui-empty-and-skeleton`, `feature-data-binding-and-loading` | `docs/status/PROJECT-STATUS.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | 2026-05-20 |
| `/training/academy` | Academy | Training | P0 | QA | codex | UIUX-002, UIUX-003, UI-TRAINING-PERSONALIZATION-001, AD-001, MEMO-001 | `page-training-academy-upgrade` | `feature-navigation-and-gesture`, `feature-analytics-and-tracking` | `docs/status/PROJECT-STATUS.md`, `docs/ref/TRAINING-PERSONALIZATION-GUIDE.md`, `docs/status/PRELAUNCH-QA-FEEDBACK.md` | 2026-05-20 |
| `/training/detail` | Training Detail | Training | P0 | QA | codex | UIUX-005, UI-TRAINING-DETAIL-001, AD-001 | `page-training-detail-upgrade` | `feature-navigation-and-gesture`, `feature-analytics-and-tracking` | `docs/status/PROJECT-STATUS.md`, `docs/ref/TRAINING-PERSONALIZATION-GUIDE.md`, `docs/status/PRELAUNCH-QA-FEEDBACK.md` | 2026-05-20 |
| `/dog/profile` | Dog Profile | Dog | P0 | Done | codex | UIUX-006, PRO-INTAKE-001 | `page-dog-profile-upgrade` | `feature-data-binding-and-loading`, `feature-form-validation-and-submit` | `docs/status/PROJECT-STATUS.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | 2026-05-20 |
| `/dog/add` | Dog Add | Dog | P1 | Done | claude | APP-001 | `page-dog-add-upgrade` | `feature-form-validation-and-submit`, `feature-error-and-retry-state` | `docs/status/PROJECT-STATUS.md` | 2026-05-20 |
| `/dog/switcher` | Dog Switcher | Dog | P0 | Done | claude | UIUX-006 | `page-dog-switcher-upgrade` | `feature-navigation-and-gesture`, `feature-data-binding-and-loading` | `docs/status/PROJECT-STATUS.md` | 2026-05-20 |
| `/settings` | Settings | Settings | P1 | QA | codex | APP-001, MSG-001 | `page-settings-upgrade` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | `docs/status/PROJECT-STATUS.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md`, `docs/daily/05-20/page-settings.md` | 2026-05-20 |
| `/settings/subscription` | Subscription | Settings | P1 | QA | codex | IAP-001 | `page-settings-subscription-upgrade` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | `docs/status/11-FEATURE-PARITY-MATRIX.md`, `docs/status/MISSING-AND-UNIMPLEMENTED.md`, `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md` | 2026-05-20 |
| `/legal/terms` | Terms | Legal | P2 | Done | claude | APP-001 | `page-legal-terms-upgrade` | `feature-navigation-and-gesture` | `docs/ref/PRD-TailLog-Toss.md` | 2026-05-20 |
| `/legal/privacy` | Privacy | Legal | P2 | Done | claude | APP-001 | `page-legal-privacy-upgrade` | `feature-navigation-and-gesture` | `docs/ref/PRD-TailLog-Toss.md` | 2026-04-27 |
| `/ops/setup` | Ops Setup | B2B | P1 | Done | claude | B2B-001 | — | `feature-form-validation-and-submit` | `docs/ref/SCHEMA-B2B.md` | 2026-05-20 |
| `/ops/dog-add` | Ops Dog Add | B2B | P1 | Done | claude | B2B-001 | — | `feature-form-validation-and-submit`, `feature-error-and-retry-state` | `docs/ref/SCHEMA-B2B.md` | 2026-05-20 |
| `/ops/today` | Ops Today | B2B | P2 | QA | codex | B2B-001, PRO-INTAKE-001 | `page-ops-today-upgrade` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | `docs/ref/SCHEMA-B2B.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md`, `docs/daily/05-20/page-b2b-ops-report-audit.md` | 2026-05-20 |
| `/ops/settings` | Ops Settings | B2B | P2 | QA | claude | B2B-001, B2B-002 | `page-ops-settings-upgrade` | `feature-form-validation-and-submit`, `feature-data-binding-and-loading` | `docs/ref/SCHEMA-B2B.md`, `docs/daily/05-20/page-b2b-ops-report-audit.md` | 2026-05-20 |
| `/parent/reports` | Parent Reports | B2B | P2 | QA | codex | B2B-001 | `page-parent-reports-upgrade` | `feature-navigation-and-gesture`, `feature-analytics-and-tracking` | `docs/ref/SCHEMA-B2B.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md`, `docs/status/PRELAUNCH-QA-FEEDBACK.md` | 2026-05-14 |

## Status Flow

`Ready -> InProgress -> QA -> Done` (`Hold` is allowed for blocked work).

## Working Rule

- One session should focus on one route only.
- Load one `page-*` skill and at most two `feature-*` skills.
- Record evidence in `docs/daily/MM-DD/page-<route-slug>.md`.
