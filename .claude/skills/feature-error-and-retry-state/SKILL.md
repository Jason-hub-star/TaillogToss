---
name: feature-error-and-retry-state
description: Use when hardening error boundaries, retry paths, and user-visible recovery messages.
---

# feature-error-and-retry-state

## Trigger
- Route-level work needs this specific quality dimension.

## Inputs
- Active route and target files.
- Relevant parity IDs and current board row.

## Procedure
1. Establish baseline behavior and failure modes.
2. Apply minimal, route-scoped changes.
3. Validate with deterministic checklist.
4. Record evidence in docs/daily and board status.

## Validation
- Behavior is deterministic and repeatable.
- No unrelated route regressions introduced.

## Output Template
- Scope:
- Files:
- Validation:
- Risks:
