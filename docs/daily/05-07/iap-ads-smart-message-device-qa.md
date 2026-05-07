# 2026-05-07 IAP/Ads/Smart Message Device QA

Scope: `IAP-001`, `AD-001`, `MSG-001`

## Summary

- [x] IAP Sandbox 3시나리오 패널 진입 확인: 결제 성공, 결제 성공(서버 실패), 에러 테스트
- [x] IAP 에러 시나리오 확인: `USER_CANCELED` 후 `구매 실패` UI
- [x] IAP 서버 실패 시나리오 확인: `getPendingOrders` 복구 안내 UI
- [x] IAP false-success 버그 수정: 서버 grant 실패 시 `GRANT_FAILED`, `completeProductGrant` 미호출
- [x] Smart Message 실발송 확인: cooldown 429 후 HTTP 200, `noti_history.success=true`
- [x] Ads 기존 업로드 빌드 문제 확인: AIT Runtime `process.env` 초기화로 test ID fallback, B1 mock preview 표시
- [x] Ads 수정: live adGroupId 7종 상수 fallback + real FullScreen SDK wrapper
- [x] 새 AIT 빌드: `019e00b2-88ce-7232-9230-2924107c3c62`, `taillog-app.ait` hash `1a89a99527c9f2cb4c270e0e76b120690a7774a6c1e027f904efbd855074be6e`
- [x] 새 AIT 번들 스캔: `ait-ad-test-*` 문자열 0개, `brandIcon:"data:image/png;base64"` 포함
- [x] IAP loading 잔여 버그 수정: `processProductGrant=false` 확정 즉시 `GRANT_FAILED` 방출, SDK 최종 이벤트 미수신 시에도 버튼 pending 해제
- [x] Release/심사용 DEV 도구 gate 적용: `EXPO_PUBLIC_SHOW_DEV_MENU=true`일 때만 DevMenu/플랜 override/가드 bypass/DEV IAP bypass 활성
- [x] 새 심사용 AIT 빌드: `019e00c2-6e81-78a7-af0e-3570b43fabe8`, `taillog-app.ait` hash `7d5f672bd15301768a2dbffc0a15c75a5305df9713d0141477de7a8fcaf8bf5f`
- [x] 새 심사용 AIT 번들 스캔: `isDevToolsEnabled() -> return false`, `ait-ad-test-*` 문자열 0개, live adGroupId 7종 포함
- [x] 새 심사용 AIT 콘솔 업로드 후 IAP loading 해제 실기기 재검증: `구매 실패` Alert 후 버튼 `충전` 복귀
- [x] 새 심사용 AIT 콘솔 업로드 후 DEV FAB 미노출 확인
- [x] 새 심사용 AIT 콘솔 업로드 후 Ads mock fallback 미사용 + 실제 SDK 호출 확인: B1 `ad_error`
- [x] Ads `ad_error` 원인 로깅 강화: B1/B2/B3 InlineAd 콜백 payload, `adGroupId`, variant, screen, phase를 tracker payload에 포함
- [x] IAP Edge/proxy 404 원인 정리: Edge direct 404/timeout은 Toss mini-app 네트워크 우회 대상, proxy 404는 `iap.ts`가 `.env` backend URL을 무시하고 `127.0.0.1:8765`를 직접 호출하던 문제 + 현재 Railway public URL이 `Application not found` 404를 반환하는 배포/URL 문제로 분리
- [x] IAP proxy 호출 수정: `requestBackend('/api/v1/subscription/iap/verify')` 경유로 변경해 `EXPO_PUBLIC_BACKEND_URL` 적용
- [x] Ads diagnostics/IAP proxy patch 최신 AIT 빌드: `019e00dd-24bb-7fa1-b385-251e67eae2e8`, `taillog-app.ait` hash `631c7008359a51405e25d5cfd2efe4934555e2908fc3ce3d28ce4584a7b9bfdc`
- [x] 최신 AIT 번들 스캔: `ait-ad-test-*` 0개, live adGroupId 7종 포함, `brandIcon` data URI 포함, local brand path 없음, `isDevToolsEnabled() -> return false`
- [x] 최신 업로드 AIT `019e00dd...` B1/B2/B3 순차 재시도: 세 슬롯 모두 live adGroupId로 `ad_requested` 후 SDK `ad_error` 발생, 공통 payload `code=1007`, `domain=@apps-in-toss/framework`, `This feature is not supported in the current environment`
- [x] IAP backend hardcoded 재점검: `requestBackend` 기본 fallback을 Railway public URL로 변경하고, release 빌드는 env가 없어도 Railway로 고정. `127.0.0.1:8765`은 DEV + `localhost/0.0.0.0` Metro scriptURL일 때만 사용하도록 제한. legacy `verifyIAPOrder()`도 404/408 시 FastAPI proxy로 우회.
- [x] Railway 복구 시도: linked project/service는 확인됐지만 `railway up --detach`가 `Your trial has expired`로 중단되어 backend URL/deploy 복구 및 IAP 성공 테스트는 계정 플랜 복구 전 blocked.
- [x] hardcoded fallback/test literal 제거 후 최신 AIT 재빌드: `019e00f0-10c7-7fe7-96c7-b050e81d8d0b`, hash `705b16fb5ff1797f8246478684d0c564c715e6a6d2527d78f146eeabf0b24699`; 루트 `.ait`는 최신 1개만 유지.
- [x] Railway 재배포 성공: deployment `d11ae99d-c5bf-47ba-98a7-0bea0a635848` SUCCESS, `/health` HTTP 200 `{"status":"ok"}`. IAP proxy route smoke는 무인증 POST 기준 HTTP 401 `Not authenticated`로 라우트 생존 확인.
- [x] IAP S2S 404 root fix: `verify-iap-order` Edge v13 재배포. Toss IAP 검증 경로를 `/iap/verify-order`에서 `/order/get-order-status`로 교체하고 `users.toss_user_key`를 `x-toss-user-key`로 전달.
- [x] 업로드 AIT `019e00f0...` 실기기 성공 테스트 재시도 결과: Toss SDK 이벤트가 서버 grant 완료보다 먼저 와서 앱이 `GRANT_FAILED`로 조기 확정하는 프론트 상태머신 버그 재현 (`구매 실패` Alert).
- [x] IAP loading/success 상태머신 추가 수정: SDK 결제 이벤트가 `processProductGrant` 완료보다 먼저 와도 실패로 처리하지 않고, 서버 grant 성공 + `completeProductGrant` 이후 `GRANT_COMPLETED` 처리.
- [x] 새 AIT 재빌드: `019e0105-a1b2-7258-87f2-c49fc15186da`, hash `14611240d8b141a6fa6446a35e0d0f9ad0a39fcec628c4ebfd4de399f85d4807`; 루트 `.ait`는 최신 1개만 유지.
- [x] 새 AIT 번들 스캔: Supabase/Railway URL 포함, `ait-ad-test-*` 0개, `brandIcon` data URI 1개, `isDevToolsEnabled() -> return false`, IAP state markers 포함.

