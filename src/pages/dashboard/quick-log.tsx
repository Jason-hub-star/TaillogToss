/**
 * 빠른 ABC 행동 기록 화면 — SegmentedControl 2탭 (빠른/상세)
 * [빠른] 탭: QuickLogForm (Chip 원탭 + 강도 + 시간)
 * [상세] 탭: ABCForm (선행-행동-결과 Accordion)
 * 저장 성공 → 대시보드 캐시 invalidate + 뒤로가기
 * Parity: UI-001, LOG-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { colors, typography } from 'styles/tokens';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useCreateQuickLog, useCreateDetailedLog } from 'lib/hooks/useLogs';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { tracker } from 'lib/analytics/tracker';
import { QuickLogForm } from 'components/features/log/QuickLogForm';
import { ABCForm } from 'components/features/log/ABCForm';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { Toast } from 'components/tds-ext/Toast';
import { BackButton, BackButtonSpacer } from 'components/shared/BackButton';
import type { QuickLogInput, DetailedLogInput } from 'types/log';

export const Route = createRoute('/dashboard/quick-log', {
  component: QuickLogPage,
  screenOptions: { headerShown: false },
});

type TabKey = 'quick' | 'detailed';

function QuickLogPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('quick');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('기록이 저장되었어요');
  const [shouldReturnToDashboard, setShouldReturnToDashboard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { activeDog } = useActiveDog();
  const navigation = useNavigation();
  const { isReady } = usePageGuard({ currentPath: '/dashboard/quick-log' });

  const quickLogMutation = useCreateQuickLog();
  const detailedLogMutation = useCreateDetailedLog();

  const showSaveSuccess = useCallback((mode: 'quick' | 'detailed') => {
    tracker.behaviorLogCreated(mode);
    setToastMessage('저장 완료. 대시보드로 돌아가요');
    setShouldReturnToDashboard(true);
    setShowToast(true);
  }, []);

  const showSaveError = useCallback(() => {
    setToastMessage('저장하지 못했어요. 다시 시도해주세요');
    setShouldReturnToDashboard(false);
    setShowToast(true);
  }, []);

  const handleQuickSubmit = useCallback(async (inputs: QuickLogInput[]) => {
    if (inputs.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await Promise.all(inputs.map((input) => quickLogMutation.mutateAsync(input)));
      showSaveSuccess('quick');
    } catch {
      showSaveError();
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, quickLogMutation, showSaveError, showSaveSuccess]);

  const handleDetailedSubmit = useCallback(async (input: DetailedLogInput) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await detailedLogMutation.mutateAsync(input);
      showSaveSuccess('detailed');
    } catch {
      showSaveError();
    } finally {
      setIsSubmitting(false);
    }
  }, [detailedLogMutation, isSubmitting, showSaveError, showSaveSuccess]);

  const handleToastDismiss = useCallback(() => {
    setShowToast(false);
    if (shouldReturnToDashboard) {
      setShouldReturnToDashboard(false);
      navigation.navigate('/dashboard' as never);
    }
  }, [navigation, shouldReturnToDashboard]);

  if (!isReady) return null;

  // activeDog 없으면 기록 불가 — 강아지 먼저 등록 안내
  if (!activeDog) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.title}>빠른 기록</Text>
          <BackButtonSpacer />
        </View>
        <EmptyState
          title="반려견을 먼저 등록해주세요"
          description="기록하려면 반려견 정보가 필요해요"
        />
      </SafeAreaView>
    );
  }

  const dogId = activeDog.id;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>빠른 기록</Text>
        <BackButtonSpacer />
      </View>

      <View style={styles.segmented}>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'quick' && styles.segmentActive]}
          onPress={() => setActiveTab('quick')}
        >
          <Text style={[styles.segmentText, activeTab === 'quick' && styles.segmentTextActive]}>빠른</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'detailed' && styles.segmentActive]}
          onPress={() => setActiveTab('detailed')}
        >
          <Text style={[styles.segmentText, activeTab === 'detailed' && styles.segmentTextActive]}>상세</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        {activeTab === 'quick' ? (
          <QuickLogForm
            dogId={dogId}
            onSubmit={handleQuickSubmit}
            isLoading={isSubmitting || quickLogMutation.isPending}
          />
        ) : (
          <ABCForm
            dogId={dogId}
            onSubmit={handleDetailedSubmit}
            isLoading={isSubmitting || detailedLogMutation.isPending}
          />
        )}
      </KeyboardAvoidingView>

      <Toast
        message={toastMessage}
        visible={showToast}
        duration={1200}
        onDismiss={handleToastDismiss}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  segmented: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: colors.divider,
    borderRadius: 10,
    padding: 3,
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
  content: {
    flex: 1,
    marginTop: 8,
  },
});
