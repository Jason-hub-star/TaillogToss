---
name: toss-dev-server
description: TaillogToss 로컬 개발 서버(Metro + FastAPI) 시작/재시작 절차. "서버 켜줘", "서버 재시작", "앱 안됨", "번들 안됨" 등 서버 기동 관련 모든 상황에 사용한다.
---

# TaillogToss 개발 서버 시작 절차

## 성공 패턴 (반드시 이 순서대로)

```bash
# 1. 기존 프로세스 종료
pkill -f "granite dev|metro|uvicorn" 2>/dev/null; sleep 1

# 2. adb reverse 등록 — Android Apps in Toss 개발모드는 8081/5173, 앱 백엔드는 8765 필수
adb reverse tcp:8081 tcp:8081   # Metro 번들 서버
adb reverse tcp:5173 tcp:5173   # Bedrock/Granite dev bridge
adb reverse tcp:8765 tcp:8765   # FastAPI 백엔드

# 3. .env 로드 후 Metro 시작 — source 누락 시 Supabase URL이 undefined로 번들됨
cd /Users/family/jason/TaillogToss
set -a && source .env && set +a
# npx granite dev 는 PATH 인식 실패 — node_modules/.bin 직접 호출 필수
node_modules/.bin/granite dev > /tmp/metro.log 2>&1 &

# 4. FastAPI 시작 — venv 경로 주의, cd Backend 필수
cd /Users/family/jason/TaillogToss/Backend
venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8765 > /tmp/fastapi.log 2>&1 &

# 5. 앱 강제 재실행
adb shell am force-stop viva.republica.toss.test
sleep 1
adb shell am start -a android.intent.action.VIEW -d "intoss://taillog-app/" viva.republica.toss.test
```

## 상태 확인 명령어

```bash
# 서버 프로세스 확인
ps aux | grep -E "granite|uvicorn" | grep -v grep

# 포트 응답 확인
curl -s http://localhost:8081/status     # → packager-status:running
curl -s http://localhost:8765/health    # → {"status":"ok"}

# adb reverse 확인
adb reverse --list   # 반드시 8081, 5173, 8765가 있어야 함
```

## 실패 증상 → 원인 매핑

| 증상 | 원인 | 해결 |
|------|------|------|
| "앱 실행 도중 문제가 발생했습니다" 또는 번들링이 멈춤 | adb reverse tcp:8081/tcp:5173 누락 → 개발 서버 bridge 불완전 | `adb reverse tcp:8081 tcp:8081 && adb reverse tcp:5173 tcp:5173` |
| 앱 열리나 API 오류 | adb reverse tcp:8765 누락 또는 개발 번들이 운영 백엔드를 호출 | `adb reverse tcp:8765 tcp:8765` 후 FastAPI 로그 확인 |
| 앱 실행 즉시 크래시 | .env 미로딩 → Supabase URL = undefined | `source .env` 후 Metro 재시작 |
| Supabase 인증 실패 | 위와 동일 | Metro 재시작 (source .env 포함) |
| uvicorn command not found | 잘못된 경로 | `Backend/venv/bin/uvicorn` 사용 |

## 캐시 초기화 재시작 (이미지/에셋 안보일 때, 번들 꼬였을 때)

```bash
# 1. 프로세스 종료
pkill -f "granite dev|metro|uvicorn" 2>/dev/null

# 2. Metro 캐시 삭제 — granite dev --reset-cache 는 미지원
rm -rf "$TMPDIR/metro-cache"

# 3. 정상 시작 절차 진행 (위 성공 패턴 동일)
```

> **주의**: `granite dev --reset-cache` 옵션 없음 (Unsupported option 오류).
> `npx react-native start --reset-cache`도 No Metro config 오류.
> 반드시 `$TMPDIR/metro-cache` 직접 삭제 후 `granite dev` 실행.

## DEV_LOCAL 백엔드 URL 검증 패턴

