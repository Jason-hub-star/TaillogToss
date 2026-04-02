# mTLS 실전환 계획 (2026-04-02)

## 인증서 위치
- 원본: `~/.taillogtoss-secrets/mTLS_인증서_20260402.zip`
- PII 복호화 키: `~/.taillogtoss-secrets/securityMail.html` (키 값은 해당 파일 참조)

## 전환 단계 (수동 실행 필요)

### 1. 인증서 추출
```bash
cd ~/.taillogtoss-secrets
unzip mTLS_인증서_20260402.zip
# client.crt + client.key 확인
```

### 2. Base64 인코딩 + Supabase Secrets 등록
```bash
base64 -i client.crt | tr -d '\n' > client_cert_b64.txt
base64 -i client.key | tr -d '\n' > client_key_b64.txt

# Supabase CLI로 등록 (실제 환경변수 이름에 주의)
supabase secrets set TOSS_CLIENT_CERT_BASE64="$(cat client_cert_b64.txt)"
supabase secrets set TOSS_CLIENT_KEY_BASE64="$(cat client_key_b64.txt)"
supabase secrets set TOSS_PII_DECRYPTION_KEY_BASE64="<securityMail.html에서 추출>"
```

### 3. Edge Function mock→real 전환 (4종) ✅ 코드 완료
- `login-with-toss` — ✅ 기존 `resolveMtlsMode()` 자동 감지 구현 완료
- `verify-iap-order` — ✅ `resolveMtlsMode()` 자동 감지 적용 완료
- `send-smart-message` — ✅ `resolveMtlsMode()` 자동 감지 적용 완료
- `grant-toss-points` — ✅ `resolveMtlsMode()` 자동 감지 적용 완료

> Secrets 등록 + 재배포 시 자동으로 real 모드 활성화 (cert+key 감지)

### 4. `src/lib/security/piiEncrypt.ts` 복호화 키 연동 확인

## 보안 주의
- 인증서/키는 절대 git에 커밋하지 않음
- `.gitignore`에 `src/public/`, `securityMail*`, `*.pem`, `*.crt`, `*.key` 추가됨
- Supabase Secrets는 write-only (읽기 불가)