## Post Upload Check

Deployment: `019e00b2-88ce-7232-9230-2924107c3c62`

- [x] `intoss-private://taillog-app?_deploymentId=019e00b2-88ce-7232-9230-2924107c3c62` 실기기 실행 성공
- [x] Dashboard FREE override에서 이전 빌드의 `[광고 미리보기]` fallback 텍스트가 사라짐
- [x] IAP token10 `충전` -> Toss Sandbox parameter panel 표시
- [x] IAP `결제 성공 테스트` 재시도 시 이전 false-success UI(`구독 완료`)는 재현되지 않음
- [x] IAP `결제 성공 테스트` 후 버튼 loading(`...`) 잔류 원인 정리: SDK 최종 이벤트 미수신 시 `GRANT_FAILED` 미방출

Deployment: `019e00c2-6e81-78a7-af0e-3570b43fabe8`

- [x] `intoss-private://taillog-app?_deploymentId=019e00c2-6e81-78a7-af0e-3570b43fabe8` 실기기 실행 성공
- [x] Dashboard/Settings 화면 덤프에서 `DEV`/`Dev Navigator` 미노출
- [x] IAP token10 `충전` -> Toss Sandbox parameter panel 표시
- [x] IAP `결제 성공 테스트` -> 서버 검증 404/proxy 404 -> app `구매 실패` Alert 표시
- [x] Alert `OK` 후 token10/token30 버튼 모두 `충전`으로 복귀 (`...` 잔류 없음)
- [x] Ads B1 실 SDK 호출 확인: test fallback text 미노출, Google Ads WebView 로드 후 `tracker ad_error { placement: 'B1' }`
- [x] Ads 테스트를 위해 current user를 일시 `FREE`로 변경 후 원복 완료: `PRO_MONTHLY`, `is_active=true`, `next_billing_date=2026-06-03`, tokens `10/10`

Deployment: `019e00dd-24bb-7fa1-b385-251e67eae2e8`

