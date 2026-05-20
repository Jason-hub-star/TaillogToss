# /coaching/result UX Hardening - 2026-05-20

- Scope: UIUX-005, AI-001
- Skill: `page-coaching-result-upgrade`, `feature-data-binding-and-loading`

## Changes

- [x] Frontend maps user-visible English tools and curriculum ids to Korean labels for coaching result rendering.
- [x] Backend normalizes generated coaching tool labels before persistence to reduce new English leakage.
- [x] Seven-day plan cards are tap targets and open a `ModalLayout` bottom-sheet detail with goal/tasks/time/place/tools/progression/reference sections when PRO content is unlocked.
- [x] Free-state PRO lock UX remains in place for the 7-day plan, risk signals, and consultation questions.
- [x] Coaching generation loading UX now uses `perrito-corriendo` Lottie instead of static icon/spinner and passes the active dog name into the loader.
- [x] Synchronous-generation copy is explicit: 10~30s wait, keep this screen open, and leaving the screen does not guarantee completion.
- [x] Generation step labels were rewritten from internal pipeline wording to user-facing steps: recent records, repeated patterns, custom coaching.
- [x] Async generation v1 implemented after DEV_LOCAL 53.8s evidence: `coaching_generation_jobs` DB migration/model, `POST /api/v1/coaching/generation-jobs`, `GET /api/v1/coaching/generation-jobs/{job_id}`, FastAPI background runner with fresh DB session, active-job reuse, daily limit including active jobs, and 10-minute stale failure handling.
- [x] `/coaching/result` now starts a generation job, polls every 2 seconds, stores `coaching_generation_job_${userId}_${dogId}` in Toss Storage, restores polling on re-entry, updates latest coaching cache on completion, and clears the stored job on completed/failed.
- [x] Loader copy is now async-accurate: 30~60s expectation, leaving the screen is recoverable by checking generation status again, and completion will show the latest result.

## DEV_LOCAL QA

- [x] Dashboard `지난 진단 보기` reached `/coaching/result`. Evidence: `/tmp/taillog-qa/dev-local-coaching-cta-pass.png`
- [x] Latest coaching result rendered and scrolled through insight/action/dog voice sections without JS crash. Evidence: `/tmp/taillog-qa/dev-local-coaching-detail-scrolled-1.png`, `/tmp/taillog-qa/dev-local-coaching-detail-scrolled-2.png`
- [x] Free user lock state for 7-day plan remained visible and did not expose raw English/internal ids. Evidence: `/tmp/taillog-qa/dev-local-coaching-7day-cards.png`
- [x] 2026-05-20 follow-up DEV_LOCAL: removed the fixed bottom `훈련 시작하기` CTA from `/coaching/result`; route still renders latest coaching without JS crash. Evidence: `/tmp/taillog-qa/dev-local-coaching-result-no-fixed-cta.png`
- [x] 2026-05-20 follow-up unit/static: `npx jest src/components/features/coaching --runInBand --passWithNoTests` PASS, `npx tsc --noEmit` PASS.
- [x] 2026-05-20 follow-up DEV_LOCAL server baseline: Metro `/status` running, FastAPI `/health` OK, adb reverse `8081/5173/8765` present.
- [x] 2026-05-20 follow-up DEV_LOCAL route: `/coaching/result` launched in `viva.republica.toss.test`; latest coaching and `새 코칭 받기` rendered. Evidence: `/tmp/taillog-qa/dev-local-coaching-loader-check.png`
- [x] 2026-05-20 follow-up DEV_LOCAL auth recovery: restarted Metro with `EXPO_PUBLIC_SHOW_DEV_MENU=true`, restarted FastAPI, restored adb reverse `8081/5173/8765`, and verified authenticated local API traffic (`/api/v1/settings/`, `/api/v1/coaching/usage/daily`, `/api/v1/coaching/{dog_id}/latest` all 200).
- [x] 2026-05-20 follow-up backend compatibility: `onboarding_context.stage2` legacy list fields now normalize before prompt rendering, fixing `POST /api/v1/coaching/generate` 500 (`'list' object has no attribute 'get'`) for the DEV_LOCAL stable session.
- [x] 2026-05-20 follow-up DEV_LOCAL generation visual: tapping `새 코칭 받기` showed the Lottie loader immediately and completed successfully. Measured request start `21:35:55.277`, `ai_coach_completed` `21:36:49.085` (~53.8s); loader first visible at ~0.08s and was still visible at 49.99s. Evidence: `/tmp/taillog-qa/coaching-measure-loader.png`, `/tmp/taillog-qa/coaching-measure-after-complete.png`
- [x] 2026-05-20 async implementation static/unit: `npx tsc --noEmit` PASS, `npx jest src/components/features/coaching src/lib/api/__tests__/coaching.test.ts --runInBand --passWithNoTests` PASS, `Backend/venv/bin/pytest Backend/tests/test_coaching_prompts.py Backend/tests/test_schemas.py -q` PASS, `Backend/venv/bin/python -m compileall Backend/app/features/coaching Backend/app/shared/models.py` PASS.

## Self Review

- Good: existing DB rows are corrected at render time, while new backend generations also reduce English tool leakage.
- Good: generation loading now accurately communicates the current synchronous request/response contract and avoids promising background completion.
- Good: DEV_LOCAL session auth now reaches FastAPI generate with a valid Supabase user, and generation completes into the 2026.05.20 coaching result.
- Good: the async v1 path no longer depends on the user keeping the request screen alive; the app can restore an active job from Storage and poll backend state.
- Weak: current device account still shows PRO-locked sections, so unlocked 7-day bottom-sheet interaction needs a dedicated PRO pass.
- Gap: async generation still uses FastAPI `BackgroundTasks`; if the server process restarts mid-job, stale handling marks the job failed and asks the user to retry. Redis/Celery remains a later hardening step if volume rises.

Board Sync: `/coaching/result` remains `QA`; async job implementation unit/static checks passed, but DEV_LOCAL leave/re-enter manual QA is still required after migration is applied locally.
