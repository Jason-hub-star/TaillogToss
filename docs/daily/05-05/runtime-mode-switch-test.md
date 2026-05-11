# 2026-05-05 Runtime Mode Switch Test

## Status: SANDBOX_REAL Unblocked

작성 시각: 2026-05-05 19:36 KST
최종 업데이트: 2026-05-11 KST — `019e14a7-ca44-7f9b-bd58-a9be19376360` private standalone launch PASS

## Scope

- Skill: `toss-runtime-mode-ops`
- Modes: `DEV_LOCAL` ↔ `SANDBOX_REAL`
- AIT URL: `intoss-private://taillog-app?_deploymentId=019df32f-40ad-785b-9d7c-ae18b9fba97e`
- Latest AIT URL: `intoss-private://taillog-app?_deploymentId=019e14a7-ca44-7f9b-bd58-a9be19376360`
- Safety: real charge, mass message, promotion 지급, Smart Message real send 미실행

## Environment Snapshot

| Item | Result |
|---|---|
| ADB | `R3CXB0QH0LY device` |
| Metro | `http://localhost:8081/status` -> `packager-status:running` after restore |
| FastAPI | `http://localhost:8765/health` -> `{"status":"ok"}` |
| adb reverse | `tcp:8081`, `tcp:8765` configured |
| Supabase Edge | 9 functions ACTIVE |
| mTLS secrets | `TOSS_CLIENT_CERT_BASE64`, `TOSS_CLIENT_KEY_BASE64`, `TOSS_MTLS_MODE` names present |
| Report AI secrets | `OPENAI_API_KEY`, `REPORT_AI_MODE` not listed |
| Ads env | `.env` contains `ait.v2.live.*` group ids |

## Switch Test

| Test | Command / Evidence | Result |
|---|---|---|
| DEV_LOCAL launch | `adb shell am start -a android.intent.action.VIEW -d 'intoss://taillog-app/' viva.republica.toss.test` | PASS |
| DEV_LOCAL screenshot | `/tmp/taillog-mode-dev-local.png`, `/tmp/taillog-mode-dev-local-final-check2.png` | App renders dashboard |
| SANDBOX_REAL with Metro on | `adb shell am start ... 'intoss-private://taillog-app?_deploymentId=019df32f-40ad-785b-9d7c-ae18b9fba97e'` | PARTIAL: launches, but appears to use dev/Metro runtime |
| SANDBOX_REAL without Metro | Metro killed, then same private URL launched | FAIL |
| SANDBOX_REAL failure screenshot | `/tmp/taillog-mode-sandbox-without-metro.png` | App-in-Toss generic runtime error |

## Key Finding

`SANDBOX_REAL` is not yet isolated from `DEV_LOCAL`.

Evidence:
- With Metro running, `intoss-private://...` reaches the app UI.
- With Metro stopped, the same private URL fails with "앱 실행도중 문제가 발생했습니다."
- Local `taillog-app.ait` contains `DevMenu`, `__DEV__`, `ait-ad-test`, and `127.0.0.1` strings.

Interpretation:
- The current test can validate local dev behavior.
- It must not be used as final IAP/Ads/Smart Message release evidence yet.
- Real console-linked QA should wait until AIT private URL runs without Metro.

## Gate

| Gate | Status | Reason |
|---|---|---|
| DEV_LOCAL | PASS | Local scheme, Metro, FastAPI, adb reverse work |
| SANDBOX_REAL | BLOCKED | AIT private URL does not run independently without Metro |
| PROD_READY | BLOCKED | SANDBOX_REAL not isolated; Report AI real secrets absent |

## Next Action

1. Rebuild a fresh `.ait` from current working tree.
2. Upload the new `.ait` to AIT console.
3. Re-test `intoss-private://taillog-app?_deploymentId=<new-id>` with Metro stopped.
4. Only after that, run:
   - IAP sandbox 3 scenarios
   - Ads console ID exposure test
   - Smart Message test send
   - mTLS real smoke
   - `REPORT_AI_MODE=real` only after `OPENAI_API_KEY` secret exists

## Build Follow-up

Executed after the blocked switch test:

```bash
npm run build
```

Result:
- Build: PASS (`0 errors`, `0 warnings`)
- New deployment id: `019df7b4-f4eb-7a99-934b-4eeb8007c2c0`
- New artifact: `taillog-app-019df7b4-f4eb-7a99-934b-4eeb8007c2c0.ait`
- Artifact size: 15MB
- Typecheck after build: PASS

