import { authGuard } from '../authGuard';
import { onboardingGuard } from '../onboardingGuard';
import { featureGuard } from '../featureGuard';
import { resolveDeepEntry, rewriteInitialUrlForDeepEntry } from '../deepEntry';

describe('guards', () => {
  test('authGuard redirects unauthenticated users', () => {
    const result = authGuard({ isAuthenticated: false, currentPath: '/dashboard' });
    expect(result).toEqual({ allow: false, redirectTo: '/login' });
  });

  test('onboardingGuard redirects not-completed users', () => {
    const result = onboardingGuard({
      hasCompletedOnboarding: false,
      currentPath: '/dashboard',
    });
    expect(result).toEqual({ allow: false, redirectTo: '/onboarding/welcome' });
  });

  test('featureGuard blocks free multi-dog over limit', () => {
    const result = featureGuard({
      requirement: 'multiDog',
      isPro: false,
      dogCount: 1,
    });
    expect(result).toEqual({ allow: false, redirectTo: '/settings/subscription' });
  });

  test('deep entry resolves quick-log route', () => {
    const route = resolveDeepEntry('intoss://taillog-app?entry=quick-log');
    expect(route).toBe('/dashboard/quick-log');
  });

  test('deep entry with invalid value falls back to dashboard', () => {
    const route = resolveDeepEntry('intoss://taillog-app?entry=unknown-feature');
    expect(route).toBe('/dashboard');
  });

  test('deep entry rewrite removes entry and keeps other query params', () => {
    const rewritten = rewriteInitialUrlForDeepEntry(
      'intoss://taillog-app?entry=quick-log&type=barking&location=home',
      'intoss'
    );

    expect(rewritten).toContain('/dashboard/quick-log');
    expect(rewritten).toContain('type=barking');
    expect(rewritten).toContain('location=home');
    expect(rewritten).not.toContain('entry=');
  });

  test('deep entry rewrite sends root to login by default', () => {
    const rewritten = rewriteInitialUrlForDeepEntry('intoss://taillog-app', 'intoss');
    expect(rewritten).toContain('/login');
  });

  test('deep entry rewrite normalizes _404 to login', () => {
    const rewritten = rewriteInitialUrlForDeepEntry('intoss://taillog-app/_404', 'intoss');
    expect(rewritten).toContain('/login');
  });
});
