/**
 * 행동 분석 화면 — SegmentedControl 기간 필터 + 차트 3종 + 훈련 효과 + 공유
 * BarChart (스마트 집계) + Radar (5축 원인) + Heatmap (요일x시간)
 * 행동별 빈도 목록 + 훈련 효과 + R2 광고 + CoachingPreviewCard
 * Parity: UI-001, LOG-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Share } from 'react-native';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useLogList } from 'lib/hooks/useLogs';
import { useTrainingProgress } from 'lib/hooks/useTraining';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { ChartWebView } from 'lib/charts/ChartWebView';
import { generateRadarHTML, generateHeatmapHTML, generateBarHTML } from 'lib/charts/generateChartHTML';
import { logsToRadar, logsToHeatmap, logsToSmartBar } from 'lib/charts/transformers';
import { filterByPeriod, countByCategory, computeTrainingEffects, buildAnalysisShareText } from 'lib/charts/filters';
import { RewardedAdButton } from 'components/shared/ads/RewardedAdButton';
import { CoachingPreviewCard } from 'components/features/dashboard/CoachingPreviewCard';
import { TrainingEffectCard } from 'components/features/dashboard/TrainingEffectCard';
import { SkeletonLoader } from 'components/shared/SkeletonLoader';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { tracker } from 'lib/analytics/tracker';
import type { ChartPeriod } from 'types/chart';
import { colors, typography, spacing } from 'styles/tokens';

export const Route = createRoute('/dashboard/analysis', {
  component: AnalysisPage,
});

const PERIOD_OPTIONS: { key: ChartPeriod; label: string; days: number }[] = [
  { key: 'weekly', label: '주간', days: 7 },
  { key: 'monthly', label: '월간', days: 30 },
  { key: 'all', label: '전체', days: 99999 },
];

const BAR_TITLE: Record<string, string> = {
  daily: '일별 기록 건수',
  weekly: '주간 기록 건수',
  monthly: '월별 기록 건수',
};

function AnalysisPage() {
  const [period, setPeriod] = useState<ChartPeriod>('weekly');
  const [adUnlocked, setAdUnlocked] = useState(false);
  const { activeDog } = useActiveDog();
  const navigation = useNavigation();
  const { isReady } = usePageGuard({ currentPath: '/dashboard/analysis' });

  const { data: allLogs, isLoading, error, refetch } = useLogList(activeDog?.id);
  const { data: trainingProgress } = useTrainingProgress(activeDog?.id);

  const periodConfig = PERIOD_OPTIONS.find((p) => p.key === period)!;
  const filteredLogs = useMemo(
    () => (allLogs ? filterByPeriod(allLogs, periodConfig.days) : []),
    [allLogs, periodConfig.days]
  );

  const smartBar = useMemo(() => logsToSmartBar(filteredLogs, periodConfig.days), [filteredLogs, periodConfig.days]);
  const radarData = useMemo(() => logsToRadar(filteredLogs), [filteredLogs]);
  const heatmapData = useMemo(() => logsToHeatmap(filteredLogs), [filteredLogs]);
  const categoryFreq = useMemo(() => countByCategory(filteredLogs), [filteredLogs]);

  const trainingEffects = useMemo(
    () => (allLogs && trainingProgress ? computeTrainingEffects(allLogs, trainingProgress) : []),
    [allLogs, trainingProgress]
  );

  const barHTML = useMemo(() => generateBarHTML(smartBar.data), [smartBar.data]);
  const radarHTML = useMemo(() => generateRadarHTML(radarData), [radarData]);
  const heatmapHTML = useMemo(() => generateHeatmapHTML(heatmapData), [heatmapData]);

  const handleAdRewarded = useCallback(() => {
    setAdUnlocked(true);
  }, []);

  const handleShare = useCallback(() => {
    const topBehavior = categoryFreq.length > 0 ? categoryFreq[0]! : null;
    const bestEffect = trainingEffects.length > 0 ? trainingEffects[0]! : null;
    const message = buildAnalysisShareText({
      dogName: activeDog?.name ?? '우리 강아지',
      periodLabel: periodConfig.label,
      totalLogs: filteredLogs.length,
      topBehavior,
      trainingEffect: bestEffect,
    });
    tracker.analysisShared(periodConfig.key, filteredLogs.length);
    void Share.share({ message });
  }, [categoryFreq, trainingEffects, activeDog?.name, periodConfig, filteredLogs.length]);

  if (!isReady) return null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <SkeletonLoader message="행동 데이터를 분석 중이에요" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState onRetry={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.back}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>행동 분석</Text>
        <TouchableOpacity onPress={handleShare} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.shareIcon}>{'\u{1F4E4}'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.segmented}>
        {PERIOD_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.segment, period === opt.key && styles.segmentActive]}
            onPress={() => setPeriod(opt.key)}
          >
            <Text style={[styles.segmentText, period === opt.key && styles.segmentTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="분석할 기록이 없어요"
            description="기록을 남기면 행동 패턴을 분석해드려요"
            lottie="long-dog"
          />
          {allLogs && allLogs.length > 0 && period !== 'all' && (
            <TouchableOpacity style={styles.periodHint} onPress={() => setPeriod('all')} activeOpacity={0.7}>
              <Text style={styles.periodHintText}>
                이 기간에는 기록이 없어요. 전체 기간으로 전환하면 {allLogs.length}건의 기록을 확인할 수 있어요
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>{BAR_TITLE[smartBar.unit]}</Text>
            <ChartWebView type="bar" html={barHTML} height={200} />
          </View>

          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>원인 분석 (5축)</Text>
            <ChartWebView type="radar" html={radarHTML} height={280} />
          </View>

          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>시간대별 밀도</Text>
            <ChartWebView type="heatmap" html={heatmapHTML} height={200} />
          </View>

          <View style={styles.divider} />

          <View style={styles.freqSection}>
            <Text style={styles.freqTitle}>행동별 빈도</Text>
            {categoryFreq.map((item) => (
              <View key={item.label} style={styles.freqRow}>
                <Text style={styles.freqLabel}>{item.label}</Text>
                <Text style={styles.freqCount}>{item.count}회</Text>
              </View>
            ))}
          </View>

          <TrainingEffectCard
            effects={trainingEffects}
            hasTrainingData={!!trainingProgress && trainingProgress.length > 0}
          />

          {!adUnlocked && (
            <View style={styles.adSection}>
              <RewardedAdButton
                placement="R2"
                label="상세 분석 보기"
                onRewarded={handleAdRewarded}
              />
            </View>
          )}

          {/* AI 코칭 CTA — 데이터 기반 */}
          <View style={styles.coachingSection}>
            <Text style={styles.coachingContext}>기록 {filteredLogs.length}건 기반 분석 가능</Text>
            <CoachingPreviewCard
              dogId={activeDog?.id}
              onNavigateToCoaching={() => navigation.navigate('/coaching/result')}
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: 14,
  },
  back: {
    ...typography.pageTitle,
    color: colors.textPrimary,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  shareIcon: {
    fontSize: 20,
  },
  segmented: {
    flexDirection: 'row',
    marginHorizontal: spacing.screenHorizontal,
    backgroundColor: colors.divider,
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: colors.white,
    shadowColor: colors.grey900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    ...typography.detail,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  chartSection: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
  chartTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.screenHorizontal,
  },
  freqSection: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
  freqTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  freqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  freqLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  freqCount: {
    ...typography.bodySmall,
    color: colors.grey700,
    fontWeight: '500',
  },
  adSection: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
  coachingSection: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
  coachingContext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  bottomSpacer: {
    height: 32,
  },
  emptyContainer: {
    flex: 1,
  },
  periodHint: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    backgroundColor: colors.blue50,
    borderRadius: 10,
    padding: spacing.lg,
  },
  periodHintText: {
    ...typography.detail,
    color: colors.blue600,
    textAlign: 'center',
  },
});