Bundle scan:
- Supabase project marker `gxvtgrcq`: present
- AIT live ad ids: present
- `ait-ad-test`: still present as fallback strings
- `DevMenu` / `__DEV__`: still present as code strings; must verify actual runtime without Metro after console upload

Next required manual/console step:
- Upload `taillog-app-019df7b4-f4eb-7a99-934b-4eeb8007c2c0.ait`
- Then re-run the no-Metro private URL test with the new deployment id.

## Console Upload Re-test

User uploaded and entered the freshly built artifact:

```text
intoss-private://taillog-app?_deploymentId=019df7b4-f4eb-7a99-934b-4eeb8007c2c0
```

Re-test result:

| Test | Evidence | Result |
|---|---|---|
| New AIT private URL with Metro on | `/tmp/taillog-new-ait-current.png` | PARTIAL: app UI renders, but logs still show `scheme:"intoss://taillog-app?_deploymentId=019df7b4-f4eb-7a99-934b-4eeb8007c2c0"` through the local Granite/Metro path |
| New AIT private URL without Metro | `/tmp/taillog-new-ait-without-metro.png` | FAIL: App-in-Toss generic runtime error screen |

Updated interpretation:

- The fresh `.ait` build and console upload did not yet prove standalone `SANDBOX_REAL`.
- Rendering while Metro is running is useful for local smoke, but it is not release-like evidence.
- Real IAP/Ads/Smart Message QA should remain paused until the uploaded private URL launches with Metro stopped.

Current gate after new upload:

| Gate | Status | Reason |
|---|---|---|
| DEV_LOCAL | PASS | Local dev scheme and FastAPI/ADB reverse are usable |
| SANDBOX_REAL | BLOCKED | Latest AIT private URL still fails when Metro is stopped |
| PROD_READY | BLOCKED | Depends on SANDBOX_REAL; Report AI real secrets also absent |

Next diagnostic action:

1. Enter the private URL through the official AIT SchemeLab/manual entry path, not only direct `adb am start`.
2. Capture the first fatal JS/native error immediately after the no-Metro launch.
3. Confirm the console deployment id is active and mapped to the uploaded artifact.
4. After standalone launch passes, continue with IAP sandbox, Ads exposure, Smart Message test send, mTLS real smoke, and `REPORT_AI_MODE=real` secret setup.

## Official Toss App Cross-check

Checked against the official Apps in Toss testing docs on 2026-05-05:

- Local development uses the Sandbox app + Metro + `intoss://{appName}`.
- Uploaded `.ait` pre-release testing uses Toss app QR/test scheme + `intoss-private://{appName}?_deploymentId=...`.
- QR/test scheme execution requires:
  - logged-in Toss app user
  - workspace member
  - age 19+
- `_deploymentId` is required in the test scheme.

Additional device tests:

| Test | Evidence | Result |
|---|---|---|
| Explicit Toss app private launch | `adb shell am start ... -n viva.republica.toss/.intoss.MiniAppSchemeActivity -d 'intoss-private://taillog-app?_deploymentId=019df7b4-f4eb-7a99-934b-4eeb8007c2c0'` | BLOCKED: Toss app shows "지금은 서비스를 사용할 수 없어요." |
| Explicit Toss app screenshot | `/tmp/taillog-prodapp-private-without-metro.png` | Access/runtime not accepted before app JS loads |
| Explicit Sandbox app private launch without Metro | `adb shell am start ... -n viva.republica.toss.test/.MiniAppSchemeActivity -d 'intoss-private://taillog-app?_deploymentId=019df7b4-f4eb-7a99-934b-4eeb8007c2c0'` | BLOCKED: generic Apps in Toss runtime error |
| Explicit Sandbox app screenshot | `/tmp/taillog-testapp-private-without-metro-explicit.png` | Generic platform error; no app-level `ReactNativeJS` fatal found |
| CLI deploy same artifact | `ait deploy --location taillog-app-019df7b4-f4eb-7a99-934b-4eeb8007c2c0.ait --scheme-only` | Code 4097: same app bundle already uploaded |

Updated diagnosis:

