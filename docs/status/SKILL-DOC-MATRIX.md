# Skill Doc Matrix

Decision-complete mapping between successful `.claude/skills` entries, code touch points, and required references.

| page_skill | target_route | primary_code_paths | required_docs | optional_docs | feature_skills | acceptance_checks |
|---|---|---|---|---|---|---|
| `page-login-upgrade` | `/login` | `src/pages/login.tsx`, `src/lib/api/auth.ts`, `src/lib/hooks/useAuth.ts` | `docs/status/PROJECT-STATUS.md` | `docs/status/11-FEATURE-PARITY-MATRIX.md`, `docs/ref/AIT-SDK-2X-MIGRATION.md` | `feature-form-validation-and-submit`, `feature-error-and-retry-state` | auth guard pass, error states clear |
| `page-onboarding-welcome-upgrade` | `/onboarding/welcome` | `src/pages/onboarding/welcome.tsx` | `docs/status/PROJECT-STATUS.md` | `docs/ref/PRD-TailLog-Toss.md` | `feature-navigation-and-gesture`, `feature-analytics-and-tracking` | first load UX, CTA tracking |
| `page-onboarding-survey-upgrade` | `/onboarding/survey` | `src/pages/onboarding/survey.tsx`, `src/components/features/survey/*` | `docs/status/PROJECT-STATUS.md`, `docs/status/MISSING-AND-UNIMPLEMENTED.md` | `docs/ref/PRD-TailLog-Toss.md` | `feature-form-validation-and-submit`, `feature-data-binding-and-loading` | field validation, submit payload |
| `page-onboarding-survey-result-upgrade` | `/onboarding/survey-result` | `src/pages/onboarding/survey-result.tsx` | `docs/status/PROJECT-STATUS.md` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | `feature-ui-empty-and-skeleton`, `feature-analytics-and-tracking` | loading/empty/final state parity |
| — | `/onboarding/stage3-form` | `src/pages/onboarding/stage3-form.tsx`, `Backend/app/features/onboarding/*`, `Backend/app/features/coaching/prompts.py` | `docs/status/PROJECT-STATUS.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | `docs/daily/05-12/page-onboarding-stage3-pro-intake.md` | `feature-form-validation-and-submit`, `feature-data-binding-and-loading` | Pro 핵심 3섹션 저장/복원, 선택 섹션 optional, AI 프롬프트 반영 |
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
| `page-settings-subscription-upgrade` | `/settings/subscription` | `src/pages/settings/subscription.tsx`, `src/lib/hooks/useSubscription.ts` | `docs/status/11-FEATURE-PARITY-MATRIX.md`, `docs/status/MISSING-AND-UNIMPLEMENTED.md` | `docs/ref/PRD-TailLog-Toss.md`, `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | IAP state and recovery |
| `page-legal-terms-upgrade` | `/legal/terms` | `src/pages/legal/terms.tsx` | `docs/ref/PRD-TailLog-Toss.md` | `docs/status/PROJECT-STATUS.md` | `feature-navigation-and-gesture` | legal text and scroll behavior |
| `page-legal-privacy-upgrade` | `/legal/privacy` | `src/pages/legal/privacy.tsx` | `docs/ref/PRD-TailLog-Toss.md` | `docs/status/PROJECT-STATUS.md` | `feature-navigation-and-gesture` | legal text and links |
| `page-ops-today-upgrade` | `/ops/today` | `src/pages/ops/today.tsx`, `src/components/features/ops/*`, `src/lib/api/org.ts` | `docs/ref/SCHEMA-B2B.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | `docs/status/PROJECT-STATUS.md` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | org today stats and list |
| `page-ops-settings-upgrade` | `/ops/settings` | `src/pages/ops/settings.tsx`, `src/components/features/ops/*` | `docs/ref/SCHEMA-B2B.md` | `docs/status/11-FEATURE-PARITY-MATRIX.md` | `feature-form-validation-and-submit`, `feature-data-binding-and-loading` | org settings save |
| `page-parent-reports-upgrade` | `/parent/reports` | `src/pages/parent/reports.tsx`, `src/components/features/parent/*`, `src/lib/api/report.ts` | `docs/ref/SCHEMA-B2B.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | `docs/status/PROJECT-STATUS.md` | `feature-data-binding-and-loading`, `feature-error-and-retry-state` | report fetch/render/reaction |

## Global Rules

- Page skill root: `.claude/skills/page-skills/page/`
- Feature skill root: `.claude/skills/page-skills/feature/`
- Domain skill root: `.claude/skills/toss-guide/`
- Legacy mirror: `.agents/skills` is not the source of truth for this matrix.
- Load one page skill + up to two feature skills.
- Keep context inputs narrow to route-specific files and docs.
- Update `PAGE-UPGRADE-BOARD.md` status and date at task end.

## Global Ops Skills

| skill | purpose | primary_docs | acceptance_checks |
|---|---|---|---|
| `toss_apps` | Toss mini-app, TDS, SDK, Supabase integration baseline | `docs/ref/AIT-SDK-2X-MIGRATION.md`, `docs/ref/AIT-PUBLISHING-READINESS.md`, `docs/ref/PRD-TailLog-Toss.md` | SDK/TDS usage follows current app patterns |
| `toss_journey` | User journey, route transitions, engagement hooks | `docs/ref/PRD-TailLog-Toss.md`, `docs/status/PAGE-UPGRADE-BOARD.md` | route journey parity and transition state match docs |
| `toss_wireframes` | Screen wireframes and TDS component mapping | `docs/status/PAGE-UPGRADE-BOARD.md`, `docs/ref/ASSET-GUIDE.md` | layout/component parity checked against route board |
| `toss_db_migration` | Supabase schema, migration, and RLS alignment | `docs/ref/SUPABASE-SCHEMA-INDEX.md`, `docs/ref/SCHEMA-B2B.md` | migration/schema/RLS drift reviewed |
| `toss-login-token-ops` | Toss Login OAuth token flow and QA evidence | `docs/status/11-FEATURE-PARITY-MATRIX.md`, `docs/ref/AIT-PUBLISHING-READINESS.md` | fresh authCode/login evidence captured |
| `toss-mock-auth-ops` | Mock auth stability, stable userKey, and survey loop diagnosis | `docs/daily/05-05/runtime-mode-switch-test.md`, `docs/status/PROJECT-STATUS.md` | stable userKey and route loop evidence captured |
| `toss-growth-ops` | Smart Message, Segment, Promotion, Reward, and OG operations | `docs/ref/AIT-SMART-MESSAGE-CONSOLE-GUIDE.md`, `docs/status/11-FEATURE-PARITY-MATRIX.md` | console/send evidence and history updated |
| `toss-monetization-ops` | Ads, IAP, TossPay console and sandbox operations | `docs/ref/AIT-IAP-CONSOLE-GUIDE.md`, `docs/ref/AIT-ADS-CONSOLE-GUIDE.md`, `docs/ref/AIT-PUBLISHING-READINESS.md` | sandbox/console evidence captured |
| `toss-iap-proxy-ops` | IAP proxy, service role JWT detection, and subscriptions E2E recovery | `docs/daily/05-05/page-coaching-result.md`, `docs/daily/05-07/iap-ads-smart-message-device-qa.md`, `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md` | subscription active state and proxy path verified |
| `toss-runtime-mode-ops` | `DEV_LOCAL` / `SANDBOX_REAL` / `PROD_READY` runtime mode 판정과 AIT, Supabase CLI, mTLS, Ads, IAP, Smart Message, Report AI 토글 분리 | `docs/status/MISSING-AND-UNIMPLEMENTED.md`, `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md`, `docs/ref/AIT-ADS-SDK-REFERENCE.md` | mode snapshot, toggle matrix, PASS/PARTIAL/BLOCKED gate |
| `toss-ait-build-ops` | `.ait` 빌드/업로드/standalone private launch 패턴, env/runtime setup 검증, `brand.icon` HTTPS URL 우선 규칙, host error escalation | `docs/daily/05-07/iap-ads-smart-message-device-qa.md`, `docs/daily/05-07/ait-private-standalone-launch.md`, `docs/ref/AIT-PUBLISHING-READINESS.md`, `docs/status/PROJECT-STATUS.md` | bundle scan: Supabase marker + no local/data URI `brandIcon`; preferred `brandIcon:"https://"`; if Metro-off launch fails before JS marker, collect deploymentId/CLI URL/UI text/logcat and escalate |
| `toss-dev-server` | Metro, FastAPI, and adb reverse local server startup | `docs/status/PROJECT-STATUS.md`, `docs/daily/05-05/full-app-qa-readiness-report.md` | 8081/8765 health and adb reverse verified |
| `toss-phase13-gate` | AUTH/IAP/MSG/AD E2E gate and evidence sync | `docs/status/11-FEATURE-PARITY-MATRIX.md`, `docs/status/PRELAUNCH-BLOCKER-SCAN.md` | gate evidence and blocker state synced |
| `toss-sandbox-metro` | Toss Sandbox device, Metro entry scheme, and device QA | `docs/daily/05-07/iap-ads-smart-message-device-qa.md`, `docs/ref/AIT-PUBLISHING-READINESS.md` | device launch and network path verified |
| `toss-supabase-mcp` | Supabase MCP, Edge deploy, logs, and key checks | `docs/ref/SUPABASE-SCHEMA-INDEX.md`, `docs/status/PRELAUNCH-BLOCKER-SCAN.md` | Edge/schema/log evidence captured without key leakage |
| `toss-edge-hardening` | Edge Function auth, header trust removal, redeploy, and bypass verification | `docs/status/PRELAUNCH-BLOCKER-SCAN.md`, `docs/ref/AIT-PUBLISHING-READINESS.md` | privilege bypass and auth boundary checked |
| `toss-iap-edge-recovery` | `verify-iap-order` 401/403 diagnosis and safe recovery | `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md`, `docs/daily/05-07/iap-ads-smart-message-device-qa.md` | auth failure path separated from IAP success path |
