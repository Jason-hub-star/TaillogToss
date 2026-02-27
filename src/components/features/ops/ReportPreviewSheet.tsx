/**
 * ReportPreviewSheet — 리포트 미리보기/편집/발송 바텀시트
 * Parity: B2B-001
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { DailyReport } from 'types/b2b';

/** 토스 미니앱 공유 링크 생성 (getTossShareLink 래퍼) */
function buildTossShareUrl(shareToken: string): string {
  // 토스 미니앱 내 보호자용 딥링크
  return `/parent/reports?token=${shareToken}`;
}

/** 비토스 공개 링크 생성 */
function buildPublicShareUrl(shareToken: string): string {
  // 비토스 사용자를 위한 웹 공유 링크
  return `/report/${shareToken}`;
}

interface ReportPreviewSheetProps {
  report: DailyReport;
  dogName: string;
  onSend: (reportId: string) => void;
  onUpdate: (reportId: string, updates: { behavior_summary?: string; condition_notes?: string }) => void;
  onClose: () => void;
}

export function ReportPreviewSheet({ report, dogName, onSend, onUpdate, onClose }: ReportPreviewSheetProps) {
  const [summary, setSummary] = useState(report.behavior_summary ?? '');
  const [notes, setNotes] = useState(report.condition_notes ?? '');
  const isSent = report.generation_status === 'sent';

  const handleSave = useCallback(() => {
    onUpdate(report.id, { behavior_summary: summary, condition_notes: notes });
  }, [report.id, summary, notes, onUpdate]);

  const handleSend = useCallback(() => {
    onSend(report.id);
  }, [report.id, onSend]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{dogName} 리포트</Text>
          <Text style={styles.date}>{report.report_date}</Text>
        </View>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeBtn}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body}>
        <View style={styles.section}>
          <Text style={styles.label}>행동 요약</Text>
          <TextInput
            style={styles.input}
            value={summary}
            onChangeText={setSummary}
            multiline
            numberOfLines={4}
            editable={!isSent}
            placeholder="AI 생성 요약이 표시됩니다"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>컨디션 메모</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            editable={!isSent}
            placeholder="컨디션 특이사항"
          />
        </View>

        {report.ai_coaching_oneliner && (
          <View style={styles.section}>
            <Text style={styles.label}>AI 코칭 한줄</Text>
            <View style={styles.aiBox}>
              <Text style={styles.aiText}>{report.ai_coaching_oneliner}</Text>
            </View>
          </View>
        )}

        {report.share_token && (
          <View style={styles.section}>
            <Text style={styles.label}>공유 링크</Text>
            <View style={styles.shareRow}>
              <Text style={styles.shareLabel}>토스 보호자</Text>
              <Text style={styles.shareLink} selectable>
                {buildTossShareUrl(report.share_token)}
              </Text>
            </View>
            <View style={styles.shareRow}>
              <Text style={styles.shareLabel}>비토스 보호자</Text>
              <Text style={styles.shareLink} selectable>
                {buildPublicShareUrl(report.share_token)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!isSent && (
          <>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>저장</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.8}>
              <Text style={styles.sendBtnText}>보호자에게 발송</Text>
            </TouchableOpacity>
          </>
        )}
        {isSent && (
          <View style={styles.sentNotice}>
            <Text style={styles.sentText}>이미 발송된 리포트입니다</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E8EB',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#202632' },
  date: { fontSize: 13, color: '#8B95A1', marginTop: 2 },
  closeBtn: { fontSize: 20, color: '#8B95A1', padding: 4 },
  body: { flex: 1 },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#E5E8EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#202632',
    minHeight: 80, textAlignVertical: 'top',
  },
  aiBox: {
    backgroundColor: '#F0F9FF', borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: '#0064FF',
  },
  aiText: { fontSize: 14, color: '#1E40AF', lineHeight: 20 },
  shareRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  shareLabel: { fontSize: 12, color: '#8B95A1', width: 80 },
  shareLink: { flex: 1, fontSize: 13, color: '#0064FF' },
  footer: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16,
    gap: 8, borderTopWidth: 1, borderTopColor: '#E5E8EB',
  },
  saveBtn: {
    flex: 1, backgroundColor: '#F4F4F5', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  sendBtn: {
    flex: 1, backgroundColor: '#0064FF', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  sendBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  sentNotice: { flex: 1, alignItems: 'center' },
  sentText: { fontSize: 14, color: '#059669', fontWeight: '600' },
});
