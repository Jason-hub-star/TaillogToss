Diagram-ID: arch-03
Owner: monetization
Last-Verified: 2026-03-01
Parity-IDs: IAP-001
Source-of-Truth:
- src/lib/api/iap.ts
- src/lib/api/subscription.ts
- supabase/functions/verify-iap-order/index.ts
- supabase/functions/grant-toss-points/index.ts
Update-Trigger:
- toss status mapping changes
- retry/idempotency policy changes

# 03. IAP + Points Sequence

```mermaid
sequenceDiagram
  actor U as User
  participant APP as RN App
  participant VIO as Edge: verify-iap-order
  participant GTP as Edge: grant-toss-points
  participant TOSS as Toss IAP/Points APIs
  participant DB as toss_orders + edge_function_requests

  U->>APP: Purchase intent
  APP->>VIO: invoke verify-iap-order(orderId, productId, transactionId)
  VIO->>DB: idempotency begin
  VIO->>TOSS: verify purchase status
  TOSS-->>VIO: PURCHASED / PAYMENT_COMPLETED / ...
  VIO->>DB: persist toss_orders + status

  alt Grant required
    VIO->>GTP: internal grant request
    GTP->>DB: idempotency begin
    GTP->>TOSS: get-key -> execute -> result
    TOSS-->>GTP: rewarded / fail
    GTP->>DB: complete/fail + retry state
  end

  VIO-->>APP: normalized verify response
  APP-->>U: entitlement updated / retry prompt

  Note over APP,DB: App startup recovery reads pending orders and retries completion flow.
```
