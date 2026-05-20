/**
 * ListLayout (패턴A) — 목록형 레이아웃 + onBack 뒤로가기
 * 대시보드, 훈련 목록, 설정 등에 사용. Header + ScrollView 구조.
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, type ViewStyle } from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { BackButton } from 'components/shared/BackButton';
import { colors, typography, spacing } from '../../../styles/tokens';

export interface ListLayoutProps {
  title: string;
  headerRight?: React.ReactNode;
  /** 뒤로가기 콜백 — 전달 시 ← 버튼 표시 (심사 필수) */
  onBack?: () => void;
  /** ScrollView 아래 고정 영역 (BottomNavBar 등) */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** SafeAreaView 스타일 오버라이드 (배경색 등) */
  style?: ViewStyle;
  /** ScrollView contentContainerStyle 오버라이드 */
  contentContainerStyle?: ViewStyle;
}

export function ListLayout({ title, headerRight, onBack, footer, children, style, contentContainerStyle }: ListLayoutProps) {
  return (
    <SafeAreaView style={[styles.safe, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack && <BackButton onPress={onBack} />}
          <Text style={styles.title}>{title}</Text>
        </View>
        {headerRight && <View>{headerRight}</View>}
      </View>
      <ScrollView style={styles.body} contentContainerStyle={[styles.content, contentContainerStyle]}>
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
  title: { ...typography.sectionTitle, fontWeight: '700', color: colors.textPrimary },
  body: { flex: 1 },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
});
