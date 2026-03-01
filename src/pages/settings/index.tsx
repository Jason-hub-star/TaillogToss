/**
 * 설정 메인 화면 — 알림/계정/서비스/로그아웃 4섹션 리스트
 * 와이어프레임 9-9 패턴 A (목록형) 기준.
 * Parity: APP-001, IAP-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useAuth } from 'stores/AuthContext';
import { useLogout } from 'lib/hooks/useAuth';
import { useUserSettings, useUpdateSettings } from 'lib/hooks/useSettings';
import { withdrawUser } from 'lib/api/auth';
import { ErrorState } from 'components/tds-ext';
import { BottomNavBar } from 'components/shared/BottomNavBar';
import { DEFAULT_NOTIFICATION_PREF } from 'types/settings';
import { colors, typography } from 'styles/tokens';

export const Route = createRoute('/settings', {
  component: SettingsPage,
});

function SettingsPage() {
  const { isReady } = usePageGuard({ currentPath: '/settings' });
  const navigation = useNavigation();
  const { user } = useAuth();
  const { logout } = useLogout();
  const { data: settings, isLoading, isError, refetch } = useUserSettings(user?.id);
  const updateSettings = useUpdateSettings();

  const notifPref = settings?.notification_pref ?? DEFAULT_NOTIFICATION_PREF;

  const toggleNotif = useCallback(
    (key: 'push' | 'training_reminder' | 'coaching_ready') => {
      if (!user?.id) return;
      const updatedPref = { ...notifPref };
      if (key === 'push') {
        updatedPref.channels = { ...updatedPref.channels, push: !updatedPref.channels.push };
      } else {
        updatedPref.types = { ...updatedPref.types, [key]: !updatedPref.types[key] };
      }
      updateSettings.mutate({ userId: user.id, updates: { notification_pref: updatedPref } });
    },
    [user?.id, notifPref, updateSettings],
  );

  const handleLogout = useCallback(() => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  }, [logout]);

  const handleWithdrawal = useCallback(() => {
    Alert.alert(
      '회원탈퇴',
      '탈퇴하면 모든 데이터가 삭제되며 복구할 수 없습니다. 정말 탈퇴하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            try {
              await withdrawUser(user.id);
            } catch {
              Alert.alert('오류', '탈퇴 처리 중 문제가 발생했습니다. 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  }, [user?.id]);

  if (!isReady) return null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{'←'}</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>설정</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{'←'}</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>설정</Text>
          <View style={styles.backButton} />
        </View>
        <ErrorState onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>설정</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scroll}>
        {/* 알림 설정 */}
        <Text style={styles.sectionHeader}>알림 설정</Text>
        <View style={styles.section}>
          <SettingRow
            label="푸시 알림"
            value={notifPref.channels.push}
            onToggle={() => toggleNotif('push')}
          />
          <View style={styles.divider} />
          <SettingRow
            label="훈련 리마인더"
            value={notifPref.types.training_reminder}
            onToggle={() => toggleNotif('training_reminder')}
          />
          <View style={styles.divider} />
          <SettingRow
            label="코칭 알림"
            value={notifPref.types.coaching_ready}
            onToggle={() => toggleNotif('coaching_ready')}
          />
        </View>

        {/* 계정 */}
        <Text style={styles.sectionHeader}>계정</Text>
        <View style={styles.section}>
          <NavRow label="프로필 편집" onPress={() => navigation.navigate('/dog/profile' as never)} />
          <View style={styles.divider} />
          <NavRow label="이용약관" onPress={() => navigation.navigate('/legal/terms' as never)} />
          <View style={styles.divider} />
          <NavRow
            label="개인정보 처리방침"
            onPress={() => navigation.navigate('/legal/privacy' as never)}
          />
        </View>

        {/* 서비스 */}
        <Text style={styles.sectionHeader}>서비스</Text>
        <View style={styles.section}>
          <NavRow
            label="구독 관리"
            onPress={() => navigation.navigate('/settings/subscription' as never)}
          />
          <View style={styles.divider} />
          <NavRow
            label="내 반려견"
            onPress={() => navigation.navigate('/dog/profile' as never)}
          />
        </View>

        {/* 로그아웃/탈퇴 */}
        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
            <Text style={styles.dangerText}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} onPress={handleWithdrawal}>
            <Text style={styles.dangerText}>회원탈퇴</Text>
          </TouchableOpacity>
        </View>

        {/* 앱 정보 */}
        <Text style={styles.versionText}>v0.1.0</Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
      <BottomNavBar activeTab="settings" />
    </SafeAreaView>
  );
}

/** 토글 스위치가 있는 설정 행 */
function SettingRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primaryBlue }}
        thumbColor={colors.white}
      />
    </View>
  );
}

/** 네비게이션 화살표가 있는 설정 행 */
function NavRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.chevron}>{'›'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceTertiary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceTertiary,
  },
  backButton: { width: 40 },
  backText: { ...typography.sectionTitle, color: colors.grey950 },
  navTitle: { ...typography.body, fontWeight: '600', color: colors.grey950 },
  scroll: { flex: 1 },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  section: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.surfaceTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowLabel: { ...typography.label, color: colors.grey950 },
  chevron: { ...typography.sectionTitle, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.surfaceTertiary, marginLeft: 20 },
  dangerSection: {
    marginTop: 32,
    paddingHorizontal: 20,
    gap: 12,
  },
  dangerButton: {
    paddingVertical: 8,
  },
  dangerText: {
    ...typography.bodySmall,
    color: colors.red600,
  },
  versionText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
  bottomSpacer: { height: 48 },
});
