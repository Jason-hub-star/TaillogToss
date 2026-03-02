/**
 * 행동 분석 화면 — SegmentedControl 기간 필터 + 차트 3종 + R2 광고
 * BarChart (일별) + Radar (5축 원인) + Heatmap (요일x시간)
 * 행동별 빈도 목록 + R2 RewardedAdButton
 * Parity: UI-001, LOG-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useLogList } from 'lib/hooks/useLogs';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { ChartWebView } from 'lib/charts/ChartWebView';
import { generateRadarHTML, generateHeatmapHTML, generateBarHTML } from 'lib/charts/generateChartHTML';
import { logsToRadar, logsToHeatmap, logsToDailyBar } from 'lib/charts/transformers';
import { RewardedAdButton } from 'components/shared/ads/RewardedAdButton';
import { SkeletonLoader } from 'components/shared/SkeletonLoader';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import type { ChartPeriod } from 'types/chart';
import type { BehaviorLog } from 'types/log';
import { colors, typography } from 'styles/tokens';

export const Route = createRoute('/dashboard/analysis', {
  component: AnalysisPage,
});

const PERIOD_OPTIONS: { key: ChartPeriod; label: string; days: number }[] = [
  { key: 'weekly', label: '주간', days: 7 },
  { key: 'monthly', label: '월간', days: 30 },
  { key: 'all', label: '전체', days: 365 },
];

/** 카테고리별 빈도 집계 */
function countByCategory(logs: BehaviorLog[]): { label: string; count: number }[] {
  const LABELS: Record<string, string> = {
    barking: '짖음/울음',
    biting: '마운팅',
    jumping: '과잉흥분',
    pulling: '배변문제',
    destructive: '파괴행동',
    anxiety: '분리불안',
    aggression: '공격성',
    other_behavior: '공포/회피',
  };

  const counts: Record<string, number> = {};
  for (const log of logs) {
    const key = log.quick_category ?? log.type_id ?? 'other';
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([key, count]) => ({ label: LABELS[key] ?? key, count }))
    .sort((a, b) => b.count - a.count);
}

/** 기간 필터링 */
function filterByPeriod(logs: BehaviorLog[], days: number): BehaviorLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffTime = cutoff.getTime();
  return logs.filter((l) => new Date(l.occurred_at).getTime() >= cutoffTime);
}

function AnalysisPage() {
  const [period, setPeriod] = useState<ChartPeriod>('weekly');
  const [adUnlocked, setAdUnlocked] = useState(false);
  const { activeDog } = useActiveDog();
  const navigation = useNavigation();
  const { isReady } = usePageGuard({ currentPath: '/dashboard/analysis' });

  const { data: allLogs, isLoading, error, refetch } = useLogList(activeDog?.id);

  const periodConfig = PERIOD_OPTIONS.find((p) => p.key === period)!;
  const filteredLogs = useMemo(
    () => (allLogs ? filterByPeriod(allLogs, periodConfig.days) : []),
    [allLogs, periodConfig.days]
  );

  const barData = useMemo(() => logsToDailyBar(filteredLogs, periodConfig.days), [filteredLogs, periodConfig.days]);
  const radarData = useMemo(() => logsToRadar(filteredLogs), [filteredLogs]);
  const heatmapData = useMemo(() => logsToHeatmap(filteredLogs), [filteredLogs]);
  const categoryFreq = useMemo(() => countByCategory(filteredLogs), [filteredLogs]);

  const barHTML = useMemo(() => generateBarHTML(barData), [barData]);
  const radarHTML = useMemo(() => generateRadarHTML(radarData), [radarData]);
  const heatmapHTML = useMemo(() => generateHeatmapHTML(heatmapData), [heatmapData]);

  const handleAdRewarded = useCallback(() => {
    setAdUnlocked(true);
  }, []);

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
        <View style={styles.placeholder} />
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
        <EmptyState
          title="분석할 기록이 없어요"
          description="기록을 남기면 행동 패턴을 분석해드려요"
          lottie="long-dog"
        />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>일별 기록 건수</Text>
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

          {!adUnlocked && (
            <View style={styles.adSection}>
              <RewardedAdButton
                placement="R2"
                label="상세 분석 보기"
                onRewarded={handleAdRewarded}
              />
            </View>
          )}

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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  placeholder: {
    width: 22,
  },
  segmented: {
    flexDirection: 'row',
    marginHorizontal: 20,
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
    shadowColor: '#000',
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  chartTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    marginTop: 20,
  },
  freqSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  freqTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bottomSpacer: {
    height: 32,
  },
});
