Section-ID: toss_apps-10
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: developers-apps-in-toss.toss.im,supabase.com/docs

## 9. 콘솔 등록 & 운영 API (공식 문서 기반)

### 9.1 콘솔 앱 등록 프로세스
1. 콘솔 가입 (토스 비즈니스 회원, 만 19세 이상)
2. 워크스페이스 생성 → 앱 등록 (개발 전에도 등록 가능)
3. 사업자 정보 등록 (토스 로그인, IAP 등 수익화 기능 사용 시 필수)
4. 토스 로그인 설정: 약관 URL + 동의문 URL + 연결 끊기 콜백 등록
5. mTLS 인증서 발급 (콘솔에서 발급, 만료 전 무중단 교체 = 2장 병행 등록)

### 9.2 약관 등록 — 자동 동의 화면
- 콘솔에 **약관 URL 등록** → 토스 앱이 OAuth 시 **WebView로 자동 노출**
- 개발자가 약관 동의 UI를 별도로 구현할 필요 없음
- 첫 로그인 시에만 동의 요청, 이후 세션 유지
- `agreedTerms` 배열로 사용자가 동의한 약관 목록 반환

| 콘솔 필드 | 필수 | 형식 |
|-----------|------|------|
| 서비스 이용약관 | ★필수 | 외부 웹 URL (토스가 WebView로 열음) |
| 개인정보 수집·이용 동의 | 선택 | 외부 웹 URL |
| 마케팅 정보 수신 동의 | 선택 | 외부 웹 URL |
| 전자적 전송매체 광고 수신 동의 | 선택 | 외부 웹 URL |

### 9.3 연결 끊기 콜백 (Disconnect Callback)
토스 → 파트너 서버 방향. **Basic Auth** 인증 (mTLS 아님).

```
POST {콜백URL}
Headers: Authorization: Basic {base64(id:password)}
Content-Type: application/json
Body: {"userKey": 443731103, "referrer": "UNLINK"}
Response: 200 OK
```

| referrer | 의미 | 처리 |
|----------|------|------|
| `UNLINK` | 사용자가 직접 연결 해제 | toss_user_key → NULL, 재연결 가능 |
| `WITHDRAWAL_TERMS` | 동의 철회 | PII 삭제 + 익명화 |
| `WITHDRAWAL_TOSS` | 토스 계정 탈퇴 | 전체 CASCADE 삭제 |

- GET/POST 모두 지원 (콘솔에서 선택)
- CORS: `https://apps-in-toss.toss.im` 허용 (콘솔 테스트 버튼용)
- 콘솔 테스트 시 userKey=0, referrer="UNLINK" 전송
- Basic Auth ID/PW: 콘솔 + 서버 secrets에 동일 값 설정

### 9.4 S2S API 엔드포인트 (공식 확인)

모든 S2S 호출은 mTLS 클라이언트 인증서 필요.

| API | Method | Path |
|-----|--------|------|
| 토큰 발급 | POST | `/api-partner/v1/apps-in-toss/user/oauth2/generate-token` |
| 프로필 조회 | GET | `/api-partner/v1/apps-in-toss/user/oauth2/login-me` |
| 토큰 갱신 | POST | `/api-partner/v1/apps-in-toss/user/oauth2/refresh-token` |
| 연결해제(토큰) | POST | `.../access/remove-by-access-token` |
| 연결해제(키) | POST | `.../access/remove-by-user-key` |

- Authorization Code 유효기간: **10분**
- AccessToken 유효기간: **1시간** (3600초)
- RefreshToken 유효기간: **14일**
- `scope`: 동의된 권한 (예: `user_ci`, `user_name`, `user_phone`)

### 9.5 PII 복호화 (AES-256-GCM)
Toss가 반환하는 사용자 정보는 **AES-256-GCM 암호화** 상태.

- **복호화 키 + AAD**: 콘솔에서 이메일로 별도 제공
- **IV**: 12바이트 (암호문 앞 12바이트)
- **AAD**: Additional Authenticated Data (콘솔 제공)

| 필드 | 암호화 | 비고 |
|------|--------|------|
| userKey | ✗ | 숫자, 고유 식별자 |
| name | ✓ | 동의 시만 반환 |
| phone | ✓ | 동의 시만 반환 |
| birthday | ✓ | yyyyMMdd |
| ci | ✓ | 본인확인정보 |
| gender | ✓ | |
| nationality | ✓ | |
| email | ✓ | 미인증 상태일 수 있음 |
| scope | ✗ | 동의된 권한 배열 |
| agreedTerms | ✗ | 동의한 약관 배열 |

```typescript
// 복호화 예시 (Deno Edge Function)
function decryptTossPII(encryptedBase64: string, keyHex: string, aad: Uint8Array): string {
  const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  // AES-256-GCM decrypt with iv + aad
}
```

### 9.6 mTLS 인증서 배포
- 인증서: 콘솔에서 발급, PEM 형식 (cert + private key)
- **Supabase secrets로 등록**:
  - `TOSS_CLIENT_CERT_BASE64` = `base64(taillog_public.crt)`
  - `TOSS_CLIENT_KEY_BASE64` = `base64(taillog_private.key)`
- Edge Function에서 사용:
```typescript
const cert = atob(Deno.env.get('TOSS_CLIENT_CERT_BASE64')!);
const key = atob(Deno.env.get('TOSS_CLIENT_KEY_BASE64')!);
const httpClient = Deno.createHttpClient({ certChain: cert, privateKey: key });
```
- **⚠️ 인증서 파일은 git 저장소에 포함하지 않음** (`.gitignore`)
- 만료 전 교체: 새 인증서 발급 → secrets 업데이트 → 기존 인증서 7일 유예 후 삭제

