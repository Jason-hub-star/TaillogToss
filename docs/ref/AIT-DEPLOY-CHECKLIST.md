# TaillogToss 앱인토스 배포 전 체크리스트

> 생성: 2026-04-30 | 기준: Opus 전수 스캔 결과
> 심사 소요: 운영/기능/디자인/보안 4단계, 영업일 최대 3일
> 전략: **B2C 우선 출시 → 2주 후 B2B 추가 배포**

---

## 🔴 BLOCKER — 심사 통과 필수

### B1. IAP createOneTimePurchaseOrder 실 SDK 교체
- [ ] `src/lib/api/iap.ts:160-189` — orderId mock(`order_${Date.now().toString(36)}`) 제거
- [ ] 실 Toss SDK `@apps-in-toss/framework` IAP 호출로 교체
- [ ] `completeProductGrant` 정상 동작 확인 (`iap.ts:183` 이미 호출 있음)

### B2. IAP 샌드박스 3종 시나리오 테스트 (실기기)
- [ ] 시나리오 1: PRO ₩4,895 구매 성공 → `subscriptions.is_active=true` DB 확인
- [ ] 시나리오 2: 서버 실패 → `getPendingOrders()` 복구 흐름 확인
- [ ] 시나리오 3: 사용자 취소/에러 → 구독 상태 미변경 확인

### B3. 광고 슬롯 5개 페이지 연결 (컴포넌트는 이미 완성됨)
- [ ] R2: `src/pages/dashboard/analysis.tsx` → `<RewardedAdButton placement="R2" />`
- [ ] B1: `src/pages/dashboard/index.tsx` → `<BannerAd placement="B1" />`
- [ ] B2: `src/pages/dashboard/quick-log.tsx` → `<BannerAd placement="B2" />`
- [ ] B3: `src/pages/training/detail.tsx` → `<BannerAd placement="B3" />`
- [ ] I1: `src/pages/training/academy.tsx` → `<InterstitialAd placement="I1" />`
- [ ] 모두 `{!isPro && <컴포넌트 />}` 무료 사용자 조건 적용

### B4. 실 Ad Group ID 환경변수 등록
- [ ] Toss Ads 관리자에서 7개 슬롯 실 ID 발급 신청 (신청 후 48시간 활성화)
- [ ] 환경변수 등록: `AIT_AD_R1 / R2 / R3 / B1 / B2 / B3 / I1`
- [ ] `isMockMode()` 자동 감지 확인 (test ID 아니면 실 광고 자동 전환)

### B5. QR 테스트 최소 1회 완료
- [ ] 실기기에서 앱 테스트 QR 생성 → 스캔 → 동작 확인
- [ ] 앱인토스 콘솔 → "검토 요청" 버튼 활성화 확인

---

## 🟡 SHOULD — 배포 전 권장

### S1. mTLS 콜백 검증 최종 통과
- [ ] Toss 콘솔 테스트 버튼 → 콜백 200 응답 확인
- [ ] `supabase/functions/_shared/mTLSClient.ts` RealMTLSClient 모드 확인

### S2. mTLS 인증서 만료일 관리
- [ ] 만료일: **2027-04-25** 캘린더 등록
- [ ] 갱신 신청 기준: 만료 1개월 전 (2027-03-25)

### S3. 사업자 업종 ↔ 서비스 업종 일치 확인
- [ ] Toss 콘솔 사업자 정보 → 업종 확인
- [ ] 미니앱 서비스 업종과 일치 여부 (불일치 시 심사 반려)

---

## 🟢 NICE-TO-HAVE — 배포 후 가능

### N1. Smart Message 추가 캠페인 4종 콘솔 등록
- [ ] `coaching_ready` — 코칭 완성 알림 (TAILLOG_COACHING_READY)
- [ ] `training_reminder` — 훈련 리마인더 (TAILLOG_TRAINING_REMIND)
- [ ] `streak_alert` — 연속 기록 알림 (TAILLOG_STREAK_ALERT)
- [ ] `surge_alert` — 행동 변화 감지 (TAILLOG_SURGE_ALERT)

### N2. promo 광고성 캠페인 등록
- [ ] 세그먼트 `테일로그_앱방문365` 이미 생성됨
- [ ] 캠페인 등록 후 `TAILLOG_PROMO` 템플릿 코드 연결

