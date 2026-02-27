/**
 * 보호자 리포트 열람 — 인증 필요 (토스 로그인 보호자)
 * Parity: B2B-001
 */
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useAuth } from 'stores/AuthContext';
import { useDogReports, useCreateInteraction } from 'lib/hooks/useReport';
import { ReportViewer } from 'components/features/parent/ReportViewer';
import { ReactionForm } from 'components/features/parent/ReactionForm';
import { tracker } from 'lib/analytics/tracker';

export const Route = createRoute('/parent/reports', { component: ParentReportsPage });

function ParentReportsPage() {
  const { isReady } = usePageGuard({ currentPath: '/parent/reports' as any });
  const { user } = useAuth();
  const navigation = useNavigation();
  // TODO: 실 연결 시 보호자 강아지 ID로 조회
  const { data: reports } = useDogReports(undefined);
  const createInteraction = useCreateInteraction();

  const latestReport = reports?.[0];

  if (!isReady) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>리포트</Text>
        <View style={styles.spacer} />
      </View>

      {latestReport ? (
        <View style={styles.body}>
          <ReportViewer report={latestReport} />
          <ReactionForm
            onSubmitReaction={(emoji) => {
              createInteraction.mutate({
                report_id: latestReport.id,
                parent_user_id: user?.id,
                interaction_type: 'like',
                content: emoji,
              });
              tracker.parentReaction('like');
            }}
            onSubmitQuestion={(question) => {
              createInteraction.mutate({
                report_id: latestReport.id,
                parent_user_id: user?.id,
                interaction_type: 'question',
                content: question,
              });
              tracker.parentReaction('question');
            }}
          />
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 리포트가 없어요</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E8EB',
  },
  backBtn: { fontSize: 20, color: '#202632', paddingRight: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#202632', flex: 1 },
  spacer: { width: 32 },
  body: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#8B95A1' },
});
