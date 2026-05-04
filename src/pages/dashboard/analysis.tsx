/**
 * 행동 분석 화면 — SegmentedControl 기간 필터 + 차트 3종 + 훈련 효과 + 공유
 * BarChart (스마트 집계) + Radar (5축 원인) + Heatmap (요일x시간)
 * 행동별 빈도 목록 + 훈련 효과 + CoachingPreviewCard
 * Parity: UI-001, LOG-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Share, Image } from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useAuth } from 'stores/AuthContext';
import { useIsPro } from 'lib/hooks/useSubscription';
import { useDailyUsage } from 'lib/hooks/useCoaching';
import { useLogList } from 'lib/hooks/useLogs';
import { useTrainingProgress } from 'lib/hooks/useTraining';
import { useDogEnv } from 'lib/hooks/useDogs';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { supabase } from 'lib/api/supabase';
import { ChartWebView } from 'lib/charts/ChartWebView';
import { generateRadarHTML, generateHeatmapHTML, generateBarHTML } from 'lib/charts/generateChartHTML';
import { logsToRadar, logsToHeatmap, logsToSmartBar, heatmapPeakHour } from 'lib/charts/transformers';
import { filterByPeriod, countByCategory, computeTrainingEffects, buildAnalysisShareText } from 'lib/charts/filters';
import { CoachingPreviewCard } from 'components/features/dashboard/CoachingPreviewCard';
import { TrainingEffectCard } from 'components/features/dashboard/TrainingEffectCard';
import { SkeletonLoader } from 'components/shared/SkeletonLoader';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { tracker } from 'lib/analytics/tracker';
import { getBehaviorIcon, BACK_ICON } from 'lib/data/behaviorIcons';
import { RewardedAdButton } from 'components/shared/ads';
import type { ChartPeriod } from 'types/chart';
import { colors, typography, spacing } from 'styles/tokens';

async function uploadChart(
  client: typeof supabase,
  dataUrl: string,
  dogId: string,
  suffix: string,
): Promise<string> {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const filename = `${dogId}-${Date.now()}-${suffix}.png`;
  const { error } = await client.storage
    .from('chart-shares')
    .upload(filename, binary, { contentType: 'image/png', upsert: false });
  if (error) throw error;
  return client.storage.from('chart-shares').getPublicUrl(filename).data.publicUrl;
}

export const Route = createRoute('/dashboard/analysis', {
  component: AnalysisPage,
  screenOptions: { headerShown: false },
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
  const chartImages = useRef<{ bar?: string; radar?: string }>({});
  const { activeDog } = useActiveDog();
  const { user } = useAuth();
  const isPro = useIsPro(user?.id);
  const dailyLimit = isPro ? 10 : 3;
  const { data: dailyUsageData } = useDailyUsage(user?.id);
  const navigation = useNavigation();
  const { isReady } = usePageGuard({ currentPath: '/dashboard/analysis' });

  const { data: allLogs, isLoading, error, refetch } = useLogList(activeDog?.id);
  const { data: trainingProgress } = useTrainingProgress(activeDog?.id);
  const { data: dogEnv } = useDogEnv(activeDog?.id);
  const effectiveAllLogs = allLogs ?? [];

  const periodConfig = PERIOD_OPTIONS.find((p) => p.key === period)!;
  const filteredLogs = useMemo(
    () => filterByPeriod(effectiveAllLogs, periodConfig.days),
    [effectiveAllLogs, periodConfig.days]
  );

  const smartBar = useMemo(() => logsToSmartBar(filteredLogs, periodConfig.days), [filteredLogs, periodConfig.days]);
  const radarData = useMemo(() => logsToRadar(filteredLogs), [filteredLogs]);
  const heatmapData = useMemo(() => logsToHeatmap(filteredLogs), [filteredLogs]);
  const categoryFreq = useMemo(() => countByCategory(filteredLogs), [filteredLogs]);

  const trainingEffects = useMemo(
    () => (trainingProgress ? computeTrainingEffects(effectiveAllLogs, trainingProgress) : []),
    [effectiveAllLogs, trainingProgress]
  );

  const barHTML = useMemo(() => generateBarHTML(smartBar.data, BAR_TITLE[smartBar.unit]), [smartBar]);
  const radarHTML = useMemo(() => generateRadarHTML(radarData, '원인 분석'), [radarData]);
  const heatmapHTML = useMemo(() => generateHeatmapHTML(heatmapData, '시간대별 밀도'), [heatmapData]);

  const handleBarCapture = useCallback((dataUrl: string) => {
    chartImages.current.bar = dataUrl;
  }, []);

  const handleRadarCapture = useCallback((dataUrl: string) => {
    chartImages.current.radar = dataUrl;
  }, []);

  const handleShare = useCallback(() => {
    const peakHour = heatmapPeakHour(heatmapData);
    const baseMessage = buildAnalysisShareText({
      dogName: activeDog?.name ?? '우리 강아지',
      periodLabel: periodConfig.label,
      totalLogs: filteredLogs.length,
      topBehaviors: categoryFreq.slice(0, 3),
      trainingEffects,
      peakHour,
      dogEnv: dogEnv ?? null,
    });
    tracker.analysisShared(periodConfig.key, filteredLogs.length);

    const dogId = activeDog?.id ?? 'dog';
    const hasBarData = !!chartImages.current.bar;
    const hasRadarData = !!chartImages.current.radar;

    if (!hasBarData && !hasRadarData) {
      void Share.share({ message: baseMessage });
      return;
    }

    void (async () => {
      try {
        const [barResult, radarResult] = await Promise.allSettled([
          hasBarData
            ? uploadChart(supabase, chartImages.current.bar!, dogId, 'bar')
            : Promise.reject(new Error('no-bar')),
          hasRadarData
            ? uploadChart(supabase, chartImages.current.radar!, dogId, 'radar')
            : Promise.reject(new Error('no-radar')),
        ]);

        const chartLinks: string[] = [];
        if (barResult.status === 'fulfilled') chartLinks.push(`행동 빈도 차트: ${barResult.value}`);
        if (radarResult.status === 'fulfilled') chartLinks.push(`원인 분석 차트: ${radarResult.value}`);

        const message = chartLinks.length > 0
          ? `${baseMessage}\n\n${chartLinks.join('\n')}`
          : baseMessage;
        void Share.share({ message });
      } catch {
        void Share.share({ message: baseMessage });
      }
    })();
  }, [categoryFreq, trainingEffects, heatmapData, activeDog?.name, activeDog?.id, periodConfig, filteredLogs.length, dogEnv]);

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
          <Image source={{ uri: BACK_ICON }} style={styles.backIcon} resizeMode="contain" />
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
                이 기간에는 기록이 없어요. 전체 기간으로 전환하면 {allLogs?.length ?? 0}건의 기록을 확인할 수 있어요
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>{BAR_TITLE[smartBar.unit]}</Text>
            <ChartWebView type="bar" html={barHTML} height={200} onCapture={handleBarCapture} />
          </View>

          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>원인 분석</Text>
            <ChartWebView type="radar" html={radarHTML} height={280} onCapture={handleRadarCapture} />
          </View>

          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>시간대별 밀도</Text>
            <ChartWebView type="heatmap" html={heatmapHTML} height={200} />
          </View>

          <View style={styles.divider} />

          <View style={styles.freqSection}>
            <Text style={styles.freqTitle}>행동별 빈도</Text>
            {categoryFreq.map((item) => {
              const icon = getBehaviorIcon(item.key);
              return (
                <View key={item.key} style={styles.freqRow}>
                  <View style={styles.freqLabelRow}>
                    {icon && <Image source={{ uri: icon }} style={styles.freqIcon} resizeMode="contain" />}
                    <Text style={styles.freqLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.freqCount}>{item.count}회</Text>
                </View>
              );
            })}
          </View>

          <TrainingEffectCard
            effects={trainingEffects}
            hasTrainingData={!!trainingProgress && trainingProgress.length > 0}
          />

          {/* R2: 보상형 광고 — 무료 사용자 분석 화면 (CoachingPreviewCard 위) */}
          {!isPro && (
            <RewardedAdButton
              placement="R2"
              onRewarded={() => { /* 보상 지급 없음, 노출만 */ }}
            />
          )}

          {/* AI 코칭 CTA — 데이터 기반 */}
          <View style={styles.coachingSection}>
            <Text style={styles.coachingContext}>
              {filteredLogs.length}건 기록 기반 · AI 코칭 받기
            </Text>
            <CoachingPreviewCard
              dogId={activeDog?.id}
              onNavigateToCoaching={() => navigation.navigate('/coaching/result')}
              dailyUsed={dailyUsageData?.used}
              dailyLimit={dailyLimit}
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
  backIcon: {
    width: 24,
    height: 24,
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
  freqLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  freqIcon: {
    width: 20,
    height: 20,
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
