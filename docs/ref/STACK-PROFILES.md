# TaillogToss Stack Profiles

작업 종류에 따라 먼저 읽을 문서와 기본 검증을 표준화한다.

## `frontend-page`

- Use when: `src/pages/**`, page components, layout, skeleton, navigation
- Read first:
  - `docs/status/PAGE-UPGRADE-BOARD.md`
  - `docs/status/SKILL-DOC-MATRIX.md`
  - route-local `CLAUDE.md`
- Default verify:
  - `npx tsc --noEmit`
  - targeted Jest if hook/component logic changed

## `backend-api`

- Use when: `Backend/**`, API contracts, data loaders, serializers
- Read first:
  - `docs/ref/BACKEND-PLAN.md`
  - `docs/ref/SUPABASE-SCHEMA-INDEX.md`
  - backend-local docs or tests
- Default verify:
  - `cd Backend && venv/bin/pytest tests/ -v`

## `edge-runtime`

- Use when: `supabase/functions/**`, auth/IAP/message/mTLS
- Read first:
  - `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md`
  - `docs/ref/AIT-PUBLISHING-READINESS.md`
  - relevant Toss skill
- Default verify:
  - edge unit tests
  - deploy smoke or request smoke when safe

## `runtime-qa`

- Use when: AIT builds, Metro, Sandbox vs production Toss behavior, adb evidence
- Read first:
  - `docs/ref/AIT-DEPLOY-CHECKLIST.md`
  - `docs/status/PROJECT-STATUS.md`
  - runtime ops skills
- Default verify:
  - runtime markers
  - device or host log evidence

## `docs-automation`

- Use when: commands, automations, doc sync, audit trails, harness upkeep
- Read first:
  - `docs/status/AUTOMATION-HEALTH.md`
  - `docs/ref/AUTOMATION-ORCHESTRATION-PLAN.md`
  - `docs/ops/agent-orchestration.md`
- Default verify:
  - relevant `scripts/check-*.sh`
  - spot-check linked docs exist
