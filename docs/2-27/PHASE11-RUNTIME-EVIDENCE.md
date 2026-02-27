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

## Runtime invoke evidence (captured via Supabase logs)
- [x] `login-with-toss` success log (`POST 200`, log id: `e4e69556-9104-4a90-bf37-78a48cc4e8cb`)
- [x] `login-with-toss` failure log (`POST 400`, log id: `910cb3fc-be6e-4b6e-8d72-888ce4756048`)
- [x] `login-with-toss` success log (`POST 200`, v11, log id: `f52019d7-0162-48bf-b021-de8bc80539de`)
- [x] `login-with-toss` success log (`POST 200`, v11, log id: `92de76c2-abaa-4d8c-81cc-3e7329fe6d21`)
- [x] `login-with-toss` failure log (`POST 502`, v11, log id: `2f0cd2ec-9d6a-453f-b1ac-ecb3e59cf53d`)
- [x] `verify-iap-order` success log (`POST 200`, log id: `4fbf2444-c9ae-40cf-99ec-f7d335615928`)
- [x] `verify-iap-order` failure log (`POST 400`, log id: `a04c03e4-611f-4ed7-8239-385a49a7dab3`)
- [x] `send-smart-message` success log (`POST 200`, log id: `555b479d-c4c5-46d3-8e0b-f05a0875db7b`)
- [x] `send-smart-message` failure log (`POST 403`, log id: `05990e0c-ba1d-40b9-bf20-27a0ff8460c9`)
- [x] `grant-toss-points` success log (`POST 200`, log id: `115b453d-53c0-44f0-ae6d-7699d93fd61b`)
- [x] `grant-toss-points` failure log (`POST 403`, log id: `bd130741-003f-4114-b0f0-ccf2bf69a474`)

## Notes
- `grant-toss-points` deployed and status verified as `ACTIVE` (version `1`).
- `login-with-toss`는 v11에서 mTLS 실연동 + Sandbox 실 authCode 200 재검증을 통과했다.
- `send-smart-message` success 응답에서 `noti_history.error_code=NOTI_HISTORY_WRITE_FAILED` 확인:
  런타임에서 DB 쓰기 실패 시 fail-open + 멱등 완료 처리(중복 발송 방지) 동작이 실제로 검증됨.
- `send-smart-message`를 실제 `public.users.id`(FK 유효 사용자)로 재호출하여
  `noti_history` insert 성공도 확인 (`error_code=null`, row id: `ab7fda25-f09b-49bc-9b5e-444f4577564c`).

## How to collect (fixed procedure)
1. Deploy latest edge functions (MCP or CLI).
2. Trigger each function from Toss sandbox/app with one success and one failure input.
3. Collect logs from Supabase (`edge-function` service) and append request-id/status.
4. Mark checklist above and sync `docs/11-FEATURE-PARITY-MATRIX.md`, `docs/12-MIGRATION-WAVES-AND-GATES.md`.