- [x] `intoss-private://taillog-app?_deploymentId=019e00dd-24bb-7fa1-b385-251e67eae2e8` 실기기 실행 성공
- [x] B1 `/dashboard`: `adGroupId=ait.v2.live.e93e93f42ff840cb`, `phase=inline_failed_to_render`, SDK error `code=1007`
- [x] B2 `/dashboard/quick-log`: `adGroupId=ait.v2.live.350eee8c0ed34726`, `phase=inline_failed_to_render`, SDK error `code=1007`
- [x] B3 `/training/detail`: `adGroupId=ait.v2.live.f5dfef1b87cf4698`, `phase=inline_failed_to_render`, SDK error `code=1007` (remount로 2회 관측)
- [x] Ads 테스트를 위해 current user를 일시 `FREE`로 변경 후 원복 완료: `PRO_MONTHLY`, `is_active=true`, `next_billing_date=2026-06-03`, tokens `10/10`
- [x] Railway linked context 확인: project `taillogtoss-backend`, environment `production`, service `taillogtoss-backend`
- [x] Railway deploy restore attempt: `railway up --detach` 실패, reason `Your trial has expired. Please select a plan to continue using Railway.`
- [x] Railway deploy retry after plan recovery: `d11ae99d-c5bf-47ba-98a7-0bea0a635848` SUCCESS
- [x] Railway health restored: `https://taillogtoss-backend-production.up.railway.app/health` -> HTTP 200 `{"status":"ok"}`
- [x] IAP proxy route smoke: unauthenticated `POST /api/v1/subscription/iap/verify` -> HTTP 401 `Not authenticated` (route/auth middleware alive)

Deployment: `019e00f0-10c7-7fe7-96c7-b050e81d8d0b`

- [x] local AIT build PASS, RN 0.84.0/0.72.6 both 0 errors / 0 warnings
- [x] `ait-ad-test-*` literal count: 0
- [x] unique live adGroupId count: 7
- [x] backend bundle check: `fromEnv=https://taillogtoss-backend-production.up.railway.app`, release branch `if (true) return PUBLIC_BACKEND_URL`
- [x] latest-only AIT cleanup: only `/Users/family/jason/TaillogToss/taillog-app-019e00f0-10c7-7fe7-96c7-b050e81d8d0b.ait` remains
- [x] uploaded AIT launch: `intoss-private://taillog-app?_deploymentId=019e00f0-10c7-7fe7-96c7-b050e81d8d0b`
- [x] IAP token10 success retry after Railway/Edge restore: `구매 실패` Alert 재현; logcat token user `37166a09-7be6-4719-b46c-9bd9998e8f10`, no new `toss_orders` row. Root cause moved from backend URL/Edge route to frontend SDK event ordering.

Deployment: `019e0105-a1b2-7258-87f2-c49fc15186da`

- [x] local AIT build PASS, RN 0.84.0/0.72.6 both 0 errors / 0 warnings
- [x] latest-only AIT cleanup: only `/Users/family/jason/TaillogToss/taillog-app-019e0105-a1b2-7258-87f2-c49fc15186da.ait` remains
- [x] `ait-ad-test-*` literal count: 0
- [x] backend bundle check: Railway public URL present
- [x] release DEV gate bundle check: `isDevToolsEnabled() { return false; }`
- [ ] console upload + IAP token10 `결제 성공 테스트` final retry

## Evidence

IAP device user: `37166a09...`

- Error scenario: Toss Sandbox `에러 테스트` -> `USER_CANCELED` -> app `구매 실패` UI
- Server failure scenario: order `FC513B19-BF72-4DFF-8000-45F44C52E37A`, Edge request `019e00a6-82d5-7f9f-a80c-ed40078e9958`, proxy 404 `IAP_VERIFY_FAILED`
- Success scenario before patch: order `011283E6-A31C-40EE-8364-0C8C0253D6A7`, Edge request `019e00a7-0730-7b3e-85ef-38bd11c46432`, proxy 404 but app showed success. Patched and covered by Jest.
- Post-upload loading regression check: order `BDA3C2DC-5D35-47FE-85D1-F405BD604F1D`; Edge direct 404 -> FastAPI proxy `BACKEND_404` -> app `구매 실패` Alert -> buttons returned to `충전`.

Smart Message:

