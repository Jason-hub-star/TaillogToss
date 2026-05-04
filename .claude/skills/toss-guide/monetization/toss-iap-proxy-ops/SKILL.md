---
name: toss-iap-proxy-ops
description: Toss IAP 검증 스킬 — Edge Function 404 우회, Service Role 감지, mTLS mock 설정, 토큰 헬퍼 분리를 체계적으로 수행.
---

# Toss IAP Proxy Ops

Toss 미니앱의 IAP(인앱 결제) 검증이 Edge Function 경로 차단(404)으로 실패할 때
FastAPI proxy로 우회하는 패턴, Service Role Key 감지 방식, mTLS mock 강제 설정을 
표준화한 스킬.

## 언제 사용하나
- "IAP 검증이 404로 실패하는데 어떻게 우회할까?"
- "Edge Function에서 Supabase Service Role을 감지하려고 하는데?"
- "mTLS 검증을 개발 단계에서 스킵하고 싶은데?"
- "iap.ts 토큰 헬퍼가 너무 많으니 분리해줄래?"

## 공식 문서 (항상 최신 기준 재확인)
- IAP 공식 문서: `https://developers-apps-in-toss.toss.im/in-app-purchase/intro.html`
- IAP Webhook: `https://developers-apps-in-toss.toss.im/in-app-purchase/webhook.html`
- Supabase Edge Function: `https://supabase.com/docs/guides/functions`
- Supabase Secrets: `https://supabase.com/docs/guides/functions/secrets`

---

## 패턴 1: IAP Edge Function 404 → FastAPI Proxy 우회

### 문제 현상
- Toss 미니앱(`intoss-private://` URL scheme)이 `/functions/v1/` 경로 차단
- Edge Function 호출 시 404 응답 반환
- 검증 서버 연동 불가능

### 해결 방식

#### 1.1 FastAPI 엔드포인트 준비
```bash
# FastAPI 서버 실행 (포트 8765)
cd /Users/family/jason/TaillogToss
python -m uvicorn Backend.main:app --reload --host 127.0.0.1 --port 8765
```

**FastAPI 라우터**:
- File: `Backend/app/features/subscription/router.py`
- Endpoint: `POST /api/v1/subscription/iap/verify`
- Method: Service Role Key 없이 JWT 검증 스킵, `body.userId` 사용

#### 1.2 adb reverse 설정
```bash
# Device 포트 8000이 점유되어 있으면 8765 사용
adb reverse tcp:8765 tcp:8765
```

**이유**: 로컬 개발 시 device에서 `http://127.0.0.1:8765/api/v1/...`로 접근 가능

#### 1.3 클라이언트 코드 수정

**File**: `src/lib/api/iap.ts`  
**Function**: `verifyAndGrant(receipt, userId)`  
**Line**: 269-284

```typescript
// 기존 코드 (Edge Function 직접 호출)
try {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-iap-order`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ receipt, userId }),
  });
  
  // 404 감지 → FastAPI proxy로 우회
  if (response.status === 404) {
    console.warn('[IAP] Edge Function 404, FastAPI proxy로 우회');
    return await fallbackFastAPIVerify(receipt, userId);
  }
  
  return await response.json();
} catch (error) {
  console.error('[IAP] 검증 실패:', error);
  return await fallbackFastAPIVerify(receipt, userId);
}

