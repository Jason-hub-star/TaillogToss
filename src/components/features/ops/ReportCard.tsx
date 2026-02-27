/**
 * ReportCard — 리포트 카드 (상태: pending/generated/sent)
 * Parity: B2B-001
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { DailyReport, ReportStatus } from 'types/b2b';

interface ReportCardProps {
  report: DailyReport;
  dogName: string;
  onPress: (report: DailyReport) => void;
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '생성 대기', color: '#6B7280', bg: '#F3F4F6' },
  generating: { label: '생성 중', color: '#D97706', bg: '#FEF3C7' },
  generated: { label: '생성 완료', color: '#2563EB', bg: '#DBEAFE' },
  failed: { label: '생성 실패', color: '#DC2626', bg: '#FEE2E2' },
  sent: { label: '발송 완료', color: '#059669', bg: '#D1FAE5' },
};

export function ReportCard({ report, dogName, onPress }: ReportCardProps) {
  const config = STATUS_CONFIG[report.generation_status];

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(report)} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.dogName}>{dogName}</Text>
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
          <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>
      <Text style={styles.date}>{report.report_date}</Text>
      {report.behavior_summary && (
        <Text style={styles.summary} numberOfLines={2}>{report.behavior_summary}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F3F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dogName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202632',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: '#8B95A1',
    marginTop: 4,
  },
  summary: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 18,
  },
});
