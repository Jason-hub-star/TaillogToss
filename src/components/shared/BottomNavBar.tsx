/**
 * BottomNavBar — 전역 하단 네비게이션 (B2C 3탭, B2B 4탭)
 * SafeAreaView 하단 인셋을 내부에서 처리
 * Parity: UI-001, B2B-001
 */
import React, { useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@granite-js/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from 'stores/AuthContext';
import { useActiveDog } from 'stores/ActiveDogContext';
import { isB2BRole } from 'stores/OrgContext';
import { queryKeys } from 'lib/api/queryKeys';
import { queryPolicy } from 'lib/api/queryConfig';
import { getDashboard } from 'lib/api/dashboard';
import { getTrainingProgress } from 'lib/api/training';
import { colors, typography, spacing } from '../../styles/tokens';
import { ICONS } from 'lib/data/iconSources';

export type NavTab = 'home' | 'ops' | 'training' | 'settings';

interface TabConfig {
  key: NavTab;
  label: string;
  icon: string;
  route: string;
}

const B2C_TABS: TabConfig[] = [
  { key: 'home', label: '홈', icon: ICONS['ic-home']!, route: '/dashboard' },
  { key: 'training', label: '훈련', icon: ICONS['ic-training']!, route: '/training/academy' },
  { key: 'settings', label: '설정', icon: ICONS['ic-settings']!, route: '/settings' },
];

const B2B_TABS: TabConfig[] = [
  { key: 'home', label: '홈', icon: ICONS['ic-home']!, route: '/dashboard' },
  { key: 'ops', label: '운영', icon: ICONS['ic-ops']!, route: '/ops/today' },
  { key: 'training', label: '훈련', icon: ICONS['ic-training']!, route: '/training/academy' },
  { key: 'settings', label: '설정', icon: ICONS['ic-settings']!, route: '/settings' },
];

const BOTTOM_NAV_ICON_SIZE = 30;

interface BottomNavBarProps {
  activeTab: NavTab;
}

export function BottomNavBar({ activeTab }: BottomNavBarProps) {
  const { user } = useAuth();
  const { activeDog } = useActiveDog();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const tabs = isB2BRole(user?.role) ? B2B_TABS : B2C_TABS;

  const handlePress = useCallback(
    (tab: TabConfig) => {
      if (tab.key === activeTab) return;

      // 탭 전환 전 target 페이지 데이터 prefetch
      const dogId = activeDog?.id;
      if (dogId) {
        if (tab.key === 'home') {
          void qc.prefetchQuery({
            queryKey: queryKeys.dashboard.detail(dogId),
            queryFn: () => getDashboard(dogId),
            ...queryPolicy.short,
          });
        } else if (tab.key === 'training') {
          void qc.prefetchQuery({
            queryKey: queryKeys.training.progress(dogId),
            queryFn: () => getTrainingProgress(dogId),
            ...queryPolicy.active,
          });
        }
      }

      navigation.navigate(tab.route as '/dashboard');
    },
    [activeTab, navigation, activeDog?.id, qc],
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => handlePress(tab)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: tab.icon }} style={styles.iconImg} resizeMode="contain" />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* 하단 safe area 여백 */}
      <View style={styles.bottomInset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  iconImg: {
    width: BOTTOM_NAV_ICON_SIZE,
    height: BOTTOM_NAV_ICON_SIZE,
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.detail,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.primaryBlue,
    fontWeight: '600',
  },
  bottomInset: {
    height: 20,
  },
});
