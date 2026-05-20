---
name: toss-ait-build-ops
description: AIT .ait 번들 빌드 → 콘솔 업로드 → 테스트 진입 성공 패턴. env var 인라인 실패(supabase url is required), babel/esbuild 충돌, __dirname 경로 문제 해결책 포함.
---

# toss-ait-build-ops

`.ait` 번들을 올바르게 빌드하고 AIT 콘솔에 배포하는 표준 절차.
**"supabase url is required" 에러** 등 env var 인라인 실패를 근본 해결한 패턴.

## 언제 사용하나
- `.ait` 빌드 후 앱 진입 시 "supabase url is required" 에러
- `process.env.EXPO_PUBLIC_*` 가 런타임에 undefined
- Babel `transform-inline-environment-variables` vs esbuild define 충돌
- `ait build` 후 번들에 URL이 없음
- `intoss-private://...` 업로드 번들이 Metro 없이 "앱 실행도중 문제가 발생했습니다."로 실패
- 새 기능 추가 후 `.ait` 재빌드 + 재배포 필요

---

## 근본 원인 (확정, 2026-05-04)

**AIT Runtime이 앱 실행 시 `process.env`를 빈 객체 `{}`로 재설정한다.**

- Babel `transform-inline-environment-variables` → `process.env.VAR`를 변수 할당으로 변환
- esbuild `define` → Babel 변환 후 대상 없어서 무효
- Metro 워커 프로세스 → `set -a && source .env` shell export가 전달 안됨
- `dotenv.config()` in babel.config.js → `process.cwd()` 가 워커마다 다름
- 결론: **어떤 env var 주입 방식도 AIT Runtime의 런타임 재설정을 이길 수 없음**

---

## 성공 패턴

### 패턴 1: 공개 상수 직접 박기 (`supabase.ts`)

`EXPO_PUBLIC_*`는 공개 값 — 상수로 직접 선언 후 `process.env`는 override용으로만.

```typescript
// src/lib/api/supabase.ts
const _SUPABASE_URL = 'https://gxvtgrcqkbdibkyeqyil.supabase.co';
const _SUPABASE_ANON_KEY = 'eyJhbGci...'; // anon key (공개)

const SUPABASE_URL =
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
  (process.env.SUPABASE_URL as string | undefined) ||
  _SUPABASE_URL;  // ← 항상 이게 실제로 쓰임
const SUPABASE_ANON_KEY =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  (process.env.SUPABASE_ANON_KEY as string | undefined) ||
  _SUPABASE_ANON_KEY;
```

### 패턴 2: `babel.config.js` — 플러그인 없이 단순하게

```javascript
// babel.config.js
module.exports = {
  presets: ['babel-preset-granite'],
  // transform-inline-environment-variables 제거 — esbuild define과 충돌
};
```

### 패턴 3: `granite.config.ts` — esbuild define + dotenv 경로 탐색

```typescript
// granite.config.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// AIT가 .granite/ 서브디렉토리에서 config를 실행하므로 상위로 탐색
function findEnvFile(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return null;
}

const envPath = findEnvFile(__dirname);
if (envPath) dotenv.config({ path: envPath });

const defineEnv: Record<string, string> = {
  'process.env.EXPO_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''),
  'process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''),
  'process.env.AIT_AD_R1': JSON.stringify(process.env.AIT_AD_R1 ?? ''),
  // ... 나머지 AD 변수들
};

export default defineConfig({
  appName: 'taillog-app',
  scheme: 'intoss',
  build: { esbuild: { define: defineEnv } },
  plugins: [router(), hermes(), appsInToss({ ... })],
});
```

### 패턴 4: `brand.icon`은 host가 해석 가능한 HTTPS URL 우선

`appsInToss({ brand.icon })` 타입은 `string`이지만, plain local path 문자열(`'./src/assets/icons/app-logo-600.png'`)을 넣으면 AIT standalone host가 런타임에서 해석하지 못할 수 있다.

권장 순서(2026-05-07 재분류):

1. 앱인토스 콘솔 앱 정보에 등록된 로고 이미지의 HTTPS URL을 `brand.icon`에 넣는다.
2. HTTPS URL을 확보하기 전 임시로 PNG data URI를 쓸 수는 있지만, 이 방식은 local path 누수 방지까지만 보장한다.
3. 성공 판정은 반드시 Metro off 상태에서 CLI/콘솔이 출력한 정확한 `intoss-private://..._deploymentId=...` URL로 JS marker가 찍히는지 확인한다.

