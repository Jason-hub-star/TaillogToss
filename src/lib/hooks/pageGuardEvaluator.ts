/**
 * pageGuardEvaluator — 페이지 가드 평가 파이프라인 (auth → onboarding → feature/role)
 * Parity: B2B-001
 */
import { authGuard, onboardingGuard, featureGuard } from 'lib/guards';
import type { FeatureRequirement, GuardResult, GuardRoute } from 'lib/guards';
import type { UserRole } from 'types/auth';
import { isDevGuardBypassed } from 'lib/devGuardBypass';

export interface EvaluatePageGuardInput {
  currentPath: string;
  skipAuth: boolean;
  skipOnboarding: boolean;
  requireFeature?: FeatureRequirement;
  requireRole?: UserRole[];
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isPro: boolean;
  dogCount: number;
  isSubscriptionLoading: boolean;
  isDogsLoading: boolean;
  userRole?: UserRole;
}

export type GuardEvaluation =
  | { status: 'allow' }
  | { status: 'pending' }
  | { status: 'redirect'; redirectTo: GuardRoute };

export function evaluatePageGuard(input: EvaluatePageGuardInput): GuardEvaluation {
  // __DEV__ 전용: DevMenu 우회 토글이 활성화된 경우 모든 가드를 건너뜀
  if (isDevGuardBypassed()) return { status: 'allow' };

  const {
    currentPath,
    skipAuth,
    skipOnboarding,
    requireFeature,
    requireRole,
    isAuthenticated,
    hasCompletedOnboarding,
    isPro,
    dogCount,
    isSubscriptionLoading,
    isDogsLoading,
    userRole,
  } = input;

  let result: GuardResult = { allow: true };
  const effectiveHasCompletedOnboarding = hasCompletedOnboarding || dogCount > 0;
  const isB2BRoute =
    requireFeature === 'b2bOnly' ||
    Boolean(requireRole?.length) ||
    currentPath.startsWith('/ops/') ||
    currentPath.startsWith('/parent/');

  if (!skipAuth) {
    result = authGuard({ isAuthenticated, currentPath });
  }

  if (result.allow && !skipOnboarding && !isB2BRoute) {
    // 설문 직후 대시보드 이동 시점에는 AuthContext 상태 반영보다 dog 목록 조회가 늦을 수 있다.
    // 이 구간에서 즉시 온보딩 리다이렉트하면 /onboarding/* 루프가 발생하므로 pending으로 대기한다.
    if (isAuthenticated && !effectiveHasCompletedOnboarding && isDogsLoading) {
      return { status: 'pending' };
    }
    result = onboardingGuard({
      hasCompletedOnboarding: effectiveHasCompletedOnboarding,
      currentPath,
    });
  }

  // Role guard (B2B): requireRole이 명시되면 역할 검사
  if (result.allow && requireRole && requireRole.length > 0) {
    if (!userRole || !requireRole.includes(userRole)) {
      return { status: 'redirect', redirectTo: '/dashboard' };
    }
  }

  if (result.allow && requireFeature) {
    const needsSubscription = requireFeature === 'proOnly' || requireFeature === 'multiDog';
    const needsDogList = requireFeature === 'multiDog';

    if ((needsSubscription && isSubscriptionLoading) || (needsDogList && isDogsLoading)) {
      return { status: 'pending' };
    }

    result = featureGuard({
      requirement: requireFeature,
      isPro,
      dogCount,
      userRole,
    });
  }

  if (!result.allow) {
    return { status: 'redirect', redirectTo: result.redirectTo };
  }

  return { status: 'allow' };
}
