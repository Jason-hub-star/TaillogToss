Diagram-ID: arch-01
Owner: platform
Last-Verified: 2026-03-01
Parity-IDs: APP-001, AUTH-001, IAP-001, B2B-001
Source-of-Truth:
- CLAUDE.md
- src/lib/api/backend.ts
- supabase/functions/CLAUDE.md
Update-Trigger:
- Backend/Edge boundary changes
- New external dependency introduced

# 01. System Topology

```mermaid
graph TB
  subgraph Client[Client App]
    RN[React Native app\n@granite-js/react-native]
    TQ[TanStack Query]
    API[src/lib/api/*]
  end

  subgraph Backend[Backend]
    FAPI[FastAPI\nBackend/app/*]
  end

  subgraph Supabase[Supabase]
    EDGE[Edge Functions\nlogin-with-toss, verify-iap-order,\nsend-smart-message, grant-toss-points, generate-report]
    DB[(Postgres + RLS)]
    AUTH[Supabase Auth]
  end

  subgraph External[External]
    TOSS[Toss APIs\nOAuth, IAP, Smart Message, Points]
    OPENAI[OpenAI API]
  end

  RN --> TQ --> API
  API --> FAPI
  API --> EDGE
  FAPI --> DB
  EDGE --> DB
  EDGE --> AUTH
  EDGE --> TOSS
  FAPI --> OPENAI
```

## Notes
- S2S and mTLS-bound logic stays in Edge Functions.
- FastAPI handles app business APIs and AI composition.
- Data access boundary is enforced by RLS in Supabase DB.
