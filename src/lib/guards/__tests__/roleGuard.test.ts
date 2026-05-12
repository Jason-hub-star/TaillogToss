/**
 * roleGuard.test.ts — B2B 역할 가드 + evaluatePageGuard B2B 통합 테스트
 * Parity: B2B-001
 */
import { roleGuard } from '../roleGuard';
import { evaluatePageGuard } from 'lib/hooks/pageGuardEvaluator';

describe('roleGuard', () => {
  it('trainer 역할은 trainer 요구 시 허용', () => {
    const result = roleGuard({ userRole: 'trainer', requiredRoles: ['trainer', 'org_owner'] });
    expect(result).toEqual({ allow: true });
  });

  it('user 역할은 B2B 역할 요구 시 차단', () => {
    const result = roleGuard({ userRole: 'user', requiredRoles: ['trainer', 'org_owner'] });
    expect(result).toEqual({ allow: false, redirectTo: '/dashboard' });
  });

  it('undefined 역할은 차단', () => {
    const result = roleGuard({ userRole: undefined, requiredRoles: ['trainer'] });
    expect(result).toEqual({ allow: false, redirectTo: '/dashboard' });
  });

  it('org_staff 역할은 org_staff 포함 시 허용', () => {
    const result = roleGuard({ userRole: 'org_staff', requiredRoles: ['org_owner', 'org_staff'] });
    expect(result).toEqual({ allow: true });
  });
});

describe('evaluatePageGuard + requireRole', () => {
  const baseInput = {
    currentPath: '/ops/today',
    skipAuth: false,
    skipOnboarding: false,
    isAuthenticated: true,
    hasCompletedOnboarding: true,
    isPro: false,
    dogCount: 1,
    isSubscriptionLoading: false,
    isDogsLoading: false,
  };

  it('trainer로 B2B 페이지 접근 허용', () => {
    const result = evaluatePageGuard({
      ...baseInput,
      requireRole: ['trainer', 'org_owner'],
      userRole: 'trainer',
    });
    expect(result).toEqual({ status: 'allow' });
  });

  it('user로 B2B 페이지 접근 차단 → /dashboard', () => {
    const result = evaluatePageGuard({
      ...baseInput,
      requireRole: ['trainer', 'org_owner'],
      userRole: 'user',
    });
    expect(result).toEqual({ status: 'redirect', redirectTo: '/dashboard' });
  });

  it('미인증 시 requireRole 이전에 auth 가드가 먼저 차단 → /onboarding/welcome', () => {
    const result = evaluatePageGuard({
      ...baseInput,
      isAuthenticated: false,
      requireRole: ['trainer'],
      userRole: 'trainer',
    });
    expect(result).toEqual({ status: 'redirect', redirectTo: '/onboarding/welcome' });
  });

  it('b2bOnly feature + user 역할 → 차단', () => {
    const result = evaluatePageGuard({
      ...baseInput,
      requireFeature: 'b2bOnly',
      userRole: 'user',
    });
    expect(result).toEqual({ status: 'redirect', redirectTo: '/dashboard' });
  });

  it('B2B 페이지는 개인 반려견 온보딩 미완료여도 역할이 맞으면 허용', () => {
    const result = evaluatePageGuard({
      ...baseInput,
      hasCompletedOnboarding: false,
      dogCount: 0,
      currentPath: '/ops/today',
      requireFeature: 'b2bOnly',
      userRole: 'trainer',
    });
    expect(result).toEqual({ status: 'allow' });
  });
});
