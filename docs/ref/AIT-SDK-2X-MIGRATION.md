# 앱인토스(Apps in Toss) SDK 1.x → 2.x 마이그레이션 레퍼런스

> 작성일: 2026-04-02
> 기준 버전: SDK 2.4.0 (당시 안정)
> 현재 프로젝트 버전: `@apps-in-toss/framework 2.4.1` / npm latest `2.5.1` (2026-05-14 확인)
> 출처: 앱인토스 개발자센터, 커뮤니티 공지, 릴리즈 노트

---

## 1. 마이그레이션 배경 및 필수성

| 항목 | 내용 |
|---|---|
| 변경 원인 | 토스앱의 React Native **0.84** 업데이트 (2026-03-30 배포) |
| 1.x 업로드 제한 | **2026-03-23 이후** SDK 1.x 빌드 번들 콘솔 업로드 불가 |
| 미완료 시 결과 | 신규 배포·업데이트 불가 → 별도 안내 후 서비스 운영 중단 |
| 권장 최소 버전 | **SDK 2.0.5** 이상. 현재 프로젝트는 2.x 필수 조건을 충족하지만 npm latest는 2.5.1 |

---

## 2. 필요 최소 토스앱 버전

| 플랫폼 | 최소 버전 | 비고 |
|---|---|---|
| Android | **5.232.0** 이상 | SDK 2.0.x 기준 |
| iOS | **5.232.0** 이상 | SDK 2.0.x 기준 |
| Android | **5.253.0** 이상 | SDK 2.2.0+ (구독 API 사용 시) |
| iOS | **5.253.0** 이상 | SDK 2.2.0+ (구독 API 사용 시) |

---

## 3. SDK 2.x 전체 버전 히스토리

| 버전 | 날짜 | 분류 | 핵심 변경사항 |
|---|---|---|---|
| **2.0.1** | 2026-03-05 | BREAKING | RN 0.84 + React 19 지원. SDK 1.x 지원 종료. 빌드 커맨드 변경 |
| **2.0.2** | 2026-03-10 | Hotfix | `appsInTossSignTossCert`, `checkoutPayment`, `completeProductGrant`, `grantPromotionRewardForGame` 오류 수정. 내비게이션 바 공유하기 오류 수정. `getTossShareLink` 단축 URL 형식 복원 |
| **2.0.3** | 2026-03-10 | UX Change | 종료 확인 모달 왼쪽 버튼: `"취소"` → `"닫기"` |
| **2.0.4** | 2026-03-10 | Bugfix | 일부 환경에서 SDK 로그 미수집 문제 수정 |
| **2.0.5** | 2026-03-11 | 안정화 | 2.0.4 추가 오류 모두 수정. iOS 샌드박스 8081 포트 오류 수정. **전 파트너사 업데이트 권장** |
| **2.0.8** | 2026-03-18 | Feature | 비게임 환경: 서버리스 프로모션 보상 배포 지원 |
| **2.0.9** | 2026-03-18 | Bugfix | 빌드·업로드 안정성 문제 수정 |
| **2.1.0** | 2026-03-24 | Feature | 폰트 크기 동작 안정화. 마이크 권한 설정 추가. 시스템 설정 폰트 스케일링 버그 수정 |
| **2.2.0** | 2026-03-30 | Feature | `getSubscriptionInfo()` API 추가 (구독 주문 상태 조회) |
| **2.3.0** | 2026-03-30 | Enhancement | `ait` CLI help 문서 개선. `deploy` 커맨드에 `-m` 옵션 추가 (릴리즈 노트) |
| **2.4.0** | 2026-04-01 | Feature | `requestReview()` API 추가 (최적 시점 앱 리뷰 요청) |
| **2.5.1** | 2026-05-14 확인 | Maintenance | npm latest. QR 실패 원인으로 특정할 증거는 없으며, 업그레이드는 별도 브랜치에서 AIT build/ADB/IAP 회귀 후 적용 |

---

## 4. Breaking Changes 상세

### 4-1. 패키지 버전 업데이트