임시 data URI 패턴:

```typescript
// granite.config.ts
function findProjectFile(startDir: string, relativePath: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, relativePath);
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return null;
}

function readPngDataUri(relativePath: string): string {
  const assetPath = findProjectFile(__dirname, relativePath);
  if (assetPath == null) return '';
  return `data:image/png;base64,${fs.readFileSync(assetPath).toString('base64')}`;
}

const brandIcon = readPngDataUri('src/assets/icons/app-logo-600.png');

appsInToss({
  brand: {
    displayName: '테일로그',
    primaryColor: '#3182F6',
    icon: brandIcon,
  },
  permissions: [{ name: 'photos', access: 'read' }],
});
```

실패 증거:
- deploymentId `019e005e-a79c-7ea7-93d4-d63e86fbbae6`
- 번들 스캔: `brandIcon:"./src/assets/icons/app-logo-600.png"`
- no-Metro private launch: "앱 실행도중 문제가 발생했습니다."

재분류 증거:
- deploymentId `019e008c-d1e0-7148-bd63-cc61473c135f`
- 번들 스캔: `brandIcon:"data:image/png;base64,...`
- 당시 사용자 확인은 Metro-backed private launch였을 가능성이 있어 standalone 성공 증거로 쓰지 않는다.
- API-key deploy 신규 deploymentId `019e0160-42d7-72b2-b79a-806ee366eb31`도 data URI 상태에서 Metro off host error가 재현됨.
- 콘솔 HTTPS 로고 URL 적용 deploymentId `019e018d-e9cc-7714-ba48-bb936ad4a6e2`도 API deploy 성공 후 Metro off host error가 재현됨. 이 경우 앱 코드/아이콘보다 AIT test host deployment 실행/호환성 이슈로 에스컬레이션한다.

---

## 빌드 절차

### 업로드 가드레일 (Codex MUST)

- 사용자가 명시적으로 “업로드”, “배포”, “deploy”를 요청한 경우에만 `ait deploy`를 실행한다.
- “개발모드”, “DEV_LOCAL”, “로컬에서 확인” 요청에서는 Metro/FastAPI/ADB reverse 기반 검증까지만 진행하고 `.ait` 업로드는 중단한다.
- 새 `.ait` 빌드는 가능하지만, 업로드 전에는 번들 스캔 결과와 예상 private URL 형식만 보고한다.

### 0. 빌드 전 백엔드 정책 확인

AIT는 production 모드에서 `.env`의 `EXPO_PUBLIC_BACKEND_URL` 또는 `src/lib/api/backend.ts`의 `PUBLIC_BACKEND_URL`을 번들에 인라인한다. AI 코칭 한도/토큰처럼 서버 정책이 바뀐 경우, 새 `.ait`만으로는 충분하지 않다.

```bash
rg -n "EXPO_PUBLIC_BACKEND_URL|const PUBLIC_BACKEND_URL" .env src/lib/api/backend.ts
```

- 프로덕션 AIT 검증: DigitalOcean/운영 백엔드에 최신 정책이 먼저 배포되어야 한다.
- 로컬 DEV 검증: `.ait` 빌드가 아니라 Metro DEV_LOCAL로 확인한다. 현재 표준은 `src/lib/api/backend.ts`가 `__DEV__`에서 Metro host 기반 `:8765`를 우선 사용하고, FastAPI 로그의 `127.0.0.1 ... 200 OK`로 판정한다.
- 검증 중 `.env`/`backend.ts`를 임시 변경했다면 반드시 원복한다.

예: FREE 한도 변경 후 AIT에서 `오늘 0/3회 사용`이 보이면, 먼저 운영 백엔드가 구버전인지 확인한다. 새 서버 정책이 반영된 경우 기대값은 `오늘 0/1회 사용`이다.

### 1. 빌드

```bash
# npm run build 스크립트에 source .env 포함됨
cd /Users/family/jason/TaillogToss
/Users/family/jason/TaillogToss/node_modules/.bin/ait build
```

출력에서 `deploymentId` 확인:
```
◆  AIT build completed (taillog-app.ait)
●  deploymentId: 019df2ef-d4f2-7a4f-9cf2-6fdb67340609
```

### 2. 번들 검증 (필수)

