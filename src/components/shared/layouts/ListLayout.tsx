/**
 * ListLayout (패턴A) — 목록형 레이아웃 + onBack 뒤로가기
 * 대시보드, 훈련 목록, 설정 등에 사용. Header + ScrollView 구조.
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../../../styles/tokens';

export interface ListLayoutProps {
  title: string;
  headerRight?: React.ReactNode;
  /** 뒤로가기 콜백 — 전달 시 ← 버튼 표시 (심사 필수) */
  onBack?: () => void;
  /** ScrollView 아래 고정 영역 (BottomNavBar 등) */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function ListLayout({ title, headerRight, onBack, footer, children }: ListLayoutProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backText}>{'←'}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>{title}</Text>
        </View>
        {headerRight && <View>{headerRight}</View>}
      </View>
      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backButton: { paddingRight: spacing.xs },
  backText: { ...typography.sectionTitle, color: colors.grey950 },
  title: { ...typography.sectionTitle, fontWeight: '700', color: colors.textPrimary },
  body: { flex: 1 },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
});