- First invoke: HTTP 429 `RATE_LIMITED`, cooldown behavior expected
- Retry after cooldown: HTTP 200 `{ ok:true, sent:true }`
- `noti_history`: `template_set_code=taillog-app-TAILLOG_BEHAVIOR_REMIND`, `notification_type=log_reminder`, `success=true`, `sent_at=2026-05-07T04:21:15.576092+00:00`

Ads:

- Existing uploaded build rendered B1 as `[광고 미리보기] 대시보드 로그 목록 상단`, proving runtime fallback to test ID.
- New local AIT `019e00b2...` scan:
  - `ait-ad-test-*`: 0
  - live IDs: R1/R2/R3/B1/B2/B3/I1 present
  - `createFrameworkAdsSdk`, `loadFullScreenAd`, `showFullScreenAd` present
- New local AIT `019e00c2...` scan:
  - `ait-ad-test-*`: 0
  - live IDs: R1/R2/R3/B1/B2/B3/I1 present
  - `isDevToolsEnabled()`: bundled as `return false`
- Post-upload B1:
  - no `[광고 미리보기]` fallback text
  - Google Ads WebView loaded (`Ads JS: The jsLoaded GMSG has been sent`)
  - app tracker emitted `ad_error` for placement `B1`
  - render success/no-fill was not observed in this run; outcome is real SDK render error, not mock fallback.
- Post-upload `019e00dd...` retry:
  - B1: `screen=dashboard`, `variant=expanded`, `phase=inline_failed_to_render`, `ad_group_id=ait.v2.live.e93e93f42ff840cb`
  - B2: `screen=quick-log`, `variant=card`, `phase=inline_failed_to_render`, `ad_group_id=ait.v2.live.350eee8c0ed34726`
  - B3: `screen=training-detail`, `variant=expanded`, `phase=inline_failed_to_render`, `ad_group_id=ait.v2.live.f5dfef1b87cf4698`
  - All three carried SDK details: `code=1007`, `domain=@apps-in-toss/framework`, message `This feature is not supported in the current environment`.
  - I1 incidental risk: training academy card tap requested fullscreen ad, then `Full screen ads are not supported in this Toss app version`; current hook blocks normal navigation on load error for FREE users.

Follow-up patch:

- B1/B2/B3 `InlineAd` callbacks now accept an optional SDK details object instead of dropping it.
- Tracker payloads now include `ad_group_id`, `variant`, `screen`, `phase`, `mock_mode`, and safe summaries of SDK `code/message/name/details`.
- Fullscreen R/I slots also preserve raw SDK error payloads before sending tracker `ad_error`.

IAP 404 root split:

- Direct Edge: `supabase.functions.invoke('verify-iap-order')` returning 404/timeout remains the mini-app network bypass trigger.
- App proxy bug: fallback used an absolute `http://127.0.0.1:8765/...` URL, so uploaded AIT ignored `EXPO_PUBLIC_BACKEND_URL`.
- Public backend: `https://taillogtoss-backend-production.up.railway.app/health` restored to HTTP 200 after Railway deployment `d11ae99d-c5bf-47ba-98a7-0bea0a635848`.
- Hardcoded backend re-check after patch:
  - `src/lib/api/iap.ts`: main IAP proxy path uses `requestBackend('/api/v1/subscription/iap/verify')`.
  - `src/lib/api/subscription.ts`: legacy `verifyIAPOrder()` now falls back to the same FastAPI proxy on 404/408.
  - `src/lib/api/backend.ts`: release build now falls back to `https://taillogtoss-backend-production.up.railway.app`; `127.0.0.1:8765` remains only for DEV explicit local Metro hostnames `localhost`/`0.0.0.0`.
  - Uploaded AIT `019e00f0...` already had Railway URL inlined and no local fallback branch for release.

IAP event-order root cause:

- `createOneTimePurchaseOrder` previously treated any SDK `onEvent` before `grantApproved=true` as `GRANT_FAILED`.
- In the real sandbox flow, Toss SDK can emit a payment event while `processProductGrant` is still waiting for `verify-iap-order`, so the UI resolved failure before backend grant could complete.
- Patch: cache early SDK payment result, do not fail while grant is pending, emit `GRANT_COMPLETED` after server grant succeeds and `completeProductGrant` is called.

## B1/B2/B3 Retry Result

- B1/B2/B3: all reached real SDK with live adGroupId and classified `ad_error` details.
- No mock fallback text appeared.
- No `ad_loaded` or no-fill result was observed; the blocker is environment capability `code=1007`, not missing adGroupId.
- Device user subscription was restored after temporary FREE override.

## Validation

