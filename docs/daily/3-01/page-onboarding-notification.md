# Onboarding Notification 안정화 (2026-03-01)

Parity: APP-001

## Completed

- [x] `toss_journey` 기준 동선 확인: `survey -> notification -> dashboard`가 의도 플로우임을 재확인
- [x] `page-onboarding-notification-upgrade` + `feature-form-validation-and-submit` + `feature-error-and-retry-state` 기준으로 범위 고정
- [x] 원인 확인: `public.user_settings`에 사용자 `INSERT/UPDATE` 정책 부재로 fallback upsert가 `42501` 실패
- [x] DB 정책 보강: `user_settings` 사용자 `INSERT/UPDATE/DELETE` RLS 정책 마이그레이션 적용
- [x] FE fallback 보강: `upsert(..., { onConflict: 'user_id' })` 적용
- [x] 회귀 수정: `허용하기` 후 `syncOnboardingStatus(getDogs 재조회)` 실패 시 survey로 되돌아가던 로직 제거
- [x] 온보딩 상태 고정: 설문 저장 성공 시 `setOnboardingComplete()` 즉시 반영, notification 완료 시 재조회 없이 dashboard 전환
- [x] 가드 레이스 수정: `pageGuardEvaluator`에서 `hasCompletedOnboarding || dogCount > 0`를 완료 기준으로 사용, `isDogsLoading` 동안 onboarding redirect 보류
- [x] `PAGE-UPGRADE-BOARD` `/onboarding/notification` 상태 `Ready -> QA` 동기화

## Validation

- Supabase 정책 조회:
  - `Users insert own settings`
  - `Users update own settings`
  - `Users delete own settings`
  - 기존 `Users read own settings` + `Service role full access` 유지 확인
- FE 코드 확인:
  - `허용하기` 클릭 후 설정 저장 실패여부와 무관하게 `completeOnboardingFlow()` 실행
  - `completeOnboardingFlow()`는 `setOnboardingComplete()` 후 최종 목적지를 `pending ?? /dashboard`로 이동
- `npm run typecheck`: pass
- `npx jest --config jest.config.js src/lib/hooks/__tests__/usePageGuard.test.ts --runInBand`: pass (7/7)

## Files Changed

- `src/lib/api/settings.ts`
- `src/pages/onboarding/survey.tsx`
- `src/pages/onboarding/notification.tsx`
- `src/lib/hooks/pageGuardEvaluator.ts`
- `src/lib/hooks/__tests__/usePageGuard.test.ts`
- `supabase/migrations/20260301133009_add_user_settings_rls_write_policies.sql`
- `docs/status/PAGE-UPGRADE-BOARD.md`
- `docs/daily/3-01/page-onboarding-notification.md` (new)

## Risks

- 백엔드(FastAPI)가 네트워크 이유로 불가한 상황에서는 fallback에 계속 의존하므로, 실기기에서 backend-first 경로 재검증이 필요함
- 현재 세션에서 실기기 E2E(설문 완료 -> 알림 허용 -> 대시보드 랜딩) 재현 증적은 미수집

## Self-Review

- good: 원인(`RLS 정책 누락`)을 DB 레벨에서 확정하고, 정책+클라이언트 충돌조건까지 함께 보강함
- weak: 실기기에서 실제 버튼 탭 후 랜딩까지 런타임 캡처를 남기지 못함
- verification-gap: backend-first 실패 원인(네트워크/서버 비가동)을 분리 검증하지 못함
