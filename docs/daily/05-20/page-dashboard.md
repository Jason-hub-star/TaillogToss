# /dashboard UX Hardening - 2026-05-20

- Scope: UIUX-001, UIUX-006, AI-001
- Skill: `page-dashboard-upgrade`, `feature-data-binding-and-loading`

## Changes

- [x] Active dog cache now reconciles same-id dogs from the latest dog list so profile edits refresh the current dashboard dog.
- [x] Dog profile save updates `dogs.detail`, `dogs.list`, and `dashboard.detail` query caches immediately after mutation success.
- [x] Dashboard `DogCard` prefers same-id dashboard dog profile fields so the latest `profile_image_url` appears after save and app re-entry.
- [x] Added record-tab AI coaching summary card below `DogCard` with latest diagnosis metadata and CTAs.

## DEV_LOCAL QA

- [x] `/dog/profile` photo select -> save -> `/dashboard`: avatar changed immediately. Evidence: `/tmp/taillog-qa/dev-local-photo-save-result.png`
- [x] Force-stop/relaunch: dashboard rendered without Metro crash and the saved avatar remained visible. Evidence: `/tmp/taillog-qa/dev-local-relaunch-now.png`
- [x] Dashboard AI card visible under `DogCard` with latest diagnosis date/trend/action count. Evidence: `/tmp/taillog-qa/dev-local-restart.png`
- [x] `지난 진단 보기` CTA navigated to `/coaching/result`. Evidence: `/tmp/taillog-qa/dev-local-coaching-cta-pass.png`
- [x] `추천 훈련 보기` CTA navigated to `/training/academy`. Evidence: `/tmp/taillog-qa/dev-local-training-cta-pass.png`
- [x] 2026-05-20 follow-up DEV_LOCAL: AIT upload paused per user instruction; Metro/FastAPI/ADB reverse dev mode launched successfully. Dashboard rendered with `완료 0/4` AI card copy and no `실행 0/3` copy. Evidence: `/tmp/taillog-qa/dev-local-dashboard-after-cta-empty-patch.png`
- [x] 2026-05-20 follow-up code fix: zero-log dashboard empty state no longer uses full-flex `EmptyState`; route-specific compact empty view restores `첫 기록을 남겨보세요` text above the fixed quick-log CTA.
- [x] 2026-05-20 recent-log readability fix: record tab now scrolls as one whole surface instead of trapping recent logs inside the leftover bottom area; AI summary card and streak banner were compacted. Evidence: `/tmp/taillog-qa/dev-local-dashboard-recent-log-layout-v2.png`, `/tmp/taillog-qa/dev-local-dashboard-recent-log-layout-v2-scrolled.png`
- [x] 2026-05-20 recent-log count decision: dashboard displays the latest 10 logs while keeping the existing dashboard fetch cache intact; header shows `최근 10개` and longer history is directed to the analysis tab. Evidence: `/tmp/taillog-qa/dev-local-dashboard-recent-log-10-limit.png`

## Self Review

- Good: cache writes are same-dog scoped and avoid cross-dog profile image bleed.
- Weak: current DEV_LOCAL account has many logs, so the zero-log empty state was verified by code path and typecheck, not by a fresh 0-log account screenshot.
- Gap: fixed quick-log CTA still covers permanent bottom space by design; small-screen QA should verify the last log can scroll comfortably above the CTA and bottom nav.

Board Sync: `/dashboard` remains `QA`; DEV_LOCAL core scenarios passed on 2026-05-20.