- `npx tsc --noEmit`: PASS
- `npx tsc --noEmit`: PASS after Ads diagnostics/IAP proxy patch
- `npx jest src/lib/hooks/__tests__/useRewardedAd.test.ts src/lib/api/__tests__/iap.test.ts --runInBand`: PASS, 21 tests after Ads diagnostics/IAP proxy patch
- `curl https://taillogtoss-backend-production.up.railway.app/health`: initially HTTP 404 Railway `Application not found`, restored to HTTP 200 `{"status":"ok"}` after redeploy
- `npm run build`: PASS, deploymentId `019e00dd-24bb-7fa1-b385-251e67eae2e8`
- `railway status`: project `taillogtoss-backend`, environment `production`, service `taillogtoss-backend`
- `railway up --detach`: first FAIL due Railway trial expired, retry PASS with deployment `d11ae99d-c5bf-47ba-98a7-0bea0a635848`
- `curl -X POST /api/v1/subscription/iap/verify` without auth: HTTP 401 `Not authenticated`
- `npx tsc --noEmit`: PASS after backend hardcoded fallback patch
- `npx jest src/lib/api/__tests__/iap.test.ts --runInBand`: PASS, 16 tests
- `npx jest src/lib/api/__tests__/iap.test.ts src/lib/hooks/__tests__/useRewardedAd.test.ts --runInBand`: PASS, 21 tests
- `npm run build`: PASS, deploymentId `019e00f0-10c7-7fe7-96c7-b050e81d8d0b`
- Latest AIT only: `/Users/family/jason/TaillogToss/taillog-app-019e00f0-10c7-7fe7-96c7-b050e81d8d0b.ait`
- `npx jest src/lib/api/__tests__/iap.test.ts src/lib/hooks/__tests__/useRewardedAd.test.ts --passWithNoTests`: PASS, 21 tests
- `npx jest supabase/functions/__tests__/send-smart-message.test.ts --passWithNoTests`: PASS, 3 tests
- `npm run build`: PASS, RN 0.84.0 / 0.72.6, 0 errors / 0 warnings
- `npx jest src/lib/api/__tests__/iap.test.ts --runInBand`: PASS, 17 tests after event-order patch
- `npx jest supabase/functions/__tests__/verify-iap-order.test.ts --runInBand`: PASS, 3 tests after Edge v13 path/user-key patch
- `npx tsc --noEmit`: PASS after event-order patch
- `npm run build`: PASS, deploymentId `019e0105-a1b2-7258-87f2-c49fc15186da`
- Latest AIT only: `/Users/family/jason/TaillogToss/taillog-app-019e0105-a1b2-7258-87f2-c49fc15186da.ait`

## AIT Standalone Launch Recheck

Deployment: `019e013f-8deb-73d0-8d82-07aff519c399`

- [x] local artifact scan: `taillog-app.ait` contains deploymentId `019e013f...`, `brandIcon` data URI, Supabase URL, `ait-ad-test-*` literal count `0`, and `isDevToolsEnabled() -> return false`.
- [x] `node --check` on `bundle.android.0_84_0.js` and `bundle.android.0_72_6.js`: PASS.
- [x] Metro/local control: with Metro on, `intoss://taillog-app/` launches and logs `[AIT-BUILD] taillog-iap-entry-20260507-1605`.
- [x] Private scheme with Metro on: `intoss-private://taillog-app?_deploymentId=019e013f...` launches through Metro, not standalone; initial props normalize to `scheme:"intoss://taillog-app?_deploymentId=019e013f..."`.
- [x] Standalone control: with Metro off, previous user-confirmed deployment `019e008c-d1e0-7148-bd63-cc61473c135f` now shows the same host error as latest (`앱 실행도중 문제가 발생했습니다.`).
- [x] Invalid deployment control: with Metro off, `00000000-0000-0000-0000-000000000000` shows the same test-app host error, so the current symptom is indistinguishable from deployment lookup/registration failure in `viva.republica.toss.test`.
- [x] Main Toss package control: `viva.republica.toss` resolves `intoss-private://...` to `.intoss.MiniAppSchemeActivity` but shows `지금은 서비스를 사용할 수 없어요.`

Conclusion: current source and Metro runtime are healthy. The failing path is standalone private deployment lookup/execution, not IAP event-order code. Next check should use the exact console-generated test link after a successful deploy, or deploy via `ait deploy --location ./taillog-app.ait --scheme-only` with a registered API key/profile.

## AIT API Deploy Recheck

Deployment: `019e0160-42d7-72b2-b79a-806ee366eb31`

