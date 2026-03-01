TaillogToss global operating index. Keep this file slim.

# TaillogToss Orchestration Index (Slim)

DogCoach (Next.js PWA) -> Toss mini-app (React Native) migration.
This file only keeps execution rules, priorities, and pointers.

## Repo Boundary (MUST)

| Scope | Path | Access |
|---|---|---|
| Write Repo | `C:\Users\gmdqn\tosstaillog` | read/write |
| Read-only Ref | `C:\Users\gmdqn\DogCoach` | read-only |

## Execution Rules (MUST)
1. Announce change intent in 1-2 lines before editing.
2. Read source files before editing them.
3. Link every implementation to parity IDs.
4. Prefer reuse over duplication.
5. No destructive git or mass-delete operations without explicit request.
6. Keep `CLAUDE.md` files slim and move details into docs.
7. If creating a new folder, add a local `CLAUDE.md` with role/rules.
8. Use `styles/tokens` for design tokens; avoid hardcoded hex/fontSize.
9. For page implementation, load one `page-*` skill + at most two `feature-*` skills.

## Nightly Automations (MUST)

| Automation | Schedule | Source |
|---|---|---|
| CLAUDE.md slimming | daily 08:00 | keep this file pointer-only |
| docs organizer | daily 22:00 (Asia/Seoul) | `.claude/automations/docs-nightly-organizer.prompt.md` |

## Architecture Snapshot

| Layer | Stack |
|---|---|
| Framework | `@granite-js/react-native` |
| UI | TDS RN (`@toss/tds`) + `src/styles/tokens.ts` |
| State | React + TanStack Query |
| Backend | `Backend/` FastAPI + `supabase/functions/` Edge |
| Auth | Toss Login -> `login-with-toss` -> Supabase Auth bridge |
| Payments | Toss IAP (`verify-iap-order`) |
| Ads | Toss Ads SDK 2.0 |

## Skill Routing Index (MUST)

### Base domain skills
- `Skill("toss_wireframes")`
- `Skill("toss_journey")`
- `Skill("toss_apps")`
- `Skill("toss-growth-ops")`
- `Skill("toss-monetization-ops")`
- `Skill("toss-login-token-ops")`
- `Skill("toss_db_migration")`
- `Skill("toss-edge-hardening")`
- `Skill("toss-phase13-gate")`
- `Skill("toss-supabase-mcp")`
- `Skill("toss-sandbox-metro")`

### Page hardening skills
- Source of truth: `docs/status/PAGE-UPGRADE-BOARD.md`
- Mapping: `docs/status/SKILL-DOC-MATRIX.md`
- Naming: `page-<route-slug>-upgrade`

### Cross-page feature skills
- `feature-ui-empty-and-skeleton`
- `feature-navigation-and-gesture`
- `feature-data-binding-and-loading`
- `feature-form-validation-and-submit`
- `feature-error-and-retry-state`
- `feature-analytics-and-tracking`

## Current Priority (Last Updated: 2026-03-01)
1. UIUX-001: dashboard analysis/training empty-state and skeleton stabilization
2. UIUX-002: training academy AI-generated-feel UX redesign
3. UIUX-003: curriculum visibility and navigation ergonomics
4. UIUX-004: onboarding survey parity with web baseline
5. UIUX-005: coaching result and training detail completeness
6. UIUX-006: dog profile real-data restore + dog switcher UX

## Source of Truth Docs

| Document | Purpose |
|---|---|
| `docs/status/PROJECT-STATUS.md` | latest status board |
| `docs/status/11-FEATURE-PARITY-MATRIX.md` | parity notes and verification logs |
| `docs/status/MISSING-AND-UNIMPLEMENTED.md` | missing implementations and V2 candidates |
| `docs/status/PAGE-UPGRADE-BOARD.md` | route-level execution board |
| `docs/status/SKILL-DOC-MATRIX.md` | page skill to code/doc mapping |
| `docs/status/NIGHTLY-RUN-LOG.md` | nightly organizer execution history |
| `docs/ref/BACKEND-PLAN.md` | backend implementation details |
| `docs/ref/SCHEMA-B2B.md` | B2B schema reference |
| `docs/ref/ASSET-GUIDE.md` | asset catalog and usage notes |
| `docs/ref/10-MIGRATION-OPERATING-MODEL.md` | migration operating model |
| `docs/ref/12-MIGRATION-WAVES-AND-GATES.md` | migration waves and gate criteria |
| `docs/daily/` | daily logs (22:00 compression target) |
| `docs/weekly/` | weekly compacted logs |

## Completion Format

```
- Scope: parity IDs
- Files: changed files
- Validation: commands/tests and outcomes
- Risks: unresolved risks and next actions
- Self-Review: good / weak / verification gaps
- Next Recommendations: top 1-3 priorities
```
