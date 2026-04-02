# P2 Quick-Win 3종 + mTLS 실전환 (2026-04-02)

## P2 Quick-Win 완료 항목

### `/login` Ready→Done (AUTH-001)
- [x] `#FEE2E2` → `colors.badgeRedBg` 토큰화
- [x] `#DC2626` → `colors.badgeRed` 토큰화
- 로딩/에러 상태: 기존 구현 정상 (ActivityIndicator + errorBanner)
- TSC: clean

### `/legal/terms` Ready→Done (APP-001)
- [x] QA 통과 — 정적 콘텐츠, 토큰 100% 준수, 코드 변경 없음

### `/legal/privacy` Ready→Done (APP-001)
- [x] QA 통과 — 정적 콘텐츠, 토큰 100% 준수, 코드 변경 없음

## mTLS 실전환 — Edge Function 3종

### 변경 내용
- `verify-iap-order/index.ts` — `createMTLSClient('mock')` → `createMTLSClient(resolveMtlsMode())`
- `send-smart-message/index.ts` — `createMTLSClient('mock')` → `createMTLSClient(resolveMtlsMode())`
- `grant-toss-points/index.ts` — `createMTLSClient('mock')` → `createMTLSClient(resolveMtlsMode())`

### 리팩토링: `_shared/mtlsMode.ts` 추출
- [x] `readEnv()` + `resolveMtlsMode()` → `_shared/mtlsMode.ts`로 공통화
- [x] 4종 Edge Function에서 로컬 정의 제거 → import로 교체
  - `login-with-toss`, `verify-iap-order`, `send-smart-message`, `grant-toss-points`

### `resolveMtlsMode()` 자동 감지 로직
1. `TOSS_MTLS_MODE` 환경변수가 `real`/`mock`이면 그대로 사용
2. 미설정 시: `TOSS_CLIENT_CERT_BASE64` + `TOSS_CLIENT_KEY_BASE64` 둘 다 존재 → `real`
3. 둘 중 하나라도 없으면 → `mock` (로컬 개발 안전)

### Supabase Secrets 등록 (수동 실행 필요)
```bash
cd ~/.taillogtoss-secrets
unzip mTLS_인증서_20260402.zip
base64 -i client.crt | tr -d '\n' > client_cert_b64.txt
base64 -i client.key | tr -d '\n' > client_key_b64.txt

supabase secrets set TOSS_CLIENT_CERT_BASE64="$(cat client_cert_b64.txt)"
supabase secrets set TOSS_CLIENT_KEY_BASE64="$(cat client_key_b64.txt)"
```

등록 후 Edge Function 재배포 시 자동으로 `real` 모드 활성화.

## Board 상태 변경
| route | 이전 | 이후 |
|-------|------|------|
| `/login` | Ready | Done |
| `/legal/terms` | Ready | Done |
| `/legal/privacy` | Ready | Done |

## 결과
- Done 페이지: 16/21 → **19/21**
- 남은 Ready: `/ops/settings`, `/parent/reports` (B2B P2)
- mTLS: 4종 Edge Function 모두 자동 감지 패턴 적용 완료
- TSC: all clean
