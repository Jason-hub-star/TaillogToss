---
name: toss-runtime-mode-ops
description: TaillogToss 런타임 모드 운영 스킬 — DEV_LOCAL, SANDBOX_REAL, PROD_READY를 판정하고 Supabase CLI, AIT private URL, mTLS, Ads, IAP, Smart Message, Report AI 토글을 안전하게 분리한다. 콘솔 업로드 후 실배포 전 QA와 개발용 테스트를 온오프할 때 사용.
---

# Toss Runtime Mode Ops

TaillogToss의 개발 테스트와 AIT 콘솔 업로드 후 실배포 전 테스트를 분리하는 모드 오케스트레이터.

## 언제 사용하나

- `intoss-private://taillog-app?...` AIT 업로드본으로 QA할 때
- 개발용 mock/test id와 콘솔 기반 sandbox/real 설정을 분리할 때
- `REPORT_AI_MODE=real`, mTLS real, Ads real group, Smart Message real/test send 전환 전 안전 점검이 필요할 때
- `toss-phase13-gate`, `toss-monetization-ops`, `toss-growth-ops`, `toss-edge-hardening`을 어떤 순서로 써야 할지 정해야 할 때

## 모드 정의

| Mode | 목적 | 허용 범위 | 금지/주의 |
|---|---|---|---|
| `DEV_LOCAL` | 로컬 개발/회귀 테스트 | mock mTLS, test ad id, Jest/pytest, ADB local reverse | 출시 판정 금지 |
| `SANDBOX_REAL` | AIT 업로드 후 실배포 전 QA | AIT private URL, sandbox IAP, test send, approved console config smoke | real charge, mass message, promotion 지급은 명시 승인 필요 |
| `PROD_READY` | 배포 직전 게이트 | real mTLS, real ad group, approved message, real report AI 검증 | owner 승인 없이 상태 변경/발송/과금 금지 |

## 빠른 전환

### DEV_LOCAL로 전환

목표: 현재 로컬 코드가 Sandbox 앱에서 Metro를 통해 실행되는지 확인한다.

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

PASS:
- `curl http://localhost:8081/status` -> `packager-status:running`
- top activity가 `viva.republica.toss.test/im.toss.rn.granite.core.GraniteActivity`
- Metro 터미널에 `Running "shared"`와 `scheme:"intoss://taillog-app/"`
- logcat 또는 Metro 터미널에 `loadJSBundleFromMetro()` 또는 Metro bundle 로그
- 빨간 `DEV` control이 보이면 개발모드 증거로 기록 가능

### SANDBOX_REAL / AIT 업로드본으로 전환

목표: 업로드된 `.ait`가 Metro 없이 실제 Toss 앱에서 실행되는지 확인한다.

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

PASS:
- `curl localhost:8081/status`가 connection refused
- top activity가 `viva.republica.toss/im.toss.rn.granite.core.GraniteActivity`
- UI가 렌더된다
- logcat에 `MiniAppBundleLoaderModule: Bundle loading completed successfully`
- logcat에 `[AIT-BUILD] ...` marker 또는 `Running "shared"`
- `loadJSBundleFromMetro()`가 없다

FAIL/BLOCKED:
- `지금은 서비스를 사용할 수 없어요`: Toss 앱 로그인 사용자와 워크스페이스 멤버/테스터 매핑 확인
- `앱 실행도중 문제가 발생했습니다`: 앱 JS 진입 전 host/runtime 실패 가능성. `ReactNativeJS` marker 유무로 분류
- default resolver가 `viva.republica.toss.test`로 잡힘: production activity를 `-n viva.republica.toss/.intoss.MiniAppSchemeActivity`로 명시
- USB는 보이지만 `adb devices`가 비어 있음: 폰 잠금 해제, USB 디버깅 재허용, `adb kill-server; adb start-server`

## 판정 입력

먼저 아래 상태를 수집한다.

```bash
pwd
supabase status 2>/dev/null || true
supabase functions list
supabase secrets list
adb devices
curl -sS http://localhost:8081/status
curl -sS http://localhost:8765/health
```

코드/설정은 이 파일들을 확인한다.

- `AGENTS.md`
- `docs/status/PROJECT-STATUS.md`
- `docs/status/MISSING-AND-UNIMPLEMENTED.md`
- `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md`
- `docs/ref/AIT-ADS-SDK-REFERENCE.md`
- `src/lib/ads/config.ts`
- `src/lib/api/iap.ts`
- `supabase/config.toml`
- `supabase/functions/_shared/mtlsMode.ts`
- `supabase/functions/generate-report/index.ts`

## 토글 매트릭스

