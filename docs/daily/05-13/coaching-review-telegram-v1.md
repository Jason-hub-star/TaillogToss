# AI-TRAIN-001 — Telegram review material collection v1

Date: 2026-05-13
Parity: AI-TRAIN-001
Status: InProgress

## Scope
- [x] Synthetic-only review loop scoped to 1 candidate/day
- [x] Behavior-group rotation documented
- [x] Telegram short message template documented
- [x] Queue, feedback, and Telegram offset state files added
- [x] Admin candidate list API added for automation candidate selection
- [x] Admin candidate payload API added for candidate JSON export
- [x] Approved items remain candidate-only; runtime curriculum publishing is blocked in v1

## Validation
- [x] Backend targeted tests PASS — `test_training_pipeline.py`, `test_routers.py`
- [x] Backend full test suite PASS — 74 tests
- [x] Self-review runbook added — `docs/ref/COACHING-REVIEW-TELEGRAM-RUNBOOK.md`
- [x] Frontend typecheck PASS — `npm run typecheck`
- [x] App Jest PASS — `npm run test:app -- --runInBand --passWithNoTests` (16 suites / 103 tests)
- [x] Safety checks PASS — queue/feedback/offset parse + no diff in runtime curriculum paths
- [x] Telegram one-candidate real send — `tlcr_20260513045611_c7f0af5b`
- [x] Rejection scenario PASS — final callback `reject`, comment linked, feedback tags `too_generic`, `wrong_behavior_focus`
- [ ] `DRY_RUN=true` message preview

## Notes
- This is a material collection loop, not automatic curriculum publishing.
- Rejected items require a `반려 코멘트:` Telegram message before they become improvement feedback.
- The first real operation should be dry-run preview, then one synthetic candidate send.
- Current behavior-group matching is inferred from reference ids and keywords; 50-decision review should judge whether a dedicated DB field is needed.
- Self-review result: no blocking code issue found for v1. Remaining gaps are operational: bot env setup, dry-run preview, real send, and callback scenario validation.
- Real-send note: multiple button taps arrived before processing; the latest valid callback plus rejection comment was treated as the owner intent for this manual test.
- Decision: same `review_id` multiple unprocessed callbacks must use latest Telegram `update_id` as the owner intent; older callbacks are ignored while offset still advances.
