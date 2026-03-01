# Web Enrichment Summary — 2026-03-01

Run ID: 20260301-0030
Schedule: Every 7 days @ 09:30 KST

## Sources Consulted (5)

| # | URL | Used For |
|---|-----|----------|
| 1 | https://supabase.com/docs/guides/functions/deploy | supabase-mcp, edge-hardening |
| 2 | https://supabase.com/docs/guides/functions/troubleshooting | supabase-mcp, edge-hardening, iap-edge-recovery |
| 3 | https://supabase.com/docs/reference/javascript/auth-signinwithidtoken | login-token-ops |
| 4 | https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation | (referenced, not applied — no gap found) |
| 5 | https://developers-apps-in-toss.toss.im/development/integration-process.html | monetization-ops |

## Skills Enriched (8)

| Skill | New Sections | Items Added | Enrich Markers |
|-------|-------------|-------------|----------------|
| ops/toss-supabase-mcp | ## Failure Modes, ## Operational Guardrails | 5 | a3f1c8d2e901, b7d4e2f0c512 |
| ops/toss-phase13-gate | ## Failure Modes, ## Operational Guardrails | 5 | c9a5b3d1f723, d2e8f6a0b834 |
| auth/toss-login-token-ops | ## Failure Modes | 3 | e4c7a9b2d045 |
| security/toss-edge-hardening | ## Failure Modes, ## Operational Guardrails | 6 | f1b6c3e8a956, 02d5f7a1c867 |
| security/toss-iap-edge-recovery | ## Failure Modes, ## QA Checklist | 6 | 13e9a4b7f078, 24f0b5c8e189 |
| ops/toss-sandbox-metro | ## Operational Guardrails | 3 | 35a1c6d9b290 |
| monetization/toss-growth-ops | ## Failure Modes | 4 | 46b2d7e0a301 |
| monetization/toss-monetization-ops | ## Failure Modes | 4 | 57c3e8f1b412 |

**Total items added: 36**
**New categories created: 14**
**Skills skipped (large files — deferred): 4**
> core/toss_apps, core/toss_journey, core/toss_wireframes, data/toss_db_migration
> Reason: 300–1200 line files; full section scan required before enrichment to avoid duplication. Scheduled for next run.

## Deduplication Applied
- Exact dedupe: 0 conflicts (all new sections)
- Semantic dedupe: toss-login-token-ops `실패 원인 분리 가이드` already covers some failure modes → new ## Failure Modes section adds only mTLS/Supabase-specific items not present
- Source dedupe: no same-URL same-section duplicates

## Errors
none