- The `.ait` artifact itself built successfully and is already present in the AIT backend.
- The bundle contains release markers (`__DEV__=false`) and public Supabase constants are inlined.
- The failure happens before usable app-level JS logs, so it is currently more likely a Toss app test-access / QR scheme / deployment activation issue than an app page crash.
- Sandbox app private-scheme execution is not sufficient release evidence; official docs point final uploaded-bundle testing to the Toss app QR/test scheme.

Current action gate:

1. In AIT console, open the uploaded bundle's "테스트하기" QR/test scheme screen.
2. Confirm the exact generated scheme matches `intoss-private://taillog-app?_deploymentId=019df7b4-f4eb-7a99-934b-4eeb8007c2c0`.
3. Confirm the Toss app account on device is a workspace member and age 19+.
4. Launch from the QR/test screen or exact generated scheme in Toss app.
5. If Toss app still shows "지금은 서비스를 사용할 수 없어요", treat as console/account/deployment access blocker and contact Apps in Toss support/community with screenshots and deployment id.

## QR Entry Re-check

User reported entering through the current QR/test scheme:

```text
intoss-private://taillog-app?_deploymentId=019df7b4-f4eb-7a99-934b-4eeb8007c2c0
```

Evidence captured immediately after entry:

| Check | Evidence | Result |
|---|---|---|
| Current screenshot | `/tmp/taillog-qr-entry-current.png` | App renders settings screen, but red `DEV` floating button is visible |
| Current top activity | `viva.republica.toss.test/im.toss.rn.granite.core.GraniteActivity` | Sandbox app, not production Toss app |
| Current intent | `intoss-private://taillog-app?_deploymentId=019df7b4-f4eb-7a99-934b-4eeb8007c2c0` | Private URL reached Sandbox app |
| JS initial props | `scheme:"intoss://taillog-app?_deploymentId=019df7b4-f4eb-7a99-934b-4eeb8007c2c0"` | Runtime normalized to `intoss://...` |
| Metro state | `packager-status:running` | Metro was active during QR entry |

Updated interpretation:

- The QR entry proves the Sandbox app can reach the private deployment URL while Metro is active.
- It does **not** yet prove release-like standalone execution, because the rendered UI still contains `DEV` and the active package is `viva.republica.toss.test`.
- `SANDBOX_REAL` remains `BLOCKED/PARTIAL` until the same QR/test scheme opens without Metro and without the `DEV` floating button.

Next isolation test:

1. Stop Metro.
2. Force-close the Sandbox app.
3. Re-enter using the same QR/test scheme.
4. PASS only if the app renders without `DEV` and no Metro process is running.

## QR Isolation Re-check Without Metro

User approved the isolation test after entering through the QR/test scheme.

Isolation steps:

```bash
tmux kill-session -t taillog-metro
lsof -tiTCP:8081 -sTCP:LISTEN | xargs kill
adb shell am force-stop viva.republica.toss.test
adb shell am force-stop viva.republica.toss
adb shell am start -a android.intent.action.VIEW -d 'intoss-private://taillog-app?_deploymentId=019df7b4-f4eb-7a99-934b-4eeb8007c2c0'
```

Evidence:

| Check | Evidence | Result |
|---|---|---|
| Metro state | `curl http://localhost:8081/status` -> connection refused | PASS: Metro is off |
| Current screenshot | `/tmp/taillog-qr-isolation-no-metro.png` | FAIL: "앱 실행도중 문제가 발생했습니다." |
| Current top activity | `viva.republica.toss.test/im.toss.rn.granite.core.GraniteActivity` | Sandbox app remained the active host |
| Current URL | `intoss-private://taillog-app?_deploymentId=019df7b4-f4eb-7a99-934b-4eeb8007c2c0` | Same latest deployment id |

Conclusion:

- The latest uploaded `.ait` still does not pass standalone no-Metro execution on this device.
- The earlier QR success state is therefore classified as `DEV_LOCAL/MIXED`, not `SANDBOX_REAL`.
- Real IAP/Ads/Smart Message QA remains blocked until the private deployment launches with Metro stopped and without the `DEV` floating control.

Recommended next action:

1. Restore `DEV_LOCAL` for continued development testing.
2. In the AIT console, verify this deployment is enabled for the Toss app test account and workspace.
3. Re-open the official console QR from the production Toss app path, not only the Sandbox app resolver.
4. If the same platform error persists, report the deployment id and screenshots to Apps in Toss support/community as a console/account/deployment activation blocker.

## DEV_LOCAL Restore