// FastAPI proxy 호출
async function fallbackFastAPIVerify(receipt: string, userId: string) {
  const response = await fetch('http://127.0.0.1:8765/api/v1/subscription/iap/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receipt, userId }),
  });
  
  if (!response.ok) {
    throw new Error(`FastAPI verify failed: ${response.status}`);
  }
  
  return await response.json();
}
```

### 검증 체크리스트
- [ ] FastAPI 서버 실행 중 (`:8765`)
- [ ] `adb reverse tcp:8765 tcp:8765` 설정 완료
- [ ] `src/lib/api/iap.ts:269-284` fallback 함수 추가
- [ ] 앱 재빌드 후 IAP 검증 재시도
- [ ] 로그에 404 → proxy 전환 메시지 확인

---

## 패턴 2: Service Role Key 감지 (JWT Claims 파싱)

### 문제 현상
- Supabase 환경변수명 `SUPABASE_SERVICE_ROLE_KEY`는 prefix `SUPABASE_` 때문에 거부됨
- Edge Function에서 Service Role을 명시적으로 감지할 방법이 없음
- FastAPI가 service role로 호출할 때와 클라이언트가 호출할 때 다른 검증 로직 필요

### 해결 방식

#### 2.1 JWT Token Claims 파싱 함수

**File**: `supabase/functions/verify-iap-order/main.ts`

```typescript
// JWT 토큰에서 role 클레임 추출
function parseTokenRole(token: string): string | null {
  try {
    // JWT 형식: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('[JWT] Invalid token format');
      return null;
    }

    // payload 부분 base64 디코딩
    const payload = parts[1];
    // base64url -> base64 변환 (padding 처리)
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(decoded);

    return claims.role || null;
  } catch (error) {
    console.error('[JWT] Parse failed:', error);
    return null;
  }
}

// 함수 사용 예시
async function handleVerifyRequest(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  const role = parseTokenRole(token);

  if (role === 'service_role') {
    // FastAPI 등 서버에서 호출했다고 간주
    // JWT 검증 스킵, body.userId 신뢰
    const { userId, receipt } = await req.json();
    return await processIAPWithoutJWTVerification(userId, receipt);
  } else {
    // 클라이언트 호출이므로 JWT + 본인 확인
    return await processIAPWithFullValidation(token, req);
  }
}
```

#### 2.2 FastAPI에서 호출 시

**File**: `Backend/app/features/subscription/router.py`

```python
@router.post("/api/v1/subscription/iap/verify")
async def verify_iap_order(request: IAPVerifyRequest):
    """
    FastAPI에서 Supabase Edge Function으로 요청.
    Service Role로 호출되므로 JWT 검증 스킵.
    """
    user_id = request.user_id  # 클라이언트가 보낸 user_id 직접 사용
    receipt = request.receipt

    # 앱 서명 + 영수증 검증 (Toss 공식 API)
    verification_result = await verify_with_toss_server(receipt)
    
    if verification_result["status"] == "verified":
        # 구독 권리 부여
        await grant_subscription(user_id)
        return {"success": True}
    
    return {"success": False, "reason": "Invalid receipt"}
```

**핵심 원칙**:
- JWT claims의 `role === 'service_role'`이면 JWT 검증 스킵
- `body.userId`를 신뢰하고 직접 사용
- 클라이언트 JWT는 항상 검증

### 검증 체크리스트
- [ ] `parseTokenRole(token)` 함수 구현
- [ ] Edge Function에서 role 감지 후 분기 처리
- [ ] FastAPI에서 Service Role 호출 시 JWT 검증 스킵 로직 추가
- [ ] Edge Function + FastAPI 통합 테스트 완료

---

## 패턴 3: mTLS Mock 강제 설정

### 문제 현상
- 개발 단계에서 실제 mTLS 인증서가 없어 Toss 서버 연동 불가
- 프로덕션 환경변수명을 개발에 쓸 수 없음
- mTLS mock 모드의 우선 순위가 명확하지 않음

### 해결 방식

#### 3.1 Supabase Secrets 설정
```bash
# Supabase 프로젝트 대시보드에서 또는 CLI로 설정
supabase secrets set TOSS_MTLS_MODE=mock
```

**핵심**:
- 환경변수명: `TOSS_MTLS_MODE` (Supabase 제약으로 `SUPABASE_` prefix 불가)
- 값: `mock` (개발 모드) 또는 `production` (실제 환경)
- **mock 설정이 있으면 실제 cert/key 무시하고 우선 적용**

#### 3.2 Edge Function에서 적용

**File**: `supabase/functions/_shared/mtlsMode.ts`

```typescript
// mTLS 모드 감지
function getMTLSMode(): 'mock' | 'production' {
  const mode = Deno.env.get('TOSS_MTLS_MODE');
  return mode === 'mock' ? 'mock' : 'production';
}

