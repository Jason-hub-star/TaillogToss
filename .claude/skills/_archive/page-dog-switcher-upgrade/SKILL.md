---
name: page-dog-switcher-upgrade
description: Page-level hardening workflow for /dog/switcher (Dog Switcher). Use this when improving UI/UX and feature completeness for this route only.
---

# page-dog-switcher-upgrade

## Trigger
- User asks to improve, polish, fix, or complete route `/dog/switcher`.
- UI/UX hardening is requested for Dog Switcher page.

## Input Context
- Route: `/dog/switcher`
- Page file: `src/pages/dog/switcher.tsx`
- Parity: UIUX-006
- Priority: P0

## Read First
1. docs/status/PAGE-UPGRADE-BOARD.md
2. docs/status/SKILL-DOC-MATRIX.md
3. docs/status/PROJECT-STATUS.md
4. src/components/shared/DevMenu.tsx

## Do
1. Confirm current gaps against board and parity notes.
2. Keep work limited to this route and its direct feature components/hooks.
3. Implement deterministic loading/empty/error/success states.
4. Reuse tokens and existing shared components.
5. Add or update route-specific validation and telemetry where applicable.
6. Sync docs/daily and board status at the end.

## Do Not
- Do not widen scope to other routes in the same session.
- Do not rewrite unrelated shared architecture.
- Do not introduce temporary mock behavior without explicit note.

## Validation
- Route renders without runtime errors.
- Loading/empty/error states are visually coherent.
- API/data bindings match expected contracts.
- Back navigation and deep-link behavior remain valid.
- Board row for this route is updated (`Ready|InProgress|QA|Done|Hold`).



### P0 Extra Checks
- No-data layout exists before real data loads.
- Skeleton transitions cleanly into populated state.
- Action controls have adequate touch targets.
- Refresh timing and data staleness are visible.

## Output Template
- Scope: UIUX-006
- Files:
- Validation:
- Risks:
- Self-Review:
- Next Recommendations:
