# Phase 13 FE-BE Rolling Migration (2026-02-28)

## Scope
- Parity: AUTH-001, APP-001, AI-001, LOG-001, B2B-001
- Goal: Big-bang 없이 도메인별 순차 전환 + 즉시 검증

## Baseline
- typecheck: pass (2026-02-28)
- app tests (jest app): pass (43/43)
- edge tests (jest edge): pass (30/30)

## Work Plan
1. AUTH/온보딩 블로커 해소
- [x] login-with-toss 응답 user.id를 UUID 세션 사용자로 정렬
- [x] login-with-toss에서 Supabase auth session 토큰 발급 경로 추가
- [x] public.users upsert 연동 (toss_user_key, pepper_version, last_login_at)
- [x] login-with-toss Edge Function v12 재배포 (MCP deploy)
- [x] dogs/dog_env RLS write 정책 추가 마이그레이션 + DB 반영
- [x] 설문 저장 실패 원인 노출(에러 메시지 표시)

2. API 정합성 우선 수정
- [x] dog_env 테이블명 정합화 (`dog_envs` -> `dog_env`)
- [x] coaching 테이블명 정합화 (`coaching_results` -> `ai_coaching`)

3. FE→BE 공통 기반
- [x] `src/lib/api/backend.ts` 추가 (JWT 헤더 + 에러 표준화 + fallback)
- [x] coaching API를 backend 우선 + supabase fallback 구조로 전환
- [x] org dogs API를 backend 우선 + supabase fallback 구조로 전환

4. 남은 도메인 전환 (완료)
- [x] dashboard
- [x] log
- [x] report
- [x] training
- [x] settings
- [x] subscription
- [x] notification

## Validation Checklist
- [x] `npm run typecheck`
- [x] `jest` app 핵심 4 suite
- [x] `jest` edge suite
- [x] Supabase Edge Function `login-with-toss` v13 ACTIVE 확인 (`list_edge_functions`)
- [ ] Sandbox 실기기: survey 완료 -> survey-result -> notification -> dashboard

5. AUTH 세션 안정화
- [x] `auth.ts`: refresh token JWT 판별 완화 (Supabase refresh는 비-JWT 가능)
- [x] `login.tsx`: bridge session 미수립 시 명시적 에러(`BRIDGE_SESSION_NOT_ESTABLISHED`) 처리
- [x] `auth.test.ts`: access_token JWT + refresh_token 비-JWT 케이스 테스트 추가

## Known Issue (2026-02-28) — RESOLVED
- 현상: 실기기에서 `WARN  [FE-BE] backend fallback to supabase [TypeError: Network request failed]` 반복.
- 근본 원인: Granite이 `EXPO_PUBLIC_*` env를 번들에 인라인하지 않음 + Metro `0.0.0.0` 바인딩 시 `resolveBackendUrl()`이 `127.0.0.1:8000` 반환 → 실기기에서 `127.0.0.1`은 기기 자신.
- 해결 (2026-02-28):
  - `backend.ts`에 `DEV_LAN_BACKEND_URL = 'http://172.30.1.1:8000'` 상수 추가
  - `resolveBackendUrl()`에서 `__DEV__` + loopback 감지 시 LAN IP 사용
  - FE API 경로 5건에 trailing slash 추가 (FastAPI 307 redirect 제거)
- 검증 결과:
  - 기기(172.30.1.51) → PC(172.30.1.1:8000) LAN direct 연결 성공
  - Uvicorn 로그: `GET /api/v1/subscription/ HTTP/1.1 200 OK`
  - Metro 로그: `[FE-BE] backend fallback` 경고 미발생

## Risks
- Supabase auth/user bridge는 `SUPABASE_SERVICE_ROLE_KEY` 환경 의존
- Backend URL 미설정 시 fallback 경로 동작에 의존
- training은 FE(`training_progress`)↔BE(`user_training_status`) 모델 차이로 요약 매핑 로직 유지보수 필요

## Rollback
- FE API fallback 유지(backend 실패 시 supabase 경로)
- 문제 시 `login-with-toss`를 이전 버전으로 롤백 배포
- 신규 RLS 정책은 정책 단위 DROP으로 롤백 가능

## Self-Review
- 잘한 점: training/dashboard까지 backend-first 확장, LAN IP direct로 실기기 연결 해결, trailing slash 307 일괄 수정
- 부족한 점: training `changeVariant`는 미사용 경로라 backend 전환 범위에서 제외되어 추후 정리 필요
- 남은 공백: 실기기 E2E(설문 완료→대시보드) 증적 확보 및 IAP/MSG/AD 시나리오 검증

