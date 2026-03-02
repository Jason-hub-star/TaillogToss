# Code-Doc Integrity Report

**Last Run:** 2026-03-01 18:06 UTC  
**Result:** auto-fix applied

---

## Route Summary

| Set | Count |
|---|---|
| managed_routes (DevMenu) | 21 |
| board_routes (PAGE-UPGRADE-BOARD) | 21 |
| matrix_routes (SKILL-DOC-MATRIX) | 21 |
| all_page_routes (src/pages) | 24 |

**Drift:** 0 route-set mismatches (managed == board == matrix ✓)

---

## Skill & Doc Validation

- Page skills checked: 21 — all SKILL.md files present ✓
- Feature skills checked: 6 — all SKILL.md files present ✓
- Required docs checked: 21 routes — all referenced docs exist ✓
- **manual_required: 0**

---

## Daily Checkbox Auto-Fix

| route | daily_date | checks | computed | board_before | board_after |
|---|---|---|---|---|---|
| `/onboarding/notification` | 3-01 | 9/9 | Done | QA | **Done** |
| `/settings` | 3-02 | 5/5 | Done | QA | **Done** |

**auto_fixed: 2** (status advanced QA → Done)

---

## Unmanaged Routes

These routes exist in `src/pages/**` but are not in DevMenu.tsx (expected):

| route | reason |
|---|---|
| `/` (index) | root redirect / shell |
| `/_404` | error boundary |
| `/report/[shareToken]` | dynamic share link (not a dev nav target) |

---

## Errors

none
