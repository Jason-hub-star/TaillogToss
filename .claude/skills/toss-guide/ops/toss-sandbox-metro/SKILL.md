---
name: toss-sandbox-metro
description: Toss Sandbox 실기기 테스트에서 Metro 서버 연결, 진입 스킴 입력, authorizationCode 기반 로그인 검증을 수행한다. 사용자가 "Sandbox에서 스킴 뭐 입력해", "Metro 어떻게 연결해", "실기기 로그인 테스트 절차"를 물을 때 사용한다.
---

# Toss Sandbox Metro

## 목적
- Toss Sandbox 앱에서 로컬 Metro 서버로 앱을 띄우고, 로그인/콜백 검증 증적을 수집한다.

## 빠른 결론
- 로컬 개발용 진입 스킴: `intoss://{serviceName}`
- 이 저장소의 `serviceName`: `taillog-app`
- 따라서 입력값: `intoss://taillog-app`

근거:
- 공식 Native Quickstart: `intoss://{serviceName}` 형식
- 이 프로젝트 appName: `taillog-app` (`granite.config.ts`, `src/_app.tsx`)

## 로컬 Metro 연결 절차 (실기기)
1. 프로젝트 루트에서 `npm run dev` 실행.
2. Android면 USB 연결 후 아래 실행:
   - `adb reverse tcp:8081 tcp:8081`
   - `adb reverse tcp:5173 tcp:5173`
3. Toss Sandbox 앱(개발자 로그인)에서 진입 스킴 입력 화면으로 이동.
4. `intoss://taillog-app` 입력 후 진입.
5. 로그인 버튼을 눌러 Toss Login 플로우 실행.

## 테스트 모드 구분
- 로컬 코드(지금 편집 중인 코드) 검증: 위 Metro 연결 방식 사용.
- 콘솔에 업로드한 private 번들 검증: QR / `intoss-private://` 방식 사용.

## 검증 체크리스트
1. 로그인 성공 케이스
- 기대: `login-with-toss` 200 + 앱 내 온보딩/대시보드 가드 진입
- 증적: 전/후 스크린샷, `sb-request-id`, edge log 200

2. 로그인 실패 케이스
- 기대: 잘못된 코드에서 적절한 에러(예: 400/502)
- 증적: 에러 화면, edge log 상태코드

3. 연결해제 콜백
- 기대: 콘솔 테스트 버튼에서 `toss-disconnect` 200
- 참고: 무인증 직접 호출은 401이 정상

## 트러블슈팅
- `login-with-toss`가 `WORKER_ERROR(500)`:
  - `TOSS_MTLS_MODE=real`일 때 `TOSS_CLIENT_CERT_BASE64`, `TOSS_CLIENT_KEY_BASE64` 누락 여부 확인
- `[Apps In Toss Plugin] 플러그인 옵션이 올바르지 않습니다`:
  - `granite.config.ts`의 `appsInToss({ brand })` 값 점검
  - `brand.icon`은 `null` 불가, 문자열이어야 함 (`''` 가능)
- 스킴 진입 실패:
  - `intoss://taillog-app` 오탈자 확인
  - appName이 변경됐으면 `{serviceName}`도 동일하게 변경
- `GraniteModule could not be found`:
  - `granite.config.ts`에 `appsInToss()` 플러그인 포함 여부 확인
  - `src/_app.tsx`가 `AppsInToss.registerApp(...)`를 사용하는지 확인
  - Sandbox 앱 최신 버전 설치 + Bedrock 경로 진입 재확인
- `/_404::screen`만 반복:
  - 초기 진입 URL 보정 필요 (`/_404`를 `/login`으로 normalize)
  - `pages/_404.tsx`에서 `/login` 리다이렉트 처리 여부 확인
- Android만 접속 실패:
  - `adb reverse tcp:8081 tcp:8081` 재실행 (Metro 번들링)
  - backend는 LAN IP direct 방식 사용 (adb reverse 8000 불필요)
- FastAPI 307 Temporary Redirect 반복:
  - BE 라우터가 `@router.get("/")` 형태면 FE 경로에 trailing slash 필수
  - 예: `/api/v1/subscription` → `/api/v1/subscription/`
