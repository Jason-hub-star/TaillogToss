/**
 * 보호자 리포트 열람 — 인증 필요 (토스 로그인 보호자)
 * Parity: B2B-001
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { colors, typography, spacing } from 'styles/tokens';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { ErrorState } from 'components/tds-ext';
import { LottieAnimation } from 'components/shared/LottieAnimation';
import { BackButton, BackButtonSpacer } from 'components/shared/BackButton';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useAuth } from 'stores/AuthContext';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useDogReports, useCreateInteraction } from 'lib/hooks/useReport';
import { ReportViewer } from 'components/features/parent/ReportViewer';
import { ReactionForm } from 'components/features/parent/ReactionForm';
import { ReportCard } from 'components/features/ops/ReportCard';
import { tracker } from 'lib/analytics/tracker';
import type { DailyReport } from 'types/b2b';

export const Route = createRoute('/parent/reports', {
  component: ParentReportsPage,
  screenOptions: { headerShown: false },
});

function ParentReportsPage() {
  const { isReady } = usePageGuard({
    currentPath: '/parent/reports' as any,
    requireFeature: 'b2bOnly',
  });
  const { user } = useAuth();
  const { activeDog } = useActiveDog();
  const navigation = useNavigation();
  const { data: reports, isLoading, isError, refetch } = useDogReports(activeDog?.id);
  const createInteraction = useCreateInteraction();

  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  const currentReport = selectedReport ?? reports?.[0] ?? null;

  const handleSelectReport = useCallback((report: DailyReport) => {
    setSelectedReport(report);
  }, []);

  const handleReaction = useCallback((emoji: string) => {
    if (!currentReport) return;
    createInteraction.mutate({
      report_id: currentReport.id,
      parent_user_id: user?.id,
      interaction_type: 'like',
      content: emoji,
    });
    tracker.parentReaction('like');
  }, [currentReport, user?.id, createInteraction]);

  const handleQuestion = useCallback((question: string) => {
    if (!currentReport) return;
    createInteraction.mutate({
      report_id: currentReport.id,
      parent_user_id: user?.id,
      interaction_type: 'question',
      content: question,
    });
    tracker.parentReaction('question');
  }, [currentReport, user?.id, createInteraction]);

  if (!isReady) return null;

  const header = (
    <View style={styles.header}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={styles.title}>리포트</Text>
      <BackButtonSpacer />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={styles.centered}>
          <LottieAnimation asset="perrito-corriendo" size={120} />
          <Text style={styles.loadingText}>리포트 불러오는 중…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <ErrorState onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={styles.centered}>
          <LottieAnimation asset="happy-dog" size={180} />
          <Text style={styles.emptyTitle}>아직 리포트가 없어요</Text>
          <Text style={styles.emptySubtext}>선생님이 리포트를 보내면{'\n'}여기서 확인할 수 있어요</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {header}

      {/* 리포트 목록 */}
      <View style={styles.listSection}>
        <Text style={styles.sectionLabel}>리포트 목록</Text>
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={item.id === currentReport?.id ? styles.selectedItem : undefined}>
              <ReportCard
                report={item}
                dogName={activeDog?.name ?? ''}
                onPress={handleSelectReport}
              />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      </View>

      {/* 선택된 리포트 상세 */}
      {currentReport && (
        <View style={styles.detailSection}>
          <ReportViewer report={currentReport} dogName={activeDog?.name} />
          <ReactionForm
            onSubmitReaction={handleReaction}
            onSubmitQuestion={handleQuestion}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.body, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  loadingText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.sm },
  emptyTitle: { ...typography.body, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  emptySubtext: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.divider,
  },
  listSection: { flex: 2 },
  list: { flex: 1 },
  selectedItem: { backgroundColor: colors.blue50 },
  detailSection: { flex: 3, borderTopWidth: 1, borderTopColor: colors.border },
});