무료/토큰/PRO 한도처럼 FastAPI 로직을 로컬에서 검증할 때는 앱이 실제로 로컬 백엔드를 보고 있는지 먼저 확인한다. 현재 표준은 `src/lib/api/backend.ts`가 `__DEV__`에서 Metro host 기반 `:8765`를 우선 사용하는 것이다. `.env`에 `EXPO_PUBLIC_BACKEND_URL=https://...`가 있어도 DEV_LOCAL 검증은 로컬 FastAPI 로그를 기준으로 판정한다.

### 증상

| 증상 | 판정 |
|---|---|
| FastAPI를 로컬에서 새 코드로 띄웠는데 화면이 예전 정책값을 표시 | 앱이 프로덕션 백엔드 또는 캐시된 번들을 보고 있을 가능성 높음 |
| FastAPI 로그에 `/api/v1/coaching/usage/daily`가 찍히지 않음 | 로컬 백엔드 미사용 |
| Metro 로그에 운영 백엔드 URL의 404/5xx가 찍힘 | 프로덕션 백엔드 호출 중 |

### 확인 순서

```bash
rg -n "EXPO_PUBLIC_BACKEND_URL|const PUBLIC_BACKEND_URL" .env src/lib/api/backend.ts
curl -sS http://127.0.0.1:8765/health
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5173 tcp:5173
adb reverse tcp:8765 tcp:8765
```

앱 실행 후 FastAPI 터미널에서 다음 로그가 보여야 로컬 백엔드 검증으로 인정한다.

```text
GET /api/v1/... 200 OK
```

### 캐시/URL 분리 절차

1. `pkill -f "granite dev|metro"`로 Metro를 종료한다.
2. `rm -rf "$TMPDIR/metro-cache"`로 캐시를 지운다.
3. `src/lib/api/backend.ts`의 DEV resolver가 `__DEV__`에서 `:8765`를 우선 반환하는지 확인한다.
4. `set -a && source .env && set +a; node_modules/.bin/granite dev`로 다시 띄운다.
5. 앱을 `adb shell am force-stop viva.republica.toss.test` 후 재실행한다.
6. FastAPI 로그에 대상 API가 `127.0.0.1`에서 들어와 200으로 끝나는지 확인한다.

> 주의: `.env`를 임시로 로컬 URL로 바꾸거나 `PUBLIC_BACKEND_URL`을 로컬에 고정하는 방식은 마지막 분리 수단이다. 사용했다면 `git diff -- .env src/lib/api/backend.ts`로 원복 여부를 확인하고 끝낸다.

## 핵심 원칙

1. **adb reverse는 8081, 5173, 8765 모두** — 하나라도 빠지면 연결 불가
2. **Metro 시작 전 반드시 `source .env`** — babel이 빌드 타임에 env var 인라인
3. **FastAPI는 `cd Backend` 후 실행** — venv 경로가 Backend/ 기준
4. **앱은 강제종료 후 재실행** — 캐시된 번들 제거 목적
5. **캐시 초기화는 `$TMPDIR/metro-cache` 삭제** — `--reset-cache` 플래그 미지원
6. **정책값 검증은 FastAPI 로그 200까지 확인** — 화면 텍스트만 보면 프로덕션/캐시 오판 가능

## adb reverse tcp:8765 실패 시 LAN IP 폴백

`adb reverse tcp:8765 tcp:8765` → `cannot bind listener: Address already in use` 빈발.
이 경우 `src/lib/api/backend.ts`의 LAN IP 상수로 전환:

```ts
// 아래 줄 주석 해제 + 현재 호스트 LAN IP 입력
const DEV_LAN_BACKEND_URL = 'http://172.30.1.2:8765'; // ipconfig getifaddr en0
```

`resolveBackendUrl()` 내 `return DEFAULT_BACKEND_URL;` 을 `return DEV_LAN_BACKEND_URL;` 로 교체.  
FastAPI는 `--host 0.0.0.0`으로 시작해야 LAN에서 수신 가능.

> LAN IP는 세션마다 바뀔 수 있으니 `ipconfig getifaddr en0`으로 매번 확인.

## npm run dev 자동화

`package.json`의 `dev` 스크립트는 `.env`를 자동 로드하도록 수정됨:
```json
"dev": "set -a && source .env 2>/dev/null; set +a; granite dev"
```
단, adb reverse는 별도로 실행해야 함.
