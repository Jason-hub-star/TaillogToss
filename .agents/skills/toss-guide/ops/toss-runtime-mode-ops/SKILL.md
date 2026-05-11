---
name: toss-runtime-mode-ops
description: TaillogToss 런타임 모드 전환 스킬. DEV_LOCAL(Metro+Sandbox)과 SANDBOX_REAL/AIT 업로드본(Metro off+실제 Toss 앱)을 자유롭게 전환, 판정, 증거 수집할 때 사용한다.
---

# Toss Runtime Mode Ops

TaillogToss의 로컬 개발모드와 AIT 업로드본 실행모드를 분리해서 켜고 끄는 운영 스킬.

## 모드

| Mode | 목적 | PASS 핵심 |
|---|---|---|
| `DEV_LOCAL` | 현재 로컬 코드 검증 | Metro running, Sandbox app, `intoss://taillog-app/`, Metro bundle log |
| `SANDBOX_REAL` | 업로드된 `.ait` 검증 | Metro off, production Toss app, `intoss-private://..._deploymentId=...`, bundle loader success |
| `PROD_READY` | 배포 직전 게이트 | mTLS/Ads/IAP/Smart Message/Report AI 승인 상태까지 확인 |

## DEV_LOCAL 전환

```bash
cd /Users/family/jason/TaillogToss
npm run dev
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8765 tcp:8765
adb reverse tcp:5173 tcp:5173
adb shell am force-stop viva.republica.toss.test
adb shell am force-stop viva.republica.toss
adb logcat -c
adb shell am start -W -a android.intent.action.VIEW -d 'intoss://taillog-app/' viva.republica.toss.test
```

PASS 기준:
- `curl http://localhost:8081/status` -> `packager-status:running`
- top activity: `viva.republica.toss.test/im.toss.rn.granite.core.GraniteActivity`
- Metro 터미널: `Running "shared"` + `scheme:"intoss://taillog-app/"`
- `loadJSBundleFromMetro()` 또는 Metro bundle 로그가 보임
- 빨간 `DEV` control은 개발모드 증거로 기록 가능

## SANDBOX_REAL / AIT 전환

```bash
cd /Users/family/jason/TaillogToss
lsof -tiTCP:8081 -sTCP:LISTEN | xargs kill -9 2>/dev/null || true
curl -sS --max-time 2 http://localhost:8081/status || true
adb shell am force-stop viva.republica.toss.test
adb shell am force-stop viva.republica.toss
adb logcat -c
adb shell am start -W \
  -a android.intent.action.VIEW \
  -d 'intoss-private://taillog-app?_deploymentId=<deploymentId>' \
  -n viva.republica.toss/.intoss.MiniAppSchemeActivity
```

PASS 기준:
- `curl localhost:8081/status`가 connection refused
- top activity: `viva.republica.toss/im.toss.rn.granite.core.GraniteActivity`
- UI 렌더 확인
- logcat: `MiniAppBundleLoaderModule: Bundle loading completed successfully`
- logcat: `[AIT-BUILD] ...` 또는 `Running "shared"`
- `loadJSBundleFromMetro()`가 없음

## Failure 분류

| 증상 | 우선 의심 | 조치 |
|---|---|---|
| `지금은 서비스를 사용할 수 없어요` | Toss 앱 로그인 사용자와 워크스페이스 멤버/테스터 매핑 불일치 | Toss 앱 계정, 전화번호, 워크스페이스 멤버 권한 확인 |
| `앱 실행도중 문제가 발생했습니다` | JS 진입 전 host/runtime 실패 | `ReactNativeJS` marker 유무 확인, deploymentId/콘솔 QR 확인 |
| 기본 실행이 Sandbox 앱으로 감 | Android preferred activity | AIT 검증 시 `-n viva.republica.toss/.intoss.MiniAppSchemeActivity` 명시 |
| USB는 보이나 `adb devices` 비어 있음 | 디버깅 세션 끊김 | 폰 잠금 해제, USB 디버깅 재허용, `adb kill-server; adb start-server` |
| Metro 켰을 때만 됨 | DEV_LOCAL/MIXED | AIT 증거로 쓰지 않음. Metro off로 재검증 |

## 증거 수집

```bash
adb shell dumpsys activity activities | rg -m 8 'mResumedActivity|topResumedActivity|viva.republica|Granite|MiniApp'
adb shell uiautomator dump /sdcard/taillog-mode.xml >/dev/null
adb shell cat /sdcard/taillog-mode.xml | tr '<' '\n' | rg -o 'text="[^"]+"|content-desc="[^"]+"' | head -120
adb logcat -d -v time | rg -i 'ReactNativeJS|AIT-BUILD|loadJSBundleFromMetro|isMetroRunning|Bundle loading completed|RNCSafeAreaProvider|Invariant|AndroidRuntime' | tail -160
```

보고할 때는 current/target, deploymentId, Metro 상태, host app, UI text, JS marker, blocked reason을 짧게 남긴다.
