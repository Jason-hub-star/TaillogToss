/**
 * 설정 메인 화면 — 알림/계정/서비스/로그아웃 섹션
 * 와이어프레임 9-9 패턴 A (목록형) 기반.
 * Parity: APP-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { ListLayout } from 'components/shared/layouts/ListLayout';
import { useAuth } from 'stores/AuthContext';
import { useLogout } from 'lib/hooks/useAuth';
import { useUserSettings, useUpdateSettings } from 'lib/hooks/useSettings';
import { withdrawUser } from 'lib/api/auth';
import { APP_VERSION_LABEL } from 'lib/appInfo';
import { BottomNavBar } from 'components/shared/BottomNavBar';
import {
  SettingsPermissionBanner,
  SettingsScreenSkeleton,
  SettingsScreenError,
  NotificationSettingsSection,
  AiCoachingSettingsSection,
  AccountSettingsSection,
  ServiceSettingsSection,
} from 'components/features/settings';
import {
  DEFAULT_NOTIFICATION_PREF,
  DEFAULT_AI_PERSONA,
  type AiPersona,
  type NotificationPref,
  type UserSettings,
} from 'types/settings';
import { colors, typography, spacing } from 'styles/tokens';

export const Route = createRoute('/settings', {
  component: SettingsPage,
  screenOptions: { headerShown: false },
});

function toSettingsErrorMessage(error: unknown): string {
  const maybeError = error as { code?: string; message?: string };
  const code = maybeError?.code;
  const message = maybeError?.message ?? '';

  if (code === '42501' || /row-level security/i.test(message)) {
    return '저장 권한을 확인하지 못했어요. 잠시 후 다시 시도하거나 다시 로그인해주세요.';
  }

  if (/network request failed/i.test(message)) {
    return '네트워크 연결이 불안정해요. 연결 상태를 확인하고 다시 시도해주세요.';
  }

  return '설정을 저장하지 못했어요. 잠시 후 다시 시도해주세요.';
}

function SettingsPage() {
  const { isReady } = usePageGuard({ currentPath: '/settings' });
  const navigation = useNavigation();
  const { user, logout: clearAuthState } = useAuth();
  const { logout } = useLogout();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, isError, refetch } = useUserSettings(user?.id);
  const updateSettings = useUpdateSettings();

  const saveReqSeqRef = useRef(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [notifPref, setNotifPref] = useState<NotificationPref>(
    settings?.notification_pref ?? DEFAULT_NOTIFICATION_PREF,
  );
  const [marketingAgreed, setMarketingAgreed] = useState(settings?.marketing_agreed ?? false);
  const [aiPersona, setAiPersona] = useState(settings?.ai_persona ?? DEFAULT_AI_PERSONA);

  useEffect(() => {
    if (settings?.notification_pref) {
      setNotifPref(settings.notification_pref);
    }
    if (typeof settings?.marketing_agreed === 'boolean') {
      setMarketingAgreed(settings.marketing_agreed);
    }
    if (settings?.ai_persona) {
      setAiPersona(settings.ai_persona);
    }
  }, [settings?.notification_pref, settings?.marketing_agreed, settings?.ai_persona]);

  const applyUpdates = useCallback(
    (updates: Partial<UserSettings>) => {
      if (!user?.id) return;

      const reqSeq = ++saveReqSeqRef.current;
      setSaveError(null);
      updateSettings.mutate(
        { userId: user.id, updates },
        {
          onSuccess: () => {
            if (reqSeq !== saveReqSeqRef.current) return;
            setSaveError(null);
          },
          onError: (error) => {
            if (reqSeq !== saveReqSeqRef.current) return;
            const message = toSettingsErrorMessage(error);
            setSaveError(message);
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

  const toggleImportantNotifications = useCallback(() => {
    const currentlyEnabled =
      notifPref.channels.smart_message &&
      (
        notifPref.types.log_reminder ||
        notifPref.types.surge_alert ||
        notifPref.types.coaching_ready ||
        notifPref.types.training_reminder
      );
    const nextEnabled = !currentlyEnabled;
    const nextPref: NotificationPref = {
      ...notifPref,
      channels: {
        ...notifPref.channels,
        push: nextEnabled,
        smart_message: nextEnabled,
      },
      types: {
        ...notifPref.types,
        log_reminder: nextEnabled,
        surge_alert: nextEnabled,
        coaching_ready: nextEnabled,
        training_reminder: nextEnabled,
      },
    };
    setNotifPref(nextPref);
    saveNotificationPref(nextPref);
  }, [notifPref, saveNotificationPref]);

  const togglePromoNotifications = useCallback(() => {
    const nextEnabled = !(notifPref.types.promo && marketingAgreed);
    const nextPref: NotificationPref = {
      ...notifPref,
      types: {
        ...notifPref.types,
        promo: nextEnabled,
      },
    };
    setNotifPref(nextPref);
    setMarketingAgreed(nextEnabled);
    applyUpdates({
      notification_pref: nextPref,
      marketing_agreed: nextEnabled,
    });
  }, [notifPref, marketingAgreed, applyUpdates]);

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
      '탈퇴하면 모든 데이터가 삭제되고 복구할 수 없어요. 정말 탈퇴할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            try {
              await withdrawUser(user.id); // 내부에서 signOut() 포함
              clearAuthState();            // AuthContext React 상태 초기화
              queryClient.clear();
              navigation.navigate('/onboarding/welcome' as never);
            } catch (error) {
              console.error('[WITHDRAW] 탈퇴 오류:', error);
              const code =
                (error as { message?: string })?.message ?? '알 수 없는 오류';
              Alert.alert('탈퇴하지 못했어요', `잠시 후 다시 시도해주세요.\n(${code})`);
            }
          },
        },
      ],
    );
  }, [user?.id, clearAuthState, queryClient, navigation]);

  const handleOpenDeviceSettings = useCallback(() => {
    void Linking.openSettings().catch(() => {
      Alert.alert('안내', '기기 설정을 열지 못했어요. 설정 앱에서 직접 권한을 확인해주세요.');
    });
  }, []);

  const canGoBack = navigation.canGoBack();
  const onBack = canGoBack ? () => navigation.goBack() : undefined;

  if (!isReady || (isLoading && !settings)) {
    return (
      <ListLayout
        title="설정"
        onBack={onBack}
        style={styles.safe}
        contentContainerStyle={styles.scrollContent}
        footer={<BottomNavBar activeTab="settings" />}
      >
        <SettingsScreenSkeleton />
      </ListLayout>
    );
  }

  if (isError) {
    return (
      <ListLayout
        title="설정"
        onBack={onBack}
        style={styles.safe}
        contentContainerStyle={styles.scrollContent}
        footer={<BottomNavBar activeTab="settings" />}
      >
        <SettingsScreenError onRetry={() => void refetch()} />
      </ListLayout>
    );
  }

  return (
    <ListLayout
      title="설정"
      onBack={onBack}
      style={styles.safe}
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavBar activeTab="settings" />}
    >
        <NotificationSettingsSection
          notifPref={notifPref}
          marketingAgreed={marketingAgreed}
          onToggleImportant={toggleImportantNotifications}
          onTogglePromo={togglePromoNotifications}
        />
        {saveError ? (
          <Text style={styles.saveErrorText}>{saveError}</Text>
        ) : null}

        <SettingsPermissionBanner onOpenSettings={handleOpenDeviceSettings} />

        <AiCoachingSettingsSection
          aiPersona={aiPersona}
          onToggleTone={toggleAiTone}
          onTogglePerspective={toggleAiPerspective}
        />

        <AccountSettingsSection
          onOpenProfile={() => navigation.navigate('/dog/profile' as never)}
          onOpenTerms={() => navigation.navigate('/legal/terms' as never)}
          onOpenPrivacy={() => navigation.navigate('/legal/privacy' as never)}
        />

        <ServiceSettingsSection
          onOpenSubscription={() => navigation.navigate('/settings/subscription' as never)}
          onOpenDogSwitcher={() => navigation.navigate('/dog/switcher' as never)}
        />

        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
            <Text style={styles.dangerText}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} onPress={handleWithdrawal}>
            <Text style={styles.dangerText}>회원탈퇴</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>{APP_VERSION_LABEL}</Text>
    </ListLayout>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.surfaceTertiary },
  scrollContent: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: spacing.xxxl },
  dangerSection: {
    marginTop: 32,
    paddingHorizontal: 20,
    gap: 12,
  },
  saveErrorText: {
    ...typography.caption,
    color: colors.red600,
    marginHorizontal: 20,
    marginTop: 8,
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
});