After the no-Metro isolation test, the local development loop was restored.

| Check | Evidence | Result |
|---|---|---|
| Metro | `http://localhost:8081/status` -> `packager-status:running` | PASS |
| FastAPI | `http://localhost:8765/health` -> `{"status":"ok"}` | PASS |
| adb reverse | `tcp:8081`, `tcp:8765`, `tcp:5173` | PASS |
| DEV_LOCAL relaunch | `adb shell am start ... 'intoss://taillog-app/' viva.republica.toss.test` | PASS |
| Restore screenshot | `/tmp/taillog-dev-restored.png` | App renders with `DEV` control, expected for local development |

## Brand Icon Review Follow-up

User registered the generated 600x600 logo in the Apps in Toss console:

```text
src/assets/icons/app-logo-tailog-600.png
```

Console status:

- Brand/app information change review is pending.
- Console response: update review result expected within 2 days.

Code check:

| File | Current value | Status |
|---|---|---|
| `granite.config.ts` | `brand.icon: './src/assets/icons/app-logo-600.png'` | Needs follow-up |
| Generated asset | `src/assets/icons/app-logo-tailog-600.png` (`600x600`) | Ready |

Official requirement checked on 2026-05-05:

- Apps in Toss React Native config expects `brand.icon` to be the logo image URL copied from the console app information image.
- Therefore, replacing the local file path with another local file path is not enough for standalone `.ait` verification.

Do not change `granite.config.ts` yet because the console-hosted image URL is not available in the repo. Once the console review completes, copy the uploaded logo image URL from the console and update:

```ts
appsInToss({
  brand: {
    displayName: '테일로그',
    primaryColor: '#3182F6',
    icon: '<console-hosted-logo-url>',
  },
})
```

Then rebuild/upload a new `.ait` and re-run the no-Metro QR test.

## DEV_LOCAL QA Scope While Console Review Is Pending

Recommended work while the brand icon review is pending:

| Area | What can be verified now | Evidence type | Release evidence? |
|---|---|---|---|
| UX flow | onboarding, dashboard, settings, subscription navigation and copy | screenshots + route notes | Partial |
| Mock detection | settings/subscription/onboarding/coaching hardcoded or DB-disconnected data | file/line table | Yes, code-level |
| Subscription state | current plan card, token count, restore state, error/loading/empty states | DEV_LOCAL screen + DB row check | Partial |
| IAP grant path | `[DEV] IAP 바이패스` -> `verify-iap-order` -> subscription row | Edge/FastAPI logs + Supabase row | Dev-only |
| Real IAP/Ads/Smart Message | sandbox/real console-linked flows | blocked until `SANDBOX_REAL` passes | No |

Next DEV_LOCAL QA order:

1. Settings/subscription: FREE -> DEV grant -> PRO state -> restore copy/error state.
2. Settings page: detect mock-only actions and DB-disconnected toggles.
3. Onboarding/coaching: find remaining emoji/mock/custom icon gaps.
4. Route sweep: confirm no `_404` dead entry and no loading-only screens.
5. DONE 2026-05-07: `brand.icon` switched to build-time PNG data URI, rebuilt/uploaded `.ait`, and private standalone launch passed.

## 2026-05-07 Private Bundle Launch Follow-up

User reported that the uploaded private bundle did not launch:

```text
intoss-private://taillog-app?_deploymentId=019e005e-a79c-7ea7-93d4-d63e86fbbae6
```

Reproduction:

| Check | Evidence | Result |
|---|---|---|
| Metro off | `curl http://localhost:8081/status` connection refused | PASS |
| Private URL launch | `adb shell am start ... intoss-private://taillog-app?_deploymentId=019e005e-a79c-7ea7-93d4-d63e86fbbae6` | FAIL |
| UI dump | `앱 실행도중 문제가 발생했습니다.` / `앱인토스 개발자 커뮤니티로 문의해주세요.` | Host/runtime error before usable app UI |
| Bundle scan | `brandIcon:"./src/assets/icons/app-logo-600.png"` | Suspicious local path leaked into runtime setup |

Code change:

- `granite.config.ts` now reads `src/assets/icons/app-logo-600.png` at build time and injects it as a `data:image/png;base64,...` URI for `appsInToss({ brand.icon })`.
- This keeps `brand.icon` a string as required by `@apps-in-toss/plugins@2.4.1`, while avoiding a non-resolvable `./src/...` runtime path.

