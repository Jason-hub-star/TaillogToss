/**
 * usePageGuard — 페이지 접근 가드 훅 (인증/온보딩/기능/역할)
 * Parity: B2B-001
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@granite-js/react-native';
import { useAuth } from 'stores/AuthContext';
import { useDogList } from 'lib/hooks/useDogs';
import { useCurrentSubscription } from 'lib/hooks/useSubscription';
import type { FeatureRequirement, GuardRoute } from 'lib/guards';
import type { UserRole } from 'types/auth';
import { evaluatePageGuard } from './pageGuardEvaluator';
import { setPostLoginRedirect } from 'stores/postLoginRedirect';

interface UsePageGuardOptions {
  currentPath: string;
  skipAuth?: boolean;
  skipOnboarding?: boolean;
  requireFeature?: FeatureRequirement;
  requireRole?: UserRole[];
}

export function usePageGuard(options: UsePageGuardOptions): { isReady: boolean } {
  const {
    currentPath,
    skipAuth = false,
    skipOnboarding = false,
    requireFeature,
    requireRole,
  } = options;
  const navigation = useNavigation();
  const { user, isAuthenticated, isLoading, hasCompletedOnboarding } = useAuth();

  const { data: dogs, isLoading: isDogsLoading } = useDogList(user?.id);
  const { data: subscription, isLoading: isSubscriptionLoading } = useCurrentSubscription(user?.id);

  const isPro = subscription?.plan_type === 'PRO_MONTHLY' && subscription?.is_active;
  const dogCount = dogs?.length ?? 0;

  const [isReady, setIsReady] = useState(false);
  const lastRedirectRef = useRef<GuardRoute | null>(null);

  useEffect(() => {
    if (isLoading) {
      setIsReady(false);
      return;
    }

    const evaluated = evaluatePageGuard({
      currentPath,
      skipAuth,
      skipOnboarding,
      requireFeature,
      requireRole,
      isAuthenticated,
      hasCompletedOnboarding,
      isPro: Boolean(isPro),
      dogCount,
      isSubscriptionLoading,
      isDogsLoading,
      userRole: user?.role,
    });

    if (evaluated.status === 'pending') {
      if (__DEV__) {
        console.log('[APP-001][usePageGuard] pending', {
          currentPath,
          isAuthenticated,
          hasCompletedOnboarding,
          dogCount,
          isDogsLoading,
          isSubscriptionLoading,
        });
      }
      setIsReady(false);
      return;
    }

    if (evaluated.status === 'redirect') {
      if (__DEV__) {
        console.log('[APP-001][usePageGuard] redirect', {
          currentPath,
          redirectTo: evaluated.redirectTo,
          isAuthenticated,
          hasCompletedOnboarding,
          dogCount,
          isDogsLoading,
          isSubscriptionLoading,
        });
      }
      const isAuthFallback =
        evaluated.redirectTo === '/onboarding/welcome' || evaluated.redirectTo === '/login';
      if (isAuthFallback && currentPath !== '/login' && currentPath !== '/onboarding/welcome') {
        setPostLoginRedirect(currentPath);
      }

      if (lastRedirectRef.current !== evaluated.redirectTo) {
        lastRedirectRef.current = evaluated.redirectTo;
        navigation.navigate(evaluated.redirectTo);
      }
      setIsReady(false);
      return;
    }

    lastRedirectRef.current = null;
    setIsReady(true);
  }, [
    currentPath,
    dogCount,
    hasCompletedOnboarding,
    isAuthenticated,
    isDogsLoading,
    isLoading,
    isPro,
    isSubscriptionLoading,
    navigation,
    requireFeature,
    requireRole,
    skipAuth,
    skipOnboarding,
    user?.role,
  ]);

  return { isReady };
}
