# Code-Doc Integrity Report

**Generated:** 2026-06-16 02:11 (Asia/Seoul)

## Summary

| Metric | Count |
|--------|-------|
| Managed routes (DevMenu) | 20 |
| Board routes | 25 |
| Matrix routes | 22 |
| All page routes (src/pages) | 28 |
| Drift (board/matrix → managed mismatch) | 7 |
| Auto-fixed | 0 |
| Manual required | 5 |
| Unmanaged routes | 8 |

## Drift Details

### In board but NOT in DevMenu managed routes
These routes appear in PAGE-UPGRADE-BOARD.md but are not listed as managed in DevMenu.tsx:
- `/onboarding/stage1-form`
- `/onboarding/stage2-form`
- `/onboarding/stage3-form`
- `/ops/dog-add`
- `/ops/setup`

### In matrix but NOT in DevMenu managed routes
These routes appear in SKILL-DOC-MATRIX.md but are not listed as managed in DevMenu.tsx:
- `/login`
- `/onboarding/stage3-form`

### In managed but NOT in board: 0 — ✅ all managed routes are documented

### In managed but NOT in matrix: 0 — ✅ all managed routes are in skill matrix

## Unmanaged Routes (src/pages - DevMenu)
Routes that exist in src/pages but are not in DevMenu:
- `/_404`
- `/coaching/CoachingDetailContent`
- `/onboarding/stage1-form`
- `/onboarding/stage2-form`
- `/onboarding/stage3-form`
- `/ops/dog-add`
- `/ops/setup`
- `/report/[shareToken]`

## Daily Log Status
- `05-27/page-coaching-result.md` — **Done** (all checkboxes ✅, board synced)

## Manual Required
The following board/matrix entries reference routes not in DevMenu and should be reviewed:
1. `/onboarding/stage1-form` — in board; page exists in src/pages; not in DevMenu
2. `/onboarding/stage2-form` — in board; page exists in src/pages; not in DevMenu
3. `/onboarding/stage3-form` — in board + matrix; page exists; not in DevMenu
4. `/ops/dog-add` — in board; page exists; not in DevMenu
5. `/ops/setup` — in board; page exists; not in DevMenu

→ Recommendation: Add to DevMenu or mark as intentionally-unmanaged in board

## Auto-Fixed
None (0 changes made)

## Status
No destructive changes made. All drifts are board/matrix having extra entries not in DevMenu — managed routes are fully documented. Last confirmed unchanged: 2026-06-16 (no commits since 2026-05-27).
