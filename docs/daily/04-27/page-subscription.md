# 2026-04-27 / settings/subscription + Free-Pro UX

## 작업 범위
- Parity: IAP-001, UI-001
- Board Status: Done

## 체크리스트

### subscription.tsx 리팩토링
- [x] DetailLayout 전환 (SafeAreaView+ScrollView+커스텀 navbar 제거)
- [x] `screenOptions: { headerShown: false }` 추가 → 백버튼 중복 해소
- [x] `onSuccess(granted)` 체크 — GRANT_FAILED 오경보 버그 수정
- [x] PRO_FEATURES: 다견 기능, 훈련 계획 무제한(A/B/C) 문구 정비
- [x] FREE_FEATURES: 커리큘럼/코칭 블록 행 제거, 멀티독→다견 기능
- [x] 토큰 카드 패러렐 정렬 (badgePlaceholder height:20)
- [x] 구매 성공 시 navigation.goBack() 연결

### ProUpgradeSheet 리팩토링
- [x] IAP 구매 인라인 처리 (subscription 페이지 이동 제거)
- [x] `onSuccess(granted)` 체크 추가
- [x] 혜택 목록에 "훈련 Plan B/C 전체 접근" 추가

### useProUpgradeSheet 훅 신규
- [x] `useProUpgradeSheet()` 훅 — `{ show, hide, SheetNode }` 패턴
- [x] `SheetNode` useMemo 래핑 (불필요한 언마운트 방지)

### VariantSelector
- [x] Plan B/C `proOnly: true` 설정
- [x] `onProCTA?: () => void` prop 추가
- [x] locked 버튼 탭 시 `onProCTA?.()` 호출 (`disabled` prop 제거)

### dashboard CoachingPreviewCard
- [x] `dailyUsed / dailyLimit` props 추가
- [x] 사용량 배지 UI (0/3회, 소진 시 grey)
- [x] dashboard/index.tsx에서 `useDailyUsage` 연결

### devPlanOverride (DevMenu)
- [x] `src/lib/devPlanOverride.ts` 신규 (DEV 전용 플랜 오버라이드)
- [x] `DevMenu` 플랜 전환 토글 (📱→🆓→💎 순환)
- [x] `useIsPro()` 오버라이드 체크 통합

### Backend
- [x] `AI_LLM_TIMEOUT_SEC` 30→120 (fine-tuning 배치 복구)
- [x] `Backend/app/features/training/deps.py` 신규 — Pro 커리큘럼 게이트
- [x] `training/router.py` update_training_status에 Pro 검증 추가

## 미완 / 후속
- [ ] verify-iap-order edge function 401 — 로컬 개발 환경 Supabase JWT 불일치 (프로덕션 배포 시 해소 예정)
- [ ] 결제 E2E 3시나리오 증적 (IAP-001 마지막 체크박스)
- [ ] npm run dev 재시작 후 headerShown:false 적용 확인
