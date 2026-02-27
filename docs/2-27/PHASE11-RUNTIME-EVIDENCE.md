# Phase 11 Runtime Evidence (2026-02-27)

## Scope
- Parity: `AUTH-001`, `IAP-001`, `MSG-001`
- Functions: `login-with-toss`, `verify-iap-order`, `send-smart-message`, `grant-toss-points`

## Completed in this session
- [x] Jest timeout root cause isolated (Granite fake timers vs retry `setTimeout`)
- [x] `test:app` / `test:edge` split and stable pass
- [x] `noti_history` DB schema expansion and Edge persistence wiring
- [x] 메시지 발송 성공 + DB 기록 실패 시 fail-open 처리로 중복 발송 방지
- [x] Deno runtime entrypoints (`main.ts`) and `supabase/config.toml` entrypoint mapping

## Runtime invoke evidence (pending manual trigger)
- [ ] `login-with-toss` success log
- [ ] `login-with-toss` failure log
- [ ] `verify-iap-order` success log
- [ ] `verify-iap-order` failure log
- [ ] `send-smart-message` success log
- [ ] `send-smart-message` failure log
- [ ] `grant-toss-points` success log
- [ ] `grant-toss-points` failure log

## How to collect (fixed procedure)
1. Deploy latest edge functions (MCP or CLI).
2. Trigger each function from Toss sandbox/app with one success and one failure input.
3. Collect logs from Supabase (`edge-function` service) and append request-id/status.
4. Mark checklist above and sync `docs/11-FEATURE-PARITY-MATRIX.md`, `docs/12-MIGRATION-WAVES-AND-GATES.md`.