## Next Execution Plan (2026-02-28 22:34 KST)

Scope: `IAP-001`, `MSG-001`, `AD-001` (Phase13 게이트 마감)

1. IAP-001 증적 마감 (진행 중)
- [x] 서버 증적 고정: `verify-iap-order v12` `POST 200` 누적 5건 (`606b960d-729a-49aa-a425-77867e7eadd5`, `e9edb63f-d893-483d-9a45-93bd94833afa`, `2af98cee-4c5d-488a-b9f2-252ad69d2005`, `868dd7a9-1f02-4f32-b22a-5a8fd8684c86`, `52192480-adc5-45a6-931f-c94cfe499231`)
- [x] DB 반영 고정: `public.toss_orders` `order_count=5`, `latest_order_at=2026-02-28 22:31:22 KST`
- [x] 복구 재확인: `GET /api/v1/subscription` 200 유지 구간에서 `verify-iap-order` 최신 `POST 200` 확인
- [ ] 앱 UI 증적 3종 수집: 구매 성공 / 복구 / 실패 (스크린샷 + 앱 로그 + request id 매핑)
- [ ] 게이트 판정 업데이트: IAP `PARTIAL -> PASS` 또는 차단사유 명시

2. MSG-001 실발송 증적 (대기)
- [x] 기준선 확보: `public.noti_history` `noti_count=2`, `latest_noti_at=2026-02-28 00:52:11 KST`
- [x] 자동 호출 시도 기록: Codex 실행환경 DNS 제한으로 `https://kvknerzsqgmmdmyxlorl.supabase.co` 해석 실패(`curl: Could not resolve host`)
- [x] 사전조건 확인: Smart Message 신청/승인 완료 전 실발송 게이트는 `PARTIAL` 유지
- [x] 실시간 차단 증적: `send-smart-message` `HTTP 429` (`RATE_LIMITED: QUIET_HOURS`, `retryAfterSeconds=36000`)
- [ ] Smart Message 신청/승인 완료
- [ ] Sandbox 실발송 1건 성공: `send-smart-message` `POST 200` (승인 후)
- [ ] DB 증가 확인: `noti_history` 카운트 증가 + 최신 row `error_code is null`
- [ ] 실패 케이스 403(권한 없음) 1건 재증적

3. AD-001 실광고 증적 (대기)
- [x] 현상 확인: `src/lib/ads/config.ts`가 테스트 ID(`ait-ad-test-rewarded-id`) 고정
- [ ] 실 Ad Group ID 반영
- [ ] R1/R2/R3 노출 + 보상/폴백(no-fill) 증적 수집

4. 종료 조건
- [x] `docs/PROJECT-STATUS.md`, `docs/11-FEATURE-PARITY-MATRIX.md`, `docs/MISSING-AND-UNIMPLEMENTED.md` 동기화
- [ ] Gate Summary 작성: `AUTH/IAP/MSG/AD`를 `PASS / PARTIAL / BLOCKED`로 확정

## Windows PowerShell Runbook (즉시 실행)

`MSG-001` 200 증적 수집:
```powershell
$envFile = "C:\Users\gmdqn\tosstaillog\Backend\.env"
$serviceKey = ((Get-Content $envFile | Where-Object { $_ -like "SUPABASE_SERVICE_ROLE_KEY=*" } | Select-Object -First 1) -replace '^SUPABASE_SERVICE_ROLE_KEY=','')
$url = "https://kvknerzsqgmmdmyxlorl.supabase.co/functions/v1/send-smart-message"
$body = @{
  userId = "f59ac308-f321-464e-9a72-d686f55dd94f"
  notificationType = "training_reminder"
  templateCode = "phase13_msg_test"
  variables = @{ source = "phase13" }
  idempotencyKey = "phase13-msg-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
} | ConvertTo-Json -Depth 5
$headers = @{
  "apikey" = $serviceKey
  "Authorization" = "Bearer $serviceKey"
  "Content-Type" = "application/json"
}
$resp = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $body
$resp
```

`MSG-001` DB 증가 확인(`noti_history`):
```powershell
$restUrl = "https://kvknerzsqgmmdmyxlorl.supabase.co/rest/v1/noti_history?select=id,user_id,sent_at,success,error_code,idempotency_key&order=sent_at.desc&limit=3"
$rows = Invoke-RestMethod -Method Get -Uri $restUrl -Headers @{ "apikey" = $serviceKey; "Authorization" = "Bearer $serviceKey" }
$rows
```
