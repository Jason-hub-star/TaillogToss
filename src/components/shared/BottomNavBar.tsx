/**
 * BottomNavBar — 전역 하단 네비게이션 (B2C 3탭, B2B 4탭)
 * SafeAreaView 하단 인셋을 내부에서 처리
 * Parity: UI-001, B2B-001
 */
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@granite-js/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from 'stores/AuthContext';
import { useActiveDog } from 'stores/ActiveDogContext';
import { isB2BRole } from 'stores/OrgContext';
import { queryKeys } from 'lib/api/queryKeys';
import { getDashboard } from 'lib/api/dashboard';
import { getTrainingProgress } from 'lib/api/training';
import { colors, typography, spacing } from '../../styles/tokens';

const PREFETCH_STALE_TIME = 2 * 60 * 1000; // 2분 이내 fetch된 데이터는 skip

export type NavTab = 'home' | 'ops' | 'training' | 'settings';

interface TabConfig {
  key: NavTab;
  label: string;
  icon: string;
  route: string;
}

const B2C_TABS: TabConfig[] = [
  { key: 'home', label: '홈', icon: '\uD83C\uDFE0', route: '/dashboard' },
  { key: 'training', label: '훈련', icon: '\uD83C\uDF93', route: '/training/academy' },
  { key: 'settings', label: '설정', icon: '\u2699\uFE0F', route: '/settings' },
];

const B2B_TABS: TabConfig[] = [
  { key: 'home', label: '홈', icon: '\uD83C\uDFE0', route: '/dashboard' },
  { key: 'ops', label: '운영', icon: '\uD83D\uDCCB', route: '/ops/today' },
  { key: 'training', label: '훈련', icon: '\uD83C\uDF93', route: '/training/academy' },
  { key: 'settings', label: '설정', icon: '\u2699\uFE0F', route: '/settings' },
];

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
            staleTime: PREFETCH_STALE_TIME,
          });
        } else if (tab.key === 'training') {
          void qc.prefetchQuery({
            queryKey: queryKeys.training.progress(dogId),
            queryFn: () => getTrainingProgress(dogId),
            staleTime: PREFETCH_STALE_TIME,
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
              <Text style={styles.icon}>{tab.icon}</Text>
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
  icon: {
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 2,
  },
  label: {
    ...typography.caption,
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