- [x] API-key deploy: `ait deploy --api-key <redacted> --location ./taillog-app.ait --scheme-only` returned `intoss-private://taillog-app?_deploymentId=019e0160-42d7-72b2-b79a-806ee366eb31`.
- [x] Content uniqueness: `_app.tsx` AIT marker bumped to `taillog-iap-entry-20260507-1638-deploy2` to avoid Code 4097 duplicate upload.
- [x] Build: `ait build` PASS for RN 0.84.0 and RN 0.72.6, 0 errors / 0 warnings.
- [x] Artifact: root contains only `taillog-app.ait`, hash `3094e7f3de9d94bf3511197aae015e248292ea7cbec7416ce23c7023ecb64cd3`.
- [x] Syntax scan: `node --check` PASS for `bundle.android.0_84_0.js` and `bundle.android.0_72_6.js`.
- [x] Bundle scan: deploymentId `019e0160...`, `brandIcon:"data:image/png;base64,...`, `function isDevToolsEnabled`, and marker `taillog-iap-entry-20260507-1638-deploy2` present.
- [x] Standalone launch with Metro off: CLI-generated private URL still fails before JS with test-app host error (`앱 실행도중 문제가 발생했습니다.`); no `ReactNativeJS` marker appears in logcat.
- [x] Metro restored after test: `packager-status:running`, `adb reverse tcp:8081` and `adb reverse tcp:8765` restored.

Conclusion: upload/API-key/duplicate-registration are no longer the blocker. The failing path is before JS execution inside the AIT host. The previous "data URI brand icon success" note is now treated as a likely false positive because Metro-on private launches normalize through `intoss://...` and do not prove standalone execution. Next fix should replace `appsInToss.brand.icon` with the HTTPS logo image URL from the Apps in Toss console app information image, then rebuild/deploy and re-run Metro-off standalone launch.

## AIT HTTPS Brand Icon Recheck

Deployment: `019e018d-e9cc-7714-ba48-bb936ad4a6e2`

- [x] `granite.config.ts`: `appsInToss.brand.icon` changed to the Apps in Toss console HTTPS logo URL.
- [x] Logo URL probe: HTTP 200, `content-type: image/png`, `content-length: 366876`.
- [x] Build: `ait build` PASS for RN 0.84.0 and RN 0.72.6, 0 errors / 0 warnings.
- [x] Artifact: root contains only `taillog-app.ait`, hash `7428c30110de663d19418b2a1a329439b5f6957bb733c1acfcf1e12d2d77cc48`.
- [x] Syntax scan: `node --check` PASS for `bundle.android.0_84_0.js` and `bundle.android.0_72_6.js`.
- [x] Bundle scan: deploymentId `019e018d...`, `brandIcon:"https://static.toss.im/appsintoss/24957/82272792-1628-40f1-abbd-fd4be9e657e0.png"`, no `brandIcon:"data:image/png;base64`, no `brandIcon:"./src/`, marker `taillog-icon-url-20260507-1700`, and `ait-ad-test-*` count `0`.
- [x] API-key deploy: `ait deploy --api-key <redacted> --location ./taillog-app.ait --scheme-only` returned `intoss-private://taillog-app?_deploymentId=019e018d-e9cc-7714-ba48-bb936ad4a6e2`.
- [x] Standalone launch with Metro off: both `intoss-private://taillog-app?_deploymentId=019e018d...` and `intoss://taillog-app?_deploymentId=019e018d...` still fail before JS with the same test-app host error; no `ReactNativeJS` marker appears in logcat.

Conclusion: `brand.icon` local path, data URI, duplicate upload, and API-key deploy are now ruled out. The remaining blocker is the Apps in Toss test host deployment execution/compatibility path. Escalate with deploymentId `019e018d-e9cc-7714-ba48-bb936ad4a6e2`, the exact CLI URL, the UI text `앱 실행도중 문제가 발생했습니다.`, and the fact that no JS marker logs.

## AIT Official RegisterApp Recheck

Deployment: `019e01b9-3c4c-7677-b6b9-d80529a2d868`