```bash
unzip -p taillog-app.ait "bundle.android.0_84_0.js" | grep -oP ".{15}gxvtgrcq.{15}" | head -1
# → URL = "https://gxvtgrcqkbdibkyeqyil.supabas  ← 이렇게 나와야 성공

unzip -p taillog-app.ait "bundle.android.0_84_0.js" | rg 'brandIcon:"https://'
# → 권장: 콘솔 앱 정보 이미지 HTTPS URL

unzip -p taillog-app.ait "bundle.android.0_84_0.js" | rg 'brandIcon:"\./src/' && echo "BAD: local brand icon path leaked"
# → 출력이 있으면 업로드 전 수정 필요

unzip -p taillog-app.ait "bundle.android.0_84_0.js" | rg 'brandIcon:"data:image/png;base64' && echo "WARN: data URI icon requires Metro-off standalone proof"
# → data URI는 업로드 전 차단 대상은 아니지만, standalone 성공 패턴으로 간주하지 않음

unzip -p taillog-app.ait "bundle.android.0_84_0.js" | rg -C 1 "function isDevToolsEnabled"
# → 심사용/release 빌드는 `return false;` 여야 DevMenu/플랜 override/가드 bypass/DEV IAP bypass가 비활성

unzip -p taillog-app.ait "bundle.android.0_84_0.js" | rg -o "ait-ad-test-[A-Za-z0-9-]+" | wc -l
# → 0이어야 실 광고 no-fill/render 검증 가능
```

### 3. 콘솔 업로드

```bash
# TaillogToss 현재 표준: .env의 AIT_DEPLOY_API_KEY를 shell에 export한 뒤 명시 업로드
cd /Users/family/jason/TaillogToss
set -a
source .env
set +a
/Users/family/jason/TaillogToss/node_modules/.bin/ait deploy \
  --api-key "$AIT_DEPLOY_API_KEY" \
  --location ./taillog-app.ait \
  --scheme-only

# 1회성: API 키를 명시해서 업로드
/Users/family/jason/TaillogToss/node_modules/.bin/ait deploy \
  --api-key "<AIT_CONSOLE_DEPLOY_API_KEY>" \
  --location ./taillog-app.ait \
  --scheme-only

# 반복 사용: API 키를 default 프로필로 저장 후 업로드
/Users/family/jason/TaillogToss/node_modules/.bin/ait token add \
  --api-key "<AIT_CONSOLE_DEPLOY_API_KEY>" \
  default

/Users/family/jason/TaillogToss/node_modules/.bin/ait deploy \
  --profile default \
  --location ./taillog-app.ait \
  --scheme-only
```

API 키 위치: AIT 콘솔 → 앱 설정 → 배포 API 키. 키는 문서/git에 남기지 말고 `.env`, 터미널 입력 또는 `ait token add` 프로필에만 저장한다. 이 repo에서는 `~/.ait`/`default` 프로필이 없을 수 있으므로 `--profile default`보다 `.env`의 `AIT_DEPLOY_API_KEY`를 명시하는 패턴을 우선 사용한다.

### 4. 테스트 진입 URL

```
intoss-private://taillog-app?_deploymentId=<deploymentId>
```

SchemeLabActivity에서 입력:
- `viva.republica.toss/.service.SchemeLabActivity`

### 5. AIT 실패와 DEV_LOCAL 성공 분리

같은 코드가 DEV_LOCAL에서는 열리고 AIT private/real에서 JS marker 없이 실패하면 앱 코드 실패로 단정하지 않는다.

분류 기준:

| 증거 | 판정 |
|---|---|
| DEV_LOCAL: `viva.republica.toss.test`, `Running "shared"`, FastAPI `127.0.0.1 ... 200 OK` | 로컬 코드/Metro 경로 PASS |
| AIT: `지금은 서비스를 사용할 수 없어요`, `ReactNativeJS`/`[AIT-BUILD]` 없음 | Toss 앱 계정/테스터/워크스페이스 매핑 또는 host-layer BLOCKED |
| AIT private test host: `앱 실행도중 문제가 발생했습니다`, `ReactNativeJS` 없음 | JS 진입 전 host/runtime 실패 |
| AIT: `Running "shared"` 후 화면 오류 | 앱 코드/runtime 오류로 분류하고 logcat stack 확인 |

