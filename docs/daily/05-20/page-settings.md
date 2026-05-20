# /settings UX Hardening - 2026-05-20

- Scope: APP-001, MSG-001
- Skill: `page-settings-upgrade`

## Findings

- [x] `AI 코칭` 설정은 실제 백엔드 코칭 프롬프트에서 `ai_persona`를 읽으므로 유지 대상이다.
- [x] 기존 `동기화 상태` 행은 사용자 가치보다 내부 저장 상태 노출에 가까워 삭제 대상이다.
- [x] 기존 알림 세부 토글은 `user_settings.notification_pref` 저장은 되지만, 사용자에게 과도하게 세분화해 보여주지 않는 편이 안전하다.
- [x] `send-smart-message` Edge 발송 경로는 `notification_pref`를 직접 읽어 발송 전 차단해야 한다.

## Changes

- [x] Removed user-visible `동기화 상태` from notification settings.
- [x] Collapsed notification toggles to `중요 알림` and `혜택/이벤트 알림`.
- [x] `중요 알림` now updates the grouped notification preference fields together: `smart_message`, `push`, `log_reminder`, `surge_alert`, `coaching_ready`, `training_reminder`.
- [x] `혜택/이벤트 알림` now updates both `notification_pref.types.promo` and `marketing_agreed`, so promo consent is stored on the same user action.
- [x] Save failure is shown only as an error message instead of a persistent sync-status row.
- [x] `send-smart-message` now loads `user_settings.notification_pref` before Toss S2S send and blocks disabled Smart Message channels or disabled notification types.
- [x] `send-smart-message` now also reads `marketing_agreed` and blocks `promo` sends unless both promo preference and marketing consent are true.
- [x] Smart Message quiet-hours cooldown now uses the user's stored `quiet_hours` window instead of only the fixed 22-08 default.

## DEV_LOCAL QA

- [x] `/settings` rendered in DEV_LOCAL without JS crash.
- [x] Notification section shows two user-facing toggles and no `동기화 상태` row. Evidence: `/tmp/taillog-qa/dev-local-settings-simplified-notifications-top.png`
- [x] DEV_LOCAL setting toggle verified on device: `혜택/이벤트 알림` ON emitted `notification_pref.types.promo=true` + `marketing_agreed=true`, then restored OFF with both values false. Evidence: `/tmp/taillog-qa/dev-local-settings-marketing-agreed-toggle-on.png`, `/tmp/taillog-qa/dev-local-settings-marketing-agreed-toggle-off-restored.png`
- [x] Edge validation passed: scoped send-smart-message Jest (9 tests), plus `npm run test:edge` (13 suites / 52 tests).
- [x] Static validation passed: `npx tsc --noEmit`, scoped `git diff --check`.

## Self Review

- Good: Settings no longer over-exposes granular notification controls in the user-facing UI.
- Good: Edge `send-smart-message` now enforces `notification_pref` before sending, so UI toggles are backed by a server-side guard.
- Good: Promo notification consent is now double-keyed by explicit promo preference and `marketing_agreed`.
- Weak: This is code/test-ready only; Supabase Edge deploy and runtime log proof are pending explicit upload/deploy instruction.
- Gap: Runtime Edge invoke proof for the new promo consent branch is pending deployment.

Board Sync: `/settings` remains `QA`; DEV_LOCAL display/toggle pass, Edge preference + marketing consent code/test pass, deploy pending explicit instruction.
