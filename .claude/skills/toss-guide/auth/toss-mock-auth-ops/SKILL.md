---
name: toss-mock-auth-ops
description: Toss Mock 인증 스킬 — stable userKey 설정, survey 루프 근본 원인 진단, adb 기반 진단 순서를 표준화한 스킬.
---

# Toss Mock Auth Ops

Toss 미니앱 개발 단계에서 mock 모드 인증이 survey 루프에 빠질 때
**안정적인 userKey 고정**, **근본 원인 진단**, **adb 기반 트러블슈팅**을 
표준화한 스킬.

## 언제 사용하나
- "앱을 재시작할 때마다 survey가 반복되는데?"
- "mock 모드에서 userKey가 매번 바뀐다고 하는데?"
- "onboarding이 계속 나타나는 이유가 뭐지?"
- "로그인한 후 dogs 조회 결과가 비어있다고?"

## 공식 문서 (항상 최신 기준 재확인)
- Toss Login 문서: `https://developers-apps-in-toss.toss.im/login/intro.html`
- Toss Bedrock Framework: `https://developers-apps-in-toss.toss.im/bedrock/reference/framework/`
- Supabase Auth: `https://supabase.com/docs/guides/auth`
- Android Debug Bridge (adb): `https://developer.android.com/tools/adb`

---

## 패턴 1: Mock 모드 Stable UserKey 설정

### 문제 현상
- 앱 재시작 시 `MockMTLSClient.fetchLoginProfile`이 새로운 authorization code 생성
- 각 code가 새로운 Supabase user를 만듦
- `dogs` 테이블이 비어있는 상태로 onboarding 반복 진입

**근본 원인**: Mock 클라이언트가 매번 다른 userKey를 반환하므로
Toss 로그인 → Supabase Auth 연동 시 매번 새로운 사용자로 인식

### 해결 방식

#### 1.1 Mock mTLS Client 수정

**File**: `supabase/functions/_shared/mTLSClient.ts`  
**Line**: 350-358

```typescript
// 수정 전 (문제 있는 코드)
class MockMTLSClient {
  async fetchLoginProfile(authorizationCode: string) {
    // ❌ 문제: authorizationCode를 userKey로 사용 → 매번 다른 값
    return {
      userKey: authorizationCode,  // 이게 문제!
      userName: 'Mock User',
      profileImageUrl: 'https://...',
    };
  }
}

// 수정 후 (안정적인 코드)
class MockMTLSClient {
  async fetchLoginProfile(authorizationCode: string) {
    console.log('[Mock Auth] Stable userKey 반환');
    
    // ✅ 해결: 고정값 반환 (authCode 무시)
    return {
      userKey: 'mock_stable_user_001',  // 고정값!
      userName: 'Mock User',
      profileImageUrl: 'https://example.com/mock-profile.png',
      email: 'mockuser@example.com',
    };
  }

  // 추가: 현재 mock 상태 확인
  isMockMode(): boolean {
    return true;
  }
}
```

#### 1.2 설정 확인

**File**: `supabase/functions/login-with-toss/main.ts`

```typescript
// mTLS 클라이언트 선택
const mtlsClient = new MockMTLSClient();  // mock 개발 환경

// 로그인 플로우
async function handleTossLogin(authorizationCode: string) {
  const profile = await mtlsClient.fetchLoginProfile(authorizationCode);
  
  console.log('[Login] userKey:', profile.userKey);  // "mock_stable_user_001" 확인
  
  // Supabase 사용자 생성/업데이트
  const { data, error } = await supabase.auth.signUpWithPassword({
    email: profile.email,
    password: 'mock_password',  // mock 환경에서만 사용
  });
  
  return data.user;
}
```

### 배포 및 즉시 적용
```bash
# Edge Function 재배포
supabase functions deploy login-with-toss

# 또는 로컬에서 즉시 확인
supabase start

# 로그 확인
supabase functions logs login-with-toss
```

### 검증 체크리스트
- [ ] `supabase/functions/_shared/mTLSClient.ts` 수정
- [ ] `userKey = 'mock_stable_user_001'` 고정값 반환 확인
- [ ] Edge Function 재배포
- [ ] 앱 완전 재시작 후 로그인
- [ ] Supabase 대시보드에서 user 2개 이상 생성되지 않음 확인

---

## 패턴 2: Survey 루프 근본 원인 진단법

### 진단 플로우

survey 루프가 반복되는 원인은 **3가지**로 좁혀집니다:

```
Survey 루프 발생
  ↓
1. User ID 변경 감지?  → Mock userKey 불안정 (패턴 1 해결)
  ↓
2. Dogs 테이블 비어있음?  → Onboarding 미완료 (아래 진단)
  ↓
3. AuthContext 상태 오류?  → 프론트엔드 로직 버그 (아래 진단)
```

#### 2.1 Supabase에서 직접 확인

**목표**: 현재 로그인한 사용자의 dogs 데이터 확인

```bash
# 1. Supabase 대시보드 → SQL Editor 열기
# 또는 CLI에서:
supabase postgres connect

# 2. Service Role로 dogs 조회
select * from dogs where user_id = 'mock_stable_user_001';

# 3. 결과 해석:
# ✅ 빈 결과 없음 → dogs 테이블에 데이터 있음 (프론트엔드 버그)
# ❌ 빈 결과 → onboarding 미완료 (백엔드 진단 필요)
# ❌ 조회 실패 → RLS 정책 오류
```

#### 2.2 AuthContext에서 onboarding 완료 판별

**File**: `src/features/auth/AuthContext.tsx`  
**Function**: `getHasCompletedOnboarding`  
**Line**: ~52

```typescript
// 현재 구현 (확인 필요)
export async function getHasCompletedOnboarding(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('dogs')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    console.error('[Auth] Dogs query error:', error);
    return false;  // 안전한 기본값
  }

  // data가 비어있으면 onboarding 미완료
  const hasCompletedOnboarding = (data?.length ?? 0) > 0;
  
  console.log('[Auth] hasCompletedOnboarding:', hasCompletedOnboarding);
  console.log('[Auth] userId:', userId);
  console.log('[Auth] dogs count:', data?.length);
  
  return hasCompletedOnboarding;
}

// 추가 진단: 호출 시점과 user_id 확인
useEffect(() => {
  const checkOnboarding = async () => {
    const session = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    console.log('[Auth] Session userId:', userId);
    console.log('[Auth] Checking onboarding...');
    
    if (userId) {
      const completed = await getHasCompletedOnboarding(userId);
      console.log('[Auth] Onboarding completed:', completed);
    }
  };
  
  checkOnboarding();
}, []);
```

#### 2.3 진단 의사 결정 트리

| 증상 | 확인 사항 | 원인 | 해결책 |
|------|---------|------|--------|
| 매번 새 user 생성 | Supabase Users 테이블에 user 2개+ | Mock userKey 불안정 | 패턴 1: userKey 고정값 |
| survey만 반복 | Supabase dogs 테이블 비어있음 | Onboarding 미저장 | 백엔드 onboarding router 검증 |
| survey → dashboard 진입 후 다시 survey | dogs 테이블에 데이터 있음 | AuthContext 상태 오류 | 프론트엔드 useEffect 의존성 검증 |
| 모든 화면이 로딩 상태 | FastAPI 또는 Edge Function 응답 없음 | 서버 다운 | `/api/health` 엔드포인트 확인 |

### 검증 체크리스트
- [ ] Supabase 대시보드에서 users 테이블 조회 (1명인지 확인)
- [ ] Supabase 대시보드에서 dogs 테이블 조회 (데이터 있는지 확인)
- [ ] AuthContext 로그 확인 (userId, hasCompletedOnboarding 출력)
- [ ] FastAPI 로그 확인 (`/private/tmp/fastapi8765.log`)
- [ ] Edge Function 로그 확인 (`supabase functions logs`)

---

## 패턴 3: adb 기반 진단 순서

### adb 준비
```bash
# adb 설치 확인
adb version

# 디바이스 연결 확인
adb devices

# 예상 출력:
# List of attached devices
# emulator-5554          device
```

### 진단 Step 1: JS 레벨 에러 확인

```bash
# React Native 로그 확인
adb logcat -d | grep -i "ReactNativeJS\|error\|exception"

# 더 자세한 로그 (실시간)
adb logcat -s ReactNativeJS

# 특정 문자열 필터링
adb logcat -d | grep "onboarding\|survey\|login"

# 로그 파일로 저장
adb logcat -d > device_logs.txt
```

**확인 사항**:
- "[Auth] onboarding completed: true/false" 메시지
- "[IAP] Verify failed" 에러
- "Network request error" 에러

### 진단 Step 2: FastAPI 로그 확인

```bash
# FastAPI 서버 로그 파일
tail -f /private/tmp/fastapi8765.log

# 구독 API 호출 확인
grep "verify\|subscription" /private/tmp/fastapi8765.log

# 에러만 필터링
grep "error\|Error\|ERROR" /private/tmp/fastapi8765.log

# 마지막 50줄
tail -n 50 /private/tmp/fastapi8765.log
```