```json
// package.json — BEFORE (SDK 1.x)
{
  "dependencies": {
    "@apps-in-toss/framework": "^1.3.0",
    "react": "18.2.0",
    "react-native": "0.72.6"
  }
}
```

```json
// package.json — AFTER (SDK 2.x)
{
  "dependencies": {
    "@apps-in-toss/framework": "^2.0.5",
    "@apps-in-toss/web-framework": "^2.0.5",  // WebView 앱인 경우
    "react": "19.0.0",                          // React 19 권장
    "react-native": "0.84.0"
  }
}
```

> **TDS 호환성 주의**: `@toss/tds-mobile` 및 `@toss/tds-mobile-ait`가 React 18만 지원하는 경우 React 19 업그레이드 시 샌드박스 렌더링 실패 발생 사례 있음. TDS 버전 확인 후 업그레이드 결정.

---

### 4-2. 빌드 커맨드 변경 (BREAKING)

```jsonc
// package.json scripts — BEFORE
{
  "scripts": {
    "dev": "granite dev",
    "build": "granite build"
  }
}
```

```jsonc
// package.json scripts — AFTER
{
  "scripts": {
    "dev": "granite dev",   // dev 서버는 여전히 granite dev 사용 (ait dev 없음)
    "build": "ait build"    // 빌드만 ait build로 변경
  }
}
```

> `ait` CLI의 사용 가능 커맨드: `build`, `deploy`, `init`, `migrate`, `sentry`, `token`
> `ait dev`는 존재하지 않음 → 개발 서버는 `granite dev` 유지

---

### 4-3. 자동화 마이그레이션 코드모드 (React Native 전용)

**React Native 앱**은 SDK 업데이트 후 아래 커맨드를 반드시 실행:

```bash
ait migrate react-native-0-84-0
```

- RN 0.84 / New Architecture 호환을 위한 코드 자동 변환
- 레거시 코드 제거 및 기술부채 해소
- **WebView 앱은 이 단계 불필요** — 패키지 업데이트 + 빌드 커맨드 변경만으로 완료

---

### 4-4. API 시그니처 변경

#### `checkoutPayment` (BREAKING)

```typescript
// BEFORE — SDK 1.x
TossPay.checkoutPayment({ payToken });

// AFTER — SDK 2.x
TossPay.checkoutPayment({ params: { payToken } });
```

> 파라미터를 `params` 객체로 래핑하는 구조로 변경됨.

---

#### `getTossShareLink` (시그니처 + 반환값 변경)

```typescript
// BEFORE — SDK 1.x (버전 1.14.1 기준)
getTossShareLink(url: string, ogImageUrl?: string): Promise<string>
// 반환 형식: https://minion.toss.im/xxxxx (단축 URL)

// AFTER — SDK 2.0.1 초기 (버그 있었음)
getTossShareLink(path: string): Promise<string>
// 반환 형식: https://toss.im/_m/xxxxx?deep_link_value=intoss%3A%2F%2F... (긴 URL)

// SDK 2.0.2 이후 (수정됨)
getTossShareLink(path: string): Promise<string>
// 반환 형식: 다시 단축 URL 형식으로 복원
```

**변경 사항 요약:**
- `ogImageUrl` 2번째 파라미터 **삭제됨** (OG 이미지 커스텀 불가)
- 함수명 파라미터: `url: string` → `path: string`
- SDK 2.0.1에서 반환 URL이 긴 형식으로 바뀌었다가 2.0.2에서 단축 URL로 복원

---

### 4-5. 외부 API 호출 정책 변경 (네트워크)

SDK 2.x에서 외부 도메인 API 호출 시 403 오류 발생 사례 보고됨.

- SDK 1.x: 외부 API 호출 허용
- SDK 2.x: 허용된 도메인 외 CloudFront 수준에서 차단 가능성
- **조치**: `granite.config.ts`에서 허용 도메인 등록 필요 (공식 문서 확인 요)

---

### 4-6. 종료 확인 모달 UX 변경

