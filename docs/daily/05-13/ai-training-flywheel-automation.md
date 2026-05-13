# AI-TRAIN-001 — Coaching flywheel automation hardening

Date: 2026-05-13
Parity: AI-TRAIN-001
Status: InProgress

## Scope
- [x] `coaching_synthetic_log.coaching_ids` ORM type aligned with DB `UUID[]`
- [x] Pro structured action fields included in training quality scoring
- [x] Admin review API added for `training_approved` approval/rejection
- [x] `.claude/automations` schedules aligned for daily synthetic and weekly review
- [x] Automation docs updated from stale paths/port to current project path and FastAPI 8765 default
- [x] Weekly review prompt switched from direct SQL approval to admin review API

## Validation
- [x] `Backend/venv/bin/pytest Backend/tests/test_training_pipeline.py Backend/tests/test_models.py Backend/tests/test_routers.py -v` PASS — 20 tests
- [ ] Full backend suite
- [ ] Actual `daily-coaching-synthetic-gen` persistence rerun
- [ ] Ops approval UI

## Notes
- This closes the highest-risk failure mode where OpenAI synthetic calls could be made but rolled back at `coaching_synthetic_log` insert time.
- Automations are still documented as `UNSCHEDULED` until they are registered in the actual scheduler/pg_cron environment.
- `src/lib/data` candidate publishing is intentionally not automated yet; next step should keep human review before publish.