기록할 증거:
- deploymentId
- private/real scheme URL
- 대상 패키지(`viva.republica.toss` 또는 `viva.republica.toss.test`)
- UI 오류 문구
- logcat에 `ReactNativeJS`/`[AIT-BUILD]` 존재 여부
- 가능하면 DEV_LOCAL 대조 스크린샷과 FastAPI API 로그

---

## 서버 세팅 (테스트 전 필수)

```bash
# granite dev (포트 8081 — GraniteActivity 기본값)
lsof -ti:8081 | xargs kill -9 2>/dev/null
/Users/family/jason/TaillogToss/node_modules/.bin/granite dev --port 8081 &

# FastAPI (포트 8765 — adb reverse 대상)
cd Backend && source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8765 --reload &

# adb reverse
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5173 tcp:5173
adb reverse tcp:8765 tcp:8765
```

> DEV_LOCAL에서 사진 선택까지 검증할 때는 `8081`과 `8765`만으로는 부족하다. `5173` Bedrock/Granite dev bridge가 빠지면 번들/권한 bridge가 불완전해져 앱 진입 또는 `fetchAlbumPhotos` 검증을 오판할 수 있다.

---

## 알려진 이슈

| 증상 | 원인 | 해결 |
|------|------|------|
| "supabase url is required" | AIT Runtime이 `process.env` 초기화 | `supabase.ts`에 상수 fallback |
| Ads가 실 ID 빌드처럼 보이는데 실기기에서 `[광고 미리보기]` 노출 | 업로드된 `.ait`가 런타임에서 test ID fallback 중이거나 이전 deployment임 | `src/lib/ads/config.ts` live adGroupId 상수 fallback 적용 후 재빌드/업로드, `ait-ad-test-*` 문자열 0개 스캔 |
| 심사용 빌드에서 DEV FAB 노출 | AIT private/review 빌드에서 `__DEV__`가 true처럼 동작 | `src/lib/devTools.ts` gate 사용, `.env`에 `EXPO_PUBLIC_SHOW_DEV_MENU=true`가 없으면 `isDevToolsEnabled() -> return false` 확인 |
| Babel 플러그인 에러 | transform-inline-env + esbuild define 충돌 | babel.config.js에서 플러그인 제거 |
| `[granite.config] env var missing` | RN 0.72.6 빌드에서 `__dirname`이 `.granite/` | `findEnvFile()` 상위 탐색 |
| `intoss-private://`가 Metro 없이 "앱 실행도중 문제가 발생했습니다." | `brand.icon` 로컬 경로/data URI 또는 AIT test host deployment 실행/호환성 문제 | 먼저 콘솔 앱 정보 이미지의 HTTPS URL을 `brand.icon`에 넣고 재빌드. 그래도 JS marker 없이 실패하면 deploymentId, CLI URL, UI error text, logcat(no `ReactNativeJS`)을 묶어 Toss 지원에 문의 |
| `intoss-private://`가 한 폰에서만 열림 | AIT 테스터/워크스페이스/로그인 계정 매핑 차이 | 성공 폰과 실패 폰의 Toss 계정, 패키지, deploymentId, JS marker 유무를 비교하고 host-layer BLOCKED로 문서화 |
| `인증정보를 찾을 수 없음` / `앱인토스 배포 API 키를 입력해주세요` | 로컬 AIT token profile이 없거나 만료됨 (`~/.ait` 비어 있음) | `ait deploy --api-key "<key>" --location ./taillog-app.ait --scheme-only`로 1회 업로드하거나, `ait token add --api-key "<key>" default` 후 `ait deploy --profile default --location ./taillog-app.ait --scheme-only` 사용 |
| `ait deploy` Code 4097 | 동일 콘텐츠 이미 업로드됨 | 무시 가능, 기존 deploymentId 사용 |
| IAP 크래시 `Already resumed` | AIT 테스트앱 `getEdgeValue` SDK 버그 | `__DEV__` 바이패스 버튼으로 우회 |

---

## 관련 파일

- `src/lib/api/supabase.ts` — 상수 fallback 패턴
- `src/lib/ads/config.ts` — Ads live adGroupId 상수 fallback + `ait-ad-test-*` 번들 스캔
- `granite.config.ts` — esbuild define + dotenv 경로 탐색
- `babel.config.js` — `babel-preset-granite`만
- `src/pages/settings/subscription.tsx` — `__DEV__` IAP 바이패스 버튼
- `src/lib/api/iap.ts` — FastAPI 프록시 (포트 8765)
