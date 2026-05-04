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
import { clearPostLoginRedirect } from 'stores/postLoginRedirect';
import type { AuthState, User } from 'types/auth';

interface SessionUserLike {
  id: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, unknown>;
}

interface AuthContextValue extends AuthState {
  login: (user: User) => void;
  logout: () => void;
  setOnboardingComplete: () => void;
  syncOnboardingStatus: (userId: string | undefined) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function buildUserFromSession(sessionUser: SessionUserLike): User {
  const metadata = sessionUser.user_metadata ?? {};
  const now = new Date().toISOString();

  return {
    id: sessionUser.id,
    toss_user_key: String(metadata.toss_user_key ?? sessionUser.id),
    role: (metadata.role as User['role']) ?? 'user',
    status: (metadata.status as User['status']) ?? 'active',
    pepper_version: Number(metadata.pepper_version ?? 1),
    timezone: String(metadata.timezone ?? 'Asia/Seoul'),
    last_login_at: sessionUser.last_sign_in_at ?? now,
    created_at: sessionUser.created_at ?? now,
    updated_at: sessionUser.updated_at ?? now,
  };
}

async function getHasCompletedOnboarding(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const dogs = await dogApi.getDogs(userId);
    return dogs.length > 0;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    hasCompletedOnboarding: false,
  });

  const login = useCallback((user: User) => {
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
      hasCompletedOnboarding: false,
    });
  }, []);

  const logout = useCallback(() => {
    clearPostLoginRedirect();
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

        const user = buildUserFromSession(session.user as SessionUserLike);
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

    // IAP 등 앱 재진입 시 Supabase 세션 변경 이벤트 감지
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          const user = buildUserFromSession(session.user as SessionUserLike);
          getHasCompletedOnboarding(user.id).then((hasCompletedOnboarding) => {
            if (!mounted) return;
            setState({ user, isAuthenticated: true, isLoading: false, hasCompletedOnboarding });
          });
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
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