```
// BEFORE — SDK 2.0.2 이하
[취소]  [확인]

// AFTER — SDK 2.0.3 이후
[닫기]  [확인]
```

---

## 5. 마이그레이션 단계별 가이드

### Step 1: 패키지 업데이트

```bash
# React Native 앱
npm install @apps-in-toss/framework@^2.0.5

# WebView 앱
npm install @apps-in-toss/web-framework@^2.0.5
```

### Step 2: (React Native 전용) 코드모드 실행

```bash
ait migrate react-native-0-84-0
```

### Step 3: 빌드 스크립트 수정

`package.json`에서 `"build": "granite build"` → `"build": "ait build"` 변경.

### Step 4: API 호출 코드 수정

- `checkoutPayment` 호출부 검색 → `params` 래핑 추가
- `getTossShareLink` 호출부 검색 → 2번째 인자 제거

```bash
# 수정 필요 패턴 검색
grep -r "checkoutPayment" src/
grep -r "getTossShareLink" src/
grep -r "appsInTossSignTossCert" src/
```

### Step 5: TDS 버전 호환성 확인

```bash
npm list @toss/tds-react-native
# React 19 업그레이드 전 TDS React 18/19 지원 여부 확인
```

### Step 6: 샌드박스 앱에서 검증

- 샌드박스 앱 최신 버전 설치 (RN 0.84 환경)
- Android: adb 설정 확인
- iOS: IP 기반 연결 사용 (localhost:8081 대신)

### Step 7: 빌드 및 업로드

```bash
ait build
# 생성물: .ait 파일
# 콘솔에 업로드하여 검수 진행
```

---

## 6. 현재 프로젝트(TaillogToss) 적용 분석

| 항목 | 현재 상태 | 목표 상태 | 작업 필요 |
|---|---|---|---|
| `@apps-in-toss/framework` | `^1.3.0` | `^2.0.5` 이상 | YES |
| `react-native` | `0.72.6` | `0.84.0` | YES |
| `react` | `18.2.0` | `19.0.0` (TDS 호환 확인 후) | 조건부 |
| `@granite-js/react-native` | `0.1.34` | 업스트림 확인 필요 | TBD |
| `build` 스크립트 | `granite build` | `ait build` | YES |
| `dev` 스크립트 | `granite dev` | 그대로 유지 | NO |
| `checkoutPayment` | 사용 여부 확인 필요 | `params` 래핑 추가 | 확인 요 |
| `getTossShareLink` | 사용 여부 확인 필요 | 2번째 인자 제거 | 확인 요 |

---

## 7. 신규 추가 API (SDK 2.x)

| API | 추가 버전 | 설명 | 최소 토스앱 버전 |
|---|---|---|---|
| `getSubscriptionInfo()` | 2.2.0 | 구독 주문 상태 조회 | Android 5.253.0+ / iOS 5.253.0+ |
| `createSubscriptionPurchaseOrder()` | 2.x | 정기 결제 주문 생성 | Android 5.248.0+ / iOS 5.249.0+ |
| `requestReview()` | 2.4.0 | 최적 시점 앱 리뷰 요청 | - |
| `ait deploy -m` | 2.3.0 | CLI 배포 시 릴리즈 노트 첨부 옵션 | - |

## 7-1. 2026-05-14 버전/QR 판정

| 항목 | 확인값 | 판단 |
|---|---|---|
| 로컬 `@apps-in-toss/framework` | `2.4.1` | 최신은 아니지만 SDK 2.x 조건 충족 |
| npm latest | `2.5.1` | 배포 직전 즉시 교체보다는 별도 회귀 필요 |
| 로컬 `@granite-js/react-native` | `1.0.4` | 현행 AIT build/ADB 증적은 있음 |
| npm latest | `1.0.26` | SDK 업그레이드와 함께 별도 검증 권장 |
| 연결 기기 실제 토스 앱 | Android `v5.259.0` | 구독 API 최소 버전(Android 5.253.0+) 충족 |
| Metro 상태 | `localhost:8081` connection refused | 현재 테스트는 Metro 의존 상태 아님 |

