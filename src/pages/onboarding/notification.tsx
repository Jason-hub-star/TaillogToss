/**
 * 알림 설정 화면 — Smart Message 동의 체크박스 x3 + "허용하기" CTA
 * 기본값: 훈련 리마인더 ON, 행동 급증 ON, 프로모션 OFF
 * Parity: AUTH-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch } from 'react-native';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useUpdateSettings } from 'lib/hooks/useSettings';
import { tracker } from 'lib/analytics/tracker';
import { useAuth } from 'stores/AuthContext';
import { consumePostLoginRedirect } from 'stores/postLoginRedirect';
import { colors, typography } from 'styles/tokens';

export const Route = createRoute('/onboarding/notification', {
  component: NotificationPage,
});

interface NotifPref {
  training_reminder: boolean;
  behavior_spike: boolean;
  promotions: boolean;
}

function NotificationPage() {
  const navigation = useNavigation();
  const { user, setOnboardingComplete } = useAuth();
  const updateSettings = useUpdateSettings();
  const { isReady } = usePageGuard({
    currentPath: '/onboarding/notification',
    skipOnboarding: true,
  });

  const [prefs, setPrefs] = useState<NotifPref>({
    training_reminder: true,
    behavior_spike: true,
    promotions: false,
  });

  const completeOnboardingFlow = useCallback(async () => {
    if (!user) {
      navigation.navigate('/login');
      return;
    }

    setOnboardingComplete();
    tracker.onboardingComplete();
    const pending = consumePostLoginRedirect();
    if (__DEV__) {
      console.log('[APP-001][onboarding/notification] completeOnboardingFlow', {
        userId: user.id,
        target: pending ?? '/dashboard',
      });
    }
    navigation.navigate(pending ?? '/dashboard');
    // NOTE:
    // survey-result screen is still mounted in back stack.
    // Clearing survey context here can trigger its "missing data -> /onboarding/survey" redirect.
    // Keep data until onboarding stack naturally exits.
  }, [navigation, setOnboardingComplete, user]);

  const handleAllow = useCallback(async () => {
    if (!user) {
      navigation.navigate('/login');
      return;
    }

    try {
      await updateSettings.mutateAsync({
        userId: user.id,
        updates: {
          notification_pref: {
            channels: { smart_message: true, push: true },
            types: {
              log_reminder: prefs.training_reminder,
              surge_alert: prefs.behavior_spike,
              coaching_ready: true,
              training_reminder: prefs.training_reminder,
              promo: prefs.promotions,
            },
            quiet_hours: { enabled: true, start_hour: 22, end_hour: 8 },
          },
        },
      });
    } catch {
      // 설정 저장 실패 시에도 온보딩 완료 플로우는 유지
    }

    await completeOnboardingFlow();
  }, [completeOnboardingFlow, navigation, prefs, updateSettings, user]);

  const handleSkip = useCallback(() => {
    void completeOnboardingFlow();
  }, [completeOnboardingFlow]);

  const handleClose = useCallback(() => {
    void completeOnboardingFlow();
  }, [completeOnboardingFlow]);

  const togglePref = (key: keyof NotifPref) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isReady) return null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header with close button */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.bellArea}>
            <Text style={styles.bellEmoji}>🔔</Text>
          </View>

          <Text style={styles.heading}>반려견의 변화를{'\n'}놓치지 마세요</Text>
          <Text style={styles.subtitle}>중요한 알림만 보내드릴게요</Text>
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 알림 옵션 체크박스 */}
        <View style={styles.optionList}>
          <View style={styles.optionRow}>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>훈련 리마인더</Text>
              <Text style={styles.optionDesc}>매일 설정한 시간에 알림</Text>
            </View>
            <Switch
              value={prefs.training_reminder}
              onValueChange={() => togglePref('training_reminder')}
            />
          </View>

          <View style={styles.optionDivider} />

          <View style={styles.optionRow}>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>행동 급증 알림</Text>
              <Text style={styles.optionDesc}>평소보다 문제행동이 많을 때</Text>
            </View>
            <Switch
              value={prefs.behavior_spike}
              onValueChange={() => togglePref('behavior_spike')}
            />
          </View>

          <View style={styles.optionDivider} />

          <View style={styles.optionRow}>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>프로모션/팁</Text>
              <Text style={styles.optionDesc}>할인·이벤트 소식</Text>
            </View>
            <Switch
              value={prefs.promotions}
              onValueChange={() => togglePref('promotions')}
            />
          </View>
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.ctaButton} onPress={handleAllow} activeOpacity={0.8}>
          <Text style={styles.ctaText}>허용하기</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>나중에</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  headerSpacer: { flex: 1 },
  closeBtn: { padding: 8 },
  closeIcon: { ...typography.subtitle, color: colors.textSecondary },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
  },
  bellArea: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  bellEmoji: { fontSize: 40 },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 20,
  },
  optionList: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  optionText: { flex: 1, marginRight: 12 },
  optionTitle: { ...typography.bodySmall, fontWeight: '600', color: colors.textDark },
  optionDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  optionDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  ctaButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: colors.white, ...typography.body, fontWeight: '700' },
  skipBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