// Mock mTLS Client 사용
class MockMTLSClient {
  async verifyReceipt(receipt: string): Promise<VerificationResult> {
    console.log('[mTLS] Mock mode enabled, skipping real certificate validation');
    return {
      status: 'success',
      orderId: `mock_order_${Date.now()}`,
      amount: 9900,
    };
  }
}

// 실제 호출 코드
async function verifyIAPReceipt(receipt: string) {
  const mode = getMTLSMode();
  
  if (mode === 'mock') {
    const mockClient = new MockMTLSClient();
    return await mockClient.verifyReceipt(receipt);
  } else {
    // 실제 cert/key로 mTLS 연결
    return await realMTLSClient.verifyReceipt(receipt);
  }
}
```

#### 3.3 배포 확인
```bash
# 현재 Supabase 설정 확인
supabase secrets list

# 출력 예시:
# TOSS_MTLS_MODE=mock
# TOSS_CERT_PEM=<...>  (프로덕션에만 설정)
# TOSS_KEY_PEM=<...>   (프로덕션에만 설정)
```

**배포 순서**:
1. Supabase 대시보드 → Settings → Secrets
2. `TOSS_MTLS_MODE=mock` 입력
3. "Save" 클릭
4. Edge Function 재배포 또는 재시작

### 검증 체크리스트
- [ ] `TOSS_MTLS_MODE=mock` 설정 완료
- [ ] `supabase secrets list`로 확인
- [ ] Edge Function 재배포
- [ ] Toss API 호출 시 mock 응답 확인 (로그)
- [ ] 프로덕션 배포 전 `TOSS_MTLS_MODE` 제거 또는 `production` 변경

---

## 패턴 4: iap-invoke.ts 분리

### 문제 현상
- `src/lib/api/iap.ts`에 토큰 헬퍼 함수 7개가 섞여 있음
- 외부 의존성이 있어서 복잡도 증가
- 테스트/재사용성 어려움

### 해결 방식

#### 4.1 헬퍼 함수 목록 (분리 대상)

```typescript
// 현재 iap.ts에 포함된 함수들
1. getAuthToken()           // Supabase JWT 토큰 획득
2. buildIAPHeaders()        // IAP 요청 헤더 생성
3. encodeReceiptPayload()   // 영수증 payload 인코딩
4. decodeTokenClaims()      // JWT 클레임 파싱
5. validateTokenExpiry()    // 토큰 만료 검증
6. sanitizeReceipt()        // 영수증 형식 검증
7. parseIAPResponse()       // 검증 응답 파싱
```

#### 4.2 새 파일 생성

**File**: `src/lib/api/iap-invoke.ts`

```typescript
/**
 * IAP 토큰/헬퍼 함수 전용 모듈.
 * iap.ts에서만 import 가능 (외부 import 금지).
 */

import { JwtPayload, jwtDecode } from 'jwt-decode'; // 필요시만 추가

// ============ 토큰 함수 ============

export function getAuthToken(): string {
  // Supabase 클라이언트에서 JWT 획득
  // const supabase = useSupabaseClient();
  // return supabase.auth.session?.access_token || '';
}

export function decodeTokenClaims(token: string): JwtPayload | null {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('[IAP] Token decode failed:', error);
    return null;
  }
}

export function validateTokenExpiry(token: string): boolean {
  const claims = decodeTokenClaims(token);
  if (!claims?.exp) return false;
  
  const now = Math.floor(Date.now() / 1000);
  return claims.exp > now;
}

// ============ 요청 함수 ============

export function buildIAPHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-IAP-Request-Id': `iap_${Date.now()}_${Math.random()}`,
  };
}

