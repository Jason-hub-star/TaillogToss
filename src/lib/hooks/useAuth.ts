/**
 * useAuth 훅 — Toss 로그인/로그아웃 + 세션 관리
 * Parity: AUTH-001
 */
import { useCallback } from 'react';
import { useAuth as useAuthContext } from 'stores/AuthContext';
import * as authApi from 'lib/api/auth';

export function useLogin() {
  const { login } = useAuthContext();

  const loginWithToss = useCallback(
    async (authCode: string) => {
      const result = await authApi.loginWithToss(authCode);
      await authApi.setSessionFromBridgeResponse(result);
      login(result.user);
      return result;
    },
    [login]
  );

  return { loginWithToss };
}

export function useLogout() {
  const { logout } = useAuthContext();

  const handleLogout = useCallback(async () => {
    await authApi.logout();
    logout();
  }, [logout]);

  return { logout: handleLogout };
}
