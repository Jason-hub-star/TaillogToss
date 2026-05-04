/**
 * DevMenu — __DEV__ 전용 디버그 네비게이션 도구
 * 플로팅 버튼 → 모든 라우트 목록 → 탭하면 즉시 이동
 * 프로덕션 빌드에서는 tree-shaking으로 제거
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@granite-js/react-native';
import { useAuth } from 'stores/AuthContext';
import { colors, typography } from 'styles/tokens';
import { isDevGuardBypassed, setDevGuardBypass } from 'lib/devGuardBypass';
import { getDevPlanOverride, setDevPlanOverride } from 'lib/devPlanOverride';
import { supabase } from 'lib/api/supabase';

const MOCK_USER_EMAIL = 'toss_mockstableuser001@taillog.local';
const MOCK_USER_PASS = 'TestPass1234!';

const DEV_ROUTES = [
  { path: '/onboarding/welcome', label: 'Welcome', group: 'Onboarding' },
  { path: '/onboarding/survey', label: 'Survey', group: 'Onboarding' },
  { path: '/onboarding/survey-result', label: 'Survey Result', group: 'Onboarding' },
  { path: '/onboarding/notification', label: 'Notification', group: 'Onboarding' },
  { path: '/dashboard', label: 'Dashboard', group: 'Main' },
  { path: '/dashboard/quick-log', label: 'Quick Log', group: 'Main' },
  { path: '/dashboard/analysis', label: 'Analysis', group: 'Main' },
  { path: '/coaching/result', label: 'Coaching Result', group: 'Main' },
  { path: '/training/academy', label: 'Academy', group: 'Training' },
  { path: '/training/detail', label: 'Training Detail', group: 'Training' },
  { path: '/dog/profile', label: 'Dog Profile', group: 'Dog' },
  { path: '/dog/add', label: 'Dog Add', group: 'Dog' },
  { path: '/dog/switcher', label: 'Dog Switcher', group: 'Dog' },
  { path: '/settings', label: 'Settings', group: 'Settings' },
  { path: '/settings/subscription', label: 'Subscription', group: 'Settings' },
  { path: '/legal/terms', label: 'Terms', group: 'Legal' },
  { path: '/legal/privacy', label: 'Privacy', group: 'Legal' },
  { path: '/ops/today', label: 'Ops Today', group: 'B2B' },
  { path: '/ops/settings', label: 'Ops Settings', group: 'B2B' },
  { path: '/parent/reports', label: 'Parent Reports', group: 'B2B' },
] as const;

const GROUP_COLORS: Record<string, string> = {
  Auth: colors.red600,
  Onboarding: '#FF8800',
  Main: colors.primaryBlue,
  Training: '#00B386',
  Dog: colors.purple500,
  Settings: '#6B7280',
  Legal: '#9CA3AF',
  B2B: '#EC4899',
};

export function DevMenu() {
  const [visible, setVisible] = useState(false);
  const [guardBypassed, setGuardBypassed] = useState(isDevGuardBypassed());
  const [planOverride, setPlanOverride] = useState<'FREE' | 'PRO_MONTHLY' | null>(
    getDevPlanOverride(),
  );
  const navigation = useNavigation();
  const { user, login } = useAuth();

  const toggleGuardBypass = useCallback(() => {
    const next = !guardBypassed;
    setDevGuardBypass(next);
    setGuardBypassed(next);
  }, [guardBypassed]);

  const cyclePlanOverride = useCallback(() => {
    const cycle: Record<string, 'FREE' | 'PRO_MONTHLY' | null> = {
      FREE: 'PRO_MONTHLY',
      PRO_MONTHLY: null,
    };
    const next = planOverride === null ? 'FREE' : cycle[planOverride] ?? null;
    setDevPlanOverride(next);
    setPlanOverride(next);
  }, [planOverride]);

  const handleMockLogin = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: MOCK_USER_EMAIL,
      password: MOCK_USER_PASS,
    });
    if (error || !data.user) {
      console.error('[DevMenu] mock login failed:', error?.message);
      return;
    }
    const u = data.user;
    const meta = u.user_metadata ?? {};
    login({
      id: u.id,
      toss_user_key: String(meta.toss_user_key ?? u.id),
      role: (meta.role as 'user') ?? 'user',
      status: (meta.status as 'active') ?? 'active',
      pepper_version: Number(meta.pepper_version ?? 1),
      timezone: String(meta.timezone ?? 'Asia/Seoul'),
      last_login_at: u.last_sign_in_at ?? new Date().toISOString(),
      created_at: u.created_at ?? new Date().toISOString(),
      updated_at: u.updated_at ?? new Date().toISOString(),
    });
    setVisible(false);
    navigation.navigate('/dashboard' as never);
  }, [login, navigation]);

  const handleNavigate = useCallback(
    (path: string) => {
      setVisible(false);
      navigation.navigate(path as never);
    },
    [navigation],
  );

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>DEV</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Dev Navigator</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.close}>X</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.infoText}>
              User: {user?.id?.slice(0, 8) ?? 'none'} | Role: {user?.role ?? '-'}
            </Text>
            {!user && (
              <TouchableOpacity
                style={[styles.bypassToggle, { backgroundColor: '#1D4ED8', marginTop: 6 }]}
                onPress={() => { void handleMockLogin(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.bypassToggleText, { color: '#fff' }]}>
                  🔐 Mock Login (mock_stable_user_001)
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.bypassToggle, guardBypassed && styles.bypassToggleActive]}
              onPress={toggleGuardBypass}
              activeOpacity={0.7}
            >
              <Text style={styles.bypassToggleText}>
                {guardBypassed ? '🔓 가드 우회 ON (B2B 접근 가능)' : '🔒 가드 우회 OFF'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bypassToggle, planOverride !== null && styles.bypassToggleActive]}
              onPress={cyclePlanOverride}
              activeOpacity={0.7}
            >
              <Text style={styles.bypassToggleText}>
                {planOverride === 'PRO_MONTHLY'
                  ? '💎 Pro 뷰 ON'
                  : planOverride === 'FREE'
                  ? '🆓 Free 뷰 ON'
                  : '📱 실제 플랜'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list}>
            {DEV_ROUTES.map((route) => (
              <TouchableOpacity
                key={route.path}
                style={styles.item}
                onPress={() => handleNavigate(route.path)}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: GROUP_COLORS[route.group] ?? '#6B7280' },
                  ]}
                >
                  <Text style={styles.badgeText}>{route.group}</Text>
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{route.label}</Text>
                  <Text style={styles.itemPath}>{route.path}</Text>
                </View>
                <Text style={styles.chevron}>{'>'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 9999,
  },
  fabText: { color: colors.white, ...typography.badge, fontWeight: '800' },
  modal: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.subtitle, fontWeight: '700', color: colors.grey950 },
  close: { ...typography.subtitle, fontWeight: '600', color: colors.textSecondary, padding: 4 },
  userInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.devWarningBg,
  },
  infoText: { fontSize: 12, color: colors.devWarningText, fontFamily: 'monospace' },
  bypassToggle: {
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.grey200,
    alignSelf: 'flex-start',
  },
  bypassToggleActive: {
    backgroundColor: colors.badgeGreenBg,
  },
  bypassToggleText: { fontSize: 11, color: colors.grey700, fontWeight: '600' },
  list: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceTertiary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemLabel: { ...typography.bodySmall, fontWeight: '600', color: colors.grey950 },
  itemPath: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  chevron: { ...typography.label, color: colors.textSecondary },
});
