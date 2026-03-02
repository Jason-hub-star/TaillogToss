/**
 * FormLayout (패턴C) — 입력폼형 레이아웃 (개선 버전)
 * children 변경 시 스크롤 상단 초기화 로직 포함
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../../../styles/tokens';

export interface FormLayoutProps {
  title: string;
  step?: { current: number; total: number };
  onBack?: () => void;
  children: React.ReactNode;
  bottomCTA?: { label: string; onPress: () => void; disabled?: boolean };
}

export function FormLayout({ title, step, onBack, children, bottomCTA }: FormLayoutProps) {
  const scrollRef = useRef<ScrollView>(null);

  // 단계(step)가 바뀌거나 children이 바뀔 때 스크롤 상단으로 이동
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step?.current]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backIcon}>{'<'}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
        {step && <Text style={styles.stepText}>{step.current}/{step.total}</Text>}
      </View>
      {step && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step.current / step.total) * 100}%` }]} />
        </View>
      )}
      <ScrollView 
        ref={scrollRef}
        style={styles.body} 
        contentContainerStyle={styles.content} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {bottomCTA && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.ctaButton, bottomCTA.disabled && styles.ctaDisabled]}
            onPress={bottomCTA.onPress}
            disabled={bottomCTA.disabled}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>{bottomCTA.label}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
  },
  backBtn: { paddingRight: spacing.md },
  backIcon: { ...typography.sectionTitle, color: colors.textDark },
  title: { ...typography.subtitle, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  stepText: { ...typography.detail, color: colors.textSecondary },
  progressBar: {
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.screenHorizontal,
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primaryBlue,
    borderRadius: 2,
  },
  body: { flex: 1 },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingTop: spacing.xxl, paddingBottom: 120 },
  bottomBar: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  ctaButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  ctaDisabled: { backgroundColor: colors.grey300 },
  ctaText: { color: colors.white, ...typography.label, fontWeight: '700' },
});
