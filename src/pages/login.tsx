/**
 * 토스 로그인 화면 — Logo + "토스로 시작하기" CTA
 * appLogin() → Edge Function(login-with-toss) → setSession → 온보딩/대시보드
 * Parity: AUTH-001
 */
import { createRoute } from '@granite-js/react-native';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from 'stores/AuthContext';

export const Route = createRoute('/login', {
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTossLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: 사업자등록 후 실제 appLogin() → Edge Function 연동
      // mock: 1초 후 로그인 성공
      await new Promise((resolve) => setTimeout(resolve, 1000));

      login({
        id: 'mock-user-id',
        toss_user_key: 'mock-toss-key',
        role: 'user',
        status: 'active',
        pepper_version: 1,
        timezone: 'Asia/Seoul',
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 로그인 성공 → welcome 또는 dashboard로 이동 (가드가 처리)
    } catch {
      setError('로그인에 실패했어요. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [login]);

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
            <TouchableOpacity>
              <Text style={styles.termsLink}>이용약관</Text>
            </TouchableOpacity>
            <Text style={styles.termsDot}>·</Text>
            <TouchableOpacity>
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