- [x] Official docs diff: `_app.tsx` changed from `Granite.registerApp(...)` to `AppsInToss.registerApp(AppContainer, { context })`.
- [x] Typecheck: `npx tsc --noEmit` PASS.
- [x] Build: `ait build` PASS for RN 0.84.0 and RN 0.72.6, 0 errors / 0 warnings.
- [x] Artifact: root contains only `taillog-app.ait`, hash `8a18b7d9dbb1e0c8be8ccec2513246f5e2f00cfb30f772e26f3ae84d923a7707`.
- [x] Syntax scan: `node --check` PASS for `bundle.android.0_84_0.js` and `bundle.android.0_72_6.js`.
- [x] Bundle scan: deploymentId `019e01b9...`, `brandIcon:"https://static.toss.im/appsintoss/24957/82272792-1628-40f1-abbd-fd4be9e657e0.png"`, no data URI/local brand path, marker `taillog-appsintoss-wrapper-20260507-1745`, `AppsInTossInitialProps`, `RNNavigationBar`, `TDSProvider`, and `ait-ad-test-*` count `0`.
- [x] API-key deploy: returned `intoss-private://taillog-app?_deploymentId=019e01b9-3c4c-7677-b6b9-d80529a2d868`.
- [x] Standalone launch with Metro off: still fails before JS with the same test-app host error; no `ReactNativeJS`/AIT marker appears in logcat.

Conclusion: official `AppsInToss.registerApp` wrapper is now applied and ruled out as the missing piece. Remaining likely causes are outside app JS: Apps in Toss test host/deployment execution, sandbox app freshness/compatibility, or QR-console execution context differences from direct adb scheme launch.

## Metro-On Control After Official Wrapper

Deployment: `019e01b9-3c4c-7677-b6b9-d80529a2d868`

- [x] Metro started with `node_modules/.bin/granite dev --port 8081`; `curl http://localhost:8081/status` returned `packager-status:running`.
- [x] ADB reverse restored: `tcp:8081` for Metro and `tcp:8765` for FastAPI; backend `/health` returned `{"status":"ok"}`.
- [x] `intoss-private://taillog-app?_deploymentId=019e01b9-3c4c-7677-b6b9-d80529a2d868` launched successfully with Metro on.
- [x] Device UI reached the real app dashboard: `테일로그`, dog `메이`, tabs `홈`/`훈련`/`설정`.
- [x] Logcat confirmed local bundle execution: `loadJSBundleFromMetro()` and `[AIT-BUILD] taillog-appsintoss-wrapper-20260507-1745`.
- [x] Analytics showed a local Metro deployment id different from the uploaded `_deploymentId`, confirming this path is Metro/local bundle execution rather than standalone `.ait` execution.

Conclusion: app JS and the official Apps in Toss wrapper are healthy under Metro. The remaining failure is isolated to the uploaded standalone private deployment path when Metro is off.

## Post-Push Elimination: Sandbox App Version

- [x] Official docs recheck: Apps in Toss sandbox docs say RN 0.84 testing should use the latest sandbox app, and the current Android sandbox build listed in the docs is `2026-04-22`.
- [x] Device package check: installed `viva.republica.toss.test` shows `firstInstallTime=2026-04-02 18:54:21`, `lastUpdateTime=2026-04-03 00:16:44`, `versionCode=100000`, `versionName=1.0.0`.
- [x] Scheme resolver check: `intoss-private://taillog-app?...` resolves to `viva.republica.toss.test/.MiniAppSchemeActivity`, so the direct private scheme is being handled by the sandbox app.
- [x] Official `AppsInToss.registerApp(AppContainer, { context })` example confirms the current wrapper shape is valid; missing `appName` in `_app.tsx` is not the likely cause.

Initial conclusion: the strongest remaining cause was an outdated sandbox app host. The installed Android sandbox app predates the official current Android sandbox build, while Metro succeeds because it bypasses the uploaded standalone host path.

## Latest Sandbox APK Recheck

Source: `/Users/family/Downloads/rn-miniapp-real-release-protected.DL3GxCd4.zip`

- [x] Zip contents: `rn-miniapp-real-release-protected.apk`, timestamp `2026-04-22 12:18`, size about `84MB`.
- [x] `adb install -r /tmp/taillog-toss-sandbox-apk/rn-miniapp-real-release-protected.apk`: `Success`.
- [x] Device package after install: `viva.republica.toss.test`, `versionCode=100000`, `versionName=1.0.0`, `lastUpdateTime=2026-05-07 18:38:12`, same signature hash as previous install.
- [x] Metro-off `intoss-private://taillog-app?_deploymentId=019e01b9-3c4c-7677-b6b9-d80529a2d868` in sandbox app: still host error before JS marker (`앱 실행도중 문제가 발생했습니다.`).
- [x] Real Toss app check: `viva.republica.toss` version `5.258.1`, direct private scheme shows `지금은 서비스를 사용할 수 없어요.` with no JS marker.
- [x] Sandbox app launcher/home opens and lists `taillog-app`, so developer login/workspace app listing is present.
- [x] SDK source recheck: `AppsInToss.registerApp` internally derives `appName` from `global.__granite.app.name` and calls `Granite.registerApp` with that value, so not passing `appName` in `_app.tsx` is not the cause.