New build:

| Item | Result |
|---|---|
| Build command | `npm run build` |
| Build result | RN 0.84.0 + RN 0.72.6, 0 errors, 0 warnings |
| New deployment id | `019e008c-d1e0-7148-bd63-cc61473c135f` |
| Artifact | `taillog-app-019e008c-d1e0-7148-bd63-cc61473c135f.ait` and copied to `taillog-app.ait` |
| Artifact hash | `dae63751b59bc11e3d8ba2b2fc29b4b41ee846a331b930f3b5fd4c7c4f39a562` |
| Bundle scan | `brandIcon:"data:image/png;base64,...` present, old local path absent |
| Typecheck | `npx tsc --noEmit` PASS |

Upload/re-test result:

| Check | Evidence | Result |
|---|---|---|
| Uploaded artifact | `taillog-app.ait` (same hash as `taillog-app-019e008c-d1e0-7148-bd63-cc61473c135f.ait`) | PASS |
| Test scheme | `intoss-private://taillog-app?_deploymentId=019e008c-d1e0-7148-bd63-cc61473c135f` | PASS |
| App launch | User confirmed: "잘실행됨" | PASS |

Conclusion:

- The standalone private launch blocker was the local `brand.icon` path in the AIT runtime setup.
- The durable build rule is to inject a resolvable string URL/data URI into `appsInToss({ brand.icon })`; do not use `./src/...` as a plain string.
- `SANDBOX_REAL` gate is unblocked for the next IAP/Ads/Smart Message QA steps.

## 2026-05-11 AIT Standalone Re-check

Context:
- User logged into the Toss app with the workspace admin account `gmdqn2tp@gmail.com`.
- Previous `지금은 서비스를 사용할 수 없어요` result is reclassified as a Toss account/workspace tester mapping issue, not an app JS crash.

Bundle:

| Item | Result |
|---|---|
| Deployment id | `019e14a7-ca44-7f9b-bd58-a9be19376360` |
| Artifact | `taillog-app-019e14a7-ca44-7f9b-bd58-a9be19376360.ait` |
| Local hash | `58ce91e312fa46ea5db28fec759b054a7be656d287a6dfdb5ac2e97299c60e22` |
| Bundle scan | `brandIcon:"https://static.toss.im/appsintoss/..."`, Supabase URL present, `ait-ad-test-*` count `0`, `isDevToolsEnabled() { return false; }` |

Execution:

```bash
curl http://localhost:8081/status
# connection refused

adb shell am start -W \
  -a android.intent.action.VIEW \
  -d 'intoss-private://taillog-app?_deploymentId=019e14a7-ca44-7f9b-bd58-a9be19376360' \
  -n viva.republica.toss/.intoss.MiniAppSchemeActivity
```

Evidence:

| Check | Evidence | Result |
|---|---|---|
| ADB device | `R3CXB0QH0LY`, `SM_S926N` | PASS |
| Metro | `curl localhost:8081/status` -> connection refused | PASS |
| Host app | `viva.republica.toss/.intoss.MiniAppSchemeActivity` -> `viva.republica.toss/im.toss.rn.granite.core.GraniteActivity` | PASS |
| Current intent | `intoss://taillog-app?_deploymentId=019e14a7-ca44-7f9b-bd58-a9be19376360` | PASS |
| Screenshot | `/tmp/taillog-ait-gmdqn2tp-prod-recheck.png` | PASS: onboarding renders |
| UI dump | `테일로그`, `반려견 행동,\n30초면 기록 끝`, `토스로 시작하기` | PASS |
| JS marker | `[AIT-BUILD] taillog-appsintoss-wrapper-20260511-0958-cli` | PASS |
| Bundle loader | `MiniAppBundleLoaderModule: Bundle loading completed successfully` | PASS |
| Metro dependency | no `loadJSBundleFromMetro()` in relevant launch logs | PASS |
| Previous crash signatures | no `RNCSafeAreaProvider`, no `Invariant` | PASS |

Conclusion:

- Uploaded AIT private standalone execution is now confirmed on the production Toss app path with Metro off.
- The previous host error was resolved by testing with the Toss app account mapped to the Apps in Toss workspace admin/member.
- `SANDBOX_REAL` is unblocked for follow-up IAP/Ads/Smart Message release-like QA on this deployment.