| Toggle | `DEV_LOCAL` | `SANDBOX_REAL` | `PROD_READY` |
|---|---|---|---|
| `TOSS_MTLS_MODE` | `mock` | `real` if cert/key ready, otherwise `mock` with BLOCKED note | `real` |
| mTLS cert/key secrets | optional | required for real Toss S2S smoke | required |
| Ads group id | `ait-ad-test-*` or mock preview | console test/real group, propagation delay noted | real group only |
| IAP | Jest/mock or sandbox only | sandbox 3 scenarios | production policy checked |
| Smart Message | mock/test send only | `sendTestMessage` or approved test campaign | approved real send only |
| `REPORT_AI_MODE` | `mock` | `real` only after `OPENAI_API_KEY` secret exists | `real` |
| DevMenu bypass | allowed for UI exploration | must be OFF for evidence | must be absent from release build |

## 실행 순서

1. **Mode Snapshot**
   - 현재 모드를 `DEV_LOCAL / SANDBOX_REAL / PROD_READY` 중 하나로 판정한다.
   - 애매하면 더 안전한 낮은 모드로 판정한다.
   - AIT URL이 있으면 deployment id를 기록한다.

2. **Safety Gate**
   - real charge, mass message, promotion 지급, production campaign 활성화는 owner approval 없이는 실행하지 않는다.
   - Supabase는 MCP가 아니라 CLI 기준으로 확인한다.
   - secrets 값은 출력하지 말고 이름만 기록한다.

3. **Specialist Skill Routing**
   - mTLS/JWT/role/Edge 권한: `Skill("toss-edge-hardening")`
   - IAP/Ads/TossPay: `Skill("toss-monetization-ops")`
   - Smart Message/Segment/Promotion/Reward/OG: `Skill("toss-growth-ops")`
   - 최종 PASS/PARTIAL/BLOCKED 판정: `Skill("toss-phase13-gate")`
   - AIT build/upload/private URL: `Skill("toss-ait-build-ops")`
   - 실기기 SchemeLab/Metro: `Skill("toss-sandbox-metro")`

4. **Evidence Collection**
   - HTTP status, function version, deployment id, adb screenshot path, DB/log row id를 남긴다.
   - 성공뿐 아니라 BLOCKED 원인도 한 줄로 기록한다.

5. **Docs Sync**
   - 최신 실행 로그: `docs/daily/MM-DD/full-app-qa-*.md`
   - 잔여 리스크: `docs/status/MISSING-AND-UNIMPLEMENTED.md`
   - 게이트 판정: `docs/status/11-FEATURE-PARITY-MATRIX.md` 또는 현재 프로젝트의 parity 문서

## 모드 전환 체크리스트

### DEV_LOCAL로 낮출 때

- `TOSS_MTLS_MODE=mock`
- Ads test id/mock preview 허용
- `REPORT_AI_MODE=mock`
- DevMenu bypass 허용
- 원격 campaign send 금지

### SANDBOX_REAL로 올릴 때

- AIT private URL 또는 deployment id 기록
- `adb reverse tcp:8081 tcp:8081`, `adb reverse tcp:8765 tcp:8765`
- `supabase functions list` ACTIVE 버전 기록
- IAP는 sandbox 3시나리오만 수행
- Smart Message는 test send 또는 승인된 테스트 캠페인만 수행
- real mTLS가 아니면 PASS가 아니라 PARTIAL/BLOCKED로 기록

### PROD_READY로 판정할 때

- mTLS real cert/key secrets 존재
- `REPORT_AI_MODE=real` + `OPENAI_API_KEY` secret 존재
- Ads real group id이며 test id가 release config에 남아 있지 않음
- Smart Message 템플릿 승인/활성화 확인
- DevMenu/release bypass 미포함 증적
- `npm run typecheck`, `npm test`, backend pytest 통과

## 보고 포맷

```text
Runtime Mode:
- current:
- target:
- ait_url/deployment_id:

Toggle Snapshot:
- TOSS_MTLS_MODE:
- Ads:
- IAP:
- SmartMessage:
- REPORT_AI_MODE:
- DevMenu/bypass:

Evidence:
- Supabase functions:
- Secrets names:
- ADB/device:
- Screenshots/logs:

Gate:
- AUTH:
- IAP:
- MSG:
- AD:
- REPORT_AI:
- B2B:

Blocked:
- item:
- reason:
- next action:
```

## Failure Modes

- 모드를 섞으면 mock 성공을 실배포 준비 완료로 오판한다. 항상 `current`와 `target`을 먼저 기록한다.
- Ads group id는 콘솔 생성 후 전파 지연이 있을 수 있으므로, 생성 직후 미노출을 코드 결함으로 단정하지 않는다.
- `REPORT_AI_MODE=real`만 켜고 `OPENAI_API_KEY` secret이 없으면 리포트 생성이 실패하거나 mock으로 보일 수 있다.
- Smart Message real send와 Promotion 지급은 비용/사용자 영향이 있으므로, 테스트 대상과 캠페인 범위를 문서화한 뒤 실행한다.
- release 검증에서 DevMenu bypass를 사용하면 인증/구독/역할 흐름이 왜곡된다.
