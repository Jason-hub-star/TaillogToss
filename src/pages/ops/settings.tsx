/**
 * Ops 설정 — 센터정보수정 / 강아지현황 / 직원관리 / 플랜 (실데이터)
 * Parity: B2B-002
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { colors, typography, spacing } from 'styles/tokens';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { ErrorState } from 'components/tds-ext';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useOrg } from 'stores/OrgContext';
import {
  useOrgMembers, useInviteMember, useOrgTodayStats,
  useOrgDogs, useUpdateOrg,
} from 'lib/hooks/useOrg';
import { useOrgEntitlement, useOrgSubscription } from 'lib/hooks/useOrgSubscription';
import { MemberList } from 'components/features/ops/MemberList';
import { InviteSheet } from 'components/features/ops/InviteSheet';
import { OrgStatsSheet } from 'components/features/ops/OrgStatsSheet';
import { BackButton, BackButtonSpacer } from 'components/shared/BackButton';
import { PresetManager } from 'components/features/ops/PresetManager';
import { OrgInfoEditForm } from 'components/features/ops/OrgInfoEditForm';
import { DogQuotaCard } from 'components/features/ops/DogQuotaCard';
import { PlanCard } from 'components/features/ops/PlanCard';
import type { OrgMemberRole, Organization } from 'types/b2b';

export const Route = createRoute('/ops/settings', {
  component: OpsSettingsPage,
  screenOptions: { headerShown: false },
});

function OpsSettingsPage() {
  const { isReady } = usePageGuard({
    currentPath: '/ops/settings' as any,
    requireFeature: 'b2bOnly',
  });
  const navigation = useNavigation();
  const { org } = useOrg();

  const { data: members, isLoading: membersLoading, isError: membersError, refetch: refetchMembers } = useOrgMembers(org?.id);
  const { data: todayStats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useOrgTodayStats(org?.id);
  const { data: orgDogs, isLoading: dogsLoading } = useOrgDogs(org?.id);
  const { data: subscription, isLoading: subLoading } = useOrgSubscription(org?.id);
  const entitlement = useOrgEntitlement(org?.id);
  const inviteMember = useInviteMember(entitlement.maxStaff);
  const updateOrg = useUpdateOrg();

  const isLoading = membersLoading || statsLoading;
  const isError = membersError || statsError;
  const refetchAll = useCallback(() => { void refetchMembers(); void refetchStats(); }, [refetchMembers, refetchStats]);

  const [showInvite, setShowInvite] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const activeCount = orgDogs?.filter((d) => d.status === 'active').length ?? 0;

  const handleInvite = useCallback((userId: string, role: OrgMemberRole) => {
    if (!org) return;
    inviteMember.mutate(
      { org_id: org.id, user_id: userId, role },
      {
        onSuccess: () => {
          setShowInvite(false);
          Alert.alert('초대 완료', '직원을 초대했어요.');
        },
        onError: (err) => {
          Alert.alert('초대하지 못했어요', err instanceof Error ? err.message : '다시 시도해주세요.');
        },
      },
    );
  }, [org, inviteMember]);

  const handleOrgSave = useCallback((updates: Pick<Organization, 'name' | 'phone' | 'address'>) => {
    updateOrg.mutate(updates, {
      onError: () => {
        Alert.alert('저장하지 못했어요', '센터 정보를 저장하지 못했어요. 다시 시도해주세요.');
      },
    });
  }, [updateOrg]);

  if (!isReady) return null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Navbar onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <Navbar onBack={() => navigation.goBack()} />
        <ErrorState onRetry={refetchAll} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Navbar onBack={() => navigation.goBack()} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* M1: 센터 기본 정보 수정 */}
        {org && (
          <OrgInfoEditForm
            org={org}
            isLoading={updateOrg.isPending}
            onSave={handleOrgSave}
          />
        )}

        {/* M2: 강아지 현황 */}
        <DogQuotaCard
          activeCount={activeCount}
          maxDogs={entitlement.maxDogs}
          isLoading={dogsLoading}
        />

        {/* M3: 직원 관리 */}
        <MemberList
          members={members ?? []}
          onInvite={() => setShowInvite(true)}
        />

        {/* 통계 버튼 */}
        <TouchableOpacity style={styles.statsBtn} onPress={() => setShowStats(true)} activeOpacity={0.7}>
          <Text style={styles.statsBtnText}>운영 통계 보기</Text>
        </TouchableOpacity>

        {/* 프리셋 관리 */}
        <PresetManager />

        {/* M4: 구독 플랜 */}
        <PlanCard
          subscription={subscription}
          isLoading={subLoading}
          onUpgrade={() => navigation.navigate('/settings/subscription' as never)}
        />

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* 초대 모달 */}
      <Modal visible={showInvite} animationType="slide" presentationStyle="pageSheet">
        <InviteSheet onInvite={handleInvite} onClose={() => setShowInvite(false)} />
      </Modal>

      {/* 통계 모달 */}
      <Modal visible={showStats} animationType="slide" presentationStyle="pageSheet">
        <OrgStatsSheet stats={todayStats ?? null} onClose={() => setShowStats(false)} />
      </Modal>
    </SafeAreaView>
  );
}

function Navbar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.navbar}>
      <BackButton onPress={onBack} />
      <Text style={styles.navTitle}>운영 설정</Text>
      <BackButtonSpacer />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  navTitle: { flex: 1, ...typography.subtitle, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  body: { flex: 1 },
  statsBtn: {
    marginHorizontal: spacing.screenHorizontal,
    marginVertical: spacing.md,
    backgroundColor: colors.divider,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statsBtnText: { ...typography.bodySmall, fontWeight: '600', color: colors.textDark },
  bottomPad: { height: spacing.xxxl },
});