QR 실패 원인을 "미니앱 SDK가 낡아서"로 보기 어려운 이유:
- 공식 테스트 문서상 QR 테스트/검토 활성화는 토스앱 로그인, 워크스페이스 멤버, 만 19세 이상, 테스트 1회 완료가 핵심 조건이다.
- 현재 SDK는 1.x가 아니라 2.4.1이므로 업로드 차단 대상이 아니다.
- 같은 deploymentId가 production Toss direct launch에서는 `Running "shared"` / bundle load PASS했고, QR 실패는 `viva.republica.toss.test`에서 JS marker 없이 host error로 발생했다.
- 최소 smoke AIT도 같은 sandbox host error를 냈으므로 앱 번들 복잡도나 최신 기능 미도입보다는 QR/test host, resolver, workspace entitlement, console test context 쪽 가능성이 높다.

조치:
- v1 배포 전에는 SDK 업그레이드보다 콘솔 QR을 authenticated Toss Business 세션에서 다시 실행하고, production Toss 앱으로 열리는지 확인한다.
- SDK `2.5.1` / Granite `1.0.26` 업그레이드는 배포 전 핫픽스가 아니라 별도 브랜치에서 `npm run typecheck`, `npm run test:app`, `ait build`, ADB launch, IAP 성공 회귀까지 통과한 뒤 적용한다.

---

## 8. 알려진 이슈 및 주의사항

| 이슈 | 영향 버전 | 해결 버전 |
|---|---|---|
| `checkoutPayment` 등 함수 미동작 | 2.0.1 | 2.0.2 |
| `getTossShareLink` 긴 URL 반환 | 2.0.1 | 2.0.2 |
| 내비게이션 바 공유하기 오류 | 2.0.1 | 2.0.2 |
| SDK 로그 미수집 | 2.0.4 일부 | 2.0.5 |
| iOS 샌드박스 8081 포트 접속 오류 | 2.0.1~2.0.4 | 2.0.5 |
| `yarn build` 후 `.ait` 파일 미생성 | 빌드 설정 오류 | `ait build` 직접 실행 |
| Windows `ait build` TS ParseError | 일부 Windows 환경 | 커뮤니티 내 별도 대응 확인 |
| WebView `@toss/tds-mobile` React 19 미지원 | 2.0.1 마이그레이션 시 | TDS 업데이트 대기 |

---

## 9. 자동화 도구 (Codemod)

| 도구 | 대상 | 실행 방법 |
|---|---|---|
| `ait migrate react-native-0-84-0` | React Native 앱 전용 | `ait migrate react-native-0-84-0` |
| 없음 | WebView 앱 | 수동 — 패키지 업데이트 + 빌드 커맨드만 변경 |

WebView 앱(TaillogToss의 경우 확인 필요)은 코드모드 없이 수동 마이그레이션.

---

## 10. 참고 링크

- [릴리즈 노트 공식 페이지](https://developers-apps-in-toss.toss.im/release-note.html)
- [SDK 2.0.1 마이그레이션 공지](https://techchat-apps-in-toss.toss.im/t/sdk-2-0-1-1-x/2772)
- [SDK 2.0.1 마이그레이션 FAQ](https://techchat-apps-in-toss.toss.im/t/sdk-2-0-1/2859)
- [SDK 2.0.5 안정화 안내](https://techchat-apps-in-toss.toss.im/t/sdk-2-0-5-unity-sdk/2957)
- [SDK 2.0.1/2.0.4 이슈 수정 안내](https://techchat-apps-in-toss.toss.im/t/sdk-2-0-1-2-0-4/2917)
- [3월 1주 앱인토스 업데이트 블로그](https://toss.im/apps-in-toss/blog/update-26-3-5)
- [React Native 튜토리얼](https://developers-apps-in-toss.toss.im/tutorials/react-native.html)
- [앱인토스 개발자센터 홈](https://developers-apps-in-toss.toss.im/)
