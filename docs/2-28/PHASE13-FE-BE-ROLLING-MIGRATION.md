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
- [x] Supabase Edge Function `login-with-toss` v12 배포 확인 (`get_edge_function`)
- [ ] Sandbox 실기기: survey 완료 -> survey-result -> notification -> dashboard

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