export function encodeReceiptPayload(receipt: string): string {
  return Buffer.from(receipt).toString('base64');
}

export function sanitizeReceipt(receipt: string): string {
  return receipt.trim().replace(/\s+/g, '');
}

// ============ 응답 함수 ============

export function parseIAPResponse(response: any): {
  success: boolean;
  subscriptionId?: string;
  expiryDate?: number;
  error?: string;
} {
  if (!response || typeof response !== 'object') {
    return { success: false, error: 'Invalid response' };
  }

  if (response.status !== 'verified') {
    return { success: false, error: response.statusMessage || 'Verification failed' };
  }

  return {
    success: true,
    subscriptionId: response.latestReceiptInfo?.[0]?.subscription_id,
    expiryDate: response.latestReceiptInfo?.[0]?.expires_date_ms,
  };
}
```

#### 4.3 iap.ts 수정

**File**: `src/lib/api/iap.ts` (수정)

```typescript
// 기존: 함수들이 섞여 있음
// 변경: iap-invoke에서 import

import {
  getAuthToken,
  buildIAPHeaders,
  encodeReceiptPayload,
  decodeTokenClaims,
  validateTokenExpiry,
  sanitizeReceipt,
  parseIAPResponse,
} from './iap-invoke';

export async function verifyAndGrant(receipt: string, userId: string) {
  const token = getAuthToken();
  
  if (!validateTokenExpiry(token)) {
    throw new Error('Token expired');
  }

  const sanitized = sanitizeReceipt(receipt);
  const headers = buildIAPHeaders(token);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-iap-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ receipt: sanitized, userId }),
    });

    if (response.status === 404) {
      return await fallbackFastAPIVerify(sanitized, userId);
    }

    const data = await response.json();
    return parseIAPResponse(data);
  } catch (error) {
    console.error('[IAP] Verify failed:', error);
    return { success: false, error: String(error) };
  }
}

// 나머지 함수들은 변경 없음
```

### 검증 체크리스트
- [ ] `src/lib/api/iap-invoke.ts` 생성
- [ ] 토큰 헬퍼 7개 함수 이동
- [ ] `src/lib/api/iap.ts`에서 import 추가
- [ ] 타입스크립트 컴파일 성공 확인
- [ ] 기존 IAP 기능 동작 확인

---

## 전체 운영 순서 (권장)

1. **FastAPI 준비**
   - FastAPI `:8765` 실행 확인
   - `Backend/app/features/subscription/router.py` 검토

2. **클라이언트 수정**
   - `src/lib/api/iap.ts:269-284` fallback 함수 추가
   - 앱 재빌드

3. **Edge Function 업그레이드**
   - `supabase/functions/verify-iap-order/main.ts` JWT 파싱 함수 추가
   - role 기반 분기 처리 구현

4. **mTLS 설정**
   - `supabase secrets set TOSS_MTLS_MODE=mock` 적용
   - Edge Function 재배포

5. **코드 리팩토링**
   - `src/lib/api/iap-invoke.ts` 생성
   - `src/lib/api/iap.ts` import 수정
   - 통합 테스트

6. **검증 및 문서 동기화**
   - IAP 엔드-투-엔드 검증 완료
   - `docs/PROJECT-STATUS.md` 업데이트
   - `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md` 패턴 추가

---

## Failure Modes

- **404 우회 작동 안 함**: adb reverse 설정 누락 또는 FastAPI 서버 미실행 → `adb logcat -d | grep IAP` 확인
- **JWT claims 파싱 실패**: 토큰 format 오류 (header.payload.signature 아님) → `jwtDecode()` 라이브러리 대체
- **mTLS mock이 안 먹음**: Supabase secrets 배포 후 Edge Function 재시작 필요 → `supabase functions list --verbose` 확인
- **iap-invoke 분리 후 빌드 실패**: 순환 import 확인 → `iap-invoke.ts`에서 `iap.ts` import 금지

