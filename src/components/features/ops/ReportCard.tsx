/**
 * ReportCard — 리포트 카드 (상태: pending/generated/sent)
 * Parity: B2B-001
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography } from 'styles/tokens';
import type { DailyReport, ReportStatus } from 'types/b2b';

interface ReportCardProps {
  report: DailyReport;
  dogName: string;
  onPress: (report: DailyReport) => void;
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '대기 중', color: colors.badgeGrey, bg: colors.badgeGreyBg },
  generating: { label: '만드는 중', color: colors.badgeAmber, bg: colors.badgeAmberBg },
  generated: { label: '완료', color: colors.badgeBlue, bg: colors.badgeBlueBg },
  failed: { label: '다시 필요', color: colors.badgeRed, bg: colors.badgeRedBg },
  sent: { label: '보냄', color: colors.badgeGreen, bg: colors.badgeGreenBg },
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
    borderBottomColor: colors.divider,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dogName: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    ...typography.badge,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  summary: {
    ...typography.caption,
    color: colors.grey600,
    marginTop: 6,
  },
});
