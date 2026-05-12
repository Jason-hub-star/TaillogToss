/**
 * Ops Today — B2B 오늘의 운영 큐 (4탭: 미기록/주의필요/리포트미발송/내담당)
 * FlatList 40마리 성능 최적화. Wave 3 게이트 #1 핵심 화면.
 * Parity: B2B-001
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useOrg } from 'stores/OrgContext';
import { useAuth } from 'stores/AuthContext';
import { useOrgDogs } from 'lib/hooks/useOrg';
import { useCreateQuickLog } from 'lib/hooks/useLogs';
import { useGenerateReport, useSendReport, useUpdateReport } from 'lib/hooks/useReport';
import { tracker } from 'lib/analytics/tracker';
import { OpsList } from 'components/features/ops/OpsList';
import { OpsBottomInfo } from 'components/features/ops/OpsBottomInfo';
import { BulkActionBar } from 'components/features/ops/BulkActionBar';
import { RecordModal } from 'components/features/ops/RecordModal';
import { BulkPresetSheet } from 'components/features/ops/BulkPresetSheet';
import { ReportPreviewSheet } from 'components/features/ops/ReportPreviewSheet';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { TabLayout } from 'components/shared/layouts/TabLayout';
import { BottomNavBar } from 'components/shared/BottomNavBar';
import { PRESET_OPTIONS } from 'lib/data/presets';
import type { OpsItem } from 'components/features/ops/OpsListItem';
import type { OpsStatus } from 'components/features/ops/OpsBadge';
import type { DailyReport } from 'types/b2b';
import { colors, typography, spacing } from 'styles/tokens';

export const Route = createRoute('/ops/today', {
  component: OpsTodayPage,
  screenOptions: { headerShown: false },
});

function OpsTodayPage() {
  const navigation = useNavigation();
  const { isReady } = usePageGuard({
    currentPath: '/ops/today',
    requireFeature: 'b2bOnly',
  });
  const { org, isOrgLoading } = useOrg();
  const { user } = useAuth();
  const { data: orgDogs, isLoading, isError, refetch } = useOrgDogs(org?.id);
  const createQuickLog = useCreateQuickLog();
  const generateReport = useGenerateReport();
  const sendReport = useSendReport();
  const updateReport = useUpdateReport();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recordModalItem, setRecordModalItem] = useState<OpsItem | null>(null);
  const [showBulkSheet, setShowBulkSheet] = useState(false);
  // 리포트 관련 상태
  const [reportSourceItem, setReportSourceItem] = useState<OpsItem | null>(null);
  const [reportForPreview, setReportForPreview] = useState<DailyReport | null>(null);
  const [generatingDogId, setGeneratingDogId] = useState<string | null>(null);

  // OrgDogWithStatus[] → OpsItem[] 변환 (실 데이터 JOIN 결과 사용)
  const allItems: OpsItem[] = useMemo(() => {
    if (!orgDogs) return [];
    return orgDogs.map((od) => {
      const todayLogCount = od.today_log_count;
      const hasReport = od.has_today_report;
      let status: OpsStatus = 'pending';
      if (todayLogCount === 0) status = 'pending';
      else if (todayLogCount > 0 && hasReport) status = 'done';
      else if (todayLogCount > 0 && !hasReport) status = 'normal';

      return {
        orgDogId: od.id,
        dogName: od.dogs?.name ?? `Dog ${od.dog_id.slice(0, 6)}`,
        parentName: od.parent_name,
        trainerName: od.trainer_name,
        status,
        lastLogTime: od.last_log_time,
        todayLogCount,
        hasReport,
        dogId: od.dog_id,
      };
    });
  }, [orgDogs]);

  // 탭별 필터
  const unrecordedItems = useMemo(
    () => allItems.filter((i) => i.todayLogCount === 0), [allItems]
  );
  const attentionItems = useMemo(
    () => allItems.filter((i) => i.status === 'urgent' || i.status === 'warning'), [allItems]
  );
  const unreportedItems = useMemo(
    () => allItems.filter((i) => !i.hasReport && i.todayLogCount > 0), [allItems]
  );
  const myItems = useMemo(
    () => allItems.filter((i) => i.trainerName !== null), [allItems]
  );
  const completedCount = useMemo(
    () => allItems.filter((i) => i.status === 'done').length, [allItems]
  );

  // 개별 기록: 아이템 탭 → RecordModal 열기
  const handleItemPress = useCallback((item: OpsItem) => {
    if (selectedIds.size > 0) {
      // 벌크 선택 모드중이면 선택 토글
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.orgDogId)) next.delete(item.orgDogId);
        else next.add(item.orgDogId);
        return next;
      });
    } else {
      setRecordModalItem(item);
    }
  }, [selectedIds.size]);

  // 리포트 탭 — 아이템 탭 → 리포트 생성 후 미리보기
  const handleReportItemPress = useCallback((item: OpsItem) => {
    if (selectedIds.size > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.orgDogId)) next.delete(item.orgDogId);
        else next.add(item.orgDogId);
        return next;
      });
      return;
    }
    if (generatingDogId) return; // 생성 중 중복 방지

    const today = new Date().toISOString().slice(0, 10);
    setReportSourceItem(item);
    setGeneratingDogId(item.dogId);

    generateReport.mutate(
      {
        dog_id: item.dogId,
        report_date: today,
        template_type: 'daycare_general',
        created_by_org_id: org?.id,
        created_by_trainer_id: user?.id,
      },
      {
        onSuccess: (report) => {
          setReportForPreview(report);
          setGeneratingDogId(null);
          tracker.reportGenerated('daycare_general');
        },
        onError: () => {
          Alert.alert('생성 실패', '리포트 생성에 실패했어요. 다시 시도해주세요.');
          setGeneratingDogId(null);
          setReportSourceItem(null);
        },
      },
    );
  }, [selectedIds.size, generatingDogId, org?.id, user?.id, generateReport]);

  const handleReportSend = useCallback((reportId: string) => {
    sendReport.mutate(reportId, {
      onSuccess: () => {
        tracker.reportSent('toss');
        setReportForPreview(null);
        setReportSourceItem(null);
        void refetch();
        Alert.alert('발송 완료', '보호자에게 리포트가 발송되었어요.');
      },
      onError: () => {
        Alert.alert('발송 실패', '리포트 발송에 실패했어요. 다시 시도해주세요.');
      },
    });
  }, [sendReport, refetch]);

  const handleReportUpdate = useCallback((reportId: string, updates: { behavior_summary?: string; condition_notes?: string }) => {
    updateReport.mutate({ reportId, updates });
  }, [updateReport]);

  const handleReportClose = useCallback(() => {
    setReportForPreview(null);
    setReportSourceItem(null);
  }, []);

  const handleItemLongPress = useCallback((item: OpsItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.orgDogId)) next.delete(item.orgDogId);
      else next.add(item.orgDogId);
      return next;
    });
  }, []);

  // 개별 저장
  const handleRecordSave = useCallback((data: { dogId: string; presetId: string; memo: string; intensity: number }) => {
    const preset = PRESET_OPTIONS.find((p) => p.id === data.presetId);
    if (!preset) return;
    createQuickLog.mutate(
      {
        dog_id: data.dogId,
        category: 'other_behavior',
        intensity: data.intensity as any,
        occurred_at: new Date().toISOString(),
        memo: data.memo,
        org_id: org?.id,
      },
      {
        onSuccess: () => {
          tracker.opsLogCreated('preset', false);
          setRecordModalItem(null);
        },
        onError: () => {
          Alert.alert('저장 실패', '기록을 저장하지 못했어요. 다시 시도해주세요.');
        },
      },
    );
  }, [createQuickLog, org?.id]);

  // 저장 & 다음
  const handleRecordSaveAndNext = useCallback((data: { dogId: string; presetId: string; memo: string; intensity: number }) => {
    handleRecordSave(data);
    // 다음 미기록 아이템 자동 이동
    const currentIdx = unrecordedItems.findIndex((i) => i.dogId === data.dogId);
    const nextItem = unrecordedItems[currentIdx + 1];
    if (nextItem) {
      setRecordModalItem(nextItem);
    }
  }, [handleRecordSave, unrecordedItems]);

  // 벌크 저장
  const handleBulkSave = useCallback((_presetId: string, memo: string, intensity: number) => {
    selectedIds.forEach((orgDogId) => {
      const item = allItems.find((i) => i.orgDogId === orgDogId);
      if (!item) return;
      createQuickLog.mutate({
        dog_id: item.dogId,
        category: 'other_behavior',
        intensity: intensity as any,
        occurred_at: new Date().toISOString(),
        memo,
        org_id: org?.id,
      });
    });
    tracker.opsBulkSaved(selectedIds.size);
    setSelectedIds(new Set());
    setShowBulkSheet(false);
  }, [selectedIds, allItems, createQuickLog]);

  const selectedDogNames = useMemo(
    () => allItems.filter((i) => selectedIds.has(i.orgDogId)).map((i) => i.dogName),
    [allItems, selectedIds]
  );

  const emptyComponent = (
    <EmptyState title="오늘 관리할 강아지가 없어요" description="센터에 강아지를 등록하세요" icon={'\uD83D\uDC36'} />
  );

  const tabs = useMemo(() => [
    {
      key: 'unrecorded',
      label: `미기록(${unrecordedItems.length})`,
      content: (
        <OpsList items={unrecordedItems} isLoading={isLoading} selectedIds={selectedIds}
          onItemPress={handleItemPress} onItemLongPress={handleItemLongPress}
          ListEmptyComponent={emptyComponent} />
      ),
    },
    {
      key: 'attention',
      label: `주의(${attentionItems.length})`,
      content: (
        <OpsList items={attentionItems} selectedIds={selectedIds}
          onItemPress={handleItemPress} onItemLongPress={handleItemLongPress}
          ListEmptyComponent={<EmptyState title="주의 필요한 강아지가 없어요" description="" icon={'\u2705'} />} />
      ),
    },
    {
      key: 'unreported',
      label: `리포트(${unreportedItems.length})`,
      content: (
        <OpsList items={unreportedItems} selectedIds={selectedIds}
          onItemPress={handleReportItemPress} onItemLongPress={handleItemLongPress}
          ListEmptyComponent={<EmptyState title="미발송 리포트가 없어요" description="기록이 있는 강아지 리포트를 탭해서 생성하세요" icon={'\uD83D\uDCE8'} />} />
      ),
    },
    {
      key: 'mine',
      label: `내담당(${myItems.length})`,
      content: (
        <OpsList items={myItems} selectedIds={selectedIds}
          onItemPress={handleItemPress} onItemLongPress={handleItemLongPress}
          ListEmptyComponent={<EmptyState title="배정된 담당 강아지가 없어요" description="" icon={'\uD83D\uDC64'} />} />
      ),
    },
  ], [
    unrecordedItems, attentionItems, unreportedItems, myItems,
    isLoading, selectedIds, handleItemPress, handleItemLongPress,
    handleReportItemPress, generatingDogId,
  ]);

  useEffect(() => {
    if (isReady && !isOrgLoading && !org) {
      navigation.navigate('/ops/setup' as never);
    }
  }, [isReady, isOrgLoading, org, navigation]);

  if (!isReady || isOrgLoading) return null;

  if (!org) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState title="센터 설정이 필요해요" description="상담지 작성은 무료로 열려 있고, 리포트 생성은 구독 상태에 따라 잠겨요" icon={'\uD83D\uDCCB'} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <BulkActionBar
          selectedCount={selectedIds.size}
          onBulkRecord={() => setShowBulkSheet(true)}
          onCancel={() => setSelectedIds(new Set())}
        />
        <TabLayout title="오늘의 운영" tabs={tabs} defaultTab="unrecorded" />
        <OpsBottomInfo totalCount={allItems.length} completedCount={completedCount} />
      </View>

      {/* 개별 기록 모달 */}
      <Modal visible={!!recordModalItem} animationType="slide" presentationStyle="pageSheet">
        {recordModalItem && (
          <RecordModal
            item={recordModalItem}
            onSave={handleRecordSave}
            onSaveAndNext={handleRecordSaveAndNext}
            onClose={() => setRecordModalItem(null)}
          />
        )}
      </Modal>

      {/* 벌크 프리셋 시트 */}
      <Modal visible={showBulkSheet} animationType="slide" presentationStyle="pageSheet">
        <BulkPresetSheet
          selectedDogNames={selectedDogNames}
          onSave={handleBulkSave}
          onClose={() => setShowBulkSheet(false)}
        />
      </Modal>

      {/* 리포트 미리보기/발송 모달 */}
      <Modal visible={!!reportForPreview} animationType="slide" presentationStyle="pageSheet">
        {reportForPreview && (
          <ReportPreviewSheet
            report={reportForPreview}
            dogName={reportSourceItem?.dogName ?? '강아지'}
            onSend={handleReportSend}
            onUpdate={handleReportUpdate}
            onClose={handleReportClose}
          />
        )}
      </Modal>

      {/* 강아지 등록 FAB */}
      {selectedIds.size === 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('/ops/dog-add' as never)}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+ 강아지 등록</Text>
        </TouchableOpacity>
      )}

      <BottomNavBar activeTab="ops" />
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
  fab: {
    position: 'absolute',
    bottom: 144, // BottomNavBar(88) + OpsBottomInfo(44) + gap(12)
    right: spacing.screenHorizontal,
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: colors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.white,
  },
});
