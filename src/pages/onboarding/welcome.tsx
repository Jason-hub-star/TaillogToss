/**
 * 최초 환영 화면 — 가치 제안 + "토스로 시작하기" CTA (로그인 통합)
 * 미인증 사용자의 주 진입점. 로그인 성공 → 신규: survey / 기존: dashboard
 * Parity: AUTH-001, APP-001
 */
import { appLogin } from '@apps-in-toss/framework';
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { colors, typography } from 'styles/tokens';
import { ICONS } from 'lib/data/iconSources';
import * as authApi from 'lib/api/auth';
import { useAuth } from 'stores/AuthContext';
import { consumePostLoginRedirect } from 'stores/postLoginRedirect';
import { LottieAnimation } from 'components/shared/LottieAnimation';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { tracker } from 'lib/analytics/tracker';
import { isB2BRole } from 'stores/OrgContext';
import type { UserRole } from 'types/auth';

export const Route = createRoute('/onboarding/welcome', {
  component: WelcomePage,
});

interface EdgeFailureMeta {
  code?: string;
  message?: string;
  upstreamStatus?: number;
  upstreamCode?: string;
  upstreamMessage?: string;
}

const APP_LOGIN_TIMEOUT_MS = 20_000;
const AUTH_BRIDGE_TIMEOUT_MS = 25_000;
const SESSION_BRIDGE_TIMEOUT_MS = 15_000;
const ONBOARDING_SYNC_TIMEOUT_MS = 10_000;