### N3. B2B — verify_parent_phone_last4 Backend 엔드포인트 구현
- [ ] Supabase SQL RPC는 구현됨 (`supabase/migrations/20260420010000_*.sql`)
- [ ] Backend Python 엔드포인트 미구현 → 추가 필요

### N4. B2B — 40마리 FlatList 성능 실측
- [ ] `src/pages/ops/today.tsx` 또는 `ops/settings.tsx` 다수 강아지 목록 성능 확인

### N5. B2B — 공유 링크 실기기 검증
- [ ] report share 링크 생성 → 보호자 앱에서 열기 확인

---

## 심사 4단계별 준비 현황

### 운영 심사
- [x] 앱 이름/설명/스크린샷 정확성 (2026-04-23 콘솔 신청 완료)
- [x] 사업자 정보 등록 완료
- [x] 개인정보처리방침 위탁업체 명시 (`src/pages/legal/privacy.tsx:83` — Supabase + OpenAI)
- [x] AI 생성물 disclaimer 표시 (`coaching/result.tsx`)
- [ ] 고객 지원 채널 응답 준비

### 기능 심사
- [x] SDK 2.x 적용 (`@apps-in-toss/framework ^2.4.1`)
- [x] 번들 크기 100MB 미만 (현재 4.9MB ✅)
- [x] mTLS 설정 완료 (IAP/SmartMessage/포인트 전체)
- [x] `tsc --noEmit` 0 errors
- [ ] IAP 실 SDK 연결 (B1)
- [ ] IAP 샌드박스 3종 (B2)
- [ ] 외부 결제/앱 다운로드 링크 없음 확인

### 디자인 심사
- [x] 앱 로고 600×600 각진 정사각형 (`src/assets/icons/app-logo-600.png`)
- [x] `granite.config.ts` `brand.icon` 적용 완료
- [x] TDS 컴포넌트 사용 (TDS-ext 6 + shared 8 + features 38 = 52개)
- [x] 하단 BottomNavBar TDS 플로팅 준수
- [x] 스크린샷 세로형 3장 + 가로형 1장 (2026-04-23 제출)
- ⚠️ DayTabBar: 훈련 상세 날짜 탭 자체 구현 — **심사 대상 아님** (하단 탭 아님)

### 보안 심사
- [x] PII 암호화 (`src/lib/security/piiEncrypt.ts` AES-GCM)
- [x] AI 위험 키워드 필터링 (`Backend/app/features/coaching/service.py:465-505`)
- [x] AI 자해/자살 감지 → 안전 응답 프로토콜
- [x] 계정 탈퇴 시 데이터 삭제 (`withdraw-user` Edge Function)
- [x] 개인정보처리방침 수집 항목/보유 기간/위탁 업체 명시
- [ ] mTLS 콜백 최종 검증 통과 (S1)

---

## B2C vs B2B 출시 전략

| 구분 | B2C | B2B |
|---|---|---|
| 구현 완성도 | 95% | 70% |
| BLOCKER 수 | 5개 | 5개 + 추가 6개 |
| 초기 출시 | ✅ 포함 | ❌ 제외 (2주 후) |
| 기대 사용자 | 개인 견주 (90%) | 훈련사/센터 (10%) |

---

## 완료 기준 (Definition of Done)

배포 제출 가능 조건:
1. BLOCKER B1~B5 전체 체크 완료
2. `tsc --noEmit` 0 errors
3. IAP 샌드박스 3종 실기기 통과 증적 남기기
4. 앱인토스 콘솔 "검토 요청" 버튼 활성화 확인

---

## 관련 문서

| 문서 | 내용 |
|---|---|
| `docs/ref/AIT-PUBLISHING-READINESS.md` | 심사 요건 상세 + mTLS 가이드 |
| `docs/ref/AIT-IAP-CONSOLE-GUIDE.md` | IAP 상품 콘솔 등록 가이드 |
| `docs/ref/AIT-ADS-CONSOLE-GUIDE.md` | 광고 슬롯 콘솔 등록 가이드 |
| `docs/ref/AIT-SMART-MESSAGE-CONSOLE-GUIDE.md` | Smart Message 캠페인 가이드 |
| `docs/status/11-FEATURE-PARITY-MATRIX.md` | Parity ID별 구현 상태 |
