/**
 * 토스 로그인 화면 — Logo + "토스로 시작하기" CTA
 * appLogin() → Edge Function(login-with-toss) → setSession → 온보딩/대시보드
 * Parity: AUTH-001
 */
import { appLogin } from '@apps-in-toss/framework';
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as authApi from 'lib/api/auth';
import { useAuth } from 'stores/AuthContext';
import { consumePostLoginRedirect } from 'stores/postLoginRedirect';

interface EdgeFailureMeta {
  code?: string;
  message?: string;
  upstreamStatus?: number;
  upstreamCode?: string;
  upstreamMessage?: string;
}

export const Route = createRoute('/login', {
  component: LoginPage,
});

function LoginPage() {
  const { login, syncOnboardingStatus } = useAuth();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readEdgeFailureMeta = useCallback(async (cause: unknown): Promise<EdgeFailureMeta | null> => {
    const withContext = cause as { context?: unknown };
    const context = withContext?.context;
    if (!context || typeof context !== 'object') return null;

    const response = context as Response;
    if (typeof response.clone !== 'function') return null;

    try {
      const payload = await response.clone().json() as {
        error?: {
          code?: string;
          message?: string;
          details?: Record<string, unknown>;
        };
      };

      const details = payload.error?.details ?? {};
      const upstreamStatusRaw = details.upstreamStatus;
      const upstreamCodeRaw = details.upstreamCode;
      const upstreamMessageRaw = details.upstreamMessage;

      return {
        code: payload.error?.code,
        message: payload.error?.message,
        upstreamStatus: typeof upstreamStatusRaw === 'number' ? upstreamStatusRaw : undefined,
        upstreamCode: typeof upstreamCodeRaw === 'string' ? upstreamCodeRaw : undefined,
        upstreamMessage: typeof upstreamMessageRaw === 'string' ? upstreamMessageRaw : undefined,
      };
    } catch {
      return null;
    }
  }, []);

  const getLoginErrorMessage = useCallback(async (cause: unknown): Promise<string> => {
    const message = cause instanceof Error ? cause.message : String(cause ?? '');
    const normalized = message.toLowerCase();

    const edgeMeta = await readEdgeFailureMeta(cause);
    if (edgeMeta?.code === 'AUTH_LOGIN_FAILED') {
      const parts: string[] = ['토스 인증 서버 응답 실패'];
      if (edgeMeta.upstreamStatus !== undefined) {
        parts.push(`status=${edgeMeta.upstreamStatus}`);
      }
      if (edgeMeta.upstreamCode) {
        parts.push(`code=${edgeMeta.upstreamCode}`);
      }
      if (edgeMeta.upstreamMessage) {
        return `${parts.join(' ')}: ${edgeMeta.upstreamMessage}`;
      }
      return `${parts.join(' ')}.`;
    }

    if (normalized.includes('oauth2clientid')) {
      return '토스 로그인 설정(oauth2ClientId)이 필요해요. 콘솔 설정을 확인해주세요.';
    }

    if (normalized.includes('schema') || message.includes('스키마')) {
      return '토스 앱 스킴 열기에 실패했어요. Sandbox 앱에서 다시 시도해주세요.';
    }

    if (normalized.includes('cancel')) {
      return '로그인이 취소되었어요. 다시 시도해주세요.';
    }

    if (normalized.includes('supabase_env_missing')) {
      return 'Supabase 설정이 누락되었어요. EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY를 설정해주세요.';
    }

    if (normalized.includes('bridge_session_not_established')) {
      return '로그인 세션 생성에 실패했어요. 앱을 재시작하고 다시 시도해주세요.';
    }

    return '로그인에 실패했어요. 다시 시도해주세요.';
  }, [readEdgeFailureMeta]);

  const handleTossLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { authorizationCode, referrer } = await appLogin();
      console.log('[AUTH-001] appLogin referrer', referrer ?? '(none)');
      const loginResult = await authApi.loginWithToss(authorizationCode, referrer);
      const sessionEstablished = await authApi.setSessionFromBridgeResponse(loginResult);
      if (!sessionEstablished) {
        throw new Error('BRIDGE_SESSION_NOT_ESTABLISHED');
      }
      login(loginResult.user);

      const hasCompletedOnboarding = await syncOnboardingStatus(loginResult.user.id);
      if (hasCompletedOnboarding) {
        const pending = consumePostLoginRedirect();
        navigation.navigate(pending ?? '/dashboard');
        return;
      }

      navigation.navigate('/onboarding/welcome');
    } catch (cause) {
      const edgeMeta = await readEdgeFailureMeta(cause);
      console.error('[AUTH-001] toss login failed', cause, edgeMeta);
      setError(await getLoginErrorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }, [getLoginErrorMessage, login, navigation, readEdgeFailureMeta, syncOnboardingStatus]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Logo Area */}
        <View style={styles.logoSection}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoIcon}>🐾</Text>
          </View>
          <Text style={styles.appName}>테일로그</Text>
          <Text style={styles.tagline}>반려견 행동, 90초면 기록 끝</Text>
        </View>

        {/* CTA Area */}
        <View style={styles.ctaSection}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.tossButton, isLoading && styles.tossButtonDisabled]}
            onPress={handleTossLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.tossButtonText}>토스로 시작하기</Text>
            )}
          </TouchableOpacity>

          <View style={styles.termsRow}>
            <TouchableOpacity onPress={() => navigation.navigate('/legal/terms')}>
              <Text style={styles.termsLink}>이용약관</Text>
            </TouchableOpacity>
            <Text style={styles.termsDot}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate('/legal/privacy')}>
              <Text style={styles.termsLink}>개인정보처리방침</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#0064FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoIcon: { fontSize: 36 },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#202632',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#8B95A1',
  },
  ctaSection: {
    paddingTop: 20,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  tossButton: {
    backgroundColor: '#0064FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tossButtonDisabled: {
    backgroundColor: '#D1D6DB',
  },
  tossButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  termsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  termsLink: {
    fontSize: 13,
    color: '#8B95A1',
    textDecorationLine: 'underline',
  },
  termsDot: {
    fontSize: 13,
    color: '#8B95A1',
    marginHorizontal: 8,
  },
});
