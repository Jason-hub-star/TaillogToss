/**
 * 보호자 리포트 열람 — 인증 필요 (토스 로그인 보호자)
 * Parity: B2B-001
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { colors, typography, spacing } from 'styles/tokens';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { ErrorState } from 'components/tds-ext';
import { LottieAnimation } from 'components/shared/LottieAnimation';
import { BackButton, BackButtonSpacer } from 'components/shared/BackButton';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useAuth } from 'stores/AuthContext';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useDogReports, useCreateInteraction, useReportByShareToken, useVerifyParentPhoneLast4 } from 'lib/hooks/useReport';
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
  const route = useRoute();
  const shareToken = extractShareToken(route.params);

  if (shareToken) {
    return <SharedReportEntry shareToken={shareToken} />;
  }

  return <AuthenticatedParentReports />;
}

function extractShareToken(params: unknown): string {
  if (!params || typeof params !== 'object') return '';
  const routeParams = params as { token?: unknown; shareToken?: unknown };
  const token = routeParams.token ?? routeParams.shareToken;
  return typeof token === 'string' ? token : '';
}

function AuthenticatedParentReports() {
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

function SharedReportEntry({ shareToken }: { shareToken: string }) {
  const { isReady } = usePageGuard({
    currentPath: '/parent/reports' as any,
    skipAuth: true,
    skipOnboarding: true,
  });
  const [phoneLast4, setPhoneLast4] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const verifiedLast4 = isVerified ? phoneLast4.replace(/[^0-9]/g, '').slice(0, 4) : undefined;
  const { data: report, isLoading, error, refetch } = useReportByShareToken(
    isVerified ? shareToken : undefined,
    verifiedLast4,
  );
  const verifyPhone = useVerifyParentPhoneLast4();
  const createInteraction = useCreateInteraction();

  const handleVerify = useCallback(async () => {
    const last4 = phoneLast4.replace(/[^0-9]/g, '').slice(0, 4);
    if (last4.length !== 4) {
      setVerifyError('4자리 숫자를 입력해주세요');
      return;
    }

    setVerifyError('');
    try {
      const verified = await verifyPhone.mutateAsync({ share_token: shareToken, last4 });
      if (verified) {
        setIsVerified(true);
      } else {
        setVerifyError('전화번호가 맞지 않아요');
      }
    } catch {
      setVerifyError('인증하지 못했어요. 다시 시도해주세요');
    }
  }, [phoneLast4, shareToken, verifyPhone]);

  const handleReaction = useCallback((emoji: string) => {
    if (!report) return;
    createInteraction.mutate({
      report_id: report.id,
      parent_identifier: `phone_${phoneLast4}`,
      share_token: shareToken,
      last4: phoneLast4.replace(/[^0-9]/g, '').slice(0, 4),
      interaction_type: 'like',
      content: emoji,
    });
    tracker.parentReaction('like');
  }, [createInteraction, phoneLast4, report]);

  const handleQuestion = useCallback((question: string) => {
    if (!report) return;
    createInteraction.mutate({
      report_id: report.id,
      parent_identifier: `phone_${phoneLast4}`,
      share_token: shareToken,
      last4: phoneLast4.replace(/[^0-9]/g, '').slice(0, 4),
      interaction_type: 'question',
      content: question,
    });
    tracker.parentReaction('question');
  }, [createInteraction, phoneLast4, report]);

  if (!isReady) return null;

  if (!isVerified) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.verifyContainer}>
          <Text style={styles.verifyTitle}>보호자 인증</Text>
          <Text style={styles.verifyDesc}>등록된 전화번호 뒷 4자리를 입력해주세요</Text>
          <TextInput
            style={styles.phoneInput}
            value={phoneLast4}
            onChangeText={(text) => setPhoneLast4(text.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="0000"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
          />
          {verifyError ? <Text style={styles.verifyError}>{verifyError}</Text> : null}
          <TouchableOpacity
            style={[styles.verifyButton, phoneLast4.length < 4 && styles.verifyButtonDisabled]}
            onPress={handleVerify}
            disabled={phoneLast4.length < 4 || verifyPhone.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.verifyButtonText}>
              {verifyPhone.isPending ? '확인하고 있어요' : '확인'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
          <Text style={styles.loadingText}>리포트 불러오는 중…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>리포트를 찾을 수 없어요</Text>
          <Text style={styles.emptySubtext}>링크가 만료됐거나 주소가 달라요</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void refetch()} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ReportViewer report={report} />
      <ReactionForm
        onSubmitReaction={handleReaction}
        onSubmitQuestion={handleQuestion}
      />
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
  retryButton: {
    minWidth: 120,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    backgroundColor: colors.primaryBlue,
    marginTop: spacing.sm,
  },
  retryButtonText: { ...typography.bodySmall, fontWeight: '700', color: colors.white },
  verifyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  verifyTitle: { ...typography.subtitle, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  verifyDesc: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  phoneInput: {
    width: 160,
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    ...typography.sectionTitle,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textPrimary,
  },
  verifyError: { ...typography.caption, color: colors.badgeRed, textAlign: 'center' },
  verifyButton: {
    width: 160,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.primaryBlue,
  },
  verifyButtonDisabled: { opacity: 0.5 },
  verifyButtonText: { ...typography.bodySmall, fontWeight: '700', color: colors.white },
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
