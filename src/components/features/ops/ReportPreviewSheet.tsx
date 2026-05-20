/**
 * ReportPreviewSheet — 리포트 미리보기/편집/발송 바텀시트
 * Parity: B2B-001
 */
import React, { useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from '@granite-js/native/react-native-safe-area-context';
import { colors, typography, spacing } from 'styles/tokens';
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
  return (
    <SafeAreaProvider>
      <ReportPreviewSheetInner
        report={report}
        dogName={dogName}
        onSend={onSend}
        onUpdate={onUpdate}
        onClose={onClose}
      />
    </SafeAreaProvider>
  );
}

function ReportPreviewSheetInner({ report, dogName, onSend, onUpdate, onClose }: ReportPreviewSheetProps) {
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{dogName} 리포트</Text>
          <Text style={styles.date}>{report.report_date}</Text>
        </View>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeBtn}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>행동 요약</Text>
          <TextInput
            style={styles.input}
            value={summary}
            onChangeText={setSummary}
            multiline
            numberOfLines={4}
            editable={!isSent}
            placeholder="AI 요약이 여기에 보여요"
            onFocus={() => setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 120)}
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
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)}
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

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
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
            <Text style={styles.sentText}>이미 보낸 리포트예요</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { ...typography.subtitle, fontWeight: '700', color: colors.textPrimary },
  date: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  closeBtn: { ...typography.sectionTitle, color: colors.textSecondary, padding: 4 },
  body: { flex: 1 },
  bodyContent: { flexGrow: 1, paddingBottom: spacing.lg },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  label: { ...typography.detail, fontWeight: '600', color: colors.textDark, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, ...typography.detail, color: colors.textPrimary,
    minHeight: 80, textAlignVertical: 'top',
  },
  aiBox: {
    backgroundColor: colors.aiSectionBg, borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.primaryBlue,
  },
  aiText: { ...typography.detail, color: colors.blue800 },
  shareRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  shareLabel: { ...typography.caption, color: colors.textSecondary, width: 80 },
  shareLink: { flex: 1, ...typography.caption, color: colors.primaryBlue },
  footer: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16,
    gap: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  saveBtn: {
    flex: 1, backgroundColor: colors.divider, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { ...typography.bodySmall, fontWeight: '600', color: colors.textDark },
  sendBtn: {
    flex: 1, backgroundColor: colors.primaryBlue, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  sendBtnText: { ...typography.bodySmall, fontWeight: '600', color: colors.white },
  sentNotice: { flex: 1, alignItems: 'center' },
  sentText: { ...typography.detail, color: colors.green500, fontWeight: '600' },
});
