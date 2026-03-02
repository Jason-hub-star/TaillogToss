/**
 * 설정 메인 화면 — 알림/계정/서비스/로그아웃 섹션
 * 와이어프레임 9-9 패턴 A (목록형) 기반.
 * Parity: APP-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useAuth } from 'stores/AuthContext';
import { useLogout } from 'lib/hooks/useAuth';
import { useUserSettings, useUpdateSettings } from 'lib/hooks/useSettings';
import { withdrawUser } from 'lib/api/auth';
import { BottomNavBar } from 'components/shared/BottomNavBar';
import {
  SettingsSectionCard,
  SettingsToggleRow,
  SettingsNavRow,
  SettingsStatusRow,
  SettingsPermissionBanner,
  SettingsStepperRow,
  SettingsScreenSkeleton,
  SettingsScreenError,
} from 'components/features/settings';
import {
  DEFAULT_NOTIFICATION_PREF,
  DEFAULT_AI_PERSONA,
  type AiPersona,
  type NotificationPref,
  type UserSettings,
} from 'types/settings';
import { colors, typography } from 'styles/tokens';

export const Route = createRoute('/settings', {
  component: SettingsPage,
});

type StatusTone = 'neutral' | 'success' | 'danger';

function toSettingsErrorMessage(error: unknown): string {
  const maybeError = error as { code?: string; message?: string };
  const code = maybeError?.code;
  const message = maybeError?.message ?? '';

  if (code === '42501' || /row-level security/i.test(message)) {
    return '권한 정책 문제로 저장에 실패했어요. 잠시 후 다시 시도하거나 다시 로그인해주세요.';
  }

  if (/network request failed/i.test(message)) {
    return '네트워크 연결이 불안정해요. 연결 상태를 확인하고 다시 시도해주세요.';
  }

  return '설정을 저장하지 못했어요. 잠시 후 다시 시도해주세요.';
}

function formatSavedTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function SettingsPage() {
  const { isReady } = usePageGuard({ currentPath: '/settings' });
  const navigation = useNavigation();
  const { user } = useAuth();
  const { logout } = useLogout();

  const { data: settings, isLoading, isError, refetch } = useUserSettings(user?.id);
  const updateSettings = useUpdateSettings();

  const saveReqSeqRef = useRef(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [syncPhase, setSyncPhase] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  const [notifPref, setNotifPref] = useState<NotificationPref>(
    settings?.notification_pref ?? DEFAULT_NOTIFICATION_PREF,
  );
  const [aiPersona, setAiPersona] = useState(settings?.ai_persona ?? DEFAULT_AI_PERSONA);

  useEffect(() => {
    if (settings?.notification_pref) {
      setNotifPref(settings.notification_pref);
    }
    if (settings?.ai_persona) {
      setAiPersona(settings.ai_persona);
    }
  }, [settings?.notification_pref, settings?.ai_persona]);

  const applyUpdates = useCallback(
    (updates: Partial<UserSettings>) => {
      if (!user?.id) return;

      const reqSeq = ++saveReqSeqRef.current;
      setSaveError(null);
      setSyncPhase('saving');
      updateSettings.mutate(
        { userId: user.id, updates },
        {
          onSuccess: () => {
            if (reqSeq !== saveReqSeqRef.current) return;
            setLastSavedAt(new Date().toISOString());
            setSyncPhase('saved');
          },
          onError: (error) => {
            if (reqSeq !== saveReqSeqRef.current) return;
            const message = toSettingsErrorMessage(error);
            setSaveError(message);
            setSyncPhase('failed');
          },
        },
      );
    },
    [user?.id, updateSettings],
  );

  const saveNotificationPref = useCallback(
    (nextPref: NotificationPref) => {
      applyUpdates({ notification_pref: nextPref });
    },
    [applyUpdates],
  );

  const toggleChannel = useCallback(
    (key: 'push' | 'smart_message') => {
      const nextPref: NotificationPref = {
        ...notifPref,
        channels: {
          ...notifPref.channels,
          [key]: !notifPref.channels[key],
        },
      };
      setNotifPref(nextPref);
      saveNotificationPref(nextPref);
    },
    [notifPref, saveNotificationPref],
  );

  const toggleType = useCallback(
    (key: keyof NotificationPref['types']) => {
      const nextPref: NotificationPref = {
        ...notifPref,
        types: {
          ...notifPref.types,
          [key]: !notifPref.types[key],
        },
      };
      setNotifPref(nextPref);
      saveNotificationPref(nextPref);
    },
    [notifPref, saveNotificationPref],
  );

  const toggleQuietHoursEnabled = useCallback(() => {
    const nextPref: NotificationPref = {
      ...notifPref,
      quiet_hours: {
        ...notifPref.quiet_hours,
        enabled: !notifPref.quiet_hours.enabled,
      },
    };
    setNotifPref(nextPref);
    saveNotificationPref(nextPref);
  }, [notifPref, saveNotificationPref]);

  const shiftQuietHour = useCallback(
    (key: 'start_hour' | 'end_hour', delta: 1 | -1) => {
      const current = notifPref.quiet_hours[key];
      const next = (current + delta + 24) % 24;
      const nextPref: NotificationPref = {
        ...notifPref,
        quiet_hours: {
          ...notifPref.quiet_hours,
          [key]: next,
        },
      };
      setNotifPref(nextPref);
      saveNotificationPref(nextPref);
    },
    [notifPref, saveNotificationPref],
  );

  const toggleAiTone = useCallback(() => {
    const nextPersona: AiPersona = {
      ...aiPersona,
      tone: aiPersona.tone === 'empathetic' ? 'solution' : 'empathetic',
    };
    setAiPersona(nextPersona);
    applyUpdates({ ai_persona: nextPersona });
  }, [aiPersona, applyUpdates]);

  const toggleAiPerspective = useCallback(() => {
    const nextPersona: AiPersona = {
      ...aiPersona,
      perspective: aiPersona.perspective === 'coach' ? 'dog' : 'coach',
    };
    setAiPersona(nextPersona);
    applyUpdates({ ai_persona: nextPersona });
  }, [aiPersona, applyUpdates]);

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

  const handleOpenDeviceSettings = useCallback(() => {
    void Linking.openSettings().catch(() => {
      Alert.alert('안내', '기기 설정을 열지 못했어요. 설정 앱에서 직접 권한을 확인해주세요.');
    });
  }, []);

  const syncStatus = useMemo<{ text: string; tone: StatusTone }>(() => {
    if (syncPhase === 'saving') return { text: '동기화 중...', tone: 'neutral' };
    if (syncPhase === 'failed' && saveError) return { text: '동기화 실패', tone: 'danger' };
    if (lastSavedAt) return { text: `${formatSavedTime(lastSavedAt)} 저장됨`, tone: 'success' };
    return { text: '동기화 대기', tone: 'neutral' };
  }, [syncPhase, saveError, lastSavedAt]);

  if (!isReady) return null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar onBack={() => navigation.goBack()} />
        <SettingsScreenSkeleton />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar onBack={() => navigation.goBack()} />
        <SettingsScreenError onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll}>
        <SettingsSectionCard title="알림 설정">
          <SettingsStatusRow statusText={syncStatus.text} tone={syncStatus.tone} />
          <View style={styles.divider} />

          <SettingsToggleRow
            label="푸시 알림"
            value={notifPref.channels.push}
            onToggle={() => toggleChannel('push')}
          />
          <View style={styles.divider} />
          <SettingsToggleRow
            label="스마트 메시지"
            value={notifPref.channels.smart_message}
            onToggle={() => toggleChannel('smart_message')}
          />
          <View style={styles.divider} />
          <SettingsToggleRow
            label="기록 리마인더"
            value={notifPref.types.log_reminder}
            onToggle={() => toggleType('log_reminder')}
          />
          <View style={styles.divider} />
          <SettingsToggleRow
            label="행동 급증 알림"
            description="평소보다 문제 행동 기록이 늘면 알려드려요."
            value={notifPref.types.surge_alert}
            onToggle={() => toggleType('surge_alert')}
          />
          <View style={styles.divider} />
          <SettingsToggleRow
            label="코칭 완료 알림"
            value={notifPref.types.coaching_ready}
            onToggle={() => toggleType('coaching_ready')}
          />
          <View style={styles.divider} />
          <SettingsToggleRow
            label="훈련 리마인더"
            value={notifPref.types.training_reminder}
            onToggle={() => toggleType('training_reminder')}
          />
          <View style={styles.divider} />
          <SettingsToggleRow
            label="프로모션 알림"
            value={notifPref.types.promo}
            onToggle={() => toggleType('promo')}
          />
          <View style={styles.divider} />
          <SettingsToggleRow
            label="방해 금지 시간"
            value={notifPref.quiet_hours.enabled}
            onToggle={toggleQuietHoursEnabled}
          />
          <View style={styles.divider} />
          <SettingsStepperRow
            label="시작 시간"
            value={notifPref.quiet_hours.start_hour}
            onDecrease={() => shiftQuietHour('start_hour', -1)}
            onIncrease={() => shiftQuietHour('start_hour', 1)}
            disabled={!notifPref.quiet_hours.enabled}
          />
          <View style={styles.divider} />
          <SettingsStepperRow
            label="종료 시간"
            value={notifPref.quiet_hours.end_hour}
            onDecrease={() => shiftQuietHour('end_hour', -1)}
            onIncrease={() => shiftQuietHour('end_hour', 1)}
            disabled={!notifPref.quiet_hours.enabled}
          />
        </SettingsSectionCard>

        <SettingsPermissionBanner onOpenSettings={handleOpenDeviceSettings} />

        <SettingsSectionCard title="AI 코칭">
          <SettingsNavRow
            label="코칭 톤"
            rightLabel={aiPersona.tone === 'empathetic' ? '공감형' : '솔루션형'}
            onPress={toggleAiTone}
          />
          <View style={styles.divider} />
          <SettingsNavRow
            label="코칭 관점"
            rightLabel={aiPersona.perspective === 'coach' ? '코치 관점' : '강아지 관점'}
            onPress={toggleAiPerspective}
          />
        </SettingsSectionCard>

        <SettingsSectionCard title="계정">
          <SettingsNavRow
            label="프로필 편집"
            onPress={() => navigation.navigate('/dog/profile' as never)}
          />
          <View style={styles.divider} />
          <SettingsNavRow
            label="이용약관"
            onPress={() => navigation.navigate('/legal/terms' as never)}
          />
          <View style={styles.divider} />
          <SettingsNavRow
            label="개인정보 처리방침"
            onPress={() => navigation.navigate('/legal/privacy' as never)}
          />
        </SettingsSectionCard>

        <SettingsSectionCard title="서비스">
          <SettingsNavRow
            label="구독 관리"
            onPress={() => navigation.navigate('/settings/subscription' as never)}
          />
          <View style={styles.divider} />
          <SettingsNavRow
            label="내 반려견"
            onPress={() => navigation.navigate('/dog/profile' as never)}
          />
          <View style={styles.divider} />
          <SettingsNavRow label="기기 알림 권한" onPress={handleOpenDeviceSettings} />
        </SettingsSectionCard>

        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
            <Text style={styles.dangerText}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} onPress={handleWithdrawal}>
            <Text style={styles.dangerText}>회원탈퇴</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>v0.1.0</Text>
        <View style={styles.bottomSpacer} />
      </ScrollView>
      <BottomNavBar activeTab="settings" />
    </SafeAreaView>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.navbar}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>{'←'}</Text>
      </TouchableOpacity>
      <Text style={styles.navTitle}>설정</Text>
      <View style={styles.backButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceTertiary },
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
