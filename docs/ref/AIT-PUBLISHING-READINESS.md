# 앱인토스 퍼블리싱 레디니스 레퍼런스

> 조사일: 2026-04-21 (2차 갱신) | 출처: 앱인토스 공식 문서 직접 크롤링

## 1. mTLS 인증서

### 1-1. 발급 절차

```
앱인토스 콘솔 → 앱 선택 → mTLS 인증서 탭 → [+ 발급받기]
```

- 다운로드: `client.crt` + `client.key`
- 유효기간: **390일**
- 다중 인증서 동시 등록 지원 (무중단 교체)

### 1-2. 적용 대상 (전체 S2S API)

| API | mTLS 필수 |
|-----|----------|
| Toss Login | Y |
| Toss Pay | Y |
| IAP 주문 검증 | Y |
| Smart Message | Y |
| 토스 포인트 | Y |

### 1-3. 서버 코드 통합

```javascript
// Node.js 예시
const agent = new https.Agent({
  cert: fs.readFileSync('client.crt'),
  key: fs.readFileSync('client.key'),
});
fetch('https://apps-in-toss-api.toss.im/...', { agent });

// Deno (Supabase Edge) 예시
const httpClient = Deno.createHttpClient({
  cert: atob(Deno.env.get('TOSS_CLIENT_CERT_BASE64')),
  key: atob(Deno.env.get('TOSS_CLIENT_KEY_BASE64')),
});
```

### 1-4. 흔한 오류 및 보안 관리

- `.crt` 파일 PEM 포맷 불일치 → 파일 포맷 확인
- `ERR_NETWORK` → mTLS 설정 자체 누락
- 만료 후 무교체 → 서비스 전면 중단
- **인증서·키 유출 시**: 즉시 해당 인증서 폐기 + 재발급 필수 (콘솔에서 처리)

## 2. 콘솔 앱 등록

### 2-1. 필수 정보

| 항목 | 스펙 |
|------|------|
| 앱 로고 | 600x600px PNG, 불투명 배경, 각진 정사각형 (둥근 모서리 불가) |
| 앱 이름 | 최대 15자, 한글 명사형 권장 (예: '토스' O, 'Toss' X) |
| 앱 영문명 | 콘솔 등록 시 영문명도 함께 입력 필요 |
| appName 식별자 | 등록 후 변경 불가 (`intoss://` 형식) |
| 썸네일 이미지 | 정방형 1000x1000px 또는 가로형 1932x828px PNG |
| 고객 지원 정보 | 이메일, 전화, 채팅 주소 |
| 스크린샷 | **세로형 최소 3장** 또는 가로형 최소 1장 |
| 앱 검색 키워드 | 콘솔에서 카테고리 선택 + 검색 키워드 등록 |
| 사용 연령 | **현재 만 19세 이상만** 지원 (플랫폼 정책) |
| 부제 | 콘솔 노출용 짧은 설명 |

> **로고 이중 적용 필수**: 콘솔 업로드 + `granite.config.ts`의 `brand.icon` 양쪽 모두 설정

### 2-2. 사업자 등록 (수익화 필수)

개인 사업자 (본인): 사업자등록증
개인 사업자 (대리인): + 개인 인감증명서 + 위임장 + 대리인 신분증
법인 (대표자): 사업자등록증 + 등기부등본 (3개월 이내)
법인 (대리인): + 법인 인감증명서 + 위임장 + 대리인 신분증
심사: **영업일 1-2일**

> **주의**: 사업자 등록증 업종과 미니앱 서비스 업종이 **반드시 일치**해야 함 (불일치 시 출시 제한)
> **주의**: 부가가치세 면세 사업자는 등록 불가
> 사업자 등록 없이도 사용 가능한 기능: 세그먼트, 푸시/알림, 게임 프로필, 리더보드, 공유 리워드

## 3. 4단계 심사 프로세스

총 소요: **영업일 최대 3일** (통상 2-3일)

### 3-1. 운영 심사

- 앱 이름/설명/스크린샷 정확성
- 사업자 정보 등록 완료
- 업종-서비스 유형 일치
- 고객 지원 채널 동작
- 개인정보처리방침 URL 유효
- **반려 사유**: 서류 미제출, 설명-기능 불일치, 고객 지원 미응답

### 3-2. 기능 심사

- SDK 2.x 필수 (1.x 업로드 차단)
- 번들 크기 **100MB 미만** (비압축 기준)
  - 권장: 리소스 파일 CDN 분리, Lazy Loading 적용
- mTLS 설정 후 API 정상 응답
- 크래시/ANR 없음
- 외부 결제/앱 다운로드 링크 금지
- **반려 사유**: SDK 1.x, 100MB 초과, mTLS 미설정, 외부 결제

### 3-3. 디자인 심사

