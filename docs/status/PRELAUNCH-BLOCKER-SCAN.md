# Prelaunch Blocker Scan

> Last Updated: 2026-05-22 KST
> Scope: AUTH-001, APP-001, IAP-001, MSG-001, AD-001, B2B-001, REG-001  
> Source: `PROJECT-STATUS.md`, `11-FEATURE-PARITY-MATRIX.md`, `MISSING-AND-UNIMPLEMENTED.md`, `PROGRESS-CHECKLIST.md`, `AIT-DEPLOY-CHECKLIST.md`, code scan

> Snapshot note: this is a 2026-05-22 release-gate snapshot. For current session intake, prefer `PROJECT-STATUS.md`, `11-FEATURE-PARITY-MATRIX.md`, `PAGE-UPGRADE-BOARD.md`, and `PROGRESS-CHECKLIST.md` because 2026-05-26/05-27 Ads/Login/Coaching evidence supersedes some PARTIAL rows below.

## Gate Summary

| Area | Gate | Status | Release Meaning |
|---|---|---|---|
| Build/tests | TypeScript, app Jest, Edge Jest, Backend pytest | PASS | No local regression found in scan |
| App launch | AIT private standalone | PASS | Metro-off production Toss launch passed on 2026-05-11 |
| Icon/brand | 600x600 local logo + `brand.icon` | PARTIAL | Local icon assets are valid; `granite.config.ts` still points to console HTTPS icon, so a newly replaced icon needs console URL / config sync |
| IAP | SDK wrapper + grant completion | PARTIAL | Code path is implemented; final Sandbox success scenario still needs real-device evidence |
| Ads | SDK wrapper + live IDs + slot wiring | PARTIAL | Code path is implemented; supported-environment render success or no-fill final 판정 remains |
| Smart Message | log_reminder | PASS | Approved template + current-user HTTP 200 evidence exists |
| Auth | Toss Login bridge | PARTIAL | Existing Sandbox evidence exists; fresh authCode happy-path final evidence remains |
| B2B | B2C release impact | PARTIAL | B2C can proceed; B2B 40-dog perf/share-link/RPC endpoint remain follow-up |
| Console/publishing | QR/review button/business/customer support | PASS/PARTIAL | 사용자 보고 기준 출시하기 완료, 실제 토스 검색 노출 확인, 챌린지 출품용 공개 공유 URL `https://minion.toss.im/L1o5uCsg` 확보 완료 |

## Remaining Release Blockers

1. IAP Sandbox final success evidence
   - Need: purchase success -> server grant -> `subscriptions.is_active=true` -> `completeProductGrant()` completed.
   - Existing: failure/recovery UI and SDK code path are implemented and tested.

2. Challenge submission form
   - Need: paste the captured public mini-app URL into the challenge form.
   - Existing: user-reported `출시하기` complete, Toss search visibility, and public URL `https://minion.toss.im/L1o5uCsg`.

3. Console operations checks
   - Need: business category/service category match, customer support channel readiness, mTLS callback test button final 200, certificate expiry calendar.

4. New icon release sync
   - Need: after icon replacement, upload/approve the new console icon URL and update `granite.config.ts` `brandIcon` if the URL changes.
   - Local scan: `app-logo-600.png` and `app-logo-600-dark.png` are 600x600; `app-icon.png` is 1024x1024.

## Not Current Blockers After 2026-05-12 Scan

- Ads callback refactor: implemented via framework event callbacks.
- IAP `completeProductGrant()` missing: implemented in `src/lib/api/iap.ts`.
- Ads slot wiring: R2/B1/B2/B3/I1 wired.
- Live Ad Group ID fallback: implemented in `src/lib/ads/config.ts`.
- DevMenu / plan override leakage: gated by `isDevToolsEnabled()` requiring `__DEV__` and `EXPO_PUBLIC_SHOW_DEV_MENU=true`.
- Loopback backend URL: limited to DEV Metro host resolution; release defaults to Railway public URL.
- mTLS mock-mode doc drift: latest status says real mTLS for `verify-iap-order`, `send-smart-message`, and `grant-toss-points`.

## Validation

- `npm run typecheck` — PASS
- `npm run test:app -- --runInBand --passWithNoTests` — PASS, 16 suites / 101 tests
- `npm run test:edge -- --runInBand --passWithNoTests` — PASS, 13 suites / 45 tests
- `Backend/venv/bin/pytest Backend/tests/ -q` — PASS, 57 tests
- Code scan: `rg` for mock/TODO/loopback/external payment/icon/Ads/IAP/Smart Message consistency