async function appLoginWithTimeout(flow: 'B2B' | 'B2C') {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  console.log('[AUTH-001] appLogin start', { flow });

  try {
    const result = await Promise.race([
      appLogin(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('APP_LOGIN_TIMEOUT'));
        }, APP_LOGIN_TIMEOUT_MS);
      }),
    ]);
    console.log('[AUTH-001] appLogin referrer', { flow, referrer: result.referrer });
    return result;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function loginWithTossWithTimeout(
  authorizationCode: string,
  referrer: string | undefined,
  flow: 'B2B' | 'B2C',
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  console.log('[AUTH-001] login-with-toss start', { flow, referrer });

  try {
    const result = await Promise.race([
      authApi.loginWithToss(authorizationCode, referrer, flow),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('AUTH_BRIDGE_TIMEOUT'));
        }, AUTH_BRIDGE_TIMEOUT_MS);
      }),
    ]);
    console.log('[AUTH-001] login-with-toss success', { flow, userId: result.user?.id });
    return result;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function setSessionWithTimeout(loginResult: Awaited<ReturnType<typeof authApi.loginWithToss>>, flow: 'B2B' | 'B2C') {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  console.log('[AUTH-001] session bridge start', { flow, userId: loginResult.user?.id });

  try {
    const result = await Promise.race([
      authApi.setSessionFromBridgeResponse(loginResult),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('SESSION_BRIDGE_TIMEOUT'));
        }, SESSION_BRIDGE_TIMEOUT_MS);
      }),
    ]);
    console.log('[AUTH-001] session bridge done', { flow, sessionEstablished: result });
    return result;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function syncOnboardingWithTimeout(
  syncOnboardingStatus: (userId: string | undefined) => Promise<boolean>,
  userId: string,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  console.log('[AUTH-001] onboarding sync start', { userId });

  try {
    const result = await Promise.race([
      syncOnboardingStatus(userId),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('ONBOARDING_SYNC_TIMEOUT'));
        }, ONBOARDING_SYNC_TIMEOUT_MS);
      }),
    ]);
    console.log('[AUTH-001] onboarding sync success', { userId, hasCompletedOnboarding: result });
    return result;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function WelcomePage() {
  const { isReady } = usePageGuard({
    currentPath: '/onboarding/welcome',
    skipAuth: true,      // 미인증 사용자도 접근 가능 (로그인 진입점)
    skipOnboarding: true,
  });

  const { login, syncOnboardingStatus } = useAuth();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [isB2BLoading, setIsB2BLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readEdgeFailureMeta = useCallback(async (cause: unknown): Promise<EdgeFailureMeta | null> => {
    const withContext = cause as { context?: unknown };
    const context = withContext?.context;
    if (!context || typeof context !== 'object') return null;
    const response = context as Response;
    if (typeof response.clone !== 'function') return null;
    try {
      const payload = await response.clone().json() as {
        error?: { code?: string; message?: string; details?: Record<string, unknown> };
      };
      const details = payload.error?.details ?? {};
      return {
        code: payload.error?.code,
        message: payload.error?.message,
        upstreamStatus: typeof details.upstreamStatus === 'number' ? details.upstreamStatus : undefined,
        upstreamCode: typeof details.upstreamCode === 'string' ? details.upstreamCode : undefined,
        upstreamMessage: typeof details.upstreamMessage === 'string' ? details.upstreamMessage : undefined,
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
      const parts = ['토스 인증 서버 응답 실패'];
      if (edgeMeta.upstreamStatus !== undefined) parts.push(`status=${edgeMeta.upstreamStatus}`);
      if (edgeMeta.upstreamCode) parts.push(`code=${edgeMeta.upstreamCode}`);
      if (edgeMeta.upstreamMessage) return `${parts.join(' ')}: ${edgeMeta.upstreamMessage}`;
      return `${parts.join(' ')}.`;
    }
    if (normalized.includes('cancel')) return '로그인을 취소했어요. 다시 시도해주세요.';
    if (normalized.includes('oauth2clientid')) return '토스 로그인을 준비하고 있어요. 잠시 후 다시 시도해주세요.';
    if (normalized.includes('schema')) return '토스 로그인을 열지 못했어요. 앱을 다시 열고 시도해주세요.';
    if (normalized.includes('bridge_session_not_established')) return '로그인을 완료하지 못했어요. 앱을 다시 열고 시도해주세요.';
    if (normalized.includes('app_login_timeout')) return '토스 로그인 응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.';
    if (normalized.includes('auth_bridge_timeout')) return '로그인 확인이 늦어지고 있어요. 네트워크 확인 후 다시 시도해주세요.';
    if (normalized.includes('session_bridge_timeout')) return '로그인 저장이 늦어지고 있어요. 앱을 다시 열고 시도해주세요.';
    if (normalized.includes('onboarding_sync_timeout')) return '로그인은 완료됐어요. 홈으로 이동할게요.';
    return '로그인을 완료하지 못했어요. 다시 시도해주세요.';
  }, [readEdgeFailureMeta]);

  /**
   * B2B 셀프 가입 — 토스 로그인 후 org_owner 역할 자동 부여 → /ops/today 이동
   * 이미 B2B 역할이면 역할 부여 건너뜀.
   */
  const handleB2BLogin = useCallback(async () => {
    setIsB2BLoading(true);
    setError(null);
    try {
      await authApi.setPreferredAuthEntryFlow('B2B');
      const { authorizationCode, referrer } = await appLoginWithTimeout('B2B');
      const loginResult = await loginWithTossWithTimeout(authorizationCode, referrer, 'B2B');
      const sessionEstablished = await setSessionWithTimeout(loginResult, 'B2B');
      if (!sessionEstablished) throw new Error('BRIDGE_SESSION_NOT_ESTABLISHED');

      // 이미 B2B 역할이면 역할 부여 생략
      if (!isB2BRole(loginResult.user.role as UserRole)) {
        await authApi.assignB2BRole('org_owner');
      }

      // 갱신된 세션으로 AuthContext 업데이트
      const updatedSession = await authApi.getSession();
      const updatedUser = {
        ...loginResult.user,
        role: (updatedSession?.user?.user_metadata?.role ?? 'org_owner') as UserRole,
      };
      login(updatedUser);

      navigation.navigate('/ops/today' as never);
    } catch (cause) {
      const edgeMeta = await readEdgeFailureMeta(cause);
      console.error('[B2B-LOGIN] handleB2BLogin failed', {
        message: cause instanceof Error ? cause.message : String(cause ?? ''),
        edgeMeta,
      });
      setError(await getLoginErrorMessage(cause));
    } finally {
      setIsB2BLoading(false);
    }
  }, [getLoginErrorMessage, login, navigation, readEdgeFailureMeta]);

  const handleTossLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    tracker.onboardingStarted();

    try {
      const { authorizationCode, referrer } = await appLoginWithTimeout('B2C');
      const loginResult = await loginWithTossWithTimeout(authorizationCode, referrer, 'B2C');
      const sessionEstablished = await setSessionWithTimeout(loginResult, 'B2C');
      if (!sessionEstablished) throw new Error('BRIDGE_SESSION_NOT_ESTABLISHED');
      await authApi.setPreferredAuthEntryFlow('B2C');
      await authApi.normalizeCurrentSessionAsB2C();

      login({ ...loginResult.user, role: 'user' });

      let hasCompletedOnboarding = false;
      try {
        hasCompletedOnboarding = await syncOnboardingWithTimeout(syncOnboardingStatus, loginResult.user.id);
      } catch (syncCause) {
        console.error('[AUTH-001] onboarding sync failed', syncCause);
        const pending = consumePostLoginRedirect();
        navigation.navigate(pending ?? '/dashboard');
        return;
      }
      if (hasCompletedOnboarding) {
        const pending = consumePostLoginRedirect();
        navigation.navigate(pending ?? '/dashboard');
        return;
      }
      navigation.navigate('/onboarding/survey');
    } catch (cause) {
      const edgeMeta = await readEdgeFailureMeta(cause);
      console.error('[AUTH-001] welcome login failed', cause, edgeMeta);
      setError(await getLoginErrorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }, [getLoginErrorMessage, login, navigation, readEdgeFailureMeta, syncOnboardingStatus]);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.heroSection}>
            <SkeletonBox width={120} height={120} borderRadius={60} />
            <SkeletonBox width={200} height={28} style={{ marginTop: 32 }} />
            <SkeletonBox width={160} height={20} style={{ marginTop: 12 }} />
            <View style={[styles.features, { marginTop: 36 }]}>
              {[1, 2, 3].map((i) => (
                <SkeletonBox key={i} width="30%" height={100} borderRadius={16} />
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Hero + 가치 제안 */}
        <View style={styles.heroSection}>
          <View style={styles.lottieArea}>
            <LottieAnimation asset="cute-doggie" size={120} />
          </View>
          <Text style={styles.heading}>반려견 행동,{'\n'}30초면 기록 끝</Text>
          <Text style={styles.subtitle}>AI가 분석하고,{'\n'}맞춤 훈련까지</Text>

          <View style={styles.features}>
            <View style={styles.featureCard}>
              <Image source={{ uri: ICONS['ic-bolt'] }} style={styles.featureIconImg} />
              <Text style={styles.featureTitle}>원탭 기록</Text>
              <Text style={styles.featureDesc}>간단한 칩 터치로 빠르게</Text>
            </View>
            <View style={styles.featureCard}>
              <Image source={{ uri: ICONS['ic-analysis'] }} style={styles.featureIconImg} />
              <Text style={styles.featureTitle}>AI 분석</Text>
              <Text style={styles.featureDesc}>패턴과 트리거를 자동 분석</Text>
            </View>
            <View style={styles.featureCard}>
              <Image source={{ uri: ICONS['ic-target'] }} style={styles.featureIconImg} />
              <Text style={styles.featureTitle}>맞춤 훈련</Text>
              <Text style={styles.featureDesc}>7종 커리큘럼 맞춤 추천</Text>
            </View>
          </View>
        </View>

        {/* Bottom CTA — 토스로 시작하기 */}
        <View style={styles.bottomSection}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
            onPress={handleTossLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.ctaText}>토스로 시작하기</Text>
            )}
          </TouchableOpacity>

          {/* B2B 셀프 가입 링크 */}
          <TouchableOpacity
            style={styles.b2bLink}
            onPress={handleB2BLogin}
            disabled={isB2BLoading || isLoading}
            activeOpacity={0.6}
          >
            {isB2BLoading ? (
              <ActivityIndicator color={colors.textTertiary} size="small" />
            ) : (
              <Text style={styles.b2bLinkText}>센터·훈련사 관계자이신가요?</Text>
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
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'space-between' },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  lottieArea: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  heading: {
    ...typography.t2,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...typography.label,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
  },
  features: { flexDirection: 'row', gap: 12 },
  featureCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  featureIconImg: { width: 40, height: 40, marginBottom: 8 },
  featureTitle: { ...typography.caption, fontWeight: '700', color: colors.textDark, marginBottom: 4 },
  featureDesc: { ...typography.badge, color: colors.textSecondary, textAlign: 'center' },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  errorBanner: {
    backgroundColor: colors.red50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.badgeRedBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  errorText: {
    ...typography.detail,
    color: colors.red500,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: colors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaButtonDisabled: {
    backgroundColor: colors.grey300,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    color: colors.white,
    ...typography.body,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  b2bLink: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 12,
  },
  b2bLinkText: {
    ...typography.caption,
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },
  termsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  termsLink: {
    ...typography.caption,
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },
  termsDot: {
    ...typography.caption,
    color: colors.textTertiary,
    marginHorizontal: 8,
  },
});
