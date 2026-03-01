import { evaluatePageGuard } from '../pageGuardEvaluator';

describe('evaluatePageGuard', () => {
  test('auth guard runs before onboarding guard', () => {
    const result = evaluatePageGuard({
      currentPath: '/dashboard',
      skipAuth: false,
      skipOnboarding: false,
      requireFeature: undefined,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      isPro: false,
      dogCount: 0,
      isSubscriptionLoading: false,
      isDogsLoading: false,
    });

    expect(result).toEqual({ status: 'redirect', redirectTo: '/login' });
  });

  test('onboarding guard redirects authenticated but incomplete users', () => {
    const result = evaluatePageGuard({
      currentPath: '/dashboard',
      skipAuth: false,
      skipOnboarding: false,
      requireFeature: undefined,
      isAuthenticated: true,
      hasCompletedOnboarding: false,
      isPro: false,
      dogCount: 0,
      isSubscriptionLoading: false,
      isDogsLoading: false,
    });

    expect(result).toEqual({ status: 'redirect', redirectTo: '/onboarding/welcome' });
  });

  test('onboarding guard waits while dog list is loading for authenticated users', () => {
    const result = evaluatePageGuard({
      currentPath: '/dashboard',
      skipAuth: false,
      skipOnboarding: false,
      requireFeature: undefined,
      isAuthenticated: true,
      hasCompletedOnboarding: false,
      isPro: false,
      dogCount: 0,
      isSubscriptionLoading: false,
      isDogsLoading: true,
    });

    expect(result).toEqual({ status: 'pending' });
  });

  test('dog presence marks onboarding as complete even when auth state is stale', () => {
    const result = evaluatePageGuard({
      currentPath: '/dashboard',
      skipAuth: false,
      skipOnboarding: false,
      requireFeature: undefined,
      isAuthenticated: true,
      hasCompletedOnboarding: false,
      isPro: false,
      dogCount: 1,
      isSubscriptionLoading: false,
      isDogsLoading: false,
    });

    expect(result).toEqual({ status: 'allow' });
  });

  test('onboarding pages are allowed when skipOnboarding is true', () => {
    const result = evaluatePageGuard({
      currentPath: '/onboarding/survey',
      skipAuth: false,
      skipOnboarding: true,
      requireFeature: undefined,
      isAuthenticated: true,
      hasCompletedOnboarding: false,
      isPro: false,
      dogCount: 0,
      isSubscriptionLoading: false,
      isDogsLoading: false,
    });

    expect(result).toEqual({ status: 'allow' });
  });

  test('multiDog feature waits while dog/subscription data is loading', () => {
    const result = evaluatePageGuard({
      currentPath: '/dog/add',
      skipAuth: false,
      skipOnboarding: false,
      requireFeature: 'multiDog',
      isAuthenticated: true,
      hasCompletedOnboarding: true,
      isPro: false,
      dogCount: 1,
      isSubscriptionLoading: false,
      isDogsLoading: true,
    });

    expect(result).toEqual({ status: 'pending' });
  });

  test('multiDog feature redirects free users over limit', () => {
    const result = evaluatePageGuard({
      currentPath: '/dog/add',
      skipAuth: false,
      skipOnboarding: false,
      requireFeature: 'multiDog',
      isAuthenticated: true,
      hasCompletedOnboarding: true,
      isPro: false,
      dogCount: 1,
      isSubscriptionLoading: false,
      isDogsLoading: false,
    });

    expect(result).toEqual({ status: 'redirect', redirectTo: '/settings/subscription' });
  });
});
