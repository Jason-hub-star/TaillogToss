/**
 * 메인 대시보드 화면 — TabLayout 2탭 (기록/분석)
 * [기록] 탭: DogCard + StreakBanner + ABC LogCard 리스트
 * [분석] 탭: 인라인 요약 카드 + 상세 분석 링크
 * 전역 네비게이션: BottomNavBar (훈련/설정/운영)
 * Parity: UI-001, LOG-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useDashboard } from 'lib/hooks/useDashboard';
import { DogCard } from 'components/features/dashboard/DogCard';
import { StreakBanner } from 'components/features/dashboard/StreakBanner';
import { LogCard } from 'components/features/log/LogCard';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { TabLayout } from 'components/shared/layouts/TabLayout';
import { BottomNavBar } from 'components/shared/BottomNavBar';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { SkeletonDashboard } from 'components/features/dashboard/SkeletonDashboard';
import { CoachingPreviewCard } from 'components/features/dashboard/CoachingPreviewCard';
import type { BehaviorLog } from 'types/log';
import { colors, typography, spacing } from 'styles/tokens';

export const Route = createRoute('/dashboard', {
  component: DashboardPage,
});

/** 최근 7일 기록에서 카테고리별 Top 3 집계 */
function computeAnalysisSummary(logs: BehaviorLog[]) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = logs.filter((l) => new Date(l.occurred_at).getTime() >= sevenDaysAgo);
  const counts = new Map<string, number>();
  for (const log of recent) {
    const cat = log.quick_category ?? log.type_id ?? 'other';
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return { totalCount: recent.length, topCategories: sorted.slice(0, 3) };
}

const CATEGORY_LABELS: Record<string, string> = {
  barking: '짖기', biting: '물기', jumping: '뛰기', pulling: '당기기',
  destructive: '파괴', anxiety: '불안', aggression: '공격', other_behavior: '기타',
  walk: '산책', meal: '식사', training: '훈련', play: '놀이', rest: '휴식', grooming: '미용',
  manual: '상세기록',
};

