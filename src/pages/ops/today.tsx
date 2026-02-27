/**
 * Ops Today — B2B 오늘의 운영 큐 (4탭: 미기록/주의필요/리포트미발송/내담당)
 * FlatList 40마리 성능 최적화. Wave 3 게이트 #1 핵심 화면.
 * Parity: B2B-001
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, Modal, StyleSheet, SafeAreaView } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useOrg } from 'stores/OrgContext';
import { useOrgDogs } from 'lib/hooks/useOrg';
import { useCreateQuickLog } from 'lib/hooks/useLogs';
import { tracker } from 'lib/analytics/tracker';
import { OpsList } from 'components/features/ops/OpsList';
import { OpsBottomInfo } from 'components/features/ops/OpsBottomInfo';
import { BulkActionBar } from 'components/features/ops/BulkActionBar';
import { RecordModal } from 'components/features/ops/RecordModal';
import { BulkPresetSheet } from 'components/features/ops/BulkPresetSheet';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { TabLayout } from 'components/shared/layouts/TabLayout';
import { PRESET_OPTIONS } from 'lib/data/presets';
import type { OpsItem } from 'components/features/ops/OpsListItem';
import type { OpsStatus } from 'components/features/ops/OpsBadge';

export const Route = createRoute('/ops/today', { component: OpsTodayPage });

function OpsTodayPage() {
  const { isReady } = usePageGuard({
    currentPath: '/ops/today',
    requireFeature: 'b2bOnly',
  });
  const { org } = useOrg();
  const { data: orgDogs, isLoading } = useOrgDogs(org?.id);
  const createQuickLog = useCreateQuickLog();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recordModalItem, setRecordModalItem] = useState<OpsItem | null>(null);
  const [showBulkSheet, setShowBulkSheet] = useState(false);

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
    createQuickLog.mutate({
      dog_id: data.dogId,
      category: 'other_behavior',
      intensity: data.intensity as any,
      occurred_at: new Date().toISOString(),
      memo: data.memo,
    });
    tracker.opsLogCreated('preset', false);
    setRecordModalItem(null);
  }, [createQuickLog]);

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
          onItemPress={handleItemPress} onItemLongPress={handleItemLongPress}
          ListEmptyComponent={<EmptyState title="미발송 리포트가 없어요" description="" icon={'\uD83D\uDCE8'} />} />
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
  ]);

  if (!isReady) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <BulkActionBar
          selectedCount={selectedIds.size}
          onBulkRecord={() => setShowBulkSheet(true)}
          onCancel={() => setSelectedIds(new Set())}
        />
        <TabLayout title="Ops 대시보드" tabs={tabs} defaultTab="unrecorded" />
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
});