- 로고 600x600px 각진 정사각형 (둥근 모서리 반려)
- 탭 바 2-5개, 토스 제공 플로팅 형식만 (자체 구현 반려)
- 색상 대비 기준 충족 (미충족 시 자동 보정)
- 토스 메인 UI 모방 금지
- TDS 컴포넌트 사용 필수
- **반려 사유**: 탭 바 자체 구현, 둥근 로고, 브랜드 노출 누락

### 3-4. 보안 심사

- 서버 개인정보 암호화 필수
- 개인정보처리방침 (수집 항목, 보유 기간, 위탁 업체)
- 최소 수집 원칙
- 계정 탈퇴 시 데이터 처리 명시
- **AI 서비스 필수 요건** (2026-04 강화):
  - AI 생성물임을 사용자에게 명시
  - 자해·자살·마약·혐오·범죄 방법 등 위험 키워드 필터링 구현
  - 위험 감지 시 안전 응답 프로토콜 운영
  - 모델/프롬프트 변경 시 **사전 검토 요청** (별도 심사 절차)
- **반려 사유**: 위탁 업체 미명시, 수집-처리 불일치, 암호화 미적용, AI 필터링 미구현

## 4. 실 환경 전환 시 주의사항

- **출시 즉시 전체 사용자 반영**: 충분한 사전 테스트 후 출시. 긴급 핫픽스·버전 업데이트는 출시 후 가능.
- **실 환경 CORS 도메인**: `https://<appName>.apps.tossmini.com`
- **QR 테스트 도메인**: `https://<appName>.private-apps.tossmini.com`
- **한 번에 하나의 버전만 제출 가능**: 심사 중 다른 버전 제출 불가
- **검토 요청 버튼 활성화 조건**: 테스트 **1회 이상** 완료 후에만 활성화
- **재확인 필수 항목**: 메모리/리소스 사용량, CORS 설정, 권한 처리, 로그인/세션, 실 결제·인증

## 4-1. IAP 필수 테스트 3종 시나리오 (샌드박스)

출시 전 아래 3가지 시나리오를 반드시 완료해야 함.

| # | 시나리오 | 검증 항목 |
|---|---------|---------|
| 1 | **구매 성공** | 성공 콜백, 이벤트 데이터, 지급 로직, UI 업데이트 |
| 2 | **서버 실패** | 결제 성공 + 파트너 서버 지급 실패 → 사용자 안내, `getPendingOrders()` 복원, `completeProductGrant()` 완료 |
| 3 | **에러 처리** | 네트워크 오류, 사용자 취소, 내부 오류, 지급 실패 |

> 환불 주체는 **앱 마켓플레이스** (토스가 아님). 테스트는 최소 금액으로 진행.
> **기기 변경 후 구매내역 보존 구현 필수**: 네이티브 스토리지 + 토스 로그인 연동으로 주문 상태 영구 유지.

## 5. Smart Message 주의사항

- 템플릿 검수: 발송 전 사전 승인 필수 (**영업일 2-3일** 소요)
- 워크스페이스당 최대 **10만 건/회**
- **동일 마케팅 목적 캠페인 중복 운영 금지** → 어뷰징으로 반려
- 광고성 메시지: 마케팅 수신 동의 사용자에게만 발송 가능
- 기능성 메시지: 구매 유도·혜택 안내 포함 불가, 서비스 필수 정보만

## 6. 금지 서비스 유형 (즉시 반려)

NFT/디지털 자산 거래, 도박, 대출/보험/증권, 투자 조언, 현금 전환, 불법 콘텐츠, 유사 앱 복수 출시

## 7. TaillogToss 퍼블리싱 체크리스트

> 3차 갱신: 2026-05-12 | 출시 전 코드/문서 정합성 스캔 반영

### 공통 준비

- [x] 사업자등록 완료
- [x] 앱 배포 완료 (2026-02-27)
- [ ] 사업자 업종 ↔ 미니앱 서비스 업종 일치 확인
- [x] SDK 2.x 적용 (`@apps-in-toss/framework 2.4.1`). 2026-05-14 npm latest는 `2.5.1`이나, 현재 QR 실패의 직접 원인으로 볼 증거는 없음. 업그레이드는 별도 회귀 브랜치에서 진행.
- [x] mTLS 인증서 발급 + 서버 통합 (IAP, Smart Message, 포인트 전체) — 2026-04-21
- [ ] mTLS 인증서 만료일 캘린더 등록 (만료일: 2027-04-25)
- [x] 번들 크기 100MB 미만 확인 — 15MB (2026-05-07 측정)

### 콘솔 등록 / 에셋

