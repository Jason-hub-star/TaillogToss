# Architecture Diagrams (Toss In-App)

Purpose: single entry index for architecture diagrams used by implementation and automation.

## Usage Rules
- Read this index first, then open only the relevant diagram files.
- Treat listed source files as truth.
- If source changed, refresh corresponding diagram and `Last-Verified`.

## Diagram Index

| diagram_id | file | purpose | primary_sources | last_verified | status |
|---|---|---|---|---|---|
| `arch-01` | `docs/ref/architecture/01-system-topology.md` | End-to-end topology (RN, FastAPI, Edge, Supabase, Toss) | `CLAUDE.md`, `src/lib/api/backend.ts`, `supabase/functions/CLAUDE.md` | 2026-03-01 | ok |
| `arch-02` | `docs/ref/architecture/02-auth-sequence.md` | Toss login bridge sequence and failure points | `src/pages/login.tsx`, `src/lib/api/auth.ts`, `supabase/functions/login-with-toss/index.ts` | 2026-03-01 | ok |
| `arch-03` | `docs/ref/architecture/03-iap-points-sequence.md` | IAP verify/grant/recovery flow with idempotency | `src/lib/api/iap.ts`, `src/lib/api/subscription.ts`, `supabase/functions/verify-iap-order/index.ts`, `supabase/functions/grant-toss-points/index.ts` | 2026-03-01 | ok |
| `arch-04` | `docs/ref/architecture/04-b2b-reporting-flow.md` | B2B org/report data flow and role checks | `src/lib/api/org.ts`, `src/lib/api/report.ts`, `supabase/functions/generate-report/index.ts`, `docs/ref/SCHEMA-B2B.md` | 2026-03-01 | ok |
| `arch-05` | `docs/ref/architecture/05-data-rls-boundary.md` | Data model and RLS trust boundaries | `docs/ref/SUPABASE-SCHEMA-INDEX.md`, `supabase/migrations/*.sql`, `Backend/app/shared/models.py` | 2026-03-01 | ok |
| `arch-06` | `docs/ref/architecture/06-runtime-deploy-observability.md` | Runtime/deploy/automation observability map | `.claude/automations/*.prompt.md`, `docs/status/AUTOMATION-HEALTH.md`, `docs/status/NIGHTLY-RUN-LOG.md` | 2026-03-02 | ok |

## Refresh Triggers
- `arch-01`: infra boundary changes (client/backend/edge split)
- `arch-02`: auth APIs, bridge payload, token/session handling changes
- `arch-03`: IAP status mapping, retry policy, idempotency contract changes
- `arch-04`: B2B role/table/report pipeline changes
- `arch-05`: migration/enum/RLS policy updates
- `arch-06`: schedule, lock, artifact, health-monitor logic changes
