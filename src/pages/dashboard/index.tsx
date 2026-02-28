/**
 * 메인 대시보드 화면 — TabLayout 3탭 (기록/분석/훈련)
 * [기록] 탭: DogCard + StreakBanner + ABC LogCard 리스트
 * [분석] 탭 클릭 → /dashboard/analysis 페이지 이동
 * [훈련] 탭 → Phase 8 EmptyState
 * Parity: UI-001, LOG-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useAuth } from 'stores/AuthContext';
import { isB2BRole } from 'stores/OrgContext';
import { useDashboard } from 'lib/hooks/useDashboard';
import { useDailyLogs } from 'lib/hooks/useLogs';
import { DogCard } from 'components/features/dashboard/DogCard';
import { StreakBanner } from 'components/features/dashboard/StreakBanner';
import { LogCard } from 'components/features/log/LogCard';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { TabLayout } from 'components/shared/layouts/TabLayout';
import { usePageGuard } from 'lib/hooks/usePageGuard';

export const Route = createRoute('/dashboard', {
  component: DashboardPage,
});

function DashboardPage() {
  const { activeDog } = useActiveDog();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { isReady } = usePageGuard({ currentPath: '/dashboard' });
  const showOpsTab = isB2BRole(user?.role);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboard(activeDog?.id);
  const { data: todayLogs } = useDailyLogs(activeDog?.id, today);
  const recentLogs = dashboardData?.recentLogs ?? [];
  const totalLogs = dashboardData?.stats.total_logs ?? recentLogs.length;
  const displayDog = activeDog
    ? { id: activeDog.id, name: activeDog.name, breed: activeDog.breed }
    : dashboardData?.dogProfile
      ? {
          id: dashboardData.dogProfile.id,
          name: dashboardData.dogProfile.name,
          breed: dashboardData.dogProfile.breed ?? '',
        }
      : null;

  const handleQuickLog = useCallback(() => {
    navigation.navigate('/dashboard/quick-log');
  }, [navigation]);

  const recordContent = (
    <View style={styles.tabContent}>
      {displayDog && (
        <DogCard
          dog={displayDog}
          todayLogCount={todayLogs?.length ?? 0}
          onPress={activeDog ? () => navigation.navigate('/dog/profile') : undefined}
        />
      )}

      <StreakBanner logs={recentLogs} streakOverride={dashboardData?.stats.current_streak} />

      {dashboardLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0064FF" />
        </View>
      )}

      {dashboardError && (
        <ErrorState onRetry={() => { void refetchDashboard(); }} />
      )}

      {!dashboardLoading && !dashboardError && totalLogs === 0 && (
        <EmptyState
          title="아직 기록이 없어요"
          description="아래 버튼으로 첫 기록을 남겨보세요"
          icon={'\uD83D\uDCDD'}
        />
      )}

      {!dashboardLoading && !dashboardError && totalLogs > 0 && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.logListHeader}>
            <Text style={styles.logListTitle}>최근 기록</Text>
          </View>
          {recentLogs.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </ScrollView>
      )}
    </View>
  );

  const analysisContent = (
    <View style={styles.center}>
      <TouchableOpacity style={styles.analysisLink} onPress={() => navigation.navigate('/dashboard/analysis')} activeOpacity={0.7}>
        <Text style={styles.analysisIcon}>{'\uD83D\uDCCA'}</Text>
        <Text style={styles.analysisText}>행동 분석 보기</Text>
        <Text style={styles.analysisArrow}>{'\u2192'}</Text>
      </TouchableOpacity>
    </View>
  );

  const trainingContent = (
    <View style={styles.center}>
      <TouchableOpacity
        style={styles.analysisLink}
        onPress={() => navigation.navigate('/training/academy')}
        activeOpacity={0.7}
      >
        <Text style={styles.analysisIcon}>{'\uD83C\uDF93'}</Text>
        <Text style={styles.analysisText}>훈련 아카데미로 이동</Text>
        <Text style={styles.analysisArrow}>{'\u2192'}</Text>
      </TouchableOpacity>
    </View>
  );

  const opsContent = (
    <View style={styles.center}>
      <TouchableOpacity
        style={styles.analysisLink}
        onPress={() => navigation.navigate('/ops/today')}
        activeOpacity={0.7}
      >
        <Text style={styles.analysisIcon}>{'\uD83D\uDCCB'}</Text>
        <Text style={styles.analysisText}>운영 대시보드로 이동</Text>
        <Text style={styles.analysisArrow}>{'\u2192'}</Text>
      </TouchableOpacity>
    </View>
  );

  const tabs = useMemo(() => {
    const base = [
      { key: 'record', label: '기록', content: recordContent },
      { key: 'analysis', label: '분석', content: analysisContent },
      { key: 'training', label: '훈련', content: trainingContent },
    ];
    if (showOpsTab) {
      base.push({ key: 'ops', label: '운영', content: opsContent });
    }
    return base;
  }, [recordContent, analysisContent, trainingContent, showOpsTab, opsContent]);

  if (!isReady) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.body}>
          <TabLayout title="테일로그" tabs={tabs} defaultTab="record" />
        </View>
        <View style={styles.bottomCTA}>
          <TouchableOpacity style={styles.ctaButton} onPress={handleQuickLog} activeOpacity={0.8}>
            <Text style={styles.ctaText}>+ 빠른 기록</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  logListHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202632',
  },
  analysisLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  analysisIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  analysisText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202632',
    flex: 1,
  },
  analysisArrow: {
    fontSize: 18,
    color: '#8B95A1',
  },
  bottomCTA: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E8EB',
  },
  ctaButton: {
    backgroundColor: '#0064FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
