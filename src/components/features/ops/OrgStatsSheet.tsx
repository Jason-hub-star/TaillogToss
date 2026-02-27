/**
 * OrgStatsSheet — 운영 통계 요약 바텀시트
 * Parity: B2B-001
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { OrgAnalyticsDaily } from 'types/b2b';

interface OrgStatsSheetProps {
  stats: OrgAnalyticsDaily | null;
  onClose: () => void;
}

export function OrgStatsSheet({ stats, onClose }: OrgStatsSheetProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>운영 통계</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeBtn}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body}>
        {!stats ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 통계 데이터가 없어요</Text>
          </View>
        ) : (
          <>
            <StatRow label="총 관리 강아지" value={`${stats.total_dogs ?? 0}마리`} />
            <StatRow label="오늘 행동 기록" value={`${stats.total_behavior_logs ?? 0}건`} />
            <StatRow label="기록 완료율" value={`${Math.round((stats.record_completion_rate ?? 0) * 100)}%`} />
            <StatRow label="평균 활동 점수" value={`${stats.avg_activity_score ?? 0}점`} />
            <StatRow label="공격 사건" value={`${stats.aggression_incident_count ?? 0}건`} highlight />
            <StatRow label="리포트 열람률" value={`${Math.round((stats.report_open_rate ?? 0) * 100)}%`} />
            <StatRow label="보호자 반응률" value={`${Math.round((stats.reaction_rate ?? 0) * 100)}%`} />
            <StatRow label="보호자 질문" value={`${stats.question_count ?? 0}건`} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E8EB',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#202632' },
  closeBtn: { fontSize: 20, color: '#8B95A1', padding: 4 },
  body: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: '#8B95A1' },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F3F5',
  },
  statLabel: { fontSize: 14, color: '#6B7280' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#202632' },
  statHighlight: { color: '#DC2626' },
});