**확인 사항**:
- POST `/api/v1/subscription/iap/verify` 호출 기록
- 응답 status code (200/4xx/5xx)
- DB 쿼리 에러 (RLS 정책 위반 등)

### 진단 Step 3: DB 직접 조회

```bash
# Supabase CLI로 PostgreSQL 접속
supabase postgres connect

# 현재 users 목록 (service role)
select id, email, created_at from auth.users;

# 현재 dogs 목록
select id, user_id, name, breed from public.dogs order by created_at desc;

# Specific user의 dogs 조회
select * from public.dogs where user_id = 'mock_stable_user_001';

# Onboarding 상태 확인 (survey_completed 컬럼이 있다면)
select user_id, survey_completed, updated_at from public.onboarding_state;
```

### 진단 Step 4: Edge Function 테스트

```bash
# 로컬 Supabase 서버에서 Edge Function 호출 테스트
curl -X POST http://localhost:54321/functions/v1/login-with-toss \
  -H "Authorization: Bearer <LOCAL_SUPABASE_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "authorizationCode": "test_code_123",
    "clientId": "mock_client"
  }'

# Verify IAP 함수 테스트
curl -X POST http://localhost:54321/functions/v1/verify-iap-order \
  -H "Authorization: Bearer <LOCAL_SUPABASE_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "receipt": "test_receipt",
    "userId": "mock_stable_user_001"
  }'
```

**확인 사항**:
- HTTP status code 200 또는 오류 코드
- 응답 JSON 구조
- 에러 메시지

### 진단 Step 5: 완전 네트워크 추적

```bash
# 모든 네트워크 요청 추적 (tcpdump)
# macOS에서 Android 에뮬레이터 트래픽 캡처:
tcpdump -n -i bridge0 | grep -E "53|443|8765"

# 또는 adb 네트워크 모니터링
adb shell dumpsys connectivity
```

---

## 종합 진단 체크리스트

### 로그인 직후
- [ ] `adb logcat`에서 `[Auth] Session userId: <id>` 확인
- [ ] Supabase 대시보드에서 users 테이블에 1명만 존재
- [ ] `supabase postgres connect` → `select * from dogs;` 1개 이상의 행 확인

### Onboarding 진입
- [ ] `adb logcat`에서 `[Auth] hasCompletedOnboarding: false` 확인 가능
- [ ] FastAPI 로그에서 `/api/v1/onboarding` 호출 기록
- [ ] Response status 200 OK

### Survey 완료 후
- [ ] `adb logcat`에서 `[Auth] hasCompletedOnboarding: true` 확인
- [ ] Supabase dogs 테이블에 데이터 1개 이상
- [ ] Dashboard 진입 가능 (survey 루프 없음)

### IAP 검증
- [ ] FastAPI 로그에서 `/api/v1/subscription/iap/verify` 호출
- [ ] 응답: `{"success": true}` 또는 오류 코드
- [ ] Supabase `subscriptions` 테이블 업데이트 확인

---

## Failure Modes

- **adb devices 빈 목록**: 에뮬레이터 실행되지 않음 → `emulator -avd <name>` 실행
- **logcat이 너무 많음**: 필터링 활용 → `adb logcat -s ReactNativeJS:V *:S`
- **FastAPI 로그 없음**: 서버 실행 확인 → `ps aux | grep uvicorn`
- **Supabase 접속 오류**: 프로젝트 URL/key 확인 → `supabase projects list`
- **Edge Function 호출 실패**: 로컬 서버 미실행 → `supabase start` 재실행
- **새 user가 계속 생성됨**: 패턴 1의 userKey 고정값 미적용 확인

---

## 운영 순서 (권장)

1. **Mock userKey 안정화** (패턴 1)
   - `mTLSClient.ts` 고정값 적용
   - Edge Function 재배포

2. **근본 원인 진단** (패턴 2)
   - Supabase DB 직접 조회
   - AuthContext 로그 확인
   - users/dogs 테이블 상태 파악

3. **adb 기반 트러블슈팅** (패턴 3)
   - JS 레벨 로그 수집
   - FastAPI/Edge Function 로그 확인
   - 네트워크 요청 추적

4. **개선 항목 기록**
   - `docs/PROJECT-STATUS.md` 업데이트
   - 반복되는 이슈면 자동화 추가 검토

---

## 문서 동기화

- 진단 결과: `docs/status/PROJECT-STATUS.md` → "진단 완료" 기록
- 해결된 이슈: `docs/status/MISSING-AND-UNIMPLEMENTED.md` → "완료" 표시
- 패턴 검증: `docs/ref/AIT-SDK-2X-MIGRATION.md` → mock 모드 섹션 갱신