- [x] 앱 로고 600x600 각진 정사각형 준비 (`src/assets/icons/app-logo-600.png`)
- [x] 앱 로고 `granite.config.ts` `brand.icon` 최종 적용 — 콘솔 이미지 HTTPS URL 적용 완료, bundle scan에서 `brandIcon:"https://static.toss.im/..."` 확인(2026-05-07)
- [x] 앱 로고 콘솔 업로드 + 승인 완료 — 2026-05-07
- [x] AIT private standalone 실행 확인 — production Toss app + Metro off + deploymentId `019e14a7-ca44-7f9b-bd58-a9be19376360`에서 온보딩 렌더 PASS(2026-05-11). 새 아이콘/새 AIT 업로드 후 회귀 확인 필요
- [x] 앱 이름 한글 명사형 확인 (15자 이하) + 영문명 등록 — 2026-04-23 콘솔 신청 완료
- [x] 앱 검색 키워드 + 카테고리 등록 — 2026-04-23 콘솔 신청 완료
- [x] 스크린샷 세로형 3장 (636×1048) + 가로형 1장 (1504×741) — 2026-04-23 콘솔 신청 완료

### 디자인 / 기능

- [⚠️] 탭 바 — SDK에 플로팅 탭바 컴포넌트 없음. `BottomNavBar.tsx` 자체 구현(3~4탭, 개수 기준은 통과). 디자인 심사 시 시각적 스타일 검토 필요.
- [x] 실 환경 CORS 도메인 확인 — FastAPI Railway 배포 완료 (`https://taillogtoss-backend-production.up.railway.app`). `EXPO_PUBLIC_BACKEND_URL` `.env` 등록 + `.ait` 재빌드 완료. Edge Functions CORS `*` 확인. — 2026-05-07

### 배포 전 필수 복구 항목 ⚠️

- [x] **`TOSS_MTLS_MODE=real` 복구 완료** — 2026-05-07. secrets set + login-with-toss 재배포 완료.

### IAP 테스트

- [⏸] IAP 정기 결제는 v1 배포 범위에서 보류. 2026-05-14 업데이트로 정기 결제(`createSubscriptionPurchaseOrder`, `getSubscriptionInfo`)가 공개됐지만 샌드박스 테스트 미지원 안내가 있어 출시 직전 전환하지 않음.
- [ ] IAP 샌드박스 테스트 3종 완료 (구매 성공 / 서버 실패 / 에러 처리)
- [ ] 기기 변경 후 구매내역 보존 구현 확인
- [x] `completeProductGrant()` 구현 확인 — `src/lib/api/iap.ts` 서버 grant 성공 후 SDK 호출

### Smart Message

- [x] Smart Message `log_reminder` 템플릿 승인 + 실발송 확인
- [x] 세그먼트 `테일로그_앱방문365` 생성 확인
- [ ] 추가 Smart Message 캠페인 4종 등록

### 개인정보 / 보안

- [x] 개인정보처리방침 업데이트 완료 — `privacy.tsx` §6 Supabase/OpenAI 위탁 이미 명시
- [x] AI 코칭 결과 "AI 생성물" 명시 완료 — `CoachingDetailContent.tsx:134` 확인
- [x] AI 위험 키워드 필터링 구현 완료 — 2026-04-21 (`service.py _apply_safety_filter`)
- [x] AI 자해·자살 감지 → 안전 응답 프로토콜 구현 완료 — 2026-04-21

### 출시 전

- [ ] QR 테스트 최소 1회 완료 (검토 요청 버튼 활성화 조건)
- [ ] 심사 중 버전 1개만 제출 (중복 제출 불가 확인)

### 2026-05-14 QR / 버전 판정

- 실제 토스 앱: Android `v5.259.0` 확인. 공식 정기 결제 최소 버전(Android `v5.253.0`)보다 높으므로 토스 앱 구버전 문제 가능성은 낮음.
- 로컬 SDK: `@apps-in-toss/framework 2.4.1`, `@apps-in-toss/native-modules 2.4.1`; npm latest는 `2.5.1`.
- SDK는 최신은 아니지만 2.x 업로드/실행 조건은 충족한다.
- 최신 QR 실패는 `viva.republica.toss.test` sandbox host에서 JS marker 없이 발생했고, 같은 deploymentId는 production Toss direct launch에서 bundle load PASS했다.
- 따라서 현재 QR blocker의 1순위는 미니앱 코드/SDK 노후가 아니라 콘솔 QR/test host resolver, workspace member entitlement, authenticated console test context 확인이다.

## Sources

- [서비스 오픈 프로세스](https://developers-apps-in-toss.toss.im/intro/onboarding-process.html)
- [API 사용하기](https://developers-apps-in-toss.toss.im/development/integration-process.html)
- [콘솔에서 앱 등록하기](https://developers-apps-in-toss.toss.im/prepare/console-workspace.html)
- [사업자 등록하기](https://developers-apps-in-toss.toss.im/prepare/register-business.html)
- [서비스별 주의사항](https://developers-apps-in-toss.toss.im/intro/caution.html)
- [미니앱 브랜딩 가이드](https://developers-apps-in-toss.toss.im/design/miniapp-branding-guide.html)
- [배포하기](https://developers-apps-in-toss.toss.im/development/deploy.html)
