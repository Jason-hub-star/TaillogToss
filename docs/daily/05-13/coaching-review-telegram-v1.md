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
- [ ] `DRY_RUN=true` message preview
- [ ] Telegram one-candidate real send

## Notes
- This is a material collection loop, not automatic curriculum publishing.
- Rejected items require a `반려 코멘트:` Telegram message before they become improvement feedback.
- The first real operation should be dry-run preview, then one synthetic candidate send.
