Diagram-ID: arch-02
Owner: auth
Last-Verified: 2026-03-01
Parity-IDs: AUTH-001, REG-001
Source-of-Truth:
- src/pages/login.tsx
- src/lib/api/auth.ts
- supabase/functions/login-with-toss/index.ts
Update-Trigger:
- login payload/response schema changes
- bridge session set policy changes

# 02. Auth Sequence (Toss Login Bridge)

```mermaid
sequenceDiagram
  actor U as User
  participant APP as RN App
  participant TSDK as appLogin()
  participant EDGE as Edge: login-with-toss
  participant TOSS as Toss OAuth API
  participant SA as Supabase Auth
  participant PUB as public.users

  U->>APP: Tap login
  APP->>TSDK: appLogin()
  TSDK-->>APP: authorizationCode, referrer
  APP->>EDGE: invoke login-with-toss(body)

  EDGE->>TOSS: generate-token (mTLS)
  TOSS-->>EDGE: accessToken
  EDGE->>TOSS: login-me (Bearer)
  TOSS-->>EDGE: toss user profile

  EDGE->>SA: ensure/sign-in bridge user
  SA-->>EDGE: access_token, refresh_token
  EDGE->>PUB: upsert user metadata
  EDGE-->>APP: bridge session payload

  APP->>SA: setSession(access, refresh)
  SA-->>APP: session established
  APP-->>U: route to onboarding/dashboard

  Note over APP,EDGE: On invalid/missing JWT-like token payload, app blocks setSession and handles fallback.
```
