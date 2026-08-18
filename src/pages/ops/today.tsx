/**
 * Ops Today — B2B 오늘의 운영 큐 (4탭: 전체/확인 필요/리포트 필요/내 담당)
 * FlatList 40마리 성능 최적화. Wave 3 게이트 #1 핵심 화면.
 * Parity: B2B-001
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useOrg } from 'stores/OrgContext';
import { useAuth } from 'stores/AuthContext';
import { useAssignDog, useMyAssignments, useOrgDogs, useUnassignDog } from 'lib/hooks/useOrg';
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
import { Toast } from 'components/tds-ext/Toast';
import { TabLayout } from 'components/shared/layouts/TabLayout';
import { BottomNavBar } from 'components/shared/BottomNavBar';
import { PRESET_OPTIONS } from 'lib/data/presets';
import { markStartupPerformance } from 'lib/performance/startupPerformance';
import type { OpsItem } from 'components/features/ops/OpsListItem';
import type { OpsStatus } from 'components/features/ops/OpsBadge';
import type { DailyReport } from 'types/b2b';
import { colors, typography, spacing } from 'styles/tokens';
import type { IntensityLevel } from 'types/log';

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
  const { data: myAssignments } = useMyAssignments(user?.id);
  const assignDog = useAssignDog();
  const unassignDog = useUnassignDog();
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
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [recordToastMessage, setRecordToastMessage] = useState('');
  const [showRecordToast, setShowRecordToast] = useState(false);
  const opsPerfMarkedRef = useRef(false);

  const showPageToast = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
  }, []);

  const showRecordFeedback = useCallback((message: string) => {
    setRecordToastMessage(message);
    setShowRecordToast(true);
  }, []);

  const myAssignmentDogIds = useMemo(() => {
    const orgId = org?.id;
    return new Set(
      (myAssignments ?? [])
        .filter((assignment) => !orgId || assignment.org_id === orgId)
        .map((assignment) => assignment.dog_id),
    );
  }, [myAssignments, org?.id]);

  // OrgDogWithStatus[] → OpsItem[] 변환 (실 데이터 JOIN 결과 사용)
  const allItems: OpsItem[] = useMemo(() => {
    if (!orgDogs) return [];
    return orgDogs.map((od) => {
      const todayLogCount = od.today_log_count;
      const hasReport = od.has_today_report;
      let status: OpsStatus = 'unrecorded';
      if (od.needs_attention) status = 'needs_check';
      else if (todayLogCount === 0) status = 'unrecorded';
      else if (!hasReport) status = 'needs_report';
      else status = 'shared';

      return {
        orgDogId: od.id,
        dogName: od.dogs?.name ?? `Dog ${od.dog_id.slice(0, 6)}`,
        parentName: od.parent_name,
        trainerName: od.trainer_name,
        isMyAssignment: myAssignmentDogIds.has(od.dog_id),
        attentionReason: od.attention_reason,
        status,
        lastLogTime: od.last_log_time,
        todayLogCount,
        hasReport,
        dogId: od.dog_id,
      };
    });
  }, [myAssignmentDogIds, orgDogs]);

  // 탭별 필터
  const unrecordedItems = useMemo(
    () => allItems.filter((i) => i.todayLogCount === 0), [allItems]
  );
  const attentionItems = useMemo(
    () => allItems.filter((i) => i.status === 'needs_check'), [allItems]
  );
  const unreportedItems = useMemo(
    () => allItems.filter((i) => !i.hasReport && i.todayLogCount > 0), [allItems]
  );
  const myItems = useMemo(
    () => allItems.filter((i) => i.isMyAssignment), [allItems]
  );
  const selectedItems = useMemo(
    () => allItems.filter((i) => selectedIds.has(i.orgDogId)),
    [allItems, selectedIds],
  );
  const selectedHasUnassigned = useMemo(
    () => selectedItems.some((item) => !item.isMyAssignment),
    [selectedItems],
  );
  const selectedAllMine = useMemo(
    () => selectedItems.length > 0 && selectedItems.every((item) => item.isMyAssignment),
    [selectedItems],
  );
  const completedCount = useMemo(
    () => allItems.filter((i) => i.status === 'shared').length, [allItems]
  );

  useEffect(() => {
    opsPerfMarkedRef.current = false;
  }, [org?.id]);

  useEffect(() => {
    if (!isReady || !org || isLoading || opsPerfMarkedRef.current) return;
    opsPerfMarkedRef.current = true;
    markStartupPerformance('ops_today_data_ready', {
      route: '/ops/today',
      totalCount: allItems.length,
      unrecordedCount: unrecordedItems.length,
      unreportedCount: unreportedItems.length,
    });
  }, [allItems.length, isLoading, isReady, org, unrecordedItems.length, unreportedItems.length]);

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
      },
      {
        onSuccess: (report) => {
          setReportForPreview(report);
          setGeneratingDogId(null);
          tracker.reportGenerated('daycare_general');
        },
        onError: () => {
          Alert.alert('리포트를 만들지 못했어요', '잠시 후 다시 시도해주세요.');
          setGeneratingDogId(null);
          setReportSourceItem(null);
        },
      },
    );
  }, [selectedIds.size, generatingDogId, org?.id, generateReport]);

  const handleReportSend = useCallback((reportId: string) => {
    sendReport.mutate(reportId, {
      onSuccess: () => {
        tracker.reportSent('toss');
        setReportForPreview(null);
        setReportSourceItem(null);
        void refetch();
        Alert.alert('공유 준비 완료', '보호자에게 보낼 리포트 링크를 열었어요.');
      },
      onError: () => {
        Alert.alert('리포트를 보내지 못했어요', '잠시 후 다시 시도해주세요.');
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

  const handleAssignSelectedToMe = useCallback(async () => {
    if (!org?.id || !user?.id) {
      showPageToast('센터 정보를 다시 불러와주세요');
      return;
    }
    const selectedItems = allItems.filter((item) => selectedIds.has(item.orgDogId));
    const itemsToAssign = selectedItems.filter((item) => !item.isMyAssignment);
    if (itemsToAssign.length === 0) {
      setSelectedIds(new Set());
      showPageToast('이미 내 담당에 있어요');
      return;
    }
    try {
      await Promise.all(itemsToAssign.map((item) =>
        assignDog.mutateAsync({
          dog_id: item.dogId,
          org_id: org.id,
          trainer_user_id: user.id,
          role: 'primary',
        }),
      ));
      setSelectedIds(new Set());
      void refetch();
      showPageToast(`${itemsToAssign.length}마리를 내 담당에 추가했어요`);
    } catch {
      showPageToast('내 담당에 추가하지 못했어요');
    }
  }, [allItems, assignDog, org?.id, refetch, selectedIds, showPageToast, user?.id]);

  const handleUnassignSelectedFromMe = useCallback(async () => {
    if (!org?.id || !user?.id) {
      showPageToast('센터 정보를 다시 불러와주세요');
      return;
    }
    const itemsToUnassign = selectedItems.filter((item) => item.isMyAssignment);
    if (itemsToUnassign.length === 0) {
      setSelectedIds(new Set());
      showPageToast('내 담당 강아지를 선택해주세요');
      return;
    }
    try {
      await Promise.all(itemsToUnassign.map((item) =>
        unassignDog.mutateAsync({
          dog_id: item.dogId,
          org_id: org.id,
          trainer_user_id: user.id,
        }),
      ));
      setSelectedIds(new Set());
      void refetch();
      showPageToast(`${itemsToUnassign.length}마리를 내 담당에서 해제했어요`);
    } catch {
      showPageToast('내 담당에서 해제하지 못했어요');
    }
  }, [org?.id, refetch, selectedItems, showPageToast, unassignDog, user?.id]);

  const saveRecord = useCallback((
    data: { dogId: string; presetId: string; memo: string; intensity: number },
    onSuccess: () => void,
  ) => {
    const preset = PRESET_OPTIONS.find((p) => p.id === data.presetId);
    if (!preset) return;
    if (!org?.id) {
      showRecordFeedback('센터 정보를 다시 불러와주세요');
      return;
    }
    createQuickLog.mutate(
      {
        dog_id: data.dogId,
        category: 'other_behavior',
        intensity: data.intensity as IntensityLevel,
        occurred_at: new Date().toISOString(),
        memo: data.memo,
        org_id: org.id,
      },
      {
        onSuccess: () => {
          tracker.opsLogCreated('preset', false);
          void refetch();
          onSuccess();
        },
        onError: () => {
          showRecordFeedback('저장하지 못했어요. 다시 시도해주세요');
        },
      },
    );
  }, [createQuickLog, org?.id, refetch, showRecordFeedback]);

  // 개별 저장
  const handleRecordSave = useCallback((data: { dogId: string; presetId: string; memo: string; intensity: number }) => {
    saveRecord(data, () => {
      setShowRecordToast(false);
      setRecordModalItem(null);
      showPageToast('기록을 저장했어요');
    });
  }, [saveRecord, showPageToast]);

  // 저장 & 다음
  const handleRecordSaveAndNext = useCallback((data: { dogId: string; presetId: string; memo: string; intensity: number }) => {
    // 다음 미기록 아이템 자동 이동
    const currentIdx = unrecordedItems.findIndex((i) => i.dogId === data.dogId);
    const nextItem = unrecordedItems[currentIdx + 1];
    saveRecord(data, () => {
      setRecordModalItem(nextItem ?? null);
      if (nextItem) {
        showRecordFeedback('저장했어요. 다음 강아지로 이동해요');
      } else {
        setShowRecordToast(false);
        showPageToast('마지막 기록까지 저장했어요');
      }
    });
  }, [saveRecord, showPageToast, showRecordFeedback, unrecordedItems]);

  // 벌크 저장
  const handleBulkSave = useCallback(async (_presetId: string, memo: string, intensity: number) => {
    if (!org?.id) {
      showPageToast('센터 정보를 다시 불러와주세요');
      return;
    }
    const itemsToSave = allItems.filter((i) => selectedIds.has(i.orgDogId));
    try {
      await Promise.all(itemsToSave.map((item) =>
        createQuickLog.mutateAsync({
          dog_id: item.dogId,
          category: 'other_behavior',
          intensity: intensity as IntensityLevel,
          occurred_at: new Date().toISOString(),
          memo,
          org_id: org.id,
        }),
      ));
      tracker.opsBulkSaved(selectedIds.size);
      setSelectedIds(new Set());
      setShowBulkSheet(false);
      showPageToast(`${itemsToSave.length}마리 기록을 저장했어요`);
      void refetch();
    } catch {
      showPageToast('저장하지 못했어요. 다시 시도해주세요');
    }
  }, [selectedIds, allItems, createQuickLog, org?.id, refetch, showPageToast]);

  const selectedDogNames = useMemo(
    () => allItems.filter((i) => selectedIds.has(i.orgDogId)).map((i) => i.dogName),
    [allItems, selectedIds]
  );

  const emptyComponent = (
    <EmptyState title="오늘 관리할 강아지가 없어요" description="센터에 강아지를 등록해주세요" icon={'\uD83D\uDC36'} />
  );

  const tabs = useMemo(() => [
    {
      key: 'all',
      label: `전체 ${allItems.length}`,
      content: (
        <OpsList items={allItems} isLoading={isLoading} selectedIds={selectedIds}
          onItemPress={handleItemPress} onItemLongPress={handleItemLongPress}
          ListEmptyComponent={emptyComponent} />
      ),
    },
    {
      key: 'attention',
      label: `확인 ${attentionItems.length}`,
      content: (
        <OpsList items={attentionItems} selectedIds={selectedIds}
          onItemPress={handleItemPress} onItemLongPress={handleItemLongPress}
          ListEmptyComponent={<EmptyState title="확인할 강아지가 없어요" description="강도 높은 기록이나 이상징후가 있으면 여기에 모여요" icon={'\u2705'} />} />
      ),
    },
    {
      key: 'unreported',
      label: `리포트 ${unreportedItems.length}`,
      content: (
        <OpsList items={unreportedItems} selectedIds={selectedIds}
          onItemPress={handleReportItemPress} onItemLongPress={handleItemLongPress}
          ListEmptyComponent={<EmptyState title="미발송 리포트가 없어요" description="기록이 있는 강아지 리포트를 탭해 만들어주세요" icon={'\uD83D\uDCE8'} />} />
      ),
    },
    {
      key: 'mine',
      label: `내담당 ${myItems.length}`,
      content: (
        <OpsList items={myItems} selectedIds={selectedIds}
          onItemPress={handleItemPress} onItemLongPress={handleItemLongPress}
          ListEmptyComponent={<EmptyState title="내 담당 강아지가 없어요" description="전체 탭에서 강아지를 길게 눌러 추가해보세요" icon={'\uD83D\uDC64'} />} />
      ),
    },
  ], [
    allItems, attentionItems, unreportedItems, myItems,
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
          onAssignMine={selectedHasUnassigned ? handleAssignSelectedToMe : undefined}
          onUnassignMine={selectedAllMine ? handleUnassignSelectedFromMe : undefined}
          onBulkRecord={() => setShowBulkSheet(true)}
          onCancel={() => setSelectedIds(new Set())}
          isAssigning={assignDog.isPending}
          isUnassigning={unassignDog.isPending}
        />
        <TabLayout title="오늘의 운영" tabs={tabs} defaultTab="all" />
        <OpsBottomInfo totalCount={allItems.length} completedCount={completedCount} />
      </View>

      {/* 개별 기록 모달 */}
      <Modal visible={!!recordModalItem} animationType="slide" presentationStyle="pageSheet">
        {recordModalItem && (
          <RecordModal
            item={recordModalItem}
            onSave={handleRecordSave}
            onSaveAndNext={handleRecordSaveAndNext}
            onClose={() => {
              setShowRecordToast(false);
              setRecordModalItem(null);
            }}
            isSaving={createQuickLog.isPending}
            feedbackMessage={recordToastMessage}
            feedbackVisible={showRecordToast}
            onFeedbackDismiss={() => setShowRecordToast(false)}
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
      <Toast
        message={toastMessage}
        visible={showToast}
        duration={1200}
        onDismiss={() => setShowToast(false)}
      />
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
