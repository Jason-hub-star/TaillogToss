export type GuardRoute =
  | '/login'
  | '/onboarding/welcome'
  | '/settings/subscription'
  | '/dashboard'
  | '/dashboard/quick-log'
  | '/coaching/result'
  | '/training/academy'
  | '/ops/today';

export type GuardResult =
  | { allow: true }
  | { allow: false; redirectTo: GuardRoute };

interface AuthGuardInput {
  isAuthenticated: boolean;
  currentPath: string;
}

export function authGuard({ isAuthenticated, currentPath }: AuthGuardInput): GuardResult {
  if (isAuthenticated) return { allow: true };
  // 미인증 접근 허용: welcome(로그인 통합 진입점) + login(세션 만료 fallback)
  if (currentPath === '/onboarding/welcome' || currentPath === '/login') return { allow: true };
  return { allow: false, redirectTo: '/onboarding/welcome' };
}
