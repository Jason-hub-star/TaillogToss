/**
 * AuthContext — 인증 상태 관리 (Toss Login → Supabase Auth)
 * Parity: AUTH-001
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authApi from 'lib/api/auth';
import * as dogApi from 'lib/api/dog';
import { supabase } from 'lib/api/supabase';
import { queryPolicy } from 'lib/api/queryConfig';
import { queryKeys } from 'lib/api/queryKeys';
import { clearPersistedQueryCache, setQueryCacheOwner } from 'lib/queryPersistence';
import { queryClient } from './queryClient';
import { clearPostLoginRedirect } from 'stores/postLoginRedirect';
import { isB2BAuthRole, resolveEffectiveSessionRole } from 'stores/authRole';
import type { AuthState, User } from 'types/auth';
import type { AuthEntryFlow } from 'lib/api/auth';

interface SessionUserLike {
  id: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, unknown>;
}

interface SessionLike {
  access_token?: string | null;
  user?: SessionUserLike | null;
}

interface AuthContextValue extends AuthState {
  login: (user: User) => void;
  logout: () => void;
  setOnboardingComplete: () => void;
  syncOnboardingStatus: (userId: string | undefined) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isB2BRole(role: unknown): role is User['role'] {
  return isB2BAuthRole(role);
}

async function getPublicUserRole(userId: string): Promise<User['role'] | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    const role = (data as { role?: unknown } | null)?.role;
    return isB2BRole(role) || role === 'user' ? role : null;
  } catch {
    return null;
  }
}

function isJwtLike(token: string): boolean {
  return token.split('.').length === 3;
}

async function verifySessionUser(session: SessionLike | null | undefined): Promise<SessionUserLike | null> {
  const accessToken = session?.access_token;
  if (!accessToken || !isJwtLike(accessToken)) {
    await authApi.logout().catch(() => undefined);
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    await authApi.logout().catch(() => undefined);
    return null;
  }

  return data.user as SessionUserLike;
}

function buildUserFromSession(sessionUser: SessionUserLike, preferredFlow?: AuthEntryFlow | null): User {
  const metadata = sessionUser.user_metadata ?? {};
  const now = new Date().toISOString();
  const sessionRole = resolveEffectiveSessionRole({
    sessionRole: metadata.role,
    preferredFlow,
  });

  return {
    id: sessionUser.id,
    toss_user_key: String(metadata.toss_user_key ?? sessionUser.id),
    role: sessionRole,
    status: (metadata.status as User['status']) ?? 'active',
    pepper_version: Number(metadata.pepper_version ?? 1),
    timezone: String(metadata.timezone ?? 'Asia/Seoul'),
    last_login_at: sessionUser.last_sign_in_at ?? now,
    created_at: sessionUser.created_at ?? now,
    updated_at: sessionUser.updated_at ?? now,
  };
}

async function buildUserFromSessionWithPublicRole(
  sessionUser: SessionUserLike,
  preferredFlow?: AuthEntryFlow | null,
): Promise<User> {
  const user = buildUserFromSession(sessionUser, preferredFlow);
  const publicRole = await getPublicUserRole(user.id);
  return {
    ...user,
    role: resolveEffectiveSessionRole({
      sessionRole: user.role,
      preferredFlow,
      publicRole,
    }),
  };
}

async function getHasCompletedOnboarding(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const dogs = await queryClient.fetchQuery({
      queryKey: queryKeys.dogs.list(userId),
      queryFn: () => dogApi.getDogs(userId),
      ...queryPolicy.default,
    });
    return dogs.length > 0;
  } catch {
    return false;
  }
}

function deferAuthWork(work: () => Promise<void>) {
  setTimeout(() => {
    void work();
  }, 0);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    hasCompletedOnboarding: false,
  });

  const login = useCallback((user: User) => {
    void setQueryCacheOwner(user.id);
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
      hasCompletedOnboarding: false,
    });
  }, []);

  const logout = useCallback(() => {
    clearPostLoginRedirect();
    void clearPersistedQueryCache();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      hasCompletedOnboarding: false,
    });
  }, []);

  const setOnboardingComplete = useCallback(() => {
    setState((prev) => ({ ...prev, hasCompletedOnboarding: true }));
  }, []);

  const syncOnboardingStatus = useCallback(async (userId: string | undefined) => {
    const hasCompletedOnboarding = await getHasCompletedOnboarding(userId);
    setState((prev) => ({ ...prev, hasCompletedOnboarding }));
    return hasCompletedOnboarding;
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const session = await authApi.getSession();
        if (!mounted) return;

        if (!session?.user) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const preferredFlow = await authApi.getPreferredAuthEntryFlow();
        const user = await buildUserFromSessionWithPublicRole(
          session.user as SessionUserLike,
          preferredFlow,
        );
        await setQueryCacheOwner(user.id);
        const hasCompletedOnboarding = await getHasCompletedOnboarding(user.id);
        if (!mounted) return;

        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          hasCompletedOnboarding,
        });
      } catch {
        if (!mounted) return;
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    void bootstrap();

    const syncSessionUser = async (sessionUser: SessionUserLike) => {
      const preferredFlow = await authApi.getPreferredAuthEntryFlow();
      const user = await buildUserFromSessionWithPublicRole(sessionUser, preferredFlow);
      await setQueryCacheOwner(user.id);
      const hasCompletedOnboarding = await getHasCompletedOnboarding(user.id);
      if (!mounted) return;
      setState({ user, isAuthenticated: true, isLoading: false, hasCompletedOnboarding });
    };

    // IAP 등 앱 재진입 시 Supabase 세션 변경 이벤트 감지
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        if (session?.user) {
          const applySessionState = async () => {
            const verifiedUser = await verifySessionUser(session as SessionLike);
            if (!mounted || !verifiedUser) {
              if (mounted) {
                setState({ user: null, isAuthenticated: false, isLoading: false, hasCompletedOnboarding: false });
              }
              return;
            }
            const preferredFlow = await authApi.getPreferredAuthEntryFlow();
            const user = await buildUserFromSessionWithPublicRole(
              verifiedUser,
              preferredFlow,
            );
            if (!mounted) return;
            setState((prev) => ({
              user,
              isAuthenticated: true,
              isLoading: false,
              hasCompletedOnboarding: prev.user?.id === user.id ? prev.hasCompletedOnboarding : false,
            }));
          };
          void applySessionState();
          deferAuthWork(async () => {
            const verifiedUser = await verifySessionUser(session as SessionLike);
            if (!verifiedUser) return;
            await syncSessionUser(verifiedUser);
          });
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          void clearPersistedQueryCache();
          setState({ user: null, isAuthenticated: false, isLoading: false, hasCompletedOnboarding: false });
        }
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout, setOnboardingComplete, syncOnboardingStatus }),
    [state, login, logout, setOnboardingComplete, syncOnboardingStatus]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