Conclusion: outdated sandbox app is ruled out. Remaining likely causes are deployment entitlement/lookup in the Apps in Toss host, a difference between direct adb scheme launch and console QR/test-button context, or a server-side registration issue for private deployment `019e01b9...`.

## Minimal AIT Smoke Build

- [x] Temporary `_app.tsx` replaced with a single-screen `AppsInToss.registerApp` smoke app.
- [x] Typecheck: `npx tsc --noEmit` PASS.
- [x] Build: `ait build` PASS, deploymentId embedded in artifact `019e01f5-9ae6-774d-90d7-e68ac7132db5`.
- [x] Artifact: current root `taillog-app.ait`, hash `552c233d3d5d3ada1eee5676f66fc6950e667b65664713d2e72c060b6ed81d03`, size about `17MB`.
- [x] Bundle scan: `brandIcon:"https://static.toss.im/appsintoss/24957/82272792-1628-40f1-abbd-fd4be9e657e0.png"`, `[AIT-SMOKE] minimal-standalone-20260507-1845`, `Taillog AIT Smoke`, and `AppsInTossInitialProps` present.
- [x] Syntax scan: `node --check` PASS for Android RN `0.84.0` and `0.72.6` bundles.
- [x] Source restored to the normal app after smoke artifact creation; typecheck PASS after restore.

Next: upload the current `taillog-app.ait` smoke artifact in the Apps in Toss console and run it by console QR/test button. If this minimal artifact also fails before JS, the blocker is host/deployment registration rather than the Taillog app bundle.

## Minimal AIT Smoke Upload Recheck

Deployment: `019e01f5-9ae6-774d-90d7-e68ac7132db5`

- [x] User uploaded the minimal smoke artifact to Apps in Toss console.
- [x] Metro state before launch: no process listening on `tcp:8081`; `adb reverse --list` only had `tcp:8765`.
- [x] Artifact identity before launch: current root `taillog-app.ait` hash `552c233d3d5d3ada1eee5676f66fc6950e667b65664713d2e72c060b6ed81d03`, size about `17MB`.
- [x] Sandbox package state: latest installed `viva.republica.toss.test` from the 2026-04-22 APK, `lastUpdateTime=2026-05-07 18:38:12`.
- [x] Direct standalone launch: `adb shell am start -a android.intent.action.VIEW -d 'intoss-private://taillog-app?_deploymentId=019e01f5-9ae6-774d-90d7-e68ac7132db5' viva.republica.toss.test`.
- [x] UI result: host dialog `앱 실행도중 문제가 발생했습니다.` / `앱인토스 개발자 커뮤니티로 문의해주세요.` with `돌아가기` button.
- [x] Logcat result: RN/native host process starts and `GraniteActivity` is resumed, but no `ReactNativeJS`, `[AIT-SMOKE]`, or `Taillog AIT Smoke` marker appears. The only relevant RN signal is `Unable to update root layout specs for uninitialized ReactInstanceManager`, followed by the host error dialog.

Conclusion: the minimal single-screen AIT also fails before JS execution. This rules out Taillog app bundle complexity, navigation, IAP, Ads, Smart Message, DEV menu, and most application-level runtime code. The remaining blocker is the Apps in Toss standalone host path: deployment lookup/entitlement/registration, console QR/test context mismatch, or an AIT host compatibility/ingestion issue.

## Daily Sync

- `docs/status/PROJECT-STATUS.md`: updated to QA state for IAP/MSG/AD
- `docs/status/11-FEATURE-PARITY-MATRIX.md`: `IAP-001`, `MSG-001`, `AD-001` evidence updated
- `docs/status/MISSING-AND-UNIMPLEMENTED.md`: stale mock/fallback blockers updated
- `.claude/skills/toss-guide/ops/toss-ait-build-ops/SKILL.md`: AIT standalone icon guidance corrected after API deploy recheck
- `granite.config.ts`: `brand.icon` updated to Apps in Toss console HTTPS logo URL
- `src/_app.tsx`: official `AppsInToss.registerApp` wrapper applied and retested
- Board status: parity board remains `QA` until Ads B1 returns either render success or a classified no-fill reason instead of generic `ad_error`