- `[FE-BE] backend fallback to supabase [TypeError: Network request failed]`:
  - FastAPI 실행 주소를 `0.0.0.0:8000`으로 열었는지 확인 (`uvicorn app.main:app --host 0.0.0.0 --port 8000`)
  - **원인**: Metro가 `0.0.0.0`으로 바인딩 → `resolveBackendUrl()`이 `127.0.0.1:8000` 반환 → 실기기에서 `127.0.0.1`은 기기 자신 → 연결 실패
  - **1차 시도** `adb reverse tcp:8000 tcp:8000` → `Address already in use` 빈발로 불안정
  - **2차 시도** `adb reverse tcp:18000 tcp:8000` 우회 + `EXPO_PUBLIC_BACKEND_URL` env → Granite이 `EXPO_PUBLIC_*` env를 번들에 인라인하지 않아 실패
  - **해결 (2026-02-28)**: `backend.ts` `resolveBackendUrl()`에서 `__DEV__` + loopback 감지 시 `DEV_LAN_BACKEND_URL`(PC Wi-Fi LAN IP + `:8000`)로 직접 연결
  - LAN IP 확인: `ipconfig | grep IPv4` → Wi-Fi 어댑터 IP 사용 (WSL/Hyper-V IP 제외)
  - 네트워크 변경 시 `backend.ts`의 `DEV_LAN_BACKEND_URL` 상수만 수정
  - Windows 방화벽에 8000 인바운드 허용 규칙 필요 (`netsh advfirewall firewall add rule name="FastAPI 8000" dir=in action=allow protocol=tcp localport=8000`)
  - 성공 기준: Metro 로그에 `[FE-BE] backend fallback` 미발생 + Uvicorn에 기기 IP(`172.30.1.x`)에서 `/api/v1/...` 요청 로그 유입

## 로그인 성공 패턴 (2026-02-27 확정)
아래 순서를 만족하면 Sandbox 실기기 로그인 성공 패턴으로 본다.

1. 앱 로그 시퀀스
- `/login::screen` 노출
- `LOG  [AUTH-001] appLogin referrer SANDBOX`
- `/onboarding/welcome::screen` 이동

2. Edge 로그 시퀀스
- 함수: `login-with-toss`
- 버전: `v11`
- 상태: `POST 200`
- request id 예시:
  - `f52019d7-0162-48bf-b021-de8bc80539de`
  - `92de76c2-abaa-4d8c-81cc-3e7329fe6d21`

3. 실패 시 분기 포인트(이번 세션 기준)
- `FunctionsFetchError`: 클라이언트 환경변수/네트워크 점검
- `FunctionsHttpError + AUTH_LOGIN_FAILED`: Edge 내부 원인 파싱(`upstreamMessage`) 확인
- `TypeError ... split of undefined`: Edge 응답 래퍼(`{ ok, data }`) 언랩 누락 여부 확인

4. 고정 구현 규칙
- `referrer`는 대문자/소문자 변환 없이 `appLogin()` 반환값을 그대로 전달
- `login-with-toss`는 `verify_jwt=false` 유지
- mTLS 클라이언트는 `Deno.createHttpClient({ cert, key })` 우선, 필요 시 `certChain/privateKey` 폴백

## Operational Guardrails
<!-- enrich:35a1c6d9b290 -->
- LAN IP(`DEV_LAN_BACKEND_URL`)는 네트워크 변경 시마다 수동 업데이트가 필요하므로, `.env.local`로 추출하거나 세션 시작 루틴에 `ipconfig` 확인 단계를 포함한다.
- Windows 방화벽 8000번 인바운드 허용 규칙이 없으면 실기기 → PC FastAPI 요청이 무소음으로 drop되므로, 세션 시작 전 `netsh advfirewall` 규칙 존재 여부를 확인한다.
- `adb reverse tcp:8081 tcp:8081`은 USB 재연결 또는 Android 재시작 시 해제되므로, Metro 번들 오류 발생 시 먼저 adb reverse를 재실행한다.

## 공식 문서
- Native Quickstart (스킴): https://developers-apps-in-toss.toss.im/guide/native/quickstart.html
- Local server with Metro: https://developers-apps-in-toss.toss.im/guide/native/local-server.html
