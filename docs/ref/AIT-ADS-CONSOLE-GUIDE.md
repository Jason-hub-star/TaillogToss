# 인앱 광고 콘솔 설정 가이드 (TaillogToss)

> 최종 갱신: 2026-04-29 | 대상: 앱인토스 광고 콘솔 → 코드 연결까지 전 과정

---

## 1. 사전 조건

| 항목 | 기준 |
|---|---|
| 사업자 정보 등록 | 콘솔 워크스페이스 Info → 완료 필수 |
| 정산 정보 입력 | 사업자 등록 후 심사 2-3 영업일 소요 |
| SDK 버전 | `@apps-in-toss/framework` v2.0.5+ |
| 토스앱 최소 버전 | 전면/보상: v5.247.0+ / 배너: v5.241.0+ |

---

## 2. 광고 그룹 등록 — R1 (설문 결과)

> 화면: 온보딩 설문 완료 직후 → "상세 리포트" 잠금 해제 전
> 파일: `src/pages/onboarding/survey-result.tsx:156`

### 콘솔 입력값

| 항목 | 값 |
|---|---|
| 광고 그룹 이름 | `보상형-설문결과` |
| 광고 형식 | **리워드** |
| 보상 단위 | `상세 리포트` |
| 보상 수량 | `1` |
| 카테고리 | 생활 |
| 하위 카테고리 | 반려동물 (없으면 일상) |
| 광고 실적 | 하이브리드 미디에이션 최적화 (기본값) |

### 등록 후 처리

```
발급된 adGroupId  →  환경변수 AIT_AD_R1 에 저장
```

---

## 3. 광고 그룹 등록 — R2 (대시보드 분석)

> 화면: 대시보드 분석 탭 → 차트 하단, "AI 코칭 받기" CTA 직전
> 파일: `src/pages/dashboard/analysis.tsx` (미연결 — 코드 추가 필요)

### 콘솔 입력값

| 항목 | 값 |
|---|---|
| 광고 그룹 이름 | `보상형-분석대시보드` |
| 광고 형식 | **리워드** |
| 보상 단위 | `AI 코칭 열람권` |
| 보상 수량 | `1` |
| 카테고리 | 생활 |
| 하위 카테고리 | 반려동물 (없으면 일상) |
| 광고 실적 | 하이브리드 미디에이션 최적화 (기본값) |

### 등록 후 처리

```
발급된 adGroupId  →  환경변수 AIT_AD_R2 에 저장
```

> **주의**: R2는 `src/lib/ads/config.ts:14` 에 환경변수 슬롯은 정의돼 있으나
> `analysis.tsx` 에 `useRewardedAd('R2', ...)` 호출이 아직 없음 → 코드 연결 필요

---

## 4. 광고 그룹 등록 — R3 (코칭 결과)

> 화면: AI 코칭 결과 상세 → 6블록 콘텐츠 상단 (무료 유저만)
> 파일: `src/pages/coaching/CoachingDetailContent.tsx:98`

### 콘솔 입력값

| 항목 | 값 |
|---|---|
| 광고 그룹 이름 | `보상형-코칭결과` |
| 광고 형식 | **리워드** |
| 보상 단위 | `코칭 결과 열람권` |
| 보상 수량 | `1` |
| 카테고리 | 생활 |
| 하위 카테고리 | 반려동물 (없으면 일상) |
| 광고 실적 | 하이브리드 미디에이션 최적화 (기본값) |

### 등록 후 처리

```
발급된 adGroupId  →  환경변수 AIT_AD_R3 에 저장
```

---

## 5. 환경변수 설정

### Vercel 콘솔 (프로덕션)

```
AIT_AD_R1 = <콘솔 발급 R1 adGroupId>
AIT_AD_R2 = <콘솔 발급 R2 adGroupId>
AIT_AD_R3 = <콘솔 발급 R3 adGroupId>
```

### 로컬 `.env.local`

