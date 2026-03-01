Diagram-ID: arch-04
Owner: b2b
Last-Verified: 2026-03-01
Parity-IDs: B2B-001, AI-001
Source-of-Truth:
- src/lib/api/org.ts
- src/lib/api/report.ts
- supabase/functions/generate-report/index.ts
- docs/ref/SCHEMA-B2B.md
Update-Trigger:
- org/report endpoints change
- report generation contract change

# 04. B2B Reporting Flow

```mermaid
flowchart LR
  subgraph Client[RN B2B Screens]
    OPS[/ops/today]
    ORGSET[/ops/settings]
    PREP[/parent/reports]
  end

  subgraph API[App API Layer]
    ORGAPI[src/lib/api/org.ts]
    REPAPI[src/lib/api/report.ts]
  end

  subgraph Runtime[Execution]
    FAPI[FastAPI org/report routers]
    GENE[Edge generate-report]
  end

  subgraph Data[Supabase]
    OD[(org_dogs)]
    DR[(daily_reports)]
    PI[(parent_interactions)]
    OA[(org_analytics_daily)]
    OM[(org_members)]
  end

  OPS --> ORGAPI --> FAPI
  ORGSET --> ORGAPI --> FAPI
  PREP --> REPAPI --> FAPI

  FAPI --> OD
  FAPI --> OA
  FAPI --> DR
  FAPI --> PI
  FAPI --> OM

  REPAPI --> GENE --> DR

  OM -. role guard .-> FAPI
  OM -. role guard .-> GENE
```

## Notes
- Access control decisions rely on org membership role checks.
- Report generation can be edge-driven while list/query remains API-driven.
