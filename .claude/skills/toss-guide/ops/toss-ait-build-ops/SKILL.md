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

## 성공 패턴 (검증됨)

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

---

## 빌드 절차

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
```

### 3. 콘솔 업로드

```bash
/Users/family/jason/TaillogToss/node_modules/.bin/ait deploy
# → API 키 입력 (AIT 콘솔 → 앱 설정 → 배포 API 키)
```

### 4. 테스트 진입 URL

```
intoss-private://taillog-app?_deploymentId=<deploymentId>
```

SchemeLabActivity에서 입력:
- `viva.republica.toss/.service.SchemeLabActivity`

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
adb reverse tcp:8765 tcp:8765
```

---

## 알려진 이슈

| 증상 | 원인 | 해결 |
|------|------|------|
| "supabase url is required" | AIT Runtime이 `process.env` 초기화 | `supabase.ts`에 상수 fallback |
| Babel 플러그인 에러 | transform-inline-env + esbuild define 충돌 | babel.config.js에서 플러그인 제거 |
| `[granite.config] env var missing` | RN 0.72.6 빌드에서 `__dirname`이 `.granite/` | `findEnvFile()` 상위 탐색 |
| `ait deploy` Code 4097 | 동일 콘텐츠 이미 업로드됨 | 무시 가능, 기존 deploymentId 사용 |
| IAP 크래시 `Already resumed` | AIT 테스트앱 `getEdgeValue` SDK 버그 | `__DEV__` 바이패스 버튼으로 우회 |

---

## 관련 파일

- `src/lib/api/supabase.ts` — 상수 fallback 패턴
- `granite.config.ts` — esbuild define + dotenv 경로 탐색
- `babel.config.js` — `babel-preset-granite`만
- `src/pages/settings/subscription.tsx` — `__DEV__` IAP 바이패스 버튼
- `src/lib/api/iap.ts` — FastAPI 프록시 (포트 8765)
