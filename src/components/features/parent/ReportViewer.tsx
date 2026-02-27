/**
 * ReportViewer — 보호자용 리포트 뷰어 (읽기 전용)
 * Parity: B2B-001
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { DailyReport } from 'types/b2b';

interface ReportViewerProps {
  report: DailyReport;
  dogName?: string;
}

export function ReportViewer({ report, dogName }: ReportViewerProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{dogName ?? '리포트'}</Text>
        <Text style={styles.date}>{report.report_date}</Text>
      </View>

      {report.behavior_summary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 행동 요약</Text>
          <Text style={styles.text}>{report.behavior_summary}</Text>
        </View>
      )}

      {report.condition_notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>컨디션 메모</Text>
          <Text style={styles.text}>{report.condition_notes}</Text>
        </View>
      )}

      {report.ai_coaching_oneliner && (
        <View style={styles.aiSection}>
          <Text style={styles.sectionTitle}>AI 코칭</Text>
          <Text style={styles.aiText}>{report.ai_coaching_oneliner}</Text>
        </View>
      )}

      {report.highlight_photo_urls.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 사진</Text>
          <Text style={styles.photoPlaceholder}>
            {report.highlight_photo_urls.length}장의 사진
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20 },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#202632' },
  date: { fontSize: 14, color: '#8B95A1', marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 8 },
  text: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  aiSection: {
    marginBottom: 20, backgroundColor: '#F0F9FF', borderRadius: 12, padding: 16,
    borderLeftWidth: 3, borderLeftColor: '#0064FF',
  },
  aiText: { fontSize: 14, color: '#1E40AF', lineHeight: 20 },
  photoPlaceholder: { fontSize: 13, color: '#8B95A1' },
});
