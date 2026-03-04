/**
 * CoachingGenerationLoader — 코칭 생성 전용 로딩 컴포넌트
 * 단계 표시: 로그 분석 → 패턴 추출 → 코칭 생성
 * Parity: AI-001
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography, spacing } from 'styles/tokens';

const STEPS = [
  { label: '로그 분석 중', emoji: '📊' },
  { label: '패턴 추출 중', emoji: '🔍' },
  { label: '코칭 생성 중', emoji: '🐾' },
];

export function CoachingGenerationLoader() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setCurrentStep(1), 2000),
      setTimeout(() => setCurrentStep(2), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{STEPS[currentStep]?.emoji ?? '🐾'}</Text>
      <ActivityIndicator
        size="large"
        color={colors.primaryBlue}
        style={styles.spinner}
      />
      <Text style={styles.title}>AI가 행동 패턴을 분석하고 있어요</Text>
      <Text style={styles.subtitle}>잠시만 기다려 주세요...</Text>

      {/* 단계 표시 */}
      <View style={styles.stepsContainer}>
        {STEPS.map((step, idx) => (
          <View key={idx} style={styles.stepRow}>
            <View
              style={[
                styles.stepDot,
                idx <= currentStep && styles.stepDotActive,
              ]}
            />
            <Text
              style={[
                styles.stepLabel,
                idx <= currentStep && styles.stepLabelActive,
                idx === currentStep && styles.stepLabelCurrent,
              ]}
            >
              {step.label}
            </Text>
            {idx < currentStep && <Text style={styles.stepCheck}>✓</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emoji: {
    ...typography.emoji,
    marginBottom: spacing.lg,
  },
  spinner: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xxxl,
  },
  stepsContainer: {
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.grey300,
  },
  stepDotActive: {
    backgroundColor: colors.primaryBlue,
  },
  stepLabel: {
    ...typography.bodySmall,
    color: colors.grey400,
  },
  stepLabelActive: {
    color: colors.textSecondary,
  },
  stepLabelCurrent: {
    color: colors.primaryBlue,
    fontWeight: '600',
  },
  stepCheck: {
    ...typography.caption,
    color: colors.green500,
    fontWeight: '700',
  },
});
