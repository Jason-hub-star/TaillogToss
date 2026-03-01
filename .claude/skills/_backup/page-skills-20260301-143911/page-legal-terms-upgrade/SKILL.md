---
name: page-legal-terms-upgrade
description: Page-level hardening workflow for /legal/terms (Terms). Use this when improving UI/UX and feature completeness for this route only.
---

# page-legal-terms-upgrade

## Trigger
- User asks to improve, polish, fix, or complete route `/legal/terms`.
- UI/UX hardening is requested for Terms page.

## Input Context
- Route: `/legal/terms`
- Page file: `src/pages/legal/terms.tsx`
- Parity: APP-001
- Priority: P2

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



## Output Template
- Scope: APP-001
- Files:
- Validation:
- Risks:
- Self-Review:
- Next Recommendations:
