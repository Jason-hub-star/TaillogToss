# supabase/functions/ — Toss S2S mTLS 전담 Edge Functions

Toss 서버 간 통신(mTLS)은 반드시 여기서 처리. FastAPI에 mTLS 구현 금지.

## Edge Function 목록 (7종 + 공통)

| 폴더 | 역할 | Phase | Parity |
|------|------|-------|--------|
| `login-with-toss/` | OAuth2 → PBKDF2(pepper) → Supabase Auth | 11 | AUTH-001 |
| `verify-iap-order/` | IAP 결제 검증, 6상태 분기, 멱등+서킷브레이커, B2B 상품 확장 | 11+B2B | IAP-001 |
| `send-smart-message/` | Smart Message 발송, 빈도 제한, 관리자 체크 | 11 | MSG-001 |
| `grant-toss-points/` | 토스 포인트 지급, 3-step key, 에러코드 분기 | 11 | — |
| `generate-report/` | B2B 리포트 생성 (mock AI → 실 AI 연동 대기) | B2B | B2B-001 |
| `legal/` | 법적 문서 4종 HTML 서빙 (terms/privacy/marketing/ads), verify_jwt=false | REG | — |
| `toss-disconnect/` | 연결 끊기 콜백 (Basic Auth, referrer 3종 분기), verify_jwt=false | REG | AUTH-001 |
| `_shared/` | 공통 유틸 (아래 상세) | 11 | — |

## _shared/ 공통 유틸 (12개)

| 파일 | 역할 |
|------|------|
| `mTLSClient.ts` | mTLS 클라이언트 (MockMTLSClient + RealMTLSClient, `TOSS_MTLS_MODE` 또는 cert/key 존재 여부로 모드 결정) |
| `contracts.ts` | ok/fail 응답 헬퍼 (EdgeResult, EdgeError) |
| `idempotency.ts` | 멱등키 처리 (edge_function_requests 테이블) |
| `circuitBreaker.ts` | 서킷브레이커 (연속 N회 실패 → fast-fail) |
| `rateLimiter.ts` | Rate-limit (무인증 엔드포인트 방어) |
| `piiGuard.ts` | PII 로깅 금지 필터 |
| `pepperRotation.ts` | PBKDF2 pepper 듀얼 버전 회전 |
| `cooldownPolicy.ts` | Smart Message 발송 빈도 제한 (10분/일3회/22~08시) |
| `httpAdapter.ts` | HTTP 요청 어댑터 (Edge Function 공용) |
| `notiHistoryRepository.ts` | 알림 히스토리 데이터 레이어 (noti_history 테이블) |
| `tossPiiDecrypt.ts` | 토스 암호화 필드 복호화 (PII decrypt) |
| `mtlsMode.ts` | mTLS 모드 자동 감지 (`readEnv` + `resolveMtlsMode`, 4종 Edge Function 공통) |

## 보안 체크리스트

- [x] login-with-toss: Rate-limit + Nonce + PII 로그 금지
- [x] verify-iap-order: 멱등키 + 서킷브레이커 + 5xx만 재시도(최대2회)
- [x] send-smart-message: 빈도 제한 (cooldownPolicy.ts, 10분1회/하루3회, 22~08시 금지)
- [ ] grant-toss-points: key 1회 사용 제한 + 에러코드 분기