function toLocalDateKey(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function DashboardPage() {
  const { activeDog, dogs } = useActiveDog();
  const navigation = useNavigation();
  const { isReady } = usePageGuard({ currentPath: '/dashboard' });

  const today = useMemo(() => toLocalDateKey(new Date()), []);
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboard(activeDog?.id);

  const recentLogs = dashboardData?.recentLogs ?? [];
  const totalLogs = dashboardData?.stats.total_logs ?? recentLogs.length;
  const displayDog = activeDog
    ? {
        id: activeDog.id,
        name: activeDog.name,
        breed: activeDog.breed,
        profile_image_url: activeDog.profile_image_url,
        birth_date: activeDog.birth_date,
        sex: activeDog.sex,
      }
    : dashboardData?.dogProfile
      ? {
          id: dashboardData.dogProfile.id,
          name: dashboardData.dogProfile.name,
          breed: dashboardData.dogProfile.breed ?? '',
          profile_image_url: dashboardData.dogProfile.profile_image_url,
          birth_date: dashboardData.dogProfile.age_months
            ? new Date(Date.now() - dashboardData.dogProfile.age_months * 30.44 * 24 * 60 * 60 * 1000)
                .toISOString().slice(0, 10)
            : null,
          sex: 'MALE' as const,
        }
      : null;

  const todayLogCount = useMemo(() => {
    if (!recentLogs.length) return 0;
    return recentLogs.filter((l) => toLocalDateKey(l.occurred_at) === today).length;
  }, [recentLogs, today]);

  const analysisSummary = useMemo(() => computeAnalysisSummary(recentLogs), [recentLogs]);

  const handleQuickLog = useCallback(() => {
    navigation.navigate('/dashboard/quick-log');
  }, [navigation]);

  const recordContent = (
    <View style={styles.tabContent}>
      {displayDog && (
        <DogCard
          dog={displayDog}
          todayLogCount={todayLogCount}
          onPress={activeDog ? () => navigation.navigate('/dog/profile') : undefined}
          onSwitchPress={dogs.length > 1 ? () => navigation.navigate('/dog/switcher') : undefined}
        />
      )}

      <StreakBanner logs={recentLogs} streakOverride={dashboardData?.stats.current_streak} />

      {dashboardLoading && <SkeletonDashboard />}

      {dashboardError && (
        <ErrorState onRetry={() => { void refetchDashboard(); }} />
      )}

      {!dashboardLoading && !dashboardError && totalLogs === 0 && (
        <EmptyState
          title="첫 기록을 남겨보세요"
          description="아래 버튼으로 간단하게 시작해요"
          lottie="long-dog"
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

      {/* 빠른 기록 CTA */}
      <View style={styles.bottomCTA}>
        <TouchableOpacity style={styles.ctaButton} onPress={handleQuickLog} activeOpacity={0.8}>
          <Text style={styles.ctaText}>+ 빠른 기록</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const analysisContent = (
    <View style={styles.tabContent}>
      {/* 인라인 요약 카드 */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>최근 7일 요약</Text>
        <Text style={styles.summaryCount}>
          총 {analysisSummary.totalCount}건 기록
        </Text>
        {analysisSummary.topCategories.length > 0 && (
          <View style={styles.topList}>
            {analysisSummary.topCategories.map(([cat, count], i) => (
              <View key={cat} style={styles.topItem}>
                <Text style={styles.topRank}>{i + 1}</Text>
                <Text style={styles.topLabel}>{CATEGORY_LABELS[cat] ?? cat}</Text>
                <Text style={styles.topCount}>{count}건</Text>
              </View>
            ))}
          </View>
        )}
        {analysisSummary.totalCount === 0 && (
          <Text style={styles.summaryEmpty}>아직 기록이 없어요. 기록을 시작해보세요!</Text>
        )}
      </View>

      {/* 코칭 프리뷰 카드 */}
      <CoachingPreviewCard
        dogId={activeDog?.id}
        onNavigateToCoaching={() => navigation.navigate('/coaching/result')}
      />

      {/* 상세 분석 링크 */}
      <TouchableOpacity
        style={styles.analysisLink}
        onPress={() => navigation.navigate('/dashboard/analysis')}
        activeOpacity={0.7}
      >
        <Text style={styles.analysisIcon}>{'\uD83D\uDCCA'}</Text>
        <Text style={styles.analysisText}>상세 분석 보기</Text>
        <Text style={styles.analysisArrow}>{'\u2192'}</Text>
      </TouchableOpacity>
    </View>
  );

  const tabs = useMemo(() => [
    { key: 'record', label: '기록', content: recordContent },
    { key: 'analysis', label: '분석', content: analysisContent },
  ], [recordContent, analysisContent]);

  if (!isReady) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.body}>
          <TabLayout title="테일로그" tabs={tabs} defaultTab="record" />
        </View>
        <BottomNavBar activeTab="home" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
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
  logListHeader: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  logListTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bottomCTA: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ctaButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  ctaText: {
    color: colors.white,
    ...typography.label,
    fontWeight: '600',
  },
  // Analysis tab — inline summary
  summaryCard: {
    margin: spacing.screenHorizontal,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: spacing.screenHorizontal,
  },
  summaryTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  summaryCount: {
    ...typography.sectionTitle,
    fontWeight: '700',
    color: colors.primaryBlue,
    marginBottom: spacing.lg,
  },
  summaryEmpty: {
    ...typography.detail,
    color: colors.textSecondary,
  },
  topList: {
    gap: spacing.sm,
  },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topRank: {
    ...typography.detail,
    fontWeight: '700',
    color: colors.primaryBlue,
    width: 20,
  },
  topLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  topCount: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  analysisLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.divider,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.lg,
  },
  analysisIcon: {
    ...typography.sectionTitle,
    marginRight: spacing.sm,
  },
  analysisText: {
    ...typography.label,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  analysisArrow: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
});