```
AIT_AD_R1=ait-ad-test-rewarded-id
AIT_AD_R2=ait-ad-test-rewarded-id
AIT_AD_R3=ait-ad-test-rewarded-id
```

> 환경변수 미설정 시 `config.ts:12-16` 에서 자동으로 테스트 ID로 fallback.
> 실 ID 없이도 개발 빌드는 정상 동작.

---

## 6. 광고 배치 맵

```
온보딩 설문 완료
    │
    ▼
[survey-result.tsx] ── R1 보상형 광고 ──▶ 상세 리포트 잠금 해제
    │
    ▼
대시보드 홈 (index.tsx)
    │
    ├─▶ 분석 탭 (analysis.tsx) ── R2 보상형 광고 ──▶ AI 코칭 받기 CTA 활성화  ← 미연결
    │
    └─▶ 코칭 탭 → 결과 상세 (CoachingDetailContent.tsx)
                            └── R3 보상형 광고 ──▶ 6블록 전체 열람
```

### 배치별 트리거 타이밍

| ID | 화면 | 트리거 | 보상 결과 |
|---|---|---|---|
| R1 | survey-result | 페이지 진입 즉시 (초기 로드) | 상세 리포트 섹션 언락 |
| R2 | dashboard/analysis | "AI 코칭 받기" 버튼 탭 직전 | 코칭 일일 한도 +1 또는 즉시 진입 |
| R3 | coaching-detail | 무료 유저 진입 시 자동 표시 | 코칭 6블록 전체 열람 |

### 폴백 정책 (`src/types/ads.ts:42`)

```typescript
DEFAULT_AD_FALLBACK = {
  unlock_on_no_fill: true,  // 광고 없어도 콘텐츠 해제
  timeout_ms: 5000,         // 5초 무응답 시 폴백
  daily_limit: 10,          // 배치당 하루 최대 10회
}
```

---

## 7. 향후 배너 광고 슬롯 (미구현)

| 위치 | 화면 | 규격 | 우선순위 |
|---|---|---|---|
| 대시보드 홈 하단 | `dashboard/index.tsx` | 96px List형 | P2 |
| 훈련 아카데미 상단 | `training/academy.tsx` | 96px List형 | P2 |
| 코칭 결과 하단 | `coaching/result.tsx` | 96px List형 | P3 |

배너 구현 시 `InlineAd` 컴포넌트 + `IOScrollView` 래핑 또는
`impressFallbackOnMount={true}` 반드시 적용 (미적용 시 impression 손실).

---

## 8. 콘솔 등록 후 코드 연결 체크리스트

- [ ] R1 adGroupId → `AIT_AD_R1` 환경변수 설정
- [ ] R2 adGroupId → `AIT_AD_R2` 환경변수 설정 + `analysis.tsx` 코드 연결
- [ ] R3 adGroupId → `AIT_AD_R3` 환경변수 설정
- [ ] 각 슬롯 테스트 ID → 실 ID 교체 후 load→show→reward 플로우 검증
- [ ] `isSupported()` 호출로 구버전 토스앱 차단 처리
- [ ] AdMob 등록 전파 대기 (최대 2시간)

---

## 9. 관련 파일

| 파일 | 역할 |
|---|---|
| `src/lib/ads/config.ts` | adGroupId 매핑, Mock SDK, 싱글턴 |
| `src/lib/hooks/useRewardedAd.ts` | 광고 라이프사이클 훅 (load→show→reward) |
| `src/types/ads.ts` | AdPlacement, RewardedAdState, DEFAULT_AD_FALLBACK |
| `src/lib/analytics/tracker.ts` | 광고 이벤트 5종 추적 (requested/loaded/rewarded/noFill/error) |
| `src/components/shared/ads/RewardedAdButton.tsx` | 광고 버튼 UI 컴포넌트 |
| `docs/ref/AIT-ADS-SDK-REFERENCE.md` | SDK API 상세 레퍼런스 |
